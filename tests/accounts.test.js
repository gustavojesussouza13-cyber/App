'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {AccountStore,AuthError,authCookie,parseCookie,clearCookie,validName,validPassword}=require('../account-store');

class MemoryPg{
 constructor(){this.accounts=new Map();this.names=new Map();this.sessions=new Map();this.characters=new Map();this.guilds=new Map();this.monsters=new Map();this.meta=new Map();}
 async connect(){return {query:(s,p)=>this.query(s,p),release(){}}}
 async end(){}
 async query(sql,params=[]){
  const q=sql.replace(/\s+/g,' ').trim();
  if(q.startsWith('CREATE')||q.startsWith('ALTER')||q==='BEGIN'||q==='COMMIT'||q==='ROLLBACK')return {rows:[]};
  if(q==='SELECT uid,data FROM characters')return {rows:[...this.characters].map(([uid,data])=>({uid,data}))};
  if(q==='SELECT key,data FROM guilds')return {rows:[...this.guilds].map(([key,data])=>({key,data}))};
   if(q==='SELECT key,data FROM monster_progress')return {rows:[...this.monsters].map(([key,data])=>({key,data}))};
  if(q==="SELECT value FROM meta WHERE key='day'")return {rows:this.meta.has('day')?[{value:this.meta.get('day')}]:[]};
  if(q.startsWith('SELECT id FROM game_accounts WHERE username_key='))return {rows:this.names.has(params[0])?[{id:this.names.get(params[0])}]:[]};
  if(q.startsWith('INSERT INTO game_accounts')){if(this.names.has(params[2])){const e=Error('duplicado');e.code='23505';throw e}this.accounts.set(params[0],{id:params[0],username:params[1],username_key:params[2],salt:params[3],password_hash:params[4]});this.names.set(params[2],params[0]);return {rows:[]}}
  if(q.startsWith('INSERT INTO characters(uid,data) SELECT')){if(this.characters.has(params[1]))this.characters.set(params[0],this.characters.get(params[1]));return {rows:[]}}
  if(q.startsWith('DELETE FROM characters WHERE uid=')){this.characters.delete(params[0]);return {rows:[]}}
  if(q.startsWith('INSERT INTO game_sessions')){this.sessions.set(params[0],{id:params[1],expires:params[2]});return {rows:[]}}
  if(q.startsWith('SELECT * FROM game_accounts WHERE username_key=')){const id=this.names.get(params[0]);return {rows:id?[this.accounts.get(id)]:[]}}
  if(q.startsWith('SELECT a.id,a.username,a.email,a.email_verified_at FROM game_sessions')){const s=this.sessions.get(params[0]);const a=s&&this.accounts.get(s.id);return {rows:a&&new Date(s.expires)>new Date()?[{id:a.id,username:a.username}]:[]}}
  if(q.startsWith('DELETE FROM game_sessions')){this.sessions.delete(params[0]);return {rows:[]}}
  if(q.startsWith('INSERT INTO characters(uid,data) VALUES(')){this.characters.set(params[0],JSON.parse(params[1]));return {rows:[]}}
  if(q.startsWith('INSERT INTO guilds(')){this.guilds.set(params[0],JSON.parse(params[1]));return {rows:[]}}
   if(q.startsWith('INSERT INTO monster_progress(')){this.monsters.set(params[0],JSON.parse(params[1]));return {rows:[]}}
  if(q.startsWith('INSERT INTO meta(')){this.meta.set('day',params[0]);return {rows:[]}}
  throw Error('SQL inesperado: '+q);
 }
}

test('validação de nome e senha não aceita identificadores fracos ou malformados',()=>{
 assert.ok(validName('Aurora_2026'));assert.ok(!validName(' A'));assert.ok(!validName('<script>'));
 assert.ok(validPassword('Minha Senha-Forte!'));assert.ok(!validPassword('fraca'));
 assert.ok(!validPassword('X'.repeat(129)));
});
test('criar conta, efetuar login, fechar sessão e rejeitar nome duplicado',async()=>{
 const pool=new MemoryPg(),store=new AccountStore({pool}),world={saved:{characters:{},guilds:{},day:1},guilds:new Map(),dirty:false};
 await store.initialize(world);
 const registered=await store.register('LiaAurora','Senha Forte e Muito Segura!');
 assert.equal(registered.account.username,'LiaAurora');assert.match(registered.account.uid,/^account:/);
 assert.notEqual(pool.accounts.get(registered.account.id).password_hash,'Senha Forte e Muito Segura!');
 assert.equal((await store.session('peregrinos_session='+registered.token)).username,'LiaAurora');
 const login=await store.login('liaaurora','Senha Forte e Muito Segura!');
 assert.equal(login.account.uid,registered.account.uid);
 await assert.rejects(store.login('LiaAurora','senha errada 12345'),e=>e.status===401);
 await assert.rejects(store.register('LIAAURORA','Outra Senha Grande 12345'),e=>e.status===409);
 await store.logout('peregrinos_session='+registered.token);
 assert.equal(await store.session('peregrinos_session='+registered.token),null);
 assert.ok(await store.session('peregrinos_session='+login.token));
 await store.close();
});
test('progresso do visitante pode ser migrado para conta e sobreviver a um novo processo',async()=>{
 const pool=new MemoryPg(),store=new AccountStore({pool});
 const oldToken=crypto.randomBytes(32).toString('hex'),guestUid=crypto.createHash('sha256').update(oldToken).digest('hex');
 const world={saved:{characters:{[guestUid]:{level:14,coins:4000,story:{stage:7},inventory:{pocao:20}}},guilds:{},day:10},guilds:new Map(),dirty:false,persist(){store.enqueue(this.saved);this.dirty=false}};
 await store.initialize(world);
 world.saved.characters[guestUid]={level:14,coins:4000,story:{stage:7},inventory:{pocao:20}};
 await store.enqueue(world.saved);
 const data=await store.register('CavaleiroFiel','Minha senha 2026 @!!',oldToken);
 await store.flush();
 assert.ok(!world.saved.characters[guestUid]);assert.equal(world.saved.characters[data.account.uid].level,14);
 const next=new AccountStore({pool}),future={saved:{characters:{},guilds:{},day:1},guilds:new Map()};await next.initialize(future);
 assert.equal(future.saved.characters[data.account.uid].coins,4000);assert.equal(future.saved.characters[data.account.uid].story.stage,7);
 assert.ok(!future.saved.characters[guestUid]);
 await store.close();await next.close();
});
test('cookies de conta utilizam HttpOnly e SameSite; token é filtrado',()=>{
 const value='a'.repeat(64),cookie=authCookie(value);
 assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/Secure/);
 assert.equal(parseCookie('x=abc; peregrinos_session='+value),value);
 assert.equal(parseCookie('peregrinos_session=qualquercoisa'),null);
 assert.match(clearCookie(),/Max-Age=0/);
});

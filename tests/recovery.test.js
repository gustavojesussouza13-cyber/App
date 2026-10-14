'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {AccountStore,validEmail}=require('../account-store');
const {MailService}=require('../email-service');

class RecoveryPg{
 constructor(){this.accounts=new Map();this.names=new Map();this.sessions=new Map();this.verifications=new Map();this.resets=new Map();this.characters=new Map();this.guilds=new Map();this.monsters=new Map();this.meta=new Map()}
 async connect(){return {query:(s,p)=>this.query(s,p),release(){}}}
 async end(){}
 async query(sql,params=[]){
  const q=sql.replace(/\s+/g,' ').trim();
  if(q.startsWith('CREATE')||q.startsWith('ALTER')||['BEGIN','COMMIT','ROLLBACK'].includes(q))return {rows:[]};
  if(q==='SELECT uid,data FROM characters')return {rows:[...this.characters].map(([uid,data])=>({uid,data}))};
  if(q==='SELECT key,data FROM guilds')return {rows:[...this.guilds].map(([key,data])=>({key,data}))};
   if(q==='SELECT key,data FROM monster_progress')return {rows:[...this.monsters].map(([key,data])=>({key,data}))};
  if(q==="SELECT value FROM meta WHERE key='day'")return {rows:[]};
  if(q.startsWith('SELECT id FROM game_accounts WHERE username_key='))return {rows:this.names.has(params[0])?[{id:this.names.get(params[0])}]:[]};
  if(q.startsWith('INSERT INTO game_accounts')){const a={id:params[0],username:params[1],username_key:params[2],salt:params[3],password_hash:params[4],email:null,email_key:null,email_verified_at:null};this.accounts.set(a.id,a);this.names.set(a.username_key,a.id);return {rows:[]}}
  if(q.startsWith('INSERT INTO game_sessions')){this.sessions.set(params[0],{accountId:params[1],expires:params[2]});return {rows:[]}}
  if(q.startsWith('SELECT * FROM game_accounts WHERE username_key=')){const id=this.names.get(params[0]);return {rows:id?[{...this.accounts.get(id)}]:[]}}
  if(q.startsWith('SELECT a.id,a.username,a.email,a.email_verified_at FROM game_sessions')){
   const session=this.sessions.get(params[0]),a=session&&this.accounts.get(session.accountId);return {rows:a&&new Date(session.expires)>new Date()?[{id:a.id,username:a.username,email:a.email,email_verified_at:a.email_verified_at}]:[]};
  }
  if(q.startsWith('SELECT salt,password_hash FROM game_accounts WHERE id=')){const a=this.accounts.get(params[0]);return {rows:a?[{salt:a.salt,password_hash:a.password_hash}]:[]}}
  if(q.startsWith('SELECT id,username,email_key,email_verified_at FROM game_accounts WHERE id=')){const a=this.accounts.get(params[0]);return {rows:a?[{...a}]:[]}}
  if(q.startsWith('DELETE FROM account_email_verifications WHERE account_id=')){for(const [k,v] of this.verifications)if(v.account_id===params[0])this.verifications.delete(k);return {rows:[]}}
  if(q.startsWith('INSERT INTO account_email_verifications')){this.verifications.set(params[0],{account_id:params[1],email:params[2],email_key:params[3],expires_at:params[4]});return {rows:[]}}
  if(q.startsWith('DELETE FROM account_email_verifications WHERE token_hash=')){this.verifications.delete(params[0]);return {rows:[]}}
  if(q.startsWith('SELECT account_id,email,email_key FROM account_email_verifications')){const token=this.verifications.get(params[0]);return {rows:token&&new Date(token.expires_at)>new Date()?[{...token}]:[]}}
  if(q.startsWith('UPDATE game_accounts SET email=')){const a=this.accounts.get(params[2]);if([...this.accounts.values()].some(b=>b.id!==a.id&&b.email_verified_at&&b.email_key===params[1])){const e=Error('unique');e.code='23505';throw e}a.email=params[0];a.email_key=params[1];a.email_verified_at=new Date();return {rows:[]}}
  if(q.startsWith('SELECT id,username,email FROM game_accounts WHERE email_key=')){return {rows:[...this.accounts.values()].filter(a=>a.email_key===params[0]&&a.email_verified_at).map(a=>({...a}))}}
  if(q.startsWith('DELETE FROM account_password_resets WHERE account_id=')){for(const [k,v] of this.resets)if(v.account_id===params[0])this.resets.delete(k);return {rows:[]}}
  if(q.startsWith('INSERT INTO account_password_resets')){this.resets.set(params[0],{account_id:params[1],expires_at:params[2]});return {rows:[]}}
  if(q.startsWith('DELETE FROM account_password_resets WHERE token_hash=')){this.resets.delete(params[0]);return {rows:[]}}
  if(q.startsWith('SELECT account_id FROM account_password_resets WHERE token_hash=')){const reset=this.resets.get(params[0]);return {rows:reset&&new Date(reset.expires_at)>new Date()?[{account_id:reset.account_id}]:[]}}
  if(q.startsWith('UPDATE game_accounts SET salt=')){const a=this.accounts.get(params[2]);a.salt=params[0];a.password_hash=params[1];return {rows:[]}}
  if(q.startsWith('DELETE FROM game_sessions WHERE account_id=')){for(const [k,v] of this.sessions)if(v.accountId===params[0])this.sessions.delete(k);return {rows:[]}}
  if(q.startsWith('DELETE FROM game_sessions WHERE token_hash=')){this.sessions.delete(params[0]);return {rows:[]}}
  if(q.startsWith('INSERT INTO characters(uid,data) VALUES(')){this.characters.set(params[0],JSON.parse(params[1]));return {rows:[]}}
  if(q.startsWith('INSERT INTO guilds(')){this.guilds.set(params[0],JSON.parse(params[1]));return {rows:[]}}
   if(q.startsWith('INSERT INTO monster_progress(')){this.monsters.set(params[0],JSON.parse(params[1]));return {rows:[]}}
  if(q.startsWith('INSERT INTO meta(')){this.meta.set('day',params[0]);return {rows:[]}}
  throw Error('SQL inesperado: '+q);
 }
}
async function fixture(){const pool=new RecoveryPg(),store=new AccountStore({pool}),world={saved:{characters:{},guilds:{},day:1},guilds:new Map(),dirty:false};await store.initialize(world);const result=await store.register('PeregrinaAurora','Senha antiga @2026');return {pool,store,account:result.account,token:result.token};}

test('somente e-mails confirmados habilitam recuperação; token de verificação é de uso único',async()=>{
 const {store,account}=await fixture();const mailed=[];
 assert.equal(validEmail('test@example.com'),true);assert.equal(validEmail('invalido'),false);
 const attempt=await store.requestPasswordReset('usuario@example.com',async d=>mailed.push(d));assert.equal(attempt.ok,true);assert.equal(mailed.length,0);
 assert.equal((await store.requestEmailVerification(account.id,'Heroi@Example.COM',async d=>mailed.push(d))).sent,true);
 assert.equal(mailed[0].to,'heroi@example.com');assert.match(mailed[0].token,/^[0-9a-f]{64}$/);
 assert.equal(await store.confirmEmail(mailed[0].token).then(x=>x.verified),true);
 await assert.rejects(store.confirmEmail(mailed[0].token),e=>e.code==='invalid_token');
 assert.equal((await store.requestEmailVerification(account.id,'heroi@example.com',async()=>{throw Error('não deve enviar')})).alreadyVerified,true);
 await store.close();
});

test('recuperação mantém personagem, altera senha e revoga as sessões antigas',async()=>{
 const {store,pool,account,token:session}=await fixture();
 let verify,reset;
 await store.requestEmailVerification(account.id,'hero@example.com',async d=>verify=d.token);
 await store.confirmEmail(verify);
 const before=await store.login(account.username,'Senha antiga @2026');
 pool.characters.set(account.uid,{level:41,coins:8531,story:{stage:12}});
 await store.requestPasswordReset('hero@example.com',async d=>reset=d.token);
 const hashed=crypto.createHash('sha256').update(reset).digest('hex');assert.ok(pool.resets.has(hashed));assert.ok(!pool.resets.has(reset));
 const result=await store.resetPassword(reset,'Senha nova forte @2026');assert.equal(result.accountId,account.id);
 await assert.rejects(store.resetPassword(reset,'Outra senha forte @2026'),e=>e.code==='invalid_token');
 await assert.rejects(store.login(account.username,'Senha antiga @2026'),e=>e.code==='bad_credentials');
 assert.equal(await store.session('peregrinos_session='+session),null);
 assert.equal(await store.session('peregrinos_session='+before.token),null);
 const after=await store.login(account.username,'Senha nova forte @2026');assert.equal(after.account.uid,account.uid);
 assert.deepEqual(pool.characters.get(account.uid),{level:41,coins:8531,story:{stage:12}});
 await store.close();
});

test('links vencidos e envio com erro não autorizam alteração de senha',async()=>{
 const {store,pool,account}=await fixture();
 const sent=[];await assert.rejects(store.requestEmailVerification(account.id,'falha@example.com',async d=>{sent.push(d);throw Error('falha');}),e=>e.code==='mail_unavailable');
 assert.equal(pool.verifications.size,0);
 await store.requestEmailVerification(account.id,'ok@example.com',async d=>sent.push(d));
 const v=sent.at(-1);for(const row of pool.verifications.values())row.expires_at=new Date(Date.now()-1000);
 await assert.rejects(store.confirmEmail(v.token),e=>e.code==='invalid_token');
 await store.requestEmailVerification(account.id,'ok@example.com',async d=>sent.push(d));await store.confirmEmail(sent.at(-1).token);
 await assert.rejects(store.requestPasswordReset('ok@example.com',async()=>{throw Error('falha');}),e=>e.code==='mail_unavailable');
 assert.equal(pool.resets.size,0);
 let reset;await store.requestPasswordReset('ok@example.com',async d=>{reset=d.token});for(const row of pool.resets.values())row.expires_at=new Date(Date.now()-1000);
 await assert.rejects(store.resetPassword(reset,'Senha nova forte @2026'),e=>e.code==='invalid_token');
 await store.close();
});

test('trocar o e-mail confirmado invalida links de recuperação pendentes',async()=>{
 const {store,account,pool}=await fixture();let token;
 await store.requestEmailVerification(account.id,'antigo@example.com',async d=>token=d.token);await store.confirmEmail(token);
 await store.requestPasswordReset('antigo@example.com',async()=>{});assert.equal(pool.resets.size,1);
 await store.requestEmailVerification(account.id,'novo@example.com',async d=>token=d.token);await store.confirmEmail(token);
 assert.equal(pool.resets.size,0);
 await store.close();
});

test('serviço de envio utiliza HTTPS e nunca expõe links em consultas HTTP com token',async()=>{
 const calls=[];
 const mail=new MailService({apiKey:'re_KEYtest012345',from:'Os Peregrinos <contato@cronicasdaaurora.com.br>',origin:'https://cronicasdaaurora.com.br',fetchFn:async(url,opts)=>{calls.push({url,opts});return {ok:true}}});
 assert.equal(mail.ready,true);
 const token=crypto.randomBytes(32).toString('hex');
 await mail.send({to:'pessoa@example.com',username:'<Lia>',token,kind:'reset'});
 assert.equal(calls[0].url,'https://api.resend.com/emails');
 const body=JSON.parse(calls[0].opts.body);
 assert.match(body.text,/recuperar-senha\.html#token=/);assert.ok(body.text.includes(token));assert.ok(!body.text.includes('?token='));
 assert.ok(body.html.includes('&lt;Lia&gt;'));assert.ok(!body.html.includes('<Lia>'));
 assert.equal(new MailService({apiKey:'',from:'',origin:'https://cronicasdaaurora.com.br'}).ready,false);
});

test('páginas de token não carregam scripts publicitários e preservam o modo visitante',()=>{
 const root=path.join(__dirname,'../public');
 for(const page of ['recuperar-senha.html','verificar-email.html']){
  const html=fs.readFileSync(path.join(root,page),'utf8');
  assert.doesNotMatch(html,/adsbygoogle|googlesyndication/);assert.match(html,/no-referrer/);assert.match(html,/noindex,nofollow/);
 }
 const js=fs.readFileSync(path.join(root,'conta-segura.js'),'utf8');assert.match(js,/history.replaceState/);assert.match(js,/location.hash/);
 const html=fs.readFileSync(path.join(root,'mundo.html'),'utf8');
 for(const id of ['guestTab','loginTab','registerTab','registerEmail','emailSettingsBtn','emailSettingsDialog'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/recuperar-senha.html/);
 assert.match(fs.readFileSync(path.join(__dirname,'../server.js'),'utf8'),/\/api\/auth\/password\/forgot/);
});

test('chave Resend configurada como resend_api_key também é reconhecida',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../email-service.js'),'utf8');
 assert.match(source,/process\.env\.RESEND_API_KEY\s*\|\|\s*process\.env\.resend_api_key/);
});

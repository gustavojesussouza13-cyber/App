'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {MAX_GOLD,BONUS_LEVEL,isOwnerAccount,boostedSave,grantOwnerBenefits}=require('../owner-benefits');
const {World}=require('../world-engine');
const {publicAccount}=require('../account-store');
function simulate({verified=true,existing=null,marker=false,account=true}={}){
 const database={owners:account?[{id:'uuid-proprietario',email_key:'owner@example.com',
  email:'owner@example.com',email_verified_at:verified?new Date('2026-10-13'):null}]:[],
  characters:existing?{'account:uuid-proprietario':{...existing}}:{},
  marks:marker?{'owner-benefits-v1:uuid-proprietario':'already'}:{},
  calls:[],rollbacks:0,commits:0};
 const pool={async connect(){return {
  async query(sql,args=[]){
   database.calls.push({sql,args});
   if(sql==='BEGIN')return {};
   if(sql==='COMMIT'){database.commits++;return {}}
   if(sql==='ROLLBACK'){database.rollbacks++;return {}}
   if(sql.includes('FROM game_accounts WHERE email_key=')){
    assert.deepEqual(args,['owner@example.com']);
    return {rows:database.owners.filter(a=>a.email_verified_at)};
   }
   if(sql.startsWith('SELECT value FROM meta WHERE'))return {rows:database.marks[args[0]]?[{value:database.marks[args[0]]}]:[]};
   if(sql.startsWith('SELECT data FROM characters'))return {rows:database.characters[args[0]]?[{data:database.characters[args[0]]}]:[]};
   if(sql.startsWith('INSERT INTO characters')){
    database.characters[args[0]]=JSON.parse(args[1]);return {};
   }
   if(sql.startsWith('INSERT INTO meta')){
    database.marks[args[0]]=args[1];return {};
   }
   throw Error('SQL inesperado: '+sql);
  },
  release(){}
 }}};
 const world={saved:{characters:{...database.characters}}};
 return{pool,world,database};
}
test('benefício do proprietário exige e-mail efetivamente confirmado',async()=>{
 const f=simulate({verified:false});
 const out=await grantOwnerBenefits({pool:f.pool,world:f.world,ownerEmail:'OWNER@example.com'});
 assert.equal(out.status,'awaiting_verified_account');
 assert.equal(f.database.commits,0);
 assert.equal(f.database.rollbacks,1);
 assert.equal(Object.keys(f.database.characters).length,0);
 assert.equal(isOwnerAccount({email:'owner@example.com'},'owner@example.com'),false);
 assert.equal(isOwnerAccount({email_verified_at:new Date(),email:'owner@example.com'},'owner@example.com'),true);
 assert.equal(isOwnerAccount({email_verified_at:new Date(),email:'outro@example.com'},'owner@example.com'),false);
});
test('concede nível 100, saúde máxima e 999.999.999 moedas só à conta vinculada',async()=>{
 const f=simulate({existing:{role:'curandeiro',level:8,hp:46,coins:15,
  inventory:{pocao:3,cajado_misericordia:1},story:{stage:16},visited:[0,1]}});
 f.world.saved.characters['account:outro-id']={level:2,coins:30};
 const result=await grantOwnerBenefits({pool:f.pool,world:f.world,ownerEmail:'OWNER@example.com'});
 assert.deepEqual(result,{status:'granted',level:100,coins:MAX_GOLD});
 const save=f.database.characters['account:uuid-proprietario'];
 assert.equal(save.level,BONUS_LEVEL);
 assert.equal(save.hp,125+99*12);
 assert.equal(save.coins,999999999);
 assert.equal(save.xp,0);
 assert.equal(save.role,'curandeiro');
 assert.deepEqual(save.story,{stage:16});
 assert.deepEqual(save.inventory,{pocao:3,cajado_misericordia:1});
 assert.deepEqual(f.world.saved.characters['account:outro-id'],{level:2,coins:30});
 assert.equal(f.database.commits,1);
 assert.equal(Object.keys(f.database.marks).length,1);
 const again=await grantOwnerBenefits({pool:f.pool,world:f.world,ownerEmail:'owner@example.com'});
 assert.equal(again.status,'already_granted');
 assert.equal(f.database.commits,2);
 assert.equal(f.database.calls.filter(x=>x.sql.startsWith('INSERT INTO characters')).length,1);
});
test('conta verificada sem personagem ganha bônus para sua primeira entrada',async()=>{
 const f=simulate();
 const result=await grantOwnerBenefits({pool:f.pool,world:f.world,ownerEmail:'owner@example.com'});
 assert.equal(result.status,'granted');
 const raw=f.world.saved.characters['account:uuid-proprietario'];
 assert.equal(raw.level,100);assert.equal(raw.coins,999999999);
 assert.equal(raw.role,'peregrino');assert.equal(raw.hp,135+99*12);
});
test('outro e-mail não gera administrador e privilégios exigem configuração',async()=>{
 const f=simulate({existing:{role:'guardiao',level:3,coins:120}});
 const noConfig=await grantOwnerBenefits({pool:f.pool,world:f.world,ownerEmail:''});
 assert.equal(noConfig.status,'disabled');assert.equal(f.database.calls.length,0);
 const badConfig=await grantOwnerBenefits({pool:f.pool,world:f.world,ownerEmail:'sem-email'});
 assert.equal(badConfig.status,'invalid_configuration');assert.equal(f.database.calls.length,0);
 const account={email:'owner@example.com',email_verified_at:new Date(),id:'a',username:'Admin'};
 const prev=process.env.OWNER_ACCOUNT_EMAIL;
 try{
  process.env.OWNER_ACCOUNT_EMAIL='owner@example.com';
  assert.equal(publicAccount(account).administrator,true);
  assert.equal(publicAccount({...account,email_verified_at:null}).administrator,false);
  assert.equal(publicAccount({...account,email:'outro@example.com'}).administrator,false);
 }finally{
  if(prev===undefined)delete process.env.OWNER_ACCOUNT_EMAIL;
  else process.env.OWNER_ACCOUNT_EMAIL=prev;
 }
});
test('todos os ganhos ficam limitados ao teto de moedas e não ultrapassam o nível 100',()=>{
 const fake={save:{coins:MAX_GOLD-1,level:100,xp:0,kills:0,story:{stage:40},inventory:{},achievements:[],bossRelics:[]},zone:0,id:'p'};
 // Evita efeitos de rede e testa o ganho diretamente no motor real.
 const w={send(){},ownStatus(){return {}},unlockAchievement(){},tell(){},dirty:false};
 World.prototype.award.call(w,fake,2,300,false,0);
 assert.equal(fake.save.level,100);
 assert.equal(fake.save.coins,MAX_GOLD);
 const text=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 assert.match(text,/· ADMIN/);
 assert.match(text,/Nível 100 · MÁXIMO/);
});

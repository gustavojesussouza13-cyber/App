'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {AccountStore}=require('../account-store');
const {World}=require('../world-engine');
const politics=require('../kingdom-politics');

test('PostgreSQL real persiste duas construções, recibos e moedas após sair e reiniciar', {
 skip:!process.env.TEST_POSTGRES_URL?'Requer PostgreSQL descartável dedicado ao CI':false
},async t=>{
 const config={databaseUrl:process.env.TEST_POSTGRES_URL};
 const stores=[],worlds=[];
 t.after(async()=>{
  for(const world of worlds)world.stop();
  for(const store of stores)await store.close();
 });
 function session(store){
  const world=new World({persistentStore:store,autosave:false,send:()=>{},
   getOnline:()=>0,hasClassicName:()=>false});
  worlds.push(world);
  return world;
 }
 const store=new AccountStore(config);stores.push(store);
 const world=session(store);
 await store.initialize(world);
 const client={socket:{},authUser:{uid:'account:pg-ci-builder',username:'BuilderCI'},worldPlayer:null};
 world.join(client,{name:'BuilderCI'});
 const p=client.worldPlayer;p.save.coins=10000;p.x=768;p.y=512;
 world.guild(p,{action:'create',name:'Reino Persistente CI'});
 const now=Date.now();
 const action=d=>politics.action(world,p,d,{walkable:()=>true,portals:[],npcs:[],now});
 assert.equal(action({action:'place',x:768,y:512}),true);
 const start=p.save.coins;
 const key1='f1a0b123-32aa-4123-8abc-abcdef123481';
 const key2='f1a0b123-32aa-4123-8abc-abcdef123482';
 assert.equal(action({action:'construct',type:'farm',x:2,y:2,requestId:11,opKey:key1}),true);
 assert.equal(action({action:'construct',type:'market',x:8,y:2,requestId:12,opKey:key2}),true);
 assert.equal(p.save.coins,start-400);
 // A sala ainda está aberta e os registros já devem chegar ao Postgres.
 assert.equal(await store.flush(),true);
 const savedGuild=(await store.pool.query('SELECT data FROM guilds WHERE key=$1',['reino persistente ci'])).rows[0].data;
 assert.equal(savedGuild.city.buildings.length,2);
 assert.equal(savedGuild.recentCityActions.length,2);
 assert.deepEqual(savedGuild.city.buildings.map(b=>b.type),['farm','market']);
 const savedCharacter=(await store.pool.query('SELECT data FROM characters WHERE uid=$1',[p.uid])).rows[0].data;
 assert.equal(savedCharacter.coins,start-400);
 assert.equal(savedCharacter.guild,'Reino Persistente CI');
 // Saída, novo processo e nova conexão independente lendo só do banco.
 world.leave(client);
 assert.equal(await store.flush(),true);
 const otherStore=new AccountStore(config);stores.push(otherStore);
 const restored=session(otherStore);
 await otherStore.initialize(restored);
 const login={socket:{},authUser:{uid:'account:pg-ci-builder',username:'BuilderCI'},worldPlayer:null};
 restored.join(login,{name:'BuilderCI'});
 const state=politics.publicState(restored,login.worldPlayer);
 assert.equal(state.persistentAccount,true);
 assert.equal(state.yourGuild.name,'Reino Persistente CI');
 assert.deepEqual(state.cities.find(c=>c.name==='Reino Persistente CI').buildings.map(b=>b.type),['farm','market']);
 assert.equal(state.walletCoins,start-400);
 assert.equal(politics.action(restored,login.worldPlayer,{
  action:'construct',type:'farm',x:2,y:2,requestId:13,opKey:key1
 },{walkable:()=>true,portals:[],npcs:[],now}),true,'repetir mesma operação após login não cobra outra vez');
 assert.equal(login.worldPlayer.save.coins,start-400);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {AccountStore}=require('../account-store');
const {World}=require('../world-engine');
const politics=require('../kingdom-politics');
const {RoomHub}=require('../room-hub');

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


test('PostgreSQL conserva obras em salas privadas, conclui ao voltar e restaura após novo login', {
 skip:!process.env.TEST_POSTGRES_URL?'Requer PostgreSQL isolado':false
},async t=>{
 const accountId='account:ci-private-room-build',guildName='Reino Vivo CI';
 const stores=[],worlds=[],outbox=[];
 t.after(async()=>{
  for(const world of worlds)world.stop();
  for(const store of stores){await store.flush();await store.close()}
 });
 const makeStore=async()=>{
  const store=new AccountStore({databaseUrl:process.env.TEST_POSTGRES_URL});
  stores.push(store);return store;
 };
 const send=(_socket,m)=>outbox.push(m);
 const options={autosave:false,send,getOnline:()=>0,hasClassicName:()=>false};
 const store=await makeStore();
 const main=new World({...options,persistentStore:store});worlds.push(main);
 await store.initialize(main);
 const hub=new RoomHub({mainWorld:main,createWorld:()=>{
  const child=new World({...options,persistentStore:store});worlds.push(child);
  child.saved=main.saved;child.guilds=main.guilds;
  child.kingdomTickLeader=false;
  child.persist=function(){
   for(const player of this.players.values())
    if(player.isAccount)this.saved.characters[player.uid]=structuredClone(player.save);
   if(this.dirty){main.dirty=true;this.dirty=false}
   return main.persist();
  };
  return child;
 }});
 const privateInfo=hub.create({name:'Sala Teste das Obras',owner:accountId});
 const privateRoom=hub.get(privateInfo.id);
 const client={socket:{},authUser:{uid:accountId,username:'ArquitetoCI'},worldPlayer:null};
 privateRoom.world.join(client,{name:'ArquitetoCI'});
 hub.entered(privateRoom);
 const p=client.worldPlayer;p.x=768;p.y=512;p.save.coins=11000;
 privateRoom.world.guild(p,{action:'create',name:guildName});
 assert.equal(p.save.guild,guildName,'criação da guilda deve ser aceita antes de fundar capital');
 const act=(action,now=Date.now())=>politics.action(privateRoom.world,p,action,{now,walkable:()=>true,portals:[],npcs:[]});
 assert.equal(act({action:'place',x:768,y:512}),true);
 const key='f7b0b123-32aa-4123-8abc-abcdef123456';
 assert.equal(act({action:'construct',type:'farm',x:2,y:2,opKey:key,requestId:301}),true);
 assert.equal(await store.flush(),true);
 await Promise.resolve();
 assert.ok(outbox.some(m=>m.type==='kingdomDurable'&&m.id===301&&m.ok),
  'a UI só confirma gravação definitiva após commit do PostgreSQL');
 const guildBefore=(await store.pool.query('SELECT data FROM guilds WHERE key=$1',['reino vivo ci'])).rows[0]?.data;
 assert.equal(guildBefore.city.buildings.length,1);
 assert.equal(guildBefore.city.buildings[0].status,'building');
 const savedEndsAt=guildBefore.city.buildings[0].endsAt;
 // O cliente deixou a sala antes do prazo. O mundo principal continua sendo
 // responsável pela conclusão, mesmo sem nenhum jogador conectado nele.
 privateRoom.world.leave(client);hub.left(privateRoom);
 assert.equal(await store.flush(),true);
 const localLogin={socket:{},authUser:{uid:accountId,username:'ArquitetoCI'},worldPlayer:null};
 main.join(localLogin,{name:'ArquitetoCI'});
 assert.equal(main.guilds.get('reino vivo ci').city.buildings[0].endsAt,savedEndsAt);
 const already=politics.publicState(main,localLogin.worldPlayer);
 assert.equal(already.yourGuild.name,guildName);
 assert.equal(already.cities.find(c=>c.name===guildName).buildings.length,1);
 // Simular o tempo decorrido enquanto o jogador estava desconectado. A
 // inspeção recupera e finaliza também quando a notificação se perdeu.
 const completion=politics.action(main,localLogin.worldPlayer,{action:'inspect'},
  {now:savedEndsAt+1,walkable:()=>true});
 assert.equal(completion,false,'inspect responde estado e não gera cobrança');
 assert.equal(main.guilds.get('reino vivo ci').city.buildings[0].status,'complete');
 assert.equal(await store.flush(),true);
 const persisted=(await store.pool.query('SELECT data FROM guilds WHERE key=$1',['reino vivo ci'])).rows[0]?.data;
 assert.equal(persisted.city.buildings[0].status,'complete');
 main.leave(localLogin);
 assert.equal(await store.flush(),true);
 // Nova instância PostgreSQL / novo World: nenhuma variável em memória da
 // sessão anterior deve ser necessária para recuperar as construções.
 const reloadStore=await makeStore();
 const reloaded=new World({...options,persistentStore:reloadStore});worlds.push(reloaded);
 await reloadStore.initialize(reloaded);
 const again={socket:{},authUser:{uid:accountId,username:'ArquitetoCI'},worldPlayer:null};
 reloaded.join(again,{name:'ArquitetoCI'});
 const city=politics.publicState(reloaded,again.worldPlayer).cities.find(c=>c.name===guildName);
 assert.ok(city,'cidade não desaparece após reiniciar');
 assert.equal(city.buildings.length,1);
 assert.equal(city.buildings[0].status,'complete');
 assert.equal(city.buildings[0].endsAt,savedEndsAt);
 assert.equal(politics.publicState(reloaded,again.worldPlayer).yourGuild.name,guildName);
});

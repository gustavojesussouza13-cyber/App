'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {World}=require('../world-engine');
const politics=require('../kingdom-politics');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const mockStore=()=>{
 const snapshots=[];
 return {snapshots,enqueue(state){snapshots.push(structuredClone(state));},get pending(){return null}};
};
const active=(store,uid='account:rei-do-teste')=>{
 const messages=[];
 const world=new World({persistentStore:store,autosave:false,
  send:(_socket,message)=>messages.push(message),getOnline:()=>0,hasClassicName:()=>false});
 const client={socket:{},authUser:{uid,username:'ReiPersistente'},worldPlayer:null};
 world.join(client,{name:'ReiPersistente',role:'peregrino'});
 return {world,client,p:client.worldPlayer,messages};
};

test('construções de uma conta disparam salvamento imediato, não só o timer de 30 segundos',t=>{
 const store=mockStore(),{world,p,messages}=active(store);
 t.after(()=>world.stop());
 p.save.coins=9000;p.x=768;p.y=512;
 world.guild(p,{action:'create',name:'Fortaleza Eterna'});
 const now=Date.now();
 const action=d=>politics.action(world,p,d,{walkable:()=>true,portals:[],npcs:[],now});
 assert.equal(action({action:'place',x:768,y:512}),true);
 assert.ok(store.snapshots.at(-1).guilds['fortaleza eterna'].base,
  'a base deve ser enfileirada no banco imediatamente');
 const coinsAfterBase=p.save.coins;
 const before=store.snapshots.length;
 const farmKey='f0a0b123-32aa-4123-8abc-abcdef123456';
 assert.equal(action({action:'construct',type:'farm',x:1,y:1,opKey:farmKey,requestId:101}),true);
 assert.ok(store.snapshots.length>before,'a fazenda é enfileirada no mesmo comando');
 let saved=store.snapshots.at(-1);
 assert.equal(saved.guilds['fortaleza eterna'].city.buildings.length,1);
 assert.equal(saved.guilds['fortaleza eterna'].city.buildings[0].type,'farm');
 assert.equal(saved.characters[p.uid].coins,coinsAfterBase-160);
 assert.equal(saved.guilds['fortaleza eterna'].recentCityActions[0].key,farmKey);
 const beforeSecond=store.snapshots.length;
 assert.equal(action({action:'construct',type:'house',x:7,y:7,requestId:102,opKey:'a0a0b123-32aa-4123-8abc-abcdef123457'}),true);
 assert.ok(store.snapshots.length>beforeSecond,'segundo clique salva uma segunda versão sem aguardar o primeiro');
 saved=store.snapshots.at(-1);
 assert.equal(saved.guilds['fortaleza eterna'].city.buildings.length,2);
 assert.equal(saved.characters[p.uid].coins,coinsAfterBase-160-120);
 assert.equal(politics.publicState(world,p).persistentAccount,true);
 assert.equal(politics.publicState(world,p).cities.find(c=>c.name==='Fortaleza Eterna').buildings.length,2);
 assert.equal(messages.filter(msg=>msg.type==='kingdomActionResult'&&msg.ok).length,2);
 // Não retransmitir o débito no mesmo token.
 const beforeReplay=store.snapshots.length;
 assert.equal(action({action:'construct',type:'farm',x:1,y:1,opKey:farmKey,requestId:103}),true);
 assert.equal(store.snapshots.length,beforeReplay);
 assert.equal(p.save.coins,coinsAfterBase-280);
});

test('sair, abrir outra sessão e reiniciar um mundo preserva cidade e produção',t=>{
 const store=mockStore(),session=active(store,'account:persist-reentry');
 t.after(()=>session.world.stop());
 const {world,p,client}=session;
 p.x=768;p.y=512;p.save.coins=9000;
 world.guild(p,{action:'create',name:'Reino Duradouro'});
 const now=Date.now();
 const action=d=>politics.action(world,p,d,{walkable:()=>true,portals:[],npcs:[],now});
 assert.equal(action({action:'place',x:768,y:512}),true);
 assert.equal(action({action:'construct',type:'farm',x:2,y:2,opKey:'f1a0b123-32aa-4123-8abc-abcdef123451',requestId:1}),true);
 assert.equal(action({action:'construct',type:'market',x:7,y:3,opKey:'f1a0b123-32aa-4123-8abc-abcdef123452',requestId:2}),true);
 const beforeExit=store.snapshots.at(-1);
 assert.equal(beforeExit.guilds['reino duradouro'].city.buildings.length,2);
 world.leave(client);
 // Novo processo reconstruído exclusivamente do snapshot persistido.
 const restored=active(store,'account:new-temp-process');
 t.after(()=>restored.world.stop());
 restored.world.leave(restored.client);
 restored.world.saved=structuredClone(beforeExit);
 restored.world.guilds=new Map(Object.entries(restored.world.saved.guilds));
 const account={socket:{},authUser:{uid:'account:persist-reentry',username:'ReiPersistente'},worldPlayer:null};
 restored.world.join(account,{name:'ReiPersistente'});
 const player=account.worldPlayer;
 assert.equal(player.save.guild,'Reino Duradouro');
 const pub=politics.publicState(restored.world,player);
 assert.equal(pub.persistentAccount,true);
 assert.deepEqual(pub.cities.find(c=>c.name==='Reino Duradouro').buildings.map(b=>b.type),['farm','market']);
 const collect=politics.action(restored.world,player,{action:'collect',requestId:3,opKey:'f1a0b123-32aa-4123-8abc-abcdef123453'},{
  walkable:()=>true,now:now+15*60*1000+1});
 assert.equal(collect,true,'a fazenda produtiva continua válida depois de reiniciar');
 assert.ok(restored.world.guilds.get('reino duradouro').city.stock.food>=8);
 assert.ok(store.snapshots.at(-1).guilds['reino duradouro'].city.stock.food>=8);
});

test('visitantes não podem fundar ou simular construções permanentes',t=>{
 const store=mockStore(),world=new World({persistentStore:store,autosave:false,send:()=>{},getOnline:()=>0,hasClassicName:()=>false});
 t.after(()=>world.stop());
 const client={socket:{},worldPlayer:null};
 world.join(client,{name:'VisitanteReino',token:'7'.repeat(64)});
 const p=client.worldPlayer;
 assert.equal(p.isAccount,false);
 p.save.coins=5000;p.x=768;p.y=512;
 world.guild(p,{action:'create',name:'Visitantes do Norte'});
 const act=d=>politics.action(world,p,d,{walkable:()=>true,portals:[],npcs:[],now:Date.now()});
 assert.equal(act({action:'place',x:768,y:512}),false);
 assert.equal(politics.publicState(world,p).persistentAccount,false);
 assert.equal(act({action:'construct',type:'house',x:1,y:1}),false);
 assert.equal(world.guilds.has('visitantes do norte'),false,'visitantes não fundam guildas permanentes');
});

test('construções em servidores privados são gravadas na mesma guilda global e reaparecem na praça pública',t=>{
 const store=mockStore(),shared={send:()=>{},getOnline:()=>0,hasClassicName:()=>false};
 const primary=new World({...shared,persistentStore:store,autosave:false});
 const secondary=new World({...shared,persistentStore:store,autosave:false});
 t.after(()=>{secondary.stop();primary.stop()});
 // A mesma integração usada por createWorld() no server.js:
 secondary.saved=primary.saved;
 secondary.guilds=primary.guilds;
 secondary.kingdomTickLeader=false;
 secondary.persist=function(){
  for(const player of this.players.values())if(player.isAccount)
   this.saved.characters[player.uid]={...player.save,guild:player.save.guild};
  if(this.dirty){primary.dirty=true;this.dirty=false}
  primary.persist();
 };
 const client={socket:{},authUser:{uid:'account:server-room',username:'RoomKing'},worldPlayer:null};
 secondary.join(client,{name:'RoomKing'});
 const p=client.worldPlayer;p.x=768;p.y=512;p.save.coins=5000;
 secondary.guild(p,{action:'create',name:'Cidade das Salas'});
 const now=Date.now(),act=data=>politics.action(secondary,p,data,{walkable:()=>true,now,portals:[],npcs:[]});
 assert.equal(act({action:'place',x:768,y:512}),true);
 const before=store.snapshots.length;
 assert.equal(act({action:'construct',type:'house',x:2,y:2,requestId:1,
  opKey:'f1a0b123-32aa-4123-8abc-abcdef123461'}),true);
 assert.ok(store.snapshots.length>before,'a sala precisa gravar por intermédio do mundo principal sem esperar sair');
 assert.equal(store.snapshots.at(-1).guilds['cidade das salas'].city.buildings.length,1);
 secondary.leave(client);
 const reentry={socket:{},authUser:{uid:'account:server-room',username:'RoomKing'},worldPlayer:null};
 primary.join(reentry,{name:'RoomKing'});
 const state=politics.publicState(primary,reentry.worldPlayer);
 assert.equal(state.persistentAccount,true);
 assert.equal(state.yourGuild.name,'Cidade das Salas');
 assert.deepEqual(state.cities.find(c=>c.name==='Cidade das Salas').buildings.map(b=>b.type),['house']);
 assert.equal(state.walletCoins,5000-250-800-120);
});

test('SQLite mantém prédios entre processos antes mesmo do jogador sair',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-guild-durability-'));
 const file=path.join(dir,'world.sqlite');
 const sent=[];
 const args={dataFile:file,autosave:false,send:(_s,m)=>sent.push(m),getOnline:()=>0,hasClassicName:()=>false};
 const first=new World(args);
 let second=null;
 t.after(()=>{try{second?.stop()}finally{first.stop();fs.rmSync(dir,{recursive:true,force:true})}});
 const c={socket:{},authUser:{uid:'account:sqlite-guild',username:'ReiDuravel'},worldPlayer:null};
 first.join(c,{name:'ReiDuravel'});
 const p=c.worldPlayer;p.save.coins=10000;p.x=768;p.y=512;
 first.guild(p,{action:'create',name:'Muralhas da Aurora'});
 const opts={walkable:()=>true,portals:[],npcs:[],now:Date.now()};
 const act=d=>politics.action(first,p,d,opts);
 assert.equal(act({action:'place',x:768,y:512}),true);
 assert.equal(act({action:'construct',type:'farm',x:2,y:2,requestId:31,
  opKey:'f1a0b123-32aa-4123-8abc-abcdef123471'}),true);
 assert.equal(act({action:'construct',type:'market',x:8,y:2,requestId:32,
  opKey:'f1a0b123-32aa-4123-8abc-abcdef123472'}),true);
 // Lê disco enquanto o jogador AINDA está conectado: nenhum autosave ocorreu.
 second=new World(args);
 const d={socket:{},authUser:{uid:'account:sqlite-guild',username:'ReiDuravel'},worldPlayer:null};
 second.join(d,{name:'ReiDuravel'});
 const city=politics.publicState(second,d.worldPlayer).cities.find(c=>c.name==='Muralhas da Aurora');
 assert.ok(city);
 assert.deepEqual(city.buildings.map(b=>b.type),['farm','market']);
 assert.equal(second.guilds.get('muralhas da aurora').city.buildings.length,2);
});

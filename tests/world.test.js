'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {World,ZONES,ZONE_W,ZONE_H,CLASSES}=require('../world-engine');
const mk=()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-world-'));
 const deliveries=new Map();
 const server=new World({send:(sock,obj)=>{let v=deliveries.get(sock);if(!v){v=[];deliveries.set(sock,v)}v.push(obj)},getOnline:()=>0,hasClassicName:()=>false,dataFile:path.join(dir,'world.json')});
 function add(name,role='peregrino',token=crypto.randomBytes(32).toString('hex')){
  const socket={},c={socket,worldPlayer:null};server.join(c,{name,token,role});return {socket,c,p:c.worldPlayer,events:()=>deliveries.get(socket)||[],token};
 }
 return {server,dir,deliveries,add,cleanup(){server.stop();fs.rmSync(dir,{recursive:true,force:true})}};
};
test('mundo 16-bit contém 16 regiões e mais de 400 monstros compartilhados',t=>{
 const w=mk();t.after(w.cleanup);assert.equal(ZONES.length,16);assert.ok(w.server.totalMonsters()>=400);
 for(let i=0;i<16;i++)assert.ok(w.server.monsters.get(i).some(m=>m.boss));
});
test('sem conta: token local carrega progresso salvo; tokens diferentes não herdam progresso',t=>{
 const w=mk();t.after(w.cleanup);const p=w.add('AuroraTeste');
 p.p.save.level=9;p.p.save.coins=888;p.p.save.inventory.pocao=27;w.server.leave(p.c);
 w.server.persist();const newServer=new World({send:()=>{},getOnline:()=>0,hasClassicName:()=>false,dataFile:path.join(w.dir,'world.json')});
 const c={socket:{},worldPlayer:null};newServer.join(c,{name:'AuroraTeste',token:p.token});
 assert.equal(c.worldPlayer.save.level,9);assert.equal(c.worldPlayer.save.coins,888);assert.equal(c.worldPlayer.save.inventory.pocao,27);
 const clone={socket:{},worldPlayer:null};newServer.join(clone,{name:'OutroTeste',token:crypto.randomBytes(32).toString('hex')});assert.equal(clone.worldPlayer.save.level,1);newServer.stop();
});
test('regra de limite de 10 rejeita o 11º e libera a vaga ao desconectar',t=>{
 const w=mk();t.after(w.cleanup);const players=Array.from({length:10},(_,i)=>w.add('PeregrinoTeste'+i));assert.equal(w.server.count,10);
 const overflow=w.add('ExtraTeste');assert.equal(overflow.p,null);assert.ok(overflow.events().some(m=>m.code==='full'));
 w.server.leave(players[2].c);assert.equal(w.server.count,9);assert.ok(w.add('PeregrinoNovo').p);
});
test('combate cooperativo recompensa dois jogadores, monstros revivem após respawn',t=>{
 const w=mk();t.after(w.cleanup);
 const a=w.add('AnaTeste'),b=w.add('BiaTeste');const monster=w.server.monsters.get(0)[0];
 for(const x of [a,b]){x.p.x=monster.x+15;x.p.y=monster.y+15}
 monster.hp=26;w.server.attack(a.p,monster.id,false);w.server.attack(b.p,monster.id,true);
 assert.equal(monster.hp,0);assert.ok(a.p.save.kills>=1);assert.ok(b.p.save.kills>=1);
 assert.ok(a.events().some(e=>e.type==='reward'));assert.ok(b.events().some(e=>e.type==='reward'));
 monster.deadUntil=Date.now()-1;w.server.tick();assert.equal(monster.hp,monster.maxHp);
});
test('guildas, equipes, missões e mercado funcionam sem cadastro',t=>{
 const w=mk();t.after(w.cleanup);const a=w.add('LiaTeste'),b=w.add('LeoTeste');
 a.p.save.coins=500;a.p.x=b.p.x;a.p.y=b.p.y;
 w.server.party(a.p,{action:'create'});w.server.party(a.p,{action:'invite',target:'LeoTeste'});
 const invited=b.events().find(e=>e.type==='partyInvite');assert.ok(invited);w.server.party(b.p,{action:'accept',party:invited.party});assert.equal(a.p.party,b.p.party);
 w.server.guild(a.p,{action:'create',name:'Aurora Viva'});assert.equal(a.p.save.guild,'Aurora Viva');
 w.server.guild(a.p,{action:'invite',target:'LeoTeste'});w.server.guild(b.p,{action:'accept',name:'Aurora Viva'});assert.equal(b.p.save.guild,'Aurora Viva');
 w.server.buy(a.p,'pocao');assert.ok(a.p.save.inventory.pocao>=4);
 a.p.save.kills=6;w.server.claimQuests(a.p);assert.ok(a.p.save.quests.includes('primeiro-passo'));
});
test('comércio só permite entregar itens possuídos e jogadores próximos',t=>{
 const w=mk();t.after(w.cleanup);const a=w.add('JoaoTeste'),b=w.add('MariaTeste');a.p.x=b.p.x;a.p.y=b.p.y;
 const initial=a.p.save.inventory.pocao;
 w.server.trade(a.p,{action:'offer',target:'MariaTeste',item:'pocao',count:999,gold:0});assert.equal(b.events().filter(e=>e.type==='tradeOffer').length,0);
 w.server.trade(a.p,{action:'offer',target:'MariaTeste',item:'pocao',count:1,gold:0});assert.ok(b.events().some(e=>e.type==='tradeOffer'));
 w.server.trade(b.p,{action:'accept',target:'JoaoTeste'});assert.equal(a.p.save.inventory.pocao,initial-1);assert.equal(b.p.save.inventory.pocao,initial+1);
});
test('viagens aceitam vizinhas e chave para masmorras; teleportes remotos são rejeitados',t=>{
 const w=mk();t.after(w.cleanup);const a=w.add('TomasTeste');
 w.server.travel(a.p,11);assert.equal(a.p.zone,0);
 w.server.travel(a.p,1);assert.equal(a.p.zone,1);
 w.server.travel(a.p,12);assert.equal(a.p.zone,1);
 a.p.save.inventory.chave=1;w.server.travel(a.p,12);assert.equal(a.p.zone,12);assert.equal(a.p.save.inventory.chave,0);
 w.server.travel(a.p,1);assert.equal(a.p.zone,1);
});
test('classes e vida persistem; API protege faixas de movimentação',t=>{
 const w=mk();t.after(w.cleanup);const a=w.add('NicoTeste');w.server.chooseClass(a.p,'guardiao');assert.equal(a.p.save.role,'guardiao');assert.equal(a.p.save.hp,CLASSES.guardiao.hp);
 a.p.lastMove=Date.now()-100;const ox=a.p.x;w.server.receive(a.c,{type:'move',x:10**9,y:10**9});assert.ok(a.p.x-ox<50);assert.ok(a.p.x<ZONE_W&&a.p.y<ZONE_H);
});
test('personagem e guilda são preservados no banco SQLite, quando disponível',t=>{
 let DatabaseSync;try{({DatabaseSync}=require('node:sqlite'))}catch{return t.skip('SQLite embutido indisponível')}
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-sqlite-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'world.sqlite'),send=()=>{};
 const a=new World({send,getOnline:()=>0,hasClassicName:()=>false,dataFile:file});
 const token=crypto.randomBytes(32).toString('hex');const c={socket:{},worldPlayer:null};a.join(c,{name:'PersistenteTeste',token});
 c.worldPlayer.save.level=17;c.worldPlayer.save.coins=1234;a.guild(c.worldPlayer,{action:'create',name:'Luz Eterna'});a.stop();
 const b=new World({send,getOnline:()=>0,hasClassicName:()=>false,dataFile:file});
 const d={socket:{},worldPlayer:null};b.join(d,{name:'PersistenteTeste',token});assert.equal(d.worldPlayer.save.level,17);assert.equal(d.worldPlayer.save.coins,984);assert.equal(d.worldPlayer.save.guild,'Luz Eterna');b.stop();
});

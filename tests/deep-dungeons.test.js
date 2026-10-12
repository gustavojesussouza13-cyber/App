'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {World,ZONES}=require('../world-engine');
function setup(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-dungeons-'));
 const file=path.join(dir,'world.json'),events=[];
 const world=new World({send:(_socket,event)=>events.push(event),getOnline:()=>0,hasClassicName:()=>false,dataFile:file});
 t.after(()=>{world.stop();fs.rmSync(dir,{recursive:true,force:true})});
 const token=crypto.randomBytes(32).toString('hex'),client={socket:{},worldPlayer:null};
 world.join(client,{name:'ExploradorDungeon',token});
 return {world,p:client.worldPlayer,client,token,events,file};
}
test('mundo cresce para quarenta mapas, sem mudar IDs antigos',()=>{
 assert.equal(ZONES.length,40);
 assert.equal(ZONES[0][0],'Vale das Oliveiras');
 assert.equal(ZONES[11][0],'Terra da Última Luz');
 assert.equal(ZONES[12][0],'Masmorra da Raiz');
 assert.equal(ZONES[15][0],'Câmara da Aurora');
 const titles=ZONES.slice(16).map(x=>x[0]);
 assert.equal(new Set(titles).size,24);
 assert.ok(titles.every(x=>x.includes('Subsolo')));
});
test('quatro masmorras possuem seis andares e caminho de volta válido',t=>{
 const {world}=setup(t);
 for(let root=12;root<=15;root++){
  let current=root,previous=[1,3,5,11][root-12];
  for(let depth=1;depth<=6;depth++){
   const next=16+(root-12)*6+depth-1;
   const portals=world.zonePortals(current);
   assert.ok(portals.some(g=>g.zone===next),`não há entrada do andar ${depth} na masmorra ${root}`);
   assert.ok(world.zonePortals(next).some(g=>g.zone===current),'andar sem saída');
   previous=current;current=next;
  }
  assert.equal(world.zonePortals(current).length,1,'último andar termina em sala final');
  assert.equal(world.zonePortals(root)[0].zone,[1,3,5,11][root-12]);
 }
});
test('entrar na masmorra gasta uma chave, andar entre subsolos não gasta outras',t=>{
 const {world,p,client,events}=setup(t);
 world.travel(p,1);p.save.inventory.chave=1;
 const gate=world.zonePortals(1).find(g=>g.zone===12);
 p.x=gate.x;p.y=gate.y;
 world.receive(client,{type:'portal',zone:12});
 assert.equal(p.zone,12);assert.equal(p.save.inventory.chave,0);
 for(let level=1;level<=6;level++){
  const next=15+level;
  const stair=world.zonePortals(p.zone).find(g=>g.zone===next);
  assert.ok(stair,`passagem do subsolo ${level} ausente`);
  p.x=stair.x;p.y=stair.y;
  world.receive(client,{type:'portal',zone:next});
  assert.equal(p.zone,next,`subsolo ${level} falhou`);
  assert.equal(p.save.inventory.chave,0,'chave não deve ser gasta repetidamente');
 }
 const exit=world.zonePortals(p.zone)[0];
 p.x=exit.x;p.y=exit.y;
 world.receive(client,{type:'portal',zone:20});
 assert.equal(p.zone,20);
 assert.equal(events.filter(x=>x.type==='travel').length,9);
});
test('pacotes falsos não pulam cinco subsolos nem burlam a distância',t=>{
 const {world,p,client}=setup(t);
 world.travel(p,1);p.save.inventory.chave=2;
 const gate=world.zonePortals(1).find(g=>g.zone===12);
 p.x=gate.x;p.y=gate.y;
 world.receive(client,{type:'portal',zone:12});
 assert.equal(p.zone,12);
 world.receive(client,{type:'portal',zone:21});
 assert.equal(p.zone,12);
 const stair=world.zonePortals(12).find(g=>g.zone===16);
 p.x=stair.x+130;p.y=stair.y;
 world.receive(client,{type:'portal',zone:16});
 assert.equal(p.zone,12);
});
test('personagem salvo num novo subsolo mantém posição e inventário ao reconectar',t=>{
 const {world,p,client,token,file}=setup(t);
 p.save.inventory.chave=3;p.save.inventory.pocao=9;
 p.zone=39;p.save.zone=39;p.x=720;p.y=510;
 world.leave(client);world.stop();
 const recovered=new World({send:()=>{},getOnline:()=>0,hasClassicName:()=>false,dataFile:file});
 t.after(()=>recovered.stop());
 const rejoin={socket:{},worldPlayer:null};
 recovered.join(rejoin,{name:'ExploradorDungeon',token});
 assert.equal(rejoin.worldPlayer.zone,39);
 assert.equal(rejoin.worldPlayer.save.inventory.pocao,9);
 assert.equal(rejoin.worldPlayer.save.inventory.chave,3);
});
test('cada região adicional tem criaturas e um chefe independente',t=>{
 const {world}=setup(t);
 assert.equal(world.totalMonsters(),576);
 for(let z=16;z<40;z++){
  const mobs=world.monsters.get(z);
  assert.equal(mobs.length,14);
  assert.equal(mobs.filter(m=>m.boss).length,1);
  assert.ok(mobs.every(m=>m.zone===z&&m.hp>0));
 }
});

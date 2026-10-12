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
  const finalPortals=world.zonePortals(current);
  assert.equal(finalPortals.length,2,'último andar deve permitir voltar ou continuar');
  const gateway=finalPortals.find(g=>g.gateway);
  assert.ok(gateway,'portal de continuação ausente');
  assert.equal(gateway.zone,root<15?root+1:10,'continuação deve chegar à próxima masmorra ou à cidade');
  assert.equal(gateway.kind,'gateway');
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

test('jogador atravessa os 24 subsolos das quatro masmorras por portais reais',t=>{
 const {world,p,client,events}=setup(t);
 world.travel(p,1);
 p.save.inventory.chave=1;
 for(let root=12;root<16;root++){
  const entrance=world.zonePortals(p.zone).find(g=>g.zone===root);
  assert.ok(entrance,`entrada da masmorra ${root} ausente vindo de ${p.zone}`);
  p.x=entrance.x;p.y=entrance.y;
  world.receive(client,{type:'portal',zone:root});
  assert.equal(p.zone,root);
  for(let depth=1;depth<=6;depth++){
   const floor=16+(root-12)*6+(depth-1);
   const gate=world.zonePortals(p.zone).find(g=>g.zone===floor);
   assert.ok(gate,`portal para ${floor} ausente`);
   p.x=gate.x;p.y=gate.y;
   world.receive(client,{type:'portal',zone:floor});
   assert.equal(p.zone,floor,`falhou entrar no subsolo ${depth} de ${root}`);
   assert.ok(p.save.visited.includes(floor),'subsolo não registrado como visitado');
  }
  assert.equal(p.save.inventory.chave,0,'a jornada contínua não deve consumir várias chaves');
 }
 const end=world.zonePortals(p.zone).find(g=>g.gateway);
 assert.equal(p.zone,39);
 assert.ok(end&&end.zone===10,'saída final deveria levar à Cidadela de Auren');
 p.x=end.x;p.y=end.y;
 world.receive(client,{type:'portal',zone:10});
 assert.equal(p.zone,10);
 assert.equal(new Set(p.save.visited.filter(z=>z>=16)).size,24);
 assert.ok(events.some(e=>e.type==='travel'&&e.zone===10),'servidor deve enviar viagem de volta à cidade');
});
test('porta final não permite pular masmorras nem teleportar de longe',t=>{
 const {world,p,client}=setup(t);
 world.travel(p,1);
 p.save.inventory.chave=1;
 const entry=world.zonePortals(1).find(g=>g.zone===12);
 p.x=entry.x;p.y=entry.y;
 world.receive(client,{type:'portal',zone:12});
 assert.equal(p.zone,12);
 world.receive(client,{type:'portal',zone:13});
 assert.equal(p.zone,12,'não pode pular diretamente de um primeiro piso para a próxima masmorra');
 p.zone=21;p.save.zone=21;
 const end=world.zonePortals(21).find(g=>g.gateway);
 assert.equal(end.zone,13);
 p.x=end.x+112;p.y=end.y;
 world.receive(client,{type:'portal',zone:13});
 assert.equal(p.zone,21,'acesso remoto a portal não deve funcionar');
 p.x=end.x;p.y=end.y;
 world.receive(client,{type:'portal',zone:13});
 assert.equal(p.zone,13);
});
test('renderizador não desenha falsas entradas de masmorra, apenas portais do servidor',()=>{
 const visual=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8');
 const client=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 assert.doesNotMatch(visual,/key:biome==='dungeon'\?'portal_fechado'/);
 assert.match(visual,/cut\(g,'portal_aberto',-34,-92,68,92\)/);
 assert.match(visual,/E · USAR PASSAGEM/);
 assert.match(client,/gate\.gateway\?/);
 assert.match(client,/wy>=p\.y-140&&wy<=p\.y\+34/);
});

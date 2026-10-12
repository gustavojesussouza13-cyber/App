'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto');
const {World,ZONES,ZONE_W,ZONE_H}=require('../world-engine');
function make(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-portal-')),messages=[];
 const world=new World({send:(_s,m)=>messages.push(m),getOnline:()=>0,hasClassicName:()=>false,dataFile:path.join(dir,'world.json')});
 t.after(()=>{world.stop();fs.rmSync(dir,{recursive:true,force:true})});
 const c={socket:{},worldPlayer:null};
 world.join(c,{name:'Portaleiro',token:crypto.randomBytes(32).toString('hex')});
 assert.ok(c.worldPlayer);
 return {world,p:c.worldPlayer,c,messages};
}
test('todas as dezesseis regiões têm portais com coordenadas acessíveis e destinos legais',t=>{
 const {world}=make(t);
 for(let zone=0;zone<ZONES.length;zone++){
  const gates=world.zonePortals(zone);
  assert.ok(gates.length>=1&&gates.length<=5,`portais em ${zone}: ${gates.length}`);
  assert.equal(new Set(gates.map(g=>g.zone)).size,gates.length);
  for(const gate of gates){
   assert.ok(gate.x>100&&gate.x<ZONE_W-100);
   assert.ok(gate.y>300&&gate.y<700);
   assert.ok(gate.zone>=0&&gate.zone<ZONES.length);
   if(zone>=12)assert.equal(gate.zone,[1,3,5,11][zone-12]);
   else if(gate.zone>=12)assert.equal([1,3,5,11][gate.zone-12],zone);
   else assert.ok(Math.abs(gate.zone-zone)<=2&&gate.zone!==zone);
  }
 }
});
test('distância do portal é validada no servidor contra tentativas de teletransporte',t=>{
 const {world,p,c,messages}=make(t);
 const gate=world.zonePortals(p.zone)[0];
 const old=p.zone;
 p.x=1400;p.y=900;
 world.receive(c,{type:'portal',zone:gate.zone});
 assert.equal(p.zone,old);
 assert.ok(messages.some(m=>m.type==='notice'&&m.text.includes('Aproxime-se')));
 p.x=gate.x+35;p.y=gate.y+35;
 world.receive(c,{type:'portal',zone:gate.zone});
 assert.equal(p.zone,gate.zone);
 assert.ok(messages.some(m=>m.type==='travel'&&m.portals.length>0));
});
test('portal para masmorra exige chave e não consome chave quando está longe',t=>{
 const {world,p,c,messages}=make(t);
 world.travel(p,1);assert.equal(p.zone,1);
 const gate=world.zonePortals(1).find(g=>g.zone===12);
 assert.ok(gate);
 p.save.inventory.chave=1;
 p.x=15;p.y=900;
 world.receive(c,{type:'portal',zone:12});
 assert.equal(p.zone,1);assert.equal(p.save.inventory.chave,1);
 p.x=gate.x;p.y=gate.y;
 world.receive(c,{type:'portal',zone:12});
 assert.equal(p.zone,12);assert.equal(p.save.inventory.chave,0);
 const returnGate=world.zonePortals(12)[0];
 assert.equal(returnGate.zone,1);
 p.x=returnGate.x;p.y=returnGate.y;
 world.receive(c,{type:'portal',zone:1});
 assert.equal(p.zone,1);
});
test('porta não autorizada é rejeitada mesmo com pacote manipulado',t=>{
 const {world,p,c}=make(t);
 p.x=768;p.y=512;
 world.receive(c,{type:'portal',zone:15});
 assert.equal(p.zone,0);
 world.receive(c,{type:'portal',zone:'1'});
 assert.equal(p.zone,0);
 world.receive(c,{type:'portal',zone:9999});
 assert.equal(p.zone,0);
});
test('navegador recebe portais iniciais, troca de região e renderiza-os no mapa',t=>{
 const {messages,p}=make(t);
 const welcome=messages.find(m=>m.type==='welcome');
 assert.ok(welcome.portals.length>0);
 assert.equal(welcome.portals[0].name,ZONES[welcome.portals[0].zone][0]);
 const code=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 const art=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8');
 assert.match(code,/session\.portals=msg\.portals\|\|\[\]/);
 assert.match(code,/send\('portal',\{zone:gate\.zone\}\)/);
 assert.match(art,/function portal\(g,p,now\)/);
 assert.match(art,/actors\.push\(\{depth:p\.y-1,paint:\(\)=>portal/);
 assert.match(art,/for\(const p of portals\)g\.fillRect/);
 assert.equal(p.save.bossRelics.length,0,'portais não alteram relíquias');
});

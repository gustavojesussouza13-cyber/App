'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {World,ZONE_W}=require('../world-engine');

function createWorld(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-budget-'));
 const messages=new Map();
 const world=new World({
  send:(socket,data)=>{if(!messages.has(socket))messages.set(socket,[]);messages.get(socket).push(data)},
  getOnline:()=>0,hasClassicName:()=>false,dataFile:path.join(dir,'world.json')
 });
 t.after(()=>{world.stop();fs.rmSync(dir,{recursive:true,force:true})});
 const players=[];
 function add(name){
  const c={socket:{},worldPlayer:null};
  world.join(c,{name,token:crypto.randomBytes(32).toString('hex')});
  assert.ok(c.worldPlayer);
  players.push(c.worldPlayer);
  return c;
 }
 return {world,add,players,messages};
}

test('spam de 100 comandos não multiplica a velocidade máxima permitida',t=>{
 const {world,add}=createWorld(t),client=add('RapidoTeste'),p=client.worldPlayer;
 const start=p.x;
 for(let i=0;i<100;i++){
  p.lastMove=Date.now()-21;
  world.receive(client,{type:'move',x:ZONE_W-26,y:p.y,dir:1});
 }
 const moved=p.x-start;
 assert.ok(moved>250,'movimento normal continua funcionando');
 assert.ok(moved<440,`exploração da velocidade detectada: ${moved}px em ~2,1s`);
 assert.ok(p.moveCredit>=0);
});

test('pacotes enviados mais rápido que 20ms são descartados',t=>{
 const {world,add}=createWorld(t),c=add('PacoteTeste'),p=c.worldPlayer;
 p.lastMove=Date.now();
 const x=p.x,credit=p.moveCredit;
 world.receive(c,{type:'move',x:x+200,y:p.y});
 assert.equal(p.x,x);
 assert.equal(p.moveCredit,credit);
});

test('atraso de rede tolera uma correção curta mas não teletransporte',t=>{
 const {world,add}=createWorld(t),c=add('AtrasoTeste'),p=c.worldPlayer;
 const old=p.x;
 p.lastMove=Date.now()-4000;
 world.receive(c,{type:'move',x:ZONE_W-26,y:p.y,dir:1});
 assert.ok(p.x-old>40);
 assert.ok(p.x-old<=195*.25+12.1,'reserva máxima impedirá teleporte');
 assert.ok(p.moveCredit>=0);
});

test('pacotes inválidos e mudanças de direção não criam crédito extra',t=>{
 const {world,add}=createWorld(t),c=add('DirecaoTeste'),p=c.worldPlayer;
 p.lastMove=Date.now()-40;
 world.receive(c,{type:'move',x:NaN,y:p.y});
 assert.equal(p.save.x,p.x);
 const before=p.moveCredit;
 for(let i=0;i<20;i++){
  p.lastMove=Date.now()-21;
  world.receive(c,{type:'move',x:i%2?p.x-100:p.x+100,y:p.y,dir:i%2?3:1});
 }
 assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
 assert.ok(p.x>=24&&p.x<=ZONE_W-24);
 assert.ok(p.moveCredit<=195*.25+12.01);
 assert.ok(before>=0);
});

test('simulação sintética de dez jogadores preserva lotação e snapshots',t=>{
 const {world,add,players,messages}=createWorld(t);
 const clients=Array.from({length:10},(_,i)=>add('CargaTeste'+i));
 const start=performance.now();
 for(let step=0;step<125;step++){
  for(const [i,c] of clients.entries()){
   const p=c.worldPlayer;
   p.lastMove=Date.now()-86;
   world.receive(c,{type:'move',x:p.x+(i%2?-13:13),y:p.y,dir:1});
  }
  world.lastTick=Date.now()-350;
  world.tick();
 }
 const elapsed=performance.now()-start;
 assert.equal(world.count,10);
 assert.ok(elapsed<8000,`carga sintética excedeu o prazo: ${Math.round(elapsed)}ms`);
 assert.ok(players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 assert.ok(clients.every(c=>messages.get(c.socket).some(m=>m.type==='snapshot')));
});

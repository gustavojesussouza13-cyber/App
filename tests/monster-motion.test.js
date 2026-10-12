'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {World}=require('../world-engine');
const {create}=require('../public/monster-motion');

function setup(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-monster-motion-'));
 const world=new World({send:()=>{},getOnline:()=>0,hasClassicName:()=>false,dataFile:path.join(dir,'db.json')});
 t.after(()=>{world.stop();fs.rmSync(dir,{recursive:true,force:true})});
 const m=world.monsters.get(0)[0];
 const p={id:'test-player',zone:0,x:m.x+10,y:m.y+10,save:{role:'peregrino',hp:135,inventory:{},coins:0}};
 world.players.set(p.id,p);
 t.after(()=>world.players.delete(p.id));
 return {world,m,p};
}

test('criaturas passeiam sem saltar 24 pixels instantaneamente',t=>{
 const {world,m}=setup(t);
 m.wander=0;
 let travelled=0;let movedTicks=0;
 for(let i=0;i<45;i++){
  const x=m.x,y=m.y;
  world.lastTick=Date.now()-350;
  world.tick();
  const d=Math.hypot(m.x-x,m.y-y);
  // O servidor limita dt a 0,5 s; pequenas variações do relógio não são teleporte.
  assert.ok(d<=15.01,`passo anormal no tick ${i}: ${d}`);
  assert.ok(Math.abs(m.x-m.home.x)<=90.01);
  assert.ok(Math.abs(m.y-m.home.y)<=90.01);
  travelled+=d;if(d>.05)movedTicks++;
 }
 assert.ok(travelled>12,`monstro ficou imóvel ${travelled}`);
 assert.ok(movedTicks>=3,`esperado movimento gradual, apenas ${movedTicks} ticks`);
});

test('perseguição e retorno ao lar seguem limites de velocidade, sem teleporte',t=>{
 const {world,m,p}=setup(t);
 m.x=m.home.x+280;m.y=m.home.y+130;
 m.wander=Date.now()+10000;m.aggroTarget=null;
 for(let i=0;i<8;i++){
  const x=m.x,y=m.y;world.lastTick=Date.now()-350;world.tick();
  assert.ok(Math.hypot(m.x-x,m.y-y)<=14.01);
 }
 m.x=m.home.x;m.y=m.home.y;m.wander=0;
 m.wanderGoal={x:m.x+30,y:m.y};
 m.aggroTarget=p.id;m.aggroUntil=Date.now()+50000;
 p.x=m.x+170;p.y=m.y;
 world.lastTick=Date.now()-350;world.tick();
 assert.equal(m.wanderGoal,null,'ao perseguir deve cancelar destino de passeio');
 assert.ok(Math.hypot(m.x-m.home.x,m.y-m.home.y)<=20.31);
});

test('visual interpola quadros entre snapshots sem alterar posições do servidor',()=>{
 const motion=create();
 const authoritative=[{id:'m-0-1',x:100,y:100,hp:25}];
 motion.sync(authoritative);
 assert.deepEqual(motion.draw(authoritative,1/60)[0].x,100);
 authoritative[0]={...authoritative[0],x:124};
 motion.sync(authoritative);
 const one=motion.draw(authoritative,1/60)[0];
 assert.ok(one.x>100&&one.x<124,`posição intermediária incorreta: ${one.x}`);
 assert.equal(authoritative[0].x,124,'não modifica estado autoritativo');
 for(let i=0;i<90;i++)motion.draw(authoritative,1/60);
 assert.ok(Math.abs(motion.position('m-0-1').x-124)<.001);
});

test('nascimento distante, desaparecimento e mudança de zona não geram travessia do mapa',()=>{
 const motion=create();const m={id:'m-0-1',x:30,y:40};
 motion.sync([m]);motion.draw([m],.016);
 const distant={...m,x:1200,y:800};
 motion.sync([distant]);assert.equal(motion.draw([distant],.016)[0].x,1200);
 motion.sync([]);assert.equal(motion.position(m.id),undefined);
 const fresh={id:'m-1-1',x:250,y:300};motion.sync([fresh]);assert.equal(motion.draw([fresh],.016)[0].y,300);
 motion.clear();assert.equal(motion.position(fresh.id),undefined);
});

test('Mundo Aberto carrega interpolação após a arte 16-bit e antes do cliente',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 const classic=html.indexOf('src="/art16.js"'),motion=html.indexOf('src="/monster-motion.js"'),client=html.indexOf('src="/mmo.js"');
 assert.ok(classic>=0&&motion>classic&&client>motion);
 const js=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 assert.match(js,/monsterMotion\.sync/);
 assert.match(js,/monsterMotion\.draw/);
 assert.match(js,/monsterMotion\.clear/);
});

test('snapshots atrasados não causam salto visual grande em um quadro',()=>{
 const motion=create();
 const source=[{id:'m-0-1',x:100,y:100,hp:30}];
 motion.sync(source);motion.draw(source,1/60);
 const updated=[{...source[0],x:245}]; // diferença menor que limiar de respawn (160)
 motion.sync(updated);
 const next=motion.draw(updated,1/60)[0];
 assert.ok(next.x>100&&next.x<=103.2,`salto visual inesperado: ${next.x-100}px`);
 assert.equal(updated[0].x,245,'o servidor segue autoritativo');
});
test('margem de visibilidade mantém monstro próximo da borda',t=>{
 const {world,m,p}=setup(t);
 const events=[];world.send=(_socket,message)=>events.push(message);
 p.x=m.x+800;p.y=m.y;
 world.snapshotTo(p);
 const snapshot=events.find(message=>message.type==='snapshot');
 assert.ok(snapshot.monsters.some(monster=>monster.id===m.id));
});

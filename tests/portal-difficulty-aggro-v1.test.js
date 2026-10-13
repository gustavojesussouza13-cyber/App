'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const {World,ZONES,zoneDifficulty,autoAggroZone,dungeonDepth,SPECIES}=require('../world-engine');
const renderSource=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8');

function setup(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-agro-'));
 const deliveries=new Map();
 const w=new World({dataFile:path.join(dir,'world.json'),getOnline:()=>0,hasClassicName:()=>false,
  send:(socket,msg)=>{const a=deliveries.get(socket)||[];a.push(msg);deliveries.set(socket,a)}});
 t.after(()=>{w.stop();fs.rmSync(dir,{recursive:true,force:true})});
 let count=0;
 function player(zone,role='guardiao'){
  const c={socket:{},worldPlayer:null};++count;
  w.join(c,{name:'Explorador'+count,token:crypto.randomBytes(32).toString('hex'),role});
  const p=c.worldPlayer;assert.ok(p,'limite de jogadores atingido');
  p.zone=zone;p.save.zone=zone;
  return {p,c,messages:()=>deliveries.get(c.socket)||[]};
 }
 function monster(zone,boss=false){
  const list=w.monsters.get(zone),m=list.find(e=>e.boss===boss);
  assert.ok(m);w.monsters.set(zone,[m]);
  m.x=700;m.y=540;m.home={x:700,y:540};
  m.aggroTarget=null;m.aggroUntil=0;m.windupUntil=0;m.lastAttack=0;m.hp=m.maxHp;
  return m;
 }
 return{w,player,monster};
}
test('Dificuldade cresce em todo o percurso dos 40 mapas, inclusive entre masmorras',()=>{
 assert.equal(ZONES.length,40);
 const route=Array.from({length:12},(_,i)=>i);
 for(let j=0;j<4;j++){route.push(12+j);for(let d=0;d<6;d++)route.push(16+j*6+d)}
 for(let i=1;i<route.length;i++){
  assert.ok(zoneDifficulty(route[i])>zoneDifficulty(route[i-1]),
   'mapa '+route[i]+' precisa superar mapa '+route[i-1]);
 }
 assert.equal(zoneDifficulty(0),1);
 assert.ok(zoneDifficulty(13)>zoneDifficulty(21));
 assert.ok(zoneDifficulty(22)>zoneDifficulty(13));
});
test('Vida, dano, XP e ouro dos inimigos acompanham escala de cada mapa',t=>{
 const {w}=setup(t);
 for(const [a,b] of [[0,3],[10,11],[11,12],[12,16],[16,18],[21,13],[13,22],[27,14],[15,34],[38,39]]){
  const m=w.monsters.get(a).find(x=>!x.boss),n=w.monsters.get(b).find(x=>!x.boss);
  for(const [key,base] of [['maxHp',1],['damage',2],['xp',3],['coins',4]]){
   const x=m[key]/SPECIES[m.species][base],y=n[key]/SPECIES[n.species][base];
   assert.ok(y>=x-.12,'atributo '+key+' não deve cair na progressão de '+a+' para '+b);
  }
 }
});
test('Agressividade automática começa exatamente no Subsolo 3 de cada masmorra',()=>{
 for(let z=0;z<ZONES.length;z++)
  assert.equal(autoAggroZone(z),z>=16&&dungeonDepth(z)>=3,'zona '+z);
 for(const z of [18,19,20,21,24,25,26,27,30,31,32,33,36,37,38,39])
  assert.equal(autoAggroZone(z),true);
 for(const z of [12,13,14,15,16,17,22,23,28,29,34,35])
  assert.equal(autoAggroZone(z),false);
});
test('Subsolo 3: criatura comum inicia perseguição e anuncia ataque antes de causar dano',t=>{
 const h=setup(t),m=h.monster(18),a=h.player(18);
 a.p.x=715;a.p.y=544;const hp=a.p.save.hp;
 h.w.tick();
 assert.equal(m.aggroTarget,a.p.id);
 assert.ok(m.aggroUntil>Date.now());
 assert.equal(a.p.save.hp,hp);
 assert.ok(a.messages().some(e=>e.type==='monsterWindup'));
 m.windupUntil=Date.now()-1;h.w.tick();
 assert.ok(a.p.save.hp<hp);
 assert.ok(a.messages().some(e=>e.type==='hurt'));
});
test('Criaturas comuns das quatro masmorras reconhecem jogadores por proximidade',t=>{
 const h=setup(t);
 for(const zone of [18,24,30,36]){
  const m=h.monster(zone),a=h.player(zone);
  a.p.x=m.x+100;a.p.y=m.y;h.w.tick();
  assert.equal(m.aggroTarget,a.p.id,'monstro da zona '+zone+' deve perseguir');
 }
});
test('Subsolos 1-2, masmorras-base e superfície permanecem pacíficos',t=>{
 for(const zone of [0,11,12,15,16,17,22,23,28,29,34,35]){
  const h=setup(t),m=h.monster(zone),a=h.player(zone);
  a.p.x=m.x+20;a.p.y=m.y+6;const hp=a.p.save.hp;
  h.w.tick();
  assert.equal(m.aggroTarget,null,'zona '+zone+' deve continuar pacífica');
  assert.equal(a.p.save.hp,hp);
 }
});
test('Chefe do Subsolo 3 espera ser atacado e só então revida',t=>{
 const h=setup(t),boss=h.monster(18,true),a=h.player(18);
 a.p.x=boss.x+22;a.p.y=boss.y+8;
 for(let i=0;i<4;i++)h.w.tick();
 assert.equal(boss.aggroTarget,null);
 assert.equal(a.messages().filter(e=>e.type==='monsterWindup').length,0);
 h.w.attack(a.p,boss.id,false);
 assert.equal(boss.aggroTarget,a.p.id);
 h.w.tick();
 assert.ok(a.messages().some(e=>e.type==='monsterWindup'&&e.boss));
});
test('Perseguição não atravessa mapa nem seleciona jogadores de outra região',t=>{
 const h=setup(t),m=h.monster(18),other=h.player(17),far=h.player(18);
 other.p.x=m.x+10;other.p.y=m.y+10;
 far.p.x=m.x+250;far.p.y=m.y;
 h.w.tick();assert.equal(m.aggroTarget,null);
 far.p.x=m.x+190;h.w.tick();assert.equal(m.aggroTarget,far.p.id);
 far.p.x=m.home.x+430;far.p.y=m.home.y;
 h.w.tick();assert.equal(m.aggroTarget,null);
});
test('Entrar no terceiro subsolo avisa sobre criaturas agressivas e chefes neutros',t=>{
 const h=setup(t),a=h.player(17);
 h.w.travel(a.p,18);
 assert.equal(a.p.zone,18);
 assert.ok(a.messages().some(e=>e.type==='notice'&&/criaturas comuns atacam por aproximação/.test(e.text)));
 assert.ok(a.messages().some(e=>e.type==='notice'&&/chefes só revidam/.test(e.text)));
});
test('Mensagem E do portal é desenhada por último e permanece legível',()=>{
 const start=renderSource.indexOf(' function portalInteractionHud(');
 const end=renderSource.indexOf(' function displayMap(',start);
 assert.ok(start>0&&end>start);
 const code=renderSource.slice(start,end);
 assert.match(code,/APERTE E · USAR PASSAGEM/);
 assert.match(renderSource,/ctx\.restore\(\);displayMap\(ctx,opt\);\s*\/\/ Última camada visível[\s\S]*?portalInteractionHud\(ctx,portals,\{x,y\}\);/);
 assert.ok(renderSource.indexOf('portalInteractionHud(ctx,portals,{x,y})')>renderSource.indexOf('for(const a of actors)a.paint()'));
 let calls=[];
 const g={save(){},restore(){},fillRect(x,y,w,h){calls.push({type:'rect',x,y,w,h})},
  strokeRect(x,y,w,h){calls.push({type:'stroke',x,y,w,h})},
  fillText(text,x,y,width){calls.push({type:'text',text,x,y,width})}};
 const ctx=vm.createContext({W:960,H:576,Math});
 vm.runInContext(code+';this.paint=portalInteractionHud;',ctx);
 const portals=[{x:400,y:500,name:'Portal da Aurora'}];
 ctx.paint(g,portals,{x:410,y:505});
 assert.ok(calls.some(x=>x.type==='text'&&x.text.includes('APERTE E')));
 assert.ok(calls.some(x=>x.type==='text'&&x.text.includes('Portal da Aurora')));
 const bg=calls.find(x=>x.type==='rect'&&x.w>300);
 assert.ok(bg.y>400&&bg.y<576);
 calls=[];ctx.paint(g,portals,{x:800,y:800});
 assert.equal(calls.length,0);
});

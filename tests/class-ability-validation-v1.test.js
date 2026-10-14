'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {World,CLASSES}=require('../world-engine');
const VFX=require('../public/class-skill-fx16');
const read=name=>fs.readFileSync(path.join(__dirname,'../public',name),'utf8');

function setup(t){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-classes-vfx-')),packets=new Map();
 const world=new World({dataFile:path.join(folder,'world.json'),getOnline:()=>0,
  hasClassicName:()=>false,send:(sock,msg)=>{
   if(!packets.has(sock))packets.set(sock,[]);
   packets.get(sock).push(msg);
  }});
 t.after(()=>{world.stop();fs.rmSync(folder,{recursive:true,force:true})});
 let next=0;
 function add(role='peregrino'){
  const c={socket:{},worldPlayer:null};++next;
  world.join(c,{name:'Fxn'+String(next).padStart(3,'0'),token:String(next).padStart(64,'e'),role});
  assert.equal(c.worldPlayer.save.role,role);
  return{c,p:c.worldPlayer,messages:()=>packets.get(c.socket)||[]};
 }
 function join(a,b){
  world.party(a.p,{action:'create'});world.party(a.p,{action:'invite',target:b.p.name});
  const invite=b.messages().find(x=>x.type==='partyInvite');
  assert.ok(invite);world.party(b.p,{action:'accept',party:invite.party});
  assert.equal(a.p.party,b.p.party);
 }
 return{world,add,join};
}
test('Guardião: K sem alvo concede defesa por 4,5 s para equipe, não para estranhos',t=>{
 const h=setup(t),g=h.add('guardiao'),ally=h.add('peregrino'),stranger=h.add('curandeiro');
 h.join(g,ally);
 g.p.x=400;g.p.y=500;ally.p.x=440;ally.p.y=515;stranger.p.x=439;stranger.p.y=515;
 h.world.receive(g.c,{type:'skill',target:null});
 assert.ok(g.p.guardUntil>Date.now()+4400);
 assert.ok(ally.p.guardUntil>Date.now()+4400);
 assert.equal(stranger.p.guardUntil,undefined);
 assert.ok(g.messages().some(m=>m.type==='skillEffect'&&m.kind==='guardian-shield'&&m.targetId===g.p.id));
 assert.ok(ally.messages().some(m=>m.type==='skillEffect'&&m.targetId===ally.p.id));
 assert.equal(g.p.lastSpell>0,true);
 const until=g.p.guardUntil;
 h.world.receive(g.c,{type:'skill',target:null});
 assert.equal(g.p.guardUntil,until,'cooldown de 4 segundos impede spam');
});
test('Peregrino: K isolado recupera vida e emite aura vermelha dourada; HP máximo respeitado',t=>{
 const h=setup(t),p=h.add('peregrino');
 p.p.save.hp=52;
 h.world.receive(p.c,{type:'skill',target:null});
 assert.ok(p.p.save.hp>66,'a cura evolui com Espírito/Intelecto');
 assert.ok(p.p.messages===undefined);
 assert.ok(p.messages().some(e=>e.type==='skillEffect'&&e.kind==='pilgrim-renewal'));
 assert.equal(p.messages().filter(e=>e.type==='character').at(-1).hp,p.p.save.hp);
 p.p.lastSpell=Date.now()-5000;p.p.save.hp=CLASSES.peregrino.hp;
 h.world.receive(p.c,{type:'skill',target:null});
 assert.ok(p.p.lastSpell<Date.now()-4000,'K não é desperdiçado com HP cheio');
});
test('Peregrino: K com criatura combina golpe especial e autocura uma única vez',t=>{
 const h=setup(t),p=h.add('peregrino'),m=h.world.monsters.get(0)[0];
 p.p.x=m.x+42;p.p.y=m.y;p.p.save.hp=20;m.hp=m.maxHp=900;
 h.world.receive(p.c,{type:'skill',target:m.id});
 assert.ok(p.p.save.hp>34,'a cura híbrida cresce com atributos RPG');
 assert.ok(m.hp<900);
 assert.ok(p.messages().some(e=>e.type==='hit'&&e.skill===true));
 assert.equal(p.messages().filter(e=>e.type==='skillEffect'&&e.kind==='pilgrim-renewal').length,1);
});
test('Arqueiro: somente inimigo válido recebe marca e bônus para aliados',t=>{
 const h=setup(t),archer=h.add('arqueiro'),ally=h.add('peregrino'),outsider=h.add('peregrino');
 h.join(archer,ally);
 const m=h.world.monsters.get(0)[0];m.hp=m.maxHp=1500;
 archer.p.x=m.x+100;archer.p.y=m.y;ally.p.x=m.x+44;ally.p.y=m.y;outsider.p.x=m.x+44;outsider.p.y=m.y;
 h.world.receive(archer.c,{type:'skill',target:null});
 assert.equal(m.markUntil||0,0,'K sem monstro não marca');
 assert.ok(!archer.messages().some(x=>x.kind==='archer-mark'));
 h.world.receive(archer.c,{type:'skill',target:m.id});
 assert.ok(m.markUntil>Date.now()+5200);
 const tag=archer.messages().find(x=>x.kind==='archer-mark');
 assert.equal(tag.monsterId,m.id);
 assert.equal(tag.duration,5500);
 const hp=m.hp;h.world.attack(ally.p,m.id,false);const friendly=hp-m.hp;
 const hp2=m.hp;h.world.attack(outsider.p,m.id,false);const stranger=hp2-m.hp;
 assert.ok(friendly>stranger);
});
test('Curandeiro: habilidade cura equipe sem alvo e envia confirmação visual por jogador',t=>{
 const h=setup(t),cleric=h.add('curandeiro'),ally=h.add('guardiao'),other=h.add('peregrino');
 h.join(cleric,ally);
 cleric.p.x=500;cleric.p.y=500;ally.p.x=530;ally.p.y=510;other.p.x=530;other.p.y=510;
 cleric.p.save.hp=80;ally.p.save.hp=40;other.p.save.hp=40;
 h.world.receive(cleric.c,{type:'skill'});
 assert.ok(cleric.p.save.hp>=112&&cleric.p.save.hp<=CLASSES.curandeiro.hp,'curandeiro restaura mais vida com atributos, sem exceder o máximo');
 assert.ok(ally.p.save.hp>72,'a cura do aliado evolui com Espírito');
 assert.equal(other.p.save.hp,40);
 const packets=ally.messages().filter(x=>x.type==='healed');
 assert.ok(packets.some(x=>x.target===ally.p.id&&x.amount===ally.p.save.hp-40));
 assert.ok(cleric.messages().some(x=>x.type==='healed'&&x.target===cleric.p.id));
});
test('Efeitos 16-bit aceitam apenas eventos autorizados e pixels válidos no PC',()=>{
 let fine=VFX.create({windowRef:{matchMedia:()=>({matches:true})}});
 let coarse=VFX.create({windowRef:{matchMedia:()=>({matches:false})}});
 assert.equal(coarse.trigger({kind:'guardian-shield',x:20,y:40,zone:0},10),false);
 assert.equal(fine.trigger({kind:'fake',x:20,y:40,zone:0},10),false);
 assert.equal(fine.trigger({kind:'guardian-shield',x:Infinity,y:40,zone:0},10),false);
 for(const kind of Object.keys(VFX.KINDS))assert.equal(fine.trigger({kind,x:160,y:240,zone:0},100),true);
 const events=fine.frame(280,{zone:0});
 assert.equal(events.length,4);
 const ops=[];
 const g={imageSmoothingEnabled:true,fillStyle:'#000',fillRect(x,y,w,h){
  assert.ok([x,y,w,h].every(Number.isInteger));
  assert.ok(w>0&&h>0);ops.push([this.fillStyle,x,y,w,h]);
 }};
 fine.paint(g,events);
 assert.equal(g.imageSmoothingEnabled,false);
 assert.ok(ops.length>=110,'as quatro classes devem possuir efeitos visuais ricos');
 assert.ok(ops.some(x=>x[0]==='#ffe69c'));
 assert.ok(ops.some(x=>x[0]==='#8ae3aa'));
 assert.ok(ops.some(x=>x[0]==='#f9ad79'));
 assert.ok(ops.some(x=>x[0]==='#9df6df'));
 fine.clear();assert.equal(fine.count,0);
});
test('Duração e posição da marca seguem o monstro, escudo segue jogador na movimentação',()=>{
 const fx=VFX.create({windowRef:{matchMedia:()=>({matches:true})}});
 fx.trigger({kind:'archer-mark',zone:1,x:40,y:50,monsterId:'m1',duration:5500},100);
 fx.trigger({kind:'guardian-shield',zone:1,x:70,y:90,targetId:'p2',duration:4500},100);
 let frames=fx.frame(600,{zone:1,monsters:new Map([['m1',{x:234,y:321,hp:50}]]),
  players:new Map([['p2',{x:600,y:440}]])});
 assert.equal(frames.find(e=>e.kind==='archer-mark').x,234);
 assert.equal(frames.find(e=>e.kind==='guardian-shield').y,440);
 assert.equal(fx.frame(600,{zone:0}).length,0,'não transportar efeitos entre regiões');
 fx.trigger({kind:'archer-mark',zone:1,x:40,y:50,monsterId:'m1'},100);
 assert.equal(fx.frame(5800,{zone:1}).length,0);
});
test('mundo aberto carrega efeitos antes de renderizar e preserva o mobile',()=>{
 const html=read('mundo.html'),art=read('art16.js'),client=read('mmo.js');
 assert.ok(html.indexOf('/class-skill-fx16.js')<html.indexOf('/art16.js'));
 assert.ok(html.indexOf('/class-skill-fx16.js')<html.indexOf('/mmo.js'));
 assert.match(client,/classSkillFx\.trigger\(msg,now\)/);
 assert.match(client,/classSkillFx\.frame\(now/);
 assert.match(art,/drawSkillEffects\(ctx,skillEffects\)/);
 assert.match(art,/!lastActionWasSkill/);
 assert.doesNotThrow(()=>new vm.Script(read('class-skill-fx16.js')));
 assert.equal(VFX.desktop({matchMedia:()=>({matches:false})}),false);
 assert.equal(VFX.desktop({matchMedia:()=>({matches:true})}),true);
});

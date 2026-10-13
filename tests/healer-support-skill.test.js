'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {World,CLASSES}=require('../world-engine');
const code=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-heal-'));
 const packets=new Map();
 const world=new World({send:(sock,packet)=>{
  if(!packets.has(sock))packets.set(sock,[]);
  packets.get(sock).push(packet);
 },getOnline:()=>0,hasClassicName:()=>false,dataFile:path.join(dir,'world.json')});
 t.after(()=>{world.stop();fs.rmSync(dir,{recursive:true,force:true})});
 let n=0;
 function enter(role='peregrino'){
  const c={socket:{},worldPlayer:null};
  world.join(c,{name:'CuradorTeste'+(++n),token:String(n).padStart(64,'c'),role});
  assert.ok(c.worldPlayer);
  return{c,p:c.worldPlayer,packets:()=>packets.get(c.socket)||[]};
 }
 function group(a,b){
  world.party(a.p,{action:'create'});
  world.party(a.p,{action:'invite',target:b.p.name});
  const invitation=b.packets().filter(x=>x.type==='partyInvite').at(-1);
  assert.ok(invitation,'convite de grupo ausente');
  world.party(b.p,{action:'accept',party:invitation.party});
 }
 return{world,enter,group};
}
test('K sem selecionar criatura cura Curandeiro ferido e envia vida atualizada',t=>{
 const h=fixture(t),healer=h.enter('curandeiro');
 healer.p.save.hp=40;
 h.world.receive(healer.c,{type:'skill',target:null});
 assert.equal(healer.p.save.hp,72);
 assert.ok(healer.p.lastSpell>0);
 const updated=healer.packets().filter(x=>x.type==='character').at(-1);
 assert.equal(updated.hp,72);
 const spell=healer.packets().find(x=>x.type==='healed');
 assert.ok(spell);
 assert.equal(spell.amount,32);
 assert.equal(spell.by,healer.p.name);
 assert.equal(spell.target,healer.p.id);
 assert.ok(!healer.packets().some(x=>x.type==='hit'));
});
test('K cura companheiro ferido da equipe sem atacar e mostra efeito verde para ambos',t=>{
 const h=fixture(t),healer=h.enter('curandeiro'),ally=h.enter('guardiao'),stranger=h.enter('peregrino');
 h.group(healer,ally);
 healer.p.x=350;healer.p.y=480;
 ally.p.x=390;ally.p.y=490;
 stranger.p.x=392;stranger.p.y=490;
 ally.p.save.hp=60;stranger.p.save.hp=30;
 h.world.receive(healer.c,{type:'skill'});
 assert.equal(ally.p.save.hp,92);
 assert.equal(stranger.p.save.hp,30);
 assert.equal(ally.packets().filter(x=>x.type==='character').at(-1).hp,92);
 const event=ally.packets().find(x=>x.type==='healed'&&x.target===ally.p.id);
 assert.equal(event.amount,32);
 assert.equal(event.zone,ally.p.zone);
 assert.ok(healer.packets().some(x=>x.type==='healed'&&x.target===ally.p.id));
});
test('cura nunca atravessa regiões, distância de 230 ou membros fora da equipe',t=>{
 const h=fixture(t),healer=h.enter('curandeiro'),far=h.enter('guardiao'),zone=h.enter('arqueiro'),other=h.enter('peregrino');
 h.group(healer,far);
 // O segundo membro de grupo se encontra longe e não deve ser afetado.
 healer.p.x=500;healer.p.y=500;far.p.x=750;far.p.y=500;
 far.p.save.hp=44;zone.p.zone=1;zone.p.x=500;zone.p.y=500;zone.p.save.hp=44;
 other.p.x=501;other.p.y=501;other.p.save.hp=44;
 h.world.receive(healer.c,{type:'skill'});
 assert.equal(far.p.save.hp,44);
 assert.equal(zone.p.save.hp,44);
 assert.equal(other.p.save.hp,44);
 assert.equal(healer.p.lastSpell,0,'não deve entrar em recarga quando todos estão saudáveis');
});
test('cooldown é de 4 segundos e não pode gerar curas duplicadas',t=>{
 const h=fixture(t),healer=h.enter('curandeiro');
 healer.p.save.hp=40;h.world.receive(healer.c,{type:'skill'});
 const first=healer.p.save.hp;
 h.world.receive(healer.c,{type:'skill'});
 assert.equal(healer.p.save.hp,first);
 assert.equal(healer.packets().filter(x=>x.type==='healed').length,1);
 healer.p.lastSpell=Date.now()-4001;
 h.world.receive(healer.c,{type:'skill'});
 assert.ok(healer.p.save.hp>first);
});
test('vida máxima não é ultrapassada e, se cheia, habilidade não gasta recarga',t=>{
 const h=fixture(t),healer=h.enter('curandeiro');
 healer.p.save.hp=CLASSES.curandeiro.hp-3;
 h.world.receive(healer.c,{type:'skill'});
 assert.equal(healer.p.save.hp,CLASSES.curandeiro.hp);
 assert.equal(healer.packets().filter(x=>x.type==='healed').at(-1).amount,3);
 healer.p.lastSpell=Date.now()-5000;
 h.world.receive(healer.c,{type:'skill'});
 assert.equal(healer.p.save.hp,CLASSES.curandeiro.hp);
 assert.equal(healer.p.lastSpell<Date.now()-4000,true);
});
test('com alvo válido o curandeiro combina cura e projétil; J mantém ataque',t=>{
 const h=fixture(t),healer=h.enter('curandeiro'),m=h.world.monsters.get(0)[0];
 healer.p.x=m.x+65;healer.p.y=m.y;healer.p.save.hp=55;
 const before=m.hp;
 h.world.receive(healer.c,{type:'skill',target:m.id});
 assert.ok(m.hp<before);
 assert.ok(healer.p.save.hp>55);
 assert.ok(healer.packets().some(x=>x.type==='hit'&&x.projectile==='holy-bolt'));
 assert.ok(healer.packets().some(x=>x.type==='healed'));
 healer.p.lastAttack=Date.now()-1000;
 const current=m.hp;
 h.world.receive(healer.c,{type:'attack',target:m.id});
 assert.ok(m.hp<current);
});
test('cliente manda habilidade sem depender de monstro marcado',()=>{
 const start=code.indexOf('function attack(skill){');
 const end=code.indexOf("\n$('talkBtn').onclick",start);
 assert.ok(start>0&&end>start);
 const commands=[],session={connected:true,role:'curandeiro',target:null,monsters:new Map()};
 const context={session,performance:{now:()=>300},send:(type,details)=>commands.push({type,details}),
  touchDevice:false,Math,alert:()=>{},lastAction:0};
 vm.createContext(context);
 vm.runInContext(code.slice(start,end),context);
 vm.runInContext('attack(true)',context);
 assert.equal(commands.length,1);
 assert.equal(commands[0].type,'skill');
 assert.equal(commands[0].details.target,null);
 assert.equal(context.lastAction,300);
 assert.match(code,/msg\.type==='healed'/);
 assert.match(code,/\+'\+msg\.amount\+' VIDA'/);
 assert.match(code,/c\.role==='curandeiro'\?' Curar':' Habilidade'/);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {World,ACHIEVEMENTS}=require('../world-engine');
function setup(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-skills-')),messages=new Map();
 const world=new World({send:(socket,msg)=>{
  if(!messages.has(socket))messages.set(socket,[]);messages.get(socket).push(msg);
 },getOnline:()=>0,hasClassicName:()=>false,dataFile:path.join(dir,'world.json')});
 t.after(()=>{world.stop();fs.rmSync(dir,{recursive:true,force:true})});
 let n=0;
 function add(role){
  const c={socket:{},worldPlayer:null};
  world.join(c,{name:'PeregrinoSkill'+(++n),token:String(n).padStart(64,'a')});
  assert.ok(c.worldPlayer);
  const p=c.worldPlayer;world.chooseClass(p,role);
  return {p,c,events:()=>messages.get(c.socket)||[]};
 }
 function party(a,b){
  world.party(a.p,{action:'create'});
  world.party(a.p,{action:'invite',target:b.p.name});
  const invite=b.events().find(m=>m.type==='partyInvite');
  assert.ok(invite);
  world.party(b.p,{action:'accept',party:invite.party});
  assert.equal(a.p.party,b.p.party);
 }
 function target(){
  const m=world.monsters.get(0)[0];
  m.hp=900;m.maxHp=900;m.aggroTarget=null;
  return m;
 }
 return {world,add,party,target};
}
test('catálogo define conquistas com recompensas e IDs estáveis',()=>{
 assert.ok(Object.keys(ACHIEVEMENTS).length>=7);
 assert.ok(ACHIEVEMENTS['aurora-restaurada'].coins>0);
});
test('guardião protege aliados do grupo e reduz dano recebido',t=>{
 const h=setup(t),g=h.add('guardiao'),ally=h.add('peregrino'),other=h.add('peregrino'),m=h.target();
 h.party(g,ally);
 m.damage=42;
 for(const o of [g,ally,other]){o.p.x=m.x+20;o.p.y=m.y+14}
 h.world.attack(g.p,m.id,true);
 assert.ok(g.p.guardUntil>Date.now());
 assert.ok(ally.p.guardUntil>Date.now());
 assert.equal(other.p.guardUntil,undefined);
 m.aggroTarget=g.p.id;m.aggroUntil=Date.now()+10000;m.windupUntil=Date.now()-1;m.lastAttack=0;
 h.world.lastTick=Date.now()-350;
 const health=g.p.save.hp;h.world.tick();const protectedDamage=health-g.p.save.hp;
 assert.ok(protectedDamage>0);
 g.p.save.hp=health;g.p.guardUntil=0;m.windupUntil=Date.now()-1;m.lastAttack=0;
 h.world.lastTick=Date.now()-350;h.world.tick();
 assert.ok(health-g.p.save.hp>=protectedDamage+8,'proteção deve reduzir dano');
});
test('flecha de precisão aumenta o próximo ataque de companheiro e não o de desconhecido',t=>{
 const h=setup(t),archer=h.add('arqueiro'),ally=h.add('peregrino'),stranger=h.add('peregrino'),m=h.target();
 h.party(archer,ally);
 archer.p.x=m.x+90;ally.p.x=m.x+60;stranger.p.x=m.x+60;
 for(const p of [archer.p,ally.p,stranger.p])p.y=m.y;
 h.world.attack(archer.p,m.id,true);
 assert.ok(m.markUntil>Date.now());
 assert.equal(m.markOwner,archer.p.id);
 const before=m.hp;
 h.world.attack(ally.p,m.id,false);
 const allyDamage=before-m.hp;
 assert.ok(allyDamage>=20);
 const beforeOther=m.hp;
 h.world.attack(stranger.p,m.id,false);
 assert.ok(beforeOther-m.hp<allyDamage,'jogador fora da equipe não recebe bônus');
});
test('curandeiro cura o grupo próximo, mas não jogadores estranhos',t=>{
 const h=setup(t),healer=h.add('curandeiro'),ally=h.add('peregrino'),stranger=h.add('peregrino'),m=h.target();
 h.party(healer,ally);
 for(const o of [healer,ally,stranger]){o.p.x=m.x+65;o.p.y=m.y;o.p.save.hp=60}
 h.world.attack(healer.p,m.id,true);
 assert.ok(healer.p.save.hp>60);
 assert.ok(ally.p.save.hp>60);
 assert.equal(stranger.p.save.hp,60);
});
test('peregrino usa habilidade de recuperação sem ultrapassar vida máxima',t=>{
 const h=setup(t),adventurer=h.add('peregrino'),m=h.target();
 adventurer.p.save.hp=30;adventurer.p.x=m.x+25;adventurer.p.y=m.y;
 h.world.attack(adventurer.p,m.id,true);
 assert.ok(adventurer.p.save.hp>30);
 assert.ok(adventurer.p.save.hp<=135);
});
test('conquistas de mortes são idempotentes e aparecem no estado do jogador',t=>{
 const h=setup(t),a=h.add('peregrino');
 a.p.save.kills=0;const originalCoins=a.p.save.coins;
 h.world.award(a.p,20,4,false,0);
 assert.ok(a.p.save.achievements.includes('primeira-vitoria'));
 assert.ok(a.p.save.coins>=originalCoins+24);
 assert.equal(h.world.unlockAchievement(a.p,'primeira-vitoria'),false);
 a.p.save.kills=24;h.world.award(a.p,5,2,false,0);
 assert.ok(a.p.save.achievements.includes('cacas-25'));
 a.p.save.kills=99;h.world.award(a.p,5,2,false,0);
 assert.ok(a.p.save.achievements.includes('cacas-100'));
 const status=h.world.ownStatus(a.p);
 assert.ok(status.achievements.includes('primeira-vitoria'));
});
test('bônus de exploração é concedido uma única vez ao visitar regiões',t=>{
 const h=setup(t),a=h.add('peregrino');
 a.p.save.visited=[0,1,2,3,4,5,6];
 a.p.zone=5;a.p.save.zone=5;
 h.world.travel(a.p,7);
 assert.ok(a.p.save.achievements.includes('explorar-8'));
 a.p.save.visited=Array.from({length:15},(_,i)=>i);
 a.p.zone=11;a.p.save.zone=11;a.p.save.inventory.chave=1;
 h.world.travel(a.p,15);
 assert.ok(a.p.save.achievements.includes('explorar-16'));
 assert.equal(a.p.save.achievements.filter(id=>id==='explorar-8').length,1);
});
test('chefes possuem ataque telegrafado de 1100ms, comum mantém 650ms',t=>{
 const h=setup(t),p=h.add('peregrino');
 function windup(monster){
  p.p.x=monster.x+12;p.p.y=monster.y+12;
  monster.aggroTarget=p.p.id;monster.aggroUntil=Date.now()+20000;
  monster.lastAttack=0;monster.windupUntil=0;
  h.world.lastTick=Date.now()-350;h.world.tick();
  return p.events().filter(e=>e.type==='monsterWindup'&&e.monster===monster.id).at(-1);
 }
 const common=h.world.monsters.get(0)[0],boss=h.world.monsters.get(0).at(-1);
 const regular=windup(common);
 assert.equal(regular.duration,650);
 const charged=windup(boss);
 assert.equal(charged.duration,1100);
 assert.equal(charged.boss,true);
});
test('classe, catálogo e conquistas chegam na mensagem welcome',t=>{
 const h=setup(t),p=h.add('arqueiro');
 const welcome=p.events().find(x=>x.type==='welcome');
 assert.ok(welcome.achievements['primeiro-chefe']);
 assert.deepEqual(welcome.self.achievements,[]);
});

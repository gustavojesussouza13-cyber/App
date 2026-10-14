'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {World,CLASSES}=require('../world-engine');
const rpg=require('../rpg-attributes');
const ROLES=['peregrino','guardiao','arqueiro','curandeiro'];
function fixture(t){
 const sent=[],snapshot=[];
 const world=new World({send:(socket,m)=>sent.push({socket,m}),
  persistentStore:{enqueue:data=>{snapshot.push(structuredClone(data));return Promise.resolve(true)}},
  getOnline:()=>0,hasClassicName:()=>false,autosave:false});
 t.after(()=>world.stop());
 let counter=0;
 const player=role=>{
  counter++;
  const name='Atributos'+counter;
  const client={socket:{},authUser:{uid:'account:'+name,username:name},worldPlayer:null};
  world.join(client,{name});
  const p=client.worldPlayer;
  assert.ok(p);
  world.chooseClass(p,role);
  return {p,client,messages:()=>sent.filter(x=>x.socket===client.socket).map(x=>x.m)};
 };
 return {world,sent,snapshot,player};
}
test('todas as classes evoluem progressivamente nos níveis 1, 20, 60 e 100',()=>{
 for(const role of ROLES){
  let previous=null;
  for(const level of [1,20,60,100]){
   const state=rpg.calculateAttributes({role,level,attributes:{}});
   const st=state.stats;
   assert.equal(state.level,level);
   assert.equal(state.availablePoints,(level-1)*2);
   assert.ok(Object.values(state.attributes).every(n=>Number.isFinite(n)&&n>=6));
   assert.ok(st.maxHp>=CLASSES[role].hp);
   assert.ok(st.maxEnergy>90);
   if(previous){
    for(const key of rpg.ATTRIBUTE_KEYS)
     assert.ok(state.attributes[key]>=previous.attributes[key],role+' '+key+' não pode regredir no nível '+level);
    for(const key of ['maxHp','maxEnergy','physicalPower','magicPower','armor','healingPower','energyRegen','hpRegen','accuracy','criticalChance','evasion'])
     assert.ok(st[key]>=previous.stats[key],role+' '+key+' não pode regredir no nível '+level);
   }
   previous=state;
  }
 }
});
test('nível inicial mantém a vida clássica; crescimento respeita diferenças entre classes',()=>{
 for(const role of ROLES)
  assert.equal(rpg.calculateAttributes({role,level:1}).stats.maxHp,CLASSES[role].hp);
 const guardian=rpg.calculateAttributes({role:'guardiao',level:100});
 const archer=rpg.calculateAttributes({role:'arqueiro',level:100});
 const healer=rpg.calculateAttributes({role:'curandeiro',level:100});
 const pilgrim=rpg.calculateAttributes({role:'peregrino',level:100});
 assert.ok(guardian.attributes.fortitude>archer.attributes.fortitude);
 assert.ok(guardian.stats.maxHp>archer.stats.maxHp);
 assert.ok(archer.attributes.agilidade>guardian.attributes.agilidade);
 assert.ok(archer.stats.criticalChance>guardian.stats.criticalChance);
 assert.ok(healer.attributes.espirito>pilgrim.attributes.espirito);
 assert.ok(healer.stats.healingPower>pilgrim.stats.healingPower);
 assert.ok(healer.stats.energyRegen>guardian.stats.energyRegen);
 assert.ok(pilgrim.attributes.forca>healer.attributes.forca);
});
test('pontos extras têm teto de 70 por atributo e nenhum dado adulterado produz pontos infinitos',()=>{
 const invalid={forca:99999,vitalidade:9000,agilidade:55,intelecto:-8,espirito:'123',sorte:1.2};
 const normalized=rpg.normalizeAllocations(invalid,60);
 assert.ok(Object.values(normalized).every(n=>Number.isInteger(n)&&n>=0&&n<=70));
 assert.ok(rpg.totalAllocated(normalized)<=118);
 const invested=rpg.calculateAttributes({role:'guardiao',level:100,attributes:{vitalidade:70,fortitude:70,forca:58}});
 assert.equal(invested.availablePoints,0);
 assert.equal(invested.allocations.vitalidade,70);
 assert.ok(invested.stats.maxHp>rpg.calculateAttributes({role:'guardiao',level:100}).stats.maxHp);
 assert.ok(invested.stats.armor>rpg.calculateAttributes({role:'guardiao',level:100}).stats.armor);
 assert.deepEqual(rpg.normalizeAllocations({'__proto__':99,hack:100},10),rpg.normalizeAllocations({},10));
});
test('servidor valida gastos de pontos, mantém progressão salva e atualiza PV/energia',t=>{
 const f=fixture(t),{p}=f.player('peregrino');
 p.save.level=60;p.save.hp=250;p.save.energy=70;
 const before=rpg.calculateAttributes(p.save);
 assert.equal(f.world.allocateStat(p,'hack'),false);
 assert.equal(f.world.allocateStat(p,'vitalidade'),true);
 let after=rpg.calculateAttributes(p.save);
 assert.equal(after.availablePoints,117);
 assert.equal(p.save.hp,250+after.stats.maxHp-before.stats.maxHp);
 assert.equal(f.world.allocateStat(p,'intelecto'),true);
 after=rpg.calculateAttributes(p.save);
 assert.ok(p.save.energy>=70);
 assert.equal(after.allocations.intelecto,1);
 assert.equal(f.world.allocateStat(p,'forca'),true);
 assert.ok(f.snapshot.some(s=>s.characters[p.uid]?.attributes?.vitalidade===1));
 assert.ok(f.world.ownStatus(p).rpg.stats.maxHp>=CLASSES.peregrino.hp);
});
test('visitantes podem investir durante a jornada e reconectar sem criar progresso permanente',t=>{
 const f=fixture(t);
 const client={socket:{},worldPlayer:null};f.world.join(client,{name:'VisitAtributos',token:'a'.repeat(64)});
 const p=client.worldPlayer;p.save.level=3;
 assert.equal(f.world.allocateStat(p,'forca'),true,'os botões do Visitante devem funcionar');
 assert.equal(rpg.calculateAttributes(p.save).allocations.forca,1);
 assert.equal(f.world.saved.characters[p.uid],undefined,'a visita não cria personagem permanente');
 f.world.leave(client);
 const reconnect={socket:{},worldPlayer:null};
 f.world.join(reconnect,{name:'VisitAtributos',token:'a'.repeat(64)});
 assert.equal(reconnect.worldPlayer.save.attributes.forca,1,'token recupera pontos da visita em RAM');
 f.world.leave(reconnect);
 const fresh={socket:{},worldPlayer:null};
 f.world.join(fresh,{name:'VisitNovo',token:'b'.repeat(64)});
 assert.equal(rpg.calculateAttributes(fresh.worldPlayer.save).allocations.forca,0);
 assert.equal(fresh.worldPlayer.save.level,1);
 const attacker=f.player('guardiao').p;attacker.save.level=1;
 assert.equal(f.world.allocateStat(attacker,'forca'),false,'nível 1 não tem pontos');
});
test('precisão, críticos e resistências têm efeitos matemáticos e previsíveis',()=>{
 const level1=rpg.calculateAttributes({level:1,role:'arqueiro'});
 const level100=rpg.calculateAttributes({level:100,role:'arqueiro'});
 assert.ok(level100.stats.accuracy>level1.stats.accuracy);
 assert.ok(level100.stats.criticalChance>level1.stats.criticalChance);
 const chance=level100.stats.criticalChance;
 const interval=Math.ceil(100/chance);
 assert.equal(rpg.isCritical(interval-1,chance),false);
 assert.equal(rpg.isCritical(interval,chance),true);
 assert.equal(rpg.isCritical(interval*2,chance),true);
 assert.ok(rpg.attackModifiers({role:'curandeiro',level:100},'magic').bonus>
  rpg.attackModifiers({role:'curandeiro',level:1},'magic').bonus);
 const raw=110;
 for(const element of ['physical','magic','fire','lightning']){
  const first=rpg.mitigateDamage(raw,level1.stats,element);
  const advanced=rpg.mitigateDamage(raw,level100.stats,element);
  assert.ok(advanced<first,element+' deve reduzir o dano recebido conforme o nível');
  assert.ok(advanced>=1);
 }
});
test('habilidade gasta energia; sem energia é bloqueada; regeneração acontece com tempo real',t=>{
 const f=fixture(t),{p,messages}=f.player('peregrino');
 const monster=f.world.monsters.get(0)[0];
 monster.maxHp=100000;monster.hp=monster.maxHp;
 p.x=monster.x;p.y=monster.y;
 const max=f.world.ownStatus(p).maxEnergy;
 assert.ok(max>=20);
 f.world.attack(p,monster.id,true);
 assert.equal(Math.round(p.save.energy),max-20);
 p.save.energy=1;p.lastSpell=0;
 const hp=monster.hp;
 f.world.attack(p,monster.id,true);
 assert.equal(monster.hp,hp);
 assert.ok(messages().some(e=>/Energia insuficiente/.test(e.text||'')));
 p.lastRegenAt=Date.now()-1000;
 const before=p.save.energy;
 f.world.tick();
 assert.ok(p.save.energy>before,'energia regenera no tick do servidor');
 assert.ok(p.save.energy<=max);
 p.save.hp=30;
 p.lastCombatAt=Date.now()-12000;
 p.lastRegenAt=Date.now()-2000;
 p.hpRegenPool=0;
 const start=p.save.hp;
 f.world.tick();
 assert.ok(p.hpRegenPool>0||p.save.hp>start);
});
test('dois pontos investidos já alteram concretamente a força das classes em nível baixo',t=>{
 for(const [role,key,stat,min]of [
  ['guardiao','forca','physicalPower',7],
  ['arqueiro','agilidade','physicalPower',6],
  ['curandeiro','espirito','healingPower',7],
  ['peregrino','vitalidade','maxHp',30]
 ]){
  const initial=rpg.calculateAttributes({role,level:3});
  const specialized=rpg.calculateAttributes({role,level:3,attributes:{[key]:2}});
  assert.ok(specialized.stats[stat]-initial.stats[stat]>=min,
   role+' deveria melhorar '+stat+' com apenas 2 pontos');
  assert.equal(specialized.availablePoints,2);
  assert.ok(rpg.allocationPreview({role,level:3},key));
 }
 const f=fixture(t),{p}=f.player('arqueiro');
 p.save.level=3;const m=f.world.monsters.get(0)[0];m.hp=m.maxHp=900;
 p.x=m.x+90;p.y=m.y;
 f.world.attack(p,m.id,false);
 const base=900-m.hp;
 p.lastAttack=0;p.attackCounter=0;m.hp=900;
 assert.equal(f.world.allocateStat(p,'agilidade'),true);
 assert.equal(f.world.allocateStat(p,'agilidade'),true);
 f.world.attack(p,m.id,false);
 const improved=900-m.hp;
 assert.ok(improved>=base+3,'Agilidade investida deve melhorar o dano real do Arqueiro');
 const state=f.world.ownStatus(p);
 assert.equal(state.rpg.availablePoints,2);
 assert.match(state.rpg.impacts.agilidade,/poder físico/i);
});
test('atributos e estados das classes aparecem na interface, na ficha e no guia',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 const ui=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 const guide=fs.readFileSync(path.join(__dirname,'../public/guia.html'),'utf8');
 const style=fs.readFileSync(path.join(__dirname,'../public/rpg-stats.css'),'utf8');
 assert.match(html,/id="rpgAttributeDetails"/);
 assert.match(html,/id="energyBar"/);
 assert.match(ui,/send\('allocateStat',\{attribute:key\}\)/);
 assert.match(ui,/critical/);
 assert.match(style,/rpg-derived-rows/);
 assert.match(guide,/198 pontos no nível 100/);
 assert.doesNotMatch(ui,/plus\.disabled=[^;]*!accountMode/);
 for(const stat of rpg.ATTRIBUTE_KEYS)
  assert.ok(ui.includes(stat),'Ficha precisa exibir '+stat);
});

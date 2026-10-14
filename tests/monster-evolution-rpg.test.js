'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {World,ZONES,SPECIES}=require('../world-engine');
const evolution=require('../monster-progression');
function fixture(t,opts={}){
 const sent=[],snapshots=[];
 const w=new World({send:(socket,message)=>sent.push({socket,message}),
  getOnline:()=>0,hasClassicName:()=>false,autosave:false,
  persistentStore:{enqueue:data=>{snapshots.push(structuredClone(data));return Promise.resolve(true)}}});
 t.after(()=>w.stop());
 let k=0;
 function add(role='peregrino'){
  k++;const name='CriaturaTeste'+k;
  const client={socket:{},authUser:{uid:'account:'+name,username:name},worldPlayer:null};
  w.join(client,{name});const p=client.worldPlayer;
  w.chooseClass(p,role);return {p,client};
 }
 return {w,sent,snapshots,add};
}
function takeMonsterLife(w,p,m){
 p.zone=m.zone;p.save.zone=m.zone;p.x=m.x;p.y=m.y;
 p.save.hp=1;p.save.level=37;
 m.aggroTarget=p.id;m.aggroUntil=Date.now()+18000;m.windupUntil=Date.now()-100;
 m.lastAttack=0;
 w.tick();
 return m.progress.victories;
}
test('cada uma das 576 criaturas possui ficha própria com atributos, itens e progressão',t=>{
 const f=fixture(t);
 assert.equal(f.w.totalMonsters(),576);
 const ids=new Set();
 for(const group of f.w.monsters.values())for(const m of group){
  assert.equal(ids.has(m.id),false);
  ids.add(m.id);
  assert.equal(m.progress.victories,0);
  assert.ok(m.level>=1&&m.level<=100);
  assert.ok(m.maxHp>0&&m.damage>0);
  for(const key of evolution.ATTR_KEYS)assert.ok(m.attributes[key]>=1,key+' ausente em '+m.id);
  assert.equal(m.equipment[0].slot,'arma');
  assert.ok(m.loot.some(x=>x.id==='moedas'));
  assert.ok(m.loot.some(x=>x.id==='xp'));
  assert.ok(m.loot.some(x=>x.id==='pocao'));
  assert.ok(m.rank);
 }
});
test('monstro recebe experiência, nível, atributos e equipamentos ao matar jogador; dados ficam persistidos',t=>{
 const f=fixture(t),{p,client}=f.add('guardiao'),m=f.w.monsters.get(0)[0];
 const old={hp:m.maxHp,damage:m.damage,level:m.level,armor:m.armor};
 assert.equal(takeMonsterLife(f.w,p,m),1);
 assert.equal(m.progress.adaptations.guardiao,1);
 assert.equal(m.progress.xp,40+37*5);
 assert.ok(m.maxHp>old.hp);
 assert.ok(m.damage>=old.damage);
 assert.ok(m.level>=old.level);
 assert.ok(m.armor>=old.armor);
 assert.ok(m.equipment.some(e=>e.id==='garras'));
 assert.ok(f.snapshots.some(s=>s.monsters[m.id]?.victories===1));
 assert.ok(f.sent.some(x=>x.message.type==='monsterEvolution'&&x.message.monster===m.id));
 assert.equal(f.w.inspectMonster(p,m.id),true);
 const sheet=f.sent.findLast(x=>x.socket===client.socket&&x.message.type==='monsterSheet').message.sheet;
 assert.equal(sheet.victories,1);
 assert.equal(sheet.attributes.fortitude,m.attributes.fortitude);
 assert.ok(sheet.equipment.length>=2);
 assert.ok(sheet.loot.length>=3);
 assert.equal(sheet.name,m.name);
});
test('a progressão depende da classe da vítima e de cada vitória individual',t=>{
 const f=fixture(t),m=f.w.monsters.get(0)[0],base=evolution.publicSheet(m);
 for(const role of ['guardiao','arqueiro','curandeiro','peregrino']){
  const victim=f.add(role).p;
  takeMonsterLife(f.w,victim,m);
 }
 assert.equal(m.progress.victories,4);
 assert.ok(m.attributes.fortitude>base.attributes.fortitude);
 assert.ok(m.attributes.agilidade>base.attributes.agilidade);
 assert.ok(m.attributes.espirito>base.attributes.espirito);
 assert.ok(m.attributes.forca>base.attributes.forca);
 for(const role of evolution.ROLES)assert.equal(m.progress.adaptations[role],1);
 assert.ok(m.equipment.some(x=>x.id==='couraça'));
 const a=f.w.monsters.get(0)[1];
 assert.equal(a.progress.victories,0,'outra criatura não herda as vitórias');
});
test('rank, equipamentos, nível e defesa aumentam progressivamente, mas há limites',()=>{
 const template={id:'m-0-0',zone:0,species:0,boss:false,baseHp:30,baseDamage:5};
 const m={...template,hp:30,progress:null};
 evolution.restoreMonster(m,null);
 const ranks=new Set([m.rank]);
 let last=m.maxHp;
 for(let i=0;i<90;i++){
  const next=evolution.evolveOnVictory(m,{level:99,role:i%2?'arqueiro':'curandeiro'});
  assert.ok(m.maxHp>=last);last=m.maxHp;ranks.add(m.rank);
  assert.ok(m.level<=100);
  assert.ok(m.attackHaste<=16);
  assert.ok(m.evasion<=18);
  assert.ok(evolution.damageAfterMonsterDefense(110,m,'physical')>=1);
  assert.ok(evolution.damageAfterMonsterDefense(110,m,'magic')>=1);
  assert.ok(next.equipment.length<=6);
 }
 assert.equal(m.progress.victories,90);
 assert.ok(m.equipment.some(x=>x.id==='coroa'));
 for(const rank of ['Desperto','Endurecido','Veterano','Temido','Lendário'])assert.ok(ranks.has(rank));
 const attack=m.damage;
 evolution.evolveOnVictory(m,{level:99,role:'guardiao'});
 assert.equal(m.damage,attack,'depois do teto, a criatura não ganha poder infinito');
 const bounded=evolution.cleanRecord({victories:99999999,xp:1e40,adaptations:{guardiao:999999}});
 assert.equal(bounded.adaptations.guardiao,evolution.MAX_VICTORIES);
});
test('monstro é inspecionado somente na região atual e a uma distância segura',t=>{
 const f=fixture(t),{p}=f.add(),m=f.w.monsters.get(0)[0];
 p.x=m.x;p.y=m.y;assert.equal(f.w.inspectMonster(p,m.id),true);
 p.x=1500;p.y=1000;
 if(Math.hypot(p.x-m.x,p.y-m.y)<=900){p.zone=1;p.save.zone=1}
 assert.equal(f.w.inspectMonster(p,m.id),false);
 assert.equal(f.w.inspectMonster(p,'m-0-inventado'),false);
});
test('matar o monstro não lhe concede experiência; apenas ser morto por ele provoca evolução',t=>{
 const f=fixture(t),{p}=f.add(),m=f.w.monsters.get(0)[0];
 const oldLevel=m.level,oldWins=m.progress.victories;
 p.x=m.x;p.y=m.y;m.hp=1;
 f.w.attack(p,m.id,false);
 assert.equal(m.hp,0);
 assert.equal(m.progress.victories,oldWins);
 assert.equal(m.level,oldLevel);
 m.deadUntil=Date.now()-1;f.w.tick();
 assert.equal(m.hp,m.maxHp);
 assert.equal(m.level,oldLevel);
});
test('espólios possíveis são itens de inventário reais e não chaves de masmorra',()=>{
 const m={progress:{victories:9}};
 assert.equal(evolution.chooseLoot(m,0),'amuleto');
 assert.equal(evolution.chooseLoot(m,12),'superpocao');
 assert.equal(evolution.chooseLoot(m,35),'pocao');
 assert.equal(evolution.chooseLoot(m,99),null);
 const novice={progress:{victories:0}};
 assert.equal(evolution.chooseLoot(novice,0),'pocao');
 assert.equal(evolution.chooseLoot(novice,99),null);
});
test('monstro sobrevivente mantém vitórias e atributos após reinicialização SQLite',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-mobs-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const file=path.join(root,'arena.sqlite');
 const a=new World({send:()=>{},getOnline:()=>0,hasClassicName:()=>false,dataFile:file,autosave:false});
 const m=a.monsters.get(0)[0];
 evolution.evolveOnVictory(m,{level:76,role:'guardiao'});
 const boosted=m.maxHp;
 a.saved.monsters[m.id]=evolution.cleanRecord(m.progress);
 a.dirty=true;
 assert.ok(a.persist());
 a.stop();
 const b=new World({send:()=>{},getOnline:()=>0,hasClassicName:()=>false,dataFile:file,autosave:false});
 t.after(()=>b.stop());
 const restored=b.monsters.get(0)[0];
 assert.equal(restored.progress.victories,1);
 assert.equal(restored.progress.adaptations.guardiao,1);
 assert.equal(restored.maxHp,boosted);
 assert.equal(restored.equipment[1].id,'garras');
});
test('interface do Bestiário mostra atributos e equipamentos sem expor dados do jogador',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 const guide=fs.readFileSync(path.join(__dirname,'../public/guia.html'),'utf8');
 assert.match(ui,/send\('inspectMonster',\{monster:candidate\.id\}\)/);
 assert.match(ui,/renderMonsterSheet\(msg\.sheet\)/);
 assert.match(ui,/monsterEvolution/);
 assert.match(html,/id="monsterSheetEquipment"/);
 assert.match(html,/id="monsterSheetAttributes"/);
 assert.match(guide,/cada criatura é um indivíduo/);
 const mock={id:'m-0-1',zone:0,species:1,boss:false,name:'Lobo',hp:31,maxHp:40,damage:7,baseHp:40,baseDamage:7,
   progress:{victories:3,xp:500,adaptations:{guardiao:1}},attributes:evolution.speciesAttributes(1,0,3,false),
   level:3,rank:'Endurecido',armor:3,magicResist:2,evasion:1,attackHaste:1,
   equipment:[{id:'natural',name:'Instinto selvagem',slot:'arma',effect:'natural'}],loot:[]};
 const sheet=evolution.publicSheet(mock);
 assert.ok(!JSON.stringify(sheet).includes('account:'));
 assert.equal(sheet.name,'Lobo');
 assert.equal(sheet.equipment.length,1);
});

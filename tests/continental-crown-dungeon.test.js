'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const kingdoms=require('../kingdom-politics');
const {World,ZONES,GOODS,RELICS,SPECIES,zoneDifficulty,
 CROWN_DUNGEON_ROOT,CROWN_DUNGEON_KEY,CROWN_KEY_COOLDOWN_MS,
 crownDungeonZone,requiresCrownKey,autoAggroZone}=require('../world-engine');

function game(t){
 const messages=[],snapshots=[];
 const w=new World({persistentStore:{enqueue:s=>{snapshots.push(structuredClone(s));return Promise.resolve(true)}},
  send:(socket,msg)=>messages.push({socket,msg}),getOnline:()=>0,hasClassicName:()=>false,autosave:false});
 t.after(()=>w.stop());
 const make=(name)=>{
  const socket={},client={socket,authUser:{uid:'account:'+name,username:name},worldPlayer:null};
  w.join(client,{name});
  return client.worldPlayer;
 };
 const king=make('Soberano'),vassal=make('Conselheiro'),stranger=make('Aventureiro');
 king.save.guild='Casa Continental';
 vassal.save.guild='Casa Continental';
 const g={name:'Casa Continental',leader:king.uid,members:[king.uid,vassal.uid],base:{zone:0,x:500,y:500,level:60},
   influence:Object.fromEntries(Array.from({length:7},(_,i)=>[i,100]))};
 w.guilds.set('casa continental',g);
 return {w,make,king,vassal,stranger,g,messages,snapshots};
}

test('somente a quarta das quatro masmorras exige a chave da Coroa',()=>{
 assert.equal(ZONES.length,40);
 assert.equal(CROWN_DUNGEON_ROOT,15);
 assert.equal(crownDungeonZone(15),true);
 assert.equal(crownDungeonZone(34),true);
 assert.equal(crownDungeonZone(39),true);
 assert.equal(crownDungeonZone(33),false);
 assert.equal(requiresCrownKey(11,15),true);
 assert.equal(requiresCrownKey(33,15),true,'portal final da terceira masmorra não ignora o requisito');
 assert.equal(requiresCrownKey(34,15),false,'retorno interno não cobra outra chave');
 for(const root of [12,13,14])assert.equal(requiresCrownKey(11,root),false);
 assert.ok(GOODS.chave,'as outras três masmorras mantêm chave comum e loja');
 assert.equal(GOODS[CROWN_DUNGEON_KEY],undefined,'chave real não pode ser comprada');
 assert.equal(RELICS[CROWN_DUNGEON_KEY],undefined,'chave real não pode ser negociada como relíquia');
});

test('a guilda solitária já é soberana; disputa entre reinos exige maioria relativa',t=>{
 const f=game(t),{w,king,vassal,stranger,g}=f;
 assert.equal(kingdoms.continentalSovereign(w)?.leaderUid,king.uid);
 assert.equal(kingdoms.publicState(w,king).continentalCrown.holder,true);
 assert.equal(kingdoms.publicState(w,vassal).continentalCrown.holder,false);
 assert.equal(w.claimCrownKey(vassal),false);
 assert.equal(w.claimCrownKey(stranger),false);
 assert.equal(w.claimCrownKey(king),true);
 assert.equal(king.save.inventory[CROWN_DUNGEON_KEY],1);
 assert.equal(w.claimCrownKey(king),false,'não permite duplicar');
 assert.ok(f.snapshots.some(s=>s.characters[king.uid]?.inventory?.[CROWN_DUNGEON_KEY]===1));
 assert.ok(king.save.crownKeyIssuedAt>0,'horário da concessão é persistido');
 // A primeira guilda deve reinar mesmo que só tenha uma capital e zero expansão.
 g.influence={}; 
 assert.equal(kingdoms.continentalSovereign(w)?.leaderUid,king.uid,'único reino não precisa de sete regiões');
 const rival={name:'Ordem Rival',leader:stranger.uid,members:[stranger.uid],
  base:{zone:1,x:700,y:500,level:1},influence:{}};
 stranger.save.guild=rival.name;w.guilds.set('ordem rival',rival);
 assert.equal(kingdoms.continentalSovereign(w),null,'uma região para cada reino: Coroa em disputa');
 king.save.inventory[CROWN_DUNGEON_KEY]=0;
 king.save.crownKeyIssuedAt=0;
 assert.equal(w.claimCrownKey(king),false,'sem soberania, sem nova chave');
 g.influence[2]=3; // Duas regiões para a Casa Continental, uma para o rival.
 assert.equal(kingdoms.continentalSovereign(w)?.leaderUid,king.uid);
 assert.equal(w.claimCrownKey(king),true);
 king.save.inventory[CROWN_DUNGEON_KEY]=0;
 assert.equal(w.claimCrownKey(king),false,'não farmar novas chaves antes de 24h');
 king.save.crownKeyIssuedAt=Date.now()-CROWN_KEY_COOLDOWN_MS-1;
 assert.equal(w.claimCrownKey(king),true);
});

test('portal da superfície para Câmara nega chave comum e consome só chave real',t=>{
 const {w,king}=game(t);
 king.zone=11;king.save.zone=11;
 king.save.inventory.chave=5;
 assert.equal(w.zonePortals(11).some(g=>g.zone===15),true);
 w.travel(king,15);
 assert.equal(king.zone,11);
 assert.equal(king.save.inventory.chave,5,'não deve gastar chaves das outras masmorras');
 king.save.inventory[CROWN_DUNGEON_KEY]=1;
 w.travel(king,15);
 assert.equal(king.zone,15);
 assert.equal(king.save.inventory[CROWN_DUNGEON_KEY],0);
 assert.equal(king.save.inventory.chave,5);
 // Ao voltar das galerias, permanece dentro do mesmo complexo real.
 king.zone=34;
 w.travel(king,15);
 assert.equal(king.zone,15);
 assert.equal(king.save.inventory[CROWN_DUNGEON_KEY],0,'retorno interno não consome chave');
});

test('passagem do sexto subsolo do Templo também exige a chave especial',t=>{
 const {w,king}=game(t);
 king.zone=33;king.save.zone=33;
 king.save.inventory.chave=12;
 assert.equal(w.zonePortals(33).some(g=>g.zone===15),true);
 w.travel(king,15);
 assert.equal(king.zone,33);
 king.save.inventory[CROWN_DUNGEON_KEY]=1;
 w.travel(king,15);
 assert.equal(king.zone,15);
 assert.equal(king.save.inventory[CROWN_DUNGEON_KEY],0);
});

test('as outras três masmorras dependem das chaves da história, não de compras',t=>{
 const {w,king}=game(t);
 for(const [surface,root]of [[1,12],[3,13],[5,14]]){
  king.zone=surface;king.save.zone=surface;king.save.inventory.chave=1;
  king.save.story.stage=0;w.travel(king,root);assert.equal(king.zone,surface,'chave avulsa não libera a história');
  king.save.story.stage={12:2,13:5,14:9}[root];w.travel(king,root);
  assert.equal(king.zone,root,'porta '+root+' deve ser liberada pela missão');
  assert.equal(king.save.inventory.chave,1,'chave narrativa é uma autorização permanente');
 }
});

test('criaturas da Câmara e seis subsolos são mais fortes mas sinalizam ataques',t=>{
 const {w}=game(t);
 for(const zone of [15,34,35,36,37,38,39]){
  assert.equal(autoAggroZone(zone),true,'a quarta masmorra tem ameaças hostis inclusive na entrada');
  const mobs=w.monsters.get(zone),boss=mobs.find(m=>m.boss),common=mobs.find(m=>!m.boss);
  assert.ok(common.maxHp>=Math.floor(SPECIES[common.species][1]*zoneDifficulty(zone)*1.6));
  assert.ok(boss.maxHp>=Math.floor(SPECIES[31][1]*5.5*zoneDifficulty(zone)*1.6));
  assert.ok(boss.damage>Math.ceil(SPECIES[31][2]*zoneDifficulty(zone)*2));
  assert.ok(boss.maxHp<100000,'o chefe precisa continuar derrotável em combate prolongado');
 }
 assert.equal(autoAggroZone(12),false,'as outras masmorras não mudaram suas regras de agressividade');
});

test('GUIA e interface descrevem o único portão imperial e oferecem reivindicação ao soberano',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 const guide=fs.readFileSync(path.join(__dirname,'../public/guia.html'),'utf8');
 assert.ok(ui.includes("send('claimCrownKey')"));
 assert.ok(ui.includes("chave_coroa_aurora"));
 assert.ok(ui.includes("Chave da Câmara da Aurora"));
 assert.match(guide,/Apenas a quarta masmorra/);
 assert.match(guide,/uma única guilda no continente/);
 assert.match(guide,/três primeiras continuam usando a Chave da masmorra comum/);
});

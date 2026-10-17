'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {HISTORIC,POOLS,speciesForRegion}=require('../region-monster-species');
const {World,ZONES,SPECIES}=require('../world-engine');
const frontier=require('../frontier-world');
function newWorld(){
 return new World({send:()=>{},getOnline:()=>0,hasClassicName:()=>false,persistentStore:{},autosave:false});
}
test('exactly one native species and one same-species boss in every historical map',()=>{
 const world=newWorld();
 assert.equal(ZONES.length,40);
 assert.equal(HISTORIC.length,40);
 assert.equal(SPECIES.length,32);
 for(let zone=0;zone<40;zone++){
  const monsters=world.ensureMonsters(zone),bossses=monsters.filter(m=>m.boss);
  const commons=monsters.filter(m=>!m.boss);
  assert.equal(monsters.length,zone>=12&&zone<=15?18:14,'population in zone '+zone);
  assert.equal(bossses.length,1,'one boss in zone '+zone);
  assert.ok(commons.length>0,'common monsters in zone '+zone);
  const ids=new Set(monsters.map(m=>m.species));
  assert.equal(ids.size,1,'one unique species in zone '+zone);
  assert.equal(bossses[0].species,commons[0].species);
  assert.equal(bossses[0].species,speciesForRegion(zone));
  assert.ok(bossses[0].name.includes(SPECIES[bossses[0].species][0]),'boss named by its own species');
  assert.ok(bossses[0].baseHp>commons[0].baseHp);
  assert.ok(bossses[0].xp>commons[0].xp);
 }
});
test('each procedural region has one deterministic biome-native species and its matching boss',()=>{
 const world=newWorld();
 for(let zone=40;zone<100;zone++){
  const expected=speciesForRegion(zone),type=frontier.info(zone).biome;
  assert.ok(POOLS[type].includes(expected),'native ecosystem in '+zone);
  const group=world.ensureMonsters(zone);
  assert.equal(group.length,14);
  assert.equal(group.filter(m=>m.boss).length,1);
  assert.ok(group.every(m=>m.species===expected),'mixed species in '+zone);
  assert.equal(speciesForRegion(zone),expected);
 }
 world.monsters.delete(52);
 assert.ok(world.ensureMonsters(52).every(m=>m.species===speciesForRegion(52)),
 'revisiting the map must preserve its species');
});
test('existing monster evolution is restored even though species distribution changed',()=>{
 const world=newWorld(),creatures=world.ensureMonsters(1);
 const monster=creatures[0],id=monster.id,species=monster.species;
 const progress=require('../monster-progression');
 world.saved.monsters[id]={victories:7,xp:400,adaptations:{peregrino:2}};
 progress.restoreMonster(monster,world.saved.monsters[id]);
 assert.equal(monster.id,id);
 assert.equal(monster.species,species);
 assert.equal(monster.progress.victories,7);
 assert.ok(monster.level>1&&monster.maxHp>monster.baseHp);
 assert.ok(monster.equipment.length>1);
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const scene=fs.readFileSync(path.join(__dirname,'../public/guild-scene-3d.mjs'),'utf8');
test('progressão arquitetônica é determinística e cobre todos os 60 níveis',async()=>{
 const {architectureAt,ARCHITECTURE_MAX_LEVEL}=await import('../public/guild-architecture.mjs');
 assert.equal(ARCHITECTURE_MAX_LEVEL,60);
 assert.equal(architectureAt(0).level,1);
 assert.equal(architectureAt(999).level,60);
 assert.equal(architectureAt(undefined).level,1);
 assert.equal(architectureAt('59').level,59);
 const levels=Array.from({length:60},(_,i)=>architectureAt(i+1));
 assert.deepEqual(levels.filter(a=>a.milestone).map(a=>a.level),[11,21,31,41,51]);
 assert.deepEqual([...new Set(levels.map(a=>a.name))].length,6);
 assert.deepEqual([1,10,11,20,21,30,31,40,41,50,51,60].map(v=>architectureAt(v).tier),
  [1,1,2,2,3,3,4,4,5,5,6,6]);
 for(let i=1;i<levels.length;i++){
  assert.ok(levels[i].growth>levels[i-1].growth,'todos os níveis precisam acrescentar progressão visual');
  assert.ok(levels[i].tier>=levels[i-1].tier);
 }
 for(const tier of levels.filter((a,i)=>i%10===0)){
  assert.match(tier.palette.stone,/^#[0-9a-f]{6}$/i);
  assert.match(tier.palette.roof,/^#[0-9a-f]{6}$/i);
 }
});
test('o castelo acompanha o nível da fortaleza em todas as atualizações de snapshot',()=>{
 assert.match(scene,/const nextLevel=architectureAt\(level\)\.level;/);
 assert.match(scene,/disposeGroup\(coreGroup\);coreGroup\.scale\.y=/);
 assert.match(scene,/castle\(coreGroup,buildLevel\)/);
 assert.match(scene,/dataset\.architectureTier=/);
 assert.doesNotMatch(scene,/Math\.min\(5,Math\.floor\(Number\(level\)/);
});
test('todas as cinco construções têm ornamentos progressivos sem modificar seu lote',()=>{
 for(const type of ['house','farm','market','tower','barracks'])
  assert.ok(scene.includes("b.type==='"+type+"'"),type+' precisa de arquitetura dedicada');
 assert.match(scene,/evolveBuilding\(g,b\);/);
 assert.match(scene,/architectureAt\(b\.level\)/);
 assert.match(scene,/completedHeightScale/);
 assert.match(scene,/site\.model\.userData\.completedHeightScale/);
});

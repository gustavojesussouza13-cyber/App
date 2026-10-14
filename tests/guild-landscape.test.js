'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const layout=require('../public/city-layout');
const scene=fs.readFileSync(path.join(__dirname,'../public/guild-scene-3d.mjs'),'utf8');

test('estradas conectadas formam avenidas visíveis de terra, sem invadir terrenos e castelo',async()=>{
 const {planGuildLandscape}=await import('../public/guild-landscape.mjs');
 const plan=planGuildLandscape(layout);
 assert.ok(plan.road.size>=60,'ruas precisam conectar a praça às quadras');
 assert.ok(plan.road.size<260,'não transformar todos os campos em pavimento');
 assert.ok(plan.plaza.size>=4);
 for(const item of plan.road){
  const [x,y]=item.split(':').map(Number);
  assert.ok(x>=0&&y>=0&&x<layout.N&&y<layout.N);
  assert.equal(plan.isLot(x,y),false,'não atravessar lotes '+item);
  assert.equal(layout.isCore(x,y),false,'não atravessar castelo');
  assert.equal(plan.isForest(x,y),false,'estrada não é mata');
 }
 for(const lot of layout.slots){
  for(const [x,y] of layout.cells(lot)){
   assert.equal(plan.isRoad(x,y),false,lot.id);
   assert.equal(plan.isForest(x,y),false,'árvores proibidas no lote '+lot.id);
  }
 }
});
test('bosques e clareiras têm solo próprio e nunca ocupam os locais de obras',async()=>{
 const {planGuildLandscape}=await import('../public/guild-landscape.mjs');
 const plan=planGuildLandscape(layout);
 assert.ok(plan.forest.size>=35,'cidade deve possuir espaços verdes');
 assert.ok(plan.meadow.size>10,'manter clareiras verdes');
 for(const key of [...plan.forest,...plan.meadow]) {
  const [x,y]=key.split(':').map(Number);
  assert.equal(plan.isLot(x,y),false);
  assert.equal(plan.isRoad(x,y),false);
  assert.equal(layout.isCore(x,y),false);
 }
 assert.equal(plan.road.size+plan.forest.size+plan.meadow.size+
   plan.lotCells.size+layout.CORE.w*layout.CORE.h,layout.N*layout.N);
});
test('cena medieval usa tons terrosos, mato, carroças, mata perimetral e clareiras',()=>{
 assert.match(scene,/import \{planGuildLandscape\} from '\/guild-landscape\.mjs'/);
 assert.match(scene,/landscape\.isRoad\(x,y\)/);
 assert.match(scene,/landscape\.isForest\(x,y\)/);
 assert.match(scene,/const earthy=\[/);
 assert.match(scene,/function littleShrub\(/);
 assert.match(scene,/function townWell\(/);
 assert.match(scene,/function cart\(/);
 assert.match(scene,/const free=\(x,y\)=>!layout\.isCore\(x,y\)&&!layout\.lotAt\(x,y\)/);
 assert.match(scene,/lot\.type==='farm'/);
 assert.doesNotMatch(scene,/\(x\+y\)%4===0\?'#96896e':'#b3a58a'/);
});

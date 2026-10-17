'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let api,land;
async function modules(){
 api ||=await import('../public/world-scenery-v4.mjs');
 land ||=await import('../public/world-scenery-v5-landforms.mjs');
 return {api,land};
}
test('V5 top-down tilemaps cover all 10 biomes, align with the server road and fit full 2.5D map',async()=>{
 const {api,land}=await modules();
 assert.equal(land.MAP_W,768);assert.equal(land.MAP_H,512);
 assert.equal(land.TILE,16);
 assert.equal(api.BIOMES.length,10);
 for(let z=0;z<10;z++)for(const biome of api.BIOMES){
  const a=api.planSceneryV5(z,biome),b=api.planSceneryV5(z,biome);
  assert.deepEqual(a,b,'deterministic semantically placed art '+z+' '+biome);
  assert.ok(a.length>=16&&a.length<=100,'meaningful static landmarks without clutter '+z+' '+biome+' '+a.length);
  assert.equal(api.sceneryOverlapPairs(a,8),0,'entire full sprite rectangles never overlap: '+biome+' '+z);
  for(const item of a){
   const bounds=api.sceneryVisualBounds(item,8);
   assert.ok(bounds.left>=8&&bounds.right<=1528&&bounds.top>=8&&bounds.bottom<=1016);
   if(item.kind!=='bridge')for(let n=0;n<5;n++){
    const x=bounds.left+(bounds.right-bounds.left)*n/4,y=api.roadY(x,z);
    assert.ok(bounds.bottom<=y-52||bounds.top>=y+52,
      'no roof or canopy must block walkable road: '+biome+' '+JSON.stringify(item));
   }
  }
 }
});
test('V5 has a distinct original village composition with stable houses and connected earth paths',async()=>{
 const {api,land}=await modules();
 const z0=api.planSceneryV5(0,'meadow');
 const loc=land.reservedSceneryLandmarks(0,'meadow');
 assert.ok(loc.filter(x=>x.kind==='house').length>=2);
 assert.ok(z0.some(x=>x.kind==='house'),'village has buildings, not random noise');
 assert.ok(z0.filter(x=>x.kind==='house').some(x=>x.w>=300&&x.h>=210),'buildings must have a believable size relative to 93x116 classes');
 assert.ok(z0.some(x=>x.kind==='tree'),'scenery has established trees');
 assert.ok(!z0.some(x=>x.x>990&&x.z>764),'decorative cliff reserved for clear rock strata');
 const city=api.planSceneryV5(1,'city');
 assert.ok(city.some(x=>x.kind==='house'),'city retains authored houses');
 for(const biome of api.BIOMES)assert.ok(land.reservedSceneryLandmarks(9,biome).length>=2);
 assert.throws(()=>api.planSceneryV5(0,'guild-fortress'),/Bioma desconhecido/);
});
test('V5 terrain is authored as a single original contiguous 768x512 pixel map, no image placeholders',async()=>{
 const {api,land}=await modules();
 const orig=global.document;
 let draws=0;
 const g={fillStyle:'',imageSmoothingEnabled:true,fillRect(x,y,w,h){
  assert.ok([x,y,w,h].every(Number.isFinite));
  assert.ok(w>=0&&h>=0);draws++;
 }};
 global.document={createElement(tag){
  assert.equal(tag,'canvas');
  return {width:0,height:0,getContext(type){assert.equal(type,'2d');return g;}};
 }};
 try{
  for(const biome of api.BIOMES){
   const c=land.drawDesignedTerrainCanvas(0,biome);
   assert.deepEqual([c.width,c.height],[768,512]);
   assert.equal(g.imageSmoothingEnabled,false);
  }
  assert.ok(draws>10000,'authored tile clusters and roads require actual pixel strokes');
 }finally{global.document=orig;}
 const source=fs.readFileSync(path.resolve(__dirname,'../public/world-scenery-v5-landforms.mjs'),'utf8');
 assert.ok(source.includes('function paintCliff'));
 assert.ok(source.includes('function paintRoad'));
 assert.ok(source.includes('function paintGardens'));
 assert.ok(source.includes('function paintRiver'));
 assert.ok(source.includes('function spur'));
 assert.ok(!/guild-scene-3d|DATABASE_URL|fetch\(|WebSocket|localStorage/.test(source));
});
test('V5 renderer composes pixelmap without duplicating road plane or rendering conflicting water strips',async()=>{
 const {api,land}=await modules();
 const dir=path.resolve(__dirname,'../public'),code=fs.readFileSync(path.join(dir,'world-scenery-v4.mjs'),'utf8');
 const renderer=fs.readFileSync(path.join(dir,'world-25d.mjs'),'utf8');
 const lab=fs.readFileSync(path.join(dir,'laboratorio-cenario-25d-v4.html'),'utf8');
 assert.ok(code.includes('composition?createDesignedTerrainTexture(THREE,zone,biome)'));
 assert.ok(code.includes('if(!composition){'),'no duplicate overlaid road/water planes in V5');
 assert.ok(code.includes('composition?planSceneryV5(zone,biome)'));
 assert.ok(renderer.includes('setSceneryComposition(value)'));
 assert.ok(renderer.includes('composition:useSceneryComposition'));
 for(const mode of ['value="old"','value="v4"','value="v42"','value="v5"'])assert.ok(lab.includes(mode));
 assert.ok(lab.includes("view.setSceneryComposition(q.value==='v5'||q.value==='atlas')"));
 assert.ok(lab.includes('mode();'),'V5 is initially activated in real WebGL preview');
});

test('V5 independently paints houses at 192x160 with roof tiles, glazed windows and masonry',async()=>{
 const {land}=await modules();
 const original=global.document;
 let painted=0;
 const g={fillStyle:'',imageSmoothingEnabled:true,fillRect(x,y,w,h){
  assert.ok([x,y,w,h].every(Number.isFinite));painted++;
 }};
 global.document={createElement(tag){assert.equal(tag,'canvas');return {
  width:0,height:0,getContext(type){assert.equal(type,'2d');return g;}
 }}};
 try{
  for(const biome of ['meadow','city','forest','desert','mountain','coast']){
   const canvas=land.drawDesignedHouseCanvas(biome,1);
   assert.equal(canvas.width,192);assert.equal(canvas.height,160);
   assert.equal(g.imageSmoothingEnabled,false);
  }
  assert.ok(painted>3000,'hand-authored house art needs actual individual roof/window/brick pixels');
 }finally{global.document=original;}
 const src=fs.readFileSync(path.resolve(__dirname,'../public/world-scenery-v4.mjs'),'utf8');
 assert.ok(src.includes("composition&&kind==='house'"));
 assert.ok(src.includes('drawDesignedHouseCanvas(biome,variant)'));
});

'use strict';
/**
 * Referential anti-overlap contract for 2.5D scenery.
 * The user-approved top-down design requires no stacked roofs, foliage,
 * blockers, or props across paths and landmarks. We validate whole visible
 * pixels (full sprite rectangles), not only center points.
 */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let cached;
async function scenery(){return cached||(cached=await import('../public/world-scenery-v4.mjs'));}
test('all biomes: full sprite rectangles stay apart in both V4 modes',async()=>{
 const api=await scenery();
 for(let z=0;z<16;z++)for(const biome of api.BIOMES)for(const detail of [false,true]){
  const p=api.planSceneryV4(z,biome,{detail});
  const count=api.sceneryOverlapPairs(p,5);
  assert.equal(count,0,'overlapping sprite rectangles '+JSON.stringify({z,biome,detail,count}));
  for(const item of p){
   const b=api.sceneryVisualBounds(item,8);
   assert.ok(b.left>=8&&b.right<=1528&&b.top>=8&&b.bottom<=1016,
    'fully visible on map '+JSON.stringify({z,biome,detail,item,b}));
  }
 }
});
test('roads, center landmark, shore and river channel are free of scenery sprites',async()=>{
 const api=await scenery();
 for(let z=0;z<20;z++)for(const biome of api.BIOMES){
  const p=api.planSceneryV4(z,biome);
  for(const item of p){
   const b=api.sceneryVisualBounds(item,8);
   if(item.kind!=='bridge')for(let n=0;n<5;n++){
    const x=b.left+(b.right-b.left)*n/4,roadY=api.roadY(x,z);
    assert.ok(b.bottom<=roadY-52||b.top>=roadY+52,
     'sprite visual footprint intrudes on walkable road '+JSON.stringify({z,biome,item}));
   }
   if(z===0)assert.ok(!(b.left<853&&b.right>680&&b.top<416&&b.bottom>258),
    'first area shrine must not be obscured');
   if(biome==='coast'&&item.kind!=='boat')assert.ok(b.bottom<=696,
    'shore props must remain on land');
   if(biome==='river'&&!['boat','bridge'].includes(item.kind))for(let n=0;n<5;n++){
    const zz=b.top+(b.bottom-b.top)*n/4,waterX=420+92*Math.sin(zz/150+z);
    assert.ok(b.left>=waterX+70||b.right<=waterX-70,
     'water channel must remain visually clear');
   }
  }
 }
});
test('opaque alpha-cutout ensures predictable render order across grouped static props',async()=>{
 const code=fs.readFileSync(path.resolve(__dirname,'../public/world-scenery-v4.mjs'),'utf8');
 assert.match(code,/transparent:false,alphaTest:\.45,depthWrite:true/);
 assert.ok(code.includes('new THREE.InstancedMesh'),'performance groups retained');
 assert.ok(code.includes('visualExclusion(item,zone,biome,width,height)'),'footprint exclusion retained');
 assert.ok(code.includes('sceneryOverlaps(item,other,5)'),'no arbitrary overlapping neighboring props');
 assert.ok(code.includes('if(biome===\'river\')')&&code.includes('if(biome===\'city\')'),
  'landmarks are still prioritized');
 const data=fs.readFileSync(path.resolve(__dirname,'../public/world-25d.mjs'),'utf8');
 assert.ok(data.includes('if(!success){'),'legacy scene remains safe fallback');
 assert.ok(!code.includes('guild-scene-3d'),'fortress implementation stays isolated');
});

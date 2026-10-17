'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../public');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
let mod;const get=async()=>mod||(mod=await import('../public/world-scenery-v72-asset-loader.mjs'));
test('V7.2 four PNG sprites have exact size, transparency and Git blob checksums',async()=>{
 const m=await get(),manifest=JSON.parse(source('assets/scenery-v72/manifest.json'));
 assert.equal(manifest.version,'v72-pixel-art-1');
 assert.equal(manifest.approved,true);
 assert.equal(manifest.sprites.length,4);
 assert.deepEqual(Object.keys(m.V72_ASSETS).sort(),['fountain','lamp','shrub','well']);
 for(const sprite of manifest.sprites){
  const file=fs.readFileSync(path.join(root,'assets/scenery-v72/sprites',sprite.id+'.png'));
  assert.deepEqual([...file.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(file.readUInt32BE(16),sprite.width);
  assert.equal(file.readUInt32BE(20),sprite.height);
  assert.equal(file[25],3,'indexed palette PNG, not an opaque placeholder');
  assert.ok(file.includes(Buffer.from('tRNS')),'transparent background');
  const digest=crypto.createHash('sha1').update('blob '+file.length+'\0').update(file).digest('hex');
  assert.equal(digest,sprite.git_blob_sha,'unmodified original PNG '+sprite.id);
  assert.ok(file.length<15000,'small original sprite download');
 }
 const old=JSON.parse(source('assets/scenery-v7/availability.json'));
 for(const blocked of ['lampiao_01','poco_01','ponte_madeira_01','casa_azul_02'])
  assert.ok(!old.files.includes(blocked),'unsafe board crop remains disabled');
});
test('V7.2 loader gates real files and measures native dimensions',async()=>{
 const m=await get();
 assert.equal(m.v72Url('unknown'),null);
 assert.equal(m.v72Ready(),false);
 assert.equal(await m.preloadV72Assets(),false,'Node without Image uses V5 fallback');
 const paths=[];
 class MockImage {
  constructor(){this.listeners={};}
  addEventListener(type,fn){this.listeners[type]=fn;}
  set src(value){
   paths.push(value);
   const item=Object.values(m.V72_ASSETS).find(x=>value.endsWith(x.id+'.png'));
   this.naturalWidth=item.w;this.naturalHeight=item.h;
   queueMicrotask(()=>this.listeners.load());
  }
 }
 const manifest=JSON.parse(source('assets/scenery-v72/manifest.json'));
 const good=await m.preloadV72Assets({fetcher:async url=>{
  assert.equal(url,'/assets/scenery-v72/manifest.json');
  return {ok:true,json:async()=>manifest};
 },ImageClass:MockImage});
 assert.equal(good,true);
 assert.equal(paths.length,4);
 assert.equal(m.v72Status().loaded,4);
 const THREE={Texture:class{constructor(img){this.image=img}},SRGBColorSpace:11,NearestFilter:12,NearestMipmapNearestFilter:13,ClampToEdgeWrapping:14};
 const tex=m.createV72PropTexture(THREE,'well');
 assert.equal(tex.magFilter,12);
 assert.equal(tex.wrapS,14);
 assert.equal(tex.image.naturalWidth,80);
});
test('V7.2 landmarks remain isolated from roads, shrine and other full-size sprites',async()=>{
 const scene=await import('../public/world-scenery-v4.mjs');
 for(let z=0;z<12;z++)for(const biome of scene.BIOMES){
  const old=scene.planSceneryV5(z,biome);
  const plan=scene.planSceneryV72(z,biome,old);
  assert.equal(scene.sceneryOverlapPairs(plan,8),0,biome+' zone '+z);
  assert.deepEqual(plan,scene.planSceneryV72(z,biome,old),'stable visual composition');
  for(const item of plan){
   const bounds=scene.sceneryVisualBounds(item,8);
   assert.ok(bounds.left>=8&&bounds.right<=1528&&bounds.top>=8&&bounds.bottom<=1016);
   for(let i=0;i<5;i++){
    const x=bounds.left+(bounds.right-bounds.left)*i/4,y=scene.roadY(x,z);
    assert.ok(bounds.bottom<=y-52||bounds.top>=y+52,'path kept empty for '+biome);
   }
   if(z===0)assert.ok(!(bounds.left<853&&bounds.right>680&&bounds.top<416&&bounds.bottom>258),'Aurora shrine untouched');
  }
 }
 const meadow=scene.planSceneryV72(0,'meadow',scene.planSceneryV5(0,'meadow'));
 const city=scene.planSceneryV72(8,'city',scene.planSceneryV5(8,'city'));
 assert.ok(meadow.some(x=>x.kind==='well'),'meadow has an actual visible pixel well');
 assert.ok(city.some(x=>x.kind==='lamp'),'city has a lamp');
 assert.ok(city.some(x=>x.kind==='fountain'),'city has a fountain');
 const renderer=source('world-scenery-v4.mjs');
 assert.ok(renderer.includes('createV72PropTexture(THREE,kind)'));
 assert.ok(renderer.includes('useV7?planSceneryV72('));
 assert.ok(!renderer.includes('guild-scene-3d'));
});

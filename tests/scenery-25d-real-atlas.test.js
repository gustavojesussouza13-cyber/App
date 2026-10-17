'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let v;
async function api(){return v||(v=await import('../public/world-scenery-v6-asset-adapter.mjs'));}
test('PNG assets are sampled from the real previously published 16-bit atlas, not placeholders',async()=>{
 const m=await api();
 assert.equal(m.ATLAS_URL,'/assets/classic-atlas.png');
 assert.equal(m.atlasDescriptors.baseTiles,32);
 assert.equal(m.atlasDescriptors.treeSprites,9);
 assert.equal(m.atlasDescriptors.shrubSprites,3);
 assert.ok(m.atlasDescriptors.sceneryKinds.includes('tree'));
 assert.ok(m.atlasDescriptors.sceneryKinds.includes('rock'));
 assert.ok(fs.statSync(path.join(root,'public/assets/classic-atlas.png')).size>10000);
 assert.equal(m.atlasLoaded(),false);
 assert.equal(await m.preloadSceneryAtlas(),false,'node environment must not require a DOM');
});
test('real atlas crops render on the same pixel coordinates for terrain and props',async()=>{
 const module=await api();
 let current={};const events=[],draws=[];
 const oldImg=global.Image,oldDoc=global.document;
 class Img{
  constructor(){this.listeners={};this.naturalWidth=1024;this.naturalHeight=1024}
  addEventListener(t,cb){this.listeners[t]=cb}
  set src(value){assert.equal(value,'/assets/classic-atlas.png');queueMicrotask(()=>this.listeners.load?.())}
 }
 let ctx;
 global.Image=Img;
 global.document={createElement(tag){
  assert.equal(tag,'canvas');
  ctx={imageSmoothingEnabled:true,drawImage(...args){assert.equal(args[0].naturalWidth,1024);draws.push(args)}};
  return {width:0,height:0,getContext(type){assert.equal(type,'2d');return ctx}};
 }};
 const THREE={CanvasTexture:class{constructor(c){this.canvas=c;this.repeat={set(){}};}},SRGBColorSpace:'srgb',NearestFilter:11,NearestMipmapNearestFilter:21,ClampToEdgeWrapping:31};
 try{
  assert.equal(await module.preloadSceneryAtlas(),true);
  assert.equal(module.atlasLoaded(),true);
  for(const b of ['meadow','city','river','coast','dungeon']){
   const tex=module.createAtlasGroundTexture(THREE,0,b);
   assert.equal(tex.canvas.width,768);assert.equal(tex.canvas.height,512);
   assert.equal(tex.magFilter,11);assert.equal(tex.wrapS,31);
  }
  for(const k of ['tree','pine','palm','shrub','flower','rock','well','lamp','banner','market']){
   const tex=module.createAtlasPropTexture(THREE,k,1);
   assert.ok(tex?.canvas.width>0&&tex?.canvas.height>0);
  }
  assert.equal(module.createAtlasPropTexture(THREE,'house',1),null,'original detailed V5 house fallback preserved');
  assert.ok(draws.length>7000,'real PNG source is used for terrain and props');
 }finally{global.Image=oldImg;global.document=oldDoc;}
});
test('asset mode is opt-in and exact legacy scenario remains active when image is unavailable',()=>{
 const root=path.resolve(__dirname,'../public');
 const w=fs.readFileSync(path.join(root,'world-25d.mjs'),'utf8');
 const s=fs.readFileSync(path.join(root,'world-scenery-v4.mjs'),'utf8');
 const lab=fs.readFileSync(path.join(root,'laboratorio-cenario-25d-v4.html'),'utf8');
 assert.ok(w.includes('useSceneryAtlas=false'));
 assert.ok(w.includes('setSceneryAtlas(value)'));
 assert.ok(w.includes('preloadSceneryAtlas().then'));
 assert.ok(s.includes('const useAtlas=Boolean(atlas&&!useV7&&composition&&atlasLoaded())'));
 assert.ok(s.includes('createDesignedTerrainTexture(THREE,zone,biome)'));
 assert.ok(s.includes('createAtlasPropTexture(THREE,kind,variant)'));
 assert.ok(lab.includes('value="atlas"'));
 assert.ok(lab.includes("view.setSceneryAtlas(q.value==='atlas')"));
 for(const p of [s,w,lab])assert.ok(!p.includes('guild-scene-3d'),'never modify 3D guild fortress');
});

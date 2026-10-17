'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../public');
const js=(name)=>fs.readFileSync(path.join(base,name),'utf8');
let m;const loader=async()=>m||(m=await import('../public/world-scenery-v7-asset-loader.mjs'));
test('V7 QA catalog contains 30 original object crops, 20 tile candidates and four disabled visual defects',async()=>{
 const m=await loader();
 assert.equal(Object.keys(m.V7_ASSETS).length,30);
 assert.equal(m.V7_TILES.length,20);
 assert.equal(m.v7Stats().approved,26);
 const pending=Object.entries(m.V7_ASSETS).filter(([id,v])=>v.state==='pending').map(([id])=>id).sort();
 assert.deepEqual(pending,['casa_azul_02','lampiao_01','poco_01','ponte_madeira_01']);
 for(const v of Object.values(m.V7_ASSETS)){
  assert.ok(v.w>=32&&v.h>=35&&v.state==='ready'||v.state==='pending');
 }
 const gate=JSON.parse(fs.readFileSync(path.join(base,'assets/scenery-v7/availability.json'),'utf8'));
 assert.equal(gate.version,'v7');assert.equal(gate.approved,true);
 assert.deepEqual(gate.files,['arbusto_flores_01','arvore_folhosa_01','rocha_musgo_01']);
 assert.equal(gate.quality_gate,'three_sprite_pilot');
 const expected={
  arbusto_flores_01:[75,42],
  arvore_folhosa_01:[88,156],
  rocha_musgo_01:[56,51]
 };
 for(const [id,[width,height]] of Object.entries(expected)){
  const binary=fs.readFileSync(path.join(base,'assets/scenery-v7/sprites',id+'.png'));
  assert.ok(binary.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'PNG signature '+id);
  assert.equal(binary.readUInt32BE(16),width,'width '+id);
  assert.equal(binary.readUInt32BE(20),height,'height '+id);
  assert.ok(binary.includes(Buffer.from('tRNS'))||binary.includes(Buffer.from('RGBA')),'transparency '+id);
  assert.ok(binary.byteLength<6000,'optimized network sprite '+id);
 }
 const crypto=require('node:crypto');
 for(const [id,expectedSha] of [
  ['arvore_folhosa_01','87894f51bb8b6d780e17d9ea2e10349f4a99fa77'],
  ['rocha_musgo_01','39114acf990205074c5a44dd55b3e29308521bdb']
 ]){
  const binary=fs.readFileSync(path.join(base,'assets/scenery-v7/sprites',id+'.png'));
  const sha=crypto.createHash('sha1').update(Buffer.from('blob '+binary.length+String.fromCharCode(0))).update(binary).digest('hex');
  assert.equal(sha,expectedSha,'Git blob integrity for '+id);
 }
 const png=fs.readFileSync(path.join(base,'assets/scenery-v7/sprites/arbusto_flores_01.png'));
 assert.ok(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'must be a real PNG');
 assert.equal(png.readUInt32BE(16),75);
 assert.equal(png.readUInt32BE(20),42);
 assert.ok(png.includes(Buffer.from('tRNS')),'RGBA transparency must remain in palette PNG');
 assert.ok(png.byteLength<5000,'asset should be small');
});
test('V7 maps actual characters and props without using unapproved crops',async()=>{
 const m=await loader();
 for(const k of ['tree','pine','house','rock','shrub','flower','ruin','arch','pillar','crate','market','fence','lamp']){
  const id=m.v7SpriteId(k,0);
  assert.ok(id,'missing original detailed crop for '+k);
  assert.equal(m.V7_ASSETS[id].state,'ready');
  assert.ok(m.v7Url(id).endsWith(id+'.png'));
 }
 assert.equal(m.v7SpriteId('bridge',1),null,'water-baked bridge crop must not cover gameplay');
 assert.equal(m.v7SpriteId('well',0),null,'unfixed well must use original V5');
 assert.equal(m.v7Url('../server.js'),null,'no unapproved asset traversal');
 assert.equal(await m.preloadV7Assets(),false,'Node without an image API falls back rather than throwing');
 assert.equal(m.isV7Ready(),false);
});
test('V7 accepts only an explicitly approved same-origin asset pack and uses nearest-neighbour textures',async()=>{
 const m=await loader();
 const activeFiles=['arvore_folhosa_01','casa_azul_01','casa_azul_02','ponte_madeira_01'];
 const requests=[];
 class ImageMock{
  constructor(){this.handlers={};this.naturalWidth=64;this.naturalHeight=80;}
  addEventListener(k,fn){this.handlers[k]=fn;}
  set src(v){requests.push(v);queueMicrotask(()=>this.handlers.load?.());}
 }
 const ok=await m.preloadV7Assets({fetcher:async url=>{
  assert.equal(url,m.BASE_URL+'availability.json');
  return {ok:true,json:async()=>({version:'v7',approved:true,files:activeFiles})};
 },ImageClass:ImageMock});
 assert.equal(ok,true);
 assert.equal(m.v7Stats().loaded,2,'unapproved PNGs must never auto-load');
 assert.equal(requests.length,2);
 assert.equal(m.v7Image('house',0).naturalWidth,64);
 assert.equal(m.v7Image('house',1),null,'fallback when variant not loaded');
 const THREE={Texture:class {constructor(image){this.image=image}},
  SRGBColorSpace:'s',NearestFilter:11,NearestMipmapNearestFilter:22,ClampToEdgeWrapping:33};
 const texture=m.createV7PropTexture(THREE,'tree',0);
 assert.ok(texture.needsUpdate);assert.equal(texture.magFilter,11);assert.equal(texture.wrapS,33);
 assert.equal(m.createV7PropTexture(THREE,'bridge',0),null);
});
test('V7 renderer code preserves 2.5D maps, classic atlas and original sprites as per-object fallback',()=>{
 const scene=js('world-scenery-v4.mjs'),world=js('world-25d.mjs'),lab=js('laboratorio-cenario-25d-v4.html');
 assert.ok(scene.includes("createV7PropTexture(THREE,kind,variant)"));
 assert.ok(scene.includes(":spriteTexture(THREE,kind,biome,variant,detail)"));
 assert.ok(scene.includes("const useV7=Boolean(v7&&composition&&isV7Ready())"));
 assert.ok(scene.includes('planSceneryV5(zone,biome)'));
 assert.ok(world.includes('setSceneryV7(value)'));
 assert.ok(world.includes('preloadV7Assets().then'));
 assert.ok(world.includes('get v7Ready()'));
 assert.ok(lab.includes('value="v7"'));
 assert.ok(lab.includes("view.setSceneryV7(q.value==='v7')"));
 for(const content of [scene,world,lab])assert.ok(!content.includes('guild-scene-3d'),'3D fortress code is protected');
});

test('V7 laboratory explicitly warns about unpublished art and distinguishes the actual V5 fallback',()=>{
 const lab=js('laboratorio-cenario-25d-v4.html');
 const manifest=JSON.parse(js('assets/scenery-v7/availability.json'));
 assert.ok(lab.includes('id="artgate"')&&lab.includes('V7 NÃO PUBLICADA'));
 assert.ok(lab.includes('view.v7Status.loaded')&&lab.includes('view.v7Ready'));
 assert.equal(manifest.approved,true,'Only checked pilot is allowed');
 assert.deepEqual(manifest.files,['arbusto_flores_01','arvore_folhosa_01','rocha_musgo_01']);
});

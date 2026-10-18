'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),publicDir=path.join(root,'public');
let mod;
async function api(){return mod||(mod=await import('../public/world-scenery-v4.mjs'));}
test('Scenery V4 implements ten existing historical biomes with consistent deterministic plans',async()=>{
 const v=await api();
 assert.deepEqual(v.BIOMES,['meadow','forest','river','desert','mountain','ruins','swamp','coast','city','dungeon']);
 assert.equal(v.SIZE.tile,32);
 for(let zone=0;zone<40;zone++){
  const biome=v.BIOMES[zone%10],a=v.planSceneryV4(zone,biome),b=v.planSceneryV4(zone,biome);
  assert.deepEqual(a,b,'stable props for repeated visits '+zone);
  assert.ok(a.length>=70&&a.length<=200,'controlled objects for '+biome+' zone '+zone);
  for(const item of a){
   assert.ok(item.x>=0&&item.x<=1536&&item.z>=0&&item.z<=1024);
   assert.ok(item.w>0&&item.h>0);
   assert.equal(typeof item.kind,'string');
   assert.ok(Math.abs(item.z-v.roadY(item.x,zone))>=77||biome==='river'&&item.kind==='bridge',
    'do not obstruct original walkways: '+biome+' '+JSON.stringify(item));
   if(zone===0)assert.ok(!(item.x>688&&item.x<845&&item.z>265&&item.z<408));
  }
 }
 assert.throws(()=>v.planSceneryV4(0,'fortress'),/Bioma desconhecido/);
});
test('all biome families contain biome-specific decorative and structural art while untouched game retains legacy backup',async()=>{
 const v=await api(),kinds=new Set();
 for(let region=0;region<12;region++)for(const biome of v.BIOMES)for(const item of v.planSceneryV4(region,biome))kinds.add(item.kind);
 for(const k of ['tree','house','rock','shrub','flower','pine','reeds','ruin','arch','pillar','altar','bridge','well','fence','barrel','crate','lamp','cactus','palm'])
  assert.ok(kinds.has(k),'family missing: '+k);
 const src=fs.readFileSync(path.join(publicDir,'world-25d.mjs'),'utf8');
 assert.ok(src.includes("import {buildSceneryV4,SCENERY_V4_VERSION} from '/world-scenery-v4.mjs'"));
 assert.ok(src.includes('let useSceneryV4=Boolean(sceneryV4)'));
 assert.ok(src.includes('if(!success){'),'failed V4 preserves original scene');
 assert.ok(src.includes('setSceneryV4(value)'),'comparison toggle');
 assert.ok(src.includes('addMeadowDetails(layer,zone,biome,random)'),'legacy model remains');
 assert.ok(!src.includes('guild-scene-3d'));
 const original=fs.readFileSync(path.join(publicDir,'guild-scene-3d.mjs'),'utf8');
 assert.ok(original.length>1000);
 const lab=fs.readFileSync(path.join(publicDir,'laboratorio-cenario-25d-v4.html'),'utf8');
 assert.ok(lab.includes('/world-25d.mjs'));assert.ok(lab.includes('Cenário original — antes das melhorias'));
});
test('Scenery V4 uses static instanced meshes with no writes to game state, DB, player coordinates or monsters',()=>{
 const src=fs.readFileSync(path.join(publicDir,'world-scenery-v4.mjs'),'utf8');
 assert.ok(src.includes('new THREE.InstancedMesh'));
 assert.ok(src.includes('THREE.NearestFilter'));
 assert.ok(src.includes('THREE.CanvasTexture'));
 assert.ok(src.includes('function addWaterV4'));
 assert.ok(!/fetch\(|WebSocket|localStorage|DATABASE_URL|guild-scene-3d|world-engine\.js/.test(src));
 const world=fs.readFileSync(path.join(publicDir,'world-25d.mjs'),'utf8');
 assert.ok(world.includes('camera.position.set(cx,1350,cz)'));
 assert.ok(world.includes('camera.lookAt(cx,0,cz)'));
 assert.ok(world.includes('if(zone===0&&(biome===\'meadow\'||biome===\'city\'))shrine=addAuroraShrine(layer)'));
});
test('buildSceneryV4 can create and place all art families into WebGL-style mocks',async()=>{
 const v=await api(),orig=global.document;
 const ctx={
  fillStyle:'',imageSmoothingEnabled:false,fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},ellipse(){}
 };
 global.document={createElement(tag){assert.equal(tag,'canvas');return {width:0,height:0,getContext(type){assert.equal(type,'2d');return ctx}}}};
 const xy=()=>({x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}});
 class Obj{constructor(){this.rotation=xy();this.position=xy();this.scale=xy();this.geometry=null;this.material=null;}updateMatrix(){this.matrix={}}}
 class Mesh extends Obj{constructor(geo,mat){super();this.geometry=geo;this.material=mat}}
 class InstancedMesh extends Mesh{constructor(g,m,n){super(g,m);this.count=n;this.instanceMatrix={needsUpdate:false}}setMatrixAt(i,mat){assert.ok(i>=0&&i<this.count);assert.ok(mat)}}
 class Texture{constructor(canvas){this.source=canvas;this.repeat={set(){}};this.wrapS=0;this.wrapT=0;}}
 class BufferGeometry{setAttribute(k,v){assert.ok(v);return this}setIndex(v){assert.ok(v.length)}computeVertexNormals(){}}
 const THREE={CanvasTexture:Texture,NearestFilter:1,NearestMipmapNearestFilter:2,ClampToEdgeWrapping:3,RepeatWrapping:4,SRGBColorSpace:'srgb',
  PlaneGeometry:class{constructor(w,h){this.width=w;this.height=h}},
  MeshBasicMaterial:class{constructor(opt){Object.assign(this,opt)}},DoubleSide:2,
  Mesh,InstancedMesh,Object3D:Obj,BufferGeometry,Float32BufferAttribute:class{constructor(v,n){assert.ok(v.length&&n)}}
 };
 try{
  for(const biome of v.BIOMES){
   const group={children:[],add(mesh){this.children.push(mesh)}};
   const report=v.buildSceneryV4(THREE,group,0,biome);
   assert.equal(report.biome,biome);assert.ok(report.staticProps>=70);
   assert.ok(group.children.some(x=>x.name==='scenery-v4-ground'));
   assert.ok(group.children.some(x=>x.name==='scenery-v4-road'));
   assert.ok(group.children.some(x=>x instanceof InstancedMesh));
  }
 }finally{global.document=orig;}
});
test('V4.2 artisan art adds at least ten static environment object families without animation',async()=>{
 const v=await api(),art=await import('../public/world-scenery-v4-art.mjs');
 assert.ok(v.SCENERY_V4_VERSION.includes('v42'));
 assert.equal(art.EXTRA_KINDS.length,10);
 for(const kind of ['mushroom','stump','obelisk','market','boat','statue','crystal','grave','fountain','watchtower']){
  assert.ok(art.EXTRA_KINDS.includes(kind));
  const [w,h]=art.EXTRA_SIZES[kind];assert.ok(w>=45&&h>=40);
 }
 const union=new Set();
 for(let zone=0;zone<32;zone++)for(const biome of v.BIOMES)
  for(const o of v.planSceneryV4(zone,biome))union.add(o.kind);
 for(const k of art.EXTRA_KINDS)assert.ok(union.has(k),'new prop not distributed: '+k);
 const src=fs.readFileSync(path.join(publicDir,'world-scenery-v4.mjs'),'utf8');
 assert.ok(src.includes('finishSceneryGround(g,biome,zone)'));
 assert.ok(src.includes('finishSceneryRoad(g,biome,zone)'));
 assert.ok(src.includes('finishScenerySprite(g,{kind,biome,variant})'));
 const canvasCalls={n:0};
 const g={fillStyle:'',beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},ellipse(){},
  fillRect(x,y,w,h){assert.ok(Number.isFinite(x+y+w+h));canvasCalls.n++}};
 for(const biome of v.BIOMES){
  art.finishSceneryGround(g,biome,4);
  art.finishSceneryRoad(g,biome,4);
  for(const kind of art.EXTRA_KINDS)art.finishScenerySprite(g,{kind,biome,variant:1});
 }
 assert.ok(canvasCalls.n>1000,'new art needs distinct pixel clusters, not empty images');
 const preview=fs.readFileSync(path.join(publicDir,'laboratorio-cenario-25d-v4.html'),'utf8');
 assert.ok(preview.includes('Cenário V4.2 — acabamento artesanal'));
});

test('three-way comparison leaves original V4 intact and toggles detailed art in renderer',async()=>{
 const v=await api(),art=await import('../public/world-scenery-v4-art.mjs');
 const extras=new Set(art.EXTRA_KINDS);
 for(let zone=0;zone<10;zone++)for(const biome of v.BIOMES){
   const old=v.planSceneryV4(zone,biome,{detail:false});
   const now=v.planSceneryV4(zone,biome,{detail:true});
   assert.ok(old.length>60&&now.length>60);
   assert.ok(old.every(x=>!extras.has(x.kind)),'V4 original should not include V4.2 landmarks');
   assert.deepEqual(old,v.planSceneryV4(zone,biome,{detail:false}));
   assert.deepEqual(now,v.planSceneryV4(zone,biome,{detail:true}));
 }
 const renderer=fs.readFileSync(path.join(publicDir,'world-25d.mjs'),'utf8');
 assert.ok(renderer.includes('setSceneryDetail(value)'));
 assert.ok(renderer.includes('buildSceneryV4(THREE,layer,zone,biome,{detail:useSceneryDetail,composition:useSceneryComposition,atlas:useSceneryAtlas,v7:useSceneryV7})'));
 const lab=fs.readFileSync(path.join(publicDir,'laboratorio-cenario-25d-v4.html'),'utf8');
 for(const mode of ['value="old"','value="v4"','value="v42"'])assert.ok(lab.includes(mode));
 assert.ok(lab.includes("view.setSceneryDetail(['v42','v5','atlas','v7'].includes(q.value))"));
 assert.ok(lab.includes("view.setSceneryV4(q.value!=='old')"));
});

// Also run precise anti-overlap and rendering-order regressions under Render's test command.
require('./scenery-25d-v4-overlap.test.js');

// Cohesive V5 authored-map and path checks run in the existing Render build stage.
require('./scenery-25d-v5.test.js');

// Test actual PNG atlas and fallback in the same Render build gate.
require('./scenery-25d-real-atlas.test.js');

// V7 safe asset-loading and manifest regression checks (run on Render too).
require('./scenery-25d-v7-assets.test.js');

// Original 20-tile V7 texture atlas, geographic clipping and exact binary validation.
require('./scenery-25d-v7-tiles.test.js');

// Verified original V7.2 PNGs and safe visual placement run in Render build gate.
require('./scenery-25d-v72-art.test.js');

// Official-map geometry remains the sole source of truth for the experimental integration.
require('./scenery-25d-v72-canonical.test.js');

// Updated real portal actor sprites for every live transition type.
require('./scenery-25d-v74-portals.test.js');

// V7.5 class preview and signed-in experimental-only dungeon test passes.
require('./appearance-v75-and-dungeon-keys.test.js');

// Ecologia: uma espécie por mapa, com um chefe da mesma espécie.
require('./region-monster-species.test.js');
// Actor pixel-quality combat and tree/monster occlusion regression coverage.
require('./combat-occlusion-v80.test.js');

// Inventário ilustrado V8.1 — dados reais, 35 espaços, atalhos e ações no servidor.
require('./inventory-v81.test.js');

// Prototipo de referencia V8.2: somente as fontes oficiais, sem trocar herois.
require('./sprite-fidelity-v82.test.js');

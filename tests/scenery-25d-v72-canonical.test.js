'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../public',p),'utf8');
test('canonical integration obtains actual existing game map and does not invent positions',async()=>{
 const art=read('art16.js'),mmo=read('mmo.js'),world=read('world-25d.mjs');
 assert.ok(art.includes('function mapSnapshot(zone,biomeCode)'));
 assert.ok(art.includes('canvas:region.canvas'));
 assert.ok(art.includes('objects:region.objects'));
 assert.ok(art.includes('paintProp:(dest,item)'));
 assert.ok(mmo.includes('classicRenderer.mapSnapshot(session.zone'));
 assert.ok(mmo.includes('world25d.setSceneryCanonical(true)'));
 assert.ok(world.includes('buildCanonicalScenery(THREE,layer,sourceMap,{v7:useSceneryV7})'));
 assert.ok(world.includes('sourceMap.canvas!==activeMapSource'));
 for(const token of ['session.portals','session.npcs','visibleKingdomBases','session.monsters'])
  assert.ok(mmo.includes(token),'unchanged gameplay actors '+token);
});
test('the canonical painter copies exact 1536x1024 world without extra overlay planes',async()=>{
 const mod=await import('../public/world-scenery-v72-canonical.mjs'),ops=[],props=[];
 const source={zone:2,biome:'river',canvas:{width:1536,height:1024},
  objects:[{kind:'tree',key:'arvore_1_tema_1',x:100,y:200,w:112,h:131},
   {kind:'prop',key:'poco',x:220,y:350,w:64,h:51},
   {kind:'biome-prop',x:470,y:800,w:62,h:72}],
  paintProp:(ctx,o)=>props.push(o)};
 const ctx={imageSmoothingEnabled:true,drawImage:(...args)=>ops.push(args)};
 const result=mod.copyCanonicalMap(source,{createCanvas:()=>({getContext:()=>ctx}),
  replacement:item=>item.key==='poco'?{naturalWidth:80,naturalHeight:124}:null});
 assert.equal(result.canvas.width,1536);
 assert.equal(result.canvas.height,1024);
 assert.equal(result.staticProps,3);
 assert.equal(result.improved,1);assert.equal(result.fallback,2);
 assert.equal(props[0],source.objects[0]);assert.equal(props[1],source.objects[2]);
 assert.equal(ops.length,2);
 assert.equal(ops[0][0],source.canvas,'same source terrain including road river and bridge');
 const sprite=ops[1];
 assert.equal(sprite[0].naturalHeight,124);
 assert.ok(Math.abs(sprite[1]+sprite[3]/2-220)<=0.5,'well stays centered at the SAME X');
 assert.equal(sprite[2]+sprite[4],350,'well bottom stays at original Y');
 assert.equal(ctx.imageSmoothingEnabled,false);
});
test('canonical V7.2 uses single ground mesh and original art fallback for unapproved symbols',async()=>{
 const mod=await import('../public/world-scenery-v72-canonical.mjs');
 assert.equal(mod.canonicalReplacement({kind:'prop',key:'portal_fechado',x:1,y:1,w:1,h:1}),null);
 assert.equal(mod.canonicalReplacement({kind:'prop',key:'tenda',x:1,y:1,w:1,h:1}),null);
 const src=read('world-scenery-v72-canonical.mjs');
 assert.ok(!src.includes('new THREE.InstancedMesh'));
 assert.ok(!src.includes('roadGeometry'));
 assert.ok(!src.includes('paintV72Bridge'));
 assert.ok(!src.includes('guild-scene-3d'));
 const ctx={drawImage(){},imageSmoothingEnabled:true};
 const source={zone:0,biome:'meadow',canvas:{width:1536,height:1024},objects:[],paintProp(){}};
 const meshes=[];
 const THREE={CanvasTexture:class{constructor(canvas){this.image=canvas}},SRGBColorSpace:1,NearestFilter:2,NearestMipmapNearestFilter:3,ClampToEdgeWrapping:4,PlaneGeometry:class{},MeshBasicMaterial:class{constructor(a){Object.assign(this,a)}},Mesh:class{constructor(g,m){this.geometry=g;this.material=m;this.rotation={};this.position={set(){}};}}};
 const old=global.document;global.document={createElement:()=>({getContext:()=>ctx})};
 try{
  const group={add:m=>meshes.push(m)};
  const stats=mod.buildCanonicalScenery(THREE,group,source,{v7:false});
  assert.equal(meshes.length,1);
  assert.equal(meshes[0].name,'scenery-v72-canonical-ground');
  assert.equal(stats.staticProps,0);
  assert.equal(stats.path,'exact-original-map-geography');
 }finally{global.document=old;}
});

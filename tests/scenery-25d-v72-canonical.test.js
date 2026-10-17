'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../public',p),'utf8');
const makeSource=(biome,objects)=>({
 zone:2,biome,canvas:{width:1536,height:1024},objects,
 tileKind:(x,y)=>biome==='river'&&x>=10&&x<14?'water':y>14&&y<18?'path':'grass',
 roadAt:()=>496,paintProp(){throw Error('Legacy art must never be called in V7.3')}
});
function atlasMock(){
 return {width:160,height:128};
}
function context(){
 const ops=[],ctx={imageSmoothingEnabled:true,fillStyle:'',drawImage(...x){ops.push(['image',...x])},
 fillRect(...x){ops.push(['rect',...x])},
 beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},rect(){},clip(){},save(){},restore(){},getImageData(){return {data:[40,90,50,255]}}};
 return {ctx,ops};
}
test('canonical source gives V7.3 original tile classes and original object coordinates',()=>{
 const art=read('art16.js'),world=read('world-25d.mjs'),mmo=read('mmo.js');
 for(const token of ['tileKind:(tx,ty)=>kind(tx,ty,zone,biome)','objects:region.objects','roadAt:(x)=>pathY(x,zone)'])
  assert.ok(art.includes(token));
 assert.ok(world.includes('buildCanonicalScenery(THREE,layer,sourceMap,{v7:useSceneryV7})'));
 assert.ok(mmo.includes('classicRenderer.mapSnapshot(session.zone'));
 assert.ok(mmo.includes('world25d.setSceneryCanonical(true)'));
 assert.ok(mmo.includes('preloadV7Terrain()'));
 assert.ok(!world.includes('guild-scene-3d'));
});
test('V7.3 terrain tiles retexture every original 32px tile, preserving real category and river crossing',async()=>{
 const m=await import('../public/world-scenery-v72-canonical.mjs');
 for(const biome of ['meadow','forest','river','desert','mountain','ruins','swamp','coast','city','dungeon']){
  const {ctx,ops}=context();
  const src=makeSource(biome,[]);
  assert.equal(m.paintOfficialV73Terrain(ctx,src,atlasMock()),true);
  const draws=ops.filter(o=>o[0]==='image');
  assert.ok(draws.length>=1536,biome+' covers every original tile');
  assert.deepEqual(draws[0].slice(-4),[0,0,32,32]);
  assert.equal(m.canonicalTileId('water',biome,0,0,2).startsWith('agua'),true);
  assert.equal(m.canonicalTileId('path',biome,0,0,2).startsWith('pedra')||m.canonicalTileId('path',biome,0,0,2).startsWith('terra'),true);
 }
});
test('V7.3 has no residual old objects in strict mode across every biome',async()=>{
 const m=await import('../public/world-scenery-v72-canonical.mjs');
 const artist=await import('../public/world-scenery-v73-artist.mjs');
 const objects=[
  {kind:'tree',key:'arvore_1_tema_2',x:150,y:200,w:112,h:131},
  {kind:'bush',key:'arbusto_2',x:250,y:360,w:49,h:39},
  {kind:'rock',key:'pedra',x:350,y:600,w:39,h:30},
  {kind:'biome-prop',x:600,y:900,w:62,h:72},
  {kind:'prop',key:'poco',x:700,y:380,w:64,h:51},
  {kind:'prop',key:'tenda',x:780,y:260,w:93,h:74},
  {kind:'prop',key:'estandarte',x:900,y:300,w:63,h:71},
  {kind:'prop',key:'fogueira',x:1010,y:450,w:44,h:54},
  {kind:'dungeon-prop',x:1150,y:500,w:62,h:72}
 ];
 const orig=global.document;global.document={createElement:()=>({width:0,height:0,getContext:()=>context().ctx})};
 try{
  for(const biome of ['meadow','forest','river','desert','mountain','ruins','swamp','coast','city','dungeon']){
   const src=makeSource(biome,objects);
   const output=m.copyCanonicalMap(src,{atlas:atlasMock(),requireLatest:true,replacement:item=>m.canonicalReplacement(item,{biome})});
   assert.ok(output,'all 10 biomes have valid nonlegacy sprites');
   assert.equal(output.fallback,0);
   assert.equal(output.improved,objects.length);
   assert.equal(output.tiles,1536);
  }
 }finally{global.document=orig;}
 for(const key of ['tenda','estandarte','fogueira','poco']){
  assert.ok(artist.modernPropFamily({kind:'prop',key},'city'));
 }
});
test('failure to verify latest assets prevents silent return of old art',async()=>{
 const m=await import('../public/world-scenery-v72-canonical.mjs');
 const src=makeSource('meadow',[]);
 assert.equal(m.copyCanonicalMap(src,{atlas:null,requireLatest:true}),null);
 const {ctx}=context(),canvas={getContext:()=>ctx};
 const baseline=m.copyCanonicalMap(src,{createCanvas:()=>canvas,atlas:null,mode:'original',replacement:()=>null});
 assert.equal(baseline.fallback,0);
 assert.equal(baseline.modernTerrain,false);
 const renderer=read('world-scenery-v72-canonical.mjs');
 assert.ok(renderer.includes('if(requireLatest)return null'));
 assert.ok(!renderer.includes('source.paintProp(ctx,item);fallback++;}\n if(requireLatest)'));
 const base=read('world-25d.mjs');
 assert.ok(base.includes('setSceneryCanonical'));
});

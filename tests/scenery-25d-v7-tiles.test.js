'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const pub=path.resolve(__dirname,'../public');
const jpg=(f)=>fs.readFileSync(path.join(pub,f));
let tileMod,terrainMod;
async function modules(){
 tileMod ||=await import('../public/world-scenery-v7-terrain.mjs');
 terrainMod ||=await import('../public/world-scenery-v5-landforms.mjs');
 return [tileMod,terrainMod];
}
test('V7 20 authentic terrain tiles are complete, SHA-stable and fully opaque',async()=>{
 const [v7]=await modules();
 const file=jpg('assets/scenery-v7/tiles/terrain-atlas-v7.png');
 const manifest=JSON.parse(jpg('assets/scenery-v7/tiles/manifest.json'));
 assert.equal(manifest.version,'v7-terrain-atlas-1');
 assert.equal(manifest.approved,true);
 assert.equal(manifest.tile_size,32);
 assert.equal(manifest.columns,5);assert.equal(manifest.rows,4);
 assert.equal(manifest.pixel_mode,'RGB');
 assert.equal(file.byteLength,49516);
 assert.ok(file.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'valid PNG');
 assert.equal(file.readUInt32BE(16),160);assert.equal(file.readUInt32BE(20),128);
 assert.equal(file[25],2,'lossless opaque RGB removes residual alpha seams');
 assert.equal(crypto.createHash('sha256').update(file).digest('hex'),manifest.sha256);
 assert.equal(manifest.sha256,'f5a73d8100eed39ebe5df949bd8d55725b26dfa156d1c2fa10ca08281577cb7a');
 assert.deepEqual(manifest.tiles,Array.from((await import('../public/world-scenery-v7-asset-loader.mjs')).V7_TILES));
 for(let i=0;i<manifest.tiles.length;i++){
  const r=v7.v7TileRect(manifest.tiles[i]);assert.deepEqual(r,{sx:(i%5)*32,sy:Math.floor(i/5)*32,w:32,h:32});
 }
 assert.equal(v7.v7TileRect('missing'),null);
});
test('V7 tiles are semantically composed in all 10 biomes and bounded without overlap planes',async()=>{
 const [v7,terrain]=await modules();
 const biomes=['meadow','forest','river','desert','mountain','ruins','swamp','coast','city','dungeon'];
 const mockCtx=()=>({
  smoothing:true,tiles:[],clipCount:0,saveCount:0,restoreCount:0,
  drawImage(atlas,sx,sy,sw,sh,x,y,w,h){
   assert.equal(atlas,'atlas');assert.ok(sx>=0&&sx+sw<=160&&sy>=0&&sy+sh<=128);
   assert.deepEqual([sw,sh,w,h],[32,32,32,32]);
   assert.ok(x>=0&&x<768&&y>=0&&y<512);this.tiles.push([sx,sy,x,y]);
  },
  save(){this.saveCount++},restore(){this.restoreCount++},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){this.clipCount++}
 });
 for(let zone=0;zone<4;zone++)for(const biome of biomes){
  const ctx=mockCtx();
  assert.equal(v7.paintV7BaseTiles(ctx,'atlas',zone,biome),true);
  assert.equal(ctx.tiles.length,24*16,'full 768x512 32px original tile coverage');
  const first=JSON.stringify(ctx.tiles);
  ctx.tiles=[];
  assert.equal(v7.paintV7BaseTiles(ctx,'atlas',zone,biome),true);
  assert.equal(JSON.stringify(ctx.tiles),first,'composition deterministic for saved world');
  ctx.tiles=[];
  assert.ok(v7.paintV7Road(ctx,'atlas',zone,biome,(x,z)=>terrain.roadY?.(x*2,z)/2||248));
  assert.equal(ctx.clipCount,1);assert.equal(ctx.saveCount,ctx.restoreCount,'clip isolated from other layers');
  if(biome==='river')assert.ok(v7.paintV7River(ctx,'atlas',zone));
  if(biome==='coast')assert.ok(v7.paintV7Coast(ctx,'atlas',zone));
  assert.equal(ctx.saveCount,ctx.restoreCount);
 }
 assert.equal(v7.paintV7BaseTiles(mockCtx(),null,0,'meadow'),false);
 assert.equal(v7.paintV7BaseTiles(mockCtx(),'atlas',0,'invalid'),false);
});
test('V7 loader requires explicit same-origin 20-tile manifest and native dimensions',async()=>{
 const [v7]=await modules();
 assert.equal(v7.v7TerrainReady(),false);
 const attempts=[];
 class MockImage{
  constructor(){this.handlers={};this.naturalWidth=160;this.naturalHeight=128;}
  addEventListener(k,cb){this.handlers[k]=cb;}
  set src(s){attempts.push(s);queueMicrotask(()=>this.handlers.load());}
 }
 const m=JSON.parse(jpg('assets/scenery-v7/tiles/manifest.json'));
 const bad=await v7.preloadV7Terrain({fetcher:async()=>({ok:true,json:async()=>({...m,tiles:m.tiles.slice(1)})}),ImageClass:MockImage});
 assert.equal(bad,false);assert.equal(attempts.length,0,'no request on invalid manifest');
 const good=await v7.preloadV7Terrain({fetcher:async url=>{
  assert.equal(url,'/assets/scenery-v7/tiles/manifest.json');
  return {ok:true,json:async()=>m};
 },ImageClass:MockImage});
 assert.equal(good,true);assert.equal(v7.v7TerrainReady(),true);
 assert.equal(attempts[0],'/assets/scenery-v7/tiles/terrain-atlas-v7.png');
 assert.equal(v7.v7TerrainStatus().tiles,20);
});
test('V7 terrain painter preserves V5 roads, cliffs, shore and fallback',async()=>{
 const [v7]=await modules();
 const src=jpg('world-scenery-v5-landforms.mjs').toString();
 const world=jpg('world-25d.mjs').toString();
 const renderer=jpg('world-scenery-v4.mjs').toString();
 assert.ok(src.includes('if(v7Atlas)paintV7River'));
 assert.ok(src.includes('if(v7Atlas)paintV7Coast'));
 assert.ok(src.includes('if(v7Atlas)paintV7Road'));
 assert.ok(src.includes('paintCliff(g,zone,biome)'));
 assert.ok(src.includes('paintGardens(g,zone,biome)'));
 assert.ok(src.includes('else{')&&src.includes('for(let y=0;y<MAP_H;y+=TILE)'),'procedural V5 remains fallback');
 assert.ok(renderer.includes('useV7Terrain?v7TerrainImage():null'));
 assert.ok(renderer.includes('terrainTiles:useV7Terrain?20:0'));
 assert.ok(world.includes('preloadV7Terrain().then'));
 assert.ok(world.includes('get v7TerrainReady()'));
 assert.ok(!src.includes('guild-scene-3d')&&!world.includes('guild-scene-3d'));
});


test('V7 20-tile visual laboratory imports only actual exported browser symbols',async()=>{
 const [v7]=await modules();
 const page=jpg('laboratorio-terreno-v7.html').toString();
 const imported=page.match(/import\\s*\\{([^}]+)\\}\\s*from\\s*['"]\\/world-scenery-v7-terrain\\.mjs['"]/);
 assert.ok(imported,'visual laboratory must import real atlas module');
 for(const raw of imported[1].split(',')){
  const symbol=raw.trim();
  assert.ok(Object.hasOwn(v7,symbol),'nonexistent ES module export: '+symbol);
 }
 assert.ok(page.includes('v7TileRect(id)'),'20 tiles must have a working rectangle lookup');
 assert.ok(page.includes('drawDesignedTerrainCanvas(zone,biome,{v7Atlas:useAtlas?atlas:null})'),'compare exactly same zone and biome before and after');
 assert.ok(page.includes('ctx.drawImage(atlas,r.sx,r.sy,32,32,0,0,128,128)'),'gallery uses actual 32px tiles, no stock image');
});

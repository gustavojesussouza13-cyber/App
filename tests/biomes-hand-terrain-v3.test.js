'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const HAND=require('../public/pixel-atelier-v1');
const LAND=require('../public/landscape16');
const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
function surface(){
 const ops=[],g={fillStyle:'#fff',fillRect(x,y,w,h){
  assert.ok([x,y,w,h].every(Number.isInteger),'native pixel alignment');
  assert.ok(w>0&&h>0,'positive pixel clusters');
  ops.push([this.fillStyle,x,y,w,h]);
 }};
 return {g,ops};
}
test('all nine biomes get separate pixel-by-pixel handcrafted terrain motifs',()=>{
 assert.equal(HAND.VERSION,'handpixels64-v3');
 const biomes=Object.keys(LAND.PALETTES);
 assert.equal(biomes.length,9);
 const patterns=new Set(),renders=new Set();
 for(const biome of biomes){
  const motif=HAND.GLYPHS['biome_'+biome];
  assert.ok(Array.isArray(motif)&&motif.length>=6,biome+' missing motif');
  assert.ok(motif.every(row=>/^[.1234]+$/.test(row)),biome+' invalid mask');
  patterns.add(motif.join(''));
  const s=surface(),n=HAND.terrain(s.g,{x:0,y:0,kind:'grass',biome,seed:211});
  assert.ok(n>=45,biome+' too few handcrafted pixels');
  assert.ok(s.ops.every(op=>op[3]===1&&op[4]===1));
  assert.ok(s.ops.every(op=>op[1]>=0&&op[1]<32&&op[2]>=0&&op[2]<32),
   biome+' art escaped 32x32 tile');
  renders.add(JSON.stringify(s.ops));
 }
 assert.equal(patterns.size,9);
 assert.equal(renders.size,9,'unique worlds must not be recolors');
});
test('water, rock, paths, sand and paving have distinct 1x1 materials',()=>{
 const patterns=new Set();
 for(const kind of ['water','rock','path','sand','paving']){
  const motif=HAND.GLYPHS['surface_'+kind];
  assert.ok(Array.isArray(motif)&&motif.length>=5);
  patterns.add(motif.join(''));
  const s=surface();
  assert.ok(HAND.terrain(s.g,{x:0,y:0,biome:'coast',kind,seed:42})>=30);
  assert.ok(s.ops.every(x=>x[3]===1&&x[4]===1));
 }
 assert.equal(patterns.size,5);
});
test('landscape integration uses cached integer tile art without modifying 3D fortress',()=>{
 for(const biome of Object.keys(LAND.PALETTES)){
  const s=surface();
  LAND.terrainTile(s.g,0,0,3,biome,'grass');
  assert.ok(s.ops.length>85,biome+' blank terrain');
  const glyphPaint=s.ops.filter(x=>x[3]===1&&x[4]===1);
  assert.ok(glyphPaint.length>=45,biome+' missing individual terrain pixels');
 }
 assert.match(html,/pixel-atelier-v1\.js\?v=handpixels64-v3/);
 assert.match(html,/landscape16\.js\?v=world-landscape-v3/);
 assert.match(html,/guild-city-3d\.js/);
 const atelierSource=fs.readFileSync(path.join(__dirname,'../public/pixel-atelier-v1.js'),'utf8');
 assert.doesNotMatch(atelierSource,/requestAnimationFrame|setInterval|localStorage|fetch\(|WebSocket/);
});

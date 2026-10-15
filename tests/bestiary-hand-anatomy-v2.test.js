'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const HAND=require('../public/pixel-atelier-v1');
const WORLD=require('../public/world-art-master64');
const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
function sheet(){
 const ops=[],g={fillStyle:'#fff',save(){},restore(){},translate(){},scale(){},
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'pixel coordinates must be integers');
   assert.ok(w>0&&h>0,'no empty pixels');
   ops.push([this.fillStyle,x,y,w,h]);
  }};
 return {g,ops};
}
test('15 species have handcrafted unique 1px anatomy motifs, not color swaps',()=>{
 assert.equal(HAND.VERSION,'handpixels64-v2');
 assert.equal(HAND.FAMILIES.length,15);
 const signatures=new Set();
 for(const type of HAND.FAMILIES){
  const glyph='anatomy_'+type,rows=HAND.GLYPHS[glyph];
  assert.ok(Array.isArray(rows)&&rows.length>=7,type+' missing detailed shape');
  assert.ok(rows.some(row=>row.includes('.')),type+' has no transparent silhouette');
  assert.ok(rows.every(row=>/^[.1234]+$/.test(row)),type+' has invalid pixels');
  signatures.add(rows.join('/'));
  const s=sheet(),n=HAND.PAINT(s.g,glyph,22,34,'stone');
  assert.ok(n>=40,type+' has fewer than 40 anatomical pixels');
  assert.ok(s.ops.every(o=>o[3]===1&&o[4]===1),type+' painted a rectangle');
 }
 assert.equal(signatures.size,15,'creature families must not reuse a mask');
});
test('boss kings, spiders, golems and dragons have individual glyphs',()=>{
 const names=['boss_bone','boss_spider','boss_rune','boss_dragon'];
 const signs=names.map(name=>HAND.GLYPHS[name].join('/'));
 assert.equal(new Set(signs).size,names.length);
 for(const type of ['esqueleto','aranha','golem','dragao']){
  const regular=sheet(),boss=sheet();
  HAND.creature(regular.g,{type,boss:false,action:'attack',frame:2,species:5});
  HAND.creature(boss.g,{type,boss:true,action:'attack',frame:2,species:5});
  assert.ok(boss.ops.length>regular.ops.length+15,type+' has no distinct boss anatomy');
  assert.notDeepEqual(boss.ops,regular.ops);
 }
});
test('species variants move anatomy details consistently and all world monsters render',()=>{
 for(const type of HAND.FAMILIES){
  const a=sheet(),b=sheet(),final=sheet();
  HAND.creature(a.g,{type,species:0,action:'walk',frame:2});
  HAND.creature(b.g,{type,species:2,action:'walk',frame:2});
  assert.notDeepEqual(a.ops,b.ops,type+' ignores persistent species');
  assert.equal(WORLD.creature(final.g,{type,dir:2,action:'attack',frame:2,boss:true,zone:5,species:2}),true);
  assert.ok(final.ops.some(o=>o[3]===1&&o[4]===1),type+' lost handcrafted pixels');
  assert.ok(final.ops.length>150,type+' no longer displays anatomy');
 }
});
test('mobile and desktop load new bestiary revision before world master; fortress is unchanged',()=>{
 assert.match(html,/pixel-atelier-v1\.js\?v=handpixels64-v2/);
 assert.ok(html.indexOf('/pixel-atelier-v1.js')<html.indexOf('/world-art-master64.js'));
 assert.match(html,/guild-city-3d\.js/);
 const sandbox={};vm.createContext(sandbox);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/pixel-atelier-v1.js'),'utf8'),sandbox);
 assert.equal(sandbox.OsPeregrinosHandPixels.VERSION,HAND.VERSION);
 const code=fs.readFileSync(path.join(__dirname,'../public/pixel-atelier-v1.js'),'utf8');
 assert.doesNotMatch(code,/requestAnimationFrame|setInterval|localStorage|fetch\(|WebSocket/);
});

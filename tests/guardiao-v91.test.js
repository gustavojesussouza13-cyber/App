'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const {decode}=require('../scripts/png-rgba-v84');
const newHero=require('../public/guardiao-v91.js');
const src=p=>fs.readFileSync(path.join(root,'public',p),'utf8');

test('V9.1 approved walking: 8 unique transparent frames in all 4 directions, no cell cropping',()=>{
 const p=path.join(root,'public/assets/guardiao-v91/guardiao-walk-4x8-v91.png');
 const png=decode(fs.readFileSync(p));
 assert.deepEqual([png.width,png.height],[2048,640]);
 assert.equal(newHero.WALK_FRAMES,8);assert.equal(newHero.DIRECTIONS,4);
 for(let dir=0;dir<4;dir++){
  const signatures=new Set();
  for(let n=0;n<8;n++){
   const pixels=[];let visible=0;
   for(let y=0;y<160;y++)for(let x=0;x<256;x++){
    const i=((dir*160+y)*png.width+n*256+x)*4;
    if(png.rgba[i+3])visible++;
    pixels.push(png.rgba[i],png.rgba[i+1],png.rgba[i+2],png.rgba[i+3]);
   }
   assert.ok(visible>450,'empty/partial character at '+dir+'/'+n);
   signatures.add(crypto.createHash('sha256').update(Uint8Array.from(pixels)).digest('hex'));
  }
  assert.equal(signatures.size,8,'8 DISTINCT walking poses required for direction '+dir);
 }
});

test('V9.1 palette edits ONLY original painted pixels: red, green, purple; metal remains unchanged',()=>{
 const source={width:4,height:1,data:new Uint8ClampedArray([
  27,62,150,255, // navy blue cloth
  151,170,182,255, // silver plate
  219,176,76,255, // golden shield trim
  0,0,0,0 // background
 ])};
 for(const outfit of ['vinho','vermelho','floresta','violeta']){
  const copy={...source,data:new Uint8ClampedArray(source.data)};
  newHero.tint(copy,{outfit},2);
  assert.notDeepEqual([...copy.data.slice(0,3)],[27,62,150],outfit+' never recolored cloth');
  assert.deepEqual([...copy.data.slice(4,8)],[151,170,182,255],outfit+' altered steel');
  assert.deepEqual([...copy.data.slice(8,12)],[219,176,76,255],outfit+' altered golden border');
  assert.deepEqual([...copy.data.slice(12,16)],[0,0,0,0],outfit+' altered transparency');
 }
 assert.equal(newHero.phase(0,0),0);assert.equal(newHero.phase(9,0),1);
 assert.equal(newHero.normalizeDir(-1),3);
});

test('V9.1 is used inside both live game and character appearance editor',()=>{
 const game=src('art16.js'),html=src('mundo.html'),creator=src('appearance-class-preview-v75.js');
 assert.match(game,/OsPeregrinosGuardiaoV91\?\.draw/);
 assert.match(html,/guardiao-v91\.js\?v=/);
 assert.match(creator,/OsPeregrinosGuardiaoV91/);
 const lab=src('laboratorio-guardiao-v90.html');
 assert.match(lab,/guardiaoOutfit/);
 assert.match(lab,/OsPeregrinosGuardiaoV91/);
});
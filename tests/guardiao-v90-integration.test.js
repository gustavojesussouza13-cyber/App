'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const publicDir=path.join(ROOT,'public');
const imagePath=path.join(publicDir,'assets/guardiao-v90/guardiao-v90-31frames.png');
const {decode}=require('../scripts/png-rgba-v84');
const guardiao=require('../public/guardiao-v90.js');
const read=file=>fs.readFileSync(path.join(publicDir,file),'utf8');

test('V90 real approved Guardian sheet has transparent 31 fixed 256x160 frames',()=>{
 const original=fs.readFileSync(imagePath);
 assert.deepEqual([...original.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 const png=decode(original);
 assert.deepEqual([png.width,png.height],[5*256,7*160]);
 assert.ok(png.rgba.some((v,i)=>i%4===3&&v===0),'transparency');
 assert.ok(png.rgba.some((v,i)=>i%4===3&&v>0),'visible art');
 assert.equal(guardiao.COUNT,31);
 assert.deepEqual(Object.fromEntries(Object.entries(guardiao.FRAMES).map(([k,v])=>[k,v.length])),
   {idle:4,walk:6,attack:6,skill:6,hurt:4,death:5});
 for(let idx=0;idx<31;idx++){
  let visible=0;
  const x0=(idx%5)*256,y0=Math.floor(idx/5)*160;
  for(let y=0;y<160;y+=3)for(let x=0;x<256;x+=3){
   if(png.rgba[((y0+y)*png.width+x0+x)*4+3])visible++;
  }
  assert.ok(visible>55,`frame ${idx} must have a real visible character`);
 }
});
test('V90 render has stable anchor and distinct attack/skill/hurt/death frames',()=>{
 assert.equal(guardiao.WIDTH,256);assert.equal(guardiao.HEIGHT,160);
 for(const action of ['attack','skill','hurt','death']){
  const a=guardiao.frameIndex({action,elapsed:0});
  const b=guardiao.frameIndex({action,elapsed:200});
  assert.notEqual(a,b,`${action} should animate different source frames`);
 }
 assert.equal(guardiao.frameIndex({action:'idle',dir:0}),3);
 assert.equal(guardiao.frameIndex({action:'walk',dir:0}),9);
 const src=read('art16.js');
 assert.match(src,/OsPeregrinosGuardiaoV90\?\.draw/);
 assert.match(src,/detailedGuardiao\|\|newPeregrinoHero/);
 const html=read('mundo.html');
 assert.match(html,/guardiao-v90\.js\?v=/);
 const lab=read('laboratorio-guardiao-v90.html');
 assert.match(lab,/OsPeregrinosGuardiaoV90/);
 assert.match(lab,/data-action="death"/);
});
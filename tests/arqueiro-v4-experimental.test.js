'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {decode}=require('../scripts/png-rgba-v84');
const root=path.resolve(__dirname,'..');
const archer=require('../public/arqueiro-v4-experimental.js');
const read=p=>fs.readFileSync(path.join(root,'public',p),'utf8');
function loadAsset(name){const file=path.join(root,'public/assets/arqueiro-v4',name);return decode(fs.readFileSync(file));}
test('Arqueiro experimental preserves all 32 UNIQUE extracted pixel cells in two RGBA PNG sheets',()=>{
 const marks=[];
 for(const name of ['arqueiro-v4-acoes-4x4.png','arqueiro-v4-caminhada-4x4.png']){
  const {width,height,rgba}=loadAsset(name);
  assert.deepEqual([width,height],[1024,640]);
  for(let k=0;k<16;k++){
   const bytes=new Uint8Array(256*160*4);let seen=0;
   const cx=k%4,cy=Math.floor(k/4);
   for(let y=0;y<160;y++)for(let x=0;x<256;x++){
    const j=(y*256+x)*4,src=((cy*160+y)*1024+cx*256+x)*4;
    for(let a=0;a<4;a++)bytes[j+a]=rgba[src+a];
    if(bytes[j+3])seen++;
   }
   assert.ok(seen>750,'blank character: '+name+':'+k);
   marks.push(crypto.createHash('sha256').update(bytes).digest('hex'));
  }
 }
 assert.equal(new Set(marks).size,32,'no duplicated or stationary sprite cells');
});
test('Arqueiro maps all front/back walk frames and keeps each other state represented',()=>{
 for(let i=0;i<8;i++){
  assert.deepEqual(archer.plan({dir:0,action:'walk',frame:i}),{sheet:'walk',index:i,flip:false});
  assert.deepEqual(archer.plan({dir:2,action:'walk',frame:i}),{sheet:'walk',index:i+8,flip:false});
  assert.equal(archer.plan({dir:3,action:'walk',frame:i}).flip,true);
 }
 const registered=new Set();
 for(const action of ['idle','walk','attack','skill','hurt','death','recover']){
  for(const dir of [0,1,2,3])for(let f=0;f<9;f++)for(let ms=0;ms<750;ms+=85){
   const x=archer.plan({dir,action,frame:f,elapsed:ms,now:f*117});
   if(x.sheet==='action')registered.add(x.index);
  }
 }
 for(let i=0;i<16;i++)assert.ok(registered.has(i),'unused authored action cell '+i);
});
test('Arqueiro never overlays previous 3x2 class atlas; only experimental branch loads new scripts',()=>{
 const game=read('art16.js'),html=read('mundo.html'),lab=read('laboratorio-arqueiro-v4.html');
 assert.match(game,/const newArcherHero=/);
 assert.match(game,/!newArcherHero&&/);
 assert.match(game,/newArcherHero\|\|/);
 assert.match(html,/arqueiro-v4-experimental\.js/);
 assert.match(lab,/Arqueiro V4/);
});
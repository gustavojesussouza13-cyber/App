'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const atlas = fs.readFileSync(path.join(root,'public/assets/guardiao-v93/guardiao-front-back-walk-4x4-256x160.png'));
const { decode } = require('../scripts/png-rgba-v84');
const guardiao = require('../public/guardiao-v91.js');
const code = fs.readFileSync(path.join(root,'public/guardiao-v91.js'),'utf8');
const html = fs.readFileSync(path.join(root,'public/mundo.html'),'utf8');
test('Guardiao V9.3 uses 16 original transparent frames without changing cells',()=>{
 assert.deepEqual([...atlas.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 const png = decode(atlas);
 assert.deepEqual([png.width,png.height],[1024,640]);
 for(let row=0;row<4;row++){
  const signatures=new Set();
  for(let col=0;col<4;col++){
   let visible=0;
   const parts=[];
   for(let y=0;y<160;y++)for(let x=0;x<256;x++){
    const idx=((row*160+y)*png.width+col*256+x)*4;
    if(png.rgba[idx+3])visible++;
    parts.push(png.rgba[idx],png.rgba[idx+1],png.rgba[idx+2],png.rgba[idx+3]);
   }
   assert.ok(visible>1300, 'missing frame '+row+':'+col);
   signatures.add(crypto.createHash('sha256').update(Uint8Array.from(parts)).digest('hex'));
  }
  assert.equal(signatures.size,4,'each frame must be visually different');
 }
});
test('Guardiao V9.3 uses eight front and eight rear frames, keeps side and combat source',()=>{
 assert.match(code,/d===0\|\|d===2/);
 assert.match(code,/const row=\(d===0\?0:2\)\+Math\.floor\(p\/4\)/);
 assert.match(code,/else if\(action==='walk'&&walkImage\)/);
 assert.match(code,/prior\?\.draw/);
 assert.match(code,/frameCache\.clear\(\)/);
 assert.match(html,/guardian-front-back-approved-v93-20261021/);
 assert.equal(guardiao.phase(0,0),0);
 assert.equal(guardiao.phase(7,0),7);
 assert.equal(guardiao.phase(8,0),0);
 assert.equal(guardiao.WALK_FRAMES,8);
});

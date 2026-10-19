'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const page=fs.readFileSync(path.join(ROOT,'public/laboratorio-guardiao-v90.html'),'utf8');
const renderer=require('../public/approved-classes25d.js');
const combat=require('../public/combat-poses-v83.js');
const file=path.join(ROOT,'public/assets/approved-classes/guardiao-sprites-3x2-64x80.png');

test('Guardiao stage reads real PNG 3 by 2 frames without changing scale',()=>{
 assert.ok(fs.existsSync(file));
 const png=fs.readFileSync(file);
 assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 assert.equal(png.readUInt32BE(16),192);
 assert.equal(png.readUInt32BE(20),160);
 assert.equal(renderer.FW,64);
 assert.equal(renderer.FH,80);
 assert.deepEqual([renderer.frameRect(2,false).sx,renderer.frameRect(2,true).sy],[0,80]);
 assert.equal(renderer.frameRect(3,false).flip,true);
});
test('isolated technical lab keeps unsupported animations explicitly pending',()=>{
 assert.match(page,/Guardião · laboratório técnico/);
 for(const src of ['approved-classes25d.js','combat-poses-v83.js','appearance-sprite-v76.js'])
  assert.ok(page.includes('/'+src),src);
 for(const text of ['Morte · pendente','Preparação · pendente','Recuperação · pendente'])
  assert.ok(page.includes(text));
 assert.match(page,/não.*spritesheet final redesenhada/);
 assert.match(page,/width="128" height="160"/);
 assert.match(page,/requestAnimationFrame/);
 assert.match(page,/Não foi possível carregar PNG/);
 assert.equal(combat.W,128);
 assert.equal(combat.H,160);
});

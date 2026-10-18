'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../public/laboratorio-fidelidade-sprites-v82.html'),'utf8');
test('V8.2 fidelity lab loads EXACT in-game source assets, never generative replacements',()=>{
 for(const p of ['/assets/peregrino/peregrino-runway-walk.png','/assets/approved-classes/guardiao-sprites-3x2-64x80.png',
 '/assets/approved-classes/arqueiro-sprites-3x2-64x80.png','/assets/approved-classes/curandeiro-sprites-3x2-64x80.png']){
  assert.ok(html.includes(p));
 }
 assert.ok(html.includes('const body=sourceCanvas(role,dir,phase)'));
 assert.ok(html.includes('if(!showEffects)return body')); assert.ok(html.includes('OsPeregrinosCombatPosesV83?.render'));
 assert.ok(html.includes('canvas.toDataURL'));
 assert.ok(html.includes('Não é uma nova interpretação do personagem'));
 assert.ok(html.includes('protótipo artístico para revisão'));
});
test('V8.2 source pixels are drawn with no interpolation, fixed technical frame dimensions',()=>{
 assert.ok(html.includes('w:128,h:160,cols:4'));
 assert.equal((html.match(/w:64,h:80,cols:3/g)||[]).length,3);
 assert.ok(html.includes('ctx.imageSmoothingEnabled=false'));
 assert.ok(html.includes('c.width=w*6;c.height=h*4'));
 assert.ok(html.includes('r.flip'));
 assert.ok(html.includes("role==='peregrino'?4:2"));
 assert.ok(html.includes("const dirPairs=[[0,1],[2,3]]"));
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const art=require('../public/full-body-poses-v84.js');
const lab=fs.readFileSync(path.resolve(__dirname,'../public/laboratorio-sprites-completos-v84.html'),'utf8');
test('V8.4 body pose drives HEAD, TORSO, CAPE, ARMS AND BOTH LEGS from approved pixels',()=>{
 assert.equal(art.PARTS.length,7);
 assert.deepEqual(art.PARTS,['cape','rear-leg','front-leg','torso','left-arm','right-arm','head']);
 for(const role of ['peregrino','guardiao','arqueiro','curandeiro']){
  const points=[[64,25,'head'],[64,85,'torso'],[26,97,'cape'],[27,76,'left-arm'],[100,77,'right-arm'],[45,146,'rear-leg'],[83,146,'front-leg']];
  for(const [x,y] of points){
   const a=art.displacement(x,y,{role,dir:1,action:'attack',phase:0});
   const b=art.displacement(x,y,{role,dir:1,action:'attack',phase:1});
   assert.notDeepEqual([a.dx,a.dy],[b.dx,b.dy],role+' '+a.part+' must physically move');
  }
  const phases=[0,1,2].map(phase=>art.frame('attack',phase));
  assert.equal(new Set(phases.map(x=>JSON.stringify(x))).size,3);
 }
});
test('V8.4 copies ORIGINAL RGBA values pixel-for-pixel while reposing complete body',()=>{
 const w=128,h=160,src=new Uint8ClampedArray(w*h*4);
 const locations=[
  [64,23,241,133,54,'head'],[64,80,71,189,116,'torso'],
  [26,97,56,103,206,'cape'],[23,79,132,145,244,'left arm'],
  [104,80,245,201,92,'right arm'],[43,146,178,64,32,'left foot'],[84,148,41,77,139,'right foot']
 ];
 for(const [x,y,r,g,b] of locations)src.set([r,g,b,255],(y*w+x)*4);
 const body0=art.pixelPose(src,w,h,{role:'peregrino',dir:1,action:'attack',phase:0});
 const body1=art.pixelPose(src,w,h,{role:'peregrino',dir:1,action:'attack',phase:1});
 assert.notDeepEqual(Array.from(body0),Array.from(body1));
 for(const out of [body0,body1]){
  for(const [x,y,r,g,b] of locations){
   let found=false;
   for(let i=0;i<out.length;i+=4)if(out[i]===r&&out[i+1]===g&&out[i+2]===b&&out[i+3]===255){found=true;break;}
   assert.ok(found,'source RGBA color still present, unblurred: '+x+','+y);
  }
 }
});
test('V8.4 review page always uses original game atlas and exports strict 6x4 full-body PNG',()=>{
 for(const uri of ['/assets/peregrino/peregrino-runway-walk.png',
 '/assets/approved-classes/guardiao-sprites-3x2-64x80.png',
 '/assets/approved-classes/arqueiro-sprites-3x2-64x80.png',
 '/assets/approved-classes/curandeiro-sprites-3x2-64x80.png'])assert.ok(lab.includes(uri));
 assert.ok(lab.includes('OsPeregrinosFullBodyV84?.render'));
 assert.ok(lab.includes('corpo-inteiro-revisao-v84'));
 assert.ok(lab.includes('Não é uma nova interpretação do personagem')===false);
 assert.ok(lab.includes('Somente laboratório de arte'));
 assert.ok(lab.includes('ctx.imageSmoothingEnabled=false'));
 assert.equal(art.W,128);assert.equal(art.H,160);
 assert.ok(art.spritesheet.toString().includes('cellW*6'));
 assert.ok(art.spritesheet.toString().includes('cellH*4'));
});

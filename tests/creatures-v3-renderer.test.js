'use strict';
// V3 validation in repository: mocked sprites, independent of whether PNGs were uploaded.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../public/creatures-v3.js');
function harness(desktop=true) {
 const images=[],ops=[];
 class MockImage {
  constructor(){this.handlers={};this.naturalWidth=768;this.naturalHeight=960;images.push(this)}
  addEventListener(name,cb){this.handlers[name]=cb}
  set src(value){this.url=value}
  load(){this.handlers.load?.()}
  error(){this.handlers.error?.()}
 }
 const renderer=api.create({
  imageCtor:MockImage,windowRef:{matchMedia:()=>({matches:desktop})}
 });
 const canvas={
  imageSmoothingEnabled:true,
  save(){ops.push(['save'])},restore(){ops.push(['restore'])},
  translate(...args){ops.push(['translate',...args])},
  scale(...args){ops.push(['scale',...args])},
  drawImage(...args){ops.push(['drawImage',...args])}
 };
 return {images,ops,renderer,canvas};
}
test('five approved families with 24 frames and six states',()=>{
 assert.deepEqual([...api.TYPES].sort(),['aranha','esqueleto','golem','limo','lobo']);
 assert.deepEqual(api.FRAME,{width:192,height:160,cols:4,rows:6});
 assert.equal(Object.keys(api.ROWS).length,6);
});
test('asset load failure falls back without drawing and mobile remains unchanged',()=>{
 const h=harness(),m=harness(false);
 assert.equal(h.images.length,5);
 assert.equal(m.images.length,0);
 assert.equal(h.renderer.drawMonster(h.canvas,{type:'limo',x:1,y:1},0),false);
 h.images.forEach(im=>im.error());
 assert.equal(h.renderer.drawMonster(h.canvas,{type:'limo',x:1,y:1},0),false);
 assert.equal(m.renderer.drawMonster(m.canvas,{type:'limo',x:1,y:1},0),false);
});
test('all five creatures keep an identical destination size during attack, hurt, and skill',()=>{
 const h=harness();h.images.forEach(im=>im.load());
 for(const type of api.TYPES){
  const dimensions=[];
  const states=[{}, {moving:true},{attacking:true,elapsed:30},
   {attacking:true,elapsed:260},{skill:true,elapsed:260},
   {hurt:true,elapsed:160},{dead:true,elapsed:400}];
  for(const state of states){
   h.ops.length=0;
   assert.equal(h.renderer.drawMonster(h.canvas,{type,x:150,y:210,boss:false},600,{type,...state}),true);
   const args=h.ops.find(op=>op[0]==='drawImage');
   assert.ok(args && args[4]===192 && args[5]===160);
   dimensions.push(args.slice(8,10));
  }
  for(const d of dimensions)assert.deepEqual(d,dimensions[0],type+' shrank');
 }
});
test('mirrored walking and boss variants preserve canvas state',()=>{
 const h=harness();h.images.forEach(im=>im.load());
 const wolf={type:'lobo',dir:3,x:100,y:200,boss:true};
 assert.equal(h.renderer.drawMonster(h.canvas,wolf,400,{type:'lobo',moving:true}),true);
 assert.ok(h.ops.some(c=>c[0]==='scale'&&c[1]===-1));
 assert.equal(h.ops.filter(c=>c[0]==='save').length,h.ops.filter(c=>c[0]==='restore').length);
 assert.ok(api.measure('lobo',true).width>api.measure('lobo',false).width);
});

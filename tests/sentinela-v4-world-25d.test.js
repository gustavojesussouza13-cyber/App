'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sentinel=require('../public/sentinela-v4.js');

function scene(){
 const images=[];
 class ImageMock{
  constructor(){this.handlers={};this.naturalWidth=768;this.naturalHeight=960;this.complete=false;images.push(this)}
  addEventListener(name,handler){this.handlers[name]=handler}
  set src(url){this.url=url}
  load(){this.handlers.load?.()}
 }
 const animation={row:0,frame:0};
 const animations={isDesktop:()=>true,pose:()=>({row:animation.row,frame:animation.frame})};
 const renderer=sentinel.create({windowRef:{matchMedia:()=>({matches:true})},imageCtor:ImageMock,animations});
 const calls=[];
 const g={
  imageSmoothingEnabled:true,
  save(){calls.push(['save'])},restore(){calls.push(['restore'])},
  translate(...args){calls.push(['translate',...args])},
  scale(...args){calls.push(['scale',...args])},
  drawImage(...args){calls.push(['drawImage',...args])}
 };
 images[0].load();
 return {animation,renderer,g,calls,images};
}

test('Sentinela 2.5D maintains ground contact and size in all 24 frames and both directions',()=>{
 for(const boss of [false,true])for(const dir of [1,3]){
  const h=scene();
  const m={type:'sentinela',species:9,x:250,y:300,boss,dir};
  const {width,height}=h.renderer.measure(boss);
  const expectedX=Math.round(m.x-width/2),expectedY=m.y-height;
  for(let row=0;row<6;row++)for(let frame=0;frame<4;frame++){
   h.animation.row=row;h.animation.frame=frame;h.calls.length=0;
   assert.equal(h.renderer.drawMonster(h.g,m,800,{type:'sentinela'}),true);
   const call=h.calls.find(c=>c[0]==='drawImage');
   assert.ok(call,'every frame must draw');
   assert.deepEqual(call.slice(2,6),[frame*192,row*160,192,160],'fixed source cell');
   assert.deepEqual(call.slice(6),[expectedX,expectedY,width,height],'fixed 2.5D feet and dimensions');
   assert.equal(h.g.imageSmoothingEnabled,false,'pixel art must not be blurred');
   assert.equal(h.calls.filter(c=>c[0]==='save').length,1);
   assert.equal(h.calls.filter(c=>c[0]==='restore').length,1);
   if(dir===3){
    assert.deepEqual(h.calls.find(c=>c[0]==='translate'),['translate',2*m.x,0]);
    assert.deepEqual(h.calls.find(c=>c[0]==='scale'),['scale',-1,1]);
   }else assert.equal(h.calls.some(c=>c[0]==='scale'),false);
  }
  assert.ok(h.images[0].url.includes('/assets/creatures-v4/sentinela_v4.png'));
 }
});

test('Sentinela 2.5D preserves world shadow and foot-level depth ordering',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8');
 assert.match(source,/drawShadow\(g,x,y,m\.boss\?58:38\);/);
 assert.match(source,/actors\.push\(\{depth:m\.y,paint:\(\)=>monster\(ctx,m,/);
 assert.match(source,/const sentinelV4Drawn=ty==='sentinela'&&Boolean\(sentinelV4\?\.drawMonster/);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ART=require('../public/desktop-bestiary16');
const read=name=>fs.readFileSync(path.join(__dirname,'../public',name),'utf8');
function harness(pc=true){
 let image=null,calls=[];
 class ImageMock{
  constructor(){image=this;this.handlers={}}
  addEventListener(k,cb){this.handlers[k]=cb}
  set src(value){this.url=value}
 }
 const ctx={
  imageSmoothingEnabled:true,fillStyle:'#000',globalAlpha:1,
  save(){calls.push(['save'])},restore(){calls.push(['restore'])},
  translate(x,y){calls.push(['translate',x,y])},
  scale(x,y){calls.push(['scale',x,y])},
  drawImage(...args){
   assert.ok(args.slice(1).every(Number.isFinite),'atlas must have numeric coordinates');
   calls.push(['draw',...args]);
  },
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'pixel must be integer');
   assert.ok(w>0&&h>0,'pixel dimensions must be positive');
   calls.push(['pixel',this.fillStyle,x,y,w,h]);
  }
 };
 const host={matchMedia:query=>({matches:pc&&query.includes('pointer: fine')})};
 const studio=ART.create({windowRef:host,imageCtor:ImageMock});
 return{studio,ctx,calls,load:()=>image?.handlers.load?.(),
  get initialized(){return Boolean(image)}};
}
test('all fifteen monster families have individual cuts in the classic sprite atlas',()=>{
 const kinds=['aranha','dragao','escorpiao','esqueleto','fantasma','fera',
  'golem','limo','lobo','morcego','serpente','vespa','cavaleiro','sentinela','chefe'];
 assert.deepEqual(Object.keys(ART.ART).sort(),kinds.sort());
 assert.equal(new Set(Object.values(ART.ART).map(v=>v.join(':'))).size,15);
 for(const kind of kinds)assert.equal(ART.PALETTE[kind].length,3);
});
test('desktop sees real atlas images, mobile keeps original renderer',()=>{
 const pc=harness(),mobile=harness(false);
 assert.equal(pc.initialized,true);assert.equal(mobile.initialized,false);
 assert.equal(pc.studio.drawMonster(pc.ctx,{type:'limo',x:80,y:100},0),false);
 assert.equal(mobile.studio.drawMonster(mobile.ctx,{type:'limo',x:80,y:100},0),false);
 pc.load();
 assert.equal(pc.studio.drawMonster(pc.ctx,{type:'limo',x:80,y:100},0),true);
 assert.equal(pc.ctx.imageSmoothingEnabled,false);
 assert.ok(pc.calls.some(x=>x[0]==='draw'));
});
test('all monster families paint distinct real source rectangles',()=>{
 const h=harness();h.load();
 const frames=[];
 for(const type of Object.keys(ART.ART)){
  h.calls.length=0;
  assert.equal(h.studio.drawMonster(h.ctx,{type,x:200,y:200,dir:2},250,
   {type,moving:true}),true,type);
  const cut=h.calls.find(x=>x[0]==='draw');
  assert.ok(cut,type+' must draw an image');
  frames.push(cut.slice(2,4).join(':'));
 }
 assert.equal(new Set(frames).size,15);
});
test('bosses receive larger sprites and unique family attack effects',()=>{
 const h=harness();h.load();
 for(const type of ['aranha','dragao','esqueleto','golem','fantasma']){
  h.calls.length=0;
  assert.equal(h.studio.drawMonster(h.ctx,{type,x:250,y:250,boss:true,species:1},500,
   {type,attacking:true,elapsed:190}),true);
  const boss=h.calls.find(x=>x[0]==='draw');
  assert.ok(boss[8]>=70&&boss[9]>=80,type+' boss should have strong silhouette');
  assert.ok(h.calls.filter(x=>x[0]==='pixel').length>=18,type+' lacks pixel effects');
 }
});
test('direction reversal, hurt and defeated poses remain valid',()=>{
 const h=harness();h.load();
 assert.equal(h.studio.drawMonster(h.ctx,{type:'lobo',x:140,y:160,dir:3},870,
  {type:'lobo',hurt:true}),true);
 assert.ok(h.calls.some(x=>x[0]==='scale'&&x[1]===-1));
 assert.equal(h.studio.drawMonster(h.ctx,{type:'lobo',x:140,y:160},880,
  {type:'lobo',dead:true,elapsed:450}),true);
});
test('site loads the desktop bestiary before renderer and leaves mobile CSS unchanged',()=>{
 const html=read('mundo.html'),art=read('art16.js');
 assert.ok(html.indexOf('/desktop-bestiary16.js')<html.indexOf('/art16.js'));
 assert.match(html,/desktop-bestiary-v2/);
 assert.match(art,/desktopBestiary\?\.drawMonster/);
 assert.match(art,/illustrated\?\(m\.boss\?137:83\)/);
 assert.doesNotThrow(()=>new vm.Script(read('desktop-bestiary16.js')));
 assert.ok(!read('desktop-bestiary16.js').includes('touch-controls'));
});

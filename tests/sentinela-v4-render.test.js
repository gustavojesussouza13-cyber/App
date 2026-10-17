'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const sentinel=require('../public/sentinela-v4.js');
const animations=require('../public/creatures-v3.js');

function harness({desktop=true,width=768,height=960}={}){
 const listeners={};
 class ImageMock{
  constructor(){this.complete=false;this.naturalWidth=width;this.naturalHeight=height}
  addEventListener(name,fn){listeners[name]=fn}
  set src(url){this.url=url}
 }
 const windowRef={matchMedia:()=>({matches:desktop})};
 const renderer=sentinel.create({windowRef,imageCtor:ImageMock,animations});
 const actions=[];
 const g={
  save(){actions.push(['save'])},restore(){actions.push(['restore'])},
  translate(...args){actions.push(['translate',...args])},
  scale(...args){actions.push(['scale',...args])},
  drawImage(...args){actions.push(['drawImage',...args])}
 };
 return {renderer,actions,g,emit:name=>listeners[name]?.()};
}
const monster={type:'sentinela',x:280,y:320,dir:1,species:0};
test('Sentinela V4: atlas 4x6 possui quadros de 192x160 e desenha somente após carregar',()=>{
 assert.deepEqual(sentinel.FRAME,{width:192,height:160,cols:4,rows:6});
 const h=harness();
 assert.equal(h.renderer.drawMonster(h.g,monster,0,{}),false);
 h.emit('load');
 assert.equal(h.renderer.ready,true);
 assert.equal(h.renderer.drawMonster(h.g,monster,0,{}),true);
 const draw=h.actions.find(a=>a[0]==='drawImage');
 assert.deepEqual(draw.slice(2,6),[0,0,192,160]);
 assert.deepEqual(draw.slice(6),[205,172,150,148]);
 assert.equal(h.actions.at(-1)[0],'restore');
});
test('Sentinela V4: movimentos, golpes, dano e morte usam as seis linhas do atlas',()=>{
 const states=[{}, {moving:true},{preparing:true},{attacking:true,elapsed:180},{hurt:true,elapsed:50},{dead:true,elapsed:200}];
 states.forEach((state,row)=>{
  const h=harness();h.emit('load');
  assert.equal(h.renderer.drawMonster(h.g,monster,0,state),true);
  assert.equal(h.actions.find(a=>a[0]==='drawImage')[3],row*160);
 });
});
test('Sentinela V4: espelhamento restaura o canvas e chefes ampliam a imagem',()=>{
 const h=harness();h.emit('load');
 assert.equal(h.renderer.drawMonster(h.g,{...monster,dir:3,boss:true},0,{}),true);
 assert.deepEqual(h.actions.filter(a=>a[0]==='scale')[0],['scale',-1,1]);
 assert.deepEqual(h.actions.find(a=>a[0]==='drawImage').slice(-2),[218,215]);
 assert.equal(h.actions.at(-1)[0],'restore');
});
test('Sentinela V4: fallback para imagem inválida, erro, outros monstros e mobile',()=>{
 const invalid=harness({width:1});invalid.emit('load');
 assert.equal(invalid.renderer.ready,false);
 assert.equal(invalid.renderer.drawMonster(invalid.g,monster,0,{}),false);
 const errored=harness();errored.emit('error');
 assert.equal(errored.renderer.drawMonster(errored.g,monster,0,{}),false);
 const valid=harness();valid.emit('load');
 assert.equal(valid.renderer.drawMonster(valid.g,{...monster,type:'lobo'},0,{}),false);
 const mobile=harness({desktop:false});
 assert.equal(mobile.renderer.drawMonster(mobile.g,monster,0,{}),false);
});
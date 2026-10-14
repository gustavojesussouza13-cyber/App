'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {create}=require('../public/sprite-studio');

function scene(){
 const canvases=[];
 const documentRef={createElement(tag){
  assert.equal(tag,'canvas');
  const ctx={fillStyle:'#000',imageSmoothingEnabled:false,
   fillRect(x,y,w,h){assert.ok([x,y,w,h].every(Number.isFinite));assert.ok(w>0&&h>0)},
   save(){},restore(){},translate(){},scale(){}};
  const canvas={width:0,height:0,getContext:()=>ctx};
  canvases.push(canvas);return canvas;
 }};
 const ops=[],ctx={imageSmoothingEnabled:true,shadowColor:null,shadowBlur:9,
  shadowOffsetX:0,shadowOffsetY:0,drawImage(...args){ops.push(args)},
  save(){ops.push(['save'])},restore(){ops.push(['restore'])}};
 return{studio:create({documentRef}),ops,ctx,canvases};
}
function draw(type,pc){
 const s=scene();
 if(type==='hero')s.studio.drawHero(s.ctx,{role:'peregrino',dir:2,x:200,y:280},700,{moving:true,desktopPremium:pc});
 if(type==='npc')s.studio.drawNpc(s.ctx,{id:'historia-4',name:'Ferreiro',x:200,y:280},700,{desktopPremium:pc});
 if(type==='monster')s.studio.drawMonster(s.ctx,{x:200,y:280,species:2,zone:4,dir:2,boss:false},700,
   {type:'lobo',moving:true,desktopPremium:pc});
 return s;
}
test('render premium de PC tem protagonistas legíveis em 70×87, sem perda de animação',()=>{
 const pc=draw('hero',true),mobile=draw('hero',false);
 const hero=pc.ops.filter(o=>o[0]?.width===64);
 assert.equal(hero.length,2);
 assert.equal(hero.at(-1)[3],88);assert.equal(hero.at(-1)[4],110);
 assert.equal(mobile.ops.length,1);
 assert.equal(mobile.ops[0][3],70);assert.equal(mobile.ops[0][4],88);
 assert.equal(pc.canvases[0].width,64);
 assert.equal(pc.canvases[0].height,80);
});
test('personagens secundários só ampliam no PC, preservando identidade do NPC',()=>{
 const pc=draw('npc',true),mobile=draw('npc',false);
 assert.equal(pc.ops.filter(o=>o[0]?.width===64).at(-1)[3],80);
 assert.equal(pc.ops.filter(o=>o[0]?.width===64).at(-1)[4],100);
 assert.equal(mobile.ops[0][3],66);assert.equal(mobile.ops[0][4],83);
});
test('criaturas e chefes continuam distintos, mobile sem mudanças de dimensões',()=>{
 const pc=draw('monster',true),mobile=draw('monster',false);
 assert.equal(pc.ops.filter(o=>o[0]?.width===64).at(-1)[3],80);
 assert.equal(pc.ops.filter(o=>o[0]?.width===64).at(-1)[4],100);
 assert.equal(mobile.ops[0][3],68);assert.equal(mobile.ops[0][4],85);
 const boss=scene();boss.studio.drawMonster(boss.ctx,
  {x:180,y:230,boss:true,species:12,dir:2,zone:20},400,{type:'dragao',desktopPremium:true});
 assert.equal(boss.ops.filter(o=>o[0]?.width===64).at(-1)[3],124);
 assert.equal(boss.ops.filter(o=>o[0]?.width===64).at(-1)[4],155);
});
test('PC usa sombra de pixels duros, não borra nenhuma das camadas',()=>{
 for(const type of ['hero','npc','monster']){
  const h=draw(type,true);
  assert.ok(h.ops.some(x=>x[0]==='save'),'PC sem contorno de sombra');
  assert.equal(h.ctx.imageSmoothingEnabled,false);
  assert.equal(h.ctx.shadowBlur,0);
 }
});
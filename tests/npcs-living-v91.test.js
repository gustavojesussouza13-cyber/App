'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const mod=require('../public/npcs-v4.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const win={matchMedia:q=>({matches:q==='(min-width: 901px)'})};
class ImageFake{
 constructor(){this.complete=true;this.naturalWidth=64;this.naturalHeight=80;this.decoding='';}
 addEventListener(){}
 set src(v){this._src=v}
 get src(){return this._src}
}
function context(){
 const calls=[];
 const g={imageSmoothingEnabled:true,save(){},restore(){},drawImage(...args){calls.push(args)},
  fillRect(...args){calls.push(['pixel',...args])}};
 return {calls,g};
}
test('NPC V9.1: all 56 approved PNGs remain native individual full-body 64x80 assets',()=>{
 assert.equal(mod.TOTAL,56);assert.deepEqual([mod.WIDTH,mod.HEIGHT],[64,80]);
 for(const id of mod.ids)assert.ok(mod.source(id)?.startsWith('/assets/npcs-v4/'+id+'.png'));
 assert.equal(new Set(mod.ids).size,56);
 assert.equal(mod.source('some-new-sprite'),null);
});
test('NPC V9.1: natural per-ID breathing has true rest and motion phases and honors accessibility',()=>{
 let a=0,b=0,c=0;
 for(let now=0;now<8800;now+=120){
  const x=mod.idleState('historia-0',now,{x:700,y:500,playerX:710,playerY:490});
  assert.ok([0,1,2].includes(x.breath));
  if(x.breath===0)a++;if(x.breath===1)b++;if(x.breath===2)c++;
 }
 assert.ok(a>0&&b>0&&c>0,'visible idle changes, not a frozen static sprite');
 const one=mod.idleState('historia-0',3500,{x:700,y:500});
 const again=mod.idleState('historia-0',3500,{x:700,y:500});
 assert.deepEqual(one,again,'stable for all clients viewing same NPC');
 assert.ok(Array.from({length:36},(_,i)=>mod.idleState('historia-'+i,3500).breath).some(v=>v!==one.breath),
 'NPCs are out of phase, not breathing like synchronized mannequins');
 const reduced=mod.idleState('historia-0',2000,{reducedMotion:true,x:0,y:0,playerX:0,playerY:0});
 assert.equal(reduced.breath,0);assert.equal(reduced.attention,false);
});
test('NPC V9.1: near player = occasional awareness; far never has bubble',()=>{
 assert.ok(Array.from({length:40},(_,i)=>mod.idleState('historia-0',i*250,{x:0,y:0,playerX:10,playerY:0})).some(s=>s.attention));
 for(let t=0;t<5000;t+=330){
  assert.equal(mod.idleState('historia-0',t,{x:0,y:0,playerX:151,playerY:0}).attention,false);
 }
});
test('NPC V9.1: one full PNG draw per frame, foot anchor stable and no body layers',()=>{
 const maker=mod.create({windowRef:win,imageCtor:ImageFake});
 assert.equal(maker.enabled,true);
 for(const now of [0,1000,2200,3700,4900]){
  const {calls,g}=context(),n={id:'historia-0',x:431,y:330};
  assert.equal(maker.drawNpc(g,n,now,{world25d:true,playerX:432,playerY:329}),true);
  const draw=calls.filter(c=>typeof c[0]!=='string');
  assert.equal(draw.length,1,'never two bodies overlaid');
  assert.equal(draw[0][1],Math.round(431-93/2));
  assert.equal(draw[0][2]+draw[0][4],330,'feet anchored, no jumping/teleport');
  assert.equal(draw[0][3],93);assert.ok([116,117,118].includes(draw[0][4]));
 }
 const {calls,g}=context();
 assert.equal(maker.drawNpc(g,{id:'historia-0',x:50,y:100},3000,{alive:false}),true);
 const png=calls.filter(c=>typeof c[0]!=='string');
 assert.equal(png.length,1);assert.equal(png[0][4],100);
});
test('NPC V9.1: real game and preview both connect player-distance reaction, not server simulation',()=>{
 const engine=read('public/art16.js'),game=read('public/mundo.html'),preview=read('public/laboratorio-npcs-v91.html');
 assert.ok(engine.includes('playerX,playerY'));
 assert.ok(engine.includes('npcActor(ctx,n,n.index===storyStage,n.index!==null&&n.index<storyStage,now,x,y)'));
 assert.ok(game.includes('/npcs-v4.js?v=npc-v91-living-idles-20261018'));
 assert.ok(preview.includes('OsPeregrinosNPCsV4.create'));
 assert.ok(preview.includes('allowMobile:true'));
 assert.ok(preview.includes('alive:living'));
});

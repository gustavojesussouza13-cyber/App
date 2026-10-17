'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('../public/sentinela-v4.js');
const poses=require('../public/creatures-v3.js');
const art=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8');
test('Guardião da Aurora (espécie 31) reuses the approved Sentinel V4 only when available',()=>{
 const match=art.match(/const types=\[([^\]]+)\]/);
 const names=[...match[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
 assert.equal(names[28],'sentinela','Sentinela da Noite remains unchanged');
 assert.equal(names[30],'anjo-caido','Anjo Caído V4 remains exclusive');
 assert.equal(names[31],'chefe','preserve original boss type, drops, dialog and fallback');
 assert.match(art,/const auroraSentinelDrawn=ty==='chefe'&&Number\(m\.species\)===31&&Boolean\(sentinelV4\?\.drawMonster/);
 assert.match(art,/\{\.\.\.m,x,y,boss:Boolean\(m\.boss\)\},now,\{\.\.\.state,type:'sentinela'\}/);
 assert.ok(art.includes('auroraSentinelDrawn?sentinelV4.measure(Boolean(m.boss))'),'correct HUD positioning');
 assert.ok(art.includes('!sentinelV4Drawn&&!auroraSentinelDrawn&&!basiliskV4Drawn'),'no V3 overlaps while Sentinel V4 is shown');
});
test('Approved Sentinel frame is reused at 145% boss scale, without resizing animation source',()=>{
 const regular=api.measure(false),boss=api.measure(true);
 assert.equal(api.FRAME.width,192);assert.equal(api.FRAME.height,160);
 assert.equal(regular.width,150);assert.equal(regular.height,148);
 assert.equal(boss.width,Math.round(150*1.45));
 assert.equal(boss.height,Math.round(148*1.45));
 assert.ok(boss.healthTop>regular.healthTop);
 const ops=[];const images=[];
 class MockImage{
  constructor(){this.listeners={};images.push(this)}
  set src(v){this.url=v}
  addEventListener(event,fn){this.listeners[event]=fn}
  load(){this.naturalWidth=768;this.naturalHeight=960;this.listeners.load?.()}
 }
 const r=api.create({windowRef:{matchMedia:()=>({matches:true})},imageCtor:MockImage,animations:poses});
 const g={save(){ops.push(['save'])},restore(){ops.push(['restore'])},drawImage(...args){ops.push(['drawImage',...args])}};
 assert.equal(images.length,1,'the boss should not download another atlas');
 images[0].load();
 for(const state of [{},{moving:true},{attacking:true,elapsed:280},{hurt:true,elapsed:100},{dead:true,elapsed:510}]){
  ops.length=0;
  assert.equal(r.drawMonster(g,{type:'chefe',species:31,boss:true,x:210,y:280,dir:1},700,{...state,type:'sentinela'}),true);
  const draw=ops.find(x=>x[0]==='drawImage');
  assert.deepEqual(draw.slice(4,6),[192,160]);
  assert.deepEqual(draw.slice(-4),[Math.round(210-boss.width/2),280-boss.height,boss.width,boss.height]);
  assert.equal(ops.at(-1)[0],'restore');
 }
});
test('Do not change V3 families, other V4 creatures, server, guilds or 3D fortress',()=>{
 assert.ok(art.includes("const types=['limo','lobo','morcego','esqueleto','aranha','golem'"));
 assert.ok(art.includes("const angelV4Drawn=ty==='anjo-caido'"));
 assert.ok(art.includes("const ghostAngelFallback=ty==='anjo-caido'"));
});

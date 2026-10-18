'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),publicDir=path.join(root,'public');
const manifest=JSON.parse(fs.readFileSync(path.join(publicDir,'assets/npcs-v4/catalogo.json'),'utf8'));
const npcV4=require('../public/npcs-v4.js');
const story=require('../story-data.js');
function pngDetail(buf){
 assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const w=buf.readUInt32BE(16),h=buf.readUInt32BE(20),depth=buf[24],type=buf[25];
 let i=8,chunks=[];
 while(i<buf.length){let len=buf.readUInt32BE(i),name=buf.toString('ascii',i+4,i+8);
  if(name==='IDAT')chunks.push(buf.subarray(i+8,i+8+len));i+=12+len;
  if(name==='IEND')break;
 }
 const raw=zlib.inflateSync(Buffer.concat(chunks));assert.equal(raw.length,h*(1+w*4));
 let transparent=0,visible=0,old=Buffer.alloc(w*4),stride=w*4,at=0;
 for(let y=0;y<h;y++){
  const filter=raw[at++],row=Buffer.from(raw.subarray(at,at+stride));at+=stride;
  for(let x=0;x<stride;x++){
   const l=x>=4?row[x-4]:0,u=old[x],ul=x>=4?old[x-4]:0;let pred=0;
   if(filter===1)pred=l;else if(filter===2)pred=u;
   else if(filter===3)pred=(l+u)>>1;
   else if(filter===4){let p=l+u-ul,a=Math.abs(p-l),b=Math.abs(p-u),c=Math.abs(p-ul);pred=a<=b&&a<=c?l:b<=c?u:ul}
   else assert.equal(filter,0,'valid PNG filter');
   row[x]=(row[x]+pred)&255;
  }
  for(let x=3;x<stride;x+=4){if(row[x]===0)transparent++;else visible++;}
  old=row;
 }
 return {w,h,depth,type,transparent,visible};
}
test('all 56 real NPC IDs from server map exactly one independent RGBA 64x80 image',()=>{
 assert.equal(story.NPCS.length,56);
 assert.equal(manifest.npcs.length,56);
 assert.equal(manifest.total,56);
 assert.equal(npcV4.ids.length,56);
 const ids=story.NPCS.map(n=>n.id).sort(),actual=manifest.npcs.map(n=>n.id).sort();
 assert.deepEqual(actual,ids);
 assert.deepEqual([...npcV4.ids].sort(),ids);
 let bytes=0;
 for(const npc of manifest.npcs){
  const f=path.join(publicDir,'assets/npcs-v4',npc.id+'.png'),png=fs.readFileSync(f);bytes+=png.length;
  const d=pngDetail(png);
  assert.deepEqual([d.w,d.h,d.depth,d.type],[64,80,8,6],npc.id);
  assert.ok(d.transparent>250,'transparent background '+npc.id);
  assert.ok(d.visible>80,'nonempty sprite '+npc.id);
  assert.equal(npc.name,story.byId.get(npc.id).name,'identity '+npc.id);
 }
 assert.ok(bytes<1500000,'sprites budget <1.5MB');
 assert.equal(fs.readdirSync(path.join(publicDir,'assets/npcs-v4')).filter(x=>x.endsWith('.png')).length,56);
});
class FakeImage{
 static images=[];
 constructor(){this.handlers={};this.complete=false;FakeImage.images.push(this);}
 addEventListener(t,fn){this.handlers[t]=fn}
 set src(v){this.url=v}
 load(w=64,h=80){this.naturalWidth=w;this.naturalHeight=h;this.complete=true;this.handlers.load?.();}
 fail(){this.handlers.error?.();}
}
function harness(mobile=false){
 FakeImage.images=[];
 const api=npcV4.create({windowRef:{matchMedia:()=>({matches:!mobile})},imageCtor:FakeImage});
 let calls=[],ctx={imageSmoothingEnabled:true,save(){calls.push(['save'])},restore(){calls.push(['restore'])},drawImage(...args){calls.push(['draw',...args])}};
 return {api,ctx,calls};
}
test('visual V4 is front-only, static, aligned, with legacy fallback and never mutates NPC data',()=>{
 let t=harness(),n={id:'historia-0',name:'Lia, a Acendedora',x:450,y:350},original=JSON.stringify(n);
 assert.equal(t.api.drawNpc(t.ctx,n,10),false,'visual fallback during first load');
 assert.equal(FakeImage.images.length,1);
 assert.ok(FakeImage.images[0].url.includes('/assets/npcs-v4/historia-0.png'));
 FakeImage.images[0].load();
 assert.equal(t.api.drawNpc(t.ctx,n,100),true);
 let draw=t.calls.filter(x=>x[0]==='draw').at(-1);
 assert.deepEqual(draw.slice(2),[410,250,80,100],'PC2D position/size');
 assert.equal(t.api.drawNpc(t.ctx,n,9999,{world25d:true}),true);
 draw=t.calls.filter(x=>x[0]==='draw').at(-1);
 assert.deepEqual(draw.slice(2),[404,234,93,116],'2.5D position/size');
 assert.equal(JSON.stringify(n),original);
 assert.equal(t.api.drawNpc(t.ctx,{...n,id:'historia-40'},0),false);
 assert.equal(t.api.drawNpc(t.ctx,{...n,id:'../../secret'},0),false);
 assert.equal(FakeImage.images.length,1,'no new image for invalid ID');
 assert.equal(t.calls.filter(x=>x[0]==='save').length,t.calls.filter(x=>x[0]==='restore').length);
 const m=harness();assert.equal(m.api.drawNpc(m.ctx,{...n,id:'morador-2'},100),false);
 FakeImage.images[0].fail();assert.equal(m.api.drawNpc(m.ctx,{...n,id:'morador-2'},100),false);
 const invalid=harness();invalid.api.drawNpc(invalid.ctx,n,1);FakeImage.images[0].load(128,160);
 assert.equal(invalid.api.drawNpc(invalid.ctx,n,2),false);
 const mobile=harness(true);assert.equal(mobile.api.enabled,false);assert.equal(mobile.api.drawNpc(mobile.ctx,n,20),false);
});
test('V4 NPC art precedes unchanged previous renderers and preserves 3D fortress and monster V3 families',()=>{
 const art=fs.readFileSync(path.join(publicDir,'art16.js'),'utf8');
 const html=fs.readFileSync(path.join(publicDir,'mundo.html'),'utf8');
 const first=art.indexOf('const npcV4Drawn=Boolean(npcV4Review?.drawNpc');
 const studio=art.indexOf('const studioNpc=!npcV4Drawn&&Boolean(spriteStudio?.drawNpc');
 const prev=art.indexOf('const illustratedNpcV3=!npcV4Drawn&&!studioNpc&&!pngNpc&&Boolean');
 assert.ok(first>0&&studio>first&&prev>studio);
 assert.ok(art.includes('const nameY=y-(npcV4Drawn?(useAurora25d?129:113)'));
 assert.ok(html.includes('/npcs-v4.js?v=npc-v91-living-idles-20261018'));
 assert.ok(html.indexOf('/npcs-v4.js')<html.indexOf('/art16.js'));
 assert.equal(npcV4.TOTAL,56);
 assert.equal(npcV4.WIDTH,64);assert.equal(npcV4.HEIGHT,80);
 assert.deepEqual(manifest.displayPC2D,[80,100]);
 assert.deepEqual(manifest.displayWorld25D,[93,116]);
 const v3=fs.readFileSync(path.join(publicDir,'creatures-v3.js'),'utf8');
 assert.ok(v3.includes("['limo','lobo','aranha','esqueleto','golem']"));
 const world=fs.readFileSync(path.join(root,'world-engine.js'),'utf8');
 assert.ok(!world.includes('npcs-v4.js'));
});

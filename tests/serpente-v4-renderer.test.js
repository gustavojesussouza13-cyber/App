'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('../public/serpente-v4.js');
const v3=require('../public/creatures-v3.js');
function harness({desktop=true,goodSize=true,throws=false}={}){
 const images=[],ops=[];
 class FakeImage{
  constructor(){this.handlers={};this.complete=false;this.naturalWidth=goodSize?768:700;this.naturalHeight=960;images.push(this)}
  addEventListener(event,cb){this.handlers[event]=cb}
  set src(url){this.url=url}
  load(){this.handlers.load?.()}
  error(){this.handlers.error?.()}
 }
 const renderer=api.create({windowRef:{matchMedia:q=>({matches:desktop&&q==='(min-width: 901px)'})},imageCtor:FakeImage,animations:v3});
 const canvas={save(){ops.push(['save'])},restore(){ops.push(['restore'])},
  translate(...a){ops.push(['translate',...a])},scale(...a){ops.push(['scale',...a])},
  drawImage(...a){ops.push(['drawImage',...a]);if(throws)throw new Error('bad image')}};
 return {images,ops,renderer,canvas};
}
test('approved Serpente V4 atlas retains PNG dimensions and transparency',()=>{
 const p=path.resolve(__dirname,'../public/assets/creatures-v4/serpente_v4.png');
 const bytes=fs.readFileSync(p);
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(bytes.readUInt32BE(16),768);
 assert.equal(bytes.readUInt32BE(20),960);
 assert.equal(bytes.readUInt8(24),8);
 assert.ok([3,6].includes(bytes.readUInt8(25)),'palette or RGBA PNG');
 if(bytes.readUInt8(25)===3)assert.ok(bytes.includes(Buffer.from('tRNS')),'indexed PNG must include transparency');
});
test('desktop serpent draws only after correct asset loads; mobile and errors keep fallback',()=>{
 const h=harness(),mobile=harness({desktop:false}),bad=harness({goodSize:false});
 assert.equal(h.images.length,1);
 assert.ok(h.images[0].url.includes('/assets/creatures-v4/serpente_v4.png'));
 assert.equal(mobile.images.length,0);
 assert.equal(h.renderer.drawMonster(h.canvas,{type:'serpente',x:10,y:70},0),false);
 h.images[0].load();
 assert.equal(h.renderer.ready,true);
 assert.equal(h.renderer.drawMonster(h.canvas,{type:'serpente',x:10,y:70},0),true);
 assert.equal(h.renderer.drawMonster(h.canvas,{type:'morcego',x:10,y:70},0),false);
 bad.images[0].load();assert.equal(bad.renderer.ready,false);
 h.images[0].error();assert.equal(h.renderer.ready,false);
 assert.equal(mobile.renderer.drawMonster(mobile.canvas,{type:'serpente'},0),false);
});
test('all six rows preserve destination dimensions for normal and boss serpents',()=>{
 const h=harness();h.images[0].load();
 const poses=[[{},v3.ROWS.repouso],[{moving:true},v3.ROWS.caminhada],
  [{preparing:true},v3.ROWS.preparacao],[{attacking:true,elapsed:70},v3.ROWS.preparacao],
  [{attacking:true,elapsed:250},v3.ROWS.ataque],[{skill:true,elapsed:300},v3.ROWS.ataque],
  [{hurt:true,elapsed:100},v3.ROWS.dano],[{dead:true,elapsed:470},v3.ROWS.morte]];
 for(const boss of [false,true]){
  const sizes=[];
  for(const [state,row] of poses){
   h.ops.length=0;
   assert.equal(h.renderer.drawMonster(h.canvas,{type:'serpente',x:150,y:200,boss,species:29},900,{type:'serpente',...state}),true);
   const op=h.ops.find(z=>z[0]==='drawImage');
   assert.equal(op[3],row*160);
   assert.ok(op[2]>=0&&op[2]<=576&&op[2]%192===0);
   assert.deepEqual(op.slice(4,6),[192,160]);
   sizes.push(op.slice(8,10));
  }
  for(const size of sizes)assert.deepEqual(size,sizes[0]);
  assert.deepEqual(sizes[0],[api.measure(boss).width,api.measure(boss).height]);
 }
 assert.ok(api.measure(true).width>api.measure(false).width);
});
test('serpent mirrors direction safely and survives canvas drawImage failures',()=>{
 const h=harness();h.images[0].load();
 assert.equal(h.renderer.drawMonster(h.canvas,{type:'serpente',x:75,y:90,dir:3},100,{moving:true,type:'serpente'}),true);
 assert.ok(h.ops.some(x=>x[0]==='scale'&&x[1]===-1));
 const bad=harness({throws:true});bad.images[0].load();
 assert.equal(bad.renderer.drawMonster(bad.canvas,{type:'serpente',x:75,y:90},100),false);
 for(const x of [h,bad])assert.equal(x.ops.filter(y=>y[0]==='save').length,x.ops.filter(y=>y[0]==='restore').length);
});
test('experiment connects all snake species without touching server, guild 3D or old sprites',()=>{
 const art=fs.readFileSync(path.resolve(__dirname,'../public/art16.js'),'utf8');
 const html=fs.readFileSync(path.resolve(__dirname,'../public/mundo.html'),'utf8');
 assert.ok(art.includes("ty==='serpente'&&Boolean(serpentV4?.drawMonster"));
 assert.ok(art.includes('const creatureV3=!batV4Drawn&&!serpentV4Drawn'));
 assert.ok(art.includes('const spriteDim=batV4Drawn?batV4.measure(m.boss):serpentV4Drawn?serpentV4.measure(m.boss)'));
 assert.ok(html.indexOf('/serpente-v4.js')<html.indexOf('/art16.js'));
 assert.ok(html.indexOf('/morcego-v4.js')<html.indexOf('/serpente-v4.js'));
 assert.ok(html.includes('/guild-city-3d.js'));
 const types=art.match(/const types=\[([^\]]+)\]/)?.[1]||'';
 assert.equal((types.match(/'serpente'/g)||[]).length,3);
});

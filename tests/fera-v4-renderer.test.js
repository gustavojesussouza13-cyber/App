'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const api=require('../public/fera-v4.js');
const poses=require('../public/creatures-v3.js');

function harness({desktop=true,valid=true,drawFails=false}={}){
 const images=[],operations=[];
 class MockImage {
  constructor(){this.events={};this.complete=false;this.naturalWidth=valid?768:384;this.naturalHeight=960;images.push(this)}
  addEventListener(name,callback){this.events[name]=callback}
  set src(url){this.url=url}
  load(){this.events.load?.()}
  error(){this.events.error?.()}
 }
 const renderer=api.create({windowRef:{matchMedia:q=>({matches:desktop&&q==='(min-width: 901px)'})},imageCtor:MockImage,animations:poses});
 const canvas={
  imageSmoothingEnabled:true,
  save(){operations.push(['save'])},restore(){operations.push(['restore'])},
  translate(...args){operations.push(['translate',...args])},
  scale(...args){operations.push(['scale',...args])},
  drawImage(...args){operations.push(['drawImage',...args]);if(drawFails)throw Error('image decoding failed')}
 };
 return {renderer,images,operations,canvas};
}
test('approved Fera V4 PNG is exact 768x960 transparent palette asset',()=>{
 const bytes=fs.readFileSync(path.resolve(__dirname,'../public/assets/creatures-v4/fera_v4.png'));
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(bytes.readUInt32BE(16),768);
 assert.equal(bytes.readUInt32BE(20),960);
 assert.equal(bytes.readUInt8(24),8);
 assert.equal(bytes.readUInt8(25),3);
 assert.ok(bytes.includes(Buffer.from('tRNS')),'palette must carry transparent alpha values');
 const gitBlobSha=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
 assert.equal(gitBlobSha,'f2d172d99d41d48c4f77bde42bb5677f1b6fec09','approved PNG bytes changed');
});
test('only loaded desktop beast uses V4; mobile, corrupt and other monsters fall back',()=>{
 const h=harness(),mobile=harness({desktop:false}),broken=harness({valid:false});
 assert.equal(h.images.length,1);
 assert.ok(h.images[0].url.includes('/assets/creatures-v4/fera_v4.png'));
 assert.equal(mobile.images.length,0);
 assert.equal(h.renderer.drawMonster(h.canvas,{type:'fera',x:120,y:170},100),false);
 h.images[0].load();
 assert.equal(h.renderer.ready,true);
 assert.equal(h.renderer.drawMonster(h.canvas,{type:'fera',x:120,y:170},100),true);
 assert.equal(h.renderer.drawMonster(h.canvas,{type:'lobo',x:120,y:170},100),false);
 broken.images[0].load();assert.equal(broken.renderer.ready,false);
 assert.equal(mobile.renderer.drawMonster(mobile.canvas,{type:'fera'},100),false);
 h.images[0].error();assert.equal(h.renderer.ready,false);
});
test('all six pose rows have fixed dimensions for normal beasts and boss beasts',()=>{
 const h=harness();h.images[0].load();
 const states=[
  [{},poses.ROWS.repouso],[{moving:true},poses.ROWS.caminhada],
  [{preparing:true},poses.ROWS.preparacao],
  [{attacking:true,elapsed:45},poses.ROWS.preparacao],
  [{attacking:true,elapsed:250},poses.ROWS.ataque],
  [{skill:true,elapsed:220},poses.ROWS.ataque],
  [{hurt:true,elapsed:160},poses.ROWS.dano],
  [{dead:true,elapsed:550},poses.ROWS.morte]
 ];
 for(const boss of [false,true]){
  const positions=[];
  for(const [state,row] of states){
   h.operations.length=0;
   assert.equal(h.renderer.drawMonster(h.canvas,{type:'fera',species:25,x:200,y:250,boss},700,{type:'fera',...state}),true);
   const draw=h.operations.find(op=>op[0]==='drawImage');
   assert.ok(draw);
   assert.equal(draw[3],row*160);
   assert.equal(draw[4],192);assert.equal(draw[5],160);
   assert.ok(draw[2]>=0&&draw[2]<=576&&draw[2]%192===0);
   positions.push(draw.slice(8,10));
  }
  for(const dims of positions)assert.deepEqual(dims,positions[0]);
  assert.deepEqual(positions[0],[api.measure(boss).width,api.measure(boss).height]);
 }
 assert.ok(api.measure(true).healthTop>api.measure(false).healthTop);
});
test('left-facing attack mirrors safely and drawing failures restore canvas for old sprites',()=>{
 const h=harness();h.images[0].load();
 assert.equal(h.renderer.drawMonster(h.canvas,{type:'fera',dir:3,x:85,y:120},600,{type:'fera',attacking:true,elapsed:260}),true);
 assert.ok(h.operations.some(c=>c[0]==='scale'&&c[1]===-1));
 const broken=harness({drawFails:true});broken.images[0].load();
 assert.equal(broken.renderer.drawMonster(broken.canvas,{type:'fera',x:85,y:120},600),false);
 for(const k of [h,broken])assert.equal(k.operations.filter(c=>c[0]==='save').length,k.operations.filter(c=>c[0]==='restore').length);
});
test('Fera species 25 keeps its V4 visual while Espinho Vivo species 9 gets its own renderer',()=>{
 const art=fs.readFileSync(path.resolve(__dirname,'../public/art16.js'),'utf8');
 const html=fs.readFileSync(path.resolve(__dirname,'../public/mundo.html'),'utf8');
 const match=art.match(/const types=\[([^\]]+)\]/);
 assert.ok(match);
 assert.equal((match[1].match(/'fera'/g)||[]).length,1);
 assert.ok(match[1].includes("'espinho-vivo'"),'species 9 no longer reuses Fera V4');
 assert.ok(art.includes("const beastV4Drawn=ty==='fera'&&Boolean(beastV4?.drawMonster"));
 assert.ok(art.includes('const creatureV3=!batV4Drawn&&!serpentV4Drawn&&!beastV4Drawn'));
 assert.ok(art.includes('beastV4Drawn?beastV4.measure(m.boss)'));
 const parts=['/creatures-v3.js','/morcego-v4.js','/serpente-v4.js','/fera-v4.js','/art16.js'];
 for(let i=1;i<parts.length;i++)assert.ok(html.indexOf(parts[i-1])<html.indexOf(parts[i]));
 assert.ok(html.includes('/guild-city-3d.js'));
});

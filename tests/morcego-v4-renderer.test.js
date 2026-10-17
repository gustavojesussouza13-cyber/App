'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const api=require('../public/morcego-v4.js');
const v3=require('../public/creatures-v3.js');

function harness({desktop=true,goodSize=true}={}){
 const images=[],ops=[];
 class MockImage{
  constructor(){this.handlers={};this.complete=false;this.naturalWidth=goodSize?768:500;this.naturalHeight=960;images.push(this)}
  addEventListener(name,cb){this.handlers[name]=cb}
  set src(value){this.url=value}
  load(){this.handlers.load?.()}
  error(){this.handlers.error?.()}
 }
 const renderer=api.create({windowRef:{matchMedia:()=>({matches:desktop})},imageCtor:MockImage,animations:v3});
 const canvas={imageSmoothingEnabled:true,save(){ops.push(['save'])},restore(){ops.push(['restore'])},
  translate(...a){ops.push(['translate',...a])},scale(...a){ops.push(['scale',...a])},
  drawImage(...a){ops.push(['drawImage',...a])}};
 return {renderer,images,ops,canvas};
}

test('the approved 768x960 bat asset is exactly the reviewed transparent PNG',()=>{
 const file=fs.readFileSync(path.resolve(__dirname,'../public/assets/creatures-v3/morcego_v4.png'));
 assert.equal(file.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(file.readUInt32BE(16),768);
 assert.equal(file.readUInt32BE(20),960);
 assert.equal(file.readUInt8(24),8);
 assert.ok([3,6].includes(file.readUInt8(25)));
 if(file.readUInt8(25)===3)assert.ok(file.includes(Buffer.from('tRNS')));
 assert.equal(createHash('sha256').update(file).digest('hex'),'dc3a753d3fdfbefe0424c1810300680044fdf210652326eff83d0423e6d1c63e');
});

test('desktop load, PNG failure, mobile and non-bat fallback are preserved',()=>{
 const h=harness(),mobile=harness({desktop:false}),bad=harness({goodSize:false});
 assert.equal(h.images.length,1);
 assert.ok(h.images[0].url.includes('morcego_v4.png'));
 assert.equal(mobile.images.length,0);
 assert.equal(h.renderer.drawMonster(h.canvas,{type:'morcego',x:30,y:70},0),false);
 h.images[0].load();
 assert.equal(h.renderer.ready,true);
 assert.equal(h.renderer.drawMonster(h.canvas,{type:'morcego',x:30,y:70},0),true);
 assert.equal(h.renderer.drawMonster(h.canvas,{type:'limo',x:30,y:70},0),false);
 bad.images[0].load();
 assert.equal(bad.renderer.ready,false);
 h.images[0].error();
 assert.equal(h.renderer.ready,false);
});

test('idle, walk, preparation, attack, skill, hurt and death have fixed size for both boss scales',()=>{
 const h=harness();h.images[0].load();
 const cases=[
  [{},v3.ROWS.repouso],
  [{moving:true},v3.ROWS.caminhada],
  [{preparing:true},v3.ROWS.preparacao],
  [{attacking:true,elapsed:70},v3.ROWS.preparacao],
  [{attacking:true,elapsed:240},v3.ROWS.ataque],
  [{skill:true,elapsed:240},v3.ROWS.ataque],
  [{hurt:true,elapsed:150},v3.ROWS.dano],
  [{dead:true,elapsed:470},v3.ROWS.morte]
 ];
 for(const boss of [false,true]){
  const sizes=[];
  for(const [state,row] of cases){
   h.ops.length=0;
   assert.equal(h.renderer.drawMonster(h.canvas,{type:'morcego',species:7,x:180,y:240,boss},1200,{type:'morcego',...state}),true);
   const d=h.ops.find(x=>x[0]==='drawImage');
   assert.equal(d[3],row*160);
   assert.ok(d[2]>=0&&d[2]<=576&&d[2]%192===0);
   assert.deepEqual(d.slice(4,6),[192,160]);
   sizes.push(d.slice(8,10));
  }
  for(const size of sizes)assert.deepEqual(size,sizes[0]);
  assert.deepEqual(sizes[0],[api.measure(boss).width,api.measure(boss).height]);
 }
 assert.ok(api.measure(true).width>api.measure(false).width);
});

test('mirrored bats restore canvas and main integration retains V3 and guild scripts',()=>{
 const h=harness();h.images[0].load();
 assert.equal(h.renderer.drawMonster(h.canvas,{type:'morcego',x:80,y:100,dir:3},600,{type:'morcego',moving:true}),true);
 assert.ok(h.ops.some(x=>x[0]==='scale'&&x[1]===-1));
 assert.equal(h.ops.filter(x=>x[0]==='save').length,h.ops.filter(x=>x[0]==='restore').length);
 const art=fs.readFileSync(path.resolve(__dirname,'../public/art16.js'),'utf8');
 const html=fs.readFileSync(path.resolve(__dirname,'../public/mundo.html'),'utf8');
 assert.ok(art.includes("ty==='morcego'&&Boolean(batV4?.drawMonster"));
 assert.ok(art.includes('const creatureV3=!batV4Drawn&&!ravenV4Drawn&&!ravenBatFallback'));
 assert.ok(art.includes('const spriteDim=batV4Drawn?batV4.measure'));
 assert.ok(html.indexOf('/creatures-v3.js')<html.indexOf('/morcego-v4.js'));
 assert.ok(html.indexOf('/morcego-v4.js')<html.indexOf('/art16.js'));
 assert.ok(html.includes('/guild-city-3d.js'));
});

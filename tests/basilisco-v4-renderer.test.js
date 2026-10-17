'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const basilisk=require('../public/basilisco-v4.js'),animations=require('../public/creatures-v3.js');
function harness({desktop=true}={}){
 const images=[];
 class ImageMock{
  constructor(){this.handlers={};this.complete=false;images.push(this)}
  addEventListener(name,fn){this.handlers[name]=fn}
  set src(url){this.url=url}
  load(w,h){this.naturalWidth=w;this.naturalHeight=h;this.handlers.load?.()}
  fail(){this.handlers.error?.()}
 }
 const renderer=basilisk.create({windowRef:{matchMedia:()=>({matches:desktop})},imageCtor:ImageMock,animations});
 const calls=[],g={imageSmoothingEnabled:true,save(){calls.push(['save'])},restore(){calls.push(['restore'])},
  drawImage(...p){calls.push(['drawImage',...p])},
  translate(...p){calls.push(['translate',...p])},scale(...p){calls.push(['scale',...p])}};
 const load=()=>images.forEach((img,i)=>img.load(768,i===4?640:960));
 return {images,renderer,g,calls,load};
}
const monster={type:'basilisco',species:29,x:250,y:320,dir:1};
test('96 native 192x160 frames select four distinct directional atlases',()=>{
 assert.deepEqual(basilisk.FRAME,{width:192,height:160,cols:4,rows:6});
 assert.deepEqual(basilisk.DIRS,['tras','direita','frente','esquerda']);
 const h=harness();
 assert.equal(h.renderer.drawMonster(h.g,monster,0,{}),false,'missing art must fall back');
 h.load();assert.equal(h.renderer.ready,true);
 for(let d=0;d<4;d++){
  h.calls.length=0;assert.equal(h.renderer.drawMonster(h.g,{...monster,dir:d},0,{}),true);
  const call=h.calls.find(x=>x[0]==='drawImage');
  assert.ok(call[1].url.includes(basilisk.DIRS[d]+'.png'),'wrong direction');
  assert.deepEqual(call.slice(2,6),[0,0,192,160]);
  assert.deepEqual(call.slice(-4),[166,180,168,140]);
  assert.equal(h.calls.some(x=>x[0]==='scale'||x[0]==='translate'),false,'no mirroring');
 }
});
test('all rows and columns maintain frame geometry and fixed ground contact',()=>{
 const cases=[{}, {moving:true},{preparing:true},{attacking:true,elapsed:300},{hurt:true,elapsed:160},{dead:true,elapsed:500}];
 for(let boss of [false,true])for(let dir=0;dir<4;dir++)for(let row=0;row<6;row++){
  const h=harness();h.load();h.calls.length=0;
  assert.equal(h.renderer.drawMonster(h.g,{...monster,boss,dir},560,cases[row]),true);
  const body=h.calls.find(x=>x[0]==='drawImage'),dims=h.renderer.measure(boss);
  assert.equal(body[3],row*160);
  assert.deepEqual(body.slice(-4),[Math.round(250-dims.width/2),320-dims.height,dims.width,dims.height]);
  assert.equal(h.calls.at(-1)[0],'restore');
 }
});
test('acid uses separate 4x4 sheet with its own directional row',()=>{
 const h=harness();h.load();
 for(let dir=0;dir<4;dir++){
  h.calls.length=0;assert.equal(h.renderer.drawMonster(h.g,{...monster,dir},300,{attacking:true,elapsed:290}),true);
  const calls=h.calls.filter(x=>x[0]==='drawImage');
  assert.equal(calls.length,2);
  assert.ok(calls[1][1].url.includes('basilisco_v4_acido_fx'));
  assert.equal(calls[1][3],basilisk.FX_ROWS[dir]*160);
  assert.ok(calls[1].at(-2)>calls[0].at(-2));
 }
});
test('missing/mismatched sprites, mobile and other species stay on legacy renderer',()=>{
 const h=harness();h.images[1].load(1,1);
 assert.equal(h.renderer.drawMonster(h.g,monster,0,{}),false);
 const m=harness({desktop:false});assert.equal(m.renderer.drawMonster(m.g,monster,0,{}),false);
 h.load();h.images[4].fail();
 assert.equal(h.renderer.drawMonster(h.g,{...monster,dir:1},0,{}),true);
 assert.equal(h.renderer.drawMonster(h.g,{...monster,type:'lobo',dir:1},0,{}),false);
});
test('2.5D registration keeps guild untouched and retains prior-art fallback',()=>{
 const art=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8'),
       html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 assert.ok(html.indexOf('/sentinela-v4.js')<html.indexOf('/basilisco-v4.js'));
 assert.ok(html.indexOf('/basilisco-v4.js')<html.indexOf('/art16.js'));
 assert.match(art,/const basiliskV4Drawn=ty==='basilisco'&&Boolean\(basiliskV4\?\.drawMonster/);
 assert.match(art,/!sentinelV4Drawn&&!basiliskV4Drawn/);
 assert.match(art,/basiliskV4Drawn\?basiliskV4\.measure\(m\.boss\)/);
 assert.match(art,/ty==='basilisco'\?'serpente':ty/);
});

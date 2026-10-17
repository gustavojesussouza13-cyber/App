'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const raven=require('../public/corvo-v4.js'),poses=require('../public/creatures-v3.js');
const approved={
 tras:['e19fa6c2c36a7164255e98a15a3f660304e6ed4c211fddaecc0d352c495a9d14',960],
 direita:['21d9dba5e5fd7f792152cd1429ee0cd2cb17d29fddf474b6609a660529304905',960],
 frente:['56d5a14b1e1f9bc3e0552dce10dd9d97df1b5abc8f6b19b79fdeca099a9fd2f0',960],
 esquerda:['928fbb2563bd5a723e66ea7a1727290ad1831ca11f56c7824a480bbb942097dc',960],
 ataque_fx:['b77c9fcd767ac8e30cf835782c624ec2d0f8f209e495e0f2fccb3420b6428e8f',640]
};
for(const [name,[sha,height]] of Object.entries(approved)){
 test('Corvo V4 original approved corrected RGBA atlas: '+name,()=>{
  const buf=fs.readFileSync(path.join(__dirname,'../public/assets/creatures-v4','corvo_ocaso_v4_'+name+'.png'));
  assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(buf.readUInt32BE(16),768);
  assert.equal(buf.readUInt32BE(20),height);
  assert.equal(buf[24],8);assert.equal(buf[25],6);
  assert.equal(crypto.createHash('sha256').update(buf).digest('hex'),sha,'must be exactly approved Rev2 PNG');
 });
}
function harness(desktop=true){
 const images=[],calls=[];
 class MockImage{
  constructor(){this.handlers={};this.complete=false;images.push(this)}
  addEventListener(kind,fn){this.handlers[kind]=fn}
  set src(url){this.url=url}
  load(w=768,h=960){this.naturalWidth=w;this.naturalHeight=h;this.handlers.load?.()}
  fail(){this.handlers.error?.()}
 }
 const render=raven.create({windowRef:{matchMedia:()=>({matches:desktop})},imageCtor:MockImage,animations:poses});
 const g={imageSmoothingEnabled:true,save(){calls.push(['save'])},restore(){calls.push(['restore'])},
  drawImage(...args){calls.push(['drawImage',...args])},
  translate(...args){calls.push(['translate',...args])},scale(...args){calls.push(['scale',...args])}};
 const load=()=>images.forEach((img,i)=>img.load(768,i===4?640:960));
 return {images,calls,g,render,load};
}
const corvo={type:'corvo',species:7,x:250,y:320,dir:1};
test('native species-7 Corvo has distinct directions without forced mirroring',()=>{
 assert.deepEqual(raven.DIRS,['tras','direita','frente','esquerda']);
 assert.deepEqual(raven.FRAME,{width:192,height:160,cols:4,rows:6});
 const h=harness();assert.equal(h.render.drawMonster(h.g,corvo,0),false,'missing images must use fallback');
 h.load();assert.equal(h.render.ready,true);
 for(let dir=0;dir<4;dir++){
  h.calls.length=0;assert.equal(h.render.drawMonster(h.g,{...corvo,dir},0),true);
  const body=h.calls.find(x=>x[0]==='drawImage');
  assert.ok(body[1].url.endsWith(raven.DIRS[dir]+'.png?v=corvo-v4-rev2'));
  assert.deepEqual(body.slice(2,6),[0,0,192,160]);
  assert.equal(h.calls.some(x=>x[0]==='scale'||x[0]==='translate'),false);
  assert.equal(h.calls.at(-1)[0],'restore');
 }
});
test('walk, preparation, attack, hurt and death anchor at the same ground level',()=>{
 const states=[{},{moving:true},{preparing:true},{attacking:true,elapsed:280},{hurt:true,elapsed:140},{dead:true,elapsed:500}];
 for(let boss of [false,true])for(let dir=0;dir<4;dir++)for(let row=0;row<6;row++){
  const h=harness();h.load();
  assert.equal(h.render.drawMonster(h.g,{...corvo,dir,boss},560,states[row]),true);
  const draw=h.calls.find(x=>x[0]==='drawImage'),{width,height}=h.render.measure(boss);
  assert.equal(draw[3],row*160);
  assert.deepEqual(draw.slice(-4),[Math.round(250-width/2),320-height,width,height]);
 }
});
test('separated crimson attack effect appears in all four native directions',()=>{
 const h=harness();h.load();assert.equal(h.render.attackReady,true);
 for(let dir=0;dir<4;dir++){
  h.calls.length=0;assert.equal(h.render.drawMonster(h.g,{...corvo,dir},500,{attacking:true,elapsed:290}),true);
  const images=h.calls.filter(x=>x[0]==='drawImage');
  assert.equal(images.length,2,'body + attack only');
  assert.ok(images[1][1].url.includes('corvo_ocaso_v4_ataque_fx'));
  assert.equal(images[1][3],dir*160);
 }
});
test('wrong PNG dimensions or unsupported platform do not erase legacy Raven/Bat',()=>{
 const h=harness();h.images[1].load(100,100);
 assert.equal(h.render.drawMonster(h.g,corvo,100),false);
 h.load();h.images[4].fail();assert.equal(h.render.attackReady,false);
 assert.equal(h.render.drawMonster(h.g,corvo,100),true);
 assert.equal(h.render.drawMonster(h.g,{...corvo,type:'morcego'},100),false);
 const mobile=harness(false);assert.equal(mobile.render.drawMonster(mobile.g,corvo,100),false);
});
test('species 7 is Corvo and keeps remaining family V3 and approved sprite reuses',()=>{
 const art=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 const types=[...art.match(/const types=\[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
 assert.equal(types.length,32);assert.equal(types[2],'morcego');assert.equal(types[7],'corvo');
 assert.equal(types[11],'fantasma');assert.equal(types[14],'fantasma');assert.equal(types[19],'fantasma');
 assert.equal(types[30],'anjo-caido');assert.equal(types[31],'chefe');
 assert.ok(art.includes("const ravenV4Drawn=ty==='corvo'&&Boolean(ravenV4?.drawMonster"));
 assert.ok(art.includes("const batRavenFallback=ty==='corvo'&&!ravenV4Drawn"));
 assert.ok(html.indexOf('/morcego-v4.js')<html.indexOf('/corvo-v4.js'));
 assert.ok(html.indexOf('/corvo-v4.js')<html.indexOf('/serpente-v4.js'));
 assert.ok(html.indexOf('/corvo-v4.js')<html.indexOf('/art16.js'));
});

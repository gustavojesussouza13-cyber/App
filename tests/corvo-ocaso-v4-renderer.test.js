'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const api=require('../public/corvo-ocaso-v4.js'),poses=require('../public/creatures-v3.js');
const root=path.join(__dirname,'../public/assets/creatures-v4');
const approved={
 tras:['e19fa6c2c36a7164255e98a15a3f660304e6ed4c211fddaecc0d352c495a9d14',960],
 direita:['21d9dba5e5fd7f792152cd1429ee0cd2cb17d29fddf474b6609a660529304905',960],
 frente:['56d5a14b1e1f9bc3e0552dce10dd9d97df1b5abc8f6b19b79fdeca099a9fd2f0',960],
 esquerda:['928fbb2563bd5a723e66ea7a1727290ad1831ca11f56c7824a480bbb942097dc',960],
 ataque_fx:['b77c9fcd767ac8e30cf835782c624ec2d0f8f209e495e0f2fccb3420b6428e8f',640]
};
for(const [name,[sha,height]]of Object.entries(approved)){
 test('Corvo V4 approved overlap-corrected RGBA atlas: '+name,()=>{
  const p=path.join(root,'corvo_ocaso_v4_'+name+'.png');
  assert.ok(fs.existsSync(p),'Original PNG missing; block publishing '+name);
  const data=fs.readFileSync(p);
  assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(data.readUInt32BE(16),768);assert.equal(data.readUInt32BE(20),height);
  assert.equal(data[24],8);assert.equal(data[25],6,'8-bit RGBA');
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'),sha);
 });
}
function mock({desktop=true}={}){
 const images=[],calls=[];
 class Img{constructor(){this.ev={};this.complete=false;images.push(this)}
  addEventListener(n,fn){this.ev[n]=fn}set src(v){this.url=v}
  load(w,h){this.naturalWidth=w;this.naturalHeight=h;this.ev.load?.()}
  fail(){this.ev.error?.()}}
 const g={imageSmoothingEnabled:true,save(){calls.push(['save'])},
  restore(){calls.push(['restore'])},drawImage(...p){calls.push(['drawImage',...p])},
  translate(...p){calls.push(['translate',...p])},scale(...p){calls.push(['scale',...p])}};
 const renderer=api.create({windowRef:{matchMedia:()=>({matches:desktop})},imageCtor:Img,animations:poses});
 const load=()=>images.forEach((img,i)=>img.load(768,i===4?640:960));
 return {renderer,images,calls,g,load};
}
const monster={type:'corvo-ocaso',species:7,x:210,y:270,dir:1};
test('Species 7 owns four native directional sprites with no accidental flipping',()=>{
 assert.deepEqual(api.FRAME,{width:192,height:160,cols:4,rows:6});
 assert.deepEqual(api.DIRECTIONS,['tras','direita','frente','esquerda']);
 const h=mock();assert.equal(h.renderer.drawMonster(h.g,monster,0),false);
 h.load();assert.equal(h.renderer.ready,true);
 for(let d=0;d<4;d++){
  h.calls.length=0;assert.equal(h.renderer.drawMonster(h.g,{...monster,dir:d},0),true);
  const body=h.calls.find(x=>x[0]==='drawImage');
  assert.ok(body[1].url.includes(api.DIRECTIONS[d]+'.png'));
  assert.deepEqual(body.slice(2,6),[0,0,192,160]);
  assert.equal(h.calls.some(x=>x[0]==='translate'||x[0]==='scale'),false);
 }
});
test('Four directions and six states retain the same feet-anchored scale',()=>{
 const states=[{}, {moving:true},{preparing:true},{attacking:true,elapsed:275},{hurt:true,elapsed:155},{dead:true,elapsed:550}];
 for(const boss of [false,true])for(let d=0;d<4;d++)for(let row=0;row<6;row++){
  const h=mock();h.load();
  assert.equal(h.renderer.drawMonster(h.g,{...monster,boss,dir:d},500,states[row]),true);
  const call=h.calls.find(x=>x[0]==='drawImage'),size=api.measure(boss);
  assert.equal(call[3],row*160);
  assert.deepEqual(call.slice(-4),[Math.round(monster.x-size.width/2),monster.y-size.height,size.width,size.height]);
  assert.equal(h.calls.at(-1)[0],'restore');
 }
});
test('Attack effects are independently rendered and aligned to four FX rows',()=>{
 const h=mock();h.load();
 for(let d=0;d<4;d++){
  h.calls.length=0;
  assert.equal(h.renderer.drawMonster(h.g,{...monster,dir:d},350,{attacking:true,elapsed:290}),true);
  const draws=h.calls.filter(x=>x[0]==='drawImage');
  assert.equal(draws.length,2);assert.ok(draws[1][1].url.includes('corvo_ocaso_v4_ataque_fx'));
  assert.equal(draws[1][3],d*160);
 }
});
test('Safe fallback to existing Morcego V4 when Corvo art is absent, damaged or disabled',()=>{
 let h=mock();h.images[1].load(23,18);
 assert.equal(h.renderer.drawMonster(h.g,monster,0),false);
 h=mock();h.load();h.images[4].fail();assert.equal(h.renderer.attackReady,false);
 assert.equal(h.renderer.drawMonster(h.g,monster,0),true);
 assert.equal(h.renderer.drawMonster(h.g,{...monster,type:'morcego'},0),false);
 h=mock({desktop:false});assert.equal(h.renderer.drawMonster(h.g,monster,0),false);
});
test('Corvo alone replaces species 7 without changing existing Morcego, V3, Anjo or Aurora boss',()=>{
 const art=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 const types=[...(art.match(/const types=\[([^\]]+)\]/)[1]).matchAll(/'([^']+)'/g)].map(x=>x[1]);
 assert.equal(types[2],'morcego');
 assert.equal(types[7],'corvo-ocaso');
 assert.equal(types[30],'anjo-caido');assert.equal(types[31],'chefe');
 assert.match(art,/const ravenV4Drawn=ty==='corvo-ocaso'&&Boolean\(duskRavenV4\?\.drawMonster/);
 assert.match(art,/const ravenBatFallback=ty==='corvo-ocaso'&&!ravenV4Drawn/);
 assert.ok(html.indexOf('/morcego-v4.js')<html.indexOf('/corvo-ocaso-v4.js'));
 assert.ok(html.indexOf('/corvo-ocaso-v4.js')<html.indexOf('/art16.js'));
});

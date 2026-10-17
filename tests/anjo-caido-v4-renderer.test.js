'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const angel=require('../public/anjo-caido-v4.js'),poses=require('../public/creatures-v3.js');
const atlasDir=path.join(__dirname,'../public/assets/creatures-v4');
const sourceHashes={
 frente:['0e31805e1496ca5b0a72dd0155e726f56a9314ea17eec03a5bf51d5260010c41',960],
 tras:['c3d996fc4db17a3aa75faf9caeab8fe00b733f8ea9817ddc5897039f9c3b0c02',960],
 direita:['d704ab4a7fa36966a32ad8dd9dec56f35ec6b69d84a177eaa2b9e9066bf04bb6',960],
 esquerda:['0a0cf515564e3b87b3f6b79921c175896de6afef57cb95261bdad10293d255f5',960],
 magia_fx:['e2af01517f43a6ff787d10af3838e5a0db0a96a223a93f4d01f2dc9a4b0e5bc2',640]
};
for(const [name,[sha,height]]of Object.entries(sourceHashes)){
 test('Anjo Caído V4 approved PNG preserved without re-encoding: '+name,()=>{
  const data=fs.readFileSync(path.join(atlasDir,'anjo_caido_v4_'+name+'.png'));
  assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(data.readUInt32BE(16),768);assert.equal(data.readUInt32BE(20),height);
  assert.equal(data[24],8);assert.equal(data[25],6,'RGBA transparent PNG');
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'),sha);
 });
}
function harness({desktop=true}={}){
 const images=[],calls=[];
 class MockImage{
  constructor(){this.handlers={};this.complete=false;images.push(this)}
  addEventListener(name,cb){this.handlers[name]=cb}
  set src(v){this.url=v}
  load(w,h){this.naturalWidth=w;this.naturalHeight=h;this.handlers.load?.()}
  fail(){this.handlers.error?.()}
 }
 const renderer=angel.create({windowRef:{matchMedia:()=>({matches:desktop})},imageCtor:MockImage,animations:poses});
 const g={imageSmoothingEnabled:true,save(){calls.push(['save'])},restore(){calls.push(['restore'])},
  drawImage(...a){calls.push(['drawImage',...a])},translate(...a){calls.push(['translate',...a])},
  scale(...a){calls.push(['scale',...a])}};
 const load=()=>images.forEach((img,i)=>img.load(768,i===4?640:960));
 return {images,calls,g,renderer,load};
}
const m={type:'anjo-caido',species:30,x:250,y:320,dir:1};
test('Anjo Caído V4 uses four independent native directional sheets and fixed 192x160 source',()=>{
 assert.deepEqual(angel.FRAME,{width:192,height:160,cols:4,rows:6});
 assert.deepEqual(angel.DIRS,['tras','direita','frente','esquerda']);
 const h=harness();assert.equal(h.renderer.drawMonster(h.g,m,0,{}),false);
 h.load();assert.equal(h.renderer.ready,true);
 for(let dir=0;dir<4;dir++){
  h.calls.length=0;assert.equal(h.renderer.drawMonster(h.g,{...m,dir},0,{}),true);
  const body=h.calls.find(x=>x[0]==='drawImage');
  assert.ok(body[1].url.includes(angel.DIRS[dir]+'.png'));
  assert.deepEqual(body.slice(2,6),[0,0,192,160]);
  assert.equal(h.calls.some(x=>x[0]==='translate'||x[0]==='scale'),false,'no unintentional mirror');
 }
});
test('attack, hurt, death and walk retain identical world-anchored normal/boss geometry',()=>{
 const states=[{}, {moving:true},{preparing:true},{attacking:true,elapsed:280},{hurt:true,elapsed:160},{dead:true,elapsed:480}];
 for(let boss of [false,true])for(let dir=0;dir<4;dir++)for(let row=0;row<6;row++){
  const h=harness();h.load();
  assert.equal(h.renderer.drawMonster(h.g,{...m,boss,dir},500,states[row]),true);
  const body=h.calls.find(x=>x[0]==='drawImage'),dims=angel.measure(boss);
  assert.equal(body[3],row*160);
  assert.deepEqual(body.slice(-4),[Math.round(m.x-dims.width/2),m.y-dims.height,dims.width,dims.height]);
  assert.equal(h.calls.at(-1)[0],'restore');
 }
});
test('independent magic FX is visible in all four attack directions',()=>{
 const h=harness();h.load();assert.deepEqual(angel.FX_ROWS,[0,1,2,3]);
 for(let dir=0;dir<4;dir++){
  h.calls.length=0;
  assert.equal(h.renderer.drawMonster(h.g,{...m,dir},300,{attacking:true,elapsed:290}),true);
  const images=h.calls.filter(x=>x[0]==='drawImage');
  assert.equal(images.length,2,'one body and one spell only');
  assert.ok(images[1][1].url.includes('anjo_caido_v4_magia_fx'));
  assert.equal(images[1][3],dir*160);
 }
});
test('corrupt or unavailable atlas, mobile or unrelated species retain fallback art',()=>{
 const h=harness();h.images[1].load(1,1);
 assert.equal(h.renderer.drawMonster(h.g,m,0),false);
 h.load();h.images[4].fail();
 assert.equal(h.renderer.magicReady,false);
 assert.equal(h.renderer.drawMonster(h.g,m,0),true);
 assert.equal(h.renderer.drawMonster(h.g,{...m,type:'fantasma'},0),false);
 const mobile=harness({desktop:false});
 assert.equal(mobile.renderer.drawMonster(mobile.g,m,0),false);
});
test('species 30 alone gets the V4 angel; Espírito Nebuloso and Espectro still use Fantasma',()=>{
 const art=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 const mapping=art.match(/const types=\[([^\]]+)\]/);
 const types=[...mapping[1].matchAll(/'([^']+)'/g)].map(v=>v[1]);
 assert.equal(types[11],'fantasma');assert.equal(types[14],'fantasma');assert.equal(types[19],'fantasma');
 assert.equal(types[30],'anjo-caido');
 assert.ok(art.includes("const angelV4Drawn=ty==='anjo-caido'&&Boolean(fallenAngelV4?.drawMonster"));
 assert.ok(art.includes("const ghostAngelFallback=ty==='anjo-caido'&&!angelV4Drawn"));
 assert.ok(html.indexOf('/basilisco-v4.js')<html.indexOf('/anjo-caido-v4.js'));
 assert.ok(html.indexOf('/anjo-caido-v4.js')<html.indexOf('/art16.js'));
});

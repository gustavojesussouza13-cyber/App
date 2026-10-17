'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const api=require('../public/elemental-agua-v4.js'),poses=require('../public/creatures-v3.js');
const approved={
 tras:['d6e1d9e07695d36705ac678d767b01d2baa02a7f0d101af79a08793e218bf7fc',960],
 direita:['7308684de4dd146678efb321bec5110da786b364bd4ffebc935e09a0ce1bfd10',960],
 frente:['25e3f4dfdc54beb3c94368ba77776d1fd604b8939a09920f15f45bc84cf56864',960],
 esquerda:['e13a2c6ad99e94cd1adc8d21b4a03d74faf3ca2b9a8dce42ab008c004066a1ec',960],
 ataque_fx:['ceef2214e00b29e73d67137b8cc16cdb23a2350d2799a653d7fe5a395db7cf71',640]
};
for(const [name,[sha,h]]of Object.entries(approved)){
 test('Elemental da Água: approved original transparent PNG '+name,()=>{
  const data=fs.readFileSync(path.resolve(__dirname,'../public/assets/creatures-v4/elemental_agua_v4_'+name+'.png'));
  assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(data.readUInt32BE(16),768);assert.equal(data.readUInt32BE(20),h);
  assert.equal(data[24],8);assert.equal(data[25],6,'RGBA without image recompression');
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'),sha);
 });
}
function harness(desktop=true){
 const images=[],calls=[];
 class MockImage{
  constructor(){this.handlers={};this.complete=false;images.push(this)}
  addEventListener(type,cb){this.handlers[type]=cb}
  set src(v){this.url=v}
  load(w=768,h=960){this.naturalWidth=w;this.naturalHeight=h;this.handlers.load?.()}
  fail(){this.handlers.error?.()}
 }
 const render=api.create({windowRef:{matchMedia:()=>({matches:desktop})},imageCtor:MockImage,animations:poses});
 const ctx={imageSmoothingEnabled:true,save(){calls.push(['save'])},restore(){calls.push(['restore'])},drawImage(...x){calls.push(['drawImage',...x])},scale(){calls.push(['scale'])},translate(){calls.push(['translate'])}};
 return {render,ctx,images,calls,load(){images.forEach((z,i)=>z.load(768,i===4?640:960))}};
}
const elemental={type:'elemental-agua',species:23,dir:1,x:260,y:330};
test('water V4 has four native 192x160 directions with no mirroring',()=>{
 assert.deepEqual(api.FRAME,{width:192,height:160,cols:4,rows:6});
 assert.deepEqual(api.DIRS,['tras','direita','frente','esquerda']);
 const h=harness();assert.equal(h.render.drawMonster(h.ctx,elemental,0),false);
 h.load();assert.equal(h.render.ready,true);
 for(let dir=0;dir<4;dir++){
  h.calls.length=0;assert.equal(h.render.drawMonster(h.ctx,{...elemental,dir},0,{}),true);
  const img=h.calls.find(c=>c[0]==='drawImage');assert.ok(img[1].url.includes(api.DIRS[dir]+'.png'));
  assert.deepEqual(img.slice(2,6),[0,0,192,160]);
  assert.equal(h.calls.some(c=>c[0]==='scale'||c[0]==='translate'),false);
  assert.equal(h.calls.at(-1)[0],'restore');
 }
});
test('water V4 attack, walking, hurt and death never change sprite position or scale',()=>{
 const states=[{}, {moving:true},{preparing:true},{attacking:true,elapsed:280},{hurt:true,elapsed:140},{dead:true,elapsed:500}];
 for(let boss of [false,true])for(let dir=0;dir<4;dir++)for(let row=0;row<6;row++){
  const h=harness();h.load();h.render.drawMonster(h.ctx,{...elemental,dir,boss},560,states[row]);
  const draw=h.calls.find(c=>c[0]==='drawImage'),{width,height}=h.render.measure(boss);
  assert.ok(draw);
  assert.equal(draw[3],row*160);
  assert.deepEqual(draw.slice(-4),[Math.round(elemental.x-width/2),elemental.y-height,width,height]);
  assert.equal(h.calls.at(-1)[0],'restore');
 }
});
test('water attack effect has four independent directions and can fail without losing creature',()=>{
 const h=harness();h.load();
 for(let dir=0;dir<4;dir++){
  h.calls.length=0;assert.equal(h.render.drawMonster(h.ctx,{...elemental,dir},500,{attacking:true,elapsed:280}),true);
  const images=h.calls.filter(c=>c[0]==='drawImage');
  assert.equal(images.length,2,'sprite and wave effect');
  assert.ok(images[1][1].url.includes('elemental_agua_v4_ataque_fx'));
  assert.equal(images[1][3],dir*160);
 }
 h.images[4].fail();assert.equal(h.render.attackReady,false);
 assert.equal(h.render.drawMonster(h.ctx,elemental,800,{}),true);
});
test('water atlas missing or invalid falls back; unrelated Serpente never uses Elemental sprite',()=>{
 const h=harness();h.images[1].load(5,5);
 assert.equal(h.render.drawMonster(h.ctx,elemental,100),false);
 h.load();assert.equal(h.render.drawMonster(h.ctx,{...elemental,type:'serpente'},100),false);
 assert.equal(harness(false).render.drawMonster(h.ctx,elemental,100),false);
});
test('only species 23 has exclusive elemental art with Serpente V4 fallback',()=>{
 const art=fs.readFileSync(path.resolve(__dirname,'../public/art16.js'),'utf8');
 const html=fs.readFileSync(path.resolve(__dirname,'../public/mundo.html'),'utf8');
 const types=[...art.match(/const types=\[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
 assert.equal(types.length,32);assert.equal(types[6],'serpente');assert.equal(types[23],'elemental-agua');
 assert.equal(types[9],'espinho-vivo');assert.equal(types[30],'anjo-caido');
 assert.equal(types[11],'fantasma');assert.equal(types[14],'fantasma');assert.equal(types[19],'fantasma');
 assert.ok(art.includes("const waterV4Drawn=ty==='elemental-agua'&&Number(m.species)===23&&Boolean(waterElementalV4?.drawMonster"));
 assert.ok(art.includes("const waterSerpentFallback=ty==='elemental-agua'&&!waterV4Drawn&&Boolean(serpentV4?.drawMonster"));
 assert.ok(art.includes('!waterV4Drawn&&!waterSerpentFallback&&Boolean(creaturesV3?.drawMonster'));
 assert.ok(html.indexOf('/serpente-v4.js')<html.indexOf('/elemental-agua-v4.js'));
 assert.ok(html.indexOf('/elemental-agua-v4.js')<html.indexOf('/art16.js'));
});

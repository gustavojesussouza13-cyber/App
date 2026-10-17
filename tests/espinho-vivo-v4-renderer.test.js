'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const api=require('../public/espinho-vivo-v4.js'),poses=require('../public/creatures-v3.js');
const root=path.join(__dirname,'../public/assets/creatures-v4');
const hashes={
 tras:['8de486f6830f6356f1ddf26c5fcc8c8ba6a0769e7ab37221c6a3c10a88d90a2d',960],
 direita:['ee613a5e74d63c030760a5f42e71002af2ee93e5e5cdff431ea1368790988249',960],
 frente:['59bab7215077ea00eb11bdb44525f05dbde2770d72e64835bf9c6eecaba5255c',960],
 esquerda:['b89ef87984df3ef440b52c5cb3331de68bf1adbc45412b09946bd5a8941adcb7',960],
 ataque_fx:['473c1b426431dc0a41756b43ea83ad7979975b2ba2232f0d17b12c7cdee13710',640]
};
for(const [name,[sha,height]]of Object.entries(hashes)){
 test('Espinho Vivo V4 original approved RGBA spritesheet: '+name,()=>{
  const filename=path.join(root,'espinho_vivo_v4_'+name+'.png');
  const buf=fs.readFileSync(filename);
  assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(buf.readUInt32BE(16),768);assert.equal(buf.readUInt32BE(20),height);
  assert.equal(buf[24],8);assert.equal(buf[25],6,'8-bit RGBA PNG required');
  assert.equal(crypto.createHash('sha256').update(buf).digest('hex'),sha);
 });
}
function harness({desktop=true}={}){
 const imgs=[],calls=[];
 class Img{
  constructor(){this.listeners={};imgs.push(this);this.complete=false}
  addEventListener(type,fn){this.listeners[type]=fn}
  set src(url){this.url=url}
  load(w=768,h=960){this.naturalWidth=w;this.naturalHeight=h;this.listeners.load?.()}
  fail(){this.listeners.error?.()}
 }
 const g={save(){calls.push(['save'])},restore(){calls.push(['restore'])},
  drawImage(...args){calls.push(['drawImage',...args])},
  translate(...args){calls.push(['translate',...args])},scale(...args){calls.push(['scale',...args])}};
 const renderer=api.create({windowRef:{matchMedia:()=>({matches:desktop})},imageCtor:Img,animations:poses});
 const load=()=>imgs.forEach((im,i)=>im.load(768,i===4?640:960));
 return {renderer,imgs,g,calls,load};
}
const monster={type:'espinho-vivo',species:9,x:210,y:275,dir:1};
test('Espinho Vivo V4 uses four independent 192x160 directional sheets',()=>{
 assert.deepEqual(api.FRAME,{width:192,height:160,cols:4,rows:6});
 assert.deepEqual(api.DIRECTIONS,['tras','direita','frente','esquerda']);
 const h=harness();assert.equal(h.renderer.drawMonster(h.g,monster,0),false);
 h.load();assert.equal(h.renderer.ready,true);
 for(let dir=0;dir<4;dir++){
  h.calls.length=0;
  assert.equal(h.renderer.drawMonster(h.g,{...monster,dir},0),true);
  const body=h.calls.find(x=>x[0]==='drawImage');
  assert.ok(body[1].url.includes('espinho_vivo_v4_'+api.DIRECTIONS[dir]+'.png'));
  assert.deepEqual(body.slice(2,6),[0,0,192,160]);
  assert.equal(h.calls.some(x=>['translate','scale'].includes(x[0])),false);
 }
});
test('All animations maintain grounded visual scale including boss 145%',()=>{
 const states=[{}, {moving:true},{preparing:true},{attacking:true,elapsed:290},{hurt:true,elapsed:150},{dead:true,elapsed:550}];
 for(let boss of [false,true])for(let dir=0;dir<4;dir++)for(let row=0;row<6;row++){
  const h=harness();h.load();
  assert.equal(h.renderer.drawMonster(h.g,{...monster,dir,boss},500,states[row]),true);
  const call=h.calls.find(x=>x[0]==='drawImage'),dims=api.measure(boss);
  assert.equal(call[3],row*160);
  assert.deepEqual(call.slice(-4),[Math.round(monster.x-dims.width/2),monster.y-dims.height,dims.width,dims.height]);
  assert.equal(h.calls.at(-1)[0],'restore');
 }
});
test('Thorn attacks draw independent FX in all four directions',()=>{
 const h=harness();h.load();
 for(let dir=0;dir<4;dir++){
  h.calls.length=0;
  assert.equal(h.renderer.drawMonster(h.g,{...monster,dir},400,{attacking:true,elapsed:290}),true);
  const calls=h.calls.filter(x=>x[0]==='drawImage');
  assert.equal(calls.length,2);assert.ok(calls[1][1].url.includes('espinho_vivo_v4_ataque_fx'));
  assert.equal(calls[1][3],dir*160);
 }
});
test('Failed assets, missing FX and unsupported platforms do not hide the Fera fallback',()=>{
 let h=harness();h.imgs[1].load(10,10);
 assert.equal(h.renderer.drawMonster(h.g,monster,0),false);
 h=harness();h.load();h.imgs[4].fail();assert.equal(h.renderer.attackReady,false);
 assert.equal(h.renderer.drawMonster(h.g,monster,0),true);
 assert.equal(h.renderer.drawMonster(h.g,{...monster,type:'fera'},0),false);
 h=harness({desktop:false});assert.equal(h.renderer.drawMonster(h.g,monster,0),false);
});
test('Only species 9 changes; Fera species 25 and five preserved V3 families remain',()=>{
 const art=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 const types=[...art.match(/const types=\[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
 assert.equal(types.length,32);
 assert.equal(types[9],'espinho-vivo');
 assert.equal(types[25],'fera');
 assert.deepEqual([0,1,3,4,5].map(i=>types[i]),['limo','lobo','esqueleto','aranha','golem']);
 assert.equal(types[7],'corvo-ocaso');assert.equal(types[30],'anjo-caido');assert.equal(types[31],'chefe');
 assert.ok(art.includes("const thornV4Drawn=ty==='espinho-vivo'&&Number(m.species)===9&&Boolean(livingThornV4?.drawMonster"));
 assert.ok(art.includes("const thornBeastFallback=ty==='espinho-vivo'&&!thornV4Drawn&&Boolean(beastV4?.drawMonster"));
 assert.ok(html.indexOf('/fera-v4.js')<html.indexOf('/espinho-vivo-v4.js'));
 assert.ok(html.indexOf('/espinho-vivo-v4.js')<html.indexOf('/art16.js'));
});

'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const pub=path.resolve(__dirname,'../public'),api=require('../public/salamandra-v4.js'),poses=require('../public/creatures-v3.js');
const names=['tras','direita','frente','esquerda'];
const generated=path.resolve(pub,'assets/creatures-v4');
let built=false;
function ensure(){if(!built){execFileSync(process.execPath,[path.resolve(__dirname,'../scripts/build-salamandra-v4-atlas.js')],{timeout:20000});built=true}}
function open(dir){ensure();return fs.readFileSync(path.resolve(generated,'salamandra_v4_'+dir+'.png'))}
function png(p){
 assert.equal(p.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const width=p.readUInt32BE(16),height=p.readUInt32BE(20);
 assert.equal(p[24],8);assert.equal(p[25],6,'PNG RGBA');
 let offset=8,parts=[];while(offset<p.length){const n=p.readUInt32BE(offset),tag=p.toString('ascii',offset+4,offset+8);
  if(tag==='IDAT')parts.push(p.subarray(offset+8,offset+8+n));
  offset+=12+n;if(tag==='IEND')break;
 }
 return {width,height,raw:zlib.inflateSync(Buffer.concat(parts))};
}
test('Salamandra 32 has 4 distinct native directions, transparent RGBA, 24 technical cells each',()=>{
 const hashes=new Set();
 for(const dir of names){
  const p=open(dir),sheet=png(p);hashes.add(crypto.createHash('sha256').update(p).digest('hex'));
  assert.deepEqual([sheet.width,sheet.height],[768,960]);
  const stride=1+768*4;assert.equal(sheet.raw.length,960*stride);
  for(let row=0;row<6;row++){
   const frames=new Set();
   for(let col=0;col<4;col++){
    const arr=Buffer.alloc(192*160*4),frameStride=192*4;
    for(let y=0;y<160;y++){
     const off=(row*160+y)*stride+1+col*frameStride;
     sheet.raw.copy(arr,y*frameStride,off,off+frameStride);
    }
    let visible=0;for(let k=3;k<arr.length;k+=4)if(arr[k])visible++;
    assert.ok(visible>50,'nonempty frame '+dir+'/'+row+'/'+col);
    frames.add(crypto.createHash('sha1').update(arr).digest('hex'));
   }
   assert.equal(frames.size,4,'four different technical frames in row '+row+' '+dir);
  }
 }
 assert.equal(hashes.size,4,'four independently authored directional bases');
 const fx=png(open('ataque_fx'));assert.deepEqual([fx.width,fx.height],[768,640]);
});
function harness(){
 const images=[],events=[];
 class Img{
  constructor(){this.handlers={};this.complete=false;images.push(this)}
  addEventListener(e,f){this.handlers[e]=f}
  set src(s){this.url=s}
  load(w=768,h=960){this.naturalWidth=w;this.naturalHeight=h;this.handlers.load?.()}
 }
 const renderer=api.create({windowRef:{matchMedia:()=>({matches:true})},imageCtor:Img,animation:poses});
 const g={imageSmoothingEnabled:true,save(){events.push(['save'])},restore(){events.push(['restore'])},drawImage(...a){events.push(['draw',...a])}};
 return {images,events,g,renderer,load(){images.forEach((i,n)=>i.load(768,n===4?640:960))}};
}
test('Salamandra renderer uses only species 32, no mirroring, aligned ground, separate attack FX',()=>{
 const h=harness(),monster={species:32,type:'salamandra',x:256,y:340};
 assert.equal(h.renderer.drawMonster(h.g,{...monster,dir:2},0),false);
 h.load();assert.equal(h.renderer.ready,true);
 for(let dir=0;dir<4;dir++){
  h.events.length=0;
  assert.equal(h.renderer.drawMonster(h.g,{...monster,dir},600,{type:'salamandra',attacking:true,elapsed:250}),true);
  const draws=h.events.filter(x=>x[0]==='draw');assert.equal(draws.length,2);
  assert.ok(draws[0][1].url.includes(names[dir]));
  assert.deepEqual(draws[0].slice(3,6),[3*160,192,160]);
  assert.deepEqual(draws[0].slice(-4),[256-76,340-142,152,142]);
  assert.equal(draws[1][3],dir*160,'FX direction row');
  assert.equal(h.events.at(-1)[0],'restore');
 }
 h.events.length=0;assert.equal(h.renderer.drawMonster(h.g,{...monster,species:23},600),false);
 assert.equal(h.renderer.drawMonster(h.g,{...monster,type:'limo'},600),false);
});
test('Salamandra remains isolated: no existing monster ID, fortress, V3 or official game edited',()=>{
 const files=['creatures-v3.js','art16.js','mundo.html'];
 const contents=files.map(f=>fs.readFileSync(path.join(pub,f),'utf8'));
 assert.ok(contents[0].includes("['limo','lobo','aranha','esqueleto','golem']"));
 const match=contents[1].match(/const types=\[([^\]]+)\]/);
 assert.ok(match);assert.equal([...match[1].matchAll(/'[^']+'/g)].length,32);
 for(const v of contents){assert.ok(!v.includes('/salamandra-v4.js'));assert.ok(!v.includes('salamandra_v4_'))}
 assert.equal(api.SPECIES,32);
 assert.ok(fs.readFileSync(path.join(pub,'laboratorio-salamandra-v4-tecnico.html'),'utf8').includes('variações procedurais'));
});

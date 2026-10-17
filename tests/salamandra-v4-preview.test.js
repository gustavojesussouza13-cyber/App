'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib');
const read=p=>fs.readFileSync(path.join(__dirname,'../public',p),'utf8');
const src=read('salamandra-v4-preview.js');
const sandbox={window:{}};vm.runInNewContext(src,sandbox,{timeout:300});
const preview=sandbox.window.OsPeregrinosSalamanderV4Preview;
function verifyPng(png){
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(png.readUInt32BE(16),64);
 assert.equal(png.readUInt32BE(20),80);
 let pos=8,parts=[];
 while(pos+12<=png.length){
  let size=png.readUInt32BE(pos),kind=png.toString('ascii',pos+4,pos+8);
  assert.ok(size>=0&&pos+12+size<=png.length);
  if(kind==='IDAT')parts.push(png.subarray(pos+8,pos+8+size));
  pos+=size+12;if(kind==='IEND')break;
 }
 assert.ok(parts.length>0);assert.ok(zlib.inflateSync(Buffer.concat(parts)).length>0);
}
test('Salamandra V4 — independent source art for four views',()=>{
 assert.equal(preview.directions.length,4);
 const images=new Set();
 for(const name of ['tras','direita','frente','esquerda']){
  const uri=preview.images[name];
  assert.ok(uri.startsWith('data:image/png;base64,'));
  const png=Buffer.from(uri.split(',')[1],'base64');verifyPng(png);
  images.add(png.toString('base64'));
 }
 assert.equal(images.size,4,'no mirroring and no reused source images');
});
test('Salamandra art preview stays separate from live game and fortress',()=>{
 const h=read('laboratorio-salamandra-v4.html');
 assert.ok(h.includes('salamandra-v4-preview.js'));
 assert.ok(h.includes('simulação técnica'));
 const official=read('mundo.html');
 assert.ok(!official.includes('salamandra-v4-preview.js'));
 assert.ok(!official.includes('laboratorio-salamandra-v4.html'));
 assert.ok(official.includes('/salamandra-v4.js?v=salamandra-v4-game-experimental-1'));
 assert.ok(!official.includes('/salamandra-v4-preview.js'));
 const v3=read('creatures-v3.js');
 assert.ok(v3.includes("['limo','lobo','aranha','esqueleto','golem']"));
 assert.ok(!v3.toLowerCase().includes('salamandra'));
});

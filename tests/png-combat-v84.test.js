'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {decode,encode}=require('../scripts/png-rgba-v84');
const {buildClass,CLASSES}=require('../scripts/build-full-body-v84-atlas');
test('V8.4 PNG codec decodes ORIGINAL indexed and RGBA class sheets losslessly',()=>{
 for(const [role,meta] of Object.entries(CLASSES)){
  const source=decode(fs.readFileSync(path.join(__dirname,'../public',meta.file)));
  assert.equal(source.width,meta.w*meta.cols);assert.equal(source.height,meta.h*meta.rows);
  assert.ok(source.rgba.some((v,i)=>i%4===3&&v===0),'transparent background retained');
  assert.ok(source.rgba.some((v,i)=>i%4===3&&v===255),'painted body retained');
  const encoded=encode(source.width,source.height,source.rgba),restored=decode(encoded);
  assert.deepEqual(restored.rgba,source.rgba,'RGBA roundtrip exact '+role);
 }
});
test('V8.4 exports actual strict 6×4 PNG assets of the four real full-body sprites',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'os-peregrinos-v84-'));
 try{
  for(const [role,meta] of Object.entries(CLASSES)){
   const result=buildClass(role,{directory:dir});
   assert.deepEqual([result.width,result.height],[meta.w*6,meta.h*4]);
   const bytes=fs.readFileSync(result.target);
   assert.deepEqual(Array.from(bytes.subarray(0,8)),[137,80,78,71,13,10,26,10]);
   const data=decode(bytes);
   assert.deepEqual([data.width,data.height],[meta.w*6,meta.h*4]);
   const pixels=data.rgba;
   assert.ok(pixels.some((v,i)=>i%4===3&&v>0),'body actually drawn');
   const cellSize=meta.w*meta.h*4;
   const sample=(phase)=>{
    const arr=[];
    for(let y=0;y<meta.h;y++)for(let x=0;x<meta.w;x++){
     const i=(y*data.width+phase*meta.w+x)*4;
     arr.push(pixels[i],pixels[i+1],pixels[i+2],pixels[i+3]);
    }
    return arr;
   };
   assert.notDeepEqual(sample(0),sample(1),'whole-body poses not identical '+role);
   assert.ok(cellSize>16000);
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

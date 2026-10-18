'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {decode}=require('../scripts/png-rgba-v84');
const {sanitize,build}=require('../scripts/build-peregrino-v86-atlas');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('V8.6 uses the approved real 44-frame PNG, removes only 879 residual floor pixels without rescaling',()=>{
 const raw=decode(fs.readFileSync(path.join(root,'public/assets/peregrino/peregrino-nova-estetica-v85-64x80.png')));
 assert.deepEqual([raw.width,raw.height],[256,880]);
 const after=sanitize(raw);
 const changed=[];let removed=0,added=0;
 for(let i=0;i<raw.rgba.length;i+=4){
  if(raw.rgba[i+3]===0&&after.rgba[i+3]!==0)added++;
  if(raw.rgba[i+3]!==0&&after.rgba[i+3]===0){removed++;changed.push(Math.floor(i/4));}
  if(after.rgba[i+3]!==0)for(let k=0;k<4;k++)
   assert.equal(after.rgba[i+k],raw.rgba[i+k],'never repaint approved character pixels');
 }
 assert.equal(removed,879,'matches approved V8.6 cleanup baseline');
 assert.equal(added,0,'never invent nontransparent image pixels');
 for(const px of changed){
  const x=px%256,y=Math.floor(px/256);
  assert.ok(y%80>=69&&y%80<=78,'removed only residual bottom-border pixels');
  assert.ok(x>=0&&x<256);
 }
 for(let row=0;row<11;row++)for(let dir=0;dir<4;dir++){
  let count=0,border=0;
  for(let y=0;y<80;y++)for(let x=0;x<64;x++){
   const a=after.rgba[((row*80+y)*256+dir*64+x)*4+3];
   if(a>10)count++;
   if((y===0||y===79||x===0||x===63)&&a>10)border++;
  }
  assert.ok(count>=600,'complete figure retains pixels '+row+'/'+dir);
  assert.equal(border,0,'never crop figure '+row+'/'+dir);
 }
});
test('V8.6 creates an ACTUAL decoding PNG at the exact path the world/lab now loads',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrino-engine-v86-'));
 try{
  const file=path.join(dir,'peregrino-v86.png');
  const result=build({dest:file});
  assert.equal(result.removedPixels,879);
  const image=decode(fs.readFileSync(file));
  assert.deepEqual([image.width,image.height],[256,880]);
  const renderer=read('public/peregrino-nova-estetica-v85.js');
  const lab=read('public/laboratorio-peregrino-v85.html');
  const packageJSON=JSON.parse(read('package.json'));
  assert.ok(renderer.includes('/assets/peregrino/peregrino-motor-v86-64x80-rgba.png'));
  assert.ok(lab.includes('/assets/peregrino/peregrino-motor-v86-64x80-rgba.png'));
  assert.ok(packageJSON.scripts.prestart.includes('node scripts/build-peregrino-v86-atlas.js'));
 }finally{fs.rmSync(dir,{force:true,recursive:true})}
});

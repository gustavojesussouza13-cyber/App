'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');
const healer=require('../public/curandeiro-v4-experimental.js');
function pixels(file,expectedRows){
 const png=fs.readFileSync(path.join(root,'public/assets/curandeiro-v4',file));
 assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 let width=0,height=0,kind=-1,raw=[],transparent=null;
 for(let pos=8;pos<png.length;){
  const size=png.readUInt32BE(pos),id=png.toString('ascii',pos+4,pos+8);
  const data=png.subarray(pos+8,pos+8+size);pos+=12+size;
  if(id==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);kind=data[9];}
  if(id==='IDAT')raw.push(data);
  if(id==='tRNS')transparent=data;
  if(id==='IEND')break;
 }
 assert.equal(width,2048);assert.equal(height,expectedRows*160);
 assert.equal(kind,3,'palette-indexed PNG with transparency must remain browser-decodable');
 assert.ok(transparent?.length>0,'image needs actual transparency');
 const bytes=zlib.inflateSync(Buffer.concat(raw));
 const pix=Buffer.alloc(width*height);let last=Buffer.alloc(width),read=0;
 for(let y=0;y<height;y++){
  const filter=bytes[read++],row=Buffer.alloc(width);
  for(let x=0;x<width;x++){
   const a=x?row[x-1]:0,b=last[x],c=x?last[x-1]:0;
   let v=0;
   if(filter===1)v=a;
   else if(filter===2)v=b;
   else if(filter===3)v=Math.floor((a+b)/2);
   else if(filter===4){const p=a+b-c;const aa=Math.abs(p-a),bb=Math.abs(p-b),cc=Math.abs(p-c);v=aa<=bb&&aa<=cc?a:bb<=cc?b:c;}
   else assert.equal(filter,0);
   row[x]=(bytes[read++]+v)&255;
  }
  row.copy(pix,y*width);last=row;
 }
 return {width,height,pix,transparent};
}
function cellInfo(png,col,row){
 const data=Buffer.alloc(256*160);let opaque=0;
 for(let y=0;y<160;y++){
  for(let x=0;x<256;x++){
   const b=png.pix[(row*160+y)*png.width+col*256+x];
   data[y*256+x]=b;if((png.transparent[b]??255)>25)opaque++;
  }
 }
 return {opaque,hash:crypto.createHash('sha256').update(data).digest('hex')};
}
test('Curandeiro V4: every walking direction has eight distinct complete transparent frames',()=>{
 const atlas=pixels('curandeiro-v4-caminhada-8x4.png',4);
 for(let row=0;row<4;row++){
  const signatures=new Set();
  for(let col=0;col<8;col++){
   const info=cellInfo(atlas,col,row);
   assert.ok(info.opaque>1600,`sprite walk ${row}:${col} missing`);
   signatures.add(info.hash);
  }
  assert.equal(signatures.size,8,`direction ${row} requires 8 different frames`);
 }
});
test('Curandeiro V4: healing, attack, hurt, and death are separate art poses, not old fallback',()=>{
 const atlas=pixels('curandeiro-v4-acoes-8x5-limpo.png',5);
 for(const [row,required] of [[1,8],[2,8],[3,4],[4,4]]){
  const hashes=new Set();for(let col=0;col<required;col++){
   const q=cellInfo(atlas,col,row);assert.ok(q.opaque>1200);hashes.add(q.hash);
  }
  assert.equal(hashes.size,required,`action row ${row}`);
 }
});
test('Curandeiro V4 animation and palette API map all available actions to expected rows',()=>{
 assert.equal(healer.WALK_FRAMES,8);
 assert.equal(healer.plan({action:'walk',dir:0,frame:7}).row,0);
 assert.equal(healer.plan({action:'walk',dir:1,frame:7}).row,1);
 assert.equal(healer.plan({action:'walk',dir:2,frame:7}).row,2);
 assert.equal(healer.plan({action:'walk',dir:3,frame:7}).row,3);
 assert.equal(healer.plan({action:'heal',elapsed:770}).row,2);
 assert.equal(healer.plan({action:'skill',elapsed:440}).row,2);
 assert.equal(healer.plan({action:'attack',elapsed:440}).row,1);
 assert.equal(healer.plan({action:'hurt',elapsed:400}).row,3);
 assert.equal(healer.plan({action:'death',elapsed:800}).row,4);
 assert.equal(healer.plan({action:'walk',dir:2,frame:8}).index,0);
 for(const a of ['safira','floresta','vermelho','violeta'])assert.ok(healer.OUTFITS[a]);
});
test('Curandeiro V4 remains experimental and cannot overlay old hero renderer',()=>{
 const world=fs.readFileSync(path.join(root,'public/art16.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'public/mundo.html'),'utf8');
 assert.match(world,/const newHealerHero=/);
 assert.match(world,/!newHealerHero&&!newArcherHero/);
 assert.match(world,/if\(newHealerHero\|\|newArcherHero\|\|/);
 assert.match(html,/curandeiro-v4-experimental\.js/);
 assert.match(html,/curandeiro-v4-single-painter/);
 assert.match(html,/guild-city-3d\.js\?v=pedestrians-upgrade-v4/);
});
test('Curandeiro V4: ataque e cura não contêm sprites vizinhos capturados no atlas',()=>{
 const old=pixels('curandeiro-v4-acoes-8x5.png',5);
 const cleaned=pixels('curandeiro-v4-acoes-8x5-limpo.png',5);
 const right=[[1,2,153],[2,0,163],[2,1,157],[2,2,151],[2,3,150],[2,4,151],[2,5,148],[2,6,146]];
 const left=[[1,6,94]];
 let removed=0,unchanged=0;
 for(const [r,c,cut] of right){
  for(let y=0;y<160;y++)for(let x=0;x<256;x++){
   const idx=(r*160+y)*cleaned.width+c*256+x;
   const before=old.pix[idx],after=cleaned.pix[idx];
   if(x>=cut){
    if((old.transparent[before]??255)>25)removed++;
    assert.equal(cleaned.transparent[after]??255,0,'stray neighboring pose in right margin '+r+':'+c);
   }else{assert.equal(after,before,'original subject pixels must stay unchanged');unchanged++;}
  }
 }
 for(const [r,c,cut] of left){
  for(let y=0;y<160;y++)for(let x=0;x<256;x++){
   const idx=(r*160+y)*cleaned.width+c*256+x;
   if(x<cut){
    if((old.transparent[old.pix[idx]]??255)>25)removed++;
    assert.equal(cleaned.transparent[cleaned.pix[idx]]??255,0);
   }else assert.equal(cleaned.pix[idx],old.pix[idx]);
  }
 }
 assert.ok(removed>200,'regression must remove actual stray painted pixels');
 assert.ok(unchanged>100000,'do not redraw the original healer');
 const runtime=fs.readFileSync(path.join(root,'public/curandeiro-v4-experimental.js'),'utf8');
 const lab=fs.readFileSync(path.join(root,'public/laboratorio-curandeiro-v4.html'),'utf8');
 const mundo=fs.readFileSync(path.join(root,'public/mundo.html'),'utf8');
 assert.match(runtime,/curandeiro-v4-acoes-8x5-limpo\.png/);
 assert.match(lab,/healer-v4-clean-attack-heal-20261021/);
 assert.match(mundo,/healer-v4-clean-attack-heal-20261021/);
 assert.match(mundo,/guild-city-3d\.js\?v=pedestrians-upgrade-v4/);
});

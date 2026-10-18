'use strict';
// Self-contained 8-bit PNG codec for precise lossless 2D RPG artwork.
// Supports RGBA and indexed PNG palettes, including transparency, and every
// standard scanline filter. Never modifies a source palette or does resampling.
const zlib=require('node:zlib');
const sig=Buffer.from([137,80,78,71,13,10,26,10]);
function crc32(buffer){
 let n=0xffffffff;
 for(const byte of buffer){
  n^=byte;
  for(let i=0;i<8;i++)n=n&1?(n>>>1)^0xedb88320:n>>>1;
 }
 return (n^0xffffffff)>>>0;
}
function chunk(type,data){
 const tag=Buffer.from(type,'ascii'),out=Buffer.allocUnsafe(12+data.length);
 out.writeUInt32BE(data.length,0);tag.copy(out,4);data.copy(out,8);
 out.writeUInt32BE(crc32(out.subarray(4,8+data.length)),8+data.length);
 return out;
}
function decode(data){
 if(!Buffer.isBuffer(data)||!data.subarray(0,8).equals(sig))throw Error('invalid PNG');
 let width=0,height=0,depth=0,ct=0,interlace=0,palette=null,transparency=null;
 const pieces=[];let pos=8;
 while(pos<data.length){
  if(pos+12>data.length)throw Error('truncated PNG chunk');
  const size=data.readUInt32BE(pos),type=data.toString('ascii',pos+4,pos+8);
  if(pos+size+12>data.length)throw Error('truncated PNG payload');
  const bytes=data.subarray(pos+8,pos+8+size);
  if(type==='IHDR'){
   width=bytes.readUInt32BE(0);height=bytes.readUInt32BE(4);depth=bytes[8];ct=bytes[9];interlace=bytes[12];
  } else if(type==='PLTE')palette=bytes;
  else if(type==='tRNS')transparency=bytes;
  else if(type==='IDAT')pieces.push(bytes);
  pos+=12+size;
  if(type==='IEND')break;
 }
 if(!width||!height||width>8192||height>8192||width*height>12000000||interlace!==0||depth!==8)
  throw Error('unsupported PNG dimensions/depth');
 const bpp={0:1,2:3,3:1,4:2,6:4}[ct];
 if(!bpp)throw Error('unsupported PNG color type '+ct);
 const stride=width*bpp;
 const decompressed=zlib.inflateSync(Buffer.concat(pieces),{maxOutputLength:height*(stride+1)+32});
 if(decompressed.length!==height*(stride+1))throw Error('PNG row length mismatch');
 const rgba=new Uint8ClampedArray(width*height*4),last=new Uint8Array(stride);
 let ptr=0;
 for(let y=0;y<height;y++){
  const filter=decompressed[ptr++],scan=new Uint8Array(stride);
  for(let j=0;j<stride;j++){
   const v=decompressed[ptr++],a=j>=bpp?scan[j-bpp]:0,b=last[j],c=j>=bpp?last[j-bpp]:0;
   const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);
   const predictor=da<=db&&da<=dc?a:db<=dc?b:c;
   const correction=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):
    filter===4?predictor:null;
   if(correction===null)throw Error('bad PNG filter '+filter);
   scan[j]=(v+correction)&255;
  }
  for(let x=0;x<width;x++){
   const si=x*bpp,di=(y*width+x)*4;
   if(ct===6){for(let i=0;i<4;i++)rgba[di+i]=scan[si+i]}
   else if(ct===2){rgba.set([scan[si],scan[si+1],scan[si+2],255],di)}
   else if(ct===4){rgba.set([scan[si],scan[si],scan[si],scan[si+1]],di)}
   else if(ct===0){rgba.set([scan[si],scan[si],scan[si],255],di)}
   else {
    const index=scan[si],pi=index*3;
    if(!palette||pi+2>=palette.length)throw Error('invalid indexed PNG palette');
    rgba.set([palette[pi],palette[pi+1],palette[pi+2],transparency?.[index]??255],di);
   }
  }
  last.set(scan);
 }
 return {width,height,rgba};
}
function encode(width,height,rgba){
 if(width<1||height<1||rgba?.length!==width*height*4)throw Error('invalid RGBA');
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);
 ihdr[8]=8;ihdr[9]=6; // native RGBA, lossless
 const raw=Buffer.allocUnsafe(height*(width*4+1));let offset=0;
 for(let y=0;y<height;y++){
  raw[offset++]=0;const p=y*width*4;
  for(let x=0;x<width*4;x++)raw[offset++]=rgba[p+x];
 }
 return Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
module.exports={decode,encode,crc32};

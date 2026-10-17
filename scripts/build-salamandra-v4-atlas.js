'use strict';
// Salamandra V4 technical draft: derive six 4-frame rows from four independent
// user-approved directional concept crops. This is a procedural interim atlas,
// NOT 96 independently hand-drawn final animation frames.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),pub=path.join(root,'public'),out=path.join(pub,'assets','creatures-v4');
const dirs=['tras','direita','frente','esquerda'];
const src=fs.readFileSync(path.join(pub,'salamandra-v4-preview.js'),'utf8');
const sandbox={window:{}};vm.runInNewContext(src,sandbox,{timeout:500});
const images=sandbox.window.OsPeregrinosSalamanderV4Preview.images;
const table=new Uint32Array(256);
for(let n=0;n<256;n++){let x=n;for(let b=0;b<8;b++)x=(x&1)?(0xedb88320^(x>>>1)):(x>>>1);table[n]=x>>>0;}
function crc(buf){let v=0xffffffff;for(let i=0;i<buf.length;i++)v=table[(v^buf[i])&255]^(v>>>8);return (v^0xffffffff)>>>0;}
function chunk(type,body){const name=Buffer.from(type),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(body.length);sum.writeUInt32BE(crc(Buffer.concat([name,body])));return Buffer.concat([len,name,body,sum]);}
function pngEncode(pixels,w,h){
 const raw=Buffer.alloc(h*(1+w*4));
 for(let y=0;y<h;y++)pixels.copy(raw,y*(1+w*4)+1,y*w*4,(y+1)*w*4);
 const info=Buffer.alloc(13);info.writeUInt32BE(w,0);info.writeUInt32BE(h,4);info[8]=8;info[9]=6;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',info),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
function pngDecode(bytes){
 if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Not PNG');
 let at=8,w=0,h=0,depth=0,type=0,pal=null,trns=null,idat=[];
 while(at<bytes.length){
  const count=bytes.readUInt32BE(at),tag=bytes.toString('ascii',at+4,at+8),body=bytes.subarray(at+8,at+8+count);at+=12+count;
  if(tag==='IHDR'){w=body.readUInt32BE(0);h=body.readUInt32BE(4);depth=body[8];type=body[9]}
  if(tag==='PLTE')pal=Buffer.from(body);if(tag==='tRNS')trns=Buffer.from(body);
  if(tag==='IDAT')idat.push(body);if(tag==='IEND')break;
 }
 if(depth!==8||![2,3,6].includes(type)||w!==64||h!==80)throw Error('Invalid directional source');
 const bpp=type===6?4:type===2?3:1,stride=w*bpp,stream=zlib.inflateSync(Buffer.concat(idat));
 const out=Buffer.alloc(w*h*4),prev=Buffer.alloc(stride);let offset=0;
 for(let y=0;y<h;y++){
  const filter=stream[offset++],row=Buffer.from(stream.subarray(offset,offset+stride));offset+=stride;
  for(let x=0;x<stride;x++){const a=x>=bpp?row[x-bpp]:0,b=prev[x],c=x>=bpp?prev[x-bpp]:0;let f=0;
   if(filter===1)f=a;else if(filter===2)f=b;else if(filter===3)f=(a+b)>>1;
   else if(filter===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);f=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
   else if(filter!==0)throw Error('Invalid PNG filter');
   row[x]=(row[x]+f)&255;
  }
  for(let x=0;x<w;x++){const k=(y*w+x)*4,ix=x*bpp;
   if(type===3){const n=row[ix];out[k]=pal[3*n];out[k+1]=pal[3*n+1];out[k+2]=pal[3*n+2];out[k+3]=trns&&n<trns.length?trns[n]:255}
   else {out[k]=row[ix];out[k+1]=row[ix+1];out[k+2]=row[ix+2];out[k+3]=bpp===4?row[ix+3]:255;}
  }
  row.copy(prev);
 }
 return {pixels:out,w,h};
}
function set(target,w,x,y,r,g,b,a=255){if(x<0||y<0||x>=w||y>=target.length/(w*4))return;const k=(y*w+x)*4;target[k]=r;target[k+1]=g;target[k+2]=b;target[k+3]=a;}
function flame(fx,w,cx,cy,radius,rotation,level){
 for(let band=0;band<4;band++){
  const pal=[[108,19,9],[196,43,11],[255,116,18],[255,219,76]][band],thick=9-2*band;
  for(let s=0;s<85;s++){
   const a=rotation-1.1+s/84*2.3,rad=radius+band*1.6;
   const xx=Math.round(cx+Math.cos(a)*rad),yy=Math.round(cy-Math.sin(a)*rad*.68);
   for(let oy=-thick;oy<=thick;oy++)for(let ox=-thick;ox<=thick;ox++)if(ox*ox+oy*oy<=thick*thick)set(fx,w,xx+ox,yy+oy,pal[0],pal[1],pal[2],205+Math.min(level,3)*10);
  }
 }
}
fs.mkdirSync(out,{recursive:true});
const manifest={kind:'TECHNICAL_INTERIM_FROM_4_BASE_POSES_NOT_FINAL_HAND_DRAWN',frame:{width:192,height:160,cols:4,rows:6},speciesReserved:32,files:{}};
for(let dir=0;dir<4;dir++){
 const name=dirs[dir],im=pngDecode(Buffer.from(images[name].split(',')[1],'base64'));
 const W=768,H=960,sheet=Buffer.alloc(W*H*4);
 for(let row=0;row<6;row++)for(let col=0;col<4;col++){
  const cw=136,ch=136,anchorX=col*192+96,anchorY=(row+1)*160-5;
  const lift=row===1?[0,3,1,4][col]:row===2?[0,2,3,4][col]:row===3?[0,0,2,1][col]:0;
  const swing=row===1?[-5,-1,3,1][col]:row===3?[0,5,11,15][col]:row===4?[-4,4,-3,2][col]:0;
  const height=row===5?[1,.78,.5,.21][col]:row===4?[1,.97,.92,1][col]:1;
  const width=row===2?[1,1.02,1.04,1.05][col]:row===3?[1,1.03,1.07,1.1][col]:1;
  const rw=Math.round(cw*width),rh=Math.round(ch*height);
  for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){
   const srcX=Math.min(63,Math.floor(x/rw*64)),srcY=Math.min(79,Math.floor(y/rh*80)),p=(srcY*64+srcX)*4;
   let a=im.pixels[p+3];if(!a)continue;
   if(row===5){a=Math.round(a*[255,203,132,53][col]/255);if(col>0&&(x*7+y*11)%13<col*2)continue;}
   const r=im.pixels[p],g=im.pixels[p+1],b=im.pixels[p+2];
   if(row===4&&col===1&&((x+y)%7)<2)a=Math.round(a*.6);
   set(sheet,W,Math.floor(anchorX-rw/2+x+swing),Math.floor(anchorY-rh+y-lift),r,g,b,a);
  }
  if(row===2||row===3){const color=row===3?[255,150,35]:[255,82,20];
   for(let k=0;k<12+col*3;k++){const x=anchorX+((k*31+col*7)%94)-46,y=anchorY-100+((k*19+col*13)%69);
    set(sheet,W,x,y,...color,160+(k%3)*25);
   }
  }
 }
 const dest=path.join(out,'salamandra_v4_'+name+'.png'),encoded=pngEncode(sheet,W,H);
 fs.writeFileSync(dest,encoded);manifest.files[name]={bytes:encoded.length};
}
const fw=768,fh=640,fx=Buffer.alloc(fw*fh*4);
for(let dir=0;dir<4;dir++)for(let col=0;col<4;col++){
 const midX=col*192+96,midY=dir*160+96;
 const shift=dir===1?30:dir===3?-30:0,angle=dir===0?Math.PI*1.3:dir===1?0:dir===2?Math.PI*.5:Math.PI;
 flame(fx,fw,midX+shift,midY,34+col*8,angle,col);
}
const fxPng=pngEncode(fx,fw,fh);fs.writeFileSync(path.join(out,'salamandra_v4_ataque_fx.png'),fxPng);manifest.files.ataque_fx={bytes:fxPng.length};
fs.writeFileSync(path.join(pub,'salamandra-v4-atlas-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Salamandra V4 generated: 4 sheets 768x960; FX 768x640 (procedural technical preview)');

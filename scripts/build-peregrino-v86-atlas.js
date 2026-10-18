'use strict';
/**
 * Peregrino V8.6 — native transparent 64×80 engine spritesheet.
 * A deterministic conversion of the V8.5 approved original: remove ONLY
 * light neutral floor/slide artifacts in lower bands; all 44 characters
 * keep their original approved pixels, sizes and positions.
 * This is the exact operation used by the previously approved V8.6 PNG.
 */
const fs=require('node:fs'),path=require('node:path');
const {decode,encode}=require('./png-rgba-v84');
const PUBLIC=path.join(__dirname,'../public');
const SRC=path.join(PUBLIC,'assets/peregrino/peregrino-nova-estetica-v85-64x80.png');
const DST=path.join(PUBLIC,'assets/peregrino/peregrino-motor-v86-64x80-rgba.png');
const WIDTH=256,HEIGHT=880,TILE_W=64,TILE_H=80;
const ROWS=Object.freeze([0,1,2,3,4,8,9,10]);
function sanitize({width,height,rgba}){
 if(width!==WIDTH||height!==HEIGHT||rgba?.length!==WIDTH*HEIGHT*4)
  throw Error('Peregrino V8.6: expected approved 256x880 / RGBA, never rescale frames');
 const output=new Uint8ClampedArray(rgba),removed=[];
 // Never process dying frames: the blanket/cloak lies close to the floor
 // and must remain exactly as the approved art.
 for(const row of ROWS)for(let col=0;col<4;col++){
  const x0=col*TILE_W,y0=row*TILE_H;
  for(let y=69;y<=78;y++){
   const yy=y0+y,mask=new Uint8Array(TILE_W);
   for(let x=0;x<TILE_W;x++){
    const i=(yy*WIDTH+x0+x)*4,r=output[i],g=output[i+1],b=output[i+2],a=output[i+3];
    const spread=Math.max(r,g,b)-Math.min(r,g,b);
    if(a>0&&r>145&&spread<13)mask[x]=1;
   }
   for(let x=0;x<TILE_W;){
    if(!mask[x]){x++;continue}
    let end=x+1;while(end<TILE_W&&mask[end])end++;
    if(end-x>=6){
     for(let px=x;px<end;px++){
      const i=(yy*WIDTH+x0+px)*4;
      output[i]=output[i+1]=output[i+2]=output[i+3]=0;
     }
     removed.push({row,col,y,start:x,end});
    }
    x=end;
   }
  }
 }
 return {width,height,rgba:output,removed};
}
function build({src=SRC,dest=DST}={}){
 const source=decode(fs.readFileSync(src));
 const cleaned=sanitize(source);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.writeFileSync(dest,encode(cleaned.width,cleaned.height,cleaned.rgba));
 return {source:src,dest,width:cleaned.width,height:cleaned.height,
  removedPixels:cleaned.removed.reduce((sum,r)=>sum+r.end-r.start,0),
  removedRuns:cleaned.removed.length};
}
if(require.main===module)console.log('[Peregrino motor V8.6]',build());
module.exports={SRC,DST,WIDTH,HEIGHT,TILE_W,TILE_H,ROWS,sanitize,build};

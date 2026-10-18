'use strict';
/**
 * Generates four review spritesheets from the ORIGINAL game assets on
 * experimental server boot. No generative model or stock sprites involved.
 * A complete 6x4 PNG is written to the static folder for each class.
 *
 * IMPORTANT: frames are derived/repositioned pixelwise from the originals;
 * they require hand-painted seam cleanup before being declared final art.
 */
const fs=require('node:fs'),path=require('node:path');
const {decode,encode}=require('./png-rgba-v84');
const {pixelPose}=require('../public/full-body-poses-v84.js');
const ROOT=path.resolve(__dirname,'..'),PUBLIC=path.join(ROOT,'public');
const DEST=path.join(PUBLIC,'assets/combat-v84');
const CLASSES=Object.freeze({
 peregrino:{file:'assets/peregrino/peregrino-runway-walk.png',w:128,h:160,cols:4,rows:4},
 guardiao:{file:'assets/approved-classes/guardiao-sprites-3x2-64x80.png',w:64,h:80,cols:3,rows:2},
 arqueiro:{file:'assets/approved-classes/arqueiro-sprites-3x2-64x80.png',w:64,h:80,cols:3,rows:2},
 curandeiro:{file:'assets/approved-classes/curandeiro-sprites-3x2-64x80.png',w:64,h:80,cols:3,rows:2}
});
function cut(source,role,dir){
 const info=CLASSES[role];
 const {w,h}=info,cols=info.cols;
 const col=role==='peregrino'?0:({0:1,1:2,2:0,3:2}[dir]);
 const row=role==='peregrino'?({0:1,1:2,2:0,3:2}[dir]):0;
 const cut=new Uint8ClampedArray(w*h*4);
 const mirror=dir===3;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const fx=mirror?w-1-x:x,src=((row*h+y)*source.width+col*w+fx)*4,dst=(y*w+x)*4;
  for(let i=0;i<4;i++)cut[dst+i]=source.rgba[src+i];
 }
 return cut;
}
function buildClass(role,{directory=DEST}={}){
 const info=CLASSES[role];if(!info)throw Error('unknown class');
 const source=decode(fs.readFileSync(path.join(PUBLIC,info.file)));
 if(source.width!==info.w*info.cols||source.height!==info.h*info.rows)
  throw Error('source atlas dimensions changed: '+role);
 const outW=info.w*6,outH=info.h*4,out=new Uint8ClampedArray(outW*outH*4);
 for(let row=0;row<4;row++){
  const action=row<2?'attack':'skill';
  const dirs=[[0,1],[2,3],[0,1],[2,3]][row];
  for(let d=0;d<2;d++){
   const sourceCell=cut(source,role,dirs[d]);
   for(let phase=0;phase<3;phase++){
    const pose=pixelPose(sourceCell,info.w,info.h,{role,dir:dirs[d],action,phase});
    if(!pose)throw Error('pixel body frame failed: '+role+' '+dir+' '+phase);
    const tileX=(d*3+phase)*info.w,tileY=row*info.h;
    for(let y=0;y<info.h;y++)for(let x=0;x<info.w;x++){
     const i=(y*info.w+x)*4,j=((tileY+y)*outW+tileX+x)*4;
     for(let k=0;k<4;k++)out[j+k]=pose[i+k];
    }
   }
  }
 }
 fs.mkdirSync(directory,{recursive:true});
 const target=path.join(directory,role+'-corpo-inteiro-v84.png');
 fs.writeFileSync(target,encode(outW,outH,out));
 return {role,target,width:outW,height:outH,source:info.file};
}
function buildAll(){return Object.keys(CLASSES).map(role=>buildClass(role));}
if(require.main===module){
 for(const img of buildAll())process.stdout.write('[Pixel V8.4] '+img.role+' '+img.width+'×'+img.height+' — '+img.target+'\n');
}
module.exports={CLASSES,cut,buildClass,buildAll};

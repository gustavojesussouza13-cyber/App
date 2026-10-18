'use strict';
/**
 * Os Peregrinos — V8.4 complete-body reference animation.
 *
 * Instead of making a NEW likeness, warp EACH actual RGBA pixel of the
 * approved sprites. Head, cloak, chest, hips, left & right legs, shoulders
 * and both arms all have authored per-action poses.
 * This is an art-review builder: refinement and pixel-by-pixel manual
 * cleanup are still required before replacing production sprites.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosFullBodyV84=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 const VERSION='complete-character-pixel-pose-v84-20261018';
 const W=128,H=160;
 const PARTS=Object.freeze(['cape','rear-leg','front-leg','torso','left-arm','right-arm','head']);
 const PROFILES=Object.freeze({
  peregrino:{head:53,waist:112,shoulder:69,hip:111,legSplit:64,armSpread:22,cape:true},
  guardiao:{head:50,waist:112,shoulder:69,hip:111,legSplit:64,armSpread:26,cape:true},
  arqueiro:{head:54,waist:108,shoulder:72,hip:109,legSplit:64,armSpread:24,cape:true},
  curandeiro:{head:55,waist:111,shoulder:71,hip:111,legSplit:64,armSpread:24,cape:true}
 });
 const KEYFRAMES=Object.freeze({
  attack:Object.freeze([
   Object.freeze({torso:-5,head:-2,cape:4,step:-8,arms:-15,bob:1}),
   Object.freeze({torso:9,head:4,cape:-9,step:11,arms:19,bob:-3}),
   Object.freeze({torso:2,head:1,cape:2,step:3,arms:5,bob:0})
  ]),
  skill:Object.freeze([
   Object.freeze({torso:-3,head:-2,cape:4,step:-5,arms:-11,bob:1}),
   Object.freeze({torso:5,head:0,cape:-8,step:8,arms:22,bob:-4}),
   Object.freeze({torso:1,head:1,cape:2,step:2,arms:4,bob:0})
  ])
 });
 function frame(action,phase){
  return KEYFRAMES[action]?.[Math.max(0,Math.min(2,Math.floor(Number(phase)||0)))]||null;
 }
 function zone(px,py,role='peregrino'){
  const p=PROFILES[role]||PROFILES.peregrino;
  // Sprite sheet parts are segmented in their own source coordinates,
  // not assembled from abstract generic stock stick figures.
  if(py<=p.head)return 'head';
  if(py>=p.waist+1)return px<p.legSplit?'rear-leg':'front-leg';
  const outer=px<39||px>90;
  const cloakOutside=py>p.shoulder+7&&outer&&
   ((role==='curandeiro'&&px<36)||(role==='arqueiro'&&px<37)||px<33||px>104);
  if(p.cape&&cloakOutside)return 'cape';
  if(py<p.waist&&py>p.shoulder-2&&px<p.legSplit-p.armSpread)return 'left-arm';
  if(py<p.waist&&py>p.shoulder-2&&px>p.legSplit+p.armSpread)return 'right-arm';
  return 'torso';
 }
 function displacement(x,y,{role='peregrino',dir=2,action='attack',phase=0}={}){
  const pose=frame(action,phase);
  if(!pose)return Object.freeze({part:zone(x,y,role),dx:0,dy:0});
  const p=PROFILES[role]||PROFILES.peregrino;
  const sign=dir===3?-1:dir===0?-1:1;
  const part=zone(x,y,role);
  const waistBlend=Math.max(0,Math.min(1,(y-p.head)/Math.max(1,p.waist-p.head)));
  let dx=0,dy=0;
  switch(part){
   case 'head':
    dx=pose.head*sign;
    dy=pose.bob;
    break;
   case 'torso':
    dx=pose.torso*sign*(1-waistBlend*.73);
    dy=pose.bob+Math.round((x-64)*pose.torso/95);
    break;
   case 'cape':
    dx=pose.cape*sign*(.6+(y-p.shoulder)/175);
    dy=pose.bob+((phase===1)?-3:0);
    break;
   case 'left-arm':
    dx=pose.arms*(-sign)*(.5+(y-p.shoulder)/85)+pose.torso*sign*.5;
    dy=-pose.arms*.22+pose.bob;
    break;
   case 'right-arm':
    dx=pose.arms*sign*(.5+(y-p.shoulder)/85)+pose.torso*sign*.5;
    dy=-pose.arms*.28+pose.bob;
    break;
   case 'rear-leg':{
    const knee=Math.max(0,Math.min(1,(y-p.hip)/(H-p.hip)));
    dx=-pose.step*sign*knee+pose.torso*sign*.13;
    dy=phase===1?-3*knee:phase===0?2*knee:0;
    break;
   }
   case 'front-leg':{
    const knee=Math.max(0,Math.min(1,(y-p.hip)/(H-p.hip)));
    dx=pose.step*sign*knee+pose.torso*sign*.13;
    dy=phase===1?2*knee:phase===0?-3*knee:0;
    break;
   }
  }
  return {part,dx:Math.round(dx),dy:Math.round(dy)};
 }
 function pixelPose(source,width,height,options={}){
  if(!source||width<=0||height<=0||source.length!==width*height*4)return null;
  const output=new Uint8ClampedArray(source.length);
  const cover=new Uint8Array(width*height);
  const drawOrder=[0,1,2,3,4,5,6]; // cloak first, face/hood last.
  // Each output pixel reuses the exact corresponding approved RGB values.
  // No palette quantization, blur, diffusion or new costume texture.
  for(let priority=0;priority<drawOrder.length;priority++){
   const group=PARTS[drawOrder[priority]];
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,a=source[i+3];
    if(a<4)continue;
    const X=x*W/width,Y=y*H/height;
    const d=displacement(X,Y,options);
    if(d.part!==group)continue;
    const nx=x+Math.round(d.dx*width/W);
    const ny=y+Math.round(d.dy*height/H);
    if(nx<0||nx>=width||ny<0||ny>=height)continue;
    const dest=ny*width+nx,j=dest*4;
    if(cover[dest]>priority+1)continue;
    output[j]=source[i];output[j+1]=source[i+1];output[j+2]=source[i+2];output[j+3]=a;
    cover[dest]=priority+1;
   }
  }
  // Correct isolated one-pixel holes along NEW shoulder/hip seams. Keep
  // intentional negative space between legs: require 3 opaque neighbours.
  const filled=new Uint8ClampedArray(output);
  for(let y=4;y<height-4;y++)for(let x=4;x<width-4;x++){
   const j=(y*width+x)*4;
   if(output[j+3])continue;
   const ids=[j-4,j+4,j-width*4,j+width*4].filter(k=>output[k+3]>150);
   if(ids.length<3)continue;
   const nearest=ids[0];
   filled[j]=output[nearest];filled[j+1]=output[nearest+1];
   filled[j+2]=output[nearest+2];filled[j+3]=output[nearest+3];
  }
  return filled;
 }
 function render(base,{role='peregrino',dir=2,action='attack',phase=0,details=true,documentRef=root.document}={}){
  if(!base||!documentRef?.createElement||!PROFILES[role]||!frame(action,phase))return null;
  const src=documentRef.createElement('canvas');src.width=W;src.height=H;
  const sc=src.getContext('2d',{willReadFrequently:true});
  if(!sc?.getImageData)return null;
  sc.imageSmoothingEnabled=false;
  sc.drawImage(base,0,0,W,H);
  const original=sc.getImageData(0,0,W,H);
  const bytes=pixelPose(original.data,W,H,{role,dir,action,phase});
  if(!bytes)return null;
  const altered=sc.createImageData(W,H);altered.data.set(bytes);
  sc.putImageData(altered,0,0);
  if(details&&root.OsPeregrinosCombatPosesV83?.render){
   // Weapon/skill detail after the WHOLE original RGBA body has changed.
   return root.OsPeregrinosCombatPosesV83.render(src,{role,dir,action,phase,documentRef})||src;
  }
  return src;
 }
 function spritesheet(source,{role='peregrino',details=true,documentRef=root.document}={}){
  if(!PROFILES[role]||!documentRef?.createElement)return null;
  const cellW=role==='peregrino'?128:64,cellH=role==='peregrino'?160:80;
  const canvas=documentRef.createElement('canvas');canvas.width=cellW*6;canvas.height=cellH*4;
  const g=canvas.getContext('2d');g.imageSmoothingEnabled=false;
  for(let row=0;row<4;row++){
   const action=row<2?'attack':'skill';
   const dirs=[0,1,2,3],dir=dirs[row%2+Math.floor(row/2)*2]; // use row itself below
   const dirsInRow=[[0,1],[2,3],[0,1],[2,3]][row];
   for(let side=0;side<2;side++)for(let phase=0;phase<3;phase++){
    const sourceCanvas=source(dirsInRow[side],phase);
    const painted=render(sourceCanvas,{role,dir:dirsInRow[side],action,phase,details,documentRef});
    if(painted)g.drawImage(painted,(side*3+phase)*cellW,row*cellH,cellW,cellH);
   }
  }
  return canvas;
 }
 return Object.freeze({VERSION,W,H,PARTS,PROFILES,KEYFRAMES,zone,frame,displacement,pixelPose,render,spritesheet});
});

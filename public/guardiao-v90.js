'use strict';
/* Guardiao V9.0 — extracted RGBA sprites from the approved artistic preview.
   Experimental only. The 31 distinct frames have a fixed 256x160 cell;
   transparent pixels and foot-anchor 128,148 remain stable in every action.
   This is a visual renderer; never change player state or network messages. */
(function (root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosGuardiaoV90=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 const WIDTH=256,HEIGHT=160,COLUMNS=5,ROWS=7,COUNT=31;
 const SRC='/assets/guardiao-v90/guardiao-v90-31frames.png?v=guardiao-v90-20261019';
 const FRAMES=Object.freeze({
  idle:[0,1,2,3],walk:[4,5,6,7,8,9],
  attack:[10,11,12,13,14,15],skill:[16,17,18,19,20,21],
  hurt:[22,23,24,25],death:[26,27,28,29,30]
 });
 let atlas=null,pending=null,failed=false;
 function load(){
  if(atlas)return Promise.resolve(true);
  if(pending)return pending;
  if(typeof Image==='undefined')return Promise.resolve(false);
  pending=new Promise(resolve=>{
   const image=new Image();image.decoding='async';
   image.onload=()=>{
    const ok=image.naturalWidth===COLUMNS*WIDTH&&image.naturalHeight===ROWS*HEIGHT;
    if(ok){atlas=image;failed=false;}else failed=true;
    resolve(ok);
   };
   image.onerror=()=>{failed=true;resolve(false)};
   image.src=SRC;
  });
  return pending;
 }
 function direction(dir){return Number.isInteger(dir)?((dir%4)+4)%4:2;}
 function frameIndex({dir=2,action='idle',now=0,elapsed=0,frame=null}={}){
  dir=direction(dir);
  action=Object.hasOwn(FRAMES,action)?action:'idle';
  if(action==='idle')return dir===0?3:dir===2?(Math.floor(now/680)%2):dir===3?2:1;
  if(action==='walk'){
   if(dir===0)return 9;
   const steps=dir===2?[4,5,6,7,8]:[4,5,6,7,8];
   const k=Number.isFinite(frame)?Math.floor(frame):Math.floor(now/115);
   return steps[((k%steps.length)+steps.length)%steps.length];
  }
  const seq=FRAMES[action];
  const durations={attack:430,skill:770,hurt:420,death:900};
  const ms=Math.max(0,Number(elapsed)||0);
  const index=Math.min(seq.length-1,Math.floor(ms/(durations[action]/seq.length)));
  return seq[index];
 }
 function isStandard(appearance){
  const approved=root.OsPeregrinosApprovedClasses25D;
  return approved?.isStandard?.(appearance)??true;
 }
 function draw(ctx,{role='guardiao',x=0,y=0,dir=2,action='idle',now=0,
  frame=null,elapsed=0,scale=.86,glow=false,appearance=null}={}){
  if(role!=='guardiao'||!ctx?.drawImage)return false;
  if(!atlas){if(!pending)void load();return false;}
  const k=frameIndex({dir,action,now,frame,elapsed}),sx=(k%COLUMNS)*WIDTH;
  const sy=Math.floor(k/COLUMNS)*HEIGHT;
  const width=Math.max(1,Math.round(WIDTH*scale));
  const height=Math.max(1,Math.round(HEIGHT*scale));
  const dx=Math.round(x-width/2),dy=Math.round(y-148*scale);
  const flip=direction(dir)===3;
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(glow){ctx.globalAlpha=.13;ctx.fillStyle='#83b7de';ctx.beginPath();
   ctx.ellipse(x,y+3,Math.round(37*scale),Math.round(9*scale),0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  if(flip){ctx.translate(dx+width,0);ctx.scale(-1,1);
   ctx.drawImage(atlas,sx,sy,WIDTH,HEIGHT,0,dy,width,height);}
  else ctx.drawImage(atlas,sx,sy,WIDTH,HEIGHT,dx,dy,width,height);
  ctx.restore();return true;
 }
 function drawWorld(ctx,options={}){return draw(ctx,{...options,role:'guardiao',scale:.86});}
 if(typeof document!=='undefined')void load();
 return Object.freeze({VERSION:'guardiao-art-v90-experimental-31frames',WIDTH,HEIGHT,COLUMNS,ROWS,COUNT,
  SRC,FRAMES,load,draw,drawWorld,frameIndex,isReady:()=>!!atlas,hasFailed:()=>failed,isStandard});
});
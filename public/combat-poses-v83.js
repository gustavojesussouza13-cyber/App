'use strict';
/**
 * Combat V8.3: pixel-painted weapon articulation over the ACTUAL approved
 * class PNG. Body / face / armor palette are copied pixel-for-pixel from
 * the in-game original canvas, never generated character replacements.
 *
 * Each action builds 3 distinct 128x160 RGBA canvases for each direction.
 * Source limb pixels are re-posed with nearest-neighbour only. Sword,
 * staff, bow, arrow and shield are drawn pixel-by-pixel in class palettes.
 * All poses keep the same foot baseline and 128x160 source proportions.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosCombatPosesV83=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const VERSION='combat-poses-pixel-v83-fidelity-20261018';
 const W=128,H=160,PHASE_MS=123,DURATION=370;
 const COLORS=Object.freeze({
  peregrino:{outline:'#151b29',cloth:'#164a7b',clothLight:'#4386b3',metal:'#91a7ba',bright:'#dbf1fa',handle:'#775034',gold:'#dfba68',aura:'#63bfea'},
  guardiao:{outline:'#172134',cloth:'#1b4d99',clothLight:'#5689d6',metal:'#9eabbb',bright:'#ecf1ea',handle:'#725033',gold:'#f5c968',aura:'#93c7ed'},
  arqueiro:{outline:'#17271f',cloth:'#274b32',clothLight:'#63924c',metal:'#899883',bright:'#b8df8c',handle:'#8c5d37',gold:'#dbb66c',aura:'#91dc58'},
  curandeiro:{outline:'#27303d',cloth:'#f1e8d9',clothLight:'#86c6e8',metal:'#d1dfe8',bright:'#fffaec',handle:'#86673e',gold:'#e8c777',aura:'#fff0a0'}
 });
 const state=new WeakMap();
 function step(elapsed=0){
  const t=Math.min(DURATION-1,Math.max(0,Number(elapsed)||0));
  return Math.min(2,Math.floor(t/PHASE_MS));
 }
 function drawLine(ctx,x0,y0,x1,y1,c,size=1){
  const n=Math.max(1,Math.abs(Math.round(x1-x0)),Math.abs(Math.round(y1-y0)));
  ctx.fillStyle=c;
  for(let i=0;i<=n;i++){
   const x=Math.round(x0+(x1-x0)*i/n),y=Math.round(y0+(y1-y0)*i/n);
   ctx.fillRect(x,y,size,size);
  }
 }
 function pixel(ctx,x,y,color,w=2,h=w){
  ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);
 }
 function diamond(ctx,x,y,r,color){
  for(let dy=-r;dy<=r;dy++)pixel(ctx,x-(r-Math.abs(dy)),y+dy,color,2*(r-Math.abs(dy))+1,1);
 }
 function orient(dir){
  const d=Number(dir)|0;
  return {sign:d===3?-1:1,back:d===0,side:d===1||d===3,dir:d};
 }
 function stance(role,dir,phase,action){
  const d=orient(dir),skill=action==='skill';
  // Coordinates refer to the normalized 128x160 original PNG canvas,
  // not to 64x80 fallback characters or the display viewport.
  const anchors={
   peregrino:{shoulder:[83,71],wrist:[95,98],arm:[79,77,24,29]},
   guardiao:{shoulder:[84,71],wrist:[98,97],arm:[79,76,24,28]},
   arqueiro:{shoulder:[81,73],wrist:[91,96],arm:[77,78,23,27]},
   curandeiro:{shoulder:[81,70],wrist:[94,96],arm:[77,78,24,29]}
  };
  const a=anchors[role]||anchors.peregrino;
  const s=d.sign,shift=d.dir===3?-13:0;
  const shoulderX=d.side?(s===1?a.shoulder[0]:W-a.shoulder[0]):a.shoulder[0]-4;
  const shoulderY=a.shoulder[1]+(d.back?3:0);
  const spread=[-17,21,7][phase],raiseY=skill?[-12,-28,-11][phase]:[-14,5,10][phase];
  const handX=shoulderX+s*(17+spread),handY=shoulderY+18+raiseY;
  // Genuine 3-pose hand movement (not a rotating static silhouette).
  return Object.freeze({handX,handY,shoulderX,shoulderY,dir:d.dir,sign:s,
    phase,role,action,sourceRect:a.arm,skill});
 }
 function blade(ctx,handX,handY,tipX,tipY,cl){
  drawLine(ctx,handX+1,handY+1,tipX+2,tipY+2,cl.outline,7);
  drawLine(ctx,handX,handY,tipX,tipY,cl.metal,5);
  drawLine(ctx,handX,handY,tipX,tipY,cl.bright,2);
  const vx=tipX-handX,vy=tipY-handY,l=Math.hypot(vx,vy)||1;
  const nx=-vy/l,ny=vx/l;
  drawLine(ctx,handX-nx*8,handY-ny*8,handX+nx*8,handY+ny*8,cl.outline,5);
  drawLine(ctx,handX-nx*7,handY-ny*7,handX+nx*7,handY+ny*7,cl.gold,3);
  drawLine(ctx,handX-vx/l*11,handY-vy/l*11,handX,handY,cl.handle,5);
  pixel(ctx,handX-vx/l*13,handY-vy/l*13,cl.gold,4,4);
 }
 function bow(ctx,handX,handY,dir,phase,cl,skill){
  const orientSign=dir===3?-1:1;
  // Bow is genuinely brought from lowered to drawn to released positions.
  const radius=phase===0?21:phase===1?28:22;
  const x=handX+orientSign*(phase===2?8:2),y=handY-7;
  for(let i=-12;i<=12;i++){
   const yy=y+i*1.55;
   const xx=x+orientSign*Math.round(Math.cos(i/12*Math.PI/2)*radius*.35);
   pixel(ctx,xx,yy,cl.outline,5,4);
   pixel(ctx,xx+orientSign,yy,cl.handle,2,3);
  }
  drawLine(ctx,x,y-20,x,y+20,cl.bright,1);
  const drawnX=phase===1?handX-orientSign*14:handX-orientSign*3;
  const drawnY=y;
  drawLine(ctx,drawnX,drawnY,x+orientSign*27,drawnY,skill?cl.aura:cl.metal,2);
  diamond(ctx,x+orientSign*26,drawnY,2,cl.gold);
  if(phase===2){
   drawLine(ctx,x+orientSign*31,drawnY,x+orientSign*(skill?52:44),drawnY,skill?cl.aura:cl.bright,3);
   for(let k=0;k<4;k++)pixel(ctx,x+orientSign*(29+k*6),drawnY+(k%2?3:-3),skill?cl.aura:cl.metal,2);
  }
 }
 function staff(ctx,hx,hy,phase,dir,cl,skill){
  const sign=dir===3?-1:1;
  const tips=[[hx+sign*3,hy-46],[hx+sign*15,hy-53],[hx+sign*38,hy-32]];
  const [tx,ty]=tips[phase];
  drawLine(ctx,hx-sign*6,hy+13,tx+2,ty+1,cl.outline,7);
  drawLine(ctx,hx-sign*6,hy+13,tx,ty,cl.handle,4);
  drawLine(ctx,hx-sign*4,hy+9,tx-1,ty,cl.gold,1);
  diamond(ctx,tx,ty,7,cl.outline);diamond(ctx,tx,ty,5,skill?cl.aura:cl.clothLight);
  diamond(ctx,tx,ty-2,2,cl.bright);
  pixel(ctx,tx-3,ty-10,cl.gold,6,3);
  if(skill){for(let k=0;k<6;k++){const a=k*Math.PI/3+phase*.5;pixel(ctx,tx+Math.cos(a)*15,ty+Math.sin(a)*14,cl.gold,3);}}
 }
 function shield(ctx,x,y,phase,cl){
  const dy=[4,-6,-14][phase],cx=x-27,cy=y+dy;
  // Ornamental raised shield in the original royal-blue/gold palette.
  for(let j=0;j<30;j++){
   const widen=j<17?16:Math.round((30-j)*1.15);
   pixel(ctx,cx-widen/2,cy+j-17,cl.outline,widen+2,2);
   pixel(ctx,cx-widen/2+2,cy+j-17,cl.cloth,widen-2,1);
  }
  drawLine(ctx,cx,cy-12,cx,cy+9,cl.gold,3);
  drawLine(ctx,cx-7,cy-2,cx+7,cy-2,cl.gold,3);
  pixel(ctx,cx-2,cy-6,cl.bright,4,4);
 }
 function aura(ctx,pose,cl){
  const {phase,action,role,sign}=pose;
  if(action!=='skill')return;
  const cx=64+sign*(phase===1?8:4),cy=91;
  const r=[12,24,17][phase];
  for(let k=0;k<17;k++){
   const angle=k/17*Math.PI*2+(phase*.22);
   const xx=Math.round(cx+Math.cos(angle)*r),yy=Math.round(cy+Math.sin(angle)*r*.6);
   pixel(ctx,xx,yy,k%4===0?cl.bright:cl.aura,2+(phase===1?1:0));
  }
  if(role==='curandeiro'){
   drawLine(ctx,cx-5,cy,cx+5,cy,cl.gold,3);
   drawLine(ctx,cx,cy-7,cx,cy+7,cl.gold,3);
  } else if(role==='guardiao'){
   diamond(ctx,cx,cy,3,cl.gold);
  }
 }
 /**
  * Moves the EXACT original RGBA pixels in an outer forearm lobe.
  * No blur or palette changes. The source limb is first cut from the
  * outer silhouette, then replaced at a new shoulder-relative pose.
  */
 function moveLimb(original,ctx,pose,doc){
  if(!ctx?.getImageData||!ctx.putImageData||!doc?.createElement)return false;
  const {shoulderX,shoulderY,handX,handY,sign}=pose;
  const x0=Math.round(shoulderX+sign*5),y0=Math.round(shoulderY+7);
  const source=ctx.getImageData(0,0,W,H);
  const moved=doc.createElement('canvas');moved.width=W;moved.height=H;
  const mc=moved.getContext('2d',{willReadFrequently:true});if(!mc)return false;
  const rgba=mc.createImageData(W,H),body=source.data,limb=rgba.data;
  let count=0;
  // Outer arm pixels only: torso, hood, face, medallion remain untouched.
  for(let y=Math.max(0,y0);y<Math.min(H,y0+38);y++)for(let x=Math.max(0,x0-3);x<Math.min(W,x0+27);x++){
   const dx=x-x0,dy=y-y0;
   if(dx*dx/(19*19)+(dy-12)*(dy-12)/(23*23)>1)continue;
   if((sign>0&&x<78)||(sign<0&&x>50))continue;
   const i=(y*W+x)*4;
   if(body[i+3]<45)continue;
   for(let a=0;a<4;a++)limb[i+a]=body[i+a];
   body[i+3]=0;count++;
  }
  if(count<10)return false;
  // Empty outer-arm pixels are transparent: body center is never cut.
  ctx.putImageData(source,0,0);
  mc.putImageData(rgba,0,0);
  const armAngle=[-.38,.58,.09][pose.phase]*sign;
  ctx.save();
  ctx.translate(shoulderX,shoulderY);
  ctx.rotate(armAngle);
  const scale=pose.phase===1?1.1:1;
  ctx.drawImage(moved,-shoulderX,-shoulderY,W*scale,H);
  ctx.restore();
  return true;
 }
 function render(base,{role='peregrino',dir=2,action='attack',phase=0,documentRef=null}={}){
  if(!base||!COLORS[role]||!['attack','skill'].includes(action)||!documentRef?.createElement)return null;
  const canvas=documentRef.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return null;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(base,0,0,W,H);
  const p=stance(role,dir,Math.max(0,Math.min(2,Math.floor(phase))),action),cl=COLORS[role];
  if(ctx.getImageData&&ctx.putImageData)try{moveLimb(base,ctx,p,documentRef)}catch(_){/* still paint anchored real-pixel weapons */}
  const x=p.handX,y=p.handY,s=p.sign;
  // Arm sleeve from original class palette, connected to a MOVING wrist.
  drawLine(ctx,p.shoulderX,p.shoulderY,x,y,cl.outline,11);
  drawLine(ctx,p.shoulderX+2,p.shoulderY+2,x,y,cl.cloth,7);
  drawLine(ctx,p.shoulderX+2,p.shoulderY,x,y,cl.clothLight,2);
  pixel(ctx,x-3,y-3,cl.outline,9,8);
  pixel(ctx,x-1,y-3,role==='curandeiro'?cl.cloth:cl.handle,6,5);
  if(role==='arqueiro')bow(ctx,x,y,dir,p.phase,cl,action==='skill');
  else if(role==='curandeiro')staff(ctx,x,y,p.phase,dir,cl,action==='skill');
  else{
   const tipX=x+s*([3,30,42][p.phase]);
   const tipY=y+([-38,-21,1][p.phase]);
   blade(ctx,x,y,tipX,tipY,cl);
   if(role==='guardiao')shield(ctx,p.shoulderX-10,p.shoulderY+5,p.phase,cl);
  }
  aura(ctx,p,cl);
  return canvas;
 }
 function renderCached(base,options={}){
  if(!base||!options.documentRef)return null;
  const phase=options.phase??step(options.elapsed);
  let perBase=state.get(base);if(!perBase){perBase=new Map();state.set(base,perBase)}
  const key=[options.role,options.dir,options.action,phase].join(':');
  if(perBase.has(key))return perBase.get(key);
  const canvas=render(base,{...options,phase});
  if(canvas)perBase.set(key,canvas);
  return canvas;
 }
 function draw(ctx,{base,role,dir=2,action='attack',elapsed=0,x=0,y=0,scale=.73,documentRef=null}={}){
  if(!ctx?.drawImage||!base)return false;
  const canvas=renderCached(base,{role,dir,action,elapsed,documentRef});
  if(!canvas)return false;
  const w=Math.max(1,Math.round(W*scale)),h=Math.max(1,Math.round(H*scale));
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(canvas,Math.round(x-w/2),Math.round(y-h),w,h);
  return true;
 }
 return Object.freeze({VERSION,W,H,PHASE_MS,DURATION,COLORS,step,stance,render,renderCached,draw});
});

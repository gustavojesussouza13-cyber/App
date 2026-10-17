'use strict';
/**
 * Os Peregrinos — aparência V7.6. One shared pixel painter for the exact
 * approved hero sprites shown in the lobby and while playing in 2.5D.
 * Works from SAME-ORIGIN, preloaded atlas images; nothing is fetched here.
 * Face/hair/eyes/clothing/cape/accessories all alter real PNG-based pixels.
 * No CSS overlay, no smoothing, no changes to physics or server schemas.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosAppearanceSpriteV76=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 const APP=typeof module==='object'&&module.exports?require('./appearance16'):root.PeregrinosAppearance16;
 const VERSION='appearance-png-pixel-compositor-v77-four-directional-walk-20261017';
 const WIDTH=128,HEIGHT=160;
 const cloth=Object.freeze({
  vinho:['#813f50','#d18d91'],floresta:['#396b51','#a2c695'],
  safira:['#405e8d','#a4c8ee'],ocre:['#a17b3f','#f3cf83'],
  violeta:['#67507d','#cca9e9']
 });
 const capes=Object.freeze({
  vinho:'#823957',marinho:'#3a6198',musgo:'#49784c',marfim:'#e4d7b8'
 });
 const roles=Object.freeze(['peregrino','guardiao','arqueiro','curandeiro']);
 const cache=new Map();const limit=170;
 function hex(v){return [1,3,5].map(i=>parseInt(v.slice(i,i+2),16))}
 function shade(rgb,luma,brightness=1){
  const mult=Math.max(.46,Math.min(1.35,(luma/190)*brightness));
  return rgb.map(v=>Math.min(255,Math.max(0,Math.round(v*mult))));
 }
 function hsv(r,g,b){const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  let h=0;if(d){if(max===r)h=60*(((g-b)/d)%6);else if(max===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}
  return [(h+360)%360,max===0?0:d/max,max];
 }
 function palettePixel(data,index,col,preserve=.95){
  const lum=.2126*data[index]+.7152*data[index+1]+.0722*data[index+2];
  const rgb=shade(col,lum,preserve);data[index]=rgb[0];data[index+1]=rgb[1];data[index+2]=rgb[2];
 }
 const FACES=Object.freeze({
  peregrino:{cx:64,cy:50,w:19,h:17},
  guardiao:{cx:64,cy:48,w:16,h:14},
  arqueiro:{cx:64,cy:50,w:17,h:17},
  curandeiro:{cx:64,cy:49,w:17,h:17}
 });
 const SHAPE=Object.freeze({
  peregrino:{cape:[24,40,106,147],coat:[38,67,87,128]},
  guardiao:{cape:[25,58,105,136],coat:[42,69,87,120]},
  arqueiro:{cape:[24,55,105,143],coat:[43,71,88,124]},
  curandeiro:{cape:[26,55,104,143],coat:[42,68,87,126]}
 });
 function applyColors(image,appearance,role='peregrino',dir=2){
  const a=APP.normalize(appearance),def=APP.DEFAULT,rgba=image.data;
  const face=FACES[role]||FACES.peregrino,area=SHAPE[role]||SHAPE.peregrino;
  const skin=APP.SKIN[a.skin],hair=APP.HAIR[a.hairColor],outer=capes[a.cape];
  const customSkin=a.skin!==def.skin,customCape=a.cape!==def.cape&&!!outer;
  const customCoat=a.outfit!==def.outfit&&!!cloth[a.outfit];
  const capeColor=outer&&hex(outer),coatColor=customCoat?hex(cloth[a.outfit][0]):null;
  for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
   const i=(y*image.width+x)*4,alpha=rgba[i+3];if(alpha<90)continue;
   const r=rgba[i],g=rgba[i+1],b=rgba[i+2],lum=(r+g+b)/3;
   const [h,s]=hsv(r,g,b);
   const facePixel=x>=face.cx-face.w/2&&x<=face.cx+face.w/2&&y>face.cy-10&&y<face.cy+face.h;
   // Recolor original shaded skin pixels without erasing the engraved helmet.
   const skinTone=r>g*1.07&&g>b*1.09&&r>75&&h>5&&h<53&&s>.10;
   if(customSkin&&facePixel&&skinTone){
    palettePixel(rgba,i,hex(skin[0]),1.05);continue;
   }
   const [cx1,cy1,cx2,cy2]=area.coat,[px1,py1,px2,py2]=area.cape;
   const torso=x>=cx1&&x<=cx2&&y>=cy1&&y<=cy2;
   const mantle=x>=px1&&x<=px2&&y>=py1&&y<=py2&&(!torso||x<cx1+7||x>cx2-7||dir===0);
   const blue=(h>=172&&h<=270&&s>.21);
   const green=(h>=65&&h<=175&&s>.22);
   const fabric=role==='arqueiro'?green:role==='curandeiro'?(blue||(s<.27&&lum>100)):blue;
   // Only fabric material pixels, never metal trim, skin, weapons or shadows.
   if(customCape&&mantle&&fabric&&lum>24){
    palettePixel(rgba,i,capeColor,1.0);continue;
   }
   if(customCoat&&torso&&fabric&&lum>26&&!skinTone){
    palettePixel(rgba,i,coatColor,1.02);
   }
  }
  return image;
 }
 function details(ctx,appearance,role='peregrino',dir=2){
  const a=APP.normalize(appearance),def=APP.DEFAULT;
  if(APP.key(a)===APP.key(def))return;
  const cfg=FACES[role]||FACES.peregrino,cx=cfg.cx,cy=cfg.cy;
  const back=Number(dir)===0,side=Number(dir)===1||Number(dir)===3;
  const pixel=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h)};
  const hair=APP.HAIR[a.hairColor],skin=APP.SKIN[a.skin],eyes=APP.EYES[a.eyes];
  const style=a.hairStyle;
  if(a.skin!==def.skin){
   // Skin-visible jaw and neck in front of helmets/hoods.
   pixel(skin[2],cx-5,cy+7,10,3);pixel(skin[0],cx-4,cy+5,8,3);
   pixel(skin[1],cx-3,cy+4,6,1);
  }
  if(a.hairColor!==def.hairColor||style!==def.hairStyle){
   const close=style==='raspado';
   if(!close){
    // Narrow fringe INSIDE the original hood or helmet opening, not a wig.
    pixel(hair[0],cx-8,cy-9,16,3);
    pixel(hair[1],cx-6,cy-8,10,2);
    pixel(hair[0],cx-8,cy-6,3,4);
    if(!back)pixel(hair[1],cx-4,cy-5,7,1);
   }else{pixel(skin[2],cx-6,cy-8,12,3);pixel(hair[0],cx-6,cy-8,12,1);}
   const len=style==='medio'?10:style==='longo'?20:style==='tranca'?23:style==='rabo'?18:0;
   if(len){
    pixel(hair[0],cx-9,cy-4,3,len);
    pixel(hair[1],cx-8,cy,1,len-4);
    if(back||style==='longo'){pixel(hair[0],cx+7,cy-4,3,len);pixel(hair[1],cx+8,cy,1,len-4);}
    if(style==='tranca')for(let i=0;i<5;i++)pixel(i%2?hair[1]:hair[0],cx+7+i%2,cy+6+i*3,4,2);
    if(style==='rabo'){pixel(hair[0],cx+9,cy-8,6,6);pixel(hair[1],cx+12,cy-3,3,14);}
   }
  }
  if(a.eyes!==def.eyes&&!back){
   // Original two irises remain visible through the face opening.
   pixel('#152a2a',cx-6,cy+2,3,3);
   pixel(eyes,cx-5,cy+2,2,2);
   if(!side){pixel('#152a2a',cx+4,cy+2,3,3);pixel(eyes,cx+5,cy+2,2,2);}
  }
  if(a.cape!=='nenhuma'){
   const c=capes[a.cape]||'#51647d';
   // Edge stitching drawn in the same nearest-neighbour material language.
   pixel(c,cx-27,cy+38,4,28);
   if(back){pixel(c,cx+23,cy+38,4,28);pixel('#d5c08a',cx-16,cy+51,30,2);}
  }
  if(a.accessory==='tiara'){
   pixel('#302821',cx-9,cy-10,18,3);
   pixel('#d8bc75',cx-8,cy-10,16,2);
   pixel('#63c8cc',cx-2,cy-11,4,4);
  }else if(a.accessory==='brinco'&&!back){
   const bx=side?cx+8:cx+11;
   pixel('#a87c3f',bx,cy+7,3,6);
   pixel('#f4d79f',bx+1,cy+10,2,3);
  }else if(a.accessory==='amuleto'&&!back){
   pixel('#d3b77d',cx-5,cy+30,10,2);
   pixel('#4a9ea6',cx-3,cy+30,6,8);
   pixel('#a9f4e7',cx-1,cy+32,2,3);
  }
  if(a.outfit!==def.outfit){
   // Distinct woven trim highlights and embroided chest emblem.
   const trim=cloth[a.outfit]?.[1]||'#efd8a6';
   pixel(trim,cx-13,cy+38,3,19);pixel(trim,cx+11,cy+38,3,19);
   pixel(trim,cx-3,cy+47,6,2);
  }
 }
 function needsCustomization(value){const a=APP.normalize(value);return APP.key(a)!==APP.key(APP.DEFAULT);}
 // Every peregrino frame is a complete authored 128x160 PNG cell. Four distinct
 // frames per direction, including the rear-facing row (north movement).
 // Two-frame classes retain their validated 3x2 source without interpolation.
 function walkFrame(role,action,frame=0){
  if(action!=='walk')return 0;
  const index=Number.isFinite(Number(frame))?Math.floor(Number(frame)):0;
  const pose=((index%4)+4)%4;
  return role==='peregrino'?pose:((pose===1||pose===2)?1:0);
 }
 function renderSprite(role,dir,action,frame,appearance,doc=root.document){
  const a=APP.normalize(appearance);
  const walking=action==='walk',step=walkFrame(role,action,frame);
  const mode=walking?'walk':'idle';
  const id=[role,dir,mode,step,APP.key(a)].join(':');
  if(cache.has(id)){const el=cache.get(id);cache.delete(id);cache.set(id,el);return el;}
  if(!doc?.createElement)return null;
  const canvas=doc.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return null;
  ctx.imageSmoothingEnabled=false;
  let drawn=false;
  if(role==='peregrino'){
   drawn=root.OsPeregrinosRunway25D?.draw?.(ctx,{
    x:64,y:156,dir,action:mode,moving:walking,frame:step,
    scale:.975,appearance:null,glow:false
   })===true;
  }else{
   drawn=root.OsPeregrinosApprovedClasses25D?.draw?.(ctx,{
    role,x:64,y:153,dir,action:step?'walk':'idle',now:step?175:0,
    scale:1.74,appearance:null,glow:false
   })===true;
  }
  if(!drawn)return null;
  if(needsCustomization(a)){
   try{
    const image=ctx.getImageData(0,0,WIDTH,HEIGHT);
    applyColors(image,a,role,dir);
    ctx.putImageData(image,0,0);
   }catch(e){
    // Prevent a misleading successful preview if pixel editing is unavailable.
    return null;
   }
   details(ctx,a,role,dir);
  }
  cache.set(id,canvas);if(cache.size>limit)cache.delete(cache.keys().next().value);
  return canvas;
 }
 function draw(ctx,{role='peregrino',dir=2,action='idle',frame=0,appearance=null,x=64,y=160,scale=1,preview=false,documentRef=root.document}={}){
  if(!roles.includes(role)||!ctx?.drawImage)return false;
  const canvas=renderSprite(role,dir,action,frame,appearance,documentRef);
  if(!canvas)return false;
  ctx.imageSmoothingEnabled=false;
  const w=Math.max(1,Math.round(WIDTH*scale)),h=Math.max(1,Math.round(HEIGHT*scale));
  ctx.drawImage(canvas,Math.round(x-w/2),Math.round(y-h),w,h);
  return true;
 }
 function drawWorld(ctx,{role,dir=2,action='idle',frame=0,appearance=null,x,y}={}){
  if(!needsCustomization(appearance)||!Number.isFinite(x)||!Number.isFinite(y))return false;
  return draw(ctx,{role,dir,action,frame,appearance,x,y:y+2,scale:.73});
 }
 return Object.freeze({VERSION,WIDTH,HEIGHT,draw,drawWorld,walkFrame,applyColors,details,needsCustomization,renderSprite,clearCache:()=>cache.clear()});
});

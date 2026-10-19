'use strict';
/** Guardião V9.1: transparent 4-direction 8-phase gait + live RGBA character palettes.
 * Uses the approved V9.0 full-body atlases unchanged for combat/death. No changes
 * to network, collisions, progression, account schemas, or 3D guild fortresses.
 * The four colour variants are generated from ONE pixel source: never maintain
 * a divergent set of red/green/purple action sheets or alter pixel geometry.
 */
(function(root,factory){
 const prior=typeof module==='object'&&module.exports?require('./guardiao-v90.js'):root.OsPeregrinosGuardiaoV90;
 const api=factory(root,prior);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosGuardiaoV91=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root,prior){
 const W=256,H=160,COLS=8,ROWS=4;
 const SOURCE='/assets/guardiao-v91/guardiao-walk-4x8-v91.png?v=20261019-v91';
 const OUTFITS=Object.freeze({
  vinho:'#a43d49',vermelho:'#c04443',floresta:'#347a52',safira:'#2559a2',
  ocre:'#b8944e',violeta:'#7852ac',rosa:'#bd568b',marfim:'#c5bcb0',
  grafite:'#626978',branco:'#e1e2da'
 });
 const CAPES=Object.freeze({vinho:'#a43d49',marinho:'#3769ac',musgo:'#347a52',marfim:'#d9cdb2',rosa:'#bf6094'});
 const HAIR=Object.freeze({castanho:'#885d44',preto:'#353039',loiro:'#d3a85c',ruivo:'#bc6444',branco:'#dce0de',azul:'#526b9e',rosa:'#c37d9d'});
 const SKINS=Object.freeze({claro:'#f0cda8',dourado:'#dea978',oliva:'#b78a65',bronze:'#9e674a',escuro:'#76503f',profundo:'#52392f'});
 const DEFAULT=Object.freeze({outfit:'original',cape:'nenhuma',hairColor:'castanho',skin:'dourado'});
 let walkImage=null,loading=null,failed=false;
 const frameCache=new Map(),maxCache=240;
 const normalizeDir=d=>Number.isInteger(d)?((d%4+4)%4):2;
 const phase=(frame,now)=>{const k=Number.isFinite(frame)?Math.floor(frame):Math.floor((Number(now)||0)/112);return ((k%8)+8)%8;};
 function normalize(a){const app=root.PeregrinosAppearance16?.normalize?.(a)||a||{};
  const out={};for(const key of Object.keys(DEFAULT))out[key]=typeof app[key]==='string'?app[key]:DEFAULT[key];
  return out;
 }
 function colors(a){const app=normalize(a);return {
  outfit:OUTFITS[app.outfit]||null,cape:CAPES[app.cape]||null,
  hair:app.hairColor==='castanho'?null:HAIR[app.hairColor]||null,
  skin:app.skin==='dourado'?null:SKINS[app.skin]||null,
  hideCape:app.cape==='sem_capa',
 };}
 function hexRgb(hex){return [1,3,5].map(i=>Number.parseInt(hex.slice(i,i+2),16));}
 function hueTint(rgb,hex,brightness=1){
  const [r,g,b]=rgb,target=hexRgb(hex);
  const lum=(.299*r+.587*g+.114*b)/255;
  // Preserve painted ink/shadows/highlights within each ORIGINAL pixel.
  const factor=Math.max(.13,Math.min(1.7,(.42+lum*.88)*brightness));
  return target.map(v=>Math.max(0,Math.min(255,Math.round(v*factor))));
 }
 function cloakRegion(x,y,dir){
  if(dir===0)return x>=82&&x<=174&&y>=63&&y<=151;
  if(dir===1)return x>=69&&x<=121&&y>=62&&y<=139;
  if(dir===3)return x>=135&&x<=187&&y>=62&&y<=139;
  return ((x>=74&&x<=107)||(x>=171&&x<=188))&&y>=59&&y<=141;
 }
 function tint(imageData,a,dir=2){
  const p=colors(a);if(!p.outfit&&!p.cape&&!p.hair&&!p.skin&&!p.hideCape)return imageData;
  const data=imageData.data,w=imageData.width,h=imageData.height,d=normalizeDir(dir);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4,alpha=data[i+3];if(alpha<12)continue;
   const r=data[i],g=data[i+1],b=data[i+2];
   // Never repaint silver metal, gold details, skin or bright magic effects.
   const blue=b>r+35&&b>g+18&&b>41&&(b<225||g<150);
   const cloak=cloakRegion(x,y,d);
   const face=x>=95&&x<=162&&y>=20&&y<=78;
   const brown=(r>g+5&&g>=b-3&&r>42&&r<210);
   const skin=(r>g+13&&g>b+9&&r>70&&g>45&&y>=42&&y<=82);
   let target=null;
   if(p.hair&&face&&y<61&&brown){target=p.hair;}
   else if(p.skin&&face&&skin){target=p.skin;}
   else if(blue){
    if(p.hideCape&&cloak&&r<105&&g<122){data[i+3]=0;continue;}
    target=cloak&&p.cape?p.cape:p.outfit;
   }
   if(target){
    const t=hueTint([r,g,b],target);
    data[i]=t[0];data[i+1]=t[1];data[i+2]=t[2];
   }
  }
  return imageData;
 }
 function load(){
  if(walkImage&&prior?.isReady?.())return Promise.resolve(true);
  if(loading)return loading;
  if(typeof Image==='undefined')return Promise.resolve(false);
  const walk=new Promise(resolve=>{
   if(walkImage)return resolve(true);
   const im=new Image();im.decoding='async';
   im.onload=()=>{if(im.naturalWidth===COLS*W&&im.naturalHeight===ROWS*H){walkImage=im;failed=false;resolve(true)}
    else{failed=true;resolve(false)}};
   im.onerror=()=>{failed=true;resolve(false)};im.src=SOURCE;
  });
  loading=Promise.all([walk,prior?.load?.()||Promise.resolve(false)]).then(([w,b])=>w&&b);
  return loading;
 }
 function prepare({dir=2,action='idle',now=0,frame=null,elapsed=0,appearance=null,documentRef=root.document}={}){
  const d=normalizeDir(dir),p=phase(frame,now),oldFrame=prior?.frameIndex?.({dir:d,action,now,frame,elapsed})??0;
  const ref=action==='walk'?'walk:'+d+':'+p:'old:'+action+':'+d+':'+oldFrame;
  const palette=normalize(appearance);const key=[ref,palette.outfit,palette.cape,palette.hairColor,palette.skin].join('|');
  if(frameCache.has(key)){
    const im=frameCache.get(key);frameCache.delete(key);frameCache.set(key,im);return im;
  }
  if(!documentRef?.createElement)return null;
  const canvas=documentRef.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return null;
  ctx.imageSmoothingEnabled=false;
  if(action==='walk'&&walkImage){ctx.drawImage(walkImage,p*W,d*H,W,H,0,0,W,H);}
  else if(!prior?.draw?.(ctx,{role:'guardiao',x:W/2,y:148,dir:d,action,now,frame,elapsed,scale:1,glow:false}))return null;
  const c=colors(palette);
  if((c.outfit||c.cape||c.hair||c.skin||c.hideCape)&&ctx.getImageData&&ctx.putImageData){
   try{const data=ctx.getImageData(0,0,W,H);tint(data,palette,d);ctx.putImageData(data,0,0)}catch{return null}
  }
  frameCache.set(key,canvas);while(frameCache.size>maxCache)frameCache.delete(frameCache.keys().next().value);
  return canvas;
 }
 function draw(ctx,{role='guardiao',x=0,y=0,dir=2,action='idle',now=0,frame=null,elapsed=0,
  scale=.86,appearance=null,glow=false,documentRef=root.document}={}){
  if(role!=='guardiao'||!ctx?.drawImage)return false;
  const image=prepare({dir,action,now,frame,elapsed,appearance,documentRef});
  if(!image){if(!loading)void load();return false;}
  const width=Math.max(1,Math.round(W*scale)),height=Math.max(1,Math.round(H*scale));
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(glow){ctx.globalAlpha=.13;ctx.fillStyle='#83b7de';ctx.beginPath();
   ctx.ellipse(x,y+3,Math.round(36*scale),Math.round(9*scale),0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  ctx.drawImage(image,Math.round(x-width/2),Math.round(y-151*scale),width,height);
  ctx.restore();return true;
 }
 function drawWorld(ctx,options={}){return draw(ctx,{...options,role:'guardiao',scale:.86});}
 if(typeof document!=='undefined')void load();
 return Object.freeze({VERSION:'guardiao-v91-four-direction-walk-customizable',SOURCE,WIDTH:W,HEIGHT:H,
  DIRECTIONS:4,WALK_FRAMES:8,OUTFITS,CAPES,HAIR,SKINS,load,prepare,draw,drawWorld,
  normalize,colors,tint,phase,normalizeDir,isReady:()=>!!walkImage&&!!prior?.isReady?.(),hasFailed:()=>failed});
});
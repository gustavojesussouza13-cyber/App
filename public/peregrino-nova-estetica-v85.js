'use strict';
/**
 * Os Peregrinos: visual preview of the NEW 64x80 Peregrino approved direction.
 * Asset: 4 directions (back/right/front/left) × 11 FULL-BODY states.
 * Only in experimental. Other classes / simulation unchanged.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosPeregrinoV85=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 const VERSION='peregrino-v87-personalizacao-sete-opcoes';
 const SRC='/assets/peregrino/peregrino-nova-estetica-v85-64x80.png?v=approved-preview-v85-01';
 const WIDTH=64,HEIGHT=80,COLS=4,ROWS=11;
 const DIRECTION=Object.freeze({0:0,1:1,2:2,3:3});
 const STATES=Object.freeze({idle:0,walk1:1,walk2:2,walk3:3,hurt:4,death1:5,death2:6,death3:7,prepare:8,attack:9,recover:10});
 const CLOTH=Object.freeze({rosa:[219,93,144],vinho:[160,61,86],floresta:[63,139,82],safira:[57,111,175],ocre:[169,120,54],violeta:[115,78,163],marfim:[214,205,181]});
 const CAPE=Object.freeze({rosa:CLOTH.rosa,vinho:CLOTH.vinho,marinho:CLOTH.safira,musgo:CLOTH.floresta,marfim:CLOTH.marfim});
 const SKIN=Object.freeze({claro:[244,197,151],dourado:[222,166,112],oliva:[190,135,96],bronze:[154,101,70],escuro:[109,74,56],profundo:[75,49,43]});
 const HAIR=Object.freeze({castanho:'#6e4930',preto:'#25242a',loiro:'#e8b45b',ruivo:'#bb623a',branco:'#e0dbce',azul:'#5769a4',rosa:'#e685aa'});
 const EYES=Object.freeze({castanho:'#513524',azul:'#4c9bcf',verde:'#51ae83',mel:'#b58c54',cinza:'#8a9aa2'});
 let image=null,ready=false,loading=null;
 const cache=new Map();
 function isReady(){return ready}
 function load(){
  if(ready)return Promise.resolve(true);
  if(loading)return loading;
  if(typeof root.Image!=='function')return Promise.resolve(false);
  loading=new Promise(resolve=>{
   const im=new root.Image();
   im.onload=()=>{
    if(im.naturalWidth!==WIDTH*COLS||im.naturalHeight!==HEIGHT*ROWS){resolve(false);return}
    image=im;ready=true;cache.clear();resolve(true);
   };
   im.onerror=()=>{loading=null;resolve(false)};
   im.src=SRC;
  });
  return loading;
 }
 function actionRow({action='idle',now=0,elapsed=0,frame=null}={}){
  const t=Math.max(0,Number(elapsed)||0);
  if(action==='idle'||action==='rest')return STATES.idle;
  if(action==='walk')return 1+(((Number.isInteger(frame)?frame:Math.floor(now/135))%3+3)%3);
  if(action==='hurt')return STATES.hurt;
  if(action==='death')return t<220?STATES.death1:t<480?STATES.death2:STATES.death3;
  if(action==='prepare')return STATES.prepare;
  if(action==='attack'||action==='skill')return t<125?STATES.prepare:t<265?STATES.attack:STATES.recover;
  return STATES.idle;
 }
 function sourceRect(dir,row){return {sx:WIDTH*(DIRECTION[dir]??2),sy:HEIGHT*Math.max(0,Math.min(ROWS-1,row)),sw:WIDTH,sh:HEIGHT}}
 function normalize(appearance){return root.PeregrinosAppearance16?.normalize?.(appearance)||appearance||{}}
 function paintHairAndEyes(ctx,a,dir,row){
  if(dir!==2||row>5&&row<9)return;
  // The hood casts the same shadow on every customization. Tiny bespoke
  // pixels inside its front opening show the selected hair/eye colors.
  const color=HAIR[a.hairColor]||HAIR.castanho;
  if(a.hairStyle&&a.hairStyle!=='curto'){
   ctx.fillStyle=color;
   const offset=row===4?1:0;
   if(a.hairStyle==='raspado')ctx.fillRect(29,38+offset,7,1);
   else{
    ctx.fillRect(29,36+offset,7,1);
    if(['longo','tranca','rabo'].includes(a.hairStyle)){
     ctx.fillRect(27,41+offset,2,a.hairStyle==='longo'?6:4);
     if(a.hairStyle==='tranca')ctx.fillRect(36,43+offset,2,6);
    }
    if(a.hairStyle==='medio')ctx.fillRect(36,40+offset,1,3);
   }
  }
  if(a.eyes&&a.eyes!=='castanho'){
   ctx.fillStyle=EYES[a.eyes]||EYES.castanho;
   ctx.fillRect(29,42,1,1);ctx.fillRect(35,42,1,1);
  }
  if(a.accessory==='tiara'){ctx.fillStyle='#d3a75c';ctx.fillRect(27,35,10,1)}
  if(a.accessory==='brinco'){ctx.fillStyle='#ebbf67';ctx.fillRect(39,44,1,2)}
  if(a.accessory==='amuleto'){ctx.fillStyle='#f8d280';ctx.fillRect(33,50,2,2)}
 }
 function recolor(bytes,a,dir,row){
  const atelier=root.OsPeregrinosPeregrinoAtelierV87||(typeof module==='object'&&module.exports?require('./peregrino-atelier-v87'):null);
  if(atelier?.repaintRGBA?.(bytes,a,dir,row))return bytes;
  const color=CLOTH[a.outfit]||CAPE[a.cape]||null;
  const skin=SKIN[a.skin]||null;
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
   const i=(y*WIDTH+x)*4;
   if(bytes[i+3]<10)continue;
   const r=bytes[i],g=bytes[i+1],b=bytes[i+2];
   // Repaint ONLY the old blue garment pixels, retaining per-pixel shadows.
   // The ivory hood, brown leather, lantern, metallic details do not change.
   if(color&&b>r+14&&b>g+7&&b>57&&r<168){
    const shade=Math.max(.34,Math.min(1.38,(r*.25+g*.35+b*.40)/99));
    bytes[i]=Math.round(Math.min(255,color[0]*shade));
    bytes[i+1]=Math.round(Math.min(255,color[1]*shade));
    bytes[i+2]=Math.round(Math.min(255,color[2]*shade));
   }
   // Facial skin recolor bounded strictly inside the hood's face opening.
   if(skin&&a.skin!=='dourado'&&dir!==0&&x>=24&&x<=42&&y>=34&&y<=49&&
    r>g+15&&g>b+7&&r>=85&&b<135){
    const shade=Math.max(.53,Math.min(1.22,(r+g+b)/395));
    bytes[i]=Math.min(255,Math.round(skin[0]*shade));
    bytes[i+1]=Math.min(255,Math.round(skin[1]*shade));
    bytes[i+2]=Math.min(255,Math.round(skin[2]*shade));
   }
  }
  return bytes;
 }
 function sheetFrame(dir=2,row=0,appearance=null,doc=root.document){
  if(!ready||!doc?.createElement)return null;
  const a=normalize(appearance),key=[dir,row,JSON.stringify(a)].join(':');
  if(cache.has(key))return cache.get(key);
  const canvas=doc.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return null;
  ctx.imageSmoothingEnabled=false;
  const r=sourceRect(dir,row);
  ctx.drawImage(image,r.sx,r.sy,r.sw,r.sh,0,0,WIDTH,HEIGHT);
  const changed=(a.outfit&&a.outfit!=='original')||(a.cape&&a.cape!=='nenhuma')||(a.skin&&a.skin!=='dourado');
  if(changed&&ctx.getImageData){
   const frame=ctx.getImageData(0,0,WIDTH,HEIGHT);
   recolor(frame.data,a,dir,row);ctx.putImageData(frame,0,0);
  }
  const atelier=root.OsPeregrinosPeregrinoAtelierV87||(typeof module==='object'&&module.exports?require('./peregrino-atelier-v87'):null);
  if(atelier?.drawDetails)atelier.drawDetails(ctx,a,dir,row);
  else paintHairAndEyes(ctx,a,dir,row);
  cache.set(key,canvas);if(cache.size>240)cache.delete(cache.keys().next().value);
  return canvas;
 }
 function draw(ctx,{x=0,y=0,dir=2,action='idle',appearance=null,now=0,elapsed=0,frame=null,scale=1.45,glow=false,documentRef=root.document}={}){
  if(!ready||!ctx?.drawImage)return false;
  const row=actionRow({action,now,elapsed,frame});
  const tile=sheetFrame(dir,row,appearance,documentRef);
  if(!tile)return false;
  const w=Math.round(WIDTH*scale),h=Math.round(HEIGHT*scale);
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(glow&&ctx.fillRect){ctx.globalAlpha=.11;ctx.fillStyle='#76d3e8';ctx.fillRect(x-w*.3,y,w*.6,2);ctx.globalAlpha=1}
  ctx.drawImage(tile,Math.round(x-w/2),Math.round(y-h+2),w,h);
  if(action==='skill'&&elapsed<360&&ctx.fillRect){
   ctx.fillStyle='#a3e4fb';for(let i=0;i<5;i++){
    const px=x+Math.cos(now/110+i*1.25)*25*scale;
    const py=y-h*.64+Math.sin(now/110+i*1.25)*12*scale;
    ctx.fillRect(Math.round(px),Math.round(py),Math.max(2,Math.round(scale*2)),Math.max(2,Math.round(scale*2)));
   }
  }
  ctx.restore();return true;
 }
 if(root.document)void load();
 return Object.freeze({VERSION,SRC,WIDTH,HEIGHT,COLS,ROWS,STATES,isReady,load,actionRow,sourceRect,normalize,recolor,sheetFrame,draw});
});
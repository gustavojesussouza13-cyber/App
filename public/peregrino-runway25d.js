'use strict';
/**
 * Runway Peregrino — sprites reais 4x4 já limpos, RGBA 512x640.
 * Usado somente pelo Peregrino, em estado idle/walk, no Mundo Aberto 2.5D.
 * Não faz chamadas de rede além de carregar a imagem estática local.
 * Conserve a arte autoral anterior como fallback para ações indisponíveis.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosRunway25D=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 const W=128,H=160,COLS=4;
 const SOURCE='/assets/peregrino/peregrino-runway-walk.png?v=runway-peregrino-v1';
 const ROW=Object.freeze({0:1,1:2,2:0,3:3});
 let image=null,ready=false,failed=false,pending=null;
 function load(){
  if(pending)return pending;
  if(typeof Image==='undefined')return Promise.resolve(false);
  pending=new Promise(resolve=>{
   const img=new Image();
   img.decoding='async';
   img.onload=()=>{
    ready=img.naturalWidth===512&&img.naturalHeight===640;
    failed=!ready;
    if(ready)image=img;
    resolve(ready);
   };
   img.onerror=()=>{failed=true;ready=false;resolve(false)};
   img.src=SOURCE;
  });
  return pending;
 }

// V7.8: deterministic extra walk sprites derived from the full-quality
// author-approved 128×160 Runway PNG. No procedural replacement of the
// character, no blurred upscale, no redraw of face/armor/hood or cape.
// A leather-pixel mask isolates the legs and gloves, allowing real opposite
// limbs to swing while retaining the original intricate pixel painting.
const CYCLE=8;
const stride=[0,0.52,1,0.52,0,-0.52,-1,-0.52];
const generated=new Map();
function wrapFrame(v,count=CYCLE){
 const n=Number.isFinite(Number(v))?Math.floor(Number(v)):0;
 return ((n%count)+count)%count;
}
function legMotion(phase,side,y,dir){
 const depth=Math.max(0,Math.min(1,(y-106)/42));
 const forward=dir===1||dir===3?1:0.74;
 const dx=Math.round(phase*side*13*depth*forward);
 const dy=Math.round(phase*side*(dir===0?-3.5:3.5)*depth);
 return {dx,dy};
}
function leatherPixel(r,g,b,x,y,dir){
 if(y<105||y>155||x<28||x>110)return false;
 const warm=r>40&&r>g*1.085&&g>b*1.055&&g>20;
 const bootShadow=r<84&&g<74&&b<65&&r>=b*.92;
 // Never detach sapphire cloth, armor trim, water glow or green grass.
 const metallic=Math.abs(r-g)<12&&Math.abs(g-b)<15&&r>110;
 if(metallic||b>r*.93&&b>g*1.15)return false;
 if(dir===0&&y<137)return false; // rear cloak stays untouched
 return warm||bootShadow;
}
/**
 * Pure pixel-by-pixel synthesis; reversible without losing source precision.
 * Only pixels belonging to leg/leather regions move, and each original
 * color/alpha byte is copied as-is. Each leg strides in opposite direction.
 */
function synthesizeGaitFrame(source,width,height,phaseIndex,dir=2){
 const idx=wrapFrame(phaseIndex),strength=stride[idx];
 const out=new Uint8ClampedArray(source);
 if(!strength)return out;
 const moved=[],w=width|0,h=height|0;
 for(let y=105;y<Math.min(h,156);y++)for(let x=28;x<Math.min(w,111);x++){
  const i=(y*w+x)*4;
  if(source[i+3]<40||!leatherPixel(source[i],source[i+1],source[i+2],x,y,dir))continue;
  const pivot=dir===1||dir===3?74:64;
  const side=x<pivot?1:-1;
  const {dx,dy}=legMotion(strength,side,y,dir);
  if(!dx&&!dy)continue;
  // Leaving original leather in place would make three or four legs.
  out[i]=out[i+1]=out[i+2]=out[i+3]=0;
  const tx=x+dx,ty=y+dy;
  if(tx<2||tx>=w-2||ty<2||ty>=h-1)continue;
  moved.push([tx,ty,source[i],source[i+1],source[i+2],source[i+3]]);
 }
 // Restore the original brushwork in the shifted stance: no bilinear lerp.
 for(const [x,y,r,g,b,a] of moved){
  const index=(y*w+x)*4;
  if(a>=out[index+3]){out[index]=r;out[index+1]=g;out[index+2]=b;out[index+3]=a;}
 }
 return out;
}
function gaitFrame(dir,index){
 if(!ready||!image||typeof document==='undefined')return null;
 const safe=((Number(dir)||0)%4+4)%4,idx=wrapFrame(index);
 const key=safe+':'+idx;
 if(generated.has(key))return generated.get(key);
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const c=canvas.getContext('2d',{willReadFrequently:true});
 if(!c)return null;
 c.imageSmoothingEnabled=false;
 const {sx,sy,sw,sh}=frameRect(safe,idx%COLS);
 c.clearRect(0,0,W,H);c.drawImage(image,sx,sy,sw,sh,0,0,W,H);
 if(stride[idx]){
  const original=c.getImageData(0,0,W,H);
  const edited=synthesizeGaitFrame(original.data,W,H,idx,safe);
  original.data.set(edited);c.putImageData(original,0,0);
 }
 generated.set(key,canvas);
 return canvas;
}
 // A leitura da aparência fica restrita ao traje padrão: quem personalizou
 // capa, cabelo, cor ou pele mantém o sprite tradicional correspondente.
 function allowsAppearance(appearance){
  if(!appearance||typeof appearance!=='object')return true;
  const defaults=root.PeregrinosAppearance16?.DEFAULT;
  if(!defaults)return Object.keys(appearance).length===0;
  return Object.entries(appearance).every(([key,value])=>
   value==null||value===''||Object.hasOwn(defaults,key)&&defaults[key]===value);
 }
 function frameRect(dir,frame=0){
  const safe=Number.isFinite(Number(dir))?((Math.floor(Number(dir))%4)+4)%4:2;
  const idx=Number.isFinite(Number(frame))?((Math.floor(Number(frame))%COLS)+COLS)%COLS:0;
  return Object.freeze({sx:idx*W,sy:ROW[safe]*H,sw:W,sh:H});
 }
 function draw(ctx,{x=0,y=0,dir=2,now=0,moving=false,action='idle',
   frame=null,scale=.73,appearance=null,glow=false}={}){
  if(!ready||!image||!ctx?.drawImage||!allowsAppearance(appearance)||
    (action!=='idle'&&action!=='walk'))return false;
  const walking=action==='walk'||moving;
  const index=walking?(Number.isFinite(frame)?frame:Math.floor(now/118)):0;
  const {sx,sy,sw,sh}=frameRect(dir,index);
  const pose=walking?gaitFrame(dir,index):null;
  const dw=Math.max(1,Math.round(W*scale)),dh=Math.max(1,Math.round(H*scale));
  // Os pixels dos pés foram normalizados no rodapé do atlas.
  const px=Math.round(x-dw/2),py=Math.round(y-dh+3*scale);
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  if(glow){
   ctx.globalAlpha=.16;ctx.fillStyle='#69d5d1';
   ctx.beginPath();ctx.ellipse(x,y+2,dw*.28,dw*.095,0,0,Math.PI*2);ctx.fill();
   ctx.globalAlpha=1;
  }
  // Generated 8-pose cycle uses existing high-resolution painting. If local
  // Canvas APIs are unavailable, retain the verified original 4-frame sheet.
  if(pose)ctx.drawImage(pose,0,0,W,H,px,py,dw,dh);
  else ctx.drawImage(image,sx,sy,sw,sh,px,py,dw,dh);
  ctx.restore();
  return true;
 }
 if(typeof document!=='undefined')void load();
 return Object.freeze({
  VERSION:'runway-original-peregrino-v78-real-stride',SOURCE,WIDTH:W,HEIGHT:H,
  load,isReady:()=>ready,hasFailed:()=>failed,
  frameRect,wrapFrame,legMotion,leatherPixel,synthesizeGaitFrame,gaitFrame,allowsAppearance,draw
 });
});

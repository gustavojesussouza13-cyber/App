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
  const index=action==='walk'||moving?
    (Number.isFinite(frame)?frame:Math.floor(now/145)):0;
  const {sx,sy,sw,sh}=frameRect(dir,index);
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
  ctx.drawImage(image,sx,sy,sw,sh,px,py,dw,dh);
  ctx.restore();
  return true;
 }
 if(typeof document!=='undefined')void load();
 return Object.freeze({
  VERSION:'runway-original-peregrino-v1',SOURCE,WIDTH:W,HEIGHT:H,
  load,isReady:()=>ready,hasFailed:()=>failed,frameRect,allowsAppearance,draw
 });
});

'use strict';
/**
 * Os Peregrinos: arte aprovada (Guardião, Arqueiro, Curandeiro).
 * Entrada: atlas real 3 colunas × 2 linhas (64x80 por célula),
 * produzido das artes aprovadas na conversa, com transparência.
 * Colunas: frente, costas, perfil direito; o esquerdo é espelhado.
 * Linhas: repouso, caminhada. Demais ações usam sprites anteriores.
 * Módulo isolado do motor WebGL/fortalezas e da simulação multiplayer.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosApprovedClasses25D=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 const FW=64,FH=80;
 // Habilitar somente depois da publicação dos três PNGs reais aprovados.
 const ASSETS_READY=root.OsPeregrinosApprovedArtEnabled===true;
 const roles=['guardiao','arqueiro','curandeiro'];
 const source=role=>'/assets/approved-classes/'+role+'-sprites-3x2-64x80.png?v=approved-v1';
 const loaded=new Map(),failed=new Set(),pending=new Map();
 function load(role){
  if(!ASSETS_READY)return Promise.resolve(false);
  if(!roles.includes(role))return Promise.resolve(false);
  if(loaded.has(role))return Promise.resolve(true);
  if(pending.has(role))return pending.get(role);
  if(typeof Image==='undefined')return Promise.resolve(false);
  const task=new Promise(resolve=>{
   const im=new Image();
   im.decoding='async';
   im.onload=()=>{
    if(im.naturalWidth===FW*3 && im.naturalHeight===FH*2){
      loaded.set(role,im);failed.delete(role);resolve(true);
    }else {failed.add(role);resolve(false)}
   };
   im.onerror=()=>{failed.add(role);resolve(false)};
   im.src=source(role);
  });
  pending.set(role,task);
  return task;
 }
 function isStandard(appearance){
  if(!appearance||typeof appearance!=='object')return true;
  const defaults=root.PeregrinosAppearance16?.DEFAULT;
  if(!defaults)return Object.keys(appearance).length===0;
  return Object.entries(appearance).every(([k,v])=>v==null||v===''||(Object.hasOwn(defaults,k)&&defaults[k]===v));
 }
 function frameRect(direction=2,walking=false){
  const dir=Number.isInteger(direction)?((direction%4)+4)%4:2;
  return {sx:(dir===2?0:dir===0?1:2)*FW,sy:walking?FH:0,sw:FW,sh:FH,flip:dir===3};
 }
 function draw(ctx,{role,x=0,y=0,dir=2,action='idle',now=0,appearance=null,
   scale=1.45,glow=false}={}){
  if(!roles.includes(role)||!ctx?.drawImage||!isStandard(appearance)||
    (action!=='idle'&&action!=='walk'))return false;
  const img=loaded.get(role);if(!img){if(!pending.has(role))void load(role);return false;}
  const step=action==='walk'&&Math.floor(now/155)%2===1;
  const {sx,sy,sw,sh,flip}=frameRect(dir,step);
  const w=Math.round(FW*scale),h=Math.round(FH*scale);
  const px=Math.round(x-w/2),py=Math.round(y-h+6*scale);
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(glow){
   ctx.globalAlpha=.15;
   ctx.fillStyle=role==='guardiao'?'#83b7de':role==='arqueiro'?'#a4d58b':'#7ae8e5';
   ctx.beginPath();ctx.ellipse(x,y+2,w*.31,w*.1,0,0,Math.PI*2);ctx.fill();
   ctx.globalAlpha=1;
  }
  if(flip){ctx.translate(px+w,0);ctx.scale(-1,1);ctx.drawImage(img,sx,sy,sw,sh,0,py,w,h);}
  else ctx.drawImage(img,sx,sy,sw,sh,px,py,w,h);
  ctx.restore();return true;
 }
 function start(){return Promise.all(roles.map(load))}
 if(typeof document!=='undefined'&&ASSETS_READY)void start();
 return Object.freeze({
  VERSION:'approved-classes-25d-v1',ASSETS_READY,ROLES:roles,FW,FH,source,load,start,
  isReady:role=>loaded.has(role),hasFailed:role=>failed.has(role),
  isStandard,frameRect,draw
 });
});
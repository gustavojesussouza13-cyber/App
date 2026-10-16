'use strict';
/*
 * Os Peregrinos · combate aprovado 2.5D
 * 3 folhas RGBA com 5 poses × 4 direções + flecha e magia com 8 × 4 quadros.
 * Responsabilidade exclusivamente visual — nunca cria acertos ou dano.
 * Se o PNG não existir ou a aparência for personalizada, devolve false
 * para que o sistema atual desenhe o personagem sem regressão.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosApprovedCombat25D=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 const VERSION='approved-combat25d-v1';
 const ROLES=Object.freeze(['guardiao','arqueiro','curandeiro']);
 const FRAMES=Object.freeze(['ready','windup','aim','release','recover']);
 const ROW=Object.freeze({0:1,1:2,2:0,3:3}); // Norte Leste Sul Oeste
 const DIR_BY_KIND=Object.freeze({north:0,east:1,south:2,west:3});
 const SOURCES=Object.freeze({
  guardiao:'/assets/combat-approved/guardiao-combat-approved.png?v=1',
  arqueiro:'/assets/combat-approved/arqueiro-combat-approved.png?v=1',
  curandeiro:'/assets/combat-approved/curandeiro-combat-approved.png?v=1',
  flecha:'/assets/combat-approved/projectile-flecha-approved.png?v=1',
  magia:'/assets/combat-approved/projectile-magia-approved.png?v=1'
 });
 const cache=new Map();
 const pending=new Map();
 const failures=new Set();
 const active=(key)=>cache.get(key)||null;
 function load(key){
  if(!Object.hasOwn(SOURCES,key)||typeof Image==='undefined')return Promise.resolve(false);
  if(active(key))return Promise.resolve(true);
  if(pending.has(key))return pending.get(key);
  const task=new Promise(resolve=>{
   const img=new Image();
   img.decoding='async';
   img.onload=()=>{
    const columns=ROLES.includes(key)?5:8;
    const valid=img.naturalWidth>=columns*32&&
      img.naturalWidth%columns===0&&img.naturalHeight>=4*32&&img.naturalHeight%4===0;
    if(valid){cache.set(key,img);failures.delete(key);}
    else failures.add(key);
    resolve(valid);
   };
   img.onerror=()=>{failures.add(key);resolve(false)};
   img.src=SOURCES[key];
  });
  pending.set(key,task);
  return task;
 }
 function isStandard(appearance){
  if(!appearance||typeof appearance!=='object')return true;
  const defaults=root.PeregrinosAppearance16?.DEFAULT;
  if(!defaults)return Object.keys(appearance).length===0;
  return Object.entries(appearance).every(([k,v])=>
    v==null||v===''||(Object.hasOwn(defaults,k)&&defaults[k]===v));
 }
 function normDir(direction){
  return Number.isInteger(direction)?((direction%4)+4)%4:2;
 }
 function attackFrame(elapsed){
  if(!Number.isFinite(elapsed)||elapsed<0||elapsed>=540)return -1;
  if(elapsed<70)return 0;
  if(elapsed<165)return 1;
  if(elapsed<265)return 2;
  if(elapsed<385)return 3;
  return 4;
 }
 function frameRect(key,dir,frame){
  const image=active(key);
  if(!image)return null;
  const columns=ROLES.includes(key)?5:8;
  const cellWidth=image.naturalWidth/columns;
  const cellHeight=image.naturalHeight/4;
  const column=Math.max(0,Math.min(columns-1,Math.floor(frame)));
  return {sx:column*cellWidth,sy:ROW[normDir(dir)]*cellHeight,
    sw:cellWidth,sh:cellHeight};
 }
 function drawHero(ctx,{role,x=0,y=0,dir=2,now=0,attackAt=null,
    appearance=null,scale=.72,glow=false}={}){
  if(!ROLES.includes(role)||!ctx?.drawImage||!isStandard(appearance))return false;
  const frame=attackFrame(now-attackAt);
  if(frame<0||!Number.isFinite(attackAt))return false;
  const img=active(role);if(!img){if(!pending.has(role))void load(role);return false;}
  const r=frameRect(role,dir,frame);
  const w=Math.max(1,Math.round(r.sw*scale)),h=Math.max(1,Math.round(r.sh*scale));
  const left=Math.round(x-w/2),top=Math.round(y-h+Math.min(10,7*scale));
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  if(glow&&ctx.beginPath&&ctx.ellipse){
   ctx.globalAlpha=.16;ctx.fillStyle=role==='guardiao'?'#7cbaf0':
    role==='arqueiro'?'#9edd74':'#6edff3';
   ctx.beginPath();ctx.ellipse(x,y+2,w*.3,Math.max(4,w*.10),0,0,Math.PI*2);ctx.fill();
   ctx.globalAlpha=1;
  }
  ctx.drawImage(img,r.sx,r.sy,r.sw,r.sh,left,top,w,h);
  ctx.restore();
  return true;
 }
 function projectileDirection(shot){
  if(!Number.isFinite(shot?.angle))return 2;
  const x=Math.cos(shot.angle),y=Math.sin(shot.angle);
  return Math.abs(x)>=Math.abs(y)?(x>=0?1:3):(y>=0?2:0);
 }
 function drawProjectile(ctx,shot){
  const key=(shot?.projectile==='holy-bolt'||shot?.kind?.startsWith('magic'))?'magia':
    (shot?.projectile==='arrow'||['arrow','impact'].includes(shot?.kind))?'flecha':null;
  if(!key||!ctx?.drawImage||!Number.isFinite(shot?.x)||!Number.isFinite(shot?.y))return false;
  const img=active(key);if(!img){if(!pending.has(key))void load(key);return false;}
  const impacting=shot.kind==='impact'||shot.kind==='magic-impact';
  const frame=impacting
    ?(shot.impactAge>95?7:6)
    :Math.min(5,Math.max(0,Math.floor((Number(shot.progress)||0)*6)));
  const rect=frameRect(key,projectileDirection(shot),frame);
  const scale=key==='magia'?.48:.37;
  const w=Math.round(rect.sw*scale),h=Math.round(rect.sh*scale);
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(img,rect.sx,rect.sy,rect.sw,rect.sh,
    Math.round(shot.x-w/2),Math.round(shot.y-h/2),w,h);
  ctx.restore();return true;
 }
 function start(){return Promise.all(Object.keys(SOURCES).map(load))}
 if(typeof document!=='undefined')void start();
 return Object.freeze({VERSION,ROLES,FRAMES,SOURCES,
  load,start,isReady:key=>!!active(key),hasFailed:key=>failures.has(key),
  normDir,attackFrame,frameRect,drawHero,drawProjectile,isStandard});
});

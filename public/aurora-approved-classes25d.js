'use strict';
/**
 * Os Peregrinos — integração das artes aprovadas para as três classes.
 * Atlas PNG transparente 192x160, 3 direções x 2 poses, cada célula 64x80.
 * As direções esquerda/direita compartilham perfil espelhado.
 * Faz fallback para os desenhos autorais anteriores se o PNG faltar ou falhar.
 * Nenhuma regra de combate, guilda ou fortaleza é modificada.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosClassesAprovadas25D=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 const WIDTH=64,HEIGHT=80,COLS=3,ROWS=2;
 const ROLES=Object.freeze(['guardiao','arqueiro','curandeiro']);
 const SRC=Object.freeze(Object.fromEntries(ROLES.map(role=>
  [role,'/assets/classes/'+role+'-gameatlas-3x2.png?v=aurora-aprovado-v1'])));
 const images=new Map(),pending=new Map(),failed=new Set();
 const COLUMN=Object.freeze({0:1,1:2,2:0,3:2});
 function load(role){
  if(!ROLES.includes(role)||typeof Image==='undefined')return Promise.resolve(false);
  if(images.has(role))return Promise.resolve(true);
  if(pending.has(role))return pending.get(role);
  const p=new Promise(resolve=>{
   const image=new Image();
   image.decoding='async';
   image.onload=()=>{
    if(image.naturalWidth===WIDTH*COLS&&image.naturalHeight===HEIGHT*ROWS){
     images.set(role,image);resolve(true);
    }else{failed.add(role);resolve(false);}
   };
   image.onerror=()=>{failed.add(role);resolve(false)};
   image.src=SRC[role];
  });
  pending.set(role,p);
  return p;
 }
 function frameRect(dir=2,frame=0,moving=false){
  const facing=Number.isInteger(dir)?((dir%4)+4)%4:2;
  const pose=moving?1:0;
  return {sx:COLUMN[facing]*WIDTH,sy:pose*HEIGHT,sw:WIDTH,sh:HEIGHT,flipX:facing===3};
 }
 function allowsAppearance(appearance){
  if(!appearance||typeof appearance!=='object')return true;
  const defaults=root.PeregrinosAppearance16?.DEFAULT;
  if(!defaults)return Object.keys(appearance).length===0;
  return Object.entries(appearance).every(([key,val])=>val==null||val===''||
   (Object.hasOwn(defaults,key)&&defaults[key]===val));
 }
 function draw(ctx,{role,x=0,y=0,dir=2,now=0,moving=false,action='idle',
  appearance=null,scale=1.32,glow=false}={}){
  if(!ROLES.includes(role)||!images.has(role)||!ctx?.drawImage||
    !allowsAppearance(appearance)||!['idle','walk'].includes(action))return false;
  const img=images.get(role),f=frameRect(dir,Math.floor(now/160),moving||action==='walk');
  const w=Math.round(WIDTH*scale),h=Math.round(HEIGHT*scale);
  const left=Math.round(x-w/2),top=Math.round(y-h+6*scale);
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(glow){
   ctx.fillStyle=role==='curandeiro'?'#73d7df':role==='arqueiro'?'#7cbb7b':'#719cc2';
   ctx.globalAlpha=.16;ctx.beginPath();ctx.ellipse(x,y+2,w*.36,w*.12,0,0,Math.PI*2);ctx.fill();
   ctx.globalAlpha=1;
  }
  if(f.flipX){
   ctx.translate(left+w,0);ctx.scale(-1,1);
   ctx.drawImage(img,f.sx,f.sy,f.sw,f.sh,0,top,w,h);
  }else ctx.drawImage(img,f.sx,f.sy,f.sw,f.sh,left,top,w,h);
  ctx.restore();return true;
 }
 if(typeof document!=='undefined')for(const role of ROLES)void load(role);
 return Object.freeze({VERSION:'approved-classes-v1',ROLES,SRC,WIDTH,HEIGHT,
  load,isReady:role=>images.has(role),failed:role=>failed.has(role),frameRect,draw});
});

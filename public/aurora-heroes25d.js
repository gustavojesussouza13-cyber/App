'use strict';
/**
 * OS PEREGRINOS · heróis Aurora 2.5D v1
 * Pontes de arte autoral 64 × 80: Peregrino Artisan + Heroes Master.
 * Usa apenas pixels nativos, sem dependências externas ou filtros.
 * Esta API desenha cosméticos no Canvas 2D; não toca em colisões,
 * estatísticas, servidor, guildas nem nas fortalezas 3D.
 */
(function(root,factory){
 const pilgrim=typeof module==='object'&&module.exports
  ?require('./peregrino-aurora25d.js'):root.OsPeregrinosAurora25D;
 const heroes=typeof module==='object'&&module.exports
  ?require('./heroes-master64.js'):root.OsPeregrinosHeroesMaster64;
 const result=factory(pilgrim,heroes);
 if(typeof module==='object'&&module.exports)module.exports=result;
 if(root)root.OsPeregrinosHeroesAurora25D=result;
})(typeof globalThis!=='undefined'?globalThis:this,function(pilgrim,heroes){
 const WIDTH=64,HEIGHT=80,ROLES=['peregrino','guardiao','arqueiro','curandeiro'];
 const ACTIONS=Object.freeze({idle:4,walk:6,attack:5,hurt:3,death:5});
 const MAX_CACHE=192,cache=new Map();
 function roleOf(role){return ROLES.includes(role)?role:null;}
 function frameOf(value,length){return Number.isFinite(value)?((Math.floor(value)%length)+length)%length:0;}
 function directionOf(value){return Number.isInteger(value)?((value%4)+4)%4:2;}
 function prepare(role,dir=2,action='idle',frame=0,appearance=null){
  role=roleOf(role);
  if(!role||typeof document==='undefined')return null;
  dir=directionOf(dir);
  action=Object.hasOwn(ACTIONS,action)?action:'idle';
  frame=frameOf(frame,ACTIONS[action]);
  // A aparência de cada jogador é parte da chave: os quadros não se misturam.
  const face=appearance&&typeof appearance==='object'?JSON.stringify(appearance):'padrão';
  const key=[role,dir,action,frame,face].join('|');
  if(cache.has(key)){
   const saved=cache.get(key);
   cache.delete(key);cache.set(key,saved);
   return saved;
  }
  let image=null;
  if(role==='peregrino')image=pilgrim?.prepare(dir,action,frame,appearance)||null;
  else if(heroes?.draw){
   image=document.createElement('canvas');
   image.width=WIDTH;image.height=HEIGHT;
   const ctx=image.getContext('2d',{alpha:true});
   if(!ctx){image=null;}
   else{
    ctx.imageSmoothingEnabled=false;
    // Cada profissão utiliza a SUA silhueta, equipamento e animação 64x80.
    if(!heroes.draw(ctx,{role,dir,action,frame,appearance}))image=null;
   }
  }
  if(!image)return null;
  cache.set(key,image);
  while(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);
  return image;
 }
 function draw(ctx,{role='peregrino',x=0,y=0,dir=2,action='idle',
  frame=0,appearance=null,scale=1.32,glow=false}={}){
  if(!ctx?.drawImage)return false;
  const source=prepare(role,dir,action,frame,appearance);
  if(!source)return false;
  const w=Math.max(1,Math.round(WIDTH*scale));
  const h=Math.max(1,Math.round(HEIGHT*scale));
  const px=Math.round(x-w/2),py=Math.round(y-h+6*scale);
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  if(glow){
   const glowColor=role==='curandeiro'?'#7ae8e5':role==='arqueiro'?'#a4d58b':
    role==='guardiao'?'#83b7de':'#66d7cc';
   ctx.globalAlpha=.16;
   ctx.fillStyle=glowColor;
   ctx.beginPath();
   ctx.ellipse(Math.round(x),Math.round(y+1),Math.round(w*.36),Math.round(w*.13),0,0,Math.PI*2);
   ctx.fill();
   ctx.globalAlpha=1;
  }
  ctx.drawImage(source,px,py,w,h);
  ctx.restore();
  return true;
 }
 function atlas(role='peregrino',action='walk'){
  if(!roleOf(role)||typeof document==='undefined')return null;
  const count=ACTIONS[action]||ACTIONS.walk;
  const out=document.createElement('canvas');
  out.width=WIDTH*count;out.height=HEIGHT*4;
  const ctx=out.getContext('2d');
  if(!ctx)return null;
  for(let direction=0;direction<4;direction++)for(let frame=0;frame<count;frame++){
   const sprite=prepare(role,direction,action,frame);
   if(sprite)ctx.drawImage(sprite,frame*WIDTH,direction*HEIGHT);
  }
  return out;
 }
 return Object.freeze({VERSION:'aurora-heroes25d-v1',WIDTH,HEIGHT,ROLES,
  ACTIONS,prepare,draw,atlas});
});

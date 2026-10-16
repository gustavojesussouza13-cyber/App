'use strict';
/**
 * Criaturas principais de Auren: sprites 64×80, pixel a pixel, aproveitando
 * as anatomias autorais já presentes no projeto.
 * Somente camada visual do Mundo Aberto 2.5D; não altera IA, vida, drops,
 * progressão por mortes, hitbox nem salas multiplayer.
 */
(function(root,factory){
 const master=typeof module==='object'&&module.exports
  ?require('./world-art-master64.js'):root.OsPeregrinosWorldMaster64;
 const api=factory(master);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosAuroraCreatures25D=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(master){
 const ROLES=Object.freeze(['limo','lobo','aranha','esqueleto','golem']);
 const ACTIONS=Object.freeze({idle:4,walk:6,attack:5,hurt:3,death:5});
 const W=64,H=80,MAX_CACHE=120;
 const cache=new Map();
 function prepare(type,dir=2,action='idle',frame=0,boss=false,zone=0,species=0){
  if(!ROLES.includes(type)||!master?.creature||typeof document==='undefined')return null;
  const facing=Number.isInteger(dir)?((dir%4)+4)%4:2;
  const motion=Object.hasOwn(ACTIONS,action)?action:'idle';
  const f=Number.isFinite(frame)?((Math.floor(frame)%ACTIONS[motion])+ACTIONS[motion])%ACTIONS[motion]:0;
  const key=[type,facing,motion,f,Number(!!boss),zone|0,species|0].join('|');
  if(cache.has(key)){
   const saved=cache.get(key);cache.delete(key);cache.set(key,saved);return saved;
  }
  const image=document.createElement('canvas');image.width=W;image.height=H;
  const g=image.getContext('2d',{alpha:true});if(!g)return null;
  g.imageSmoothingEnabled=false;
  if(!master.creature(g,{type,dir:facing,action:motion,frame:f,
   boss:!!boss,zone:zone|0,species:species|0}))return null;
  cache.set(key,image);
  while(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);
  return image;
 }
 function draw(g,{type,x=0,y=0,dir=2,action='idle',frame=0,
  boss=false,zone=0,species=0,scale=null}={}){
  if(!g?.drawImage)return false;
  const img=prepare(type,dir,action,frame,boss,zone,species);if(!img)return false;
  const s=Number.isFinite(scale)?Math.min(2.5,Math.max(.4,scale)):(boss?1.68:1.28);
  const w=Math.round(W*s),h=Math.round(H*s);
  g.save();g.imageSmoothingEnabled=false;
  g.drawImage(img,Math.round(x-w/2),Math.round(y-h+6*s),w,h);
  g.restore();return true;
 }
 return Object.freeze({VERSION:'aurora-creatures25d-v1',ROLES,ACTIONS,
  WIDTH:W,HEIGHT:H,prepare,draw});
});

'use strict';
/**
 * Os Peregrinos — Peregrino Aurora 2.5D: sprite nativo 64x80.
 * Reaproveita o desenho autoral pixel a pixel da classe Peregrino.
 * Mantém a faixa/capa vermelha da identidade clássica e introduz couro
 * azul-petróleo + ouro envelhecido da nova direção artística do Figma.
 * Desenha apenas sobre Canvas 2D. Nunca altera hitbox, servidor,
 * progresso, personagens de outras classes ou fortalezas 3D.
 */
(function(root,factory){
 const artisan=typeof module==='object'&&module.exports
  ?require('./peregrino-artisan64.js'):root.OsPeregrinosArtisan64;
 const api=factory(artisan);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosAurora25D=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(artisan){
 const W=64,H=80,MAX_CACHE=110;
 const cache=new Map();
 const COLORS=Object.freeze({
  coat:'#345e77',light:'#7295a4',trim:'#e5c181',
  hair:'#50382b',hairLight:'#9f6e4d',skin:'#dea978',
  gem:'#67e4de',eyeColor:'#493c31'
 });
 const VALID_ACTIONS=new Set(['idle','walk','attack','hurt','death']);
 function clampDirection(dir){return Number.isFinite(Number(dir))?((Math.round(Number(dir))%4)+4)%4:2;}
 function validFrame(frame){return Number.isFinite(Number(frame))?Math.max(0,Math.floor(Number(frame))):0;}
 function prepare(dir=2,action='idle',frame=0,appearance=null){
  if(!artisan?.draw||typeof document==='undefined')return null;
  const facing=clampDirection(dir),move=VALID_ACTIONS.has(action)?action:'idle';
  const frameNum=validFrame(frame)%(move==='walk'?6:move==='attack'?5:move==='hurt'?3:move==='death'?5:4);
  // Personalização individual altera cores da pele/cabelo e precisa ter
  // uma chave de cache estável por aparência, evitando trocar rostos.
  const face=appearance&&typeof appearance==='object'?JSON.stringify(appearance):'default';
  const key=[facing,move,frameNum,face].join('|');
  if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
  const image=document.createElement('canvas');image.width=W;image.height=H;
  const c=image.getContext('2d',{alpha:true});
  if(!c)return null;
  c.imageSmoothingEnabled=false;
  const result=artisan.draw(c,{role:'peregrino',dir:facing,action:move,frame:frameNum,colors:COLORS,appearance});
  if(!result)return null;
  cache.set(key,image);
  while(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);
  return image;
 }
 function draw(ctx,{x=0,y=0,dir=2,action='idle',frame=0,appearance=null,scale=1.5,glow=false}={}){
  if(!ctx?.drawImage)return false;
  const img=prepare(dir,action,frame,appearance);if(!img)return false;
  const sizeW=Math.round(W*scale),sizeH=Math.round(H*scale);
  // O pé toca o plano do chão próximo ao rodapé de cada sprite.
  const left=Math.round(x-sizeW/2),top=Math.round(y-sizeH+6*scale);
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  if(glow){
   ctx.globalAlpha=.17;ctx.fillStyle='#52c6ca';
   ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y+2),Math.round(sizeW*.35),Math.round(sizeW*.13),0,0,Math.PI*2);ctx.fill();
   ctx.globalAlpha=1;
  }
  ctx.drawImage(img,left,top,sizeW,sizeH);
  ctx.restore();
  return true;
 }
 function atlas(){
  if(typeof document==='undefined')return null;
  const out=document.createElement('canvas');out.width=W*6;out.height=H*4;
  const ctx=out.getContext('2d');if(!ctx)return null;
  for(let dir=0;dir<4;dir++)for(let i=0;i<6;i++){
   const image=prepare(dir,'walk',i);
   if(image)ctx.drawImage(image,i*W,dir*H);
  }
  return out;
 }
 return Object.freeze({WIDTH:W,HEIGHT:H,VERSION:'peregrino-aurora-25d-v1',
  draw,atlas,prepare,colors:COLORS});
});

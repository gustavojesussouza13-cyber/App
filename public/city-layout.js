'use strict';
/* Os Peregrinos — terreno 3D exclusivo das guildas. Validação compartilhada servidor/cliente.
   Coordenadas antigas e footprints históricos são preservados. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.PeregrinosCityLayout=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 const N=26;
 const CORE=Object.freeze({x:11,y:11,w:4,h:4});
 const footprints=Object.freeze({house:[2,2],farm:[3,3],barracks:[4,3],tower:[2,2],market:[3,2]});
 function size(b){
  if(Number.isSafeInteger(b?.w)&&Number.isSafeInteger(b?.h)&&b.w>=1&&b.h>=1&&b.w<=4&&b.h<=4)return [b.w,b.h];
  // Edifícios pré-existentes sem tamanho explicitado continuam usando exatamente 1x1.
  return [1,1];
 }
 function cells(b){
  const [w,h]=size(b),out=[];
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)out.push([b.x+xx,b.y+yy]);
  return out;
 }
 function at(buildings,x,y){return (buildings||[]).find(b=>cells(b).some(p=>p[0]===x&&p[1]===y))}
 function isCore(x,y){return x>=CORE.x&&x<CORE.x+CORE.w&&y>=CORE.y&&y<CORE.y+CORE.h}
 function plan(type,x,y){const shape=footprints[type];return shape?{type,x,y,w:shape[0],h:shape[1]}:null}
 const areas=Object.freeze([null,[6,19],[4,21],[2,23],[1,24],[0,25]]);
 function bounds(level=5){
  const value=Number.isSafeInteger(level)?Math.max(1,Math.min(5,level)):5;
  const [min,max]=areas[value];
  return {min,max,width:max-min+1,cells:(max-min+1)**2-CORE.w*CORE.h};
 }
 function canPlace(buildings,type,x,y,level=5){
  if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y))return false;
  const b=plan(type,x,y);if(!b)return false;
  const {min,max}=bounds(level);
  return cells(b).every(([cx,cy])=>cx>=min&&cy>=min&&cx<=max&&cy<=max&&!isCore(cx,cy)&&!at(buildings,cx,cy));
 }
 return Object.freeze({N,CORE,footprints,size,cells,at,isCore,plan,bounds,canPlace});
});

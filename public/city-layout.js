'use strict';
/* Regras compartilhadas: servidor sempre valida posições. Edifícios antigos 1x1 são preservados. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.PeregrinosCityLayout=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 const N=11;
 const footprints=Object.freeze({house:[1,1],farm:[2,1],barracks:[2,2],tower:[1,1],market:[2,1]});
 function size(b){if(Number.isInteger(b?.w)&&Number.isInteger(b?.h)&&b.w>=1&&b.h>=1&&b.w<=2&&b.h<=2)return [b.w,b.h];return [1,1]}
 function cells(b){const [w,h]=size(b),out=[];for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)out.push([b.x+xx,b.y+yy]);return out}
 function at(buildings,x,y){return buildings.find(b=>cells(b).some(p=>p[0]===x&&p[1]===y))}
 function plan(type,x,y){const shape=footprints[type];return shape?{type,x,y,w:shape[0],h:shape[1]}:null}
 function canPlace(buildings,type,x,y){
  if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y))return false;
  const building=plan(type,x,y);if(!building)return false;
  return cells(building).every(([cx,cy])=>cx>=0&&cy>=0&&cx<N&&cy<N&&cx!==5&&cy!==5&&!at(buildings,cx,cy));
 }
 return Object.freeze({N,footprints,size,cells,at,plan,canPlace});
});

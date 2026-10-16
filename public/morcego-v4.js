'use strict';
/* Os Peregrinos — Morcego V4 experimental (atlas 4x6, quadros 192x160).
 * Apenas desenho: não altera combate, colisão, espécies ou dados do servidor.
 * Se a imagem falhar, art16.js conserva o sprite antigo.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosBatV4=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const ASSET='/assets/creatures-v3/morcego_v4.png?v=morcego-v4-approved-1';
 const FRAME=Object.freeze({width:192,height:160,cols:4,rows:6});
 function measure(boss=false){
  const factor=boss?1.45:1,width=Math.round(132*factor),height=Math.round(110*factor);
  return {width,height,healthTop:height+12,selectionHeight:height+20};
 }
 function create({windowRef=typeof window!=='undefined'?window:null,
                  imageCtor=typeof Image!=='undefined'?Image:null,
                  animations=windowRef?.OsPeregrinosCreaturesV3}={}){
  const enabled=Boolean(animations?.isDesktop?.(windowRef) && typeof animations.pose==='function' && imageCtor);
  let loaded=false,failed=false,image=null;
  if(enabled){
   image=new imageCtor();
   image.decoding='async';
   image.addEventListener?.('load',()=>{
    loaded=image.naturalWidth===768&&image.naturalHeight===960;
    failed=!loaded;
   });
   image.addEventListener?.('error',()=>{loaded=false;failed=true});
   image.src=ASSET;
   if(image.complete&&image.naturalWidth===768&&image.naturalHeight===960)loaded=true;
  }
  function drawMonster(g,monster,now,state={}){
   if(!enabled||!loaded||failed||!monster||typeof g?.drawImage!=='function')return false;
   if(String(state.type||monster.type||'').toLowerCase()!=='morcego')return false;
   const {width,height}=measure(Boolean(monster.boss));
   const {row,frame}=animations.pose(now,state,((Number(monster.species)||0)%13)*31);
   if(!Number.isInteger(row)||!Number.isInteger(frame)||row<0||row>=6||frame<0||frame>=4)return false;
   const x=Math.round(Number(monster.x)||0),y=Math.round(Number(monster.y)||0);
   g.save();
   try{
    g.imageSmoothingEnabled=false;
    if((Number(monster.dir)||0)===3){g.translate(2*x,0);g.scale(-1,1)}
    g.drawImage(image,frame*FRAME.width,row*FRAME.height,FRAME.width,FRAME.height,
     Math.round(x-width/2),Math.round(y-height),width,height);
   }finally{g.restore()}
   return true;
  }
  return Object.freeze({enabled,get ready(){return loaded&&!failed},drawMonster,measure});
 }
 return Object.freeze({create,measure,FRAME,ASSET});
});

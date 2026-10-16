'use strict';
/* Os Peregrinos — Escorpião V4 experimental. Atlas aprovado 768x960, 4x6 quadros.
 * Camada exclusivamente visual. Não altera física, servidor, ataque ou progressão.
 * Se o PNG estiver ausente ou falhar, retorna false para o renderizador anterior.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosScorpionV4=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const ASSET='/assets/creatures-v4/escorpiao_v4.png?v=escorpiao-v4-approved-1';
 const FRAME=Object.freeze({width:192,height:160,cols:4,rows:6});
 function measure(boss=false){
  const multiplier=boss?1.45:1;
  const width=Math.round(152*multiplier),height=Math.round(110*multiplier);
  return {width,height,healthTop:height+12,selectionHeight:height+20};
 }
 function create({windowRef=typeof window!=='undefined'?window:null,
                  imageCtor=typeof Image!=='undefined'?Image:null,
                  animations=windowRef?.OsPeregrinosCreaturesV3}={}){
  const enabled=Boolean(animations?.isDesktop?.(windowRef) && typeof animations.pose==='function' && imageCtor);
  let loaded=false,failed=false,image=null;
  if(enabled){
   image=new imageCtor();image.decoding='async';
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
   if(String(state.type||monster.type||'').toLowerCase()!=='escorpiao')return false;
   const {width,height}=measure(Boolean(monster.boss));
   const {row,frame}=animations.pose(now,state,((Number(monster.species)||0)%13)*31);
   if(!Number.isInteger(row)||!Number.isInteger(frame)||row<0||row>=FRAME.rows||frame<0||frame>=FRAME.cols)return false;
   const x=Math.round(Number(monster.x)||0),y=Math.round(Number(monster.y)||0);
   let drawn=false,saved=false;
   try{
    g.save();saved=true;g.imageSmoothingEnabled=false;
    if((Number(monster.dir)||0)===3){g.translate(2*x,0);g.scale(-1,1)}
    g.drawImage(image,frame*FRAME.width,row*FRAME.height,FRAME.width,FRAME.height,
     Math.round(x-width/2),Math.round(y-height),width,height);
    drawn=true;
   }catch(_error){
    // A imagem original continua disponível via fallback de art16.js.
   }finally{if(saved)g.restore()}
   return drawn;
  }
  return Object.freeze({enabled,get ready(){return loaded&&!failed},drawMonster,measure});
 }
 return Object.freeze({create,measure,FRAME,ASSET});
});

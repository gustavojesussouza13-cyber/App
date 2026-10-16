'use strict';
/* Os Peregrinos — bestiário V3 desktop. Cinco atlas RGBA 4x6.
 * Apenas renderização: sem alterações de combate, hitbox, servidor ou progressão.
 * PNG indisponível: devolve false e preserva o renderizador anterior.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosCreaturesV3=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const TYPES=Object.freeze(['limo','lobo','aranha','esqueleto','golem']);
 const FRAME=Object.freeze({width:192,height:160,cols:4,rows:6});
 const ROWS=Object.freeze({repouso:0,caminhada:1,preparacao:2,ataque:3,dano:4,morte:5});
 const SIZES=Object.freeze({
  limo:[96,83],lobo:[112,96],aranha:[108,93],esqueleto:[94,112],golem:[120,124]
 });
 function isDesktop(host){
  try{return !!host?.matchMedia?.('(min-width: 901px)')?.matches}
  catch{return false}
 }
 function measure(type,boss=false){
  const s=SIZES[type]||[96,96],factor=boss?1.45:1;
  const width=Math.round(s[0]*factor),height=Math.round(s[1]*factor);
  return {width,height,healthTop:height+12,selectionHeight:height+20};
 }
 function pose(now,state={},seed=0){
  const elapsed=Math.max(0,Number(state.elapsed)||0);
  const tick=(ms)=>Math.abs(Math.floor((Math.max(0,Number(now)||0)+seed)/ms))%4;
  if(state.dead)return {row:ROWS.morte,frame:Math.min(3,Math.floor(elapsed/145))};
  if(state.hurt)return {row:ROWS.dano,frame:Math.min(3,Math.floor(elapsed/78))};
  if(state.attacking||state.skill||state.usingSkill){
   if(elapsed<120)return {row:ROWS.preparacao,frame:Math.min(3,Math.floor(elapsed/30))};
   return {row:ROWS.ataque,frame:Math.min(3,Math.floor((elapsed-120)/85))};
  }
  if(state.preparing)return {row:ROWS.preparacao,frame:tick(90)};
  if(state.moving)return {row:ROWS.caminhada,frame:tick(135)};
  return {row:ROWS.repouso,frame:tick(230)};
 }
 function create({windowRef=typeof window!=='undefined'?window:null,
                  imageCtor=typeof Image!=='undefined'?Image:null}={}){
  const enabled=isDesktop(windowRef);
  const images=new Map(),ready=new Set(),failed=new Set();
  if(enabled&&imageCtor){
   for(const type of TYPES){
    const img=new imageCtor();img.decoding='async';
    img.addEventListener?.('load',()=>{
     if(img.naturalWidth===768&&img.naturalHeight===960){ready.add(type);failed.delete(type)}
     else {failed.add(type);ready.delete(type)}
    });
    img.addEventListener?.('error',()=>{failed.add(type);ready.delete(type)});
    img.src='/assets/creatures-v3/'+type+'_v3.png?v=review-v3';
    if(img.complete&&img.naturalWidth===768&&img.naturalHeight===960)ready.add(type);
    images.set(type,img);
   }
  }
  function drawMonster(g,monster,now,state={}){
   if(!enabled||!monster||typeof g?.drawImage!=='function')return false;
   const type=String(state.type||monster.type||'').toLowerCase();
   if(!images.has(type)||!ready.has(type)||failed.has(type))return false;
   const {width,height}=measure(type,Boolean(monster.boss));
   const seed=((Number(monster.species)||0)%13)*31;
   const {row,frame}=pose(now,state,seed);
   const x=Math.round(Number(monster.x)||0),y=Math.round(Number(monster.y)||0);
   g.save();g.imageSmoothingEnabled=false;
   if((Number(monster.dir)||0)===3){g.translate(2*x,0);g.scale(-1,1)}
   g.drawImage(images.get(type),frame*FRAME.width,row*FRAME.height,FRAME.width,FRAME.height,
    Math.round(x-width/2),Math.round(y-height),width,height);
   g.restore();
   return true;
  }
  return Object.freeze({enabled,drawMonster,get ready(){return ready.size===TYPES.length},
   get loadedTypes(){return [...ready]},measure,pose});
 }
 return Object.freeze({create,isDesktop,pose,measure,TYPES,ROWS,FRAME,SIZES});
});

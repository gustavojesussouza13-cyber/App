'use strict';
/* Basilisco V4 — visual-only 2.5D; never changes combat, network or guild fortresses.
 * 0=back,1=right,2=front,3=left; each direction has a 4x6 RGBA atlas.
 * 192x160 native frames; acid uses a separate 4x4 atlas; safe old-art fallback.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosBasiliskV4=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const FRAME=Object.freeze({width:192,height:160,cols:4,rows:6});
 const DIRS=Object.freeze(['tras','direita','frente','esquerda']);
 const FX_ROWS=Object.freeze([1,3,0,2]);
 const ASSETS=Object.freeze(DIRS.map(x=>'/assets/creatures-v4/basilisco_v4_'+x+'.png?v=basilisco-v4-gait2'));
 const FXSHEET='/assets/creatures-v4/basilisco_v4_acido_fx.png?v=basilisco-v4-gait2';
 const normalizeDir=x=>Number.isInteger(Number(x))&&Number(x)>=0&&Number(x)<=3?Number(x):2;
 function measure(boss=false){
  const f=boss?1.45:1,width=Math.round(168*f),height=Math.round(140*f);
  return {width,height,healthTop:height+12,selectionHeight:height+20};
 }
 function create({windowRef=typeof window!=='undefined'?window:null,
                  imageCtor=typeof Image!=='undefined'?Image:null,
                  animations=windowRef?.OsPeregrinosCreaturesV3}={}){
  const enabled=Boolean(animations?.isDesktop?.(windowRef)&&typeof animations.pose==='function'&&imageCtor);
  const images=[null,null,null,null],ready=new Set(),failed=new Set();
  let fx=null,fxReady=false;
  if(enabled){
   ASSETS.forEach((url,dir)=>{
    const img=new imageCtor();images[dir]=img;img.decoding='async';
    img.addEventListener?.('load',()=>{
     if(img.naturalWidth===768&&img.naturalHeight===960){ready.add(dir);failed.delete(dir)}
     else{ready.delete(dir);failed.add(dir)}
    });
    img.addEventListener?.('error',()=>{ready.delete(dir);failed.add(dir)});
    img.src=url;
    if(img.complete&&img.naturalWidth===768&&img.naturalHeight===960)ready.add(dir);
   });
   fx=new imageCtor();fx.decoding='async';
   fx.addEventListener?.('load',()=>{fxReady=fx.naturalWidth===768&&fx.naturalHeight===640});
   fx.addEventListener?.('error',()=>{fxReady=false});
   fx.src=FXSHEET;
   if(fx.complete&&fx.naturalWidth===768&&fx.naturalHeight===640)fxReady=true;
  }
  function drawMonster(g,m,now,state={}){
   if(!enabled||!m||typeof g?.drawImage!=='function')return false;
   if(String(state.type||m.type||'').toLowerCase()!=='basilisco')return false;
   const dir=normalizeDir(m.dir);
   if(!ready.has(dir)||failed.has(dir))return false;
   const {row,frame}=animations.pose(now,state,((Number(m.species)||0)%13)*31);
   if(!Number.isInteger(row)||row<0||row>=6||!Number.isInteger(frame)||frame<0||frame>=4)return false;
   const {width,height}=measure(Boolean(m.boss)),x=Math.round(Number(m.x)||0),y=Math.round(Number(m.y)||0);
   let saved=false,drawn=false;
   try{
    g.save();saved=true;g.imageSmoothingEnabled=false;
    // The sprite faces its own native direction: never flip; feet anchored at world y.
    g.drawImage(images[dir],frame*192,row*160,192,160,
      Math.round(x-width/2),Math.round(y-height),width,height);
    drawn=true;
    if(row===3&&fxReady){
     const fw=Math.round(width*1.74),fh=Math.round(height*1.28);
     try{g.drawImage(fx,frame*192,FX_ROWS[dir]*160,192,160,
       Math.round(x-fw/2),Math.round(y-height-fh*.07),fw,fh)}
     catch(_acidOnlyError){} // An effect error must not erase the correctly drawn creature.
    }
   }catch(_bodyError){}finally{if(saved){try{g.restore()}catch(_restoreError){}}}
   return drawn;
  }
  return Object.freeze({enabled,drawMonster,measure,
   get ready(){return ready.size===4},get loadedDirections(){return [...ready]},
   get acidReady(){return fxReady}});
 }
 return Object.freeze({create,measure,FRAME,DIRS,FX_ROWS,ASSETS,FXSHEET,normalizeDir});
});
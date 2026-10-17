'use strict';
/* Corvo do Ocaso V4: visual-only, 4 directions x 6 states x 4 frames.
 * Approved original RGBA atlases have 192x160 source cells. No gameplay changes.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosDuskRavenV4=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const FRAME=Object.freeze({width:192,height:160,cols:4,rows:6});
 const DIRECTIONS=Object.freeze(['tras','direita','frente','esquerda']);
 const ASSETS=Object.freeze(DIRECTIONS.map(d=>'/assets/creatures-v4/corvo_ocaso_v4_'+d+'.png?v=corvo-v4-rev2'));
 const FX='/assets/creatures-v4/corvo_ocaso_v4_ataque_fx.png?v=corvo-v4-rev2';
 const direction=d=>Number.isInteger(Number(d))&&Number(d)>=0&&Number(d)<4?Number(d):2;
 const measure=boss=>{const f=boss?1.45:1,width=Math.round(164*f),height=Math.round(140*f);return{width,height,healthTop:height+12,selectionHeight:height+20}};
 function create({windowRef=typeof window!=='undefined'?window:null,
                  imageCtor=typeof Image!=='undefined'?Image:null,
                  animations=windowRef?.OsPeregrinosCreaturesV3}={}){
  const enabled=Boolean(animations?.isDesktop?.(windowRef)&&typeof animations?.pose==='function'&&imageCtor);
  const images=[null,null,null,null],ready=new Set(),bad=new Set();
  let fx=null,fxReady=false;
  if(enabled){
   ASSETS.forEach((url,index)=>{
    const im=new imageCtor();images[index]=im;im.decoding='async';
    im.addEventListener?.('load',()=>{
     if(im.naturalWidth===768&&im.naturalHeight===960){ready.add(index);bad.delete(index)}
     else{ready.delete(index);bad.add(index)}
    });
    im.addEventListener?.('error',()=>{ready.delete(index);bad.add(index)});
    im.src=url;
    if(im.complete&&im.naturalWidth===768&&im.naturalHeight===960)ready.add(index);
   });
   fx=new imageCtor();fx.decoding='async';
   fx.addEventListener?.('load',()=>{fxReady=fx.naturalWidth===768&&fx.naturalHeight===640});
   fx.addEventListener?.('error',()=>{fxReady=false});fx.src=FX;
   if(fx.complete&&fx.naturalWidth===768&&fx.naturalHeight===640)fxReady=true;
  }
  function drawMonster(g,m,now,state={}){
   if(!enabled||!m||typeof g?.drawImage!=='function')return false;
   if(String(state.type||m.type||'').toLowerCase()!=='corvo-ocaso')return false;
   const dir=direction(m.dir);
   if(!ready.has(dir)||bad.has(dir))return false;
   const {row,frame}=animations.pose(now,state,((Number(m.species)||0)%13)*31);
   if(!Number.isInteger(row)||row<0||row>=6||!Number.isInteger(frame)||frame<0||frame>=4)return false;
   const {width,height}=measure(Boolean(m.boss));
   const x=Math.round(Number(m.x)||0),y=Math.round(Number(m.y)||0);
   let saved=false,drawn=false;
   try{
    g.save();saved=true;g.imageSmoothingEnabled=false;
    // Each direction is a distinct atlas, not an accidental mirrored right-facing bird.
    g.drawImage(images[dir],frame*192,row*160,192,160,Math.round(x-width/2),Math.round(y-height),width,height);
    drawn=true;
    if(row===3&&fxReady){
     const fw=Math.round(width*1.57),fh=Math.round(height*1.32);
     const offset=dir===1?width*.36:dir===3?-width*.36:0;
     try{g.drawImage(fx,frame*192,dir*160,192,160,Math.round(x-fw/2+offset),
       Math.round(y-height*.94-fh*.50),fw,fh)}catch(_fxOnlyError){}
    }
   }catch(_drawError){drawn=false}
   finally{if(saved){try{g.restore()}catch(_restoreError){}}}
   return drawn;
  }
  return Object.freeze({enabled,drawMonster,measure,get ready(){return ready.size===4},
    get loadedDirections(){return [...ready]},get attackReady(){return fxReady}});
 }
 return Object.freeze({create,FRAME,DIRECTIONS,ASSETS,FX,direction,measure});
});
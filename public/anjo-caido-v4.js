'use strict';
/* Anjo Caído V4 — visual-only client layer for species 30, without gameplay changes.
 * Four RGBA 4x6 atlases, each frame 192x160. Directions: 0 back, 1 right,
 * 2 front, 3 left. Magic FX is an independent RGBA 4x4 atlas.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosFallenAngelV4=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const FRAME=Object.freeze({width:192,height:160,cols:4,rows:6});
 const DIRS=Object.freeze(['tras','direita','frente','esquerda']);
 const FX_ROWS=Object.freeze([0,1,2,3]); // up, right, down, left
 const ASSETS=Object.freeze(DIRS.map(name=>'/assets/creatures-v4/anjo_caido_v4_'+name+'.png?v=anjo-caido-v4-review-1'));
 const FXSHEET='/assets/creatures-v4/anjo_caido_v4_magia_fx.png?v=anjo-caido-v4-review-1';
 function normalizeDir(dir){const d=Number(dir);return Number.isInteger(d)&&d>=0&&d<=3?d:2}
 function measure(boss=false){
  const f=boss?1.45:1;
  const width=Math.round(184*f),height=Math.round(154*f);
  return {width,height,healthTop:height+12,selectionHeight:height+20};
 }
 function create({windowRef=typeof window!=='undefined'?window:null,
                  imageCtor=typeof Image!=='undefined'?Image:null,
                  animations=windowRef?.OsPeregrinosCreaturesV3}={}){
  const enabled=Boolean(animations?.isDesktop?.(windowRef)&&typeof animations?.pose==='function'&&imageCtor);
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
   if(String(state.type||m.type||'').toLowerCase()!=='anjo-caido')return false;
   const dir=normalizeDir(m.dir);
   if(!ready.has(dir)||failed.has(dir))return false;
   const {row,frame}=animations.pose(now,state,((Number(m.species)||0)%13)*31);
   if(!Number.isInteger(row)||row<0||row>=6||!Number.isInteger(frame)||frame<0||frame>=4)return false;
   const {width,height}=measure(Boolean(m.boss)),x=Math.round(Number(m.x)||0),y=Math.round(Number(m.y)||0);
   let saved=false,drawn=false;
   try{
    g.save();saved=true;g.imageSmoothingEnabled=false;
    // Every frame anchors feet at the same world Y; no horizontal mirroring.
    g.drawImage(images[dir],frame*FRAME.width,row*FRAME.height,FRAME.width,FRAME.height,
      Math.round(x-width/2),Math.round(y-height),width,height);
    drawn=true;
    if(row===3&&fxReady){
     const fw=Math.round(width*1.42),fh=Math.round(height*1.14);
     const offset=dir===1?width*.46:dir===3?-width*.46:0;
     try{g.drawImage(fx,frame*192,FX_ROWS[dir]*160,192,160,
       Math.round(x-fw/2+offset),Math.round(y-height*.92-fh/2),fw,fh)}
     catch(_fxError){} // Keep the creature visible if an effect alone fails.
    }
   }catch(_drawError){drawn=false}
   finally{if(saved){try{g.restore()}catch(_restoreError){}}}
   return drawn;
  }
  return Object.freeze({enabled,drawMonster,measure,
   get ready(){return ready.size===4},get loadedDirections(){return [...ready]},
   get magicReady(){return fxReady}});
 }
 return Object.freeze({create,measure,normalizeDir,FRAME,DIRS,FX_ROWS,ASSETS,FXSHEET});
});
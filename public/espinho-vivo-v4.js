'use strict';
/* Espinho Vivo V4 — visual-only layer, species 9.
 * Five approved RGBA atlases; 4 directions x (4 columns x 6 states);
 * fixed native source frames of 192x160 pixels, separate 4x4 thorn attack FX.
 * No change to combat, server, guilds or 3D fortress.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosLivingThornV4=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const FRAME=Object.freeze({width:192,height:160,cols:4,rows:6});
 const DIRECTIONS=Object.freeze(['tras','direita','frente','esquerda']);
 const ASSETS=Object.freeze(DIRECTIONS.map(d=>'/assets/creatures-v4/espinho_vivo_v4_'+d+'.png?v=espinho-v4-review1'));
 const FX='/assets/creatures-v4/espinho_vivo_v4_ataque_fx.png?v=espinho-v4-review1';
 const normalizeDirection=d=>Number.isInteger(Number(d))&&Number(d)>=0&&Number(d)<4?Number(d):2;
 function measure(boss=false){
  const scale=boss?1.45:1;
  const width=Math.round(166*scale),height=Math.round(139*scale);
  return {width,height,healthTop:height+12,selectionHeight:height+20};
 }
 function create({windowRef=typeof window!=='undefined'?window:null,
                  imageCtor=typeof Image!=='undefined'?Image:null,
                  animations=windowRef?.OsPeregrinosCreaturesV3}={}){
  const enabled=Boolean(animations?.isDesktop?.(windowRef)&&typeof animations?.pose==='function'&&imageCtor);
  const images=[null,null,null,null],ready=new Set(),bad=new Set();
  let fx=null,fxReady=false;
  if(enabled){
   ASSETS.forEach((url,dir)=>{
    const image=new imageCtor();images[dir]=image;image.decoding='async';
    image.addEventListener?.('load',()=>{
     if(image.naturalWidth===768&&image.naturalHeight===960){ready.add(dir);bad.delete(dir)}
     else{ready.delete(dir);bad.add(dir)}
    });
    image.addEventListener?.('error',()=>{ready.delete(dir);bad.add(dir)});
    image.src=url;
    if(image.complete&&image.naturalWidth===768&&image.naturalHeight===960)ready.add(dir);
   });
   fx=new imageCtor();fx.decoding='async';
   fx.addEventListener?.('load',()=>{fxReady=fx.naturalWidth===768&&fx.naturalHeight===640});
   fx.addEventListener?.('error',()=>{fxReady=false});
   fx.src=FX;
   if(fx.complete&&fx.naturalWidth===768&&fx.naturalHeight===640)fxReady=true;
  }
  function drawMonster(g,m,now,state={}){
   if(!enabled||!m||typeof g?.drawImage!=='function')return false;
   if(String(state.type||m.type||'').toLowerCase()!=='espinho-vivo')return false;
   const dir=normalizeDirection(m.dir);
   if(!ready.has(dir)||bad.has(dir))return false;
   const pose=animations.pose(now,state,((Number(m.species)||0)%13)*31);
   if(!pose||!Number.isInteger(pose.row)||pose.row<0||pose.row>=6||
       !Number.isInteger(pose.frame)||pose.frame<0||pose.frame>=4)return false;
   const {width,height}=measure(Boolean(m.boss));
   const x=Math.round(Number(m.x)||0),y=Math.round(Number(m.y)||0);
   let saved=false,drawn=false;
   try{
    g.save();saved=true;g.imageSmoothingEnabled=false;
    // All animations share feet anchored to the same ground Y; all four views are native.
    g.drawImage(images[dir],pose.frame*FRAME.width,pose.row*FRAME.height,FRAME.width,FRAME.height,
      Math.round(x-width/2),Math.round(y-height),width,height);
    drawn=true;
    if(pose.row===3&&fxReady){
     const fw=Math.round(width*1.50),fh=Math.round(height*1.18);
     const off=dir===1?width*.36:dir===3?-width*.36:0;
     try{
      g.drawImage(fx,pose.frame*192,dir*160,192,160,
       Math.round(x-fw/2+off),Math.round(y-height*.96-fh*.5),fw,fh);
     }catch(_fxOnlyError){} // Preserve body if only the attack FX is unavailable.
    }
   }catch(_drawError){drawn=false}
   finally{if(saved){try{g.restore()}catch(_restoreError){}}}
   return drawn;
  }
  return Object.freeze({enabled,drawMonster,measure,
   get ready(){return ready.size===4},
   get loadedDirections(){return [...ready]},get attackReady(){return fxReady}});
 }
 return Object.freeze({create,FRAME,DIRECTIONS,ASSETS,FX,normalizeDirection,measure});
});
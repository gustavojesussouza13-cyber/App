'use strict';
/* Corvo do Ocaso V4 — species 7, isolated visual renderer.
 * 4 independent transparent atlases (768x960), 24 frames 192x160 each;
 * separate 4x4 attack FX (768x640). No mirroring or gameplay changes.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosRavenV4=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const FRAME=Object.freeze({width:192,height:160,cols:4,rows:6});
 const DIRS=Object.freeze(['tras','direita','frente','esquerda']);
 const ASSETS=Object.freeze(DIRS.map(name=>'/assets/creatures-v4/corvo_ocaso_v4_'+name+'.png?v=corvo-v4-rev2'));
 const FXSHEET='/assets/creatures-v4/corvo_ocaso_v4_ataque_fx.png?v=corvo-v4-rev2';
 function normalizeDir(dir){const d=Number(dir);return Number.isInteger(d)&&d>=0&&d<=3?d:2}
 function measure(boss=false){
  const scale=boss?1.45:1;
  const width=Math.round(150*scale),height=Math.round(134*scale);
  return {width,height,healthTop:height+12,selectionHeight:height+20};
 }
 function create({windowRef=typeof window!=='undefined'?window:null,
                  imageCtor=typeof Image!=='undefined'?Image:null,
                  animations=windowRef?.OsPeregrinosCreaturesV3}={}){
  const enabled=Boolean(animations?.isDesktop?.(windowRef)&&typeof animations?.pose==='function'&&imageCtor);
  const sprites=[null,null,null,null],ready=new Set(),failed=new Set();
  let fx=null,fxReady=false;
  if(enabled){
   ASSETS.forEach((src,d)=>{
    const img=new imageCtor();sprites[d]=img;img.decoding='async';
    img.addEventListener?.('load',()=>{
     const valid=img.naturalWidth===768&&img.naturalHeight===960;
     if(valid){ready.add(d);failed.delete(d)}else{ready.delete(d);failed.add(d)}
    });
    img.addEventListener?.('error',()=>{ready.delete(d);failed.add(d)});
    img.src=src;
    if(img.complete&&img.naturalWidth===768&&img.naturalHeight===960)ready.add(d);
   });
   fx=new imageCtor();fx.decoding='async';
   fx.addEventListener?.('load',()=>{fxReady=fx.naturalWidth===768&&fx.naturalHeight===640});
   fx.addEventListener?.('error',()=>{fxReady=false});
   fx.src=FXSHEET;
   if(fx.complete&&fx.naturalWidth===768&&fx.naturalHeight===640)fxReady=true;
  }
  function drawMonster(g,m,now,state={}){
   if(!enabled||!m||typeof g?.drawImage!=='function')return false;
   if(String(state.type||m.type||'').toLowerCase()!=='corvo')return false;
   const dir=normalizeDir(m.dir);
   if(!ready.has(dir)||failed.has(dir))return false;
   const pose=animations.pose(now,state,((Number(m.species)||0)%13)*31);
   if(!pose||!Number.isInteger(pose.row)||pose.row<0||pose.row>=6||
      !Number.isInteger(pose.frame)||pose.frame<0||pose.frame>=4)return false;
   const {width,height}=measure(Boolean(m.boss));
   const x=Math.round(Number(m.x)||0),y=Math.round(Number(m.y)||0);
   let drawn=false,saved=false;
   try{
    g.save();saved=true;g.imageSmoothingEnabled=false;
    // All frames keep the same ground contact Y; left and right use distinct PNGs.
    g.drawImage(sprites[dir],pose.frame*192,pose.row*160,192,160,
      Math.round(x-width/2),Math.round(y-height),width,height);
    drawn=true;
    if(pose.row===3&&fxReady){
     const fw=Math.round(width*1.58),fh=Math.round(height*1.25);
     const offset=dir===1?width*.40:dir===3?-width*.40:0;
     try{
      g.drawImage(fx,pose.frame*192,dir*160,192,160,
       Math.round(x-fw/2+offset),Math.round(y-height*.94-fh*.50),fw,fh);
     }catch(_effectError){} // FX may fail without hiding the body.
    }
   }catch(_drawError){drawn=false}
   finally{if(saved){try{g.restore()}catch(_restoreError){}}}
   return drawn;
  }
  return Object.freeze({enabled,drawMonster,measure,
   get ready(){return ready.size===4},
   get loadedDirections(){return [...ready]},
   get attackReady(){return fxReady}});
 }
 return Object.freeze({create,normalizeDir,measure,FRAME,DIRS,ASSETS,FXSHEET});
});
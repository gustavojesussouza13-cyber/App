'use strict';
/* Elemental da Água V4 — sprite-only species 23.
 * Four independently authored RGBA atlases 768x960 (4x6, 192x160 frames)
 * and one 4x4 RGBA water attack FX atlas 768x640.
 * No gameplay, hitbox, combat, server, fortress or guild changes.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosWaterElementalV4=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const FRAME=Object.freeze({width:192,height:160,cols:4,rows:6});
 const DIRS=Object.freeze(['tras','direita','frente','esquerda']);
 const ASSETS=Object.freeze(DIRS.map(name=>'/assets/creatures-v4/elemental_agua_v4_'+name+'.png?v=elemental-agua-v4-review1'));
 const FXSHEET='/assets/creatures-v4/elemental_agua_v4_ataque_fx.png?v=elemental-agua-v4-review1';
 function normalizeDir(dir){const d=Number(dir);return Number.isInteger(d)&&d>=0&&d<=3?d:2}
 function measure(boss=false){
  const scale=boss?1.45:1,width=Math.round(156*scale),height=Math.round(148*scale);
  return {width,height,healthTop:height+12,selectionHeight:height+20};
 }
 function create({windowRef=typeof window!=='undefined'?window:null,
                 imageCtor=typeof Image!=='undefined'?Image:null,
                 animations=windowRef?.OsPeregrinosCreaturesV3}={}){
  const enabled=Boolean(animations?.isDesktop?.(windowRef)&&typeof animations?.pose==='function'&&imageCtor);
  const sprites=[null,null,null,null],ready=new Set(),failed=new Set();
  let attack=null,fxReady=false;
  if(enabled){
   ASSETS.forEach((url,dir)=>{
    const img=new imageCtor();sprites[dir]=img;img.decoding='async';
    img.addEventListener?.('load',()=>{
     const valid=img.naturalWidth===768&&img.naturalHeight===960;
     if(valid){ready.add(dir);failed.delete(dir)}else{ready.delete(dir);failed.add(dir)}
    });
    img.addEventListener?.('error',()=>{ready.delete(dir);failed.add(dir)});
    img.src=url;
    if(img.complete&&img.naturalWidth===768&&img.naturalHeight===960)ready.add(dir);
   });
   attack=new imageCtor();attack.decoding='async';
   attack.addEventListener?.('load',()=>{fxReady=attack.naturalWidth===768&&attack.naturalHeight===640});
   attack.addEventListener?.('error',()=>{fxReady=false});
   attack.src=FXSHEET;
   if(attack.complete&&attack.naturalWidth===768&&attack.naturalHeight===640)fxReady=true;
  }
  function drawMonster(g,m,now,state={}){
   if(!enabled||!m||typeof g?.drawImage!=='function')return false;
   if(String(state.type||m.type||'').toLowerCase()!=='elemental-agua')return false;
   const dir=normalizeDir(m.dir);
   if(!ready.has(dir)||failed.has(dir))return false;
   const pose=animations.pose(now,state,((Number(m.species)||0)%13)*31);
   if(!pose||!Number.isInteger(pose.row)||pose.row<0||pose.row>=6||
      !Number.isInteger(pose.frame)||pose.frame<0||pose.frame>=4)return false;
   const {width,height}=measure(Boolean(m.boss));
   const x=Math.round(Number(m.x)||0),y=Math.round(Number(m.y)||0);
   let saved=false,drawn=false;
   try{
    g.save();saved=true;g.imageSmoothingEnabled=false;
    // Same feet/water anchor for every animation and direction. No mirroring.
    g.drawImage(sprites[dir],pose.frame*192,pose.row*160,192,160,
      Math.round(x-width/2),Math.round(y-height),width,height);
    drawn=true;
    if(pose.row===3&&fxReady){
     const fw=Math.round(width*1.65),fh=Math.round(height*1.18);
     const shift=dir===1?width*.48:dir===3?-width*.48:0;
     try{
      g.drawImage(attack,pose.frame*192,dir*160,192,160,
        Math.round(x-fw/2+shift),Math.round(y-height*.88-fh*.5),fw,fh);
     }catch(_effectError){} // Missing attack layer never erases the body.
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
 return Object.freeze({create,measure,normalizeDir,FRAME,DIRS,ASSETS,FXSHEET});
});
'use strict';
/* Salamandra V4 experimental only. Reserved species 32, not spawned by server.
 * Four atlas directions 4x6 x 192x160; FX is separate. This renderer does not
 * touch combat, persistence, V3/previous V4 art or fortress 3D.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosSalamanderV4=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const FRAME=Object.freeze({width:192,height:160,cols:4,rows:6});
 const DIRECTIONS=Object.freeze(['tras','direita','frente','esquerda']);
 const SPECIES=32,TYPE='salamandra';
 const ASSETS=Object.freeze(DIRECTIONS.map(d=>'/assets/creatures-v4/salamandra_v4_'+d+'.png?v=salamandra-v4-technical-1'));
 const FX='/assets/creatures-v4/salamandra_v4_ataque_fx.png?v=salamandra-v4-technical-1';
 function measure(boss=false){
  const n=boss?1.45:1,w=Math.round(152*n),h=Math.round(142*n);
  return {width:w,height:h,healthTop:h+12,selectionHeight:h+20};
 }
 function normalizeDir(input){const n=Number(input);return Number.isInteger(n)&&n>=0&&n<4?n:2;}
 function create({windowRef=typeof window!=='undefined'?window:null,
                  imageCtor=typeof Image!=='undefined'?Image:null,
                  animation=windowRef?.OsPeregrinosCreaturesV3}={}){
  const enabled=Boolean(imageCtor&&typeof animation?.pose==='function'&&animation?.isDesktop?.(windowRef));
  const sprites=[null,null,null,null],ready=new Set(),failed=new Set();
  let attack=null,attackReady=false;
  if(enabled){
   ASSETS.forEach((url,dir)=>{
    const image=new imageCtor();image.decoding='async';sprites[dir]=image;
    image.addEventListener?.('load',()=>{
      const good=image.naturalWidth===768&&image.naturalHeight===960;
      if(good){ready.add(dir);failed.delete(dir)}else{ready.delete(dir);failed.add(dir)}
    });
    image.addEventListener?.('error',()=>{ready.delete(dir);failed.add(dir)});
    image.src=url;
    if(image.complete&&image.naturalWidth===768&&image.naturalHeight===960)ready.add(dir);
   });
   attack=new imageCtor();attack.decoding='async';
   attack.addEventListener?.('load',()=>{attackReady=attack.naturalWidth===768&&attack.naturalHeight===640});
   attack.addEventListener?.('error',()=>{attackReady=false});
   attack.src=FX;
   if(attack.complete&&attack.naturalWidth===768&&attack.naturalHeight===640)attackReady=true;
  }
  function drawMonster(g,m,now,state={}){
   if(!enabled||!m||!g||typeof g.drawImage!=='function')return false;
   if(Number(m.species)!==SPECIES||String(state.type||m.type||'').toLowerCase()!==TYPE)return false;
   const dir=normalizeDir(m.dir);
   if(!ready.has(dir)||failed.has(dir))return false;
   const pose=animation.pose(now,state,((SPECIES%13)*31));
   if(!pose||!Number.isInteger(pose.row)||pose.row<0||pose.row>=6||
      !Number.isInteger(pose.frame)||pose.frame<0||pose.frame>=4)return false;
   const {width,height}=measure(Boolean(m.boss)),x=Math.round(Number(m.x)||0),y=Math.round(Number(m.y)||0);
   let saved=false,drawn=false;
   try{
    g.save();saved=true;g.imageSmoothingEnabled=false;
    g.drawImage(sprites[dir],pose.frame*192,pose.row*160,192,160,
       Math.round(x-width/2),Math.round(y-height),width,height);
    drawn=true;
    if(pose.row===3&&attackReady){
      const fw=Math.round(width*1.55),fh=Math.round(height*1.12);
      const shift=dir===1?width*.45:dir===3?-width*.45:0;
      try{g.drawImage(attack,pose.frame*192,dir*160,192,160,
        Math.round(x-fw/2+shift),Math.round(y-height*.95-fh*.55),fw,fh)}catch(_fxError){}
    }
   }catch(_drawError){drawn=false}
   finally{if(saved){try{g.restore()}catch(_restoreError){}}}
   return drawn;
  }
  return Object.freeze({enabled,drawMonster,measure,
   get ready(){return ready.size===4},get loadedDirections(){return [...ready]},
   get attackReady(){return attackReady}});
 }
 return Object.freeze({FRAME,DIRECTIONS,SPECIES,TYPE,ASSETS,FX,measure,normalizeDir,create});
});
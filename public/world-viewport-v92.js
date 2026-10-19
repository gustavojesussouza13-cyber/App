'use strict';
/**
 * Native fullscreen V9.2: render more game world at the real screen ratio.
 * Do not magnify the 960x576 output or stretch player/monster/NPC sprites.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosViewportV92=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const DEFAULT=Object.freeze({width:960,height:576});
 const ZONE=Object.freeze({width:1536,height:1024});
 const TARGET_HEIGHT=720;
 function resolutionFor(cssWidth,cssHeight,full=false){
  if(!full)return {...DEFAULT};
  if(!Number.isFinite(cssWidth)||!Number.isFinite(cssHeight)||cssWidth<=0||cssHeight<=0)
   return {...DEFAULT};
  const ratio=Math.max(.25,Math.min(5,cssWidth/cssHeight));
  // Preserve aspect ratio while keeping the entire camera inside the zone.
  const effectiveHeight=Math.min(TARGET_HEIGHT,ZONE.width/ratio,ZONE.height);
  const height=Math.max(1,Math.round(effectiveHeight));
  const width=Math.max(1,Math.round(height*ratio));
  return {width:Math.min(width,ZONE.width),height};
 }
 return Object.freeze({DEFAULT,ZONE,TARGET_HEIGHT,resolutionFor});
});

'use strict';
/* Joystick independente do servidor: entrada de movimento por toque e mouse. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosTouchControls=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 function create({pad,knob,deadzone=0.12}){
  if(!pad||!knob||typeof pad.addEventListener!=='function')throw Error('Controle virtual inválido');
  let pointerId=null,vector={x:0,y:0};
  function moveKnob(x,y){knob.style.transform=`translate(-50%, -50%) translate(${Math.round(x)}px, ${Math.round(y)}px)`;}
  function update(event){
   if(event.pointerId!==pointerId)return;
   const bounds=pad.getBoundingClientRect();
   const radius=Math.max(16,Math.min(bounds.width,bounds.height)/2-18);
   const cx=bounds.left+bounds.width/2,cy=bounds.top+bounds.height/2;
   let x=(event.clientX-cx)/radius,y=(event.clientY-cy)/radius;
   const len=Math.hypot(x,y);
   if(len>1){x/=len;y/=len}
   if(Math.hypot(x,y)<deadzone){x=0;y=0}
   vector={x,y};
   moveKnob(x*radius,y*radius);
   event.preventDefault?.();
  }
  function release(event){
   if(event&&event.pointerId!==pointerId)return false;
   const id=pointerId;
   pointerId=null;vector={x:0,y:0};moveKnob(0,0);
   if(id!==null&&pad.hasPointerCapture?.(id)){
    try{pad.releasePointerCapture(id)}catch{}
   }
   return id!==null;
  }
  function start(event){
   if(pointerId!==null||event.isPrimary===false&&event.pointerType==='mouse')return;
   if(event.button!==undefined&&event.button!==0)return;
   pointerId=event.pointerId;
   try{pad.setPointerCapture?.(pointerId)}catch{}
   update(event);
  }
  const handlers=[
   ['pointerdown',start],['pointermove',update],
   ['pointerup',release],['pointercancel',release],['lostpointercapture',release]
  ];
  for(const [name,handler] of handlers)pad.addEventListener(name,handler);
  return {
   get vector(){return {x:vector.x,y:vector.y}},
   get active(){return pointerId!==null},
   release:()=>release(),
   destroy(){
    release();
    for(const [name,handler] of handlers)pad.removeEventListener?.(name,handler);
   }
  };
 }
 return {create};
});

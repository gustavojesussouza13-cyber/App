'use strict';
/* Ping aplicativo via WebSocket: RTT real entre o navegador e o servidor do mundo. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosLatency=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function create({interval=5000,timeout=12000}={}){
  const wait=Math.max(1000,Number(interval)||5000);
  const deadline=Math.max(wait,Number(timeout)||12000);
  let serial=0,lastSent=-Infinity,pending=null,ms=null,quality='offline';
  function reset(){pending=null;ms=null;lastSent=-Infinity;quality='offline'}
  function poll(now,emit){
   if(!Number.isFinite(now)||typeof emit!=='function')return false;
   if(pending&&now-pending.at>=deadline){
    pending=null;ms=null;quality='timeout';
   }
   if(pending||now-lastSent<wait)return false;
   serial=serial>=2147483647?1:serial+1;
   pending={id:serial,at:now};
   lastSent=now;
   if(quality==='offline')quality='checking';
   emit({id:serial});
   return true;
  }
  function receive(msg,now){
   if(!pending||!msg||!Number.isFinite(now)||!Number.isSafeInteger(msg.id)||msg.id!==pending.id)return false;
   const elapsed=now-pending.at;
   pending=null;
   if(elapsed<0||elapsed>deadline){ms=null;quality='timeout';return false}
   ms=Math.round(elapsed);
   quality=ms<100?'good':ms<200?'medium':'high';
   return true;
  }
  function state(){return {ms,quality,pending:!!pending}}
  return {reset,poll,receive,state};
 }
 return {create};
});

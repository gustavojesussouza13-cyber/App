'use strict';
/** Interpola avatares REMOTOS entre snapshots; não modifica a posição do servidor. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosPlayerMotion=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function create({delay=300,teleport=230}={}){
  const history=new Map();
  function clear(){history.clear()}
  function position(id){const list=history.get(id);return list?.[list.length-1]||null}
  function sync(players,now){
   if(!Array.isArray(players)||!Number.isFinite(now))return;
   const seen=new Set();
   for(const p of players){
    if(!p||typeof p.id!=='string'||!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
    seen.add(p.id);
    const list=history.get(p.id)||[];
    const prev=list[list.length-1];
    if(!prev||now<prev.at||Math.hypot(p.x-prev.x,p.y-prev.y)>teleport){
     history.set(p.id,[{at:now,x:p.x,y:p.y,dir:p.dir,zone:p.zone}]);
     continue;
    }
    // Ignorar atualizações com relógio igual, impedindo divisão por zero.
    if(now===prev.at){list[list.length-1]={at:now,x:p.x,y:p.y,dir:p.dir,zone:p.zone};continue}
    list.push({at:now,x:p.x,y:p.y,dir:p.dir,zone:p.zone});
    while(list.length>5)list.shift();
    history.set(p.id,list);
   }
   for(const id of history.keys())if(!seen.has(id))history.delete(id);
  }
  function draw(players,now){
   const time=now-delay;
   return players.map(p=>{
    const list=history.get(p.id);
    if(!list||list.length<2||!Number.isFinite(time))return {...p,moving:false};
    let from=list[0],to=list[list.length-1];
    if(time<=from.at)return {...p,x:from.x,y:from.y,moving:false};
    for(let i=1;i<list.length;i++){
     if(list[i].at>=time){to=list[i];from=list[i-1];break}
     from=list[i];
    }
    if(time>=to.at&&to===list[list.length-1]){
     // Na ausência de novos snapshots, manter posição conhecida (sem adivinhar).
     return {...p,x:to.x,y:to.y,dir:to.dir,moving:false};
    }
    const f=Math.max(0,Math.min(1,(time-from.at)/(to.at-from.at||1)));
    const dist=Math.hypot(to.x-from.x,to.y-from.y);
    return {...p,x:from.x+(to.x-from.x)*f,y:from.y+(to.y-from.y)*f,
     dir:to.dir,moving:dist>1&&f>0&&f<1};
   });
  }
  return {clear,sync,draw,position};
 }
 return {create};
});

'use strict';
/** Efeitos 2D locais de flechas e feitiços; dano e cura são responsabilidade do servidor. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosCombatFx=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function create(limit=32){
  const max=Math.max(1,Math.min(128,Number.isInteger(limit)?limit:32));
  let shots=[];
  function clear(){shots=[]}
  function count(){return shots.length}
  function fire(hit,now){
   if(!hit||!['arrow','holy-bolt'].includes(hit.projectile)||!Number.isFinite(now))return false;
   const holy=hit.projectile==='holy-bolt';
   const from=hit.from,to=hit.to;
   if(!from||!to||![from.x,from.y,to.x,to.y].every(Number.isFinite))return false;
   const d=Math.hypot(to.x-from.x,to.y-from.y);
   if(d<1||d>700)return false;
   // Durações só para apresentação: o servidor já confirmou o acerto.
   // Magias deslocam-se um pouco mais lentamente, para destacar o brilho.
   const duration=holy?
    Math.min(530,Math.max(185,d*1.95)):
    Math.min(410,Math.max(140,d*1.5));
   if(shots.length>=max)shots.shift();
   shots.push({from:{x:from.x,y:from.y},to:{x:to.x,y:to.y},start:now,
    projectile:hit.projectile,duration,angle:Math.atan2(to.y-from.y,to.x-from.x),
    skill:!!hit.skill,damage:Number(hit.damage)||0,impactShown:false});
   return true;
  }
  function frame(now){
   if(!Number.isFinite(now))return [];
   const visible=[];
   shots=shots.filter(shot=>{
    const elapsed=Math.max(0,now-shot.start);
    if(elapsed>shot.duration+220)return false;
    const progress=Math.min(1,elapsed/shot.duration);
    const impact=progress>=1;
    const justHit=impact&&!shot.impactShown;
    if(justHit)shot.impactShown=true;
    // O tipo distingue o desenho em art16.js, sem criar tiros falsos.
    const holy=shot.projectile==='holy-bolt';
    visible.push({kind:impact?(holy?'magic-impact':'impact'):(holy?'magic':'arrow'),
     projectile:shot.projectile,
     x:shot.from.x+(shot.to.x-shot.from.x)*progress,
     y:shot.from.y+(shot.to.y-shot.from.y)*progress,
     angle:shot.angle,progress,impactAge:Math.max(0,elapsed-shot.duration),
     skill:shot.skill,damage:shot.damage,justHit});
    return true;
   });
   return visible;
  }
  return {fire,frame,clear,count};
 }
 return {create};
});

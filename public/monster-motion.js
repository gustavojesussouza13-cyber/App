'use strict';
/** Suaviza posições autoritativas recebidas por WebSocket sem alterar o combate. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosMonsterMotion=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function create(){
  const positions=new Map();
  function clear(){positions.clear()}
  function sync(monsters){
   const visible=new Set();
   for(const m of monsters){
    visible.add(m.id);
    const v=positions.get(m.id);
    // Ao reaparecer após uma morte ou mudança brusca, não atravessar o mapa.
    if(!v||Math.hypot(v.x-m.x,v.y-m.y)>160)positions.set(m.id,{x:m.x,y:m.y});
   }
   for(const id of positions.keys())if(!visible.has(id))positions.delete(id);
  }
  function draw(monsters,dt){
   const safeDt=Number.isFinite(dt)?Math.min(.1,Math.max(0,dt)):0;
   const blend=1-Math.exp(-11*safeDt);
   return monsters.map(m=>{
    let v=positions.get(m.id);
    if(!v){v={x:m.x,y:m.y};positions.set(m.id,v)}
    const delta=Math.hypot(v.x-m.x,v.y-m.y);
    if(delta>160){v.x=m.x;v.y=m.y}
    else {v.x+=(m.x-v.x)*blend;v.y+=(m.y-v.y)*blend}
    return {...m,x:v.x,y:v.y};
   });
  }
  function position(id){return positions.get(id)}
  return {clear,sync,draw,position};
 }
 return {create};
});

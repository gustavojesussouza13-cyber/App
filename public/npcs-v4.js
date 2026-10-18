'use strict';
/**
 * Os Peregrinos — prévia NPCs V4, SOMENTE para revisão experimental.
 * Um único PNG 64×80 frontal por NPC. NPCs não caminham; usam
 * micro-respiração de 0–2px e sinal de atenção a jogadores próximos.
 * O PNG INTEIRO é desenhado uma vez, sem sobrepor corpos, partes ou filtros.
 * Não altera servidor, missões, guildas, fortaleza 3D nem famílias V3.
 * FALLBACK: retorna false se carregando/inválido/erro, permitindo ao
 * renderizador atual manter exatamente seu desenho anterior.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosNPCsV4=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const VERSION='npc-v91-living-idles-no-redrawn-sprites-20261018';
 const TOTAL=56,WIDTH=64,HEIGHT=80;
 const SOURCE_BASE='/assets/npcs-v4/';
 const VALID=/^(?:historia-(?:[0-9]|[12][0-9]|3[0-9])|morador-(?:[0-9]|1[0-5]))$/;
 const ids=Object.freeze([
  ...Array.from({length:40},(_,i)=>'historia-'+i),
  ...Array.from({length:16},(_,i)=>'morador-'+i)
 ]);
 const allIds=new Set(ids);
 const scale=Object.freeze({
  pc2d:Object.freeze({width:80,height:100}),
  world25d:Object.freeze({width:93,height:116})
 });
 function source(id){return allIds.has(id)?SOURCE_BASE+id+'.png?v='+VERSION:null;}

 // Stable per-NPC phases. No player/world/server position is ever changed.
 function hash(id){let h=2166136261;for(const c of String(id)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
 function idleState(id,now,{x,y,playerX=null,playerY=null,reducedMotion=false}={}){
  const t=Number.isFinite(now)?Math.max(0,now):0,seed=hash(id);
  const cycle=(t+(seed%4000))%4400;
  // Whole-body 1–2 pixel height difference: feet stay at the exact same y.
  const breath=reducedMotion?0:cycle>=1100&&cycle<2300?1:cycle>=2300&&cycle<2900?2:0;
  const nearby=Number.isFinite(playerX)&&Number.isFinite(playerY)&&
   Number.isFinite(x)&&Number.isFinite(y)&&Math.hypot(x-playerX,y-playerY)<=150;
  const attention=!!nearby&&!reducedMotion&&(t+(seed%3700))%6500<1250;
  return {breath,attention,nearby};
 }
 function drawNotice(g,x,y,height,width){
  if(typeof g.fillRect!=='function')return;
  // Compact hand-drawn pixel-art speech indicator OUTSIDE the PNG.
  // It never covers, distorts, clones or repaints the character.
  const left=Math.round(x+width/2+2),top=Math.round(y-height+20);
  g.fillStyle='#112822';g.fillRect(left,top,17,12);
  g.fillStyle='#c5aa70';
  g.fillRect(left,top,17,1);g.fillRect(left,top+11,17,1);
  g.fillRect(left,top,1,12);g.fillRect(left+16,top,1,12);
  g.fillRect(left+1,top+12,3,2);
  g.fillStyle='#f7e0a3';
  for(const dx of [4,8,12])g.fillRect(left+dx,top+5,2,2);
 }

 function create({windowRef=typeof window!=='undefined'?window:null,
                  imageCtor=typeof Image!=='undefined'?Image:null,
                  allowMobile=false}={}){
  const desktop=Boolean(windowRef?.matchMedia?.('(min-width: 901px)')?.matches);
  const enabled=Boolean(imageCtor&&(desktop||allowMobile));
  const reducedMotion=Boolean(windowRef?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  const map=new Map();
  function ensure(id){
   if(!enabled||!allIds.has(id))return null;
   if(map.has(id))return map.get(id);
   const entry={state:'loading',image:null};
   map.set(id,entry);
   let image;
   try{
    image=new imageCtor();
    image.decoding='async';
    entry.image=image;
    function onLoad(){
     entry.state=image.naturalWidth===WIDTH&&image.naturalHeight===HEIGHT?'ready':'invalid';
    }
    image.addEventListener?.('load',onLoad);
    image.addEventListener?.('error',()=>{entry.state='failed'});
    image.src=source(id);
    if(image.complete){if(image.naturalWidth===WIDTH&&image.naturalHeight===HEIGHT)onLoad();}
   }catch(_err){entry.state='failed';}
   return entry;
  }
  function drawNpc(g,n,now,{world25d=false,playerX=null,playerY=null,alive=true}={}){
   if(!enabled||!g||typeof g.drawImage!=='function'||!n||!allIds.has(n.id))return false;
   const sprite=ensure(n.id);
   if(!sprite||sprite.state!=='ready')return false;
   const x=Number(n.x),y=Number(n.y);
   if(!Number.isFinite(x)||!Number.isFinite(y))return false;
   const size=world25d?scale.world25d:scale.pc2d;
   const life=alive?idleState(n.id,now,{x,y,playerX,playerY,reducedMotion}):{breath:0,attention:false};
   const height=size.height+life.breath;
   let saved=false,drawn=false;
   try{
    g.save();saved=true;g.imageSmoothingEnabled=false;
    // One and only one complete native NPC PNG per frame, anchored at feet.
    g.drawImage(sprite.image,Math.round(x-size.width/2),Math.round(y-height),size.width,height);
    drawn=true;
    if(life.attention)drawNotice(g,x,y,height,size.width);
   }catch(_error){drawn=false; sprite.state='failed'}
   finally{if(saved){try{g.restore()}catch(_error){}}}
   return drawn;
  }
  function status(){
   const out={ready:0,loading:0,failed:0,invalid:0,unrequested:TOTAL-map.size};
   for(const x of map.values())out[x.state]=(out[x.state]||0)+1;
   return out;
  }
  function preload(idsToLoad=ids){
   for(const id of idsToLoad)ensure(id);
   return status();
  }
  return Object.freeze({enabled,drawNpc,preload,status,source,scale,
   get ready(){return status().ready},
   get failed(){return status().failed+status().invalid}});
 }
 return Object.freeze({VERSION,TOTAL,WIDTH,HEIGHT,VALID,ids,source,scale,hash,idleState,create});
});
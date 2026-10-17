'use strict';
/**
 * Os Peregrinos — prévia NPCs V4, SOMENTE para revisão experimental.
 * Um único PNG 64×80 frontal por NPC. Personagens não se movem.
 * Não altera servidor, missões, guildas, fortaleza 3D nem famílias V3.
 * FALLBACK: retorna false se carregando/inválido/erro, permitindo ao
 * renderizador atual manter exatamente seu desenho anterior.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosNPCsV4=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const VERSION='npc-v4-static-review-20261017';
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
 function create({windowRef=typeof window!=='undefined'?window:null,
                  imageCtor=typeof Image!=='undefined'?Image:null,
                  allowMobile=false}={}){
  const desktop=Boolean(windowRef?.matchMedia?.('(min-width: 901px)')?.matches);
  const enabled=Boolean(imageCtor&&(desktop||allowMobile));
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
  function drawNpc(g,n,_now,{world25d=false}={}){
   if(!enabled||!g||typeof g.drawImage!=='function'||!n||!allIds.has(n.id))return false;
   const sprite=ensure(n.id);
   if(!sprite||sprite.state!=='ready')return false;
   const x=Number(n.x),y=Number(n.y);
   if(!Number.isFinite(x)||!Number.isFinite(y))return false;
   const size=world25d?scale.world25d:scale.pc2d;
   let saved=false,drawn=false;
   try{
    g.save();saved=true;g.imageSmoothingEnabled=false;
    g.drawImage(sprite.image,Math.round(x-size.width/2),Math.round(y-size.height),size.width,size.height);
    drawn=true;
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
 return Object.freeze({VERSION,TOTAL,WIDTH,HEIGHT,VALID,ids,source,scale,create});
});
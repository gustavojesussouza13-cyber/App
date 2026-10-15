'use strict';
/**
 * Os Peregrinos — geração procedural determinística v1.
 * Mesmo algoritmo no Node.js e no navegador. Não usa Math.random, Date ou estado global.
 * O mapa histórico, portais, colisões e os IDs dos monstros nunca são substituídos.
 * Chunks de 256 px (8x8 tiles) geram microclimas e decoração sem writes no banco.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PeregrinosProceduralWorld=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const SEED='auren-2026-procedural-v1';
 const VERSION=1,TILE=32,CHUNK_TILES=8,CHUNK_SIZE=256;
 const LABELS=Object.freeze({
  meadow:'Campinas luminosas',forest:'Bosque profundo',swamp:'Terras enevoadas',
  river:'Várzea fluvial',desert:'Dunas antigas',mountain:'Escarpas de pedra',
  ruins:'Ruínas esquecidas',coast:'Costa da aurora',city:'Cidadela de Auren',
  dungeon:'Abismo ancestral'
 });
 let worldHash=2166136261;
 for(let i=0;i<SEED.length;i++)worldHash=Math.imul(worldHash^SEED.charCodeAt(i),16777619);
 function hash(zone,x,y,salt=0){
  let h=(worldHash^Math.imul((zone|0)+101,0x9e3779b1))|0;
  h=Math.imul(h^Math.imul((x|0)+527,0x85ebca6b),0xc2b2ae35);
  h=Math.imul(h^Math.imul((y|0)+809,0x27d4eb2f),0x165667b1);
  h=Math.imul(h^(salt|0),0x7feb352d);
  h=Math.imul(h^(h>>>15),0x846ca68b);
  return (h^(h>>>16))>>>0;
 }
 function random(zone,x,y,salt=0){return hash(zone,x,y,salt)/4294967296}
 function smooth(t){return t*t*(3-2*t)}
 function field(zone,x,y,cell,salt){
  const gx=x/cell,gy=y/cell,ix=Math.floor(gx),iy=Math.floor(gy);
  const dx=smooth(gx-ix),dy=smooth(gy-iy);
  const lerp=(a,b,t)=>a+(b-a)*t;
  return lerp(lerp(random(zone,ix,iy,salt),random(zone,ix+1,iy,salt),dx),
   lerp(random(zone,ix,iy+1,salt),random(zone,ix+1,iy+1,salt),dx),dy);
 }
 function climate(zone,tileX,tileY){
  const elevation=.67*field(zone,tileX,tileY,12,17)+.33*field(zone,tileX,tileY,5,71);
  const humidity=.62*field(zone,tileX,tileY,15,91)+.38*field(zone,tileX,tileY,6,111);
  return {elevation,humidity};
 }
 function biomeAt(zone,tileX,tileY,baseBiome){
  if(baseBiome==='dungeon'||baseBiome==='city')return baseBiome;
  const c=climate(zone,tileX,tileY);
  const b=baseBiome||'meadow';
  if(b==='desert')return c.elevation>.73?'mountain':c.humidity>.77?'ruins':'desert';
  if(b==='mountain')return c.humidity>.73&&c.elevation<.47?'meadow':'mountain';
  if(b==='ruins')return c.humidity>.7?'forest':'ruins';
  if(b==='coast')return c.humidity>.7?'river':'coast';
  if(b==='swamp')return c.humidity<.34?'forest':'swamp';
  if(b==='river')return c.humidity<.33?'meadow':c.humidity>.74?'swamp':'river';
  if(b==='forest')return c.humidity>.73?'swamp':c.humidity<.32?'meadow':'forest';
  return c.humidity>.76?'forest':c.elevation>.77?'mountain':'meadow';
 }
 function chunk(zone,cx,cy,baseBiome){
  const centerX=cx*CHUNK_TILES+CHUNK_TILES/2;
  const centerY=cy*CHUNK_TILES+CHUNK_TILES/2;
  const c=climate(zone,centerX,centerY);
  const biome=biomeAt(zone,centerX,centerY,baseBiome);
  return Object.freeze({zone,cx,cy,seed:hash(zone,cx,cy,1),biome,
   name:LABELS[biome]||LABELS.meadow,
   elevation:Math.round(c.elevation*100),humidity:Math.round(c.humidity*100),
   danger:1+(hash(zone,cx,cy,52)%4)});
 }
 // Somente elementos cenográficos; nunca bloqueiam o caminho dos portais.
 function chunkFeatures(zone,cx,cy,baseBiome){
  const data=chunk(zone,cx,cy,baseBiome),out=[];
  const dense=data.biome==='forest'||data.biome==='swamp';
  const count=data.biome==='city'?1:data.biome==='dungeon'?2:dense?4:3;
  for(let i=0;i<count;i++){
   const x=cx*CHUNK_SIZE+30+Math.floor(random(zone,cx*37+i,cy,112)*196);
   const y=cy*CHUNK_SIZE+35+Math.floor(random(zone,cx,cy*43+i,126)*178);
   const roll=random(zone,cx*11+i,cy*17+i,139);
   const kind=data.biome==='dungeon'?'dungeon-prop':
    ['desert','mountain','ruins'].includes(data.biome)?(roll<.7?'rock':'biome-prop'):
    dense?(roll<.65?'tree':'bush'):
    roll<.25?'tree':roll<.69?'bush':roll<.88?'rock':'biome-prop';
   const size=kind==='tree'?[112,131]:kind==='dungeon-prop'||kind==='biome-prop'?[62,72]:kind==='rock'?[39,30]:[49,39];
   out.push({x,y,kind,w:size[0],h:size[1],chunkBiome:data.biome});
  }
  return out;
 }
 const AFFINITIES=['terra','bruma','fogo','aurora','gelo','sombras'];
 const RARITIES=['Comum','Incomum','Raro','Épico'];
 function monsterTrait(zone,index,boss=false){
  const p=random(zone,index,0,401),variant=hash(zone,index,0,402)%8;
  const rarity=boss?'Chefe':p<.01?RARITIES[3]:p<.10?RARITIES[2]:p<.34?RARITIES[1]:RARITIES[0];
  const affinity=AFFINITIES[hash(zone,index,0,403)%AFFINITIES.length];
  // Legados não sofrem rebalanceamento de combate. Nas novas masmorras,
  // variantes raras possuem bônus moderado, compatível com progressão salva.
  const bonus=zone>=16&&!boss?(rarity==='Épico'?1.18:rarity==='Raro'?1.10:rarity==='Incomum'?1.04:1):1;
  return Object.freeze({variant,rarity,affinity,bonus});
 }
 return Object.freeze({SEED,VERSION,TILE,CHUNK_TILES,CHUNK_SIZE,LABELS,hash,random,field,climate,biomeAt,chunk,chunkFeatures,monsterTrait});
});

'use strict';
/**
 * Colisão de terreno do Mundo Aberto, usando a mesma geração de água do atlas 16-bit.
 * O teste terrain-collision compara cada resultado com public/art16.js e detecta divergência.
 */
const TILE=32,ZW=1536,ZH=1024;
const BIOMES=Object.freeze({pradaria:'meadow',floresta:'forest',rio:'river',deserto:'desert',montanha:'mountain',ruinas:'ruins',pantano:'swamp',costa:'coast',cidade:'city',masmorra:'dungeon'});
const rng=n=>{n|=0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return((n^(n>>>16))>>>0)/4294967296};
const noise=(x,y,z,s=1)=>rng(Math.imul(x+317,73856093)^Math.imul(y+631,19349663)^Math.imul(z+41,83492791)^Math.imul(s,374761393));
const pathY=(x,z)=>496+Math.sin((x+z*117)/225)*54+Math.sin(x/79+z*2)*12;
function kind(tx,ty,z,biome){
 const wx=tx*TILE+16,wy=ty*TILE+16;
 const n=noise(tx,ty,z),n2=noise(tx>>2,ty>>2,z,3);
 const road=Math.abs(wy-pathY(wx,z));
 if(road<38+(n-.5)*9)return'path';
 if(biome==='river' && Math.abs(wx-(420+92*Math.sin(wy/150+z)))<83 && road>65)return'water';
 if(biome==='coast' && wy>740+55*Math.sin(wx/163))return'water';
 if(biome==='swamp' && n2<.19&&n<.72)return'water';
 if(biome==='meadow'&&wx<185&&wy>650&&n2<.65)return'water';
 if(biome==='forest'&&n2>.91&&n>.36)return'water';
 if(biome==='desert')return n2>.90?'rock':'sand';
 if(biome==='mountain'||biome==='dungeon'||biome==='ruins')return n2>.23?'rock':n>.46?'sand':'grass';
 if(biome==='city')return Math.abs(wx-850)<340&&Math.abs(wy-pathY(wx,z))<225?'paving':'grass';
 if(biome==='coast')return n2>.49?'sand':'grass';
 return n2<.07?'sand':'grass';
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function isWalkable(zone,x,y,zones){
 if(!Number.isInteger(zone)||!zones?.[zone]||!Number.isFinite(x)||!Number.isFinite(y))return false;
 if(x<24||x>ZW-24||y<24||y>ZH-24)return false;
 const biome=BIOMES[zones[zone][1]];
 return kind(Math.floor(x/TILE),Math.floor(y/TILE),zone,biome)!=='water';
}
function canStand(zone,x,y,zones){
 // Pé do personagem: centro e dois extremos de largura.
 return isWalkable(zone,x,y,zones)&&
  isWalkable(zone,x-7,y,zones)&&isWalkable(zone,x+7,y,zones);
}
function nearestWalkable(zone,x,y,zones){
 const cx=clamp(Math.round(x),28,ZW-28),cy=clamp(Math.round(y),28,ZH-28);
 if(canStand(zone,cx,cy,zones))return {x:cx,y:cy};
 // Personagens salvos em água por versões antigas são reposicionados em terra próxima.
 for(let radius=16;radius<=448;radius+=16){
  for(let i=0;i<16;i++){
   const angle=i*Math.PI/8,px=clamp(Math.round(cx+Math.cos(angle)*radius),28,ZW-28),
    py=clamp(Math.round(cy+Math.sin(angle)*radius),28,ZH-28);
   if(canStand(zone,px,py,zones))return {x:px,y:py};
  }
 }
 return {x:Math.round(ZW/2),y:Math.round(pathY(ZW/2,zone))};
}
function step(zone,x,y,dx,dy,zones){
 const tx=clamp(x+dx,24,ZW-24),ty=clamp(y+dy,24,ZH-24);
 if(canStand(zone,tx,ty,zones))return {x:tx,y:ty};
 // Deslizamento de borda: não prender o jogador por encostar em um obstáculo.
 if(canStand(zone,tx,y,zones))return {x:tx,y};
 if(canStand(zone,x,ty,zones))return {x,y:ty};
 return {x,y};
}
module.exports={BIOMES,TILE,kind,pathY,isWalkable,canStand,nearestWalkable,step};

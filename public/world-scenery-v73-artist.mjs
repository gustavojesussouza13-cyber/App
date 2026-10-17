'use strict';
/**
 * Scenario V7.3 - native, deterministic pixel art for every missing scenery
 * family; NEVER reads the old atlas. These are original hand-coded silhouettes
 * and use the same color/value family as the approved V7 and V7.2 PNGs.
 */
export const V73_ART_VERSION='world-v73-original-complete-20261017';
const memory=new Map();
const PALETTE=Object.freeze({
 ink:'#1b272a',outline:'#334044',dark:'#334936',moss:'#3b684a',leaf:'#548b58',
 light:'#85b86c',shine:'#c2d888',stone:'#8b9691',stoneHi:'#c2c5b2',
 wood:'#875d39',woodDk:'#463727',woodHi:'#d6a36c',gold:'#f0cc83',
 metal:'#52666f',metalHi:'#a5c7c9',water:'#358ca0',waterHi:'#b4ecdf',
 roof:'#985748',roofHi:'#d69b64',brick:'#a59885',glow:'#ffdc8b'
});
function noise(x,y,seed){let v=(Math.imul(x+711,1103515245)^Math.imul(y+277,2654435761)^Math.imul(seed+41,1597334677))>>>0;
 v=Math.imul(v^(v>>>16),2246822507)>>>0;return (v^(v>>>13))>>>0;}
function paint(ctx,kind,biome,seed){
 const c=PALETTE;
 const box=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const poly=(color,points)=>{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.closePath();ctx.fill();};
 const stone=(x,y,w,h)=>{
  box(c.ink,x,y,w,h);box(c.stone,x+2,y+2,w-4,h-4);box(c.stoneHi,x+3,y+2,w-6,3);
  for(let k=0;k<8;k++){const xx=x+4+noise(k,0,seed)%(Math.max(1,w-10)),yy=y+7+noise(0,k,seed)%Math.max(1,h-13);
   box(k%2?c.outline:c.stoneHi,xx,yy,3,2);}
 };
 const wooden=(x,y,w,h)=>{box(c.woodDk,x,y,w,h);box(c.wood,x+2,y+2,w-4,h-4);box(c.woodHi,x+4,y+3,2,h-7);};
 // Coordinates are 96x128: subjects are static front-facing 2.5D stamps.
 if(kind==='tree'||kind==='pine'||kind==='palm'){
  wooden(43,64,13,52);
  if(kind==='pine'){
   for(let i=0;i<4;i++){let y=17+i*19,w=15+i*9;poly(c.ink,[[49,y-10],[49-w,y+23],[49+w,y+23]]);poly(i%2?c.moss:c.leaf,[[49,y-7],[52-w,y+19],[47+w,y+19]]);}
  }else if(kind==='palm'){
   for(let a=0;a<6;a++){let x=49+(a%2?-1:1)*(19+a*3),y=30+(a%3)*10;poly(c.ink,[[48,22],[x,y],[x-4,y+11]]);poly(c.leaf,[[48,23],[x,y+2],[x-3,y+8]]);}
  }else{
   for(const [x,y,w,h] of [[26,31,42,39],[48,23,39,38],[22,48,53,39],[55,48,35,32]]){
    box(c.ink,x,y,w,h);box(c.moss,x+3,y+4,w-6,h-8);box(c.leaf,x+6,y+5,w-11,h-16);
   }
  }
  for(let i=0;i<85;i++){
   const x=8+noise(i,1,seed)%78,y=11+noise(1,i,seed)%68;
   const v=ctx.getImageData(x,y,1,1).data;if(v[3]>0&&v[1]>65)box(i%4?c.light:c.shine,x,y,2+(i%4),1+(i%3));
  }
 }else if(kind==='rock'||kind==='monument'||kind==='boulder'){
  poly(c.ink,[[11,103],[20,72],[35,62],[72,65],[89,91],[84,113],[17,114]]);
  poly(c.stone,[[16,99],[24,76],[37,65],[69,68],[84,92],[78,109],[21,110]]);
  poly(c.stoneHi,[[26,75],[39,69],[66,71],[76,81],[54,85],[24,90]]);
  for(let i=0;i<22;i++){const x=19+noise(i,0,seed)%60,y=78+noise(0,i,seed)%28;
   box(i%4?c.outline:c.moss,x,y,2+i%4,2);}
 }else if(kind==='bush'||kind==='flower'||kind==='reeds'||kind==='stump'){
  if(kind==='stump'){wooden(29,71,43,39);box(c.woodHi,28,70,46,9);box(c.woodDk,37,72,23,3);box(c.woodHi,41,77,15,2);}
  else if(kind==='reeds'){
   for(let i=0;i<16;i++){let x=11+i*5,top=58+(noise(i,0,seed)%19);
    box(c.moss,x,top,2,112-top);box(c.gold,x,top-10,3,13);box(c.light,x+2,top+17,6,2);}
  }else{
   for(const [x,y,w,h] of [[12,82,41,27],[37,72,39,38],[22,90,61,22]]){
    box(c.ink,x,y,w,h);box(c.moss,x+2,y+2,w-4,h-4);box(c.leaf,x+7,y+4,w-12,h-9);}
   for(let i=0;i<48;i++){let x=17+noise(i,5,seed)%62,y=77+noise(9,i,seed)%30;
    box(i%5?c.light:c.shine,x,y,2+(i%3),2);}
   if(kind==='flower')for(let i=0;i<13;i++){let x=19+noise(i,17,seed)%60,y=80+noise(18,i,seed)%24;box(i%2?c.gold:c.roofHi,x,y,3,3);}
  }
 }else if(kind==='house'||kind==='market'||kind==='tent'||kind==='tenda'){
  if(kind==='market'||kind==='tent'||kind==='tenda'){
   poly(c.ink,[[17,57],[46,24],[79,57],[82,108],[13,108]]);
   poly(c.roof,[[19,55],[46,28],[76,56],[72,61],[20,61]]);
   poly(c.roofHi,[[46,28],[74,55],[69,57],[46,40]]);
   wooden(17,59,7,48);wooden(73,59,7,48);
   box(c.wood,24,73,49,31);box(c.woodHi,27,77,43,3);
   for(let i=0;i<5;i++)box(i%2?c.roofHi:c.roof,20+i*12,57,9,6);
  }else{
   stone(17,53,65,61);poly(c.ink,[[9,52],[48,13],[90,51],[90,61],[49,33],[15,62]]);
   poly(c.roof,[[14,51],[47,18],[50,18],[50,36],[20,61]]);
   poly(c.roofHi,[[50,18],[85,50],[80,57],[50,36]]);
   wooden(41,79,16,35);
   for(const x of [24,66]){box(c.woodDk,x,77,12,14);box(c.glow,x+2,79,8,10);box(c.gold,x+3,80,3,3);}
   for(let i=0;i<19;i++){let x=20+noise(i,2,seed)%56,y=60+noise(2,i,seed)%42;box(c.stoneHi,x,y,4,1);}
  }
 }else if(kind==='ruin'||kind==='dungeon'||kind==='arch'||kind==='pillar'||kind==='obelisk'||kind==='watchtower'||kind==='altar'){
  stone(20,58,19,54);stone(63,55,15,57);
  if(['ruin','arch','dungeon'].includes(kind)){
   poly(c.ink,[[13,63],[18,39],[37,23],[60,22],[80,44],[86,65],[73,66],[68,47],[59,36],[39,37],[30,52],[27,68]]);
   poly(c.stone,[[18,60],[22,43],[39,29],[58,27],[74,44],[81,62],[75,61],[69,44],[57,34],[40,34],[25,58]]);
  }else if(kind==='pillar'||kind==='obelisk'||kind==='watchtower'){
   stone(32,31,34,82);box(c.stoneHi,30,26,39,8);box(c.outline,35,44,5,55);
  }else{
   stone(23,77,54,37);box(c.gold,37,71,22,5);box(c.glow,45,57,7,15);
  }
  for(let i=0;i<11;i++){let x=17+noise(i,4,seed)%68,y=62+noise(i,7,seed)%45;box(i%2?c.moss:c.outline,x,y,3,3);}
 }else if(kind==='flag'||kind==='banner'||kind==='sign'||kind==='fence'){
  wooden(45,17,7,96);
  if(kind==='fence'){
   for(const x of [17,43,70])wooden(x,71,7,42);
   wooden(14,82,68,7);wooden(14,99,68,6);
  }else if(kind==='sign'){
   wooden(22,32,55,30);box(c.gold,27,38,43,2);box(c.outline,31,50,32,3);
  }else{
   poly(c.ink,[[53,24],[85,34],[77,51],[85,66],[53,64]]);
   poly(c.roof,[[54,27],[80,35],[72,52],[80,62],[54,60]]);
   box(c.gold,59,37,15,3);box(c.glow,63,46,6,6);
  }
 }else if(kind==='fire'||kind==='campfire'||kind==='torch'||kind==='lamp'){
  wooden(35,95,51,12);wooden(22,103,44,9);
  if(kind==='lamp'||kind==='torch'){wooden(45,25,7,82);box(c.metal,33,33,28,33);box(c.glow,37,36,20,24);box(c.gold,41,39,10,12);}
  else{
   poly(c.ink,[[34,101],[28,79],[42,66],[48,37],[56,67],[66,81],[56,102]]);
   poly(c.roofHi,[[39,99],[37,81],[48,63],[55,82],[60,96]]);
   poly(c.gold,[[44,97],[45,77],[51,66],[54,87],[51,100]]);
   box(c.glow,47,80,4,11);
  }
 }else if(kind==='boat'){
  poly(c.ink,[[9,89],[87,88],[73,111],[26,115]]);
  poly(c.wood,[[15,91],[82,91],[68,106],[27,109]]);
  wooden(46,31,6,67);poly(c.ivory||c.stoneHi,[[52,31],[78,70],[52,77]]);
 }else{
  // Bespoke scenery detail: never pull from the previous game's original atlas.
  stone(27,67,46,44);box(c.moss,32,103,15,7);box(c.gold,45,52,9,17);
 }
}
export function modernPropFamily(item,biome){
 const key=String(item?.key||'');
 if(item?.kind==='tree')return biome==='forest'&&key.includes('arvore_3')?'pine':biome==='coast'?'palm':'tree';
 if(item?.kind==='bush')return 'bush';
 if(item?.kind==='rock')return 'rock';
 if(item?.kind==='dungeon-prop')return 'dungeon';
 if(item?.kind==='biome-prop'){
  return ({meadow:'flower',forest:'stump',river:'reeds',desert:'obelisk',mountain:'watchtower',ruins:'ruin',swamp:'reeds',coast:'boat',city:'market',dungeon:'dungeon'})[item?.chunkBiome||biome]||'monument';
 }
 if(item?.kind==='prop'){
  return ({poco:'well',tenda:'tenda',estandarte:'banner',fogueira:'campfire',pedra:'rock'})[key]||'monument';
 }
 if(key.includes('arvore'))return 'tree';
 if(key.includes('arbusto'))return 'bush';
 if(key.includes('pedra'))return 'rock';
 return ({tree:'tree',house:'house',market:'market',shrub:'bush',ruin:'ruin',sign:'sign',fence:'fence',rock:'rock',lamp:'lamp',well:'well',pillar:'pillar',bridge:'bridge'})[item?.kind]||'monument';
}
export function designedV73Image(item,biome,{createCanvas=()=>document.createElement('canvas')}={}){
 const kind=modernPropFamily(item,biome),variant=String(item?.key||item?.kind||''),key=kind+':'+biome+':'+variant.slice(0,50);
 if(memory.has(key))return memory.get(key);
 const canvas=createCanvas();canvas.width=96;canvas.height=128;
 const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return null;
 ctx.imageSmoothingEnabled=false;
 let seed=11;for(const ch of key)seed=(Math.imul(seed,31)+ch.charCodeAt(0))>>>0;
 paint(ctx,kind,biome,seed);
 const img=Object.assign(canvas,{naturalWidth:96,naturalHeight:128});
 memory.set(key,img);
 return img;
}

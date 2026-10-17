'use strict';
import {paintV7BaseTiles,paintV7BaseTransitions,paintV7Road,paintV7River,paintV7Coast,paintV72Bridge} from './world-scenery-v7-terrain.mjs';
/**
 * Os Peregrinos · cenário V5: composição de mapas 2.5D em pixel art.
 * Um único mapa-base 768×512 (2 unidades por pixel) é pintado por região.
 * NÃO muda terrenos jogáveis, hitboxes, posição de portais ou fortaleza 3D.
 * Estradas, canteiros, água e taludes são parte da pintura plana (não coliders).
 */
export const MAP_ART_VERSION='scenery-25d-v5-topdown-composition-20261017';
export const TILE=16,MAP_W=768,MAP_H=512;
const PAL={
 meadow:['#52854d','#669a58','#83ac68','#345e3f','#c4a779','#e4c38d','#765b43','#304e38'],
 forest:['#315b3b','#427047','#64925a','#254b38','#ac946c','#d1b782','#625440','#1c3f31'],
 river:['#4a866c','#609d80','#8eb49b','#326a69','#bca781','#d5bd8f','#6a6b55','#234f55'],
 desert:['#bd9d69','#cfb57c','#e5c891','#91744d','#b39169','#d7bd83','#806448','#ad8e61'],
 mountain:['#667a73','#7e948b','#a6b3a3','#4a5e5f','#b2a184','#d4bc94','#716956','#344f53'],
 ruins:['#5a7b57','#73916b','#95a881','#3e644c','#ab9878','#c8b48a','#6f6551','#30443c'],
 swamp:['#456a58','#5a8370','#8ca18b','#355c51','#ad9f79','#c7ad87','#665946','#264c45'],
 coast:['#649783','#82b39a','#aed0b2','#467f74','#d7ba8e','#ead5a6','#827259','#316c74'],
 city:['#829278','#a0a98d','#bec2a5','#607c68','#b69f7b','#d4bd91','#736751','#4f6b55'],
 dungeon:['#485763','#627078','#879198','#344955','#897d78','#a89a8b','#504b50','#273841']
};
const WATER=['#14475b','#1c647c','#267f95','#3c97a6','#71bbc1','#c4e1cd'];
const CLIFF=['#4c3b2f','#69503a','#876747','#a68557','#c29b67','#e0b981'];
const HEDGE=['#193d32','#286346','#448451','#68a35f','#a1c777'];
const fmt=(a)=>Number.isFinite(a)?Math.round(a):0;
const pix=(g,c,x,y,w=1,h=1)=>{g.fillStyle=c;g.fillRect(fmt(x),fmt(y),Math.max(1,fmt(w)),Math.max(1,fmt(h)));};
function randGen(seed){
 let v=seed>>>0||1;return ()=>((v=Math.imul(v,1664525)+1013904223>>>0)/4294967296);
}
function choose(r,a){return a[(r()*a.length)|0];}
function sampleRoad(x,zone){
 const xx=x*2;
 return (496+Math.sin((xx+zone*117)/225)*54+Math.sin(xx/79+zone*2)*12)/2;
}
function drawTuft(g,x,y,r,c){
 pix(g,c[3],x+2,y+5,2,5);pix(g,c[1],x+4,y+1,2,7);
 pix(g,c[2],x+6,y+3,3,5);pix(g,c[0],x+1,y+7,7,2);
 if(r()>.83)pix(g,'#e8dcb7',x+5,y+2,2,2);
}
function drawFlower(g,x,y,r,c){
 drawTuft(g,x,y,r,c);
 for(const [dx,dy] of [[1,0],[4,-2],[6,1]])pix(g,choose(r,['#f4dfab','#e2b8ca','#acd7cb','#f5eaca']),x+dx,y+dy,2,2);
}
function grassTile(g,x,y,r,c,biome){
 pix(g,c[0],x,y,16,16);
 pix(g,c[1],x+(r()*9|0),y+(r()*9|0),3+(r()*5|0),4+(r()*5|0));
 for(let j=0;j<9;j++){
  const px0=x+1+(r()*14|0),py0=y+1+(r()*14|0);
  pix(g,choose(r,[c[1],c[2],c[3],c[1]]),px0,py0,1+(r()*3|0),1+(r()*2|0));
 }
 if(r()>.57&&!['desert','dungeon','mountain','city'].includes(biome))drawTuft(g,x+2+(r()*5|0),y+3,r,c);
 if(r()>.83&&['meadow','forest','river','coast'].includes(biome))drawFlower(g,x+2,y+4,r,c);
 if(['city','dungeon','ruins'].includes(biome)){
   // Ground stones follow a staggered masonry grid.
   pix(g,c[3],x,y+15,16,1);
   if(r()>.4){pix(g,c[2],x+2,y+2,11,9);pix(g,c[1],x+3,y+4,7,3);}
   pix(g,c[3],x+7+(r()*4|0),y+10,1,5);
 }else if(biome==='desert'){
   for(let j=0;j<3;j++)pix(g,c[j%2?2:3],x+(r()*11|0),y+(r()*13|0),5+(r()*4|0),1);
 }
 if(biome==='mountain'&&r()>.60){
  pix(g,'#576a65',x+3,y+9,8,4);pix(g,'#b4bbb0',x+5,y+7,6,2);pix(g,'#304e4d',x+4,y+12,5,2);
 }
}
function paintRoad(g,zone,biome,r,c){
 const stone=['city','ruins','mountain','dungeon'].includes(biome);
 for(let x=0;x<MAP_W;x+=2){
  const y=sampleRoad(x,zone),edge=1+Math.sin(x*.082+zone)*2+(r()-.5)*3;
  const half=stone?19:23,yy=fmt(y);
  // Outline makes road read as a path cut through grass.
  pix(g,stone?'#445248':'#547145',x,yy-half-4+edge,3,half*2+8);
  pix(g,c[6],x,yy-half+edge,3,half*2);
  pix(g,stone?'#a4a997':c[4],x,yy-half+edge+2,3,half*2-4);
  pix(g,stone?'#b8bba6':c[5],x+1,yy-half+edge+4,1,half*2-9);
 }
 // Large coherent stepping stones and trampled dust patches along the path.
 for(let x=8;x<MAP_W-9;x+=13){
  const y=sampleRoad(x,zone),xx=x+((r()-.5)*8|0),yy=y+((r()-.5)*22|0);
  if(stone){
   pix(g,'#776e62',xx,yy,9,6);pix(g,'#c0b29a',xx+1,yy,7,4);
   pix(g,'#ddd1b0',xx+2,yy+1,4,1);
  }else{
   pix(g,c[6],xx,yy,6+(r()*6|0),2+(r()*2|0));
   pix(g,c[5],xx+2,yy+1,4+(r()*3|0),2);
  }
 }
}
function spur(g,r,c,zone,px,doorY){
 // Terrain-only path joining the existing east-west road to a building door;
 // no wall or collision is added.
 const start=Math.min(doorY/2,sampleRoad(px/2,zone)),end=Math.max(doorY/2,sampleRoad(px/2,zone));
 if(end-start>200)return;
 for(let yy=start;yy<end;yy+=2){
  const bend=Math.sin(yy*.066+px)*3,xx=px/2+bend;
  pix(g,c[6],xx-10,yy,21,3);pix(g,c[4],xx-8,yy,17,3);
  if(r()>.78)pix(g,c[5],xx-1+(r()*6|0),yy,4,2);
 }
}
export function reservedSceneryLandmarks(zone,biome){
 // Landmarks have fixed semantic placement, unlike random scattered houses.
 // The actual renderer checks visible rectangles, roads, river, shoreline
 // and the Aurora shrine before accepting each fixed point.
 const village=[
  {kind:'house',x:380,z:310,variant:1},
  {kind:'house',x:1120,z:295,variant:0},
  {kind:'well',x:525,z:310,variant:0},
  {kind:'sign',x:260,z:360,variant:1},
  {kind:'fence',x:232,z:335,variant:0},
  {kind:'flower',x:650,z:235,variant:1},
  {kind:'tree',x:1320,z:305,variant:2}
 ];
 const sets={
  meadow:village,
  city:[
   {kind:'house',x:365,z:305,variant:0},{kind:'house',x:1130,z:300,variant:1},
   {kind:'market',x:540,z:330,variant:1},{kind:'fountain',x:955,z:325,variant:0},
   {kind:'lamp',x:275,z:365,variant:0},{kind:'sign',x:1255,z:345,variant:0}
  ],
  forest:[{kind:'ruin',x:390,z:310,variant:2},{kind:'pine',x:1100,z:305,variant:1}],
  desert:[{kind:'obelisk',x:345,z:325,variant:0},{kind:'ruin',x:1110,z:325,variant:0}],
  mountain:[{kind:'watchtower',x:380,z:320,variant:0},{kind:'crystal',x:1110,z:320,variant:1}],
  ruins:[{kind:'arch',x:360,z:320,variant:0},{kind:'statue',x:1100,z:320,variant:0}],
  dungeon:[{kind:'altar',x:380,z:310,variant:0},{kind:'pillar',x:1110,z:310,variant:1}],
  coast:[{kind:'house',x:380,z:305,variant:2},{kind:'palm',x:1100,z:305,variant:1}],
  river:[{kind:'house',x:350,z:305,variant:1},{kind:'tree',x:1100,z:300,variant:2}],
  swamp:[{kind:'stump',x:380,z:320,variant:1},{kind:'ruin',x:1110,z:320,variant:1}]
 };
 // Shift the village very slightly in later regions so revisiting is varied,
 // still aligned to original world coordinates and navigation.
 const delta=zone===0?0:Math.round(Math.sin(zone*1.31)*14);
 return (sets[biome]||village).map(item=>({...item,x:item.x+delta}));
}
function drawBushBorder(g,r,x,y,w,h){
 const shades=HEDGE;
 pix(g,shades[0],x-3,y+5,w+6,h+3);
 for(let xx=x;xx<x+w;xx+=10)for(let yy=y;yy<y+h;yy+=9){
  pix(g,shades[1],xx+1,yy+2,12,9);
  pix(g,shades[2],xx+2,yy+1,7,5);
  pix(g,shades[3],xx+2+(r()*4|0),yy+1,4,2);
  if(r()>.84)pix(g,shades[4],xx+6,yy,2,2);
 }
}
function paintGardens(g,zone,biome){
 if(!['meadow','city','forest','river','coast'].includes(biome))return;
 const r=randGen((zone+2)*9091),gardens=[
  [155,177,62,50],[281,171,50,42],[540,169,60,43],[642,176,51,34],
  [110,329,54,34],[650,350,65,31]
 ];
 // Coordinates are half-world texture pixels. These grouped hedges are
 // ground decoration, not standing objects blocking player movement.
 for(let j=0;j<gardens.length;j++){
  const [x,y,w,h]=gardens[j];
  if(j>3&&biome!=='city')continue;
  if(biome==='forest'&&j%2)continue;
  drawBushBorder(g,r,x,y,w,h);
 }
}
function paintCliff(g,zone,biome){
 if(['city','dungeon','coast','swamp'].includes(biome))return;
 const r=randGen(33091+zone*337),green=PAL[biome];
 // A decorative rocky terrace at the SOUTH-EAST edge, entirely away from
 // the traversed central road; no collision or fake wall is added.
 const x0=biome==='desert'?525:515,depth=biome==='mountain'?70:48;
 for(let x=x0;x<768;x+=8){
  const top=395+Math.round(Math.sin(x*.046+zone)*5)+Math.round(Math.sin(x*.11)*3);
  const end=Math.min(512,top+depth+(r()*6|0));
  pix(g,CLIFF[0],x,top+5,8,end-top+2);
  pix(g,CLIFF[1],x+1,top+8,7,end-top-6);
  pix(g,CLIFF[2],x+1,top+12,6,end-top-18);
  for(let y=top+17;y<end-6;y+=15){
   pix(g,CLIFF[(1+(r()*3|0))],x+(r()*4|0),y,6,4);
   pix(g,CLIFF[4],x+1,y-1,4,2);
   pix(g,CLIFF[0],x+3,y+5,5,2);
  }
  // Zig-zag crisp grass lip rather than anti-aliased curves.
  pix(g,green[3],x-1,top-4,9,8);
  pix(g,green[1],x,top-7,8,7);
  pix(g,green[2],x+1,top-7,5,2);
 }
 // Terrace shadow is baked into the static scene; never overlays characters.
}
function paintRiver(g,zone){
 const r=randGen(71719+zone*561);
 for(let y=0;y<512;y+=2){
  const z=y*2,center=(420+92*Math.sin(z/150+zone))/2,half=39+Math.sin(y*.09)*4;
  const left=Math.round(center-half);
  pix(g,'#244f47',left-6,y,half*2+12,3);
  pix(g,WATER[0],left-2,y,half*2+4,3);
  pix(g,WATER[1],left+3,y,half*2-6,3);
  pix(g,WATER[2],left+8,y,half*2-16,3);
  pix(g,WATER[3],center+Math.sin(y*.15)*20-20,y,36,1);
  if(y%8===0){
   const xx=center+(r()-.5)*half*1.5;
   pix(g,WATER[4],xx,y,9+(r()*12|0),1);
   pix(g,WATER[5],left-2,y,7,1);
  }
 }
}
function paintCoast(g,zone){
 const r=randGen(707+zone*133);
 for(let y=345;y<512;y+=2){
  const wave=6*Math.sin(y*.10+zone)+3*Math.sin(y*.23);
  if(y<365+wave){pix(g,'#e5c992',0,y,768,2);continue}
  pix(g,WATER[y%13===0?3:2],0,y,768,2);
  if(y%5===0)for(let j=0;j<22;j++){
   const xx=(r()*768|0);
   pix(g,r()>.6?WATER[4]:WATER[3],xx,y,6+(r()*14|0),1);
  }
  if(y<387+wave&&y%4===0)pix(g,WATER[5],0,y,768,1);
 }
}
function paintSwamp(g,zone){
 const r=randGen(7071+zone*841);
 for(let i=0;i<26;i++){
  const x=(r()*680|0)+20,y=(r()*320|0)+65;
  if(Math.abs(y-sampleRoad(x,zone))<55)continue;
  pix(g,'#284e48',x-7,y-4,26,14);
  pix(g,'#31736e',x-3,y-3,19,10);
  pix(g,'#659e87',x+1,y,12,2);
 }
}
export function drawDesignedTerrainCanvas(zone,biome,{v7Atlas=null,edgeFinish=true}={}){
 if(!PAL[biome])throw Error('Bioma inválido: '+biome);
 const canvas=document.createElement('canvas');canvas.width=MAP_W;canvas.height=MAP_H;
 const g=canvas.getContext('2d',{alpha:false});
 g.imageSmoothingEnabled=false;
 const r=randGen(9113+Math.imul(zone+1,7229)+Object.keys(PAL).indexOf(biome)*997),c=PAL[biome];
 if(v7Atlas){
  paintV7BaseTiles(g,v7Atlas,zone,biome,MAP_W,MAP_H);
  if(edgeFinish)paintV7BaseTransitions(g,v7Atlas,zone,biome,MAP_W,MAP_H);
 }else{
  for(let y=0;y<MAP_H;y+=TILE)for(let x=0;x<MAP_W;x+=TILE)
   grassTile(g,x,y,r,c,biome);
 }
 if(biome==='river'){
  paintRiver(g,zone);
  if(v7Atlas)paintV7River(g,v7Atlas,zone,MAP_W,MAP_H);
 }
 if(biome==='coast'){
  paintCoast(g,zone);
  if(v7Atlas)paintV7Coast(g,v7Atlas,zone,MAP_W,MAP_H);
 }
 if(biome==='swamp')paintSwamp(g,zone);
 paintCliff(g,zone,biome);
 paintGardens(g,zone,biome);
 paintRoad(g,zone,biome,r,c);
 if(v7Atlas)paintV7Road(g,v7Atlas,zone,biome,sampleRoad,MAP_W,MAP_H);
 // V7.2 bridge is stamped once into the static painted river and keeps the roadway free.
 if(v7Atlas&&biome==='river')paintV72Bridge(g,v7Atlas,zone,biome,sampleRoad,MAP_W,MAP_H);
 if(['city','meadow'].includes(biome)){
  for(const l of reservedSceneryLandmarks(zone,biome))
   if(['house','market','fountain','well'].includes(l.kind))spur(g,r,c,zone,l.x,l.z-(l.kind==='house'?28:16));
 }
 return canvas;
}
export function createDesignedTerrainTexture(THREE,zone,biome,{v7Atlas=null}={}){
 const tex=new THREE.CanvasTexture(drawDesignedTerrainCanvas(zone,biome,{v7Atlas}));
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.magFilter=THREE.NearestFilter;
 tex.minFilter=THREE.NearestMipmapNearestFilter;
 tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
 tex.anisotropy=1;
 return tex;
}


/**
 * Full-size house pixel painting for semantic V5 settlement landmarks.
 * 192×160 original pixels instead of stretching the previous tiny 96×128
 * primitive. Keeps the larger building proportion to a 93×116 adventurer.
 */
export function drawDesignedHouseCanvas(biome='meadow',variant=0){
 if(!PAL[biome])throw Error('Bioma inválido: '+biome);
 const can=document.createElement('canvas');can.width=192;can.height=160;
 const g=can.getContext('2d',{alpha:true});g.imageSmoothingEnabled=false;
 const r=randGen(941+variant*193+Object.keys(PAL).indexOf(biome)*119);
 const c=PAL[biome];
 const brick=['desert','mountain','ruins','dungeon'].includes(biome);
 const wall=brick?['#645b50','#9b927a','#d4c6a3','#ede1bb']:['#695a49','#b7a78b','#d7c3a1','#f0dcc0'];
 const roofs=biome==='desert'?['#795b45','#a57c52','#d9a66e','#f0c78a']:
             biome==='coast'?['#324e6a','#4b7592','#6996af','#b6cad0']:
             biome==='forest'||biome==='swamp'?['#3c4d47','#4f6752','#6e9370','#bed0a1']:
             variant%2?['#453a48','#76515d','#a87678','#ceaaa4']:
                       ['#303e52','#405d77','#6786a2','#adbec9'];
 // The roof has a real gable silhouette, not a block or 3D cone.
 pix(g,'#1d2d31',13,73,166,79);
 pix(g,wall[1],18,77,156,71);pix(g,wall[2],21,78,149,68);
 pix(g,wall[3],23,81,142,5);
 // Masonry, mortar grid and slight cracks.
 for(let y=82;y<147;y+=11)for(let x=23;x<168;x+=21){
  const dx=(y/11|0)%2?7:0;
  pix(g,wall[0],x+dx,y+10,19,1);
  pix(g,r()>.37?wall[1]:wall[3],x+dx+2,y+2,12,3);
  pix(g,wall[0],x+dx+20,y,1,10);
  if(r()>.84){pix(g,'#625c53',x+dx+6,y+5,2,4);}
 }
 // Chimney behind the gabled roof; stone rim and engraved courses.
 pix(g,'#31393b',145,23,24,43);
 pix(g,wall[1],147,20,19,42);
 pix(g,wall[3],145,19,24,5);
 for(let y=26;y<60;y+=9){pix(g,wall[0],148,y,16,2);pix(g,wall[3],151,y+2,8,2);}
 // Roof row-by-row, symmetric left/right profiles, two-color shingles.
 for(let y=14;y<=83;y+=2){
  const width=Math.min(93,Math.floor((y-14)*1.29)+8);
  const x1=96-width,x2=96+width;
  pix(g,y>78?'#2c2e37':roofs[0],x1-3,y,x2-x1+6,4);
  pix(g,roofs[1],x1,y,x2-x1,2);
  if(y>21&&y%6===2){
   for(let x=x1+3;x<x2-4;x+=10){
    pix(g,r()>.3?roofs[2]:roofs[1],x+(y%11),y,7,2);
    pix(g,roofs[3],x+1+(y%11),y,3,1);
    if(r()>.8)pix(g,roofs[0],x+3,y+2,5,1);
   }
  }
 }
 // Swooping gable with carved trim and a little emblem.
 pix(g,'#e0bf7f',90,26,12,4);
 pix(g,'#503c33',93,29,6,7);pix(g,'#e0c78f',95,31,2,4);
 // Wooden porch frame and overhead arch.
 pix(g,'#352e30',76,105,43,44);
 pix(g,'#7d5b3e',79,108,38,41);
 pix(g,'#a78358',82,110,32,37);
 pix(g,'#342f34',85,115,26,34);
 pix(g,'#694a39',88,117,20,31);
 for(let y=119;y<144;y+=8){pix(g,'#ac8258',90,y,16,2);}
 pix(g,'#e4c78c',105,133,3,3);
 pix(g,'#463b32',74,102,47,7);
 pix(g,'#c7a679',78,104,39,3);
 // Lit windows both sides, with mullions and decorated sills.
 for(const x of [31,138]){
  pix(g,'#433b39',x-4,95,30,29);
  pix(g,'#aa8057',x-1,97,25,24);
  pix(g,'#f7d69a',x+2,99,19,19);
  pix(g,'#fff0be',x+5,101,10,12);
  pix(g,'#765941',x+11,99,3,20);
  pix(g,'#765941',x+2,108,19,3);
  pix(g,'#3e473e',x-7,120,37,5);
  pix(g,'#b6ab7c',x-4,121,30,3);
  pix(g,'#4a663d',x+1,124,24,5);
  for(let j=0;j<5;j++){const xx=x+(r()*23|0),yy=120+(r()*8|0);
   pix(g,j%2?'#e3a9a2':'#e8cb89',xx,yy,3,3);}
 }
 // Thick stone footings and front steps.
 pix(g,'#3a403b',14,147,166,8);pix(g,wall[0],16,148,162,4);
 pix(g,'#7b7767',72,148,50,6);pix(g,'#b5ad93',77,149,40,3);
 pix(g,'#6e6553',80,155,34,4);pix(g,'#d5c5a4',84,155,26,2);
 for(let i=0;i<15;i++){const x=17+(r()*158|0),y=145+(r()*9|0);
  if(x>76&&x<120)continue;
  pix(g,c[1],x,y,3+(r()*4|0),2);
  if(i%3===0)pix(g,'#ead1a0',x+2,y-2,2,2);
 }
 return can;
}

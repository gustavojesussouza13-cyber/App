'use strict';
import {finishSceneryGround,finishSceneryRoad,finishScenerySprite,EXTRA_KINDS,EXTRA_SIZES,ART_VERSION} from './world-scenery-v4-art.mjs';
import {createDesignedTerrainTexture,reservedSceneryLandmarks,drawDesignedHouseCanvas,MAP_ART_VERSION} from './world-scenery-v5-landforms.mjs';
import {createAtlasGroundTexture,createAtlasPropTexture,atlasLoaded,ASSET_BACKED_VERSION} from './world-scenery-v6-asset-adapter.mjs';
import {createV7PropTexture,v7Image,v7FitSize,isV7Ready,SCENERY_V7_VERSION} from './world-scenery-v7-asset-loader.mjs';
import {v7TerrainImage,v7TerrainReady,V7_TERRAIN_VERSION} from './world-scenery-v7-terrain.mjs';
import {v72Image,createV72PropTexture,SCENERY_V72_VERSION} from './world-scenery-v72-asset-loader.mjs';
/**
 * OS PEREGRINOS · CENÁRIO V4 2.5D / PRÉVIA EXPERIMENTAL
 * Mundo aberto SOMENTE: solo, estradas, água, construções e decoração estática.
 * Sem dependência da fortaleza 3D, sem mudança de colisões, spawn ou NPCs.
 * Materiais CanvasTexture determinísticos (arte de pixels inteiros, sem blur).
 * Objetos em InstancedMesh: menos draw calls que dezenas de malhas individuais.
 */
export const SCENERY_V4_VERSION='world-scenery-25d-v42-artisan-20261017';
export const BIOMES=Object.freeze(['meadow','forest','river','desert','mountain','ruins','swamp','coast','city','dungeon']);
export const SIZE=Object.freeze({width:1536,height:1024,tile:32});

const THEMES=Object.freeze({
 meadow:['#4d7449','#648a51','#9dba70','#284d3b','#c0aa77','#6c5540','#89af70','#dcc994'],
 forest:['#294f39','#426b45','#72935b','#192f2e','#aa946d','#584831','#5e9061','#d2bb81'],
 river:['#3f7960','#62a289','#9bc7a3','#275b5b','#b4a481','#6a6250','#70c4bd','#e4d6a4'],
 desert:['#ba9360','#d2b57e','#eed198','#796144','#c0a478','#8d6449','#bc9060','#f9dea7'],
 mountain:['#5e6b67','#83918a','#b8bcab','#394b51','#b6a98b','#675e54','#9baba1','#dde0d1'],
 ruins:['#586e59','#788770','#aab39a','#37483f','#aa987a','#575448','#718f70','#d2c6a4'],
 swamp:['#435a48','#5c745b','#8b9870','#263f3c','#9e9272','#4e483d','#658f78','#bdd19a'],
 coast:['#66917e','#86b7a1','#c1dfbe','#397885','#dfc69d','#7a6752','#9cd2c5','#f3e4b6'],
 city:['#879177','#a4aa8a','#d7c79d','#526350','#c6b083','#79624c','#8f9e79','#eee0b7'],
 dungeon:['#4a5360','#66707a','#a9a9a2','#2e3542','#93887e','#5a4c52','#697b7e','#d4c4ab']
});
const ACCENTS=Object.freeze({
 meadow:['#366e47','#488f51','#6ba65a','#a4c46c','#dae3a1'],
 forest:['#1b543a','#326e47','#468958','#74aa62','#b0c477'],
 river:['#336c60','#448b77','#62ad8a','#a8c9ab','#d4e1c0'],
 desert:['#7d8753','#a4a46a','#bdba80','#d4cb92','#f2dfb1'],
 mountain:['#2b5952','#43786d','#719b84','#9bb7a5','#d4d8b4'],
 ruins:['#35694f','#51845d','#7b9d63','#a5b77e','#d2d7ab'],
 swamp:['#28594e','#437d5c','#719779','#a5b595','#d1d4aa'],
 coast:['#2e806f','#4b9c83','#77ba90','#a8d2a1','#d4e1b2'],
 city:['#376b46','#548456','#80a15e','#b4c27d','#e4d39e'],
 dungeon:['#324b56','#58717b','#81939a','#b3b9ae','#d8cdb7']
});
const dark='#24333a',gold='#ddb878';
export function roadY(x,z){return 496+Math.sin((x+z*117)/225)*54+Math.sin(x/79+z*2)*12;}
export function seeded(zone,extra=0){
 let v=(Math.imul(zone+101,2246822519)^Math.imul(extra+41,3266489917))>>>0||1;
 return function(){v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296;};
}
const range=(v,a,b)=>Math.max(a,Math.min(b,v));
function select(rand,options){let x=rand(),acc=0;for(const [k,p] of options){acc+=p;if(x<=acc)return k;}return options.at(-1)[0];}
const DISTRIBUTIONS_V4=Object.freeze({
 meadow:[['tree',.31],['shrub',.20],['flower',.18],['rock',.12],['fence',.09],['house',.05],['sign',.05]],
 forest:[['tree',.52],['pine',.15],['shrub',.14],['rock',.08],['log',.06],['ruin',.05]],
 river:[['tree',.22],['reeds',.23],['shrub',.14],['rock',.15],['bridge',.03],['house',.06],['flower',.17]],
 desert:[['cactus',.32],['rock',.23],['ruin',.14],['arch',.11],['shrub',.10],['sign',.10]],
 mountain:[['pine',.25],['rock',.32],['ruin',.10],['arch',.10],['shrub',.13],['sign',.10]],
 ruins:[['ruin',.32],['arch',.23],['rock',.17],['shrub',.12],['tree',.08],['pillar',.08]],
 swamp:[['tree',.29],['reeds',.25],['shrub',.14],['rock',.12],['log',.12],['ruin',.08]],
 coast:[['palm',.25],['shrub',.22],['rock',.18],['reeds',.12],['house',.09],['sign',.08],['flower',.06]],
 city:[['house',.27],['barrel',.13],['crate',.11],['fence',.15],['lamp',.09],['tree',.10],['flower',.09],['well',.06]],
 dungeon:[['pillar',.28],['ruin',.26],['rock',.18],['altar',.12],['arch',.11],['lamp',.05]]
});
const DISTRIBUTIONS=Object.freeze({
 meadow:[['tree',.24],['shrub',.18],['flower',.15],['rock',.10],['fence',.07],['house',.06],['sign',.05],['stump',.05],['mushroom',.05],['statue',.05]],
 forest:[['tree',.36],['pine',.13],['shrub',.13],['rock',.08],['log',.06],['ruin',.05],['mushroom',.11],['stump',.08]],
 river:[['tree',.18],['reeds',.20],['shrub',.12],['rock',.12],['bridge',.03],['house',.08],['flower',.08],['boat',.09],['stump',.05],['lamp',.05]],
 desert:[['cactus',.25],['rock',.20],['ruin',.13],['arch',.09],['shrub',.09],['sign',.08],['obelisk',.10],['crystal',.06]],
 mountain:[['pine',.23],['rock',.24],['ruin',.08],['arch',.07],['shrub',.11],['sign',.06],['crystal',.09],['watchtower',.12]],
 ruins:[['ruin',.22],['arch',.16],['rock',.14],['shrub',.12],['tree',.05],['pillar',.07],['statue',.11],['grave',.08],['obelisk',.05]],
 swamp:[['tree',.21],['reeds',.19],['shrub',.12],['rock',.11],['log',.09],['ruin',.05],['mushroom',.15],['stump',.08]],
 coast:[['palm',.19],['shrub',.17],['rock',.15],['reeds',.12],['house',.08],['sign',.07],['flower',.06],['boat',.10],['fountain',.06]],
 city:[['house',.22],['barrel',.10],['crate',.08],['fence',.11],['lamp',.09],['tree',.08],['flower',.06],['well',.06],['market',.08],['fountain',.07],['statue',.05]],
 dungeon:[['pillar',.18],['ruin',.17],['rock',.12],['altar',.08],['arch',.09],['lamp',.05],['obelisk',.12],['crystal',.10],['grave',.09]]
});
const SIZES=Object.freeze({
 tree:[112,123],pine:[92,118],palm:[105,128],shrub:[65,58],flower:[48,42],
 rock:[67,51],ruin:[119,108],arch:[112,112],pillar:[60,105],
 house:[155,146],fence:[78,42],crate:[49,52],barrel:[46,49],
 lamp:[45,96],well:[73,64],log:[71,43],reeds:[57,52],
 cactus:[67,94],sign:[47,73],altar:[104,92],bridge:[137,105],
 ...EXTRA_SIZES
});
/**
 * Full visible plane for a scenery sprite, in the same map-coordinate space as
 * instance matrices. Foot-point is (x,z); image is above it by (h-9) px.
 * Bound checks cover the WHOLE painted sprite rather than just its anchor.
 */
export function sceneryVisualBounds(item,pad=0){
 const gap=Math.max(0,Number(pad)||0),w=Number(item.w),h=Number(item.h);
 return {left:item.x-w/2-gap,right:item.x+w/2+gap,
         top:item.z-h+9-gap,bottom:item.z+9+gap};
}
export function sceneryOverlaps(a,b,pad=5){
 const A=sceneryVisualBounds(a,pad),B=sceneryVisualBounds(b,pad);
 return A.left<B.right&&A.right>B.left&&A.top<B.bottom&&A.bottom>B.top;
}
function visualExclusion(item,zone,biome,width,height){
 const b=sceneryVisualBounds(item,8);
 // Fully inside canvas, including the canopy/roof, not only the trunk/feet.
 if(b.left<8||b.right>width-8||b.top<8||b.bottom>height-8)return true;
 // Every row of road is usable; tall buildings placed BELOW the road are not
 // allowed to spill their roof into it. Sample across the sprite width.
 if(item.kind!=='bridge')for(let j=0;j<5;j++){
  const x=b.left+(b.right-b.left)*j/4,y=roadY(x,zone);
  if(b.top<y+52&&b.bottom>y-52)return true;
 }
 // Zone-zero original Aurora landmark must remain visible in its entirety.
 if(zone===0&&b.left<853&&b.right>680&&b.top<416&&b.bottom>258)return true;
 // Water is painted on the ground. Do not let rocks, canopies, or roofs stand
 // in the river or on the coast. Boats and the actual river bridge are intended.
 if(biome==='river'&&!['boat','bridge'].includes(item.kind))for(let j=0;j<5;j++){
  const z=b.top+(b.bottom-b.top)*j/4,x=420+92*Math.sin(z/150+zone);
  if(b.left<x+70&&b.right>x-70)return true;
 }
 if(biome==='coast'&&item.kind!=='boat'&&b.bottom>696)return true;
 return false;
}
export function sceneryOverlapPairs(items,pad=5){
 let count=0;
 for(let i=0;i<items.length;i++)
  for(let j=0;j<i;j++)if(sceneryOverlaps(items[i],items[j],pad))count++;
 return count;
}
export function planSceneryV4(zone,biome,{width=1536,height=1024,detail=true}={}){
 if(!BIOMES.includes(biome))throw Error('Bioma desconhecido: '+biome);
 const rnd=seeded(zone,BIOMES.indexOf(biome)+19),out=[];
 const target=biome==='forest'?180:biome==='city'?105:biome==='desert'?85:biome==='dungeon'?95:biome==='ruins'?140:150;
 const tryAdd=item=>{
  if(visualExclusion(item,zone,biome,width,height))return false;
  if(out.some(other=>sceneryOverlaps(item,other,5)))return false;
  out.push(Object.freeze(item));
  return true;
 };
 // Fixed landmarks FIRST so random vegetation cannot hide or cover them.
 if(biome==='river'){
  let best=null,err=Infinity;
  for(let z=300;z<660;z+=4){
   const x=420+92*Math.sin(z/150+zone),delta=Math.abs(z-roadY(x,zone));
   if(delta<err){err=delta;best={kind:'bridge',x:Math.round(x),z,w:137,h:105,variant:0};}
  }
  if(best)tryAdd(best);
 }
 if(biome==='city'){
  for(const [x,offset,kind] of [[600,155,'lamp'],[910,155,'lamp'],[690,-145,'flower'],[860,-145,'flower']]){
   const z=Math.round(roadY(x,zone)+offset);
   tryAdd({kind,x,z,w:SIZES[kind][0],h:SIZES[kind][1],variant:1});
  }
 }
 let boats=0;
 for(let n=0;n<target*22&&out.length<target;n++){
  let x=Math.round(30+rnd()*(width-60)),z=Math.round(30+rnd()*(height-60));
  const kind=select(rnd,(detail?DISTRIBUTIONS:DISTRIBUTIONS_V4)[biome]);
  if(kind==='bridge')continue; // A single real landmark bridge was reserved above.
  if(kind==='boat'){
   if(boats>=3)continue;
   // Place vessels on the actual illustrated water, not on dry terrain.
   if(biome==='river')x=Math.round(420+92*Math.sin(z/150+zone));
   else if(biome==='coast')z=Math.round(780+rnd()*190);
  }
  const [w,h]=SIZES[kind];
  const obj={kind,x,z,w,h,variant:Math.floor(rnd()*4)};
  if(Math.abs(z-roadY(x,zone))<77&&kind!=='bridge')continue;
  if(biome==='river'&&!['boat','bridge'].includes(kind)&&Math.abs(x-(420+92*Math.sin(z/150+zone)))<99)continue;
  if(tryAdd(obj)&&kind==='boat')boats++;
 }
 return Object.freeze(out);
}

/**
 * V5 semantic composition: fixed landmarks first, then restrained clusters.
 * Objects are intentionally arranged around clearings rather than uniformly
 * scattered. All footprints remain static and outside playable road ribbons.
 */
const V5_SIZES=Object.freeze({
 ...SIZES,
 house:[350,230],market:[245,180],ruin:[158,137],
 arch:[135,133],watchtower:[170,188],well:[96,79],
 fountain:[137,102],statue:[95,137]
});
export function planSceneryV5(zone,biome,{width=1536,height=1024}={}){
 if(!BIOMES.includes(biome))throw Error('Bioma desconhecido: '+biome);
 const rnd=seeded(zone,735+BIOMES.indexOf(biome));
 const placed=[];
 function accept(item){
  if(visualExclusion(item,zone,biome,width,height))return false;
  // Cliff edges are decorative, not an impassable gameplay wall.
  // Keep tall standing props off the pictured cliff face.
  if(!['city','dungeon','coast','swamp'].includes(biome)&&item.x>990&&item.z>764)return false;
  if(placed.some(existing=>sceneryOverlaps(item,existing,8)))return false;
  placed.push(Object.freeze(item));return true;
 }
 for(const landmark of reservedSceneryLandmarks(zone,biome)){
  const wh=V5_SIZES[landmark.kind];
  if(wh)accept({...landmark,w:wh[0],h:wh[1]});
 }
 // A small number of large well-separated anchors gives a coherent
 // village/forest composition at the game's 93×116 character scale.
 const centres=[
  [205,220],[660,205],[1330,220],
  [280,710],[725,740],[1325,715],
  [120,500],[1430,510]
 ];
 const families={
  meadow:[['tree',.19],['shrub',.19],['flower',.18],['rock',.09],['fence',.08],['stump',.10],['mushroom',.08],['sign',.05],['lamp',.04]],
  forest:[['tree',.37],['pine',.16],['shrub',.16],['rock',.08],['mushroom',.11],['stump',.07],['flower',.05]],
  river:[['tree',.18],['shrub',.18],['reeds',.19],['rock',.12],['flower',.10],['stump',.07],['boat',.09],['sign',.07]],
  desert:[['cactus',.30],['rock',.27],['shrub',.13],['obelisk',.08],['ruin',.09],['crystal',.07],['sign',.06]],
  mountain:[['pine',.22],['rock',.29],['shrub',.16],['crystal',.12],['ruin',.08],['stump',.07],['sign',.06]],
  ruins:[['ruin',.20],['rock',.23],['shrub',.18],['pillar',.13],['flower',.12],['grave',.08],['statue',.06]],
  swamp:[['tree',.19],['reeds',.22],['mushroom',.19],['shrub',.17],['rock',.13],['stump',.10]],
  coast:[['palm',.17],['shrub',.17],['flower',.19],['rock',.17],['reeds',.11],['boat',.10],['sign',.09]],
  city:[['flower',.26],['fence',.15],['shrub',.18],['crate',.09],['barrel',.09],['lamp',.09],['rock',.06],['tree',.08]],
  dungeon:[['pillar',.21],['ruin',.17],['rock',.25],['altar',.09],['crystal',.08],['grave',.11],['lamp',.09]]
 };
 const max=biome==='city'?57:biome==='forest'?94:biome==='desert'?60:biome==='meadow'?78:72;
 let boatCount=0;
 for(let tries=0;tries<max*45&&placed.length<max;tries++){
  const idx=Math.floor(rnd()*centres.length),centre=centres[idx];
  const kind=select(rnd,families[biome]),size=V5_SIZES[kind];
  let x=Math.round(centre[0]+(rnd()+rnd()-1)*240),z=Math.round(centre[1]+(rnd()+rnd()-1)*200);
  if(kind==='boat'){
   if(boatCount>=2)continue;
   if(biome==='river')x=Math.round(420+92*Math.sin(z/150+zone));
   else if(biome==='coast')z=Math.round(785+rnd()*160);
   else continue;
  }
  const item={kind,x,z,w:size[0],h:size[1],variant:Math.floor(rnd()*4)};
  if(accept(item)&&kind==='boat')boatCount++;
 }
 return Object.freeze(placed);
}


/** V7.2 anchor cleanup applies ONLY when the experimental V7 is selected. */
export function planSceneryV72(zone,biome,initial){
 const candidates={
  meadow:[{kind:'well',x:785,z:228,w:96,h:117,variant:0}],
  city:[{kind:'lamp',x:710,z:230,w:57,h:114,variant:0},
        {kind:'fountain',x:830,z:225,w:130,h:104,variant:0}],
  ruins:[{kind:'ruin',x:785,z:228,w:158,h:137,variant:0}]
 }[biome]||[];
 if(!candidates.length)return initial;
 // Do not let stochastic decoration consume a semantic landmark footprint.
 // Houses and the existing settlement anchors are never displaced.
 const protectedKinds=new Set(['house','market','arch','statue','altar','watchtower']);
 const result=initial.filter(item=>!candidates.some(candidate=>
  !protectedKinds.has(item.kind)&&sceneryOverlaps(item,candidate,8)));
 for(const candidate of candidates){
  if(visualExclusion(candidate,zone,biome,1536,1024))continue;
  if(result.some(other=>sceneryOverlaps(other,candidate,8)))continue;
  result.push(Object.freeze(candidate));
 }
 return Object.freeze(result);
}
function canvasTexture(THREE,canvas,{repeatX=1,repeatY=1}={}){
 const t=new THREE.CanvasTexture(canvas);
 t.colorSpace=THREE.SRGBColorSpace;
 t.magFilter=THREE.NearestFilter;
 t.minFilter=THREE.NearestMipmapNearestFilter;
 t.anisotropy=1;
 t.wrapS=t.wrapT=THREE.RepeatWrapping;
 t.repeat.set(repeatX,repeatY);
 return t;
}
const p=(g,c,x,y,w=1,h=1)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function poly(g,c,vertices){g.fillStyle=c;g.beginPath();g.moveTo(...vertices[0]);for(let i=1;i<vertices.length;i++)g.lineTo(...vertices[i]);g.closePath();g.fill();}
function newCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d',{alpha:true});g.imageSmoothingEnabled=false;return {c,g};}
function bricks(g,rnd,colors,x,y,w,h,step=13){
 for(let row=0;row<Math.ceil(h/step);row++){
  const yy=y+row*step,shift=(row%2)*step/2;
  for(let xx=x-shift;xx<x+w;xx+=step*1.4){
   const rx=range(xx,x,x+w),ww=Math.min(x+w-rx,step*1.4-.9);
   if(ww<=0)continue;
   p(g,colors[(rnd()*colors.length)|0],rx,yy,ww,Math.min(step-1,y+h-yy));
   p(g,'#24323955',rx,yy+Math.min(step-2,y+h-yy),ww,1);
   if(rnd()>.68)p(g,'#e8dbb366',rx+2,yy+2,Math.min(5,ww-2),2);
  }
 }
}
function groundTextureV4(THREE,zone,biome,detail=true){
 const {c,g}=newCanvas(256,256),rnd=seeded(zone,34+BIOMES.indexOf(biome)),colors=THEMES[biome],dry=['desert','city','mountain','dungeon','ruins'].includes(biome);
 for(let ty=0;ty<8;ty++)for(let tx=0;tx<8;tx++){
  const x=tx*32,y=ty*32,n=rnd();
  p(g,colors[0],x,y,32,32);
  if(biome==='city'||biome==='dungeon'){
   bricks(g,rnd,[colors[1],colors[2],colors[4],colors[5]],x,y,32,32,biome==='city'?10:16);
   if(n>.63)p(g,colors[3],x+12,y+9,7,2);
  }else if(biome==='desert'){
   for(let k=0;k<6;k++){const xx=x+rnd()*27,yy=y+rnd()*29;p(g,k%2?colors[2]:colors[1],xx,yy,4+rnd()*10,1+rnd()*2)}
   if(n>.68)poly(g,colors[5],[[x+4,y+22],[x+14,y+19],[x+22,y+22],[x+18,y+24]]);
  }else{
   for(let k=0;k<19;k++){
    const xx=x+1+rnd()*29,yy=y+1+rnd()*29;
    p(g,rnd()>.65?colors[2]:rnd()>.56?colors[1]:colors[3],xx,yy,1+rnd()*5,1+rnd()*3);
   }
   if(n>.5){p(g,colors[6],x+10,y+11,7,2);p(g,colors[6],x+13,y+7,2,12);}
   if(n>.91&&!dry){for(let j=0;j<4;j++)p(g,j%2?'#d6b3db':'#efe0a5',x+8+j*3,y+25-(j%2)*3,2,2);}
  }
  if(biome==='mountain'||biome==='ruins')if(n>.66){
   poly(g,colors[5],[[x+3,y+15],[x+12,y+10],[x+24,y+16],[x+22,y+22],[x+7,y+25]]);
   p(g,colors[2],x+10,y+13,7,2);
  }
  if(biome==='swamp'&&n>.72){p(g,'#345d5b',x+5,y+17,19,7);p(g,'#78a99b',x+8,y+18,8,2);}
 }
 if(detail)finishSceneryGround(g,biome,zone);
 return canvasTexture(THREE,c,{repeatX:9,repeatY:6});
}
function roadTextureV4(THREE,zone,biome,detail=true){
 const {c,g}=newCanvas(128,128),rnd=seeded(zone,90+BIOMES.indexOf(biome));
 const colors=THEMES[biome],stone=['city','ruins','mountain','dungeon'].includes(biome);
 p(g,stone?colors[5]:colors[4],0,0,128,128);
 for(let y=0;y<128;y+=stone?14:9)for(let x=0;x<128;x+=stone?18:13){
  const ix=x+((y/14|0)%2)*6+(rnd()*4|0),iy=y+(rnd()*3|0);
  p(g,stone?(rnd()>.5?colors[1]:colors[2]):(rnd()>.5?colors[4]:colors[5]),ix,iy,stone?16:7,stone?11:3);
  if(rnd()>.6)p(g,colors[7],ix+2,iy+1,3,1);
 }
 // Adornment on both borders: stones and low grass / erosion.
 for(let y=0;y<128;y+=12){
  for(const x of [1,121]){
   p(g,colors[3],x,y,6,6);
   p(g,colors[2],x+1,y+1,3,2);
  }
 }
 if(detail)finishSceneryRoad(g,biome,zone);
 return canvasTexture(THREE,c,{repeatX:ZONE_REPEAT_X,repeatY:1});
}
const ZONE_REPEAT_X=20;
function waterTextureV4(THREE,zone){
 const {c,g}=newCanvas(128,128),rnd=seeded(zone,314);
 p(g,'#256b87',0,0,128,128);
 for(let y=0;y<128;y+=9){
  p(g,((y/9)|0)%2?'#2c819b':'#317f93',0,y,128,5);
  for(let k=0;k<9;k++){const x=rnd()*128|0,yy=y+(rnd()*5|0);
   p(g,rnd()>.65?'#a8e5d5':'#5daeb6',x,yy,5+(rnd()*11|0),1+rnd()*2);
  }
 }
 for(let k=0;k<10;k++){const x=rnd()*118|0,y=rnd()*118|0;p(g,'#d8ecce',x,y,8,2);p(g,'#4692a2',x+2,y+4,12,2);}
 return canvasTexture(THREE,c,{repeatX:14,repeatY:7});
}
function drawSprite(g,kind,biome,variant){
 const rand=seeded(variant+101,1000+BIOMES.indexOf(biome)),b=THEMES[biome],leaves=ACCENTS[biome];
 const wood=['#312f32','#5c443a','#80583e','#ae8251','#d5a66c'];
 const rock=['#353e48','#657078','#879795','#b8b9a6','#d8d7bf'];
 const W=96,H=128;
 const pix=(c,x,y,w,h)=>p(g,c,x,y,w,h);
 const polygon=(c,points)=>poly(g,c,points);
 const disk=(cx,cy,r,color)=>{
  const points=[];for(let i=0;i<12;i++){const a=2*Math.PI*i/12;const d=r*(.83+rand()*.31);points.push([Math.round(cx+Math.cos(a)*d),Math.round(cy+Math.sin(a)*d)]);}
  polygon(color,points);
 };
 const shadow=()=>{pix('#132a314d',21,111,55,6);};
 if(['tree','pine','palm'].includes(kind)){
  shadow();polygon(wood[0],[[42,46],[56,46],[61,109],[53,116],[37,115],[41,84]]);
  polygon(wood[2],[[44,47],[53,47],[56,105],[48,112],[41,109]]);
  pix(wood[3],44,62,4,41);pix(wood[4],47,70,2,16);
  for(const [x,y] of [[41,103],[36,111],[50,108],[54,112]])pix(wood[1],x,y,12,4);
  const layers=kind==='pine'?[[49,18,18],[47,36,24],[48,53,27],[47,72,24]]:kind==='palm'?[[49,31,20],[37,35,18],[62,32,20],[25,46,19],[70,48,20]]:[[50,22,26],[30,39,25],[67,41,24],[46,53,29],[23,60,18],[71,62,19]];
  for(const [x,y,r] of layers)disk(x,y,r,leaves[(1+(rand()*3|0))%5]);
  for(let k=0;k<65;k++){
   const x=16+(rand()*65|0),y=12+(rand()*63|0);
   const dx=(x-48)/43,dy=(y-40)/41;if(dx*dx+dy*dy>1.15)continue;
   pix(leaves[2+(rand()*3|0)],x,y,2+(rand()*6|0),2+(rand()*4|0));
  }
  for(let k=0;k<8;k++){const x=23+(rand()*50|0),y=22+(rand()*47|0);pix(rand()>.5?'#e7cc82':'#b7dfa2',x,y,3,3);}
 }
 else if(kind==='shrub'||kind==='flower'||kind==='reeds'){
  shadow();for(let i=0;i<(kind==='flower'?19:12);i++){
   const xx=17+(rand()*68|0),yy=65+(rand()*38|0);
   pix('#345039',xx,yy,2,35-((yy-65)/3|0));
   if(kind==='flower'){pix(['#eac59b','#c997c2','#f1e4b1','#b9d9e6'][i%4],xx-3,yy-4,6,6);pix('#f6e0a0',xx-1,yy-2,2,2);}
   else if(kind==='reeds'){pix('#b6a871',xx,yy-10,3,15);pix(leaves[i%5],xx-5,yy+1,8,4);}
   else{disk(xx,yy,10+rand()*8,leaves[i%5]);pix(leaves[4],xx+2,yy-4,5,3);}
  }
 }
 else if(kind==='rock'||kind==='log'){
  shadow();
  if(kind==='rock'){
   polygon(rock[0],[[9,87],[29,64],[62,60],[87,79],[89,104],[70,117],[23,116]]);
   polygon(rock[2],[[15,88],[37,67],[62,63],[71,79],[58,103],[22,106]]);
   polygon(rock[3],[[37,68],[59,65],[70,79],[51,78],[34,90],[20,88]]);
   polygon(rock[1],[[59,84],[76,78],[84,89],[79,106],[62,111]]);
   pix(leaves[2],25,104,19,3);pix(leaves[3],30,100,11,3);pix('#e7e3cb',35,75,13,2);
   for(let k=0;k<13;k++){const x=17+rand()*60|0,y=83+rand()*25|0;pix(rand()>.5?rock[0]:rock[4],x,y,2+rand()*5|0,1);}
  }else{
   polygon(wood[0],[[12,96],[23,76],[77,76],[86,96],[73,113],[25,115]]);
   polygon(wood[2],[[14,93],[24,78],[73,78],[82,96],[71,109],[25,109]]);
   for(let i=0;i<5;i++)pix(wood[4],26,81+i*6,48,2);
   disk(22,96,13,wood[1]);disk(22,96,8,wood[3]);disk(22,96,3,wood[1]);
  }
 }
 else if(kind==='house'){
  shadow();polygon(dark,[[9,51],[49,12],[90,50],[90,112],[9,112]]);
  polygon('#b3a591',[[13,56],[48,28],[84,55],[84,105],[13,105]]);
  for(let k=0;k<9;k++){const x=14+rand()*65|0,y=66+rand()*35|0;pix('#73644b',x,y,7,3);}
  polygon('#433a3f',[[7,55],[45,16],[52,16],[93,55],[85,64],[49,31],[16,63]]);
  polygon(variant%2?'#7e4d46':'#3f6772',[[10,54],[46,19],[50,20],[49,56],[22,70]]);
  polygon(variant%2?'#a75f4b':'#648ca0',[[50,20],[89,52],[81,69],[49,56]]);
  for(let row=0;row<5;row++)for(let i=0;i<5;i++){const y=34+row*6,x=37-row*5+i*6;pix('#d7b879',x,y,4,2);pix('#203743',x,y+2,4,1);}
  pix(wood[0],41,77,18,29);pix(wood[2],44,79,11,26);pix(gold,50,91,2,3);
  for(const x of [18,70]){pix(wood[0],x,77,12,12);pix('#edbe72',x+2,79,8,8);pix('#f9e5ad',x+3,80,3,3);}
  pix(leaves[1],10,101,15,7);pix(leaves[3],13,97,9,5);
 }
 else if(['ruin','arch','pillar','altar'].includes(kind)){
  shadow();
  const w=kind==='pillar'?28:kind==='altar'?61:76;
  const start=(96-w)/2;
  const main=kind==='altar'?56:kind==='pillar'?29:35;
  pix(rock[0],start-5,107,w+10,9);pix(rock[2],start,104,w,8);pix(rock[3],start+3,104,w-6,3);
  if(kind==='pillar'){
   pix(rock[0],start-4,27,w+8,78);pix(rock[1],start,31,w,72);pix(rock[3],start+4,31,7,68);
   for(let j=0;j<5;j++)pix(rock[j%4],start-6,30+j*14,w+12,3);
  }else if(kind==='altar'){
   pix(rock[0],start,64,w,41);pix(rock[2],start+4,67,w-8,35);pix(rock[3],start+5,66,w-10,4);
   pix('#507d81',41,52,16,16);pix('#aae6d7',46,56,6,5);pix(gold,36,77,26,4);
  }else{
   for(let x of [start,start+w-20]){
    pix(rock[0],x,35,21,74);pix(rock[2],x+3,38,15,66);
    for(let j=0;j<6;j++)pix(rock[j%4],x+2,43+j*11,17,3);
   }
   pix(rock[1],start-3,26,w+6,18);pix(rock[3],start,27,w,5);
   if(kind==='arch'){pix(rock[0],start+18,45,w-36,57);pix('#142b2f',start+20,53,w-40,48);
    polygon(rock[2],[[start+17,52],[start+23,41],[start+w-23,41],[start+w-17,52]]);}
   else{pix(rock[4],start+7,26,18,4);pix(rock[0],start+w-24,22,14,9);}
  }
  for(let i=0;i<12;i++){let xx=start+rand()*w|0,yy=35+rand()*70|0;pix(i%3?leaves[1]:leaves[3],xx,yy,3+rand()*7|0,2+rand()*3|0);}
 }
 else if(kind==='cactus'){
  shadow();pix('#375749',40,36,19,76);pix('#67915e',43,37,11,67);pix('#a7c281',44,42,3,56);
  pix('#375749',22,61,22,13);pix('#527b55',22,40,11,31);pix('#375749',56,77,18,11);pix('#527b55',64,51,12,32);
  pix('#efbd8b',44,32,8,5);for(let j=0;j<13;j++)pix('#d0dea5',42+(j%3)*5,45+j*4,2,1);
 }
 else if(kind==='fence'||kind==='bridge'){
  shadow();const by=kind==='fence'?99:78;
  for(let x=kind==='fence'?8:4;x<90;x+=kind==='fence'?20:13){
   pix(wood[0],x-1,by-22,8,36);pix(wood[2],x+1,by-24,5,35);pix(wood[4],x+2,by-22,2,14);
  }
  for(const y of [by-16,by+1]){pix(wood[0],3,y,90,9);pix(wood[2],5,y+1,85,5);pix(wood[4],6,y+1,83,2);}
 }
 else if(kind==='barrel'||kind==='crate'||kind==='well'){
  shadow();if(kind==='well'){
   disk(48,84,33,rock[0]);disk(48,80,30,rock[2]);disk(48,80,19,'#233f45');disk(48,78,12,'#377b85');
   pix(wood[0],20,41,7,50);pix(wood[0],70,41,7,50);pix(wood[3],24,40,49,7);
   pix('#e9d59e',42,41,9,4);
  }else if(kind==='barrel'){
   disk(48,78,27,wood[0]);pix(wood[2],25,74,48,31);
   pix(wood[4],29,78,8,23);pix(wood[3],56,78,7,23);
   pix('#2e4048',25,82,48,5);pix('#2e4048',25,98,48,5);
   disk(48,76,24,wood[1]);disk(48,76,17,wood[3]);
  }else{
   pix(wood[0],18,55,62,57);pix(wood[2],22,58,54,49);
   for(let j=0;j<5;j++)pix(wood[4],24,64+j*9,49,2);
   pix(wood[0],26,64,4,40);pix(wood[0],68,64,4,40);
   pix(gold,27,83,44,3);
  }
 }
 else if(kind==='lamp'||kind==='sign'){
  shadow();pix(wood[0],45,24,7,90);pix(wood[3],47,25,3,87);
  if(kind==='lamp'){
   pix('#d6a968',32,25,31,5);pix('#e2c086',37,20,21,5);
   pix(wood[0],36,30,24,31);pix('#ffd993',39,34,17,22);
   pix('#fff3c3',43,38,8,10);pix('#8e683c',34,57,27,4);
  }else{
   pix(wood[0],18,34,62,38);pix('#ae8457',22,38,54,29);
   pix(gold,26,41,46,4);pix('#513d34',31,51,34,3);pix('#513d34',31,60,25,2);
  }
 }
}
function spriteTexture(THREE,kind,biome,variant,detail=true){
 const {c,g}=newCanvas(96,128);
 drawSprite(g,kind,biome,variant);
 if(detail)finishScenerySprite(g,{kind,biome,variant});
 const texture=canvasTexture(THREE,c);
 texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
 return texture;
}
function roadGeometryV4(THREE,zone,width=40){
 const verts=[],uvs=[],ix=[],count=96;
 for(let i=0;i<=count;i++){
  const x=i*1536/count,z=roadY(x,zone);
  verts.push(x,.26,z-width,x,.26,z+width);
  uvs.push(i/count,0,i/count,1);
  if(i<count){let k=i*2;ix.push(k,k+1,k+2,k+1,k+3,k+2);}
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 g.setIndex(ix);g.computeVertexNormals();return g;
}
function placeSpriteInstances(THREE,group,plan,biome,detail=true,composition=false,atlas=false,v7=false){
 const buckets=new Map();
 for(const item of plan){
  const key=item.kind+':'+item.variant;
  if(!buckets.has(key))buckets.set(key,[]);
  buckets.get(key).push(item);
 }
 const dummy=new THREE.Object3D();
 for(const [key,arr] of buckets){
  const [kind,variantString]=key.split(':'),variant=+variantString;
  const pngImage=v7?v7Image(kind,variant):null;
  const v72Png=v7?v72Image(kind):null;
  const finalImage=pngImage||v72Png;
  const texture=(v7&&createV7PropTexture(THREE,kind,variant))
    ||(v7&&createV72PropTexture(THREE,kind))
    ||(atlas&&kind!=='house'&&createAtlasPropTexture(THREE,kind,variant))
    ||(composition&&kind==='house'
       ?canvasTexture(THREE,drawDesignedHouseCanvas(biome,variant))
       :spriteTexture(THREE,kind,biome,variant,detail));
  texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
  // Opaque cut-out sprites: alpha pixels are discarded, not blended across
  // different render batches. This prevents translucent overlap artifacts.
  const mat=new THREE.MeshBasicMaterial({map:texture,transparent:false,alphaTest:.45,depthWrite:true,side:THREE.DoubleSide});
  const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),mat,arr.length);
  mesh.name='scenery-v4-'+key;
  arr.forEach((item,i)=>{
   const fitted=finalImage?v7FitSize({
     nativeWidth:finalImage.naturalWidth,
     nativeHeight:finalImage.naturalHeight,
     maxWidth:item.w,
     maxHeight:item.h
   }):null;
   const w=fitted?.width??item.w,h=fitted?.height??item.h;
   // View is an ortho camera pointing from +Y; project image in the XZ plane.
   // Y=0 is scenery ground; pixels at bottom of sprite align to the actor's feet.
   dummy.position.set(item.x,.38+(item.kind==='house'?.12:0),item.z-h/2+9);
   dummy.rotation.set(-Math.PI/2,0,0);
   dummy.scale.set(w,h,1);
   dummy.updateMatrix();
   mesh.setMatrixAt(i,dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;
  mesh.frustumCulled=false;
  group.add(mesh);
 }
 return buckets.size;
}
function addWaterV4(THREE,group,zone,biome){
 if(!['river','coast','swamp'].includes(biome))return;
 const map=waterTextureV4(THREE,zone);
 const material=new THREE.MeshBasicMaterial({map,transparent:biome==='swamp',opacity:biome==='swamp'?.72:1,depthWrite:biome!=='swamp',side:THREE.DoubleSide});
 if(biome==='coast'){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(1536,315),material);
  m.rotation.x=-Math.PI/2;m.position.set(768,.31,863);group.add(m);
 }else if(biome==='river'){
  for(let i=0;i<26;i++){
   const z=(i+.5)*1024/26,x=420+92*Math.sin(z/150+zone);
   const m=new THREE.Mesh(new THREE.PlaneGeometry(122,1024/26+2),material);
   m.rotation.x=-Math.PI/2;m.position.set(x,.34,z);group.add(m);
  }
 }else{
  const rand=seeded(zone,666);
  for(let i=0;i<22;i++){
   const x=rand()*1490+20,z=rand()*960+20;if(Math.abs(z-roadY(x,zone))<90)continue;
   const m=new THREE.Mesh(new THREE.PlaneGeometry(25+rand()*60,19+rand()*34),material);
   m.rotation.x=-Math.PI/2;m.position.set(x,.31,z);group.add(m);
  }
 }
}
export function buildSceneryV4(THREE,group,zone,biome,{detail=true,composition=false,atlas=false,v7=false}={}){
 if(!THREE||!group||!BIOMES.includes(biome))return false;
 const useV7=Boolean(v7&&composition&&isV7Ready());
 const useV7Terrain=Boolean(v7&&composition&&v7TerrainReady());
 const useAtlas=Boolean(atlas&&!useV7&&!useV7Terrain&&composition&&atlasLoaded());
 const groundMap=(useAtlas&&createAtlasGroundTexture(THREE,zone,biome))||
  (composition?createDesignedTerrainTexture(THREE,zone,biome,{v7Atlas:useV7Terrain?v7TerrainImage():null}):groundTextureV4(THREE,zone,biome,detail));
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(1536,1024),new THREE.MeshBasicMaterial({map:groundMap}));
 ground.rotation.x=-Math.PI/2;ground.position.set(768,0,512);ground.name='scenery-v4-ground';group.add(ground);
 if(!composition){
  const road=new THREE.Mesh(roadGeometryV4(THREE,zone),new THREE.MeshBasicMaterial({
    map:roadTextureV4(THREE,zone,biome,detail),side:THREE.DoubleSide
  }));road.name='scenery-v4-road';group.add(road);
  addWaterV4(THREE,group,zone,biome);
 }
 const objects=composition?planSceneryV5(zone,biome):planSceneryV4(zone,biome,{detail});
 const visibleObjects=useV7?planSceneryV72(zone,biome,objects):objects;
 const batches=placeSpriteInstances(THREE,group,visibleObjects,biome,detail,composition,useAtlas,useV7);
 return Object.freeze({zone,biome,staticProps:visibleObjects.length,drawBatches:batches,ground:composition?'composed-authored-pixelmap':detail?'pixel-cluster-v42':'tile-textured',path:composition?'connected-map-path':detail?'authored-texture-v42':'authored-texture',art:useV7&&v72Image('well')?SCENERY_V72_VERSION:useV7Terrain?V7_TERRAIN_VERSION:useV7?SCENERY_V7_VERSION:useAtlas?ASSET_BACKED_VERSION:composition?MAP_ART_VERSION:detail?ART_VERSION:'scenery-v4-base',terrainTiles:useV7Terrain?20:0,artKinds:detail?EXTRA_KINDS.length:0,water:['river','coast','swamp'].includes(biome)});
}

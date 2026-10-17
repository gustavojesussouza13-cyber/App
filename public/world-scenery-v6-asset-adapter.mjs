'use strict';
/**
 * Phase-1 asset-backed 2.5D scenery.
 *
 * This is a REAL sprite atlas sampler, not another geometry painter.
 * It uses the already-committed "classic-atlas.png" as a compatibility test
 * while newly commissioned independent V6 artwork is cropped/approved.
 * No changes to sprite assets, story, collision, server or 3D guild fortress.
 */
export const ASSET_BACKED_VERSION='scenery-25d-real-atlas-adapter-20261017';
export const ATLAS_URL='/assets/classic-atlas.png';
const Y=710;
const SLOTS={
 grass:Array.from({length:8},(_,i)=>[498+i*19,Y,16,16]),
 earth:Array.from({length:8},(_,i)=>[802+i*19,Y,16,16]),
 stone:Array.from({length:8},(_,i)=>[650+i*19,Y,16,16]),
 water:Array.from({length:8},(_,i)=>[346+i*19,Y,16,16]),
 tree:[
   [163,390,104,122],[270,390,104,122],[377,390,104,122],
   [484,390,104,122],[591,390,104,122],[698,390,104,122],
   [805,390,104,122],[912,390,104,122],[0,585,104,122]],
 shrub:[[198,Y,36,29],[237,Y,36,29],[276,Y,36,29]],
 rock:[[315,Y,28,20]],
 well:[[757,585,50,40]],
 banner:[[576,585,52,62]],
 tent:[[631,585,83,62]],
 fire:[[717,585,37,43]],
 shrine:[[366,585,77,96]]
};
let atlas=null,loaded=false,promise=null;
export const atlasLoaded=()=>Boolean(loaded&&atlas?.naturalWidth);
export function preloadSceneryAtlas(){
 if(promise)return promise;
 if(typeof Image==='undefined')return Promise.resolve(false);
 promise=new Promise(resolve=>{
  const image=new Image();
  image.decoding='async';
  image.addEventListener('load',()=>{atlas=image;loaded=true;resolve(true)},{once:true});
  image.addEventListener('error',()=>{loaded=false;resolve(false)},{once:true});
  image.src=ATLAS_URL;
 });
 return promise;
}
function canvas(w,h){
 const c=document.createElement('canvas');
 c.width=w;c.height=h;
 const g=c.getContext('2d',{alpha:true});
 g.imageSmoothingEnabled=false;
 return {c,g};
}
function sample(g,key,variant,x,y,w,h){
 if(!atlasLoaded())return false;
 const slots=SLOTS[key];if(!slots)return false;
 const tile=slots[Math.abs(variant|0)%slots.length];
 g.drawImage(atlas,tile[0],tile[1],tile[2],tile[3],
  Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));
 return true;
}
function bakeTexture(THREE,source){
 const tex=new THREE.CanvasTexture(source);
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.magFilter=THREE.NearestFilter;
 tex.minFilter=THREE.NearestMipmapNearestFilter;
 tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
 tex.anisotropy=1;
 return tex;
}
function roadY(x,zone){return (496+Math.sin((x+zone*117)/225)*54+Math.sin(x/79+zone*2)*12)/2;}
function groundSlot(biome){
 return ['dungeon','mountain','ruins','city'].includes(biome)?'stone':
        biome==='desert'?'earth':'grass';
}
function seed(zone,x,y){let n=Math.imul((zone+17)^x,73856093)^Math.imul(y+61,19349663);
 n=Math.imul(n^(n>>>16),0x7feb352d);return n>>>0;}
export function createAtlasGroundTexture(THREE,zone,biome){
 if(!atlasLoaded())return null;
 const {c,g}=canvas(768,512);
 const base=groundSlot(biome);
 for(let y=0;y<512;y+=16)for(let x=0;x<768;x+=16){
  const k=seed(zone,x,y);
  sample(g,base,k,x,y,16,16);
 }
 // A single physical road follows server roadY, with terrain edges still
 // irregular. No second WebGL road layer or different collision positions.
 const route=['city','dungeon','ruins','mountain'].includes(biome)?'stone':'earth';
 for(let x=0;x<768;x+=8){
  const center=roadY(x*2,zone),w=20+Math.sin(x*.083+zone)*2;
  for(let y=Math.floor((center-w)/8)*8;y<center+w;y+=8){
   const t=seed(zone,x,y);
   sample(g,route,t,x,y,8,9);
  }
 }
 // Water belongs to the terrain, not a duplicate floating mesh.
 if(biome==='coast'){
  for(let y=352;y<512;y+=16)for(let x=0;x<768;x+=16){
   const shore=350+Math.sin(x*.024+zone)*9;
   if(y+8<shore)continue;
   sample(g,'water',seed(zone,x,y),x,y,16,16);
  }
 }else if(biome==='river'){
  for(let y=0;y<512;y+=8){
   const z=y*2,cx=(420+92*Math.sin(z/150+zone))/2;
   for(let x=Math.max(0,Math.floor(cx-36));x<Math.min(768,Math.ceil(cx+36));x+=8)
    sample(g,'water',seed(zone,x,y),x,y,8,9);
  }
 }
 return bakeTexture(THREE,c);
}
const TYPE_ALIAS={
 tree:'tree',pine:'tree',palm:'tree',
 shrub:'shrub',flower:'shrub',reeds:'shrub',mushroom:'shrub',
 rock:'rock',crystal:'rock',stump:'rock',
 well:'well',statue:'shrine',obelisk:'shrine',
 lamp:'fire',altar:'fire',banner:'banner',market:'tent',
 sign:'banner'
};
/** Return null for any asset kind missing in original atlas. Caller uses V5 detailed art fallback. */
export function createAtlasPropTexture(THREE,kind,variant){
 if(!atlasLoaded())return null;
 const key=TYPE_ALIAS[kind];
 if(!key)return null;
 const source=SLOTS[key][(variant|0)%SLOTS[key].length];
 const {c,g}=canvas(Math.max(1,source[2]),Math.max(1,source[3]));
 if(!sample(g,key,variant,0,0,c.width,c.height))return null;
 return bakeTexture(THREE,c);
}
export const atlasDescriptors=Object.freeze({
 baseTiles:32,treeSprites:9,shrubSprites:3,
 sceneryKinds:Object.freeze(Object.keys(TYPE_ALIAS)),
 source:ATLAS_URL
});

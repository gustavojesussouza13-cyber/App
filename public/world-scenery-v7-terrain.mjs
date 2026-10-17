'use strict';
/**
 * V7 hand-authored terrain for the 2.5D world. Purely visual.
 * Never alters gameplay geometry, V3 sprites or 3D fortress.
 */
import {V7_TILES} from './world-scenery-v7-asset-loader.mjs';
export const V7_TERRAIN_VERSION='scenery-v7-20-tiles-original-png';
export const V7_TERRAIN_BASE='/assets/scenery-v7/tiles/';
const index=new Map(V7_TILES.map((id,i)=>[id,i]));
const families=Object.freeze({
 meadow:['grama_01','grama_clara_01','grama_viva_01','grama_flores_02','terra_grama_01'],
 forest:['grama_flores_02','grama_flores_03','grama_01','terra_ramo_01'],
 river:['grama_01','grama_terra_01','grama_flores_01','grama_clara_01'],
 desert:['areia_01','terra_02','terra_01','pedras_agua_01'],
 mountain:['pedra_01','pedra_02','terra_02','grama_terra_01'],
 ruins:['grama_terra_01','pedra_01','terra_02','grama_flores_02'],
 swamp:['grama_flores_03','grama_flores_02','terra_ramo_01','grama_01'],
 coast:['grama_clara_01','areia_01','grama_01','grama_viva_01'],
 city:['pedra_01','pedra_02','terra_02','grama_terra_01'],
 dungeon:['pedra_02','pedra_01','terra_01','terra_02']
});
let image=null,pending=null,lastError=null;
export const v7TerrainReady=()=>Boolean(image);
export const v7TerrainImage=()=>image;
export const v7TerrainStatus=()=>Object.freeze({ready:Boolean(image),tiles:image?20:0,error:lastError});
export const v7TileRect=(id)=>{
 const i=index.get(id);
 return i===undefined?null:Object.freeze({sx:i%5*32,sy:Math.floor(i/5)*32,w:32,h:32});
};
function validManifest(m){
 return m?.version==='v7-terrain-atlas-1'&&m?.approved===true&&m?.file==='terrain-atlas-v7.png'&&
  m?.columns===5&&m?.rows===4&&m?.tile_size===32&&m?.pixel_mode==='RGB'&&
  typeof m.sha256==='string'&&/^[a-f0-9]{64}$/.test(m.sha256)&&
  Array.isArray(m.tiles)&&m.tiles.length===20&&m.tiles.every((v,i)=>v===V7_TILES[i]);
}
export async function preloadV7Terrain({fetcher=typeof fetch==='function'?fetch:null,ImageClass=typeof Image==='function'?Image:null}={}){
 if(image)return true;
 if(pending)return pending;
 if(!fetcher||!ImageClass){lastError='browser-api-unavailable';return false;}
 pending=(async()=>{
  try{
   const r=await fetcher(V7_TERRAIN_BASE+'manifest.json',{cache:'no-store'});
   if(!r?.ok){lastError='atlas-manifest-not-published';return false;}
   const m=await r.json();
   if(!validManifest(m)){lastError='atlas-manifest-invalid';return false;}
   const ok=await new Promise(resolve=>{
    const img=new ImageClass();
    img.addEventListener('load',()=>{
     if(img.naturalWidth!==160||img.naturalHeight!==128){lastError='atlas-size-invalid';resolve(false);}
     else {image=img;resolve(true);}
    },{once:true});
    img.addEventListener('error',()=>{lastError='atlas-png-unavailable';resolve(false);},{once:true});
    img.src=V7_TERRAIN_BASE+m.file;
   });
   if(ok)lastError=null;
   return ok;
  }catch(e){lastError=String(e?.message||e);return false;}
 })().finally(()=>{pending=null;});
 return pending;
}
const rand=(x,y,seed)=>{
 let n=(Math.imul(x+319,374761393)^Math.imul(y+547,668265263)^Math.imul(seed+17,2147483647))>>>0;
 n=Math.imul(n^(n>>>13),1274126177)>>>0;
 return ((n^(n>>>16))>>>0)/4294967296;
};
function draw(ctx,atlas,id,x,y){
 const a=v7TileRect(id);
 if(!a)return false;
 ctx.drawImage(atlas,a.sx,a.sy,32,32,x,y,32,32);return true;
}
/** Selection is shared by the base and finishing passes, preventing unstable seams. */
export function v7BaseTileId(zone,biome,tx,ty){
 const f=families[biome];
 if(!f||!Number.isInteger(tx)||!Number.isInteger(ty)||tx<0||ty<0)return null;
 const n=rand(tx,ty,zone+f.length*31);
 const cluster=Math.sin((tx+zone*.71)*.46)+Math.cos((ty-zone*.41)*.51)+Math.sin((tx+ty)*.22);
 if(cluster>1.5&&n>.18)return f[1];
 if(cluster<-.7&&n>.23)return f[2];
 if(n>.91)return f[3];
 if(f[4]&&n>.80&&n<.85)return f[4];
 return f[0];
}
/** Deterministic biomes with coherent clusters, no noisy all-random checkerboard. */
export function paintV7BaseTiles(ctx,atlas,zone,biome,width=768,height=512){
 if(!atlas||!families[biome])return false;
 for(let y=0;y<height;y+=32)for(let x=0;x<width;x+=32){
  draw(ctx,atlas,v7BaseTileId(zone,biome,x/32,y/32),x,y);
 }
 return true;
}
/**
 * Pixel-perfect edge interlock for unlike adjacent 32px tiles.
 * Transfers REAL source pixels (no gradients, blurred pixels or new colors).
 * Tiny staggered fragments remain strictly inside the neighboring cell;
 * the V5 road, river and coast are drawn later and retain their footprints.
 * A single canvas replaces one existing ground texture: NO extra geometry.
 */
export function paintV7BaseTransitions(ctx,atlas,zone,biome,width=768,height=512){
 if(!atlas||!families[biome])return false;
 const cols=Math.ceil(width/32),rows=Math.ceil(height/32);
 const ids=Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>v7BaseTileId(zone,biome,x,y)));
 function edgeFragment(id,sx,sy,w,h,dx,dy){
  const rect=v7TileRect(id);
  if(!rect||w<=0||h<=0||dx<0||dy<0||dx+w>width||dy+h>height)return;
  ctx.drawImage(atlas,rect.sx+sx,rect.sy+sy,w,h,dx,dy,w,h);
 }
 // Each 8-pixel strip offsets the boundary a few pixels, using only valid atlas pixels.
 for(let ty=0;ty<rows;ty++)for(let tx=0;tx<cols;tx++){
  const id=ids[ty][tx],left=tx*32,top=ty*32;
  if(tx+1<cols&&ids[ty][tx+1]!==id){
   const rightId=ids[ty][tx+1],seam=left+32;
   for(let py=0;py<32&&top+py<height;py+=8){
    const n=rand(tx*23+py,ty*17,zone+61);
    if(n<.24)continue;
    const w=1+Math.floor(rand(tx,ty*43+py,zone+93)*4);
    const h=Math.min(8,height-(top+py));
    if(n>.61)edgeFragment(id,32-w,py,w,h,seam,top+py);
    else edgeFragment(rightId,0,py,w,h,seam-w,top+py);
   }
  }
  if(ty+1<rows&&ids[ty+1][tx]!==id){
   const nextId=ids[ty+1][tx],seam=top+32;
   for(let px=0;px<32&&left+px<width;px+=8){
    const n=rand(tx*17,ty*29+px,zone+79);
    if(n<.24)continue;
    const h=1+Math.floor(rand(tx*37+px,ty,zone+127)*4);
    const w=Math.min(8,width-(left+px));
    if(n>.61)edgeFragment(id,px,32-h,w,h,left+px,seam);
    else edgeFragment(nextId,px,0,w,h,left+px,seam-h);
   }
  }
 }
 return true;
}
function tileRegion(ctx,atlas,id,zone,width,height){
 for(let y=0;y<height;y+=32)for(let x=0;x<width;x+=32){
  let selected=id;
  if(id==='terra_01'&&rand(x/96|0,y/96|0,zone)>.7)selected='terra_02';
  if(id==='pedra_01'&&rand(x/128|0,y/96|0,zone)>.7)selected='pedra_02';
  if(id==='agua_01'&&rand(x/128|0,y/128|0,zone)>.91)selected='agua_folhas_01';
  draw(ctx,atlas,selected,x,y);
 }
}
/** Pixel-staggered V7 road edge stays INSIDE the original V5 corridor. */
export function v7RoadEdgeAt(x,zone,biome,roadAt,side){
 if(typeof roadAt!=='function'||(side!==-1&&side!==1))return null;
 const stone=['city','ruins','mountain','dungeon'].includes(biome);
 const half=stone?16:19;
 const step=Math.floor(x/8);
 const fringe=Math.floor(rand(step,side===-1?5:11,zone+41)*5)-2;
 const center=roadAt(x,zone)+Math.sin(x*.082+zone)*2;
 return Math.round(center+side*(half+fringe));
}
/** Re-textures only the existing walkable V5 road pixels, with irregular 4px edges. */
export function paintV7Road(ctx,atlas,zone,biome,roadAt,width=768,height=512){
 if(!atlas||typeof roadAt!=='function')return false;
 const stone=['city','ruins','mountain','dungeon'].includes(biome);
 ctx.save();ctx.beginPath();
 for(let x=0;x<=width;x+=4){
  const y=v7RoadEdgeAt(x,zone,biome,roadAt,-1);
  if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
 }
 for(let x=width;x>=0;x-=4){
  ctx.lineTo(x,v7RoadEdgeAt(x,zone,biome,roadAt,1));
 }
 ctx.closePath();ctx.clip();
 tileRegion(ctx,atlas,stone?'pedra_01':biome==='desert'?'areia_01':'terra_01',zone,width,height);
 ctx.restore();return true;
}
/** Bank-aligned pixel contour. Four+ pixels of original V5 river edge remain visible. */
export function v7RiverBankAt(y,zone,side){
 if(side!==-1&&side!==1)return null;
 const center=(420+92*Math.sin(y*2/150+zone))/2;
 const oldHalf=39+Math.sin(y*.09)*4; // identical to paintRiver in V5
 const inset=4+Math.floor(rand(Math.floor(y/4),side===-1?17:23,zone+113)*3);
 return Math.round(center+side*(oldHalf-inset));
}
/** Water tiles stay in the existing water, without covering the bank or adding 3D planes. */
export function paintV7River(ctx,atlas,zone,width=768,height=512){
 if(!atlas)return false;
 ctx.save();ctx.beginPath();
 for(let y=0;y<=height;y+=2){
  const x=v7RiverBankAt(y,zone,-1);
  if(y===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
 }
 for(let y=height;y>=0;y-=2){
  ctx.lineTo(v7RiverBankAt(y,zone,1),y);
 }
 ctx.closePath();ctx.clip();tileRegion(ctx,atlas,'agua_01',zone,width,height);ctx.restore();return true;
}
/** Match the actual V5 coastal waterline (old coast varies with Y, not X). */
export function v7CoastWaterline(zone){
 for(let y=345;y<512;y+=2){
  const wave=6*Math.sin(y*.10+zone)+3*Math.sin(y*.23);
  if(y>=365+wave)return y;
 }
 return 384;
}
export function paintV7Coast(ctx,atlas,zone,width=768,height=512){
 if(!atlas)return false;
 const original=v7CoastWaterline(zone);
 ctx.save();ctx.beginPath();
 for(let x=0;x<=width;x+=4){
  // Discrete 8px groups create a naturally stepped shore but never paint V5 sand.
  const depth=3+Math.floor(rand(Math.floor(x/8),7,zone+171)*3);
  const y=original+depth;
  if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
 }
 ctx.lineTo(width,height);ctx.lineTo(0,height);ctx.closePath();ctx.clip();
 tileRegion(ctx,atlas,'agua_01',zone,width,height);ctx.restore();return true;
}

/**
 * V7.2: bridge is baked into the SAME ground canvas at the actual road/river
 * crossing. No extra sprite card, no transparent water rectangle, no collider.
 * The source wood pixels come from the already approved V7 32x32 atlas.
 */
export function v72BridgeAnchor(zone,roadAt,width=768,height=512){
 if(typeof roadAt!=='function'||!Number.isFinite(zone))return null;
 const riverX=y=>(420+92*Math.sin(y*2/150+zone))/2;
 let x=210;
 for(let i=0;i<7;i++){
  const y=roadAt(x,zone);
  if(!Number.isFinite(y))return null;
  x=riverX(y);
 }
 const y=roadAt(x,zone);
 if(!Number.isFinite(y))return null;
 const left=Math.round(x-50),right=Math.round(x+50);
 if(left<8||right>width-8||y<38||y>height-38)return null;
 return Object.freeze({x:Math.round(x),y:Math.round(y),left,right,width:right-left});
}
function v72BridgeRail(ctx,anchor,roadAt,zone,side){
 const pal=side<0?['#32281f','#76502f','#be8c4c','#e4ba72']:['#392c22','#79502e','#ab7a43','#e2b16e'];
 // Rails follow the exact authored road axis in 8px pixel groups.
 for(let x=anchor.left+2;x<anchor.right-2;x+=8){
  const len=Math.min(8,anchor.right-2-x);
  const y=Math.round(roadAt(x,zone)+side*23);
  ctx.fillStyle=pal[0];ctx.fillRect(x,y-2,len,6);
  ctx.fillStyle=pal[1];ctx.fillRect(x,y-1,len,3);
  ctx.fillStyle=pal[3];ctx.fillRect(x,y-1,len,1);
  ctx.fillStyle=pal[2];ctx.fillRect(x,y+3,len,1);
 }
 // Two pairs of guard posts flank the deck; none are standing 3D props.
 for(const x of [anchor.left+8,anchor.right-14]){
  const y=Math.round(roadAt(x,zone)+side*23);
  ctx.fillStyle='#32281f';ctx.fillRect(x-2,y-9,9,17);
  ctx.fillStyle='#80532d';ctx.fillRect(x,y-8,6,14);
  ctx.fillStyle='#d2a46b';ctx.fillRect(x,y-9,6,3);
  ctx.fillStyle='#f2d096';ctx.fillRect(x+1,y-8,2,2);
  ctx.fillStyle='#3c3028';ctx.fillRect(x,y+5,6,3);
 }
}
/** Exactly one authored wooden crossing per river region, aligned to the road. */
export function paintV72Bridge(ctx,atlas,zone,biome,roadAt,width=768,height=512){
 if(biome!=='river'||!atlas||typeof roadAt!=='function')return false;
 const anchor=v72BridgeAnchor(zone,roadAt,width,height);
 if(!anchor)return false;
 ctx.save();ctx.beginPath();
 for(let x=anchor.left;x<=anchor.right;x+=4){
  const y=roadAt(x,zone)-21;
  if(x===anchor.left)ctx.moveTo(x,y);else ctx.lineTo(x,y);
 }
 for(let x=anchor.right;x>=anchor.left;x-=4)ctx.lineTo(x,roadAt(x,zone)+21);
 ctx.closePath();ctx.clip();
 // Atlas planks: exactly 32px source squares, never scaled or blurred.
 tileRegion(ctx,atlas,'tabuas_01',zone,width,height);
 ctx.restore();
 // Seam lines reinforce the wood panel without laying art over player sprites.
 for(let x=anchor.left+6;x<anchor.right-6;x+=10){
  const y=Math.round(roadAt(x,zone));
  ctx.fillStyle='#3e3026';ctx.fillRect(x,y-18,2,37);
  ctx.fillStyle='#c09458';ctx.fillRect(x+2,y-17,1,34);
  for(const dy of [-14,13]){
   ctx.fillStyle='#655041';ctx.fillRect(x+4,y+dy,2,2);
   ctx.fillStyle='#d8a96d';ctx.fillRect(x+4,y+dy,1,1);
  }
 }
 v72BridgeRail(ctx,anchor,roadAt,zone,-1);
 v72BridgeRail(ctx,anchor,roadAt,zone,1);
 return true;
}
export function v7TerrainTexture(THREE,canvas){
 const tex=new THREE.CanvasTexture(canvas);
 tex.colorSpace=THREE.SRGBColorSpace;tex.magFilter=THREE.NearestFilter;
 tex.minFilter=THREE.NearestMipmapNearestFilter;
 tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;tex.anisotropy=1;
 return tex;
}

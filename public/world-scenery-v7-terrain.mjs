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
/** Deterministic biomes with coherent clusters, no noisy all-random checkerboard. */
export function paintV7BaseTiles(ctx,atlas,zone,biome,width=768,height=512){
 if(!atlas||!families[biome])return false;
 const f=families[biome];
 for(let y=0;y<height;y+=32)for(let x=0;x<width;x+=32){
  const tx=x/32,ty=y/32,n=rand(tx,ty,zone+f.length*31);
  const cluster=Math.sin((tx+zone*.71)*.46)+Math.cos((ty-zone*.41)*.51)+Math.sin((tx+ty)*.22);
  let id=f[0];
  if(cluster>1.5&&n>.18)id=f[1];
  else if(cluster<-.7&&n>.23)id=f[2];
  else if(n>.91)id=f[3];
  else if(f[4]&&n>.80&&n<.85)id=f[4];
  draw(ctx,atlas,id,x,y);
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
/** Keeps the exact authored V5 corridor; only its interior gets PNG texture. */
export function paintV7Road(ctx,atlas,zone,biome,roadAt,width=768,height=512){
 if(!atlas||typeof roadAt!=='function')return false;
 const stone=['city','ruins','mountain','dungeon'].includes(biome),half=stone?16:19;
 ctx.save();ctx.beginPath();
 for(let x=0;x<=width;x+=4){
  const y=roadAt(x,zone)+Math.sin(x*.082+zone)*2;
  if(x===0)ctx.moveTo(x,y-half);else ctx.lineTo(x,y-half);
 }
 for(let x=width;x>=0;x-=4){
  const y=roadAt(x,zone)+Math.sin(x*.082+zone)*2;
  ctx.lineTo(x,y+half);
 }
 ctx.closePath();ctx.clip();
 tileRegion(ctx,atlas,stone?'pedra_01':biome==='desert'?'areia_01':'terra_01',zone,width,height);
 ctx.restore();return true;
}
/** Water tiles clipped inside the original banks, without any extra 3D plane. */
export function paintV7River(ctx,atlas,zone,width=768,height=512){
 if(!atlas)return false;
 ctx.save();ctx.beginPath();
 for(let y=0;y<=height;y+=2){
  const x=(420+92*Math.sin(y*2/150+zone))/2-36-Math.sin(y*.09)*4;
  if(y===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
 }
 for(let y=height;y>=0;y-=2){
  const x=(420+92*Math.sin(y*2/150+zone))/2+36+Math.sin(y*.09)*4;
  ctx.lineTo(x,y);
 }
 ctx.closePath();ctx.clip();tileRegion(ctx,atlas,'agua_01',zone,width,height);ctx.restore();return true;
}
export function paintV7Coast(ctx,atlas,zone,width=768,height=512){
 if(!atlas)return false;
 ctx.save();ctx.beginPath();
 ctx.moveTo(0,365+6*Math.sin(365*.10+zone)+3*Math.sin(365*.23)+6);
 for(let x=0;x<=width;x+=4){
  // Old shoreline is a horizontal wavering band.
  const y=372+Math.sin(x*.05+zone)*3;
  ctx.lineTo(x,y);
 }
 ctx.lineTo(width,height);ctx.lineTo(0,height);ctx.closePath();ctx.clip();
 tileRegion(ctx,atlas,'agua_01',zone,width,height);ctx.restore();return true;
}
export function v7TerrainTexture(THREE,canvas){
 const tex=new THREE.CanvasTexture(canvas);
 tex.colorSpace=THREE.SRGBColorSpace;tex.magFilter=THREE.NearestFilter;
 tex.minFilter=THREE.NearestMipmapNearestFilter;
 tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;tex.anisotropy=1;
 return tex;
}

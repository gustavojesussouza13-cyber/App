'use strict';
/**
 * V7.3 complete world reskin: the game's own tileKind() and object anchors
 * define EVERY coordinate. Latest genuine V7 atlas + V7.2 PNGs + V7.3 art.
 * No paintProp legacy fallback is used in the V7.3 live experimental mode.
 * No new geometry, collision, portal, NPC, guild or 3D fortress state.
 */
import {v7Image,v7FitSize} from './world-scenery-v7-asset-loader.mjs';
import {v72Image} from './world-scenery-v72-asset-loader.mjs';
import {v7TerrainImage,v7TileRect} from './world-scenery-v7-terrain.mjs';
import {designedV73Image,modernPropFamily,V73_ART_VERSION} from './world-scenery-v73-artist.mjs';
export const CANONICAL_VERSION='scenery-v73-full-canonical-20261017';
export const CANONICAL_KINDS=Object.freeze(['tree','bush','rock','well','biome-prop','dungeon-prop','prop']);
export function canonicalReplacement(item,{old=v7Image,newArt=v72Image,biome='meadow',designer=designedV73Image}={}){
 if(!item||!Number.isFinite(item.x)||!Number.isFinite(item.y)||!Number.isFinite(item.w)||!Number.isFinite(item.h))return null;
 const family=modernPropFamily(item,biome);
 // Images are used only after native file dimension + manifest verification.
 // First choose V7.2 and V7 approved PNG. Artist V7.3 fills all other families.
 if(family==='tree')return old('tree',0)||designer(item,biome);
 if(family==='pine')return old('pine',0)||designer(item,biome);
 if(family==='bush')return newArt('shrub')||old('flower',0)||designer(item,biome);
 if(family==='flower')return old('flower',0)||newArt('shrub')||designer(item,biome);
 if(family==='rock')return old('rock',0)||designer(item,biome);
 if(family==='well')return newArt('well')||designer(item,biome);
 if(family==='lamp')return newArt('lamp')||designer(item,biome);
 if(family==='fountain')return newArt('fountain')||designer(item,biome);
 if(family==='ruin')return old('ruin',0)||designer(item,biome);
 if(family==='house')return old('house',0)||designer(item,biome);
 return designer(item,biome);
}
const BIOME_PALETTES=Object.freeze({
 meadow:['grama_01','grama_clara_01','grama_flores_01','grama_viva_01'],
 forest:['grama_flores_02','grama_01','grama_flores_03','terra_ramo_01'],
 river:['grama_01','grama_clara_01','grama_flores_02','grama_flores_01'],
 desert:['areia_01','terra_02','terra_01','areia_01'],
 mountain:['pedra_01','pedra_02','terra_02','pedra_01'],
 ruins:['grama_terra_01','pedra_01','grama_flores_02','terra_02'],
 swamp:['grama_flores_03','grama_terra_01','terra_ramo_01','grama_viva_01'],
 coast:['grama_clara_01','areia_01','grama_viva_01','grama_01'],
 city:['pedra_01','pedra_02','terra_02','grama_terra_01'],
 dungeon:['pedra_02','pedra_01','terra_02','pedra_01']
});
const hash=(x,y,z)=>{let v=(Math.imul(x+47,73856093)^Math.imul(y+59,19349663)^Math.imul(z+11,83492791))>>>0;
 v=Math.imul(v^(v>>>16),2246822507)>>>0;return (v^(v>>>13))>>>0;};
export function canonicalTileId(type,biome,tx=0,ty=0,zone=0){
 const n=hash(tx,ty,zone);
 if(type==='water')return n%9===0?'agua_folhas_01':'agua_01';
 if(type==='path')return ['city','ruins','mountain','dungeon'].includes(biome)
  ?(n%3===0?'pedra_02':'pedra_01'):(n%5===0?'terra_grama_01':'terra_01');
 if(type==='sand')return n%3===0?'terra_02':'areia_01';
 if(type==='rock'||type==='paving')return n%4===0?'pedra_02':'pedra_01';
 const family=BIOME_PALETTES[biome]||BIOME_PALETTES.meadow;
 return family[n%family.length];
}
/** Fill all 1,536 × 1,024 pixels from approved 32×32 atlas source colors. */
export function paintOfficialV73Terrain(ctx,source,atlas){
 if(!atlas||typeof source?.tileKind!=='function')return false;
 const countX=48,countY=32;
 const ids=Array.from({length:countY},()=>Array(countX));
 for(let ty=0;ty<countY;ty++)for(let tx=0;tx<countX;tx++){
  const type=source.tileKind(tx,ty),id=canonicalTileId(type,source.biome,tx,ty,source.zone);
  ids[ty][tx]={type,id};
  const r=v7TileRect(id);if(!r)return false;
  ctx.drawImage(atlas,r.sx,r.sy,32,32,tx*32,ty*32,32,32);
 }
 // Preserve physical water/road cell classification: only compatible
 // land-to-land contacts get fragments; never extend water or roads into grass.
 for(let ty=0;ty<countY;ty++)for(let tx=0;tx<countX;tx++){
  const here=ids[ty][tx],x=tx*32,y=ty*32;
  if(tx+1<countX){
   const next=ids[ty][tx+1];
   if(next.type===here.type&&next.id!==here.id){
    const r=v7TileRect(here.id);
    for(let s=0;s<4;s++)if(hash(tx*11+s,ty,source.zone)%4===0)
     ctx.drawImage(atlas,r.sx+29,r.sy+s*8,3,8,x+32,y+s*8,3,8);
   }
  }
  if(ty+1<countY){
   const next=ids[ty+1][tx];
   if(next.type===here.type&&next.id!==here.id){
    const r=v7TileRect(here.id);
    for(let s=0;s<4;s++)if(hash(tx,ty*11+s,source.zone)%4===0)
     ctx.drawImage(atlas,r.sx+s*8,r.sy+29,8,3,x+s*8,y+32,8,3);
   }
  }
 }
 // Wooden bridge: same official position, span and footprint from art16.js.
 // NEVER use the rejected giant bridge crop, and never create an extra mesh.
 if(source.biome==='river'&&typeof source.roadAt==='function'){
  const by=Math.round(source.roadAt(420)),start=325,end=530,top=by-30,bottom=by+32;
  const plank=v7TileRect('tabuas_01');
  if(plank&&top>=0&&bottom<=1024){
   ctx.save();ctx.beginPath();ctx.rect(start,top,end-start,bottom-top);ctx.clip();
   for(let yy=top;yy<bottom;yy+=32)for(let xx=start;xx<end;xx+=32)
    ctx.drawImage(atlas,plank.sx,plank.sy,32,32,xx,yy,32,32);
   ctx.restore();
   for(let x=331;x<526;x+=13){
    ctx.fillStyle='#473426';ctx.fillRect(x,top+5,2,51);
    ctx.fillStyle='#d7ab70';ctx.fillRect(x+2,top+6,1,49);
   }
   for(const yy of [top,top+5,bottom-6,bottom-2]){
    ctx.fillStyle=yy===top||yy===bottom-2?'#493729':'#bb8750';
    ctx.fillRect(start,yy,end-start,3);
   }
  }
 }
 return true;
}
export function copyCanonicalMap(source,{
 createCanvas=()=>document.createElement('canvas'),
 replacement=canonicalReplacement,atlas=v7TerrainImage(),
 requireLatest=false,mode='latest'
}={}){
 if(!source?.canvas||source.canvas.width!==1536||source.canvas.height!==1024||
    !Array.isArray(source.objects)||typeof source.paintProp!=='function'||!Number.isInteger(source.zone))return null;
 // Refuse the new layer before allocating canvas when the verified tiles are missing.
 if(requireLatest&&(mode==='original'||!atlas||typeof source.tileKind!=='function'))return null;
 const canvas=createCanvas();canvas.width=1536;canvas.height=1024;
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return null;
 ctx.imageSmoothingEnabled=false;
 const latest=mode!=='original'&&Boolean(atlas&&typeof source.tileKind==='function');
 if(requireLatest&&!latest)return null;
 if(latest){if(!paintOfficialV73Terrain(ctx,source,atlas))return null;}
 else ctx.drawImage(source.canvas,0,0);
 let improved=0,fallback=0;
 for(const item of source.objects){
  const image=latest?replacement(item,{biome:source.biome}):mode==='original'?null:replacement(item,{biome:source.biome});
  const nw=image?.naturalWidth??image?.width,nh=image?.naturalHeight??image?.height;
  const fit=image&&v7FitSize({nativeWidth:nw,nativeHeight:nh,maxWidth:item.w,maxHeight:item.h});
  if(fit){
   const w=Math.max(1,Math.round(fit.width)),h=Math.max(1,Math.round(fit.height));
   ctx.drawImage(image,Math.round(item.x-w/2),Math.round(item.y-h),w,h);
   improved++;
  }else{
   if(requireLatest)return null; // Never silently show old art in live V7.3.
   source.paintProp(ctx,item);fallback++;
  }
 }
 return Object.freeze({canvas,zone:source.zone,biome:source.biome,
  staticProps:source.objects.length,improved,fallback,modernTerrain:latest,tiles:latest?1536:0});
}
export function buildCanonicalScenery(THREE,group,source,{v7=true}={}){
 const paint=copyCanonicalMap(source,{requireLatest:v7,mode:v7?'latest':'original',replacement:item=>v7?canonicalReplacement(item,{biome:source.biome}):null});
 if(!paint||!THREE||!group)throw Error('Mapa V7.3 indisponível ou incompleto — manter 2D até carregar toda a arte');
 const texture=new THREE.CanvasTexture(paint.canvas);
 texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;
 texture.minFilter=THREE.NearestMipmapNearestFilter;
 texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.anisotropy=1;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1536,1024),new THREE.MeshBasicMaterial({map:texture}));
 mesh.rotation.x=-Math.PI/2;mesh.position.set(768,0,512);
 mesh.name='scenery-v72-canonical-ground';group.add(mesh);
 return Object.freeze({...paint,ground:'official-geometry-v73-png-full-reskin',drawBatches:1,
  path:'exact-original-map-geography',art:v7?CANONICAL_VERSION:'canonical-legacy-comparison'});
}

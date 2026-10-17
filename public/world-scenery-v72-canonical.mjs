'use strict';
/**
 * Os Peregrinos — canonical geography renderer / experimental only.
 * Source is provided by PeregrinoArt16.mapSnapshot (the actual game map).
 * This module NEVER guesses river positions, replans roads or places buildings.
 * Actual game NPCs, portals, guild bases and creatures are drawn separately.
 */
import {v7Image,v7FitSize} from './world-scenery-v7-asset-loader.mjs';
import {v72Image} from './world-scenery-v72-asset-loader.mjs';
export const CANONICAL_VERSION='scenery-v72-canonical-formation-20261017';
export const CANONICAL_KINDS=Object.freeze(['tree','bush','rock','well']);
export function canonicalReplacement(item,{old=v7Image,newArt=v72Image}={}){
 if(!item||!Number.isFinite(item.x)||!Number.isFinite(item.y)||!Number.isFinite(item.w)||!Number.isFinite(item.h))return null;
 if(item.kind==='tree')return old('tree',Math.max(0,Number((item.key||'').match(/arvore_(\d)/)?.[1]||1)-1));
 if(item.kind==='bush')return newArt('shrub')||old('shrub',0);
 if(item.kind==='rock')return old('rock',0);
 if(item.kind==='prop'&&item.key==='poco')return newArt('well');
 return null; // Preserve actual original art for all unknown/special landmarks
}
export function copyCanonicalMap(source,{createCanvas=()=>document.createElement('canvas'),replacement=canonicalReplacement}={}){
 if(!source?.canvas||source.canvas.width!==1536||source.canvas.height!==1024||
    !Array.isArray(source.objects)||typeof source.paintProp!=='function'||!Number.isInteger(source.zone))return null;
 const canvas=createCanvas();canvas.width=1536;canvas.height=1024;
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)return null;
 ctx.imageSmoothingEnabled=false;
 // Same source pixels as online game; the original bridge and coast are intact.
 ctx.drawImage(source.canvas,0,0);
 let improved=0,fallback=0;
 // Props are painted in the EXACT source order at the EXACT source coordinates.
 for(const item of source.objects){
  const image=replacement(item);
  const fit=image&&v7FitSize({
   nativeWidth:image.naturalWidth,nativeHeight:image.naturalHeight,
   maxWidth:item.w,maxHeight:item.h
  });
  if(fit){
   const w=Math.max(1,Math.round(fit.width)),h=Math.max(1,Math.round(fit.height));
   ctx.drawImage(image,Math.round(item.x-w/2),Math.round(item.y-h),w,h);
   improved++;
  }else{source.paintProp(ctx,item);fallback++;}
 }
 return Object.freeze({canvas,zone:source.zone,biome:source.biome,staticProps:source.objects.length,improved,fallback});
}
export function buildCanonicalScenery(THREE,group,source,{v7=true}={}){
 const paint=copyCanonicalMap(source,{replacement:item=>v7?canonicalReplacement(item):null});
 if(!paint||!THREE||!group)throw Error('Mapa canônico indisponível — preservar fallback 2D');
 const texture=new THREE.CanvasTexture(paint.canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.magFilter=THREE.NearestFilter;
 texture.minFilter=THREE.NearestMipmapNearestFilter;
 texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
 texture.anisotropy=1;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1536,1024),new THREE.MeshBasicMaterial({map:texture}));
 mesh.rotation.x=-Math.PI/2;mesh.position.set(768,0,512);
 mesh.name='scenery-v72-canonical-ground';
 group.add(mesh);
 return Object.freeze({...paint,ground:'official-art16-snapshot',drawBatches:1,path:'exact-original-map-geography',art:CANONICAL_VERSION});
}

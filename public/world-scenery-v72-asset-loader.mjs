'use strict';
/**
 * Os Peregrinos — V7.2 ORIGINAL, individually painted pixel sprites.
 * Only experimental 2.5D world objects; no physics, no fortress, no game state.
 * The four rejected V7 board crops remain blocked in their old manifest.
 */
export const SCENERY_V72_VERSION='scenery-v72-four-original-pngs-20261017';
const ROOT='/assets/scenery-v72/';
export const V72_ASSETS=Object.freeze({
 well:Object.freeze({id:'poco_v72',w:80,h:124}),
 lamp:Object.freeze({id:'lampiao_v72',w:57,h:114}),
 fountain:Object.freeze({id:'fonte_v72',w:104,h:105}),
 shrub:Object.freeze({id:'arbusto_v72',w:85,h:66})
});
const images=new Map(),failed=new Set();
let pending=null,error=null;
export const v72Image=kind=>images.get(kind)||null;
export const v72Ready=()=>images.size>0;
export const v72Status=()=>Object.freeze({published:4,loaded:images.size,failed:[...failed],error});
export const v72Url=kind=>V72_ASSETS[kind]?ROOT+'sprites/'+V72_ASSETS[kind].id+'.png':null;
export async function preloadV72Assets({fetcher=typeof fetch==='function'?fetch:null,ImageClass=typeof Image==='function'?Image:null}={}){
 if(images.size===4)return true;
 if(pending)return pending;
 if(!fetcher||!ImageClass)return false;
 pending=(async()=>{
  try{
   const response=await fetcher(ROOT+'manifest.json',{cache:'no-store'});
   if(!response?.ok){error='missing-v72-manifest';return false;}
   const manifest=await response.json();
   const ids=Object.values(V72_ASSETS).map(x=>x.id);
   if(manifest?.version!=='v72-pixel-art-1'||manifest?.approved!==true||
       !Array.isArray(manifest?.files)||manifest.files.length!==4||
       !ids.every(id=>manifest.files.includes(id))){
     error='invalid-v72-manifest';return false;
   }
   await Promise.all(Object.entries(V72_ASSETS).map(([kind,spec])=>new Promise(resolve=>{
    if(images.has(kind)){resolve();return;}
    const img=new ImageClass();
    const done=ok=>{
     if(ok&&img.naturalWidth===spec.w&&img.naturalHeight===spec.h){images.set(kind,img);failed.delete(kind);}
     else{failed.add(kind);if(ok)error='dimension-mismatch:'+kind;}
     resolve();
    };
    img.addEventListener('load',()=>done(true),{once:true});
    img.addEventListener('error',()=>done(false),{once:true});
    img.src=v72Url(kind);
   })));
   if(!images.size){error='v72-images-unavailable';return false;}
   if(!failed.size)error=null;
   return true;
  }catch(e){error=String(e?.message||e);return false;}
 })().finally(()=>{pending=null;});
 return pending;
}
export function createV72PropTexture(THREE,kind){
 const image=v72Image(kind);if(!image)return null;
 const texture=new THREE.Texture(image);
 texture.needsUpdate=true;
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.magFilter=THREE.NearestFilter;
 texture.minFilter=THREE.NearestMipmapNearestFilter;
 texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
 texture.anisotropy=1;
 return texture;
}

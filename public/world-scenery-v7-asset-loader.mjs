'use strict';
/**
 * Os Peregrinos — V7 experimental asset loader (real static RGBA PNGs).
 *
 * The original detailed art is produced separately; never claim the assets
 * are LIVE before their PNG files have been committed and passed QA.
 * Each missing or unapproved image falls back to the V5 drawn sprite.
 * No side effects on collision, quest, guild, server, NPC or 3D fortress.
 */
export const SCENERY_V7_VERSION='scenery-v7-png-verified-asset-loader-20261017';
export const BASE_URL='/assets/scenery-v7/';
export const ART_STATE=Object.freeze({
 ready:'available_after_qa',
 pending:'needs_manual_art_cleanup'
});
// Quality review after examining 30 separate source-board crops.
// Bridge includes water/backdrop, one house is a partial building,
// and well/lantern need border cleanup. NEVER auto-enable these four.
export const V7_ASSETS=Object.freeze({
 arvore_folhosa_01:{group:'tree',state:'ready',w:88,h:156},
 arvore_folhosa_02:{group:'tree',state:'ready',w:77,h:117},
 pinheiro_01:{group:'pine',state:'ready',w:85,h:151},
 arvore_arbusto_01:{group:'shrub',state:'ready',w:67,h:49},
 arbusto_flores_01:{group:'flower',state:'ready',w:75,h:42},
 arbusto_folhagem_02:{group:'shrub',state:'ready',w:83,h:66},
 rocha_musgo_01:{group:'rock',state:'ready',w:56,h:51},
 rocha_musgo_02:{group:'rock',state:'ready',w:84,h:53},
 toco_01:{group:'stump',state:'ready',w:49,h:46},
 casa_azul_01:{group:'house',state:'ready',w:104,h:147},
 casa_vermelha_01:{group:'house',state:'ready',w:100,h:147},
 casa_azul_02:{group:'house',state:'pending',w:68,h:146},
 casa_azul_03:{group:'house',state:'ready',w:143,h:149},
 portal_ruinas_01:{group:'ruin',state:'ready',w:102,h:143},
 portal_ruinas_02:{group:'arch',state:'ready',w:96,h:144},
 coluna_ruina_01:{group:'pillar',state:'ready',w:51,h:87},
 coluna_ruina_02:{group:'pillar',state:'ready',w:51,h:136},
 tocha_ruinas_01:{group:'lamp',state:'ready',w:49,h:113},
 estatua_ruinas_01:{group:'statue',state:'ready',w:65,h:148},
 estandarte_azul_01:{group:'banner',state:'ready',w:48,h:85},
 cerca_portao_01:{group:'fence',state:'ready',w:80,h:47},
 barril_01:{group:'barrel',state:'ready',w:52,h:62},
 caixa_01:{group:'crate',state:'ready',w:40,h:45},
 placa_01:{group:'sign',state:'ready',w:44,h:74},
 lampiao_01:{group:'lamp',state:'pending',w:57,h:114},
 poco_01:{group:'well',state:'pending',w:80,h:124},
 banca_01:{group:'market',state:'ready',w:103,h:102},
 flores_canteiro_01:{group:'flower',state:'ready',w:97,h:61},
 saco_moedas_01:{group:'crate',state:'ready',w:39,h:48},
 ponte_madeira_01:{group:'bridge',state:'pending',w:103,h:134}
});
export const V7_TILES=Object.freeze([
 'grama_01','grama_flores_01','grama_clara_01','terra_01','terra_grama_01',
 'areia_01','pedra_01','pedra_02','grama_flores_02','terra_ramo_01',
 'terra_02','grama_terra_01','grama_viva_01','grama_flores_03',
 'agua_01','agua_folhas_01','tabuas_01','tabuas_02','madeira_01','pedras_agua_01'
]);
export const V7_KIND_VARIANTS=Object.freeze({
 tree:['arvore_folhosa_01','arvore_folhosa_02'],
 pine:['pinheiro_01'],palm:['arvore_folhosa_02'],
 shrub:['arbusto_folhagem_02','arvore_arbusto_01'],
 flower:['arbusto_flores_01','flores_canteiro_01'],
 rock:['rocha_musgo_01','rocha_musgo_02'],
 stump:['toco_01'],
 house:['casa_azul_01','casa_vermelha_01','casa_azul_03'],
 ruin:['portal_ruinas_01'],arch:['portal_ruinas_02'],
 pillar:['coluna_ruina_01','coluna_ruina_02'],
 statue:['estatua_ruinas_01'],fence:['cerca_portao_01'],
 barrel:['barril_01'],crate:['caixa_01','saco_moedas_01'],
 sign:['placa_01'],market:['banca_01'],
 lamp:['tocha_ruinas_01']
});
const images=new Map(),failed=new Set();
let allowedIds=[];
let promise=null,lastError=null;
export const v7Stats=()=>Object.freeze({
 declared:Object.keys(V7_ASSETS).length,
 tileSources:V7_TILES.length,
 approved:Object.values(V7_ASSETS).filter(x=>x.state==='ready').length,
 loaded:images.size,failed:failed.size,
 loadedIds:Object.freeze([...images.keys()]),failedIds:Object.freeze([...failed]),
 permittedIds:Object.freeze([...allowedIds]),
 missing:Object.values(V7_ASSETS).filter(x=>x.state==='ready').length-images.size,
 error:lastError
});
export const isV7Ready=()=>images.size>0;
export function v7SpriteId(kind,variant=0){
 const options=V7_KIND_VARIANTS[kind];
 if(!options?.length)return null;
 const name=options[Math.abs(variant|0)%options.length];
 return V7_ASSETS[name]?.state==='ready'?name:null;
}
export function v7Url(id){
 if(!Object.prototype.hasOwnProperty.call(V7_ASSETS,id))return null;
 return BASE_URL+'sprites/'+id+'.png';
}
export function v7Image(kind,variant){
 const id=v7SpriteId(kind,variant);
 return id?images.get(id)||null:null;
}
export async function preloadV7Assets({fetcher=typeof fetch==='function'?fetch:null,ImageClass=typeof Image==='function'?Image:null}={}){
 if(promise)return promise;
 // The manifest *requires* a same-origin availability declaration. Do not
 // generate 404s for missing individual sprites or claim loaded when absent.
 if(!fetcher||!ImageClass)return false;
 promise=(async()=>{
  try{
   const response=await fetcher(BASE_URL+'availability.json',{cache:'no-store'});
   if(!response?.ok){lastError='asset-pack-unpublished';return false;}
   const pack=await response.json();
   if(pack?.version!=='v7' || pack?.approved!==true || !Array.isArray(pack?.files)){
    lastError='manifest-not-validated';return false;
   }
   const declared=Object.keys(V7_ASSETS).filter(id=>V7_ASSETS[id].state==='ready');
   const allowed=new Set(declared),listed=[...new Set(pack.files)].filter(id=>allowed.has(id));
   allowedIds=listed;
   if(!listed.length){lastError='approved-files-empty';return false;}
   await Promise.all(listed.map(id=>new Promise(resolve=>{
    const img=new ImageClass();
    const done=(ok)=>{
      const spec=V7_ASSETS[id];
      if(ok&&img.naturalWidth===spec.w&&img.naturalHeight===spec.h){images.set(id,img);}
      else {failed.add(id);if(ok)lastError='sprite-dimension-mismatch:'+id;}
      resolve();
    };
    img.addEventListener('load',()=>done(true),{once:true});
    img.addEventListener('error',()=>done(false),{once:true});
    img.src=v7Url(id);
   })));
   if(!images.size){lastError='images-not-loadable';return false;}
   lastError=null;return true;
  }catch(error){lastError=String(error?.message||error);return false;}
 })();
 return promise;
}
/**
 * Fit an actual PNG to the already-reserved static scenery footprint.
 * Preserves original pixel aspect ratio (no stretched buildings or trees).
 * Never expands a sprite beyond its collision-safe visual rectangle.
 */
export function v7FitSize({nativeWidth,nativeHeight,maxWidth,maxHeight}){
 const w=Number(nativeWidth),h=Number(nativeHeight),mw=Number(maxWidth),mh=Number(maxHeight);
 if(![w,h,mw,mh].every(Number.isFinite)||Math.min(w,h,mw,mh)<=0)return null;
 const scale=Math.min(mw/w,mh/h);
 return Object.freeze({width:w*scale,height:h*scale});
}
export function createV7PropTexture(THREE,kind,variant){
 const image=v7Image(kind,variant);if(!image)return null;
 const texture=new THREE.Texture(image);
 texture.needsUpdate=true;
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.magFilter=THREE.NearestFilter;
 texture.minFilter=THREE.NearestMipmapNearestFilter;
 texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
 texture.anisotropy=1;
 return texture;
}

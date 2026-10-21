'use strict';
/** Curandeiro V4 experimental. Crops only the user-approved preview (no redraws).
 * Walking: 4 directions x 8 frames (rows 0 back, 1 right, 2 front, 3 left).
 * Actions: 5 rows x 8 frames (idle, magic attack, heal, damage, death).
 * Palette changes are made on isolated RGBA cells and never affect gameplay data.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosCurandeiroV4=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 const W=256,H=160,STEP_MS=118;
 const SOURCES=Object.freeze({
  walk:'/assets/curandeiro-v4/curandeiro-v4-caminhada-8x4.png?v=20261021-1',
  action:'/assets/curandeiro-v4/curandeiro-v4-acoes-8x5-limpo.png?v=20261021-no-ghosts-v1'
 });
 const OUTFITS=Object.freeze({original:null,branco:'#d7d2c4',safira:'#315e9d',marinho:'#274b82',floresta:'#32784e',vermelho:'#a73c46',vinho:'#793845',violeta:'#7955a5',rosa:'#ae5a91',ocre:'#b99b50',grafite:'#5b6575',preto:'#424552',turquesa:'#368d91'});
 const CAPES=Object.freeze({nenhuma:null,marinho:'#31568c',musgo:'#377452',vinho:'#98434b',marfim:'#d5ccb9',rosa:'#b163a0'});
 const SKINS=Object.freeze({claro:'#efcbad',dourado:'#d8a677',oliva:'#b68e65',bronze:'#936347',escuro:'#74503e',profundo:'#503326'});
 const HAIR=Object.freeze({castanho:'#835840',preto:'#292e3a',loiro:'#cb9e57',ruivo:'#aa5537',branco:'#d5d5cf'});
 const EYES=Object.freeze({castanho:'#6d513d',azul:'#468bc9',verde:'#5d9d69',cinza:'#9aa6b9',ambar:'#cba25a'});
 let walkImage=null,actionImage=null,loading=null,failed=false;
 const cache=new Map(),MAX_CACHE=240;
 const normalizeDir=d=>Number.isInteger(d)?((d%4+4)%4):2;
 function phase(frame,now=0){const n=Number.isFinite(frame)?Math.floor(frame):Math.floor((Number(now)||0)/STEP_MS);return ((n%8)+8)%8;}
 function style(a){const v=root.PeregrinosAppearance16?.normalize?.(a)||a||{};return {outfit:v.outfit||'original',cape:v.cape||'nenhuma',hairColor:v.hairColor||'castanho',skin:v.skin||'dourado',eyes:v.eyes||'castanho'};}
 function plan({dir=2,action='idle',frame=null,now=0,elapsed=0}={}){
  const d=normalizeDir(dir),p=phase(frame,now);
  if(action==='walk')return {sheet:'walk',row:d,index:p,flip:false};
  if(action==='idle')return {sheet:'walk',row:d,index:Math.floor(Number(now)/1550)%2,flip:false};
  const time=Math.max(0,Number(elapsed)||0);
  const sequence=action==='heal'||action==='cure'||action==='skill'?[2,8]:
    action==='attack'?[1,8]:
    action==='hurt'?[3,4]:
    action==='death'?[4,4]:
    action==='prepare'?[1,3]:
    action==='recover'?[2,3]:[0,8];
  const [row,count]=sequence;
  return {sheet:'action',row,index:Math.min(count-1,Math.floor(time/(action==='death'?230:action==='hurt'?140:110))),flip:d===3};
 }
 function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
 function applyPalette(imageData,appearance,dir=2){
  const a=style(appearance),out=OUTFITS[a.outfit],cape=CAPES[a.cape],skin=SKINS[a.skin],hair=HAIR[a.hairColor],eyes=EYES[a.eyes];
  if(!out&&!cape&&a.cape!=='sem_capa'&&a.skin==='dourado'&&a.hairColor==='castanho'&&a.eyes==='castanho')return imageData;
  const d=normalizeDir(dir),buf=imageData.data,w=imageData.width,h=imageData.height;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4;if(buf[i+3]<15)continue;
   const r=buf[i],g=buf[i+1],b=buf[i+2];
   const gold=(r>g+22&&g>b+14&&r>85);
   const cloth=(Math.max(r,g,b)-Math.min(r,g,b)<72&&r>85&&g>80&&b>72&&!gold);
   const hood=(x>86&&x<171&&y>16&&y<79);
   const face=(x>107&&x<155&&y>27&&y<86);
   const isSkin=r>g+14&&g>b+6&&r>71;
   const cloak=d===0?(x>78&&x<174):(d===2?(x<120||x>154):(x<138));
   let target=null;
   if(a.skin!=='dourado'&&skin&&face&&isSkin)target=skin;
   else if(a.hairColor!=='castanho'&&hair&&face&&y<49&&r>g+8)target=hair;
   else if(a.eyes!=='castanho'&&eyes&&face&&y>=44&&y<=59&&Math.max(r,g,b)<80)target=eyes;
   else if(cloth){
    if(a.cape==='sem_capa'&&cloak&&!hood&&y>65){buf[i+3]=0;continue;}
    target=cloak&&cape?cape:out;
   }
   if(!target)continue;
   const targetRGB=rgb(target),lum=(r*.299+g*.587+b*.114)/255;
   const factor=Math.min(1.65,Math.max(.19,.47+.83*lum));
   for(let k=0;k<3;k++)buf[i+k]=Math.min(255,Math.round(targetRGB[k]*factor));
  }
  return imageData;
 }
 function load(){
  if(walkImage&&actionImage)return Promise.resolve(true);
  if(loading)return loading;
  if(typeof Image==='undefined')return Promise.resolve(false);
  const req=(src,rows,assign)=>new Promise(resolve=>{
   const img=new Image();img.decoding='async';
   img.onload=()=>{const ok=img.naturalWidth===8*W&&img.naturalHeight===rows*H;
    if(ok){assign(img);cache.clear()}else failed=true;resolve(ok);};
   img.onerror=()=>{failed=true;resolve(false)};
   img.src=src;
  });
  loading=Promise.all([req(SOURCES.walk,4,im=>walkImage=im),req(SOURCES.action,5,im=>actionImage=im)]).then(([w,a])=>w&&a);
  return loading;
 }
 function prepare(options={}){
  const appearance=style(options.appearance),sel=plan(options),im=sel.sheet==='walk'?walkImage:actionImage;
  if(!im){if(!loading)void load();return null;}
  const key=[sel.sheet,sel.row,sel.index,sel.flip,normalizeDir(options.dir),...Object.values(appearance)].join('|');
  if(cache.has(key)){const cell=cache.get(key);cache.delete(key);cache.set(key,cell);return cell;}
  const documentRef=options.documentRef||root.document;
  if(!documentRef?.createElement)return null;
  const canvas=documentRef.createElement('canvas');canvas.width=W;canvas.height=H;
  const g=canvas.getContext('2d',{willReadFrequently:true});if(!g)return null;
  g.imageSmoothingEnabled=false;
  if(sel.flip){g.save();g.translate(W,0);g.scale(-1,1);}
  g.drawImage(im,sel.index*W,sel.row*H,W,H,0,0,W,H);
  if(sel.flip)g.restore();
  const recolor=appearance.outfit!=='original'||appearance.cape!=='nenhuma'||appearance.hairColor!=='castanho'||appearance.skin!=='dourado'||appearance.eyes!=='castanho';
  if(recolor){try{const pixels=g.getImageData(0,0,W,H);applyPalette(pixels,appearance,options.dir);g.putImageData(pixels,0,0);}catch{return null;}}
  cache.set(key,canvas);while(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);
  return canvas;
 }
 function draw(ctx,options={}){
  if(options.role!=='curandeiro'||!ctx?.drawImage)return false;
  const sprite=prepare(options);if(!sprite)return false;
  const x=Number(options.x)||0,y=Number(options.y)||0,scale=Number(options.scale)||.86;
  const w=Math.max(1,Math.round(W*scale)),h=Math.max(1,Math.round(H*scale));
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(sprite,Math.round(x-w/2),Math.round(y-154*scale),w,h);ctx.restore();
  return true;
 }
 if(typeof document!=='undefined')void load();
 return Object.freeze({VERSION:'curandeiro-v4-approved-art-experimental-no-ghosts',SOURCES,WALK_FRAMES:8,WIDTH:W,HEIGHT:H,
  OUTFITS,CAPES,SKINS,HAIR,EYES,normalizeDir,phase,style,plan,load,prepare,draw,applyPalette,
  isReady:()=>!!walkImage&&!!actionImage,hasFailed:()=>failed});
});
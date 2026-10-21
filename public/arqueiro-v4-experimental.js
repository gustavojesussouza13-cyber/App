'use strict';
/**
 * Os Peregrinos — Arqueiro V4, ONLY isolated experimental branch.
 * Two atlases from the 32 ORIGINAL APPROVED drawing cells. No painted redraws.
 * Row-major 4x4 256x160 RGBA; keep identical anchor/scale in every state.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosArqueiroV4=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 const W=256,H=160,FPS=115;
 const SOURCES=Object.freeze({
  action:'/assets/arqueiro-v4/arqueiro-v4-acoes-4x4.png?v=1',
  walk:'/assets/arqueiro-v4/arqueiro-v4-caminhada-4x4.png?v=1',
 });
 const OUTFITS=Object.freeze({vinho:'#a43d49',vermelho:'#c04443',floresta:'#347a52',safira:'#2559a2',ocre:'#b8944e',violeta:'#7852ac',rosa:'#bd568b',marfim:'#c5bcb0',grafite:'#626978',branco:'#e1e2da'});
 const CAPES=Object.freeze({vinho:'#a43d49',marinho:'#3769ac',musgo:'#347a52',marfim:'#d9cdb2',rosa:'#bf6094'});
 const HAIR=Object.freeze({castanho:'#885d44',preto:'#353039',loiro:'#d3a85c',ruivo:'#bc6444',branco:'#dce0de'});
 const SKINS=Object.freeze({claro:'#f0cda8',dourado:'#dea978',oliva:'#b78a65',bronze:'#9e674a',escuro:'#76503f',profundo:'#52392f'});
 let actionImage=null,walkImage=null,loading=null,failed=false;
 const cache=new Map(),MAX_CACHE=210;
 function normalizeDir(dir){return Number.isInteger(dir)?((dir%4+4)%4):2;}
 function phase(frame,now=0){let f=Number.isFinite(frame)?Math.floor(frame):Math.floor(now/FPS);return ((f%8)+8)%8;}
 function style(appearance){
  const a=root.PeregrinosAppearance16?.normalize?.(appearance)||appearance||{};
  return {outfit:a.outfit||'original',cape:a.cape||'nenhuma',hairColor:a.hairColor||'castanho',skin:a.skin||'dourado'};
 }
 function plan({dir=2,action='idle',now=0,frame=null,elapsed=0}={}){
  const d=normalizeDir(dir),p=phase(frame,now),flip=d===3;
  if(action==='walk'){
   if(d===0)return {sheet:'walk',index:p,flip:false};
   if(d===2)return {sheet:'walk',index:8+p,flip:false};
   // Existing original 4 side-walk drawings; mirror the SAME pixels for left.
   const seq=[5,6,7,6,5,4,5,7];
   return {sheet:'action',index:seq[p],flip};
  }
  if(action==='idle')return {sheet:'action',index:d===0?[2,3][Math.floor(now/850)%2]:d===2?[0,15][Math.floor(now/1300)%2]:1,flip};
  // All approved action cells are kept, including preparation and recovery.
  const poses=action==='attack'?[8,9,10,11]:
    action==='skill'?[13,8,9,10,11,13]:
    action==='hurt'?[12,12,14]:
    action==='death'?[12,14,14,14]:
    action==='recover'?[14,15,15]:[0];
  const a=Math.max(0,Math.min(poses.length-1,Math.floor((Number(elapsed)||0)/95)));
  return {sheet:'action',index:poses[a],flip};
 }
 function getColor(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
 function tint(data,appearance,dir){
  const a=style(appearance),outfit=OUTFITS[a.outfit],cape=CAPES[a.cape],hair=HAIR[a.hairColor],skin=SKINS[a.skin];
  if(!outfit&&!cape&&a.cape!=='sem_capa'&&(a.hairColor==='castanho'||!hair)&&(a.skin==='dourado'||!skin))return data;
  const {width:w,height:h,data:d}=data;
  const D=normalizeDir(dir);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4;if(d[i+3]<8)continue;
   const r=d[i],g=d[i+1],b=d[i+2];
   const blue=b>r+28&&b>g+12&&b>45&&(b<240||g<150);
   const face=x>=84&&x<=174&&y>=9&&y<=62;
   const brown=r>g+9&&g>b-3&&r>55&&r<225;
   const skinTone=r>g+13&&g>b+9&&r>70&&g>42&&y>=32&&y<=77;
   const isCape=D===0?(x>50&&x<200&&y>45):D===2?(x<99&&y>57):(x<126&&y>40);
   let target=null;
   if(hair&&a.hairColor!=='castanho'&&face&&brown&&y<48)target=hair;
   else if(skin&&a.skin!=='dourado'&&face&&skinTone)target=skin;
   else if(blue){
    if(a.cape==='sem_capa'&&isCape&&r<105&&g<125){d[i+3]=0;continue;}
    target=isCape&&cape?cape:outfit;
   }
   if(!target)continue;
   const color=getColor(target);
   const luminance=(.299*r+.587*g+.114*b)/255;
   const factor=Math.max(.13,Math.min(1.7,.42+luminance*.88));
   for(let k=0;k<3;k++)d[i+k]=Math.round(Math.min(255,color[k]*factor));
  }
  return data;
 }
 function load(){
  if(actionImage&&walkImage)return Promise.resolve(true);
  if(loading)return loading;
  if(typeof Image==='undefined')return Promise.resolve(false);
  const request=(path,set)=>new Promise(resolve=>{
   const im=new Image();im.decoding='async';
   im.onload=()=>{const ok=im.naturalWidth===4*W&&im.naturalHeight===4*H;
    if(ok){set(im);cache.clear()}else failed=true;
    resolve(ok);
   };
   im.onerror=()=>{failed=true;resolve(false)};
   im.src=path;
  });
  loading=Promise.all([request(SOURCES.action,im=>{actionImage=im}),request(SOURCES.walk,im=>{walkImage=im})]).then(([a,w])=>a&&w);
  return loading;
 }
 function prepare(options={}){
  const {appearance,documentRef=root.document}=options,selection=plan(options);
  const image=selection.sheet==='walk'?walkImage:actionImage;
  if(!image){if(!loading)void load();return null;}
  const colors=style(appearance);
  const key=[selection.sheet,selection.index,selection.flip,normalizeDir(options.dir),...Object.values(colors)].join('|');
  if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
  if(!documentRef?.createElement)return null;
  const canvas=documentRef.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return null;
  ctx.imageSmoothingEnabled=false;
  const sourceX=(selection.index%4)*W,sourceY=Math.floor(selection.index/4)*H;
  if(selection.flip){ctx.save();ctx.translate(W,0);ctx.scale(-1,1);}
  ctx.drawImage(image,sourceX,sourceY,W,H,0,0,W,H);
  if(selection.flip)ctx.restore();
  if(ctx.getImageData&&ctx.putImageData){
   const edit=colors.outfit!=='original'||colors.cape!=='nenhuma'||colors.hairColor!=='castanho'||colors.skin!=='dourado';
   if(edit){try{const pixels=ctx.getImageData(0,0,W,H);tint(pixels,colors,options.dir);ctx.putImageData(pixels,0,0);}catch{return null;}}
  }
  cache.set(key,canvas);while(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);
  return canvas;
 }
 function draw(ctx,options={}){
  if(options.role!=='arqueiro'||!ctx?.drawImage)return false;
  const cell=prepare(options);if(!cell)return false;
  const x=Number(options.x)||0,y=Number(options.y)||0,scale=Number(options.scale)||.86;
  const w=Math.max(1,Math.round(W*scale)),h=Math.max(1,Math.round(H*scale));
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(cell,Math.round(x-w/2),Math.round(y-154*scale),w,h);
  ctx.restore();return true;
 }
 if(typeof document!=='undefined')void load();
 return Object.freeze({VERSION:'arqueiro-v4-32frames-experimental',WIDTH:W,HEIGHT:H,SOURCES,WALK_FRAMES:8,
  OUTFITS,CAPES,HAIR,SKINS,normalizeDir,phase,plan,tint,style,load,prepare,draw,
  isReady:()=>!!actionImage&&!!walkImage,hasFailed:()=>failed});
});
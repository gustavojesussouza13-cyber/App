'use strict';
/**
 * Peregrino V8.7 — seven live customization channels for the approved
 * 64x80 RGBA atlas, applied to EACH actual action frame.
 * Base = exact original PNG, capes + garments have separate per-pixel masks.
 * "sem_capa" removes the blue mantle and pixel-paints a real back
 * tunic/belt instead of leaving a hole. Does not alter other classes.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosPeregrinoAtelierV87=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 const APP=typeof module==='object'&&module.exports?require('./appearance16'):root.PeregrinosAppearance16;
 const OUTFITS=Object.freeze({
  rosa:[213,93,143],vinho:[160,62,87],floresta:[57,143,81],
  safira:[58,111,185],ocre:[171,125,54],violeta:[129,83,165],
  marfim:[209,207,187],branco:[228,220,199],vermelho:[203,67,62],
  grafite:[85,91,99]
 });
 const CAPES=Object.freeze({
  rosa:[219,99,155],vinho:[152,54,81],marinho:[51,91,161],
  musgo:[54,123,76],marfim:[218,211,187]
 });
 const SKINS=Object.freeze({
  claro:[239,194,154],dourado:[221,165,114],oliva:[191,140,97],
  bronze:[163,109,75],escuro:[113,79,64],profundo:[80,56,47]
 });
 const HAIRS=Object.freeze({
  castanho:['#533825','#976041'],preto:['#22212a','#504b55'],
  loiro:['#a47a3b','#ebc471'],ruivo:['#8d3a2b','#d07c4b'],
  branco:['#9fa5a5','#f2ebe1'],azul:['#2c4567','#617ca6'],
  rosa:['#96506e','#e68daf']
 });
 const EYES=Object.freeze({castanho:'#50352a',azul:'#4396d0',verde:'#3f9b65',mel:'#bc863e',cinza:'#94a3b1'});
 const VERSION='peregrino-v87-cape-removal-and-seven-fields-20261018';
 const WIDTH=64,HEIGHT=80;
 function normalize(value){return APP?.normalize?.(value)||value||{}}
 function clothArea(x,y,dir,row){
  // The cliffside cloak moves during attacks and deaths; don't recolor props.
  if(y<38)return false;
  if(dir===0)return y>=39&&x>=7&&x<=52;
  if(dir===1)return x<=25&&y>=41;
  if(dir===3)return x>=39&&y>=41;
  return y>=44&&(x<=20||x>=43);
 }
 function bluePixel(r,g,b){return b>r+13&&b>g+7&&b>54&&r<175}
 function tint(data,i,col,luma){
  const scale=Math.max(.30,Math.min(1.28,luma/117));
  data[i]=Math.min(255,Math.round(col[0]*scale));
  data[i+1]=Math.min(255,Math.round(col[1]*scale));
  data[i+2]=Math.min(255,Math.round(col[2]*scale));
 }
 function underlyingPixel(data,i,x,y,dir){
  // Artwork behind the removed cape: shaded cream linen, leather seams,
  // chest straps, belt and boots. Crisp integer pixels / no blurred fill.
  const center=(dir===0?31:dir===1?29:35);
  const half=dir===0?14:dir===2?12:10;
  if(y>70||x<center-half||x>center+half){
   data[i+3]=0;return;
  }
  const fold=(x-center+80)%7===0,edge=x<=center-half+2||x>=center+half-2;
  const belt=(y>=51&&y<=54),pants=y>=65,shade=((x*17+y*7)%11)-5;
  let rgb=pants?[74,58,54]:belt?[117,73,41]:
   edge?[118,106,100]:fold?[148,131,110]:[209,195,170];
  for(let j=0;j<3;j++)data[i+j]=Math.max(0,Math.min(255,rgb[j]+shade*2));
  data[i+3]=255;
 }
 function repaintRGBA(data,appearance,dir=2,row=0){
  if(!data||data.length!==WIDTH*HEIGHT*4)return false;
  const a=normalize(appearance);
  const outfit=OUTFITS[a.outfit]||null,cape=CAPES[a.cape]||null,remove=a.cape==='sem_capa';
  const skin=SKINS[a.skin]||SKINS.dourado;
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
   const i=(y*WIDTH+x)*4;if(data[i+3]<12)continue;
   const r=data[i],g=data[i+1],b=data[i+2],blue=bluePixel(r,g,b);
   const outer=clothArea(x,y,dir,row),shade=(r*.24+g*.35+b*.41);
   if(remove&&outer&&blue){
    underlyingPixel(data,i,x,y,dir);continue;
   }
   if(blue&&outer&&cape){tint(data,i,cape,shade);continue}
   if(blue&&!outer&&outfit){tint(data,i,outfit,shade);continue}
   // Some cloak folds enter interior body during attack. Recolor blue
   // fabric but never recolor the hood, lantern, metal or brown leather.
   if(blue&&outfit&&!cape&&a.cape!=='sem_capa'){
    tint(data,i,outfit,shade);continue
   }
   if(a.skin!=='dourado'&&dir!==0&&row<5&&x>=25&&x<=40&&y>=28&&y<=49&&r>g+16&&g>b+8&&r>85){
    const s=Math.max(.53,Math.min(1.23,(r+g+b)/395));
    for(let j=0;j<3;j++)data[i+j]=Math.round(Math.min(255,skin[j]*s));
   }
  }
  return true;
 }
 function drawDetails(ctx,appearance,dir=2,row=0){
  if(!ctx?.fillRect)return false;
  const a=normalize(appearance);
  const paint=(color,x,y,w=1,h=1)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
  const facing=dir!==0,standing=!(row>=5&&row<=7);
  if(standing&&facing){
   const hair=HAIRS[a.hairColor]||HAIRS.castanho;
   const fringe=a.hairStyle!=='raspado',front=dir===2;
   // Embroidered hair strands lie *inside* the original hood opening.
   if(a.hairColor!=='castanho'||a.hairStyle!=='curto'){
    if(fringe){
     paint(hair[0],front?28:31,front?36:34,front?10:5,2);
     paint(hair[1],front?29:32,front?37:35,front?5:3,1);
     if(['medio','longo','tranca','rabo'].includes(a.hairStyle)){
      paint(hair[0],front?27:33,39,2,a.hairStyle==='medio'?4:7);
      if(a.hairStyle==='tranca'){paint(hair[1],27,44,2,2);paint(hair[0],27,46,2,2)}
      if(a.hairStyle==='rabo')paint(hair[1],front?38:36,41,2,6);
     }
    }else{
     const skin=SKINS[a.skin]||SKINS.dourado;
     paint('#8d6b58',29,36,8,1);paint('rgb('+skin.join(',')+')',30,36,6,1);
    }
   }
   if(a.eyes!=='castanho'){
    const c=EYES[a.eyes]||EYES.castanho;
    paint(c,front?29:36,42,1,1);
    if(front)paint(c,35,42,1,1);
   }
   if(a.accessory==='tiara'){
    paint('#c99b52',27,34,11,1);paint('#f8d185',32,34,2,2);
   }else if(a.accessory==='brinco'){
    paint('#f5cb6e',front?39:40,44,2,3);
   }else if(a.accessory==='amuleto'){
    paint('#cfb173',32,48,5,2);paint('#5dbaeb',33,50,3,3);
   }
  }
  if(standing&&a.cape==='sem_capa'){
   // Distinct bespoke pixel silhouette without a hovering cape edge.
   // Decorated shoulder clasp survives because it belongs to the armor.
   const dark='#372f32',trim='#c0a16b';
   if(dir===0){paint(dark,22,43,19,2);paint(trim,26,44,12,1);paint('#8c5430',24,52,15,2)}
   else if(dir===2){paint(trim,24,42,3,2);paint(trim,40,42,3,2)}
   else{paint(trim,dir===1?21:39,44,3,2)}
  }
  return true;
 }
 return Object.freeze({VERSION,WIDTH,HEIGHT,OUTFITS,CAPES,SKINS,HAIRS,EYES,normalize,clothArea,bluePixel,repaintRGBA,drawDetails});
});

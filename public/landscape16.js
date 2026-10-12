'use strict';
/*
 * Os Peregrinos — Paisagens de Auren, direção 16-bit autoral.
 * Cenas baseadas em grupos de pixels legíveis (não ruído nem filtros).
 * Não interfere em colisões, navegação nem progressos salvos.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosLandscape16=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const PALETTES=Object.freeze({
  meadow:['#478c4a','#62a352','#7db65e','#b2cb78','#204d38','#cba978','#9b744d','#e7c88b'],
  forest:['#285e3d','#387a48','#579657','#92bd73','#173e32','#ad9262','#856448','#d1b785'],
  river:['#39845a','#61a667','#7bc987','#aedaa4','#245746','#c1a276','#8b704b','#d8c59a'],
  swamp:['#445f3f','#567849','#84935d','#a5a77a','#263e36','#9c8867','#71614c','#c3b080'],
  coast:['#5e965b','#7eae6c','#a9bf7a','#d2d59a','#315e51','#e0c48c','#bc9e68','#f2dfa6'],
  city:['#618253','#86a067','#a8b47a','#d2cb96','#3e5948','#a49b7c','#776e61','#d2c4a1'],
  desert:['#b69a60','#d0b176','#e4c78d','#f4dbac','#826948','#d7ad73','#a97b54','#f2d5a4'],
  mountain:['#748a7d','#90a398','#b2bdb0','#d4d7c5','#3c5856','#a89581','#77716d','#d6c5a9'],
  ruins:['#707866','#959788','#bec0a4','#dcd8bf','#48534f','#af9e86','#847569','#dbceb0']
 });
 const TILE=32,variantCount=4;
 const hash=(a,b,c,d=0)=>{
  let n=Math.imul(a+517,73856093)^Math.imul(b+89,19349663)^Math.imul(c+11,83492791)^Math.imul(d+47,374761393);
  n=Math.imul(n^(n>>>16),0x7feb352d);
  n=Math.imul(n^(n>>>15),0x846ca68b);
  return ((n^(n>>>16))>>>0)/4294967296;
 };
 const px=(g,color,x,y,w=1,h=1)=>{
  if(w<=0||h<=0)return;
  g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
 };
 function polygonRows(g,rows,x,y,color){
  for(let i=0;i<rows.length;i++){
   const [left,width]=rows[i];px(g,color,x+left,y+i*3,width,3);
  }
 }
 function terrainTile(g,tx,ty,z,biome,kind,neighbor){
  const p=PALETTES[biome]||PALETTES.meadow,
   x=tx*TILE,y=ty*TILE,seed=hash(tx,ty,z,1),
   path=kind==='path'||kind==='sand',
   rock=kind==='rock'||kind==='paving',
   water=kind==='water';
  const bg=water?'#326f88':path?p[5]:rock?'#80847f':p[0];
  px(g,bg,x,y,32,32);
  if(water){
   // Sulcos turquesa e espuma em forma de pixels, sem transparência borrada.
   for(let j=0;j<3;j++){
    const yy=(j*11+Math.floor(seed*3))%32;
    px(g,j%2?'#5199a5':'#245d79',x+2, y+yy,27,3);
    px(g,'#a9d8d0',x+5+(j*7)%9,y+yy+1,8,2);
    px(g,'#e2ede1',x+9+(j*5)%8,y+yy+1,2,1);
   }
   if(seed>.62){px(g,'#184f6b',x+24,y+20,7,5);px(g,'#77b6c3',x+22,y+18,8,2)}
   return;
  }
  if(path){
   // Terra do caminho desenhada em placas grandes e sulcos curtos.
   px(g,p[6],x,y+3,32,2);
   px(g,p[7],x+2,y+6,16,3);
   px(g,p[6],x+13,y+18,17,2);
   px(g,'#806445',x+3,y+24,11,2);
   if(seed>.3){px(g,'#83674d',x+23,y+9,5,3);px(g,p[7],x+24,y+10,3,1)}
   if(seed>.6){px(g,'#d6bc87',x+8,y+13,5,2);px(g,'#866b4c',x+17,y+27,4,2)}
  }else if(rock){
   // Pedras assentadas em mosaico, com borda escura e luz à esquerda.
   px(g,'#4d615b',x,y+1,32,3);
   px(g,'#afbaa8',x+2,y+4,25,2);
   px(g,'#5b6e68',x+13,y+15,19,3);
   px(g,'#d1cdb3',x+1,y+17,11,2);
   px(g,'#4b5652',x+1,y+28,28,3);
   px(g,'#7f9388',x+20,y+19,7,6);
   if(seed>.44)px(g,'#cfbe98',x+23,y+22,4,2);
  }else{
   // Grama de grupos nítidos e espaçados. Evita textura pontilhada.
   px(g,p[1],x+2,y+4,16,4);
   px(g,p[1],x+19,y+19,12,5);
   px(g,p[2],x+5,y+6,9,2);
   px(g,p[2],x+20,y+20,7,2);
   px(g,p[4],x+2,y+27,8,2);
   px(g,p[3],x+24,y+5,3,2);
   for(let k=0;k<3;k++){
    const rx=4+Math.floor(hash(tx,ty,z,7+k)*24),ry=4+Math.floor(hash(tx,ty,z,19+k)*23);
    px(g,p[k%2?1:4],x+rx,y+ry,2,6);
    px(g,p[2],x+rx+2,y+ry+2,3,2);
   }
   if(seed>.88){ // flor pequena, toda pixelada
    px(g,'#f2e7d0',x+23,y+11,5,3);px(g,'#dc99a3',x+25,y+10,3,6);
    px(g,'#f9d78b',x+25,y+12,2,2);
   }
  }
  if(typeof neighbor!=='function')return;
  // Transições desenhadas sobre o tile, sem adulterar a classificação
  // de terreno autoritativa; bordas em degraus de 2-4 px.
  const N=neighbor(tx,ty-1),S=neighbor(tx,ty+1),
   E=neighbor(tx+1,ty),W=neighbor(tx-1,ty);
  const isGrass=t=>t==='grass',isPath=t=>t==='path'||t==='sand';
  if(path){
   if(isGrass(N)){
    px(g,p[4],x,y,32,2);
    for(let i=0;i<8;i++){
     const hh=2+(Math.floor(hash(tx*8+i,ty,z,55)*3)*2);
     px(g,p[0],x+i*4,y,4,hh);
     px(g,p[1],x+i*4,y+hh-1,2,1);
    }
   }
   if(isGrass(S)){
    px(g,p[4],x,y+30,32,2);
    for(let i=0;i<8;i++){
     const hh=2+(Math.floor(hash(tx*8+i,ty,z,56)*3)*2);
     px(g,p[0],x+i*4,y+32-hh,4,hh);
    }
   }
   if(isGrass(W)){
    px(g,p[4],x,y,2,32);
    for(let i=0;i<8;i++)px(g,p[0],x,y+i*4,2+Math.floor(hash(tx,ty*8+i,z,57)*3)*2,4);
   }
   if(isGrass(E)){
    px(g,p[4],x+30,y,2,32);
    for(let i=0;i<8;i++){
     const w=2+Math.floor(hash(tx,ty*8+i,z,58)*3)*2;
     px(g,p[0],x+32-w,y+i*4,w,4);
    }
   }
  }else if(isGrass(kind)){
   if(isPath(N)){px(g,p[4],x,y,32,2);px(g,p[2],x+5,y+2,21,2)}
   if(isPath(S)){px(g,p[4],x,y+30,32,2);px(g,p[2],x+5,y+27,21,2)}
   if(isPath(E)){px(g,p[4],x+30,y,2,32);px(g,p[1],x+27,y+7,2,20)}
   if(isPath(W)){px(g,p[4],x,y,2,32);px(g,p[1],x+3,y+7,2,20)}
  }
 }
 function create({documentRef=typeof document!=='undefined'?document:null,maxCached=72}={}){
  const sprites=new Map();
  function makeCanvas(w,h){
   const c=documentRef?.createElement?.('canvas');if(!c)return null;
   c.width=w;c.height=h;
   const g=c.getContext('2d');if(!g)return null;
   g.imageSmoothingEnabled=false;return {c,g};
  }
  function tree(g,biome,variant){
   const p=PALETTES[biome]||PALETTES.meadow;
   const v=variant%variantCount;
   // Sombra fixa e tronco encaixado no solo.
   px(g,'#213e3266',17,69,65,11);
   px(g,'#413b32',41,44,18,31);px(g,'#6b5239',44,49,12,26);
   px(g,'#9c7850',46,48,5,23);
   px(g,'#3c3b32',33,67,13,6);px(g,'#886a48',33,68,14,3);
   px(g,'#3e3b32',56,67,13,6);px(g,'#83694b',56,68,11,3);
   px(g,'#513f2f',48,57,2,14);px(g,'#ba9867',51,49,2,13);
   const baseX=v===1?0:v===3?3:-1,baseY=v===2?3:0;
   // Copa em degraus de 3 px, recortada e com lobos circulares.
   const slices=[
    [38,23],[29,42],[22,56],[15,70],[12,76],
    [9,82],[9,82],[12,76],[15,70],[19,62],
    [25,50],[34,34],[40,22]
   ];
   for(let i=0;i<slices.length;i++){
    const [left,width]=slices[i],yy=baseY+6+i*4;
    px(g,p[4],baseX+left-2,yy-2,width+4,6);
    px(g,p[i<4?p[2]===p[0]?0:1:0]||p[0],baseX+left,yy,width,4);
    // Bordas sombreadas do lado direito da copa.
    px(g,p[4],baseX+left+width-3,yy+2,3,3);
   }
   // Grandes aglomerados de folhagem com volume, sem gradientes.
   const lobes=[
    [28,20,31,22],[51,17,24,21],[16,32,31,20],
    [46,37,37,23],[31,9,27,20],[60,34,22,18]
   ];
   for(let i=0;i<lobes.length;i++){
    const [x,y,w,h]=lobes[i],shift=(v+i)%3*2;
    px(g,p[4],x-2+shift,y-2,w+3,h+4);
    px(g,p[1],x+shift,y,w,h);
    px(g,p[2],x+2+shift,y+2,w-6,Math.max(3,Math.floor(h*.47)));
    px(g,p[3],x+5+shift,y+4,Math.max(4,Math.floor(w*.37)),3);
    px(g,p[0],x+shift+3,y+h-5,w-7,3);
   }
   // Raminhos em curvas discretizadas, texturas com clusters grandes.
   for(let j=0;j<18;j++){
    const xx=18+Math.floor(hash(j,v,biome.length,11)*62),
     yy=13+Math.floor(hash(j,v,biome.length,13)*44);
    px(g,j%3===0?p[3]:j%3===1?p[2]:p[4],xx,yy,3+j%2,2);
   }
   // Folhas soltas e pequenas flores de floresta úmida.
   if(['meadow','forest','river','coast'].includes(biome)){
    for(let j=0;j<3;j++){
     const xx=24+j*20+(v%2)*3,yy=21+((j+v)%2)*16;
     px(g,'#d8de95',xx,yy,3,3);px(g,p[3],xx+1,yy+1,1,1);
    }
   }
  }
  function shrub(g,biome,variant){
   const p=PALETTES[biome]||PALETTES.meadow,v=variant%4;
   px(g,'#223c3055',4,31,51,8);
   const lobes=[[3,16,17,19],[13,6,25,23],[29,9,24,23],[40,18,16,15]];
   for(let i=0;i<lobes.length;i++){
    const [x,y,w,h]=lobes[i],a=(i+v)%3;
    px(g,p[4],x+a,y-2,w+3,h+4);
    px(g,p[0],x+2+a,y,w-1,h);
    px(g,p[1],x+4+a,y+2,w-5,Math.floor(h*.6));
    px(g,p[2],x+5+a,y+3,w-10,3);
    px(g,p[4],x+2+a,y+h-5,w-2,3);
   }
   for(let j=0;j<6;j++){
    const x=8+Math.floor(hash(j,v,biome.length,3)*42),y=12+Math.floor(hash(j,v,biome.length,9)*14);
    px(g,p[j%2?3:2],x,y,3+j%2,2);
   }
  }
  function rock(g,biome,variant){
   const p=PALETTES[biome]||PALETTES.mountain;
   px(g,'#12292373',3,28,50,8);
   polygonRows(g,[[18,20],[10,36],[5,46],[3,50],[7,42],[12,33],[16,24]],0,6,'#3b4c49');
   polygonRows(g,[[18,18],[12,31],[8,38],[7,40],[11,31],[14,25]],0,6,'#879c96');
   px(g,'#d8d5c1',22,12,16,3);px(g,'#c0c6b6',14,18,28,2);
   px(g,'#566b64',11,25,35,3);
   if(variant%2){px(g,p[2],12,25,5,3);px(g,p[4],20,21,3,9)}
  }
  function sprite(kind,biome,variant=0){
   if(!['tree','bush','rock'].includes(kind))return null;
   const resolved=PALETTES[biome]?biome:'meadow';
   const key=[kind,resolved,variant%variantCount].join(':');
   let cached=sprites.get(key);
   if(cached){sprites.delete(key);sprites.set(key,cached);return cached}
   const size=kind==='tree'?[104,86]:kind==='bush'?[60,42]:[60,42];
   const out=makeCanvas(...size);if(!out)return null;
   if(kind==='tree')tree(out.g,resolved,variant);
   else if(kind==='bush')shrub(out.g,resolved,variant);
   else rock(out.g,resolved,variant);
   sprites.set(key,out.c);
   if(sprites.size>Math.max(24,maxCached))sprites.delete(sprites.keys().next().value);
   return out.c;
  }
  function drawProp(g,o,biome){
   const kind=o.kind==='tree'?'tree':o.kind==='bush'?'bush':o.kind==='rock'?'rock':null;
   if(!kind)return false;
   const variant=Math.floor(hash(Math.round(o.x),Math.round(o.y),biome.length,88)*4);
   const c=sprite(kind,biome,variant);if(!c)return false;
   const w=kind==='tree'?112:kind==='bush'?56:47;
   const h=kind==='tree'?122:kind==='bush'?42:35;
   g.imageSmoothingEnabled=false;
   g.drawImage(c,Math.round(o.x-w/2),Math.round(o.y-h),w,h);
   return true;
  }
  return{drawProp,terrainTile,sprite,get stats(){return{cached:sprites.size}},clear(){sprites.clear()}};
 }
 return{PALETTES,terrainTile,create,hash};
});

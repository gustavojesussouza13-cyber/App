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
 const SHADE=typeof module==='object'&&module.exports?require('./shading16'):globalThis.OsPeregrinosShade16;
 const HAND=typeof module==='object'&&module.exports?require('./pixel-atelier-v1'):globalThis.OsPeregrinosHandPixels;
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
 // Copas, folhas e moitas não usam retângulos como silhueta.
 // Cada ponto é materializado na grade nativa, uma vez no prop em cache.
 // Borda serrilhada irregular, direção de luz e pequenas lacunas internas.
 function leafLobe(g,p,x,y,w,h,variant){
  const rx=w/2,ry=h/2,mid=x+rx;
  for(let row=0;row<h;row++){
   const ny=(row+.5-ry)/Math.max(1,ry);
   const extent=Math.sqrt(Math.max(0,1-ny*ny))*rx;
   const jitter=Math.floor(hash(Math.round(x),row,variant,141)*3)-1;
   const left=Math.max(0,Math.round(mid-extent+jitter));
   const right=Math.round(mid+extent+jitter);
   for(let col=left;col<=right;col++){
    const dx=Math.abs(col-mid)/Math.max(1,rx),dy=Math.abs(ny);
    const edge=dy>.87||dx>.83;
    const grain=hash(col,row,variant,143);
    const lit=row<h*.48&&col<mid+rx*.25;
    const color=edge?p[4]:lit?
     grain>.77?p[3]:grain>.36?p[2]:p[1]:
     grain>.87?p[2]:grain>.58?p[1]:p[0];
    px(g,color,col,y+row);
   }
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
   // Ondas e reflexos escalonados; sem blur ou sprites esticados.
   for(let n=0;n<3;n++){
    const x0=x+3+Math.floor(hash(tx,ty,z,n+201)*17),y0=y+4+n*9;
    px(g,'#225c76',x0,y0+2,11,2);px(g,'#b0d7c7',x0+2,y0,7,2);
    px(g,'#e1e6cd',x0+5,y0,2,1);
   }
   // Reflexos em níveis da água: espuma em curvas discretizadas, 3 pixels.
   // Determinístico: o mapa não repinta animação durante o loop do jogo.
   const ripple=Math.floor(hash(tx,ty,z,301)*3);
   for(let wave=0;wave<3;wave++){
    const rx=x+3+wave*8+((ripple+wave)%3),ry=y+6+wave*8;
    px(g,'#184e69',rx,ry+3,9,2);
    px(g,'#b8e1dd',rx+2,ry,5,1);
    px(g,'#e8f5e7',rx+4,ry,2,1);
   }
   HAND?.terrain(g,{x,y,biome,kind,seed:Math.floor(seed*65535)});
   SHADE?.ground(g,tx,ty,z,kind,p,hash);
   return;
  }
  if(path){
   // Terra do caminho desenhada em placas grandes e sulcos curtos.
   px(g,p[6],x,y+3,32,2);
   px(g,p[7],x+2,y+6,16,3);
   px(g,p[6],x+13,y+18,17,2);
   px(g,'#806445',x+3,y+24,11,2);
   // Trincas e desgaste em três alturas: qualidade mesmo sem micro-ruído.
   px(g,p[6],x+5,y+4,5,2);
   px(g,p[7],x+15,y+14,7,2);
   px(g,'#9f8159',x+23,y+25,7,3);
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
   if(kind==='paving'){
    // Rua da cidade: juntas de blocos bem assentados, diferente de rocha selvagem.
    px(g,'#403f41',x+15,y+4,2,25);
    px(g,'#d8c9a4',x+18,y+6,12,2);
    px(g,'#9d927c',x+4,y+14,25,2);
    px(g,'#e5d6b1',x+2,y+17,8,2);
   }
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
  // Microdetalhes consistentes de 2-4 px: há textura, mas nunca ruído aleatório.
  if(path){
   for(let i=0;i<4;i++){
    const dx=Math.floor(hash(tx,ty,z,175+i)*25),dy=3+Math.floor(hash(tx,ty,z,186+i)*25);
    px(g,i%2?p[7]:p[6],x+dx,y+dy,5+(i%3),2);
    px(g,'#f1d7a3',x+dx+1,y+dy,2,1);
   }
  }else if(rock){
   for(let i=0;i<3;i++){
    const dx=Math.floor(hash(tx,ty,z,218+i)*23),dy=2+Math.floor(hash(tx,ty,z,229+i)*25);
    px(g,'#58675f',x+dx,y+dy,9,2);px(g,'#ced4bd',x+dx+2,y+dy-2,4,2);
   }
  }else{
   // Folhas em cachos com dois tons e flores raras: linguagem de SNES/PC retrô.
   for(let i=0;i<4;i++){
    const dx=2+Math.floor(hash(tx,ty,z,245+i)*26),dy=3+Math.floor(hash(tx,ty,z,255+i)*25);
    px(g,p[4],x+dx,y+dy,2,5);px(g,p[2],x+dx+2,y+dy-2,3,4);
    px(g,p[3],x+dx+3,y+dy,2,2);
   }
   if(seed>.965){
    px(g,'#f3ded6',x+9,y+13,7,2);px(g,'#b97b99',x+12,y+10,2,8);
    px(g,'#f5d78e',x+12,y+13,2,2);
   }
  }
  // Textura regional legível sem encher cada tile de pontos soltos.
  // Linhas em 2-5px, pedras com quinas, musgo do pântano e grãos desérticos.
  const spot=hash(tx,ty,z,404),detailX=x+4+Math.floor(hash(tx,ty,z,405)*19),
   detailY=y+4+Math.floor(hash(tx,ty,z,406)*18);
  if(!path&&!rock&&biome==='forest'){
   px(g,p[4],detailX-3,detailY+4,11,2);
   px(g,p[1],detailX-1,detailY,8,3);
   px(g,p[3],detailX+2,detailY,2,2);
   if(spot>.74){px(g,'#d5aa72',detailX,detailY+6,5,2);px(g,p[4],detailX+2,detailY+4,2,2)}
  }else if(!path&&!rock&&biome==='swamp'){
   px(g,'#263e36',detailX-2,detailY+3,13,4);
   px(g,'#75998a',detailX,detailY+3,8,2);
   px(g,'#b4c7a5',detailX+4,detailY+3,3,1);
  }else if(!path&&!rock&&biome==='desert'){
   for(let i=0;i<3;i++){
    px(g,p[6],detailX-2+i*3,detailY+i*2,8-i*2,2);
    px(g,p[7],detailX+i*3,detailY-1+i*2,4,1);
   }
  }else if(!path&&!rock&&(biome==='mountain'||biome==='ruins')){
   px(g,p[4],detailX,detailY,9,6);
   px(g,p[2],detailX+2,detailY,7,2);
   px(g,p[3],detailX+3,detailY,3,1);
   px(g,p[6],detailX+6,detailY+3,2,3);
  }else if(path&&spot>.48){
   px(g,p[6],detailX,detailY,7,2);
   px(g,p[7],detailX+1,detailY-1,4,1);
   px(g,p[4],detailX+5,detailY+2,2,2);
  }else if(rock&&spot>.45){
   px(g,'#3e5652',detailX,detailY,12,2);
   px(g,'#cfccb3',detailX+1,detailY-2,5,2);
   px(g,'#577266',detailX+8,detailY+2,3,3);
  }
  // Luz de cima à esquerda: grupos de pixels mais claros, occlusão à direita.
  SHADE?.ground(g,tx,ty,z,kind,p,hash);
  HAND?.terrain(g,{x,y,biome,kind,seed:Math.floor(seed*65535)});
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
    leafLobe(g,p,baseX+left-2,yy-2,width+4,6,v*73+i);
   }
   // Grandes aglomerados de folhagem com volume, sem gradientes.
   const lobes=[
    [28,20,31,22],[51,17,24,21],[16,32,31,20],
    [46,37,37,23],[31,9,27,20],[60,34,22,18]
   ];
   for(let i=0;i<lobes.length;i++){
    const [x,y,w,h]=lobes[i],shift=(v+i)%3*2;
    leafLobe(g,p,x-2+shift,y-2,w+3,h+4,v*89+i+7);
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
   // Bordas iluminadas e folhas individuais, com agrupamentos coerentes.
   for(let j=0;j<12;j++){
    const xx=20+Math.floor(hash(j,v,biome.length,191)*64),yy=12+Math.floor(hash(j,v,biome.length,192)*46);
    px(g,j%3===0?p[3]:p[2],xx,yy,4,2);
    if(j%3===0)px(g,'#e2df9b',xx+2,yy-2,2,2);
   }
   // Ramos, folhas pendentes e luz recortada em cada copa.
   // Produzidos apenas no canvas de prop em cache, jamais em cada frame.
   for(let k=0;k<10;k++){
    const bx=21+Math.floor(hash(k,v,biome.length,611)*58),
     by=19+Math.floor(hash(k,v,biome.length,612)*43);
    px(g,p[4],bx,by+2,8,3);
    px(g,p[1],bx+1,by,7,3);
    px(g,p[3],bx+2,by,3,1);
    if(k%4===0){
     px(g,'#6d573d',bx+4,by+5,2,6);
     px(g,p[2],bx+2,by+3,5,2);
    }
   }
   HAND?.prop(g,{kind:'tree',biome,variant:v});
   SHADE?.tree(g,p,v);
  }
  function shrub(g,biome,variant){
   const p=PALETTES[biome]||PALETTES.meadow,v=variant%4;
   px(g,'#223c3055',4,31,51,8);
   const lobes=[[3,16,17,19],[13,6,25,23],[29,9,24,23],[40,18,16,15]];
   for(let i=0;i<lobes.length;i++){
    const [x,y,w,h]=lobes[i],a=(i+v)%3;
    leafLobe(g,p,x+a,y-2,w+3,h+4,v*101+i+30);
   }
   for(let j=0;j<6;j++){
    const x=8+Math.floor(hash(j,v,biome.length,3)*42),y=12+Math.floor(hash(j,v,biome.length,9)*14);
    px(g,p[j%2?3:2],x,y,3+j%2,2);
   }
   for(let k=0;k<5;k++){
    const bx=6+Math.floor(hash(k,v,biome.length,630)*41),
     by=10+Math.floor(hash(k,v,biome.length,631)*18);
    px(g,p[4],bx-1,by+2,8,3);
    px(g,p[2],bx,by,7,2);
    px(g,p[3],bx+2,by,3,1);
   }
   HAND?.prop(g,{kind:'bush',biome,variant:v});
   SHADE?.bush(g,p,v);
  }
  function rock(g,biome,variant){
   const p=PALETTES[biome]||PALETTES.mountain;
   px(g,'#12292373',3,28,50,8);
   polygonRows(g,[[18,20],[10,36],[5,46],[3,50],[7,42],[12,33],[16,24]],0,6,'#3b4c49');
   polygonRows(g,[[18,18],[12,31],[8,38],[7,40],[11,31],[14,25]],0,6,'#879c96');
   px(g,'#d8d5c1',22,12,16,3);px(g,'#c0c6b6',14,18,28,2);
   px(g,'#566b64',11,25,35,3);
   // Musgo, poeira ou sal conforme o bioma, para não repetir a mesma rocha.
   px(g,p[2],12,24,8,3);px(g,p[4],20,14,3,10);
   if(variant%2){px(g,p[2],12,25,5,3);px(g,p[4],20,21,3,9)}
   // Veios e quinas naturais desenhados como degraus de pixels.
   for(let j=0;j<4;j++){
    const xx=13+j*8,yy=19+(j%2)*4;
    px(g,'#d7d2b7',xx,yy,6,2);px(g,'#5b6d64',xx+5,yy+2,3,3);
   }
   for(let k=0;k<3;k++){
    const bx=13+k*11,by=19+((variant+k)%2)*4;
    px(g,'#3b504b',bx,by+3,9,2);
    px(g,'#ddd6bc',bx+1,by,5,1);
    px(g,p[2],bx+3,by+1,3,2);
   }
   HAND?.prop(g,{kind:'rock',biome,variant});
   SHADE?.rock(g,p,variant);
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

'use strict';
/*
 * OS PEREGRINOS · ateliê de objetos do mundo.
 * Formas modeladas em pixels inteiros na matriz transparente 64×80.
 * Não desenha nem altera a fortaleza 3D, colisões ou interações.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosWorldPropsArtisan64=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const W=64,H=80;
 const KINDS=Object.freeze(['poco','tenda','estandarte','fogueira','santuario','portal','reino',
  'biome-meadow','biome-forest','biome-river','biome-desert','biome-mountain',
  'biome-ruins','biome-swamp','biome-coast','biome-city']);
 const INK='#252c33',DEE='#393947',STONE='#65747a',MID='#9ba8a0',
  PALE='#e1d6b3',GOLD='#dfb976',WOOD='#775641',WOODLIGHT='#bd9461';
 const FLAGS=['#6bc6b6','#e7b765','#ae93d3','#df7771'];
 function paint(g,{kind,variant=0,frame=0}={}){
  if(!KINDS.includes(kind)||!g?.fillRect)return false;
  const v=(Math.floor(Number(variant)||0)%4+4)%4;
  const f=(Math.floor(Number(frame)||0)%4+4)%4;
  const p=(color,x,y,w=1,h=1)=>{
   const x0=Math.max(0,Math.round(x)),y0=Math.max(0,Math.round(y)),
    x1=Math.min(W,Math.round(x+w)),y1=Math.min(H,Math.round(y+h));
   if(!color||x1<=x0||y1<=y0)return;
   g.fillStyle=color;g.fillRect(x0,y0,x1-x0,y1-y0);
  };
  const poly=(color,points)=>{
   const ys=points.map(pt=>pt[1]);
   for(let y=Math.max(0,Math.floor(Math.min(...ys)));y<Math.min(H,Math.ceil(Math.max(...ys)));y++){
    const crosses=[];
    for(let i=0;i<points.length;i++){
     const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length];
     if((ay<=y+.5&&by>y+.5)||(by<=y+.5&&ay>y+.5))
      crosses.push(ax+(y+.5-ay)*(bx-ax)/(by-ay));
    }
    crosses.sort((a,b)=>a-b);
    for(let i=0;i+1<crosses.length;i+=2){
     const x=Math.ceil(crosses[i]-.5),right=Math.ceil(crosses[i+1]-.5);
     if(right>x)p(color,x,y,right-x,1);
    }
   }
  };
  const line=(color,x0,y0,x1,y1,w=1)=>{
   let x=Math.round(x0),y=Math.round(y0),X=Math.round(x1),Y=Math.round(y1);
   const dx=Math.abs(X-x),dy=Math.abs(Y-y),sx=x<X?1:-1,sy=y<Y?1:-1;
   let error=dx-dy;
   for(let t=0;t<130;t++){
    p(color,x-(w>>1),y-(w>>1),w,w);
    if(x===X&&y===Y)break;
    const e=2*error;if(e>-dy){error-=dy;x+=sx}if(e<dx){error+=dx;y+=sy}
   }
  };
  const flag=FLAGS[v],flit=v%2?'#fff0b9':'#d1f9df';
  // Sombra no solo: filas irregulares de clusters, sem gradiente desfocado.
  for(let y=73;y<79;y++){
   const r=Math.round(Math.sqrt(Math.max(0,1-Math.pow((y-75)/4,2)))*27);
   if(r>1)p('#132d2955',32-r,y,r*2,1);
  }
  // Monumentos de todos os nove biomas: cada textura possui contorno
  // próprio e resolve a silhueta sem o retângulo opaco do sistema antigo.
  if(kind==='biome-meadow'){
   // Canteiro circular com flores de pétalas separadas, grama e estacas.
   poly(INK,[[4,67],[11,59],[24,57],[36,59],[50,55],
    [59,63],[56,73],[40,77],[18,75],[7,72]]);
   poly('#477751',[[8,66],[17,61],[30,62],[40,63],
    [49,59],[55,64],[52,71],[35,74],[18,72]]);
   poly('#8ab765',[[14,67],[24,64],[35,67],[42,65],[47,69],[32,72]]);
   for(let j=0;j<6;j++){
    const x=10+j*8+((v+j)%3),y=46-((j*7+v)%17);
    line('#326443',x,67,x+((j%3)-1)*2,y+5,2);
    const pink=j%2?'#e9a2b6':'#ffe0a0';
    for(const [dx,dy]of [[0,-5],[-5,0],[5,0],[0,5]]){
     poly(INK,[[x+dx-3,y+dy],[x+dx,y+dy-3],
      [x+dx+4,y+dy],[x+dx,y+dy+3]]);
     poly(pink,[[x+dx-2,y+dy],[x+dx,y+dy-2],
      [x+dx+3,y+dy],[x+dx,y+dy+2]]);
    }
    p(GOLD,x,y,3,3);p(PALE,x+1,y,1,1);
   }
   for(let j=0;j<4;j++)line('#b6ce7b',9+j*14,66,11+j*14,58-(j%2)*5,1);
  }else if(kind==='biome-forest'){
   // Totem de madeira em tronco caído, cogumelos e musgo aderente.
   poly(INK,[[3,64],[10,53],[23,49],[42,51],
    [56,61],[58,71],[47,77],[12,75]]);
   poly(WOOD,[[6,64],[14,54],[27,52],[41,54],
    [54,63],[53,70],[43,74],[14,71]]);
   poly(WOODLIGHT,[[11,60],[19,55],[36,56],[47,60],[36,61],[21,61]]);
   for(let j=0;j<5;j++){
    const x=12+j*9,y=61+(j%2)*4;
    line('#4c352f',x,y,x+5,y+4,2);
    p('#91b978',x+2,y-2,4,2);
   }
   for(const [x,y]of [[17,46],[39,47],[51,55]]){
    line(INK,x,y+4,x,y+16,3);line(PALE,x+1,y+5,x+1,y+14,1);
    poly(INK,[[x-8,y+3],[x-4,y-4],[x+3,y-7],[x+9,y+2]]);
    poly('#b96556',[[x-6,y+2],[x-3,y-3],[x+3,y-5],[x+6,y+2]]);
    p(PALE,x-1,y-2,2,2);p(PALE,x+4,y,2,1);
   }
  }else if(kind==='biome-river'){
   // Marco náutico com poste, cordas e junco verde à beira d'água.
   poly(INK,[[8,72],[15,65],[25,68],[38,62],[53,66],[58,74]]);
   poly('#507f82',[[11,71],[19,67],[29,70],[41,65],[52,69],[56,73]]);
   line(INK,31,65,32,12,6);line(WOOD,32,63,34,14,3);
   poly(GOLD,[[32,15],[47,18],[51,22],[43,29],[33,26]]);
   poly(PALE,[[34,17],[45,20],[47,22],[42,24],[34,23]]);
   line(WOOD,14,29,49,31,3);
   for(let j=0;j<6;j++){
    const x=10+j*9;
    line('#336a50',x,68,x-2,50-(j%3)*5,2);
    line('#99bf80',x-1,62,x+2,55-(j%3)*5,1);
    poly('#aa9561',[[x-3,53-(j%3)*5],[x-4,43-(j%3)*5],
     [x,47-(j%3)*5],[x,55-(j%3)*5]]);
   }
   line('#b0e2d7',15,73,46,73,1);
  }else if(kind==='biome-desert'){
   // Cacto em silhueta escalonada e flores no topo, sem caixa central.
   poly(INK,[[24,73],[24,43],[25,14],[30,9],[36,12],
    [39,24],[38,55],[40,74]]);
   poly('#4d8260',[[27,70],[27,27],[29,14],[33,12],
    [36,22],[35,71]]);
   line('#a7c786',30,17,30,64,2);line('#285b4b',36,26,36,65,2);
   poly(INK,[[25,44],[18,45],[15,36],[15,26],[12,23],
    [8,27],[9,42],[16,53],[26,55]]);
   poly('#528769',[[23,47],[18,47],[13,40],[12,28],
    [15,28],[17,40],[22,46]]);
   poly(INK,[[39,52],[48,50],[52,44],[52,33],
    [57,31],[59,37],[59,52],[51,61],[38,62]]);
   poly('#689676',[[38,54],[49,52],[55,46],[55,36],
    [57,38],[56,51],[49,57],[38,58]]);
   for(let j=0;j<6;j++){
    const yy=24+j*7;p('#e1ca8f',27+(j%2)*8,yy,2,2);
   }
   poly('#da8d9e',[[27,13],[29,7],[34,8],[37,13],[33,15]]);
   p(PALE,31,9,2,2);
   for(let j=0;j<6;j++)p('#d1b17f',9+j*9,73+(j%2),4,1);
  }else if(kind==='biome-mountain'){
   // Cristais facetados saindo da pedra rachada.
   poly(INK,[[4,69],[16,49],[28,54],[35,40],
    [48,55],[56,61],[59,75],[7,76]]);
   poly('#506877',[[8,68],[19,54],[28,58],[35,47],
    [47,58],[54,63],[56,72],[11,73]]);
   poly(MID,[[13,64],[20,56],[29,60],[35,49],
    [42,58],[35,65],[20,69]]);
   for(const [x,h]of [[14,30],[29,12],[43,26]]){
    poly(INK,[[x-6,65],[x-7,44],[x-2,h],[x+4,h+5],
     [x+9,50],[x+6,66]]);
    poly('#77b6c1',[[x-4,61],[x-4,45],[x-1,h+4],
     [x+2,h+8],[x+4,48],[x+4,62]]);
    poly('#bce5dd',[[x-2,44],[x-1,h+5],[x+1,h+9],[x,53]]);
    line(PALE,x+3,51,x+5,61,1);
   }
   line(INK,12,72,28,69,2);line(PALE,12,71,19,69,1);
  }else if(kind==='biome-ruins'){
   // Coluna rachada, arquitrave partida e pedras caídas.
   poly(INK,[[14,69],[16,34],[20,15],[32,11],
    [40,19],[39,55],[49,63],[56,75],[10,76]]);
   poly(STONE,[[18,67],[20,31],[23,18],[31,15],
    [37,21],[35,61],[47,66],[52,72],[13,73]]);
   poly(PALE,[[21,20],[29,17],[36,22],[35,27],[22,26]]);
   poly(INK,[[9,18],[13,9],[35,7],[47,13],[45,20]]);
   poly('#b2aaa0',[[12,16],[16,10],[35,9],[43,13],[42,16]]);
   for(let j=0;j<5;j++){
    const y=31+j*8;
    line('#485660',19,y,36,y+2,2);
    line('#d8cfb0',21,y-2,31,y-1,1);
   }
   // Fenda serrilhada e bloco quebrado, com musgo nas juntas.
   line(INK,32,23,27,42,2);line(INK,27,42,34,57,2);
   poly(INK,[[43,64],[53,59],[58,66],[54,72],[41,70]]);
   poly(MID,[[46,65],[52,62],[55,66],[51,70],[44,68]]);
   for(let j=0;j<4;j++)p('#85a279',15+j*9,69-(j%2)*3,4,2);
  }else if(kind==='biome-swamp'){
   // Cogumelos luminescentes e raízes salientes sobre terra úmida.
   poly(INK,[[5,72],[10,61],[22,56],[40,59],[54,67],[58,75]]);
   poly('#496a51',[[8,70],[17,61],[25,60],[42,62],[53,70]]);
   for(const [x,h,r]of [[19,31,13],[42,23,16],[32,46,9]]){
    poly(INK,[[x-4,69],[x-3,h+12],[x,h+8],[x+4,h+13],[x+5,69]]);
    poly('#b5b99b',[[x-2,67],[x-1,h+13],[x+1,h+11],
     [x+3,h+14],[x+3,66]]);
    poly(INK,[[x-r,h+10],[x-r+4,h-1],[x-4,h-9],
     [x+6,h-8],[x+r-3,h],[x+r,h+11]]);
    poly('#9b75aa',[[x-r+3,h+8],[x-r+7,h],
     [x-3,h-6],[x+4,h-5],[x+r-5,h+2],[x+r-3,h+8]]);
    for(let j=0;j<4;j++)p('#e0c6dd',x-r+7+j*6,h+2+(j%2),2,2);
   }
   for(let j=0;j<6;j++)p('#78a9a0',9+j*8,71+(j%2),3,1);
  }else if(kind==='biome-coast'){
   // Concha em espiral, rochas salgadas e espuma recortada.
   poly(INK,[[5,71],[13,63],[24,66],[36,61],
    [51,63],[59,72],[56,76],[7,76]]);
   poly('#a9a086',[[9,70],[16,66],[26,69],
    [40,64],[52,66],[55,72],[51,74],[12,74]]);
   poly(INK,[[16,64],[14,50],[20,35],[33,28],
    [45,37],[52,52],[50,65],[37,71],[21,68]]);
   poly('#d5b58d',[[18,60],[18,50],[23,38],[33,31],
    [43,40],[49,52],[47,63],[36,68],[23,65]]);
   for(let j=0;j<6;j++){
    const xx=19+j*5,yy=56-Math.round(Math.sin(j/5*Math.PI)*15);
    line('#9b796d',33,62,xx,yy,2);
    line(PALE,33,61,xx,yy-2,1);
   }
   poly('#f4debf',[[28,61],[29,52],[34,49],[39,53],
    [40,60],[35,64]]);
   p('#b38d72',33,55,3,3);
   for(let j=0;j<4;j++)line('#e5f2dc',6+j*14,75,16+j*11,74,1);
  }else if(kind==='biome-city'){
   // Poste urbano, aviso em pergaminho e bandeira para viajantes.
   poly(INK,[[11,72],[17,65],[44,66],[53,72],[50,77],[13,77]]);
   poly(STONE,[[15,72],[22,68],[43,68],[49,72],[46,75],[18,75]]);
   line(INK,42,68,43,12,6);line(WOOD,43,65,43,15,3);
   poly(INK,[[31,18],[38,8],[49,8],[55,17],[53,32],[33,32]]);
   poly('#ae8659',[[34,18],[40,11],[47,11],[52,18],[50,29],[36,29]]);
   poly(GOLD,[[38,17],[42,12],[47,17],[47,25],[39,25]]);
   poly('#f6e8b8',[[41,17],[44,14],[46,18],[43,24],[40,21]]);
   line(PALE,34,29,52,29,1);
   poly(INK,[[8,44],[12,35],[34,36],[39,45],[35,66],[9,64]]);
   poly('#d9c69e',[[11,44],[14,38],[33,39],[36,46],[33,63],[12,62]]);
   for(let j=0;j<5;j++){
    const yy=42+j*4;
    line(j%2?WOOD:STONE,16,yy,31-(j%3)*2,yy,1);
   }
   poly(flag,[[44,18],[57,21],[53,29],[46,30]]);
   p(PALE,47,22,2,2);
  }else   if(kind==='poco'){
   // Abertura elíptica rasterizada, brocal de pedras facetadas e água escura.
   poly(INK,[[7,50],[10,43],[21,38],[43,39],[55,45],
    [57,57],[52,69],[44,74],[17,74],[8,68]]);
   poly(STONE,[[9,50],[13,44],[23,41],[42,42],[53,48],
    [54,60],[48,69],[43,72],[19,71],[12,65]]);
   poly(PALE,[[9,49],[16,43],[24,41],[42,42],[52,47],
    [48,51],[39,54],[21,53],[13,51]]);
   poly(INK,[[15,49],[22,45],[40,45],[48,50],
    [43,56],[24,57],[16,53]]);
   poly('#294d60',[[19,50],[25,47],[40,48],[44,51],[37,54],[24,54]]);
   line('#83bfc2',23,49,33,49,2);p('#e1f4d9',26,48,4,1);
   for(const [x,y]of [[14,56],[24,62],[39,60],[47,54],[19,68],[39,69]]){
    line('#3e565d',x,y,x+5,y+2,1);p('#bec7b7',x+1,y-2,4,1);
   }
   // Cavalete de madeira, corda e manivela.
   line(INK,12,44,16,13,5);line(WOODLIGHT,13,40,17,15,2);
   line(INK,49,45,46,13,5);line(WOODLIGHT,48,41,45,16,2);
   line(INK,14,14,48,14,6);line(WOODLIGHT,16,12,46,12,3);
   line('#d8c79b',33,16,32,41,2);
   line(WOOD,45,12,52,19,3);line(GOLD,50,17,56,17,2);
  }else if(kind==='tenda'){
   // Cobertura triangular irregular, abas de tecido e entrada profunda.
   poly(INK,[[5,61],[11,45],[22,24],[31,11],[37,18],
    [48,37],[59,61],[56,72],[9,72]]);
   poly('#6f4850',[[8,61],[17,40],[30,16],[38,30],
    [50,48],[56,62],[53,70],[10,69]]);
   poly('#c18a66',[[12,58],[22,33],[31,17],
    [33,34],[28,53],[24,66],[13,68]]);
   poly('#edba86',[[22,33],[30,19],[30,42],[24,58],[17,61]]);
   poly('#803c4b',[[37,32],[48,48],[53,62],[48,65],
    [43,47],[32,21]]);
   poly(INK,[[25,47],[32,31],[43,48],[46,70],[22,70]]);
   poly(WOOD,[[31,39],[34,39],[36,70],[30,70]]);
   line(GOLD,30,18,9,69,2);line(GOLD,34,21,57,69,2);
   line(PALE,7,69,57,69,2);
   // Painéis bordados, três pregos e cordas de fixação.
   for(let j=0;j<5;j++){
    const x=13+j*7,y=58+((j+v)%3)*2;
    p('#e9bc87',x,y,2,2);p('#9b5551',x+1,y+2,2,2);
   }
   for(const [a,b]of [[7,72],[55,72]]){
    line(INK,a,b,a-2,b+5,2);p(PALE,a-2,b+4,3,1);
   }
   p('#f7e1a8',31,24,2,4);
  }else if(kind==='estandarte'){
   // Estaca empenada e pano de recorte assimétrico, sem retângulo-base.
   line(INK,25,9,24,75,6);line(WOOD,26,10,26,73,3);
   line(WOODLIGHT,27,17,27,69,1);
   poly(GOLD,[[23,9],[29,3],[34,10],[29,14]]);
   p(PALE,29,6,2,2);
   poly(INK,[[29,16],[46,14],[54,20],[49,31],
    [57,38],[39,45],[31,40]]);
   poly(flag,[[30,18],[44,17],[51,21],[46,31],
    [53,37],[39,42],[31,37]]);
   poly(flit,[[32,20],[39,19],[34,26]]);
   line(INK,33,31,45,32,3);line(GOLD,38,25,38,38,2);
   poly(PALE,[[38,26],[41,30],[38,35],[35,30]]);
   for(let k=0;k<4;k++){
    const x=33+k*5;
    p(GOLD,x,40+(k%2)*2,3,2);
   }
   line(INK,17,75,30,75,3);p(WOODLIGHT,22,70,5,2);
  }else if(kind==='fogueira'){
   // Lenha cruzada sob chamas desenhadas camada por camada.
   for(const [sx,sy,ex,ey]of [[8,70,54,59],[11,61,52,74],[15,72,47,64]]){
    line(INK,sx,sy,ex,ey,8);line(WOOD,sx+2,sy-1,ex-2,ey-1,4);
    line(WOODLIGHT,sx+3,sy-2,ex-3,ey-2,1);
   }
   for(const [x,y]of [[10,74],[20,76],[36,75],[48,73]]){
    p(STONE,x,y,7,3);p(PALE,x+1,y,4,1);
   }
   const dance=[0,-2,1,2][f];
   poly('#8c3546',[[17,63],[13,47],[22,40],[22,29+dance],
    [29,38],[35,18+dance],[39,37],[48,30],[46,46],
    [54,49],[43,68],[26,70]]);
   poly('#e5683f',[[20,62],[18,47],[25,40],[26,35+dance],
    [32,43],[36,28+dance],[40,44],[47,39],
    [43,61],[33,66]]);
   poly('#ffc05f',[[24,60],[23,50],[30,42],[30,52],
    [38,39],[41,53],[35,64],[29,65]]);
   poly('#fff2a8',[[29,60],[31,51],[35,48],[36,59],[33,64]]);
   for(let j=0;j<5;j++){
    const x=14+j*9,y=22+((j*7+f*3)%16);
    p(j%2?'#ffcf70':'#ec694b',x,y,2,2);
   }
  }else if(kind==='santuario'){
   // Pequeno relicário com cúpula, degraus, placas e gema no altar.
   poly(INK,[[9,74],[12,63],[14,33],[21,21],[26,13],
    [33,7],[40,15],[47,26],[51,52],[56,72]]);
   poly(STONE,[[12,70],[16,33],[23,22],[31,12],[39,21],
    [47,37],[52,69]]);
   poly(PALE,[[19,33],[25,22],[32,16],[39,25],[44,36],
    [40,37],[32,28],[24,37]]);
   poly(INK,[[24,46],[26,37],[37,35],[43,44],
    [45,68],[20,69]]);
   poly('#304959',[[26,46],[31,41],[37,41],[40,48],[41,67],[24,67]]);
   for(const [x,y]of [[16,37],[46,39],[19,55],[44,58]]){
    p('#526772',x,y,5,6);p(PALE,x+1,y,2,1);p(INK,x+4,y+3,1,2);
   }
   poly(GOLD,[[27,50],[32,43],[38,50],[36,60],[30,60]]);
   poly('#62dbca',[[30,50],[33,46],[36,50],[35,55],[31,56]]);
   p('#effff2',32,49,2,3);
   poly(INK,[[6,71],[58,71],[61,77],[3,77]]);
   line(MID,8,72,56,72,2);line(GOLD,16,75,48,75,1);
  }else if(kind==='portal'){
   // Portal real: aro em pedra recortada e campo arcano discreto.
   poly(INK,[[7,77],[10,31],[16,16],[26,8],[39,8],
    [49,17],[55,34],[58,76],[49,78],[13,78]]);
   poly(STONE,[[10,72],[13,32],[20,19],[27,12],
    [38,12],[47,21],[52,35],[54,73],[48,74],
    [46,34],[41,23],[36,20],[27,20],[20,28],
    [17,38],[16,74]]);
   poly(PALE,[[17,33],[22,24],[29,17],[38,17],[44,24],
    [46,32],[42,28],[36,22],[29,22],[23,29],[20,38]]);
   poly(INK,[[20,72],[20,37],[25,27],[31,22],
    [38,26],[43,37],[45,72]]);
   poly('#284a61',[[23,72],[24,38],[29,29],
    [35,26],[41,37],[42,72]]);
   poly('#427b91',[[26,67],[27,38],[31,32],
    [35,31],[39,39],[39,67]]);
   const glow=FLAGS[v];
   for(let j=0;j<7;j++){
    const yy=35+j*5,xx=28+((j*7+f*3)%8);
    line(j%2?glow:'#89d4cb',xx,yy,xx+4,yy-3,1);
    p(PALE,xx+2,yy-1,1,1);
   }
   for(const [x,y]of [[14,29],[49,30],[10,51],[52,54],[27,13],[38,14]]){
    p(GOLD,x,y,3,2);p(PALE,x+1,y,1,1);
   }
   poly(INK,[[6,72],[58,72],[62,78],[2,78]]);
   line(MID,9,74,55,74,2);
  }else if(kind==='reino'){
   // Miniatura do castelo de guilda no MAPA 2D apenas.
   // O editor/fortaleza 3D não usa este sprite e permanece intacto.
   poly(INK,[[4,75],[7,41],[17,37],[19,27],[25,20],
    [41,20],[47,29],[51,41],[58,44],[61,76]]);
   poly('#4b6166',[[8,73],[10,44],[19,40],
    [22,31],[26,24],[40,24],[44,32],[47,43],
    [55,46],[58,73]]);
   // Torres com telhados pontudos e ameias interrompidas.
   for(const [x,shift]of [[7,0],[47,2]]){
    poly(INK,[[x,72],[x,37],[x+4,30-shift],
     [x+9,24-shift],[x+15,34],[x+16,73]]);
    poly(STONE,[[x+3,69],[x+3,39],[x+9,29-shift],
     [x+12,37],[x+13,69]]);
    poly('#c3bb9d',[[x+5,41],[x+8,32-shift],[x+11,41]]);
    for(let j=0;j<3;j++)p(PALE,x+3+j*4,47+(j%2)*4,2,2);
    poly(INK,[[x+5,56],[x+9,52],[x+12,56],[x+12,67],[x+5,67]]);
    poly('#344f65',[[x+7,58],[x+9,56],[x+10,59],[x+10,65],[x+7,65]]);
   }
   // Fachada em pedras, sem blocos retangulares de parede.
   poly(INK,[[19,71],[18,41],[23,33],[32,29],
    [41,34],[47,43],[47,72]]);
   poly('#87928b',[[22,69],[21,43],[26,36],
    [32,33],[39,37],[44,45],[44,69]]);
   for(let j=0;j<5;j++){
    const yy=41+j*6;
    for(let k=0;k<3;k++){
     const xx=23+k*7+(j%2)*3;
     line(j%2?STONE:PALE,xx,yy,xx+4,yy,1);
     p(INK,xx+4,yy+1,1,2);
    }
   }
   // Portão ogival, degraus e grades de bronze.
   poly(INK,[[25,71],[25,58],[28,50],[33,46],
    [38,50],[41,58],[41,72]]);
   poly(WOOD,[[28,70],[28,58],[30,53],[33,51],
    [37,55],[38,70]]);
   line(GOLD,33,52,33,71,1);
   for(let j=0;j<3;j++)p(PALE,27+j*5,61,2,2);
   line(INK,17,72,48,72,3);
   // Pendão ligado ao castelo: cor e movimento discretos.
   line(INK,32,27,32,3,3);line(PALE,33,26,33,5,1);
   poly(flag,[[34,6],[48,6+f],[44,13+f],[51,18],
    [37,20],[34,17]]);
   poly(flit,[[35,8],[41,8+f],[38,11]]);
   p(GOLD,32,2,3,3);
  }
  return true;
 }
 function create({documentRef=typeof document!=='undefined'?document:null,maxCached=96}={}){
  const frames=new Map();
  function sprite(kind,variant=0,frame=0){
   if(!KINDS.includes(kind))return null;
   const v=(Math.floor(variant)||0)&3,f=(Math.floor(frame)||0)&3;
   const key=kind+':'+v+':'+(kind==='fogueira'||kind==='portal'||kind==='reino'?f:0);
   if(frames.has(key)){const item=frames.get(key);frames.delete(key);frames.set(key,item);return item}
   const canvas=documentRef?.createElement?.('canvas');if(!canvas)return null;
   canvas.width=W;canvas.height=H;
   const g=canvas.getContext?.('2d');if(!g)return null;
   g.imageSmoothingEnabled=false;
   paint(g,{kind,variant:v,frame:f});
   frames.set(key,canvas);
   if(frames.size>Math.max(32,maxCached))frames.delete(frames.keys().next().value);
   return canvas;
  }
  function draw(g,{kind,x,y,w=64,h=80,variant=0,frame=0}={}){
   const c=sprite(kind,variant,frame);if(!c||!g?.drawImage)return false;
   g.imageSmoothingEnabled=false;
   g.drawImage(c,Math.round(x-w/2),Math.round(y-h),Math.round(w),Math.round(h));
   return true;
  }
  return {sprite,draw,get stats(){return{cached:frames.size}},clear(){frames.clear()}};
 }
 return Object.freeze({WIDTH:W,HEIGHT:H,KINDS,paint,create,VERSION:'world-props-artisan64-v1'});
});

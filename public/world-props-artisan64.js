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
 const KINDS=Object.freeze(['poco','tenda','estandarte','fogueira','santuario','portal','reino']);
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
  if(kind==='poco'){
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

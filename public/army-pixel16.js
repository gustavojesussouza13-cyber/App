'use strict';
/* Os Peregrinos — tropas 2D 16-bit originais, desenhadas com pixels inteiros.
   Quatro silhuetas distintas: escudo, arco, cavaleiro e balista. */
(function(root){
 const COLORS={
  outline:'#18252d',shadow:'#314250',steel:'#9bb9c7',light:'#e2f0db',
  leather:'#755239',wood:'#a7764a',skin:'#e5b881',gold:'#f2d48b',
  green:'#3d8d73',red:'#b54c55',blue:'#567bb2',purple:'#756b9e',
  ground:'#152b29'
 };
 const TYPES=['militia','archer','knight','siege'];
 const dimensions={militia:[18,24],archer:[18,25],knight:[24,25],siege:[27,24]};
 function figure(ctx,type,x,y,t=0,scale=2){
  const [w,h]=dimensions[type]||dimensions.militia;
  const step=Math.round(Math.sin(t/175+(x+y)*.016)*1);
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  ctx.translate(Math.round(x-w*scale/2),Math.round(y-h*scale+step*scale));
  const rect=(c,a,b,ww,hh)=>{
   // Matriz lógica: cada célula pintada é exatamente um pixel nativo.
   // Escala inteira somente no canvas final; sem placas retangulares no atlas.
   const col=COLORS[c]||c;
   for(let py=Math.max(0,b);py<Math.min(h,b+hh);py++)
    for(let px=Math.max(0,a);px<Math.min(w,a+ww);px++){
     ctx.fillStyle=col;
     ctx.fillRect(px*scale,py*scale,scale,scale);
    }
  };
  // Scanline de 1 pixel nativo: silhuetas com arestas orgânicas.
  const poly=(col,pts)=>{
   for(let yy=Math.max(0,Math.floor(Math.min(...pts.map(p=>p[1]))));
       yy<Math.min(h,Math.ceil(Math.max(...pts.map(p=>p[1]))));yy++){
    const xs=[];
    for(let i=0;i<pts.length;i++){
     const [ax,ay]=pts[i],[bx,by]=pts[(i+1)%pts.length];
     if((ay<=yy+.5&&by>yy+.5)||(by<=yy+.5&&ay>yy+.5))
      xs.push(ax+(yy+.5-ay)*(bx-ax)/(by-ay));
    }
    xs.sort((a,b)=>a-b);
    for(let i=0;i+1<xs.length;i+=2){
     const left=Math.max(0,Math.ceil(xs[i]-.5)),right=Math.min(w,Math.ceil(xs[i+1]-.5));
     if(right>left)rect(col,left,yy,right-left,1);
    }
   }
  };
  // Sombra de pixel compartilhada, ligeiramente alongada conforme armadura.
  rect('ground',2,h-2,w-4,2);
  if(type==='militia'){
   // Milícia — cota verde, escudo heráldico, espada curta, elmo de aço.
   rect('outline',5,7,9,4);rect('steel',6,7,7,3);rect('light',7,7,4,1);
   rect('skin',7,10,5,4);poly('outline',[[5,17],[7,12],[12,12],[15,17],[14,21],[10,23],[6,21]]);poly('green',[[7,16],[9,14],[12,14],[13,19],[9,21],[7,19]]);
   rect('gold',9,13,2,5);rect('outline',7,20,3,3);rect('outline',11,20,3,3);
   rect('leather',8,20,2,2);rect('leather',12,20,2,2);
   poly('outline',[[2,15],[5,12],[9,15],[8,21],[5,24],[2,21]]);poly('blue',[[3,16],[5,14],[7,16],[7,21],[5,22],[3,20]]);rect('steel',4,15,2,5);
   rect('gold',4,17,2,2);rect('steel',14,10,2,9);rect('light',14,8,2,3);
   rect('wood',14,18,2,2);rect('outline',13,19,4,2);
  }else if(type==='archer'){
   // Arqueiro — manto verde, capuz, aljava e arco curvo dourado.
   poly('outline',[[5,11],[6,7],[11,3],[15,8],[15,13],[9,14]]);poly('green',[[7,10],[10,5],[13,8],[13,12],[8,12]]);rect('shadow',7,9,6,3);
   rect('skin',8,10,4,3);poly('outline',[[4,17],[7,12],[12,12],[16,16],[15,22],[10,25],[5,22]]);poly('green',[[6,17],[8,14],[12,14],[14,18],[12,23],[7,20]]);
   rect('gold',10,14,2,4);rect('leather',7,20,3,4);rect('leather',12,20,3,4);
   rect('wood',3,9,2,10);rect('gold',2,8,2,2);rect('gold',2,19,2,2);
   rect('outline',1,11,1,7);rect('light',4,9,1,12);
   rect('leather',14,11,3,10);rect('gold',15,9,1,6);
   rect('skin',13,14,3,2);rect('wood',5,15,9,1);
   rect('light',8,15,2,1);
  }else if(type==='knight'){
   // Cavaleiro — cavalo blindado, armadura azul, penacho rubro e lança.
   poly('outline',[[2,18],[5,13],[13,12],[18,14],[23,17],[22,22],[18,24],[7,24],[3,21]]);poly('leather',[[4,17],[8,14],[16,14],[21,18],[20,22],[8,22],[5,20]]);rect('steel',8,15,10,5);
   rect('outline',4,21,4,4);rect('outline',17,21,4,4);
   rect('shadow',5,21,3,3);rect('shadow',18,21,3,3);
   rect('outline',18,11,6,7);rect('leather',19,12,4,5);rect('skin',22,13,2,3);
   poly('outline',[[9,15],[10,6],[13,4],[17,6],[18,15],[14,18],[10,17]]);poly('steel',[[11,14],[11,8],[13,5],[16,8],[16,14],[13,16]]);rect('blue',10,12,6,3);
   rect('gold',10,10,6,1);rect('outline',10,3,6,4);rect('steel',11,4,4,4);
   rect('light',12,5,3,1);rect('red',12,1,3,3);rect('red',14,2,3,2);
   rect('outline',6,13,5,7);rect('blue',7,14,3,5);rect('gold',7,16,3,2);
   rect('wood',20,2,2,14);rect('light',20,0,2,4);rect('steel',19,4,4,1);
  }else{
   // Máquina de cerco — balista com rodas, plataforma reforçada e projétil.
   poly('outline',[[2,17],[5,12],[21,12],[25,17],[25,21],[21,23],[4,22]]);poly('wood',[[4,16],[7,14],[20,14],[23,17],[22,20],[5,20]]);rect('steel',5,15,17,2);
   rect('outline',4,18,7,6);rect('outline',18,18,7,6);
   rect('steel',5,19,5,4);rect('steel',19,19,5,4);
   rect('gold',7,20,1,2);rect('gold',21,20,1,2);
   rect('wood',12,8,4,10);rect('outline',7,5,16,5);
   rect('leather',8,6,14,3);rect('steel',6,4,3,7);rect('steel',22,4,3,7);
   rect('light',11,6,12,1);rect('wood',13,1,2,8);
   rect('steel',13,0,2,4);rect('red',14,2,3,2);
   rect('gold',4,13,5,2);rect('gold',19,13,5,2);
   rect('shadow',12,14,4,5);
  }
  // Entalhes pintados um pixel por vez, com peças distintas para cada tropa.
  // Diferente da troca de renderizador acima, estes pontos mudam de fato a arte.
  const ENGRAVINGS={
   militia:{
    steel:[[6,8],[7,7],[8,7],[10,7],[12,8],[6,9],[8,9],
     [4,16],[4,18],[4,20],[6,21],[13,12],[14,15]],
    light:[[7,8],[9,8],[10,9],[8,11],[9,11],[7,14],[8,15],
     [9,16],[11,18],[5,15],[5,16],[5,19],[14,9]],
    shadow:[[7,10],[11,10],[8,13],[10,14],[12,16],
     [12,19],[8,21],[12,21],[6,19]],
    gold:[[5,17],[5,18],[5,20],[3,19],[6,19],[9,17],
     [10,18],[10,19],[11,17],[12,18]],
    green:[[7,16],[8,17],[8,19],[11,16],[12,17],[12,19]]
   },
   archer:{
    green:[[10,5],[10,6],[9,7],[8,8],[7,9],[12,8],[13,10],
     [6,17],[7,18],[8,19],[9,20],[10,21],[11,22]],
    shadow:[[11,7],[12,9],[8,10],[7,12],[12,15],[13,18],[11,20]],
    light:[[10,8],[11,9],[8,12],[9,13],[9,16],
     [10,17],[11,18],[7,19],[5,12],[4,17]],
    leather:[[14,13],[15,14],[14,16],[15,18],[14,20],[7,21]],
    gold:[[3,9],[2,11],[2,16],[3,18],[14,9],[14,11],
     [15,16],[10,15],[11,16]]
   },
   knight:{
    light:[[11,7],[12,6],[13,5],[14,7],[15,9],[11,10],
     [12,13],[14,14],[8,15],[9,16],[10,17],[15,15],
     [16,16],[7,18],[17,18],[19,19],[20,20]],
    shadow:[[4,18],[6,17],[7,16],[9,19],[11,20],[14,19],
     [16,20],[18,20],[21,17],[19,14]],
    leather:[[5,18],[6,20],[10,21],[12,22],[15,21],
     [17,21],[20,21],[21,16],[22,15]],
    gold:[[9,10],[11,10],[14,10],[15,10],[8,15],
     [9,17],[8,19],[12,16],[14,16]],
    red:[[12,1],[13,0],[14,1],[15,2],[16,3],[14,3]],
    steel:[[20,5],[20,9],[20,13],[19,15],[18,13]]
   },
   siege:{
    wood:[[6,15],[8,16],[11,16],[15,16],[18,17],[21,18],
     [9,19],[12,20],[15,19],[18,20],[13,9],[14,10]],
    shadow:[[4,19],[5,18],[9,20],[18,19],[19,18],
     [23,19],[22,22],[8,22],[12,17],[17,17]],
    steel:[[5,18],[7,19],[8,21],[19,20],[20,21],[22,19],
     [6,5],[7,7],[22,6],[23,8],[13,3]],
    light:[[6,19],[7,20],[20,20],[21,19],
     [9,6],[11,7],[16,7],[19,6],[13,2]],
    gold:[[7,20],[8,20],[20,20],[21,20],
     [4,14],[5,13],[22,13],[23,14]],
    leather:[[11,8],[14,8],[18,8],[10,9],[16,9]]
   }
  };
  const marks=ENGRAVINGS[type]||ENGRAVINGS.militia;
  for(const [shade,points] of Object.entries(marks))
   for(const [px,py] of points)rect(shade,px,py,1,1);
  // Variação por quadro: músculos/penas/ferro brilham nos próprios pixels.
  // A máquina de cerco gira suas rodas; tropas alternam costura e bota.
  if(type==='siege'){
   const wheel=Math.round(Math.sin(t/230));
   rect('gold',7+wheel,21,1,1);
   rect('gold',21-wheel,21,1,1);
   rect('steel',13,Math.max(0,3+wheel),1,1);
  }else{
   const gait=Math.round(Math.sin(t/175+(x+y)*.016));
   const shin=type==='knight'?17:10;
   rect('light',shin+Math.max(0,gait),h-4,1,1);
   rect('shadow',shin+Math.max(0,-gait),h-3,1,1);
  }
  ctx.restore();
 }
 function drawFormation(ctx,units,x,y,now=0,opts={}){
  if(!units)return;
  const kinds=TYPES.filter(type=>(Number(units[type])||0)>0);
  if(!kinds.length)return;
  const warriors=[];
  for(const type of kinds){
   const count=Math.max(0,Math.floor(Number(units[type])||0));
   const visible=Math.min(type==='siege'?2:3,Math.max(1,Math.ceil(count/12)));
   for(let j=0;j<visible;j++)warriors.push({type,j});
  }
  // Cada unidade tem uma posição estável na formação, movimentando-se com o jogador.
  const total=warriors.length;const left=Math.round(x-total*11/2);
  warriors.forEach(({type,j},i)=>{
   const column=i%6,row=Math.floor(i/6);
   figure(ctx,type,left+column*22+row*8,Math.round(y+row*21+13+((i%2)*4)),now+j*130+i*48,type==='siege'?1:2);
  });
  if(opts.label!==false){
   const totalCount=kinds.reduce((n,id)=>n+Math.max(0,Number(units[id])||0),0);
   ctx.save();ctx.font='bold 10px monospace';ctx.textAlign='center';
   ctx.fillStyle='#152c2a';ctx.fillRect(Math.round(x-29),Math.round(y+37),58,13);
   ctx.fillStyle='#f3d99d';ctx.fillText('⚔ '+totalCount+' tropas',Math.round(x),Math.round(y+47));
   ctx.restore();
  }
 }
 root.PeregrinosArmyPixel16=Object.freeze({TYPES,drawFormation,figure});
})(typeof window!=='undefined'?window:globalThis);

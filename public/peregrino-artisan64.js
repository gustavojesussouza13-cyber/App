'use strict';
/*
 * OS PEREGRINOS — Peregrino / sprite autoral desenhado sobre grade 64×80.
 * Contornos modelados como polígonos rasterizados por linha, com clusters
 * desenhados manualmente. Nada é interpolado ou redimensionado.
 * As poses são desenhadas no mesmo espaço, mas espada, pernas e tecido têm
 * silhuetas próprias em cada momento do movimento.
 */
(function(root,factory){
 const art=factory(typeof module==='object'&&module.exports?
  require('./appearance16'):root?.PeregrinosAppearance16);
 if(typeof module==='object'&&module.exports)module.exports=art;
 if(root)root.OsPeregrinosArtisan64=art;
})(typeof globalThis!=='undefined'?globalThis:this,function(APP){
 const WIDTH=64,HEIGHT=80;
 // Paletas intermediárias derivadas da escolha do jogador; evita cabelo
 // loiro em blocos amarelos, ou preto com reflexos castanhos fixos.
 const blend=(a,b,amount)=>{
  if(!/^#[0-9a-f]{6}$/i.test(a)||!/^#[0-9a-f]{6}$/i.test(b))return a;
  const ar=[1,3,5].map(i=>parseInt(a.slice(i,i+2),16));
  const br=[1,3,5].map(i=>parseInt(b.slice(i,i+2),16));
  return '#'+ar.map((v,i)=>Math.round(v*(1-amount)+br[i]*amount).toString(16).padStart(2,'0')).join('');
 };
 const INK='#27242f',SHADOW='#463341',DEEP='#392c35',
  IRON='#4d6574',STEEL='#a9c3c7',WHITE='#fff7df',
  GOLD='#eec477',GOLD_DARK='#8c6244',RED='#aa3544',
  RED_DARK='#692a3d',RED_LIGHT='#eb7860';
 const defaultColors={skin:'#dea978',skinLight:'#f4cf99',skinDark:'#91664f',
  hair:'#50382b',hairLight:'#956044',hairDark:'#2d2730',leather:'#966942',
  leatherLight:'#ce9960',coat:'#86573c',trim:GOLD,eyes:'#493c31',
  shirt:'#e5d2a4',scarf:RED,scarfLight:RED_LIGHT,scarfDark:RED_DARK};
 const moves={idle:[0,0,-1,0],walk:[0,-1,-2,0,-1,-2],
  attack:[0,-2,-2,-1,0],hurt:[-1,0,1],death:[0,1,2,3,4]};
 function draw(g,{role='peregrino',dir=2,action='idle',frame=0,colors={},appearance=null}={}){
  if(role!=='peregrino'||!g||typeof g.fillRect!=='function')return false;
  const a=APP?.normalize(appearance)||{};
  const cfg=APP?.palette(colors,appearance)||colors;
  const c={...defaultColors,coat:cfg.coat||defaultColors.coat,
   hair:cfg.hair||defaultColors.hair,
   hairLight:cfg.hairLight||defaultColors.hairLight,
   skin:cfg.skin||defaultColors.skin,
   skinLight:cfg.skinHighlight||defaultColors.skinLight,
   skinDark:APP?.SKIN?.[a.skin]?.[2]||defaultColors.skinDark,
   leatherLight:cfg.light||defaultColors.leatherLight,
   trim:cfg.trim||GOLD,
   eyes:cfg.eyeColor||defaultColors.eyes,
   gem:cfg.gem||'#83dacb'};
  c.hairShade=blend(c.hair,INK,.57);
  c.hairMid=blend(c.hair,c.hairLight,.45);
  c.coatShade=blend(c.coat,INK,.47);
  c.coatLight=blend(c.coat,c.leatherLight,.4);
  c.leatherShade=blend(c.leather,INK,.53);
  const clothDark=blend(c.coat,INK,.68);
  const pose=Object.hasOwn(moves,action)?action:'idle';
  const frameNo=Number.isFinite(frame)?Math.max(0,Math.floor(frame)):0;
  const frameIndex=frameNo%moves[pose].length;
  const back=dir===0,profile=dir===1||dir===3;
  const jumping=pose==='walk';
  const bob=moves[pose][frameIndex];
  const stride=jumping?[0,3,5,2,-3,-5][frameIndex]:0;
  const flutter=jumping?[0,2,4,2,-2,-3][frameIndex]:
   pose==='attack'?[0,-1,-3,4,2][frameIndex]:[0,1,-1,0][frameIndex%4];
  const attack=pose==='attack';
  const hurt=pose==='hurt';
  const dead=pose==='death';
  const p=(col,x,y,w=1,h=1)=>{
   if(!col||w<1||h<1)return;
   const left=Math.max(0,Math.round(x)),top=Math.max(0,Math.round(y));
   const right=Math.min(WIDTH,Math.round(x)+Math.round(w));
   const bottom=Math.min(HEIGHT,Math.round(y)+Math.round(h));
   if(right<=left||bottom<=top)return;
   g.fillStyle=col;
   g.fillRect(left,top,right-left,bottom-top);
  };
  // Rasterização de arte desenhada manualmente: somente runs inteiros.
  // O scanline evita os cantos retos de fillRect em áreas grandes.
  const poly=(col,points)=>{
   if(!col||points.length<3)return;
   const ys=points.map(pt=>pt[1]),min=Math.max(0,Math.floor(Math.min(...ys))),
    max=Math.min(HEIGHT-1,Math.ceil(Math.max(...ys)));
   for(let y=min;y<=max;y++){
    const xs=[];
    for(let i=0;i<points.length;i++){
     const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length];
     if((ay<=y+.5&&by>y+.5)||(by<=y+.5&&ay>y+.5))
      xs.push(ax+(y+.5-ay)*(bx-ax)/(by-ay));
    }
    xs.sort((x,z)=>x-z);
    for(let i=0;i+1<xs.length;i+=2){
     const x=Math.max(0,Math.ceil(xs[i]-.5)),
      end=Math.min(WIDTH,Math.ceil(xs[i+1]-.5));
     if(end>x)p(col,x,y,end-x,1);
    }
   }
  };
  const highlights=(col,points)=>{for(const [x,y,w=1,h=1]of points)p(col,x,y+bob,w,h)};
  const stroke=(col,x0,y0,x1,y1,width=1)=>{
   let x=Math.round(x0),y=Math.round(y0),
    X=Math.round(x1),Y=Math.round(y1),
    dx=Math.abs(X-x),dy=Math.abs(Y-y),
    sx=x<X?1:-1,sy=y<Y?1:-1,err=dx-dy;
   for(let i=0;i<96;i++){
    p(col,x-Math.floor(width/2),y-Math.floor(width/2),width,width);
    if(x===X&&y===Y)break;
    const e=err*2;
    if(e>-dy){err-=dy;x+=sx}
    if(e<dx){err+=dx;y+=sy}
   }
  };
  if(dir===3){g.save();g.translate(WIDTH,0);g.scale(-1,1)}
  if(dead){
   g.save();g.translate(0,Math.min(10,frameIndex*2));
   g.scale(1,Math.max(.30,1-frameIndex*.16));
  }
  // 1. Capa e cachecol AO FUNDO: a peça vermelha cria uma silhueta reconhecível.
  const cape=a.cape&&a.cape!=='nenhuma'?
   ({vinho:'#75354c',marinho:'#354c73',musgo:'#456547',marfim:'#ddd2b2'})[a.cape]:null;
  const tailX=flutter;
  poly(INK,[[22,29+bob],[46,31+bob],[51,43+bob],[47,55+bob],
   [54,66+bob],[42,69+bob],[37,61+bob],[24,68+bob],
   [13,61+bob],[18,44+bob]]);
  poly(cape||RED_DARK,[[23,30+bob],[44,32+bob],[48,43+bob],
   [45,56+bob],[51,64+bob],[42,65+bob],[37,59+bob],
   [25,65+bob],[16,59+bob],[20,45+bob]]);
  poly(cape||RED,[[25,33+bob],[46,36+bob],[43,49+bob],
   [45,59+bob],[39,55+bob],[36,41+bob]]);
  if(!cape){
   poly(INK,[[19,31+bob],[38,30+bob],[46,34+bob],
    [53+tailX,35+bob],[59+tailX,42+bob],[54+tailX,48+bob],
    [49+tailX,44+bob],[45,39+bob],[21,38+bob]]);
   poly(RED,[[19,33+bob],[37,32+bob],[45,35+bob],
    [52+tailX,36+bob],[56+tailX,42+bob],
    [52+tailX,45+bob],[46,41+bob],[22,37+bob]]);
   poly(RED_LIGHT,[[22,33+bob],[37,33+bob],[47,36+bob],
    [52+tailX,37+bob],[46,38+bob],[25,36+bob]]);
  }else{
   poly(cape,[[20+flutter,40+bob],[24,54+bob],[15,67+bob],
    [11+flutter,73+bob],[8+flutter,65+bob],[14+flutter,46+bob]]);
  }
  // 2. Pés separados: nenhum pixel do corpo toca a borda de canvas.
  for(let i=0;i<2;i++){
   const left=i===0,x0=left?23:36;
   const lift=jumping?(left?Math.max(0,-stride):Math.max(0,stride)):0;
   const sway=jumping?(left?Math.round(stride*.48):-Math.round(stride*.48)):0;
   const x=x0+sway,y=55+Math.round(lift*.5)+bob;
   poly(INK,[[x,y],[x+9,y],[x+11,y+9],[x+10,y+14],
    [x+12,y+17],[x+14,y+18],[x+13,y+21],
    [x-4,y+21],[x-5,y+18],[x-2,y+14],[x-1,y+5]]);
   poly(DEEP,[[x+1,y+2],[x+8,y+2],[x+9,y+12],
    [x+10,y+17],[x+11,y+18],[x-2,y+18],[x,y+12]]);
   poly(c.leather,[[x+2,y+3],[x+7,y+2],[x+9,y+7],
    [x+7,y+12],[x+1,y+12]]);
   poly(c.leatherLight,[[x+2,y+5],[x+5,y+4],[x+4,y+10],[x+2,y+9]]);
   p(GOLD_DARK,x+1,y+12,9,3);p(c.trim,x+3,y+12,4,2);
   p('#f8e3b5',x+4,y+12,2,1);
   p('#533d3d',x-2,y+16,13,2);p('#9b7555',x-2,y+18,12,2);
   p('#d3aa7a',x-2,y+19,5,1);
   // Joelheiras de metal, couro costurado, fendas entre as botas.
   p(INK,x+1,y+1,8,2);p(c.trim,x+2,y+2,5,1);
   for(let k=0;k<3;k++)p('#d4b58c',x+2+k*2,y+9+(k%2),1,1);
  }
  // 3. Silhueta de tronco triangular e casaco assimétrico.
  poly(INK,[[25,34+bob],[42,34+bob],[48,38+bob],
   [50,51+bob],[46,56+bob],[48,63+bob],
   [37,65+bob],[33,59+bob],[28,65+bob],[19,62+bob],
   [21,53+bob],[17,42+bob]]);
  poly(c.coatShade,[[25,36+bob],[44,36+bob],[48,40+bob],[46,55+bob],[41,63+bob],[26,65+bob],[19,56+bob]]);
  poly(c.coat,[[26,35+bob],[42,36+bob],[47,39+bob],
   [46,49+bob],[44,55+bob],[45,60+bob],
   [37,62+bob],[34,55+bob],[28,62+bob],
   [21,59+bob],[24,50+bob],[20,41+bob]]);
  poly(c.leatherLight,[[24,37+bob],[30,36+bob],[28,47+bob],
   [25,54+bob],[22,56+bob],[23,44+bob]]);
  poly(c.shirt,[[29,36+bob],[41,37+bob],[43,50+bob],
   [38,54+bob],[29,51+bob]]);
  poly(blend(c.shirt,c.leather,.38),[[30,37+bob],[36,38+bob],[33,50+bob],
   [29,48+bob]]);
  poly(c.coatShade,[[39,37+bob],[44,41+bob],[41,48+bob],
   [38,44+bob]]);
  // Camada de couro, costuras e sombras em diagonal.
  stroke(INK,28,39+bob,41,51+bob,5);
  stroke(c.leather,28,39+bob,41,51+bob,3);
  stroke(c.leatherLight,28,39+bob,41,51+bob,1);
  highlights(c.trim,[[29,40],[33,44],[38,49],[22,51,3,1],[43,43,2,1]]);
  highlights('#fce0ae',[[29,40],[34,45],[39,50],[23,46,1,2]]);
  // Barrigueira e bainha com cortes que interrompem as retas do torso.
  poly(INK,[[20,51+bob],[45,51+bob],[46,59+bob],
   [40,57+bob],[35,62+bob],[30,56+bob],[23,61+bob],[20,58+bob]]);
  poly(c.leatherShade,[[20,52+bob],[46,52+bob],[46,60+bob],[39,59+bob],[30,60+bob],[20,60+bob]]);
  poly(c.leather,[[21,53+bob],[44,53+bob],[44,56+bob],
   [39,56+bob],[35,59+bob],[30,55+bob],[22,58+bob]]);
  p(c.trim,30,52+bob,9,6);p(INK,32,53+bob,5,4);
  p('#fff0c0',31,53+bob,2,1);
  p(c.leatherLight,23,53+bob,6,1);
  for(let x=22;x<=43;x+=3)p('#e8c394',x,57+bob+(x%2),1,1);
  poly(c.coat,[[22,58+bob],[29,57+bob],[27,66+bob],
   [24,63+bob],[19,68+bob],[21,62+bob]]);
  poly(c.leather,[[39,57+bob],[45,56+bob],[48,66+bob],
   [43,64+bob],[39,66+bob]]);
  highlights(c.trim,[[23,62,3,1],[42,61,3,1],[25,65,2,1]]);
  // 4. Mochila lateral e bolsa pequena para reforçar a função de aventureiro.
  poly(INK,[[44,42+bob],[51,42+bob],[55,47+bob],
   [55,61+bob],[51,64+bob],[44,62+bob],[42,52+bob]]);
  poly(c.leatherShade,[[45,43+bob],[51,44+bob],[53,48+bob],
   [53,61+bob],[46,60+bob],[44,53+bob]]);
  poly(c.leatherLight,[[46,44+bob],[50,44+bob],[53,47+bob],
   [52,51+bob],[45,51+bob]]);
  p(INK,46,52+bob,7,3);p('#b58b58',47,53+bob,6,1);
  p('#856343',46,55+bob,5,3);
  p(c.coatLight,48,47+bob,4,2);p(c.leatherShade,47,57+bob,5,3);
  p(c.trim,49,52+bob,3,4);p(WHITE,50,53+bob,1,1);
  highlights('#d2a473',[[46,56],[48,59],[51,58],[52,61]]);
  // 5. Ombreiras desenhadas sobre o tronco e braços em perspectiva.
  poly(INK,[[18,34+bob],[26,33+bob],[29,37+bob],
   [27,44+bob],[21,45+bob],[17,42+bob]]);
  poly(c.leatherShade,[[18,35+bob],[28,34+bob],[29,40+bob],[25,45+bob],[18,43+bob]]);
  poly(c.leather,[[19,35+bob],[26,35+bob],[27,38+bob],
   [25,42+bob],[20,42+bob]]);
  poly(c.leatherLight,[[19,36+bob],[24,35+bob],[26,37+bob],
   [23,38+bob],[20,38+bob]]);
  p(c.trim,21,37+bob,4,2);p(WHITE,22,37+bob,1,1);
  poly(INK,[[43,34+bob],[50,35+bob],[53,40+bob],
   [49,44+bob],[44,43+bob]]);
  poly(c.leatherShade,[[43,35+bob],[51,36+bob],[54,40+bob],[48,45+bob],[43,44+bob]]);
  poly(c.leather,[[44,36+bob],[49,37+bob],[51,40+bob],
   [47,42+bob],[44,41+bob]]);
  highlights(c.leatherLight,[[44,37,4,1],[47,39,3,1]]);
  const swing=jumping?[0,2,3,1,-2,-3][frameIndex]:attack?
   [0,-1,-4,4,2][frameIndex]:0;
  poly(INK,[[18,41+bob],[25,42+bob],[24,50+bob+swing],
   [23,54+bob+swing],[16,53+bob+swing],[15,47+bob]]);
  poly(c.leatherShade,[[17,42+bob],[24,42+bob],[24,51+bob+swing],[18,54+bob+swing]]);
  poly(c.leather,[[18,43+bob],[23,43+bob],[22,52+bob+swing],
   [18,51+bob+swing],[17,47+bob]]);
  p(c.leatherLight,18,44+bob,3,6);p(c.trim,18,51+bob+swing,5,2);
  poly(INK,[[47,42+bob],[53,43+bob],[55,55+bob-swing],
   [51,57+bob-swing],[45,51+bob]]);
  poly(c.leatherShade,[[47,42+bob],[53,42+bob],[55,55+bob-swing],[49,57+bob-swing]]);
  poly(c.leather,[[48,43+bob],[51,44+bob],[53,54+bob-swing],
   [49,54+bob-swing],[47,49+bob]]);
  highlights(c.leatherLight,[[48,44,3,2],[49,50,2,3]]);
  p(c.trim,49,54+bob-swing,4,2);
  // 6. Cachecol frontal sobreposto ao peitoral e às ombreiras.
  poly(INK,[[23,29+bob],[43,28+bob],[48,33+bob],
   [45,39+bob],[39,40+bob],[36,36+bob],
   [27,40+bob],[19,36+bob]]);
  poly(RED_DARK,[[24,30+bob],[42,30+bob],[46,34+bob],
   [43,38+bob],[38,37+bob],[35,35+bob],
   [27,38+bob],[21,35+bob]]);
  poly(RED,[[24,31+bob],[41,31+bob],[45,34+bob],
   [40,35+bob],[34,34+bob],[27,36+bob],[22,34+bob]]);
  poly(RED_LIGHT,[[25,31+bob],[39,31+bob],[43,33+bob],
   [30,33+bob]]);
  poly(INK,[[41,35+bob],[47,36+bob],[48,44+bob],
   [44,49+bob],[41,46+bob]]);
  poly(RED,[[42,36+bob],[46,37+bob],[46,44+bob],
   [44,47+bob],[42,44+bob]]);
  p(RED_LIGHT,43,37+bob,2,6);
  // Tecido em três planos: a dobra recebe luz, a ponta tem peso e vento.
  stroke(RED_DARK,26,36+bob,39,36+bob,2);
  stroke(RED_LIGHT,25,33+bob,39,32+bob,1);
  p('#f79578',29,32+bob,6,1);
  p(RED_DARK,43+flutter,43+bob,3,3);
  p(RED,44+flutter,44+bob,2,5);
  p(RED_LIGHT,45+flutter,45+bob,1,3);
  p('#ba6050',27,33+bob,6,2);
  p('#9e4350',44,40+bob,2,5);
  // 7. Face com crânio recortado, maçãs do rosto, pálpebra e boca.
  poly(INK,[[25,13+bob],[39,11+bob],[46,16+bob],[47,25+bob],
   [43,32+bob],[36,35+bob],[27,32+bob],[22,25+bob]]);
  if(back){
   poly(c.hairShade,[[24,13+bob],[41,12+bob],[47,20+bob],[45,30+bob],[37,35+bob],[24,29+bob]]);
   poly(c.hair,[[25,14+bob],[39,12+bob],[45,17+bob],
    [44,30+bob],[37,34+bob],[26,30+bob],[23,22+bob]]);
   highlights(c.hairMid,[[27,15,6,2],[35,13,5,2],[25,21,3,5],[39,23,4,2]]);
   highlights(c.hairLight,[[29,14,3,1],[37,13,2,1],[25,22,1,3]]);
   stroke(c.hairLight,29,17+bob,30,29+bob,2);
   stroke(c.hairLight,38,17+bob,39,28+bob,2);
  }else{
   poly(c.skinDark,[[27,16+bob],[40,15+bob],[44,19+bob],
    [44,27+bob],[40,32+bob],[30,32+bob],[25,26+bob]]);
   poly(c.skin,[[27,17+bob],[39,16+bob],[43,20+bob],
    [42,28+bob],[39,31+bob],[30,30+bob],[27,26+bob]]);
   poly(c.skinLight,[[28,18+bob],[36,17+bob],[38,21+bob],
    [34,23+bob],[29,23+bob]]);
   highlights(c.skinLight,[[28,24,2,2],[32,27,3,2],[36,27,2,1]]);
   p(c.skinDark,40,21+bob,3,7);
   // Cabelo volumoso com franja de três pontas irregulares.
   const shaved=a.hairStyle==='raspado',wind=jumping?
    [0,1,-1,0,1,-1][frameIndex]:attack?[0,-1,-2,2,1][frameIndex]:0;
   if(!shaved){
    poly(INK,[[20+wind,15+bob],[25+wind,11+bob],[29+wind,8+bob],
     [33+wind,10+bob],[38+wind,7+bob],[44+wind,13+bob],
     [48+wind,16+bob],[45+wind,23+bob],[40+wind,21+bob],
     [38+wind,27+bob],[35+wind,22+bob],[29+wind,26+bob],
     [25+wind,22+bob],[21+wind,28+bob]]);
    poly(c.hairShade,[[21+wind,14+bob],[29+wind,9+bob],[35+wind,10+bob],
     [39+wind,7+bob],[45+wind,12+bob],[47+wind,20+bob],[42+wind,25+bob],
     [36+wind,23+bob],[30+wind,28+bob],[24+wind,25+bob]]);
    poly(c.hair,[[22+wind,16+bob],[27+wind,12+bob],
     [31+wind,9+bob],[34+wind,13+bob],[39+wind,10+bob],
     [44+wind,15+bob],[46+wind,19+bob],[41+wind,20+bob],
     [38+wind,25+bob],[34+wind,20+bob],[28+wind,24+bob],
     [26+wind,19+bob],[22+wind,24+bob]]);
    poly(c.hairMid,[[25+wind,13+bob],[30+wind,10+bob],
     [34+wind,13+bob],[32+wind,16+bob],[26+wind,17+bob]]);
    highlights(c.hairMid,[[36+wind,12,4,2],[41+wind,16,3,2],
     [23+wind,20,2,3],[30+wind,18,2,2]]);
    highlights(c.hairLight,[[31+wind,10,2,1],[38+wind,10,2,1],
     [27+wind,14,3,1],[42+wind,17,1,2]]);
    p(c.hairLight,30+wind,12+bob,2,1);
    if(['medio','longo','rabo','tranca'].includes(a.hairStyle)){
     poly(INK,[[42,19+bob],[47,20+bob],[49,29+bob],
      [47,37+bob],[43,43+bob],[40,34+bob]]);
     poly(c.hairShade,[[43,21+bob],[46,24+bob],[47,32+bob],[43,41+bob],
      [41,33+bob]]);
     poly(c.hair,[[44,23+bob],[46,25+bob],[46,34+bob],
      [43,38+bob]]);
     p(c.hairMid,44,24+bob,1,10);
     if(a.hairStyle==='longo'){
      poly(INK,[[21,18+bob],[26,18+bob],[25,32+bob],[23,43+bob],
       [19,45+bob],[18,36+bob]]);
      poly(c.hairShade,[[22,19+bob],[25,20+bob],[24,32+bob],
       [21,42+bob],[20,38+bob]]);
      poly(c.hair,[[23,20+bob],[25,22+bob],[23,32+bob],
       [21,40+bob],[21,28+bob]]);
      p(c.hairMid,23,26+bob,1,9);
     }
     if(a.hairStyle==='tranca'||a.hairStyle==='rabo'){
      for(let i=0;i<4;i++)p(i%2?c.hair:c.hairLight,44+(i%2),32+i*4+bob,4,4);
     }
    }
   }else{
    poly(c.hair,[[27,14+bob],[39,14+bob],[42,17+bob],
     [30,17+bob],[25,19+bob]]);
    p(c.hairMid,30,14+bob,8,1);p(c.hairLight,34,14+bob,3,1);
   }
   if(!profile){
    // Olhos com branco, sombra da pálpebra, íris e um brilho único.
    p(INK,28,22+bob,6,2);p(INK,37,21+bob,6,2);
    p(c.skinDark,27,24+bob,1,3);p(c.skinDark,43,23+bob,1,3);
    p('#fff2d7',29,25+bob,4,2);p('#fff2d7',38,24+bob,4,2);
    p(c.eyes,30,24+bob,2,3);p(c.eyes,39,23+bob,2,3);
    p('#fcfff7',30,24+bob,1,1);
    p('#fcfff7',39,23+bob,1,1);
    p(c.skinLight,26,26+bob,2,2);p(c.skinDark,41,28+bob,2,1);
    p(c.skinDark,34,26+bob,2,2);p(c.skinLight,34,26+bob,1,1);
    p('#603c3f',32,30+bob,7,1);p(c.skinLight,34,31+bob,3,1);
    p(c.skinDark,31,29+bob,2,1);p(c.skinLight,39,29+bob,2,1);
    if(attack&&(frameIndex===2||frameIndex===3)){
     p(INK,31,30+bob,8,1);p(c.skinLight,33,31+bob,3,1);
    }
   }else{
    p(INK,39,22+bob,5,2);p('#fff4dd',40,24+bob,3,2);
    p(c.eyes,42,24+bob,2,2);p(c.skinLight,43,27+bob,3,1);
    p(c.skinDark,42,29+bob,3,1);
   }
   if(hurt)p('#7a353e',35,30+bob,4,2);
  }
  // Costura da nuca/amarração do lenço.
  p(RED_DARK,27,31+bob,11,3);
  p(RED_LIGHT,29,31+bob,6,1);
  // Costas: alças cruzadas e mochila de viagem, sem repetir o peitoral frontal.
  if(back){
   poly(INK,[[26,38+bob],[45,38+bob],[47,53+bob],
    [42,61+bob],[29,61+bob],[24,52+bob]]);
   poly(c.leatherShade,[[28,40+bob],[43,40+bob],[45,52+bob],
    [41,59+bob],[30,59+bob],[26,51+bob]]);
   poly(c.leather,[[29,42+bob],[42,42+bob],[44,51+bob],
    [40,57+bob],[30,57+bob],[28,50+bob]]);
   stroke(INK,28,41+bob,43,55+bob,4);
   stroke(c.leatherLight,28,41+bob,43,55+bob,2);
   stroke(INK,43,41+bob,28,55+bob,4);
   stroke(c.leatherLight,43,41+bob,28,55+bob,2);
   p(c.trim,33,46+bob,5,5);p(INK,34,47+bob,3,3);
   p(WHITE,35,47+bob,1,1);
  }
  // Acessórios fazem parte do save, mas antes não eram desenhados.
  if(a.accessory==='tiara'){
   stroke(c.trim,26,16+bob,42,15+bob,2);
   p(c.gem,32,13+bob,5,4);p(WHITE,34,13+bob,1,1);
  }else if(a.accessory==='brinco'&&!back){
   p(c.trim,43,27+bob,2,4);p(WHITE,44,29+bob,1,1);
  }else if(a.accessory==='amuleto'&&!back){
   stroke(c.trim,31,37+bob,37,39+bob,1);
   p(c.trim,34,38+bob,5,5);p(c.gem,35,39+bob,3,3);
   p(WHITE,36,39+bob,1,1);
  }
  // 8. Espada: lâmina diagonal com largura e ponta em triângulo.
  // Nunca deixar haste vertical no idle como na versão anterior.
  const poses=[
   [[21,45],[6,19]],   // antecipação imediata, nunca igual ao idle
   [[22,45],[9,15]],   // prepara o braço acima do ombro
   [[30,38],[8,12]],   // corte ascendente
   [[35,41],[60,22]],  // impacto à frente
   [[25,49],[55,49]]   // recuperação horizontal
  ];
  const hand=attack?poses[frameIndex]:[[17,52],[2,73]];
  const [[hx,hy],[tx,ty]]=hand;
  // A mão não flutua longe do corpo: a braçadeira segue o punho.
  if(attack){
   stroke(INK,19,44+bob,hx,hy,10);
   stroke(c.leatherShade,19,44+bob,hx,hy,7);
   stroke(c.leatherLight,19,44+bob,hx,hy,3);
   p(c.trim,21,42+bob,3,2);
  }
  const vx=tx-hx,vy=ty-hy,length=Math.max(1,Math.hypot(vx,vy));
  const nx=-vy/length,ny=vx/length;
  // Ponta triangular no sentido do movimento e guarda perpendicular.
  const by=hx+vx*.11,bz=hy+vy*.11;
  const sx=hx+vx*.92,sy=hy+vy*.92;
  const wide=3.2;
  poly(INK,[[by+nx*wide*1.6,bz+ny*wide*1.6],
   [sx+nx*wide*1.3,sy+ny*wide*1.3],[tx,ty],
   [sx-nx*wide*1.3,sy-ny*wide*1.3],
   [by-nx*wide*1.6,bz-ny*wide*1.6]]);
  poly(IRON,[[by+nx*3,bz+ny*3],[sx+nx*2.8,sy+ny*2.8],
   [tx-1,ty],[sx-nx*2.8,sy-ny*2.8],
   [by-nx*3,bz-ny*3]]);
  poly(STEEL,[[by+nx*2,bz+ny*2],[sx+nx*1.4,sy+ny*1.4],
   [tx,ty],[sx-nx*.3,sy-ny*.3],
   [by-nx*.1,bz-ny*.1]]);
  stroke(WHITE,by+nx*1.5,bz+ny*1.5,
   sx+nx*.5,sy+ny*.5,1);
  stroke(INK,hx-nx*8,hy-ny*8,hx+nx*8,hy+ny*8,4);
  stroke(GOLD_DARK,hx-nx*7,hy-ny*7,hx+nx*7,hy+ny*7,3);
  p(WHITE,Math.round(hx+nx*5),Math.round(hy+ny*5),2,1);
  const gripX=hx-vx/length*9,gripY=hy-vy/length*9;
  stroke(INK,hx,hy,gripX,gripY,5);
  stroke('#995e3e',hx,hy,gripX,gripY,3);
  p(GOLD,gripX-2,gripY-2,5,4);
  p(WHITE,gripX-1,gripY-1,2,1);
  // A mão posiciona-se na empunhadura em cada pose.
  poly(INK,[[hx-5,hy-4],[hx+3,hy-5],
   [hx+6,hy+2],[hx+1,hy+6],[hx-5,hy+3]]);
  poly(c.leather,[[hx-3,hy-3],[hx+3,hy-3],
   [hx+4,hy+2],[hx,hy+4],[hx-3,hy+2]]);
  p(c.leatherLight,hx-2,hy-3,3,2);
  p(GOLD_DARK,hx+1,hy+1,3,1);
  if(attack&&(frameIndex===2||frameIndex===3)){
   const arc=frameIndex===2?
    [[5,8],[10,5],[17,4],[25,5],[34,9],[41,13]]:
    [[42,10],[50,12],[56,16],[59,21],[59,28],[54,35]];
   for(const [x,y]of arc){
    p('#60c8e5',x,y+bob,3,2);
    p('#d9fff9',x,y+bob,1,1);
   }
   p(WHITE,Math.round(tx),Math.round(ty),3,3);
  }
  if(hurt)p('#e27768',21,40+bob,5,3);
  if(dead)g.restore();
  if(dir===3)g.restore();
  return true;
 }
 return Object.freeze({WIDTH,HEIGHT,VERSION:'peregrino-artisan64-v4',draw});
});

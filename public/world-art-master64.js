'use strict';
/*
 * OS PEREGRINOS — Bestiário e habitantes, atelier autoral 64×80.
 * Cada família recebe contorno, iluminação e equipamento em pixel clusters
 * rasterizados na grade inteira. Sem blur, recursos externos ou temporizadores.
 * Somente arte: não altera vidas, níveis, drops, colisão nem save.
 */
(function(root,factory){
 const api=factory(
  typeof module==='object'&&module.exports?require('./character-atelier16'):root?.OsPeregrinosCharacterAtelier,
  null
 );
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosWorldMaster64=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(ATELIER){
 const WIDTH=64,HEIGHT=80;
 const INK='#272433',PAPER='#fff0d0',GOLD='#e4bf78',DARK='#433743';
 const BASE={
  limo:['#267359','#57d97b','#bafda0','#ffe8b4','slime'],
  lobo:['#333846','#68647b','#b1a2bd','#ffcb83','wolf'],
  fera:['#513a40','#98735c','#d3aa78','#f3dbaf','wolf'],
  morcego:['#29243c','#745482','#b68dc6','#efbdff','bat'],
  vespa:['#3b2d36','#c99d47','#fbe58b','#e5faff','bat'],
  esqueleto:['#554750','#d0c5a8','#fff0ca','#b2ebef','skeleton'],
  aranha:['#342935','#815264','#d68a83','#ff726b','spider'],
  escorpiao:['#49333d','#ba845d','#e1b984','#ffdda4','spider'],
  golem:['#394c56','#778996','#b8c5c5','#73ebf3','golem'],
  sentinela:['#263d50','#6086a1','#a3cccf','#8eecff','golem'],
  cavaleiro:['#343547','#6c7a9d','#b8c8d7','#ffe6a4','skeleton'],
  chefe:['#3a2945','#76538b','#c7aed6','#d7b0ff','skeleton'],
  serpente:['#2a4e3e','#70a474','#bfe4a5','#ffe0a6','snake'],
  fantasma:['#453963','#8278b8','#c1bcf7','#f0e9ff','ghost'],
  dragao:['#4b2f32','#a54340','#f38b55','#fff0a0','dragon']
 };
 const hash=(name)=>{
  let n=2166136261;
  for(const ch of String(name||'')){n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0}
  return n>>>0;
 };
 const hexMix=(a,b,ratio)=>{
  if(!/^#[0-9a-f]{6}$/i.test(a)||!/^#[0-9a-f]{6}$/i.test(b))return a;
  return '#'+[1,3,5].map(i=>Math.round(
   parseInt(a.slice(i,i+2),16)*(1-ratio)+parseInt(b.slice(i,i+2),16)*ratio
  ).toString(16).padStart(2,'0')).join('');
 };
 function palette(g){
  const pix=(col,x,y,w=1,h=1)=>{
   if(!col||w<=0||h<=0)return;
   const x0=Math.max(0,Math.round(x)),y0=Math.max(0,Math.round(y)),
    x1=Math.min(WIDTH,Math.round(x+w)),y1=Math.min(HEIGHT,Math.round(y+h));
   if(x1<=x0||y1<=y0)return;
   g.fillStyle=col;g.fillRect(x0,y0,x1-x0,y1-y0);
  };
  const poly=(col,points)=>{
   const lo=Math.max(0,Math.floor(Math.min(...points.map(x=>x[1]))));
   const hi=Math.min(79,Math.ceil(Math.max(...points.map(x=>x[1]))));
   for(let y=lo;y<=hi;y++){
    const xs=[];
    for(let i=0;i<points.length;i++){
     const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length];
     if((ay<=y+.5&&by>y+.5)||(by<=y+.5&&ay>y+.5))
      xs.push(ax+(y+.5-ay)*(bx-ax)/(by-ay));
    }
    xs.sort((a,b)=>a-b);
    for(let i=0;i+1<xs.length;i+=2){
     const first=Math.ceil(xs[i]-.5),last=Math.ceil(xs[i+1]-.5);
     pix(col,first,y,last-first,1);
    }
   }
  };
  const line=(col,x0,y0,x1,y1,sz=1)=>{
   let x=Math.round(x0),y=Math.round(y0),X=Math.round(x1),Y=Math.round(y1);
   const dx=Math.abs(X-x),dy=Math.abs(Y-y),sx=x<X?1:-1,sy=y<Y?1:-1;
   let error=dx-dy;
   for(let i=0;i<100;i++){
    pix(col,x-Math.floor(sz/2),y-Math.floor(sz/2),sz,sz);
    if(x===X&&y===Y)break;
    const e=2*error;
    if(e>-dy){error-=dy;x+=sx}
    if(e<dx){error+=dx;y+=sy}
   }
  };
  return {p:pix,poly,line};
 }
 const pulse=(action,frame)=>action==='walk'?[0,-2,-3,-1,1,2][frame%6]:
  action==='attack'?[0,-2,-5,-2,0][frame%5]:
  action==='hurt'?[0,2,1][frame%3]:action==='idle'?[0,-1,0,1][frame%4]:0;
 const part=(g,dir,action,frame,render)=>{
  const turn=dir===3;
  if(turn){g.save();g.translate(WIDTH,0);g.scale(-1,1)}
  if(action==='death'){g.save();g.translate(0,Math.min(9,frame*2));g.scale(1,Math.max(.3,1-frame*.17))}
  render();
  if(action==='death')g.restore();
  if(turn)g.restore();
 };
 // Profissões agrupadas pela função, com fidelidade às 56 identidades legadas.
 const job=(style)=>{
  if(/ferreir|fornalha|escavad|mestre-cinzas/.test(style))return'forge';
  if(/guarda|sentinela|vigia|porteiro|juiz|guardia/.test(style))return'guard';
  if(/cura|sacerd|pontifice|sementeira|regente|afinador/.test(style))return'healer';
  if(/bibliotec|escrib|carta|copista|histori|relator|ancia|s[aá]bio|conselh|ouvinte/.test(style))return'scholar';
  if(/jardin|pesc|barque|colhed|padeira|tecel|marinheir|mercad|vende/.test(style))return'trader';
  return'traveler';
 };
 function npc(g,{npc={},dir=2,action='idle',frame=0}={}){
  if(!g?.fillRect)return false;
  const style=ATELIER?.npcStyle?.(npc)||String(npc.role||'viajante');
  const tones=ATELIER?.NPC_FAMILY?.[style]||['#7a6756','#e0d1b0','#bb955d','#e3ab88','#45383d'];
  const id=hash(npc.id||npc.name||style),profession=job(style);
  const [robe,light,trim,skin,dark]=tones;
  const ink=hexMix(dark,INK,.54),robeShade=hexMix(robe,INK,.47);
  const hair=['#49332f','#98724c','#474750','#c7a66d'][id%4];
  const n=Math.max(0,Math.floor(frame)),off=pulse(action,n);
  const leg=action==='walk'?[0,3,5,2,-3,-5][n%6]:0;
  const {p,poly,line}=palette(g),back=dir===0,side=dir===1||dir===3;
  part(g,dir,action,n,()=>{
   // Manto recortado com bainhas e sombras diferentes por profissão.
   poly(ink,[[23,30+off],[45,30+off],[51,40+off],
    [48,58+off],[54,70+off],[43,74+off],[36,67+off],
    [24,74+off],[13,69+off],[20,46+off]]);
   poly(robeShade,[[24,33+off],[45,32+off],[48,42+off],
    [46,61+off],[50,69+off],[42,70+off],[36,64+off],
    [26,70+off],[16,67+off],[22,44+off]]);
   poly(robe,[[26,33+off],[43,33+off],[46,42+off],
    [44,60+off],[38,66+off],[27,69+off],[20,65+off],[23,43+off]]);
   poly(light,[[25,35+off],[31,35+off],[30,50+off],
    [25,59+off],[22,58+off],[23,42+off]]);
   // Duas botas articuladas.
   for(const [x,step]of [[23,Math.max(0,leg)],[37,Math.max(0,-leg)]]){
    const yy=57+Math.round(step*.42);
    poly(ink,[[x,yy],[x+8,yy],[x+9,yy+13],
     [x+12,yy+18],[x+10,yy+21],[x-5,yy+21],[x-4,yy+17]]);
    poly(dark,[[x+1,yy+2],[x+7,yy+2],[x+8,yy+17],
     [x-3,yy+17]]);
    p(trim,x+2,yy+10,5,2);p(light,x-2,yy+18,7,1);
   }
   // Faixas diagonais e cinto, inconfundíveis em 64px.
   line(ink,24,37+off,42,55+off,5);
   line(trim,24,37+off,42,55+off,2);
   p(ink,20,51+off,30,5);p(trim,23,52+off,24,2);
   p(light,32,52+off,5,3);
   // Ombreiras assimétricas, luvas e mangas.
   for(const sideX of [13,46]){
    poly(ink,[[sideX+3,33+off],[sideX+11,34+off],
     [sideX+12,43+off],[sideX+7,53+off],[sideX,51+off]]);
    poly(robe,[[sideX+4,35+off],[sideX+9,36+off],
     [sideX+9,45+off],[sideX+5,49+off],[sideX+2,46+off]]);
    p(light,sideX+4,36+off,4,2);
    p(trim,sideX+3,48+off,6,2);
   }
   // Penteado, rosto e olhos; a barba é específica do sábio.
   poly(ink,[[23,14+off],[37,11+off],[44,16+off],
    [47,25+off],[42,34+off],[28,34+off],[21,26+off]]);
   if(back){
    poly(hair,[[25,14+off],[37,13+off],[43,17+off],
     [43,30+off],[28,32+off],[23,24+off]]);
    p(light,27,17+off,5,2);
   }else{
    poly(skin,[[26,18+off],[39,17+off],[43,21+off],
     [41,30+off],[37,33+off],[28,30+off],[24,24+off]]);
    p(light,27,21+off,6,2);
    poly(hair,[[23,17+off],[28,12+off],[38,12+off],
     [45,18+off],[43,23+off],[38,21+off],[34,24+off],
     [28,21+off],[23,26+off]]);
    p(hexMix(hair,PAPER,.32),27,14+off,8,2);
    if(!side){
     p(ink,28,25+off,4,2);p(ink,37,24+off,4,2);
     p(PAPER,29,26+off,2,1);p(PAPER,38,25+off,2,1);
     p(dark,33,30+off,6,1);
    }else{p(ink,39,24+off,4,2);p(PAPER,40,25+off,2,1)}
    if(profession==='scholar'){
     poly(light,[[28,30+off],[40,29+off],[41,40+off],
      [35,45+off],[29,39+off]]);
     p(ink,31,34+off,8,1);p(trim,33,39+off,3,2);
    }
   }
   // Cada ofício adiciona sua ferramenta, em vez de recolorir o mesmo herói.
   if(profession==='forge'){
    p(ink,8,49+off,11,4);p('#869b9b',9,49+off,10,3);
    line('#71513e',14,49+off,10,65+off,4);
    p(PAPER,10,51+off,2,1);
    p('#bd9e68',44,46+off,6,4);p(ink,46,45+off,2,2);
   }else if(profession==='guard'){
    line(ink,8,12+off,8,72+off,4);
    line('#d5d9c5',7,13+off,7,42+off,2);
    poly(PAPER,[[8,7+off],[12,15+off],[5,15+off]]);
    poly(ink,[[43,42+off],[56,43+off],[56,58+off],
     [50,67+off],[43,58+off]]);
    poly('#466fa1',[[45,45+off],[54,45+off],
     [54,57+off],[50,64+off],[45,57+off]]);
    p(trim,48,50+off,5,3);
   }else if(profession==='healer'){
    line(ink,54,13+off,54,74+off,5);
    line('#ab7957',54,18+off,54,70+off,3);
    poly('#65bfd1',[[54,7+off],[60,15+off],[55,25+off],
     [49,15+off]]);
    p('#e5fcff',53,12+off,2,5);
    p(trim,51,23+off,8,3);
   }else if(profession==='scholar'){
    poly(ink,[[3,45+off],[15,45+off],[17,62+off],[5,63+off]]);
    poly('#ccb88f',[[5,47+off],[13,47+off],[15,60+off],[6,61+off]]);
    line('#775b4f',9,49+off,10,58+off,2);
    p(PAPER,6,47+off,4,1);
   }else if(profession==='trader'){
    poly(ink,[[46,44+off],[59,42+off],[63,49+off],
     [61,64+off],[47,66+off]]);
    poly('#997249',[[49,45+off],[58,44+off],[61,49+off],
     [59,62+off],[48,62+off]]);
    p(trim,51,46+off,7,3);p(PAPER,54,47+off,2,1);
    p(light,52,55+off,7,2);
   }else{
    poly(ink,[[4,45+off],[18,43+off],[20,58+off],[16,65+off],[5,62+off]]);
    poly('#8c6447',[[7,46+off],[16,46+off],[18,57+off],[14,62+off],[7,60+off]]);
    p(trim,9,49+off,7,3);
   }
   // Símbolos individuais determinísticos, consistentes a cada sessão.
   for(let bit=0;bit<6;bit++){
    const lit=(id>>>bit)&1;
    p(lit?trim:dark,25+bit*3,57+off+(bit%2)*2,2,2);
   }
  });
  return true;
 }
 function creature(g,{type='limo',dir=2,action='idle',frame=0,boss=false,zone=0,species=0}={}){
  if(!g?.fillRect)return false;
  const spec=BASE[type]||BASE.limo,[deep,base,light,eye,shape]=spec;
  const shade=hexMix(deep,INK,.42),shine=hexMix(light,PAPER,.38);
  const num=Math.max(0,Math.floor(frame));
  const move=pulse(action,num),variant=hash(type+':'+species+':'+zone);
  const swing=action==='walk'?[0,3,5,2,-3,-4][num%6]:0;
  const atk=action==='attack'?[0,1,3,4,2][num%5]:0;
  const {p,poly,line}=palette(g);
  part(g,dir,action,num,()=>{
   const y=move;
   if(shape==='slime'||shape==='ghost'){
    // Silhueta arredondada e bordas quebradas em vez de duas caixas.
    poly(shade,[[13,65+y],[11,53+y],[16,38+y],[24,29+y],
     [38,28+y],[48,35+y],[54,48+y],[53,65+y],
     [47,71+y],[36,68+y],[27,73+y],[18,69+y]]);
    poly(base,[[14,64+y],[15,49+y],[20,39+y],[27,33+y],
     [37,31+y],[46,39+y],[51,49+y],[50,65+y],
     [45,68+y],[35,65+y],[27,70+y],[18,66+y]]);
    poly(light,[[19,45+y],[24,36+y],[35,33+y],
     [40,37+y],[35,43+y],[26,47+y]]);
    p(shine,24,37+y,7,2);
    if(shape==='ghost'){
     poly(shade,[[13,61+y],[10,71+y],[19,67+y],[24,76+y],
      [32,68+y],[38,77+y],[48,67+y],[55,75+y],[52,60+y]]);
     p(light,20,67+y,7,2);p(shine,39,69+y,5,2);
    }else for(const [x,k]of [[11,0],[26,1],[41,2]]){
     p(shine,x+variant%3,64+y+k%3,4,2);
     p(base,x+2,68+y,5,3);
    }
    p(shade,24,50+y,6,7);p(shade,40,49+y,6,7);
    p(eye,26,51+y,4,3);p(eye,42,50+y,3,3);
    p(shade,33,61+y,7,2);
   }else if(shape==='wolf'||shape==='dragon'){
    // Corpo robusto, focinho separado e pernas com contrapeso.
    poly(shade,[[8,48+y],[16,35+y],[23,39+y],[29,27+y],
      [40,32+y],[51,36+y],[57,49+y],[52,65+y],
      [43,67+y],[37,59+y],[26,67+y],[16,60+y]]);
    poly(base,[[10,48+y],[18,38+y],[27,42+y],[31,29+y],
      [39,35+y],[50,38+y],[54,50+y],[49,61+y],
      [38,59+y],[26,62+y],[18,57+y]]);
    poly(light,[[19,40+y],[29,41+y],[33,32+y],
      [39,37+y],[34,45+y],[25,46+y]]);
    poly(shade,[[27,38+y],[37,40+y],[45,49+y],
      [41,60+y],[28,60+y],[20,51+y]]);
    poly(base,[[28,41+y],[36,42+y],[41,51+y],
      [38,57+y],[29,55+y],[24,48+y]]);
    poly(light,[[28,44+y],[38,46+y],[37,49+y],[29,49+y]]);
    for(const [x,k]of [[17,swing],[43,-swing]]){
     poly(shade,[[x,56+y],[x+8,56+y],[x+8,73+y+k],
       [x-2,75+y+k]]);
     p(base,x+1,60+y,5,10);p(light,x,72+y+k,5,2);
    }
    // Ore­lhas pontudas (lobo) ou chifres/escamas (dragão).
    for(const x of [17,45]){
     poly(shade,[[x,37+y],[x+5,18+y],[x+10,38+y]]);
     poly(light,[[x+3,34+y],[x+5,23+y],[x+8,34+y]]);
    }
    poly(shade,[[27,51+y],[40,49+y],[49,55+y],[43,65+y],[31,64+y]]);
    poly(light,[[32,53+y],[40,52+y],[46,57+y],[39,60+y],[33,57+y]]);
    p(eye,34,49+y,4,3);p(eye,45,48+y,3,3);
    p(shade,37,61+y,4,2);p(shine,32,63+y,3,3);
    if(shape==='dragon'){
     for(const x of [4,36]){
      poly(shade,[[x,51+y],[x+9,22+y-atk],
       [x+25,35+y],[x+18,56+y]]);
      poly(base,[[x+5,47+y],[x+10,27+y-atk],
       [x+21,37+y],[x+15,52+y]]);
      line(light,x+10,27+y-atk,x+18,51+y,2);
     }
     p(eye,47,51+y,4,3);
     if(action==='attack'){
      for(let j=0;j<4;j++){p('#ffb65e',52+j*3,51+y+j%2*2,4,3);
       p('#fff0b0',54+j*2,52+y,2,1)}
     }
    }
   }else if(shape==='spider'){
    const legs=action==='walk'?swing:action==='attack'?atk:0;
    // Oito pernas angulares reais, alternadas por quadro.
    for(let i=0;i<4;i++)for(const side of [-1,1]){
     const x=32+side*9,tip=32+side*(26+i%2*3);
     line(shade,x,40+i*5+y,tip,27+i*10+y+side*legs,4);
     line(base,x,40+i*5+y,tip,27+i*10+y+side*legs,2);
     p(light,tip-(side===1?0:3),27+i*10+y+side*legs,3,2);
    }
    poly(shade,[[20,34+y],[31,28+y],[45,33+y],
     [50,43+y],[45,58+y],[32,63+y],[18,55+y],[15,43+y]]);
    poly(base,[[22,35+y],[32,30+y],[43,36+y],
     [46,43+y],[42,56+y],[31,60+y],[20,53+y]]);
    poly(light,[[25,34+y],[32,31+y],[40,35+y],[37,41+y],[26,43+y]]);
    for(let i=0;i<8;i++){
     p(i<4?eye:deep,24+(i%4)*5,41+y+Math.floor(i/4)*6,3,3);
    }
    for(let j=0;j<3;j++)p(shine,28+j*5,35+y+j%2*2,2,1);
   }else if(shape==='bat'){
    const flap=action==='walk'?[0,-4,-8,-3,4,2][num%6]:0;
    for(const sign of [-1,1]){
     const x=32+sign*5,edge=32+sign*30;
     poly(shade,[[x,37+y],[32+sign*13,23+y+flap],
      [edge,29+y+flap],[32+sign*25,49+y],
      [32+sign*17,43+y],[x,52+y]]);
     poly(base,[[x,39+y],[32+sign*14,28+y+flap],
      [32+sign*26,31+y+flap],[32+sign*21,44+y],[x,48+y]]);
     line(light,x,38+y,32+sign*21,31+y+flap,2);
    }
    poly(shade,[[23,35+y],[30,30+y],[39,34+y],
     [43,47+y],[38,59+y],[27,59+y],[21,49+y]]);
    poly(base,[[25,36+y],[31,32+y],[37,37+y],
     [40,47+y],[36,57+y],[28,55+y],[23,46+y]]);
    p(light,27,36+y,5,4);
    for(const x of [26,37]){
     poly(shade,[[x,36+y],[x+2,22+y],[x+6,36+y]]);
    }
    p(eye,28,43+y,3,3);p(eye,37,43+y,3,3);
    p(shine,31,51+y,3,3);
   }else if(shape==='skeleton'){
    // Ossos articulados, articulações e arma desenhados separadamente.
    poly(shade,[[22,20+y],[28,14+y],[39,14+y],[44,21+y],
      [43,33+y],[24,35+y]]);
    poly(light,[[24,20+y],[29,16+y],[37,16+y],
      [41,21+y],[39,31+y],[27,32+y]]);
    p(shade,28,25+y,5,5);p(shade,37,25+y,4,5);
    p(eye,30,26+y,2,2);p(eye,38,26+y,2,2);
    for(let i=0;i<5;i++)p(shade,27+i*3,31+y,1,3);
    line(light,32,34+y,32,60+y,7);
    for(let i=0;i<4;i++){
     line(shade,25,40+i*4+y,42,40+i*4+y,5);
     line(light,26,40+i*4+y,41,40+i*4+y,3);
    }
    for(const x of [17,46]){
     line(light,x,39+y,x+(x<32?-5:5),62+y,5);
     p(shine,x-1,43+y,2,2);
    }
    for(const x of [28,39]){
     line(shade,x,57+y,x+(x<32?-4:4),75+y,6);
     line(light,x,58+y,x+(x<32?-4:4),73+y,3);
    }
    line(shade,11,33+y,9,72+y,5);
    line('#f0e7d1',10,31+y,7,62+y,3);
    line(GOLD,4,63+y,17,63+y,3);
   }else if(shape==='snake'){
    // Corpo em S com sobreposição de escamas.
    poly(shade,[[9,67+y],[16,49+y],[34,47+y],
     [35,30+y],[19,31+y],[16,20+y],[29,16+y],
     [43,23+y],[47,41+y],[43,64+y],[29,73+y]]);
    poly(base,[[13,65+y],[19,52+y],[37,50+y],
     [40,30+y],[23,33+y],[19,23+y],[29,19+y],
     [40,25+y],[43,42+y],[40,60+y],[28,69+y]]);
    for(let i=0;i<7;i++)p(light,17+(i*5)%25,48+y+(i%3)*5,4,2);
    p(eye,27,23+y,4,3);p(eye,38,23+y,3,3);
    line('#e98b7e',34,32+y,36,40+y,2);
   }else{
    // Colosso rúnico: blocos independentes, juntas escuras e runas.
    for(const [x,yy,w,h]of [[12,48,14,25],[35,48,14,25],
      [7,32,12,28],[46,33,12,26],[22,17,20,22]]){
     poly(shade,[[x-2,yy-1+y],[x+w,yy-3+y],
      [x+w+3,yy+h-3+y],[x+w-3,yy+h+2+y],[x-2,yy+h+y]]);
     poly(base,[[x,yy+1+y],[x+w-2,yy+y],
      [x+w,yy+h-4+y],[x+w-3,yy+h+y],[x+1,yy+h-3+y]]);
     p(light,x+2,yy+3+y,Math.max(3,w-6),3);
     p(eye,x+Math.floor(w/2),yy+Math.floor(h/2)+y,3,3);
    }
    p(shine,31,28+y,5,4);p(eye,28,26+y,3,2);
   }
   // Marca corporal evolutiva da criatura, baseada no ID persistente.
   for(let bit=0;bit<6;bit++){
    const on=(variant>>>bit)&1;
    p(on?shine:deep,22+bit*3,60+y+(bit%2)*2,2,2);
   }
   // Chefes ganham uma assinatura própria, sem substituírem a criatura.
   if(boss){
    const crest=['#eec47c','#a8a3ef','#75e1ce','#f4a16e'][Math.abs(zone)%4];
    poly(shade,[[16,21+y],[15,7+y],[26,14+y],
     [32,2+y],[37,14+y],[48,7+y],[48,21+y]]);
    poly(crest,[[18,18+y],[18,10+y],[27,17+y],
     [32,6+y],[38,17+y],[46,10+y],[46,18+y]]);
    p(PAPER,30,13+y,5,3);
    for(let k=0;k<4;k++){
     p(crest,10+k*12,28+y+((num+k)%2)*2,4,5);
     p(shine,11+k*12,29+y,2,2);
    }
    if(action==='attack'){
     // Cinco silhuetas de ataque de chefe: preparar, carregar, lançar,
     // atingir e recuperar. A magia desloca-se de quadro a quadro.
     const arc=[
      [19,20,3],[25,17,4],[34,12,5],[46,19,6],[54,34,3]
     ][num%5];
     const [ax,ay,size]=arc;
     for(let k=0;k<5;k++){
      const px=6+k*10,py=6+(k%2)*7-(num%5)*2;
      p(crest,px,py,4,3);
      p(PAPER,px+1,py+1,2,1);
     }
     poly(shade,[[ax-5,ay-6],[ax+4,ay-7],[ax+size+4,ay],
      [ax+5,ay+size+4],[ax-5,ay+size+2]]);
     poly(crest,[[ax-3,ay-4],[ax+3,ay-4],[ax+size+2,ay],
      [ax+3,ay+size+2],[ax-2,ay+size]]);
     p(PAPER,ax,ay,size,Math.max(2,size-1));
     line(PAPER,ax,ay,ax+size,ay-size,1);
    }
   }
   if(action==='hurt')p(PAPER,19,31+y,23,3);
  });
  return true;
 }
 return Object.freeze({WIDTH,HEIGHT,npc,creature,NPC_JOBS:job,
  CREATURES:Object.freeze(Object.keys(BASE)),VERSION:'world-art-master64-v1'});
});

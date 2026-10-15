'use strict';
/*
 * Os Peregrinos — Heróis autorais 64×80 / segunda oficina de sprites.
 * Três linguagens de materiais, modelos separados de silhueta e armamentos.
 * O Peregrino tem seu próprio mestre, preservado em peregrino-master64.js.
 * Sem imagem remota, escalonamento intermediário ou algoritmo de suavização.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosHeroesMaster64=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const APP=typeof module==='object'&&module.exports?require('./appearance16'):globalThis.PeregrinosAppearance16;
 const ROLES=Object.freeze({
  guardiao:{ink:'#1d2534',deep:'#273c59',shadow:'#385778',body:'#557ea1',
   light:'#8cb5d0',shine:'#e6f0ed',gold:'#efc56e',goldShadow:'#906b42',
   cloak:'#223d64',mark:'#3865a0',accent:'#2e65ac'},
  arqueiro:{ink:'#192d29',deep:'#234a39',shadow:'#32634c',body:'#4f8b55',
   light:'#97bd79',shine:'#dce9aa',gold:'#c99653',goldShadow:'#694d32',
   cloak:'#214532',mark:'#214532',accent:'#d49e57'},
  curandeiro:{ink:'#3b314c',deep:'#65566e',shadow:'#987997',body:'#e6cccb',
   light:'#fff2dc',shine:'#fff9f3',gold:'#f3c97e',goldShadow:'#916679',
   cloak:'#b86885',mark:'#70c7e0',accent:'#72dbea'}
 });
 const WIDTH=64,HEIGHT=80;
 function draw(g,{role,dir=2,action='idle',frame=0,colors={},appearance=null}={}){
  if(!Object.hasOwn(ROLES,role)||!g?.fillRect)return false;
  const c=ROLES[role],app=APP?.normalize(appearance),pc=APP?.palette(colors,appearance)||colors;
  const skin=pc.skin||'#dea978',skinLight=pc.skinHighlight||'#f4cf99',
   skinShade=APP?.SKIN?.[app?.skin]?.[2]||'#91664f',
   hair=pc.hair||'#50382b',hairLight=pc.hairLight||'#8c5940',
   iris=pc.eyeColor||'#48352e',
   cloth=pc.coat||c.body,clothLight=pc.light||c.light;
  const back=dir===0,side=dir===1||dir===3;
  const f=Math.max(0,Number(frame)||0);
  const stride=action==='walk'?[0,3,5,2,-3,-4][f%6]:0;
  const bob=action==='walk'?[0,-1,-2,0,-1,0][f%6]:
   action==='idle'?[0,0,-1,0][f%4]:0;
  const strike=action==='attack'?[0,1,3,4,2][f%5]:0;
  const flinch=action==='hurt'?(f%3===1?-2:1):0;
  const p=(color,x,y,w=1,h=1)=>{
   if(!color||w<=0||h<=0)return;
   g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  };
  const bands=(col,spans,dx=0,dy=0)=>{for(const [y,x,w,h=1]of spans)p(col,x+dx,y+dy,w,h)};
  // Os rostos são pintados como contornos pixelados fechados, não caixas.
  // Scanlines inteiras preservam a nitidez nos navegadores móveis.
  const poly=(col,points)=>{
   if(!col||points.length<3)return;
   const ys=points.map(([x,y])=>y);
   for(let y=Math.max(0,Math.floor(Math.min(...ys)));y<=Math.min(79,Math.ceil(Math.max(...ys)));y++){
    const crossings=[];
    for(let i=0;i<points.length;i++){
     const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length];
     if((ay<=y+.5&&by>y+.5)||(by<=y+.5&&ay>y+.5))
      crossings.push(ax+(y+.5-ay)*(bx-ax)/(by-ay));
    }
    crossings.sort((a,b)=>a-b);
    for(let i=0;i+1<crossings.length;i+=2){
     const left=Math.max(0,Math.ceil(crossings[i]-.5));
     const right=Math.min(64,Math.ceil(crossings[i+1]-.5));
     if(right>left)p(col,left,y,right-left,1);
    }
   }
  };
  const shape=(color,coords)=>poly(color,coords.map(([x,y])=>[x,y+bob]));
  const sheen=(color,runs)=>{for(const [x,y,w=1,h=1]of runs)p(color,x,y+bob,w,h)};
  const hairMood=action==='walk'?[0,1,-1,0,1,-1][f%6]:
   action==='attack'?[0,-1,-2,1,2][f%5]:0;

  if(dir===3){g.save();g.translate(WIDTH,0);g.scale(-1,1)}
  if(action==='death'){g.save();g.translate(0,Math.min(12,f*2));g.scale(1,Math.max(.28,1-f*.15))}
  // Mantos desenhados como polígonos de pixel art — nada de placas retas.
  const cape=(app?.cape&&app.cape!=='nenhuma'?
   ({vinho:'#75354c',marinho:'#354c73',musgo:'#456547',marfim:'#ddd2b2'})[app.cape]:null)||c.cloak;
  const capeWind=action==='walk'?[0,2,4,1,-2,-3][f%6]:
   action==='attack'?[0,-2,-4,3,1][f%5]:0;
  if(role==='arqueiro'){
   shape(c.ink,[[27,26],[42,26],[49,34],[53+capeWind,46],
    [52+capeWind,59],[57+capeWind,73],[43,69],[37,75],
    [27,67],[14-capeWind,75],[11-capeWind,64],[16,45]]);
   shape(cape,[[28,28],[42,28],[47,35],[50+capeWind,47],
    [49+capeWind,59],[53+capeWind,69],[43,66],[38,71],
    [27,63],[17-capeWind,70],[15-capeWind,63],[19,45]]);
   shape(c.shadow,[[20,39],[25,37],[23,58],[17-capeWind,67],[16,60]]);
   sheen(c.light,[[20,34,3,9],[24,43,2,12],[44,40,2,10]]);
  }else if(role==='curandeiro'){
   shape(c.ink,[[26,23],[42,23],[50,34],[53,48],
    [57+capeWind,67],[50+capeWind,75],[40,70],
    [34,76],[25,70],[13-capeWind,75],[10-capeWind,66],[15,44]]);
   shape(cape,[[27,25],[41,25],[47,34],[50,47],
    [53+capeWind,67],[49+capeWind,71],[40,66],
    [35,73],[26,66],[16-capeWind,72],[14-capeWind,64],[18,44]]);
   shape('#f4c3b5',[[21,33],[25,32],[23,52],[19-capeWind,65],
    [17-capeWind,67],[17,48]]);
   shape(c.shadow,[[44,36],[48,41],[50,59],[47+capeWind,68],
    [44,62]]);
  }else{
   shape(c.ink,[[27,25],[43,26],[49,35],[53,47],
    [49+capeWind,64],[53+capeWind,73],[42,69],
    [35,74],[28,68],[15-capeWind,71],[14,60],[19,44]]);
   shape(cape,[[28,27],[41,28],[46,36],[50,47],
    [46+capeWind,62],[49+capeWind,69],[41,65],
    [35,70],[28,64],[18-capeWind,67],[17,59],[21,43]]);
   shape(c.light,[[20,33],[23,34],[23,48],[20,52],[19,45]]);
  }
  // Calçados e pernas de material distinto da armadura/tecido.
  for(let i=0;i<2;i++){
   const x=i===0?21:36,offset=i===0?Math.max(0,stride):Math.max(0,-stride),
    y=55+offset+(role==='curandeiro'?4:0);
   bands(c.ink,[[y,x,10,13],[y+10,x-3,14,6],[y+15,x-4,15,3]]);
   p(c.deep,x+1,y+3,8,11);p(c.shadow,x+2,y+3,4,5);
   p(c.light,x+3,y+7,5,2);p(c.goldShadow,x+2,y+11,8,3);
   p(c.gold,x+4,y+10,3,2);p(c.ink,x-3,y+15,15,4);
   p(c.light,x-1,y+16,8,1);
  }
  // Torsos anatômicos separados: placa convexa / gibão / vestes.
  if(role==='guardiao'){
   shape(c.ink,[[26,29],[42,29],[48,35],[48,47],
    [45,59],[39,62],[28,61],[19,56],[19,42],[21,34]]);
   shape(c.deep,[[27,31],[41,31],[46,36],[45,48],
    [43,56],[38,59],[28,58],[22,54],[22,41],[23,35]]);
   shape(cloth,[[28,32],[40,32],[44,37],[43,47],
    [41,54],[36,57],[28,56],[24,51],[24,41],[25,36]]);
   shape(c.light,[[26,34],[33,32],[36,35],[32,38],[24,40]]);
   shape(c.shadow,[[39,35],[43,40],[43,50],[39,56],[36,56]]);
   shape(c.ink,[[29,39],[36,39],[39,43],[37,55],[31,55],[28,46]]);
   shape(c.gold,[[31,40],[35,40],[36,44],[35,53],[31,53],[30,45]]);
   sheen(c.shine,[[31,43,2,7],[26,36,5,1],[38,45,2,4]]);
   sheen(c.goldShadow,[[27,54,12,2],[31,38,6,2]]);
   p(c.accent,25,46+bob,4,6);
  }else if(role==='arqueiro'){
   shape(c.ink,[[25,30],[41,30],[47,38],[48,50],[45,59],
    [37,63],[27,60],[19,55],[20,40]]);
   shape(c.deep,[[26,32],[40,32],[45,39],[45,49],
    [43,57],[37,60],[28,57],[22,53],[23,40]]);
   shape(cloth,[[27,34],[39,34],[43,41],[43,51],
    [39,57],[29,55],[24,49],[24,41]]);
   shape(c.light,[[26,36],[33,34],[34,38],[27,42],[24,41]]);
   // Jaqueta aberta de couro e colete de linho artesanal.
   shape('#d8bd8d',[[31,36],[37,36],[40,44],
    [38,53],[31,52],[29,44]]);
   shape(c.deep,[[37,37],[44,41],[43,54],[39,58],
    [37,53],[40,45]]);
   sheen(c.goldShadow,[[22,49,23,3],[29,53,12,3]]);
   sheen(c.gold,[[24,50,19,1],[32,53,5,2]]);
   shape(c.ink,[[30,51],[37,51],[38,56],[35,59],[30,56]]);
   p(c.gold,32,53+bob,4,2);
   shape('#c0a272',[[20,55],[26,54],[28,63],[23,66],[19,62]]);
  }else{
   shape(c.ink,[[26,30],[43,30],[49,37],[51,49],[55,65],
    [53,73],[43,76],[36,70],[27,76],[14,73],[17,62],[16,46],[19,36]]);
   shape(c.shadow,[[27,32],[41,32],[47,38],[48,51],[51,66],
    [48,72],[41,72],[36,67],[27,72],[18,70],[21,61],[19,45]]);
   shape(cloth,[[28,33],[40,33],[45,40],[45,51],[47,65],
    [45,71],[40,69],[35,65],[27,71],[21,68],[23,59],[21,45]]);
   shape(c.light,[[29,35],[37,34],[39,41],[37,52],[35,66],
    [30,68],[27,57],[27,42]]);
   shape(c.cloak,[[31,45],[37,44],[40,54],[38,65],[34,68],[31,61]]);
   shape(c.ink,[[31,39],[39,39],[42,44],[40,48],[30,48],[28,44]]);
   shape(c.gold,[[30,42],[32,41],[34,47],[30,47]]);
   sheen(c.goldShadow,[[27,43,2,18],[40,43,2,23]]);
   sheen(c.gold,[[28,44,1,24],[41,44,1,22],[24,68,6,2],[44,69,4,2]]);
   sheen(c.shine,[[33,49,3,8],[35,58,2,4],[31,36,5,2]]);
   p(c.mark,33,53+bob,3,8);
   p(c.shine,34,55+bob,1,3);
  }
  // Alças, fechos e pequenas reflecções de material.
  p(c.goldShadow,22,51+bob,21,5);p(c.gold,24,52+bob,17,2);
  p(c.ink,31,51+bob,7,6);p(c.gold,32,52+bob,5,4);
  p(c.shine,33,52+bob,2,1);
  // Braços dinâmicos, ombreiras específicas da profissão.
  if(role==='guardiao'){
   bands(c.ink,[[30,8,17,10],[31,42,17,12],[42,8,13,12],[44,46,12,14]],0,bob);
   bands(c.shadow,[[32,11,14,8],[33,44,14,7]],0,bob);
   p(c.light,11,33+bob,10,4);p(c.shine,12,33+bob,5,2);
   p(c.gold,13,37+bob,8,2);
   p(c.light,46,34+bob,11,3);p(c.gold,48,37+bob,8,2);
   p(c.deep,11,42+bob+flinch,8,13);p(c.deep,48,42+bob+flinch,8,13);
   p(c.light,12,44+bob+flinch,4,7);p(c.gold,51,48+bob+flinch,3,4);
   p('#d2c29e',14,52+bob+flinch,4,3);
  }else if(role==='arqueiro'){
   p(c.ink,12,33+bob,10,18);p(c.deep,14,34+bob,6,15);
   p(c.shadow,15,35+bob,4,7);p(c.gold,17,45+bob,3,4);
   p(c.ink,46,35+bob,11,22);p(c.deep,48,36+bob,8,17);
   p(c.light,49,36+bob,4,4);p(c.gold,51,49+bob,4,3);
   p(skin,14,49+bob,6,7);p(skinLight,15,50+bob,3,2);
  }else{
   p(c.ink,12,33+bob,10,23);p(cloth,14,34+bob,8,18);
   p(c.light,15,35+bob,4,12);p(c.gold,14,50+bob,7,3);
   p(c.ink,44,34+bob,12,23);p(cloth,46,35+bob,9,19);
   p(c.light,48,36+bob,5,13);p(c.gold,48,50+bob,6,3);
   p(skin,16,54+bob,5,5);p(skin,49,54+bob,6,5);
  }
  // CABEÇAS DE ATLAS: cada classe tem contorno e anatomia próprios em
  // frente, perfil e costas. Sem máscaras quadradas por cima da pele.
  const wind=hairMood;
  const longHair=['medio','longo','rabo','tranca'].includes(app?.hairStyle);
  if(role==='guardiao'){
   // Capacete possui cimeira angulosa, mandíbula guardada e viseira afunilada.
   shape(c.ink,[[28,8],[38,7],[44,12],[49,18],[47,27],
    [43,32],[26,33],[20,28],[20,18],[23,13]]);
   shape(c.deep,[[28,10],[37,9],[42,13],[46,19],
    [44,27],[40,30],[25,30],[22,26],[22,18],[25,13]]);
   shape(c.light,[[27,11],[35,9],[40,13],[30,14],[24,18],[24,15]]);
   shape(c.shadow,[[43,16],[45,19],[44,26],[40,30],[36,30]]);
   p(c.gold,32,9+bob,4,19);p('#fff0cc',33,10+bob,2,15);
   shape(c.goldShadow,[[23,18],[45,18],[44,22],[24,22]]);
   p(c.gold,24,18+bob,19,2);p('#f4d99d',27,18+bob,9,1);
   if(back){
    shape(c.mark,[[25,23],[39,23],[42,28],[36,31],[27,29]]);
    sheen(c.gold,[[28,25,2,2],[37,26,2,2]]);
   }else{
    // Abertura da viseira desenha maçãs do rosto e queixo, não retângulo.
    shape(c.ink,[[26,22],[40,22],[43,25],[41,31],
     [37,33],[29,32],[25,28]]);
    shape(skinShade,[[28,23],[39,23],[41,26],
     [39,30],[35,32],[29,30],[27,27]]);
    shape(skin,[[29,23],[38,23],[40,26],[38,29],
     [34,30],[29,28]]);
    sheen(skinLight,[[30,24,5,1],[29,27,3,1]]);
    if(side){
     p(c.ink,38,25+bob,3,2);p(c.mark,39,25+bob,1,1);
    }else{
     p(c.ink,30,25+bob,3,2);p(c.ink,37,25+bob,3,2);
     p(c.mark,31,25+bob,1,1);p(c.mark,38,25+bob,1,1);
    }
   }
   shape(c.light,[[21,27],[26,27],[28,33],[25,35],[21,32]]);
   shape(c.light,[[41,27],[46,26],[47,31],[44,34],[41,32]]);
   p(c.gold,23,30+bob,2,3);p(c.gold,44,30+bob,2,3);
  }else if(role==='arqueiro'){
   // Capuz em ponta e gola recortada. O rosto aparece em um recorte oval.
   shape(c.ink,[[34,7],[44,12],[49,23],[50,30],
    [44,35],[24,35],[18,29],[20,21],[27,12]]);
   shape(c.deep,[[34,9],[42,13],[47,24],
    [47,30],[43,33],[24,33],[21,29],[23,21]]);
   shape(c.shadow,[[30,12],[35,10],[42,14],
    [34,17],[26,21],[24,27],[21,27]]);
   sheen(c.light,[[33,10,3,1],[29,14,4,2],[23,25,2,5]]);
   if(back){
    shape(c.cloak,[[25,21],[43,20],[46,30],
     [40,36],[27,34],[22,28]]);
    sheen(c.light,[[28,24,3,2],[38,27,2,3]]);
   }else{
    shape(c.ink,[[29,18],[41,18],[46,24],
     [44,30],[39,33],[30,31],[27,26]]);
    shape(skinShade,[[30,19],[40,19],[44,23],
     [42,29],[38,31],[31,29],[28,24]]);
    shape(skin,[[31,20],[39,20],[42,23],
     [41,28],[37,30],[31,28],[29,24]]);
    shape(skinLight,[[32,21],[37,21],[37,23],[32,25]]);
    shape(hair,[[28,19],[34,18],[39,20],[36,23],[29,23]]);
    p(hairLight,30,19+bob,4,1);
    if(side){
     p(c.ink,40,24+bob,3,2);p(iris,41,24+bob,1,2);
     p(skinShade,42,29+bob,2,1);
    }else{
     p(c.ink,32,24+bob,3,2);p(c.ink,39,24+bob,3,2);
     p(iris,33,24+bob,1,2);p(iris,40,24+bob,1,2);
     p(skinShade,35,29+bob,4,1);
    }
   }
   // O capuz recobre as têmporas, em vez de deixar lados retilíneos.
   shape(c.shadow,[[22,23],[27,21],[29,29],[26,33],[22,31]]);
   shape(c.deep,[[43,20],[48,23],[47,31],[43,33],[41,30]]);
   sheen(c.light,[[23,27,2,3],[44,24,2,2]]);
   if(action==='walk'){
    p(c.light,22+wind,33+bob,3,5);
    p(c.ink,20+wind,36+bob,2,3);
   }
  }else{
   // CURANDEIRO: rosto em oval escalonado, franja assimétrica e véu ao
   // redor da face. A sombra separa tecido, cabelo e pele em cada perfil.
   const veil=cape||c.cloak;
   shape(c.ink,[[31+wind,8],[40+wind,10],[45,15],
    [49,22],[48,34],[52,43],[47,47],[42,37],
    [24,37],[19,45],[15,39],[19,24],[23,14]]);
   shape(c.cloak,[[30+wind,10],[40+wind,12],[44,17],
    [46,27],[44,35],[48,40],[45,43],[39,35],
    [25,35],[20,41],[19,37],[21,24],[25,16]]);
   shape('#f4bdbe',[[27+wind,12],[34+wind,11],[40+wind,13],
    [43,17],[40,19],[29,17],[24,23],[21,30],[21,23]]);
   sheen(c.shine,[[29+wind,12,7,2],[25,16,4,2],[20,29,2,5]]);
   if(back){
    // Costas não repetem os olhos ou rosto; véu e cabelo com queda própria.
    shape(veil,[[27,17],[42,16],[45,26],[46,37],
     [50,52],[44,62],[39,53],[29,57],[21,62],[18,52],[22,29]]);
    shape(c.shadow,[[25,20],[38,19],[41,28],
     [37,42],[29,47],[22,38]]);
    if(app?.hairStyle!=='raspado'){
     shape(hair,[[27,19],[37,19],[41,28],[40,41],
      [35,48],[25,44],[23,31]]);
     sheen(hairLight,[[28,20,6,2],[36,27,2,8],[27,39,4,2]]);
    }
    sheen(c.gold,[[27,50,2,5],[39,51,2,4]]);
   }else{
    // Silhueta do rosto usa queixo em degraus de 2px.
    shape(c.ink,[[28,18],[39,18],[45,22],
     [45,28],[42,33],[37,36],[31,35],[26,31],[25,24]]);
    shape(skinShade,[[29,19],[39,19],[43,23],
     [43,28],[40,32],[36,34],[31,33],[27,29],[27,24]]);
    shape(skin,[[30,20],[39,20],[42,23],
     [41,29],[38,32],[32,32],[29,29],[28,24]]);
    shape(skinLight,[[31,21],[37,20],[40,23],
     [37,25],[31,25],[30,23]]);
    sheen(skinLight,[[30,27,2,2],[33,31,4,1]]);
    // Franja arredondada, adaptada ao penteado salvo.
    if(app?.hairStyle!=='raspado'){
     shape(hair,[[26+wind,18],[30+wind,14],[36+wind,15],
      [41+wind,17],[41+wind,21],[36+wind,21],
      [33+wind,24],[30+wind,21],[27+wind,26],[25+wind,23]]);
     shape(hairLight,[[30+wind,16],[35+wind,16],
      [36+wind,17],[32+wind,18],[28+wind,19]]);
     p(hairLight,39+wind,18+bob,2,1);
     if(longHair){
      shape(c.ink,[[24,20],[28,22],[27,33],
       [24,43],[19,47],[19,35]]);
      shape(hair,[[25,22],[27,24],[26,34],
       [23,42],[21,43],[21,34]]);
      sheen(hairLight,[[23,28,2,6],[21,37,1,4]]);
      if(app?.hairStyle==='longo'){
       shape(c.ink,[[41,22],[45,22],[46,36],[42,47],[39,43]]);
       shape(hair,[[42,23],[44,24],[44,35],[41,43]]);
       p(hairLight,42,29+bob,1,8);
      }else if(['tranca','rabo'].includes(app?.hairStyle)){
       for(let i=0;i<3;i++)p(i%2?hair:hairLight,43+(i%2),34+i*4+bob,3,3);
      }
     }
    }else{
     shape(hair,[[29,19],[37,19],[40,21],[29,22]]);
     p(hairLight,32,19+bob,4,1);
    }
    if(side){
     // Perfil com ponte nasal e um único olho.
     p(c.ink,39,25+bob,4,2);p(iris,40,25+bob,2,2);
     p(skinLight,43,28+bob,2,2);
     p(skinShade,41,31+bob,4,1);
    }else{
     p(c.ink,30,25+bob,5,2);p(c.ink,38,24+bob,5,2);
     p(iris,32,25+bob,2,2);p(iris,40,24+bob,2,2);
     p(c.shine,32,25+bob,1,1);p(c.shine,40,24+bob,1,1);
     p(skinShade,36,28+bob,2,2);
     p(skinLight,36,28+bob,1,1);
     p(c.ink,34,31+bob,5,1);
     p(skinLight,35,32+bob,3,1);
    }
   }
   // Gola e pingente indicam separação entre pele, tecido e bordado.
   shape(c.ink,[[25,33],[41,33],[43,38],[36,43],[29,41],[23,37]]);
   shape(c.light,[[27,34],[38,34],[40,37],[35,41],[29,39]]);
   sheen(c.gold,[[28,35,3,2],[37,35,3,2],[33,40,4,1]]);
   p(c.mark,34,38+bob,3,3);p(c.shine,35,38+bob,1,2);
  }
  // Customizações que não destroem a identidade da armadura/capuz.
  if(app?.accessory==='tiara'){
   p(c.gold,26,16+bob,17,2);p(pc.gem||c.mark,33,15+bob,4,4);
  }else if(app?.accessory==='brinco'&&!back){
   p(c.gold,42,28+bob,2,4);
  }else if(app?.accessory==='amuleto'){
   p(c.gold,32,37+bob,6,2);p(pc.gem||c.mark,34,38+bob,3,4);
  }
  // Assinaturas de batalha: escudo + espada / arco + flecha / cajado + raio.
  if(role==='guardiao'){
   // Escudo grande que cobre o braço, com cruz de ouro e esmalte safira.
   const shieldRaise=action==='attack'?strike*2:0;
   bands(c.ink,[[34-shieldRaise,2,20,12],[46-shieldRaise,3,19,14],
    [58-shieldRaise,6,15,9],[65-shieldRaise,10,7,6]],0,bob);
   bands('#708d9e',[[35-shieldRaise,4,16,13],[48-shieldRaise,5,15,11],
    [59-shieldRaise,8,11,7]],0,bob);
   p(c.mark,7,38-shieldRaise+bob,10,21);
   p(c.accent,9,40-shieldRaise+bob,7,17);
   p(c.gold,10,39-shieldRaise+bob,4,22);
   p(c.gold,7,47-shieldRaise+bob,10,4);
   p(c.shine,9,37-shieldRaise+bob,4,3);
   p(c.gold,11,45-shieldRaise+bob,2,12);
   p(c.mark,11,48-shieldRaise+bob,2,2);
   // Lamina da mão oposta.
   const sx=54-strike*2,sy=23-strike*3;
   p(c.ink,sx,sy,7,32);p('#678893',sx+1,sy+2,4,26);
   p(c.shine,sx+2,sy+2,2,21);p(c.gold,sx-3,sy+27,12,3);
   p(c.ink,sx+1,sy+30,5,13);p(c.gold,sx+2,sy+39,4,4);
  }else if(role==='arqueiro'){
   // Aljava: hastes e penas separadas, não uma placa verde.
   bands(c.ink,[[22,47,12,27],[48,48,11,13]],0,bob);
   p('#694c34',49,25+bob,7,28);p(c.gold,51,28+bob,2,21);
   for(let i=0;i<5;i++){
    p('#e4d2a7',49+i*2,16+(i%2)*3+bob,2,17);
    p(i%2?c.light:c.shine,49+i*2,12+(i%2)*2+bob,3,5);
   }
   // Arco entalhado com string vertical; ataque arma uma flecha horizontal.
   const bowX=6+strike*2;
   bands(c.ink,[[23,bowX+5,5,6],[29,bowX+2,5,11],
    [40,bowX,4,16],[56,bowX+2,5,9],[64,bowX+5,5,5]],0,bob);
   bands(c.accent,[[25,bowX+6,2,5],[32,bowX+4,2,10],
    [43,bowX+2,2,11],[56,bowX+4,2,7]],0,bob);
   p(c.gold,bowX+7,23+bob,2,5);p(c.gold,bowX+7,65+bob,2,4);
   p('#d9c9a5',bowX+10,27+bob,1,36);
   if(action==='attack'){
    const arrowY=36-strike*2;
    p('#d4b681',bowX+9,arrowY+bob,40,2);
    p('#f9f2d8',bowX+48,arrowY-3+bob,10,7);
    p(c.shine,bowX+8,arrowY-3+bob,8,1);
    p(c.mark,40,38+bob,4,3);
    p('#dbf8b6',54,arrowY-6+bob,3,2);
   }
  }else{
   // Cajado recortado: bordas escuras, ouro, cristal e brilho rúnico.
   const glow=action==='attack'?strike:0;
   p(c.ink,53,17+bob-glow,7,58);
   p('#78573e',55,18+bob-glow,4,58);
   p(c.gold,54,28+bob-glow,5,4);
   p(c.shine,57,21+bob-glow,1,38);
   bands(c.ink,[[8-glow,54,8,4],[12-glow,51,13,12],
    [23-glow,54,8,5]],0,bob);
   bands('#335666',[[12-glow,54,7,10]],0,bob);
   bands('#65d7c6',[[9-glow,56,3,3],[12-glow,54,7,10],
    [19-glow,56,4,6]],0,bob);
   p('#72dbea',57,10+bob-glow,4,12);
   p('#70c7e0',56,15+bob-glow,3,6);
   p('#f4feff',57,10+bob-glow,2,5);
   if(action==='attack'){
    for(let i=0;i<5;i++){
     const x=51+(i%3)*4,y=4+(i*7+f*3)%34;
     p(i%2?'#8cf2ff':'#fff7dc',x,y+bob,2+(i%2),3);
    }
    p('#70c7e0',39,61+bob,9,2);
    p('#d5ffff',42,58+bob,3,3);
   }
  }
  // Pixel finishing: facetas, rebites e textura artesanal, sem noise por frame.
  if(role==='guardiao'){
   // Placas de aço recebem refletores orientados à esquerda e gravações.
   for(const [x,y] of [[19,37],[23,39],[40,37],[41,45],[26,58],[39,59],
    [13,36],[48,36],[17,45],[51,48],[21,48],[43,51]]){
    p(c.goldShadow,x,y+bob,3,2);
    p(c.gold,x+1,y+bob,1,1);
   }
   for(const [x,y] of [[24,43],[25,48],[41,42],[40,49],[23,56],[42,57]]){
    p(c.shine,x,y+bob,2,1);p(c.light,x+1,y+1+bob,1,2);
   }
   p('#e6f0ed',13,40+bob,2,1);p(c.shine,9,56+bob,2,1);
   p(c.gold,4,52+bob,3,1);p(c.light,15,61+bob,3,1);
   p(c.gold,37,18+bob,2,2);p(c.shine,28,14+bob,2,1);
   p('#fff9e2',32,14+bob,1,3);
  }else if(role==='arqueiro'){
   // Costuras e folhas em diagonal nas ombreiras e na roupa de viagem.
   for(const [x,y] of [[18,43],[20,47],[21,51],[23,55],[39,42],[40,47],
    [43,50],[29,60],[35,62]]){
    p(c.goldShadow,x,y+bob,3,2);p(c.gold,x+1,y+bob,1,1);
   }
   for(const [x,y] of [[20,37],[23,39],[40,39],[43,41],[24,55],[42,55]]){
    p(c.light,x,y+bob,3,1);p(c.shadow,x+1,y+1+bob,2,2);
   }
   // Emblemas bordados de folhas e couro quebram os grandes planos.
   for(let i=0;i<4;i++){
    p(c.shine,17+i*2,40+i*3+bob,1,2);
    p(c.gold,25+i*4,48+bob,2,1);
   }
   p('#f1e3ba',35,38+bob,2,1);p(c.ink,34,44+bob,1,3);
   p(c.gold,47,60+bob,2,2);p(c.shine,19,65+bob,2,1);
  }else{
   // Barra tripla, inscrições de luz e joias embutidas no traje.
   for(let i=0;i<8;i++){
    const x=19+i*4,y=64+(i%3);
    p(c.goldShadow,x,y+bob,3,3);
    p(c.gold,x+1,y+bob,1,2);
   }
   for(let i=0;i<6;i++){
    p(c.light,23+i*4,47+(i%2)*5+bob,2,2);
    p(c.shine,24+i*4,48+(i%2)*5+bob,1,1);
   }
   p('#fff9f3',32,37+bob,7,2);p(c.gold,33,39+bob,5,1);
   p(c.mark,33,58+bob,5,2);p('#a4f3ef',34,58+bob,2,1);
   p(c.gold,15,45+bob,3,2);p(c.light,16,40+bob,2,5);
   p('#ed99a2',44,44+bob,2,6);p(c.gold,45,49+bob,2,1);
   p(c.shine,52,32+bob,2,1);p('#fff9f3',58,13+bob,2,2);
  }
  // Acabamento de atlas com linguagem própria para as três classes.
  // Tudo aparece também em mobile, na grade original de 64x80 pixels.
  if(role==='guardiao'){
   // Três valores de aço, coroa no capacete e manto onde a luz encontra a borda.
   const plate='#a6c9da',rim='#f3e9c9';
   for(const [x,y] of [[14,35],[20,37],[46,34],[51,35],[28,40],[40,43]]){
    p('#314d67',x,y+bob,6,3);p(plate,x+1,y+bob,3,1);
    p(rim,x+2,y+bob,1,1);
   }
   p(c.gold,28,12+bob,11,2);p(rim,30,12+bob,5,1);
   p('#273c59',24,17+bob,4,8);
   p('#e1e7da',25,18+bob,1,6);
   p(c.gold,34,32+bob,3,4);p(rim,35,32+bob,1,2);
   if(action==='attack'){
    // O peso do golpe desloca a guarda e espalha faíscas na direção do corte.
    const slash=[[57,18],[49,12],[41,7],[36,14],[52,23]][f%5];
    p('#97d2ff',slash[0],slash[1]+bob,3,2);
    p('#eaf7ff',slash[0]+1,slash[1]+bob,1,1);
    p(c.gold,9,39-strike*2+bob,4,2);
   }
  }else if(role==='arqueiro'){
   // Capuz com penas bordadas e aljava encostada no ombro.
   p(c.ink,26,13+bob,14,3);
   p(c.shadow,27,13+bob,11,2);
   p(c.light,28,13+bob,5,1);
   p(c.gold,22,30+bob,5,2);p(c.shine,23,30+bob,2,1);
   for(let i=0;i<4;i++){
    p(i%2?c.light:c.shine,48+i*2,19+(i%2)*3+bob,2,5);
    p(c.deep,49+i*2,23+(i%2)*3+bob,1,3);
   }
   p(c.ink,30,48+bob,7,2);p(c.gold,31,48+bob,4,1);
   p(c.light,38,40+bob,3,1);p(c.shadow,39,41+bob,3,3);
   if(action==='attack'){
    // Três estágios de tensão da corda com brilho de flecha, não magia genérica.
    p('#f5e0a6',Math.min(58,27+strike*5),35-strike*2+bob,7,1);
    p('#e7fff1',Math.min(59,34+strike*5),34-strike*2+bob,3,2);
   }
  }else{
   // Manto claro de duas camadas, auréola e runas que respeitam o frame.
   p(c.goldShadow,19,41+bob,4,24);
   p('#fff8ea',22,42+bob,2,20);
   p('#f8dccf',43,42+bob,4,25);
   p(c.gold,42,44+bob,2,23);
   p(c.shine,28,16+bob,12,2);
   p('#ffe3af',32,15+bob,4,1);
   for(let i=0;i<5;i++){
    const x=24+i*6,y=61+(i%2)*3;
    p(c.gold,x,y+bob,2,2);p('#f5ffeb',x+1,y+bob,1,1);
   }
   if(action==='attack'){
    const ring=[[34,51],[29,56],[25,62],[36,59],[41,52]][f%5];
    p('#57d4dd',ring[0],ring[1]+bob,7,2);
    p('#e2ffff',ring[0]+2,ring[1]-1+bob,3,1);
    p('#d9fffa',58,9-strike+bob,2,2);
   }
  }
  // SEGUNDA PASSADA DE SILHUETA: os tecidos e placas deixam de ser
  // retângulos embaixo de um rosto mais acabado. Todas as poses reutilizam
  // a mesma grade, mantendo cache de sprites e colisão intactos.
  if(role==='curandeiro'){
   const sw=action==='walk'?[0,1,2,0,-1,-2][f%6]:
    action==='attack'?[0,-1,-3,3,1][f%5]:0;
   // Saia em painéis sobrepostos e bainha escalonada (tecido, não armadura).
   shape(c.ink,[[23,47],[42,46],[50+sw,62],[53+sw,72],
    [43,76],[35,71],[27,76],[15-sw,72],[18-sw,61]]);
   shape(c.shadow,[[24,49],[43,48],[47+sw,64],[49+sw,71],
    [42,73],[35,68],[28,73],[20-sw,70],[22-sw,60]]);
   shape(cloth,[[25,48],[42,49],[44+sw,63],[46+sw,71],
    [40,72],[34,68],[28,72],[22-sw,70],[24-sw,60]]);
   shape(c.light,[[31,50],[38,50],[40+sw,64],[36,70],
    [32,69],[29,63]]);
   shape(c.cloak,[[21,53],[26,52],[25-sw,65],[21-sw,73],
    [16-sw,70]]);
   shape(c.light,[[22,55],[25,55],[24-sw,66],[20-sw,71]]);
   sheen(c.gold,[[27,56,2,11],[41,56,2,11],
    [31,68,2,3],[39,69,2,3],[22-sw,69,3,1]]);
   sheen(c.shine,[[32,59,2,4],[35,52,3,1],[37,63,2,2]]);
   // Manga flutuante com punho próximo ao cajado.
   shape(c.ink,[[43,35],[51,35],[55,42],[53,55],
    [47,60],[43,52]]);
   shape(cloth,[[45,37],[50,37],[53,43],[51,54],
    [47,57],[45,50]]);
   sheen(c.light,[[47,38,4,2],[49,45,2,7]]);
   p(skin,49,54+bob,5,4);p(skinLight,50,54+bob,2,1);
   sheen(c.gold,[[47,52,6,2],[32,48,6,2]]);
   // Cajado em primeiro plano: empunhadura alinhada ao punho e haste
   // contínua mesmo diante das novas dobras do manto.
   p(c.ink,55,24+bob,5,50);
   p('#78573e',57,25+bob,2,48);
   p(c.gold,56,52+bob,4,3);
   p(c.shine,58,28+bob,1,27);
   // Cristal com pontas irregulares e reflexo angular.
   shape(c.ink,[[56,7],[62,11],[63,20],[59,26],[53,21],[53,13]]);
   shape('#335666',[[57,9],[61,12],[62,19],[58,24],[55,20],[55,14]]);
   shape('#65d7c6',[[58,9],[61,13],[60,20],[58,23],[56,18]]);
   sheen(c.shine,[[58,12,2,5],[59,18,1,2]]);
   p('#f4feff',59,11+bob,1,5);
   // Técnica: luvas, bordados e halo variam com a pose de magia.
   if(action==='attack'){
    const aura=[[39,52],[35,57],[28,63],[32,58],[42,53]][f%5];
    p('#70c7e0',aura[0],aura[1]+bob,8,2);
    p('#e0ffff',aura[0]+2,aura[1]-1+bob,3,1);
    p('#8cf2ff',57,13-strike+bob,3,3);
   }
  }else if(role==='guardiao'){
   shape(c.deep,[[20,54],[44,53],[49,60],[45,68],
    [38,70],[35,65],[28,70],[19,66]]);
   shape(cloth,[[24,56],[43,55],[46,62],[40,67],
    [36,63],[27,67],[21,64]]);
   shape(c.ink,[[21,57],[29,58],[27,67],[22,72],[16,67]]);
   sheen(c.gold,[[22,58,3,2],[38,59,4,2]]);
   sheen(c.shine,[[25,60,2,4],[42,60,2,3]]);
  }else if(role==='arqueiro'){
   // Cauda do manto em folhas assimétricas, com pregas recortadas.
   const sway=action==='walk'?[0,2,3,0,-2,-3][f%6]:0;
   shape(c.ink,[[20,46],[44,47],[49+sway,59],
    [56+sway,72],[45,69],[39,74],[29,67],
    [19-sway,74],[15-sway,65]]);
   shape(c.cloak,[[22,47],[43,49],[47+sway,59],
    [51+sway,69],[44,66],[38,71],[29,64],
    [20-sway,70],[18-sway,63]]);
   sheen(c.light,[[23,49,3,9],[42+sway,60,2,6]]);
   sheen(c.gold,[[25,53,3,2],[37,57,3,1]]);
  }
  if(action==='hurt'){p('#ffe0b1',19,35+bob,18,3);p('#e68c77',49,44+bob,3,4)}
  if(action==='death')g.restore();
  if(dir===3)g.restore();
  return true;
 }
 return Object.freeze({WIDTH,HEIGHT,ROLES,draw,VERSION:'heroes-master64-v5'});
});

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
  if(dir===3){g.save();g.translate(W,0);g.scale(-1,1)}
  if(action==='death'){g.save();g.translate(0,Math.min(12,f*2));g.scale(1,Math.max(.28,1-f*.15))}
  // Capas flutuantes modeladas na silhueta, atrás dos braços e pernas.
  const cape=(app?.cape&&app.cape!=='nenhuma'?
   ({vinho:'#75354c',marinho:'#354c73',musgo:'#456547',marfim:'#ddd2b2'})[app.cape]:null)||c.cloak;
  if(role==='arqueiro'){
   // Capuz verde triangular e mantos recortados, não um retângulo.
   bands(c.ink,[[26,17,29,10],[36,14,34,13],[48,12,37,14],[61,10,15,10],[61,36,17,11],
    [70,9,9,5],[72,47,8,5]],0,bob);
   bands(cape,[[28,19,24,10],[39,16,30,12],[50,14,34,12],[64,12,12,8],[63,40,10,8]],0,bob);
   p(c.light,18,31+bob,3,22);p(c.shadow,44,42+bob,3,17);
  }else if(role==='curandeiro'){
   bands(c.ink,[[25,17,30,14],[38,13,38,10],[48,11,44,15],[62,9,19,10],
    [63,39,18,10],[71,12,11,4],[72,48,7,4]],0,bob);
   bands(cape,[[26,19,28,14],[39,15,34,12],[52,13,39,13],[64,11,16,9],[65,42,13,7]],0,bob);
   p('#f4c3b5',16,39+bob,3,22);
  }else{
   bands(c.ink,[[29,18,30,13],[42,16,33,13],[57,14,12,12],[60,42,10,11]],0,bob);
   bands(cape,[[31,20,26,11],[44,18,30,13],[58,16,9,11],[61,44,8,9]],0,bob);
   p('#7594b9',21,37+bob,3,17);
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
  // Torso de cada classe traz sua própria proporção, não é o mesmo herói colorido.
  if(role==='guardiao'){
   bands(c.ink,[[30,17,32,13],[40,18,28,17],[54,20,27,8]]);
   bands(c.deep,[[31,18,29,10],[42,20,26,15]],0,bob);
   bands(cloth,[[33,20,25,8],[42,22,22,12]],0,bob);
   p(c.light,22,34+bob,14,3);p('#b5c9ca',38,38+bob,6,15);
   p(c.ink,28,39+bob,8,17);p(c.gold,30,40+bob,5,12);
   p(c.shine,31,43+bob,2,8);p(c.ink,29,51+bob,8,5);
   p(c.goldShadow,29,53+bob,9,3);p(c.gold,31,53+bob,5,2);
   p(c.accent,25,46+bob,4,6);
  }else if(role==='arqueiro'){
   bands(c.ink,[[32,17,28,11],[43,18,28,14],[56,19,27,7]],0,bob);
   bands(c.deep,[[34,19,26,10],[45,19,26,13]],0,bob);
   bands(cloth,[[36,21,23,9],[46,22,22,10]],0,bob);
   p(c.light,22,37+bob,8,3);
   // Jaqueta assimétrica aberta sobre um colete de linho.
   p('#d8bd8d',29,37+bob,11,14);p(c.deep,28,37+bob,2,14);
   p(c.shadow,39,38+bob,5,15);
   p(c.goldShadow,21,49+bob,25,6);p(c.gold,22,50+bob,22,2);
   p(c.ink,30,50+bob,7,5);p(c.gold,31,51+bob,5,3);
   p('#c0a272',19,58+bob,8,6);
  }else{
   // Vestes de curandeiro com painel central, duas barras e bordado radial.
   bands(c.ink,[[31,18,29,17],[46,15,37,15],[59,15,38,14],[69,20,10,5],[69,43,10,5]]);
   bands(cloth,[[32,20,25,17],[47,17,33,14],[61,18,32,10]],0,bob);
   p(c.light,22,35+bob,15,6);p('#fff2dc',29,42+bob,10,28);
   p(c.goldShadow,27,43+bob,3,27);p(c.gold,28,43+bob,2,26);
   p(c.goldShadow,39,43+bob,3,28);p(c.gold,40,43+bob,2,26);
   p(c.cloak,31,45+bob,7,17);p(c.light,32,48+bob,5,13);
   p(c.mark,33,53+bob,3,8);p(c.shine,34,55+bob,1,3);
   bands(c.gold,[[70,22,6,2],[69,43,6,2]],0,bob);
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
  // Cabeça: capacete do guardião, capuz sombreado do arqueiro, lenço do curandeiro.
  if(role==='guardiao'){
   bands(c.ink,[[10,23,20,7],[16,20,26,13],[27,23,21,7]],0,bob);
   bands(c.deep,[[11,24,18,7],[18,21,24,8],[26,24,19,7]],0,bob);
   bands(c.light,[[11,27,11,3],[17,23,6,8]],0,bob);
   p(c.shine,29,12+bob,9,1);
   p(c.gold,31,9+bob,5,21);p('#fff0cc',32,10+bob,2,16);
   p(c.gold,24,18+bob,19,3);p(c.goldShadow,24,20+bob,19,2);
   p(c.ink,25,22+bob,17,8);p(skinShade,27,23+bob,14,5);
   if(!back){
    p(skin,29,24+bob,11,4);p(c.ink,30,24+bob,3,2);
    p(c.mark,32,25+bob,2,2);p(c.ink,38,24+bob,2,3);
    if(side)p(c.ink,29,25+bob,3,2);
   }
   p(c.light,23,28+bob,5,6);p(c.light,42,28+bob,5,5);
   p(c.gold,25,30+bob,2,5);p(c.gold,43,30+bob,2,4);
  }else if(role==='arqueiro'){
   // Topo do capuz mais alto que os ombros; frente inclinada e sombra facial.
   bands(c.ink,[[9,30,11,5],[13,24,20,6],[18,20,29,12],
    [27,19,32,7]],0,bob);
   bands(c.deep,[[10,30,11,4],[14,26,18,6],[19,22,25,12]],0,bob);
   bands(c.shadow,[[11,32,6,2],[16,27,9,4],[21,23,5,11]],0,bob);
   p(c.light,31,11+bob,6,2);p(c.shine,33,12+bob,2,1);
   if(!back){
    p(skinShade,28,21+bob,16,12);
    p(skin,30,22+bob,13,8);p(skinLight,31,23+bob,6,2);
    p(c.ink,30,24+bob,10,3);
    if(!side){p(iris,33,25+bob,2,2);p(iris,39,25+bob,2,2)}
    else p(iris,40,25+bob,2,2);
    p(skinShade,37,30+bob,6,1);
    p(hair,29,21+bob,7,3);p(hairLight,30,22+bob,4,1);
   }
   p(c.light,20,30+bob,4,5);p(c.gold,24,31+bob,6,2);
  }else{
   bands(c.ink,[[11,26,17,5],[16,22,24,11],[25,22,23,8]],0,bob);
   bands(c.cloak,[[12,26,16,5],[17,23,22,10],[25,23,6,6]],0,bob);
   bands('#f4bdbe',[[12,28,12,2],[17,23,5,7]],0,bob);
   p(c.light,25,14+bob,13,3);p(c.shine,28,13+bob,7,1);
   if(!back){
    p(skinShade,27,20+bob,16,11);
    p(skin,28,20+bob,15,9);p(skinLight,30,21+bob,8,2);
    p(hair,26,18+bob,10,4);p(hairLight,29,19+bob,5,1);
    if(!side){p(iris,31,24+bob,2,2);p(iris,39,24+bob,2,2)}
    else p(iris,40,24+bob,2,2);
    p(skinShade,35,29+bob,6,1);
   }else p(c.cloak,29,19+bob,13,12);
   p(c.gold,28,31+bob,11,3);p(c.light,31,32+bob,6,1);
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
  if(action==='hurt'){p('#ffe0b1',19,35+bob,18,3);p('#e68c77',49,44+bob,3,4)}
  if(action==='death')g.restore();
  if(dir===3)g.restore();
  return true;
 }
 return Object.freeze({WIDTH,HEIGHT,ROLES,draw,VERSION:'heroes-master64-v2'});
});

'use strict';
/* Direção artística procedural original de Auren: pixels nítidos, sem gradientes,
   imagens externas, shaders ou dependências. Toda decoração é VISUAL: as regras
   de colisão, portal e combate continuam exclusivas do servidor. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosPixelDetail=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const SHADE=typeof module==='object'&&module.exports?require('./shading16'):globalThis.OsPeregrinosShade16;
 const THEMES=Object.freeze([
  Object.freeze({id:'raiz',name:'Raiz Ancestral',base:'#252e25',dark:'#151f1b',mid:'#3d5340',light:'#76966d',line:'#172a23',accent:'#b0d88b',glow:'#a9e27b',dust:'#7a6246'}),
  Object.freeze({id:'cinzas',name:'Cinzas Eternas',base:'#373039',dark:'#201e27',mid:'#615157',light:'#99736a',line:'#221c26',accent:'#eda16a',glow:'#ff8651',dust:'#75676c'}),
  Object.freeze({id:'vozes',name:'Templo das Vozes',base:'#44465e',dark:'#29293f',mid:'#6b668b',light:'#a5a4c0',line:'#33334b',accent:'#e6cca1',glow:'#c4abf7',dust:'#85859e'}),
  Object.freeze({id:'aurora',name:'Câmara da Aurora',base:'#24465a',dark:'#172d3f',mid:'#3d7388',light:'#91cbd4',line:'#153344',accent:'#f4d68a',glow:'#7af1ed',dust:'#7198a7'})
 ]);
 const SURFACE=Object.freeze({
  meadow:{dark:'#385f3b',light:'#b7d68b',accent:'#d8b964'},
  forest:{dark:'#234c32',light:'#90b98a',accent:'#ddae73'},
  river:{dark:'#1d6382',light:'#9fdfe7',accent:'#cbf4f0'},
  desert:{dark:'#b48a56',light:'#edca82',accent:'#f8e4ad'},
  mountain:{dark:'#526471',light:'#c4d1cc',accent:'#f0ded1'},
  ruins:{dark:'#655f67',light:'#d0bfa3',accent:'#b8a0dd'},
  swamp:{dark:'#354b36',light:'#9eb780',accent:'#c9d181'},
  coast:{dark:'#46829c',light:'#c4e0df',accent:'#e0c390'},
  city:{dark:'#6d6f62',light:'#d5be91',accent:'#f9da9e'}
 });
 const familyOf=z=>z>=16?Math.max(0,Math.min(3,Math.floor((z-16)/6))):
  z>=12&&z<=15?z-12:-1;
 const depthOf=z=>z>=16?1+(z-16)%6:0;
 const styleFor=z=>THEMES[familyOf(z)]||null;
 const hash=(a,b,c,d=1)=>{
  let n=Math.imul(a+971,73856093)^Math.imul(b+337,19349663)^Math.imul(c+17,83492791)^Math.imul(d+11,374761393);
  n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);
  return ((n^(n>>>16))>>>0)/4294967296;
 };
 const rect=(g,color,x,y,w,h)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
 const tileRect=(g,c,tx,ty,x,y,w,h)=>rect(g,c,tx*32+x,ty*32+y,w,h);
 // Novos tiles 32x32 com tramas pixeladas elaboradas de verdade. São calculados
 // uma vez ao entrar no mapa, jamais em cada frame da animação.
 function drawDungeonTile(g,tx,ty,z,kind){
  const family=familyOf(z),depth=depthOf(z),t=THEMES[family]||THEMES[0],
   x=tx*32,y=ty*32,n=hash(tx,ty,z,1),v=Math.floor(hash(tx,ty,z,4)*4);
  rect(g,kind==='path'?t.mid:t.base,x,y,32,32);
  // Lajes e juntas recortadas: alternância das fiadas evita o efeito de grade idêntica.
  const offset=(ty&1)*8;
  rect(g,t.dark,x,y,32,2);rect(g,t.line,x+((offset+v*4)%24),y,2,32);
  rect(g,t.light,x+2,y+2,22,1);rect(g,t.dark,x+1,y+29,27,2);
  for(let k=0;k<4;k++){
   const px=3+Math.floor(hash(tx,ty,z,k+10)*23),py=4+Math.floor(hash(tx,ty,z,k+17)*23);
   rect(g,k%2?t.dark:t.dust,x+px,y+py,k%2?3:5,1+k%3);
  }
  if(family===0){ // Raiz: solo úmido, musgo pixelado, raízes sinuosas e fungos.
   const moss=n>.34;
   if(moss){
    rect(g,t.light,x+3+v*4,y+5,5,3);rect(g,t.accent,x+5+v*4,y+5,2,2);
    rect(g,t.dark,x+7,y+17,2,9);rect(g,t.mid,x+9,y+21,9,3);
   }
   for(let j=0;j<2;j++){
    const px=4+Math.floor(hash(tx,ty,z,24+j)*20),py=6+j*13;
    rect(g,t.dark,x+px,y+py,12,2);rect(g,t.light,x+px+2,y+py+2,3,2);
   }
   if(n>.86){rect(g,'#ead5a2',x+21,y+19,4,2);rect(g,'#c3ad83',x+22,y+21,2,5)}
  }else if(family===1){ // Cinzas: basalto, escórias, sulcos incandescentes.
   for(let j=0;j<3;j++){
    const px=3+Math.floor(hash(tx,ty,z,32+j)*20),py=6+j*8;
    rect(g,t.dark,x+px,y+py,9,3);rect(g,t.dust,x+px+2,y+py,5,1);
   }
   if(n>.24){
    const px=6+v*4,py=10+(depth%3)*2;
    rect(g,'#632e30',x+px,y+py,3,8);rect(g,'#e06d3f',x+px+2,y+py+6,7,2);
    rect(g,n>.72?'#ffcb71':'#a94435',x+px+8,y+py+6,3,3);
   }
   if(n>.82)rect(g,'#e5aea0',x+4,y+26,3,1);
  }else if(family===2){ // Templo: mármore polido, mosaicos e símbolos antigos.
   rect(g,'#79728f',x+4,y+4,24,1);
   rect(g,'#23243d',x+4,y+27,24,2);
   rect(g,t.light,x+5,y+7,1,16);rect(g,t.mid,x+26,y+6,2,19);
   if((tx+ty+depth)%3===0){
    rect(g,t.accent,x+15,y+11,3,10);
    rect(g,t.accent,x+11,y+14,11,3);
    rect(g,t.glow,x+16,y+15,2,2);
    rect(g,t.dark,x+12,y+18,2,2);
   }else if(n>.6){
    for(let i=0;i<3;i++)rect(g,i===1?t.accent:t.light,x+11+i*4,y+17-Math.abs(i-1)*4,3,4);
   }
  }else{ // Aurora: mosaico estelar, veios de cristal e runas de ouro.
   rect(g,'#2e6a80',x+3,y+3,25,2);
   rect(g,t.dark,x+3,y+27,24,2);
   for(let i=0;i<4;i++){
    const px=3+Math.floor(hash(tx,ty,z,46+i)*26),py=4+Math.floor(hash(tx,ty,z,52+i)*22);
    rect(g,i%2?t.glow:t.light,x+px,y+py,2,2);
   }
   if(n>.54){
    rect(g,t.accent,x+15,y+7,2,17);rect(g,t.accent,x+8,y+14,17,2);
    rect(g,t.glow,x+13,y+12,6,6);rect(g,t.dark,x+15,y+14,2,2);
   }
  }
  if(kind==='path'){
   const highlight=family===1?'#ffb37a':family===2?'#e6d8bc':family===3?'#9cf9f1':'#94c383';
   rect(g,highlight,x+(tx%2?1:27),y+4,2,23);
   if((tx+ty+depth)%4===0)rect(g,t.accent,x+13,y+13,5,2);
  }
  SHADE?.dungeon(g,tx,ty,z,kind,t,hash);
 }
 // Ambientes abertos: paisagens distintas sem substituir ou distorcer atlas antigo.
 function drawSurfaceTile(g,tx,ty,z,biome,kind){
  const t=SURFACE[biome];if(!t)return;
  const x=tx*32,y=ty*32,n=hash(tx,ty,z,2),n2=hash(tx,ty,z,3);
  if(kind==='water'){
   rect(g,t.dark,x+2,y+4,15,2);rect(g,t.light,x+7,y+6,9,1);
   if(n>.52){rect(g,'#d0f3f0',x+19,y+19,9,2);rect(g,t.accent,x+22,y+21,4,1)}
   return;
  }
  if(biome==='desert'){
   rect(g,'#edcb89',x+2,y+7+Math.floor(n*8),19,2);
   rect(g,'#a78151',x+17,y+21,13,2);
   if(n>.69){rect(g,'#f3dda8',x+7,y+24,3,2);rect(g,'#9e7043',x+24,y+4,3,3)}
  }else if(biome==='mountain'){
   rect(g,'#a3b4b5',x+5,y+5,13,2);rect(g,'#435563',x+19,y+17,10,3);
   if(n>.54){rect(g,'#d9d3bf',x+2,y+25,8,2);rect(g,'#354b51',x+8,y+27,13,2)}
  }else if(biome==='ruins'){
   if(n>.33){
    rect(g,'#8d8384',x+3,y+4,23,3);rect(g,'#d3bd9c',x+5,y+5,12,1);
    rect(g,'#44394c',x+14,y+18,2,10);rect(g,'#b5a799',x+15,y+26,9,2);
   }
  }else if(biome==='city'){
   if(n>.25){rect(g,'#cabb9a',x+5,y+8,17,2);rect(g,'#777c72',x+5,y+10,2,12)}
   if(n>.7){rect(g,'#e9d2a0',x+23,y+19,5,3)}
  }else if(biome==='coast'){
   rect(g,'#edd6a3',x+5,y+12,15,2);rect(g,t.light,x+14,y+15,12,1);
   if(n>.6){rect(g,'#d6e2d2',x+24,y+4,2,6);rect(g,'#9f8d63',x+20,y+12,9,2)}
  }else if(biome==='swamp'){
   rect(g,'#1d493c',x+3,y+5,22,3);rect(g,'#749b69',x+9,y+8,5,2);
   if(n>.51){rect(g,'#bdd286',x+22,y+5,2,13);rect(g,'#748a57',x+20,y+11,7,2)}
  }else if(biome==='forest'){
   rect(g,'#183b2b',x+4,y+6,17,3);rect(g,'#80ad7b',x+7,y+7,7,2);
   if(n>.64){rect(g,'#c2b49c',x+24,y+16,2,5);rect(g,'#dd9c71',x+21,y+14,9,3)}
  }else if(biome==='meadow'){
   rect(g,'#245935',x+5,y+23,2,6);rect(g,'#7fb976',x+7,y+21,3,5);
   if(n>.48){rect(g,'#f0c8aa',x+22,y+10,4,4);rect(g,'#f5f1c6',x+23,y+11,2,2)}
  }else if(biome==='river'){
   rect(g,'#789b88',x+5,y+23,2,7);rect(g,'#acc79c',x+9,y+21,3,9);
  }
  if(n2>.88&&kind!=='path'){rect(g,t.accent,x+4,y+27,2,2);rect(g,t.dark,x+7,y+25,3,2)}
 }
 // Cenografia realmente específica de cada complexo, em mosaicos de 8-bit.
 // Não cria portais falsos e não altera colisão; o caminho continua livre.
 function drawArchitecture(g,z,pathY,ZW,ZH){
  const t=styleFor(z);if(!t)return;
  const family=familyOf(z),depth=depthOf(z);
  for(let y=64;y<ZH-80;y+=192)for(let x=100;x<ZW-115;x+=252){
   const n=hash(x>>4,y>>4,z,12);if(n<.18)continue;
   if(family===0){ // troncos enterrados e marcas de bosques esquecidos
    rect(g,t.dark,x,y,168,120);rect(g,t.mid,x+7,y+7,154,106);
    for(let i=0;i<5;i++){
     const px=x+12+i*28,dy=(i%2)*7;
     rect(g,'#223923',px,y+8+dy,8,97);
     rect(g,'#83a670',px+2,y+11+dy,2,83);
     rect(g,'#4a704d',px+7,y+21+dy,15,5);
    }
    rect(g,'#182a1c',x+27,y+32,118,60);
    rect(g,'#526d47',x+35,y+40,102,44);
    rect(g,'#c1bb80',x+80,y+52,5,25);
    rect(g,'#97ca80',x+71,y+61,24,6);
   }else if(family===1){ // lajes tectônicas rachadas, fornalhas e cinza
    rect(g,'#191a21',x,y,170,120);
    rect(g,'#63545d',x+5,y+5,158,110);
    for(let i=0;i<4;i++){
     rect(g,'#26212a',x+8+i*39,y+9,30,97);
     rect(g,'#e47144',x+38+i*31,y+24+i*15,3,65-i*11);
     rect(g,'#ffca83',x+39+i*31,y+40+i*12,1,17);
    }
    rect(g,'#b17a61',x+53,y+34,62,47);
    rect(g,'#291a21',x+59,y+40,50,35);
    rect(g,'#ed9d64',x+77,y+46,16,19);
   }else if(family===2){ // arquitetura cerimonial, espirais e mosaicos
    rect(g,'#26263e',x,y,170,122);
    rect(g,'#aaa1b6',x+6,y+6,158,110);
    for(let i=0;i<4;i++){
     rect(g,'#555370',x+15+i*39,y+15,31,90);
     rect(g,'#dfd0b2',x+17+i*39,y+17,27,3);
     rect(g,'#c3b1a5',x+27+i*39,y+37,5,51);
    }
    rect(g,'#dfc292',x+66,y+37,39,43);
    rect(g,'#494260',x+72,y+43,27,31);
    rect(g,'#d6caef',x+82,y+46,6,25);
   }else{ // geometria astral e altar cristalino
    rect(g,'#102d43',x,y,172,122);
    rect(g,'#397a8c',x+7,y+8,158,106);
    for(let i=0;i<5;i++){
     const px=x+18+i*29;
     rect(g,'#a5dbe1',px,y+12,4,96);
     rect(g,'#fae0a0',px+1,y+22,2,10);
     rect(g,'#122e41',px+10,y+18,8,91);
    }
    rect(g,'#72d9d6',x+74,y+27,28,55);
    rect(g,'#dff7dc',x+85,y+37,6,35);
    rect(g,'#183d60',x+80,y+83,20,4);
   }
   const rune=(depth+Math.floor(x/252)+Math.floor(y/192))%5;
   rect(g,t.accent,x+16+rune*12,y+108,8,3);
  }
  // Travessia principal permanece visível, com marcos diferentes conforme a profundidade.
  for(let x=70;x<ZW-70;x+=132){
   const y=Math.round(pathY(x,z)),n=hash(x>>3,depth,z,13);
   rect(g,t.dark,x-23,y-46,48,4);rect(g,t.accent,x-13,y-44,26,2);
   rect(g,t.dark,x-23,y+42,48,4);rect(g,t.light,x-11,y+42,22,2);
   if(n>.57)rect(g,t.glow,x+12,y-41,3,3);
  }
 }
 // Estátuas e objetos próprios, não interativos; apenas as passagens enviadas
 // pelo servidor podem ser atravessadas.
 function drawDungeonProp(g,o,z){
  const family=familyOf(z),t=styleFor(z);if(!t)return;
  const x=Math.round(o.x),y=Math.round(o.y);
  rect(g,'#08141088',x-28,y-4,56,6);
  if(family===0){
   rect(g,'#453b2e',x-14,y-65,29,61);rect(g,'#765d47',x-8,y-61,9,54);
   for(let i=0;i<5;i++){rect(g,'#5c8556',x-18+i*7,y-62+(i%2)*10,5,8);rect(g,'#b1dc8d',x-17+i*7,y-60+(i%2)*10,2,3)}
   rect(g,'#304c2b',x-25,y-22,51,12);
   rect(g,'#a5c780',x-10,y-47,19,4);
  }else if(family===1){
   rect(g,'#1c1c24',x-19,y-66,38,58);rect(g,'#74616a',x-14,y-63,28,51);
   rect(g,'#a68673',x-23,y-17,46,14);
   rect(g,'#ef7544',x-6,y-51,13,35);
   rect(g,'#ffd387',x-2,y-41,5,22);
   rect(g,'#331b27',x-9,y-58,19,6);
  }else if(family===2){
   rect(g,'#282842',x-24,y-70,48,62);rect(g,'#afa8b8',x-19,y-66,38,54);
   rect(g,'#ddc99b',x-24,y-17,48,9);
   rect(g,'#484768',x-14,y-56,28,35);
   rect(g,'#ded1ae',x-7,y-50,14,23);
   rect(g,'#8d78b7',x-5,y-45,10,15);
  }else{
   rect(g,'#153548',x-24,y-32,48,24);
   rect(g,'#bbd9e5',x-11,y-69,23,52);
   rect(g,'#3c8b9e',x-16,y-61,32,43);
   rect(g,'#9df4e1',x-4,y-57,9,34);
   rect(g,'#f9dc89',x-2,y-43,5,12);
   rect(g,'#1c3e4f',x-25,y-13,50,8);
  }
  rect(g,t.accent,x-21,y-9,8,2);
 }
 // Classe visível em todos os quadros, com equipamento e silhueta únicos.
 function drawHero(g,p,now){
  const x=Math.round(p.x),y=Math.round(p.y),tick=Math.floor(now/190)%2;
  if(p.role==='guardiao'){
   rect(g,'#233e4a',x-23,y-55,13,12);rect(g,'#adbfc2',x-23,y-55,11,5);
   rect(g,'#e9d09a',x-20,y-53,3,3);
   rect(g,'#233e4a',x+11,y-55,13,12);rect(g,'#d9dad2',x+12,y-54,8,5);
   rect(g,'#42505e',x-28,y-37+tick,9,18);rect(g,'#c6b785',x-27,y-33+tick,7,8);
  }else if(p.role==='arqueiro'){
   rect(g,'#634528',x+15,y-52,13,27);rect(g,'#c59655',x+17,y-51,8,22);
   for(let i=0;i<4;i++){rect(g,'#dcd7ae',x+18+i*2,y-61+(i%2)*3,2,15);rect(g,'#84a77a',x+18+i*2,y-63+(i%2)*3,2,4)}
   rect(g,'#345b43',x-19,y-43+tick,7,22);
   rect(g,'#9bc28c',x-18,y-41+tick,3,6);
  }else if(p.role==='curandeiro'){
   rect(g,'#e2d7b5',x-17,y-48,8,32);rect(g,'#8cb6cf',x-15,y-42,4,21);
   rect(g,'#e2d7b5',x+10,y-48,8,32);rect(g,'#8cb6cf',x+13,y-42,3,21);
   rect(g,'#f2d28b',x-3,y-45,7,9);rect(g,'#80d6c8',x-1,y-43,3,5);
   rect(g,'#baa873',x+23,y-56,3,43);rect(g,'#b7f4df',x+20,y-60,10,10);
  }else{
   rect(g,'#8f6542',x+13,y-42,10,17);rect(g,'#e4bc76',x+14,y-40,7,3);
   rect(g,'#677858',x-17,y-49,8,24);rect(g,'#b2bd88',x-17,y-49,4,5);
   rect(g,'#e4bb76',x-2,y-35,5,7);
  }
 }
 function drawMonster(g,m,now){
  const x=Math.round(m.x),y=Math.round(m.y),f=familyOf(m.zone||0);
  if(f<0){
   rect(g,'#e7d2a0',x-7,y-34,3,2);rect(g,'#e7d2a0',x+5,y-34,3,2);
   return;
  }
  const t=THEMES[f],boss=!!m.boss,blink=Math.floor(now/340)%2;
  const eye=boss?t.accent:t.glow;
  rect(g,eye,x-10,y-(boss?52:31),4,2+blink);
  rect(g,eye,x+6,y-(boss?52:31),4,2+blink);
  if(f===0){
   rect(g,'#224332',x-20,y-33,6,16);rect(g,'#83b45c',x-19,y-33,3,10);
   rect(g,'#557849',x+12,y-45,5,20);
  }else if(f===1){
   rect(g,'#eb7543',x-19,y-40,4,13);rect(g,'#ffce89',x-16,y-36,2,6);
   rect(g,'#6e3334',x+15,y-39,5,12);
  }else if(f===2){
   rect(g,'#b8a6da',x-23,y-43,5,12);rect(g,'#e0c997',x+18,y-43,5,12);
   rect(g,'#51466b',x-12,y-49,22,3);
  }else{
   rect(g,'#82e6e6',x-23,y-38,7,15);rect(g,'#f1d8a4',x+17,y-45,5,17);
   rect(g,'#306e91',x-8,y-54,19,3);
  }
  if(boss){
   const by=y-78,pts=[[-24,11],[-18,3],[-9,9],[0,0],[10,9],[19,3],[24,11]];
   for(const [dx,dy] of pts)rect(g,dx===0?t.glow:t.accent,x+dx,by+dy,5,5);
   rect(g,t.dark,x-27,by+16,56,6);
   for(let i=0;i<4;i++)rect(g,t.accent,x-20+i*13,by+17,5,3);
  }
 }
 function drawPortal(g,p,now){
  const z=p.zone,f=familyOf(z),t=THEMES[f]||THEMES[3],base=p.gateway?'#f3cb78':t.accent;
  for(let i=0;i<8;i++){
   const x=-35+(i%4)*22,y=-86+Math.floor(i/4)*75;
   rect(g,t.dark,x,y,9,10);
   rect(g,base,x+2,y+1,5,3);
   rect(g,t.glow,x+4,y+5,2,3);
  }
  for(let i=0;i<6;i++){
   const progress=(Math.floor(now/120)+i*7)%32;
   rect(g,i%2?t.glow:base,-12+((i*11)%31),-74+progress,2,3);
  }
  if(p.gateway){
   rect(g,'#f9dda6',-30,-93,60,4);
   rect(g,'#e5a65e',-24,-88,48,3);
   rect(g,'#fff4ce',-9,-84,18,3);
  }
 }
 function drawCombat(g,shot){
  const skill=!!shot.skill;
  if(shot.kind==='impact'){
   const t=Math.max(0,Math.min(1,(shot.impactAge||0)/220)),spread=9+Math.round(t*19);
   for(let i=0;i<10;i++){
    const a=i*Math.PI/5;
    rect(g,i%3===0?'#f7f1cf':skill?'#a8f7e1':'#f5b879',
      Math.cos(a)*spread,Math.sin(a)*spread,3+t*2,3+t*2);
   }
   rect(g,skill?'#f4dca4':'#f9ebc8',-4,-4,8*(1-t)+1,8*(1-t)+1);
  }else{
   rect(g,'#eed4a5',-20,-1,28,2);
   rect(g,'#61462b',-13,-2,10,1);
   rect(g,skill?'#85e7dd':'#b2dba0',-23,-5,4,11);
   rect(g,'#f7f6d9',15,-2,8,3);
  }
 }
 // Pequenos monumentos de cada bioma: apenas visuais, sem portais falsos.
 function drawSurfaceProp(g,o,biome,z){
  const theme=SURFACE[biome]||SURFACE.meadow,x=Math.round(o.x),y=Math.round(o.y);
  rect(g,'#08120c70',x-28,y-4,56,5);
  if(biome==='meadow'){
   rect(g,'#5e6d3e',x-13,y-33,27,28);
   for(let i=0;i<5;i++){
    const px=x-17+i*8;
    rect(g,'#3c6b3f',px,y-19-i%2*8,3,20);
    rect(g,i%2?'#ffe2a5':'#e0a9c0',px-4,y-25-i%2*8,10,6);
    rect(g,'#f8ecbe',px,y-23-i%2*8,2,2);
   }
  }else if(biome==='forest'){
   rect(g,'#49372c',x-28,y-17,55,13);
   rect(g,'#8c6245',x-25,y-16,49,5);
   for(let i=0;i<4;i++){
    const px=x-19+i*12;rect(g,'#d6c7a5',px,y-18,3,13);
    rect(g,i%2?'#c78a5b':'#bc5b49',px-5,y-23,13,6);
    rect(g,'#edd6b6',px-3,y-22,3,2);
   }
  }else if(biome==='river'){
   rect(g,'#4a6d64',x-23,y-23,8,19);
   rect(g,'#d0ac75',x+12,y-43,4,37);
   rect(g,'#f1cf96',x+13,y-40,14,3);
   for(let i=0;i<5;i++)rect(g,'#a2ca9b',x-23+i*9,y-14-i%2*10,3,14);
   rect(g,'#89d3dc',x-16,y-4,34,2);
  }else if(biome==='desert'){
   rect(g,'#567958',x-7,y-57,16,53);
   rect(g,'#8fa36c',x-4,y-52,4,43);
   rect(g,'#3e6c52',x-26,y-42,13,26);
   rect(g,'#607b54',x-25,y-25,21,7);
   rect(g,'#3e6c52',x+9,y-36,13,22);
   rect(g,'#73946b',x+4,y-20,18,7);
   for(let i=0;i<5;i++)rect(g,'#d7be8b',x-23+i*11,y-3-i%2*2,6,2);
  }else if(biome==='mountain'){
   rect(g,'#344854',x-25,y-23,52,19);
   rect(g,'#657785',x-20,y-48,39,31);
   rect(g,'#bbccc9',x-15,y-51,19,16);
   rect(g,'#4b6880',x-6,y-30,19,19);
   rect(g,'#bdd7d3',x+2,y-26,7,12);
   rect(g,'#f5e6ce',x-12,y-45,4,5);
  }else if(biome==='ruins'){
   rect(g,'#4a454e',x-25,y-27,50,22);
   rect(g,'#a49a98',x-22,y-66,21,54);
   rect(g,'#d4c9b1',x-28,y-68,37,9);
   rect(g,'#8f848c',x+9,y-41,17,33);
   rect(g,'#b5ab9c',x+7,y-42,22,6);
   rect(g,'#514458',x-13,y-55,3,30);
  }else if(biome==='swamp'){
   rect(g,'#244334',x-23,y-11,45,9);
   rect(g,'#6c8756',x-19,y-32,33,24);
   rect(g,'#a5bd77',x-18,y-30,16,5);
   for(let i=0;i<3;i++){
    rect(g,'#c6c19d',x-12+i*13,y-18,3,15);
    rect(g,i%2?'#d2b77a':'#b99cc5',x-15+i*13,y-24,11,8);
   }
  }else if(biome==='coast'){
   rect(g,'#8e7d64',x-27,y-12,54,9);
   rect(g,'#d6b985',x-24,y-30,44,15);
   rect(g,'#efe2be',x-14,y-33,23,11);
   for(let i=0;i<4;i++){
    rect(g,i%2?'#f7e4b8':'#bfaba0',x-22+i*12,y-12,10,6);
    rect(g,'#76afbc',x-17+i*12,y-9,4,3);
   }
  }else if(biome==='city'){
   rect(g,'#2e3b37',x-28,y-17,57,12);
   rect(g,'#bdad8a',x-20,y-45,40,28);
   rect(g,'#e6ca8e',x-18,y-43,36,5);
   rect(g,'#7f5b42',x-13,y-37,25,14);
   rect(g,'#eedaa5',x-8,y-32,16,7);
   rect(g,'#527867',x+21,y-34,7,28);
   rect(g,'#f9d98b',x+19,y-41,11,10);
  }
  rect(g,theme.accent,x-26,y-6,4,2);
 }
 // Poeira, brasa e reflexos discretos no estilo estritamente pixelado. Usa
 // ~14 partículas por frame e não interfere na área de clique ou colisões.
 function drawAtmosphere(g,{z,biome,cameraX,cameraY,W,H,now}){
  const theme=styleFor(z),palette=theme?
   [theme.glow,theme.accent,theme.light]:[
    (SURFACE[biome]||SURFACE.meadow).light,(SURFACE[biome]||SURFACE.meadow).accent
   ];
  const ticks=Math.floor(now/170),count=theme?16:10;
  for(let i=0;i<count;i++){
   const fx=hash(i,z,13),fy=hash(z,i,19);
   const x=((Math.floor(fx*W*2)-Math.floor(cameraX*.19)+i*37)%(W+60)+(W+60))%(W+60)-30;
   const speed=theme?.id==='cinzas'?2:theme?.id==='aurora'?1:0;
   const y=((Math.floor(fy*H*2)+ticks*(speed?speed:1)*(i%3===0?-1:1)-Math.floor(cameraY*.09))%(H+60)+(H+60))%(H+60)-30;
   const size=theme?.id==='aurora'&&i%4===0?4:2;
   rect(g,palette[i%palette.length],x,y,size,size);
   if(theme?.id==='cinzas'&&i%4===0)rect(g,'#f2a95f',x,y+3,1,3);
   if(theme?.id==='vozes'&&i%5===0)rect(g,'#e6d5f8',x+3,y-1,2,2);
  }
 }
 return {THEMES,SURFACE,familyOf,depthOf,styleFor,drawDungeonTile,drawSurfaceTile,
  drawArchitecture,drawDungeonProp,drawSurfaceProp,drawAtmosphere,drawHero,drawMonster,drawPortal,drawCombat};
});

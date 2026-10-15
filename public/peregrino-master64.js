'use strict';
/*
 * OS PEREGRINOS — Peregrino, pintura autoral 64 × 80.
 * Um sprite desenhado com clusters de pixels (contornos recortados, luz,
 * semitons, costuras, cabelo, metal e couro), não um bitmap 40 × 52 ampliado.
 * Quatro direções e cinco ações são compostas sobre as mesmas proporções.
 * A renderização é determinística, em coordenadas inteiras, sem filtros,
 * assets de terceiros nem chamadas de rede.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosPilgrimMaster64=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const W=64,H=80;
 const APP=typeof module==='object'&&module.exports?require('./appearance16'):globalThis.PeregrinosAppearance16;
 const COLORS=Object.freeze({
  ink:'#2a252c',near:'#443039',shadow:'#503139',coat:'#8a6245',
  leather:'#956641',leatherShade:'#593d35',leatherLight:'#c69460',
  ivory:'#ead7aa',trim:'#e4b976',metal:'#c6d6d8',metalShadow:'#607982',
  steel:'#f5f4e2',scarf:'#b34246',scarfShadow:'#742b40',scarfLight:'#eb7a63',
  hair:'#50382b',hairLight:'#8c5940',skin:'#dea978',skinLight:'#f4cf99',
  skinShadow:'#91664f',eye:'#50352a'
 });
 function draw(g,{role='peregrino',dir=2,action='idle',frame=0,colors={},appearance=null}={}){
  if(role!=='peregrino'||!g?.fillRect)return false;
  const a=APP?.normalize(appearance),custom=APP?.palette(colors,appearance)||colors;
  const palette={...COLORS,
   coat:custom.coat||COLORS.coat,leatherLight:custom.light||COLORS.leatherLight,
   hair:custom.hair||COLORS.hair,hairLight:custom.hairLight||COLORS.hairLight,
   skin:custom.skin||COLORS.skin,skinLight:custom.skinHighlight||COLORS.skinLight,
   skinShadow:APP?.SKIN?.[a?.skin]?.[2]||COLORS.skinShadow,
   eye:custom.eyeColor||COLORS.eye,trim:custom.trim||COLORS.trim,
   // Metal tem paleta de material própria: antes o cinza simples do estúdio
   // eliminava o brilho do fio e deixava a espada indistinta do couro.
   steel:COLORS.steel,metalShadow:COLORS.metalShadow,
   gem:custom.gem||'#a9e6ca',metal:COLORS.metal};
  const c=palette,back=dir===0,side=dir===1||dir===3,front=dir===2;
  const n=Number.isInteger(frame)?Math.max(0,frame):0;
  const walking=action==='walk',attacking=action==='attack';
  const step=walking?[0,3,5,2,-3,-4][n%6]:0;
  const bob=walking?[0,-1,-2,-1,0,-1][n%6]:
   action==='idle'?[0,0,-1,0][n%4]:0;
  const hit=attacking?[0,1,3,2,0][n%5]:0;
  const hurt=action==='hurt',dead=action==='death';
  const p=(color,x,y,w=1,h=1)=>{
   if(!color||w<=0||h<=0)return;
   g.fillStyle=color;
   g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  };
  const runs=(color,spans,dx=0,dy=0)=>{
   for(const [y,x,w,h=1]of spans)p(color,x+dx,y+dy,w,h);
  };
  // Não usamos Canvas fill()/stroke(): um bloco = um cluster real de pixels.
  if(dir===3){g.save();g.translate(W,0);g.scale(-1,1)}
  if(dead){g.save();g.translate(0,Math.min(12,n*2));g.scale(1,Math.max(.28,1-n*.15))}
  // Capa opcional e pontas quebradas: sombreadas ANTES de braços e torso.
  const capeColor=a?.cape&&a.cape!=='nenhuma'?
   ({vinho:'#75354c',marinho:'#354c73',musgo:'#456547',marfim:'#ddd2b2'})[a.cape]:null;
  if(capeColor){
   runs(c.ink,[[32,16,33,6],[39,15,36,10],[49,13,38,12],
    [61,15,11,10],[62,39,11,8],[66,27,9,10],[70,20,7,7],[71,46,5,6]],0,bob);
   runs(capeColor,[[34,18,29,6],[40,17,32,11],[51,16,33,10],
    [61,17,8,10],[63,38,8,9],[68,29,6,6]],0,bob);
   p(c.leatherLight,18,38+bob,3,20);
  }else{
   // A silhueta vermelha faz parte da identidade do Peregrino.
   runs(c.scarfShadow,[[28,18,26,5],[33,13,35,5],[37,10,13,7],
    [44,9,11,6],[51,7,9,4],[55,10,5,5]],0,bob);
   runs(c.scarf,[[30,19,26,4],[34,13,34,4],[38,11,11,7],[45,10,7,8]],0,bob);
   p(c.scarfLight,13,35+bob,19,2);
   p(c.scarfLight,12,40+bob,3,12);
  }
  // Cachecol é uma assinatura de classe, com ponta solta animada
  // independentemente do tronco; capas customizadas recebem dobras próprias.
  const flutter=walking?[0,2,3,1,-1,-2][n%6]:
   attacking?[0,-1,-3,3,5][n%5]:[0,0,1,0][n%4];
  if(!capeColor){
   runs(c.ink,[[39,9,7,4],[43,7,8,7],[49,5,8,5],
    [54,7,6,5],[58,10,4,3]],flutter,bob);
   runs(c.scarfShadow,[[40,10,7,5],[46,8,6,8],
    [53,7,6,3]],flutter,bob);
   runs(c.scarf,[[40,12,6,5],[45,10,6,7],
    [51,8,4,4]],flutter,bob);
   p(c.scarfLight,12+flutter,41+bob,2,8);
   p(c.scarfLight,10+flutter,48+bob,2,4);
   p('#f5a17c',12+flutter,54+bob,2,1);
   p(c.ink,9+flutter,57+bob,3,2);
  }else{
   // Camadas de tecido com bainha irregular nas capas personalizadas.
   runs('#302c36',[[51,16,5,7],[61,14,3,7],
    [65,39,3,7],[70,46,4,6]],flutter,bob);
   runs(capeColor,[[52,16,5,8],[63,14,3,7],
    [67,40,3,6],[72,46,3,4]],flutter,bob);
   p(c.leatherLight,18+flutter,42+bob,2,16);
   p('#d6bd92',20+flutter,62+bob,3,1);
  }
  // Botas com biqueiras e joelheiras; passada legível em 6 quadros.
  const leftStride=Math.max(0,step),rightStride=Math.max(0,-step);
  for(const [baseX,stride]of [[22,leftStride],[35,rightStride]]){
   const x=baseX+(walking?(baseX===22?Math.round(step*.5):-Math.round(step*.5)):0);
   const y=57+Math.round(stride*.45)+(attacking&&n%5===3?(baseX===22?-2:1):0);
   runs(c.ink,[[y,x,11,16],[y+10,x-3,14,7]]);
   p('#44383b',x+2,y+2,7,10);p('#765541',x+2,y+2,4,5);
   p(c.leatherLight,x+3,y+4,3,2);p(c.ink,x,y+10,12,4);
   p('#795d49',x+2,y+11,8,3);p(c.trim,x+3,y+11,2,2);
   p(c.ink,x-3,y+15,15,4);p('#4e4444',x-1,y+15,11,2);
   p('#baa078',x,y+16,7,1);
   // Recorte das botas, ilhós, joelheira e linhas de costura.
   p(c.ink,x-3,y+15,3,3);p('#b1875d',x-1,y+17,10,1);
   p('#382f35',x+1,y+2,9,4);p('#8b654b',x+2,y+3,6,3);
   p(c.leatherLight,x+3,y+3,3,1);p(c.trim,x+4,y+7,3,2);
   p('#fae0a7',x+5,y+7,1,1);
   for(let lace=0;lace<3;lace++){
    p(c.ink,x+3+lace,y+11+lace%2,2,1);
    p('#b99670',x+4+lace,y+12+lace%2,1,1);
   }
   p('#c8a37c',x+1,y+14,5,1);
  }
  // Saia/jaqueta assimétrica com sombras internas e cintura de couro.
  runs(c.ink,[[35,17,32,15],[43,15,35,9],[51,17,32,8],
   [58,19,13,8],[59,33,16,8]],0,bob);
  runs(c.coat,[[36,19,28,15],[47,17,31,7],[54,20,12,10],
   [54,35,12,9]],0,bob);
  p(c.leatherShade,19,38+bob,5,18);p(c.leatherLight,23,37+bob,5,15);
  p(c.leatherLight,30,38+bob,14,17);
  p(c.ink,38,41+bob,3,11);p(c.leatherShade,40,43+bob,6,14);
  p('#5c443b',22,56+bob,9,8);p('#745541',36,56+bob,10,6);
  // Painéis assimétricos do gibão: dobras e bordas recortadas.
  runs(c.leatherShade,[[43,17,4,9],[46,19,4,8],[53,18,5,7],
   [57,18,5,5],[58,44,5,7]],0,bob);
  runs(c.coat,[[42,20,5,8],[49,19,5,6],[56,21,5,7],
   [59,36,8,4],[61,42,4,4]],0,bob);
  runs(c.leatherLight,[[38,20,3,9],[42,24,2,7],[48,23,5,2],
   [55,20,6,2],[60,37,5,2]],0,bob);
  p('#483338',30,57+bob,7,8);p('#b38b65',32,58+bob,2,6);
  p(c.ink,27,61+bob,3,3);p('#c5976f',22,61+bob,5,1);
  // Bainha e rasgos irregulares da jaqueta.
  runs(c.ink,[[62,17,7,2],[63,27,6,3],[62,37,5,3],[64,44,6,2]],0,bob);
  p(c.trim,20,60+bob,4,2);p(c.leatherLight,37,60+bob,5,2);
  p('#ddc399',25,62+bob,3,2);p('#dbb37a',39,62+bob,2,2);
  // Camisa de linho e peitoral sob as tiras.
  p(c.ink,24,35+bob,19,9);p(c.ivory,26,35+bob,14,8);
  p('#ba9a74',28,35+bob,9,5);p('#fff0d1',29,36+bob,4,2);
  p(c.ink,27,39+bob,16,3);p(c.trim,29,39+bob,11,2);
  // Alça diagonal de couro e rebites de bronze.
  runs(c.ink,[[35,43,5,3],[38,40,6,3],[41,37,6,3],
   [44,34,6,3],[47,31,5,4],[50,28,6,3]],0,bob);
  runs('#765037',[[36,43,3,3],[39,40,4,3],[42,37,4,3],
   [45,34,4,3],[48,31,4,3],[51,28,4,2]],0,bob);
  for(const [x,y]of [[44,36],[40,41],[34,47],[29,52]]){
   p(c.trim,x,y+bob,2,2);p('#f4db9b',x,y+bob,1,1);
  }
  // Cinto, fivela e bolsas de viagem.
  p(c.ink,19,52+bob,30,6);p('#684330',20,53+bob,27,3);
  p(c.leatherLight,20,53+bob,9,1);p(c.trim,31,52+bob,8,7);
  p(c.ink,33,53+bob,4,5);p('#fff0be',32,53+bob,2,1);
  p(c.ink,43,50+bob,13,16);
  p('#856343',45,52+bob,11,12);
  p(c.leatherLight,46,53+bob,9,3);p('#5e432e',46,58+bob,9,4);
  p(c.trim,49,56+bob,4,3);p(c.ink,50,57+bob,2,1);
  p('#b88e60',45,63+bob,8,1);
  // Bolsa com aba, alça, costura e fecho, não um retângulo.
  p('#453136',44,51+bob,2,15);p('#654333',46,54+bob,10,11);
  p('#ad8053',46,54+bob,10,3);p('#d6a471',47,54+bob,7,2);
  p(c.ink,48,58+bob,7,4);p('#9c6b49',49,58+bob,6,3);
  p(c.trim,50,57+bob,4,3);p('#fff0ba',51,57+bob,2,1);
  p('#332e36',48,63+bob,7,2);p('#bc9468',49,63+bob,5,1);
  for(const [x,y]of [[46,59],[47,61],[54,60],[54,63]])
   p('#e0b581',x,y+bob,1,1);
  // Braços: punhos sob luvas, ombreiras com volume.
  const armSwing=walking?Math.trunc(step/2):0;
  const swordLift=attacking?hit*3:0;
  runs(c.ink,[[35,9,12,11],[43,9,10,14],[53,12,10,5],
   [35,46,12,10],[46,49,11,13]],0,bob);
  p(c.coat,11,36+bob,8,16);p(c.leatherLight,11,37+bob,4,11);
  p('#d5a46b',12,38+bob,6,3);p(c.ink,12,49+bob,8,5);
  p('#906b4f',13,49+bob,6,4);p(c.trim,14,50+bob,3,2);
  p('#47323a',10,43+bob,4,6);p('#b88558',14,42+bob,5,2);
  p(c.trim,12,48+bob,6,2);p('#f0c997',13,48+bob,2,1);
  p('#4c3536',14,52+bob,5,2);
  p(c.coat,48,36+bob,9,15);p(c.leatherLight,49,37+bob,6,5);
  p(c.leatherShade,53,42+bob,4,8);
  p(c.trim,49,39+bob,6,2);p(c.ivory,50,39+bob,2,1);
  p('#4d363a',53,43+bob,4,9);p('#bf9263',50,45+bob,3,5);
  p(c.ink,48,51+bob+armSwing,10,7);
  p('#92775a',50,52+bob+armSwing,7,4);p(c.trim,52,53+bob+armSwing,2,2);
  // Ombreiras sobrepostas, com rebites destacados.
  runs(c.ink,[[32,11,10,4],[32,46,9,5]],0,bob);
  p('#9e7e50',13,33+bob,8,5);p(c.trim,13,34+bob,6,2);
  p('#c59a5f',48,34+bob,7,3);p(c.ivory,49,34+bob,4,1);
  p(c.ink,17,34+bob,2,3);p(c.ink,52,35+bob,2,2);
  for(const [x,y]of [[14,34],[18,36],[48,34],[52,37],[20,45],[45,43]]){
   p('#6d4c3b',x,y+bob,3,2);p(c.trim,x+1,y+bob,2,1);
   p('#fff4cf',x+1,y+bob,1,1);
  }
  // Vistas desenhadas separadamente: peito só na frente; nas costas,
  // o equipamento de viagem e as costuras do gibão substituem esse peitoral.
  if(back){
   runs(c.ink,[[36,23,22,8],[43,21,26,9],[52,23,22,5]],0,bob);
   runs(c.coat,[[37,24,19,8],[45,23,22,7],[53,25,18,3]],0,bob);
   p(c.leatherShade,24,38+bob,4,15);p(c.leatherLight,26,39+bob,2,11);
   p(c.leatherShade,41,38+bob,4,16);p(c.leatherLight,41,39+bob,2,11);
   // Correias cruzadas da mochila e bolsa do aventureiro.
   for(let i=0;i<11;i++){
    p(c.ink,26+i,38+i+bob,4,3);
    p('#86613c',27+i,39+i+bob,3,2);
    p(c.trim,28+i,40+i+bob,1,1);
    p(c.ink,40-i,38+i+bob,4,3);
    p('#b1875b',41-i,39+i+bob,2,2);
   }
   p(c.ink,28,46+bob,15,13);p('#725037',29,47+bob,13,10);
   p('#c39a64',30,48+bob,11,3);p('#4c3634',30,52+bob,11,4);
   p(c.trim,34,51+bob,5,3);p('#fff1bc',36,51+bob,2,1);
   p('#c99d6d',31,56+bob,10,1);
  }else if(side){
   // Ombro próximo sombreado, manga distante e bolsa à mostra.
   runs(c.leatherShade,[[37,43,4,11],[48,43,4,7],
    [56,40,5,6]],0,bob);
   runs(c.coat,[[39,41,3,11],[48,41,3,6]],0,bob);
   p(c.leatherLight,43,37+bob,3,9);
   p(c.ivory,29,37+bob,8,3);
   p('#4b3634',45,52+bob,9,8);
   p('#ad7d4f',47,53+bob,8,3);
   p(c.trim,49,56+bob,4,2);
  }
  if(walking){
   // Contrapeso dos ombros em relação às pernas: cada braço tem ritmo próprio.
   const swing=[0,2,3,1,-2,-3][n%6];
   p(c.leatherShade,12,48+bob-swing,4,5);
   p(c.leatherLight,13,48+bob-swing,2,3);
   p(c.ink,52,48+bob+swing,3,5);
   p(c.trim,53,49+bob+swing,1,2);
  }
  // Pescoço e pescoceira; scarf vermelho sobre a armadura.
  p(c.ink,26,28+bob,15,10);
  p(c.skin,29,28+bob,10,7);
  runs(c.scarfShadow,[[31,22,24,5],[34,18,31,5],[38,21,23,4]],0,bob);
  runs(c.scarf,[[32,24,23,4],[35,19,28,3],[38,22,18,2]],0,bob);
  p(c.scarfLight,23,33+bob,14,2);
  p('#ba6050',22,35+bob,5,2); // borda avermelhada do lenço clássico
  p('#9e4350',42,37+bob,3,7); // dobra vinho na ponta do cachecol
  p('#f69a74',28,36+bob,10,1);
  p(c.scarfShadow,43,36+bob,5,8);
  p(c.scarf,43,37+bob,4,9);
  p('#f2826a',44,39+bob,2,7);
  // Cabeça em blocos orgânicos recortados; face não é mais um quadrado.
  runs(c.ink,[[12,23,19,4],[15,21,24,10],[23,22,24,6],
    [29,25,21,3]],0,bob);
  if(back){
   runs(c.hair,[[12,23,19,7],[19,22,23,8],[27,24,19,7]],0,bob);
   p(c.hairLight,25,16+bob,12,3);p(c.hairLight,23,22+bob,6,2);
   p(c.hair,39,28+bob,6,6);
   p(c.scarfShadow,27,30+bob,16,3);
  }else{
   runs(c.skinShadow||'#91664f',[[15,24,17,10],[25,23,20,5]],0,bob);
   runs(c.skin,[[15,25,17,8],[23,24,20,5],[28,28,14,2]],0,bob);
   p(c.skinLight,26,16+bob,9,3);
   p('#f8ddb0',27,19+bob,3,6);
   p(c.skinShadow||'#91664f',40,20+bob,3,7);
   p('#e7b387',29,26+bob,11,2);
   if(front){
    // Sobrancelhas, olho com íris personalizável, nariz e expressão.
    p(c.ink,26,21+bob,6,2);p(c.ink,36,21+bob,6,2);
    p('#f8e8c8',27,23+bob,5,3);p('#f8e8c8',37,23+bob,4,3);
    p(c.eye,29,23+bob,2,3);p(c.eye,38,23+bob,2,3);
    p('#18262a',30,23+bob,1,2);p('#18262a',39,23+bob,1,2);
    p('#fffaf0',28,23+bob,1,1);
    p(c.skinLight,33,25+bob,4,3);p(c.skinShadow||'#91664f',35,27+bob,3,1);
    p('#6f463c',31,29+bob,7,1);p(c.skinLight,33,30+bob,5,1);
    p('#cc896c',26,27+bob,3,2);
   }else if(side){
    p(c.ink,38,21+bob,5,2);p('#f8e8c8',38,23+bob,5,3);
    p(c.eye,40,23+bob,2,2);p(c.ink,42,23+bob,1,2);
    p(c.skinLight,43,26+bob,3,2);p(c.skinShadow||'#91664f',36,29+bob,7,1);
   }
   // Cabelo com mechas irregulares e luz separada da massa da cabeça.
   const hairShift=walking&&n%2===0?-1:0;
   if(a?.hairStyle==='raspado'){
    runs(c.hair,[[11,25,15,3],[14,23,19,2]],0,bob);
    p(c.hairLight,27,11+bob,10,1);
   }else{
    runs(c.ink,[[8,27,13,2],[9,23,20,4],[12,19,27,6],
      [17,20,7,6],[17,41,6,6]],0,bob);
    runs(c.hair,[[8,28,12,3],[10,23,21,5],[14,21,26,4],
      [17,21,7,5],[17,40,5,5]],0,bob);
    // Franja em pontas, jamais uma chapa única horizontal.
    p(c.hair,24,17+bob,6,5);p(c.hair,30,15+bob,5,6);
    p(c.hair,38,16+bob,5,6);
    runs(c.hairLight,[[9,30,8,2],[12,25,8,2],[13,36,6,2],
      [16,24,4,3]],hairShift,bob);
    p('#d19a6b',30+hairShift,10+bob,5,1);
    p(c.hair,21,22+bob,3,8);
    if(['medio','longo','tranca','rabo'].includes(a?.hairStyle)){
     p(c.ink,21,21+bob,5,a.hairStyle==='medio'?12:20);
     p(c.hair,22,22+bob,3,a.hairStyle==='medio'?11:19);
     if(a.hairStyle==='longo'){
      p(c.ink,42,20+bob,6,25);p(c.hair,44,21+bob,4,24);
      p(c.hairLight,44,23+bob,1,15);
     }
     if(a.hairStyle==='rabo'||a.hairStyle==='tranca'){
      p(c.ink,43,19+bob,8,6);
      for(let i=0;i<5;i++){
       p(i%2?c.hair:c.hairLight,49+i%2,23+bob+5*i,5,5);
       p(c.ink,54,24+bob+5*i,2,3);
      }
     }
    }
   }
  }
  // Segunda passada manual de rosto e cabelo. Silhueta assimétrica:
  // mechas recortadas e dentes de luz em vez de uma chapa de cabelo.
  const hairWind=walking?[0,1,-1,0,1,-1][n%6]:
   attacking?[0,-1,-2,2,1][n%5]:0;
  if(!back){
   if(a?.hairStyle!=='raspado'){
    runs(c.ink,[[7,30,8,3],[9,25,6,2],[11,21,4,6],
     [18,20,4,8],[15,41,6,7]],hairWind,bob);
    runs(c.hair,[[8,30,8,3],[10,25,7,4],
     [13,22,5,6],[18,21,3,6],[16,41,5,7]],hairWind,bob);
    runs(c.hairLight,[[9,32,7,2],[12,27,5,2],
     [14,23,3,3],[17,42,2,5]],hairWind,bob);
    p(c.hair,26+hairWind,15+bob,7,3);
    p(c.hair,31+hairWind,16+bob,5,5);
    p(c.hair,38+hairWind,16+bob,5,6);
    p(c.hairLight,29+hairWind,12+bob,3,2);
    p(c.hairLight,38+hairWind,13+bob,2,3);
    p(c.ink,22+hairWind,22+bob,2,5);
    p(c.hairLight,43+hairWind,19+bob,1,4);
   }
   // Maçãs do rosto, testa, sobrancelha e nariz em quatro valores.
   // As tonalidades dependem do tom de pele selecionado na conta.
   p(c.skinShadow,25,26+bob,3,3);
   p(c.skinLight,28,27+bob,3,1);
   p(c.skinLight,33,25+bob,2,1);
   p(c.skinShadow,35,28+bob,3,1);
   p(c.skin,38,29+bob,3,2);
   p(c.skinLight,32,30+bob,4,1);
   if(front){
    p(c.ink,26,21+bob,5,1);
    p(c.ink,36,20+bob,5,1);
    p(c.eye,29,24+bob,2,2);p(c.eye,38,24+bob,2,2);
    p('#ffffff',28,23+bob,1,1);p('#ffffff',38,23+bob,1,1);
    p(c.skinShadow,34,27+bob,2,1);
    p(c.ink,31,29+bob,7,1);
    p(c.skinLight,33,30+bob,5,1);
    if(hurt)p(c.ink,33,30+bob,4,2);
   }else if(side){
    p(c.skinLight,44,25+bob,3,2);p(c.skinShadow,44,27+bob,3,1);
    p(c.eye,41,24+bob,2,2);p('#fff9ed',41,23+bob,1,1);
    p(c.ink,38,29+bob,6,1);
   }
  }else{
   // Nuca e mechas posteriores mantêm cor e estilo personalizados.
   for(const [x,y]of [[24,18],[26,24],[31,17],[34,23],[40,20],[42,27]]){
    p(c.hairLight,x,y+bob,3,2);
    p(c.hair,x+1,y+2+bob,3,2);
   }
   p(c.ink,24,30+bob,19,2);
  }
  // Acessórios permanecem ligados às escolhas do perfil.
  if(a?.accessory==='tiara'){
   p(c.trim,23,16+bob,21,2);p(c.gem,31,14+bob,5,4);
   p('#fff6d7',32,14+bob,2,1);
  }else if(a?.accessory==='brinco'&&!back){
   p(c.trim,42,27+bob,3,4);p(c.steel,43,29+bob,2,2);
  }else if(a?.accessory==='amuleto'&&!back){
   p(c.trim,33,39+bob,6,3);p(c.gem,35,40+bob,3,4);
  }
  // Cinco keyframes reais de esgrima: guarda, antecipação, corte,
  // impacto e recuperação. Não rotacionar o Canvas evita antialiasing.
  const stances=[
   {h:[9,68],t:[9,32]},       // repouso: lâmina vertical
   {h:[18,51],t:[8,15]},      // recolhe o ombro antes do golpe
   {h:[27,39],t:[5,18]},      // espada diagonal e braço levantado
   {h:[29,43],t:[58,22]},     // impacto e transferência de peso
   {h:[21,57],t:[53,46]}      // follow-through, ponta baixa
  ];
  const stance=attacking?stances[n%5]:stances[0];
  const [hx,hy]=stance.h,[tx,ty]=stance.t;
  // Bresenham sobre a grade de 64x80. Uma linha, vários materiais:
  // espinha escura, aço frio e um único fio branco.
  const pixelLine=(color,x0,y0,x1,y1,width=1)=>{
   x0=Math.round(x0);y0=Math.round(y0);
   x1=Math.round(x1);y1=Math.round(y1);
   const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0);
   const sx=x0<x1?1:-1,sy=y0<y1?1:-1;
   let error=dx-dy;
   for(let i=0;i<82;i++){
    p(color,x0-Math.floor(width/2),y0-Math.floor(width/2),width,width);
    if(x0===x1&&y0===y1)break;
    const twice=error*2;
    if(twice>-dy){error-=dy;x0+=sx}
    if(twice<dx){error+=dx;y0+=sy}
   }
  };
  // Antebraço da espada acompanha a mão; luva possui volume próprio.
  if(attacking){
   const advance=[0,2,5,8,3][n%5];
   p(c.ink,11+advance,44+Math.min(3,hit)+bob,10,9);
   p(c.leatherShade,13+advance,45+Math.min(3,hit)+bob,7,6);
   p(c.leatherLight,14+advance,46+Math.min(3,hit)+bob,4,2);
   p(c.trim,16+advance,47+Math.min(3,hit)+bob,2,2);
  }
  pixelLine(c.ink,hx,hy,tx,ty,8);
  pixelLine(c.metalShadow,hx,hy,tx,ty,6);
  pixelLine(c.metal,hx-1,hy,tx-1,ty,3);
  pixelLine(c.steel,hx-2,hy,tx-2,ty,1);
  // Viés do fio e reflexão alternada no aço (não uma barra uniforme).
  for(let i=2;i<29;i+=6){
   const ratio=i/36;
   const x=Math.round(hx+(tx-hx)*ratio);
   const y=Math.round(hy+(ty-hy)*ratio);
   p('#d7e8e5',x-1,y,1,3);
   p('#ffffff',x-2,y,1,1);
  }
  // Guarda ligeiramente perpendicular ao fio, cabo e pomo ornamentado.
  const slope=Math.abs(tx-hx)>Math.abs(ty-hy);
  if(slope){
   p(c.ink,hx-2,hy-6,4,13);
   p(c.trim,hx-1,hy-5,2,11);
   p('#ffe5a5',hx,hy-2,1,4);
  }else{
   p(c.ink,hx-8,hy-1,17,5);
   p(c.trim,hx-7,hy,15,3);
   p('#ffefbc',hx-5,hy,8,1);
  }
  const gripX=hx+(hx>tx?4:-4),gripY=hy+(hy>ty?8:-8);
  pixelLine(c.ink,hx,hy,gripX,gripY,5);
  pixelLine('#87563c',hx,hy,gripX,gripY,3);
  p(c.trim,gripX-2,gripY-1,5,3);
  p('#fff0be',gripX-1,gripY-1,2,1);
  if(attacking&&(n%5===2||n%5===3)){
   // Arco escalonado de deslocamento: quadros sucessivos em locais distintos.
   const trail=n%5===2?
    [[7,7,6,2],[12,9,3,2],[18,13,3,2],[23,17,3,2],
     [27,22,2,3],[30,28,2,3]]:
    [[51,11,4,2],[55,14,3,3],[58,18,2,4],[59,23,2,4],
     [57,29,3,2],[53,33,3,2]];
   runs('#8ee0ec',trail,0,bob);
   const glint=trail[Math.min(n%5,trail.length-1)];
   p('#eafff8',glint[1]+2,glint[0]+bob,2,2);
   p('#d8fff5',36,32+bob,2,1);
  }else if(attacking&&n%5===1){
   p('#fff2cc',tx-2,ty-4+bob,2,3);
  }
  if(hurt){
   p('#f8d1b2',22,27+bob,3,3);p('#f8d1b2',37,37+bob,3,2);
   p('#de745b',13,40+bob,5,3);
  }
  // Brilho de metal e costuras pontuais, uma faceta por cluster.
  p('#f5dfb1',48,39+bob,2,1);p(c.steel,47,53+bob,2,1);
  p(c.trim,24,45+bob,1,2);p(c.trim,21,50+bob,1,2);
  if(dead)g.restore();
  if(dir===3)g.restore();
  return true;
 }
 return Object.freeze({WIDTH:W,HEIGHT:H,draw,VERSION:'peregrino-master64-v2'});
});

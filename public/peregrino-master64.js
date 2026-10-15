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
   eye:custom.eyeColor||COLORS.eye,trim:custom.trim||COLORS.trim,
   steel:custom.metal||COLORS.steel,
   gem:custom.gem||'#a9e6ca',metal:custom.metal||COLORS.metal};
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
  // Botas com biqueiras e joelheiras; passada legível em 6 quadros.
  const leftStride=Math.max(0,step),rightStride=Math.max(0,-step);
  for(const [x,stride]of [[22,leftStride],[35,rightStride]]){
   const y=57+stride;
   runs(c.ink,[[y,x,11,16],[y+10,x-3,14,7]]);
   p('#44383b',x+2,y+2,7,10);p('#765541',x+2,y+2,4,5);
   p(c.leatherLight,x+3,y+4,3,2);p(c.ink,x,y+10,12,4);
   p('#795d49',x+2,y+11,8,3);p(c.trim,x+3,y+11,2,2);
   p(c.ink,x-3,y+15,15,4);p('#4e4444',x-1,y+15,11,2);
   p('#baa078',x,y+16,7,1);
  }
  // Saia/jaqueta assimétrica com sombras internas e cintura de couro.
  runs(c.ink,[[35,17,32,15],[43,15,35,9],[51,17,32,8],
   [58,19,13,8],[59,33,16,8]],0,bob);
  runs(c.coat,[[36,19,28,15],[47,17,31,7],[54,20,12,10],
   [54,35,12,9]],0,bob);
  p(c.leatherShade,19,38+bob,5,18);p(c.leatherLight,23,37+bob,5,15);
  p('#b08458',30,38+bob,14,17);
  p(c.ink,38,41+bob,3,11);p(c.leatherShade,40,43+bob,6,14);
  p('#5c443b',22,56+bob,9,8);p('#745541',36,56+bob,10,6);
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
  // Braços: punhos sob luvas, ombreiras com volume.
  const armSwing=walking?Math.trunc(step/2):0;
  const swordLift=attacking?hit*3:0;
  runs(c.ink,[[35,9,12,11],[43,9,10,14],[53,12,10,5],
   [35,46,12,10],[46,49,11,13]],0,bob);
  p(c.coat,11,36+bob,8,16);p(c.leatherLight,11,37+bob,4,11);
  p('#d5a46b',12,38+bob,6,3);p(c.ink,12,49+bob,8,5);
  p('#906b4f',13,49+bob,6,4);p(c.trim,14,50+bob,3,2);
  p(c.coat,48,36+bob,9,15);p(c.leatherLight,49,37+bob,6,5);
  p(c.leatherShade,53,42+bob,4,8);
  p(c.ink,48,51+bob+armSwing,10,7);
  p('#92775a',50,52+bob+armSwing,7,4);p(c.trim,52,53+bob+armSwing,2,2);
  // Ombreiras sobrepostas, com rebites destacados.
  runs(c.ink,[[32,11,10,4],[32,46,9,5]],0,bob);
  p('#9e7e50',13,33+bob,8,5);p(c.trim,13,34+bob,6,2);
  p('#c59a5f',48,34+bob,7,3);p(c.ivory,49,34+bob,4,1);
  p(c.ink,17,34+bob,2,3);p(c.ink,52,35+bob,2,2);
  // Pescoço e pescoceira; scarf vermelho sobre a armadura.
  p(c.ink,26,28+bob,15,10);
  p(c.skin,29,28+bob,10,7);
  runs(c.scarfShadow,[[31,22,24,5],[34,18,31,5],[38,21,23,4]],0,bob);
  runs(c.scarf,[[32,24,23,4],[35,19,28,3],[38,22,18,2]],0,bob);
  p(c.scarfLight,23,33+bob,14,2);
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
  // Acessórios permanecem ligados às escolhas do perfil.
  if(a?.accessory==='tiara'){
   p(c.trim,23,16+bob,21,2);p(c.gem,31,14+bob,5,4);
   p('#fff6d7',32,14+bob,2,1);
  }else if(a?.accessory==='brinco'&&!back){
   p(c.trim,42,27+bob,3,4);p(c.steel,43,29+bob,2,2);
  }else if(a?.accessory==='amuleto'&&!back){
   p(c.trim,33,39+bob,6,3);p(c.gem,35,40+bob,3,4);
  }
  // Espada: duas arestas, guarda de bronze, fio luminoso e empunhadura.
  // O golpe desloca lâmina + braço, sem mudar sua hitbox no servidor.
  const bladeY=attacking?28-hit*5:38;
  const bladeX=attacking?5+hit*3:3;
  runs(c.ink,[[bladeY,bladeX+4,7,32],
    [bladeY-3,bladeX+5,5,4],[bladeY+31,bladeX+5,7,7]],0,bob+swordLift);
  p(c.metalShadow,bladeX+5,bladeY+bob+swordLift,5,31);
  p(c.metal,bladeX+6,bladeY+bob+swordLift,3,29);
  p(c.steel,bladeX+7,bladeY+bob+swordLift,1,25);
  p('#e0e1c5',bladeX+7,bladeY-4+bob+swordLift,2,6);
  p(c.trim,bladeX+2,bladeY+27+bob+swordLift,13,4);
  p('#f8e0a0',bladeX+3,bladeY+27+bob+swordLift,8,1);
  p(c.ink,bladeX+6,bladeY+30+bob+swordLift,4,12);
  p('#87563c',bladeX+7,bladeY+31+bob+swordLift,2,9);
  p(c.trim,bladeX+6,bladeY+40+bob+swordLift,5,3);
  if(attacking){
   runs('#8ee0ec',[[7+hit,4,4,2],[10+hit,8,3,2],
    [13+hit,11,4,2],[16+hit,15,4,2]],0,bob);
   p('#eafff8',14,17+hit+bob,3,2);
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
 return Object.freeze({WIDTH:W,HEIGHT:H,draw,VERSION:'peregrino-master64-v1'});
});

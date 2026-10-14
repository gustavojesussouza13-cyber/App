'use strict';
/*
 * Crônicas da Aurora — desenhos autorais em pixel art nativa 64×80.
 * Coordenadas inteiras: contorno, paleta limitada, sombreamento em blocos,
 * feições legíveis e silhuetas únicas para todas as classes e espécies.
 * Sem ampliação de bitmap de baixa resolução, filtro ou geração de ruído.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosRetro64=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const WIDTH=64,HEIGHT=80;
 const hash=(n,s=0)=>{let h=2166136261^s;for(const c of String(n||'')){h=Math.imul(h^c.charCodeAt(0),16777619)}return h>>>0};
 const px=(g,c,x,y,w,h)=>{if(!c||w<=0||h<=0)return;g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
 const brick=(g,x,y,w,h,edge,base,shine)=>{
  px(g,edge,x-2,y-2,w+4,h+4);
  px(g,base,x,y,w,h);
  if(shine)px(g,shine,x+2,y+2,Math.max(2,w-6),3);
 };
 const woven=(g,x,y,w,h,base,light,edge,seed)=>{
  brick(g,x,y,w,h,edge,base,light);
  for(let i=0;i<5;i++){
   const xx=x+3+((i*7+seed)%Math.max(4,w-8));
   px(g,i%3?light:edge,xx,y+6+i*4,2,2);
  }
 };
 function appearance(input){
  const app=typeof module==='object'&&module.exports?require('./appearance16'):root.PeregrinosAppearance16;
  return {a:app?.normalize(input),lib:app};
 }
 function hero(g,{role='peregrino',dir=2,action='idle',frame=0,colors={},appearance:input=null}={}){
  const {a,lib}=appearance(input);
  const c=a&&lib?lib.palette(colors,a):colors;
  const out=c.edge||'#293333',trim=c.trim||'#d2b07b',cloth=c.coat||'#657b69';
  const lit=c.light||'#abc3a0',metal=c.metal||'#d8ded4',gem=c.gem||'#a3e9db';
  const skin=c.skin||'#dea979',hair=c.hair||'#5c392f',hairLight=c.hairLight||'#aa7960';
  const front=dir===2,back=dir===0;
  const seed=hash(role),step=action==='walk'?[0,3,5,1,-3,-2][frame%6]:0;
  const lift=action==='attack'?[0,3,7,4,1][frame%5]:action==='hurt'?[0,-2,1][frame%3]:0;
  const bounce=action==='walk'?(frame%3===1?-2:0):action==='idle'&&frame%4===2?1:0;
  if(dir===3){g.save();g.translate(WIDTH,0);g.scale(-1,1)}
  if(action==='death'){g.save();g.translate(0,Math.min(10,frame*2));g.scale(1,Math.max(.28,1-frame*.16))}
  // Pernas, botas com volume e passo independente; mesmo chão em todas as direções.
  const leg1=step>0?step:0,leg2=step<0?-step:0;
  woven(g,21,58+leg1,10,15,c.boots||out,'#987962',out,seed);
  woven(g,36,58+leg2,10,15,c.boots||out,'#b28b73',out,seed);
  px(g,out,18,73+leg1,16,4);px(g,c.boots||out,20,74+leg1,14,4);
  px(g,out,34,73+leg2,17,4);px(g,c.boots||out,36,74+leg2,15,4);
  px(g,trim,22,72+leg1,4,2);px(g,trim,39,72+leg2,4,2);
  // Capa em panos recortados, nunca ocultando a arma ou a aljava.
  if(a?.cape&&a.cape!=='nenhuma'){
   const cloak=({vinho:'#75354c',marinho:'#354c73',musgo:'#456547',marfim:'#ddd2b2'})[a.cape]||cloth;
   brick(g,12,32+bounce,40,37,out,cloak,lit);
   px(g,trim,16,35+bounce,3,20);
   for(const x of [18,30,43])px(g,out,x,65+bounce,4,4);
  }
  // Túnica própria de classe, bordas grandes, dobras e cinto.
  woven(g,17,31+bounce,31,32,cloth,lit,out,seed);
  px(g,out,19,52+bounce,28,3);px(g,trim,20,53+bounce,27,3);
  px(g,out,25,54+bounce,16,4);
  px(g,metal,29,52+bounce,9,7);px(g,gem,32,54+bounce,3,3);
  px(g,out,20,59+bounce,24,4);
  for(const x of [23,28,39,44]){px(g,lit,x,60+bounce,2,8);px(g,out,x+1,68+bounce,2,3)}
  // Pescoço e perfil com pele selecionada pelo jogador.
  brick(g,28,27+bounce,10,10,out,skin,skin);
  // Cabelo por estilo nativo (sem reamostrar sprite anterior).
  if(!back){
   brick(g,23,14+bounce,20,19,out,skin,c.skinHighlight||'#f4cfab');
   px(g,'#9c6d54',24,28+bounce,18,3);
   if(front){
    px(g,out,27,23+bounce,5,4);px(g,out,37,23+bounce,5,4);
    px(g,c.eyeColor||'#6c604a',29,23+bounce,2,3);
    px(g,c.eyeColor||'#6c604a',39,23+bounce,2,3);
    px(g,c.skinHighlight||skin,33,27+bounce,3,3);
    px(g,out,32,32+bounce,7,1);
   }else{
    px(g,out,39,23+bounce,4,4);
    px(g,c.eyeColor||'#6c604a',41,24+bounce,2,2);
   }
  }
  const cut=a?.hairStyle||'curto';
  if(cut==='raspado'){
   px(g,hair,25,13+bounce,17,2);
  }else{
   px(g,out,21,10+bounce,25,12);
   px(g,hair,23,10+bounce,22,11);
   px(g,hairLight,25,11+bounce,14,3);
   px(g,out,23,20+bounce,5,5);
   if(front){px(g,hair,24,18+bounce,9,4);px(g,hair,39,18+bounce,5,4)}
   if(cut==='medio'||cut==='longo'||cut==='tranca'||cut==='rabo'){
    px(g,out,20,20+bounce,6,cut==='medio'?13:23);
    px(g,hair,22,20+bounce,4,cut==='medio'?12:22);
    if(cut==='longo'||back)px(g,hair,43,21+bounce,6,21);
   }
   if(cut==='tranca')for(let i=0;i<5;i++)px(g,i%2?hairLight:hair,46+(i%2),24+bounce+i*5,5,4);
   if(cut==='rabo'){px(g,out,44,17+bounce,8,9);px(g,hair,48,23+bounce,6,23)}
  }
  if(back){px(g,hair,24,21+bounce,20,12);px(g,hairLight,28,23+bounce,10,2)}
  if(a?.accessory==='tiara'){px(g,trim,23,19+bounce,22,2);px(g,gem,32,18+bounce,4,4)}
  if(a?.accessory==='brinco'&&!back){px(g,metal,44,31+bounce,3,5);px(g,trim,45,34+bounce,2,2)}
  if(a?.accessory==='amuleto'&&!back){px(g,trim,28,36+bounce,12,2);px(g,gem,32,38+bounce,4,5)}
  // Braços animados, guantes independentes e luvas contornadas.
  woven(g,10,35+bounce,9,20,cloth,lit,out,seed+2);
  woven(g,48,35+bounce-lift,9,20,cloth,lit,out,seed+3);
  brick(g,11,55+bounce,8,7,out,skin,skin);
  brick(g,49,55+bounce-lift,8,7,out,skin,skin);
  if(role==='guardiao'){
   // Capacete alto, lâminas nos ombros, escudo azul e espada de aço.
   brick(g,22,12+bounce,23,8,'#2b4053',metal,'#f1e8cb');
   px(g,'#2b4053',20,18+bounce,6,11);px(g,'#2b4053',43,18+bounce,6,11);
   px(g,trim,31,12+bounce,5,13);
   brick(g,13,33+bounce,11,8,out,metal,'#eaf2e7');
   brick(g,43,33+bounce,11,8,out,metal,'#eaf2e7');
   brick(g,1,39+bounce,21,25,'#263746','#708d9e','#d9e6e2');
   px(g,'#3865a0',5,44+bounce,14,14);px(g,'#2e65ac',7,45+bounce,10,12);px(g,trim,10,44+bounce,4,15);
   px(g,trim,7,51+bounce,10,4);px(g,gem,10,49+bounce,4,4);
   px(g,trim,53,60+bounce-lift,8,4);
   px(g,metal,54,23+bounce-lift,6,38);
   px(g,'#f4ebd2',55,25+bounce-lift,2,27);
  }else if(role==='arqueiro'){
   // Aljava e arco curvado com corda entre quadros; nunca parece guardião.
   brick(g,48,24+bounce,10,35,'#332f32','#694c34','#ac8551');
   for(let i=0;i<5;i++){px(g,'#e4d2a7',49+i*2,15+bounce+(i%2)*3,2,17);px(g,'#83a47e',49+i*2,12+bounce+(i%2)*3,3,6)}
   px(g,'#533b32',4,23+bounce,5,40);px(g,'#d49e57',5,26+bounce,3,10);
   px(g,'#e2bd83',5,53+bounce,4,10);
   px(g,'#e6dcbd',12,24+bounce,2,39);
   if(action==='attack'){px(g,trim,11,47+bounce,37,2);px(g,'#f9f2d8',49,44+bounce,10,7);px(g,cloth,11,43+bounce,7,10)}
   px(g,'#214532',19,33+bounce,7,4);
  }else if(role==='curandeiro'){
   // Capuz de marfim, bordados, insígnias e cajado com cristal.
   px(g,lit,20,11+bounce,27,8);
   px(g,out,20,19+bounce,6,14);px(g,out,43,19+bounce,6,14);
   px(g,trim,27,37+bounce,13,4);
   px(g,trim,30,40+bounce,7,18);px(g,gem,33,44+bounce,4,6);
   for(const x of [20,44]){px(g,lit,x,37+bounce,4,28);px(g,trim,x+1,47+bounce,2,11)}
   px(g,'#78573e',55,14-lift+bounce,4,64);
   px(g,trim,53,25-lift+bounce,8,4);
   brick(g,50,4-lift+bounce,14,16,'#335666','#65d7c6','#72dbea');px(g,'#70c7e0',56,13-lift+bounce,5,4);
   px(g,'#f1ffeb',56,6-lift+bounce,4,4);px(g,gem,54,17-lift+bounce,7,3);
   if(action==='attack')for(let i=0;i<3;i++)px(g,i%2?gem:trim,43+i*5,5+(frame+i)%3*7,3,3);
  }else{
   // Peregrino: capuz leve, bornal, fivela e espada de viagem.
   px(g,'#ba6050',17,31+bounce,8,23);px(g,'#9e4350',20,36+bounce,3,16);
   brick(g,47,47+bounce,13,15,'#4c332c','#856343','#d3a773');
   px(g,trim,51,51+bounce,5,3);
   px(g,'#896c48',7,49+bounce,5,20);px(g,metal,8,24+bounce-lift,5,28);
   px(g,'#f6e6c8',9,25+bounce-lift,2,20);
  }
  // Impactos apenas com blocos de pixels; não altera colisões físicas.
  if(action==='hurt'){px(g,'#f8dcae',17,32+bounce,30,2);px(g,'#d16b60',13,43+bounce,3,10)}
  if(action==='death')g.restore();
  if(dir===3)g.restore();
  return true;
 }
 function creature(g,{type='limo',dir=2,action='idle',frame=0,boss=false,zone=0,species=0,colors={}}={}){
  const c=colors,edge=c.dark||'#334d45',base=c.base||'#64926a',lit=c.light||'#b9d5a1',eye=c.eye||'#f6df9c';
  const shape=c.shape||'slime',jitter=action==='walk'?[0,2,3,1,-2,-1][frame%6]:action==='attack'?[0,-3,-6,-3,0][frame%5]:0;
  const variant=hash(type,Math.abs(species)),top=boss?11:18;
  if(dir===3){g.save();g.translate(WIDTH,0);g.scale(-1,1)}
  if(action==='death'){g.save();g.translate(0,frame*3);g.scale(1,Math.max(.2,1-frame*.17))}
  if(shape==='slime'||shape==='ghost'){
   const start=shape==='ghost'?20:32;
   brick(g,13,start+jitter,39,34,edge,base,lit);
   brick(g,19,start-9+jitter,27,18,edge,lit,lit);
   for(let i=0;i<5;i++)px(g,i%2?base:edge,14+i*9,64+jitter,8,9-i%2*4);
   for(let i=0;i<3;i++)px(g,lit,18+i*9,start+3+jitter+(i%2)*4,7,3);
   if(shape==='ghost'){px(g,edge,16,49+jitter,32,11);px(g,lit,22,47+jitter,23,7)}
  }else if(shape==='wing'||shape==='dragon'){
   for(const side of [0,1]){const x=side?38:0;brick(g,x,25+jitter,25,31,edge,base,lit);px(g,edge,x+3,50+jitter,19,10)}
   brick(g,20,23+jitter,24,33,edge,base,lit);px(g,lit,27,26+jitter,13,6);
   brick(g,26,45+jitter,12,19,edge,base,lit);
  }else if(shape==='spider'||shape==='scorpion'){
   for(let i=0;i<4;i++){for(const side of [0,1]){const x=side?43:0;px(g,edge,x,35+i*7+jitter,21,4);px(g,base,x+(side?9:0),33+i*7+jitter,9,3)}}
   brick(g,18,29+jitter,30,31,edge,base,lit);px(g,edge,21,38+jitter,24,11);
   if(shape==='scorpion'){brick(g,42,14+jitter,9,22,edge,base,lit);px(g,eye,43,12+jitter,10,4)}
  }else if(shape==='snake'){
   brick(g,19,44+jitter,35,20,edge,base,lit);
   brick(g,13,20+jitter,22,34,edge,base,lit);
   px(g,lit,16,24+jitter,6,21);px(g,edge,22,57+jitter,26,4);
  }else if(shape==='bone'){
   for(const [x,y,w,h]of [[17,39,30,4],[24,32,17,36],[19,69,8,9],[38,69,8,9],[8,40,6,29],[51,40,6,29]])px(g,lit,x,y+jitter,w,h);
   brick(g,21,18+jitter,25,23,edge,lit,'#fff0d7');
   for(let i=0;i<5;i++)px(g,edge,24+i*5,48+jitter,2,13);
  }else if(shape==='beast'){
   brick(g,11,26+jitter,42,37,edge,base,lit);
   brick(g,17,19+jitter,31,19,edge,base,lit);
   px(g,edge,12,15+jitter,12,18);px(g,edge,42,15+jitter,11,18);
   for(const x of [12,43]){px(g,edge,x,60+jitter,10,14);px(g,lit,x+2,63+jitter,4,6)}
   px(g,lit,27,45+jitter,11,6);
  }else{
   brick(g,15,29+jitter,36,37,edge,base,lit);
   brick(g,22,11+jitter,23,26,edge,base,lit);
   for(const x of [4,49])brick(g,x,33+jitter,12,27,edge,base,lit);
   for(const x of [20,38])brick(g,x,62+jitter,11,13,edge,base,lit);
   px(g,edge,23,45+jitter,23,5);
  }
  // Marcas de escamas em cinco placas: todas as 32 variantes têm assinatura única.
  for(let bit=0;bit<5;bit++){
   const litScale=((Math.abs(species)|0)>>bit)&1;
   px(g,litScale?lit:edge,17+bit*7,56+jitter,5,3);
   if(litScale)px(g,eye,19+bit*7,55+jitter,2,2);
  }
  // Facetas de material específicas e cicatrizes determinadas pela espécie.
  for(let i=0;i<9;i++){
   const x=17+(i*7+variant%11)%33,y=36+(i*13+variant%7)%25+jitter;
   px(g,i%3===0?lit:i%3===1?base:edge,x,y,2+(i%2),2);
  }
  if(shape!=='bone'){
   px(g,edge,22,39+jitter,8,6);px(g,edge,38,39+jitter,8,6);
   px(g,eye,25,40+jitter,4,4);px(g,eye,40,40+jitter,4,4);
  }else{px(g,eye,26,29+jitter,5,5);px(g,eye,38,29+jitter,4,5)}
  if(boss){
   const alt=['#e4c27c','#b8b2e7','#76d6be','#f4ad74'][Math.abs(zone)%4];
   for(let i=0;i<5;i++){px(g,edge,10+i*10,5+(i%2)*5,8,22);px(g,alt,12+i*10,6+(i%2)*5,4,15)}
   px(g,alt,26,13,12,5);
  }
  if(action==='attack'){px(g,eye,11,29+jitter,5,5);px(g,eye,49,29+jitter,5,5)}
  if(action==='hurt')px(g,'#ffe7c5',18,25+jitter,32,3);
  if(action==='death')g.restore();
  if(dir===3)g.restore();
  return true;
 }
 function npc(g,{npc={},dir=2,action='idle',frame=0}={}){
  const name=String(npc?.id||npc?.name||'habitante'),id=hash(name);
  const coat=['#637955','#8e6350','#547584','#817092','#a48654','#74816c'][id%6];
  const light=['#c7b687','#d5aa81','#a5c8bb','#c0add4'][id%4];
  const hair=['#3a302d','#7c4b38','#c7a25d','#b0b0b7'][Math.floor(id/11)%4];
  const colors={coat,edge:'#342d35',light,trim:'#dbbe7d',hair,hairLight:'#a68568',skin:['#dca779','#a87961','#936954'][id%3],boots:'#3a353a',metal:'#ddd5bc',gem:['#70bdb0','#b6a4dc','#daa570'][id%3]};
  // Cada NPC possui uma assinatura persistente e vestuário próprio.
  const kind=(id%6===0?'curandeiro':id%5===0?'guardiao':'peregrino');
  hero(g,{role:kind,dir,action,frame,colors,appearance:null});
  // Insígnias heráldicas binárias: os 56 personagens narrativos mantêm
  // padrões próprios, sem depender de valores aleatórios ou da classe.
  const number=/^historia-(\d+)$/.exec(name);
  const emblem=number?Number(number[1]):id%64;
  for(let bit=0;bit<6;bit++){
   const solid=(emblem>>bit)&1;
   px(g,solid?colors.gem:colors.trim,18+bit*5,48+(bit%2)*4,4,4);
  }
  for(let i=0;i<3;i++)px(g,i%2?colors.trim:colors.gem,21+(id%9)+i*5,44+i*5,3,2);
  if(id%7===0){px(g,colors.trim,20,11,28,3);px(g,colors.gem,31,9,4,5)}
  return true;
 }
 return Object.freeze({WIDTH,HEIGHT,hero,creature,npc,hash});
});

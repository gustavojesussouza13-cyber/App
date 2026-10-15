'use strict';
/*
 * Os Peregrinos — Gravura artesanal de Auren.
 * Matrizes de pixels AUTORAIS: cada símbolo corresponde exatamente a UM pixel
 * nativo. Nenhum atlas remoto, filtros, ruído por frame ou desenho por caixas.
 * Usado na geração do sprite/terreno em cache, nunca no loop da partida.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosHandPixels=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const VERSION='handpixels64-v1';
 // Os quatro níveis indicam escuro, cor de material, realce e luz.
 const MATERIALS=Object.freeze({
  metal:['#334559','#7992a1','#cedacf','#fff3d1'],
  leather:['#382c2d','#886143','#caa373','#f2d9a0'],
  cloth:['#49334a','#b48297','#f1d3c8','#fff2df'],
  leaf:['#244e39','#467950','#8db36a','#e3e7a4'],
  bone:['#605a65','#ac9e8c','#e6dfbd','#fff4dd'],
  chitin:['#39283b','#805369','#b97883','#ffd2a9'],
  arcane:['#263e59','#427eae','#73d9dc','#edffff'],
  stone:['#2d4552','#607785','#9db1b7','#e0d9b5'],
  ember:['#5a353a','#a4493f','#ef9757','#ffe3a0'],
  water:['#234b68','#3e8b9a','#9bd5d3','#f3f7df']
 });
 // Desenho por unidade: "." não pinta; 1, 2, 3, 4 pintam
 // exatamente um pixel com a respectiva cor. Sem esticar máscaras.
 const GLYPHS=Object.freeze({
  guardian:['...1111...','..122221..','.12333221.','1223233221',
   '1232323321','1223323321','.12233221.','..122221..','...1111...'],
  ranger:['...221....','..223321..','.22333231.','1223332211',
   '123323321.','.1233221..','..123221..','...1121...'],
  healer:['...3333...','..332233..','.32222233.','3223242233',
   '3232432233','.3222233..','..32233...','...333....'],
  forge:['11112211','12233221','12344321','12233221','11222211'],
  guard:['...44...','..4334..','14322341','14322341','..4334..','...44...'],
  healerNpc:['..3443..','.343343.','34211243','34211243','.343343.','..3443..'],
  scholar:['22222222','23444332','23211232','23322332','22222222'],
  trader:['.222222.','22333322','23111132','23333332','.222222.'],
  traveler:['...22...','..2332..','.233332.','23311332','.233332.','..2222..'],
  slime:['..333333..','.32222223.','3222222223','3223223223','3222222223',
   '.32222223.','..333333..'],
  wolf:['2..2.2..2','22.222.22','.2222222.','223223322','222222222','.2122212.'],
  fera:['2.2...2.2','.232.232.','223222322','233323332','222222222'],
  morcego:['3..2..3','33.2.33','2333232','1223221','11.2.11'],
  vespa:['..333..','3222233','3111133','3222233','..333..'],
  esqueleto:['2222222','2333332','2343432','2321232','2333332','2222222'],
  aranha:['3...3...3','33.333.33','233333332','.2333333.','2.22222.2'],
  escorpiao:['3.3.3.3','2333332','3222223','.23332.','3.2.3.3'],
  golem:['222222222','233333332','231343132','233131332',
   '233333332','223222322'],
  sentinela:['222222222','233444332','234212432','232444232','223222322'],
  cavaleiro:['222222222','234343432','232222232','234323432','222222222'],
  chefe:['223333322','234444432','232222232','234323432','222222222'],
  serpente:['2.33333.2','233222332','232333232','233222332','2.33333.2'],
  fantasma:['..33333..','.3222223.','322333223','323222323','323333323'],
  dragao:['3.33.33.3','333333333','232323232','233333332','222323222'],
  flower:['..3..','.323.','32323','.323.','..3..','..1..'],
  fern:['.2..2.','..22..','122221','..22..','.2..2.','...1..'],
  moss:['..22.2..','2223322.','12222121','..11.11.'],
  twig:['.2....','..22..','..222.','1222...','..1....'],
  rune:['..3..','.323.','32223','.323.','..3..'],
  shale:['.33333.','3232232','3322233','.23332.','..111..'],
  crack:['2.....2','.2...2.','..2.2..','...2...','..1.1..'],
  ripple:['..3333..','33....33','..2222..','........','...33...'],
  grass:['.2...2.','22..22.','.22.22.','..222..','...1...'],
  dune:['........','...333..','.333.333','222.2222','.11111..'],
  paving:['22222222','21111112','22222222','.......1','33333333'],
  roots:['...2....','...22...','..222...','122.22..','..2..21.'],
  coast:['..333...','.32223..','3222223.','.22222..','...11...'],
  city:['33333333','32222223','32111223','32222223','33333333']
 });
 const FAMILIES=Object.freeze(['limo','lobo','fera','morcego','vespa','esqueleto',
  'aranha','escorpiao','golem','sentinela','cavaleiro','chefe','serpente','fantasma','dragao']);
 const JOBS=Object.freeze(['forge','guard','healerNpc','scholar','trader','traveler']);
 const PAINT=(g,glyph,x,y,colors,mirror=false)=>{
  const rows=GLYPHS[glyph];if(!rows||!g?.fillRect)return 0;
  const palette=typeof colors==='string'?MATERIALS[colors]:colors;
  if(!Array.isArray(palette)||palette.length<4)return 0;
  let pixels=0;
  for(let yy=0;yy<rows.length;yy++){
   const row=rows[yy];
   for(let xx=0;xx<row.length;xx++){
    const token=row[xx],shade=token.charCodeAt(0)-49;
    if(shade<0||shade>3)continue;
    const dx=mirror?row.length-1-xx:xx;
    g.fillStyle=palette[shade];
    g.fillRect(Math.round(x+dx),Math.round(y+yy),1,1);
    pixels++;
   }
  }
  return pixels;
 };
 function hero(g,{role,dir=2,action='idle',frame=0,colors={}}={}){
  const type=role==='guardiao'?'guardian':role==='arqueiro'?'ranger':'healer';
  const shade=role==='guardiao'?'metal':role==='arqueiro'?'leather':'cloth';
  const y=action==='walk'?[0,-1,-2,0,-1,0][frame%6]:0;
  const [dark,base,light,bright]=MATERIALS[shade];
  // Usa a luz do sprite quando possível, preservando customização.
  const palette=[dark,colors.coat||base,colors.light||light,bright];
  let n=PAINT(g,type,27,42+y,palette,dir===3);
  if(role==='guardiao'){
   n+=PAINT(g,'guardian',32,53+y,MATERIALS.metal);
  }else if(role==='arqueiro'){
   n+=PAINT(g,'ranger',30,57+y,MATERIALS.leather);
  }else{
   n+=PAINT(g,'healer',30,59+y,MATERIALS.cloth);
   if(action==='attack')n+=PAINT(g,'rune',36,52+y,MATERIALS.arcane);
  }
  return n;
 }
 function npc(g,{profession='traveler',identity=0,action='idle',frame=0}={}){
  const key=JOBS.includes(profession)?profession:'traveler';
  const colors=key==='guard'?'metal':key==='forge'?'ember':
   key==='healerNpc'?'arcane':key==='scholar'?'cloth':
   key==='trader'?'leather':'leaf';
  const y=action==='walk'?[0,-1,-2,0,1,0][frame%6]:0;
  const offset=(Math.abs(identity)|0)%4;
  let total=PAINT(g,key,28+offset,45+y,colors);
  // Assinatura do indivíduo: escolha de ponto fixo, nunca partículas aleatórias.
  const token=['flower','rune','fern','shale'][offset];
  total+=PAINT(g,token,34,59+y,colors);
  return total;
 }
 function creature(g,{type='limo',boss=false,action='idle',frame=0,species=0}={}){
  const key=FAMILIES.includes(type)?type:'limo';
  const material=['esqueleto','cavaleiro','chefe'].includes(key)?'bone':
   ['aranha','escorpiao','morcego'].includes(key)?'chitin':
   ['golem','sentinela'].includes(key)?'stone':
   ['dragao'].includes(key)?'ember':
   ['fantasma'].includes(key)?'arcane':
   ['limo','serpente'].includes(key)?'leaf':'leather';
  const bump=action==='walk'?[0,-1,-2,0,1,0][frame%6]:
   action==='attack'?[0,-1,-3,-1,1][frame%5]:0;
  const tx=['fantasma','morcego','vespa'].includes(key)?28:27;
  let n=PAINT(g,key,tx,45+bump,material);
  if(key==='dragao')n+=PAINT(g,'shale',33,58+bump,MATERIALS.ember);
  else if(key==='golem'||key==='sentinela')n+=PAINT(g,'rune',34,56+bump,MATERIALS.arcane);
  else if(key==='aranha'||key==='escorpiao')n+=PAINT(g,'chitin',29,55+bump,MATERIALS.chitin);
  else if(key==='lobo'||key==='fera')n+=PAINT(g,'wolf',33,55+bump,MATERIALS.leather);
  if(boss){
   // Quatro chefes têm assinaturas distintas, não o mesmo decalque.
   const signature=key==='dragao'?'ember':key==='aranha'?'chitin':
    key==='golem'?'arcane':'bone';
   n+=PAINT(g,key==='dragao'?'crack':key==='aranha'?'aranha':
    key==='golem'?'rune':'esqueleto',28+(species%3),62+bump,signature);
  }
  return n;
 }
 function terrain(g,{x=0,y=0,biome='meadow',kind='grass',seed=0}={}){
  // Cada mosaico é pintado no canvas do chunk, uma única vez.
  const k=kind==='water'?'ripple':kind==='paving'?'paving':
   kind==='rock'?'shale':kind==='sand'?'dune':
   kind==='path'?'crack':
   biome==='forest'?'fern':biome==='swamp'?'moss':
   biome==='desert'?'dune':biome==='ruins'?'rune':
   biome==='mountain'?'shale':biome==='coast'?'coast':
   biome==='river'?'roots':biome==='city'?'city':'grass';
  const material=kind==='water'?'water':kind==='rock'||kind==='paving'?'stone':
   kind==='path'||kind==='sand'?'leather':
   biome==='desert'?'leather':biome==='mountain'?'stone':'leaf';
  const sx=x+4+(seed%12),sy=y+4+((seed>>>4)%11);
  let n=PAINT(g,k,sx,sy,material);
  if(kind==='grass'){
   n+=PAINT(g,biome==='ruins'?'crack':'flower',x+20,y+19,
    biome==='ruins'?'stone':'leaf');
  }
  return n;
 }
 function prop(g,{kind='tree',biome='forest',variant=0}={}){
  let n=0;
  const v=variant%4;
  if(kind==='tree'){
   for(const [i,x,y]of [[0,21,19],[1,54,16],[2,38,31],[3,71,36],[4,49,48]]){
    n+=PAINT(g,biome==='desert'?'shale':
     biome==='swamp'?'moss':i%2?'fern':'grass',x+(v+i)%3,y+(v+i)%4,
    biome==='desert'?'leather':'leaf');
   }
   n+=PAINT(g,'roots',44,59,MATERIALS.leather);
  }else if(kind==='bush'){
   n+=PAINT(g,'fern',11+v,12,MATERIALS.leaf);
   n+=PAINT(g,'flower',31-v,15,MATERIALS.leaf);
   n+=PAINT(g,biome==='swamp'?'moss':'fern',37,22,MATERIALS.leaf);
  }else if(kind==='rock'){
   n+=PAINT(g,'shale',15+v,16,MATERIALS.stone);
   n+=PAINT(g,'crack',30,21,MATERIALS.stone);
  }
  return n;
 }
 return Object.freeze({VERSION,MATERIALS,GLYPHS,FAMILIES,JOBS,PAINT,
  hero,npc,creature,terrain,prop});
});

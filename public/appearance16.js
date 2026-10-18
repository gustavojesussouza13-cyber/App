/* Personalização pixel art 16-bit de Os Peregrinos.
 * Paletas fechadas, sem filtros interpolados nem alterar geometria das classes.
 * O mesmo módulo valida os dados no servidor e desenha no cliente. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PeregrinosAppearance16=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const OPTIONS=Object.freeze({
  skin:{claro:'Pele clara',dourado:'Pele dourada',oliva:'Pele oliva',bronze:'Pele bronzeada',escuro:'Pele escura',profundo:'Pele retinta'},
  hairStyle:{curto:'Curto',medio:'Médio',longo:'Longo',tranca:'Trança',rabo:'Rabo de cavalo',raspado:'Raspado'},
  hairColor:{castanho:'Castanho',preto:'Preto',loiro:'Loiro',ruivo:'Ruivo',branco:'Branco',azul:'Azul profundo',rosa:'Rosa'},
  eyes:{castanho:'Castanhos',azul:'Azuis',verde:'Verdes',mel:'Âmbar',cinza:'Cinzentos'},
  outfit:{original:'Traje da classe',vinho:'Vinho e couro',floresta:'Verde musgo',safira:'Azul safira',ocre:'Ocre dourado',violeta:'Violeta',rosa:'Rosa peregrino',marfim:'Marfim'},
  cape:{nenhuma:'Sem capa',vinho:'Capa vinho',marinho:'Capa azul',musgo:'Capa verde',marfim:'Capa marfim',rosa:'Capa rosa'},
  accessory:{nenhum:'Nenhum',tiara:'Tiara',brinco:'Brinco',amuleto:'Amuleto'}
 });
 const DEFAULT=Object.freeze({skin:'dourado',hairStyle:'curto',hairColor:'castanho',eyes:'castanho',outfit:'original',cape:'nenhuma',accessory:'nenhum'});
 const SKIN=Object.freeze({
  claro:['#f0cda8','#fff1d0','#b88a70'],dourado:['#dea978','#f4cf99','#91664f'],
  oliva:['#b78a65','#e1b18b','#765b49'],bronze:['#9e674a','#cb946b','#694633'],
  escuro:['#76503f','#ac7859','#4e362e'],profundo:['#52392f','#815843','#332723']
 });
 const HAIR=Object.freeze({
  castanho:['#50382b','#8c5940'],preto:['#222830','#50515a'],
  loiro:['#a17a3b','#ecc879'],ruivo:['#863e30','#cd7950'],
  branco:['#acb4b5','#f0e5d4'],azul:['#303e63','#647fbc'],rosa:['#9f527c','#e2a1c0']
 });
 const EYES=Object.freeze({castanho:'#50352a',azul:'#487fba',verde:'#3b8f67',mel:'#bc8741',cinza:'#6e8291'});
 const COATS=Object.freeze({rosa:['#b95785','#f2a8c5'],marfim:['#b8b1a5','#eee2ca'],vinho:['#813f50','#cc7881'],floresta:['#396b51','#84b18a'],
  safira:['#405e8d','#8bafd8'],ocre:['#a17b3f','#e0bc7a'],violeta:['#67507d','#bba2ce']});
 const CAPES=Object.freeze({vinho:'#75354c',marinho:'#354c73',musgo:'#456547',marfim:'#ddd2b2',rosa:'#d777a5'});
 const HEX=/^#[0-9a-f]{6}$/i;
 function normalize(input){
  const out={};
  const from=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
  for(const [key,options]of Object.entries(OPTIONS))
   out[key]=typeof from[key]==='string'&&Object.hasOwn(options,from[key])?from[key]:DEFAULT[key];
  return out;
 }
 function key(input){const a=normalize(input);return Object.keys(OPTIONS).map(k=>a[k]).join(':')}
 function palette(roleColors,input){
  const app=normalize(input),c={...roleColors};
  const [skin,shine]=SKIN[app.skin],[hair,hairLight]=HAIR[app.hairColor];
  c.skin=skin;c.hair=hair;c.hairLight=hairLight;c.skinHighlight=shine;c.eyeColor=EYES[app.eyes];
  if(app.outfit!=='original'){
   c.coat=COATS[app.outfit][0];
   c.light=COATS[app.outfit][1];
  }
  return c;
 }
 function details(g,c,input,{dir=2,by=0,action='idle',frame=0}={}){
  const a=normalize(input),p=(color,x,y,w,h)=>{
   if(!color||!HEX.test(color)||w<=0||h<=0)return;
   g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  };
  const hair=HAIR[a.hairColor],dark=hair[0],light=hair[1],skin=SKIN[a.skin],front=dir===2,back=dir===0,side=dir===1||dir===3;
  // O acabamento é aplicado após as sombras das classes, mantendo armas, cajados e escudos.
  // As capas ocupam a silhueta interna do corpo e não cobrem a armadura das classes.
  if(a.cape!=='nenhuma'){
   const cloak=CAPES[a.cape],line=a.cape==='marfim'?'#b3a084':'#26332f';
   if(back){
    p(line,12,20+by,20,23);p(cloak,13,21+by,18,19);
    p(c.light,14,22+by,2,13);p(c.trim,19,23+by,5,2);
   }else{
    p(line,10,20+by,4,20);p(cloak,11,21+by,3,17);
    if(side){p(line,27,22+by,3,17);p(cloak,28,22+by,2,15)}
    else {p(line,29,20+by,4,20);p(cloak,30,21+by,3,17)}
   }
  }
  const crown=7+by;
  if(a.hairStyle==='raspado'){
   p(skin[2],14,9+by,14,2);p(dark,14,9+by,14,1);
  }else{
   p(dark,13,crown,16,6);p(light,16,crown+1,10,2);
   if(a.hairStyle==='medio'||a.hairStyle==='longo'||a.hairStyle==='tranca'||a.hairStyle==='rabo'){
    p(dark,12,13+by,4,a.hairStyle==='medio'?9:15);
    p(light,13,16+by,2,7);
    if(back||a.hairStyle==='longo')p(dark,27,13+by,4,15);
   }
   if(a.hairStyle==='tranca'){
    for(let i=0;i<4;i++){p(i%2?light:dark,28+(i%2),20+by+i*4,4,3)}
   }else if(a.hairStyle==='rabo'){
    p(dark,27,12+by,6,5);p(light,31,16+by,3,9);p(dark,31,24+by,3,5);
   }
   if(front)p(dark,13,12+by,5,3);
  }
  if(front){
   p(skin[1],18,15+by,8,2);
   p('#303035',17,18+by,3,3);p('#303035',24,18+by,3,3);
   p(EYES[a.eyes],18,18+by,1,2);p(EYES[a.eyes],25,18+by,1,2);
   p(skin[2],21,21+by,2,2);
  }else if(side){
   p('#303035',25,18+by,3,3);p(EYES[a.eyes],26,18+by,1,2);
  }
  if(a.accessory==='tiara'){
   p(c.trim,13,13+by,16,2);p(c.gem,20,12+by,3,3);
  }else if(a.accessory==='brinco'&&!back){
   p(c.metal,29,22+by,2,4);p(c.trim,29,25+by,2,2);
  }else if(a.accessory==='amuleto'&&!back){
   p(c.trim,19,23+by,5,2);p(c.gem,20,25+by,3,4);p(c.metal,21,26+by,1,2);
  }
 }
 return Object.freeze({OPTIONS,DEFAULT,normalize,key,palette,details,SKIN,HAIR,EYES,COATS});
});

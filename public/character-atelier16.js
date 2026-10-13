'use strict';
/*
 * Atelier de Auren — detalhes finais de pixel art 16-bit ORIGINAL.
 * Nenhum recurso de terceiros, imagens borradas ou dependência externa.
 * Todos os pixels são retângulos inteiros, com luz na parte superior esquerda.
 * Personalidades visuais independentes para 4 heróis, 56 NPCs e 32 espécies.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosCharacterAtelier=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const NPC_STYLES=Object.freeze([
  'sineira','jardineiro','crianca','barqueira','cartografo','escriba','vigia','guarda',
  'bibliotecario','padeira','barqueiro','faroleira','curandeira','conselheiro','sentinela','guardiao-antigo',
  // Vinte e quatro personagens da Vigília Depois do Sino, quatro novos atos.
  'sementeira','pontifice','mensageira-musgo','ancia-nomes','guia-abismo','neri-vigilia',
  'porteiro-cartas','ferreira-fornalha','relator-cinzas','mestre-cinzas','juiz-vazio','ada-vigilia',
  'afinador-hino','regente-coro','ouvinte-pedra','copista-notas','vigia-vibracao','eli-vigilia',
  'guardia-lanternas','escriba-pacto','emissaria-portas','relator-mar','vigia-limiar','calen-lembrado',
  // Os dezesseis moradores antigos mantêm seus estilos originais.
  'mensageiro','tecelã','escavador','pescador','guia','encadernador','escalador','historiadora',
  'copista','colhedora','barqueiro-nevoa','marinheira','aprendiz','sineiro','guarda-aurora','viajante'
 ]);
 const NPC_FAMILY=Object.freeze({
  sineira:['#7b5361','#eed3a7','#b78f5d','#f2be86','#51313d'],
  jardineiro:['#44754c','#c7d691','#7b573f','#e4af7e','#243e2e'],
  crianca:['#955874','#f1d3bb','#7655a0','#f4c5a2','#5a3d55'],
  barqueira:['#527991','#d2e1dd','#947b54','#ce9b76','#2a4b58'],
  cartografo:['#c19a5c','#ead29a','#76675a','#dfab79','#67513e'],
  escriba:['#a67655','#e4d2b2','#744d45','#edbf8e','#573f3b'],
  vigia:['#425d81','#c6cbd3','#cda862','#dbb187','#293f5e'],
  guarda:['#4b72a1','#d1dce1','#dcb767','#e5b792','#273956'],
  bibliotecario:['#79629b','#e1d3b8','#b18d4e','#d0a18b','#47385c'],
  padeira:['#bc8269','#f7ddbc','#a26352','#dbab88','#68483b'],
  barqueiro:['#4a776b','#b9d4ac','#8b704f','#c69a78','#32564d'],
  faroleira:['#476c88','#ead3a1','#b18154','#e8b58a','#31495c'],
  curandeira:['#d8c5c3','#fff1df','#c96775','#efbb9d','#8b536d'],
  conselheiro:['#77649f','#ede1bb','#d5b870','#dec1a1','#44345c'],
  sentinela:['#537795','#b6d1db','#d7b76e','#d9b58d','#293f59'],
  'guardiao-antigo':['#74647c','#ddd2b4','#b9a273','#c79b8b','#343146'],
  mensageiro:['#617c58','#d7caa2','#b18051','#d8a87b','#364533'],
  'tecelã':['#aa819f','#f0dcc4','#a16b8c','#edc1a0','#66465c'],
  escavador:['#846b47','#d1bd84','#6b5747','#c89b72','#473b32'],
  pescador:['#557f88','#ded4b1','#8f6d51','#c9a07b','#34545d'],
  guia:['#c49c62','#f1d3a1','#8b6351','#deaf83','#6a4b3a'],
  encadernador:['#946b67','#dfd1ab','#92614b','#e0af89','#5a3e41'],
  escalador:['#6f7d8b','#d6d1bd','#ab815a','#d6a57f','#44505d'],
  historiadora:['#83759b','#ddcfb2','#ba986a','#efc2a1','#4e4464'],
  copista:['#9c7e78','#e9dabd','#95714e','#e7b993','#5f4544'],
  colhedora:['#7da165','#f4d99f','#aa7455','#eec092','#425b3d'],
  'barqueiro-nevoa':['#688489','#cad5c8','#706555','#c9a08a','#455c65'],
  marinheira:['#597ca9','#eee0bb','#bc8562','#f1b98d','#304d73'],
  aprendiz:['#d0a8b3','#f8e9d7','#aa6e89','#e6b6a1','#7c5267'],
  sineiro:['#88734f','#e0c799','#a28150','#d8a27a','#554632'],
  'guarda-aurora':['#4771ac','#e3dfee','#d6ad5c','#e4b28b','#263c65'],
  viajante:['#8e6d51','#e6cb9e','#b4745f','#e7b68e','#4d3a32'],
  sementeira:['#426e42','#cbe8aa','#e2ac67','#efb58e','#2b5334'],
  pontifice:['#8b7756','#d5ccb3','#a98b60','#c9997d','#584a3a'],
  'mensageira-musgo':['#3d8c73','#d7e3b4','#8cb063','#ecb692','#2f594d'],
  'ancia-nomes':['#715b80','#e0d3bb','#d4a56e','#d7ac9a','#403650'],
  'guia-abismo':['#527277','#d2d7c2','#9fb5a3','#b98f76','#344c53'],
  'neri-vigilia':['#a75d91','#f7d9e8','#88a671','#e8b4a0','#654462'],
  'porteiro-cartas':['#886b59','#efe1c6','#bb9b79','#e3af83','#524537'],
  'ferreira-fornalha':['#a05246','#f0cd9d','#d48b5c','#edbb94','#582e32'],
  'relator-cinzas':['#777b98','#dfd7d0','#b9ae8f','#cca28d','#3f455d'],
  'mestre-cinzas':['#ac796b','#f7ddbc','#8e7a81','#e6bb9e','#673f42'],
  'juiz-vazio':['#695889','#ecdfca','#bba16e','#d6b19f','#403457'],
  'ada-vigilia':['#936b4a','#ffdfb1','#ba8860','#f0b989','#573c2f'],
  'afinador-hino':['#5c89a4','#e7e1b1','#d7bb68','#c39c84','#38546c'],
  'regente-coro':['#8b5177','#f0d0d6','#daa877','#e3ae8e','#512f4d'],
  'ouvinte-pedra':['#648077','#c0e2cf','#88aa9b','#c79b7f','#325348'],
  'copista-notas':['#8f7299','#f0e1d3','#c8a283','#e2afa0','#533e69'],
  'vigia-vibracao':['#48647b','#bedfe6','#e0bd7f','#b89a83','#263f59'],
  'eli-vigilia':['#7868aa','#dedbe9','#aea8c5','#dab59c','#433c6d'],
  'guardia-lanternas':['#a17c45','#ffdda0','#efb965','#d7a07e','#674b2e'],
  'escriba-pacto':['#607ba2','#e0e6ca','#a8bad2','#c9a390','#354968'],
  'emissaria-portas':['#ab6d68','#f7d6c0','#b8a080','#d9b19b','#754548'],
  'relator-mar':['#528b95','#e0f0d5','#acc6be','#c99e85','#326371'],
  'vigia-limiar':['#85718b','#dbd7df','#cfb4a0','#daa98f','#4d3f60'],
  'calen-lembrado':['#5b7196','#eddbbb','#dec485','#e8b395','#36466b']
 });
 const VARIANTS=Object.freeze([
  ['esmeralda','#75db79','#e6ffb9','bubbles'],['faminto','#756a83','#cdcee0','fur'],
  ['caverna','#986caa','#e1b8eb','wing'],['guerreiro','#c5b995','#faf0cb','weapon'],
  ['subsolo','#963e4d','#ff9b72','fang'],['pedra','#8c9da0','#c5e3d8','rune'],
  ['dunas','#acb86d','#ebd5a0','scale'],['ocaso','#7966a1','#d7bce2','wing'],
  ['sentinela','#5f91a2','#a9f4d2','rune'],['espinho','#609050','#c1e99d','thorn'],
  ['deserto','#c18b51','#f9ce77','fang'],['sombra','#78629f','#d1b8fb','wisp'],
  ['javali','#aa8065','#f2c59b','tusk'],['areia','#b99e73','#fae6b8','rune'],
  ['nebuloso','#7ba3b5','#d4f3f6','wisp'],['esquecido','#a08c85','#f1d4a9','weapon'],
  ['vespa','#e6af4e','#fff29d','wing'],['trepa-sombra','#4d7655','#b7e5ad','thorn'],
  ['cristal','#759bcd','#e1edff','rune'],['espectro','#7563ae','#e4bbff','wisp'],
  ['gelo','#7aacc8','#ecfbff','fur'],['aranha-cristal','#8cbad2','#e2f7ff','fang'],
  ['bronze','#bf9462','#f8d9a6','weapon'],['agua','#48a8b6','#b6fcfa','bubbles'],
  ['salamandra','#bb674a','#ffdd80','scale'],['pantano','#77915c','#dbd39d','fur'],
  ['jovem','#ba654f','#ffd08b','scale'],['gigante','#96948a','#dbccaa','rune'],
  ['noite','#655e9a','#b3c3ff','weapon'],['basilisco','#698769','#dce9ac','scale'],
  ['anjo-caido','#9881b8','#f2d8ff','wing'],['aurora','#73bbc7','#fff2b9','rune']
 ]);
 const p=(g,color,x,y,w=1,h=1)=>{
  if(w<=0||h<=0)return;
  g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
 };
 const hash=text=>{
  let h=2166136261;
  for(const char of String(text||''))h=Math.imul(h^char.charCodeAt(0),16777619)>>>0;
  return h>>>0;
 };
 function npcStyle(n){
  const match=/^(?:historia|morador)-(\d+)$/.exec(String(n?.id||''));
  if(match){
   const i=Number(match[1]),ix=match[0].startsWith('historia')?i:40+i;
   if(ix>=0&&ix<NPC_STYLES.length)return NPC_STYLES[ix];
  }
  const name=(n?.name||'').toLocaleLowerCase('pt-BR');
  const title=(n?.title||'').toLocaleLowerCase('pt-BR');
  const keys=[['mercador','mensageiro'],['ferreiro','escavador'],['sacerdotisa','curandeira'],
   ['sábio','bibliotecario'],['guarda','guarda-aurora'],['viajante','viajante'],
   ['curandeira','curandeira'],['bibliotecário','bibliotecario'],['padeir','padeira'],
   ['barqueir','barqueiro'],['sentinela','sentinela'],['sineiro','sineiro'],
   ['jardineir','jardineiro'],['marinheir','marinheira'],['aprendiz','aprendiz']];
  for(const [word,style] of keys)if(name.includes(word)||title.includes(word))return style;
  return NPC_STYLES[hash(n?.name||'peregrino')%NPC_STYLES.length];
 }
 function hero(g,c,{role,dir,action,frame,by=0,step=0}){
  const back=dir===0,face=dir===2,side=dir===1||dir===3;
  const walk=action==='walk',attack=action==='attack';
  const wind=walk?[0,1,3,1,0,-1][frame%6]:attack?[0,1,4,6,2][frame%5]:0;
  // Sombras de manga, gola, tecido e bainha: regiões planas distintas.
  p(g,c.edge,26,26+by,3,13);p(g,c.light,12,23+by,4,2);
  p(g,c.edge,13,36+by,16,2);p(g,c.trim,16,36+by,8,2);
  p(g,c.light,14,40+by,2,3);p(g,c.edge,27,42+by,3,5);
  // Cabelos em tufos irregulares, com volume 16-bit e luz superior esquerda.
  if(!back){
   const light=role==='guardiao'?'#f5d686':role==='curandeiro'?'#bba2c5':
    role==='arqueiro'?'#b28c5c':'#d89b5f';
   for(const [x,y,w] of [[12,8,8],[19,6,8],[25,9,5],[15,11,9]]){
    p(g,c.hair,x,y+by,w,4);
    p(g,light,x+1,y+by,Math.max(2,w-3),2);
    p(g,c.edge,x+w-2,y+by+3,2,2);
   }
   if(face){
    p(g,'#ffe0b4',16,15+by,5,2);
    p(g,'#996753',25,17+by,3,6);
    p(g,'#503a37',16,21+by,3,1);
   }else if(side){
    p(g,'#f6cf9a',25,16+by,3,2);
    p(g,c.edge,27,18+by,2,2);
   }
  }
  if(role==='peregrino'){
   // Lenço rubro drapeado e capa que se move com o passo.
   p(g,'#4b252d',9,22+by,18,5);
   p(g,'#9e4350',9,21+by,17,3);p(g,'#de735e',11,20+by,11,2);
   p(g,'#562b34',8-wind/2,27+by,8,15);
   p(g,'#a9464f',9-wind/2,26+by,5,15);
   p(g,'#e77765',10-wind/2,28+by,2,11);
   p(g,'#594136',30,32+by,7,12);
   p(g,'#cba06f',32,35+by,2,4);
   p(g,'#f0d39e',17,35+by,5,2);
   if(attack){p(g,'#f4f1dc',4,18+by,3,21);p(g,'#b6c6d5',5,20+by,1,14)}
  }else if(role==='guardiao'){
   // Placas de aço facetadas, ombreiras e cruz solar em ouro no escudo.
   p(g,'#202c4a',12,22+by,19,20);
   p(g,'#4775bd',14,24+by,16,14);
   p(g,'#eff2e9',13,24+by,5,3);
   p(g,'#dcb969',20,26+by,4,12);
   p(g,'#f8e29b',16,30+by,12,3);
   p(g,'#183557',2,25+by,11,20);
   p(g,'#2e65ac',3,27+by,9,16);
   p(g,'#e5c36d',6,29+by,3,11);p(g,'#fae5a0',4,34+by,7,2);
   p(g,'#d8e1dc',27,23+by,7,4);p(g,'#6c8ba0',28,27+by,5,5);
   p(g,'#253b75',15,39+by,15,6);
   if(back){p(g,'#dcb969',19,27+by,5,13);p(g,'#ffe9b2',16,32+by,11,2)}
  }else if(role==='arqueiro'){
   // Capuz verde, gola escura, aljava de couro e madeira sombreada.
   p(g,'#21452f',11,9+by,20,10);
   p(g,'#3e7e49',12,8+by,16,6);p(g,'#8eaf67',14,9+by,9,2);
   if(!back){p(g,'#2c4a31',13,14+by,16,3);p(g,'#e6b98a',17,17+by,8,3)}
   p(g,'#2a5938',10-wind/2,23+by,7,20);
   p(g,'#5c9b4e',10-wind/2,25+by,4,13);
   p(g,'#bc965e',29,16+by,9,23);p(g,'#67482d',32,21+by,6,17);
   for(let i=0;i<3;i++){
    p(g,'#eee5c6',31+i*2,13+by+i%2,1,12);
    p(g,'#d6aa8a',31+i*2,12+by+i%2,2,3);
   }
   p(g,'#553923',5,20+by,2,21);
   p(g,'#d49e57',6,20+by,2,5);p(g,'#ecc985',7,24+by,1,14);
   if(attack){p(g,'#f9f2d8',10,29+by,27,2);p(g,'#bddad6',34,27+by,4,6)}
  }else if(role==='curandeiro'){
   // Capuz claro, capa vermelha, vestido cerimonial e símbolo de misericórdia.
   p(g,'#70465b',10,9+by,21,12);
   p(g,'#f7e6de',11,8+by,19,9);
   p(g,'#a95470',13,9+by,14,3);
   p(g,'#fff7e9',14,13+by,9,3);
   p(g,'#ac5266',8-wind/3,24+by,6,21);
   p(g,'#ebd9d0',12,23+by,18,20);
   p(g,'#c46578',12,40+by,19,4);
   p(g,'#efd093',21,27+by,3,11);
   p(g,'#c75d74',18,31+by,9,3);
   p(g,'#ffe3ab',20,34+by,3,3);
   p(g,'#edca85',33,11+by,3,31);
   p(g,'#70c7e0',31,5+by,8,8);
   p(g,'#f7f4d7',33,6+by,3,3);
   if(attack)for(let i=0;i<4;i++)p(g,i%2?'#fcf6bd':'#91f4e6',27+i*3,2+i*3+by,2,2);
  }
 }
 /*
  * Camada FINAL de identidade: desenhada após roupa, armas e acabamentos.
  * Protege as quatro classes de ficarem indistinguíveis quando vistas de
  * costas, em movimento, ou em escala pequena no canvas do jogo.
  * Trabalha somente em pixels inteiros de um sprite 40x52.
  */
 function classIdentity(g,c,{role='peregrino',dir=2,action='idle',frame=0,by=0}={}){
  const back=dir===0,side=dir===1||dir===3;
  const moving=action==='walk';
  const shift=moving?[0,1,2,1,0,-1][frame%6]:0;
  const swing=action==='attack'?[0,-2,-4,0,2][frame%5]:0;
  if(role==='guardiao'){
   // Capacete de aço com crista dourada: visível frente e costas.
   p(g,'#1f354c',12,7+by,20,12);
   p(g,'#c3d4dd',14,8+by,16,7);
   p(g,'#f4f3da',15,9+by,10,2);
   p(g,'#3d6388',16,14+by,13,5);
   p(g,'#dbad57',20,5+by,5,12);
   p(g,'#ffdf88',21,6+by,2,6);
   if(!back){p(g,'#21354a',15,18+by,14,3);p(g,'#e1b277',18,19+by,7,2)}
   // Armadura com escamas metálicas e emblema solar sobre o peito ou capa.
   p(g,'#263d63',11,22+by,21,21);
   p(g,'#4774b0',13,23+by,17,17);
   p(g,'#9bbed2',13,23+by,7,3);
   p(g,'#163558',26,26+by,4,15);
   p(g,'#d9a95c',19,26+by,5,12);
   p(g,'#ffe69a',16,31+by,12,3);
   p(g,'#ddb86f',20,29+by,3,8);
   p(g,'#e7ebd9',13,39+by,17,2);
   // Escudo largo ANCORADO ao lado oposto da espada, com borda dourada.
   p(g,'#1c314a',1,24+by+shift,13,21);
   p(g,'#deb66c',2,25+by+shift,11,19);
   p(g,'#3865a0',4,27+by+shift,7,15);
   p(g,'#fbeab7',6,30+by+shift,3,9);
   p(g,'#fbeab7',5,34+by+shift,6,2);
   p(g,'#25466c',5,41+by+shift,5,2);
   // Espada de aço de cor fria, sem aparência de arco.
   p(g,'#3f3732',34,36+by+swing,3,12);
   p(g,'#f1c47e',31,33+by+swing,8,3);
   p(g,'#708ba1',34,12+by+swing,4,21);
   p(g,'#ecf6f0',35,14+by+swing,2,17);
   p(g,'#d1e0df',35,9+by+swing,2,5);
  }else if(role==='curandeiro'){
   // Capuz de marfim com forro vermelho e sombra, frontal ou de costas.
   p(g,'#674858',9,7+by,25,18);
   p(g,'#f1e8db',11,6+by,21,14);
   p(g,'#fffaf0',13,7+by,16,4);
   p(g,'#c86976',11,13+by,20,4);
   if(back){
    p(g,'#af6174',15,13+by,12,17);
    p(g,'#f8e4d1',17,14+by,8,5);
    p(g,'#eac580',18,21+by,6,7);
   }else{
    p(g,'#b58275',13,17+by,17,3);
    p(g,'#e8b18e',15,19+by,13,3);
    p(g,'#f7d4a5',17,20+by,5,2);
   }
   // Túnica clara até as pernas e estola vermelha separada do corpo.
   p(g,'#76536b',8,24+by,27,21);
   p(g,'#f2e8da',10,24+by,23,19);
   p(g,'#fffaf1',12,26+by,10,15);
   p(g,'#c65e70',11,25+by,4,18);
   p(g,'#b34f66',28,26+by,4,17);
   p(g,'#f5c979',18,28+by,7,9);
   p(g,'#b76a65',20,28+by,3,9);
   p(g,'#fff5cd',18,31+by,7,2);
   p(g,'#b66a75',10,41+by,23,4);
   p(g,'#ffe7d3',13,42+by,18,2);
   // Cajado alto de madeira com cristal azul bem reconhecível.
   p(g,'#4e3c34',34,14+by+swing,4,33);
   p(g,'#c49660',35,17+by+swing,2,28);
   p(g,'#4b6e83',31,5+by+swing,9,11);
   p(g,'#72dbea',32,6+by+swing,7,9);
   p(g,'#e5fff1',33,7+by+swing,3,4);
   p(g,'#f4dc94',33,16+by+swing,6,3);
   if(action==='attack'){
    for(let i=0;i<3;i++)p(g,'#a9fbeb',24+i*4,5+((frame+i)%3)*3,2,2);
   }
  }else if(role==='arqueiro'){
   // Mantém o arco existente, mas reforça a roupa VERDE exclusivamente aqui.
   p(g,'#214532',13,8+by,14,5);
   p(g,'#70a86b',15,8+by,9,2);
   p(g,'#294e35',13,24+by,5,15);
   p(g,'#8ac579',14,25+by,2,7);
   p(g,'#c6a573',31,15+by,3,4);
  }else{
   // Peregrino é couro + lenço vermelho, sem escudo nem cajado.
   p(g,'#653a35',12,20+by,18,7);
   p(g,'#ba6050',13,20+by,15,4);
   p(g,'#edb376',15,21+by,9,2);
   p(g,'#a4774b',13,26+by,19,12);
   p(g,'#e5c187',15,27+by,5,2);
   p(g,'#714737',11,32+by,7,10);
   p(g,'#cc9870',12,34+by,3,6);
  }
  // O perfil é diferente, mas usa sempre a mesma direção de movimento.
  if(side&&role==='curandeiro')p(g,'#fff5e5',12,27+by,6,13);
  if(side&&role==='guardiao')p(g,'#c2d4db',12,27+by,6,11);
 }
 function creature(g,c,{species=0,boss=false,action='idle',frame=0,dir=2}={}){
  const spec=VARIANTS[Math.max(0,Math.min(VARIANTS.length-1,species|0))];
  const [name,accent,glint,motif]=spec;
  const motion=action==='walk'?[0,1,3,1,0,-1][frame%6]:
   action==='attack'?[0,0,-3,-4,1][frame%5]:0;
  // Cor de espécie, microdetalhes agrupados e antialias nunca usado.
  const segments=[[14,25,8,3],[25,30,5,4],[18,38,10,3]];
  for(let i=0;i<segments.length;i++){
   const [x,y,w,h]=segments[i];
   p(g,i===0?glint:accent,x,y+motion,w,h);
  }
  if(motif==='bubbles'){
   for(let i=0;i<3;i++){
    const xx=8+i*13,yy=16+(i+frame)%3*4;
    p(g,accent,xx,yy+motion,5,4);p(g,glint,xx+1,yy+motion,2,2);
   }
  }else if(motif==='fur'){
   for(let i=0;i<5;i++){
    const xx=7+i*6,yy=18+(i%3)*6;
    p(g,c.dark,xx,yy+motion,5,6);p(g,glint,xx+1,yy+motion,3,2);
   }
  }else if(motif==='wing'){
   const flap=action==='walk'?[0,-5,-8,-3,2,3][frame%6]:0;
   p(g,c.dark,2,20+flap,13,4);p(g,accent,3,21+flap,8,3);
   p(g,c.dark,30,19+flap,10,4);p(g,glint,32,19+flap,5,2);
  }else if(motif==='weapon'){
   p(g,'#3d3938',7,23+motion,3,20);
   p(g,'#c8d5d2',7,11+motion,4,19);
   p(g,'#f9e7c4',8,14+motion,1,12);
   p(g,accent,24,23+motion,12,14);
   p(g,glint,26,25+motion,7,3);
  }else if(motif==='rune'){
   p(g,c.dark,16,25+motion,12,13);
   p(g,accent,18,27+motion,8,9);
   p(g,glint,21,29+motion,3,5);
   p(g,glint,19,32+motion,7,2);
  }else if(motif==='fang'){
   for(let i=0;i<4;i++){
    p(g,c.dark,7+i*8,19+motion+i%2*3,4,8);
    p(g,glint,8+i*8,20+motion+i%2*3,2,4);
   }
  }else if(motif==='thorn'){
   for(let i=0;i<5;i++){
    const x=9+i*6,y=19+i%2*7;
    p(g,c.dark,x,y+motion,6,8);
    p(g,accent,x+1,y+motion,3,5);
    p(g,glint,x+2,y-3+motion,2,5);
   }
  }else if(motif==='tusk'){
   p(g,glint,11,31+motion,3,9);p(g,glint,29,31+motion,3,9);
   p(g,accent,19,22+motion,8,4);
  }else if(motif==='wisp'){
   for(let i=0;i<5;i++){
    const x=8+i*6,y=16+((i*3+frame)%11);
    p(g,accent,x,y+motion,5,9);
    p(g,glint,x+1,y+motion,2,3);
   }
  }else if(motif==='scale'){
   for(let y=24;y<=39;y+=6)for(let x=12;x<=31;x+=7){
    p(g,c.dark,x,y+motion,7,4);
    p(g,accent,x+1,y+motion,4,2);
    p(g,glint,x+2,y+motion,2,1);
   }
  }
  if(boss){
   p(g,accent,10,6,22,3);p(g,glint,14,5,14,2);
   for(let i=0;i<4;i++)p(g,glint,10+i*6,3+(i%2)*2,3,5);
  }
  if(action==='hurt')p(g,'#ffe4ac',14,15,13,3);
  if(action==='attack')p(g,glint,17,11+motion,6,2);
 }
 function npc(g,n,{dir=2,action='idle',frame=0}={}){
  const style=npcStyle(n),colors=NPC_FAMILY[style]||NPC_FAMILY.viajante;
  const [cloth,light,leather,skin,dark]=colors;
  const moving=action==='walk',step=moving?[0,2,3,0,-2,-3][frame%6]:0;
  const bob=action==='idle'?[0,0,1,0][frame%4]:0;
  if(dir===3){g.save();g.translate(40,0);g.scale(-1,1)}
  // Botas, base da capa, gola, mãos e cabeça separados por contorno nítido.
  p(g,'#1a272c',12+Math.min(0,step),40,9,10);
  p(g,leather,13+Math.min(0,step),42,6,6);
  p(g,'#18272d',23+Math.max(0,step),40,9,10);
  p(g,leather,24+Math.max(0,step),42,6,6);
  p(g,dark,10,20+bob,22,23);
  p(g,cloth,11,21+bob,20,20);
  p(g,light,12,22+bob,6,15);
  p(g,dark,12,37+bob,17,3);p(g,leather,14,36+bob,14,3);
  p(g,'#e5c996',18,37+bob,4,2);
  p(g,dark,13,8+bob,17,16);
  p(g,skin,14,10+bob,15,14);
  p(g,'#f9dfb9',15,11+bob,9,3);
  if(dir!==0){
   p(g,'#251d28',17,18+bob,2,2);
   if(dir===2)p(g,'#251d28',25,18+bob,2,2);
   p(g,'#b27c63',21,21+bob,3,2);
  }
  p(g,dark,7,24+bob,5,13);p(g,cloth,8,25+bob,4,10);
  p(g,dark,31,24+bob,5,13);p(g,cloth,32,25+bob,3,10);
  p(g,skin,8,35+bob,4,4);p(g,skin,32,35+bob,4,4);
  // Anatomia e materiais variam com a profissão e a história.
  const hood=['sineira','jardineiro','escriba','curandeira','faroleira','historiadora','guia','sacerdotisa',
   'tecelã','aprendiz','mensageiro','guarda-aurora','guarda','sentinela'].includes(style);
  if(hood){
   p(g,dark,12,6+bob,18,10);p(g,cloth,13,5+bob,16,6);
   p(g,light,15,6+bob,10,2);
   if(dir!==0){p(g,dark,14,14+bob,3,8);p(g,light,27,12+bob,2,9)}
  }else{
   const hair=hash(style)%2?'#6e4736':'#4a3a35';
   p(g,dark,11,8+bob,19,6);
   p(g,hair,13,7+bob,15,6);
   p(g,'#d6a16c',15,8+bob,10,2);
  }
  const guards=['guarda','vigia','sentinela','guarda-aurora','guardiao-antigo'];
  const staff=['curandeira','sineira','bibliotecario','guia','conselheiro','aprendiz','sentinela'];
  const tools=['escavador','encadernador','pescador','sineiro','marinheira','barqueira','barqueiro','barqueiro-nevoa'];
  if(guards.includes(style)){
   // Escudo, lança e emblema exclusivo da guarda de Auren.
   p(g,'#273d58',2,24+bob,11,19);p(g,'#527ac1',3,25+bob,9,16);
   p(g,'#ffda82',7,28+bob,3,12);p(g,'#f0c984',4,34+bob,8,2);
   p(g,'#d9e1db',34,8+bob,2,36);p(g,'#edcb81',32,10+bob,6,7);
   p(g,light,16,25+bob,12,4);p(g,'#b88e58',20,25+bob,3,11);
  }else if(staff.includes(style)){
   p(g,leather,34,13+bob,3,32);
   p(g,'#e6cc8c',33,11+bob,5,5);
   p(g,'#65cde0',32,5+bob,8,10);
   p(g,'#eaffef',34,7+bob,3,3);
   p(g,light,16,27+bob,9,3);
   p(g,'#c89c6f',20,30+bob,2,9);
  }else if(tools.includes(style)){
   p(g,leather,3,19+bob,7,19);
   p(g,'#d2b57e',4,21+bob,4,14);
   p(g,'#c5ced0',1,17+bob,12,6);
   p(g,'#d6c09a',25,25+bob,12,12);
   p(g,leather,28,27+bob,7,9);
  }else{
   // Alforje e adorno do ofício; nunca é o mesmo do herói.
   p(g,leather,2,27+bob,10,13);
   p(g,'#f0d5a0',3,29+bob,6,3);
   p(g,light,28,25+bob,6,3);
   p(g,'#e6c77e',29,27+bob,3,5);
  }
  // Detalhe determinístico por identidade individual (31 NPCs não viram clones).
  const variation=hash(n?.id||n?.name||style),x=13+(variation%9);
  p(g,variation%2?light:'#e5c57f',x,33+bob,3,3);
  p(g,dark,x+1,36+bob,2,3);
  if(['crianca','aprendiz','copista','tecelã','padeira','colhedora'].includes(style)){
   p(g,light,14,39+bob,16,3);
   p(g,dark,17,41+bob,2,5);
   p(g,cloth,23,40+bob,3,4);
  }
  if(style==='guardiao-antigo'||style==='conselheiro'||style==='bibliotecario'){
   p(g,'#e7d9cf',15,16+bob,5,10);
   p(g,'#c9c1b8',21,17+bob,4,9);
  }
  if(style==='faroleira'||style==='sineiro'||style==='sineira'){
   p(g,'#e9b15e',34,13+bob,4,10);
   p(g,'#fff2a6',35,13+bob,2,5);
  }
  if(style==='guarda-aurora')p(g,'#fff1a8',7,28+bob,3,6);
  if(dir===3)g.restore();
 }
 return{hero,classIdentity,creature,npc,npcStyle,NPC_STYLES,NPC_FAMILY,VARIANTS};
});

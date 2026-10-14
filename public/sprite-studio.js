'use strict';
/*
 * Os Peregrinos — estúdio de sprites em pixel art 2D.
 * Desenha e guarda quadros 40x52 por classe, direção e ação, e quadros
 * exclusivos para famílias de criaturas. Sem downloads ou bibliotecas pagas.
 * Todos os desenhos são feitos em coordenadas inteiras (pixels nítidos).
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosSpriteStudio=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const SHADE=typeof module==='object'&&module.exports?require('./shading16'):globalThis.OsPeregrinosShade16;
 const ATELIER=typeof module==='object'&&module.exports?require('./character-atelier16'):globalThis.OsPeregrinosCharacterAtelier;
 const POLISH=typeof module==='object'&&module.exports?require('./sprite-polish16'):globalThis.OsPeregrinosSpritePolish16;
 const APPEARANCE=typeof module==='object'&&module.exports?require('./appearance16'):globalThis.PeregrinosAppearance16;
 const W=40,H=52;
 const ROLES=Object.freeze({
  peregrino:{coat:'#8a6245',edge:'#402e32',light:'#b99163',trim:'#dcc28e',hair:'#493328',skin:'#e1af7f',boots:'#352b34',metal:'#acb6a4',gem:'#a9e6ca'},
  guardiao:{coat:'#667d8b',edge:'#263848',light:'#b5c9ca',trim:'#e4be78',hair:'#3a322f',skin:'#dda879',boots:'#293744',metal:'#e0e4db',gem:'#96dbea'},
  arqueiro:{coat:'#43775c',edge:'#244534',light:'#94bb83',trim:'#dcb878',hair:'#573b29',skin:'#dbaa77',boots:'#42352d',metal:'#ded5b4',gem:'#c4dfa0'},
  curandeiro:{coat:'#b7b0c4',edge:'#555071',light:'#e1dcd5',trim:'#e6c988',hair:'#65506e',skin:'#e7b99b',boots:'#514e64',metal:'#f2e6c6',gem:'#8dede0'}
 });
 const CREATURES=Object.freeze({
  limo:{base:'#4a916a',dark:'#24583e',light:'#b2de91',eye:'#fff0b0',shape:'slime'},
  lobo:{base:'#8b917c',dark:'#474a48',light:'#c8c7ad',eye:'#ffe69c',shape:'beast'},
  morcego:{base:'#736786',dark:'#332c4c',light:'#b3a2c6',eye:'#e5c690',shape:'wing'},
  esqueleto:{base:'#d1c6a4',dark:'#5b5862',light:'#fff0ce',eye:'#a4d9e5',shape:'bone'},
  aranha:{base:'#67546c',dark:'#322b3c',light:'#ac8b97',eye:'#efb3a2',shape:'spider'},
  golem:{base:'#7b8991',dark:'#3d4c59',light:'#b9c5c3',eye:'#a2efd7',shape:'golem'},
  serpente:{base:'#7ba677',dark:'#345b48',light:'#c6d9a4',eye:'#eac89b',shape:'snake'},
  fera:{base:'#98765c',dark:'#583d39',light:'#d7a780',eye:'#fae2aa',shape:'beast'},
  escorpiao:{base:'#b18760',dark:'#533b35',light:'#dfb985',eye:'#f6d898',shape:'scorpion'},
  fantasma:{base:'#a6b1c9',dark:'#5d6082',light:'#e3e3f5',eye:'#aeedff',shape:'ghost'},
  vespa:{base:'#d5a45b',dark:'#4a3944',light:'#f2d685',eye:'#e9faf3',shape:'wing'},
  dragao:{base:'#718c71',dark:'#304d43',light:'#abd3a0',eye:'#f7c989',shape:'dragon'},
  cavaleiro:{base:'#7c899b',dark:'#313b52',light:'#c6cbd2',eye:'#ffe5a1',shape:'knight'},
  sentinela:{base:'#6a9ba6',dark:'#294b61',light:'#d3e7df',eye:'#b4f6f0',shape:'knight'},
  chefe:{base:'#a58a9e',dark:'#4f3b59',light:'#ead6d5',eye:'#fee0a4',shape:'knight'}
 });
 const phases=Object.freeze({idle:4,walk:6,attack:5,hurt:3,death:5});
 // Alguns fluxos podem enviar nomes exibidos ao jogador em vez dos IDs
 // internos: a normalização impede a classe visual incorreta.
 const normalizeRole=value=>{
  const role=String(value||'').trim().normalize('NFD')
   .replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return role==='guardiao'||role==='guardian'?'guardiao':
   role==='curandeiro'||role==='healer'?'curandeiro':
   role==='arqueiro'||role==='archer'?'arqueiro':
   role==='peregrino'||role==='pilgrim'?'peregrino':'peregrino';
 };
 const palettes=Object.freeze([
  ['#688b59','#345c48','#b1d890'], // raiz
  ['#a36c52','#513d46','#ffb86d'], // cinzas
  ['#8d87bd','#45415f','#e3d6b5'], // templo
  ['#6ac9c9','#275276','#ffe19a']  // aurora
 ]);
 const family=zone=>zone>=16?Math.max(0,Math.min(3,Math.floor((zone-16)/6))):zone>=12&&zone<=15?zone-12:-1;
 function create({documentRef=typeof document!=='undefined'?document:null,limit=850}={}){
  const cache=new Map();let builds=0;
  const pix=(g,c,x,y,w,h)=>{
   if(w<=0||h<=0)return;
   g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  };
  const outline=(g,x,y,w,h,dark,base,shine)=>{
   pix(g,dark,x-1,y-1,w+2,h+2);
   pix(g,base,x,y,w,h);
   if(shine)pix(g,shine,x+2,y+1,Math.max(1,w-4),2);
  };
  function heroFrame(g,role,dir,action,frame,appearance=null){
   const c=appearance&&APPEARANCE?APPEARANCE.palette(ROLES[role]||ROLES.peregrino,appearance):ROLES[role]||ROLES.peregrino,front=dir===2,back=dir===0,side=dir===1||dir===3;
   const cycle=action==='walk'?[0,2,3,1,0,-1][frame%6]:0;
   const step=action==='walk'?[0,3,2,-2,-3,-2][frame%6]:0;
   const breathe=action==='idle'?[0,0,1,0][frame%4]:0;
   const pulse=action==='attack'?[0,-2,-4,-1,1][frame%5]:0;
   const recoil=action==='hurt'?[0,-2,1][frame%3]:0;
   const sway=cycle+pulse+recoil,by=breathe+(step<0?1:0);
   if(dir===3){g.save();g.translate(W,0);g.scale(-1,1)}
   if(action==='death'){g.save();g.translate(0,frame*5);g.scale(1,Math.max(.28,1-frame*.18))}
   // Botas e passada: os pés trocam de posição em SEIS quadros.
   outline(g,13+Math.min(0,step),41+Math.max(0,step),7,8,c.edge,c.boots,'#897c72');
   outline(g,22-Math.max(0,step),41+Math.max(0,-step),7,8,c.edge,c.boots,'#9a8c7c');
   pix(g,c.trim,15+Math.min(0,step),46+Math.max(0,step),4,1);
   pix(g,c.trim,24-Math.max(0,step),46+Math.max(0,-step),4,1);
   // Ombros, capa de duas camadas, cinto, pregas e fivela.
   outline(g,9,19+by,23,23,c.edge,c.coat,c.light);
   pix(g,c.edge,10,24+by,21,2);
   pix(g,c.light,11+sway*.25,24+by,4,15);
   pix(g,c.trim,12,38+by,18,3);pix(g,c.edge,13,40+by,16,3);
   pix(g,c.metal,18,38+by,5,3);pix(g,c.gem,19,39+by,2,2);
   if(back){
    pix(g,c.edge,12,16+by,18,18);pix(g,c.light,14,22+by,4,10);
    pix(g,c.trim,14,30+by,13,2);
    pix(g,c.hair,13,9+by,16,14);
   }else{
    // Rosto 11 cores/volumes, sombra sob franja, olhos 1 pixel e nariz.
    outline(g,13,9+by,16,16,c.edge,c.skin,'#f7ce98');
    pix(g,'#986a55',14,20+by,14,3);
    if(front){
     pix(g,c.hair,13,8+by,16,7);pix(g,c.edge,13,13+by,4,4);
     pix(g,'#302c31',17,18+by,2,2);pix(g,'#302c31',24,18+by,2,2);
     pix(g,'#f0c7a0',21,20+by,2,2);
    }else if(side){
     pix(g,c.hair,13,8+by,15,7);
     pix(g,'#352c30',25,18+by,2,2);
     pix(g,c.light,16,13+by,3,2);
    }
   }
   SHADE?.hero(g,c,{by,front,back,role,frame});
   // Braços animados independentemente do corpo.
   const left=action==='attack'?-5:Math.floor(sway/2),right=action==='attack'?pulse*2:-Math.floor(sway/2);
   outline(g,5+left,22+by,7,14,c.edge,c.coat,c.light);
   outline(g,29+right,22+by,7,14,c.edge,c.coat,c.light);
   pix(g,c.skin,7+left,34+by,4,4);pix(g,c.skin,31+right,34+by,4,4);
   if(role==='guardiao'){
    // Escudo de metal facetado, espada curta, placas e rebites.
    outline(g,0+left,25+by,12,18,'#253443','#879aa7','#dae6e1');
    pix(g,'#3a5965',3+left,28+by,6,12);
    pix(g,'#f1d394',5+left,31+by,2,7);pix(g,'#f1d394',3+left,34+by,6,2);
    pix(g,'#d9ba83',29+right,35+by,3,12);
    pix(g,'#e2e7df',29+right,18+by+pulse,5,17);
    pix(g,'#f3e2be',30+right,19+by+pulse,2,9);
    pix(g,c.metal,10,21+by,6,4);pix(g,c.metal,26,21+by,6,4);
   }else if(role==='arqueiro'){
    // Aljava com quatro flechas e arco permanentemente visível.
    pix(g,'#5b3d2e',28,17+by,10,22);
    pix(g,'#9f774f',30,20+by,5,18);
    for(let i=0;i<4;i++){
     pix(g,'#e4d2a7',30+i*2,13+by+(i%2)*2,2,12);
     pix(g,i%2?'#c6a878':'#8dbb88',30+i*2,11+by+(i%2)*2,2,4);
    }
    const pull=action==='attack'?[0,2,5,1,0][frame%5]:0;
    pix(g,'#51362c',3+left,17+by,3,26);
    pix(g,'#d4a365',5+left,17+by,3,5);
    pix(g,'#bf8d54',5+left,37+by,3,6);
    pix(g,'#f5dfad',8+left-pull,17+by,1,26);
    if(action==='attack'){
     pix(g,'#edcc93',6-pull,30+by,27,2);
     pix(g,'#f0edcc',31-pull,27+by,6,6);
     pix(g,'#8cbb99',6-pull,27+by,4,8);
    }
    pix(g,c.trim,9,25+by,4,2);
   }else if(role==='curandeiro'){
    // Cajado com cristal, estola, runa dourada e energia em quadros de magia.
    pix(g,'#8e674c',31+right,12+by+pulse,3,36);
    pix(g,'#e6c689',30+right,18+by+pulse,5,4);
    outline(g,28+right,6+by+pulse,10,10,'#4e6571','#65d7c6','#d9fff0');
    pix(g,'#fcf4c8',31+right,8+by+pulse,3,3);
    pix(g,c.light,12,21+by,5,21);pix(g,c.light,26,21+by,5,21);
    pix(g,c.trim,18,25+by,6,10);
    pix(g,c.gem,20,28+by,2,4);pix(g,c.gem,19,29+by,4,2);
    if(action==='attack'){
     for(let i=0;i<4;i++)pix(g,i%2?'#d7fff0':'#b5efbe',22+i*3,6+((i+frame)%3)*5,2,2);
    }
   }else{
    // Capa e bolsa lateral do peregrino; espada com balanço por quadros.
    pix(g,c.edge,9,19+by,8,25);
    pix(g,c.light,10+sway*.25,23+by,4,19);
    outline(g,29,30+by,8,11,'#563b2b','#946f4d','#d4ad7c');
    pix(g,c.trim,31,32+by,4,2);
    pix(g,'#8b663e',7+left,28+by,4,15);
    pix(g,c.metal,8+left,15+by+pulse,3,22);
    pix(g,'#f7e3c0',8+left,18+by+pulse,1,11);
   }
   ATELIER?.hero(g,c,{role,dir,action,frame,by,step});
   // Peles, cabelos e acessórios entram ANTES das insígnias específicas;
   // o capuz, escudo, aljava e cajado de cada classe permanecem no topo.
   if(appearance&&APPEARANCE)APPEARANCE.details(g,c,appearance,{dir,by,action,frame});
   // O acabamento final pertence apenas à classe escolhida. Não reutilizar
   // o capuz e a aljava do arqueiro para guardião nem curandeiro.
   ATELIER?.classIdentity?.(g,c,{role,dir,action,frame,by});
   POLISH?.hero(g,{role,dir,action,frame,by});
   // Golpe percebido por um contorno curto que não altera hitbox.
   if(action==='hurt'&&frame%3!==2){
    pix(g,'#fff0dc',10,17,24,2);
    pix(g,'#eb806c',9,28,3,11);
   }
   if(action==='death'){
    pix(g,c.edge,7,35,30,10);pix(g,c.coat,9,36,26,7);
   }
   if(action==='death')g.restore();
   if(dir===3)g.restore();
  }
  function monsterFrame(g,type,dir,action,frame,boss,zone,currentSpecies=0){
   const spec=CREATURES[type]||CREATURES.limo;
   const accents=palettes[family(zone)]||['#97aa84','#4d695a','#c5e7a0'];
   let c={...spec};
   const base=spec.shape,wiggle=action==='walk'?[0,1,2,0,-1,-2][frame%6]:
    action==='attack'?[0,-2,-4,-1,0][frame%5]:action==='hurt'?[0,2,0][frame%3]:0;
   const y=wiggle;
   if(dir===3){g.save();g.translate(W,0);g.scale(-1,1)}
   if(action==='death'){g.save();g.translate(0,frame*5);g.scale(1,Math.max(.26,1-frame*.18))}
   const armor=()=>{pix(g,accents[1],6,25+y,28,19);pix(g,accents[0],9,27+y,22,14);pix(g,accents[2],18,31+y,5,5)};
   if(base==='slime'){
    outline(g,8,26+y,26,17,c.dark,c.base,c.light);
    pix(g,c.dark,11,37+y,21,3);pix(g,c.light,11,28+y,16,4);
    pix(g,c.eye,14,34+y,3,3);pix(g,c.eye,25,34+y,3,3);
    pix(g,c.dark,16,39+y,9,2);
   }else if(base==='beast'||base==='dragon'){
    const wings=base==='dragon';
    if(wings){
     pix(g,c.dark,0,22+y,17,18);pix(g,c.base,1,24+y,14,12);
     pix(g,c.dark,29,22+y,12,19);pix(g,c.base,31,25+y,7,11);
    }
    outline(g,10,22+y,23,20,c.dark,c.base,c.light);
    pix(g,c.dark,8,16+y,8,13);pix(g,c.dark,29,16+y,8,13);
    pix(g,c.light,10,14+y,6,10);pix(g,c.light,30,15+y,5,8);
    pix(g,c.eye,15,27+y,3,3);pix(g,c.eye,26,27+y,3,3);
    pix(g,c.dark,18,33+y,8,7);
    pix(g,c.light,19,37+y,2,4);pix(g,c.light,26,37+y,2,4);
    for(let i=0;i<4;i++)pix(g,c.dark,8+i*7,41+y+i%2*2,4,6);
    if(wings)pix(g,accents[2],18,11+y,8,6);
   }else if(base==='bone'){
    outline(g,12,13+y,18,16,c.dark,c.light,'#fcf5d4');
    pix(g,c.dark,15,20+y,4,5);pix(g,c.dark,24,20+y,4,5);
    pix(g,'#68534e',19,26+y,7,2);
    for(let i=0;i<4;i++)pix(g,c.light,13+i*4,33+y,2,11);
    pix(g,c.dark,14,41+y,17,3);
    pix(g,c.light,9,29+y,4,16);pix(g,c.light,30,29+y,4,16);
    pix(g,c.light,15,45+y,4,5);pix(g,c.light,26,45+y,4,5);
   }else if(base==='spider'||base==='scorpion'){
    for(let i=0;i<4;i++){
     pix(g,c.dark,3,25+i*5+y,10,2);
     pix(g,c.dark,30,25+i*5+y,9,2);
     pix(g,c.base,2,24+i*5+y,5,2);
     pix(g,c.base,34,24+i*5+y,5,2);
    }
    outline(g,12,21+y,20,21,c.dark,c.base,c.light);
    pix(g,c.dark,18,25+y,10,6);
    for(let i=0;i<4;i++)pix(g,c.eye,17+i*4,25+y+i%2*3,2,3);
    if(base==='scorpion'){
     pix(g,c.dark,28,8+y,6,18);
     pix(g,c.base,29,10+y,4,12);
     pix(g,c.eye,26,9+y,10,5);
    }
   }else if(base==='wing'){
    pix(g,c.dark,1,20+y,18,21);pix(g,c.dark,23,20+y,18,21);
    pix(g,c.base,3,22+y,15,13);pix(g,c.base,25,23+y,13,14);
    pix(g,c.light,5,24+y,9,3);pix(g,c.light,28,25+y,8,3);
    outline(g,15,21+y,14,19,c.dark,c.base,c.light);
    pix(g,c.eye,18,28+y,3,3);pix(g,c.eye,24,28+y,3,3);
    pix(g,c.dark,17,42+y,2,6);pix(g,c.dark,27,42+y,2,6);
   }else if(base==='snake'){
    pix(g,c.dark,12,32+y,24,14);
    pix(g,c.base,14,33+y,21,11);
    pix(g,c.light,17,35+y,15,3);
    pix(g,c.dark,9,13+y,16,25);
    pix(g,c.base,11,14+y,13,22);
    pix(g,c.eye,13,18+y,4,3);
    pix(g,c.eye,20,18+y,4,3);
    pix(g,'#dc8c79',16,30+y,4,10);
   }else if(base==='ghost'){
    pix(g,c.dark,10,19+y,25,26);
    pix(g,c.base,13,14+y,21,30);
    pix(g,c.light,15,19+y,16,13);
    for(let i=0;i<4;i++)pix(g,i%2?c.light:c.base,12+i*7,41+y,4,8-i%2*3);
    pix(g,c.dark,17,27+y,4,5);pix(g,c.dark,27,27+y,3,5);
    pix(g,c.eye,18,28+y,2,2);pix(g,c.eye,28,28+y,2,2);
   }else{
    // Golem e sentinelas: placas facetadas e articulações.
    outline(g,10,17+y,22,27,c.dark,c.base,c.light);
    outline(g,5,23+y,7,17,c.dark,c.base,c.light);
    outline(g,31,23+y,7,17,c.dark,c.base,c.light);
    outline(g,14,8+y,14,14,c.dark,c.base,c.light);
    pix(g,c.dark,15,18+y,13,4);
    pix(g,c.eye,16,17+y,4,3);pix(g,c.eye,25,17+y,3,3);
    pix(g,c.dark,12,41+y,8,8);pix(g,c.dark,24,41+y,8,8);
    armor();
   }
   SHADE?.creature(g,c,{boss,frame,shape:base,zone});
   // Pontos de brilho, cicatrizes e textura de escamas: nove micropixels por
   // criatura garantem leitura de volume mesmo num sprite de poucos pixels.
   for(let i=0;i<9;i++){
    const px=10+((i*7+(type.length%4))%21),py=28+((i*5)%14);
    pix(g,i%3===0?c.light:i%3===1?c.base:accents[0],px,py+y,1+(i%2),1);
   }
   ATELIER?.creature(g,c,{species:currentSpecies,boss,action,frame,dir});
   if(boss){
    pix(g,accents[1],5,8+y,31,5);
    for(let i=0;i<5;i++){
     pix(g,accents[2],6+i*6,3+y+(i%2)*3,4,8);
     pix(g,'#fff3cd',8+i*6,6+y+(i%2)*3,2,2);
    }
    pix(g,accents[0],14,13+y,15,3);
   }
   if(action==='attack'){
    pix(g,c.eye,6,13+y,3,3);
    pix(g,c.eye,31,14+y,3,3);
    pix(g,accents[2],17,44+y,8,3);
   }else if(action==='hurt'){
    pix(g,'#ffe1ae',9,17+y,26,2);
   }
   POLISH?.creature(g,{type,species:currentSpecies,boss,dir,action,frame});
   if(action==='death')g.restore();
   if(dir===3)g.restore();
  }
  function obtain(kind,name,dir,action,frame,boss,zone,species=0,npc=null,appearance=null){
   const group=kind==='hero'?ROLES:CREATURES;
   if(kind==='hero')name=normalizeRole(name);
   else if(kind!=='npc'&&!group[name])name='limo';
   dir=Number.isInteger(dir)?Math.max(0,Math.min(3,dir)):2;
   action=phases[action]?action:'idle';
   frame=((Number.isFinite(frame)?Math.floor(frame):0)%phases[action]+phases[action])%phases[action];
   const id=kind==='npc'?(npc?.id||npc?.name||name):'';
   const key=[kind,name,dir,action,frame,boss?1:0,kind==='monster'?family(zone):0,kind==='monster'?species:id,
    kind==='hero'&&appearance&&APPEARANCE?APPEARANCE.key(appearance):''].join(':');
   let sprite=cache.get(key);
   if(sprite){cache.delete(key);cache.set(key,sprite);return sprite}
   if(!documentRef?.createElement)return null;
   const canvas=documentRef.createElement('canvas');canvas.width=W;canvas.height=H;
   const g=canvas.getContext('2d');
   if(!g)return null;
   g.imageSmoothingEnabled=false;
   if(kind==='hero')heroFrame(g,name,dir,action,frame,appearance);
   else if(kind==='npc'&&ATELIER?.npc){
    ATELIER.npc(g,npc||{name}, {dir,action,frame});
    POLISH?.npc(g,{style:name,dir,action,frame});
   }
   else if(kind==='npc')heroFrame(g,npc?.role||'peregrino',dir,action,frame);
   else monsterFrame(g,name,dir,action,frame,!!boss,zone,species);
   cache.set(key,canvas);builds++;
   if(cache.size>Math.max(128,limit))cache.delete(cache.keys().next().value);
   return canvas;
  }
  function pose({moving=false,attacking=false,hurt=false,dead=false,elapsed=0,now=0,seed=0}={}){
   const action=dead?'death':hurt?'hurt':attacking?'attack':moving?'walk':'idle';
   const ms=action==='attack'?75:action==='hurt'?110:action==='walk'?105:action==='death'?115:360;
   const frame=action==='attack'||action==='hurt'||action==='death'?
    Math.min(phases[action]-1,Math.max(0,Math.floor(elapsed/ms))):
    Math.floor((now+seed)/ms)%phases[action];
   return {action,frame};
  }
  function drawHero(g,p,now,state={}){
   if(!g?.drawImage)return false;
   const sel=pose({now,moving:state.moving,attacking:state.attacking,hurt:state.hurt,elapsed:state.elapsed,seed:state.seed||0});
   const sheet=obtain('hero',p.role,p.dir,sel.action,sel.frame,false,0,0,null,p.appearance);
   if(!sheet)return false;
   g.imageSmoothingEnabled=false;
   const pc=state.desktopPremium===true;
   const w=pc?70:56,h=pc?87:69;
   if(pc){
    // Sombras duras do contorno: preservam pixel art sobre folhas e pedras.
    g.save();
    g.shadowColor='#071a18';g.shadowBlur=0;
    g.shadowOffsetX=2;g.shadowOffsetY=2;
    g.drawImage(sheet,Math.round(p.x-w/2),Math.round(p.y-h),w,h);
    g.restore();
   }
   g.drawImage(sheet,Math.round(p.x-w/2),Math.round(p.y-h),w,h);
   return true;
  }
  function drawMonster(g,m,now,state={}){
   if(!g?.drawImage)return false;
   const sel=pose({now,moving:state.moving,attacking:state.attacking,hurt:state.hurt,elapsed:state.elapsed,seed:(m.species||0)*83});
   const dir=Number.isInteger(m.dir)?m.dir:2;
   const type=state.type||m.type||'limo';
   const sheet=obtain('monster',type,dir,sel.action,sel.frame,!!m.boss,m.zone||0,Number.isInteger(m.species)?m.species:0);
   if(!sheet)return false;
   const pc=state.desktopPremium===true;
   const w=pc?(m.boss?106:66):(m.boss?77:54);
   const h=pc?(m.boss?132:81):(m.boss?92:61);
   g.imageSmoothingEnabled=false;
   if(pc){
    g.save();g.shadowColor='#071b1c';g.shadowBlur=0;
    g.shadowOffsetX=2;g.shadowOffsetY=2;
    g.drawImage(sheet,Math.round(m.x-w/2),Math.round(m.y-h),w,h);
    g.restore();
   }
   g.drawImage(sheet,Math.round(m.x-w/2),Math.round(m.y-h),w,h);
   return true;
  }
  function drawNpc(g,n,now,state={}){
   if(!g?.drawImage)return false;
   // Personagens da história e moradores têm identidade própria; não vestem
   // as roupas das classes jogáveis. Os quadros são reutilizados do cache.
   const dir=Number.isInteger(n.dir)?n.dir:2;
   const seed=Array.from(String(n.id||n.name||'')).reduce((a,c)=>a+c.charCodeAt(0),0)*17;
   const sel=pose({now,moving:n.moving===true,seed});
   const sprite=obtain('npc',ATELIER?.npcStyle?.(n)||n.role||'peregrino',
    dir,sel.action,sel.frame,false,n.zone||0,0,n);
   if(!sprite)return false;
   g.imageSmoothingEnabled=false;
   const pc=state.desktopPremium===true;
   const w=pc?62:52,h=pc?78:62;
   if(pc){
    g.save();g.shadowColor='#071b1c';g.shadowBlur=0;
    g.shadowOffsetX=2;g.shadowOffsetY=2;
    g.drawImage(sprite,Math.round(n.x-w/2),Math.round(n.y-h),w,h);
    g.restore();
   }
   g.drawImage(sprite,Math.round(n.x-w/2),Math.round(n.y-h),w,h);
   return true;
  }
  function clear(){cache.clear()}
  return {drawHero,drawMonster,drawNpc,pose,clear,
   obtain,normalizeRole,get stats(){return{builds,cached:cache.size}},roles:Object.keys(ROLES),creatures:Object.keys(CREATURES)};
 }
 return {create,ROLES,CREATURES,phases,family,normalizeRole};
});

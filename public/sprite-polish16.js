'use strict';
/*
 * Os Peregrinos — acabamento de sprites 16-bit.
 * Detalhes em grupos de pixels inteiros, sobre as poses geradas e antes do
 * cache; nenhuma textura externa, suavização, filtro ou alteração de hitbox.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosSpritePolish16=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const p=(g,color,x,y,w=1,h=1)=>{
  if(!(w>0&&h>0))return;
  g.fillStyle=color;
  g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
 };
 const glint=(g,x,y,tint='#fff1cb')=>{
  p(g,tint,x,y,3,1);p(g,tint,x+1,y-1,1,3);
 };
 function hero(g,{role='peregrino',dir=2,action='idle',frame=0,by=0}={}){
  const back=dir===0,attack=action==='attack',walk=action==='walk';
  const sway=walk?[0,1,2,1,0,-1][frame%6]:0;
  // Os detalhes não cobrem rostos ou armas: preservam as formas de cada classe.
  p(g,'#2b2830',13,48,5,1);p(g,'#2b2830',25,48,5,1);
  if(role==='peregrino'){
   // Cabelo dourado-acobreado, cachecol em camadas e couro costurado.
   if(!back){
    p(g,'#f0b67a',15,8+by,5,2);p(g,'#d58a52',23,6+by,4,3);
    p(g,'#fff0c0',18,9+by,3,1);
   }
   p(g,'#e77a65',10-sway,22+by,9,2);
   p(g,'#743243',8-sway,25+by,4,3);
   p(g,'#f1a181',9-sway,31+by,2,8);
   p(g,'#efc88b',24,32+by,5,1);
   p(g,'#643c31',27,33+by,1,8);
   p(g,'#ffe4af',19,39+by,2,2);
   p(g,'#c59a62',14,43+by,3,1);
   if(attack){
    p(g,'#dbe8e9',4,10+by,2,9);
    p(g,'#ffffff',3,9+by,2,3);
    p(g,'#78b9dd',1,14+by+frame%3,2,3);
   }
  }else if(role==='guardiao'){
   // Elmo, rebites de aço, capa azul e brasão solar no escudo.
   p(g,'#ffffff',16,9+by,4,1);
   p(g,'#e5be72',22,7+by,2,4);
   p(g,'#658ec8',29,23+by,2,14);
   p(g,'#eef4ec',13,24+by,4,2);
   p(g,'#f9e3a3',21,31+by,2,9);
   p(g,'#fff3c9',7,29+by+sway,1,6);
   p(g,'#c4e0ec',5,28+by+sway,2,2);
   p(g,'#ffd77e',8,34+by+sway,2,2);
   p(g,'#b6d5dd',15,44+by,3,2);
   p(g,'#f2d6a0',26,44+by,3,1);
   if(back){
    p(g,'#f6d78a',19,30+by,3,8);p(g,'#fff2b5',17,34+by,8,2);
   }
   if(attack){
    p(g,'#aee9ff',36,10+by,3,2);
    p(g,'#e4ffff',37,13+by,2,5);
    glint(g,34,9+by,'#fff6c8');
   }
  }else if(role==='arqueiro'){
   // Borda do capuz, penas da aljava e proteção de couro do braço.
   p(g,'#a9d884',14,9+by,9,2);
   p(g,'#1f563d',11,26+by,3,14);
   p(g,'#d8bb81',25,33+by,3,2);
   p(g,'#fff5cf',31,12+by,2,3);
   p(g,'#cbe8a0',35,13+by,2,3);
   p(g,'#735033',28,25+by,2,11);
   p(g,'#e5c28b',10,35+by,3,2);
   p(g,'#c2d498',16,43+by,3,1);
   if(attack){
    p(g,'#f4e8c5',33,29+by,4,1);
    p(g,'#efffe1',37,27+by,3,4);
    p(g,'#8aeec9',39,28+by,1,2);
   }
  }else if(role==='curandeiro'){
   // Bordado de lírios, bainha luminosa e reflexos do cristal sagrado.
   p(g,'#ffffff',14,8+by,10,2);
   p(g,'#f4cad0',12,12+by,4,1);
   p(g,'#f6d7ae',16,22+by,4,2);
   p(g,'#fff9ec',13,27+by,5,8);
   p(g,'#ffe8b6',20,31+by,2,6);
   p(g,'#f8a7a6',14,40+by,2,3);
   p(g,'#fff5db',18,42+by,7,1);
   p(g,'#f4c79d',27,42+by,3,2);
   p(g,'#eaffff',34,7+by,2,3);
   p(g,'#95f0f5',31,8+by,2,3);
   if(attack){
    glint(g,27,4+(frame%2)*3+by,'#d5fdff');
    glint(g,37,18-(frame%3)*2+by,'#8bedf7');
    p(g,'#fef6d2',37,13+by,3,3);
   }
  }
 }
 function creature(g,{type='limo',species=0,boss=false,action='idle',frame=0}={}){
  const attack=action==='attack',walk=action==='walk';
  const j=walk?[0,1,2,0,-1,-2][frame%6]:0;
  const claw=attack?[0,1,3,4,1][frame%5]:0;
  // Cada família tem uma textura/material próprio, nunca uma roupa de herói.
  if(type==='limo'){
   p(g,'#e8ffb5',13,27+j,9,2);
   p(g,'#aef7a5',10,32+j,3,4);
   p(g,'#dbffb9',24,29+j,4,2);
   p(g,'#175541',16,36+j,2,3);p(g,'#175541',27,36+j,2,3);
   if(attack){p(g,'#87ef91',7,23-claw,5,5);glint(g,32,19-claw,'#ddff9c')}
  }else if(type==='lobo'||type==='fera'){
   for(let i=0;i<4;i++){
    p(g,i%2?'#9a88b1':'#c7b3b0',10+i*6,20+(i%2)*2+j,3,3);
    p(g,'#352c43',9+i*6,23+(i%2)*2+j,2,4);
   }
   p(g,'#f7f1dc',19,39+j,2,4);p(g,'#f7f1dc',25,39+j,2,4);
   if(attack){p(g,'#e1bfff',33+claw,17,2,10);p(g,'#fff2f8',35+claw,19,1,5)}
  }else if(type==='morcego'||type==='vespa'){
   for(let i=0;i<3;i++){
    p(g,'#d5a0dc',3+i*4,25-j,3,2);
    p(g,'#b98eca',29+i*3,26+j,2,2);
   }
   p(g,'#fff2b9',18,31+j,2,2);
   if(attack){p(g,'#c187fb',34+claw,23,3,3);glint(g,37,19,'#f3ddff')}
  }else if(type==='esqueleto'){
   p(g,'#fff4d2',14,15+j,6,2);
   p(g,'#f0d0a7',26,17+j,3,2);
   for(let i=0;i<3;i++)p(g,'#fff3c7',17,32+i*4+j,10,1);
   if(attack){p(g,'#f3fbff',4,8+claw,2,16);p(g,'#a9d2e8',3,9+claw,1,11)}
  }else if(type==='aranha'||type==='escorpiao'){
   for(let i=0;i<4;i++){
    p(g,'#bd6b77',3+i*3,24+i*4+j,2,2);
    p(g,'#a95264',35-i*2,24+i*4+j,2,2);
   }
   p(g,'#ff6d6f',20,27+j,4,2);
   if(attack){glint(g,33,15-claw,'#b6ff99');p(g,'#8ded8a',37,17-claw,2,6)}
  }else if(type==='golem'){
   p(g,'#e6d5b8',14,19+j,10,3);
   p(g,'#688e8e',12,25+j,4,9);
   p(g,'#293c48',24,33+j,7,2);
   p(g,'#b1fded',19,31+j,4,1);
   p(g,'#e7fdf3',21,30+j,2,3);
   if(attack){p(g,'#8be8e9',2,39-claw,7,2);glint(g,34,36,'#d0ffff')}
  }else if(type==='fantasma'){
   p(g,'#e6d3ff',14,19+j,12,2);
   p(g,'#ad86d3',10,29+j,3,12);
   p(g,'#7150b9',29,35+j,3,11);
   glint(g,29,14+j,'#d6b6ff');
   if(attack){glint(g,34,22-claw,'#d8baff');p(g,'#c9a5ff',36,26-claw,3,7)}
  }else if(type==='dragao'||type==='serpente'){
   for(let i=0;i<4;i++){
    p(g,'#ffd297',12+i*5,22+(i%2)*4+j,3,2);
    p(g,'#813a40',13+i*5,25+(i%2)*4+j,2,3);
   }
   p(g,'#fff2c3',24,36+j,2,4);
   if(attack){p(g,'#ffad44',36,29-claw,4,5);p(g,'#fff5a8',38,30-claw,2,2)}
  }else{
   // Cavaleiros, sentinelas e demais inimigos usam metal facetado.
   p(g,'#e2e9d9',16,15+j,9,2);
   p(g,'#d9bf82',12,25+j,4,3);
   p(g,'#b1e9f3',19,30+j,3,3);
   if(attack)glint(g,32,15-claw,'#fbe2a8');
  }
  // Chefões destacam seus elementos sem recolorir todos como o mesmo rei.
  if(boss){
   const crown=type==='chefe'||type==='esqueleto'||type==='cavaleiro';
   if(crown){
    p(g,'#ffe5a3',14,5,3,5);p(g,'#f8bd68',20,3,3,7);
    p(g,'#ffe9af',28,5,3,5);
   }else if(type==='aranha'||type==='escorpiao'){
    p(g,'#f46773',14,9,5,3);p(g,'#ffbd7c',27,8,3,5);
   }else if(type==='dragao'||type==='serpente'){
    p(g,'#ffc16c',10,8,4,7);p(g,'#ffedb3',26,6,4,8);
   }else if(type==='golem'||type==='sentinela'){
    p(g,'#87e9ff',18,6,5,6);glint(g,24,4,'#ecffff');
   }else glint(g,20,6,'#fff0ce');
   p(g,'#fff5c9',18,35+(frame%2),2,2);
  }
  // Selo cromático de espécie: garante leitura distinta mesmo entre
  // famílias que compartilham anatomia (lobo/fera, morcego/vespa etc.).
  const crests={
   limo:'#dfff9b',lobo:'#a8a1eb',morcego:'#c78fea',esqueleto:'#fff1cb',
   aranha:'#f4758a',golem:'#b6f7eb',serpente:'#d7e78a',fera:'#efbc93',
   escorpiao:'#f9b36b',fantasma:'#d1bcff',vespa:'#ffe076',dragao:'#ffb77d',
   cavaleiro:'#cad5ee',sentinela:'#8ee9ff',chefe:'#f0bdff'
  };
  p(g,crests[type]||'#fff0cc',19+(species%4),24+j,3,2);
  if(species%2===1)p(g,'#fff0bb',18+species%8,39+j,2,1);
 }
 function npc(g,{style='viajante',dir=2,action='idle',frame=0}={}){
  const walk=action==='walk',sway=walk?[0,1,2,1,0,-1][frame%6]:0;
  if(dir===3){g.save();g.translate(40,0);g.scale(-1,1)}
  p(g,'#f4dcb0',16,39,3,1);
  p(g,'#fff1cd',18,13,3,1);
  p(g,'#594031',22,37,2,4);
  if(style==='mensageiro'){
   // Mercador: cinto de moedas, rolos e alforje cheio.
   p(g,'#7b5035',1,26+sway,10,14);
   p(g,'#d5b17b',2,27+sway,8,3);
   p(g,'#e7d5aa',4,22+sway,4,6);
   p(g,'#f8d36c',18,36,3,3);
   p(g,'#fff0a4',19,36,1,2);
  }else if(style==='escavador'){
   // Ferreiro: avental de couro, luvas e martelo de aço.
   p(g,'#553a36',13,25,15,17);
   p(g,'#ae7e55',15,26,11,12);
   p(g,'#e0ae73',20,32,3,2);
   p(g,'#cbd8d5',1,17-sway,12,6);
   p(g,'#fbedd6',3,18-sway,6,1);
  }else if(style==='guarda-aurora'||style==='guarda'){
   p(g,'#f4dfaa',18,26,4,11);
   p(g,'#fff3b2',5,32,5,2);
   p(g,'#c3e0e8',16,9,7,2);
  }else if(style==='curandeira'){
   p(g,'#ffffff',16,6,10,2);
   p(g,'#cf627b',18,31,5,8);
   p(g,'#ffe29a',20,34,2,4);
   glint(g,34,6,'#e4ffff');
  }else if(style==='bibliotecario'||style==='conselheiro'){
   p(g,'#f7f1df',16,21,7,6);
   p(g,'#e3c186',27,27,8,10);
   p(g,'#ffeed0',28,28,5,1);
   p(g,'#7b5ca8',24,39,5,3);
  }else if(style==='viajante'||style==='guia'){
   p(g,'#c65d57',12,22,17,3);
   p(g,'#f69d73',15,22,10,1);
   p(g,'#614a35',29,28+sway,6,12);
   p(g,'#dfbc84',30,29+sway,3,2);
  }else{
   // Costuras e fivelas diferenciam os outros trinta moradores.
   p(g,'#f3dda3',14,29,3,2);
   p(g,'#f8edce',26,34,2,2);
  }
  if(dir===3)g.restore();
 }
 return Object.freeze({hero,creature,npc});
});

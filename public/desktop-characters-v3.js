'use strict';
/*
 * Os Peregrinos — Estúdio de personagens 16-bit V3 (somente PC).
 * Cada classe tem quadros completos, com anatomia, peças de vestuário,
 * armas e silhuetas próprias. Desenhos originais de pixels inteiros.
 * Não altera rede, hitboxes, progresso, áudio nem controles touch.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosDesktopCharactersV3=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const W=64,H=80;
 const ROLES=Object.freeze({
  peregrino:{edge:'#33242b',coat:'#77503a',dark:'#4b3231',light:'#bb8758',metal:'#bccdd4',trim:'#e7bb7e',hair:'#9d5c39',skin:'#f0b783',cape:'#bc424a'},
  guardiao:{edge:'#1c3048',coat:'#385c9b',dark:'#243b67',light:'#6da0d3',metal:'#d4e3ef',trim:'#ffd679',hair:'#c89245',skin:'#edb78b',cape:'#2c5db3'},
  arqueiro:{edge:'#24372b',coat:'#427447',dark:'#265033',light:'#91b86e',metal:'#e2d5ae',trim:'#e1b873',hair:'#8b6038',skin:'#efbc8d',cape:'#306941'},
  curandeiro:{edge:'#633e52',coat:'#e8ddd2',dark:'#b15b70',light:'#fff7e9',metal:'#d9e7f1',trim:'#f0cf8e',hair:'#b68358',skin:'#f1bea0',cape:'#b74862'},
  mercador:{edge:'#33432d',coat:'#60804a',dark:'#37533a',light:'#b3b16c',metal:'#efcf85',trim:'#f7d58b',hair:'#915d33',skin:'#eaba8c',cape:'#588143'},
  ferreiro:{edge:'#402f30',coat:'#885844',dark:'#563b36',light:'#c89261',metal:'#c2d1d2',trim:'#e9b781',hair:'#663b30',skin:'#dca47e',cape:'#6e4539'},
  guarda:{edge:'#203550',coat:'#3c67b2',dark:'#244b88',light:'#8bace3',metal:'#e0ebeb',trim:'#ffd36f',hair:'#ad8b4e',skin:'#ebba95',cape:'#3166b5'},
  viajante:{edge:'#432e30',coat:'#765b3c',dark:'#4b3c35',light:'#c39262',metal:'#d6c2a6',trim:'#e5c08a',hair:'#aa693c',skin:'#e6b58e',cape:'#ad4b50'},
  sacerdotisa:{edge:'#673b51',coat:'#f3e5db',dark:'#b75a72',light:'#fff9ef',metal:'#d8e9f1',trim:'#f8d895',hair:'#b88a58',skin:'#f6be9e',cape:'#b64a67'},
  sabio:{edge:'#39315a',coat:'#5e4b91',dark:'#3f3267',light:'#9f8bc1',metal:'#c8ebed',trim:'#eac982',hair:'#eee1c8',skin:'#e1b89a',cape:'#473378'}
 });
 const animated={idle:4,walk:6,attack:5,hurt:3,death:5};
 function roleName(v){
  const name=String(v||'peregrino').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return ROLES[name]?name:name==='guardian'?'guardiao':name==='healer'?'curandeiro':name==='archer'?'arqueiro':'peregrino';
 }
 function npcRole(n){
  const text=(String(n?.name||'')+' '+String(n?.title||'')).normalize('NFD')
   .replace(/[\u0300-\u036f]/g,'').toLowerCase();
  for(const [needle,role] of [['ferreir','ferreiro'],['mercad','mercador'],
   ['guarda','guarda'],['sentinela','guarda'],['sacerdot','sacerdotisa'],
   ['sabio','sabio'],['viajante','viajante'],['curandeir','sacerdotisa'],
   ['bibliotec','sabio']])if(text.includes(needle))return role;
  return null;
 }
 function create({windowRef=typeof window!=='undefined'?window:null,
   documentRef=typeof document!=='undefined'?document:null,limit=600}={}){
  let enabled=false;
  try{enabled=!!windowRef?.matchMedia?.('(min-width: 901px) and (hover: hover) and (pointer: fine)')?.matches}
  catch{}
  const cache=new Map();let generated=0;
  const rect=(g,c,x,y,w,h)=>{
   if(w<=0||h<=0)return;
   g.fillStyle=c;
   g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  };
  const block=(g,outline,fill,highlight,x,y,w,h)=>{
   rect(g,outline,x-2,y-2,w+4,h+4);
   rect(g,fill,x,y,w,h);
   if(highlight)rect(g,highlight,x+2,y+1,Math.max(2,w-5),2);
  };
  function jewel(g,x,y,outer,inside){
   rect(g,'#24324c',x-3,y-3,11,11);
   rect(g,outer,x-1,y-2,7,9);
   rect(g,inside,x+1,y,3,4);
   rect(g,'#faffff',x+1,y,2,2);
  }
  function line(g,color,x,y,length,dx,dy,thick=2){
   for(let i=0;i<length;i++)rect(g,color,x+i*dx,y+i*dy,thick,thick);
  }
  function character(g,role,dir,action,frame){
   const c=ROLES[role],front=dir===2,back=dir===0,side=dir===1||dir===3;
   const walk=action==='walk',attack=action==='attack',hurt=action==='hurt';
   const steps=[0,3,5,2,0,-3],stride=walk?steps[frame%6]:0;
   const bounce=walk?[0,-2,-3,-1,0,-1][frame%6]:action==='idle'?[0,0,1,0][frame%4]:0;
   const recoil=attack?[0,-1,-3,-1,0][frame%5]:0;
   const by=bounce+recoil,skew=Math.round(stride*.35);
   if(dir===3){g.save();g.translate(W,0);g.scale(-1,1)}
   if(action==='death'){
    g.save();g.translate(0,frame*9);g.scale(1,Math.max(.2,1-frame*.19));
   }
   // Capa recortada com pontas, contrastando com o terreno.
   for(let i=0;i<5;i++){
    const x=12+i*8+Math.round(skew*.3),top=30+by+i%2*2;
    const h=32+(i%3)*3;
    rect(g,c.edge,x-2,top-2,10,h+4);
    rect(g,i%2?c.dark:c.cape,x,top,7,h);
    rect(g,i%2?c.cape:c.light,x,top+2,2,Math.max(5,h-6));
   }
   // Pernas independentes: é uma caminhada real de 6 quadros.
   const leftY=60+Math.max(0,stride),rightY=60+Math.max(0,-stride);
   block(g,c.edge,c.dark,c.light,19+Math.min(0,stride),leftY,10,13);
   block(g,c.edge,c.dark,c.light,37-Math.max(0,stride),rightY,10,13);
   rect(g,'#261f27',16+Math.min(0,stride),leftY+12,16,6);
   rect(g,'#261f27',35-Math.max(0,stride),rightY+12,16,6);
   rect(g,c.trim,19+Math.min(0,stride),leftY+13,6,1);
   rect(g,c.trim,38-Math.max(0,stride),rightY+13,6,1);
   // Torso: volumes em 6 planos, ombros, faixa e fivela.
   block(g,c.edge,c.coat,c.light,18,34+by,28,27);
   rect(g,c.dark,20,39+by,24,4);
   rect(g,c.light,20,42+by,5,13);
   rect(g,c.dark,40,43+by,4,17);
   rect(g,c.trim,21,54+by,23,4);
   rect(g,c.edge,23,57+by,20,3);
   rect(g,c.metal,29,54+by,8,5);
   rect(g,c.trim,31,55+by,4,2);
   // Cabeça com contorno e iluminação ao alto-esquerda.
   if(!back){
    block(g,c.edge,c.skin,'#ffe0b6',22,14+by,22,22);
    rect(g,'#b77960',38,24+by,5,8);
    rect(g,'#ffdcb2',26,19+by,9,3);
    if(front){
     rect(g,'#302732',27,27+by,2,3);
     rect(g,'#302732',38,27+by,2,3);
     rect(g,'#fff7db',27,27+by,1,1);
     rect(g,'#fff7db',38,27+by,1,1);
     rect(g,'#b87967',32,30+by,3,2);
     rect(g,'#7b5149',31,33+by,5,1);
    }else{
     rect(g,'#322b32',39,26+by,3,3);
     rect(g,'#fff0d6',40,26+by,1,1);
     rect(g,'#b7805d',42,30+by,3,2);
    }
   }
   // Cabelo humano em tufos, exceto capuzes e capacetes.
   if(!['guardiao','guarda','arqueiro','curandeiro','sacerdotisa','mercador','sabio'].includes(role)){
    rect(g,c.edge,20,12+by,27,9);
    rect(g,c.hair,22,9+by,24,11);
    rect(g,'#df9b59',24,10+by,11,3);
    rect(g,'#bf7b45',38,8+by,7,5);
    for(let i=0;i<4;i++){
     rect(g,c.edge,21+i*6,13+by+(i%2)*2,5,6);
     rect(g,i%2?'#d3925b':c.hair,23+i*6,13+by+(i%2)*2,3,3);
    }
   }
   // Braços e mãos continuam visíveis fora da silhueta.
   block(g,c.edge,c.coat,c.light,11+skew,37+by,9,18);
   block(g,c.edge,c.coat,c.light,45-skew,37+by,9,18);
   rect(g,c.skin,12+skew,54+by,7,7);
   rect(g,c.skin,47-skew,54+by,7,7);
   rect(g,'#fff2d9',13+skew,55+by,3,1);
   if(role==='peregrino'||role==='viajante'){
    // Lenço vermelho, alforje volumoso e espadas com metal facetado.
    rect(g,'#6f2534',19,34+by,25,8);
    rect(g,'#b7434a',21,34+by,22,5);
    rect(g,'#f18e65',23,35+by,13,2);
    rect(g,'#aa4249',17+skew,42+by,8,23);
    rect(g,'#f6ae8a',19+skew,45+by,2,15);
    block(g,'#3c292c','#80593e','#d4aa73',45,48+by,12,14);
    rect(g,c.trim,48,51+by,6,3);
    if(role==='peregrino'){
     line(g,'#263442',46,54+by,attack?17:14,1,-2,4);
     line(g,'#d5e6ef',47,52+by,attack?15:12,1,-2,3);
     line(g,'#ffffff',49,49+by,attack?12:8,1,-2,1);
     rect(g,'#e8bd73',43,56+by,12,3);
    }
   }
   if(role==='guardiao'||role==='guarda'){
    // Escudo azul com rebites e brasão dourado; elmo prata e capa.
    block(g,'#243548','#b1c8d9','#f2f7ef',20,11+by,25,12);
    rect(g,'#354d73',22,21+by,22,5);
    rect(g,'#e9ba72',31,8+by,6,15);
    rect(g,'#fff1bd',33,10+by,2,9);
    rect(g,'#2d529b',16,36+by,29,24);
    rect(g,'#f3d084',30,43+by,5,13);
    rect(g,'#f9ebaa',24,48+by,18,4);
    block(g,'#23344f','#2d65b4','#94bae3',1,38+by,17,26);
    rect(g,'#ffd078',3,40+by,14,2);
    rect(g,'#e4ba67',8,43+by,4,17);
    rect(g,'#ffe5a0',5,49+by,11,4);
    rect(g,'#33495d',4,62+by,11,2);
    line(g,'#d7e5ef',54,attack?34:38,attack?15:11,0,-2,3);
    rect(g,'#fae9c7',55,attack?30:34,1,14);
    rect(g,c.trim,51,55+by,10,3);
   }
   if(role==='arqueiro'||role==='mercador'){
    // Capuz verde e aljava; mercador possui lanterna e carga.
    block(g,'#263e2e','#4f8749','#a4cb7a',20,11+by,27,13);
    rect(g,'#2f6040',21,22+by,27,4);
    rect(g,'#245338',14+skew,41+by,7,24);
    rect(g,'#90be6c',15+skew,43+by,2,19);
    if(role==='arqueiro'){
     block(g,'#593c2c','#98673a','#d5a26b',44,23+by,12,25);
     for(let i=0;i<4;i++){
      rect(g,'#f4e3b5',47+i*2,17+by+(i%2),2,14);
      rect(g,i%2?'#a9d48b':'#d6bd91',46+i*2,14+by+(i%2),4,5);
     }
     // Arco de madeira angular, com corda fina tensionada.
     line(g,'#58372b',6,27+by,9,0,3,3);
     line(g,'#d9a05f',8,27+by,8,0,3,2);
     line(g,'#58372b',6,50+by,9,0,-2,3);
     line(g,'#d9a05f',8,49+by,8,0,-2,2);
     line(g,'#f9e8bc',9,28+by,39,0,1,1);
     if(attack){
      rect(g,'#f7e8b5',10,46+by,52,2);
      rect(g,'#edfff4',57,43+by,7,6);
      rect(g,'#a2f6d1',57,45+by,7,2);
      rect(g,'#eaffd9',53,40+by,3,3);
     }
    }else{
     block(g,'#51372b','#946a44','#f1c289',2,40+by,17,29);
     rect(g,'#f2deac',5,43+by,12,4);
     rect(g,'#f6cb7b',43,54+by,6,6);
     rect(g,'#85522e',56,34+by,3,29);
     block(g,'#64422a','#d9a05f','#ffe6ac',51,40+by,12,15);
     rect(g,'#fff7b9',54,43+by,6,5);
    }
   }
   if(role==='curandeiro'||role==='sacerdotisa'||role==='sabio'){
    // Túnica longa, bordados sagrados e cajado cristalino.
    const sage=role==='sabio';
    const robe=sage?'#705594':'#fff8ea';
    rect(g,c.edge,14,34+by,37,37);
    rect(g,robe,16,36+by,33,34);
    rect(g,sage?'#a28abd':'#f2d9d3',18,37+by,7,31);
    rect(g,c.dark,20,40+by,4,29);
    rect(g,c.dark,43,40+by,4,29);
    rect(g,c.trim,30,43+by,5,17);
    rect(g,sage?'#f2e4d6':'#d45c75',18,68+by,30,3);
    rect(g,'#fff7e0',23,69+by,18,1);
    if(!sage){
     block(g,c.edge,c.coat,'#fffaf1',19,10+by,28,15);
     rect(g,c.dark,20,23+by,27,3);
     rect(g,'#fff9e7',22,12+by,18,3);
    }else{
     rect(g,'#f2efe7',22,11+by,23,9);
     rect(g,'#fff9dc',23,12+by,14,3);
     rect(g,'#f5e4d7',27,32+by,12,13);
     rect(g,'#c5c3bd',32,42+by,5,7);
    }
    rect(g,'#694935',56,14+by,4,59);
    rect(g,'#d9ab70',57,16+by,2,55);
    jewel(g,56,8+by,sage?'#8469d6':'#63bfea',sage?'#cbb9ff':'#bbffff');
    rect(g,'#f6d38b',54,21+by,7,3);
    if(attack){
     const center=55+Math.min(7,frame*2);
     jewel(g,center,7+by,'#76cef2','#ffffff');
     for(let i=0;i<6;i++){
      const xx=34+i*6,yy=5+((i+frame)%4)*6;
      rect(g,i%2?'#bff6ff':'#80c7ee',xx,yy,3,3);
      rect(g,'#fffde6',xx+1,yy+1,1,1);
     }
    }
   }
   if(role==='ferreiro'){
    rect(g,'#3b2d30',19,36+by,30,31);
    rect(g,'#9a6551',21,38+by,25,27);
    rect(g,'#eab988',25,42+by,9,2);
    rect(g,'#dcb17c',31,56+by,5,6);
    rect(g,'#553a31',56,38+by,4,26);
    block(g,'#34414c','#9eacb7','#dbe4e3',48,25+by,14,10);
    rect(g,'#e2cab3',50,27+by,6,2);
   }
   if(back){
    // Bordados nas costas continuam distinguindo profissões.
    if(role==='guardiao'||role==='guarda'){
     rect(g,'#e3ba70',29,45+by,7,14);
     rect(g,'#ffeb9c',25,50+by,16,4);
    }else if(role==='curandeiro'||role==='sacerdotisa'||role==='sabio'){
     rect(g,'#e7c981',29,42+by,5,20);
     rect(g,'#fff6ce',26,48+by,11,3);
    }else if(role==='arqueiro'){
     rect(g,'#6d5035',43,30+by,12,21);
     rect(g,'#ffedbc',47,23+by,2,19);
    }else{
     block(g,c.edge,'#80583d','#cca177',24,38+by,15,20);
    }
   }
   // Micro agrupamentos de cor dão aparência de arte 16-bit, sem ruído.
   for(let i=0;i<8;i++){
    const xx=22+((i*7+role.length*3)%23),yy=39+((i*11)%17);
    rect(g,i%3?c.dark:c.trim,xx,yy,2,1);
   }
   if(hurt){rect(g,'#fff0d1',16,29,37,3);rect(g,'#f59d88',14,45,6,8)}
   if(action==='death')g.restore();
   if(dir===3)g.restore();
  }
  function get(kind,role,dir,action,frame){
   if(!enabled||!documentRef?.createElement)return null;
   role=roleName(role);dir=Number.isInteger(dir)?Math.max(0,Math.min(3,dir)):2;
   action=animated[action]?action:'idle';
   frame=((Math.floor(frame||0)%animated[action])+animated[action])%animated[action];
   const key=[kind,role,dir,action,frame].join(':');
   if(cache.has(key)){
    const sheet=cache.get(key);cache.delete(key);cache.set(key,sheet);return sheet;
   }
   const canvas=documentRef.createElement('canvas');canvas.width=W;canvas.height=H;
   const g=canvas.getContext('2d');if(!g)return null;
   g.imageSmoothingEnabled=false;
   character(g,role,dir,action,frame);
   cache.set(key,canvas);generated++;
   if(cache.size>Math.max(100,limit))cache.delete(cache.keys().next().value);
   return canvas;
  }
  function pose(now,{moving=false,attacking=false,hurt=false,dead=false,elapsed=0,seed=0}={}){
   const action=dead?'death':hurt?'hurt':attacking?'attack':moving?'walk':'idle';
   const rate=action==='walk'?115:action==='idle'?330:action==='attack'?85:110;
   const frame=(action==='attack'||action==='hurt'||action==='death')?
    Math.min(animated[action]-1,Math.floor(Math.max(0,elapsed)/rate)):
    Math.floor((now+seed)/rate)%animated[action];
   return {action,frame};
  }
  function drawHero(g,p,now,state={}){
   if(!enabled||!g?.drawImage)return false;
   const phase=pose(now,state),dir=Number.isInteger(p.dir)?p.dir:2;
   const sheet=get('hero',p.role,dir,phase.action,phase.frame);
   if(!sheet)return false;
   g.imageSmoothingEnabled=false;
   g.drawImage(sheet,Math.round(p.x-37),Math.round(p.y-94),74,94);
   return true;
  }
  function drawNpc(g,n,now){
   if(!enabled||!g?.drawImage)return false;
   const role=npcRole(n);if(!role)return false;
   const seed=String(n?.id||n?.name||'').length*173;
   const phase=pose(now,{moving:n.moving===true,seed});
   const sheet=get('npc',role,Number.isInteger(n.dir)?n.dir:2,phase.action,phase.frame);
   if(!sheet)return false;
   g.imageSmoothingEnabled=false;
   g.drawImage(sheet,Math.round(n.x-36),Math.round(n.y-90),72,90);
   return true;
  }
  return Object.freeze({drawHero,drawNpc,get,pose,normalizeRole:roleName,
   npcRole,get enabled(){return enabled},get stats(){return{generated,cached:cache.size}},clear(){cache.clear()}});
 }
 return Object.freeze({create,ROLES,W,H,normalizeRole:roleName,npcRole,animated});
});
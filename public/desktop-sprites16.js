'use strict';
/*
 * Os Peregrinos — sprites desenhados em atlas para a edição desktop.
 * Os frames são RECORTES da arte original classic-atlas.png, não novos
 * bonecos de retângulos. A arte procedural permanece como fallback.
 * Deliberadamente não muda a apresentação para telas touch/mobile.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosDesktopSprites16=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const HERO=Object.freeze({
  peregrino:{idle:[0,195],attack:[163,195],accent:'#d76a5d'},
  guardiao:{idle:[0,0],attack:[163,0],accent:'#e9bb68'},
  arqueiro:{idle:[0,390],attack:[0,390],accent:'#9cd887'},
  curandeiro:{idle:[652,0],attack:[652,0],accent:'#aeeaff'}
 });
 const OTHER=Object.freeze({
  mercador:[0,390],ferreiro:[815,195],guarda:[489,195],
  viajante:[0,195],sacerdotisa:[326,195],sabio:[652,0],
  biblioteca:[652,0],padeira:[815,0],barqueiro:[815,0],
  sentinela:[489,195],crianca:[815,0],historiadora:[326,195],
  artesao:[815,195],curandeira:[326,195],mensageiro:[0,390],
  peregrino:[0,195],guardiao:[0,0]
 });
 const FAMILIES=Object.freeze([
  [815,0],[815,195],[326,195],[489,195],[652,0],[0,390],
  [489,0],[326,0],[163,195],[0,195]
 ]);
 const ROLE_ALIASES={pilgrim:'peregrino',guardian:'guardiao',healer:'curandeiro',archer:'arqueiro'};
 const roles=Object.keys(HERO);
 const normalizeRole=r=>{
  const key=String(r||'peregrino').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return HERO[key]?key:ROLE_ALIASES[key]||'peregrino';
 };
 const desktop=host=>{
  // Somente mouse/trackpad e viewport desktop; nenhuma alteração no Android.
  try{return !!host?.matchMedia?.('(min-width: 901px) and (hover: hover) and (pointer: fine)')?.matches}
  catch{return false}
 };
 const hash=str=>{
  let h=2166136261;
  for(const c of String(str||''))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
  return h;
 };
 const npcSheet=n=>{
  const label=(String(n?.name||'')+' '+String(n?.title||'')).normalize('NFD')
   .replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const aliases=[['ferreir','ferreiro'],['mercad','mercador'],['sacerdot','sacerdotisa'],
   ['sabio','sabio'],['guarda','guarda'],['vigia','guarda'],['sentinela','sentinela'],
   ['viajante','viajante'],['curandeir','curandeira'],['bibliotec','biblioteca'],
   ['mensageir','mensageiro'],['padeir','padeira'],['barqueir','barqueiro'],
   ['historiad','historiadora'],['crianca','crianca']];
  for(const [word,style] of aliases)if(label.includes(word))return OTHER[style];
  return FAMILIES[hash(n?.id||n?.name)%FAMILIES.length];
 };
 function create({windowRef=typeof window!=='undefined'?window:null,imageCtor=typeof Image!=='undefined'?Image:null}={}){
  const available=desktop(windowRef);
  let img=null,ready=false,failed=false;
  if(available&&imageCtor){
   img=new imageCtor();img.decoding='async';
   img.addEventListener?.('load',()=>{ready=true});
   img.addEventListener?.('error',()=>{failed=true;ready=false});
   img.src='/assets/classic-atlas.png?v=desktop-sprites-v1';
   if(img.complete&&img.naturalWidth>=1024)ready=true;
  }
  const pix=(g,c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h)};
  function frame(g,coords,dir,step,x,y,w,h){
   if(!ready||failed||!g?.drawImage)return false;
   const row=Math.max(0,Math.min(3,Number.isInteger(dir)?dir:2));
   const col=Math.max(0,Math.min(3,step|0));
   g.imageSmoothingEnabled=false;
   g.drawImage(img,coords[0]+col*40,coords[1]+row*48,40,48,
    Math.round(x-w/2),Math.round(y-h),w,h);
   return true;
  }
  const pose=(now,{moving=false,attacking=false,hurt=false,elapsed=0,seed=0}={})=>{
   const action=hurt?'hurt':attacking?'attack':moving?'walk':'idle';
   const step=action==='walk'?(Math.floor((now+seed)/125)%4):
    action==='attack'?(Math.min(3,Math.floor(elapsed/88))):
    action==='hurt'?(Math.floor(elapsed/100)%2):0;
   return {action,step};
  };
  function drawHero(g,character,now,state={}){
   if(!ready)return false;
   const role=normalizeRole(character?.role);
   const cfg=HERO[role],direction=character?.dir|0,anim=pose(now,state);
   const x=Number(character.x)||0,y=Number(character.y)||0;
   const w=66,h=80;
   if(!frame(g,anim.action==='attack'?cfg.attack:cfg.idle,
    direction,anim.step,x,y,w,h))return false;
   // Equipamento/acabamento ANEXO à arte, sem pintar sobre o rosto.
   // Ataque mantém o quadro do atlas, com leitura imediata da classe.
   if(anim.action==='attack'){
    const f=anim.step;
    const swing=[0,-3,-5,-1][f],spark=cfg.accent;
    if(role==='curandeiro'){
     pix(g,'#836344',x+23,y-68+swing,3,51);
     pix(g,'#4a86ae',x+18,y-80+swing,13,14);
     pix(g,'#a5f5ff',x+21,y-78+swing,7,8);
     pix(g,'#fff6ca',x+24,y-76+swing,3,3);
     pix(g,spark,x+31,y-66+swing,3,3);
    }else if(role==='arqueiro'){
     pix(g,'#6a482c',x+25,y-64,3,49);
     pix(g,'#e2b267',x+28,y-59,2,37);
     pix(g,'#fff0c9',x+29,y-47,1,20);
     pix(g,'#d1eedb',x+11,y-42,34,2);
     pix(g,spark,x+40,y-44,6,6);
    }else{
     pix(g,spark,x+25,y-59+swing,4,17);
     pix(g,'#ecf5e8',x+27,y-78+swing,4,20);
     pix(g,'#ffffff',x+27,y-78+swing,2,8);
    }
   }
   if(state.hurt)pix(g,'#fff2ce',x-23,y-52,45,2);
   return true;
  }
  function drawNpc(g,n,now){
   if(!ready)return false;
   const x=Number(n?.x)||0,y=Number(n?.y)||0;
   const dir=Number.isInteger(n?.dir)?n.dir:2;
   const key=npcSheet(n);
   const anim=pose(now,{moving:n.moving===true,seed:hash(n.id||n.name)%2100});
   return frame(g,key,dir,anim.step,x,y,59,75);
  }
  function drawMonster(g,m,now,state={}){
   if(!ready||!m?.boss)return false;
   // Somente chefes humanoides possuem atualmente sprites animados no
   // atlas clássico. Os demais mantêm a arte exclusiva do SpriteStudio.
   const t=String(state.type||m.type||'').toLowerCase();
   const key=t==='chefe'?[326,0]:t==='sentinela'?[489,195]:
    t==='cavaleiro'?[0,0]:null;
   if(!key)return false;
   const anim=pose(now,state);
   return frame(g,key,m.dir|0,anim.step,Number(m.x)||0,Number(m.y)||0,95,112);
  }
  return Object.freeze({drawHero,drawNpc,drawMonster,normalizeRole,
   get ready(){return ready},get enabled(){return available},npcSheet});
 }
 return Object.freeze({create,desktop,normalizeRole,npcSheet,HERO,OTHER});
});

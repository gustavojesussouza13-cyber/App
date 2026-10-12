'use strict';
/*
 * Os Peregrinos: bestiário ilustrado 16-bit no PC.
 * Reutiliza a arte PNG do atlas da campanha, desenha em pixels nítidos
 * e acrescenta expressões de ataque por espécie, sem alterar combate.
 * No mobile, permanece o SpriteStudio original.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosDesktopBestiary16=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const ART=Object.freeze({
  aranha:[810,585],dragao:[843,585],escorpiao:[876,585],
  esqueleto:[909,585],fantasma:[942,585],fera:[975,585],
  golem:[0,710],limo:[33,710],lobo:[66,710],
  morcego:[99,710],serpente:[132,710],vespa:[165,710],
  cavaleiro:[0,0],sentinela:[489,195],chefe:[326,0]
 });
 const PALETTE=Object.freeze({
  aranha:['#f16b70','#70202b','#ffb77e'],
  dragao:['#ffb15c','#b73733','#ffef9d'],
  escorpiao:['#f6cc89','#a97454','#fff1bb'],
  esqueleto:['#e9d6b1','#8676a1','#f6ffff'],
  fantasma:['#c5adff','#584ba3','#effaff'],
  fera:['#e2a98a','#644567','#ffe3c5'],
  golem:['#80c9e3','#385c80','#e3ffff'],
  limo:['#8ded9c','#368a64','#f1ffc6'],
  lobo:['#b29fe5','#57456d','#f3d6ff'],
  morcego:['#ba83de','#5e377f','#efd1ff'],
  serpente:['#b9dc82','#497e59','#f5ffb4'],
  vespa:['#ffdb7c','#866043','#fff9c9'],
  cavaleiro:['#c0d8e8','#456b9c','#f2d38b'],
  sentinela:['#8fe6f2','#426f9d','#fff7c8'],
  chefe:['#e1baff','#6147a8','#ffeec8']
 });
 const SIZES=Object.freeze({
  limo:[64,56],lobo:[79,66],morcego:[84,62],esqueleto:[62,75],
  aranha:[80,67],golem:[77,75],fantasma:[71,77],
  dragao:[96,83],escorpiao:[78,64],serpente:[76,68],
  fera:[80,70],vespa:[75,63],
  cavaleiro:[78,86],sentinela:[82,91],chefe:[89,98]
 });
 function isDesktop(host){
  try{return Boolean(host?.matchMedia?.('(min-width: 901px) and (hover: hover) and (pointer: fine)')?.matches)}
  catch{return false}
 }
 function create({windowRef=typeof window!=='undefined'?window:null,
                  imageCtor=typeof Image!=='undefined'?Image:null}={}){
  const enabled=isDesktop(windowRef);
  let ready=false,failed=false,atlas=null;
  if(enabled&&imageCtor){
   atlas=new imageCtor();atlas.decoding='async';
   atlas.addEventListener?.('load',()=>{ready=true;failed=false});
   atlas.addEventListener?.('error',()=>{ready=false;failed=true});
   atlas.src='/assets/classic-atlas.png?v=desktop-bestiary-v2';
   if(atlas.complete&&atlas.naturalWidth>=1024)ready=true;
  }
  function pix(g,color,x,y,w,h){
   if(w<=0||h<=0)return;
   g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }
  // Partículas fixadas a posições de pixels inteiros. Sem blur nem gradientes.
  function motes(g,x,y,color,phase,count=6){
   for(let i=0;i<count;i++){
    const v=(i*11+phase*3)%25;
    const px=x+(i%2?1:-1)*(10+v);
    const py=y-20-((i*17+phase*7)%39);
    pix(g,color,px,py,i%3===0?3:2,i%2===0?3:2);
   }
  }
  function impact(g,type,x,y,phase,colors){
   const a=colors[0],light=colors[2];
   if(type==='limo'||type==='serpente'||type==='aranha'||type==='escorpiao'){
    for(let i=0;i<5;i++){
     const xx=x+20+i*7,yy=y-33+(i%2?6:-4)-phase;
     pix(g,i%2?light:a,xx,yy,5,4);
     pix(g,colors[1],xx+2,yy+3,3,2);
    }
    if(type==='aranha'){
     pix(g,'#e9d9ee',x+42,y-33,2,27);
     pix(g,'#e9d9ee',x+27,y-22,34,2);
     for(let i=0;i<4;i++)pix(g,'#e9d9ee',x+30+i*7,y-30+i*6,2,3);
    }
   }else if(type==='dragao'||type==='vespa'||type==='morcego'){
    for(let i=0;i<6;i++){
     const xx=x+24+i*8,yy=y-48+(i%2?8:0)+phase;
     pix(g,i%2?light:a,xx,yy,9-i%3*2,5+i%3*2);
    }
    if(type==='dragao'){
     pix(g,'#ffefaa',x+55,y-39,17,6);
     pix(g,'#ec703f',x+37,y-43,22,13);
    }
   }else if(type==='fantasma'){
    for(let i=0;i<4;i++){
     pix(g,'#bba0ff',x+15+i*11,y-50+i%2*9,3,20);
     pix(g,'#eefbff',x+16+i*11,y-51+i%2*9,2,6);
    }
   }else if(type==='golem'){
    for(let i=0;i<4;i++){
     pix(g,'#85e4ed',x+14+i*13,y-16-i%2*16,11,4);
     pix(g,'#e9fbf1',x+17+i*13,y-17-i%2*16,5,2);
    }
   }else{
    // Corte de aço/besta: pixels da lâmina se deslocam com a antecipação.
    for(let i=0;i<6;i++){
     pix(g,i%2?light:a,x+18+i*7,y-54+i*5-phase*2,8,3);
     pix(g,'#ffffff',x+21+i*7,y-55+i*5-phase*2,3,1);
    }
   }
  }
  function drawMonster(g,monster,now,state={}){
   if(!ready||failed||!g?.drawImage||!monster)return false;
   const type=String(state.type||monster.type||'limo').toLowerCase();
   const cell=ART[type];
   if(!cell)return false;
   const boss=Boolean(monster.boss);
   const species=Number.isInteger(monster.species)?monster.species:0;
   const phase=Math.floor((now+(species%13)*31)/135);
   const walking=Boolean(state.moving),attack=Boolean(state.attacking);
   const hurt=Boolean(state.hurt),dead=Boolean(state.dead);
   const x=Math.round(monster.x),baseY=Math.round(monster.y);
   const pulse=walking?[0,2,1,-1][phase%4]:[0,0,1,0][phase%4];
   const hit=attack?[0,-4,-6,-2][Math.min(3,Math.floor((state.elapsed||0)/95))]:0;
   const specS=SIZES[type]||[72,70];
   const width=Math.round(specS[0]*(boss?1.45:1));
   const height=Math.round(specS[1]*(boss?1.45:1));
   const bottom=baseY+Math.max(-3,Math.min(3,pulse));
   const top=bottom-height+hit;
   const colors=PALETTE[type];
   g.save();
   g.imageSmoothingEnabled=false;
   if(dead){
    const fade=Math.max(0.22,1-(state.elapsed||0)/660);
    g.globalAlpha=fade;
   }
   // Aura pixellizada por família. Coroa especial só no chefe, não
   // transforma lobos, aranhas e dragões em inimigos humanoides.
   if(boss){
    motes(g,x,top+8,colors[0],phase,9);
    const offset=phase%3;
    for(let i=0;i<6;i++){
     pix(g,colors[1],x-25+i*10,top-6-(i%2)*5+offset,7,5);
     pix(g,colors[2],x-23+i*10,top-9-(i%2)*5+offset,3,5);
    }
   }
   // Direção real de deslocamento é espelhada sem blur; não altera o
   // sentido do movimento nem as coordenadas autoritativas do servidor.
   const dir=Number.isInteger(monster.dir)?monster.dir:2;
   if(dir===3){
    g.translate(x*2,0);g.scale(-1,1);
   }
   // Textura ilustrada existente da campanha, não personagem genérico.
   if(cell[1]===585||cell[1]===710){
    g.drawImage(atlas,cell[0],cell[1],30,30,
     Math.round(x-width/2),Math.round(top),width,height);
   }else{
    // Cavaleiros e chefes originais são quadros 40×48 dentro do atlas.
    const column=walking?phase%4:attack?Math.min(3,phase%4):0;
    g.drawImage(atlas,cell[0]+column*40,cell[1]+2*48,40,48,
     Math.round(x-width/2),Math.round(top),width,height);
   }
   if(dir===3){g.restore();g.save();g.imageSmoothingEnabled=false}
   if(hurt){
    pix(g,'#fff1d2',x-width/3,top+10,Math.round(width*.66),3);
    pix(g,'#ff9989',x-width/4,top+18,Math.round(width*.5),3);
   }
   if(attack)impact(g,type,x,top+height,Math.min(3,phase%4),colors);
   if(!boss&&['fantasma','limo','morcego','vespa'].includes(type))
    motes(g,x,top+height*.65,colors[0],phase,3);
   g.restore();
   return true;
  }
  return Object.freeze({drawMonster,get enabled(){return enabled},get ready(){return ready},
   types:Object.keys(ART),source:ART});
 }
 return Object.freeze({create,isDesktop,ART,PALETTE,SIZES});
});

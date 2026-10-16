'use strict';
/**
 * Os Peregrinos · Aurora — efeitos de combate e movimento para Canvas 2D
 * sobre mundo ortográfico WebGL 2.5D.
 *
 * Apenas VISUAL: não calcula dano, vida, acertos, recarga ou hitboxes.
 * Somente anima ações recebidas do servidor / controles já existentes.
 * Desenha clusters de pixels inteiros (sem sprites externos ou Runway).
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosAuroraCombat25D=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const DURATION=420;
 const ROLES=Object.freeze({
  peregrino:['#edcf89','#fff0b9','#77d4d0'],
  guardiao:['#86b7e2','#dceafb','#edc87d'],
  arqueiro:['#87c78d','#d7f1b1','#d8a76a'],
  curandeiro:['#77e6e5','#e8fdf3','#f4d494']
 });
 const CREATURES=Object.freeze({
  limo:['#6ddb98','#c0f6a0'],
  lobo:['#b4aac8','#f1daa6'],
  aranha:['#d0879b','#f6b2b8'],
  esqueleto:['#ddd0b1','#fff4dc'],
  golem:['#8cc1cd','#aaf8f0'],
  dragao:['#f3a075','#fff1bb']
 });
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const valid=(...v)=>v.every(Number.isFinite);
 function pixel(g,c,x,y,w=3,h=3){
  if(!valid(x,y,w,h)||w<=0||h<=0)return;
  g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
 }
 function segment(g,c,x0,y0,x1,y1,size=3){
  x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
  let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy;
  for(let i=0;i<100;i++){
   pixel(g,c,x0,y0,size,size);
   if(x0===x1&&y0===y1)break;
   const e=2*err;if(e>-dy){err-=dy;x0+=sx}if(e<dx){err+=dx;y0+=sy}
  }
 }
 function direction(dir){
  return [ {x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0} ][Number.isInteger(dir)?((dir%4)+4)%4:2];
 }
 function drawSteps(g,{x,y,role='peregrino',now=0,dir=2,moving=false}={}){
  if(!g?.fillRect||!valid(x,y,now)||!moving||!ROLES[role])return false;
  // Três quadros transitórios entre as poses do atlas; sempre no chão.
  const phase=Math.floor(now/92)%6;
  if(phase%3!==0)return false;
  const d=direction(dir),side={x:-d.y,y:d.x},shift=phase===0?-10:10;
  const cx=x-d.x*11+side.x*shift,cy=y-d.y*9+side.y*shift;
  g.save();g.globalAlpha=.62;
  const tint=role==='curandeiro'?'#b8f0e4':'#b4aa8b';
  pixel(g,tint,cx-3,cy-1,5,2);pixel(g,tint,cx-7,cy-5,3,2);
  pixel(g,tint,cx+4,cy-3,2,2);
  g.restore();return true;
 }
 function drawHero(g,{role='peregrino',x=0,y=0,dir=2,now=0,attackAt=null,hurtAt=null,
   skill=false,selected=false}={}){
  if(!g?.fillRect||!ROLES[role]||!valid(x,y,now))return false;
  const [main,light,accent]=ROLES[role],d=direction(dir);
  const at=Number.isFinite(attackAt)?attackAt:null;
  const hurt=Number.isFinite(hurtAt)?hurtAt:null;
  const elapsed=at===null?Infinity:now-at;
  const hitAge=hurt===null?Infinity:now-hurt;
  if((elapsed<0||elapsed>DURATION)&&(hitAge<0||hitAge>290))return false;
  g.save();
  if(hitAge>=0&&hitAge<290){
   g.globalAlpha=1-hitAge/340;
   for(let i=0;i<6;i++){
    const angle=i*Math.PI/3+(now%450)*.001;
    const r=13+hitAge*.07;
    pixel(g,'#fff0da',x+Math.cos(angle)*r,y-39+Math.sin(angle)*r,4,3);
   }
  }
  if(elapsed>=0&&elapsed<=DURATION){
   const t=clamp(elapsed/DURATION,0,1),alpha=1-t;
   g.globalAlpha=alpha;
   const side={x:-d.y,y:d.x};
   const cx=x+d.x*28,cy=y-38+d.y*18;
   if(role==='guardiao'){
    // Escudo impacta o chão; duas ondas hexagonais em pixel clusters.
    for(let i=0;i<7;i++){
     const a=i*Math.PI/3;
     const r=11+23*t;
     pixel(g,i%2?light:main,cx+Math.cos(a)*r,cy+Math.sin(a)*r,5,5);
    }
    segment(g,accent,cx-side.x*9,cy-side.y*9,cx+side.x*9,cy+side.y*9,3);
    pixel(g,light,cx-4,cy-4,8,8);
   }else if(role==='arqueiro'){
    // Projeção de corda/flecha é visual; o projétil REAL permanece no servidor.
    for(let i=0;i<5;i++){
     const distance=12+i*9+t*17;
     pixel(g,i%2?light:main,cx+d.x*distance+side.x*(i%3-1)*2,
       cy+d.y*distance+side.y*(i%3-1)*2,6-i*.6,3);
    }
    segment(g,accent,cx-side.x*8,cy-side.y*8,cx+side.x*8,cy+side.y*8,2);
   }else if(role==='curandeiro'){
    const r=15+15*t;
    for(let i=0;i<8;i++){
     const a=i*Math.PI/4+now*.001;
     const px=x+Math.cos(a)*r,py=y-45+Math.sin(a)*r;
     pixel(g,i%2?light:main,px,py,4,4);
    }
    pixel(g,accent,x-3,y-48,8,6);
    pixel(g,light,x,y-57,2,24);
    pixel(g,light,x-10,y-47,22,2);
   }else{
    const r=16+12*t;
    for(let i=0;i<10;i++){
     const a=-1.9+(i/9)*2.7+(dir-2)*Math.PI/2;
     const px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r;
     pixel(g,i%2?main:light,px,py,4,3);
    }
    pixel(g,accent,cx+side.x*5,cy+side.y*5,4,4);
   }
   if(skill){
    const r=23+27*t;
    for(let i=0;i<8;i++){
     const a=i*Math.PI/4;
     pixel(g,i%2?light:accent,x+Math.cos(a)*r,y-34+Math.sin(a)*r,4,4);
    }
   }
  }
  g.restore();return true;
 }
 function drawCreature(g,{type='limo',x=0,y=0,now=0,action='idle',at=null,boss=false}={}){
  if(!g?.fillRect||!valid(x,y,now)||!CREATURES[type]||!Number.isFinite(at))return false;
  const elapsed=now-at;
  const duration=action==='attack'?510:action==='hurt'?310:0;
  if(!duration||elapsed<0||elapsed>=duration)return false;
  const t=elapsed/duration,[main,highlight]=CREATURES[type];
  const radius=(boss?35:19)+t*23;
  g.save();g.globalAlpha=(1-t)*.88;
  if(action==='attack'){
   // Telégrafo desenhado sobre a silhueta, sem alterar IA/alcance real.
   for(let i=0;i<8;i++){
    const a=i*Math.PI/4+((type==='aranha'||type==='dragao')?0.3:0);
    pixel(g,i%2?main:highlight,x+Math.cos(a)*radius,
      y-27+Math.sin(a)*radius*.65,4,4);
   }
   pixel(g,highlight,x-3,y-30,6,6);
  }else{
   for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5;
    pixel(g,i%2?main:'#fff4d9',x+Math.cos(a)*radius,
      y-34+Math.sin(a)*radius*.6,4,4);
   }
  }
  g.restore();return true;
 }
 return Object.freeze({VERSION:'aurora-combat25d-v1',ROLES:ROLES,
  CREATURES:Object.keys(CREATURES),DURATION,drawSteps,drawHero,drawCreature});
});
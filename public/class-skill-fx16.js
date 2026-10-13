'use strict';
/*
 * Os Peregrinos — efeitos de habilidades 16-bit no mundo aberto (desktop).
 * Pixéis inteiros, sem filtros, gradientes ou blur. Só são criados em
 * resposta a eventos CONFIRMADOS pelo servidor; nunca calculam vida/dano.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosClassSkillFx16=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const KINDS=Object.freeze({
  'guardian-shield':4500,'archer-mark':5500,
  'pilgrim-renewal':950,'healer-recovery':1050
 });
 function desktop(w){
  try{return Boolean(w?.matchMedia?.('(min-width: 901px) and (hover: hover) and (pointer: fine)')?.matches)}
  catch{return false}
 }
 const pixel=(g,color,x,y,w=2,h=2)=>{
  if(!Number.isFinite(x)||!Number.isFinite(y)||w<=0||h<=0)return;
  g.fillStyle=color;
  g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
 };
 const line=(g,color,ax,ay,bx,by,thick=2)=>{
  let x=Math.round(ax),y=Math.round(ay);
  const tx=Math.round(bx),ty=Math.round(by);
  const dx=Math.abs(tx-x),dy=Math.abs(ty-y),sx=x<tx?1:-1,sy=y<ty?1:-1;
  let err=dx-dy,steps=0;
  for(;;){
   pixel(g,color,x,y,thick,thick);
   if(x===tx&&y===ty)break;
   if(++steps>160)break;
   const e2=err*2;
   if(e2>-dy){err-=dy;x+=sx}
   if(e2<dx){err+=dx;y+=sy}
  }
 };
 const diamond=(g,color,x,y,w,h=0,thick=2)=>{
  if(!h)h=w;
  line(g,color,x,y-h,x+w,y,thick);
  line(g,color,x+w,y,x,y+h,thick);
  line(g,color,x,y+h,x-w,y,thick);
  line(g,color,x-w,y,x,y-h,thick);
 };
 const spark=(g,x,y,color,core)=>{
  pixel(g,color,x-5,y,11,2);pixel(g,color,x,y-5,2,11);
  pixel(g,core,x,y,2,2);
 };
 const palettes=Object.freeze({
  'guardian-shield':['#4c80c6','#a9ddf8','#ffe69c'],
  'archer-mark':['#277e51','#8ae3aa','#eeffc8'],
  'pilgrim-renewal':['#b94c5a','#f9ad79','#fff0b8'],
  'healer-recovery':['#47a9c9','#9df6df','#f9ffd5']
 });
 function create({windowRef=typeof window!=='undefined'?window:null,limit=48}={}){
  const enabled=desktop(windowRef),queue=[],max=Math.max(8,Math.min(96,limit|0));
  function clear(){queue.length=0}
  function trigger(msg,now){
   if(!enabled||!msg||!Number.isFinite(now)||!Object.hasOwn(KINDS,msg.kind)||
      !Number.isFinite(msg.x)||!Number.isFinite(msg.y))return false;
   const duration=Math.max(120,Math.min(KINDS[msg.kind],Number(msg.duration)||KINDS[msg.kind]));
   if(queue.length>=max)queue.shift();
   queue.push({kind:msg.kind,zone:msg.zone,x:msg.x,y:msg.y,
    targetId:msg.targetId,monsterId:msg.monsterId,start:now,duration});
   return true;
  }
  function frame(now,{zone,players=new Map(),monsters=new Map(),self=null}={}){
   if(!enabled||!Number.isFinite(now))return [];
   const output=[];
   for(let i=queue.length-1;i>=0;i--){
    const e=queue[i],elapsed=Math.max(0,now-e.start);
    if(elapsed>e.duration||e.zone!==zone){queue.splice(i,1);continue}
    let x=e.x,y=e.y;
    if(e.monsterId!=null){
     const monster=monsters.get?.(e.monsterId);
     if(monster?.hp>0&&Number.isFinite(monster.x)&&Number.isFinite(monster.y)){
      x=monster.x;y=monster.y
     }else if(monster?.hp<=0){queue.splice(i,1);continue}
    }
    if(e.targetId!=null){
     const character=e.targetId===self?.id?self:players.get?.(e.targetId);
     if(character&&Number.isFinite(character.x)&&Number.isFinite(character.y)){
      x=character.x;y=character.y
     }
    }
    output.push({kind:e.kind,x:Math.round(x),y:Math.round(y),
     progress:elapsed/e.duration,elapsed,duration:e.duration});
   }
   return output;
  }
  function paint(g,events){
   if(!enabled||!g?.fillRect||!Array.isArray(events))return;
   for(const e of events){
    const c=palettes[e.kind];if(!c)continue;
    const x=e.x,y=e.y,t=e.elapsed,phase=Math.floor(t/135),pulse=phase%4;
    g.imageSmoothingEnabled=false;
    if(e.kind==='guardian-shield'){
     // Hexágono de proteção azul com brasão solar dourado, dura 4,5s.
     const cy=y-45,r=32+(phase%3);
     for(let i=0;i<6;i++){
      const a=Math.PI*(i/3)-Math.PI/2,b=Math.PI*((i+1)/3)-Math.PI/2;
      const ax=x+Math.round(Math.cos(a)*r),ay=cy+Math.round(Math.sin(a)*40);
      const bx=x+Math.round(Math.cos(b)*r),by=cy+Math.round(Math.sin(b)*40);
      line(g,c[0],ax+1,ay+2,bx+1,by+2,3);
      line(g,i%2?c[1]:c[2],ax,ay,bx,by,2);
     }
     diamond(g,c[2],x,cy,8,11,2);
     pixel(g,c[1],x-1,cy-7,3,13);
     pixel(g,c[2],x-7,cy-1,15,3);
     spark(g,x-31,cy-30-pulse,c[1],c[2]);
     spark(g,x+29,cy+27+pulse,c[0],c[2]);
    }else if(e.kind==='archer-mark'){
     // Mira esmeralda acompanha o inimigo marcado por 5,5s.
     const cy=y-43,r=22+pulse*2;
     for(const [dx,dy] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
      const ox=x+dx*r,oy=cy+dy*r;
      pixel(g,c[0],ox,oy,dx<0?12:2,2);
      pixel(g,c[1],ox,oy,2,dy<0?12:2);
     }
     diamond(g,c[1],x,cy,11,17,2);
     line(g,c[2],x-10,cy,x+10,cy,2);
     line(g,c[2],x,cy-15,x,cy+15,2);
     spark(g,x+30,cy-20+pulse,c[1],c[2]);
     pixel(g,c[0],x-2,cy-2,5,5);
    }else if(e.kind==='pilgrim-renewal'){
     // Cachecol vermelho, corte heroico dourado e fagulhas de recuperação.
     const cy=y-40,r=19+Math.round(e.progress*23);
     for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2+t/430;
      const px=x+Math.round(Math.cos(a)*r);
      const py=cy+Math.round(Math.sin(a)*Math.min(30,r));
      pixel(g,i%2?c[0]:c[1],px,py,5,3);
      if(i%2===0)pixel(g,c[2],px+1,py-3,2,4);
     }
     line(g,c[1],x-25+phase*2,cy+13,x+19+phase*2,cy-29,3);
     line(g,c[2],x-21+phase*2,cy+10,x+20+phase*2,cy-26,2);
     spark(g,x-23,cy-32-pulse,c[1],c[2]);
    }else if(e.kind==='healer-recovery'){
     // Luz sagrada: círculos de runas discretos e partículas azul-esmeralda.
     const cy=y-35,r=15+Math.round(e.progress*31);
     for(let i=0;i<12;i++){
      const a=(i/12)*Math.PI*2+phase*.11;
      const xx=x+Math.round(Math.cos(a)*r);
      const yy=cy+Math.round(Math.sin(a)*r*.65);
      pixel(g,i%3?c[1]:c[2],xx,yy,4,3);
      if(i%3===0)pixel(g,c[0],xx+1,yy-4,2,4);
     }
     diamond(g,c[0],x,cy,10,13,2);
     spark(g,x,cy-18-pulse*2,c[1],c[2]);
     spark(g,x-22,cy+7-pulse,c[0],c[2]);
     spark(g,x+23,cy+5+pulse,c[1],c[2]);
    }
   }
  }
  return Object.freeze({trigger,frame,paint,clear,get enabled(){return enabled},
   get count(){return queue.length}});
 }
 return Object.freeze({create,desktop,KINDS,palettes});
});
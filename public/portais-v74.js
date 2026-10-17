'use strict';
/**
 * OS PEREGRINOS • PORTAIS V7.4
 * New hand-coded high-detail pixel art in the newest 2.5D scene language.
 * All pixels are original, static arch and base + gently animated energy.
 * Server is the only source of portal coordinates, destination and permissions.
 * No decorative fake portals. No CSS scaling, filters, global composites,
 * collision, WebSocket, DB, NPC or guild fortress changes.
 */
(function(root){
 const VERSION='portais-v74-original-pixel-20261017';
 const W=112,H=140;
 const SHADES=Object.freeze({
  surface:['#0e404c','#247e83','#43bec0','#8ce9d0','#e3fcef','#b9f4e0'],
  frontier:['#134759','#2a86a9','#56c8df','#a3e8f2','#e8faff','#93e1f2'],
  dungeon:['#2d2049','#534283','#9171bf','#d2aff0','#f6dcff','#c79df4'],
  down:['#562b31','#a34c39','#d98750','#f9b96f','#ffe3b1','#f9a75b'],
  up:['#1f3e65','#4184af','#75c6e1','#b5edfa','#e6faff','#99daf7'],
  gateway:['#493a23','#947036','#cfab55','#f8d98b','#fff5d1','#fce19b']
 });
 const STONE=['#101c23','#2f3d42','#526166','#788581','#a8ada1','#d5ccad'];
 const GOLD=['#3f3327','#735533','#ae8244','#e7bc73','#ffe4aa'];
 const colorTypes=Object.freeze(Object.keys(SHADES));
 function classifyPortal(p){
  if(p?.gateway)return 'gateway';
  if(p?.stair==='down')return 'down';
  if(p?.stair==='up')return 'up';
  if(p?.dungeon)return 'dungeon';
  if(p?.frontier)return 'frontier';
  return 'surface';
 }
 function hash(x,y,z=0){let n=(Math.imul(x+61,1540483477)^Math.imul(y+89,1103515245)^Math.imul(z+17,2246822507))>>>0;n=Math.imul(n^(n>>>13),3266489909)>>>0;return (n^(n>>>16))>>>0}
 function paint(g,{kind='surface',frame=0}={}){
  kind=SHADES[kind]?kind:'surface';frame=((frame|0)%6+6)%6;
  const C=SHADES[kind],block=(color,x,y,w,h)=>{
   if(w<=0||h<=0)return;g.fillStyle=color;g.fillRect(x|0,y|0,w|0,h|0);
  };
  // NO anti-aliased paths: chunky silhouettes in aligned integer pixel blocks.
  const outerLeft=y=>y<11?46:y<15?39:y<21?32:y<28?26:y<39?20:y<53?16:14;
  const archLeft=y=>y<35?51:y<42?42:y<50?37:y<59?33:y<68?30:29;
  // Contact shadow and ground-connected plinth.
  for(let row=0;row<7;row++){
   const offset=row<3?7:row*3+3;
   block(row%2?'#172324':'#22322d',offset,132+row,112-2*offset,1);
  }
  block(STONE[0],10,125,92,7);
  block(STONE[1],13,124,86,6);block(STONE[3],17,124,78,2);
  block(STONE[0],17,130,78,5);block(STONE[2],20,129,72,3);
  block(STONE[3],26,126,60,2);block(STONE[4],33,131,46,1);
  // Raised masonry, two independent architectural pillars and arched head.
  for(let y=8;y<128;y+=3){
   const x=outerLeft(y);
   if(y<31){
    block(STONE[0],x,y,112-x*2,3);
    block(STONE[2],x+3,y,106-x*2,2);
    block(STONE[3],x+5,y,102-x*2,1);
   }else{
    const inner=Math.max(x+10,archLeft(y));
    const width=inner-x;
    block(STONE[0],x,y,width,3);block(STONE[0],112-inner,y,width,3);
    block(STONE[2],x+2,y,Math.max(2,width-3),2);
    block(STONE[2],inner+1,y,Math.max(2,width-3),2);
    block(STONE[4],x+3,y,2,1);block(STONE[4],112-x-6,y,2,1);
   }
  }
  // Arch is closed at the peak, open between the pillars below.
  for(let y=33;y<123;y+=2){
   const left=archLeft(y),right=112-left;
   block(C[0],left,y,right-left,2);
   block(C[1],left+3,y,Math.max(0,right-left-6),2);
   if(y>43&&y<121){
    const wave=Math.abs(Math.round(Math.sin((y+frame*7)/9)*3));
    block(C[2],left+5+wave,y,Math.max(1,right-left-10-wave*2),1);
    if(y%8===3)block(C[3],left+9,y,Math.max(1,right-left-18),1);
   }
  }
  // Vertical differentiated light shafts and a stationary focus with pulse.
  for(let i=0;i<7;i++){
   const xx=38+i*6;const top=47+hash(i,frame)%17;
   block(i%2?C[2]:C[3],xx,top,2,110-top);
  }
  block(C[4],53,58+frame%3,5,9);block(C[3],49,70,14,2);
  block(C[5],46,88-frame%2,21,2);block(C[1],36,110,39,8);
  // Repaint strong carved column edges over the energy: no translucent cards.
  for(let y=33;y<124;y+=7){
   const x=outerLeft(y);
   const inx=Math.max(x+10,archLeft(y));
   block(STONE[4],x+2,y,inx-x-4,1);
   block(STONE[1],112-inx+3,y,inx-x-4,1);
   if(y%14===5){block(STONE[0],x+3,y+3,inx-x-4,1);block(STONE[0],112-inx+2,y+4,inx-x-4,1);}
  }
  // Chisel work, cracks, mineral moss, inset gemstones and narrow runes.
  for(let i=0;i<19;i++){
   const y=39+i*4,x=outerLeft(y)+4;
   const yy=Math.min(122,y);
   if((hash(i,1)%3)===0)block(STONE[0],x+2+(i%3),yy,2,3);
   if((hash(i,2)%4)===0)block('#356951',112-x-7,yy+2,5,2);
   if((i%4)===0){block(GOLD[2],x+2,yy,3,2);block(GOLD[3],112-x-6,yy,2,2);}
  }
  // Rune mantle / roof keystone.
  block(STONE[0],41,6,30,7);block(STONE[2],44,7,24,4);
  block(GOLD[2],51,5,10,5);block(GOLD[4],54,6,4,3);
  for(const [x,y] of [[17,48],[91,48],[17,85],[91,85],[26,25],[82,25]]){
   block(STONE[0],x-3,y-3,8,8);block(STONE[2],x-2,y-2,6,6);
   block(GOLD[1],x,y,3,3);block(C[3],x,y,2,2);
  }
  // Local runes and jewel in exact pixel positions; bright stone highlights.
  for(const [x,y] of [[24,61],[86,61],[22,104],[88,104]]){
   block(STONE[4],x,y,2,9);block(STONE[1],x+2,y+2,2,5);
   block(C[4],x+1,y+3,2,2);
  }
  block(STONE[0],36,125,40,7);block(STONE[2],39,125,34,4);
  block(GOLD[2],44,128,24,1);block(GOLD[3],52,127,8,1);
  // Distinct, server-defined semantics: stairs and the continental golden gate.
  if(kind==='down'||kind==='up'){
   const down=kind==='down';
   for(let step=0;step<4;step++){
    const ww=44-step*7,yy=93+step*8;
    block(STONE[0],56-Math.floor(ww/2),yy,ww,6);
    block(down?STONE[2]:STONE[4],56-Math.floor(ww/2)+2,yy,ww-4,2);
    block(down?C[3]:C[4],56-Math.floor(ww/2)+4,yy+2,ww-8,1);
   }
   // Up / down rune points without text.
   const a=down?1:-1;
   for(let step=0;step<3;step++)block(C[4],53+step*2,63+a*step*4,6-step*2,2);
  }
  if(kind==='gateway'){
   block(GOLD[0],37,5,38,9);block(GOLD[3],40,6,32,5);block(GOLD[4],53,7,6,5);
   // Six-point continental crown on keystone.
   for(const x of [44,54,64]){block(GOLD[1],x,1,6,7);block(GOLD[4],x+1,2,3,3);}
   block(C[4],53,46,6,12);block(C[3],45,62,22,2);
  }
  // Independent energy motes. No rectangle or image-backed compositing.
  for(let i=0;i<22;i++){
   const y=45+(hash(i,2,frame)%69),left=archLeft(y),span=112-left*2;
   const x=left+5+hash(i,frame,7)%Math.max(1,span-10);
   block(i%3?C[3]:C[4],x,y,i%4?2:1,i%5?2:1);
  }
 }
 const cache=new Map();
 function sprite({kind='surface',frame=0,documentRef=root.document}={}){
  const type=SHADES[kind]?kind:'surface',phase=((frame|0)%6+6)%6,key=type+':'+phase;
  if(cache.has(key))return cache.get(key);
  const canvas=documentRef?.createElement?.('canvas');if(!canvas)return null;
  canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext?.('2d',{alpha:true});if(!ctx)return null;
  ctx.imageSmoothingEnabled=false;paint(ctx,{kind:type,frame:phase});
  cache.set(key,canvas);return canvas;
 }
 function draw(g,p,{now=0,near=false,documentRef=root.document}={}){
  if(!g||!p||!Number.isFinite(Number(p.x))||!Number.isFinite(Number(p.y)))return false;
  const kind=classifyPortal(p);
  const frame=Math.floor(now/180)%6;
  const canvas=sprite({kind,frame,documentRef});if(!canvas)return false;
  g.imageSmoothingEnabled=false;
  g.drawImage(canvas,Math.round(p.x-W/2),Math.round(p.y-H),W,H);
  if(near){
   // No full-screen glow: highlight only the active portal's base.
   g.fillStyle=SHADES[kind][4];
   for(let i=0;i<6;i++)g.fillRect(Math.round(p.x)-18+i*7,Math.round(p.y)-11,2,1);
  }
  return true;
 }
 const api=Object.freeze({VERSION,WIDTH:W,HEIGHT:H,classifyPortal,paint,sprite,draw,VARIANTS:colorTypes});
 root.OsPeregrinosPortalsV74=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

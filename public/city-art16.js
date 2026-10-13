'use strict';
/* Os Peregrinos — atlas procedural original 16-bit das cidadelas de Auren.
   Canvas raster em baixa resolução, pixels definidos, sem assets externos. */
(function(root){
 function create(){
  const N=11,TW=58,TH=29,OX=384,OY=70;
  const P=(x,y)=>({x:OX+(x-y)*TW/2,y:OY+(x+y)*TH/2});
  function poly(c,pts,fill,edge){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(const p of pts.slice(1))c.lineTo(p[0],p[1]);c.closePath();c.fillStyle=fill;c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=1;c.stroke()}}
  function box(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
  function diamond(c,x,y,col){const p=P(x,y);poly(c,[[p.x,p.y],[p.x+TW/2,p.y+TH/2],[p.x,p.y+TH],[p.x-TW/2,p.y+TH/2]],col)}
  const hash=(x,y,z=0)=>{let n=(x*374761393+y*668265263+z*1442695041)|0;n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0};
  function tree(c,px,py,n=0){
   const h=15+(n%7);box(c,px-2,py-h+8,4,h-3,'#4d3925');
   for(let i=0;i<3;i++){
    const cy=py-h+i*5,wd=10+i*4;
    poly(c,[[px,cy-7],[px+wd,cy+7],[px-wd,cy+7]],i%2?'#33593b':'#244b38','#1b382d');
    box(c,px-wd+3,cy+6,4,2,'#648354');
   }
 }
 function flowers(c,px,py,k){box(c,px,py,2,2,k%2?'#e5bf77':'#e9dcc1');box(c,px+3,py-2,2,2,'#b5a0c2')}
 function wall(c,x,y,w,h,palette){
  poly(c,[[x-w,y-h],[x,y-h+Math.floor(w/2)],[x,y+Math.floor(w/2)],[x-w,y]],palette.left,'#382f29');
  poly(c,[[x,y-h+Math.floor(w/2)],[x+w,y-h],[x+w,y],[x,y+Math.floor(w/2)]],palette.right,'#382f29');
  for(let j=8;j<h;j+=9){box(c,x-w+3,y-j+2,6,2,palette.mortar);box(c,x+4,y-j+5,7,2,palette.mortar)}
 }
 function roof(c,x,y,w,h,main,light){
  poly(c,[[x-w-3,y-h],[x,y-h-Math.round(w*.63)],[x+w+3,y-h],[x,y-h+Math.round(w*.5)]],main,'#4b3124');
  for(let j=0;j<5;j++)for(let i=0;i<6;i++){
   const sx=x-w+5+i*w*2/6,sy=y-h+3+j*3+((i%2)*2);
   if(Math.abs(sx-x)+Math.abs(sy-(y-h))<w+7)box(c,sx,sy,5,2,(i+j)%3===0?light:'#6f3f2e');
  }
 }
 function windows(c,x,y,h){
  box(c,x-12,y-h+13,5,8,'#362c29');box(c,x-11,y-h+14,3,5,'#e9c878');
  box(c,x+8,y-h+17,5,7,'#392e24');box(c,x+9,y-h+18,3,4,'#d3ad5f');
 }
 function building(c,b){
  const {x,y,type}=b,lv=Math.min(5,Math.max(1,b.level||1)),p=P(x,y),px=p.x,py=p.y+16;
  box(c,px-21,py+5,42,4,'#3d4a34');
  if(type==='farm'){
   poly(c,[[px-18,py-9],[px+4,py],[px+18,py-7],[px-2,py-16]],'#8b6b3e','#493f2c');
   for(let q=0;q<5;q++){box(c,px-16+q*6,py-4-(q%2)*3,3,5,'#d5ba6e');box(c,px-14+q*6,py-10-(q%2)*3,2,6,'#9fbb64')}
   wall(c,px+4,py-11,12,16,{left:'#958569',right:'#cbb994',mortar:'#837865'});
   roof(c,px+4,py-13,15,19,'#a44d32','#d48e55');
   box(c,px+7,py-13,5,9,'#514331');return;
  }
  if(type==='tower'){
   const h=46+lv*4;
   wall(c,px,py-1,14,h,{left:'#898e83',right:'#bbb8a4',mortar:'#72796f'});
   box(c,px-15,py-h-4,30,5,'#8f938a');
   for(let i=0;i<5;i++)box(c,px-15+i*6,py-h-11,5,8,'#a8aca1');
   box(c,px-4,py-h+16,7,11,'#302f2d');box(c,px-3,py-h+17,5,8,'#e0b968');
   box(c,px+5,py-11,6,10,'#413b33');return;
  }
  if(type==='market'){
   wall(c,px,py-4,18,23,{left:'#98836a',right:'#d1b896',mortar:'#79664f'});
   roof(c,px,py-8,22,27,'#b8733c','#e3a465');
   for(let i=0;i<5;i++)box(c,px-20+i*8,py-4,8,7,i%2?'#e6d1a2':'#a84d36');
   box(c,px-15,py+2,10,5,'#6e452b');box(c,px+7,py+2,10,5,'#745137');return;
  }
  if(type==='barracks'){
   wall(c,px,py-2,21,30,{left:'#817a6e',right:'#c1b5a1',mortar:'#625f56'});
   roof(c,px,py-8,27,38,'#5c6571','#929da3');
   windows(c,px,py,31);
   box(c,px-3,py-11,9,17,'#3c352c');
   box(c,px+18,py-26,3,27,'#523b25');box(c,px+20,py-26,12,12,'#aa5c3d');return;
  }
  wall(c,px,py-3,17,26+lv*2,{left:'#948475',right:'#d1bda3',mortar:'#897b69'});
  roof(c,px,py-7,23,29+lv*2,'#94452f','#c87547');
  windows(c,px,py,26);
  box(c,px-3,py-7,8,12,'#584432');
  box(c,px-15,py+1,3,4,'#e0c7a2');
 }
 function citadel(c){
  const p=P(5,5),px=p.x,py=p.y+12;
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){box(c,px+a*10-5,py+b*5-2,10,6,(a+b)%2?'#a89d7a':'#c6bb90')}
  wall(c,px,py-12,30,47,{left:'#9d9e91',right:'#d5cbb3',mortar:'#77766b'});
  roof(c,px,py-24,38,48,'#854732','#b87a4e');
  box(c,px-5,py-29,12,22,'#504737');box(c,px-3,py-27,8,18,'#292b25');
  for(const offset of [-34,34]){
   wall(c,px+offset,py-13,12,63,{left:'#8f9187',right:'#c4c4b5',mortar:'#77776f'});
   box(c,px+offset-13,py-79,27,5,'#969b94');
   for(let i=0;i<4;i++)box(c,px+offset-12+i*7,py-86,5,8,'#bfc3b6');
   box(c,px+offset-3,py-61,6,10,'#423f35');
  }
  box(c,px-2,py-101,3,26,'#4c3930');
  poly(c,[[px+1,py-101],[px+22,py-94],[px+1,py-88]],'#bfa36a','#735636');
 }
 function stone(c,x,y,n){
  const w=5+(n%8),h=3+(n%5);
  poly(c,[[x-w,y],[x-2,y-h],[x+w-2,y-h+2],[x+w,y],[x+1,y+3]],'#838779','#404e40');
  box(c,x-w+2,y-1,4,1,'#b8b9a0');
 }
 function broadleaf(c,x,y,seed){
  const h=20+seed%11;box(c,x-2,y-h/2,5,h/2,'#513d30');
  for(let layer=0;layer<3;layer++){
   const radius=13-layer*2;
   for(let q=-2;q<=2;q++){
    const sx=x+q*7+(layer%2?3:0),sy=y-h-layer*4+(q%2?3:0);
    box(c,sx-radius/3,sy-4,11,9,(seed+q+layer)%3===0?'#416f43':layer%2?'#376342':'#598052');
    box(c,sx-2,sy-3,4,2,'#83a36b');
   }
  }
 }
 function garden(c,x,y,seed){
  poly(c,[[x-17,y-4],[x+1,y-12],[x+19,y-1],[x,y+9]],'#716b46','#524a33');
  for(let i=0;i<5;i++)for(let j=0;j<3;j++){
   box(c,x-13+i*6,y-3+j*3,3,2,(i+j)%3?'#88a052':'#c2ab68');
  }
  if(seed%2)box(c,x+9,y-15,2,14,'#63523a');
 }
 function lantern(c,x,y){
  box(c,x-1,y-21,3,23,'#514532');box(c,x-4,y-23,10,4,'#6b5a3a');
  box(c,x-2,y-28,6,7,'#f0c76a');box(c,x-1,y-26,3,3,'#fff0b4');
 }
 function resident(c,x,y,seed,now){
  const stride=Math.floor(now/330+seed)%2;
  box(c,x-2,y-8,5,6,seed%2?'#9d4b35':'#385f7c');
  box(c,x-1,y-12,3,4,'#cfac84');
  box(c,x-2,y-2,2,4+stride,'#46392f');
  box(c,x+1,y-2,2,4-stride,'#46392f');
 }
 function detailBuilding(c,b){
  const p=P(b.x,b.y),seed=hash(b.x,b.y),y=p.y+16;
  // Jardins, anexos, telhas e detalhes únicos mudam conforme a identidade do lote.
  if(b.type==='house'){
   box(c,p.x-19,y+4,8,3,'#876a4d');box(c,p.x-18,y+1,2,8,'#92774f');
   box(c,p.x+15,y-4,3,12,'#8b7b6b');box(c,p.x+14,y-5,6,3,'#9e9386');
   if(seed%2)flowers(c,p.x+19,y+5,seed);
  }else if(b.type==='farm'){
   for(let i=0;i<4;i++)box(c,p.x-19+i*9,y+3,7,3,i%2?'#b0a56a':'#8d8b50');
   box(c,p.x-10,y-7,5,5,'#d4b66e');
  }else if(b.type==='market'){
   for(let i=0;i<3;i++){box(c,p.x-18+i*15,y+8,10,4,i%2?'#ad6c38':'#8a4938');box(c,p.x-16+i*15,y+5,6,3,'#d6b77c')}
  }else if(b.type==='barracks'){
   box(c,p.x-22,y+7,44,3,'#827c68');
   for(let i=0;i<3;i++)box(c,p.x-15+i*12,y+4,3,5,'#9b784a');
  }else if(b.type==='tower'){
   for(let i=0;i<4;i++)box(c,p.x-12+i*8,y+5,4,2,'#747b70');
  }
 }
 function render(c,{buildings=[],name='',selected=null,hover=null,now=0}={}){
  c.imageSmoothingEnabled=false;
  const sky=c.createLinearGradient(0,0,0,520);
  sky.addColorStop(0,'#1d352f');sky.addColorStop(.48,'#375342');sky.addColorStop(1,'#1c302a');
  c.fillStyle=sky;c.fillRect(0,0,768,520);
  // Arredores florestais e encostas dão profundidade; a cidade não é uma ilha no vazio.
  for(let i=0;i<190;i++){
   const x=hash(i,7)%768,y=hash(i,19)%485;
   const dx=Math.abs(x-384)/335,dy=Math.abs(y-230)/177;
   if(dx+dy<1.12)continue;
   const seed=hash(i,17);
   box(c,x,y,3+seed%8,2,seed%3===0?'#52724e':'#3c6346');
   if(seed%9===0)broadleaf(c,x,y,seed);
   else if(seed%13===0)stone(c,x,y,seed);
  }
  poly(c,[[384,56],[719,231],[384,410],[49,231]],'#293a2f','#17271e');
  const occupied=new Set(buildings.map(b=>b.x+','+b.y));
  for(let z=0;z<N*2;z++)for(let y=0;y<N;y++){
   const x=z-y;if(x<0||x>=N)continue;
   const isRoad=x===5||y===5,seed=hash(x,y);
   diamond(c,x,y,isRoad?((x+y)%2?'#c0a978':'#b3a077'):seed%3?'#658250':'#6d8855');
   const p=P(x,y);
   if(isRoad){
    box(c,p.x-7,p.y+11,4,2,'#d4c39d');
    if(seed%3===0)box(c,p.x+5,p.y+15,3,2,'#807b61');
   }else if(!occupied.has(x+','+y)&&!(x===4&&y===5)&&!(x===5&&y===4)&&!(x===5&&y===5)){
    if(seed%9===0)broadleaf(c,p.x+4,p.y+15,seed);
    else if(seed%7===0)tree(c,p.x+3,p.y+14,seed);
    else if(seed%11===0)garden(c,p.x,p.y+13,seed);
    else if(seed%5===0){flowers(c,p.x-7,p.y+12,seed);flowers(c,p.x+5,p.y+16,seed+1)}
    else if(seed%4===0)stone(c,p.x,p.y+15,seed);
    else {box(c,p.x-7,p.y+9,5,3,'#476d42');box(c,p.x+6,p.y+13,4,3,'#87a569')}
   }
   if(isRoad&&seed%9===0)lantern(c,p.x+14,p.y+10);
   if(isRoad&&seed%14===0)resident(c,p.x,p.y+11,seed,now);
   for(const b of buildings)if(b.x===x&&b.y===y){building(c,b);detailBuilding(c,b)}
   if(x===5&&y===5)citadel(c);
   if(hover&&hover.x===x&&hover.y===y){
    poly(c,[[p.x,p.y],[p.x+TW/2,p.y+TH/2],[p.x,p.y+TH],[p.x-TW/2,p.y+TH/2]],'rgba(245,215,121,.22)','#ffe1a2');
   }
  }
  c.fillStyle='#e9dcaa';c.font='bold 16px monospace';c.textAlign='center';
  c.fillText(name||'Cidadela de Auren',384,30);
  c.fillStyle='#b4c4a4';c.font='11px monospace';
  c.fillText('OS PEREGRINOS  •  REINOS DE AUREN',384,487);
 }
 return {render,project:P,N,TW,TH,OX,OY};
 }
 root.PeregrinosCityArt16=Object.freeze({create});
})(window);

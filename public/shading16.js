'use strict';
/*
 * OS PEREGRINOS — Luz 16-bit direcional.
 * Luz de cima à esquerda, volume por planos de cor recortados em pixels.
 * Não usa Canvas shadowBlur, CSS filter, gradientes ou desenho suavizado.
 * A geometria é exclusivamente artística; a colisão pertence ao servidor.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosShade16=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const px=(g,color,x,y,w,h)=>{
  if(w<=0||h<=0)return;
  g.fillStyle=color;
  g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
 };
 function contact(g,x,y,width=44){
  // Umbra escalonada em vez de elipse com borda antialias.
  const w=Math.max(14,Math.round(width));
  const steps=[.46,.69,.85,1,.88,.61];
  const center=Math.round(x),base=Math.round(y);
  for(let i=0;i<steps.length;i++){
   const span=Math.round(w*steps[i]);
   px(g,i<2?'#13251e8c':i<4?'#091a1588':'#1931256b',
    center-Math.round(span/2)+2,base-4+i,span,2);
  }
  px(g,'#0e1b1375',center-Math.round(w*.26)+3,base+2,Math.round(w*.52),2);
 }
 function ground(g,tx,ty,z,kind,p,hash){
  const x=tx*32,y=ty*32,seed=hash(tx,ty,z,83);
  if(kind==='water'){
   px(g,'#174a69',x+16,y+22,15,4);
   px(g,'#79c6cf',x+2,y+4,12,2);
   px(g,'#0d3954',x+22,y+25,7,2);
   if(seed>.56){px(g,'#a5e0df',x+9,y+11,8,2);px(g,'#edf4d6',x+13,y+11,3,1)}
  }else if(kind==='rock'||kind==='paving'){
   px(g,'#35443f',x+23,y+24,8,5);
   px(g,'#cdd8c1',x+4,y+4,14,2);
   px(g,'#3a5350',x+27,y+9,4,15);
   if(kind==='paving'){
    px(g,'#f0dfbc',x+4,y+15,10,2);
    px(g,'#394943',x+17,y+17,2,11);
   }else{
    px(g,'#d8d4bc',x+9,y+13,9,2);
    px(g,'#425d58',x+5,y+22,18,2);
   }
  }else if(kind==='path'||kind==='sand'){
   px(g,p[6],x+20,y+27,11,3);
   px(g,p[7],x+3,y+2,19,2);
   px(g,p[6],x+28,y+7,3,14);
   px(g,p[7],x+7,y+15,10,1);
   if(seed>.48){px(g,'#7b614a',x+11,y+22,8,2);px(g,p[7],x+12,y+22,4,1)}
  }else{
   // Contraste em tufos grandes: pouca textura pontilhada, mais volume.
   px(g,p[4],x+23,y+26,8,3);
   px(g,p[4],x+4,y+25,5,2);
   px(g,p[3],x+4,y+4,10,2);
   px(g,p[2],x+8,y+9,4,2);
   if(seed>.58){
    px(g,p[4],x+19,y+11,4,8);
    px(g,p[1],x+19,y+10,2,6);
    px(g,p[3],x+20,y+10,2,2);
   }
  }
 }
 function tree(g,p,v=0){
  // A sombra projetada parte dos pés e cresce para a direita, sem blur.
  px(g,'#172a244f',46,72,44,9);
  px(g,'#0d241c73',40,76,56,6);
  px(g,'#091f1980',53,80,41,3);
  // Sombra do tronco à direita; luz quente atravessa uma borda à esquerda.
  px(g,'#352a26',55,54,7,22);
  px(g,'#583f2f',58,58,5,15);
  px(g,'#c09b68',44,51,3,16);
  px(g,'#e0b379',46,51,2,8);
  // Copa SNES: faixas de oclusão sob lóbulos e detalhes em clusters.
  const clusters=[
   [21,29,16,5],[38,40,20,5],[57,32,22,6],
   [22,53,24,5],[51,57,26,7],[71,44,13,7]
  ];
  for(let i=0;i<clusters.length;i++){
   const [x,y,w,h]=clusters[i],shift=(i+v)%3;
   px(g,p[4],x+shift,y,w,h);
   px(g,p[0],x+shift+2,y,w-5,2);
   px(g,p[2],x+shift-1,y-5,Math.max(4,w-8),2);
  }
  // Posição de luz fixa: alto/esquerda, com áreas planas bem separadas.
  for(const [x,y,w] of [[29,17,15],[44,12,11],[62,22,13],[20,39,10],[55,40,15]]){
   px(g,p[3],x+(v%2)*2,y,w,3);
   px(g,p[2],x+3+(v%2)*2,y+3,Math.max(2,w-5),2);
  }
  for(let i=0;i<8;i++){
   const x=24+(i*17+v*7)%54,y=18+(i*11+v*5)%35;
   px(g,i%3===0?p[3]:p[2],x,y,3,2);
  }
 }
 function bush(g,p,v=0){
  // Encosto das folhas: baixo/direita mais escuro que o topo/esquerda.
  for(const [x,y,w] of [[6,24,17],[16,30,22],[33,25,20],[25,34,25]]){
   px(g,p[4],x+(v%2),y,w,5);
   px(g,p[0],x+3+(v%2),y-3,w-6,3);
  }
  for(const [x,y,w] of [[11,13,12],[24,9,13],[41,16,10]]){
   px(g,p[3],x,y,w,3);
   px(g,p[2],x+3,y+3,w-4,2);
  }
  px(g,'#18302395',15,36,34,4);
 }
 function rock(g,p,v=0){
  // Volumes em três planos: topo iluminado / face média / base oclusa.
  px(g,'#38443e',6,26,43,6);
  px(g,'#586e68',39,18,8,10);
  px(g,'#cdd9c7',16,12,20,3);
  px(g,'#dfe6d3',22,11,9,2);
  px(g,p[2],10,23,9,3);
  px(g,p[4],28+(v%2)*2,22,9,7);
  px(g,'#28372f',15,29,25,3);
 }
 function dungeon(g,tx,ty,z,kind,theme,hash){
  const x=tx*32,y=ty*32,n=hash(tx,ty,z,91);
  // Relevo recortado do tijolo: altura dada por pixels, não por filtros.
  px(g,theme.dark,x+24,y+24,8,6);
  px(g,theme.line,x+4,y+27,17,3);
  px(g,theme.light,x+3,y+3,17,2);
  px(g,theme.accent,x+5,y+6,5,2);
  if(kind==='path'){
   px(g,theme.line,x+3,y+29,25,2);
   px(g,theme.accent,x+22,y+4,6,2);
  }
  if(n>.57){
   px(g,theme.dark,x+15,y+12,2,11);
   px(g,theme.light,x+12,y+11,4,2);
   px(g,theme.dust,x+18,y+21,7,2);
  }
 }
 function hero(g,c,{by=0,front=true,back=false,role='peregrino',frame=0}={}){
  // Dobras da roupa, gola, contorno lateral e rebites de metal.
  px(g,c.edge,27,25+by,4,15);
  px(g,c.coat,26,27+by,3,10);
  px(g,c.light,12,22+by,6,3);
  px(g,c.trim,14,30+by,4,2);
  px(g,c.edge,18,33+by,10,2);
  px(g,c.light,16,36+by,3,2);
  // Botas usam o mesmo sombreado em todas as poses.
  px(g,c.edge,16,46+by,3,2);px(g,c.edge,25,46+by,3,2);
  px(g,'#b8a481',14,42+by,3,2);
  if(back){
   px(g,c.hair,14,13+by,14,3);
   px(g,c.trim,15,29+by,10,2);
  }else{
   // Face: maçã do rosto, nuca, nariz e sombra de cabelo.
   px(g,'#956a59',25,15+by,3,8);
   px(g,'#f8d2a3',15,13+by,7,2);
   px(g,'#a66e55',18,22+by,7,2);
   if(front){px(g,'#fff0c9',15,17+by,2,2);px(g,c.edge,26,20+by,2,2)}
  }
  if(role==='guardiao'){
   px(g,'#203543',9,21+by,5,4);
   px(g,'#ecf3e7',10,20+by,4,2);
   px(g,'#d3c78d',21,37+by,2,2);
  }else if(role==='arqueiro'){
   px(g,'#1b4636',12,24+by,3,16);
   px(g,'#e0c58c',13,25+by,2,7);
  }else if(role==='curandeiro'){
   px(g,'#695d7e',25,29+by,4,12);
   px(g,'#fbf1d8',15,27+by,3,4);
  }else{
   px(g,'#52382d',11,34+by,5,9);
   px(g,'#c7a76c',12,36+by,3,3);
  }
  if(frame%2===1)px(g,c.trim,17,38+by,3,2);
 }
 function creature(g,s,{boss=false,frame=0,shape='slime',zone=0}={}){
  // Sombreamento contido no corpo: distingue topo, abdômen e extremidades.
  const side=shape==='spider'||shape==='scorpion'?10:13;
  px(g,s.dark,side,40,22,3);
  px(g,s.light,side+2,23,13,2);
  if(['beast','dragon','wing','knight','golem'].includes(shape)){
   px(g,s.dark,30,30,4,10);
   px(g,s.light,12,21,5,3);
   px(g,s.base,15,37,14,2);
  }else if(shape==='ghost'){
   px(g,s.light,16,21,15,2);
   px(g,s.dark,28,35,5,5);
  }else{
   px(g,s.dark,28,34,5,7);
   px(g,s.light,13,27,7,2);
  }
  if(boss){
   px(g,'#f8e6ae',17,5,7,2);
   px(g,s.dark,32,40,4,4);
  }
  if(frame%2)px(g,s.light,20,34,3,2);
 }
 return{contact,ground,tree,bush,rock,dungeon,hero,creature};
});

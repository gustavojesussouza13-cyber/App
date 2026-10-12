'use strict';
/* Os Peregrinos — mundo aberto usando sprites/tiles extraídos sem alterar a arte 16-bit da campanha clássica. */
(()=>{
const SPRITES={"cavaleiro_andar":[0,0,160,192],"cavaleiro_combate":[163,0,160,192],"chefe_andar":[326,0,160,192],"chefe_combate":[489,0,160,192],"eli_andar":[652,0,160,192],"ester_andar":[815,0,160,192],"gustavo_andar":[0,195,160,192],"gustavo_combate":[163,195,160,192],"miriam_andar":[326,195,160,192],"sentinela_andar":[489,195,160,192],"sentinela_combate":[652,195,160,192],"tomas_andar":[815,195,160,192],"viajante_andar":[0,390,160,192],"arvore_1_tema_1":[163,390,104,122],"arvore_1_tema_2":[270,390,104,122],"arvore_1_tema_3":[377,390,104,122],"arvore_2_tema_1":[484,390,104,122],"arvore_2_tema_2":[591,390,104,122],"arvore_2_tema_3":[698,390,104,122],"arvore_3_tema_1":[805,390,104,122],"arvore_3_tema_2":[912,390,104,122],"arvore_3_tema_3":[0,585,104,122],"efeitos_animados":[107,585,256,96],"santuario":[366,585,77,96],"portal_aberto":[446,585,62,84],"portal_fechado":[511,585,62,84],"estandarte":[576,585,52,62],"tenda":[631,585,83,62],"fogueira":[717,585,37,43],"poco":[757,585,50,40],"monstro_aranha":[810,585,30,30],"monstro_dragao":[843,585,30,30],"monstro_escorpiao":[876,585,30,30],"monstro_esqueleto":[909,585,30,30],"monstro_fantasma":[942,585,30,30],"monstro_fera":[975,585,30,30],"monstro_golem":[0,710,30,30],"monstro_limo":[33,710,30,30],"monstro_lobo":[66,710,30,30],"monstro_morcego":[99,710,30,30],"monstro_serpente":[132,710,30,30],"monstro_vespa":[165,710,30,30],"arbusto_1":[198,710,36,29],"arbusto_2":[237,710,36,29],"arbusto_3":[276,710,36,29],"pedra":[315,710,28,20],"agua_01":[346,710,16,16],"agua_02":[365,710,16,16],"agua_03":[384,710,16,16],"agua_04":[403,710,16,16],"agua_05":[422,710,16,16],"agua_06":[441,710,16,16],"agua_07":[460,710,16,16],"agua_08":[479,710,16,16],"grama_01":[498,710,16,16],"grama_02":[517,710,16,16],"grama_03":[536,710,16,16],"grama_04":[555,710,16,16],"grama_05":[574,710,16,16],"grama_06":[593,710,16,16],"grama_07":[612,710,16,16],"grama_08":[631,710,16,16],"pedregulho_01":[650,710,16,16],"pedregulho_02":[669,710,16,16],"pedregulho_03":[688,710,16,16],"pedregulho_04":[707,710,16,16],"pedregulho_05":[726,710,16,16],"pedregulho_06":[745,710,16,16],"pedregulho_07":[764,710,16,16],"pedregulho_08":[783,710,16,16],"terra_01":[802,710,16,16],"terra_02":[821,710,16,16],"terra_03":[840,710,16,16],"terra_04":[859,710,16,16],"terra_05":[878,710,16,16],"terra_06":[897,710,16,16],"terra_07":[916,710,16,16],"terra_08":[935,710,16,16]};
const atlas=new Image(); atlas.decoding='async';atlas.src='/assets/classic-atlas.png';
const ZW=1536, ZH=1024, TILE=32;
const types=['limo','lobo','morcego','esqueleto','aranha','golem','serpente','morcego','golem','fera','escorpiao','fantasma','lobo','golem','fantasma','esqueleto','vespa','aranha','golem','fantasma','lobo','aranha','cavaleiro','serpente','dragao','fera','dragao','golem','sentinela','serpente','fantasma','chefe'];
const heroSheets={peregrino:'gustavo_andar',guardiao:'cavaleiro_andar',arqueiro:'viajante_andar',curandeiro:'eli_andar'};
const biomeThemes={pradaria:'meadow',floresta:'forest',rio:'river',deserto:'desert',montanha:'mountain',ruinas:'ruins',pantano:'swamp',costa:'coast',cidade:'city',masmorra:'dungeon'};
const rng=n=>{n|=0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return((n^(n>>>16))>>>0)/4294967296};
const noise=(x,y,z,s=1)=>rng(Math.imul(x+317,73856093)^Math.imul(y+631,19349663)^Math.imul(z+41,83492791)^Math.imul(s,374761393));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ROAD=z=>x=> 496+Math.sin((x+z*117)/225)*54+Math.sin(x/79+z*2)*12;
function create({ctx,W,H}){
 let cache=null,objects=[],artReady=false;
 atlas.addEventListener('load',()=>{artReady=true;cache=null});
 atlas.addEventListener('error',()=>{artReady=false});
 function cut(g,key,x,y,w,h){const p=SPRITES[key];if(!artReady||!p)return false;g.drawImage(atlas,p[0],p[1],p[2],p[3],Math.round(x),Math.round(y),Math.round(w??p[2]),Math.round(h??p[3]));return true}
 function piece(g,key,sx,sy,sw,sh,x,y,w,h){const p=SPRITES[key];if(!artReady||!p)return false;g.drawImage(atlas,p[0]+sx,p[1]+sy,sw,sh,Math.round(x),Math.round(y),Math.round(w),Math.round(h));return true}
 function pathY(x,z){return ROAD(z)(x)}
 function kind(tx,ty,z,biome){
  const wx=tx*TILE+16,wy=ty*TILE+16;
  const n=noise(tx,ty,z),n2=noise(tx>>2,ty>>2,z,3);
  const road=Math.abs(wy-pathY(wx,z));
  // The centre path is connected throughout the entire region.
  if(road<38+(n-.5)*9)return'path';
  if(biome==='river' && Math.abs(wx-(420+92*Math.sin(wy/150+z)))<83 && road>65)return'water';
  if(biome==='coast' && wy>740+55*Math.sin(wx/163))return'water';
  if(biome==='swamp' && n2<.19&&n<.72)return'water';
  if(biome==='meadow'&&wx<185&&wy>650&&n2<.65)return'water';
  if(biome==='forest'&&n2>.91&&n>.36)return'water';
  if(biome==='desert')return n2>.90?'rock':'sand';
  if(biome==='mountain'||biome==='dungeon'||biome==='ruins')return n2>.23?'rock':n>.46?'sand':'grass';
  if(biome==='city')return Math.abs(wx-850)<340&&Math.abs(wy-pathY(wx,z))<225?'paving':'grass';
  if(biome==='coast')return n2>.49?'sand':'grass';
  return n2<.07?'sand':'grass';
 }
 function terrain(z,biome){
  const gcanvas=document.createElement('canvas');gcanvas.width=ZW;gcanvas.height=ZH;
  const g=gcanvas.getContext('2d',{alpha:false});g.imageSmoothingEnabled=false;
  g.fillStyle='#406648';g.fillRect(0,0,ZW,ZH);
  for(let ty=0;ty<ZH/TILE;ty++)for(let tx=0;tx<ZW/TILE;tx++){
    const n=noise(tx,ty,z,9),k=kind(tx,ty,z,biome);
    let key;
    if(k==='water')key='agua_0'+(1+Math.floor(n*8));
    else if(k==='path'||k==='sand')key='terra_0'+(1+Math.floor(n*8));
    else if(k==='rock'||k==='paving')key=n>.26?'pedregulho_0'+(1+Math.floor(n*8)):'terra_0'+(1+Math.floor(n*8));
    else key='grama_0'+(1+Math.floor(n*8));
    cut(g,key,tx*TILE,ty*TILE,TILE,TILE);
    // Disrupted transitions between roads and the original grass tiles.
    if(k==='path' && kind(tx,ty-1,z,biome)==='grass')cut(g,'grama_02',tx*TILE,ty*TILE-4,32,10);
    if(k==='path' && kind(tx,ty+1,z,biome)==='grass')cut(g,'grama_05',tx*TILE,ty*TILE+TILE-6,32,10);
    if(k==='grass'&&n>.94)cut(g,'arbusto_3',tx*TILE+7,ty*TILE+11,21,18);
    if(k==='rock'&&n>.92)cut(g,'pedra',tx*TILE+3,ty*TILE+7,26,19);
    if(k==='path'&&n>.91)cut(g,'pedregulho_03',tx*TILE+11,ty*TILE+9,10,10);
    if(k==='grass'&&n>.22&&n<.235){
      const x=tx*TILE+8,y=ty*TILE+9;
      g.fillStyle=noise(tx,ty,z,27)>.5?'#f5deb2':'#dab1d7';
      for(const [xx,yy] of [[0,4],[4,0],[8,4],[4,8]])g.fillRect(x+xx,y+yy,3,3);
      g.fillStyle='#d8b65c';g.fillRect(x+4,y+4,3,3);
    }
  }
  // River crossing: rustic plank bridge with planks and dark seams.
  if(biome==='river'){
    const by=pathY(420,z);g.fillStyle='#684d31';g.fillRect(325,by-30,205,62);
    g.fillStyle='#b5975f';g.fillRect(330,by-26,194,52);
    g.fillStyle='#715536';for(let x=336;x<524;x+=13)g.fillRect(x,by-26,3,52);
    g.fillStyle='#dec488';g.fillRect(330,by-24,193,3);g.fillRect(330,by+21,193,3);
  }
  // Arquitetura própria para as masmorras profundas: lajes, mosaicos e inscrições.
  // Camada puramente visual: nunca cria bloqueios invisíveis ao servidor.
  if(biome==='dungeon'){
   const family=z>=16?Math.floor((z-16)/6):z-12;
   const depth=z>=16?1+(z-16)%6:0;
   const palette=[
    ['#355449','#83c5a0','#d4bc81'], // Cripta das raízes
    ['#64443d','#f09a5f','#efc98b'], // Cinzas
    ['#49456b','#aeb0eb','#e3cbab'], // Templo
    ['#31556a','#8bc8ea','#f6e5a9']  // Aurora
   ][Math.max(0,Math.min(3,family))];
   // Cada andar muda o arranjo das salas sem custo de novas imagens.
   g.fillStyle=palette[0]+'36';
   for(let y=96;y<ZH-90;y+=208)for(let x=98;x<ZW-80;x+=232){
    const n=noise(Math.floor(x/64),Math.floor(y/64),z,48);
    if(n<.22)continue;
    g.fillRect(x,y,182,136);
    g.strokeStyle=palette[1]+'92';g.lineWidth=3;g.strokeRect(x+3,y+3,176,130);
    g.strokeStyle='#0a101ba0';g.lineWidth=5;g.strokeRect(x+11,y+11,160,114);
    // Piso de pedra quadriculado e desgaste em juntas.
    g.lineWidth=1;g.strokeStyle=palette[2]+'55';
    for(let xx=x+20;xx<x+180;xx+=24){g.beginPath();g.moveTo(xx,y+14);g.lineTo(xx,y+121);g.stroke()}
    for(let yy=y+18;yy<y+133;yy+=24){g.beginPath();g.moveTo(x+12,yy);g.lineTo(x+172,yy);g.stroke()}
    g.fillStyle=palette[2]+'c9';g.font='bold 19px serif';g.textAlign='center';
    g.fillText(['✦','◇','ᚱ','✧'][(Math.floor(x/232)+Math.floor(y/208)+depth)%4],x+91,y+76);
   }
   // Colunas, arcos e detalhes de pedra posicionados afastados da via principal.
   for(let x=114;x<ZW-50;x+=226){
    const road=pathY(x,z);
    for(const side of [-1,1]){
     const y=Math.round(road+side*(105+12*(depth%3)));
     g.fillStyle='#0b1720a8';g.fillRect(x-21,y-22,47,48);
     g.fillStyle=palette[0];g.fillRect(x-17,y-28,34,49);
     g.fillStyle=palette[1];g.fillRect(x-23,y-32,46,11);g.fillRect(x-23,y+13,46,11);
     g.fillStyle=palette[2];g.fillRect(x-13,y-19,5,29);
     g.fillStyle=palette[1]+'a8';g.fillRect(x+8,y-14,4,19);
    }
   }
   // O corredor permanece livre; padrões laterais criam progressão de profundidade.
   g.fillStyle=palette[1]+'20';
   for(let x=32;x<ZW;x+=32){
    const y=Math.round(pathY(x,z));
    g.fillRect(x,y-38,20,3);g.fillRect(x,y+36,20,3);
   }
  }
  // Relatively subtle biome coloration without replacing the classic tiles.
  const wash={forest:'#081b0b12',swamp:'#082d3040',desert:'#d5aa6b2e',mountain:'#72839420',dungeon:'#2820376c',ruins:'#51446c20',coast:'#5eabbc12',city:'#d0b47411',river:'#4da1b20a'}[biome];
  if(wash){g.fillStyle=wash;g.fillRect(0,0,ZW,ZH)}
  const objs=[];
  const hasTrees=['meadow','forest','swamp','river','coast','city'].includes(biome);
  const isDry=['desert','mountain','ruins','dungeon'].includes(biome);
  const density=biome==='forest'?.88:biome==='city'?.25:biome==='swamp'?.52:.61;
  for(let y=70;y<ZH+60;y+=106)for(let x=65;x<ZW+60;x+=106){
    const gx=Math.round(x+(noise(x,y,z,4)-.5)*75),gy=Math.round(y+(noise(x,y,z,5)-.5)*62),r=noise(x,y,z,8);
    const distanceFromRoad=Math.abs(gy-pathY(gx,z));
    if(distanceFromRoad<71)continue;
    if(hasTrees&&r<density){
      const tree=1+Math.floor(noise(x,y,z,6)*3),theme=1+((z+Math.floor(noise(x,y,z,7)*3))%3);
      objs.push({key:`arvore_${tree}_tema_${theme}`,x:gx,y:gy,kind:'tree',w:112,h:131});
    }else if(r<.88){
      if(isDry)objs.push({key:'pedra',x:gx,y:gy,kind:'rock',w:39,h:30});
      else objs.push({key:'arbusto_'+(1+Math.floor(noise(x,y,z,11)*3)),x:gx,y:gy,kind:'bush',w:49,h:39});
    }
  }
  // The road contains recognisable Zelda-style original landmark sprites.
  for(let i=0;i<4;i++){
    const x=215+i*355+(z%3)*19,road=pathY(x,z),side=(i%2===0?-1:1);
    if(i===0&&z%4!==3)objs.push({key:'poco',x,y:road+side*81,kind:'prop',w:64,h:51});
    // Nunca desenhar portal_fechado como decoração: ele parecia uma entrada, mas não interagia.
    // Todas as passagens utilizáveis vêm exclusivamente de zonePortals() do servidor.
    if(i===1)objs.push({key:biome==='dungeon'?'pedra':biome==='city'?'tenda':'estandarte',x,y:road+side*82,kind:'prop',w:biome==='dungeon'?38:biome==='city'?105:63,h:biome==='dungeon'?30:biome==='city'?80:71});
    if(i===2)objs.push({key:'fogueira',x,y:road+side*85,kind:'prop',w:44,h:54});
    if(i===3)objs.push({key:biome==='dungeon'?'pedra':'santuario',x,y:road+side*90,kind:'prop',w:biome==='dungeon'?38:76,h:biome==='dungeon'?30:101});
  }
  if(biome==='city')for(let j=0;j<4;j++)objs.push({key:'tenda',x:410+j*160,y:pathY(410+j*160,z)-143,kind:'prop',w:93,h:74});
  objs.sort((a,b)=>a.y-b.y);objects=objs;
  cache={z,biome,canvas:gcanvas};
 }
 function frameSprite(g,key,dir,step,x,y,w,h){const row=clamp((dir|0),0,3),col=clamp(step|0,0,3);piece(g,key,col*40,row*48,40,48,x-w/2,y-h,w,h)}
 function drawShadow(g,x,y,w=42){g.fillStyle='rgba(17,28,21,.48)';g.beginPath();g.ellipse(Math.round(x),Math.round(y+2),w*.46,7,0,0,Math.PI*2);g.fill()}
 // O arco básico pertence à classe, mesmo sem o arco aprimorado da loja.
 function drawBow(g,p,dir,attacking){
  g.save();
  g.translate(Math.round(p.x),Math.round(p.y-33));
  g.rotate([-Math.PI/2,0,Math.PI/2,Math.PI][dir]||0);
  g.translate(12,0);
  g.lineCap='round';g.lineJoin='round';
  g.strokeStyle='#35241a';g.lineWidth=9;g.beginPath();
  g.moveTo(-1,-23);g.quadraticCurveTo(11,-11,9,0);g.quadraticCurveTo(11,11,-1,23);g.stroke();
  g.strokeStyle='#ca8d45';g.lineWidth=5;g.beginPath();
  g.moveTo(-1,-23);g.quadraticCurveTo(11,-11,9,0);g.quadraticCurveTo(11,11,-1,23);g.stroke();
  g.strokeStyle='#ffe3a3';g.lineWidth=2;g.beginPath();
  g.moveTo(-1,-23);g.lineTo(attacking?-15:-9,0);g.lineTo(-1,23);g.stroke();
  g.fillStyle='#5c3923';g.fillRect(6,-5,6,10);
  g.fillStyle='#e6bb78';g.fillRect(8,-3,3,6);
  if(attacking){
   g.strokeStyle='#e8d1a2';g.lineWidth=3;g.beginPath();
   g.moveTo(-18,0);g.lineTo(26,0);g.stroke();
   g.fillStyle='#f0efdc';g.beginPath();g.moveTo(29,0);g.lineTo(20,-5);g.lineTo(20,5);g.closePath();g.fill();
   g.strokeStyle='#9fce9c';g.lineWidth=2;g.beginPath();
   g.moveTo(-17,-5);g.lineTo(-11,0);g.lineTo(-17,5);g.stroke();
  }
  g.restore();
 }
 function drawProjectile(g,shot){
  g.save();g.translate(Math.round(shot.x),Math.round(shot.y));
  if(shot.kind==='impact'){
   const t=Math.max(0,Math.min(1,shot.impactAge/220));
   g.globalAlpha=Math.max(0,1-t);
   g.strokeStyle=shot.skill?'#fef3ba':'#ffd38c';g.lineWidth=3;
   for(let i=0;i<8;i++){
    const a=i*Math.PI/4,inner=5+t*3,outer=15+t*17;
    g.beginPath();g.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);
    g.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);g.stroke();
   }
   g.fillStyle=shot.skill?'#b5f7f0':'#fff5d4';
   g.beginPath();g.arc(0,0,Math.max(1,7*(1-t)),0,Math.PI*2);g.fill();
  }else{
   g.rotate(shot.angle);
   if(shot.skill){g.strokeStyle='#baf4f1';g.lineWidth=7;g.globalAlpha=.55;
    g.beginPath();g.moveTo(-29,0);g.lineTo(4,0);g.stroke();g.globalAlpha=1}
   g.strokeStyle='#4a3526';g.lineWidth=5;g.beginPath();g.moveTo(-19,0);g.lineTo(12,0);g.stroke();
   g.strokeStyle='#ddbb81';g.lineWidth=3;g.beginPath();g.moveTo(-17,0);g.lineTo(14,0);g.stroke();
   g.fillStyle='#f4f4e4';g.beginPath();g.moveTo(21,0);g.lineTo(11,-5);g.lineTo(11,5);g.closePath();g.fill();
   g.strokeStyle='#b3e8bd';g.lineWidth=3;g.beginPath();
   g.moveTo(-18,-6);g.lineTo(-10,0);g.lineTo(-18,6);g.stroke();
  }
  g.restore();
 }
 function character(g,p,local,now,moved,attacking=false){
  const key=heroSheets[p.role]||'gustavo_andar',w=53,h=65;
  drawShadow(g,p.x,p.y,w);
  const dir=Number.isInteger(p.dir)?p.dir:2;
  frameSprite(g,key,dir,moved?Math.floor(now/155)%4:0,p.x,p.y,w,h);
  if(p.role==='arqueiro')drawBow(g,p,dir,attacking);
  g.save();g.textAlign='center';g.font=(local?'bold 15px':'bold 13px')+' monospace';
  g.shadowColor='#000b';g.shadowBlur=5;g.lineWidth=3;g.strokeStyle='#0e271e';
  const label=(p.name||'Peregrino')+(local?'':' · Lv.'+(p.level||1));
  g.strokeText(label,p.x,p.y-h-5);g.fillStyle=local?'#ffe4a3':'#f1edd4';g.fillText(label,p.x,p.y-h-5);g.restore();
 }
 function npcActor(g,n,active,finished,now){
  const x=n.x,y=n.y;drawShadow(g,x,y,42);
  frameSprite(g,heroSheets[n.role]||'viajante_andar',2,Math.floor(now/500+(n.index||0))%2,x,y,47,59);
  g.save();g.textAlign='center';g.shadowColor='#000e';g.shadowBlur=5;
  const primary=n.kind==='chapter';
  g.font='bold 12px monospace';g.lineWidth=3;g.strokeStyle='#0c2118';
  g.strokeText(n.name,x,y-65);g.fillStyle=primary?'#ffe6a7':'#ccebd7';g.fillText(n.name,x,y-65);
  const indicator=primary?(finished?'✓':active?'!':'◆'):'✦';
  g.fillStyle=active?'#fff3ae':finished?'#a3d8a0':'#aee3ce';
  g.font='bold 23px Georgia,serif';g.strokeText(indicator,x,y-86);g.fillText(indicator,x,y-86);
  g.restore();
 }
 function monster(g,m,selected,now){
  const ty=types[Math.max(0,m.species|0)]||'limo';
  const bob=Math.sin(now/370+(m.species||0)*.95)*1.6;
  const x=m.x,y=m.y+bob;
  drawShadow(g,x,y,m.boss?58:38);
  if(ty==='cavaleiro'||ty==='sentinela'||ty==='chefe'){
    const key=ty==='chefe'?'chefe_andar':ty==='sentinela'?'sentinela_andar':'cavaleiro_andar';
    const w=m.boss?65:49,h=m.boss?81:62;
    frameSprite(g,key,2,Math.floor(now/500+m.species)%4,x,y,w,h);
  }else{
    const w=m.boss?65:43,h=m.boss?62:41;
    cut(g,'monstro_'+ty,x-w/2,y-h,w,h);
  }
  const width=m.boss?61:45;g.fillStyle='#231d1b';g.fillRect(x-width/2,y-(m.boss?90:56),width,7);
  g.fillStyle=m.boss?'#f6b66d':'#b1d976';g.fillRect(x-width/2+1,y-(m.boss?89:55),Math.max(0,(width-2)*m.hp/Math.max(1,m.maxHp)),5);
  if(selected){g.strokeStyle='#ffe29d';g.lineWidth=2;g.strokeRect(x-width/2-6,y-(m.boss?91:57),width+12,m.boss?101:70)}
  if(selected||m.boss){g.save();g.fillStyle='#ffefc8';g.font='bold 12px monospace';g.textAlign='center';g.shadowColor='#000';g.shadowBlur=6;g.fillText(m.name,x,y-(m.boss?99:64));g.restore()}
 }
 function prop(g,o){const s=o.w;drawShadow(g,o.x,o.y,s*.63);cut(g,o.key,o.x-o.w/2,o.y-o.h,o.w,o.h)}
 // Todos os portais reais são recebidos do servidor. Não existem portas falsas no cenário.
 function portal(g,p,now,hero){
  const pulse=.5+.5*Math.sin(now/440+p.x),near=Math.hypot(hero.x-p.x,hero.y-p.y)<=100;
  const gateway=!!p.gateway,down=p.stair==='down',up=p.stair==='up';
  const tint=gateway?'#f7cc80':down?'#e9ab77':up?'#a3daf4':p.dungeon?'#cca9fa':'#a6ebc3';
  g.save();g.translate(Math.round(p.x),Math.round(p.y));
  g.fillStyle='#031019c9';g.beginPath();g.ellipse(0,5,40,14,0,0,Math.PI*2);g.fill();
  g.shadowColor=tint;g.shadowBlur=(near?17:9)+pulse*12;
  // Portal 16-bit original do atlas, aplicado no local exato da passagem do servidor.
  cut(g,'portal_aberto',-34,-92,68,92);
  g.shadowBlur=0;
  g.strokeStyle=tint;g.lineWidth=near?4:2;
  g.beginPath();g.ellipse(0,-41,29,47,0,0,Math.PI*2);g.stroke();
  // Runas e partículas mostram que a entrada realmente pode ser usada.
  for(let j=0;j<5;j++){
   const angle=j*1.257+now/1100,rx=Math.cos(angle)*19,ry=-42+Math.sin(angle)*31;
   g.fillStyle=j%2?tint:'#fff1ce';g.fillRect(Math.round(rx),Math.round(ry),3,3);
  }
  if(p.stair){
   g.fillStyle='#0e1b25';g.fillRect(-32,-10,64,15);
   g.fillStyle=down?'#f6cb93':'#bcdeff';
   for(let j=0;j<4;j++)g.fillRect(-26+j*4,-8+j*3,52-j*8,3);
  }
  g.textAlign='center';g.shadowColor='#030a08';g.shadowBlur=6;
  const action=gateway?(p.zone===10?'↥ SAÍDA PARA AUREN':'✦ PRÓXIMA MASMORRA'):
   down?'↧ DESCER':up?'↥ SUBIR':p.dungeon?'✦ ENTRAR':'✦ VIAJAR';
  g.fillStyle='#071911e8';g.fillRect(-83,-108,166,18);
  g.font='bold 12px monospace';g.fillStyle=tint;g.fillText(action,0,-95);
  g.fillStyle='#f9e9c5';g.font='bold 12px monospace';
  g.fillText(p.name.slice(0,25),0,-118);
  if(near){
   g.shadowBlur=0;g.fillStyle='#ffe8a0';g.fillRect(-80,17,160,19);
   g.fillStyle='#142c25';g.font='bold 12px monospace';
   g.fillText('E · USAR PASSAGEM',0,31);
  }
  g.restore();
 }
 function displayMap(g,opt){
  const {players,monsters,npcs=[],portals=[],zone,x,y}=opt;
  const mx=W-179,my=16,mw=160,mh=104;
  g.fillStyle='#092019e3';g.fillRect(mx,my,mw,mh);g.strokeStyle='#d8b981';g.lineWidth=2;g.strokeRect(mx,my,mw,mh);
  g.save();g.beginPath();g.rect(mx+5,my+5,mw-10,mh-10);g.clip();
  g.strokeStyle='#cbb27b88';g.lineWidth=3;g.beginPath();for(let xx=0;xx<ZW;xx+=24){const px=mx+5+xx/ZW*(mw-10),py=my+5+pathY(xx,zone)/ZH*(mh-10);if(xx===0)g.moveTo(px,py);else g.lineTo(px,py)}g.stroke();
  g.fillStyle='#c58f6f';for(const m of monsters)g.fillRect(mx+5+m.x/ZW*(mw-10),my+5+m.y/ZH*(mh-10),m.boss?4:2,m.boss?4:2);
  for(const p of portals){g.fillStyle=p.gateway?'#ffd58d':p.stair?'#c7a9fb':'#a3e3dd';
   g.fillRect(mx+5+p.x/ZW*(mw-10),my+5+p.y/ZH*(mh-10),p.gateway?6:4,p.gateway?7:5)
  }
  g.fillStyle='#f8c574';for(const n of npcs)g.fillRect(mx+5+n.x/ZW*(mw-10),my+5+n.y/ZH*(mh-10),4,4);
  g.fillStyle='#c9ebeb';for(const p of players)g.fillRect(mx+5+p.x/ZW*(mw-10),my+5+p.y/ZH*(mh-10),4,4);
  g.fillStyle='#ffe0a3';g.fillRect(mx+5+x/ZW*(mw-10)-2,my+5+y/ZH*(mh-10)-2,6,6);g.restore();
  g.font='bold 11px monospace';g.fillStyle='#ead4a2';g.textAlign='left';g.fillText(zone>=16?'SUBSOLO '+(1+(zone-16)%6)+' · MASMORRA '+(1+Math.floor((zone-16)/6)):'REGIÃO '+(zone+1)+'/40',mx+7,my+mh+15);
 }
 function render(opt){
  const {zone,zones,x,y,dir,monsters,players,projectiles=[],npcs=[],portals=[],storyStage=0,cameraX,cameraY,name,role,target,now,fx,lastAction,moving}=opt;
  ctx.imageSmoothingEnabled=false;
  const biome=biomeThemes[zones[zone]?.biome]||'meadow';
  if(!artReady){ctx.fillStyle='#193629';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#efd39d';ctx.font='bold 20px Georgia,serif';ctx.fillText('✦ Preparando o mundo 16-bit…',W/2,H/2);return}
  if(!cache||cache.z!==zone||cache.biome!==biome)terrain(zone,biome);
  ctx.drawImage(cache.canvas,cameraX,cameraY,W,H,0,0,W,H);
  ctx.save();ctx.translate(-cameraX,-cameraY);
  const actors=[];
  for(const o of objects){if(o.x<cameraX-115||o.x>cameraX+W+115||o.y<cameraY-132||o.y>cameraY+H+135)continue;actors.push({depth:o.y,paint:()=>prop(ctx,o)})}
  for(const p of portals){if(p.x<cameraX-140||p.x>cameraX+W+140||p.y<cameraY-125||p.y>cameraY+H+125)continue;
   actors.push({depth:p.y-1,paint:()=>portal(ctx,p,now,{x,y})});
  }
  for(const n of npcs){if(n.x<cameraX-100||n.x>cameraX+W+100||n.y<cameraY-105||n.y>cameraY+H+105)continue;
   actors.push({depth:n.y,paint:()=>npcActor(ctx,n,n.index===storyStage,n.index!==null&&n.index<storyStage,now)});
  }
  for(const m of monsters){if(m.x<cameraX-90||m.x>cameraX+W+90||m.y<cameraY-90||m.y>cameraY+H+90)continue;actors.push({depth:m.y,paint:()=>monster(ctx,m,target===m.id,now)})}
  for(const p of players){if(p.x<cameraX-75||p.x>cameraX+W+75||p.y<cameraY-95||p.y>cameraY+H+75)continue;actors.push({depth:p.y,paint:()=>character(ctx,p,false,now,p.moving!==false)})}
  actors.push({depth:y,paint:()=>character(ctx,{name,role,x,y,dir},true,now,moving,role==='arqueiro'&&now-lastAction<280)});
  actors.sort((a,b)=>a.depth-b.depth);
  for(const a of actors)a.paint();
  for(const shot of projectiles)drawProjectile(ctx,shot);
  if(now-lastAction<260&&role!=='arqueiro'){const dx=[0,1,0,-1][dir|0],dy=[-1,0,1,0][dir|0];
    ctx.save();ctx.strokeStyle='#fff2bd';ctx.lineWidth=5;ctx.shadowColor='#e9d28c';ctx.shadowBlur=9;
    ctx.beginPath();ctx.arc(x+dx*19,y-30+dy*14,31,-Math.PI*.7,Math.PI*.18);ctx.stroke();ctx.restore();}
  for(const f of fx){const t=(now-f.t)/1100;ctx.save();ctx.font='bold 18px monospace';ctx.fillStyle=f.color;ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=5;ctx.fillText(f.text,f.x,f.y-45-30*t);ctx.restore()}
  ctx.restore();displayMap(ctx,opt);
 }
 return {render,ready:()=>artReady,tiles:Object.keys(SPRITES).length};
}
window.PeregrinoArt16={create};
})();

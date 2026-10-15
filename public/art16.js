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
 const pixelDetail=window.OsPeregrinosPixelDetail;
 const shade16=window.OsPeregrinosShade16;
 const landscape=window.OsPeregrinosLandscape16?.create({documentRef:document});
 const procedural=window.PeregrinosProceduralWorld;
 const spriteStudio=window.OsPeregrinosSpriteStudio?.create({documentRef:document});
 const desktopSprites=window.OsPeregrinosDesktopSprites16?.create({windowRef:window});
 const desktopCharactersV3=window.OsPeregrinosDesktopCharactersV3?.create({windowRef:window,documentRef:document});
 const desktopBestiary=window.OsPeregrinosDesktopBestiary16?.create({windowRef:window});
 const worldProps=window.OsPeregrinosWorldPropsArtisan64?.create({documentRef:document});
 let cache=null,objects=[],artReady=false;
 // Três últimas regiões: o retorno pelo atlas não reconstrói milhares de tiles.
 const terrainCache=new Map();
 atlas.addEventListener('load',()=>{artReady=true;cache=null;terrainCache.clear()});
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
  // A moldura do desktop acompanha o bioma; não altera controles mobile.
  document.documentElement.dataset.pixelFamily=pixelDetail?.styleFor(z)?.id||biome;
  const key=z+':'+biome;
  const previous=terrainCache.get(key);
  if(previous){terrainCache.delete(key);terrainCache.set(key,previous);cache=previous;objects=previous.objects;return}
  // Uma leitura de clima por chunk (8x8 tiles), não uma por pixel/tile.
  const chunkBiomes=[];
  if(procedural)for(let cy=0;cy<ZH/procedural.CHUNK_SIZE;cy++)for(let cx=0;cx<ZW/procedural.CHUNK_SIZE;cx++)
   chunkBiomes.push(procedural?.biomeAt(z,cx*8+4,cy*8+4,biome)||biome);
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
    if(biome!=='dungeon'&&landscape){
     // Tiles de solo, grama e água consistentes com a colisão do servidor.
     // O microclima modifica somente a paleta: água, estradas e colisões permanecem intactas.
     const tileBiome=procedural?chunkBiomes[Math.floor(ty/8)*6+Math.floor(tx/8)]:biome;
     if(tileBiome===biome)landscape.terrainTile(g,tx,ty,z,biome,k,(cx,cy)=>kind(cx,cy,z,biome));
     else landscape.terrainTile(g,tx,ty,z,tileBiome,k,(cx,cy)=>kind(cx,cy,z,biome));
    }else if(biome==='dungeon'&&pixelDetail)pixelDetail.drawDungeonTile(g,tx,ty,z,k);
    else{
     cut(g,key,tx*TILE,ty*TILE,TILE,TILE);
     if(pixelDetail)pixelDetail.drawSurfaceTile(g,tx,ty,z,biome,k);
    }
    // Disrupted transitions between roads and the original grass tiles.
    if(!landscape&&k==='path' && kind(tx,ty-1,z,biome)==='grass')cut(g,'grama_02',tx*TILE,ty*TILE-4,32,10);
    if(!landscape&&k==='path' && kind(tx,ty+1,z,biome)==='grass')cut(g,'grama_05',tx*TILE,ty*TILE+TILE-6,32,10);
    if(!landscape&&biome!=='dungeon'&&k==='grass'&&n>.94)cut(g,'arbusto_3',tx*TILE+7,ty*TILE+11,21,18);
    if(!landscape&&biome!=='dungeon'&&k==='rock'&&n>.92)cut(g,'pedra',tx*TILE+3,ty*TILE+7,26,19);
    if(!landscape&&biome!=='dungeon'&&k==='path'&&n>.91)cut(g,'pedregulho_03',tx*TILE+11,ty*TILE+9,10,10);
    if(!landscape&&biome!=='dungeon'&&k==='grass'&&n>.22&&n<.235){
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
  // Cenografia original: cada masmorra possui trama de solo e arquitetura própria.
  if(biome==='dungeon'&&pixelDetail)pixelDetail.drawArchitecture(g,z,pathY,ZW,ZH);
  // Relatively subtle biome coloration without replacing the classic tiles.
  const wash={forest:'#081b0b12',swamp:'#082d3040',desert:'#d5aa6b2e',mountain:'#72839420',dungeon:'#2820376c',ruins:'#51446c20',coast:'#5eabbc12',city:'#d0b47411',river:'#4da1b20a'}[biome];
  if(wash&&(!landscape||biome==='dungeon')){g.fillStyle=wash;g.fillRect(0,0,ZW,ZH)}
  const objs=[];
  const hasTrees=['meadow','forest','swamp','river','coast','city'].includes(biome);
  const isDry=['desert','mountain','ruins','dungeon'].includes(biome);
  const density=biome==='forest'?.88:biome==='city'?.25:biome==='swamp'?.52:.61;
  for(let y=70;y<ZH+60;y+=106)for(let x=65;x<ZW+60;x+=106){
    const gx=Math.round(x+(noise(x,y,z,4)-.5)*75),gy=Math.round(y+(noise(x,y,z,5)-.5)*62),r=noise(x,y,z,8);
    const distanceFromRoad=Math.abs(gy-pathY(gx,z));
    if(distanceFromRoad<71)continue;
    if(biome==='dungeon'){
     if(r<.32)objs.push({x:gx,y:gy,kind:'dungeon-prop',w:62,h:72});
     continue;
    }
    if(hasTrees&&r<density){
      const tree=1+Math.floor(noise(x,y,z,6)*3),theme=1+((z+Math.floor(noise(x,y,z,7)*3))%3);
      objs.push({key:`arvore_${tree}_tema_${theme}`,x:gx,y:gy,kind:'tree',w:112,h:131});
    }else if(r<.88){
      if(isDry)objs.push({key:'pedra',x:gx,y:gy,kind:'rock',w:39,h:30});
      else objs.push({key:'arbusto_'+(1+Math.floor(noise(x,y,z,11)*3)),x:gx,y:gy,kind:'bush',w:49,h:39});
    }else{
      objs.push({x:gx,y:gy,kind:'biome-prop',w:62,h:72});
    }
  }
  // Cenografia por chunks: a seed reproduz exatamente as mesmas descobertas
  // ao regressar à região, sem armazenar milhares de tiles no banco.
  if(procedural)for(let cy=0;cy<ZH/procedural.CHUNK_SIZE;cy++)for(let cx=0;cx<ZW/procedural.CHUNK_SIZE;cx++){
   for(const feature of procedural.chunkFeatures(z,cx,cy,biome)){
    if(Math.abs(feature.y-pathY(feature.x,z))<83)continue;
    if(kind(Math.floor(feature.x/TILE),Math.floor(feature.y/TILE),z,biome)==='water')continue;
    objs.push(feature);
   }
  }
  // The road contains recognisable Zelda-style original landmark sprites.
  for(let i=0;i<4;i++){
    const x=215+i*355+(z%3)*19,road=pathY(x,z),side=(i%2===0?-1:1);
    if(biome==='dungeon'){
     objs.push({x,y:road+side*(116+(i%2)*19),kind:'dungeon-prop',w:62,h:72});
     continue;
    }
    if(i===0&&z%4!==3)objs.push({key:'poco',x,y:road+side*81,kind:'prop',w:64,h:51});
    // Nunca desenhar portal_fechado como decoração: ele parecia uma entrada, mas não interagia.
    // Todas as passagens utilizáveis vêm exclusivamente de zonePortals() do servidor.
    if(i===1)objs.push({key:biome==='dungeon'?'pedra':biome==='city'?'tenda':'estandarte',x,y:road+side*82,kind:'prop',w:biome==='dungeon'?38:biome==='city'?105:63,h:biome==='dungeon'?30:biome==='city'?80:71});
    if(i===2)objs.push({key:'fogueira',x,y:road+side*85,kind:'prop',w:44,h:54});
    if(i===3)objs.push({x,y:road+side*95,kind:'biome-prop',w:76,h:80});
  }
  if(biome==='city')for(let j=0;j<4;j++)objs.push({key:'tenda',x:410+j*160,y:pathY(410+j*160,z)-143,kind:'prop',w:93,h:74});
  objs.sort((a,b)=>a.y-b.y);objects=objs;
  cache={z,biome,canvas:gcanvas,objects:objs};
  terrainCache.set(key,cache);
  if(terrainCache.size>3)terrainCache.delete(terrainCache.keys().next().value);
 }
 function frameSprite(g,key,dir,step,x,y,w,h){const row=clamp((dir|0),0,3),col=clamp(step|0,0,3);piece(g,key,col*40,row*48,40,48,x-w/2,y-h,w,h)}
 function drawShadow(g,x,y,w=42){
  if(shade16?.contact){shade16.contact(g,x,y,w);return}
  g.fillStyle='#172e2588';g.fillRect(Math.round(x-w*.35),Math.round(y),Math.round(w*.7),5);
 }
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
 // Feitiços originais do Curandeiro: faíscas em blocos de pixels, núcleo
 // de luz e rastro direcional. O brilho não usa filtros nem desfoque.
 function drawHolyBolt(g,shot){
  g.save();g.translate(Math.round(shot.x),Math.round(shot.y));
  const skill=!!shot.skill;
  if(shot.kind==='magic-impact'){
   const t=Math.max(0,Math.min(1,shot.impactAge/220));
   const radius=skill?Math.round(15+t*22):Math.round(11+t*17);
   g.globalAlpha=Math.max(0,1-t);
   // Oito pontas em cruz e diagonais: impacto circular feito de píxeis.
   for(let i=0;i<8;i++){
    const angle=i*Math.PI/4;
    const x=Math.round(Math.cos(angle)*radius);
    const y=Math.round(Math.sin(angle)*radius);
    g.fillStyle=i%2?'#6acee5':'#f9eab2';
    g.fillRect(x-3,y-3,7,7);
    g.fillStyle='#eafff3';g.fillRect(x-1,y-1,3,3);
    const mid=Math.round(radius*.56);
    g.fillStyle='#49a9c3';
    g.fillRect(Math.round(Math.cos(angle)*mid)-2,
     Math.round(Math.sin(angle)*mid)-2,5,5);
   }
   // Duas cruzes radiantes com centro dourado.
   const inner=skill?18:13;
   g.fillStyle='#4b9fbe';g.fillRect(-inner, -2,inner*2,5);
   g.fillRect(-2,-inner,5,inner*2);
   g.fillStyle='#fce6a7';g.fillRect(-7,-7,15,15);
   g.fillStyle='#fafff0';g.fillRect(-3,-3,7,7);
   if(skill){
    g.fillStyle='#e5fef4';
    for(const [x,y] of [[-18,-18],[18,-18],[-18,18],[18,18]]){
     g.fillRect(x,y,5,5);
    }
   }
  }else{
   g.rotate(shot.angle);
   const pulse=Math.round(Math.sin((shot.progress||0)*Math.PI*8)*2);
   // Onda traseira e partículas soltas conforme atravessa o cenário.
   g.fillStyle='#267e9e';
   g.fillRect(-30,-2,12,5);
   g.fillStyle='#74cbd3';
   g.fillRect(-24,-1,17,3);
   g.fillStyle='#e7eeb7';
   g.fillRect(-14,-1,13,3);
   for(let i=0;i<(skill?6:4);i++){
    const x=-30+i*8,y=(i%2?1:-1)*(4+(i*3)%7)+pulse;
    g.fillStyle=i%2?'#f7e3a0':'#84eee3';
    g.fillRect(x,y,3+(i%2),3+(i%2));
   }
   // Contorno turquesa do orbe, centro marfim e filigrana sagrada.
   const size=skill?19:15,half=Math.floor(size/2);
   g.fillStyle='#225977';
   g.fillRect(-half-2,-half+2,size+4,size-4);
   g.fillRect(-half+2,-half-2,size-4,size+4);
   g.fillStyle='#58c3d5';g.fillRect(-half+1,-half+1,size-2,size-2);
   g.fillStyle='#c1f3e3';g.fillRect(-half+3,-half+2,size-7,size-6);
   // Face sombreada inferior/direita, facetado como uma joia 16-bit.
   g.fillStyle='#286b95';g.fillRect(-half+2,half-3,size-5,3);
   g.fillStyle='#317b9e';g.fillRect(half-2,-half+3,3,size-7);
   g.fillStyle='#dbfff0';g.fillRect(-half+3,-half+2,6,3);
   g.fillStyle='#8de6db';g.fillRect(-half+6,-half+5,3,2);
   g.fillStyle='#fff5c1';g.fillRect(-3,-3,7,7);
   g.fillStyle='#fffef0';g.fillRect(-1,-1,3,3);
   g.fillStyle='#f5df9b';
   g.fillRect(half+1,-2,skill?10:7,5);
   g.fillStyle='#d1fbf1';g.fillRect(half+6,-1,4,3);
   if(skill){
    g.fillStyle='#fff6c8';
    g.fillRect(-2,-half-9,5,8);g.fillRect(-2,half+1,5,8);
    g.fillRect(-half-10,-2,8,5);
   }
  }
  if(typeof pixelDetail!=='undefined'&&pixelDetail)pixelDetail.drawCombat(g,shot);
  g.restore();
 }
 function drawProjectile(g,shot){
  if(shot.kind==='magic'||shot.kind==='magic-impact'){drawHolyBolt(g,shot);return}
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
  if(typeof pixelDetail!=='undefined'&&pixelDetail)pixelDetail.drawCombat(g,shot);
  g.restore();
 }
 // Contraste final por classe, aplicado DEPOIS do atlas ou do sprite
 // procedural. É intencionalmente independente do SpriteStudio: mesmo um
 // cliente com fallback mantém Guardião, Curandeiro e Peregrino distintos.
 // Todos os contornos são pixels inteiros, alinhados ao mundo 2D.
 function drawClassIdentity(g,p,dir=2,now=0,moving=false){
  const role=spriteStudio?.normalizeRole?.(p.role)||
   ({guardiao:'guardiao',curandeiro:'curandeiro',arqueiro:'arqueiro',peregrino:'peregrino'}[p.role]||'peregrino');
  const x=Math.round(p.x),y=Math.round(p.y);
  const step=moving?Math.round(Math.sin(now/105)*2):0;
  const pix=(color,dx,dy,w,h)=>{
   if(w<=0||h<=0)return;
   g.fillStyle=color;g.fillRect(x+Math.round(dx),y+Math.round(dy),w,h);
  };
  const back=dir===0,side=dir===1||dir===3;
  if(role==='guardiao'){
   // Armadura cerúlea cobre o torso, ombreiras metálicas e grande escudo
   // recortado à esquerda. Mantém silhueta mesmo de costas e andando.
   pix('#182a45',-19,-43,38,29);
   pix('#3b659b',-16,-40,32,24);
   pix('#638fc0',-15,-40,12,7);
   pix('#12273d',10,-37,5,19);
   pix('#d0dee0',-25,-45,13,11);
   pix('#718eaf',-23,-43,11,7);
   pix('#d0dee0',12,-45,13,11);
   pix('#7d9bb4',14,-43,9,7);
   pix('#e5b765',-3,-37,7,17);
   pix('#ffe29b',-9,-31,20,4);
   pix('#28426c',-14,-15,28,7);
   pix('#d3e1e2',-12,-13,7,7);pix('#d3e1e2',5,-13,7,7);
   pix('#4a6883',-10,-10,8,5);pix('#4a6883',4,-10,8,5);
   // Elmo, não capuz verde.
   pix('#1e3147',-17,-68,34,20);
   pix('#c4d2d9',-15,-65,30,13);
   pix('#f2f4dd',-13,-64,13,3);
   pix('#4a6c8d',-12,-54,25,6);
   pix('#d7ab55',-3,-71,7,19);
   pix('#ffe2a0',-1,-68,3,10);
   if(!back){pix('#d9a67a',-7,-51,16,5);pix('#273b55',-6,-53,15,2)}
   // Escudo grande de contorno dourado.
   pix('#1b304b',-31,-42+step,20,32);
   pix('#d9b06b',-29,-41+step,17,28);
   pix('#2d609b',-27,-39+step,13,24);
   pix('#87a9c9',-25,-37+step,5,7);
   pix('#ffe0a1',-22,-34+step,4,16);
   pix('#ffe0a1',-25,-29+step,11,4);
   // Espada levantada de metal, não um arco.
   pix('#473932',22,-22-step,4,17);
   pix('#f0c783',19,-26-step,11,4);
   pix('#516e89',22,-61-step,5,35);
   pix('#f4f8ee',23,-59-step,2,27);
   pix('#d5e2e2',23,-65-step,2,6);
  }else if(role==='curandeiro'){
   // Veste ampla em marfim com sombras rosadas: ocupa a parte inferior
   // inteira e jamais pode ser confundida com roupa de caçador verde.
   pix('#6e445e',-22,-43,44,35);
   pix('#d9c9cc',-19,-41,38,32);
   pix('#fff5e4',-16,-40,30,28);
   pix('#f9ecdf',-13,-38,16,24);
   pix('#b95874',-18,-40,7,32);
   pix('#ad4c66',11,-40,7,32);
   pix('#e9c37c',-5,-35,11,17);
   pix('#b15d68',-2,-33,5,13);
   pix('#ffeda3',-5,-27,11,3);
   pix('#b3576e',-20,-12,40,5);
   pix('#f1ddd2',-14,-11,28,4);
   pix('#fff4e9',-12,-8,8,3);pix('#fff4e9',5,-8,8,3);
   // Capuz branco alto, manto vermelho por trás, sombra no rosto.
   pix('#744b61',-20,-67,40,22);
   pix('#f4e9df',-18,-69,36,17);
   pix('#fff9ed',-15,-67,23,5);
   pix('#c56878',-18,-57,36,5);
   if(back){
    pix('#ba627a',-11,-55,22,14);
    pix('#e8c68d',-6,-51,12,9);
   }else{
    pix('#a87573',-12,-53,25,4);
    pix('#e2b08c',-9,-51,18,7);
    pix('#fae1b9',-8,-50,8,3);
   }
   // Cajado e cristal cyan, visíveis em qualquer direção.
   pix('#47392f',26,-57-step,6,55);
   pix('#c79661',28,-53-step,3,49);
   pix('#395b78',23,-73-step,12,17);
   pix('#68c5e2',24,-71-step,10,13);
   pix('#e5fff7',26,-68-step,4,5);
   pix('#f3d18e',25,-56-step,9,4);
  }else if(role==='arqueiro'){
   // Capuz verde e aljava no lado oposto ao arco.
   pix('#1e4735',-17,-66,33,19);
   pix('#4b8d53',-15,-64,27,13);
   pix('#9dc27c',-13,-62,14,3);
   pix('#294f34',-16,-41,29,25);
   pix('#588e4c',-13,-38,18,19);
   pix('#b08a5c',13,-52,11,27);
   for(let i=0;i<3;i++)pix('#f6e2b1',16+i*3,-58+(i%2)*2,2,16);
   pix('#603e2b',-27,-54+step,5,41);
   pix('#e1ad6c',-25,-53+step,2,34);
   pix('#f2ddaf',-19,-51+step,2,37);
  }else{
   // Peregrino: silhueta de aventureiro com cachecol vermelho,
   // armadura de couro e alforje — jamais uma roupa verde.
   pix('#49312f',-18,-43,35,26);
   pix('#997047',-15,-40,29,22);
   pix('#c09360',-13,-38,10,10);
   pix('#654335',8,-39,5,20);
   pix('#512934',-18,-47,37,11);
   pix('#ba5350',-16,-45,33,7);
   pix('#ee9270',-13,-44,18,3);
   pix('#593138',-23,-42+step,12,31);
   pix('#ab4f4b',-21,-40+step,8,26);
   pix('#dd7c64',-20,-37+step,3,16);
   pix('#6a4938',-16,-17,32,9);
   pix('#d4b079',-13,-16,8,3);
   pix('#3f3133',-12,-10,9,7);pix('#3f3133',4,-10,9,7);
   pix('#6d482f',13,-35,10,18);
   pix('#bd8851',15,-33,6,4);
   pix('#4c332b',-15,-61,30,15);
   pix('#a66a41',-13,-60,26,8);
   pix('#e9b37b',-9,-58,14,3);
   if(!back){pix('#eac096',-9,-53,18,7);pix('#7a4b37',-7,-50,14,2)}
   pix('#e1d8b8',22,-54-step,4,36);pix('#a2afb7',23,-51-step,2,29);
  }
  // Contorno superior com tonalidade exclusiva de cada profissão.
  if(side&&role==='guardiao')pix('#f7e9ba',-18,-43,4,9);
  if(side&&role==='curandeiro')pix('#fffaf0',-19,-41,5,19);
  return role;
 }
 function character(g,p,local,now,moved,attacking=false,pose=null){
  const key=heroSheets[p.role]||'gustavo_andar',w=53,h=65;
  drawShadow(g,p.x,p.y,w);
  const dir=Number.isInteger(p.dir)?p.dir:2;
  const state={moving:moved,attacking,hurt:pose?.action==='hurt',
   elapsed:pose?Math.max(0,now-pose.at):0,
   seed:local?0:(p.name?.length||0)*107};
  // Qualidade PC V5: o Atelier tem rostos, classe e animações completas.
  // O atlas clássico truncava rosto/cachecol/armas, e o V3 usava blocos.
  // Mesmo sprite autoral de 64×80 nos aparelhos móveis e no PC.
  // Ajustamos somente a apresentação na tela, nunca colisão ou hitbox.
  const premiumPc=Boolean(desktopCharactersV3?.enabled);
  const studioHero=Boolean(spriteStudio?.drawHero(g,p,now,{...state,desktopPremium:premiumPc}));
  const pngSprite=!studioHero&&Boolean(desktopSprites?.drawHero(g,p,now,state));
  const illustratedV3=!studioHero&&!pngSprite&&Boolean(desktopCharactersV3?.drawHero(g,p,now,state));
  const detailed=pngSprite||illustratedV3;
  const animated=studioHero||detailed||Boolean(spriteStudio?.drawHero(g,p,now,state));
  if(!animated){
   frameSprite(g,key,dir,moved?Math.floor(now/155)%4:0,p.x,p.y,w,h);
   if(pixelDetail)pixelDetail.drawHero(g,p,now);
   if(p.role==='arqueiro')drawBow(g,p,dir,attacking);
  }
  // O sprite detalhado do Studio já contém a identidade da classe.
  // Uma camada de blocos opacos aqui escondia olhos, roupas e sombreamento.
  // A proteção antiga permanece APENAS quando o Studio não está disponível.
  const finalRole=studioHero?spriteStudio.normalizeRole(p.role):
   pngSprite?desktopSprites.normalizeRole(p.role):
   illustratedV3?desktopCharactersV3.normalizeRole(p.role):
   animated?spriteStudio.normalizeRole(p.role):drawClassIdentity(g,p,dir,now,moved);
  g.save();g.textAlign='center';g.font=(local?'bold 15px':'bold 13px')+' monospace';
  g.shadowColor='#000b';g.shadowBlur=0;g.lineWidth=3;g.strokeStyle='#0e271e';
  const roleName={guardiao:'Guardião',curandeiro:'Curandeiro',arqueiro:'Arqueiro',peregrino:'Peregrino'}[finalRole];
  const label=(p.name||'Peregrino')+(local?' · '+roleName:' · Lv.'+(p.level||1));
  const labelY=p.y-(studioHero?(premiumPc?110:88):pngSprite?80:illustratedV3?94:h)-5;
  g.strokeText(label,p.x,labelY);g.fillStyle=local?'#ffe4a3':'#f1edd4';g.fillText(label,p.x,labelY);g.restore();
 }
 function npcActor(g,n,active,finished,now){
  const x=n.x,y=n.y;drawShadow(g,x,y,42);
  const premiumPc=Boolean(desktopCharactersV3?.enabled);
  const studioNpc=Boolean(spriteStudio?.drawNpc(g,n,now,{desktopPremium:premiumPc}));
  const pngNpc=!studioNpc&&Boolean(desktopSprites?.drawNpc(g,n,now));
  const illustratedNpcV3=!studioNpc&&!pngNpc&&Boolean(desktopCharactersV3?.drawNpc(g,n,now));
  const detailed=studioNpc||pngNpc||illustratedNpcV3;
  if(!detailed&&!spriteStudio?.drawNpc(g,n,now))
   frameSprite(g,heroSheets[n.role]||'viajante_andar',2,Math.floor(now/500+(n.index||0))%2,x,y,47,59);
  g.save();g.textAlign='center';g.shadowColor='#000e';g.shadowBlur=0;
  const primary=n.kind==='chapter';
  g.font='bold 12px monospace';g.lineWidth=3;g.strokeStyle='#0c2118';
  const nameY=y-(studioNpc?(premiumPc?113:96):pngNpc?82:illustratedNpcV3?97:65);
  g.strokeText(n.name,x,nameY);g.fillStyle=primary?'#ffe6a7':'#ccebd7';g.fillText(n.name,x,nameY);
  const indicator=primary?(finished?'✓':active?'!':'◆'):'✦';
  g.fillStyle=active?'#fff3ae':finished?'#a3d8a0':'#aee3ce';
  g.font='bold 23px Georgia,serif';g.strokeText(indicator,x,nameY-21);g.fillText(indicator,x,nameY-21);
  g.restore();
 }
 function monster(g,m,selected,now,pose=null){
  const ty=types[Math.max(0,m.species|0)]||'limo';
  const bob=m.moving?0:Math.sin(now/500+(m.species||0)*.95)*1;
  const x=m.x,y=m.y+bob;
  drawShadow(g,x,y,m.boss?58:38);
  const acting=pose?.action==='attack'&&now-pose.at<470;
  const hurt=pose?.action==='hurt'&&now-pose.at<310;
  const dead=pose?.action==='death';
  const state={type:ty,moving:m.moving===true,attacking:acting,hurt,dead,
   elapsed:pose?Math.max(0,now-pose.at):0};
  const premiumPc=Boolean(desktopCharactersV3?.enabled);
  const studioMonster=Boolean(spriteStudio?.drawMonster(g,{...m,x,y},now,{...state,desktopPremium:premiumPc}));
  const detailedBoss=!studioMonster&&Boolean(desktopSprites?.drawMonster(g,{...m,x,y},now,state));
  const illustrated=!studioMonster&&!detailedBoss&&Boolean(desktopBestiary?.drawMonster(g,{...m,x,y},now,state));
  const animated=studioMonster||detailedBoss||illustrated||Boolean(spriteStudio?.drawMonster(g,{...m,x,y},now,state));
  if(!animated){
   if(ty==='cavaleiro'||ty==='sentinela'||ty==='chefe'){
    const key=ty==='chefe'?'chefe_andar':ty==='sentinela'?'sentinela_andar':'cavaleiro_andar';
    const w=m.boss?65:49,h=m.boss?81:62;
    frameSprite(g,key,2,Math.floor(now/500+m.species)%4,x,y,w,h);
  }else{
    const w=m.boss?65:43,h=m.boss?62:41;
    cut(g,'monstro_'+ty,x-w/2,y-h,w,h);
  }
   if(pixelDetail)pixelDetail.drawMonster(g,m,now);
  }
  if(dead)return;
  // Runas originais por afinidade/raridade, desenhadas em pixels inteiros.
  // Sem filtros que apaguem as silhuetas 64x80 ou interfiram na hitbox.
  if(m.rarity==='Raro'||m.rarity==='Épico'||m.boss){
   const colors={terra:'#a0c38e',bruma:'#a6dcdb',fogo:'#f6b474',aurora:'#e9d68f',gelo:'#b6d6f4',sombras:'#bd9cd6'};
   const tint=colors[m.affinity]||'#e5cb8b';
   const phase=Math.floor(now/280+(m.variant||0))%4;
   g.save();g.fillStyle=tint;
   for(let i=0;i<4;i++){
    const xx=Math.round(x-23+i*14),yy=Math.round(y-11-((i+phase)%3)*4);
    g.fillRect(xx,yy,3,3);
    if(m.rarity==='Épico')g.fillRect(xx+2,yy-3,2,2);
   }
   g.restore();
  }
  const top=studioMonster?(m.boss?(premiumPc?155:123):(premiumPc?100:85)):detailedBoss?121:illustrated?(m.boss?137:83):m.boss?90:56;
  const width=studioMonster?(m.boss?(premiumPc?124:98):(premiumPc?80:68)):detailedBoss?90:illustrated?(m.boss?110:62):m.boss?61:45;
  g.fillStyle='#231d1b';g.fillRect(x-width/2,y-top,width,7);
  g.fillStyle=m.boss?'#f6b66d':'#b1d976';g.fillRect(x-width/2+1,y-top+1,Math.max(0,(width-2)*m.hp/Math.max(1,m.maxHp)),5);
  if(selected){g.strokeStyle='#ffe29d';g.lineWidth=2;g.strokeRect(x-width/2-6,y-top-1,width+12,studioMonster?(m.boss?(premiumPc?165:132):(premiumPc?110:95)):detailedBoss?132:illustrated?(m.boss?149:97):m.boss?101:70)}
  if(selected||m.boss){g.save();g.fillStyle='#ffefc8';g.font='bold 12px monospace';g.textAlign='center';g.shadowColor='#000';g.shadowBlur=0;g.fillText(m.name,x,y-top-9);g.restore()}
 }
 function prop(g,o){
  const size=o.w;drawShadow(g,o.x,o.y,size*.63);
  if(o.kind==='dungeon-prop'&&pixelDetail){pixelDetail.drawDungeonProp(g,o,cache.z);return}
  if(o.kind==='biome-prop'){
   const propBiome=o.chunkBiome||cache.biome;
   const variant=Math.floor(noise(Math.round(o.x),Math.round(o.y),cache.z,96)*4);
   // Pradaria, floresta, rio, deserto, montanha, ruínas, pântano,
   // costa e cidade ganham monumentos diferentes, pintados 64x80.
   if(worldProps?.draw(g,{kind:'biome-'+propBiome,x:o.x,y:o.y,
     w:o.w,h:o.h,variant}))return;
   if(pixelDetail){pixelDetail.drawSurfaceProp(g,o,cache.biome,cache.z);return}
  }
  if(o.chunkBiome){if(landscape?.drawProp(g,o,o.chunkBiome))return}
  else if(landscape?.drawProp(g,o,cache.biome))return;
  // Objetos de estrada e cidade desenhados em grade nativa 64x80.
  const variant=Math.floor(noise(Math.round(o.x),Math.round(o.y),cache.z,88)*4);
  if(worldProps?.draw(g,{kind:o.key,x:o.x,y:o.y,w:o.w,h:o.h,variant}))return;
  cut(g,o.key,o.x-o.w/2,o.y-o.h,o.w,o.h)
 }
 // Todos os portais reais são recebidos do servidor. Não existem portas falsas no cenário.
 function portal(g,p,now,hero){
  const near=Math.hypot(hero.x-p.x,hero.y-p.y)<=100;
  const gateway=!!p.gateway,down=p.stair==='down',up=p.stair==='up';
  const tint=gateway?'#f7cc80':down?'#e9ab77':up?'#a3daf4':p.dungeon?'#cca9fa':'#a6ebc3';
  g.save();g.translate(Math.round(p.x),Math.round(p.y));
  // Portais reais pertencem ao servidor; desenhamos só o marcador 2D.
  // Substitui a elipse alisada por sombras e runas em pixels inteiros.
  for(let j=0;j<5;j++){
   const ww=40-j*5;
   g.fillStyle='#091f274a';g.fillRect(Math.round(-ww/2),2+j*2,ww,1);
  }
  const portalFrame=Math.floor(now/180)%4;
  const variant=gateway?1:down?3:up?2:p.dungeon?2:0;
  if(!worldProps?.draw(g,{kind:'portal',x:0,y:0,w:68,h:92,
    frame:portalFrame,variant}))cut(g,'portal_aberto',-34,-92,68,92);
  if(pixelDetail)pixelDetail.drawPortal(g,p,now);
  for(let j=0;j<(near?7:4);j++){
   const a=j*1.31+now/700;
   const xx=Math.round(Math.cos(a)*22),yy=Math.round(-45+Math.sin(a)*29);
   g.fillStyle=j%2?tint:'#fff1ce';
   g.fillRect(xx,yy,2,2);g.fillRect(xx+1,yy-2,1,1);
  }
  if(p.stair){
   g.fillStyle='#0e1b25';g.fillRect(-32,-10,64,15);
   g.fillStyle=down?'#f6cb93':'#bcdeff';
   for(let j=0;j<4;j++)g.fillRect(-26+j*4,-8+j*3,52-j*8,3);
  }
  g.textAlign='center';g.shadowColor='#030a08';g.shadowBlur=0;
  const action=gateway?(p.zone===10?'↥ SAÍDA PARA AUREN':'✦ PRÓXIMA MASMORRA'):
   down?'↧ DESCER':up?'↥ SUBIR':p.dungeon?'✦ ENTRAR':'✦ VIAJAR';
  g.fillStyle='#071911ed';g.fillRect(-83,-108,166,18);
  g.font='bold 12px monospace';g.fillStyle=tint;g.fillText(action,0,-95);
  g.fillStyle='#f9e9c5';g.font='bold 12px monospace';
  g.fillText(p.name.slice(0,25),0,-118);
  g.restore();
 }
 // Mensagem da passagem fica acima de todos os sprites e do minimapa.
 // Ancoragem no rodapé da tela evita qualquer oclusão por atores do mundo.
 function portalInteractionHud(g,portals,hero){
  const nearest=(portals||[]).filter(p=>Math.hypot(hero.x-p.x,hero.y-p.y)<=94)
   .sort((a,b)=>Math.hypot(hero.x-a.x,hero.y-a.y)-Math.hypot(hero.x-b.x,hero.y-b.y))[0];
  if(!nearest)return;
  const width=Math.min(W-30,432),height=67,x=Math.round((W-width)/2),y=H-height-15;
  g.save();g.imageSmoothingEnabled=false;
  g.fillStyle='#071811ed';g.fillRect(x+3,y+4,width,height);
  g.fillStyle='#122a23f7';g.fillRect(x,y,width,height);
  g.strokeStyle='#ffdc89';g.lineWidth=3;g.strokeRect(x+1,y+1,width-2,height-2);
  g.fillStyle='#edc676';g.fillRect(x+9,y+10,47,47);
  g.fillStyle='#17261d';g.font='bold 26px monospace';g.textAlign='center';
  g.fillText('E',x+32,y+43);
  g.textAlign='left';g.fillStyle='#fff1c7';g.font='bold 16px monospace';
  g.fillText('APERTE E · USAR PASSAGEM',x+68,y+27,width-82);
  g.fillStyle='#b5e9d2';g.font='bold 12px monospace';
  g.fillText('✦ '+nearest.name,x+68,y+49,width-82);
  g.restore();
 }
 // Castelo 16-bit: muralhas, torres, estandarte e nome do reino.
 // Não altera colisão nem hitbox dos personagens e portais.
 function kingdomBase(g,b,now){
  // SOMENTE o ícone de castelo do mapa 2D muda; fortaleza 3D intacta.
  const variant=String(b.name||'').length%4;
  g.save();g.translate(Math.round(b.x),Math.round(b.y));
  if(!worldProps?.draw(g,{kind:'reino',x:0,y:0,w:104,h:100,
    variant,frame:Math.floor(now/380)%4})){
   g.fillStyle='#344b45';g.fillRect(-36,-53,72,58);
   g.fillStyle='#d7be7d';g.fillRect(-28,-59,16,51);g.fillRect(15,-59,16,51);
   g.fillStyle='#b98e58';g.fillRect(-12,-20,24,21);
  }
  g.fillStyle='#e8d196';g.font='bold 11px monospace';g.textAlign='center';
  g.shadowColor='#071613';g.shadowBlur=0;
  g.fillText('♜ '+String(b.name||'Reino').slice(0,19),0,-103);
  g.restore();
 }
 function displayMap(g,opt){
  const {players,monsters,npcs=[],portals=[],kingdomBases=[],zone,x,y}=opt;
  const mx=W-179,my=16,mw=160,mh=104;
  g.fillStyle='#092019e3';g.fillRect(mx,my,mw,mh);g.strokeStyle='#d8b981';g.lineWidth=2;g.strokeRect(mx,my,mw,mh);
  g.save();g.beginPath();g.rect(mx+5,my+5,mw-10,mh-10);g.clip();
  g.strokeStyle='#cbb27b88';g.lineWidth=3;g.beginPath();for(let xx=0;xx<ZW;xx+=24){const px=mx+5+xx/ZW*(mw-10),py=my+5+pathY(xx,zone)/ZH*(mh-10);if(xx===0)g.moveTo(px,py);else g.lineTo(px,py)}g.stroke();
  g.fillStyle='#c58f6f';for(const m of monsters)g.fillRect(mx+5+m.x/ZW*(mw-10),my+5+m.y/ZH*(mh-10),m.boss?4:2,m.boss?4:2);
  for(const p of portals){g.fillStyle=p.gateway?'#ffd58d':p.stair?'#c7a9fb':'#a3e3dd';
   g.fillRect(mx+5+p.x/ZW*(mw-10),my+5+p.y/ZH*(mh-10),p.gateway?6:4,p.gateway?7:5)
  }
  g.fillStyle='#d7b66f';for(const b of kingdomBases){g.fillRect(mx+5+b.x/ZW*(mw-10)-2,my+5+b.y/ZH*(mh-10)-2,7,7)}
  g.fillStyle='#f8c574';for(const n of npcs)g.fillRect(mx+5+n.x/ZW*(mw-10),my+5+n.y/ZH*(mh-10),4,4);
  g.fillStyle='#c9ebeb';for(const p of players)g.fillRect(mx+5+p.x/ZW*(mw-10),my+5+p.y/ZH*(mh-10),4,4);
  g.fillStyle='#ffe0a3';g.fillRect(mx+5+x/ZW*(mw-10)-2,my+5+y/ZH*(mh-10)-2,6,6);g.restore();
  g.font='bold 11px monospace';g.fillStyle='#ead4a2';g.textAlign='left';g.fillText(zone>=40?'FRONTEIRA ∞ · REGIÃO '+zone:zone>=16?'SUBSOLO '+(1+(zone-16)%6)+' · MASMORRA '+(1+Math.floor((zone-16)/6)):'REGIÃO '+(zone+1)+'/40',mx+7,my+mh+15);
  if(procedural){
   const ctx=g;
   const biome=biomeThemes[opt.zoneBiome||opt.zones?.[zone]?.biome]||'meadow';
   const piece=procedural.chunk(zone,Math.floor(x/procedural.CHUNK_SIZE),Math.floor(y/procedural.CHUNK_SIZE),biome);
   ctx.save();ctx.fillStyle='#081b17d9';ctx.fillRect(13,H-35,252,22);
   ctx.font='bold 12px monospace';ctx.fillStyle='#d8e9bb';ctx.textAlign='left';
   ctx.fillText('✦ '+piece.name+' · setor '+(piece.cx+1)+','+(piece.cy+1),21,H-20);
   ctx.restore();
  }
 }
 function render(opt){
  const {zone,zones,x,y,dir,appearance,monsters,players,projectiles=[],npcs=[],portals=[],kingdomBases=[],storyStage=0,cameraX,cameraY,name,role,target,now,fx,lastAction,lastActionWasSkill=false,skillEffects=[],drawSkillEffects=null,moving,monsterActions=new Map(),playerActions=new Map(),fallen=[],heroPose=null}=opt;
  ctx.imageSmoothingEnabled=false;
  const biome=biomeThemes[opt.zoneBiome||zones[zone]?.biome]||'meadow';
  const useWorld25d=Boolean(opt.world25dActive);
  if(!artReady){ctx.fillStyle='#193629';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#efd39d';ctx.font='bold 20px Georgia,serif';ctx.fillText('✦ Preparando o mundo 16-bit…',W/2,H/2);return}
  if(!cache||cache.z!==zone||cache.biome!==biome)terrain(zone,biome);
  if(useWorld25d)ctx.clearRect(0,0,W,H);
  else ctx.drawImage(cache.canvas,cameraX,cameraY,W,H,0,0,W,H);
  // Só no PC: reduzir concorrência visual do terreno sem apagar textura.
  // O tratamento é ANTERIOR aos atores; sprites, HUD e minimapa ficam vivos.
  if(!useWorld25d&&desktopSprites?.enabled){ctx.fillStyle='#0d20200d';ctx.fillRect(0,0,W,H)}
  if(!useWorld25d&&pixelDetail)pixelDetail.drawAtmosphere(ctx,{z:zone,biome,cameraX,cameraY,W,H,now});
  ctx.save();ctx.translate(-cameraX,-cameraY);
  const actors=[];
  if(!useWorld25d)for(const o of objects){if(o.x<cameraX-115||o.x>cameraX+W+115||o.y<cameraY-132||o.y>cameraY+H+135)continue;actors.push({depth:o.y,paint:()=>prop(ctx,o)})}
  for(const p of portals){if(p.x<cameraX-140||p.x>cameraX+W+140||p.y<cameraY-125||p.y>cameraY+H+125)continue;
   actors.push({depth:p.y-1,paint:()=>portal(ctx,p,now,{x,y})});
  }
  for(const b of kingdomBases){if(b.x<cameraX-100||b.x>cameraX+W+100||b.y<cameraY-140||b.y>cameraY+H+140)continue;
   actors.push({depth:b.y-2,paint:()=>kingdomBase(ctx,b,now)});
  }
  for(const n of npcs){if(n.x<cameraX-100||n.x>cameraX+W+100||n.y<cameraY-105||n.y>cameraY+H+105)continue;
   actors.push({depth:n.y,paint:()=>npcActor(ctx,n,n.index===storyStage,n.index!==null&&n.index<storyStage,now)});
  }
  for(const m of monsters){if(m.x<cameraX-90||m.x>cameraX+W+90||m.y<cameraY-90||m.y>cameraY+H+90)continue;actors.push({depth:m.y,paint:()=>monster(ctx,m,target===m.id,now,monsterActions.get(m.id))})}
  for(const m of fallen){if(m.x<cameraX-90||m.x>cameraX+W+90||m.y<cameraY-90||m.y>cameraY+H+90)continue;actors.push({depth:m.y-1,paint:()=>monster(ctx,m,false,now,{action:'death',at:m.defeatedAt})})}
  for(const p of players){if(p.x<cameraX-75||p.x>cameraX+W+75||p.y<cameraY-95||p.y>cameraY+H+75)continue;actors.push({depth:p.y,paint:()=>character(ctx,p,false,now,p.moving!==false,playerActions.has(p.name)&&now-playerActions.get(p.name).at<390&&playerActions.get(p.name).action==='attack',playerActions.get(p.name))})}
  actors.push({depth:y,paint:()=>character(ctx,{name,role,appearance,x,y,dir},true,now,moving,now-lastAction<370,heroPose||{action:'attack',at:lastAction})});
  actors.sort((a,b)=>a.depth-b.depth);
  for(const a of actors)a.paint();
  for(const shot of projectiles)drawProjectile(ctx,shot);
  // Camada mágica exclusivamente PC: pixels inteiros sobre o mundo,
  // depois dos atores e antes dos indicadores de dano/vida.
  if(typeof drawSkillEffects==='function')drawSkillEffects(ctx,skillEffects);
  if(now-lastAction<260&&!lastActionWasSkill&&(role==='peregrino'||role==='guardiao')){const dx=[0,1,0,-1][dir|0],dy=[-1,0,1,0][dir|0];
    ctx.save();ctx.strokeStyle='#fff2bd';ctx.lineWidth=5;ctx.shadowColor='#e9d28c';ctx.shadowBlur=9;
    ctx.beginPath();ctx.arc(x+dx*19,y-30+dy*14,31,-Math.PI*.7,Math.PI*.18);ctx.stroke();ctx.restore();}
  for(const f of fx){const t=(now-f.t)/1100;ctx.save();ctx.font='bold 18px monospace';ctx.fillStyle=f.color;ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=5;ctx.fillText(f.text,f.x,f.y-45-30*t);ctx.restore()}
  ctx.restore();displayMap(ctx,opt);
  // Última camada visível, sem depender da profundidade do portal no mapa.
  portalInteractionHud(ctx,portals,{x,y});
 }
 return {render,ready:()=>artReady,tiles:Object.keys(SPRITES).length};
}
window.PeregrinoArt16={create};
})();

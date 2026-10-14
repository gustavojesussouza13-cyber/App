'use strict';
/* Os Peregrinos — cena 3D original e isolada das fortalezas.
   Renderização WebGL/Three.js em origem própria, com estradas de terra e bosques. */
import * as THREE from '/vendor/three.module.js';
import {architectureAt} from '/guild-architecture.mjs';
import {planGuildLandscape,nextRoadCell} from '/guild-landscape.mjs';

export function createGuildScene({mount,layout,onCell,onHover}){
 const N=layout.N,CELL=2.85,HALF=N*CELL/2;
 const mats=new Map(),geometries=new Map();
 const material=(c,roughness=0.93)=>{const k=c+':'+roughness;if(!mats.has(k))mats.set(k,new THREE.MeshStandardMaterial({color:c,roughness,metalness:0.04}));return mats.get(k)};
 const geom=(w,h,d)=>{const k=[w,h,d].join('/');if(!geometries.has(k))geometries.set(k,new THREE.BoxGeometry(w,h,d));return geometries.get(k)};
 const scene=new THREE.Scene();
 scene.background=new THREE.Color('#bdc9ac');
 scene.fog=new THREE.FogExp2('#bdc9ac',0.006);
 const camera=new THREE.PerspectiveCamera(47,1,0.1,450);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.13;
 renderer.domElement.className='guild3d-canvas';
 renderer.domElement.setAttribute('aria-label','Fortaleza tridimensional: arraste para girar, use a roda para zoom e clique para construir');
 renderer.domElement.style.touchAction='none';
 mount.append(renderer.domElement);
 const ambient=new THREE.HemisphereLight('#f7efda','#496047',1.45);scene.add(ambient);
 const sun=new THREE.DirectionalLight('#fff0c8',2.30);
 sun.position.set(-25,48,22);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);
 sun.shadow.camera.left=-63;sun.shadow.camera.right=63;
 sun.shadow.camera.top=63;sun.shadow.camera.bottom=-63;
 sun.shadow.normalBias=0.025;
 scene.add(sun);
 const root=new THREE.Group();scene.add(root);
 const structures=new THREE.Group();scene.add(structures);
 const workMeshes=new THREE.Group();scene.add(workMeshes);
 const labels=document.createElement('div');
 labels.className='guild3d-construction-layer';mount.append(labels);
 const provisionalStructures=new THREE.Group();scene.add(provisionalStructures);
 const decor=new THREE.Group();scene.add(decor);
 const lotsGroup=new THREE.Group();scene.add(lotsGroup);
 const streets=new THREE.Group();root.add(streets);
 const landscape=planGuildLandscape(layout);
 const lotCells=landscape.lotCells;
 const pickPlane=new THREE.Mesh(new THREE.PlaneGeometry(N*CELL,N*CELL),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));
 pickPlane.rotation.x=-Math.PI/2;pickPlane.position.y=0.03;scene.add(pickPlane);
 // Materiais orgânicos originais gerados localmente, sem imagens de terceiros:
 // grama pontilhada, terra arenosa e marcas sutis de uso nos caminhos.
 function terrainTexture(kind){
  const size=256,cv=document.createElement('canvas');cv.width=cv.height=size;
  const c=cv.getContext('2d'),dirt=kind==='earth';
  c.fillStyle=dirt?'#98754e':'#77945a';c.fillRect(0,0,size,size);
  let n=dirt?41957:81923;
  const rand=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};
  for(let i=0;i<2800;i++){
   const x=rand()*size,y=rand()*size,r=(dirt?.7:1)+rand()*(dirt?2:3);
   c.globalAlpha=(dirt?.08:.10)+rand()*.20;
   c.fillStyle=dirt?(rand()>.42?'#e1c18a':'#56412a'):
    (rand()>.5?'#365c34':'#d0b876');
   c.fillRect(x,y,r,r*.55);
  }
  c.globalAlpha=1;
  if(dirt){
   for(let i=0;i<32;i++){
    const x=rand()*size,y=rand()*size;
    c.fillStyle=rand()>.6?'#c4af85':'#6e583e';
    c.beginPath();c.ellipse(x,y,1.5+rand()*2,.7+rand()*1.8,rand()*3,0,Math.PI*2);c.fill();
   }
  }
  const tex=new THREE.CanvasTexture(cv);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  tex.repeat.set(dirt?1:10,dirt?1:10);
  return tex;
 }
 const grassTexture=terrainTexture('grass'),earthTexture=terrainTexture('earth');
 const grassSurface=new THREE.MeshStandardMaterial({map:grassTexture,roughness:1});
 const dirtSurface=new THREE.MeshStandardMaterial({map:earthTexture,roughness:1});
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(N*CELL,N*CELL),grassSurface);
 ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;root.add(ground);
 // Bordas naturais fora da área edificável; nenhuma árvore fixa bloqueia células.
 const exterior=new THREE.Mesh(new THREE.PlaneGeometry(N*CELL+170,N*CELL+170),material('#507448'));
 exterior.rotation.x=-Math.PI/2;exterior.position.y=-0.13;exterior.receiveShadow=true;root.add(exterior);
 function box(parent,w,h,d,c,x=0,y=0,z=0,cast=true){
  const m=new THREE.Mesh(geom(w,h,d),material(c));m.position.set(x,y,z);
  m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;
 }
 const pos=(x,y,w=1,h=1)=>new THREE.Vector3((x+w/2)*CELL-HALF,0,(y+h/2)*CELL-HALF);

 const grasses=new THREE.Group();root.add(grasses);
 const earthy=['#94704b','#98724c','#9e7950','#a17c53','#8b6747'];
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const p=pos(x,y),seed=landscape.hash(x,y,13),isRoad=landscape.isRoad(x,y);
  if(isRoad){
   // Fundo escuro e terra batida de bordas contínuas, substituindo a malha clara.
   box(streets,CELL*1.035,.075,CELL*1.035,'#775a3d',p.x,.053,p.z,false);
   const earthTile=box(streets,CELL*.975,.055,CELL*.975,
    landscape.plaza.has(landscape.key(x,y))?'#ad9269':earthy[Math.floor(seed*earthy.length)],
    p.x,.103,p.z,false);
   earthTile.material=dirtSurface;
   const east=landscape.isRoad(x+1,y),west=landscape.isRoad(x-1,y);
   const north=landscape.isRoad(x,y-1),south=landscape.isRoad(x,y+1);
   const horizontal=(east||west)&&!(north&&south),vertical=(north||south)&&!(east&&west);
   if(horizontal||vertical)for(const side of [-1,1]){
    const offset=side*CELL*.29;
    box(streets,horizontal?CELL*.99:.095,.012,horizontal?.095:CELL*.99,
     '#7b5939',p.x+(horizontal?0:offset),.140,p.z+(horizontal?offset:0),false);
   }
   for(let i=0;i<3;i++){
    const rx=(landscape.hash(x,y,21+i)-.5)*CELL*.82;
    const rz=(landscape.hash(x,y,31+i)-.5)*CELL*.78;
    const width=.18+landscape.hash(x,y,43+i)*.48;
    box(streets,width,.015,.15,i%2?'#b69568':'#785a41',
     p.x+rx,.143,p.z+rz,false);
   }
  }else if(!layout.isCore(x,y)&&!lotCells.has(landscape.key(x,y))){
   if(seed>.31){
    const a=landscape.hash(x,y,9),b=landscape.hash(x,y,12);
    const green=landscape.isForest(x,y)?'#4c7645':(seed>.70?'#91a667':'#719257');
    cylinder(grasses,.26+seed*.44,.027,green,
     p.x+(a-.5)*CELL*.65,.035,p.z+(b-.5)*CELL*.65,8);
   }
   if(landscape.isForest(x,y)){
    cylinder(grasses,CELL*.44,.018,'#62834c',p.x,.023,p.z,9);
    for(let i=0;i<3;i++){
     const dx=(landscape.hash(x,y,i+45)-.5)*CELL;
     const dz=(landscape.hash(x,y,i+51)-.5)*CELL;
     box(grasses,.18,.16,.23,i%2?'#647f45':'#8e9857',
      p.x+dx,.095,p.z+dz,false);
    }
   }
  }
 }
 const walkers=new THREE.Group();scene.add(walkers);
 const hash=(x,y,s=0)=>{let n=Math.imul(x+17,73856093)^Math.imul(y+23,19349663)^Math.imul(s+41,83492791);return ((n^(n>>>13))>>>0)/4294967295};
 function cone(parent,r,height,sides,c,x=0,y=0,z=0){
  const m=new THREE.Mesh(new THREE.ConeGeometry(r,height,sides),material(c));
  m.userData.ownGeometry=true;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
 }
 function cylinder(parent,r,h,c,x=0,y=0,z=0,sides=10){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.08,h,sides),material(c));
  m.userData.ownGeometry=true;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
 }
 function gable(parent,w,d,eaves,rise,c){
  const shape=new THREE.BufferGeometry();
  const v=[
   -w/2,eaves,-d/2, 0,eaves+rise,-d/2, 0,eaves+rise,d/2,
   -w/2,eaves,-d/2, 0,eaves+rise,d/2, -w/2,eaves,d/2,
   0,eaves+rise,-d/2, w/2,eaves,-d/2, w/2,eaves,d/2,
   0,eaves+rise,-d/2, w/2,eaves,d/2, 0,eaves+rise,d/2,
   -w/2,eaves,-d/2, w/2,eaves,-d/2, 0,eaves+rise,-d/2,
   -w/2,eaves,d/2, 0,eaves+rise,d/2, w/2,eaves,d/2
  ];
  shape.setAttribute('position',new THREE.Float32BufferAttribute(v,3));shape.computeVertexNormals();
  const mat=new THREE.MeshStandardMaterial({color:c,roughness:0.86,side:THREE.DoubleSide});
  const roof=new THREE.Mesh(shape,mat);roof.castShadow=true;roof.receiveShadow=true;roof.userData.ownGeometry=true;roof.userData.ownMaterial=true;parent.add(roof);
  box(parent,0.13,0.12,d+0.24,'#ddad74',0,eaves+rise,0);
  // Telhas de barro sobre a inclinação do telhado e testeiras esculpidas.
  for(let row=0;row<5;row++){
   const z=-d*.42+row*d*.21;
   for(const side of [-1,1]){
    const beam=box(parent,w*.43,.055,.08,row%2?'#be8762':'#d29a73',
     side*w*.24,eaves+rise*(.52-row*.018),z,false);
    beam.rotation.z=side*-Math.atan2(rise,w/2);
   }
  }
  for(const z of [-d*.48,d*.48]){
   box(parent,w*.97,.10,.14,'#6d4830',0,eaves-.06,z);
  }
  for(let i=1;i<6;i++){
   const zz=-d/2+i*d/6;
   for(const side of [-1,1]){
    const beam=box(parent,0.10,0.045,0.11,'#bc784a',side*w*.32,eaves+rise*.36+.05,zz,false);
    beam.rotation.z=side*-Math.atan2(rise,w/2);
   }
  }
 }
 function timberHouse(g,b){
  const [bw,bh]=layout.size(b),w=Math.max(2,bw*CELL-.52),d=Math.max(2,bh*CELL-.52);
  const lv=architectureAt(b.level).tier,seed=hash(b.x,b.y);
  const height=2.6+Math.min(1.8,lv*.28)+(seed>.66?.6:0);
  const walls=seed>.62?'#ddd0af':seed>.3?'#ddc6a0':'#bfb5a0';
  box(g,w,height,d,walls,0,height/2,0);
  box(g,w+.22,.23,d+.22,'#9e9179',0,.12,0);
  const wood='#5c4835';
  for(const x of [-w/2+.12,w/2-.12]){
   box(g,.19,height,.19,wood,x,height/2,d/2+.05);
   box(g,.19,height,.19,wood,x,height/2,-d/2-.05);
  }
  for(const z of [-d/2+.12,d/2-.12]){
   box(g,.19,height,.19,wood,w/2+.05,height/2,z);
   box(g,.19,height,.19,wood,-w/2-.05,height/2,z);
  }
  box(g,w,.16,.16,wood,0,height*.82,d/2+.08);
  for(const x of [-w*.32,w*.32]){
   box(g,.50,.66,.12,'#504d43',x,height*.54,d/2+.13);
   box(g,.32,.47,.13,'#b7d0c0',x,height*.54,d/2+.21);
   box(g,.06,.54,.14,wood,x,height*.54,d/2+.24);
  }
  box(g,.92,1.58,.17,'#6e4832',0,.79,d/2+.13);
  box(g,.10,.10,.10,'#e8c675',.26,.92,d/2+.26);
  const roofs=['#994a37','#aa6540','#815348','#ad674b'];
  gable(g,w+.7,d+.7,height,.95+Math.min(0.5,lv*.1),roofs[Math.floor(seed*4)]);
  box(g,.58,.65,.58,'#aaa494',w*.29,height+.55,-d*.17);
  box(g,.64,.12,.64,'#7a493b',w*.29,height+.88,-d*.17);
 }
 function cropPatch(g,x,z,size,c){
  box(g,size,.11,size*.65,'#715536',x,.075,z);
  for(let j=-2;j<=2;j++)for(let i=-3;i<=3;i++){
   const m=box(g,.06,.42+(i+j+7)%3*.1,.06,c,x+i*(size/8),.32,z+j*(size/14),false);
   m.rotation.z=.12*(i%3-1);
  }
 }
 function fence(g,w,d){
  for(const zz of [-d/2,d/2])for(let i=-w/2;i<=w/2;i+=1.05)box(g,.15,.68,.15,'#9e7851',i,.34,zz);
  for(const xx of [-w/2,w/2])for(let i=-d/2;i<=d/2;i+=1.05)box(g,.15,.68,.15,'#9e7851',xx,.34,i);
 }
 function farm(g,b){
  const [w,h]=layout.size(b),bw=w*CELL-.3,bh=h*CELL-.3;
  box(g,bw,.1,bh,'#7d9c60',0,.06,0);
  const barn=new THREE.Group();barn.position.set(-bw*.18,0,-bh*.2);g.add(barn);
  box(barn,bw*.51,2.7,bh*.42,'#d0b08b',0,1.35,0);
  gable(barn,bw*.51+.35,bh*.42+.4,2.7,1.05,'#a64e38');
  box(barn,.8,1.7,.12,'#694837',0,.85,bh*.21);
  for(const [x,z]of [[bw*.16,bh*.10],[bw*.22,-bh*.20],[-bw*.20,bh*.24]]){
   cropPatch(g,x,z,Math.max(1.45,bw*.3),'#9bb15d');
  }
  cylinder(g,.64,.65,'#d6b36d',bw*.30,.36,bh*.34,12);
  fence(g,bw*.95,bh*.95);
 }
 function barracks(g,b){
  const [w,h]=layout.size(b),bw=w*CELL-.4,bh=h*CELL-.42;
  box(g,bw,3.5,bh,'#a6a59c',0,1.75,0);
  for(let i=0;i<5;i++)box(g,bw+.09,.12,.13,'#7f847e',0,.6+i*.53,bh/2+.02);
  gable(g,bw+.75,bh+.6,3.5,1.15,'#656d75');
  for(let i=-2;i<=2;i++){
   box(g,.47,.8,.13,'#3f464a',i*bw/6,2.0,bh/2+.13);
   box(g,.30,.59,.14,'#c8b57b',i*bw/6,2.0,bh/2+.22);
  }
  box(g,1.35,2.4,.21,'#614333',0,1.2,bh/2+.16);
  for(const x of [-bw*.42,bw*.42]){
   box(g,.14,4.3,.14,'#5a5144',x,2.15,bh/2+.32);
   box(g,.92,1.2,.08,x<0?'#a55239':'#526c91',x,3.5,bh/2+.36);
  }
  const square=box(g,bw*.65,.1,1.05,'#b4a88a',0,.09,bh/2+.82,false);
  square.receiveShadow=true;
 }
 function tower(g,b){
  const age=architectureAt(b.level),lv=age.tier,r=Math.min(...layout.size(b))*CELL*.37;
  const h=5+lv*.7+age.growth*1.1;
  cylinder(g,r,h,'#a7aa9d',0,h/2,0,12);
  cylinder(g,r+0.14,.24,'#c2c4b2',0,h+.09,0,12);
  for(let i=0;i<12;i++){
   const angle=i*Math.PI/6;
   const block=box(g,.48,.56,.42,'#b5b6a6',Math.cos(angle)*r,h+.4,Math.sin(angle)*r);
   block.rotation.y=-angle;
  }
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4;
   box(g,.2,.72,.11,'#373d39',Math.cos(a)*(r+.04),h*.60,Math.sin(a)*(r+.04));
  }
  cone(g,r+.26,1.75,12,'#795045',0,h+1.24,0);
  box(g,.13,1.5,.13,'#594b37',0,h+2.4,0);
  box(g,.8,.51,.09,'#cba65c',.36,h+2.8,0);
 }
 function market(g,b){
  const [w,h]=layout.size(b),bw=w*CELL-.42,bh=h*CELL-.42;
  box(g,bw,.15,bh,'#baa986',0,.09,0);
  const tones=['#b65c42','#7a9c89','#c8a061','#6a7694'];
  for(let n=0;n<4;n++){
   const x=(n%2?1:-1)*bw*.24,z=(n>1?1:-1)*bh*.22;
   box(g,bw*.4,.76,bh*.35,'#916d4d',x,.38,z);
   for(const xx of [-bw*.18,bw*.18])for(const zz of [-bh*.15,bh*.15])
    box(g,.16,2,.16,'#65513b',x+xx,1,z+zz);
   const awning=box(g,bw*.46,.16,bh*.38,tones[n],x,2.04,z);
   awning.rotation.z=n%2?.13:-.13;
   for(let i=0;i<4;i++)cone(g,.18,.48,7,n%2?'#b5a05d':'#859756',x-bw*.13+i*.34,.9,z);
  }
  box(g,1.1,.55,.9,'#795938',0,.3,0);
 }

 // Ornamentos de evolução: cada ramo possui silhueta própria.
 // Adicionais não alteram footprint, colisão nem posição salva do lote.
 function evolveBuilding(g,b){
  const age=architectureAt(b.level),tier=age.stage;
  const [fw,fh]=layout.size(b),w=fw*CELL-.5,d=fh*CELL-.5;
  const c=age.palette,front=d/2+.06;
  if(tier===0)return;
  // Pedra lavrada na fundação distingue a primeira ampliação.
  for(const x of [-w*.36,w*.36])box(g,.36,.27,.36,c.trim,x,.24,front);
  if(b.type==='house'){
   box(g,w*.68,.16,.22,c.trim,0,2.25,front+.04);
   if(tier>=2){
    for(const x of [-w*.29,w*.29]){
     box(g,.7,.80,.22,'#554739',x,3.20,front+.07);
     box(g,.49,.57,.24,'#b4d4d5',x,3.20,front+.17);
    }
   }
   if(tier>=3){
    cylinder(g,.33,1.65,c.stone,w*.27,4.75,-d*.17,8);
    cone(g,.51,.85,8,c.roof,w*.27,6.0,-d*.17);
   }
   if(tier>=4){
    for(const x of [-w*.42,w*.42]){
     box(g,.12,2,.12,c.metal,x,4.65,front-.15);
     box(g,.62,.72,.09,c.banner,x+.26,5.05,front-.15);
    }
   }
   if(tier>=5){box(g,.84,.36,.3,c.metal,0,5.20,front);cone(g,.40,.65,8,c.metal,0,5.74,front);}
  }else if(b.type==='farm'){
   const x=w*.28,z=-d*.26;
   cylinder(g,.52,2.8,c.stone,x,1.4,z,10);
   cone(g,.69,.9,10,c.roof,x,3.25,z);
   if(tier>=2){
    box(g,w*.32,.17,d*.40,c.trim,-w*.20,.22,d*.26);
    for(let n=0;n<4;n++)box(g,.12,.92,.12,'#d8bc72',-w*.33+n*.3,.64,d*.26);
   }
   if(tier>=3){
    box(g,.20,3,.20,c.metal,-w*.27,3.45,-d*.25);
    for(let n=0;n<4;n++){
     const blade=box(g,.16,1.3,.13,'#c3aa7d',-w*.27,4.95,-d*.25,false);
     blade.rotation.z=n*Math.PI/2;blade.position.x+=Math.sin(n*Math.PI/2)*.60;
     blade.position.y+=Math.cos(n*Math.PI/2)*.60;
    }
   }
   if(tier>=4){box(g,w*.33,1.45,.24,c.stone,0,.8,front-.08);box(g,w*.35,.2,.34,c.roof,0,1.61,front);}
   if(tier>=5)cone(g,.55,.8,8,c.metal,x,3.97,z);
  }else if(b.type==='barracks'){
   for(const x of [-w*.38,w*.38]){
    cylinder(g,.35,2.7,c.stone,x,1.38,front,8);
    box(g,.9,.28,.7,c.trim,x,2.8,front);
   }
   if(tier>=2){
    for(const x of [-w*.43,w*.43]){
     cylinder(g,.54,4.05,c.stone,x,2.03,-d*.34,8);
     cone(g,.67,1.2,8,c.roof,x,4.70,-d*.34);
    }
   }
   if(tier>=3){
    for(const x of [-w*.24,w*.24]){
     box(g,.13,2.6,.13,c.metal,x,5.06,front-.16);
     box(g,.9,.85,.1,c.banner,x+.42,5.65,front-.16);
    }
   }
   if(tier>=4){
    box(g,w*.55,.38,.28,c.trim,0,3.42,front);
    for(let i=-2;i<=2;i++)box(g,.4,.5,.3,c.metal,i*w*.09,3.87,front);
   }
   if(tier>=5){cone(g,.67,1.15,8,c.metal,0,5.3,-d*.28);box(g,.11,1.3,.11,c.metal,0,6.45,-d*.28);}
  }else if(b.type==='tower'){
   const h=5+age.tier*.7+age.growth*1.1;
   for(const y of [h*.28,h*.48,h*.68])cylinder(g,Math.min(fw,fh)*CELL*.38,.17,c.trim,0,y,0,12);
   if(tier>=2){
    for(let a=0;a<4;a++){
     const angle=a*Math.PI/2,r=Math.min(fw,fh)*CELL*.37;
     box(g,.7,1.25,.20,c.metal,Math.sin(angle)*r,h*.75,Math.cos(angle)*r);
    }
   }
   if(tier>=3){
    for(const x of [-.73,.73]){
     cylinder(g,.27,1.3,c.stone,x,h+.46,0,8);
     cone(g,.40,.75,8,c.roof,x,h+1.51,0);
    }
   }
   if(tier>=4){
    box(g,.11,2.5,.11,c.metal,0,h+3,0);
    box(g,.85,.77,.12,c.banner,.43,h+3.55,0);
   }
   if(tier>=5){cone(g,.34,.95,8,c.metal,0,h+4.5,0);}
  }else if(b.type==='market'){
   for(const x of [-w*.35,w*.35])for(const z of [-d*.34,d*.34]){
    cylinder(g,.18,2.6,c.stone,x,1.35,z,8);
    box(g,.65,.20,.65,c.trim,x,2.75,z);
   }
   if(tier>=2){
    box(g,w*.80,.19,d*.60,c.roof,0,2.89,0);
    box(g,w*.72,.11,d*.52,c.trim,0,3.06,0);
   }
   if(tier>=3){
    cylinder(g,.39,1.4,c.stone,0,3.78,0,10);
    cone(g,.58,1.3,10,c.roof,0,5.13,0);
   }
   if(tier>=4){
    for(const x of [-w*.25,w*.25]){
     box(g,.12,1.6,.12,c.metal,x,3.86,front-.2);
     box(g,.60,.60,.09,c.banner,x+.28,4.27,front-.2);
    }
   }
   if(tier>=5){cone(g,.32,.70,8,c.metal,0,6.05,0);}
  }
 }

 function castle(g,level=1){
  const age=architectureAt(level),tier=age.stage,c=age.palette;
  const w=layout.CORE.w*CELL,d=layout.CORE.h*CELL;
  const keepH=7.2+tier*.8+age.growth*.7;
  const towerH=8.5+tier*.85+age.growth*.55;
  const wallH=3.4+tier*.32;
  g.userData.architectureTier=age.tier;
  // Mesmo footprint central 4x4; a evolução acontece verticalmente.
  box(g,w,.26,d,c.trim,0,.13,0);
  box(g,w*.53,keepH,d*.52,c.stone,0,keepH/2+.12,-.35);
  gable(g,w*.54,d*.54,keepH+.12,2.45+tier*.13,c.roof);
  for(let i=0;i<4;i++)for(const xx of [-w*.31,w*.31]){
   const y=2+i*(keepH-1.8)/4;
   box(g,.92,1.28,.16,'#4a535a',xx,y,d*.265);
   box(g,.68,1.01,.19,tier>=3?'#c9e0e7':'#c5c29b',xx,y,d*.275);
  }
  const off=w*.43;
  for(const [x,z]of [[-off,-off],[-off,off],[off,-off],[off,off]]){
   cylinder(g,1.46,towerH,c.stone,x,towerH/2+.03,z,12);
   cylinder(g,1.72,.38,c.trim,x,towerH+.12,z,12);
   for(let i=0;i<10;i++){
    const a=i*Math.PI/5;
    box(g,.57,.74,.45,c.trim,x+Math.cos(a)*1.45,towerH+.58,z+Math.sin(a)*1.45);
   }
   cone(g,1.84,2.3+tier*.15,12,c.roof,x,towerH+1.68+tier*.075,z);
   if(tier>=3){
    cylinder(g,.13,1.1,c.metal,x,towerH+3.12+tier*.18,z,8);
    cone(g,.24,.49,8,c.metal,x,towerH+3.87+tier*.18,z);
   }
  }
  for(const z of [-d*.43,d*.43]){
   box(g,w*.78,wallH,.46,c.stone,0,wallH/2,z);
   for(let i=-4;i<=4;i++)box(g,.6,.62,.54,c.trim,i*w*.075,wallH+.30,z);
  }
  for(const x of [-w*.43,w*.43]){
   box(g,.46,wallH,d*.80,c.stone,x,wallH/2,0);
   for(let i=-4;i<=4;i++)box(g,.54,.63,.60,c.trim,x,wallH+.30,i*d*.075);
  }
  // Portão principal permanece no mesmo local, sem modificar a célula do castelo.
  box(g,2.55,3.1,.6,'#593e30',0,1.55,d*.44);
  for(const x of [-2.6,2.6]){
   box(g,.12,4.2+tier*.2,.12,c.metal,x,keepH+.95,-d*.16);
   box(g,1.2,.84,.12,c.banner,x+.56,keepH+2.25+tier*.1,-d*.16);
  }
  box(g,3,.4,2.9,c.trim,0,.3,d*.47);
  if(tier>=1){
   // Torres do portão e arco defensivo.
   for(const x of [-1.65,1.65]){
    cylinder(g,.76,4+tier*.30,c.stone,x,2+tier*.15,d*.39,10);
    cone(g,.88,1.10,10,c.roof,x,4.65+tier*.3,d*.39);
   }
   box(g,3.65,.37,.55,c.trim,0,4.0+tier*.2,d*.4);
  }
  if(tier>=2){
   // Contrafortes e frisos de pedra; domínio militar estabelecido.
   for(const x of [-w*.23,w*.23]){
    box(g,.56,keepH*.70,.61,c.trim,x,keepH*.36,-d*.26);
    box(g,.78,.32,.72,c.metal,x,keepH*.73,-d*.26);
   }
   for(let i=-3;i<=3;i++)box(g,.49,.4,.27,c.trim,i*w*.065,wallH+.82,d*.43);
  }
  if(tier>=3){
   // Salões elevados com vitrais, escadaria e um corpo central mais nobre.
   box(g,w*.25,2.05,d*.30,c.stone,0,keepH+.18,-.35);
   gable(g,w*.28,d*.34,keepH+1.24,1.05,c.roof);
   for(const x of [-1.10,0,1.10]){
    box(g,.56,1.1,.18,'#455769',x,keepH*.72,d*.276);
    box(g,.35,.85,.20,'#84c7d5',x,keepH*.72,d*.29);
   }
  }
  if(tier>=4){
   // Torre do estandarte e ornamentos da capital imperial.
   const y=keepH+3.6;
   cylinder(g,.58,3.05,c.trim,0,y-1.28,-.35,12);
   cone(g,.86,1.75,12,c.roof,0,y+.97,-.35);
   cylinder(g,.11,1.65,c.metal,0,y+2.63,-.35,8);
   box(g,1.15,.84,.1,c.banner,.55,y+3.10,-.35);
   for(const x of [-w*.18,w*.18])box(g,.36,.30,.43,c.metal,x,wallH+.33,d*.44);
  }
  if(tier>=5){
   // Coroa lendária: pináculos de ouro e uma ponte ornamentada.
   for(const x of [-w*.20,0,w*.20]){
    cone(g,.32,1.10,8,c.metal,x,keepH+3.24,-d*.18);
    box(g,.14,.78,.14,c.metal,x,keepH+4.05,-d*.18);
   }
   for(const x of [-1.05,1.05])box(g,.18,1.8,.18,c.metal,x,2.5,d*.47);
   box(g,3.15,.22,1.1,c.metal,0,.52,d*.46);
  }
 }
 function littleTree(parent,x,z,seed){
  const t=new THREE.Group();t.position.set(x,0,z);parent.add(t);
  cylinder(t,.14,1.5,'#69503c',0,.75,0,6);
  if(seed>.4){
   const s=.9+seed*.85;
   for(let n=0;n<3;n++)cone(t,s-n*.16,1.6,7,n%2?'#4a7d51':'#3f734c',0,1.65+n*.75,0);
  }else{
   const green=seed>.19?'#547f52':'#6c9156';
   const canopy=new THREE.Mesh(new THREE.IcosahedronGeometry(1.05+seed,.65?1:0),material(green));
   canopy.position.y=2.35;canopy.castShadow=true;canopy.userData.ownGeometry=true;t.add(canopy);
  }
 }
 function lamp(parent,x,z){
  cylinder(parent,.065,1.8,'#6b5c47',x,.9,z,8);
  const globe=new THREE.Mesh(new THREE.SphereGeometry(.22,8,7),new THREE.MeshStandardMaterial({color:'#fff0b1',emissive:'#ffd18a',emissiveIntensity:.55}));
  globe.position.set(x,1.91,z);globe.userData.ownGeometry=true;globe.userData.ownMaterial=true;parent.add(globe);
 }
 const coreGroup=new THREE.Group();coreGroup.position.copy(pos(layout.CORE.x,layout.CORE.y,layout.CORE.w,layout.CORE.h));root.add(coreGroup);castle(coreGroup,1);
 // A antiga malha de pedra foi substituída pela rede de caminhos de terra.
 const ghost=new THREE.Mesh(geom(CELL,.11,CELL),new THREE.MeshBasicMaterial({color:'#67db88',transparent:true,opacity:.34,depthWrite:false}));
 ghost.visible=false;ghost.position.y=.12;scene.add(ghost);
 const highlight=new THREE.LineSegments(new THREE.EdgesGeometry(geom(CELL,.11,CELL)),new THREE.LineBasicMaterial({color:'#eff9df'}));
 highlight.visible=false;scene.add(highlight);
 let buildings=[],selection=null,army={},buildLevel=1,raf=0,destroyed=false,hover=null;
 function disposeGroup(group){
  for(const o of [...group.children]){group.remove(o);o.traverse(n=>{
   if(n.userData.ownGeometry)n.geometry?.dispose();
   if(n.userData.ownMaterial)n.material?.dispose();
  })}
 }
 function littleShrub(parent,x,z,seed){
  const group=new THREE.Group();group.position.set(x,0,z);parent.add(group);
  const foliage=['#395f35','#4d7944','#6d8a48'];
  for(let i=0;i<3;i++){
   const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.31+seed*.24,0),material(foliage[i]));
   mesh.position.set((i-1)*.31,.35+(i%2)*.12,((i+1)%3-1)*.30);
   mesh.castShadow=true;mesh.userData.ownGeometry=true;group.add(mesh);
  }
 }
 function townWell(parent,x,z){
  const well=new THREE.Group();well.position.set(x,0,z);parent.add(well);
  cylinder(well,.75,.72,'#978875',0,.39,0,10);
  cylinder(well,.61,.10,'#c1b5a0',0,.78,0,10);
  cylinder(well,.42,.035,'#394f54',0,.83,0,10);
  for(const dx of [-.64,.64])box(well,.12,2.25,.14,'#705139',dx,1.78,0);
  gable(well,1.8,1.70,2.70,.72,'#995c3f');
 }
 function cart(parent,x,z,seed){
  const g=new THREE.Group();g.position.set(x,.15,z);g.rotation.y=seed*6.2;parent.add(g);
  box(g,1.5,.38,.93,'#9b6239',0,.62,0);
  box(g,1.34,.2,.75,'#bb8750',0,.84,0);
  for(const x of [-.53,.53])for(const z of [-.56,.56]){
   cylinder(g,.24,.1,'#4c3f2e',x,.32,z,10).rotation.x=Math.PI/2;
  }
  box(g,.14,.13,1.16,'#644c34',0,.58,1.10);
  for(let i=0;i<3;i++)box(g,.34,.4,.31,i%2?'#b8a075':'#90754d',
   -.4+i*.39,1.16,-.11,false);
 }
 function freshDecor(){
  disposeGroup(decor);
  // Construções antigas preservam suas coordenadas e também ganham solo limpo.
  const free=(x,y)=>!layout.isCore(x,y)&&!layout.lotAt(x,y)&&
   !layout.at(buildings,x,y)&&!landscape.isRoad(x,y);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
   if(!free(x,y))continue;
   const seed=landscape.hash(x,y,3),p=pos(x,y);
   if(landscape.isForest(x,y)){
    if(seed>.49)littleTree(decor,p.x+(landscape.hash(x,y,6)-.5)*CELL*.58,
     p.z+(landscape.hash(x,y,7)-.5)*CELL*.58,seed);
    else if(seed>.18)littleShrub(decor,p.x,p.z,seed);
    if(seed<.18)box(decor,.70,.27,.60,'#817e64',p.x,.16,p.z);
   }else if(seed>.78)littleShrub(decor,p.x,p.z,seed*.75);
  }
  // Bosques densos circundam a cidade, fora da malha 26×26 de construções.
  // A mata externa cria profundidade sem jamais cobrir um lote.
  for(let ring=0;ring<3;ring++)for(let i=0;i<44;i++){
   const edge=i%4,along=(Math.floor(i/4)+landscape.hash(i,ring,4)*.7)/11*2*HALF-HALF;
   const outward=HALF+2+ring*3.35+landscape.hash(i,ring,6)*2.3;
   const x=edge===0?-outward:edge===1?outward:along;
   const z=edge===2?-outward:edge===3?outward:along;
   const value=landscape.hash(i,ring,13);
   if(value>.13)littleTree(decor,x,z,value);
   else littleShrub(decor,x,z,value+.45);
  }
  // Mobiliário urbano em pontos da praça e caminhos, sem ocupar parcelas.
  const square=[...landscape.plaza].map(k=>k.split(':').map(Number))
   .filter(([x,y])=>!layout.at(buildings,x,y));
  const wellSpot=square.find(([x,y])=>x===layout.CORE.x-1&&y===layout.CORE.y+2);
  if(wellSpot){
   const p=pos(...wellSpot);townWell(decor,p.x,p.z);
  }
  for(let i=0;i<square.length;i++){
   if(i%5!==1)continue;
   const [x,y]=square[i];
   if(wellSpot&&x===wellSpot[0]&&y===wellSpot[1])continue;
   const p=pos(x,y);lamp(decor,p.x+CELL*.34,p.z+CELL*.32);
  }
  let placed=0;
  for(const k of landscape.road){
   if(placed>=9)break;
   const [x,y]=k.split(':').map(Number),seed=landscape.hash(x,y,29);
   if(seed<.93||landscape.plaza.has(k)||layout.at(buildings,x,y))continue;
   const p=pos(x,y);
   if(seed>.985)cart(decor,p.x,p.z,seed);
   else lamp(decor,p.x+CELL*.32,p.z+CELL*.33);
   placed++;
  }
 }
 function drawBuilding(b,parent){
  const [w,h]=layout.size(b),g=new THREE.Group();
  g.position.copy(pos(b.x,b.y,w,h));
  g.userData.building=b;
  const age=architectureAt(b.level);
  g.userData.architectureTier=age.tier;
  g.userData.completedHeightScale=1+age.growth*.28;
  g.scale.y=g.userData.completedHeightScale;
  parent.add(g);
  if(b.type==='house')timberHouse(g,b);
  else if(b.type==='farm')farm(g,b);
  else if(b.type==='barracks')barracks(g,b);
  else if(b.type==='tower')tower(g,b);
  else if(b.type==='market')market(g,b);
  evolveBuilding(g,b);
  return g;
 }
 const activeSites=new Map();
 let serverOffset=0;
 const keyFor=b=>b.type+':'+b.x+':'+b.y;
 const timerText=ms=>{const sec=Math.ceil(Math.max(0,ms)/1000);return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')};
 function makeSite(building,key,local=false){
  const [w,h]=layout.size(building),p=pos(building.x,building.y,w,h);
  const group=new THREE.Group();workMeshes.add(group);
  box(group,w*CELL-.18,.18,h*CELL-.18,'#b4a37d',p.x,.1,p.z,false);
  const scaffold=new THREE.Group();group.add(scaffold);
  const bw=w*CELL*.44,bh=h*CELL*.44;
  for(const xx of [-bw,bw])for(const zz of [-bh,bh])
   box(scaffold,.14,4.9,.14,'#9a7047',p.x+xx,2.45,p.z+zz);
  for(const height of [1.2,2.9,4.5]){
   for(const z of [-bh,bh])box(scaffold,2*bw+.18,.13,.13,'#c09965',p.x,height,p.z+z);
   for(const x of [-bw,bw])box(scaffold,.13,.13,2*bh+.18,'#c09965',p.x+x,height,p.z);
  }
  const model=drawBuilding(building,group);model.visible=false;
  const label=document.createElement('div');label.className='guild3d-site-label';label.dataset.siteKey=key;
  const name=document.createElement('strong');
  name.textContent=({house:'Casario',farm:'Fazenda',market:'Mercado',tower:'Torre',barracks:'Quartel'})[building.type]||'Obra';
  const timer=document.createElement('span');timer.className='guild3d-site-timer';timer.textContent=local?'00:00*':'00:00';
  const bar=document.createElement('div');bar.className='guild3d-site-rail';const fill=document.createElement('span');bar.append(fill);
  const stage=document.createElement('small');stage.textContent=local?'Preparando obra':'Fundação';
  label.append(name,timer,bar,stage);labels.append(label);
  return {building,key,p,group,model,scaffold,label,timer,fill,stage,local,lastText:''};
 }
 function deleteSite(site){
  site.label.remove();
  disposeGroup(site.group);
  workMeshes.remove(site.group);
 }
 function syncSites(buildings){
  const valid=new Set();
  for(const b of buildings){
   // O fim do cronômetro NÃO é a confirmação do backend. Manter o canteiro
   // visível até receber status='complete' num kingdomState autoritativo.
   if(b.status!=='building'||!Number.isSafeInteger(b.endsAt))continue;
   const key=keyFor(b);valid.add(key);
   if(activeSites.has(key)){activeSites.get(key).building=b;continue}
   activeSites.set(key,makeSite(b,key));
  }
  for(const [key,site]of activeSites){
   if(valid.has(key))continue;
   deleteSite(site);activeSites.delete(key);
  }
 }
 let lastBuildingState=null;
 function paintLotFoundations(){
  disposeGroup(lotsGroup);
  const all=[...buildings,...[...pendingVisuals.values()].map(entry=>entry.building)];
  for(const lot of layout.slots){
   if(layout.lotStatus(lot,all,buildLevel)==='occupied')continue;
   const locked=lot.unlockLevel>buildLevel;
   const p=pos(lot.x,lot.y,lot.w,lot.h),w=lot.w*CELL-.30,d=lot.h*CELL-.30;
   const group=new THREE.Group();group.position.copy(p);lotsGroup.add(group);
   group.userData.lot=lot;
   // Clareiras terrosas e canteiros, substituindo o concreto em xadrez.
   const soil=locked?'#6f8d5b':
    lot.type==='farm'?'#836b43':lot.type==='barracks'||lot.type==='tower'?'#83775d':
    lot.type==='market'?'#a08a61':'#8b7859';
   box(group,w,.055,d,soil,0,.045,0,false);
   const tone=locked?'#82966b':
    lot.type==='farm'?'#bcaf72':lot.type==='barracks'||lot.type==='tower'?'#b0a08a':
    lot.type==='market'?'#d7b77c':'#bea97e';
   // Pequenas estacas nos vértices delimitam o espaço sem ocultar a paisagem.
   for(const x of [-w*.48,w*.48])for(const z of [-d*.48,d*.48]){
    box(group,.17,.43,.17,locked?'#657450':'#8b704b',x,.27,z,false);
    box(group,.26,.09,.26,tone,x,.50,z,false);
   }
   for(const z of [-d*.49,d*.49])box(group,w*.94,.045,.07,tone,0,.14,z,false);
   for(const x of [-w*.49,w*.49])box(group,.07,.045,d*.92,tone,x,.14,0,false);
   if(!locked){
    // O símbolo discreto marca o terreno livre, mas não parece uma construção.
    const sign=box(group,.56,.055,.56,tone,0,.14,0,false);
    sign.rotation.y=Math.PI/4;
    if(lot.type==='farm')for(let row=0;row<3;row++){
     const z=-d*.25+row*d*.24;
     box(group,w*.52,.040,.15,row%2?'#b18c51':'#9d7840',0,.13,z,false);
    }
   }
  }
  renderer.domElement.dataset.availableLots=String(layout.availableLots(buildLevel)
   .filter(l=>layout.lotStatus(l,all,buildLevel)==='empty').length);
 }

 const lockedGroup=new THREE.Group();scene.add(lockedGroup);
  const lockedMaterial=new THREE.MeshBasicMaterial({color:'#384347',transparent:true,opacity:.26,depthWrite:false});
  let previousLevel=0;
  function displayUnlockedLand(level){
   if(previousLevel===level)return;previousLevel=level;
   for(const child of [...lockedGroup.children]){lockedGroup.remove(child);child.geometry.dispose()}
   const bounds=layout.bounds(level),min=bounds.min,max=bounds.max+1;
   const sections=[[0,0,N,min],[0,max,N,N-max],[0,min,min,max-min],[max,min,N-max,max-min]];
   for(const [x,y,w,h]of sections){
    if(w<=0||h<=0)continue;
    const tile=new THREE.Mesh(new THREE.PlaneGeometry(w*CELL,h*CELL),lockedMaterial);
    tile.rotation.x=-Math.PI/2;
    tile.position.set((x+w/2)*CELL-HALF,.043,(y+h/2)*CELL-HALF);
    lockedGroup.add(tile);
   }
   renderer.domElement.dataset.buildBounds=bounds.min+':'+bounds.max;
   renderer.domElement.dataset.fortressLevel=String(level);
  }
 function updateBuildings(next=[],nextArmy={},serverNow=null,level=1){
  if(Number.isSafeInteger(serverNow))serverOffset=serverNow-Date.now();
  const nextBuildings=Array.isArray(next)?next.filter(b=>b&&layout.footprints[b.type]&&Number.isSafeInteger(b.x)&&Number.isSafeInteger(b.y)).slice(0,120):[];
  const nextArmyState=nextArmy||{};
  const nextLevel=architectureAt(level).level;
  const fingerprint=JSON.stringify([nextBuildings,nextArmyState,nextLevel]);
  // Evitar recriar dezenas de modelos 3D a cada snapshot do servidor.
  if(fingerprint===lastBuildingState)return;
  lastBuildingState=fingerprint;
  buildLevel=nextLevel;displayUnlockedLand(buildLevel);
  // O castelo central precisa ser reconstruído quando o nível da fortaleza muda.
  disposeGroup(coreGroup);coreGroup.scale.y=1+architectureAt(buildLevel).growth*.14;
  castle(coreGroup,buildLevel);
  renderer.domElement.dataset.architectureTier=String(architectureAt(buildLevel).tier);
  buildings=nextBuildings;
  army=nextArmyState;
  disposeGroup(structures);
  syncSites(buildings);
  for(const b of buildings)
   if(b.status!=='building'||!Number.isSafeInteger(b.endsAt))
    drawBuilding(b,structures);
  paintLotFoundations();freshDecor();rebuildWalkers();
 }
 // Cada construção possui sua própria instância. Não eliminar as anteriores
 // quando o jogador posiciona outro prédio antes do ACK do servidor.
 const pendingVisuals=new Map();
 function setPendingDataset(){
  const buildings=[...pendingVisuals.values()].map(entry=>entry.building);
  renderer.domElement.dataset.pendingCount=String(buildings.length);
  if(buildings.length){
   const latest=buildings[buildings.length-1];
   renderer.domElement.dataset.pendingBuilding=latest.type+':'+latest.x+':'+latest.y;
  }else delete renderer.domElement.dataset.pendingBuilding;
  showHover(hover);
 }
 function showPendingBuilding(building,id='single'){
  if(!building||!layout.footprints[building.type])return;
  clearPendingBuilding(id,false);
  const site=makeSite(building,'pending:'+id,true);
  pendingVisuals.set(id,{...site,building});
  setPendingDataset();paintLotFoundations();
  renderer.render(scene,camera);
 }
 function clearPendingBuilding(id,refresh=true){
  const keys=id===undefined?[...pendingVisuals.keys()]:[id];
  for(const key of keys){
   const site=pendingVisuals.get(key);if(!site)continue;
   pendingVisuals.delete(key);deleteSite(site);
  }
  if(refresh){setPendingDataset();paintLotFoundations();}
 }

 const people=[];
 function figure(parent,color,x,z,isSoldier){
  const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);
  box(g,.43,.77,.31,color,0,.72,0);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.28,9,7),material('#dbb08a'));
  head.position.y=1.38;g.add(head);
  box(g,.15,.55,.18,'#564a3e',-.13,.29,0);
  box(g,.15,.55,.18,'#564a3e',.13,.29,0);
  if(isSoldier){
   cone(g,.48,.46,6,'#8b9290',0,1.78,0);
   box(g,.08,1.16,.08,'#a9a9a3',.31,.83,0);
  }
  return g;
 }
 function rebuildWalkers(){
  disposeGroup(walkers);people.length=0;
  const roadNodes=[...landscape.road].map(key=>{
   const [x,y]=key.split(':').map(Number);return {x,y};
  }).sort((a,b)=>a.y-b.y||a.x-b.x);
  if(!roadNodes.length)return;
  const count=13+Math.min(12,Math.ceil(Object.values(army).reduce(
   (sum,n)=>sum+(Number(n)||0),0)/12));
  for(let i=0;i<count;i++){
   const seed=hash(i,17,3),soldier=i>=13;
   const col=soldier?'#657e91':(i%3?'#aa784f':'#548b74');
   const from=roadNodes[Math.floor(seed*roadNodes.length)];
   const to=nextRoadCell(landscape,from,null,hash(i,27,8));
   const start=pos(from.x,from.y);
   const g=figure(walkers,col,start.x,start.z,soldier);
   // A posição interpolada sempre pertence ao segmento entre duas ruas vizinhas.
   people.push({g,i,from,to,previous:null,progress:0,
    speed:soldier?1.03+seed*.35:.72+seed*.27});
  }
  renderer.domElement.dataset.pedestrianRoadOnly='true';
 }
 function pick(e){
  const rect=renderer.domElement.getBoundingClientRect();
  if(!rect.width||!rect.height)return null;
  const nx=((e.clientX-rect.left)/rect.width)*2-1,ny=-((e.clientY-rect.top)/rect.height)*2+1;
  const raycaster=new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(nx,ny),camera);
  const hits=raycaster.intersectObject(pickPlane);
  if(!hits.length)return null;
  const pt=hits[0].point,x=Math.floor((pt.x+HALF)/CELL),y=Math.floor((pt.z+HALF)/CELL);
  if(x<0||y<0||x>=N||y>=N)return null;
  return {x,y};
 }
 function setSelection(type){selection=type||null;showHover(hover)}
 function showHover(cell){
  hover=cell;
  const lot=cell?layout.lotAt(cell.x,cell.y):null;
  if(!lot){ghost.visible=false;highlight.visible=false;return}
  const [w,h]=[lot.w,lot.h];
  const valid=layout.lotStatus(lot,[...buildings,...[...pendingVisuals.values()].map(p=>p.building)],buildLevel)==='empty';
  const p=pos(lot.x,lot.y,w,h);
  const g=geom(w*CELL,.11,h*CELL);
  ghost.geometry=g;highlight.geometry.dispose();
  highlight.geometry=new THREE.EdgesGeometry(g);
  ghost.material.color.set(valid?'#75e0a0':'#df6560');
  highlight.material.color.set(valid?'#daf7e1':'#ffd1c9');
  ghost.position.set(p.x,.12,p.z);highlight.position.copy(ghost.position);
  ghost.visible=true;highlight.visible=true;
 }
 const target=new THREE.Vector3(0,0,0);
 let distance=74,azimuth=Math.PI/4,elevation=.88;
 function focusLot(lot){
  if(!lot)return;
  const p=pos(lot.x,lot.y,lot.w,lot.h);
  target.set(p.x,0,p.z);distance=48;updateCamera();
 }
 function updateCamera(){
  camera.position.set(target.x+distance*Math.sin(elevation)*Math.sin(azimuth),
   distance*Math.cos(elevation)+target.y,
   target.z+distance*Math.sin(elevation)*Math.cos(azimuth));
  camera.lookAt(target);
 }
 updateCamera();
 let drag=null;
 function pointerDown(e){if(e.button!==0&&e.button!==2)return;drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,button:e.button,moved:false};renderer.domElement.setPointerCapture?.(e.pointerId)}
 function pointerMove(e){
  if(drag){
   const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;
   if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)drag.moved=true;
   if(drag.button===2||e.shiftKey){
    const f=distance/650;
    target.x=Math.max(-HALF,Math.min(HALF,target.x+(-dx*Math.cos(azimuth)+dy*Math.sin(azimuth))*f));
    target.z=Math.max(-HALF,Math.min(HALF,target.z+(dx*Math.sin(azimuth)+dy*Math.cos(azimuth))*f));
   }else if(drag.moved){
    azimuth-=dx*.007;elevation=Math.max(.30,Math.min(1.48,elevation+dy*.005));
   }
   drag.lastX=e.clientX;drag.lastY=e.clientY;updateCamera();
  }else{
   const cell=pick(e);showHover(cell);onHover?.(cell);
  }
 }
 function pointerUp(e){
  if(!drag)return;
  const clicked=!drag.moved&&e.button===0;
  drag=null;if(clicked){const cell=pick(e);if(cell)onCell?.(cell)}
 }
 function wheel(e){e.preventDefault();distance=Math.min(145,Math.max(18,distance*Math.exp(e.deltaY*.0011)));updateCamera()}
 function contextmenu(e){e.preventDefault()}
 const canvas=renderer.domElement;
 canvas.addEventListener('pointerdown',pointerDown);
 canvas.addEventListener('pointermove',pointerMove);
 canvas.addEventListener('pointerup',pointerUp);
 canvas.addEventListener('pointercancel',pointerUp);
 canvas.addEventListener('wheel',wheel,{passive:false});
 canvas.addEventListener('contextmenu',contextmenu);
 const resize=()=>{
  const w=Math.max(320,mount.clientWidth||768),h=Math.max(280,mount.clientHeight||520);
  camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
 };
 const ro=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
 ro?.observe(mount);if(!ro)window.addEventListener('resize',resize);
 resize();
 let lastTimerPaint=0;
 function animateSites(now){
  const current=Date.now()+serverOffset;
  const refresh=now-lastTimerPaint>150;
  if(refresh)lastTimerPaint=now;
  for(const site of [...activeSites.values(),...[...pendingVisuals.values()]]){
   const b=site.building;
   const pct=Number.isSafeInteger(b.startedAt)&&Number.isSafeInteger(b.endsAt)?Math.max(0,Math.min(1,(current-b.startedAt)/Math.max(1,b.endsAt-b.startedAt))):0;
   site.model.visible=pct>.12;
   site.model.scale.y=(site.model.userData.completedHeightScale||1)*Math.max(.04,Math.min(1,(pct-.12)/.88));
   site.scaffold.visible=pct<.96;
   site.scaffold.position.y=Math.sin(now*.0016+site.p.x)*.04;
   if(refresh){
    const overdue=!site.local&&Number.isSafeInteger(b.endsAt)&&current>=b.endsAt;
    const text=site.local?(Number.isSafeInteger(b.endsAt)?timerText(b.endsAt-current)+'*':'Confirmando…'):
     overdue?'Concluindo…':timerText(b.endsAt-current);
    if(text!==site.lastText){site.timer.textContent=text;site.lastText=text}
    site.fill.style.width=Math.round(pct*100)+'%';
    site.stage.textContent=site.local?'Tempo estimado · validando':
     overdue?'Aguardando conclusão do servidor':
     pct<.25?'Fundações':pct<.50?'Erguendo paredes':
     pct<.75?'Montando estrutura':'Colocando telhado';
    site.label.dataset.progress=String(Math.round(pct*100));
   }
   const pt=site.p.clone().project(camera);
   const x=(pt.x+1)*.5*renderer.domElement.clientWidth;
   const y=(1-pt.y)*.5*renderer.domElement.clientHeight;
   site.label.style.left=Math.round(x)+'px';site.label.style.top=Math.round(y+15)+'px';
   site.label.hidden=pt.z< -1||pt.z>1||x<0||x>renderer.domElement.clientWidth||y<0||y>renderer.domElement.clientHeight-10;
  }
 }
 let previousFrameAt=null;
 function frame(now){
  if(destroyed)return;
  animateSites(now);
  // Delta limitado para não teletransportar camponeses após troca de abas.
  const dt=previousFrameAt===null?0:Math.max(0,Math.min(.065,(now-previousFrameAt)/1000));
  previousFrameAt=now;
  for(const p of people){
   const from=p.from,to=p.to;
   if(!landscape.isRoad(from.x,from.y)||!landscape.isRoad(to.x,to.y))continue;
   p.progress=Math.min(1,p.progress+dt*p.speed);
   const a=pos(from.x,from.y),b=pos(to.x,to.y),t=p.progress;
   p.g.position.set(a.x+(b.x-a.x)*t,Math.abs(Math.sin(t*Math.PI*2))*.025,
    a.z+(b.z-a.z)*t);
   if(from.x!==to.x||from.y!==to.y)
    p.g.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);
   if(p.progress>=1){
    const old=from;
    p.from=to;p.previous=old;
    p.to=nextRoadCell(landscape,to,old,
     landscape.hash(to.x+p.i,to.y,Math.floor(now/5200)+p.i));
    p.progress=0;
   }
  }
  renderer.render(scene,camera);
  raf=requestAnimationFrame(frame);
 }
 raf=requestAnimationFrame(frame);
 }
 raf=requestAnimationFrame(frame);
 function destroy(){
  if(destroyed)return;destroyed=true;cancelAnimationFrame(raf);
  ro?.disconnect();if(!ro)window.removeEventListener('resize',resize);
   for(const child of lockedGroup.children)child.geometry.dispose();lockedMaterial.dispose();
  canvas.removeEventListener('pointerdown',pointerDown);
  canvas.removeEventListener('pointermove',pointerMove);
  canvas.removeEventListener('pointerup',pointerUp);
  canvas.removeEventListener('pointercancel',pointerUp);
  canvas.removeEventListener('wheel',wheel);
  canvas.removeEventListener('contextmenu',contextmenu);
  scene.traverse(obj=>{
   if(obj.isMesh||obj.isLineSegments){
    if(obj.userData.ownGeometry)obj.geometry?.dispose();
    if(obj.userData.ownMaterial)obj.material?.dispose();
   }
  });
  clearPendingBuilding();
  for(const site of activeSites.values())deleteSite(site);
  activeSites.clear();labels.remove();
  highlight.geometry.dispose();ghost.material.dispose();highlight.material.dispose();
  for(const g of geometries.values())g.dispose();
  for(const m of mats.values())m.dispose();
  ground.geometry.dispose();exterior.geometry.dispose();pickPlane.geometry.dispose();
  grassSurface.dispose();dirtSurface.dispose();grassTexture.dispose();earthTexture.dispose();
  pickPlane.material.dispose();
  renderer.dispose();canvas.remove();
 }
 return {setSelection,updateBuildings,showPendingBuilding,clearPendingBuilding,focusLot,destroy,focus(){target.set(0,0,0);distance=68;updateCamera()}};
}

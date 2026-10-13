'use strict';
/* Os Peregrinos — cena 3D original e isolada das fortalezas.
   Renderização WebGL/Three.js em origem própria, terreno totalmente edificável. */
import * as THREE from '/vendor/three.module.js';

export function createGuildScene({mount,layout,onCell,onHover}){
 const N=layout.N,CELL=2.85,HALF=N*CELL/2;
 const mats=new Map(),geometries=new Map();
 const material=(c,roughness=0.93)=>{const k=c+':'+roughness;if(!mats.has(k))mats.set(k,new THREE.MeshStandardMaterial({color:c,roughness,metalness:0.04}));return mats.get(k)};
 const geom=(w,h,d)=>{const k=[w,h,d].join('/');if(!geometries.has(k))geometries.set(k,new THREE.BoxGeometry(w,h,d));return geometries.get(k)};
 const scene=new THREE.Scene();
 scene.background=new THREE.Color('#c5d6cb');
 scene.fog=new THREE.FogExp2('#c5d6cb',0.008);
 const camera=new THREE.PerspectiveCamera(47,1,0.1,450);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.45;
 renderer.domElement.className='guild3d-canvas';
 renderer.domElement.setAttribute('aria-label','Fortaleza tridimensional: arraste para girar, use a roda para zoom e clique para construir');
 renderer.domElement.style.touchAction='none';
 mount.append(renderer.domElement);
 const ambient=new THREE.HemisphereLight('#e6edee','#425743',2.3);scene.add(ambient);
 const sun=new THREE.DirectionalLight('#fff4d5',3.1);
 sun.position.set(-25,48,22);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);
 sun.shadow.camera.left=-63;sun.shadow.camera.right=63;
 sun.shadow.camera.top=63;sun.shadow.camera.bottom=-63;
 sun.shadow.normalBias=0.025;
 scene.add(sun);
 const root=new THREE.Group();scene.add(root);
 const structures=new THREE.Group();scene.add(structures);
 const provisionalStructures=new THREE.Group();scene.add(provisionalStructures);
 const decor=new THREE.Group();scene.add(decor);
 const walkers=new THREE.Group();scene.add(walkers);
 const pickPlane=new THREE.Mesh(new THREE.PlaneGeometry(N*CELL,N*CELL),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));
 pickPlane.rotation.x=-Math.PI/2;pickPlane.position.y=0.03;scene.add(pickPlane);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(N*CELL,N*CELL),material('#71995b'));
 ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;root.add(ground);
 // Bordas naturais fora da área edificável; nenhuma árvore fixa bloqueia células.
 const exterior=new THREE.Mesh(new THREE.PlaneGeometry(N*CELL+170,N*CELL+170),material('#52784f'));
 exterior.rotation.x=-Math.PI/2;exterior.position.y=-0.13;exterior.receiveShadow=true;root.add(exterior);
 function box(parent,w,h,d,c,x=0,y=0,z=0,cast=true){
  const m=new THREE.Mesh(geom(w,h,d),material(c));m.position.set(x,y,z);
  m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;
 }
 const pos=(x,y,w=1,h=1)=>new THREE.Vector3((x+w/2)*CELL-HALF,0,(y+h/2)*CELL-HALF);
 const hash=(x,y,s=0)=>{let n=Math.imul(x+17,73856093)^Math.imul(y+23,19349663)^Math.imul(s+41,83492791);return ((n^(n>>>13))>>>0)/4294967295};
 function cone(parent,r,height,sides,c,x=0,y=0,z=0){
  const m=new THREE.Mesh(new THREE.ConeGeometry(r,height,sides),material(c));
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
 }
 function cylinder(parent,r,h,c,x=0,y=0,z=0,sides=10){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.08,h,sides),material(c));
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
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
  const lv=Math.max(1,Math.min(5,b.level||1)),seed=hash(b.x,b.y);
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
  const lv=Math.max(1,Math.min(5,b.level||1)),r=Math.min(...layout.size(b))*CELL*.37;
  const h=5+lv*.7;
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
 function castle(g){
  const w=layout.CORE.w*CELL,d=layout.CORE.h*CELL;
  box(g,w,.26,d,'#b9b09b',0,.13,0);
  box(g,w*.53,7.2,d*.52,'#adaca2',0,3.72,-.35);
  gable(g,w*.54,d*.54,7.3,2.45,'#924b36');
  for(let i=0;i<4;i++)for(const xx of [-w*.31,w*.31]){
   box(g,.9,1.28,.16,'#515b59',xx,2+i*1.45,d*.265);
   box(g,.68,1.02,.18,'#c5c29b',xx,2+i*1.45,d*.274);
  }
  const off=w*.43;
  for(const [x,z]of [[-off,-off],[-off,off],[off,-off],[off,off]]){
   cylinder(g,1.46,8.5,'#999e96',x,4.28,z,12);
   cylinder(g,1.73,.36,'#c3c5b8',x,8.64,z,12);
   for(let i=0;i<10;i++){const a=i*Math.PI/5;box(g,.57,.72,.45,'#c6c5b7',x+Math.cos(a)*1.45,9.1,z+Math.sin(a)*1.45)}
   cone(g,1.86,2.3,12,'#884939',x,10.2,z);
  }
  for(const z of [-d*.43,d*.43]){
   box(g,w*.78,3.4,.46,'#a7a69c',0,1.7,z);
   for(let i=-4;i<=4;i++)box(g,.6,.64,.54,'#bfc0b5',i*w*.075,3.7,z);
  }
  for(const x of [-w*.43,w*.43]){
   box(g,.46,3.4,d*.80,'#aaa99e',x,1.7,0);
   for(let i=-4;i<=4;i++)box(g,.54,.64,.6,'#c1c2b7',x,3.7,i*d*.075);
  }
  // Portão e bandeiras distinguem o núcleo político da capital.
  box(g,2.55,3.1,.6,'#593e30',0,1.55,d*.44);
  for(const x of [-2.6,2.6]){
   box(g,.12,5,.12,'#65513f',x,8.8,-d*.16);
   box(g,1.2,.84,.12,'#bfa05a',x+.56,10.6,-d*.16);
  }
  box(g,3,.4,2.9,'#aaa08b',0,.3,d*.47);
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
   canopy.position.y=2.35;canopy.castShadow=true;t.add(canopy);
  }
 }
 function lamp(parent,x,z){
  cylinder(parent,.065,1.8,'#6b5c47',x,.9,z,8);
  const globe=new THREE.Mesh(new THREE.SphereGeometry(.22,8,7),new THREE.MeshStandardMaterial({color:'#fff0b1',emissive:'#ffd18a',emissiveIntensity:.55}));
  globe.position.set(x,1.91,z);parent.add(globe);
 }
 const coreGroup=new THREE.Group();coreGroup.position.copy(pos(layout.CORE.x,layout.CORE.y,layout.CORE.w,layout.CORE.h));root.add(coreGroup);castle(coreGroup);
 // Caminhos são decoração transparente sobre o terreno, jamais células bloqueadas.
 for(let i=-7;i<=7;i++)for(let side=0;side<4;side++){
  const shift=i*CELL*.93,v=(layout.CORE.w*.5+Math.abs(i)/8)*CELL;
  const p=side===0?[shift,v]:side===1?[shift,-v]:side===2?[v,shift]:[-v,shift];
  const t=box(root,CELL*.93,.018,CELL*.93,i%3?'#a99b7b':'#b5a787',p[0],.022,p[1],false);
  t.receiveShadow=true;
 }
 const ghost=new THREE.Mesh(geom(CELL,.11,CELL),new THREE.MeshBasicMaterial({color:'#67db88',transparent:true,opacity:.34,depthWrite:false}));
 ghost.visible=false;ghost.position.y=.12;scene.add(ghost);
 const highlight=new THREE.LineSegments(new THREE.EdgesGeometry(geom(CELL,.11,CELL)),new THREE.LineBasicMaterial({color:'#eff9df'}));
 highlight.visible=false;scene.add(highlight);
 let buildings=[],selection=null,army={},raf=0,destroyed=false,hover=null;
 function disposeGroup(group){
  for(const o of [...group.children]){group.remove(o);o.traverse(n=>{
   if(n.userData.ownGeometry)n.geometry?.dispose();
   if(n.userData.ownMaterial)n.material?.dispose();
  })}
 }
 function freshDecor(){
  disposeGroup(decor);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
   if(layout.isCore(x,y)||layout.at(buildings,x,y))continue;
   const seed=hash(x,y,3),p=pos(x,y);
   if(seed>.91&&x>0&&y>0){
    littleTree(decor,p.x+CELL*.15,p.z+CELL*.18,seed);
   }else if(seed<.045){box(decor,.9,.2,.7,'#9c9f8c',p.x,.1,p.z)}
   else if(seed>.85&&seed<.88){
    box(decor,.7,.15,.65,'#c4b15d',p.x,.08,p.z,false);
   }
  }
  for(let i=0;i<65;i++){
   const a=i*2.399,rr=HALF+4+(i%6)*2.7;
   littleTree(decor,Math.cos(a)*rr,Math.sin(a)*rr,hash(i,47),0);
  }
  for(let i=0;i<14;i++){
   const p=pos(7+i%7,9+Math.floor(i/7)*6);
   if(!layout.at(buildings,7+i%7,9+Math.floor(i/7)*6))lamp(decor,p.x,p.z);
  }
 }
 function drawBuilding(b,parent){
  const [w,h]=layout.size(b),g=new THREE.Group();
  g.position.copy(pos(b.x,b.y,w,h));
  g.userData.building=b;
  parent.add(g);
  if(b.type==='house')timberHouse(g,b);
  else if(b.type==='farm')farm(g,b);
  else if(b.type==='barracks')barracks(g,b);
  else if(b.type==='tower')tower(g,b);
  else if(b.type==='market')market(g,b);
  return g;
 }
 let lastBuildingState=null;
 function updateBuildings(next=[],nextArmy={}){
  const nextBuildings=Array.isArray(next)?next.filter(b=>b&&layout.footprints[b.type]&&Number.isSafeInteger(b.x)&&Number.isSafeInteger(b.y)).slice(0,60):[];
  const nextArmyState=nextArmy||{};
  const fingerprint=JSON.stringify([nextBuildings,nextArmyState]);
  // Evitar recriar dezenas de modelos 3D a cada snapshot do servidor.
  if(fingerprint===lastBuildingState)return;
  lastBuildingState=fingerprint;
  buildings=nextBuildings;
  army=nextArmyState;
  disposeGroup(structures);
  for(const b of buildings)drawBuilding(b,structures);
  freshDecor();rebuildWalkers();
 }
 function showPendingBuilding(building){
  disposeGroup(provisionalStructures);
  if(!building||!layout.footprints[building.type]){
   delete renderer.domElement.dataset.pendingBuilding;
   return;
  }
  const [w,h]=layout.size(building),p=pos(building.x,building.y,w,h);
  // Edifício completo surge no instante do clique; o servidor permanece autoritativo.
  const foundation=box(provisionalStructures,w*CELL-.12,.13,h*CELL-.12,'#d9b66a',p.x,.10,p.z,false);
  foundation.receiveShadow=false;
  drawBuilding(building,provisionalStructures);
  renderer.domElement.dataset.pendingBuilding=building.type+':'+building.x+':'+building.y;
  // Sem aguardar próximo requestAnimationFrame: pinta durante o próprio clique.
  renderer.render(scene,camera);
 }
 function clearPendingBuilding(){
  disposeGroup(provisionalStructures);
  delete renderer.domElement.dataset.pendingBuilding;
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
  const count=13+Math.min(12,Math.ceil(Object.values(army).reduce((sum,n)=>sum+(Number(n)||0),0)/12));
  for(let i=0;i<count;i++){
   const seed=hash(i,17,3),phase=seed*Math.PI*2;
   const soldier=i>=13,col=soldier?'#657e91':(i%3?'#aa784f':'#548b74');
   const g=figure(walkers,col,0,0,soldier);
   people.push({g,i,phase,speed:.20+(seed*.16),radius:9+(i%5)*2.8});
  }
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
  if(!cell||!selection||!layout.footprints[selection]){ghost.visible=false;highlight.visible=false;return}
  const [w,h]=layout.footprints[selection],valid=layout.canPlace(buildings,selection,cell.x,cell.y);
  const p=pos(cell.x,cell.y,w,h);
  const g=geom(w*CELL,.11,h*CELL);
  ghost.geometry=g;highlight.geometry.dispose();
  highlight.geometry=new THREE.EdgesGeometry(g);
  ghost.material.color.set(valid?'#75e0a0':'#df6560');
  highlight.material.color.set(valid?'#daf7e1':'#ffd1c9');
  ghost.position.set(p.x,.12,p.z);highlight.position.copy(ghost.position);
  ghost.visible=true;highlight.visible=true;
 }
 const target=new THREE.Vector3(0,0,0);
 let distance=70,azimuth=.77,elevation=.92;
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
 function frame(now){
  if(destroyed)return;
  const t=now*.0005;
  for(const p of people){
   const a=p.phase+t*p.speed;
   p.g.position.set(Math.cos(a)*p.radius,0,Math.sin(a*.91)*p.radius);
   p.g.rotation.y=-a;
   p.g.position.y=Math.sin(now*.007+p.i)*.035;
  }
  renderer.render(scene,camera);
  raf=requestAnimationFrame(frame);
 }
 raf=requestAnimationFrame(frame);
 function destroy(){
  if(destroyed)return;destroyed=true;cancelAnimationFrame(raf);
  ro?.disconnect();if(!ro)window.removeEventListener('resize',resize);
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
  highlight.geometry.dispose();ghost.material.dispose();highlight.material.dispose();
  for(const g of geometries.values())g.dispose();
  for(const m of mats.values())m.dispose();
  ground.geometry.dispose();exterior.geometry.dispose();pickPlane.geometry.dispose();
  pickPlane.material.dispose();
  renderer.dispose();canvas.remove();
 }
 return {setSelection,updateBuildings,showPendingBuilding,clearPendingBuilding,destroy,focus(){target.set(0,0,0);distance=68;updateCamera()}};
}

'use strict';
/**
 * Os Peregrinos — mundo aberto 2.5D (renderizador experimental).
 * Plano X/Z corresponde exatamente ao X/Y da simulação 2D.
 * Câmera ortográfica vertical: não muda controles, colisões ou a simulação.
 * Este arquivo nunca importa nem altera os módulos das fortalezas de guilda.
 */
import * as THREE from '/vendor/three.module.js';
import {buildSceneryV4,SCENERY_V4_VERSION} from '/world-scenery-v4.mjs';
import {preloadSceneryAtlas,atlasLoaded} from '/world-scenery-v6-asset-adapter.mjs';
import {preloadV7Assets,isV7Ready,v7Stats} from '/world-scenery-v7-asset-loader.mjs';

const ZONE_WIDTH = 1536;
const ZONE_HEIGHT = 1024;
const roadY = (x, zone) => 496 + Math.sin((x + zone * 117) / 225) * 54 +
  Math.sin(x / 79 + zone * 2) * 12;
const palette = {
  meadow:['#647d57','#77946a','#ceb28a'],
  forest:['#385848','#64856a','#bcab83'],
  river:['#506b5d','#73918c','#ccb698'],
  desert:['#bca37b','#d8bd8b','#a88a64'],
  mountain:['#66706e','#8e9896','#b4a68a'],
  ruins:['#60695c','#7f8270','#b3a68d'],
  swamp:['#455e54','#65786a','#9f9980'],
  coast:['#729187','#8dab9c','#dfceb0'],
  city:['#7b8576','#a2a696','#c0b6a0'],
  dungeon:['#454a50','#565d60','#878079']
};
const biomeNames = {
  pradaria:'meadow',floresta:'forest',rio:'river',deserto:'desert',
  montanha:'mountain',ruinas:'ruins',pantano:'swamp',costa:'coast',
  cidade:'city',masmorra:'dungeon'
};
function rng(seed) {
  let v = (seed >>> 0) || 1;
  return () => ((v = (Math.imul(v, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function groundTexture(zone, colors) {
  const size = 256, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rnd = rng(901 + zone * 701);
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 3500; i++) {
    const x = rnd() * size, y = rnd() * size;
    ctx.fillStyle = rnd() > .53 ? colors[1] : '#25342f';
    ctx.globalAlpha = .10 + rnd() * .18;
    ctx.fillRect(x | 0, y | 0, 1 + (rnd() * 4 | 0), 1 + (rnd() * 3 | 0));
  }
  ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(9, 6);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 2;
  return t;
}
function roadGeometry(zone, width = 38) {
  const vertices = [], indices = [];
  const count = 96;
  for(let i=0;i<=count;i++) {
    const x = i * ZONE_WIDTH / count;
    const z = roadY(x, zone);
    vertices.push(x,.24,z-width,x,.24,z+width);
    if(i<count){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
function addBox(group,w,h,d,x,y,z,color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w,h,d),
    new THREE.MeshStandardMaterial({color,roughness:.94,metalness:0})
  );
  mesh.position.set(x,y,z);
  group.add(mesh);
  return mesh;
}
function addTree(group,x,z,rand,colors) {
  const stem = addBox(group,5,13,5,x,7,z,'#655244');
  stem.rotation.y = rand()*Math.PI;
  const canopy = new THREE.Mesh(
    new THREE.IcosahedronGeometry(17+rand()*11,1),
    new THREE.MeshStandardMaterial({color:rand()>.5?colors[1]:'#436952',roughness:1,flatShading:true})
  );
  canopy.scale.set(1.0+rand()*.2,.75+rand()*.2,.95+rand()*.2);
  canopy.position.set(x,20,z);
  group.add(canopy);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(20,20),
    new THREE.MeshBasicMaterial({color:'#152c23',transparent:true,opacity:.17,depthWrite:false})
  );
  shadow.rotation.x=-Math.PI/2;
  shadow.position.set(x,.26,z);
  group.add(shadow);
}
function addHouse(group,x,z,rand) {
  const width=38+rand()*19, depth=36+rand()*20;
  addBox(group,width,15,depth,x,7.5,z,'#c8bca0');
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(width,depth)*.76,16,4),
    new THREE.MeshStandardMaterial({color:rand()>.5?'#526c88':'#976c5c',roughness:.91,flatShading:true})
  );
  roof.rotation.y=Math.PI/4;
  roof.position.set(x,22,z);
  group.add(roof);
}
function addWater(group,zone,mode) {
  const mat = new THREE.MeshStandardMaterial({
    color:'#3991aa',roughness:.3,metalness:.16,
    transparent:true,opacity:.86,depthWrite:false
  });
  if(mode==='coast'){
    const water = new THREE.Mesh(new THREE.PlaneGeometry(ZONE_WIDTH,320),mat);
    water.rotation.x=-Math.PI/2;
    water.position.set(ZONE_WIDTH/2,.19,860);
    group.add(water);
  } else {
    for(let i=0;i<26;i++) {
      const z=(i+.5)*ZONE_HEIGHT/26;
      const x=420+92*Math.sin(z/150+zone);
      const water = new THREE.Mesh(new THREE.PlaneGeometry(118,ZONE_HEIGHT/26+2),mat);
      water.rotation.x=-Math.PI/2;
      water.position.set(x,.18,z);
      group.add(water);
    }
  }
}

/** Vegetação ornamental em instâncias: dezenas de tufos com poucas draw calls. */
function addMeadowDetails(group,zone,biome,rand) {
 if(biome==='dungeon'||biome==='desert')return;
 const count=biome==='city'?90:biome==='forest'?240:180;
 const material=new THREE.MeshStandardMaterial({
  color:biome==='forest'?'#9cae72':'#b2c68b',roughness:1,flatShading:true,
  side:THREE.DoubleSide
 });
 const geometry=new THREE.ConeGeometry(2.9,10,3);
 const tufts=new THREE.InstancedMesh(geometry,material,count);
 const dummy=new THREE.Object3D();
 let placed=0,tries=0;
 while(placed<count&&tries<count*5){
  tries++;
  const x=20+rand()*(ZONE_WIDTH-40),z=20+rand()*(ZONE_HEIGHT-40);
  if(Math.abs(z-roadY(x,zone))<56)continue;
  if(biome==='coast'&&z>700)continue;
  if(biome==='river'&&Math.abs(x-(420+92*Math.sin(z/150+zone)))<80)continue;
  dummy.position.set(x,4.2,z);
  dummy.scale.set(.55+rand()*1.25,.35+rand()*.65,.55+rand()*1.25);
  dummy.rotation.set(0,rand()*Math.PI*2,0);
  dummy.updateMatrix();
  tufts.setMatrixAt(placed++,dummy.matrix);
 }
 tufts.count=placed;
 tufts.instanceMatrix.needsUpdate=true;
 group.add(tufts);
}
/** O marco da Aurora só é ilustrativo: nenhum objeto altera hitboxes. */
function addAuroraShrine(group) {
 const x=768,z=335;
 const limestone=new THREE.MeshStandardMaterial({color:'#c5c7ac',roughness:.92});
 const metal=new THREE.MeshStandardMaterial({color:'#aa956e',roughness:.53,metalness:.34});
 const magic=new THREE.MeshStandardMaterial({
  color:'#7ce5e2',roughness:.22,metalness:.12,
  emissive:'#269da5',emissiveIntensity:1.4,flatShading:true
 });
 const disk=new THREE.Mesh(new THREE.CylinderGeometry(53,55,5,36),limestone);
 disk.position.set(x,2.7,z);group.add(disk);
 const inner=new THREE.Mesh(new THREE.TorusGeometry(41,3,7,52),metal);
 inner.rotation.x=-Math.PI/2;inner.position.set(x,5.8,z);group.add(inner);
 const motifs=new THREE.Mesh(new THREE.TorusGeometry(32,1.5,6,48),magic);
 motifs.rotation.x=-Math.PI/2;motifs.position.set(x,6,z);group.add(motifs);
 addBox(group,18,19,18,x,16,z,'#b2b6ae');
 const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(14,0),magic.clone());
 crystal.position.set(x,39,z);group.add(crystal);
 const halo=new THREE.Mesh(new THREE.TorusGeometry(17,1.7,7,36),magic.clone());
 halo.rotation.x=-Math.PI/2;halo.position.set(x,39,z);group.add(halo);
 const light=new THREE.PointLight('#6affed',2.1,175,2);
 light.position.set(x,50,z);group.add(light);
 return {crystal,halo,light};
}

export function createWorld25D({shell,canvas,width=960,height=576,sceneryV4=true}) {
  if (!shell || !canvas) throw Error('O Canvas 2D e seu contêiner são obrigatórios.');
  const renderer = new THREE.WebGLRenderer({
    alpha:false,antialias:true,powerPreference:'default',
    preserveDrawingBuffer:false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setSize(width,height,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.20;
  renderer.domElement.id='world25dBackdrop';
  Object.assign(renderer.domElement.style,{
    position:'absolute',left:'0',top:'0',width:'100%',height:'100%',
    pointerEvents:'none',zIndex:'0',display:'block',imageRendering:'auto',maxWidth:'none',maxHeight:'none',minWidth:'0',minHeight:'0'
  });
  shell.style.position='relative';
  canvas.style.position='relative';
  canvas.style.zIndex='1';
  canvas.style.background='transparent';
  shell.insertBefore(renderer.domElement,canvas);

  // A versão em tela cheia centraliza o Canvas 2D com flexbox.
  // O WebGL deve acompanhar exatamente a área visível desse Canvas,
  // sem esticar o mundo quando a proporção da tela mudar.
  const alignBackdrop=()=>{
    if(!renderer.domElement.isConnected)return;
    const gameBounds=canvas.getBoundingClientRect();
    const shellBounds=shell.getBoundingClientRect();
    const style=renderer.domElement.style;
    style.left=(gameBounds.left-shellBounds.left-shell.clientLeft)+'px';
    style.top=(gameBounds.top-shellBounds.top-shell.clientTop)+'px';
    style.width=gameBounds.width+'px';
    style.height=gameBounds.height+'px';
  };
  const observer=typeof ResizeObserver!=='undefined'
   ?new ResizeObserver(alignBackdrop):null;
  observer?.observe(canvas);
  window.addEventListener('resize',alignBackdrop);
  document.addEventListener('fullscreenchange',alignBackdrop);
  alignBackdrop();

  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#506c63');
  const camera=new THREE.OrthographicCamera(-width/2,width/2,height/2,-height/2,.1,2200);
  camera.up.set(0,0,-1);
  const ambient=new THREE.HemisphereLight('#e8f2df','#465447',2.1);
  const sun=new THREE.DirectionalLight('#ffe9bd',1.8);
  sun.position.set(-240,600,190);
  scene.add(ambient,sun);
  let layer=null,activeZone=NaN,activeBiome='',disposed=false,night=false,shrine=null;
  let useSceneryV4=Boolean(sceneryV4),useSceneryDetail=true,useSceneryComposition=true,useSceneryAtlas=false,useSceneryV7=false,lastSceneryV4=null;
  function rebuild(zone,biome) {
    if(layer){
      scene.remove(layer);
      layer.traverse(o=>{
        if(o.geometry)o.geometry.dispose();
        if(o.material){
          for(const mat of [o.material].flat()){
            if(mat.map)mat.map.dispose();
            mat.dispose();
          }
        }
      });
    }
    layer=new THREE.Group();
    scene.add(layer);
    shrine=null;
    // One V4 static scenery pack covers all historical regions and 10 biomes.
    // In case of a WebGL/texture failure, fall back to the EXACT prior model.
    let success=false;
    if(useSceneryV4)try{
      lastSceneryV4=buildSceneryV4(THREE,layer,zone,biome,{detail:useSceneryDetail,composition:useSceneryComposition,atlas:useSceneryAtlas,v7:useSceneryV7});
      success=Boolean(lastSceneryV4);
    }catch(error){
      console.warn('[Cenário 2.5D V4] Voltando ao terreno anterior.',error);
      for(const child of [...layer.children]){
        child.traverse(obj=>{
          obj.geometry?.dispose?.();
          if(obj.material)for(const mat of [obj.material].flat()){
            mat.map?.dispose?.();
            mat.dispose?.();
          }
        });
        layer.remove(child);
      }
      lastSceneryV4=null;
    }
    if(!success){
      // Original biomes remain available when the new overlay is disabled.
    const colors=palette[biome]||palette.meadow;
    scene.background=new THREE.Color(biome==='dungeon'?'#333941':'#71918c');
    const ground=new THREE.Mesh(
      new THREE.PlaneGeometry(ZONE_WIDTH,ZONE_HEIGHT),
      new THREE.MeshStandardMaterial({map:groundTexture(zone,colors),roughness:1})
    );
    ground.rotation.x=-Math.PI/2;
    ground.position.set(ZONE_WIDTH/2,0,ZONE_HEIGHT/2);
    layer.add(ground);
    const road=new THREE.Mesh(
      roadGeometry(zone),
      new THREE.MeshStandardMaterial({color:colors[2],roughness:1,side:THREE.DoubleSide})
    );
    layer.add(road);
    if(biome==='river'||biome==='coast')addWater(layer,zone,biome);
    const random=rng((zone+3)*102449);
    const count=biome==='city'?95:biome==='desert'?55:128;
    for(let i=0;i<count;i++){
      const x=25+random()*(ZONE_WIDTH-50),z=25+random()*(ZONE_HEIGHT-50);
      if(Math.abs(z-roadY(x,zone))<75)continue;
      if(biome==='coast'&&z>700)continue;
      if(biome==='river'&&Math.abs(x-(420+92*Math.sin(z/150+zone)))<105)continue;
      if(biome==='city'&&random()<.40)addHouse(layer,x,z,random);
      else if(biome==='desert'||biome==='dungeon'){
        addBox(layer,9+random()*23,3+random()*15,10+random()*18,x,6,z,
          biome==='desert'?'#a99370':'#687271');
      } else addTree(layer,x,z,random,colors);
    }
    addMeadowDetails(layer,zone,biome,random);
    }

    if(zone===0&&(biome==='meadow'||biome==='city'))shrine=addAuroraShrine(layer);
    activeZone=zone;
    activeBiome=biome;
  }
  function render({zone=0,biome='pradaria',cameraX=0,cameraY=0,now=0}={}) {
    if(disposed)return false;
    const selected=biomeNames[biome]||biome;
    if(zone!==activeZone||selected!==activeBiome)rebuild(zone,selected);
    const cx=cameraX+width/2,cz=cameraY+height/2;
    camera.position.set(cx,1350,cz);
    camera.lookAt(cx,0,cz);
    if(shrine){
      shrine.crystal.rotation.y=now*.00047;
      shrine.crystal.position.y=39+Math.sin(now*.0022)*2.2;
      shrine.halo.rotation.z=now*.00025;
      shrine.halo.position.y=39+Math.sin(now*.0022)*2.2;
      shrine.light.intensity=(night?2.7:1.6)+Math.sin(now*.003)*.28;
    }
    const pulse=Math.sin(now/10000)*.09;
    ambient.intensity=night?.77:1.8+pulse;
    sun.intensity=night?.42:1.6+pulse;
    renderer.toneMappingExposure=night?.78:1.14;
    // Em layouts responsivos o Canvas 2D pode mudar de tamanho sem um ResizeObserver imediato.
    // Sincronizar aqui evita que o WebGL fique mais largo que a área de jogo após rotação/redimensionamento.
    alignBackdrop();
    renderer.render(scene,camera);
    return true;
  }
  function setNight(value){night=Boolean(value);}
  function setSceneryV4(value){useSceneryV4=Boolean(value);activeZone=NaN;activeBiome='';}
  function setSceneryDetail(value){useSceneryDetail=Boolean(value);activeZone=NaN;activeBiome='';}
  function setSceneryComposition(value){useSceneryComposition=Boolean(value);activeZone=NaN;activeBiome='';}
  function setSceneryAtlas(value){
    useSceneryAtlas=Boolean(value);
    activeZone=NaN;activeBiome='';
    if(useSceneryAtlas&&!atlasLoaded()){
      void preloadSceneryAtlas().then(ok=>{
        if(ok&&useSceneryAtlas){activeZone=NaN;activeBiome='';}
      }).catch(err=>console.warn('[Cenário 2.5D] Atlas não disponível; permanecendo no V5.',err));
    }
  }
  function setSceneryV7(value){
    useSceneryV7=Boolean(value);activeZone=NaN;activeBiome='';
    if(useSceneryV7&&!isV7Ready()){
      void preloadV7Assets().then(ok=>{
        if(ok&&useSceneryV7){activeZone=NaN;activeBiome='';}
      }).catch(err=>console.warn('[Cenário 2.5D V7] PNGs ainda pendentes; utilizando V5.',err));
    }
  }
  function dispose(){
    if(disposed)return;
    disposed=true;
    if(layer){
      layer.traverse(o=>{
        o.geometry?.dispose();
        if(o.material)for(const mat of [o.material].flat()){mat.map?.dispose();mat.dispose();}
      });
      scene.remove(layer);
    }
    observer?.disconnect();
    window.removeEventListener('resize',alignBackdrop);
    document.removeEventListener('fullscreenchange',alignBackdrop);
    renderer.dispose();
    renderer.domElement.remove();
    canvas.style.zIndex='';
    canvas.style.background='';
  }
  window.addEventListener('pagehide',dispose,{once:true});
  return {render,setNight,setSceneryV4,setSceneryDetail,setSceneryComposition,setSceneryAtlas,setSceneryV7,dispose,canvas:renderer.domElement,
    get atlasReady(){return atlasLoaded();},
    get v7Ready(){return isV7Ready();},
    get v7Status(){return v7Stats();},
    get sceneryVersion(){return useSceneryV4?(useSceneryV7&&isV7Ready()?'scenery-v7-approved-rgba-pngs':useSceneryAtlas&&atlasLoaded()?'scenery-real-png-atlas':useSceneryComposition?'scenery-v5-composed-topdown':useSceneryDetail?SCENERY_V4_VERSION:'scenery-v4-base'):'legacy';},
    get sceneryStats(){return lastSceneryV4;}};
}

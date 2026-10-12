'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const art=require('../public/pixel-detail');
const read=p=>fs.readFileSync(path.join(__dirname,'../public',p),'utf8');
function canvas(){
 let count=0,hash=2166136261,style='',colors=new Set();
 const g={
  set fillStyle(v){style=String(v)},get fillStyle(){return style},
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isFinite));
   assert.ok(w>=0&&h>=0);
   count++;colors.add(style);
   let part=style.split('').reduce((a,c)=>Math.imul(a,31)+c.charCodeAt(0)|0,0);
   part+=Math.round(x)*31+Math.round(y)*37+Math.round(w)*13+Math.round(h)*19;
   hash=Math.imul(hash^(part>>>0),16777619)>>>0;
  },
  save(){},restore(){},beginPath(){},stroke(){},fill(){},ellipse(){},
  arc(){},clip(){},rect(){},strokeRect(){},moveTo(){},lineTo(){},
  quadraticCurveTo(){},closePath(){},translate(){},rotate(){},
  fillText(){},strokeText(){},drawImage(){},setTransform(){},
  set lineWidth(v){},set strokeStyle(v){},set font(v){},
  set textAlign(v){},set shadowColor(v){},set shadowBlur(v){},
  set globalAlpha(v){},set imageSmoothingEnabled(v){},
  result:()=>({count,hash,colors:[...colors].sort()})
 };
 return g;
}
test('as quatro masmorras usam arquitetura e tiles 16-bit distintos',()=>{
 assert.equal(art.THEMES.length,4);
 assert.equal(new Set(art.THEMES.map(t=>t.id)).size,4);
 const samples=[];
 for(const z of [12,13,14,15]){
  const g=canvas();
  for(let y=0;y<8;y++)for(let x=0;x<8;x++)
   art.drawDungeonTile(g,x,y,z,(x+y)%3?'rock':'path');
  art.drawArchitecture(g,z,xx=>496+Math.sin((xx+z*117)/225)*54,1536,1024);
  const d=g.result();assert.ok(d.count>600);assert.ok(d.colors.length>=7);
  samples.push(d.hash);
 }
 assert.equal(new Set(samples).size,4,'masmorras não podem parecer iguais');
});
test('cada complexo possui seis subsolos com padrões distintos',()=>{
 for(let family=0;family<4;family++){
  const styles=[];
  for(let floor=1;floor<=6;floor++){
   const z=16+family*6+floor-1;
   assert.equal(art.familyOf(z),family);
   assert.equal(art.depthOf(z),floor);
   const g=canvas();
   for(let y=0;y<8;y++)for(let x=0;x<8;x++)art.drawDungeonTile(g,x,y,z,'rock');
   styles.push(g.result().hash);
  }
  assert.equal(new Set(styles).size,6);
 }
});
test('os nove biomas de superfície têm detalhes próprios',()=>{
 const samples=[],biomes=Object.keys(art.SURFACE);
 assert.equal(biomes.length,9);
 for(const biome of biomes){
  const g=canvas();
  for(let y=0;y<9;y++)for(let x=0;x<9;x++)art.drawSurfaceTile(g,x,y,8,biome,'grass');
  assert.ok(g.result().count>70);samples.push(g.result().hash);
 }
 assert.equal(new Set(samples).size,9);
});
test('as quatro classes possuem ornamentos e silhuetas diferentes',()=>{
 const hashes=[];
 for(const role of ['peregrino','guardiao','arqueiro','curandeiro']){
  const g=canvas();art.drawHero(g,{role,x:270,y:260},1500);
  assert.ok(g.result().count>=4);hashes.push(g.result().hash);
 }
 assert.equal(new Set(hashes).size,4);
});
test('criaturas diferem por masmorra; chefes recebem mais detalhes',()=>{
 const variants=[];
 for(const z of [12,13,14,15,16,22,28,34]){
  const g=canvas();art.drawMonster(g,{zone:z,x:220,y:200,boss:true},1100);
  variants.push(g.result().hash);
 }
 assert.ok(new Set(variants).size>=4);
 const regular=canvas(),boss=canvas();
 art.drawMonster(regular,{zone:34,x:220,y:200,boss:false},1100);
 art.drawMonster(boss,{zone:34,x:220,y:200,boss:true},1100);
 assert.ok(boss.result().count>regular.result().count);
});
test('portais e impactos usam pixels nítidos e efeitos distintos',()=>{
 const signatures=[];
 for(const p of [{zone:16},{zone:22},{zone:28},{zone:34},{zone:10,gateway:true}]){
  const g=canvas();art.drawPortal(g,p,1234);
  assert.ok(g.result().count>=25);signatures.push(g.result().hash);
 }
 assert.ok(new Set(signatures).size>=4);
 const arrow=canvas(),impact=canvas();
 art.drawCombat(arrow,{kind:'arrow',skill:true});
 art.drawCombat(impact,{kind:'impact',impactAge:70,skill:false});
 assert.ok(impact.result().count>arrow.result().count);
});
test('nova biblioteca carrega antes do atlas e não altera colisões no servidor',()=>{
 const html=read('mundo.html'),render=read('art16.js');
 assert.ok(html.indexOf('/pixel-detail.js')<html.indexOf('/art16.js'));
 for(const fn of ['drawDungeonTile','drawSurfaceTile','drawArchitecture','drawHero','drawMonster','drawPortal','drawCombat'])
  assert.ok(render.includes('pixelDetail.'+fn+'('));
 assert.doesNotMatch(render,/portal_fechado.*kind:'prop'/);
 assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../world-terrain.js'),'utf8'),/pixel-detail/);
});
test('renderização integrada de oito mapas não gera exceções no canvas',()=>{
 let lastImage;
 class MockImage{
  constructor(){this.callbacks={};lastImage=this}
  addEventListener(name,fn){this.callbacks[name]=fn}
 }
 const document={documentElement:{dataset:{}},createElement:tag=>{
  assert.equal(tag,'canvas');
  return{width:0,height:0,getContext:()=>staticCtx}
 }};
 const staticCtx=canvas(),screen=canvas(),scope={window:{OsPeregrinosPixelDetail:art},document,Image:MockImage,Math,console};
 vm.createContext(scope);vm.runInContext(read('art16.js'),scope);
 const renderer=scope.window.PeregrinoArt16.create({ctx:screen,W:768,H:460});
 lastImage.callbacks.load();
 const zones=Array.from({length:40},(_,i)=>({biome:i>=12?'masmorra':'pradaria'}));
 for(const z of [12,13,14,15,16,22,28,34]){
  assert.doesNotThrow(()=>renderer.render({
   zone:z,zones,x:760,y:510,dir:2,monsters:[],players:[],npcs:[],portals:[],
   storyStage:0,cameraX:384,cameraY:282,name:'Gustavo',role:'arqueiro',
   target:null,now:2000,fx:[],lastAction:0,moving:false
  }), 'renderização da região '+z);
  assert.equal(document.documentElement.dataset.pixelFamily,art.styleFor(z).id);
 }
 assert.ok(staticCtx.result().count>10000);
 assert.ok(screen.result().count>0);
});

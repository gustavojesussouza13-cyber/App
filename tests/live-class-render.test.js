'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.join(__dirname,'../public');
const source=fs.readFileSync(path.join(ROOT,'art16.js'),'utf8');
function fakeCanvas(){
 let color='#000';
 const paints=[],words=[];
 const c={
  get fillStyle(){return color},
  set fillStyle(x){color=String(x)},
  set imageSmoothingEnabled(x){},
  set font(x){},set textAlign(x){},set shadowColor(x){},
  set shadowBlur(x){},set lineWidth(x){},set strokeStyle(x){},
  set globalAlpha(x){},
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isFinite));
   assert.ok(w>0&&h>0);
   paints.push([color,Math.round(x),Math.round(y),w,h]);
  },
  fillText(s){words.push(s)},strokeText(s){words.push(s)},
  save(){},restore(){},translate(){},rotate(){},scale(){},
  beginPath(){},ellipse(){},arc(){},rect(){},clip(){},
  moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},
  stroke(){},fill(){},strokeRect(){},drawImage(){},setTransform(){}
 };
 return {context:c,paints,words};
}
function harness(withStudio){
 const surface=fakeCanvas(),floor=fakeCanvas(),frame=fakeCanvas();
 let atlas;
 class ImageMock{
  constructor(){this.callbacks={};atlas=this}
  addEventListener(type,cb){this.callbacks[type]=cb}
 }
 const doc={
  documentElement:{dataset:{}},
  createElement(){return{width:0,height:0,getContext:()=>floor.context}}
 };
 const classes=['peregrino','guardiao','arqueiro','curandeiro'];
 const studio={
  create(){
   return {
    normalizeRole:name=>classes.includes(name)?name:'peregrino',
    // Simula o quadro renderizado pelo Studio sem os blocos de fallback.
    drawHero:(g,p)=>{
     g.fillStyle=colors[p.role]||colors.peregrino;
     g.fillRect(p.x-8,p.y-45,16,26);
     return true;
    }
   };
  }
 };
 const scope={
  window:withStudio?{OsPeregrinosSpriteStudio:studio}:{},
  Image:ImageMock,document:doc,Math,console
 };
 vm.createContext(scope);
 vm.runInContext(source,scope,{filename:'art16.js'});
 const render=scope.window.PeregrinoArt16.create({ctx:surface.context,W:768,H:460});
 atlas.callbacks.load();
 const options={
  zone:0,zones:[{biome:'pradaria'}],
  x:768,y:510,dir:2,name:'Gustavo',role:'peregrino',
  monsters:[],players:[],projectiles:[],npcs:[],portals:[],fx:[],
  cameraX:384,cameraY:282,storyStage:0,now:2100,
  moving:false,target:null,lastAction:0
 };
 function draw(role,dir=2){
  surface.paints.length=0;surface.words.length=0;
  render.render({...options,role,dir});
  return{colors:new Set(surface.paints.map(x=>x[0])),words:[...surface.words],rects:[...surface.paints]};
 }
 return {draw};
}
const colors={
 guardiao:'#2d609b',
 curandeiro:'#fff5e4',
 arqueiro:'#4b8d53',
 peregrino:'#ba5350'
};
const otherTokens={
 guardiao:['#fff5e4','#ba5350'],
 curandeiro:['#2d609b','#4b8d53'],
 arqueiro:['#2d609b','#fff5e4'],
 peregrino:['#2d609b','#fff5e4']
};
for(const withStudio of [true,false]){
 const renderer=withStudio?'sprite procedural':'fallback do atlas clássico';
 test('classe real visível no mundo com '+renderer,()=>{
  const h=harness(withStudio);
  for(const [role,color]of Object.entries(colors)){
   for(const dir of [0,1,2,3]){
    const drawn=h.draw(role,dir);
    assert.ok(drawn.colors.has(color),role+' sem sua cor principal em direção '+dir);
    for(const forbidden of otherTokens[role])
     assert.equal(drawn.colors.has(forbidden),false,role+' herdou outra profissão: '+forbidden);
    const tag={guardiao:'Guardião',curandeiro:'Curandeiro',arqueiro:'Arqueiro',peregrino:'Peregrino'}[role];
    assert.ok(drawn.words.some(x=>x.includes(tag)),
     'a classe que vem do servidor deve aparecer junto ao nome: '+role);
    assert.ok(drawn.rects.length>=(withStudio?1:22),role+' não recebeu arte final');
   }
  }
 });
}
test('visitante usa classe confirmada no servidor; contas novas mantêm seleção inicial',()=>{
 const client=fs.readFileSync(path.join(ROOT,'mmo.js'),'utf8');
 assert.match(client,/session\.role=c\.role/);
 assert.match(client,/session\.formClass!==msg\.self\.role/);
 assert.doesNotMatch(client,/Seu personagem salvo já é /);
 assert.match(client,/const freshSwitch=accountMode&&/);
 const world=fs.readFileSync(path.join(__dirname,'../world-engine.js'),'utf8');
 assert.match(world,/Object\.hasOwn\(CLASSES,d\.role\)/);
 assert.match(client,/msg\.self\.level===1&&msg\.self\.kills===0/);
 assert.match(client,/role:session\.role/);
});
test('versão atualizada impede scripts antigos no cache mobile',()=>{
 const html=fs.readFileSync(path.join(ROOT,'mundo.html'),'utf8');
 for(const asset of ['sprite-studio.js','character-atelier16.js','art16.js','mmo.js'])
  assert.ok(html.includes('/'+asset+'?v='+(asset==='mmo.js'?'maintenance-v1':asset==='character-atelier16.js'?'classes-v9':asset==='sprite-studio.js'?'pc-studio-v5':'pixel-art-v1')),asset+' ainda está cacheado');
});

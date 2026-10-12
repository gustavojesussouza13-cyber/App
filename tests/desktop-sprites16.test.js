'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const desktop=require('../public/desktop-sprites16');
const dir=path.join(__dirname,'../public');
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');

function stage(isDesktop=true){
 let instance;
 let constructed=0,requested='';
 class Img{
  constructor(){constructed++;this.handlers={};instance=this}
  addEventListener(name,cb){this.handlers[name]=cb}
  set src(v){requested=v}
  get src(){return requested}
 }
 const calls=[];
 const surface={imageSmoothingEnabled:true,fillStyle:'',
  fillRect(...args){assert.ok(args.every(Number.isFinite));calls.push(['rect',this.fillStyle,...args])},
  drawImage(...args){assert.ok(args.slice(1).every(Number.isFinite));calls.push(['image',...args])}
 };
 const host={matchMedia:q=>({matches:isDesktop&&q.includes('pointer: fine')})};
 const atlas=desktop.create({windowRef:host,imageCtor:Img});
 return{atlas,surface,calls,load:()=>instance?.handlers.load?.(),constructed:()=>constructed,requested:()=>requested};
}
test('atlas de personagens é ativado apenas em desktops com mouse',()=>{
 const pc=stage(),mobile=stage(false);
 assert.equal(pc.atlas.enabled,true);
 assert.equal(mobile.atlas.enabled,false);
 assert.equal(mobile.constructed(),0);
 assert.equal(mobile.atlas.drawHero(mobile.surface,{role:'peregrino',x:90,y:130},0),false);
 assert.equal(pc.atlas.drawHero(pc.surface,{role:'peregrino',x:90,y:130},0),false);
 assert.match(pc.requested(),/classic-atlas\.png/);
 pc.load();assert.equal(pc.atlas.ready,true);
 assert.equal(pc.atlas.drawHero(pc.surface,{role:'peregrino',x:90,y:130},0),true);
 assert.equal(pc.surface.imageSmoothingEnabled,false);
});
test('quatro heróis usam recortes distintos do atlas, e quadros de combate reais',()=>{
 const x=stage();x.load();
 const frames=[];
 for(const role of Object.keys(desktop.HERO)){
  x.calls.length=0;
  assert.equal(x.atlas.drawHero(x.surface,{role,dir:2,x:160,y:210},0),true);
  const image=x.calls.find(y=>y[0]==='image');
  frames.push(image.slice(2,4).join(':'));
  assert.equal(image[4],40);assert.equal(image[5],48);
  assert.equal(image[8],66);assert.equal(image[9],80);
 }
 assert.equal(new Set(frames).size,4,'heróis não podem parecer o mesmo arqueiro');
 x.calls.length=0;
 x.atlas.drawHero(x.surface,{role:'guardiao',dir:2,x:160,y:210},0,{attacking:true,elapsed:200});
 const strike=x.calls.find(y=>y[0]==='image');
 assert.equal(strike[2],163+80);
 assert.equal(x.atlas.normalizeRole('GUARDIÃO'),'guardiao');
});
test('NPCs principais têm atlas de profissão sem reutilizar a skin do jogador',()=>{
 const x=stage();x.load();
 const roles=['Mercador','Ferreiro','Guarda da Aurora','Viajante','Sacerdotisa','Sábio do Templo'];
 const cuts=[];
 for(const name of roles){
  x.calls.length=0;
  assert.equal(x.atlas.drawNpc(x.surface,{name,x:100,y:145,dir:2},340),true);
  cuts.push(x.calls[0].slice(2,4).join(':'));
 }
 assert.equal(new Set(cuts).size,roles.length);
});
test('chefes humanoides usam atlas e chefes fantásticos preservam sprite existente',()=>{
 const x=stage();x.load();
 const boss={boss:true,type:'chefe',x:120,y:145,dir:2};
 assert.equal(x.atlas.drawMonster(x.surface,boss,700,{type:'chefe',attacking:true,elapsed:170}),true);
 assert.equal(x.atlas.drawMonster(x.surface,{...boss,type:'dragao'},700,{type:'dragao'}),false);
 assert.equal(x.atlas.drawMonster(x.surface,{...boss,boss:false},700,{type:'chefe'}),false);
});
test('render desktop é carregado antes do motor, sem alterar CSS/controles mobile',()=>{
 const page=read('mundo.html'),art=read('art16.js'),client=read('mmo.js');
 assert.ok(page.indexOf('/desktop-sprites16.js')<page.indexOf('/art16.js'));
 assert.match(art,/desktopSprites\?\.drawHero/);
 assert.match(art,/desktopSprites\?\.drawNpc/);
 assert.match(art,/desktopSprites\?\.drawMonster/);
 assert.match(page,/desktop-illustrated-v1/);
 assert.match(client,/touchDevice/);
 assert.doesNotMatch(read('desktop-sprites16.js'),/document\.body\.style|innerHTML/);
});

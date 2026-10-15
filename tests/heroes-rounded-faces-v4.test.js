'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ART=require('../public/heroes-master64');
const APP=require('../public/appearance16');
const STUDIO=require('../public/sprite-studio');
function paint(role,dir=2,action='idle',frame=0,appearance=APP.DEFAULT){
 const ops=[],transforms=[],surface=new Map();
 const g={fillStyle:null,
  save(){transforms.push('save')},restore(){transforms.push('restore')},
  translate(x,y){transforms.push(['translate',x,y])},
  scale(x,y){transforms.push(['scale',x,y])},
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'quadros em pixels inteiros');
   assert.ok(w>0&&h>0,'não há clusters sem largura/altura');
   ops.push({c:this.fillStyle,x,y,w,h});
   for(let i=x;i<x+w;i++)for(let j=y;j<y+h;j++){
    if(i>=0&&i<64&&j>=0&&j<80)surface.set(i+','+j,this.fillStyle);
   }
  }};
 assert.equal(ART.draw(g,{role,dir,action,frame,appearance,colors:STUDIO.ROLES[role]}),true);
 return {ops,transforms,surface,signature:JSON.stringify(ops)};
}
test('três classes possuem contornos faciais rasterizados, não máscaras quadradas',()=>{
 assert.equal(ART.VERSION,'heroes-master64-v6');
 assert.equal(ART.WIDTH,64);assert.equal(ART.HEIGHT,80);
 const roles=['guardiao','arqueiro','curandeiro'];
 for(const role of roles){
  const {ops}=paint(role);
  assert.ok(ops.length>160,'clusters detalhados: '+role);
  assert.ok(ops.some(x=>x.h===1&&x.w>=2&&x.y>=14&&x.y<=35),
   'scanlines de rosto arredondado: '+role);
 }
});
test('curandeiro tem queixo arredondado, olhos, cabelo e véu separados',()=>{
 const app={...APP.DEFAULT,skin:'dourado',hairStyle:'curto',hairColor:'castanho'};
 const {ops,surface}=paint('curandeiro',2,'idle',0,app);
 const skin=APP.SKIN.dourado[0],shade=APP.SKIN.dourado[2],hair=APP.HAIR.castanho[0];
 const faceRows=[23,24,25,26,27,28,29,30,31].map(y=>
  [...surface.entries()].filter(([key,c])=>{
   const [x,cy]=key.split(',').map(Number);
   return cy===y&&x>=25&&x<=44&&(c===skin||c===shade);
  }).length);
 assert.ok(new Set(faceRows).size>=4,'a largura do rosto deve variar com o contorno');
 assert.ok(ops.some(p=>p.c===hair),'cabelo do jogador preservado');
 assert.ok(ops.some(p=>p.c==='#f4bdbe'),'véu de pano distinto da pele');
 assert.ok(ops.some(p=>p.c==='#72dbea'),'cajado tem cristal azulado');
});
test('curandeiro suporta cabelo curto, longo, trançado, raspado e seis peles',()=>{
 const signatures=new Set();
 for(const hairStyle of Object.keys(APP.OPTIONS.hairStyle)){
  const app={...APP.DEFAULT,hairStyle,hairColor:'loiro'};
  const a=paint('curandeiro',2,'idle',0,app);
  signatures.add(a.signature);
  assert.ok(a.ops.some(p=>p.c===APP.HAIR.loiro[0]));
 }
 assert.ok(signatures.size>=5,'penteados diferentes não podem parecer idênticos');
 for(const skin of Object.keys(APP.SKIN)){
  const a=paint('curandeiro',2,'idle',0,{...APP.DEFAULT,skin});
  assert.ok(a.ops.some(p=>p.c===APP.SKIN[skin][0]),'tom de pele '+skin);
 }
});
test('quatro direções, cinco quadros de ataque e seis passadas continuam distintos',()=>{
 for(const role of ['guardiao','arqueiro','curandeiro']){
  const dirs=[0,1,2,3].map(dir=>paint(role,dir));
  assert.ok(new Set(dirs.map(x=>x.signature)).size>=3,role+' vistas não mudam');
  assert.ok(dirs[3].transforms.some(t=>Array.isArray(t)&&t[0]==='scale'&&t[1]===-1));
  const attacks=Array.from({length:5},(_,i)=>paint(role,2,'attack',i).signature);
  const walks=Array.from({length:6},(_,i)=>paint(role,2,'walk',i).signature);
  assert.ok(new Set(attacks).size>=4,'ataques de '+role);
  assert.ok(new Set(walks).size>=5,'caminhada de '+role);
 }
});
test('a roupa e a capa personalizadas mudam o visual, sem alterar o save',()=>{
 const original={...APP.DEFAULT,skin:'profundo',hairColor:'branco',hairStyle:'longo',
  cape:'marinho',outfit:'safira',accessory:'amuleto'};
 const before=JSON.stringify(original);
 for(const role of ['guardiao','arqueiro','curandeiro']){
  const normal=paint(role),changed=paint(role,2,'idle',0,original);
  assert.notEqual(normal.signature,changed.signature);
  assert.ok(changed.ops.some(p=>p.c===APP.COATS.safira[0]));
  assert.ok(changed.ops.some(p=>p.c===APP.SKIN.profundo[0]));
 }
 assert.equal(JSON.stringify(original),before);
});
test('site usa versão V4; todos os outros renderizadores e fortalezas 3D são preservados',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 assert.match(html,/heroes-master64\.js\?v=heroes-master64-v6/);
 assert.match(html,/world-art-master64\.js\?v=world-art-master64-v4/);
 assert.match(html,/guild-city-3d\.js/);
 assert.ok(html.indexOf('/heroes-master64.js')<html.indexOf('/sprite-studio.js'));
 const src=fs.readFileSync(path.join(__dirname,'../public/heroes-master64.js'),'utf8');
 const sandbox={PeregrinosAppearance16:APP};
 vm.createContext(sandbox);vm.runInContext(src,sandbox);
 const g={fillRect(){},save(){},restore(){},translate(){},scale(){}};
 assert.equal(sandbox.OsPeregrinosHeroesMaster64.draw(g,{role:'curandeiro'}),true);
 assert.equal(sandbox.OsPeregrinosHeroesMaster64.VERSION,'heroes-master64-v6');
 assert.doesNotMatch(src,/requestAnimationFrame|setInterval|fetch\(|WebSocket/);
});

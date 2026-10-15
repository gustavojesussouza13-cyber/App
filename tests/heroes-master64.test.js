'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ART=require('../public/heroes-master64');
const APP=require('../public/appearance16');
const {create}=require('../public/sprite-studio');
const read=p=>fs.readFileSync(path.join(__dirname,'../public',p),'utf8');
function surface(){
 const ops=[],g={
  fillStyle:'#fff',
  save(){ops.push(['save'])},restore(){ops.push(['restore'])},
  translate(x,y){ops.push(['translate',x,y])},
  scale(x,y){ops.push(['scale',x,y])},
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'clusters precisam de pixels inteiros');
   assert.ok(w>0&&h>0,'sem polígonos vazios');
   ops.push(['rect',this.fillStyle,x,y,w,h]);
  }
 };
 return{g,ops};
}
function sheet(role,dir=2,action='idle',frame=0,appearance=APP.DEFAULT){
 const out=surface();
 assert.equal(ART.draw(out.g,{role,dir,action,frame,colors:require('../public/sprite-studio').ROLES[role],appearance}),true);
 return out.ops;
}
const sig=ops=>JSON.stringify(ops);
test('três profissões utilizam mestre visual próprio, 64x80 nativo',()=>{
 assert.equal(ART.WIDTH,64);assert.equal(ART.HEIGHT,80);
 assert.equal(ART.VERSION,'heroes-master64-v4');
 assert.deepEqual(Object.keys(ART.ROLES).sort(),['arqueiro','curandeiro','guardiao']);
 for(const role of Object.keys(ART.ROLES)){
  assert.ok(sheet(role).filter(x=>x[0]==='rect').length>110,role+' sem clusters suficientes');
 }
 assert.equal(ART.draw(surface().g,{role:'peregrino'}),false);
 assert.equal(ART.draw(surface().g,{role:'invalido'}),false);
});
test('o escudo, o arco e o cajado possuem marcadores exclusivos',()=>{
 const guard=sheet('guardiao'),arch=sheet('arqueiro',2,'attack',2),heal=sheet('curandeiro',2,'attack',2);
 for(const [ops,color]of [[guard,'#3865a0'],[guard,'#2e65ac'],
  [guard,'#708d9e'],[arch,'#d49e57'],[arch,'#f9f2d8'],
  [heal,'#65d7c6'],[heal,'#70c7e0'],[heal,'#72dbea']])
  assert.ok(ops.some(o=>o[1]===color),color+' ausente');
 assert.notEqual(sig(guard),sig(arch));assert.notEqual(sig(arch),sig(heal));
 assert.equal(guard.some(o=>o[1]==='#72dbea'),false);
 assert.equal(heal.some(o=>o[1]==='#214532'),false);
});
test('cada classe distingue todas as quatro direções sem recuperar geometria de outra classe',()=>{
 for(const role of Object.keys(ART.ROLES)){
  const directions=[0,1,2,3].map(d=>sheet(role,d));
  assert.equal(new Set(directions.map(sig)).size,4,'direções repetidas em '+role);
  assert.ok(directions[3].some(p=>p[0]==='scale'&&p[1]===-1));
 }
});
test('andar, atacar, sofrer dano e morrer mudam a pose sem suavização',()=>{
 for(const role of Object.keys(ART.ROLES)){
  const walks=Array.from({length:6},(_,f)=>sig(sheet(role,2,'walk',f)));
  assert.ok(new Set(walks).size>=5,role+' precisa andar');
  const attacks=Array.from({length:5},(_,f)=>sig(sheet(role,2,'attack',f)));
  assert.ok(new Set(attacks).size>=4,role+' precisa atacar');
  assert.notEqual(sig(sheet(role,2,'hurt',0)),sig(sheet(role,2,'idle',0)));
  assert.ok(sheet(role,2,'death',2).some(x=>x[0]==='scale'&&x[2]<1));
 }
});
test('cores escolhidas pelo jogador afetam os sprites das três classes',()=>{
 const initial=APP.DEFAULT;
 const alternate={...initial,skin:'profundo',outfit:'safira',hairColor:'branco',cape:'marinho',accessory:'tiara'};
 for(const role of Object.keys(ART.ROLES)){
  const normal=sheet(role,2,'idle',0,initial),different=sheet(role,2,'idle',0,alternate);
  assert.notEqual(sig(normal),sig(different));
  for(const hex of [APP.SKIN.profundo[0],APP.COATS.safira[0]]){
   assert.ok(different.some(op=>op[1]===hex),role+': falta cor '+hex);
  }
 }
});
test('mestra carregada antes do estúdio, sem alterar monstros, NPCs ou fortaleza 3D',()=>{
 const html=read('mundo.html'),studio=read('sprite-studio.js');
 assert.ok(html.indexOf('/heroes-master64.js')<html.indexOf('/sprite-studio.js'));
 assert.match(html,/heroes-master64\.js\?v=heroes-master64-v4/);
 assert.match(html,/sprite-studio\.js\?v=world-art-master64-v2/);
 assert.match(studio,/HEROES_MASTER\?\.draw/);
 assert.match(studio,/PILGRIM_MASTER\?\.draw/);
 assert.match(studio,/RETRO\?\.creature/);
 assert.match(studio,/RETRO\?\.npc/);
 const creations=[];
 const st=create({documentRef:{createElement:()=>({
  width:0,height:0,getContext:()=>{
   const surfaceMock=surface();creations.push(surfaceMock.ops);return surfaceMock.g
  }
 })}});
 for(const role of ['peregrino','guardiao','arqueiro','curandeiro']){
  const canvas=st.obtain('hero',role,2,'idle',0,false,0,0,null,initialAppearance());
  assert.equal(canvas.width,64);assert.equal(canvas.height,80);
 }
 assert.equal(new Set(creations.map(sig)).size,4);
 function initialAppearance(){return {...APP.DEFAULT}}
});
test('mídia de toque reorganiza formulário mesmo quando WebView anuncia viewport desktop',()=>{
 const css=read('mmo.css');
 assert.match(css,/@media\s*\(pointer:coarse\)/);
 assert.match(css,/\.appearance-create-panel \.atelier-custom\{/);
 assert.match(css,/flex-direction:column!important/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(css,/\.appearance-create-panel \.atelier-pose-controls/);
 assert.match(htmlVersion(),/mmo\.css\?v=heroes-master64-v2/);
 function htmlVersion(){return read('mundo.html')}
});
test('mestre executa no navegador sem require/import dinâmico nem recursos de terceiros',()=>{
 const scope={PeregrinosAppearance16:APP};vm.createContext(scope);
 vm.runInContext(read('heroes-master64.js'),scope);
 const canvas=surface();
 assert.equal(scope.OsPeregrinosHeroesMaster64.draw(canvas.g,{role:'arqueiro'}),true);
 assert.ok(canvas.ops.length>110);
});

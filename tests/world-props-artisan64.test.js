'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ART=require('../public/world-props-artisan64');
const dir=path.join(__dirname,'../public');
function ctx(){
 const pixels=[];
 return {
  pixels,imageSmoothingEnabled:true,fillStyle:'#000',
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'cada cluster possui coordenadas inteiras');
   assert.ok(w>0&&h>0,'nunca gerar clusters vazios');
   assert.ok(x>=0&&y>=0&&x+w<=64&&y+h<=80,'arte não excede o sprite 64x80');
   pixels.push([this.fillStyle,x,y,w,h]);
  }
 };
}
test('sete tipos de objeto do mundo são feitos na grade nativa 64x80',()=>{
 assert.equal(ART.WIDTH,64);assert.equal(ART.HEIGHT,80);
 assert.equal(ART.KINDS.length,7);
 const signatures=new Set();
 for(const kind of ART.KINDS){
  const g=ctx();
  assert.equal(ART.paint(g,{kind,variant:2,frame:1}),true);
  assert.ok(g.pixels.length>40,'detalhes insuficientes em '+kind);
  const colors=new Set(g.pixels.map(x=>x[0]));
  assert.ok(colors.size>=6,'materiais sem volume '+kind);
  signatures.add(JSON.stringify(g.pixels));
 }
 assert.equal(signatures.size,7,'objetos não devem reutilizar uma silhueta genérica');
 assert.equal(ART.paint(ctx(),{kind:'portal_fechado'}),false,'sem portal decorativo falso');
});
test('estandartes, castelo no mapa e portais possuem variantes; fogo anima em 4 fases',()=>{
 for(const kind of ['estandarte','reino','portal']){
  const signatures=new Set();
  for(let v=0;v<4;v++){
   const g=ctx();ART.paint(g,{kind,variant:v,frame:1});signatures.add(JSON.stringify(g.pixels));
  }
  assert.equal(signatures.size,4,kind+' precisa ter identidade visual própria');
 }
 const flames=new Set();
 for(let f=0;f<4;f++){
  const g=ctx();ART.paint(g,{kind:'fogueira',frame:f});flames.add(JSON.stringify(g.pixels));
 }
 assert.equal(flames.size,4,'fogueira precisa mudar suas chamas');
});
test('sprites em cache não são redesenhados em todo frame',()=>{
 const generated=[];
 const doc={createElement(tag){
  assert.equal(tag,'canvas');
  const g=ctx(),c={width:0,height:0,getContext:()=>g};
  generated.push({g,c});return c;
 }};
 const artist=ART.create({documentRef:doc,maxCached:48});
 const well=artist.sprite('poco',0);
 assert.ok(well&&well.width===64&&well.height===80);
 assert.strictEqual(artist.sprite('poco',0,3),well,'poço estático não precisa 4 sprites');
 const scene={calls:[],imageSmoothingEnabled:true,drawImage(...args){this.calls.push(args)}};
 assert.equal(artist.draw(scene,{kind:'poco',x:100,y:200,w:64,h:52}),true);
 assert.equal(scene.calls[0][1],68);
 assert.equal(scene.calls[0][2],148);
 assert.equal(scene.imageSmoothingEnabled,false);
 assert.equal(artist.draw(scene,{kind:'portal_fechado',x:0,y:0}),false);
 for(let i=0;i<65;i++)artist.sprite('portal',i%4,i%4);
 assert.ok(artist.stats.cached<=48);
 artist.clear();assert.equal(artist.stats.cached,0);
});
test('jogo usa arte 64x80, sem modificar a fortaleza 3D',()=>{
 const html=fs.readFileSync(path.join(dir,'mundo.html'),'utf8');
 const renderer=fs.readFileSync(path.join(dir,'art16.js'),'utf8');
 const art=fs.readFileSync(path.join(dir,'world-props-artisan64.js'),'utf8');
 assert.match(html,/world-props-artisan64\.js\?v=world-props-artisan64-v1/);
 assert.ok(html.indexOf('/world-props-artisan64.js')<html.indexOf('/art16.js'));
 assert.match(renderer,/OsPeregrinosWorldPropsArtisan64\?\.create/);
 assert.match(renderer,/kind:'portal'/);
 assert.match(renderer,/kind:'reino'/);
 assert.match(renderer,/kind:o\.key/);
 assert.match(html,/guild-city-3d\.js/);
 assert.doesNotMatch(art,/three|guild-city-3d|WebSocket|fetch\(/i);
 const context={};vm.createContext(context);vm.runInContext(art,context);
 assert.equal(context.OsPeregrinosWorldPropsArtisan64.VERSION,ART.VERSION);
});

'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const RETRO=require('../public/retro-atlas64'),{create,ROLES,CREATURES}=require('../public/sprite-studio');
const APPEARANCE=require('../public/appearance16');
const root=path.join(__dirname,'../public');
function canvasFixture(){
 const rendered=[];
 const documentRef={createElement(kind){
  assert.equal(kind,'canvas');const ops=[];
  const ctx={fillStyle:'#000',imageSmoothingEnabled:true,
   fillRect(x,y,w,h){
    for(const n of [x,y,w,h])assert.ok(Number.isFinite(n));
    for(const n of [x,y,w,h])assert.ok(Number.isInteger(n),'somente pixels inteiros');
    assert.ok(w>0&&h>0);
    ops.push([this.fillStyle,x,y,w,h]);
   },save(){},restore(){},translate(){},scale(){}};
  const canvas={width:0,height:0,ops,getContext:()=>ctx};
  rendered.push(canvas);return canvas;
 }};
 return {studio:create({documentRef}),rendered};
}
test('quatro classes usam desenhos nativos até 64x80, sem reamostragem de 40x52',()=>{
 assert.equal(RETRO.WIDTH,64);assert.equal(RETRO.HEIGHT,80);
 const fx=canvasFixture();
 for(const role of ['peregrino','guardiao','arqueiro','curandeiro']){
  const canvas=fx.studio.obtain('hero',role,2,'idle',0,false,0,0,null,APPEARANCE.DEFAULT);
  assert.equal(canvas.width,64);assert.equal(canvas.height,80);
  assert.ok(canvas.ops.length>65,role+' deve conter acabamentos e sombreamento');
 }
 assert.notEqual(JSON.stringify(fx.studio.obtain('hero','guardiao',2,'idle',0).ops),
 JSON.stringify(fx.studio.obtain('hero','arqueiro',2,'idle',0).ops));
});
test('cada jogador mantém escolhas próprias e pele, roupas, capa e cabelos alteram pixels reais',()=>{
 const fx=canvasFixture();
 const base={skin:'claro',hairStyle:'curto',hairColor:'preto',eyes:'azul',outfit:'original',cape:'nenhuma',accessory:'nenhum'};
 const other={...base,skin:'profundo',hairStyle:'tranca',hairColor:'ruivo',eyes:'verde',outfit:'safira',cape:'vinho'};
 const a=fx.studio.obtain('hero','curandeiro',2,'idle',0,false,0,0,null,base);
 const b=fx.studio.obtain('hero','curandeiro',2,'idle',0,false,0,0,null,other);
 assert.notEqual(a,b);
 assert.notDeepEqual(a.ops,b.ops);
 assert.ok(b.ops.some(p=>p[0]===APPEARANCE.SKIN.profundo[0]));
 assert.ok(b.ops.some(p=>p[0]===APPEARANCE.COATS.safira[0]));
});
test('monstros e chefes por espécie mantêm anatomias e animações próprias',()=>{
 const fx=canvasFixture();
 for(const [name,c] of Object.entries(CREATURES)){
  const canvas=fx.studio.obtain('monster',name,2,'walk',2,false,20,37);
  assert.equal(canvas.width,64);assert.equal(canvas.height,80);
  assert.ok(canvas.ops.length>18,'monstro '+name+' sem arte');
 }
 const boss=fx.studio.obtain('monster','dragao',2,'attack',2,true,23,101);
 const plain=fx.studio.obtain('monster','dragao',2,'attack',2,false,23,101);
 assert.notDeepEqual(boss.ops,plain.ops,'chefes devem ter coroa e anatomia exclusiva');
});
test('NPCs possuem variações próprias e não reutilizam o sprite do jogador',()=>{
 const fx=canvasFixture();
 const a=fx.studio.obtain('npc','aldeao',2,'idle',0,false,0,0,{id:'historia-0',name:'Lia'});
 const b=fx.studio.obtain('npc','aldeao',2,'idle',0,false,0,0,{id:'historia-1',name:'Cálen'});
 assert.equal(a.width,64);assert.equal(a.height,80);
 assert.notDeepEqual(a.ops,b.ops);
});
test('tridimensionalidade da fortaleza permanece em Three.js ao clicar e construir',()=>{
 const scene=fs.readFileSync(path.join(root,'guild-scene-3d.mjs'),'utf8');
 const city=fs.readFileSync(path.join(root,'guild-city-3d.js'),'utf8');
 const retro=fs.readFileSync(path.join(root,'art16.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'mundo.html'),'utf8');
 const css=fs.readFileSync(path.join(root,'mmo.css'),'utf8');
 assert.match(scene,/THREE\./);
 assert.match(scene,/WebGLRenderer|PerspectiveCamera|OrthographicCamera/);
 assert.match(city,/guild-scene-3d\.mjs/);
 assert.match(html,/guild-city-3d\.js/);
 assert.match(html,/retro-atlas64\.js/);
 assert.ok(html.indexOf('retro-atlas64.js')<html.indexOf('sprite-studio.js'));
 assert.match(retro,/spriteStudio\?\.drawHero/);
 assert.match(css,/O modal das fortalezas/);
});
test('pintura do mundo é totalmente pixelada, sem suavização interpolada',()=>{
 const studio=fs.readFileSync(path.join(root,'sprite-studio.js'),'utf8');
 const landscape=fs.readFileSync(path.join(root,'landscape16.js'),'utf8');
 const editor=fs.readFileSync(path.join(root,'appearance-editor.js'),'utf8');
 assert.match(studio,/imageSmoothingEnabled=false/);
 assert.match(landscape,/SHADE\?\.ground/);
 assert.match(editor,/canvas\.width=128;canvas\.height=160/);
 assert.match(editor,/ctx\.imageSmoothingEnabled=false/);
});

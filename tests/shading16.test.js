'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const SHADING=require('../public/shading16');
const LAND=require('../public/landscape16');
const ART=require('../public/pixel-detail');
const STUDIO=require('../public/sprite-studio');
const ROOT=path.resolve(__dirname,'../public');
const read=n=>fs.readFileSync(path.join(ROOT,n),'utf8');
function scene(){
 let color='';
 const rects=[],ctx={
  get fillStyle(){return color},set fillStyle(c){color=String(c)},
  imageSmoothingEnabled:true,
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'shading must align to pixel grid');
   assert.ok(w>0&&h>0,'shading must draw visible pixels');
   rects.push({color,x,y,w,h});
  },
  drawImage(){},save(){},restore(){},scale(){},translate(){}
 };
 return {ctx,rects,colors:()=>new Set(rects.map(x=>x.color))};
}
const p=LAND.PALETTES.meadow,hash=LAND.hash;
test('sombras são desenhadas apenas com retângulos de pixels sem gradientes ou blur',()=>{
 const src=read('shading16.js');
 assert.doesNotMatch(src,/\b(?:g|ctx)\.(?:shadowBlur|filter|createLinearGradient|ellipse)\b/);
 const s=scene();SHADING.contact(s.ctx,100,200,50);
 assert.ok(s.rects.length>=6);
 assert.ok(s.colors().size>=3);
 assert.ok(s.rects.every(r=>r.y>=195&&r.y<=205));
});
test('grama, caminho, rocha, água e calçamento recebem sombra e luz em planos próprios',()=>{
 for(const kind of ['grass','path','sand','rock','water','paving']){
  const a=scene();SHADING.ground(a.ctx,4,5,1,kind,p,hash);
  assert.ok(a.rects.length>=3,kind);
  assert.ok(a.colors().size>=2,kind);
  assert.ok(a.rects.some(v=>v.x>4*32+16),'face direita sombreada: '+kind);
  assert.ok(a.rects.some(v=>v.x<4*32+20),'lado esquerdo iluminado: '+kind);
 }
});
test('árvores apresentam brilho na copa, sombra interna, lado escuro do tronco e sombra projetada',()=>{
 for(const biome of Object.keys(LAND.PALETTES)){
  const q=scene(),palette=LAND.PALETTES[biome];
  SHADING.tree(q.ctx,palette,2);
  assert.ok(q.rects.length>=40,biome);
  assert.ok(q.colors().has(palette[3]),'realce superior ausente '+biome);
  assert.ok(q.colors().has(palette[4]),'sombra sob folhagem ausente '+biome);
  assert.ok(q.rects.some(v=>v.y>=76&&v.color.includes('8')),'sombra no chão '+biome);
  assert.ok(q.rects.some(v=>v.color==='#e0b379'),'luz no tronco');
 }
});
test('arbustos e pedras apresentam oclusão sem suavizar a borda dos pixels',()=>{
 for(const biome of Object.keys(LAND.PALETTES)){
  const bush=scene(),rock=scene();
  SHADING.bush(bush.ctx,LAND.PALETTES[biome],1);
  SHADING.rock(rock.ctx,LAND.PALETTES[biome],1);
  assert.ok(bush.rects.length>12&&rock.rects.length>6);
  assert.ok(bush.colors().has(LAND.PALETTES[biome][4]));
  assert.ok(rock.colors().has('#dfe6d3'));
 }
});
test('cada masmorra recebe oclusão nas lajes respeitando sua paleta própria',()=>{
 const sig=[];
 for(let i=0;i<4;i++){
  const t=ART.THEMES[i],g=scene();
  SHADING.dungeon(g.ctx,2,3,12+i,'path',t,hash);
  assert.ok(g.colors().has(t.dark));
  assert.ok(g.colors().has(t.light));
  assert.ok(g.colors().has(t.accent));
  sig.push([...g.colors()].join(','));
 }
 assert.equal(new Set(sig).size,4);
});
test('quatro classes recebem planos distintos em roupas e rostos',()=>{
 for(const role of Object.keys(STUDIO.ROLES)){
  const a=scene(),c=STUDIO.ROLES[role];
  SHADING.hero(a.ctx,c,{role,front:true,frame:2});
  assert.ok(a.rects.length>=14,role);
  assert.ok(a.colors().has(c.edge));
  assert.ok(a.colors().has(c.light));
  assert.ok(a.colors().has('#f8d2a3'),'realce facial '+role);
 }
});
test('criaturas recebem luz superior e oclusão inferior independentemente da espécie',()=>{
 for(const [name,s] of Object.entries(STUDIO.CREATURES)){
  const a=scene();
  SHADING.creature(a.ctx,s,{shape:s.shape,boss:true,frame:1,zone:12});
  assert.ok(a.rects.length>=5,name);
  assert.ok(a.colors().has(s.dark));
  assert.ok(a.colors().has(s.light));
 }
});
test('camada de sombra carrega antes das outras bibliotecas e preserva o terreno autoritativo',()=>{
 const html=read('mundo.html');
 assert.ok(html.indexOf('/shading16.js')<html.indexOf('/pixel-detail.js'));
 assert.ok(html.indexOf('/shading16.js')<html.indexOf('/sprite-studio.js'));
 assert.ok(html.indexOf('/shading16.js')<html.indexOf('/landscape16.js'));
 assert.match(read('art16.js'),/shade16\.contact\(g,x,y,w\)/);
 assert.match(read('landscape16.js'),/SHADE\?\.tree\(g,p,v\)/);
 assert.match(read('pixel-detail.js'),/SHADE\?\.dungeon\(g,tx,ty,z,kind,t,hash\)/);
 assert.match(read('sprite-studio.js'),/SHADE\?\.hero\(g,c,/);
 const terrain=fs.readFileSync(path.join(__dirname,'../world-terrain.js'),'utf8');
 assert.doesNotMatch(terrain,/shading16|shade16/i);
});
test('biblioteca roda sem módulos Node em navegador simples',()=>{
 const sandbox={Math,globalThis:null};
 sandbox.globalThis=sandbox;
 vm.createContext(sandbox);
 vm.runInContext(read('shading16.js'),sandbox);
 assert.equal(typeof sandbox.OsPeregrinosShade16.contact,'function');
});

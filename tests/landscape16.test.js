'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const LAND=require('../public/landscape16');
const ROOT=path.join(__dirname,'../public');
function mockSurface(){
 const ops=[];let color='';
 const g={
  set fillStyle(value){color=String(value)},
  get fillStyle(){return color},
  imageSmoothingEnabled:true,
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isFinite),'pixel coordinates must be finite');
   assert.ok([x,y,w,h].every(Number.isInteger),'pixel art must use integer coordinates');
   assert.ok(w>0&&h>0,'no empty pixels');
   ops.push([color,x,y,w,h]);
  },
  drawImage:(...args)=>ops.push(['image',...args.slice(1)]),
  save(){},restore(){}
 };
 return{g,ops};
}
function signature(ops){
 let code=2166136261;
 for(const op of ops){
  for(const value of op){
   const part=String(value);
   for(let i=0;i<part.length;i++)code=Math.imul((code^part.charCodeAt(i))>>>0,16777619)>>>0;
  }
 }
 return code;
}
function mockDocument(){
 const sprites=[];
 return{
  sprites,createElement(name){
   assert.equal(name,'canvas');const {g,ops}=mockSurface();
   const c={width:0,height:0,getContext:()=>g,ops};sprites.push(c);return c;
  }
 };
}
test('nove biomas recebem gramados e caminhos com paletas de desenho próprias',()=>{
 assert.equal(Object.keys(LAND.PALETTES).length,9);
 const distinct=[];
 for(const biome of Object.keys(LAND.PALETTES)){
  const {g,ops}=mockSurface();
  for(let y=0;y<3;y++)for(let x=0;x<3;x++)
   LAND.terrainTile(g,x,y,1,biome,'grass',()=> 'grass');
  assert.ok(ops.length>100,biome+' needs pixel clusters');
  distinct.push(signature(ops));
 }
 assert.equal(new Set(distinct).size,9);
});
test('borda orgânica entre grama e estrada é desenhada nos quatro lados',()=>{
 const counts=[];
 for(const edge of ['N','S','E','W']){
  const plain=mockSurface(),border=mockSurface();
  LAND.terrainTile(plain.g,4,5,1,'meadow','path',()=> 'path');
  LAND.terrainTile(border.g,4,5,1,'meadow','path',(x,y)=>{
   if(edge==='N'&&y===4)return'grass';
   if(edge==='S'&&y===6)return'grass';
   if(edge==='E'&&x===5)return'grass';
   if(edge==='W'&&x===3)return'grass';
   return'path';
  });
  assert.ok(border.ops.length>plain.ops.length,edge+' missing transition');
  counts.push(signature(border.ops));
 }
 assert.equal(new Set(counts).size,4);
});
test('água, pedra, grama e terra têm composições distintas',()=>{
 const types=['water','rock','grass','path','paving'];
 const signatures=types.map(kind=>{
  const {g,ops}=mockSurface();
  LAND.terrainTile(g,4,6,5,'river',kind,()=>kind);
  assert.ok(ops.length>=10);
  return signature(ops);
 });
 assert.equal(new Set(signatures).size,types.length);
});
test('árvores possuem tronco, raiz, contorno e copa em múltiplos tons',()=>{
 const doc=mockDocument(),land=LAND.create({documentRef:doc});
 const tree=land.sprite('tree','forest',2);
 assert.ok(tree);
 assert.equal(tree.width,104);assert.equal(tree.height,86);
 assert.ok(tree.ops.length>100,'copas devem ter muitos detalhes');
 const colors=new Set(tree.ops.map(v=>v[0]));
 assert.ok(colors.has('#173e32'),'dark outlines required');
 assert.ok(colors.has('#92bd73'),'canopy highlight required');
 assert.ok(tree.ops.some(v=>v[0]==='#6b5239'),'trunk should remain visible');
});
test('copas, arbustos e pedras são distintos entre si e entre variantes',()=>{
 const doc=mockDocument(),land=LAND.create({documentRef:doc});
 const sig=[];
 for(const kind of ['tree','bush','rock']){
  for(const biome of ['meadow','forest','swamp']){
   const sheet=land.sprite(kind,biome,0);
   sig.push(signature(sheet.ops));
  }
 }
 assert.equal(new Set(sig).size,9);
 const a=land.sprite('tree','forest',0),b=land.sprite('tree','forest',1);
 assert.notEqual(signature(a.ops),signature(b.ops));
});
test('desenho ao vivo usa canvas em cache em vez de reconstruir árvores a cada frame',()=>{
 const doc=mockDocument(),land=LAND.create({documentRef:doc,maxCached:30}),frame=mockSurface();
 const o={kind:'tree',x:420,y:365};
 assert.equal(land.drawProp(frame.g,o,'meadow'),true);
 const n=doc.sprites.length;
 for(let i=0;i<100;i++)assert.equal(land.drawProp(frame.g,o,'meadow'),true);
 assert.equal(doc.sprites.length,n,'tree must only be created once');
 assert.equal(frame.g.imageSmoothingEnabled,false);
 assert.ok(frame.ops.every(v=>v[0]==='image'));
 assert.equal(land.drawProp(frame.g,{kind:'portal',x:2,y:3},'meadow'),false,'no decorative fake portals');
 for(let j=0;j<50;j++)land.sprite('tree',j%2?'forest':'meadow',j%4);
 assert.ok(land.stats.cached<=30);
 land.clear();assert.equal(land.stats.cached,0);
});
test('cenário mantém colisão e portais controlados pelo servidor',()=>{
 const s=fs.readFileSync(path.join(ROOT,'art16.js'),'utf8');
 const html=fs.readFileSync(path.join(ROOT,'mundo.html'),'utf8');
 assert.match(s,/landscape\.terrainTile\(g,tx,ty,z,biome,k,\(cx,cy\)=>kind\(cx,cy,z,biome\)\)/);
 assert.match(s,/landscape\?\.drawProp\(g,o,cache\.biome\)/);
 assert.ok(html.indexOf('/landscape16.js')<html.indexOf('/art16.js'));
 const server=fs.readFileSync(path.join(__dirname,'../world-terrain.js'),'utf8');
 assert.doesNotMatch(server,/landscape16/);
 assert.doesNotMatch(s,/key:biome==='dungeon'\?'portal_fechado'/);
});
test('o arquivo de paisagem executa também em navegador sem acesso ao Node',()=>{
 const source=fs.readFileSync(path.join(ROOT,'landscape16.js'),'utf8');
 const scope={window:{},Math,Map,Number,Array,Object};
 vm.createContext(scope);
 assert.doesNotThrow(()=>vm.runInContext(source,scope));
 assert.equal(typeof scope.window.OsPeregrinosLandscape16.create,'function');
});

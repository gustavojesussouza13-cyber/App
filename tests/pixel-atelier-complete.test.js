'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ATELIER=require('../public/pixel-atelier-v1');
const ART=require('../public/world-art-master64');
const HERO=require('../public/heroes-master64');
const LAND=require('../public/landscape16');
const NPC=require('../public/character-atelier16');
const STUDIO=require('../public/sprite-studio');
function surface(maxX=64,maxY=80){
 const writes=[],g={fillStyle:'#000',imageSmoothingEnabled:true,
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'grade nativa, sem subpixel');
   assert.ok(w>0&&h>0,'dimensões válidas');
   writes.push([this.fillStyle,x,y,w,h]);
  },
  save(){},restore(){},translate(){},scale(){},drawImage(){}};
 return{g,writes};
}
test('o ateliê é realmente desenhado um pixel por vez, com matrizes autorais',()=>{
 assert.equal(ATELIER.VERSION,'handpixels64-v2');
 assert.equal(ATELIER.FAMILIES.length,15);
 const {g,writes}=surface();
 let n=0;
 for(const key of Object.keys(ATELIER.GLYPHS)){
  const shades=ATELIER.MATERIALS.leaf;
  const count=ATELIER.PAINT(g,key,2,2,shades);
  assert.ok(count>=8,'assinatura artesanal vazia: '+key);
  n+=count;
 }
 assert.ok(n>650);
 assert.ok(writes.every(x=>x[3]===1&&x[4]===1),'cada marca deve ser 1×1');
});
test('três classes e todas as famílias recebem tramas individuais pixel a pixel',()=>{
 const signatures=new Set();
 for(const role of ['guardiao','arqueiro','curandeiro']){
  const a=surface();
  assert.ok(ATELIER.hero(a.g,{role,action:'attack',frame:2,colors:STUDIO.ROLES[role]})>=55);
  signatures.add(JSON.stringify(a.writes));
  const sprite=surface();
  assert.equal(HERO.draw(sprite.g,{role,colors:STUDIO.ROLES[role],action:'walk',frame:3}),true);
  assert.ok(sprite.writes.some(x=>x[3]===1&&x[4]===1),'quadro final inclui pontos desenhados');
 }
 assert.equal(signatures.size,3);
 const monsters=new Set();
 for(const type of ATELIER.FAMILIES){
  const a=surface();
  assert.ok(ATELIER.creature(a.g,{type,boss:false,species:3})>=20);
  monsters.add(JSON.stringify(a.writes));
  const final=surface();
  assert.equal(ART.creature(final.g,{type,boss:true,action:'attack',frame:2,zone:12,species:3}),true);
  assert.ok(final.writes.length>70,type+' desapareceu');
 }
 assert.equal(monsters.size,15,'cada anatomia deve ter gravação própria');
});
test('56 habitantes continuam únicos e respeitam os seis ofícios',()=>{
 const signs=new Set();
 for(let i=0;i<NPC.NPC_STYLES.length;i++){
  const a=surface();
  const profession=ART.NPC_JOBS(NPC.NPC_STYLES[i]);
  assert.ok(ATELIER.npc(a.g,{profession,identity:i,action:'idle',frame:0})>=30);
  signs.add(JSON.stringify(a.writes));
  const c=surface();
  ART.npc(c.g,{npc:{id:'historia-'+i,name:NPC.NPC_STYLES[i]},dir:2});
  assert.ok(c.writes.length>105);
 }
 assert.equal(NPC.NPC_STYLES.length,56);
 assert.ok(signs.size>=20,'padrão por profissão e identidade');
});
test('nove biomas, água e props recebem pontos 1×1 sem custo por frame',()=>{
 const signatures=new Set();
 for(const biome of Object.keys(LAND.PALETTES)){
  const s=surface();
  const n=ATELIER.terrain(s.g,{x:0,y:0,biome,kind:'grass',seed:19});
  assert.ok(n>=20);
  assert.ok(s.writes.every(x=>x[3]===1&&x[4]===1));
  signatures.add(JSON.stringify(s.writes));
 }
 assert.equal(signatures.size,Object.keys(LAND.PALETTES).length);
 for(const kind of ['water','paving','rock','path','sand']){
  const s=surface();
  assert.ok(ATELIER.terrain(s.g,{x:0,y:0,biome:'coast',kind,seed:123})>=10);
 }
 for(const kind of ['tree','bush','rock']){
  const a=surface(104,86);
  assert.ok(ATELIER.prop(a.g,{kind,biome:'forest',variant:1})>=12);
  assert.ok(a.writes.every(x=>x[3]===1&&x[4]===1));
 }
});
test('sem suavização, browser carrega ateliê antes dos masters, não altera fortaleza 3D',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 const positions=['/pixel-atelier-v1.js','/heroes-master64.js','/world-art-master64.js','/sprite-studio.js','/landscape16.js'];
 assert.ok(html.indexOf(positions[0])>=0);
 for(let i=1;i<positions.length;i++)assert.ok(html.indexOf(positions[0])<html.indexOf(positions[i]));
 assert.match(html,/heroes-master64\.js\?v=heroes-master64-v6/);
 assert.match(html,/world-art-master64\.js\?v=world-art-master64-v4/);
 assert.match(html,/landscape16\.js\?v=world-landscape-v3/);
 assert.match(html,/guild-city-3d\.js/);
 const code=fs.readFileSync(path.join(__dirname,'../public/pixel-atelier-v1.js'),'utf8');
 assert.doesNotMatch(code,/requestAnimationFrame|setInterval|localStorage|fetch\(|WebSocket/);
 const sandbox={};vm.createContext(sandbox);vm.runInContext(code,sandbox);
 assert.equal(sandbox.OsPeregrinosHandPixels.VERSION,ATELIER.VERSION);
});

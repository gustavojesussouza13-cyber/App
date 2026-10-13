'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const POLISH=require('../public/sprite-polish16');
const STUDIO=require('../public/sprite-studio');
const source=name=>fs.readFileSync(path.join(__dirname,'../public',name),'utf8');

function sketch(fn){
 const pixels=[];
 const g={
  fillStyle:'#000',
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'pixel não inteiro');
   assert.ok(w>0&&h>0,'tamanho de pixel inválido');
   pixels.push([this.fillStyle,x,y,w,h]);
  },
  save(){},restore(){},translate(){},scale(){}
 };
 fn(g);
 return pixels;
}
const signature=ops=>JSON.stringify(ops);

test('acabamento mantém todas as classes visualmente distintas em 4 direções',()=>{
 const roles=['peregrino','guardiao','arqueiro','curandeiro'];
 for(const dir of [0,1,2,3]){
  const arts=roles.map(role=>sketch(g=>POLISH.hero(g,{role,dir,action:'idle',frame:0,by:0})));
  assert.equal(new Set(arts.map(signature)).size,4);
  for(const art of arts)assert.ok(art.length>=9);
 }
});
test('heróis possuem quadros diferentes de ataque e caminhada',()=>{
 for(const role of STUDIO.create({documentRef:null}).roles){
  const idle=sketch(g=>POLISH.hero(g,{role,dir:2,action:'idle',frame:0}));
  const attack=sketch(g=>POLISH.hero(g,{role,dir:2,action:'attack',frame:2}));
  assert.notEqual(signature(idle),signature(attack),role+' sem efeito de ataque');
 }
});
test('polimento abrange criaturas comuns e chefes sem sprites duplicados',()=>{
 const types=Object.keys(STUDIO.CREATURES);
 assert.ok(types.length>=15);
 const signatures=[];
 for(const type of types){
  const normal=sketch(g=>POLISH.creature(g,{type,species:4,action:'idle',frame:0}));
  const boss=sketch(g=>POLISH.creature(g,{type,species:4,boss:true,action:'idle',frame:0}));
  const strike=sketch(g=>POLISH.creature(g,{type,species:4,action:'attack',frame:2}));
  assert.ok(boss.length>normal.length,type+' sem detalhes de chefe');
  assert.notEqual(signature(normal),signature(strike),type+' sem pose de ataque');
  signatures.push(signature(normal));
 }
 assert.ok(new Set(signatures).size>=10);
});
test('acabamento inclui mercador, ferreiro, guarda, viajante, sacerdotisa e sábio',()=>{
 const styles=['mensageiro','escavador','guarda-aurora','viajante','curandeira','bibliotecario'];
 const arts=styles.map(style=>sketch(g=>POLISH.npc(g,{style,dir:2,action:'walk',frame:2})));
 assert.equal(new Set(arts.map(signature)).size,styles.length);
 assert.ok(arts.every(art=>art.length>=4));
 assert.ok(sketch(g=>POLISH.npc(g,{style:'viajante',dir:3})).length>0);
});
test('mundo aberto carrega polimento antes do Studio e não tampa os quadros finalizados',()=>{
 const html=source('mundo.html'),studio=source('sprite-studio.js'),art=source('art16.js');
 assert.ok(html.indexOf('/sprite-polish16.js')<html.indexOf('/sprite-studio.js'));
 assert.ok(html.indexOf('/sprite-studio.js')<html.indexOf('/art16.js'));
 assert.match(studio,/POLISH\?\.hero\(/);
 assert.match(studio,/POLISH\?\.creature\(/);
 assert.match(studio,/POLISH\?\.npc\(/);
 assert.match(art,/const finalRole=studioHero\?spriteStudio\.normalizeRole/);
 assert.match(art,/pngSprite\?desktopSprites\.normalizeRole/);
 assert.match(art,/illustratedV3\?desktopCharactersV3\.normalizeRole/);
 assert.match(art,/animated\?spriteStudio\.normalizeRole/);
 assert.match(art,/drawClassIdentity\(g,p,dir,now,moved\)/);
});

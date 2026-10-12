'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ATELIER=require('../public/character-atelier16');
const STUDIO=require('../public/sprite-studio');
const read=x=>fs.readFileSync(path.join(__dirname,'../public',x),'utf8');
function drawRecorder(){
 let ink='';
 const ops=[];
 return {ops,ctx:{
   get fillStyle(){return ink},
   set fillStyle(v){ink=String(v)},
   fillRect(x,y,w,h){
    assert.ok([x,y,w,h].every(Number.isInteger));
    assert.ok(w>0&&h>0);
    ops.push([ink,x,y,w,h]);
   },
   save(){ops.push(['save'])},
   restore(){ops.push(['restore'])},
   translate(x,y){ops.push(['translate',x,y])},
   scale(x,y){ops.push(['scale',x,y])}
 }};
}
function artOf(role,dir=2,action='idle',frame=0){
 const a=drawRecorder();
 ATELIER.classIdentity(a.ctx,STUDIO.ROLES[role],{role,dir,action,frame});
 return a.ops;
}
const has=(ops,color)=>ops.some(op=>op[0]===color);
test('Guardião conserva escudo azul, capacete e espada em todas as direções e poses',()=>{
 for(const dir of [0,1,2,3])for(const action of ['idle','walk','attack']){
  const ops=artOf('guardiao',dir,action,2);
  assert.ok(has(ops,'#3865a0'),'escudo ausente em '+dir+' '+action);
  assert.ok(has(ops,'#ecf6f0'),'lâmina de aço ausente');
  assert.ok(has(ops,'#c3d4dd'),'capacete ausente');
  assert.ok(has(ops,'#d9a95c'),'emblema ausente');
  assert.equal(has(ops,'#72dbea'),false,'sem cristal de curandeiro');
  assert.equal(has(ops,'#214532'),false,'sem capuz de arqueiro');
 }
});
test('Curandeiro tem capuz de marfim, veste branca e cajado em todas as poses',()=>{
 for(const dir of [0,1,2,3])for(const action of ['idle','walk','attack']){
  const ops=artOf('curandeiro',dir,action,2);
  assert.ok(has(ops,'#f2e8da'),'veste clara ausente');
  assert.ok(has(ops,'#c65e70'),'estola ausente');
  assert.ok(has(ops,'#72dbea'),'cristal ausente');
  assert.ok(has(ops,'#fffaf0'),'capuz claro ausente');
  assert.equal(has(ops,'#3865a0'),false,'sem escudo de guardião');
  assert.equal(has(ops,'#214532'),false,'sem capuz de arqueiro');
 }
});
test('Arqueiro mantém identidade própria em todas as direções',()=>{
 for(const dir of [0,1,2,3]){
  const ops=artOf('arqueiro',dir);
  assert.ok(has(ops,'#214532'));assert.ok(has(ops,'#c6a573'));
  assert.equal(has(ops,'#3865a0'),false);
  assert.equal(has(ops,'#72dbea'),false);
 }
});
test('Peregrino conserva lenço e couro, sem peças de outras classes',()=>{
 const ops=artOf('peregrino',2);
 assert.ok(has(ops,'#ba6050'));assert.ok(has(ops,'#a4774b'));
 assert.equal(has(ops,'#3865a0'),false);
 assert.equal(has(ops,'#72dbea'),false);
});
test('as quatro classes possuem silhuetas diferentes até de costas',()=>{
 for(const dir of [0,1,2,3]){
  const signatures=Object.keys(STUDIO.ROLES).map(role=>artOf(role,dir).map(op=>op.join(':')).join('|'));
  assert.equal(new Set(signatures).size,4,'classes se confundem na direção '+dir);
 }
});
test('identificadores exibidos com acentos e maiúsculas são normalizados',()=>{
 for(const [display,canonical] of [['Guardião','guardiao'],['GuArDiÃo','guardiao'],['CURANDEIRO','curandeiro'],['Arqueiro','arqueiro'],['PEREGRINO','peregrino']])
  assert.equal(STUDIO.normalizeRole(display),canonical);
 assert.equal(STUDIO.normalizeRole('not-a-class'),'peregrino');
});
test('estúdio escolhe o sprite final correto e reutiliza cache por classe',()=>{
 const created=[];
 const doc={createElement(){
  const rec=drawRecorder();
  const c={width:0,height:0,ops:rec.ops,getContext:()=>rec.ctx};
  created.push(c);return c;
 }};
 const renderer=STUDIO.create({documentRef:doc}),frames=[];
 for(const role of ['Guardião','Curandeiro','Arqueiro','Peregrino']){
  const sprite=renderer.obtain('hero',role,2,'idle',0,false,0);
  frames.push(sprite);
  assert.equal(sprite.width,40);assert.equal(sprite.height,52);
 }
 assert.equal(new Set(frames).size,4);
 assert.ok(has(frames[0].ops,'#3865a0'));
 assert.ok(has(frames[1].ops,'#72dbea'));
 assert.ok(has(frames[2].ops,'#214532'));
 assert.ok(has(frames[3].ops,'#ba6050'));
 const count=created.length;
 assert.equal(renderer.obtain('hero','guardiao',2,'idle',0,false,0),frames[0]);
 assert.equal(created.length,count);
});
test('HTML carrega código corrigido e invalida cache de navegadores',()=>{
 const html=read('mundo.html');
 assert.ok(html.indexOf('/character-atelier16.js')<html.indexOf('/sprite-studio.js'));
 assert.match(html,/character-atelier16\.js\?v=classes-v9/);
 assert.match(html,/sprite-studio\.js\?v=classes-v9/);
 assert.match(html,/art16\.js\?v=classes-v9/);
 assert.match(read('sprite-studio.js'),/ATELIER\?\.classIdentity\?\.\(g,c,/);
});
test('todos os módulos atualizados permanecem sintaticamente válidos',()=>{
 for(const file of ['character-atelier16.js','sprite-studio.js'])
  assert.doesNotThrow(()=>new vm.Script(read(file),{filename:file}),file);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const MASTER=require('../public/peregrino-master64');
const APP=require('../public/appearance16');
const {create}=require('../public/sprite-studio');
const read=file=>fs.readFileSync(path.join(__dirname,'../public',file),'utf8');
function makeCanvas(){
 const ops=[],g={
  fillStyle:'#fff',save(){ops.push(['save'])},restore(){ops.push(['restore'])},
  translate(x,y){ops.push(['translate',x,y])},scale(x,y){ops.push(['scale',x,y])},
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'todo cluster usa coordenadas inteiras');
   assert.ok(w>0&&h>0,'cluster tem área positiva');
   ops.push(['pixel',this.fillStyle,x,y,w,h]);
  }
 };
 return {g,ops};
}
const signature=(ops)=>JSON.stringify(ops);
test('nova arte do Peregrino usa 64x80 nativos e dezenas de clusters pintados',()=>{
 assert.equal(MASTER.WIDTH,64);assert.equal(MASTER.HEIGHT,80);
 assert.equal(MASTER.VERSION,'peregrino-master64-v2');
 const {g,ops}=makeCanvas();
 assert.equal(MASTER.draw(g,{dir:2,action:'idle',frame:0,colors:{},appearance:APP.DEFAULT}),true);
 assert.ok(ops.filter(o=>o[0]==='pixel').length>165);
 for(const color of ['#b34246','#742b40','#856343','#c6d6d8','#f5f4e2']){
  assert.ok(ops.some(o=>o[1]===color),'material e identidade precisam de '+color);
 }
 assert.equal(MASTER.draw(g,{role:'arqueiro'}),false,'a biblioteca nova só substitui o Peregrino');
});
test('quadros de caminhada e ataques são distintos, sem trocar o rosto de classe',()=>{
 const walk=Array.from({length:6},(_,frame)=>{
  const x=makeCanvas();MASTER.draw(x.g,{dir:2,action:'walk',frame,colors:{},appearance:APP.DEFAULT});
  return signature(x.ops);
 });
 assert.ok(new Set(walk).size>=5);
 const atk=Array.from({length:5},(_,frame)=>{
  const x=makeCanvas();MASTER.draw(x.g,{dir:2,action:'attack',frame,colors:{},appearance:APP.DEFAULT});
  return signature(x.ops);
 });
 assert.ok(new Set(atk).size>=4);
});
test('quatro direções, costas, golpe e hit usam proporções e cores próprias',()=>{
 const shapes=[];
 for(const dir of [0,1,2,3]){
  const {g,ops}=makeCanvas();
  MASTER.draw(g,{dir,action:'walk',frame:2,colors:{},appearance:APP.DEFAULT});
  if(dir===3)assert.ok(ops.some(o=>o[0]==='scale'&&o[1]===-1));
  shapes.push(signature(ops));
 }
 assert.equal(new Set(shapes).size,4);
 const hurt=makeCanvas();
 MASTER.draw(hurt.g,{dir:2,action:'hurt',frame:1,colors:{}});
 assert.ok(hurt.ops.some(p=>p[1]==='#f8d1b2'));
 const dead=makeCanvas();
 MASTER.draw(dead.g,{dir:2,action:'death',frame:2,colors:{}});
 assert.ok(dead.ops.some(p=>p[0]==='scale'&&p[2]<1));
});
test('as opções salvas de pele, cabelo, roupa, capa e acessórios aparecem nos pixels',()=>{
 const common={...APP.DEFAULT};
 const customized={...APP.DEFAULT,skin:'profundo',hairColor:'branco',
  hairStyle:'tranca',outfit:'safira',cape:'marinho',eyes:'verde',accessory:'tiara'};
 const base=makeCanvas(),other=makeCanvas();
 const colors={coat:'#8a6245',edge:'#402e32',light:'#b99163',trim:'#dcc28e',
  hair:'#493328',skin:'#e1af7f',boots:'#352b34',metal:'#acb6a4',gem:'#a9e6ca'};
 MASTER.draw(base.g,{colors,appearance:common});
 MASTER.draw(other.g,{colors,appearance:customized});
 assert.notEqual(signature(base.ops),signature(other.ops));
 for(const color of [APP.SKIN.profundo[0],APP.HAIR.branco[0],APP.COATS.safira[0],'#354c73'])
  assert.ok(other.ops.some(p=>p[1]===color),'personalização ausente: '+color);
});
test('renderizador real prioriza o novo mestre sem mudar classes nem monstruário',()=>{
 const src=read('sprite-studio.js'),html=read('mundo.html');
 assert.match(src,/PILGRIM_MASTER\?\.draw/);
 assert.match(src,/name==='peregrino'/);
 assert.ok(html.indexOf('/peregrino-master64.js')<html.indexOf('/sprite-studio.js'));
 assert.match(html,/peregrino-master64\.js\?v=peregrino-master64-v2/);
 assert.match(html,/sprite-studio\.js\?v=world-art-master64-v2/);
 assert.match(html,/appearance-editor\.js\?v=peregrino-master64-v1/);
 assert.match(html,/mmo\.css\?v=heroes-master64-v2/);
 const draws=[];
 const docs={createElement:()=>({width:0,height:0,getContext:()=>{
  const obj=makeCanvas();draws.push(obj.ops);return obj.g;
 }})};
 const s=create({documentRef:docs});
 const p=s.obtain('hero','peregrino',2,'idle',0,false,0,0,null,APP.DEFAULT);
 const q=s.obtain('hero','guardiao',2,'idle',0,false,0,0,null,APP.DEFAULT);
 assert.equal(p.width,64);assert.equal(q.height,80);
 assert.notDeepEqual(draws[0],draws[1],'guardião não pode assumir a arte do Peregrino');
 assert.ok(draws[0].length>150);
});
test('prévia permite girar, alterar ação e avançar quadro sem laço de CPU',()=>{
 const editor=read('appearance-editor.js'),css=read('mmo.css');
 assert.match(editor,/direction\.addEventListener\('change',render\)/);
 assert.match(editor,/animation\.addEventListener\('change'/);
 assert.match(editor,/nextFrame\.addEventListener\('click'/);
 assert.match(editor,/Number\(direction\.value\|\|2\)/);
 assert.match(editor,/poseFrame%frames\[action\]/);
 assert.doesNotMatch(editor,/setInterval|requestAnimationFrame/);
 assert.match(css,/@media\(max-width:850px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.atelier-custom-fields select\{/);
 assert.match(css,/overflow-x:hidden/);
});

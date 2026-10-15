'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const PILGRIM=require('../public/peregrino-master64');
const APP=require('../public/appearance16');
const STUDIO=require('../public/sprite-studio');
function draw(opts={}){
 const pixels=[],transforms=[];
 const g={fillStyle:'',save(){transforms.push('save')},
  restore(){transforms.push('restore')},
  translate(x,y){transforms.push(['translate',x,y])},
  scale(x,y){transforms.push(['scale',x,y])},
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'grade sem subpixels');
   assert.ok(w>0&&h>0,'pixel cluster precisa ter tamanho');
   pixels.push({color:this.fillStyle,x,y,w,h});
  }};
 assert.equal(PILGRIM.draw(g,{role:'peregrino',colors:STUDIO.ROLES.peregrino,
  appearance:APP.DEFAULT,...opts}),true);
 return{pixels,transforms};
}
const sig=p=>JSON.stringify(p.pixels);
test('Peregrino V2 preserva grade nativa e usa materiais variados sem filtro',()=>{
 assert.equal(PILGRIM.VERSION,'peregrino-master64-v2');
 assert.equal(PILGRIM.WIDTH,64);assert.equal(PILGRIM.HEIGHT,80);
 const {pixels}=draw();
 assert.ok(pixels.length>230,'mais clusters de arte artesanal que a geração antiga');
 for(const color of ['#b34246','#742b40','#856343','#c6d6d8','#f5f4e2','#f0c997'])
  assert.ok(pixels.some(p=>p.color===color),'material ausente '+color);
});
test('cinco keyframes de espada têm geometrias de ataque e fio reais',()=>{
 const frames=Array.from({length:5},(_,frame)=>draw({action:'attack',frame}));
 assert.equal(new Set(frames.map(sig)).size,5);
 assert.ok(frames[3].pixels.some(p=>p.color==='#f5f4e2'&&p.x>=32),
  'o corte de impacto leva o aço para o lado oposto');
 assert.ok(frames[2].pixels.some(p=>p.color==='#8ee0ec'),'rastro no golpe');
 assert.ok(frames[3].pixels.some(p=>p.color==='#8ee0ec'),'rastro na finalização');
 assert.ok(frames[0].pixels.some(p=>p.color==='#87563c'),'empunhadura');
});
test('passadas possuem contrapeso de botas e cachecol com balanço secundário',()=>{
 const idle=draw({action:'idle',frame:0});
 const walk=Array.from({length:6},(_,frame)=>draw({action:'walk',frame}));
 assert.equal(new Set(walk.map(sig)).size,6);
 assert.notEqual(sig(idle),sig(walk[2]));
 for(const group of walk){
  assert.ok(group.pixels.some(p=>p.color==='#b1875d'),'sola da bota');
  assert.ok(group.pixels.some(p=>p.color==='#f5a17c'),'cachecol solto');
 }
});
test('rosto e cabelo preservam olhos, escolhas de pele e penteados',()=>{
 for(const skin of Object.keys(APP.SKIN)){
  const app={...APP.DEFAULT,skin};
  const pixels=draw({appearance:app}).pixels;
  assert.ok(pixels.some(p=>p.color===APP.SKIN[skin][0]),'pele '+skin);
  assert.ok(pixels.some(p=>p.color===APP.SKIN[skin][2]),'sombra da pele '+skin);
 }
 for(const style of Object.keys(APP.OPTIONS.hairStyle)){
  const pixels=draw({appearance:{...APP.DEFAULT,hairStyle:style,hairColor:'branco'}}).pixels;
  assert.ok(pixels.some(p=>p.color===APP.HAIR.branco[0]),'penteado '+style);
 }
 const back=draw({dir:0});
 assert.notEqual(sig(back),sig(draw({dir:2})));
 assert.notEqual(sig(draw({dir:1})),sig(draw({dir:2})));
 assert.ok(back.pixels.some(p=>p.color==='#725037'),'equipamento traseiro');
 assert.ok(draw({dir:3}).transforms.some(t=>Array.isArray(t)&&t[0]==='scale'&&t[1]===-1));
});
test('capas e acessórios alteram o visual sem sobrescrever a conta',()=>{
 const input={...APP.DEFAULT,skin:'escuro',hairStyle:'tranca',hairColor:'azul',
  outfit:'violeta',cape:'marinho',accessory:'amuleto'};
 const original=JSON.stringify(input);
 const cape=draw({appearance:input}),plain=draw();
 assert.notEqual(sig(cape),sig(plain));
 assert.ok(cape.pixels.some(p=>p.color==='#354c73'));
 assert.ok(cape.pixels.some(p=>p.color===APP.COATS.violeta[0]));
 assert.equal(JSON.stringify(input),original,'nunca modificar o save de aparência');
});
test('master atualizado funciona também no navegador e chega ao jogo real',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 const source=fs.readFileSync(path.join(__dirname,'../public/peregrino-master64.js'),'utf8');
 assert.match(html,/peregrino-master64\.js\?v=peregrino-master64-v2/);
 assert.ok(html.indexOf('peregrino-master64.js')<html.indexOf('sprite-studio.js'));
 const browser={PeregrinosAppearance16:APP};
 vm.createContext(browser);
 vm.runInContext(source,browser);
 assert.equal(browser.OsPeregrinosPilgrimMaster64.VERSION,'peregrino-master64-v2');
 const doc={createElement(){return {width:0,height:0,getContext(){
  return{fillRect(){},save(){},restore(){},translate(){},scale(){},set imageSmoothingEnabled(v){assert.equal(v,false)}};
 }}}};
 const studio=STUDIO.create({documentRef:doc});
 const first=studio.obtain('hero','peregrino',2,'attack',3,false,0,0,null,APP.DEFAULT);
 const again=studio.obtain('hero','peregrino',2,'attack',3,false,0,0,null,APP.DEFAULT);
 assert.equal(first.width,64);assert.strictEqual(first,again,'cache de sprites por frame');
});

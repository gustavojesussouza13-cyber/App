'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ART=require('../public/peregrino-artisan64');
const APP=require('../public/appearance16');
const STUDIO=require('../public/sprite-studio');
const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
function render({role='peregrino',dir=2,action='idle',frame=0,appearance=APP.DEFAULT}={}){
 const pixels=[],transforms=[];
 const ctx={
  fillStyle:'#000',save(){transforms.push('save')},
  restore(){transforms.push('restore')},
  translate(x,y){transforms.push(['translate',x,y])},
  scale(x,y){transforms.push(['scale',x,y])},
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'pixel art uses native integer positions');
   assert.ok(w>0&&h>0,'nonempty clusters only');
   pixels.push([this.fillStyle,x,y,w,h]);
  }};
 return{drawn:ART.draw(ctx,{role,dir,action,frame,
  colors:STUDIO.ROLES.peregrino,appearance}),pixels,transforms};
}
const signature=r=>JSON.stringify(r.pixels);
test('novo mestre preserva 64x80 e o percurso principal nao perde o Peregrino',()=>{
 assert.equal(ART.VERSION,'peregrino-artisan64-v4');
 assert.equal(ART.WIDTH,64);
 assert.equal(ART.HEIGHT,80);
 assert.equal(render({role:'arqueiro'}).drawn,false);
 const r=render();
 assert.equal(r.drawn,true);
 assert.ok(r.pixels.length>=100,'silhouette must be detailed');
 for(const c of ['#a9c3c7','#fff7df','#aa3544','#eb7860','#27242f']){
  assert.ok(r.pixels.some(p=>p[0]===c),'missing material '+c);
 }
});
test('corte tem cinco poses distintas, com aço e efeitos corretamente posicionados',()=>{
 const frames=Array.from({length:5},(_,i)=>render({action:'attack',frame:i}));
 assert.equal(new Set(frames.map(signature)).size,5);
 assert.ok(frames[3].pixels.some(p=>p[0]==='#a9c3c7'&&p[1]>40));
 assert.ok(frames[2].pixels.some(p=>p[0]==='#60c8e5'));
 assert.ok(frames[3].pixels.some(p=>p[0]==='#d9fff9'));
 const idle=render();
 assert.ok(idle.pixels.some(p=>p[0]==='#a9c3c7'&&p[1]<14&&p[2]>56),
  'idle holds a diagonal sword, not the old upright column');
});
test('seis passadas e quatro direcoes possuem sprites distintos',()=>{
 for(const dir of [0,1,2,3]){
  const walks=Array.from({length:6},(_,i)=>signature(render({dir,action:'walk',frame:i})));
  assert.ok(new Set(walks).size>=5,'six walking poses differ');
 }
 const dirs=[0,1,2,3].map(dir=>render({dir,action:'idle',frame:0}));
 assert.ok(new Set(dirs.map(signature)).size>=3);
 assert.ok(dirs[3].transforms.some(t=>Array.isArray(t)&&t[0]==='scale'&&t[1]===-1));
 assert.notEqual(signature(dirs[0]),signature(dirs[2]));
});
test('todos os tons de pele, penteados, capas e acessórios continuam salvos',()=>{
 const original={...APP.DEFAULT,skin:'profundo',hairColor:'branco',
  hairStyle:'longo',outfit:'safira',cape:'marinho',accessory:'tiara'};
 const before=JSON.stringify(original);
 const colored=render({appearance:original}),base=render();
 assert.notEqual(signature(colored),signature(base));
 for(const col of [APP.SKIN.profundo[0],APP.HAIR.branco[0],
  APP.COATS.safira[0],'#354c73']){
  assert.ok(colored.pixels.some(p=>p[0]===col),'missing customizable color '+col);
 }
 assert.equal(JSON.stringify(original),before);
 for(const skin of Object.keys(APP.SKIN)){
  assert.ok(render({appearance:{...APP.DEFAULT,skin}}).pixels.some(p=>p[0]===APP.SKIN[skin][0]),skin);
 }
});
test('dano/morte animados sem deslocar dados nem executar scripts externos',()=>{
 const injured=render({action:'hurt',frame:1});
 assert.ok(injured.pixels.some(p=>p[0]==='#e27768'));
 const dead=render({action:'death',frame:3});
 assert.ok(dead.transforms.some(t=>Array.isArray(t)&&t[0]==='scale'&&t[2]<1));
 const src=fs.readFileSync(path.join(__dirname,'../public/peregrino-artisan64.js'),'utf8');
 const scope={PeregrinosAppearance16:APP};vm.createContext(scope);vm.runInContext(src,scope);
 assert.equal(scope.OsPeregrinosArtisan64.VERSION,'peregrino-artisan64-v4');
 assert.equal(scope.OsPeregrinosArtisan64.draw({
  fillRect(){},save(){},restore(){},translate(){},scale(){}
 },{role:'peregrino'}),true);
});
test('estudio prioritiza o novo mestre; outras classes nao usam o Peregrino',()=>{
 const studioSource=fs.readFileSync(path.join(__dirname,'../public/sprite-studio.js'),'utf8');
 assert.match(studioSource,/PILGRIM_ARTISAN\?\.draw/);
 assert.ok(studioSource.indexOf('PILGRIM_ARTISAN?.draw')<studioSource.indexOf('PILGRIM_MASTER?.draw'));
 assert.ok(html.indexOf('peregrino-artisan64.js')<html.indexOf('sprite-studio.js'));
 assert.match(html,/peregrino-artisan64\.js\?v=peregrino-artisan64-v4/);
 assert.match(html,/sprite-studio\.js\?v=world-art-master64-v4/);
 const created=[];
 const studio=STUDIO.create({documentRef:{createElement:()=>({
  width:0,height:0,getContext:()=>{
   const ops=[];created.push(ops);
   return {fillStyle:'#000',fillRect(x,y,w,h){ops.push([this.fillStyle,x,y,w,h])},
    save(){},restore(){},translate(){},scale(){},imageSmoothingEnabled:false};
  }
 })}});
 const pilgrim=studio.obtain('hero','peregrino',2,'idle',0,false,0,0,null,APP.DEFAULT);
 const guard=studio.obtain('hero','guardiao',2,'idle',0,false,0,0,null,APP.DEFAULT);
 assert.equal(pilgrim.width,64);assert.equal(guard.height,80);
 assert.notDeepEqual(created[0],created[1]);
 assert.strictEqual(studio.obtain('hero','peregrino',2,'idle',0,false,0,0,null,APP.DEFAULT),pilgrim);
});

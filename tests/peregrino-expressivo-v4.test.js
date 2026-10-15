'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ART=require('../public/peregrino-artisan64');
const APPEAR=require('../public/appearance16');
const read=pathName=>fs.readFileSync(path.join(__dirname,'../public',pathName),'utf8');
function paint(options={}){
 const pixels=[],moves=[];
 const ctx={fillStyle:'',save(){moves.push(['save'])},restore(){moves.push(['restore'])},
  translate(x,y){moves.push(['translate',x,y])},scale(x,y){moves.push(['scale',x,y])},
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'clusters na grade inteira');
   assert.ok(x>=0&&y>=0&&x+w<=64&&y+h<=80,'nenhum pixel fora do sprite 64x80');
   pixels.push({c:this.fillStyle,x,y,w,h});
  }};
 assert.equal(ART.draw(ctx,{role:'peregrino',appearance:APPEAR.DEFAULT,action:'idle',dir:2,frame:0,...options}),true);
 return{pixels,moves,signature:JSON.stringify(pixels)};
}
test('visual v4 usa grade nativa sem recortar o penteado ou a arma',()=>{
 assert.equal(ART.VERSION,'peregrino-artisan64-v4');
 assert.equal(ART.WIDTH,64);assert.equal(ART.HEIGHT,80);
 assert.ok(paint().pixels.length>100);
 for(const action of ['idle','walk','attack','hurt','death'])
  for(const dir of [0,1,2,3])
   for(const frame of [0,1,2,3,4,5])
    paint({action,dir,frame});
});
test('o primeiro quadro de ataque não é o quadro parado e possui ombro conectado à espada',()=>{
 assert.notEqual(paint({action:'attack',frame:0}).signature,paint({action:'idle',frame:0}).signature);
 const attack=Array.from({length:5},(_,frame)=>paint({action:'attack',frame}));
 assert.equal(new Set(attack.map(x=>x.signature)).size,5);
 for(const pose of attack)assert.ok(pose.pixels.some(p=>p.c==='#eec477'||p.c==='#8c6244'));
});
test('variações de cabelo têm silhueta própria e realces respeitam a cor salva',()=>{
 const light={...APPEAR.DEFAULT,hairStyle:'longo',hairColor:'loiro',skin:'claro'};
 const dark={...light,hairColor:'preto'};
 const short={...light,hairStyle:'curto'};
 const shaved={...light,hairStyle:'raspado'};
 const A=paint({appearance:light}),B=paint({appearance:dark});
 assert.notEqual(A.signature,B.signature);
 assert.notEqual(A.signature,paint({appearance:short}).signature);
 assert.notEqual(A.signature,paint({appearance:shaved}).signature);
 assert.ok(A.pixels.some(p=>p.c===APPEAR.HAIR.loiro[0]));
 assert.ok(A.pixels.some(p=>p.c===APPEAR.HAIR.loiro[1]));
 assert.ok(B.pixels.some(p=>p.c===APPEAR.HAIR.preto[0]));
 for(const skin of Object.keys(APPEAR.SKIN)){
  const p=paint({appearance:{...light,skin}});
  assert.ok(p.pixels.some(x=>x.c===APPEAR.SKIN[skin][0]));
 }
});
test('os três acessórios são realmente desenhados e a seleção não é alterada',()=>{
 const base=paint();
 const signatures=[];
 for(const accessory of ['tiara','brinco','amuleto']){
  const saved={...APPEAR.DEFAULT,accessory};
  const before=JSON.stringify(saved);
  const output=paint({appearance:saved});
  assert.notEqual(output.signature,base.signature,accessory+' deve modificar a imagem');
  assert.equal(JSON.stringify(saved),before);
  signatures.push(output.signature);
 }
 assert.equal(new Set(signatures).size,3);
 for(const cape of ['vinho','marinho','musgo','marfim']){
  const saved={...APPEAR.DEFAULT,cape};
  const drawn=paint({appearance:saved});
  assert.notEqual(drawn.signature,base.signature,'capa '+cape);
 }
});
test('costas, lateral e frente diferem; espada e cachecol se mantêm na identidade',()=>{
 const views=[0,1,2,3].map(dir=>paint({dir}));
 assert.ok(new Set(views.map(x=>x.signature)).size>=3);
 assert.ok(views[3].moves.some(t=>t[0]==='scale'&&t[1]===-1));
 assert.notEqual(views[0].signature,views[2].signature);
 for(const x of views)
  assert.ok(x.pixels.some(p=>p.c==='#aa3544')||x.pixels.some(p=>p.c==='#692a3d'));
});
test('cliente carrega o novo mestre primeiro e mantém fallback, sem mudar outras classes',()=>{
 const html=read('mundo.html'),studio=read('sprite-studio.js');
 assert.match(html,/peregrino-artisan64\.js\?v=peregrino-artisan64-v4/);
 assert.match(html,/sprite-studio\.js\?v=world-art-master64-v1/);
 assert.ok(html.indexOf('peregrino-artisan64.js')<html.indexOf('sprite-studio.js'));
 assert.ok(studio.indexOf('PILGRIM_ARTISAN?.draw')<studio.indexOf('PILGRIM_MASTER?.draw'));
 assert.match(studio,/HEROES_MASTER\?\.draw/);
 const scope={PeregrinosAppearance16:APPEAR};
 vm.createContext(scope);
 vm.runInContext(read('peregrino-artisan64.js'),scope);
 assert.equal(scope.OsPeregrinosArtisan64.VERSION,'peregrino-artisan64-v4');
});

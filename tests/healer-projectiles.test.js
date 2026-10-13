'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {World,CLASSES}=require('../world-engine');
const {create}=require('../public/combat-effects');
const pixelDetail=require('../public/pixel-detail');
const root=path.join(__dirname,'../public');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

function worldFixture(t,role='curandeiro'){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-magias-'));
 const events=[];
 const world=new World({
  send:(_socket,msg)=>events.push(msg),
  getOnline:()=>0,
  hasClassicName:()=>false,
  dataFile:path.join(folder,'world.json')
 });
 t.after(()=>{world.stop();fs.rmSync(folder,{recursive:true,force:true})});
 const c={socket:{},worldPlayer:null};
 world.join(c,{name:'CurandeiroTeste',token:'b'.repeat(64)});
 const player=c.worldPlayer;
 world.chooseClass(player,role);
 const monster=world.monsters.get(0)[0];
 player.x=monster.x+110;player.y=monster.y;
 return {world,events,player,monster};
}
test('Curandeiro dispara orbe sagrado a distância no ataque normal',t=>{
 const {world,events,player,monster}=worldFixture(t);
 const hp=monster.hp;
 world.attack(player,monster.id,false);
 assert.ok(monster.hp<hp);
 const msg=events.find(e=>e.type==='hit');
 assert.ok(msg);
 assert.equal(msg.projectile,'holy-bolt');
 assert.equal(msg.skill,false);
 assert.deepEqual(msg.from,{x:Math.round(player.x+25),y:Math.round(player.y-57)});
 assert.deepEqual(msg.to,{x:Math.round(monster.x),y:Math.round(monster.y-22)});
 assert.ok(msg.damage>0);
});
test('habilidade do Curandeiro combina cura original com projétil mágico aprimorado',t=>{
 const {world,events,player,monster}=worldFixture(t);
 player.save.hp=45;
 world.attack(player,monster.id,true);
 const msg=events.find(e=>e.type==='hit');
 assert.equal(msg.projectile,'holy-bolt');
 assert.equal(msg.skill,true);
 assert.ok(msg.damage>=CLASSES.curandeiro.attack);
 assert.ok(player.save.hp>45,'cura sagrada já existente não deve desaparecer');
});
test('magia não é exibida se ataque estiver fora do alcance',t=>{
 const {world,events,player,monster}=worldFixture(t);
 player.x=monster.x+500;
 const hp=monster.hp;
 world.attack(player,monster.id,false);
 assert.equal(monster.hp,hp);
 assert.equal(events.some(e=>e.type==='hit'),false);
});
test('Arqueiro conserva flechas; Guardião e Peregrino não recebem feitiço',t=>{
 for(const role of ['arqueiro','guardiao','peregrino']){
  const {world,events,player,monster}=worldFixture(t,role);
  player.x=monster.x+32;
  world.attack(player,monster.id,false);
  const msg=events.find(e=>e.type==='hit');
  assert.ok(msg,role);
  assert.equal(msg.projectile,role==='arqueiro'?'arrow':undefined,role);
 }
});
test('a magia nasce do cajado, atravessa o mapa e impacta uma única vez',()=>{
 const fx=create();
 const hit={projectile:'holy-bolt',from:{x:80,y:100},to:{x:240,y:140},
  skill:false,damage:17};
 assert.equal(fx.fire(hit,1000),true);
 const start=fx.frame(1000)[0];
 assert.equal(start.kind,'magic');
 assert.equal(start.projectile,'holy-bolt');
 assert.equal(start.x,80);assert.equal(start.y,100);
 const mid=fx.frame(1160)[0];
 assert.equal(mid.kind,'magic');
 assert.ok(mid.x>80&&mid.x<240);
 assert.ok(mid.y>100&&mid.y<140);
 const arrival=fx.frame(1400)[0];
 assert.equal(arrival.kind,'magic-impact');
 assert.equal(arrival.x,240);
 assert.equal(arrival.y,140);
 assert.equal(arrival.justHit,true);
 assert.equal(fx.frame(1410)[0].justHit,false);
 assert.equal(fx.frame(1700).length,0);
});
test('orbe de habilidade mantém modo especial e viaja mais lentamente que uma flecha',()=>{
 const fx=create();
 const from={x:0,y:0},to={x:170,y:0};
 fx.fire({projectile:'arrow',from,to,damage:18},0);
 fx.fire({projectile:'holy-bolt',from,to,damage:24,skill:true},0);
 const shots=fx.frame(260);
 const arrow=shots.find(s=>s.projectile==='arrow');
 const holy=shots.find(s=>s.projectile==='holy-bolt');
 assert.equal(arrow.kind,'impact');
 assert.equal(holy.kind,'magic');
 assert.equal(holy.skill,true);
 assert.ok(holy.x>0&&holy.x<170);
 fx.clear();assert.deepEqual(fx.frame(270),[]);
});
test('rejeita coordenadas inválidas, eventos falsos e limita projéteis simultâneos',()=>{
 const fx=create(2);
 for(const invalid of [
  {projectile:'holy-bolt',from:{x:0,y:0},to:{x:Infinity,y:3}},
  {projectile:'holy-bolt',from:{x:0,y:0},to:{x:900,y:0}},
  {projectile:'holy-bolt',from:{x:0,y:0},to:{x:0,y:0}},
  {projectile:'sword',from:{x:0,y:0},to:{x:90,y:0}}
 ])assert.equal(fx.fire(invalid,0),false);
 for(let i=0;i<7;i++)assert.equal(fx.fire({
  projectile:'holy-bolt',from:{x:i,y:10},to:{x:i+100,y:20}},i),true);
 assert.equal(fx.count(),2);
});
function brush(){
 let color='';
 const ops=[];
 const g={
  get fillStyle(){return color},set fillStyle(v){color=String(v)},
  save(){ops.push(['save'])},restore(){ops.push(['restore'])},
  translate(x,y){ops.push(['translate',x,y])},rotate(v){ops.push(['rotate',v])},
  beginPath(){ops.push(['beginPath'])},moveTo(){ops.push(['moveTo'])},
  lineTo(){ops.push(['lineTo'])},stroke(){ops.push(['stroke'])},
  closePath(){ops.push(['closePath'])},fill(){ops.push(['fill'])},
  arc(){ops.push(['arc'])},
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'pixels alinhados à grade');
   ops.push(['fillRect',color,x,y,w,h]);
  }
 };
 return{g,ops};
}
test('Curandeiro tem orbe 16-bit visível, rastro, brilho e impacto em vez de flecha',()=>{
 const art=read('art16.js');
 const start=art.indexOf(' function drawBow(');
 const end=art.indexOf(' function character(',start);
 assert.ok(start>0&&end>start);
 const stage=brush(),scope={g:stage.g,Math};
 vm.createContext(scope);
 vm.runInContext(art.slice(start,end),scope);
 vm.runInContext("drawProjectile(g,{kind:'magic',x:230,y:280,angle:0.6,progress:.5,skill:false})",scope);
 const normal=stage.ops.filter(o=>o[0]==='fillRect');
 assert.ok(normal.length>=16,'orbe precisa ter volume e partículas');
 assert.ok(normal.some(o=>o[1]==='#58c3d5'));
 assert.ok(normal.some(o=>o[1]==='#fff5c1'));
 assert.equal(stage.ops.filter(o=>o[0]==='arc').length,0);
 const before=stage.ops.length;
 vm.runInContext("drawProjectile(g,{kind:'magic-impact',x:290,y:320,impactAge:90,skill:true})",scope);
 const effect=stage.ops.slice(before);
 assert.ok(effect.filter(o=>o[0]==='fillRect').length>=25,'impacto com explosão 16-bit');
 assert.ok(effect.some(o=>o[1]==='#fce6a7'));
});
test('biblioteca de acabamento não desenha flecha sobre os feitiços',()=>{
 const g=brush();
 pixelDetail.drawCombat(g.g,{kind:'magic',progress:.6,skill:true});
 assert.ok(g.ops.some(op=>op[1]==='#d3f6e9'));
 assert.equal(g.ops.some(op=>op[1]==='#61462b'),false);
 const impact=brush();
 pixelDetail.drawCombat(impact.g,{kind:'magic-impact',impactAge:70,skill:false});
 assert.ok(impact.ops.length>=8);
});
test('pipeline do site usa eventos reais, versions de cache e áudio opcional',()=>{
 const world=fs.readFileSync(path.join(__dirname,'../world-engine.js'),'utf8');
 const effects=read('combat-effects.js'),art=read('art16.js'),client=read('mmo.js'),html=read('mundo.html');
 const sounds=read('sounds-desktop.js');
 assert.match(world,/projectile:'holy-bolt'/);
 assert.match(effects,/shot\.projectile==='holy-bolt'/);
 assert.match(art,/drawHolyBolt\(g,shot\)/);
 assert.match(client,/combatFx\.fire\(msg,performance\.now\(\)\)/);
 assert.match(client,/msg\.projectile==='holy-bolt'\?'magic'/);
 assert.match(sounds,/magic:\[\[/);
 for(const name of ['pixel-detail.js','art16.js','combat-effects.js','mmo.js','sounds-desktop.js']){
  assert.ok(html.includes('/'+name+'?v='+(name==='mmo.js'?'maintenance-v1':name==='art16.js'?'pixel-art-v1':'holy-v1')),name+' sem versão nova');
 }
 assert.ok(html.indexOf('/combat-effects.js')<html.indexOf('/mmo.js'));
 assert.ok(html.indexOf('/pixel-detail.js')<html.indexOf('/art16.js'));
 for(const name of ['combat-effects.js','pixel-detail.js','art16.js','mmo.js'])
  assert.doesNotThrow(()=>new vm.Script(read(name),{filename:name}));
});

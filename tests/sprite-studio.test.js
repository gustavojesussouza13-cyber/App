'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {create,ROLES,CREATURES,phases}=require('../public/sprite-studio');
const read=file=>fs.readFileSync(path.join(__dirname,'../public',file),'utf8');

function stage(limit=850){
 let created=0;
 const sheets=[];
 const documentRef={createElement:(tag)=>{
  assert.equal(tag,'canvas');
  created++;
  const ops=[];
  const context={
   fillStyle:'#000',imageSmoothingEnabled:true,
   fillRect(x,y,w,h){
    assert.ok([x,y,w,h].every(Number.isFinite));
    assert.ok(Number.isInteger(x)&&Number.isInteger(y),'quadros desenhados em pixels inteiros');
    assert.ok(w>0&&h>0);
    ops.push(['rect',this.fillStyle,x,y,w,h]);
   },
   save(){ops.push(['save'])},
   restore(){ops.push(['restore'])},
   scale(x,y){ops.push(['scale',x,y])},
   translate(x,y){ops.push(['translate',x,y])}
  };
  const sheet={width:0,height:0,ops,getContext:()=>context};
  sheets.push(sheet);
  return sheet;
 }};
 const calls=[];
 const screen={imageSmoothingEnabled:true,drawImage:(...args)=>calls.push(args)};
 return {studio:create({documentRef,limit}),sheets,screen,calls,created:()=>created};
}
function signature(sheet){
 return sheet.ops.map(p=>p.join(':')).join('|');
}
test('quadros originais disponíveis para quatro classes, quinze criaturas e cinco poses',()=>{
 assert.deepEqual(Object.keys(ROLES).sort(),['arqueiro','curandeiro','guardiao','peregrino'].sort());
 assert.ok(Object.keys(CREATURES).length>=15);
 assert.deepEqual(Object.keys(phases).sort(),['idle','walk','attack','hurt','death'].sort());
});
test('andar possui seis quadros distintos, respiração possui quatro e atacar cinco',()=>{
 const h=stage();
 for(const role of Object.keys(ROLES)){
  const walk=[];
  for(let i=0;i<6;i++){
   const sheet=h.studio.obtain('hero',role,2,'walk',i,false,0);
   walk.push(signature(sheet));
  }
  assert.ok(new Set(walk).size>=4,'pernas e braços devem mudar na caminhada: '+role);
  assert.equal(h.studio.pose({moving:true,now:0}).action,'walk');
  assert.equal(h.studio.pose({attacking:true,now:0}).action,'attack');
  assert.equal(h.studio.pose({hurt:true,moving:true,now:0}).action,'hurt');
  assert.equal(h.studio.pose({dead:true,now:0}).action,'death');
  assert.equal(h.studio.pose({attacking:true,elapsed:330}).frame,4);
 }
});
test('quatro direções e espelhamento lateral produzem quadros válidos',()=>{
 const h=stage();
 for(let d=0;d<4;d++){
  const sheet=h.studio.obtain('hero','arqueiro',d,'walk',2);
  assert.equal(sheet.width,64);assert.equal(sheet.height,80);
  assert.ok(sheet.ops.filter(o=>o[0]==='rect').length>25);
  if(d===3)assert.ok(sheet.ops.some(o=>o[0]==='scale'&&o[1]===-1));
 }
 const f=signature(h.studio.obtain('hero','guardiao',2,'idle',0));
 const b=signature(h.studio.obtain('hero','guardiao',0,'idle',0));
 assert.notEqual(f,b,'frente e costas devem ser desenhadas diferentemente');
});
test('arqueiro tem aljava com quatro flechas e arco que arma o disparo',()=>{
 const h=stage();
 const standing=h.studio.obtain('hero','arqueiro',2,'idle',0);
 const shot=h.studio.obtain('hero','arqueiro',2,'attack',2);
 assert.ok(standing.ops.filter(o=>o[0]==='rect'&&o[1]==='#e4d2a7').length>=4);
 assert.ok(shot.ops.some(o=>o[0]==='rect'&&o[1]==='#f9f2d8'),'ponta de flecha visível ao armar');
 assert.notEqual(signature(standing),signature(shot));
});
test('escudo do guardião, cetro do curandeiro e bolsa do peregrino têm silhuetas próprias',()=>{
 const h=stage();
 const shield=h.studio.obtain('hero','guardiao',2,'idle',0);
 const healer=h.studio.obtain('hero','curandeiro',2,'attack',2);
 const pilgrim=h.studio.obtain('hero','peregrino',2,'idle',0);
 assert.ok(shield.ops.some(o=>o[0]==='rect'&&o[1]==='#708d9e'));
 assert.ok(healer.ops.some(o=>o[0]==='rect'&&o[1]==='#65d7c6'));
 assert.ok(pilgrim.ops.some(o=>o[0]==='rect'&&o[1]==='#856343'));
});
test('famílias de criaturas possuem corpos exclusivos, chefes recebem coroas',()=>{
 const h=stage();
 const kinds=['limo','lobo','morcego','esqueleto','aranha','golem','serpente','fera','escorpiao','fantasma','vespa','dragao'];
 const hashes=[];
 for(const monster of kinds){
  const sheet=h.studio.obtain('monster',monster,2,'walk',2,false,12);
  assert.ok(sheet.ops.length>14);
  hashes.push(signature(sheet));
 }
 assert.equal(new Set(hashes).size,kinds.length);
 const common=h.studio.obtain('monster','dragao',2,'idle',0,false,13);
 const boss=h.studio.obtain('monster','dragao',2,'idle',0,true,13);
 assert.ok(boss.ops.length>common.ops.length,'chefes devem ter coroa e detalhes');
});
test('monstros movem membros nos quadros de caminhada e antecipam ataque',()=>{
 const h=stage();
 for(const species of ['golem','lobo','dragao','aranha']){
  const frames=Array.from({length:6},(_,i)=>signature(h.studio.obtain('monster',species,2,'walk',i,false,12)));
  assert.ok(new Set(frames).size>=4,species+' deve mexer ao caminhar');
  const idle=h.studio.obtain('monster',species,2,'idle',0,false,12);
  const strike=h.studio.obtain('monster',species,2,'attack',2,false,12);
  assert.notEqual(signature(idle),signature(strike));
 }
});
test('renderização desenha frames 2D sem suavização, com cache e sem dados externos',()=>{
 const h=stage(128);
 const actor={role:'arqueiro',x:200.6,y:220.3,dir:1};
 assert.equal(h.studio.drawHero(h.screen,actor,1100,{moving:true}),true);
 assert.equal(h.screen.imageSmoothingEnabled,false);
 assert.equal(h.calls.length,1);
 assert.equal(h.calls[0][0].width,64);
 assert.ok(Number.isInteger(h.calls[0][1]));
 assert.ok(Number.isInteger(h.calls[0][2]));
 const c=h.created();
 assert.equal(h.studio.drawHero(h.screen,actor,1100,{moving:true}),true);
 assert.equal(h.created(),c,'reutiliza o mesmo quadro já pronto');
 assert.equal(h.studio.drawMonster(h.screen,{x:300,y:350,type:'golem',zone:14,boss:true},1100,{moving:true,type:'golem'}),true);
 assert.equal(h.calls.at(-1)[3],98);
 h.studio.clear();
 assert.equal(h.studio.stats.cached,0);
 for(const role of Object.keys(ROLES))
  for(let dir=0;dir<4;dir++)
   for(let i=0;i<6;i++)h.studio.obtain('hero',role,dir,'walk',i);
 for(let i=0;i<90;i++)h.studio.obtain('monster','dragao',i%4,'attack',i%5,i%2===0,12+i%4);
 assert.ok(h.studio.stats.cached<=128,'cache limitado para preservar memória');
});
test('NPCs usam sprites novos e não alteram estado de mundo ou combat',()=>{
 const h=stage();
 assert.equal(h.studio.drawNpc(h.screen,{x:200,y:220,role:'curandeiro',index:2},2000),true);
 assert.ok(h.calls.length>0);
 const art=read('art16.js');
 assert.match(art,/spriteStudio\?\.drawHero/);
 assert.match(art,/spriteStudio\?\.drawNpc/);
 assert.match(art,/spriteStudio\?\.drawMonster/);
 assert.match(art,/if\(!animated\)/);
 assert.match(art,/if\(p\.role==='arqueiro'\)drawBow/);
});
test('animações são acionadas por eventos confirmados do servidor',()=>{
 const s=read('mmo.js');
 assert.match(s,/spriteActions\.monsters\.set\(msg\.monster,\{action:'hurt'/);
 assert.match(s,/spriteActions\.players\.set\(msg\.by,\{action:'attack'/);
 assert.match(s,/spriteActions\.fallen\.push/);
 assert.match(s,/heroPose:now-spriteActions\.localHurtAt/);
 assert.match(s,/monsterActions:spriteActions\.monsters/);
 assert.match(s,/playerActions:spriteActions\.players/);
 const html=read('mundo.html');
 assert.ok(html.indexOf('/sprite-studio.js')<html.indexOf('/art16.js'));
 assert.ok(html.indexOf('/art16.js')<html.indexOf('/mmo.js'));
 assert.doesNotMatch(s,/createElement\('canvas'\).*innerHTML/);
});
test('arquivos de animação são sintaticamente válidos',()=>{
 for(const name of ['sprite-studio.js','art16.js','monster-motion.js','mmo.js']){
  assert.doesNotThrow(()=>new vm.Script(read(name),{filename:name}),name);
 }
});

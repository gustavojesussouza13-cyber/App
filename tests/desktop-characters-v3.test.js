'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ART=require('../public/desktop-characters-v3');

function stage(desktop=true,limit=600){
 const frames=[],images=[];
 const screen={imageSmoothingEnabled:true,drawImage(...args){images.push(args)}};
 const documentRef={createElement(name){
  assert.equal(name,'canvas');
  const ops=[],context={
   imageSmoothingEnabled:true,
   fillStyle:'',
   fillRect(x,y,w,h){
    assert.ok([x,y,w,h].every(Number.isInteger),'pixel não inteiro');
    assert.ok(w>0&&h>0,'retângulo sem dimensões');
    ops.push(['rect',this.fillStyle,x,y,w,h]);
   },
   save(){ops.push(['save'])},restore(){ops.push(['restore'])},
   scale(x,y){ops.push(['scale',x,y])},translate(x,y){ops.push(['translate',x,y])}
  };
  const canvas={width:0,height:0,ops,getContext:()=>context};
  frames.push(canvas);return canvas;
 }};
 const windowRef={matchMedia:query=>({matches:desktop&&query.includes('pointer: fine')})};
 return {studio:ART.create({windowRef,documentRef,limit}),frames,images,screen};
}
const sig=c=>JSON.stringify(c.ops);
const file=name=>fs.readFileSync(path.join(__dirname,'../public',name),'utf8');

test('classes possuem artes autorais em 64×80 e paletas próprias',()=>{
 const h=stage(),arts=[];
 assert.deepEqual([ART.W,ART.H],[64,80]);
 for(const role of ['peregrino','guardiao','arqueiro','curandeiro']){
  const canvas=h.studio.get('hero',role,2,'idle',0);
  assert.equal(canvas.width,64);
  assert.equal(canvas.height,80);
  assert.ok(canvas.ops.filter(o=>o[0]==='rect').length>70,role+' sem detalhe');
  arts.push(sig(canvas));
 }
 assert.equal(new Set(arts).size,4);
 assert.equal(h.studio.normalizeRole('Guardião'),'guardiao');
 assert.equal(h.studio.normalizeRole('Curandeiro'),'curandeiro');
});

test('andar, atacar e costas usam quadros diferentes para todas as classes',()=>{
 const h=stage();
 for(const role of ['peregrino','guardiao','arqueiro','curandeiro']){
  const frames=Array.from({length:6},(_,i)=>sig(h.studio.get('hero',role,2,'walk',i)));
  assert.ok(new Set(frames).size>=4,role+' sem caminhada de seis quadros');
  const front=h.studio.get('hero',role,2,'idle',0);
  const back=h.studio.get('hero',role,0,'idle',0);
  assert.notEqual(sig(front),sig(back),role+' sem costas próprias');
  const attack=h.studio.get('hero',role,2,'attack',3);
  assert.notEqual(sig(front),sig(attack),role+' sem ataque');
  const right=h.studio.get('hero',role,3,'idle',0);
  assert.ok(right.ops.some(o=>o[0]==='scale'&&o[1]===-1));
 }
});

test('mercador, ferreiro, guarda, viajante, sacerdotisa e sábio têm equipamento visual próprio',()=>{
 const h=stage(),draws=[];
 for(const name of ['Mercador','Ferreiro','Guarda da Aurora','Viajante','Sacerdotisa','Sábio do Templo']){
  const role=h.studio.npcRole({name});
  assert.ok(role,'NPC desconhecido: '+name);
  const img=h.studio.get('npc',role,2,'idle',0);
  draws.push(sig(img));
 }
 assert.equal(new Set(draws).size,6);
 assert.equal(h.studio.npcRole({name:'Habitante anônimo'}),null);
});

test('efeitos e armas de batalha preservam identidade de cada profissão',()=>{
 const h=stage();
 const warrior=sig(h.studio.get('hero','guardiao',2,'attack',3));
 const pilgrim=sig(h.studio.get('hero','peregrino',2,'attack',3));
 const archer=sig(h.studio.get('hero','arqueiro',2,'attack',3));
 const healer=sig(h.studio.get('hero','curandeiro',2,'attack',3));
 assert.ok(warrior.includes('#2d65b4'),'escudo azul ausente');
 assert.ok(pilgrim.includes('#d5e6ef'),'espada do Peregrino ausente');
 assert.ok(archer.includes('#a2f6d1'),'flecha verde ausente');
 assert.ok(healer.includes('#bff6ff'),'magia azul ausente');
});

test('desktop ganha arte nova, touch usa renderizador anterior; cache é limitado',()=>{
 const pc=stage(true,128),mobile=stage(false);
 assert.equal(pc.studio.enabled,true);assert.equal(mobile.studio.enabled,false);
 const player={role:'arqueiro',dir:2,x:183,y:232};
 assert.equal(mobile.studio.drawHero(mobile.screen,player,900,{moving:true}),false);
 assert.equal(mobile.studio.stats.generated,0);
 assert.equal(pc.studio.drawHero(pc.screen,player,900,{moving:true}),true);
 assert.equal(pc.screen.imageSmoothingEnabled,false);
 assert.equal(pc.images[0][0].width,64);
 assert.equal(pc.images[0][3],74);
 const first=pc.studio.stats.generated;
 assert.equal(pc.studio.drawHero(pc.screen,player,900,{moving:true}),true);
 assert.equal(pc.studio.stats.generated,first,'quadro deveria ser cacheado');
 for(const role of ['peregrino','guardiao','arqueiro','curandeiro'])
  for(let dir=0;dir<4;dir++)
   for(let i=0;i<6;i++)pc.studio.get('hero',role,dir,'walk',i);
 assert.ok(pc.studio.stats.cached<=128);
});

test('NPCs conhecidos são desenhados, desconhecidos seguem o fallback',()=>{
 const h=stage();
 assert.equal(h.studio.drawNpc(h.screen,{name:'Ferreiro',x:180,y:210,dir:2},1200),true);
 assert.equal(h.studio.drawNpc(h.screen,{name:'Morador sem identidade',x:180,y:210},1200),false);
 assert.equal(h.images.length,1);
});

test('script desktop carrega antes do render e não altera o CSS do mobile',()=>{
 const html=file('mundo.html'),art=file('art16.js'),script=file('desktop-characters-v3.js');
 assert.ok(html.indexOf('/desktop-characters-v3.js')<html.indexOf('/art16.js'));
 assert.match(html,/desktop-characters-v3/);
 assert.match(art,/desktopCharactersV3\?\.drawHero/);
 assert.match(art,/desktopCharactersV3\?\.drawNpc/);
 assert.match(art,/pngSprite\?desktopSprites\.normalizeRole/);
 assert.match(art,/illustratedV3\?desktopCharactersV3\.normalizeRole/);
 assert.doesNotThrow(()=>new vm.Script(script));
 assert.doesNotMatch(script,/touch-controls|ontouch|touchstart|addEventListener\('pointer/);
});

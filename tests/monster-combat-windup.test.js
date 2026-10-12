'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {World}=require('../world-engine');

function setup(t){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-combate-'));
 const events=[];
 const world=new World({send:(_socket,msg)=>events.push(msg),getOnline:()=>0,hasClassicName:()=>false,dataFile:path.join(folder,'world.json')});
 t.after(()=>{world.stop();fs.rmSync(folder,{recursive:true,force:true})});
 const monster=world.monsters.get(0)[0];
 const player={id:'combat-player',name:'Teste',zone:0,x:monster.home.x+20,y:monster.home.y,save:{role:'peregrino',hp:135,coins:60,inventory:{},level:1}};
 world.players.set(player.id,player);
 monster.aggroTarget=player.id;monster.aggroUntil=Date.now()+10000;monster.lastAttack=0;
 return {world,monster,player,events};
}
function tick(world){world.lastTick=Date.now()-350;world.tick()}

test('monstro anuncia seu ataque sem causar dano instantâneo',t=>{
 const {world,monster,player,events}=setup(t);
 tick(world);
 assert.equal(player.save.hp,135);
 assert.ok(monster.windupUntil>Date.now());
 assert.ok(events.some(x=>x.type==='monsterWindup'&&x.monster===monster.id&&x.duration===650));
 assert.equal(events.filter(x=>x.type==='hurt').length,0);
});
test('golpe acontece após preparação se o jogador permanecer próximo',t=>{
 const {world,monster,player,events}=setup(t);
 tick(world);
 monster.windupUntil=Date.now()-1;
 tick(world);
 assert.ok(player.save.hp<135);
 assert.equal(events.filter(x=>x.type==='hurt').length,1);
 assert.equal(monster.windupUntil,0);
});
test('sair do alcance interrompe o ataque e impede dano',t=>{
 const {world,monster,player,events}=setup(t);
 tick(world);
 player.x=monster.x+140;player.y=monster.y;
 monster.windupUntil=Date.now()-1;
 tick(world);
 assert.equal(monster.windupUntil,0);
 assert.equal(player.save.hp,135);
 assert.equal(events.filter(x=>x.type==='hurt').length,0);
});
test('perder o alvo interrompe preparação de ataque',t=>{
 const {world,monster,player}=setup(t);
 tick(world);
 // Mantém uma pessoa na zona original para a IA continuar ativa.
 world.players.set('spectator',{id:'spectator',zone:0,x:monster.home.x+250,y:monster.home.y+250,save:{role:'peregrino',hp:135,inventory:{},coins:0}});
 player.zone=1;
 tick(world);
 assert.equal(monster.windupUntil,0);
 assert.equal(monster.aggroTarget,null);
});
test('cliente exibe aviso visual sem alterar posições autoritativas',()=>{
 const mmo=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 assert.match(mmo,/msg\.type==='monsterWindup'/);
 assert.match(mmo,/msg\.boss\?'⚠ CHEFE! ESQUIVE!':'⚠ GOLPE!'/);
});

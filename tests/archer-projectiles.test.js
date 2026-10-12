'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {World}=require('../world-engine');
const {create}=require('../public/combat-effects');

function setup(t,role='arqueiro'){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-arqueiro-'));
 const events=[];
 const world=new World({send:(_socket,data)=>events.push(data),getOnline:()=>0,hasClassicName:()=>false,dataFile:path.join(dir,'world.json')});
 t.after(()=>{world.stop();fs.rmSync(dir,{recursive:true,force:true})});
 const client={socket:{},worldPlayer:null};
 world.join(client,{name:'ArqueiroTeste',token:'a'.repeat(64)});
 const player=client.worldPlayer;world.chooseClass(player,role);
 const monster=world.monsters.get(0)[0];player.x=monster.x+100;player.y=monster.y;
 return {world,events,player,monster};
}

test('arqueiro dispara com arco básico mesmo sem comprar Arco dos ventos',t=>{
 const {world,events,player,monster}=setup(t);
 assert.equal(player.save.inventory.arco,undefined);
 const hp=monster.hp;
 world.attack(player,monster.id,false);
 assert.ok(monster.hp<hp);
 const hit=events.find(x=>x.type==='hit');
 assert.equal(hit.projectile,'arrow');
 assert.equal(hit.from.x,Math.round(player.x));
 assert.equal(hit.from.y,Math.round(player.y-34));
 assert.equal(hit.to.x,Math.round(monster.x));
 assert.equal(hit.to.y,Math.round(monster.y-22));
 assert.ok(hit.damage>0);
});
test('habilidade do arqueiro gera flecha especial e dano verificado pelo servidor',t=>{
 const {world,events,player,monster}=setup(t);
 world.attack(player,monster.id,true);
 const hit=events.find(x=>x.type==='hit');
 assert.equal(hit.projectile,'arrow');
 assert.equal(hit.skill,true);
 assert.ok(hit.damage>=20);
});
test('arqueiro fora de alcance não gera evento nem flecha falsa',t=>{
 const {world,events,player,monster}=setup(t);
 player.x=monster.x+430;
 const hp=monster.hp;
 world.attack(player,monster.id,false);
 assert.equal(monster.hp,hp);
 assert.ok(!events.some(x=>x.type==='hit'));
});
test('guardião usa golpe de proximidade, nunca evento de flecha',t=>{
 const {world,events,player,monster}=setup(t,'guardiao');
 player.x=monster.x+25;
 world.attack(player,monster.id,false);
 const hit=events.find(x=>x.type==='hit');
 assert.ok(hit);
 assert.equal(hit.projectile,undefined);
});
test('projétil percorre origem e alvo e gera um único impacto',()=>{
 const fx=create();
 const msg={projectile:'arrow',from:{x:100,y:180},to:{x:300,y:180},damage:24,skill:false};
 assert.equal(fx.fire(msg,1000),true);
 assert.equal(fx.count(),1);
 assert.deepEqual([fx.frame(1000)[0].x,fx.frame(1000)[0].y],[100,180]);
 const half=fx.frame(1150)[0];
 assert.equal(half.kind,'arrow');
 assert.ok(Math.abs(half.x-200)<0.01);
 const arrival=fx.frame(1300)[0];
 assert.equal(arrival.kind,'impact');assert.equal(arrival.x,300);
 assert.equal(arrival.justHit,true);
 assert.equal(fx.frame(1330)[0].justHit,false);
 assert.equal(fx.frame(1530).length,0);
 assert.equal(fx.count(),0);
});
test('habilidade arqueira mantém efeito especial e reaparece após viagem',()=>{
 const fx=create();
 const msg={projectile:'arrow',from:{x:0,y:0},to:{x:150,y:60},skill:true,damage:45};
 assert.equal(fx.fire(msg,0),true);
 const shot=fx.frame(10)[0];assert.equal(shot.skill,true);
 assert.ok(shot.angle>0);
 fx.clear();assert.deepEqual(fx.frame(90),[]);
 assert.equal(fx.fire(msg,100),true);
});
test('efeitos rejeitam eventos inválidos e limitam quantidade de flechas',()=>{
 const fx=create(2);
 assert.equal(fx.fire({projectile:'arrow',from:{x:1,y:2},to:{x:Infinity,y:4}},0),false);
 assert.equal(fx.fire({projectile:'arrow',from:{x:0,y:0},to:{x:900,y:0}},0),false);
 assert.equal(fx.fire({projectile:'sword',from:{x:0,y:0},to:{x:50,y:0}},0),false);
 for(let i=0;i<9;i++)fx.fire({projectile:'arrow',from:{x:i,y:0},to:{x:i+50,y:0}},i);
 assert.equal(fx.count(),2);
});
test('página e renderizador conectam arco, flecha e efeito após impacto',()=>{
 const dir=path.join(__dirname,'../public');
 const html=fs.readFileSync(path.join(dir,'mundo.html'),'utf8');
 const art=fs.readFileSync(path.join(dir,'art16.js'),'utf8');
 const client=fs.readFileSync(path.join(dir,'mmo.js'),'utf8');
 assert.ok(html.indexOf('/combat-effects.js')>html.indexOf('/monster-motion.js'));
 assert.ok(html.indexOf('/mmo.js')>html.indexOf('/combat-effects.js'));
 assert.match(art,/if\(p\.role==='arqueiro'\)drawBow/);
 assert.match(art,/for\(const shot of projectiles\)drawProjectile/);
 assert.match(client,/combatFx\.fire\(msg,performance\.now\(\)\)/);
 assert.match(client,/combatFx\.frame\(now\)/);
 assert.match(client,/if\(shot\.justHit\)/);
 assert.match(client,/Arco simples · Equipado/);
});

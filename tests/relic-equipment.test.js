'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const os=require('node:os'),fs=require('node:fs'),path=require('node:path');
const {World,RELICS,BOSS_RELICS}=require('../world-engine');
function env(t){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-relics-'));
 const file=path.join(folder,'game.json');
 const events=[];
 const world=new World({send:(_sock,msg)=>events.push(msg),getOnline:()=>0,hasClassicName:()=>false,dataFile:file});
 t.after(()=>{world.stop();fs.rmSync(folder,{recursive:true,force:true})});
 let counter=0;
 function add(role='peregrino'){
  const token=String(++counter).padStart(64,'b');
  const c={socket:{},worldPlayer:null,authUser:{uid:'account:Reliquia'+counter,username:'Reliquia'+counter}};
  world.join(c,{name:'Reliquia'+counter,token});
  assert.ok(c.worldPlayer);
  const p=c.worldPlayer;
  world.chooseClass(p,role);
  return {c,p,token};
 }
 return {world,events,file,add};
}
test('catálogo define cinco relíquias com papel e raridade',()=>{
 assert.equal(Object.keys(RELICS).length,5);
 assert.equal(BOSS_RELICS.length,5);
 assert.ok(Object.values(RELICS).every(item=>['raro','épico'].includes(item.rarity)));
});
test('vitória inicial contra chefe concede uma relíquia, repetição não duplica',t=>{
 const e=env(t),{p}=e.add('guardiao');
 const before=p.save.coins;
 e.world.award(p,100,10,true,0);
 assert.equal(p.save.inventory.lamina_aurora,1);
 assert.deepEqual(p.save.bossRelics,[0]);
 assert.ok(p.save.coins>before);
 e.world.award(p,100,10,true,0);
 assert.equal(p.save.inventory.lamina_aurora,1);
 assert.deepEqual(p.save.bossRelics,[0]);
 assert.ok(e.events.some(m=>m.type==='notice'&&m.text.includes('Relíquia')));
});
test('cada região dá uma única peça e bônus não são compráveis na loja',t=>{
 const e=env(t),{p}=e.add('arqueiro');
 p.save.coins=10000;
 for(let z=0;z<16;z++){e.world.award(p,0,0,true,z)}
 assert.equal(p.save.bossRelics.length,16);
 assert.equal(Object.values(p.save.inventory).filter(n=>n>0).length>=5,true);
 const before={...p.save.inventory};
 e.world.buy(p,'arco_alvorada');
 assert.deepEqual(p.save.inventory,before,'itens de chefe não podem ser comprados');
 for(let z=0;z<16;z++)e.world.award(p,0,0,true,z);
 assert.equal(p.save.bossRelics.length,16);
});
test('relíquia de arqueiro aumenta o dano sem empilhar o arco da loja',t=>{
 const e=env(t),{p}=e.add('arqueiro');
 const m=e.world.monsters.get(0)[0];m.maxHp=1000;m.hp=1000;
 p.x=m.x+100;p.y=m.y;
 e.world.attack(p,m.id,false);const base=1000-m.hp;
 p.lastAttack=0;m.hp=1000;p.save.inventory.arco=1;
 e.world.attack(p,m.id,false);const market=1000-m.hp;
 p.lastAttack=0;m.hp=1000;p.save.inventory.arco_alvorada=1;
 e.world.attack(p,m.id,false);const relic=1000-m.hp;
 assert.equal(market-base,6);
 assert.equal(relic-base,11,'relíquia mais forte substitui bônus, sem empilhar');
});
test('relíquia de curandeiro fortalece a cura somente da equipe',t=>{
 const e=env(t),c=e.add('curandeiro');
 const m=e.world.monsters.get(0)[0];m.hp=1000;m.maxHp=1000;
 c.p.x=m.x+25;c.p.y=m.y;
 c.p.save.hp=40;
 e.world.attack(c.p,m.id,true);const base=c.p.save.hp-40;
 c.p.lastSpell=0;m.hp=1000;c.p.save.hp=40;c.p.save.inventory.cajado_misericordia=1;
 e.world.attack(c.p,m.id,true);const extra=c.p.save.hp-40;
 assert.equal(extra-base,12);
});
test('troca de relíquia entre personagens próximos é validada no servidor',t=>{
 const e=env(t),a=e.add('guardiao'),b=e.add('arqueiro');
 a.p.save.inventory.lamina_aurora=1;
 b.p.x=a.p.x;b.p.y=a.p.y;
 e.world.trade(a.p,{action:'offer',target:b.p.name,item:'lamina_aurora',count:1,gold:0});
 assert.ok(e.events.some(m=>m.type==='tradeOffer'));
 e.world.trade(b.p,{action:'accept',target:a.p.name});
 assert.equal(a.p.save.inventory.lamina_aurora,0);
 assert.equal(b.p.save.inventory.lamina_aurora,1);
});
test('relíquias e conquistas persistem após salvar e reiniciar, sem migração de banco',t=>{
 const e=env(t),{p,token}=e.add('peregrino');
 const name=p.name;
 e.world.award(p,500,20,true,3);
 assert.equal(p.save.inventory.sabre_peregrino,1);
 e.world.stop();
 const world2=new World({send:()=>{},getOnline:()=>0,hasClassicName:()=>false,dataFile:e.file});
 t.after(()=>world2.stop());
 const conn={socket:{},worldPlayer:null,authUser:{uid:'account:'+name,username:name}};
 world2.join(conn,{name,token});
 assert.ok(conn.worldPlayer);
 assert.equal(conn.worldPlayer.save.inventory.sabre_peregrino,1);
 assert.ok(conn.worldPlayer.save.bossRelics.includes(3));
 assert.ok(conn.worldPlayer.save.achievements.includes('primeiro-chefe'));
});
test('cliente expõe catálogo de relíquias, inventário e opções de troca',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 assert.match(code,/session\.relics=msg\.relics/);
 assert.match(code,/session\.shop\[id\]\|\|session\.relics\[id\]/);
 assert.match(code,/Object\.entries\(\{\.\.\.session\.shop,\.\.\.session\.relics\}\)/);
});

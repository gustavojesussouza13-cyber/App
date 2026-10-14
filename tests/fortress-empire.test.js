'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {World}=require('../world-engine');
const politics=require('../kingdom-politics');
const layout=require('../public/city-layout');

function fixture(t){
 const snapshots=[],messages=[];
 const world=new World({persistentStore:{enqueue:state=>{snapshots.push(structuredClone(state));return Promise.resolve(true)}},
  autosave:false,send:(_socket,message)=>messages.push(message),getOnline:()=>0,hasClassicName:()=>false});
 t.after(()=>world.stop());
 const join=(name,zone=0)=>{
  const c={socket:{},authUser:{uid:'account:'+name,username:name},worldPlayer:null};
  world.join(c,{name});const p=c.worldPlayer;
  assert.ok(p);p.save.coins=100000;p.zone=zone;p.save.zone=zone;p.x=768;p.y=512;
  return p;
 };
 const act=(p,request,now=Date.now())=>politics.action(world,p,request,{
  now,walkable:()=>true,portals:[],npcs:[]});
 const build=(p,name)=>{
  world.guild(p,{action:'create',name});
  assert.equal(act(p,{action:'place',x:768,y:512}),true);
  return world.guilds.get(name.toLocaleLowerCase('pt-BR'));
 };
 return {world,join,act,build,snapshots,messages};
}
function supplyQuartel(g){
 g.city={buildings:[{type:'barracks',x:8,y:8,w:4,h:3,status:'complete',level:1}],
  stock:{food:2000,timber:2000,stone:2000,coins:0},lastCollectedAt:Date.now()};
}
test('níveis 1 a 5 desbloqueiam áreas progressivas e respeitam o castelo',()=>{
 assert.deepEqual([1,2,3,4,5].map(l=>layout.bounds(l).width),[14,18,22,24,26]);
 assert.equal(layout.canPlace([],'house',0,0,1),false);
 assert.equal(layout.canPlace([],'house',6,6,1),true);
 assert.equal(layout.canPlace([],'house',0,0,5),true);
 assert.equal(layout.canPlace([],'house',11,11,5),false);
});
test('fortaleza sobe de nível, libera terrenos antes bloqueados e aumenta o limite do estoque',t=>{
 const f=fixture(t),p=f.join('Fundador'),g=f.build(p,'Reino Evolutivo');
 assert.equal(f.act(p,{action:'construct',buildingType:'house',x:1,y:1}),false);
 assert.equal(f.act(p,{action:'construct',buildingType:'house',x:18,y:13}),true);
 const house=g.city.buildings[0];assert.equal(house.status,'building');
 assert.equal(politics.publicState(f.world,p).stockCapacity,600);
 assert.equal(f.act(p,{action:'upgrade'}),true);
 assert.equal(politics.publicState(f.world,p).buildBounds.width,18);
 assert.equal(politics.publicState(f.world,p).stockCapacity,1200);
 assert.equal(f.act(p,{action:'construct',buildingType:'house',x:4,y:4}),true);
 for(let i=3;i<=5;i++)assert.equal(f.act(p,{action:'upgrade'}),true);
 assert.equal(politics.publicState(f.world,p).buildBounds.width,26);
 assert.equal(politics.publicState(f.world,p).stockCapacity,5000);
 assert.equal(g.city.buildings.length,2);
 assert.ok(f.snapshots.some(s=>s.guilds['reino evolutivo']?.base?.level===5));
});
test('a guarnição transfere instantaneamente tropas ao membro e volta sem duplicar',t=>{
 const f=fixture(t),p=f.join('Comandante'),g=f.build(p,'Guarda Verde');
 supplyQuartel(g);
 assert.equal(f.act(p,{action:'train',unit:'archer',count:15}),true);
 assert.equal(f.act(p,{action:'escort',unit:'archer',count:10}),true);
 assert.equal(g.army.archer,5);assert.equal(g.escorts[p.uid].archer,10);
 assert.equal(f.world.publicPlayer(p).escort.archer,10);
 assert.equal(politics.publicState(f.world,p).yourGuild.escort.archer,10);
 assert.equal(f.act(p,{action:'escort',unit:'archer',count:20}),false);
 assert.equal(f.act(p,{action:'recall'}),true);
 assert.equal(g.army.archer,15);assert.equal(politics.troopCount(politics.escortOf(g,p.uid)),0);
 assert.equal(f.act(p,{action:'recall'}),false);
});
test('torres e muralhas reforçam a defesa e são persistidas',t=>{
 const f=fixture(t),p=f.join('Guardiao'),g=f.build(p,'Defesas do Norte');
 assert.equal(f.act(p,{action:'construct',buildingType:'tower',x:6,y:6}),true);
 const tower=g.city.buildings[0];tower.status='complete';
 const before=politics.fortressDefense(g).defense;
 g.city.stock={food:100,timber:100,stone:100,coins:100};
 assert.equal(f.act(p,{action:'fortify'}),true);
 assert.equal(g.base.defenseLevel,1);
 assert.equal(politics.fortressDefense(g).defense,before+12);
 assert.equal(f.act(p,{action:'fortify'}),false,'muralha não ultrapassa o nível da capital');
 assert.ok(f.snapshots.some(s=>s.guilds['defesas do norte']?.base?.defenseLevel===1));
});
test('cerco remoto é recusado; cerco no local é imediato e consome tropas de verdade',t=>{
 const f=fixture(t),p=f.join('Invasor'),r=f.join('Defensor',1);
 const attacker=f.build(p,'Reino Atacante'),defender=f.build(r,'Reino Defensor');
 supplyQuartel(attacker);
 assert.equal(f.act(p,{action:'train',unit:'knight',count:30}),true);
 assert.equal(f.act(p,{action:'escort',unit:'knight',count:25}),true);
 assert.equal(f.act(p,{action:'siege',target:'reino defensor'}),false,'sem viagem instantânea de jogadores');
 p.zone=1;p.x=768;p.y=512;
 const size=politics.troopCount(attacker.escorts[p.uid]);
 assert.equal(f.act(p,{action:'siege',target:'reino defensor'}),true);
 assert.ok(politics.troopCount(attacker.escorts[p.uid])<size);
 assert.equal(attacker.march,undefined,'sem contagem de marcha');
 assert.ok(attacker.nextRaidAt>Date.now()-1000);
 assert.equal(f.act(p,{action:'siege',target:'reino defensor'}),false,'proteção contra repetição de cerco');
 assert.ok(defender.base);
});
test('a arte 2D distingue os quatro tipos de tropa e aparece no carregamento do mundo',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../public/army-pixel16.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 for(const id of ['militia','archer','knight','siege'])assert.match(src,new RegExp("type==='"+id+"'"));
 assert.ok(html.includes('/army-pixel16.js?v=monstros-evoluem-v1'));
 assert.match(src,/imageSmoothingEnabled=false/);
});

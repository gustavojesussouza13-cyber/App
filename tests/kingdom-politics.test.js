'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {World,ZONES}=require('../world-engine');
const policy=require('../kingdom-politics');
function setup(t){
 const history=[],store={enqueue(s){history.push(structuredClone(s))}};
 const events=[];
 const world=new World({persistentStore:store,send:(socket,data)=>events.push(data),
  getOnline:()=>0,hasClassicName:()=>false});
 t.after(()=>world.stop());
 function player(name,zone=0){
  const c={socket:{},authUser:{uid:'account:'+name,username:name},worldPlayer:null};
  world.join(c,{name,role:'peregrino'});
  const p=c.worldPlayer;
  assert.ok(p);
  p.zone=zone;p.save.zone=zone;p.x=768;p.y=512;p.save.coins=10000;
  return p;
 }
 function guild(p,name){
  world.guild(p,{action:'create',name});
  assert.equal(p.save.guild,name);
  return world.guilds.get(name.toLowerCase());
 }
 const action=(p,data,now=1000)=>policy.action(world,p,data,{
  now,walkable:()=>true,portals:[]});
 return{world,events,history,player,guild,action};
}
test('16 regiões históricas compõem o conselho; só 12 permitem fortaleza',()=>{
 assert.equal(ZONES.length,40);
 assert.equal(policy.CONTINENT_REGIONS,16);
 assert.equal(policy.BUILDABLE_REGIONS,12);
 const world={guilds:new Map()};
 const territories=policy.politicalMap(world);
 assert.equal(territories.length,16);
 assert.deepEqual(territories.slice(12).map(t=>t.buildable),[false,false,false,false]);
});
test('guilda autêntica estabelece base por custo, preserva dados e aparece no mapa',t=>{
 const h=setup(t),a=h.player('Fundadora');
 const g=h.guild(a,'Reino do Sol');
 const previous=a.save.coins;
 assert.equal(h.action(a,{action:'place',x:768,y:512}),true);
 assert.equal(a.save.coins,previous-policy.BASE_COST);
 assert.deepEqual({zone:g.base.zone,x:g.base.x,y:g.base.y},{zone:0,x:768,y:512});
 const overview=policy.publicState(h.world,a);
 assert.ok(overview.bases.some(x=>x.name==='Reino do Sol'&&x.zone===0));
 assert.equal(overview.yourGuild.leader,true);
 assert.equal(overview.zones.length,16);
 assert.equal(overview.zones[0].ruler,'Reino do Sol');
 h.world.persist();
 assert.equal(h.history.at(-1).guilds['reino do sol'].base.zone,0);
 assert.equal(h.history.at(-1).characters[a.uid].guild,'Reino do Sol');
});
test('proíbe bases em quatro masmorras históricas e em todos os subsolos',t=>{
 const h=setup(t),a=h.player('Arquiteta'),g=h.guild(a,'Peregrinos Livres');
 const before=a.save.coins;
 for(const zone of [12,13,14,15,16,18,28,39]){
  a.zone=zone;a.save.zone=zone;
  assert.equal(h.action(a,{action:'place',x:768,y:512}),false);
 }
 assert.equal(a.save.coins,before);
 assert.equal(g.base,undefined);
});
test('coordenadas, colisões, limites de portais e capitais rivais são validados no servidor',t=>{
 const h=setup(t),a=h.player('Fundador'),b=h.player('Rival');
 h.guild(a,'Casa Dourada');h.guild(b,'Casa Verde');
 for(const invalid of [{x:1700,y:500},{x:768.5,y:512},{x:100,y:110}])
  assert.equal(h.action(a,{action:'place',...invalid}),false);
 assert.equal(policy.action(h.world,a,{action:'place',x:768,y:512},{walkable:()=>false,portals:[],now:1000}),false);
 assert.equal(policy.action(h.world,a,{action:'place',x:768,y:512},{walkable:()=>true,portals:[{x:768,y:511}],now:1000}),false);
 assert.equal(h.action(a,{action:'place',x:768,y:512}),true);
 b.x=850;b.y=520;
 assert.equal(h.action(b,{action:'place',x:850,y:520}),false,'bases de guildas rivais precisam manter 180 pixels');
});
test('guilda apenas de visitante não pode criar um reino com tropas persistentes',t=>{
 const h=setup(t),a=h.player('Registrado');
 h.guild(a,'Reino Real');
 a.isAccount=false;
 const coins=a.save.coins;
 assert.equal(h.action(a,{action:'place',x:768,y:512}),false);
 assert.equal(a.save.coins,coins);
});
test('rei pode erguer muralhas até nível cinco; a defesa aumenta sem gerar ouro',t=>{
 const h=setup(t),p=h.player('Muralheiro');
 const g=h.guild(p,'Torres da Esperanca');
 h.action(p,{action:'place',x:768,y:512});
 const before=p.save.coins;
 assert.equal(h.action(p,{action:'upgrade'}),true);
 assert.equal(g.base.level,2);
 assert.equal(p.save.coins,before-1000);
 assert.equal(policy.politicalMap(h.world)[0].ruler,'Torres da Esperanca');
 for(let i=3;i<=5;i++){p.save.coins=100000;assert.equal(h.action(p,{action:'upgrade'}),true)}
 assert.equal(g.base.level,5);
 assert.equal(h.action(p,{action:'upgrade'}),true,'fortaleza agora evolui além do nível cinco');
 assert.equal(g.base.level,6);
});
test('recrutamento cobra moedas, exige capital próxima e limita exércitos a 300',t=>{
 const h=setup(t),a=h.player('Comandante'),g=h.guild(a,'Forca das Torres');
 assert.equal(h.action(a,{action:'recruit',unit:'knight',count:3}),false);
 assert.equal(h.action(a,{action:'place',x:768,y:512}),true);
 const gold=a.save.coins;
 assert.equal(h.action(a,{action:'recruit',unit:'knight',count:5}),true);
 assert.equal(a.save.coins,gold-5*policy.UNITS.knight.cost);
 assert.equal(g.army.knight,5);
 assert.equal(h.action(a,{action:'recruit',unit:'siege',count:500}),false);
 assert.equal(h.action(a,{action:'recruit',unit:'siege',count:3.5}),false);
 assert.equal(h.action(a,{action:'recruit',unit:'gold',count:2}),false);
 a.x=1400;assert.equal(h.action(a,{action:'recruit',unit:'archer',count:2}),false);
 a.x=768;a.save.coins=0;
 assert.equal(h.action(a,{action:'recruit',unit:'archer',count:1}),false);
 g.army={militia:280,archer:0,knight:5,siege:0};a.save.coins=9000;
 assert.equal(h.action(a,{action:'recruit',unit:'militia',count:20}),false);
});
test('campanha militar entre reinos atravessa regiões sem teleportar jogadores e eleva influência',t=>{
 const h=setup(t),attacker=h.player('LordeNorte',0),defender=h.player('LadySul',1);
 const a=h.guild(attacker,'Reino do Norte'),b=h.guild(defender,'Reino do Sul');
 assert.equal(h.action(attacker,{action:'place',x:768,y:512}),true);
 assert.equal(h.action(defender,{action:'place',x:768,y:512}),true);
 assert.equal(h.action(attacker,{action:'recruit',unit:'knight',count:10}),true);
 assert.equal(h.action(attacker,{action:'attack',target:'reino do sul'},2000),true);
 assert.equal(attacker.zone,0,'jogador não deve teleportar para atacar outro reino');
 assert.equal(policy.troopCount(a.army),0,'tropas comprometidas não podem duplicar');
 assert.equal(h.action(attacker,{action:'attack',target:'reino do sul'},2100),false);
 assert.equal(policy.resolve(h.world,2000+44999).length,0,'marcha não resolve instantaneamente');
 const battle=policy.resolve(h.world,2000+45001);
 assert.equal(battle.length,1);
 assert.match(battle[0].text,/Vitória/);
 assert.equal(a.march,undefined);
 assert.ok(policy.troopCount(a.army)>0,'parte do exército retorna');
 assert.ok(policy.publicState(h.world,attacker).zones[1].ruler==='Reino do Norte');
 assert.equal(policy.rank(h.world)[0].name,'Reino do Norte');
 assert.equal(h.action(attacker,{action:'attack',target:'reino do sul'},2000+45100),false,'respeitar cooldown de dez minutos');
 assert.ok(b.base);
});
test('exército defensivo reduz danos e segurança impede ataque sem liderança',t=>{
 const h=setup(t),a=h.player('Alfa'),b=h.player('Beta'),member=h.player('Membro');
 const ga=h.guild(a,'Reino Alfa'),gb=h.guild(b,'Reino Beta');
 h.action(a,{action:'place',x:768,y:512});b.zone=1;b.save.zone=1;
 h.action(b,{action:'place',x:768,y:512});
 ga.members.push(member.uid);member.save.guild=ga.name;
 assert.equal(h.action(member,{action:'attack',target:'reino beta'}),false);
 assert.equal(h.action(a,{action:'attack',target:'reino beta'}),false,'exército com menos de 5 soldados');
 a.save.coins=5000;h.action(a,{action:'recruit',unit:'militia',count:5});
 b.save.coins=10000;h.action(b,{action:'recruit',unit:'siege',count:5});
 assert.equal(h.action(a,{action:'attack',target:'reino beta'},10000),true);
 const results=policy.resolve(h.world,10000+45001);
 assert.match(results[0].text,/Derrota/);
 assert.ok(gb.army.siege>=1,'defensores sobreviventes');
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {World}=require('../world-engine');
const polity=require('../kingdom-politics');

function game(t){
 const saved=[],packets=[];
 const world=new World({persistentStore:{enqueue:state=>{saved.push(structuredClone(state));return Promise.resolve(true)}},
  autosave:false,getOnline:()=>0,hasClassicName:()=>false,send:(_socket,msg)=>packets.push(msg)});
 t.after(()=>world.stop());
 const player=(name,zone=0)=>{
  const c={socket:{},authUser:{uid:'account:'+name,username:name},worldPlayer:null};
  world.join(c,{name,role:'peregrino'});
  const p=c.worldPlayer;
  p.zone=zone;p.save.zone=zone;p.x=768;p.y=512;
  p.save.coins=300000;p.save.level=100;
  return p;
 };
 const act=(p,data,now=Date.now())=>polity.action(world,p,data,{now,walkable:()=>true,portals:[],npcs:[]});
 const make=(name,zone)=>{
  const chief=player(name+'Rei',zone);
  world.guild(chief,{action:'create',name});
  assert.equal(act(chief,{action:'place',x:768,y:512}),true);
  const g=world.guilds.get(name.toLocaleLowerCase('pt-BR'));
  g.city={buildings:[{type:'barracks',x:8,y:8,w:4,h:3,level:1,status:'complete',endsAt:Date.now()-1}],
   stock:{food:20000,timber:20000,stone:20000,coins:1000},lastCollectedAt:Date.now()};
  return {g,p:chief,key:name.toLocaleLowerCase('pt-BR')};
 };
 const member=(head,name)=>{
  const p=player(name,head.p.zone);
  world.guild(head.p,{action:'invite',target:p.name});
  world.guild(p,{action:'accept',name:head.g.name});
  assert.equal(p.save.guild,head.g.name);
  return p;
 };
 return {world,player,act,make,member,saved,packets};
}
function deploy(f,member,unit,count){
 assert.equal(f.act(member,{action:'train',unit,count}),true);
 assert.equal(f.act(member,{action:'escort',unit,count}),true);
}
test('capacidade cresce de 300 a 1200 e mantém escoltas no mesmo limite',t=>{
 const f=game(t),a=f.make('Exercito',0),p=a.p;
 a.g.army={militia:300,archer:0,knight:0,siege:0};
 assert.equal(polity.militaryCapacity(1),300);
 assert.equal(polity.militaryCapacity(60),1200);
 assert.equal(f.act(p,{action:'train',unit:'militia',count:1}),false);
 a.g.base.level=60;
 assert.equal(f.act(p,{action:'train',unit:'militia',count:40}),true);
 a.g.army.militia=1199;
 assert.equal(f.act(p,{action:'train',unit:'militia',count:2}),false);
 assert.equal(f.act(p,{action:'train',unit:'militia',count:1}),true);
 assert.equal(polity.fullArmyCount(a.g),1200);
 assert.equal(f.act(p,{action:'escort',unit:'militia',count:40}),true);
 assert.equal(polity.fullArmyCount(a.g),1200,'a escolta não duplica o efetivo');
});
test('manutenção a cada 30 minutos consome alimentos coletivos; fome causa deserção limitada',t=>{
 const f=game(t),a=f.make('Colheita',0),now=1000000;
 a.g.army={militia:100,archer:0,knight:0,siege:0};
 a.g.city.stock.food=4;
 a.g.upkeepAt=now;
 const good=polity.applyArmyUpkeep(a.g,now+30*60000);
 assert.equal(good.foodNeeded,4);
 assert.equal(good.foodUsed,4);
 assert.equal(good.losses,0);
 assert.equal(a.g.city.stock.food,0);
 const hungry=polity.applyArmyUpkeep(a.g,now+60*60000);
 assert.ok(hungry.losses>0);
 assert.ok(polity.fullArmyCount(a.g)<100);
 const before=polity.fullArmyCount(a.g);
 const offline=polity.applyArmyUpkeep(a.g,now+900*60000);
 assert.ok(offline.cycles<=3);
 assert.ok(polity.fullArmyCount(a.g)>=before*.8,'longa ausência não elimina instantaneamente um exército');
});
test('aliança bilateral exige assinatura dos líderes e impede ataques entre aliados',t=>{
 const f=game(t),a=f.make('Aurora',0),b=f.make('Eclipse',1);
 const member=f.member(a,'Diplomata');
 assert.equal(f.act(member,{action:'allyOffer',target:b.key}),false);
 assert.equal(f.act(a.p,{action:'allyOffer',target:b.key}),true);
 assert.deepEqual(b.g.allianceOffers,[a.key]);
 assert.equal(f.act(member,{action:'allyAccept',target:b.key}),false);
 assert.equal(f.act(b.p,{action:'allyAccept',target:a.key}),true);
 assert.ok(a.g.allies.includes(b.key));
 assert.ok(b.g.allies.includes(a.key));
 deploy(f,a.p,'archer',5);
 a.p.zone=1;a.p.x=768;a.p.y=512;
 assert.equal(f.act(a.p,{action:'siege',target:b.key}),false,'reinos aliados não atacam');
 assert.equal(f.act(a.p,{action:'allyBreak',target:b.key}),true);
 assert.deepEqual(a.g.allies,[]);
 assert.deepEqual(b.g.allies,[]);
});
test('cerco imediato combina escoltas da guilda e aliados que estejam realmente próximos',t=>{
 const f=game(t),a=f.make('Atacantes',0),b=f.make('Defensores',1),c=f.make('Companheiros',2);
 const partner=f.member(a,'Escudeiro');
 assert.equal(f.act(a.p,{action:'allyOffer',target:c.key}),true);
 assert.equal(f.act(c.p,{action:'allyAccept',target:a.key}),true);
 deploy(f,a.p,'militia',2);
 deploy(f,partner,'archer',10);
 deploy(f,c.p,'siege',8);
 a.p.zone=1;partner.zone=1;c.p.zone=1;
 const starter=polity.escortOf(a.g,a.p.uid).militia;
 const ally=polity.escortOf(c.g,c.p.uid).siege;
 const now=Date.now();
 assert.equal(f.act(a.p,{action:'siege',target:b.key},now),true);
 assert.ok(polity.escortOf(a.g,a.p.uid).militia<starter);
 assert.ok(polity.escortOf(c.g,c.p.uid).siege<ally);
 assert.ok(b.g.siegeCrisis?.pressure>=32,'cerco causa pressão sobre a fortaleza');
 assert.ok((c.g.influence[1]||0)>0,'aliado recebe influência por sua contribuição');
 assert.equal(a.g.march,undefined,'combate presencial não cria viagem cronometrada');
 assert.equal(f.act(a.p,{action:'siege',target:b.key},now+500),false);
});
test('pressão crítica permite rendição voluntária, tributo real e 30 minutos de proteção',t=>{
 const f=game(t),a=f.make('Vencedores',0),b=f.make('Resistentes',1);
 deploy(f,a.p,'siege',25);
 a.p.zone=1;
 const now=Date.now();
 assert.equal(f.act(b.p,{action:'surrender'},now),false,'não render-se antes do perigo crítico');
 assert.equal(f.act(a.p,{action:'siege',target:b.key},now),true);
 assert.equal(b.g.siegeCrisis.pressure,32);
 assert.equal(f.act(b.p,{action:'surrender'},now+5),false,'primeiro cerco insuficiente');
 assert.equal(f.act(a.p,{action:'siege',target:b.key},now+61000),true);
 assert.ok(b.g.siegeCrisis.pressure>=60);
 a.g.city.stock.coins=0; // Tesouro vencedor tem espaço para receber o tributo legítimo.
 const beforeA=a.g.city.stock.coins,beforeB=b.g.city.stock.coins;
 assert.equal(f.act(b.p,{action:'surrender'},now+62000),true);
 assert.equal(b.g.siegeCrisis,undefined);
 assert.equal(b.g.city.stock.coins,beforeB-100);
 assert.equal(a.g.city.stock.coins,beforeA+100);
 assert.ok(b.g.truce.until>=now+62000+30*60000);
 assert.equal(b.g.base.zone,1);
 assert.ok(b.g.city.buildings.length,'nenhum prédio destruído');
 assert.ok(a.g.diplomaticWins>=1);
 assert.equal(f.act(a.p,{action:'siege',target:b.key},now+123000),false,'trégua impede novo ataque');
 assert.equal(f.act(b.p,{action:'surrender'},now+123000),false,'tratado não é repetível');
});
test('maioria da guilda pode decidir render-se mesmo sem voto do líder',t=>{
 const f=game(t),a=f.make('Assediantes',0),b=f.make('CidadeLivre',1);
 const first=f.member(b,'PrimeiraVoz'),second=f.member(b,'SegundaVoz');
 b.g.siegeCrisis={attacker:a.key,attackerName:a.g.name,region:1,pressure:75,updatedAt:Date.now(),votes:{}};
 const now=Date.now();
 assert.equal(f.act(first,{action:'surrender'},now),false,'integrante não pode se passar pelo líder');
 assert.equal(f.act(first,{action:'surrenderVote'},now),true);
 assert.equal(Object.keys(b.g.siegeCrisis.votes).length,1);
 assert.equal(f.act(first,{action:'surrenderVote'},now),false,'não há voto duplo');
 assert.equal(f.act(second,{action:'surrenderVote'},now),true,'dois votos em três integrantes');
 assert.equal(b.g.siegeCrisis,undefined);
 assert.ok(b.g.truce.until>now);
 assert.ok(f.saved.some(s=>s.guilds[b.key]?.truce?.until>now));
});
test('muralhas e torres niveladas preservam defesa sem gerar invencibilidade automática',t=>{
 const f=game(t),a=f.make('Maximo',0);
 a.g.base.level=60;a.g.base.defenseLevel=60;
 a.g.city.buildings=Array.from({length:60},(_,i)=>({type:'tower',x:i%26,y:Math.floor(i/26),level:60,status:'complete'}));
 const d=polity.fortressDefense(a.g);
 assert.equal(d.level,60);
 assert.ok(d.defense>2200);
 assert.ok(d.defense<15000,'nem dezenas de torres tornam o reino impossível de cercar');
 assert.ok(polity.power({siege:60})+60*12+200>1500,'escolta especializada ameaça uma fortaleza nível 60 sem guarnição');
});
test('guia e interface apresentam rendição, votação, cooperação, alianças e manutenção',()=>{
 const social=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 const city=fs.readFileSync(path.join(__dirname,'../public/guild-city-3d.js'),'utf8');
 const guide=fs.readFileSync(path.join(__dirname,'../public/guia.html'),'utf8');
 for(const term of ['surrenderVote','surrender','allyOffer','allyAccept','allyBreak'])
  assert.ok(social.includes(term),'Social deve expor '+term);
 assert.ok(city.includes('guild3dSurrenderVote'));
 assert.ok(city.includes('guild3dSurrender'));
 assert.match(guide,/maioria absoluta dos integrantes cadastrados/);
 assert.match(guide,/manutenção militar/i);
});

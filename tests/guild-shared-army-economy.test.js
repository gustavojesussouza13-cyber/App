'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {World}=require('../world-engine');
const kingdoms=require('../kingdom-politics');

function fixture(t){
 const snapshots=[],events=[];
 const world=new World({
  persistentStore:{enqueue:s=>{snapshots.push(structuredClone(s));return Promise.resolve(true)}},
  send:(socket,msg)=>events.push({socket,msg}),getOnline:()=>0,hasClassicName:()=>false,autosave:false
 });
 t.after(()=>world.stop());
 const player=(name)=>{
  const client={socket:{},authUser:{uid:'account:'+name,username:name},worldPlayer:null};
  world.join(client,{name});
  const p=client.worldPlayer;p.x=768;p.y=512;p.save.coins=40000;
  return p;
 };
 const leader=player('FundadorGuilda'),member=player('IntegranteGuilda'),outsider=player('VisitanteExterno');
 world.guild(leader,{action:'create',name:'Guilda Unida'});
 world.guild(leader,{action:'invite',target:member.name});
 assert.equal(world.guilds.get('guilda unida').invitations.includes(member.uid),true);
 world.guild(member,{action:'accept',name:'Guilda Unida'});
 assert.equal(member.save.guild,'Guilda Unida');
 const act=(p,data,now=Date.now())=>kingdoms.action(world,p,data,{walkable:()=>true,portals:[],npcs:[],now});
 assert.equal(act(leader,{action:'place',x:768,y:512}),true);
 const guild=world.guilds.get('guilda unida');
 return {world,events,snapshots,leader,member,outsider,guild,act};
}
test('qualquer integrante cadastrado pode construir, evoluir edifícios, ampliar o reino e melhorar muralhas',t=>{
 const f=fixture(t),{member,leader,guild:g,act}=f;
 assert.equal(kingdoms.publicState(f.world,member).yourGuild.canManage,true);
 assert.equal(kingdoms.publicState(f.world,leader).yourGuild.canManage,true);
 assert.equal(kingdoms.publicState(f.world,member).yourGuild.leader,false);
 assert.equal(act(member,{action:'place',x:768,y:512}),false,'fundação e transferência continuam com o líder');
 assert.equal(act(member,{action:'construct',buildingType:'house',x:6,y:9}),true);
 assert.equal(act(member,{action:'construct',buildingType:'barracks',x:11,y:7}),true);
 assert.equal(g.city.buildings.length,2);
 const oldLevel=g.base.level,oldCoins=member.save.coins;
 assert.equal(act(member,{action:'upgrade'}),true);
 assert.equal(g.base.level,oldLevel+1);
 assert.equal(member.save.coins,oldCoins-(oldLevel+1)*500);
 for(const building of g.city.buildings){building.status='complete';building.endsAt=Date.now()-1000}
 g.city.stock={food:600,timber:600,stone:600,coins:0};
 assert.equal(act(member,{action:'buildingUpgrade',x:6,y:9}),true);
 assert.equal(g.city.buildings[0].level,2);
 assert.equal(act(member,{action:'fortify'}),true);
 assert.equal(g.base.defenseLevel,1);
 assert.equal(act(member,{action:'collect'},Date.now()+7*60000),true);
 assert.ok(g.city.stock.coins>0);
 assert.ok(f.events.some(v=>v.socket===leader.socket&&v.msg.type==='kingdomState'),
  'o líder recebe em tempo real as alterações do integrante');
 f.world.persist();
 assert.ok(f.snapshots.some(s=>s.guilds['guilda unida']?.city?.buildings?.length===2));
});
test('quartel produz exército apenas com recursos do reino, sem reduzir moedas pessoais',t=>{
 const f=fixture(t),{member,guild:g,act}=f;
 const before=member.save.coins;
 assert.equal(act(member,{action:'recruit',unit:'militia',count:10}),false);
 assert.equal(member.save.coins,before);
 assert.equal(kingdoms.troopCount(g.army),0);
 assert.equal(act(member,{action:'train',unit:'militia',count:1}),false,'quartel obrigatório');
 assert.equal(act(member,{action:'construct',buildingType:'barracks',x:11,y:7}),true);
 const barracks=g.city.buildings[0];barracks.status='complete';barracks.endsAt=Date.now()-1000;
 g.city.stock={food:100,timber:100,stone:50,coins:0};
 const wallet=member.save.coins,original={...g.city.stock};
 assert.equal(act(member,{action:'train',unit:'archer',count:5}),true);
 assert.equal(g.army.archer,5);
 assert.equal(member.save.coins,wallet,'carteira pessoal não compra unidades');
 assert.equal(g.city.stock.food,original.food-25);
 assert.equal(g.city.stock.timber,original.timber-25);
 assert.equal(g.city.stock.stone,original.stone);
 assert.equal(act(member,{action:'escort',unit:'archer',count:3}),true);
 assert.equal(g.army.archer,2);assert.equal(g.escorts[member.uid].archer,3);
 assert.equal(act(member,{action:'recall'}),true);
 assert.equal(g.army.archer,5);
 g.city.stock.food=0;
 assert.equal(act(member,{action:'train',unit:'archer',count:1}),false);
});
test('estranhos ou falsos membros não podem gastar estoques ou editar as muralhas',t=>{
 const f=fixture(t),{outsider,guild:g,act}=f;
 g.city={buildings:[],stock:{food:100,timber:100,stone:100,coins:0},lastCollectedAt:Date.now()};
 const before=structuredClone(g.city);
 for(const action of [
  {action:'construct',buildingType:'house',x:6,y:9},
  {action:'upgrade'},{action:'fortify'},{action:'collect'},
  {action:'train',unit:'militia',count:1}
 ])assert.equal(act(outsider,action),false,action.action);
 assert.deepEqual(g.city,before);
 assert.equal(g.base.level,1);
 // Uma string adulterada no personagem não é uma associação legítima.
 outsider.save.guild=g.name;
 assert.equal(act(outsider,{action:'construct',buildingType:'house',x:6,y:9}),false);
});
test('telas 2D e 3D liberam administração coletiva e eliminam compras de tropas com moedas',()=>{
 const social=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 const city3d=fs.readFileSync(path.join(__dirname,'../public/guild-city-3d.js'),'utf8');
 const isometric=fs.readFileSync(path.join(__dirname,'../public/city-isometric.js'),'utf8');
 const guide=fs.readFileSync(path.join(__dirname,'../public/guia.html'),'utf8');
 assert.doesNotMatch(social,/kingdomRecruitUnit|action:'recruit'|Recrutar tropas/);
 assert.match(social,/action:'train',unit:unitSelect\.value,count:Number\(howMany\.value\)/);
 assert.match(social,/kingdomState\.trainingCosts/);
 assert.match(social,/if\(k\.canManage\)/);
 assert.match(city3d,/state\?\.yourGuild\?\.canManage===true/);
 assert.match(isometric,/state\?\.yourGuild\?\.canManage===true/);
 assert.match(guide,/qualquer membro cadastrado da guilda pode construir/i);
 assert.match(guide,/Não existe compra de exércitos com moedas pessoais/);
});

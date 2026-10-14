'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const layout=require('../public/city-layout');
const politics=require('../kingdom-politics');
const {World}=require('../world-engine');

test('planta urbana tem lotes pré-definidos exclusivos, não sobrepostos e com desbloqueio progressivo',()=>{
 assert.ok(layout.slots.length>=45);
 const seen=new Set(),types=new Set();
 for(const slot of layout.slots){
  types.add(slot.type);
  assert.equal(layout.lotFor(slot.type,slot.x,slot.y),slot);
  assert.equal(layout.lotAt(slot.x,slot.y),slot);
  assert.ok(slot.unlockLevel>=1&&slot.unlockLevel<=60);
  for(const [x,y] of layout.cells(slot)){
   const k=x+':'+y;
   assert.ok(!seen.has(k),'lotes não podem se sobrepor: '+slot.id);
   seen.add(k);
   assert.ok(!layout.isCore(x,y),'lote não pode invadir o castelo');
  }
 }
 assert.deepEqual([...types].sort(),['barracks','farm','house','market','tower']);
 assert.equal(layout.availableLots(1).length,6);
 assert.ok(layout.availableLots(60).length>layout.availableLots(10).length);
 assert.ok(layout.availableLots(5).length>layout.availableLots(1).length);
 assert.equal(layout.canPlaceInLot([],'house',5,9,60),false,'posicionamento livre deve ser impossível');
 assert.equal(layout.canPlaceInLot([],'house',6,9,1),true);
 assert.equal(layout.canPlaceInLot([],'market',6,9,60),false,'não trocar a categoria do lote');
 assert.equal(layout.canPlaceInLot([],'house',0,0,1),false,'lote bloqueado por nível');
 assert.equal(layout.canPlaceInLot([],'house',0,0,5),true);
});
test('obra nova é autorizada somente em lote real e edifício antigo permanece no mesmo terreno',t=>{
 const sent=[],world=new World({persistentStore:{enqueue:()=>Promise.resolve(true)},send:(_s,v)=>sent.push(v),autosave:false,getOnline:()=>0,hasClassicName:()=>false});
 t.after(()=>world.stop());
 const client={socket:{},authUser:{uid:'account:urbanista',username:'Urbanista'},worldPlayer:null};
 world.join(client,{name:'Urbanista'});const p=client.worldPlayer;
 p.save.coins=10000;p.x=768;p.y=512;
 world.guild(p,{action:'create',name:'Capital dos Lotes'});
 const g=world.guilds.get('capital dos lotes');
 const opts={walkable:()=>true,portals:[],npcs:[]};
 assert.equal(politics.action(world,p,{action:'place',x:768,y:512},opts),true);
 const initial=p.save.coins;
 assert.equal(politics.action(world,p,{action:'construct',buildingType:'house',x:5,y:9},opts),false);
 assert.equal(p.save.coins,initial,'rejeições não podem cobrar moeda');
 assert.equal(politics.action(world,p,{action:'construct',buildingType:'house',x:0,y:0},opts),false,'lote futuro bloqueado');
 assert.equal(politics.action(world,p,{action:'construct',buildingType:'market',x:6,y:9},opts),false,'categoria errada');
 assert.equal(politics.action(world,p,{action:'construct',buildingType:'house',x:6,y:9,slotId:'inventado'},opts),false);
 const lot=layout.lotFor('house',6,9);
 assert.equal(politics.action(world,p,{action:'construct',buildingType:'house',x:6,y:9,slotId:lot.id},opts),true);
 assert.equal(g.city.buildings[0].slotId,lot.id);
 assert.equal(p.save.coins,initial-120);
 assert.equal(politics.action(world,p,{action:'construct',buildingType:'house',x:6,y:9,slotId:lot.id},opts),false);
 assert.equal(g.city.buildings.length,1);
 const historic={type:'farm',x:1,y:1,w:1,h:1,level:17,status:'complete'};
 g.city.buildings.push(historic);
 assert.equal(layout.at(g.city.buildings,1,1),historic);
 assert.equal(layout.canPlaceInLot(g.city.buildings,'house',0,0,60),false,'prédios antigos ainda ocupam terreno');
 assert.equal(historic.level,17,'progressos antigos são mantidos');
});

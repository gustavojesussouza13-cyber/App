'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {World}=require('../world-engine');
const kingdom=require('../kingdom-politics');

function fixture(t){
 const world=new World({persistentStore:{enqueue:()=>Promise.resolve(true)},send:()=>{},
  autosave:false,getOnline:()=>0,hasClassicName:()=>false});
 t.after(()=>world.stop());
 const client={socket:{},authUser:{uid:'account:preview-tester',username:'Tester'},worldPlayer:null};
 world.join(client,{name:'Tester'});
 const p=client.worldPlayer;p.save.coins=200000;p.x=768;p.y=512;
 world.guild(p,{action:'create',name:'Reino das Previsoes'});
 const g=world.guilds.get('reino das previsoes');
 const opts={walkable:()=>true,portals:[],npcs:[]};
 const act=(d,now=Date.now())=>kingdom.action(world,p,d,{...opts,now});
 assert.equal(act({action:'place',x:768,y:512}),true);
 return {world,p,g,act,snapshot:()=>kingdom.publicState(world,p)};
}
test('caminhantes percorrem apenas trechos ortogonais de ruas reais',async()=>{
 const {planGuildLandscape,roadNeighbors,nextRoadCell}=await import('../public/guild-landscape.mjs');
 const layout=require('../public/city-layout'),land=planGuildLandscape(layout);
 const nodes=[...land.road].map(s=>{const [x,y]=s.split(':').map(Number);return {x,y}});
 assert.ok(nodes.length>=60);
 for(const node of nodes)for(const next of roadNeighbors(land,node)){
  assert.equal(land.isRoad(next.x,next.y),true);
  assert.equal(Math.abs(node.x-next.x)+Math.abs(node.y-next.y),1);
 }
 for(let i=0;i<30;i++){
  let current=nodes[i%nodes.length],prev=null;
  for(let n=0;n<90;n++){
   const next=nextRoadCell(land,current,prev,land.hash(i,n,33));
   assert.equal(land.isRoad(next.x,next.y),true);
   const dist=Math.abs(next.x-current.x)+Math.abs(next.y-current.y);
   assert.ok(dist===1||dist===0,'não pode cortar terreno sem estrada');
   prev=current;current=next;
  }
 }
 const scene=fs.readFileSync(path.join(__dirname,'../public/guild-scene-3d.mjs'),'utf8');
 assert.match(scene,/people\.push\(\{g,i,from,to,previous:null,progress:0/);
 assert.match(scene,/p\.progress=Math\.min\(1,p\.progress\+dt\*p\.speed\)/);
 assert.match(scene,/nextRoadCell\(landscape,to,old,/);
 assert.doesNotMatch(scene,/Math\.cos\(a\)\*p\.radius/);
});
test('a prévia de fazenda é igual à evolução confirmada, incluindo custos e ciclo',t=>{
 const f=fixture(t);
 assert.equal(f.act({action:'construct',buildingType:'farm',x:8,y:15}),true);
 f.g.city.stock={food:800,timber:600,stone:400,coins:30};
 let snapshot=f.snapshot(),building=snapshot.cities.find(c=>c.name===f.g.name).buildings[0];
 const preview=building.upgradePreview;
 assert.equal(preview.levelBefore,1);
 assert.equal(preview.levelAfter,2);
 assert.deepEqual(preview.cost,{food:8,timber:6,stone:3});
 assert.equal(preview.affordable,true);
 assert.equal(preview.before.yields.food,8);
 assert.equal(preview.after.yields.food,16);
 assert.ok(preview.after.cycleMs<preview.before.cycleMs);
 assert.equal(preview.after.stock.food,792);
 assert.equal(f.act({action:'buildingUpgrade',x:8,y:15}),true);
 const after=f.snapshot(),actual=after.cities.find(c=>c.name===f.g.name).buildings[0];
 assert.equal(actual.level,preview.levelAfter);
 assert.deepEqual(actual.production.yields,preview.after.yields);
 assert.equal(actual.production.cycleMs,preview.after.cycleMs);
 assert.equal(after.yourGuild.stock.food,preview.after.stock.food);
 assert.equal(after.yourGuild.stock.timber,preview.after.stock.timber);
 assert.equal(after.yourGuild.stock.stone,preview.after.stock.stone);
});
test('prévia de torre reproduz a defesa do reino após o upgrade',t=>{
 const f=fixture(t);
 assert.equal(f.act({action:'construct',buildingType:'tower',x:8,y:9}),true);
 f.g.city.stock={food:100,timber:100,stone:100,coins:0};
 const before=f.snapshot().cities.find(c=>c.name===f.g.name).buildings[0].upgradePreview;
 assert.ok(before.after.defense>before.before.defense);
 assert.equal(f.act({action:'buildingUpgrade',x:8,y:9}),true);
 assert.equal(f.snapshot().yourGuild.fortressDefense.defense,before.after.defense);
});
test('prévia de ampliação de fortaleza reproduz defesa, capacidade, lotes e moeda',t=>{
 const f=fixture(t);
 const preview=f.snapshot().yourGuild.fortressUpgradePreview;
 assert.equal(preview.levelBefore,1);
 assert.equal(preview.levelAfter,2);
 assert.deepEqual(preview.cost,{walletCoins:1000});
 assert.equal(preview.affordable,true);
 assert.equal(f.act({action:'upgrade'}),true);
 const state=f.snapshot();
 assert.equal(state.yourGuild.fortressDefense.defense,preview.after.defense);
 assert.equal(state.yourGuild.armyCapacity,preview.after.armyCapacity);
 assert.equal(state.stockCapacity,preview.after.storage);
 assert.equal(state.walletCoins,preview.after.walletCoins);
 assert.equal(state.yourGuild.fortressUpgradePreview.levelBefore,2);
});
test('insuficiência de material e nível máximo impedem confirmar melhorias',t=>{
 const f=fixture(t);
 assert.equal(f.act({action:'construct',buildingType:'house',x:6,y:9}),true);
 const b=f.g.city.buildings[0];
 f.g.city.stock={food:0,timber:0,stone:0,coins:0};
 const prev=f.snapshot().cities.find(c=>c.name===f.g.name).buildings[0].upgradePreview;
 assert.equal(prev.affordable,false);
 assert.equal(f.act({action:'buildingUpgrade',x:6,y:9}),false);
 assert.equal(b.level,1);
 b.level=60;
 assert.equal(f.snapshot().cities.find(c=>c.name===f.g.name).buildings[0].upgradePreview,null);
 f.g.base.level=60;
 assert.equal(f.snapshot().yourGuild.fortressUpgradePreview,null);
});
test('evolução exige modal comparativo antes de enviar qualquer operação',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/guild-city-3d.js'),'utf8');
 const html=js.split('  dlg.insertAdjacentHTML(')[1].split('  document.body.append(dlg);')[0];
 assert.match(html,/guild3dUpgradeRows/);
 assert.match(html,/guild3dPreviewConfirm/);
 assert.match(js,/const preview=currentUpgrade\(\)/);
 assert.match(js,/preview\.affordable===true/);
 assert.match(js,/add\('Defesa do reino'/);
 assert.match(js,/q\('guild3dLotUpgrade'\)\.onclick=[\s\S]*?showUpgradePreview\(\{kind:'building'/);
 assert.match(js,/q\('guild3dUpgrade'\)\.onclick=\(\)=>showUpgradePreview\(\{kind:'fortress'/);
 assert.match(js,/closeUpgradePreview\(\);sendOperation\('buildingUpgrade'/);
 assert.match(js,/closeUpgradePreview\(\);sendOperation\('upgrade'/);
});

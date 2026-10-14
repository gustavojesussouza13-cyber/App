'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {World}=require('../world-engine');
const policy=require('../kingdom-politics');
function fixture(t){
 const snapshots=[];
 const world=new World({persistentStore:{enqueue:s=>{snapshots.push(structuredClone(s));return Promise.resolve(true)}},send:()=>{},autosave:false,getOnline:()=>0,hasClassicName:()=>false});
 t.after(()=>world.stop());
 const client={socket:{},authUser:{uid:'account:timed-builder',username:'TimedBuilder'},worldPlayer:null};
 world.join(client,{name:'TimedBuilder'});
 const p=client.worldPlayer;p.save.coins=200000;p.x=768;p.y=512;
 world.guild(p,{action:'create',name:'Reino dos Relogios'});
 const g=world.guilds.get('reino dos relogios');
 const now=1000000;
 const act=(action,time=now)=>policy.action(world,p,action,{now:time,walkable:()=>true,portals:[],npcs:[]});
 assert.equal(act({action:'place',x:768,y:512}),true);
 g.base.level=5;
 return {world,p,g,act,now,snapshots};
}
test('60 níveis de fortaleza aumentam armazenamento, espaços e defesa sem superar o máximo',t=>{
 const f=fixture(t);
 f.g.base.level=5;
 assert.equal(policy.stockCapacity(5),5000);
 assert.equal(policy.buildingSlots(5),60);
 assert.equal(f.act({action:'upgrade'}),true);
 assert.equal(f.g.base.level,6);
 assert.equal(policy.stockCapacity(6),5800);
 assert.equal(policy.buildingSlots(6),62);
 f.g.base.level=59;f.p.save.coins=200000;
 assert.equal(f.act({action:'upgrade'}),true);
 assert.equal(f.g.base.level,60);
 assert.equal(policy.stockCapacity(60),49000);
 assert.equal(policy.buildingSlots(60),120);
 assert.equal(policy.fortressDefense(f.g).level,60);
 assert.equal(f.act({action:'upgrade'}),false);
});
test('cada edifício tem ciclo próprio e coletar um pronto não reinicia os demais',t=>{
 const {g,act,now}=fixture(t);
 const entries=[
  {type:'house',x:6,y:9},
  {type:'farm',x:8,y:15},
  {type:'market',x:16,y:12},
  {type:'barracks',x:11,y:7},
  {type:'tower',x:8,y:9}
 ];
 for(const {type,x,y} of entries)assert.equal(act({action:'construct',buildingType:type,x,y}),true,type);
 assert.deepEqual(entries.map(({type})=>policy.CITY_PRODUCTION_MS[type]),[240000,480000,720000,960000,1200000]);
 assert.equal(act({action:'collect'},now+4*60000+10000),false);
 assert.equal(act({action:'collect'},now+5*60000),true);
 assert.equal(g.city.stock.coins,2,'primeiro casario deve estar pronto sozinho');
 assert.equal(g.city.stock.food,0,'a fazenda ainda não completou o primeiro ciclo');
 assert.equal(act({action:'collect'},now+9*60000),true);
 assert.equal(g.city.stock.food,8);
 assert.equal(act({action:'collect'},now+13*60000),true);
 assert.ok(g.city.stock.timber>=2,'mercado precisa produzir madeira em seu ciclo');
 assert.equal(act({action:'collect'},now+19*60000),true);
 assert.ok(g.city.stock.food>=9,'o quartel também tem produção individual');
 assert.equal(act({action:'collect'},now+22*60000),true);
 assert.ok(g.city.stock.stone>=2,'torre deve gerar pedra em seu ciclo');
 const clocks=g.city.buildings.map(b=>policy.productionState(g.city,b,now+22*60000));
 assert.ok(clocks.every(clock=>clock&&clock.cycleMs>0&&clock.nextAt>0));
 assert.notEqual(clocks[0].cycleMs,clocks[1].cycleMs);
});
test('evolução de edifício aumenta rendimento e acelera tempo até nível 60',t=>{
 const f=fixture(t);
 assert.equal(f.act({action:'construct',buildingType:'farm',x:8,y:15}),true);
 const farm=f.g.city.buildings[0];
 const initial=policy.productionState(f.g.city,farm,f.now+3*60000);
 assert.equal(initial.cycleMs,8*60000);
 assert.equal(initial.yields.food,8);
 f.g.city.stock={food:40000,timber:40000,stone:40000,coins:0};
 const upgradeAt=f.now+60000;
 assert.equal(f.act({action:'buildingUpgrade',x:8,y:15},upgradeAt),true);
 assert.equal(farm.level,2);
 const second=policy.productionState(f.g.city,farm,upgradeAt);
 assert.ok(second.cycleMs<initial.cycleMs);
 assert.equal(second.yields.food,16);
 farm.level=59;
 assert.equal(f.act({action:'buildingUpgrade',x:8,y:15},upgradeAt+1),true);
 assert.equal(farm.level,60);
 const max=policy.productionState(f.g.city,farm,upgradeAt+1);
 assert.equal(max.yields.food,480);
 assert.equal(max.cycleMs,96000);
 assert.equal(f.act({action:'buildingUpgrade',x:8,y:15},upgradeAt+2),false);
});
test('salvamento antigo migra produção individual sem duplicar coleta ou perder progresso',t=>{
 const f=fixture(t);
 assert.equal(f.act({action:'construct',buildingType:'farm',x:8,y:15}),true);
 const farm=f.g.city.buildings[0];
 f.g.city.lastCollectedAt=f.now+10*60000;delete farm.productionAt;
 assert.equal(f.act({action:'collect'},f.now+11*60000),false);
 assert.equal(f.act({action:'collect'},f.now+19*60000),true);
 assert.equal(f.g.city.stock.food,8);
 assert.ok(Number.isSafeInteger(farm.productionAt));
 assert.equal(f.act({action:'collect'},f.now+19*60000),false);
 f.world.persist();
 assert.ok(f.snapshots.some(s=>Number.isSafeInteger(s.guilds['reino dos relogios']?.city?.buildings?.[0]?.productionAt)));
});
test('chat mantém rascunhos quando o jogo redesenha a aba ou está desconectado',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 assert.match(src,/function drawTab\(force=false\)/);
 assert.match(src,/if\(editing&&!force\)\{parent\.dataset\.redrawPending='1';return\}/);
 assert.match(src,/if\(send\('chat',\{text,channel:/);
 assert.match(src,/Aguardando reconexão\. Sua mensagem foi preservada/);
});

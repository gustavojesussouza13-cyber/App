'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {World}=require('../world-engine');
const politics=require('../kingdom-politics');
test('cidades isométricas são validadas pelo servidor e persistem por guilda',t=>{
 const states=[],world=new World({persistentStore:{enqueue:s=>states.push(structuredClone(s))},send:()=>{},getOnline:()=>0,hasClassicName:()=>false});
 t.after(()=>world.stop());
 const client={socket:{},authUser:{uid:'account:rei',username:'Rei'},worldPlayer:null};
 world.join(client,{name:'Rei',role:'peregrino'});
 const p=client.worldPlayer;p.x=768;p.y=512;p.save.coins=20000;
 world.guild(p,{action:'create',name:'Reino da Luz'});
 const act=d=>politics.action(world,p,d,{walkable:()=>true,portals:[],npcs:[],now:1000});
 assert.equal(act({action:'place',x:768,y:512}),true);
 const before=p.save.coins;
 assert.equal(act({action:'construct',type:'house',x:1,y:2}),true);
 assert.equal(p.save.coins,before-120);
 assert.equal(act({action:'construct',type:'house',x:1,y:2}),false);
 assert.equal(act({action:'construct',type:'house',x:5,y:3}),false);
 assert.equal(act({action:'construct',type:'invalid',x:3,y:3}),false);
 assert.equal(politics.publicState(world,p).cities[0].buildings.length,1);
 world.persist();
 assert.equal(states.at(-1).guilds['reino da luz'].city.buildings[0].type,'house');
});

test('marcha atravessa apenas portais terrestres e interpola a posição',t=>{
 const world=new World({persistentStore:{enqueue:()=>{}},send:()=>{},getOnline:()=>0,hasClassicName:()=>false});
 t.after(()=>world.stop());
 const origin={zone:0,x:350,y:440},goal={zone:7,x:900,y:520};
 const route=politics.marchRoute(world,origin,goal);
 assert.ok(route.length>3,'rota cruza múltiplas regiões');
 assert.equal(route[0].zone,0);
 assert.equal(route.at(-1).zone,7);
 assert.ok(route.every(p=>p.zone<12),'nenhuma marcha entra em masmorras');
 for(let i=0;i<route.length-1;i++)if(route[i].zone!==route[i+1].zone){
  assert.ok(world.zonePortals(route[i].zone).some(g=>g.zone===route[i+1].zone),'travessia deve usar portal existente');
 }
 const now=1700000000000, march={route,startedAt:now,arrivesAt:now+45000};
 assert.deepEqual(politics.marchPosition(march,now),origin);
 assert.deepEqual(politics.marchPosition(march,now+45000),goal);
 assert.ok(politics.marchPosition(march,now+22500).zone>=0);
 assert.equal(politics.marchRoute(world,{zone:12,x:300,y:400},goal),null);
});

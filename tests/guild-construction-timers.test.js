'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {World}=require('../world-engine');
const politics=require('../kingdom-politics');

function setup(){
 const snapshots=[],notices=[];
 const world=new World({persistentStore:{enqueue:s=>snapshots.push(structuredClone(s))},
  send:(_sock,m)=>notices.push(m),getOnline:()=>0,hasClassicName:()=>false});
 const client={socket:{},authUser:{uid:'account:architect-timer',username:'Architect'},worldPlayer:null};
 world.join(client,{name:'Architect'});
 const p=client.worldPlayer;p.x=768;p.y=512;p.save.coins=18000;
 world.guild(p,{action:'create',name:'Construcoes do Tempo'});
 const now=Date.now();
 const act=(d,at=now)=>politics.action(world,p,d,{walkable:()=>true,npcs:[],portals:[],now:at});
 assert.equal(act({action:'place',x:768,y:512}),true);
 return {world,p,client,now,act,snapshots,notices,g:world.guilds.get('construcoes do tempo')};
}
test('cada tipo de edifício recebe prazo estável do servidor',()=>{
 assert.deepEqual(politics.CITY_BUILD_MS,{house:20000,farm:30000,market:45000,tower:60000,barracks:90000});
});
test('a obra ocupa a célula e é persistida na hora, sem liberar recursos antecipadamente',t=>{
 const a=setup();t.after(()=>a.world.stop());
 const startCoins=a.p.save.coins;
 const key='a0a0b123-32aa-4123-8abc-abcdef123456';
 assert.equal(a.act({action:'construct',type:'farm',x:1,y:1,opKey:key,requestId:1}),true);
 const work=a.g.city.buildings[0];
 assert.equal(work.startedAt,a.now);
 assert.equal(work.endsAt,a.now+30000);
 assert.equal(work.durationMs,30000);
 assert.equal(work.status,'building');
 assert.equal(a.p.save.coins,startCoins-160);
 assert.equal(a.snapshots.at(-1).guilds['construcoes do tempo'].city.buildings[0].endsAt,work.endsAt);
 assert.equal(a.act({action:'construct',type:'house',x:2,y:2}),false,'nenhuma sobreposição durante obra');
 assert.equal(a.act({action:'collect'},a.now+2000),false,'obra não produz antes de concluída');
 assert.equal(a.g.city.stock.food,0);
 const state=politics.publicState(a.world,a.p);
 assert.equal(state.buildTimes.farm,30000);
 assert.ok(Number.isSafeInteger(state.serverNow));
 assert.equal(state.cities[0].buildings[0].endsAt,work.endsAt);
 assert.ok(a.notices.find(msg=>msg.type==='kingdomActionResult'&&msg.ok&&/Obra iniciada/.test(msg.message)));
});
test('simultaneamente cada obra tem seu contador, e conclui só uma vez',t=>{
 const a=setup();t.after(()=>a.world.stop());
 assert.equal(a.act({action:'construct',type:'house',x:1,y:1}),true);
 assert.equal(a.act({action:'construct',type:'farm',x:5,y:1}),true);
 assert.equal(a.act({action:'construct',type:'market',x:9,y:1}),true);
 assert.equal(a.g.city.buildings.length,3);
 const before=a.snapshots.length;
 const at25=politics.resolveCityConstructions(a.world,a.now+25000);
 assert.equal(at25.length,1);
 assert.equal(a.g.city.buildings[0].status,'complete');
 assert.equal(a.g.city.buildings[1].status,'building');
 assert.equal(a.g.city.buildings[2].status,'building');
 assert.ok(a.snapshots.length>before,'mudanças de obra concluída gravadas imediatamente');
 assert.equal(politics.resolveCityConstructions(a.world,a.now+25001).length,0,'tick repetido é idempotente');
 assert.equal(politics.resolveCityConstructions(a.world,a.now+47000).length,2);
 assert.ok(a.g.city.buildings.every(b=>b.status==='complete'));
 assert.equal(politics.resolveCityConstructions(a.world,a.now+48000).length,0);
});
test('após novo processo, tempo restante é recuperado sem reiniciar e finalização persiste',t=>{
 const a=setup();t.after(()=>a.world.stop());
 const key='b0a0b123-32aa-4123-8abc-abcdef123456';
 assert.equal(a.act({action:'construct',type:'farm',x:2,y:2,opKey:key,requestId:2}),true);
 const snapshot=structuredClone(a.snapshots.at(-1));
 const restored=new World({persistentStore:{enqueue:s=>a.snapshots.push(structuredClone(s))},
  send:()=>{},getOnline:()=>0,hasClassicName:()=>false});
 t.after(()=>restored.stop());
 restored.saved=structuredClone(snapshot);
 restored.guilds=new Map(Object.entries(snapshot.guilds));
 const c={socket:{},authUser:{uid:a.p.uid,username:'Architect'},worldPlayer:null};
 restored.join(c,{name:'Architect'});
 const before=politics.publicState(restored,c.worldPlayer);
 assert.equal(before.cities[0].buildings[0].endsAt,a.now+30000);
 const dateDiff=before.cities[0].buildings[0].endsAt-(a.now+10000);
 assert.equal(dateDiff,20000);
 assert.equal(politics.resolveCityConstructions(restored,a.now+30000).length,1);
 assert.equal(politics.publicState(restored,c.worldPlayer).cities[0].buildings[0].status,'complete');
 assert.equal(a.snapshots.at(-1).guilds['construcoes do tempo'].city.buildings[0].status,'complete');
});
test('quartel não recruta nem torre reforça defesa enquanto obra não terminou',t=>{
 const a=setup();t.after(()=>a.world.stop());
 assert.equal(a.act({action:'construct',type:'barracks',x:2,y:2}),true);
 assert.equal(a.act({action:'train',unit:'militia',count:1},a.now+10000),false);
 assert.equal(politics.resolveCityConstructions(a.world,a.now+90000).length,1);
 // Falta recurso continua bloqueando treinamento mesmo depois de ficar pronto.
 assert.equal(a.act({action:'train',unit:'militia',count:1},a.now+90001),false);
 assert.equal(a.g.city.buildings[0].status,'complete');
});

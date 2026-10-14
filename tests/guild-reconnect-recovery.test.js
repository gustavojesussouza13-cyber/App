'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {World}=require('../world-engine');
const politics=require('../kingdom-politics');

function buildFixture({saveResult=true}={}){
 const snapshots=[],messages=[];
 const store={
  pending:null,
  enqueue(snapshot){
   snapshots.push(structuredClone(snapshot));
   return Promise.resolve(saveResult);
  }
 };
 const world=new World({persistentStore:store,autosave:false,
  send:(_sock,message)=>messages.push(message),
  getOnline:()=>0,hasClassicName:()=>false});
 const uid='account:reconnect-architect';
 const client={socket:{},authUser:{uid,username:'Construtor'},worldPlayer:null};
 world.join(client,{name:'Construtor'});
 const p=client.worldPlayer;
 p.save.coins=10000;p.x=768;p.y=512;
 world.guild(p,{action:'create',name:'Fortaleza Reconectada'});
 const options={walkable:()=>true,portals:[],npcs:[]};
 assert.equal(politics.action(world,p,{action:'place',x:768,y:512},options),true);
 const opKey='e1a0b123-32aa-4123-8abc-abcdef123456';
 assert.equal(politics.action(world,p,{
  action:'construct',type:'house',x:2,y:2,requestId:101,opKey
 },options),true);
 return {world,p,uid,client,snapshots,messages,store,opKey};
}

test('estado consultado depois de 00:00 conclui e persiste obra sem depender da sala',async t=>{
 const f=buildFixture();t.after(()=>f.world.stop());
 const work=f.world.guilds.get('fortaleza reconectada').city.buildings[0];
 const before=f.snapshots.length;
 work.endsAt=Date.now()-1000;
 const state=politics.publicState(f.world,f.p);
 assert.equal(work.status,'complete','obra vencida não pode continuar em building');
 assert.equal(state.cities[0].buildings[0].status,'complete');
 assert.ok(f.snapshots.length>before,'conclusão precisa disparar persistência');
 assert.equal(f.snapshots.at(-1).guilds['fortaleza reconectada'].city.buildings[0].status,'complete');
 assert.equal(politics.resolveCityConstructions(f.world,Date.now()).length,0,'conclusão idempotente');
});

test('nova sessão restaura o edifício no terreno e não exibe 00:00 para sempre',async t=>{
 const f=buildFixture();t.after(()=>f.world.stop());
 const committed=structuredClone(f.snapshots.at(-1));
 const restored=new World({persistentStore:{enqueue:s=>{f.snapshots.push(structuredClone(s));return Promise.resolve(true)}},
  autosave:false,send:()=>{},getOnline:()=>0,hasClassicName:()=>false});
 t.after(()=>restored.stop());
 restored.saved=structuredClone(committed);
 restored.guilds=new Map(Object.entries(committed.guilds));
 const client={socket:{},authUser:{uid:f.uid,username:'Construtor'},worldPlayer:null};
 restored.join(client,{name:'Construtor'});
 const before=politics.publicState(restored,client.worldPlayer);
 assert.equal(before.cities[0].buildings.length,1);
 assert.equal(before.cities[0].buildings[0].status,'building');
 const work=restored.guilds.get('fortaleza reconectada').city.buildings[0];
 work.endsAt=Date.now()-1000;
 const after=politics.publicState(restored,client.worldPlayer);
 assert.equal(after.cities[0].buildings.length,1);
 assert.equal(after.cities[0].buildings[0].status,'complete');
 assert.equal(f.snapshots.at(-1).guilds['fortaleza reconectada'].city.buildings[0].status,'complete');
});

test('falha de commit NÃO gera confirmação falsa de salvamento permanente',async t=>{
 const f=buildFixture({saveResult:false});t.after(()=>f.world.stop());
 await new Promise(resolve=>setImmediate(resolve));
 const result=f.messages.filter(m=>m.type==='kingdomDurable'&&m.opKey===f.opKey);
 assert.ok(result.length>0,'retorno de persistência deve chegar ao navegador');
 assert.ok(result.every(m=>m.ok===false),'sem commit não pode enviar durable true');
 assert.match(result.at(-1).message,/banco|gravação|salv/i);
});

test('construções antigas sem endsAt são recuperadas como concluídas',t=>{
 const f=buildFixture();t.after(()=>f.world.stop());
 const work=f.world.guilds.get('fortaleza reconectada').city.buildings[0];
 delete work.endsAt;
 const state=politics.publicState(f.world,f.p);
 assert.equal(work.status,'complete');
 assert.equal(state.cities[0].buildings[0].status,'complete');
 assert.ok(Number.isSafeInteger(work.completedAt));
});

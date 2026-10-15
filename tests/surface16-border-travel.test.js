'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {World,ZONES,ZONE_W,ZONE_H}=require('../world-engine');
const frontier=require('../frontier-world');
const terrain=require('../world-terrain');
const politics=require('../kingdom-politics');
function fixture(t){
 const events=[],world=new World({send:(_s,msg)=>events.push(msg),getOnline:()=>0,hasClassicName:()=>false,autosave:false,persistentStore:{enqueue:()=>Promise.resolve(true)}});
 const client={socket:{},authUser:{uid:'account:Regresso',username:'Regresso'},worldPlayer:null};
 world.join(client,{name:'Regresso'});
 t.after(()=>world.stop());
 return {world,client,p:client.worldPlayer,events};
}
test('o continente tem exatamente 16 províncias de superfície e não transforma masmorras em reinos',()=>{
 assert.equal(politics.CONTINENT_REGIONS,16);
 assert.equal(politics.BUILDABLE_REGIONS,16);
 assert.deepEqual(frontier.MAIN_SURFACE_IDS,[...Array(12).keys(),40,41,42,43]);
 assert.equal(new Set(frontier.MAIN_SURFACE_IDS).size,16);
 for(let i=12;i<40;i++)assert.equal(frontier.isMainSurface(i),false);
 for(let i=44;i<140;i++)assert.equal(frontier.isMainSurface(i),false);
});
test('fundar fortaleza é permitido nos quatro novos territórios mas proibido no deserto selvagem',t=>{
 const {world,p}=fixture(t);
 p.save.coins=10000;
 world.guild(p,{action:'create',name:'Guardioes da Superficie'});
 assert.equal(p.save.guild,'Guardioes da Superficie');
 p.zone=42;p.save.zone=42;p.x=770;p.y=511;p.save.coins=10000;
 assert.equal(politics.action(world,p,{action:'place',x:770,y:511},{now:Date.now(),walkable:()=>true,portals:[],npcs:[]}),true);
 const guild=world.guilds.get('guardioes da superficie');
 assert.equal(guild.base.zone,42);
 const atlas=politics.publicState(world,p);
 assert.ok(atlas.bases.some(base=>base.zone===42));
 assert.ok(atlas.zones.find(region=>region.zone===42).buildable);
});
test('atlas permite retorno imediato às 16 regiões, sem desbloquear masmorras',t=>{
 const {world,client,p,events}=fixture(t);
 p.zone=frontier.idFor(10,10);p.save.zone=p.zone;
 world.receive(client,{type:'atlasTravel',zone:7});
 assert.equal(p.zone,7);
 assert.equal(p.save.zone,7);
 assert.ok(events.some(m=>m.type==='travel'&&m.zone===7));
 // A origem oficial continua acessível a um único clique, mesmo distante.
 p.zone=frontier.idFor(-300,250);p.save.zone=p.zone;
 p.lastAtlasTravel=0;
 world.receive(client,{type:'atlasTravel',zone:43});
 assert.equal(p.zone,43);
 p.lastAtlasTravel=0;
 world.receive(client,{type:'atlasTravel',zone:12});
 assert.equal(p.zone,43,'não liberar masmorra histórica pelo atlas');
 world.receive(client,{type:'atlasTravel',zone:44});
 assert.equal(p.zone,43,'não permitir viagem rápida a terras selvagens');
});
test('caminhar até a borda da fronteira atravessa ao vizinho e preserva progresso',t=>{
 const {world,client,p,events}=fixture(t);
 const first=frontier.idFor(3,2),east=frontier.idFor(4,2);
 p.zone=first;p.save.zone=first;p.x=ZONE_W-24;p.y=470;p.save.coins=371;p.save.level=16;
 world.receive(client,{type:'crossBoundary',direction:'leste'});
 assert.equal(p.zone,east);
 assert.equal(p.x,42);
 assert.equal(p.y,470);
 assert.equal(p.save.coins,371);
 assert.equal(p.save.level,16);
 assert.ok(p.save.visited.includes(east));
 assert.ok(events.some(m=>m.type==='travel'&&m.zone===east));
 const before=p.zone;
 p.x=300;p.lastBorderCross=0;
 world.receive(client,{type:'crossBoundary',direction:'oeste'});
 assert.equal(p.zone,before,'não atravessar estando longe da borda');
 p.x=24;p.lastBorderCross=0;
 world.receive(client,{type:'crossBoundary',direction:'oeste'});
 assert.equal(p.zone,first);
});
test('fronteira não bloqueia água, mas as áreas históricas mantêm colisão',()=>{
 for(const zone of [40,44,101,frontier.idFor(-20,30)]){
  for(const [x,y] of [[300,720],[110,650],[1000,100],[900,920]]){
   assert.equal(terrain.canStand(zone,x,y,ZONES),true);
  }
 }
 assert.equal(terrain.canStand(7,0,500,ZONES),false);
 assert.equal(terrain.canStand(12,0,500,ZONES),false);
});
test('perigo e níveis são crescentes conforme a distância ao continente',()=>{
 const zones=[0,1,4,10,40,100,1000,10000].map(x=>frontier.idFor(x,0));
 const strength=zones.map(z=>frontier.difficulty(z));
 const levels=zones.map(z=>frontier.monsterLevel(z));
 for(let i=1;i<zones.length;i++){
  assert.ok(strength[i]>=strength[i-1]);
  assert.ok(levels[i]>=levels[i-1]);
 }
 assert.ok(strength.at(-1)>strength[0]);
 assert.ok(levels.at(-1)>levels[0]);
 const engine=fs.readFileSync(path.join(__dirname,'../world-engine.js'),'utf8');
 assert.match(engine,/frontierDistance/);
 assert.match(engine,/detection=frontier.isFrontier/);
 assert.match(engine,/chaseSpeed=frontier.isFrontier/);
 assert.match(engine,/strikeDelay/);
});
test('cliente oferece nomes clicáveis no atlas e atravessa bordas pelo servidor',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 assert.match(src,/atlasTravel/);
 assert.match(src,/atlas-fasttravel/);
 assert.match(src,/crossBoundary/);
 assert.match(src,/session\.region\?\.frontier/);
 assert.match(html,/chat-drawer-v1/);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const frontier=require('../frontier-world');
const terrain=require('../world-terrain');
const {World,ZONES,ZONE_W,ZONE_H}=require('../world-engine');
const creature=require('../monster-progression');

function fixture(t){
 const sent=[];
 const w=new World({send:(_socket,message)=>sent.push(message),
  getOnline:()=>0,hasClassicName:()=>false,autosave:false,
  persistentStore:{enqueue:()=>Promise.resolve(true)}});
 const makeClient=()=>{
  const c={socket:{},worldPlayer:null,authUser:{uid:'account:ExploradorInfinito',username:'ExploradorInfinito'}};
  w.join(c,{name:'ExploradorInfinito'});
  return c;
 };
 const c=makeClient();
 t.after(()=>w.stop());
 return {w,c,p:c.worldPlayer,sent,makeClient};
}

test('mapa tem coordenadas negativas e IDs determinísticos com transporte bidirecional',()=>{
 const seen=new Set();
 for(const [x,y] of [[0,0],[-1,0],[0,1],[1,-1],[-3,-5],[100,300],
  [-1400,900],[-123456,456789],[0,1000000]]){
  const id=frontier.idFor(x,y);
  assert.ok(id>=40&&Number.isSafeInteger(id));
  assert.deepEqual(frontier.coordsFor(id),{x,y});
  assert.deepEqual(frontier.info(id),frontier.info(id));
  assert.equal(seen.has(id),false);seen.add(id);
  const links=frontier.around(id);
  assert.ok(links.length>=4);
  for(const link of links){
   assert.equal(frontier.isZone(link.zone),true);
   if(link.zone>=40){
    assert.ok(frontier.around(link.zone).some(g=>g.zone===id),
     'todo portal de fronteira tem passagem de retorno');
   }
  }
 }
 assert.equal(frontier.idFor(0,0),40);
 assert.equal(frontier.coordsFor(39),null);
 assert.equal(frontier.idFor(1e100,0),null);
 assert.equal(frontier.isZone(Number.MAX_SAFE_INTEGER+1),false);
 assert.equal(frontier.isZone(-1),false);
});

test('continente histórico conserva exatamente 40 regiões e inicia com 576 monstros',t=>{
 const {w}=fixture(t);
 assert.equal(ZONES.length,40);
 assert.equal(w.zoneInfo().length,40);
 assert.equal(w.monsters.size,40);
 assert.equal(w.totalMonsters(),576);
 for(let i=0;i<40;i++)assert.ok(Array.isArray(ZONES[i]));
 assert.equal(w.zonePortals(10).some(g=>g.zone===40),false);
 assert.equal(w.zonePortals(11).some(g=>g.zone===40),true);
 const first=frontier.info(40);
 assert.deepEqual(ZONES[40],[first.name,first.biome]);
 assert.equal(Object.hasOwn(ZONES,40),false,'não materializar novas áreas no array histórico');
});

test('portais autorizados expandem em quatro direções e não aceitam saltos fraudulentos',t=>{
 const {w,p,c,sent}=fixture(t);
 p.zone=11;p.save.zone=11;p.x=ZONE_W/2;p.y=ZONE_H/2;
 w.travel(p,40);
 assert.equal(p.zone,40);
 assert.equal(p.save.zone,40);
 assert.equal(w.monsters.get(40).length,14);
 assert.ok(terrain.canStand(p.zone,p.x,p.y,ZONES));
 assert.equal(w.currentRegion(40).frontier,true);
 assert.ok(sent.some(m=>m.type==='travel'&&m.region?.id===40));
 const east=frontier.idFor(1,0);
 assert.ok(w.zonePortals(40).some(g=>g.zone===east));
 w.travel(p,east);
 assert.equal(p.zone,east);
 const previous=p.zone;
 w.travel(p,frontier.idFor(40,99));
 assert.equal(p.zone,previous,'teleporte arbitrário não autorizado');
 w.travel(p,40);
 assert.equal(p.zone,40);
 w.travel(p,11);
 assert.equal(p.zone,11);
 assert.equal(w.currentRegion(11).frontier,false);
 assert.ok(p.save.visited.includes(40));
 w.leave(c);
 const again={socket:{},worldPlayer:null,authUser:{uid:'account:ExploradorInfinito',username:'ExploradorInfinito'}};
 w.join(again,{name:'ExploradorInfinito'});
 assert.equal(again.worldPlayer.save.zone,11);
});

test('login restaura coordenadas procedurais sem apagar inventário nem progresso',t=>{
 const {w,c,p}=fixture(t);
 p.zone=11;p.save.zone=11;
 w.travel(p,40);
 const target=frontier.idFor(-2,3);
 p.zone=target;p.save.zone=target;p.x=789;p.y=499;p.save.x=789;p.save.y=499;
 p.save.inventory.pocao=17;p.save.level=19;
 w.leave(c);
 const again={socket:{},worldPlayer:null,authUser:{uid:'account:ExploradorInfinito',username:'ExploradorInfinito'}};
 w.join(again,{name:'ExploradorInfinito'});
 const player=again.worldPlayer;
 assert.equal(player.zone,target);
 assert.equal(player.save.level,19);
 assert.equal(player.save.inventory.pocao,17);
 assert.ok(terrain.canStand(target,player.x,player.y,ZONES));
 assert.equal(w.monsters.get(target).length,14);
});

test('somente monstros em regiões ativas ocupam cache procedimental, evolução permanece salva',t=>{
 const {w}=fixture(t);
 const origin=40;
 const monster=w.ensureMonsters(origin)[0];
 assert.ok(monster.level<100,'primeira fronteira precisa ter dificuldade gradual');
 const before=monster.level;
 creature.evolveOnVictory(monster,{level:30,role:'arqueiro'});
 w.saved.monsters[monster.id]=creature.cleanRecord(monster.progress);
 const savedVictories=monster.progress.victories;
 for(let x=1;x<=80;x++)w.ensureMonsters(frontier.idFor(x,0));
 assert.ok([...w.monsters.keys()].filter(frontier.isFrontier).length<=32);
 assert.equal(w.monsters.has(origin),false);
 const reloaded=w.ensureMonsters(origin)[0];
 assert.equal(reloaded.progress.victories,savedVictories);
 assert.ok(reloaded.level>=before);
 assert.equal(w.monsters.has(0),true);
 assert.equal(w.monsters.has(39),true);
 assert.ok(w.monsters.size<=72);
});

test('cliente não expande sessão de zonas para tamanho do identificador procedimental',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 const mmo=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 const art=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8');
 assert.match(html,/procedural-world\.js/);
 assert.match(mmo,/session\.region=msg\.region/);
 assert.match(mmo,/zoneBiome:session\.region\?/);
 assert.doesNotMatch(mmo,/session\.zones\[msg\.zone\]\s*=/);
 assert.match(art,/opt\.zoneBiome/);
});

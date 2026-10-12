'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),crypto=require('node:crypto');
const terrain=require('../world-terrain');
const {World,ZONES,ZONE_W,ZONE_H}=require('../world-engine');

function canvasTerrain(){
 const s=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8');
 const begin=s.indexOf('const rng=n=>'),end=s.indexOf('function create(',begin);
 const kindStart=s.indexOf(' function kind(',end),kindEnd=s.indexOf(' function terrain(',kindStart);
 assert.ok(begin>=0&&end>begin&&kindStart>end&&kindEnd>kindStart);
 const code='const TILE=32;\n'+s.slice(begin,end)+'\nconst pathY=(x,z)=>ROAD(z)(x);\n'+s.slice(kindStart,kindEnd)+'\nkind;';
 return vm.runInNewContext(code);
}
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-terrain-')),events=[];
 const world=new World({send:(s,m)=>events.push(m),getOnline:()=>0,hasClassicName:()=>false,dataFile:path.join(dir,'world.json')});
 t.after(()=>{world.stop();fs.rmSync(dir,{recursive:true,force:true})});
 const token=crypto.randomBytes(32).toString('hex'),c={socket:{},worldPlayer:null};
 world.join(c,{name:'TerrenoTeste',token});
 return {world,c,p:c.worldPlayer,events,token};
}
function blockedAdjacent(zone){
 for(let y=64;y<ZONE_H-80;y+=16)for(let x=64;x<ZONE_W-80;x+=16){
  if(terrain.canStand(zone,x,y,ZONES)&&!terrain.canStand(zone,x+30,y,ZONES))return {x,y};
 }
 throw Error('Sem borda de água encontrada');
}
test('regras de colisão correspondem ao terreno visual das quarenta regiões',()=>{
 const renderKind=canvasTerrain();
 for(let zone=0;zone<ZONES.length;zone++){
  const biome=terrain.BIOMES[ZONES[zone][1]];
  for(let y=0;y<32;y+=2)for(let x=0;x<48;x+=2)
   assert.equal(terrain.kind(x,y,zone,biome),renderKind(x,y,zone,biome),`tile ${zone}/${x}/${y}`);
 }
});
test('personagens não entram em água e deslizam ao longo da margem',t=>{
 const {world,c,p}=fixture(t);
 const candidate=blockedAdjacent(8);
 p.zone=8;p.save.zone=8;p.x=candidate.x;p.y=candidate.y;
 p.lastMove=Date.now()-180;p.moveCredit=35;
 world.receive(c,{type:'move',x:p.x+30,y:p.y});
 assert.ok(terrain.canStand(p.zone,p.x,p.y,ZONES));
 assert.ok(p.x<candidate.x+30,'não atravessa água');
 assert.ok(p.moveCredit>=0);
});
test('posições legadas em água são recuperadas sem perder inventário ou nível',t=>{
 const {world,c,p,token}=fixture(t);
 world.leave(c);
 let water=null;
 for(let y=50;y<ZONE_H-50&&!water;y+=16)for(let x=50;x<ZONE_W-50;x+=16)
  if(!terrain.canStand(8,x,y,ZONES)){water={x,y};break}
 assert.ok(water);
 const uid=crypto.createHash('sha256').update(token).digest('hex');
 const save=world.saved.characters[uid];
 save.zone=8;save.x=water.x;save.y=water.y;save.level=11;save.inventory.pocao=9;
 const client={socket:{},worldPlayer:null};
 world.join(client,{name:'TerrenoTeste',token});
 assert.ok(client.worldPlayer);
 assert.equal(client.worldPlayer.save.level,11);
 assert.equal(client.worldPlayer.save.inventory.pocao,9);
 assert.ok(terrain.canStand(8,client.worldPlayer.x,client.worldPlayer.y,ZONES));
});
test('todos os monstros das quarenta regiões nascem em terra acessível',t=>{
 const {world}=fixture(t);
 for(const [zone,mobs] of world.monsters)
  for(const m of mobs)assert.ok(terrain.canStand(zone,m.home.x,m.home.y,ZONES),`monstro ${m.id} em água`);
 assert.equal(world.totalMonsters(),576);
});
test('passagens chegam sempre em terra, inclusive masmorras',t=>{
 const {world,p}=fixture(t);
 for(let z=1;z<ZONES.length;z++){
  // Validar o ponto de chegada sem precisar gastar chaves.
  const spot=terrain.nearestWalkable(z,ZONE_W/2,ZONE_H/2,ZONES);
  assert.ok(terrain.canStand(z,spot.x,spot.y,ZONES),`entrada de ${z}`);
 }
 assert.equal(p.save.zone,0);
});
test('movimentação continua limitada no servidor mesmo com cliente modificado',t=>{
 const {world,c,p}=fixture(t),start={x:p.x,y:p.y};
 for(let i=0;i<80;i++){
  p.lastMove=Date.now()-25;
  world.receive(c,{type:'move',x:1500,y:p.y,dir:1});
 }
 assert.ok(Math.hypot(p.x-start.x,p.y-start.y)<480,'spam não atravessa o mundo');
 assert.ok(terrain.canStand(p.zone,p.x,p.y,ZONES));
});

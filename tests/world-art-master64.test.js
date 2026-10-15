'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ART=require('../public/world-art-master64');
const ATELIER=require('../public/character-atelier16');
const STUDIO=require('../public/sprite-studio');
const LAND=require('../public/landscape16');
const source=filename=>fs.readFileSync(path.join(__dirname,'../public',filename),'utf8');
function canvas(){
 const pixels=[],moves=[];
 return{
  ctx:{
   fillStyle:'#000',imageSmoothingEnabled:true,
   fillRect(x,y,w,h){
    assert.ok([x,y,w,h].every(Number.isInteger),'only native integer clusters');
    assert.ok(w>0&&h>0&&x>=0&&y>=0&&x+w<=64&&y+h<=80,'sprite clipped to 64x80');
    pixels.push([this.fillStyle,x,y,w,h]);
   },
   save(){moves.push(['save'])},restore(){moves.push(['restore'])},
   scale(x,y){moves.push(['scale',x,y])},translate(x,y){moves.push(['translate',x,y])}
  },pixels,moves
 };
}
const sign=x=>JSON.stringify(x.pixels);
test('NPCs have distinct 64x80 professional tools for all 56 original narrative identities',()=>{
 assert.equal(ART.WIDTH,64);assert.equal(ART.HEIGHT,80);
 assert.equal(ART.VERSION,'world-art-master64-v1');
 const styles=ATELIER.NPC_STYLES;
 assert.equal(styles.length,56);
 const samples=new Set(),colors=new Set();
 for(let i=0;i<styles.length;i++){
  const face=canvas();
  assert.equal(ART.npc(face.ctx,{npc:{id:'historia-'+i,name:'Morador '+i},dir:2,action:'idle',frame:0}),true);
  assert.ok(face.pixels.length>100,'NPC '+i+' needs painted contours');
  samples.add(sign(face));
  for(const pixel of face.pixels)colors.add(pixel[0]);
 }
 assert.ok(samples.size>=40,'original characters must differ rather than reusing one costume');
 assert.ok(colors.size>30);
});
test('merchant, forge, guard, scholar and healer are different equipment silhouettes',()=>{
 const styles=[
  ['ferreira-fornalha','forge'],['guarda-aurora','guard'],
  ['curandeira','healer'],['bibliotecario','scholar'],
  ['padeira','trader'],['viajante','traveler']
 ];
 const distinct=[];
 for(const [style,profession]of styles){
  assert.equal(ART.NPC_JOBS(style),profession);
  const i=ATELIER.NPC_STYLES.indexOf(style);
  const c=canvas();
  ART.npc(c.ctx,{npc:{id:'historia-'+i,name:style},action:'idle',dir:2});
  distinct.push(sign(c));
 }
 assert.equal(new Set(distinct).size,6);
});
test('NPC animation, lateral directions and equipment are stable',()=>{
 const n={id:'historia-7',name:'Guarda'};
 const all=[];
 for(const dir of [0,1,2,3])for(const action of ['idle','walk','attack','hurt','death']){
  const c=canvas();
  ART.npc(c.ctx,{npc:n,dir,action,frame:2});
  assert.ok(c.pixels.length>85);
  all.push(sign(c));
  if(dir===3)assert.ok(c.moves.some(x=>x[0]==='scale'&&x[1]===-1));
 }
 assert.ok(new Set(all).size>=12);
 const first=canvas(),again=canvas();
 ART.npc(first.ctx,{npc:n,dir:2,action:'walk',frame:2});
 ART.npc(again.ctx,{npc:n,dir:2,action:'walk',frame:2});
 assert.equal(sign(first),sign(again));
});
test('all 15 monster families have different anatomies, no shared archer sprite',()=>{
 assert.equal(ART.CREATURES.length,15);
 const signatures=new Set();
 for(const type of ART.CREATURES){
  const c=canvas();
  assert.equal(ART.creature(c.ctx,{type,dir:2,action:'idle',frame:0,zone:4,species:7}),true);
  assert.ok(c.pixels.length>50,'missing bestiary sprite '+type);
  signatures.add(sign(c));
 }
 assert.equal(signatures.size,ART.CREATURES.length);
});
test('bosses have additional crowns, rune crystals, color gradients and attack frames',()=>{
 for(const type of ['esqueleto','aranha','golem','dragao']){
  const base=canvas(),boss=canvas();
  ART.creature(base.ctx,{type,boss:false,zone:20,species:9,action:'attack',frame:2});
  ART.creature(boss.ctx,{type,boss:true,zone:20,species:9,action:'attack',frame:2});
  assert.notEqual(sign(base),sign(boss),'boss needs independently marked pixels '+type);
  assert.ok(boss.pixels.length>base.pixels.length);
  assert.ok(boss.pixels.some(px=>px[0]==='#eec47c'));
  const attacks=[];
  for(let i=0;i<5;i++){
   const a=canvas();ART.creature(a.ctx,{type,boss:true,action:'attack',frame:i,zone:20,species:9});
   attacks.push(sign(a));
  }
  assert.ok(new Set(attacks).size>=4,'boss attack frames do not move '+type);
 }
});
test('monster evolution variants, directions and species are represented visually',()=>{
 const source=canvas(),other=canvas(),side=canvas(),back=canvas();
 ART.creature(source.ctx,{type:'golem',species:7,zone:16,dir:2,action:'walk',frame:2});
 ART.creature(other.ctx,{type:'golem',species:8,zone:16,dir:2,action:'walk',frame:2});
 ART.creature(side.ctx,{type:'golem',species:7,zone:16,dir:3,action:'walk',frame:2});
 ART.creature(back.ctx,{type:'golem',species:7,zone:16,dir:0,action:'walk',frame:2});
 assert.notEqual(sign(source),sign(other));
 assert.ok(side.moves.some(x=>x[0]==='scale'&&x[1]===-1));
 assert.ok(source.pixels.length>70&&back.pixels.length>70);
});
test('browser loads world art before Sprite Studio; actual studio cache uses the new master',()=>{
 const html=source('mundo.html'),studioCode=source('sprite-studio.js');
 assert.match(html,/world-art-master64\.js\?v=world-art-master64-v1/);
 assert.match(html,/landscape16\.js\?v=world-landscape-v2/);
 assert.match(html,/sprite-studio\.js\?v=world-art-master64-v1/);
 assert.ok(html.indexOf('/world-art-master64.js')<html.indexOf('/sprite-studio.js'));
 assert.match(studioCode,/WORLD_MASTER\?\.npc/);
 assert.match(studioCode,/WORLD_MASTER\?\.creature/);
 const results=[],doc={createElement(){
  const c=canvas();results.push(c);
  return{width:0,height:0,getContext:()=>c.ctx};
 }};
 const studio=STUDIO.create({documentRef:doc});
 const npc=studio.obtain('npc','guarda',2,'idle',0,false,0,0,
  {id:'historia-7',name:'Guarda'});
 const monster=studio.obtain('monster','lobo',2,'walk',2,false,0,7);
 const boss=studio.obtain('monster','aranha',2,'attack',2,true,21,7);
 assert.equal(npc.width,64);assert.equal(monster.height,80);
 assert.ok(results[0].pixels.length>100&&results[1].pixels.length>50);
 assert.notDeepEqual(results[1].pixels,results[2].pixels);
 assert.strictEqual(studio.obtain('monster','lobo',2,'walk',2,false,0,7),monster);
 const browser={OsPeregrinosCharacterAtelier:ATELIER};
 vm.createContext(browser);vm.runInContext(source('world-art-master64.js'),browser);
 assert.equal(browser.OsPeregrinosWorldMaster64.VERSION,'world-art-master64-v1');
});
test('landscape keeps nine biomes and improves ground and vegetation without new render loops',()=>{
 assert.equal(Object.keys(LAND.PALETTES).length,9);
 const keys=new Set();
 for(const biome of Object.keys(LAND.PALETTES)){
  const calls=[],ctx={fillStyle:'',fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger));
   assert.ok(w>0&&h>0);
   calls.push([this.fillStyle,x,y,w,h]);
  }};
  LAND.terrainTile(ctx,4,4,2,biome,'grass',()=>'grass');
  assert.ok(calls.length>20);
  keys.add(JSON.stringify(calls));
 }
 assert.equal(keys.size,9);
 const src=source('landscape16.js');
 assert.match(src,/Ramos, folhas pendentes/);
 assert.match(src,/Textura regional legível/);
 assert.doesNotMatch(src,/requestAnimationFrame|setInterval/);
 assert.match(src,/SHADE\?\.ground/);
});
test('world art does not modify server collision, boss stats, world saves or 3D fortresses',()=>{
 const studio=source('sprite-studio.js');
 assert.match(studio,/PILGRIM_ARTISAN\?\.draw/);
 assert.match(studio,/HEROES_MASTER\?\.draw/);
 assert.match(studio,/RETRO\?\.npc/);
 assert.match(studio,/RETRO\?\.creature/);
 const html=source('mundo.html');
 assert.match(html,/guild-city-3d\.js/);
 assert.match(html,/procedural-world\.js/);
 const art=source('world-art-master64.js');
 assert.doesNotMatch(art,/localStorage|WebSocket|fetch\(|onmessage|send\(|setInterval/);
});

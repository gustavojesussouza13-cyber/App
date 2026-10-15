'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const procedural=require('../public/procedural-world');
const {World,ZONES}=require('../world-engine');
const terrain=require('../world-terrain');

test('seed pública imutável e chunks 8x8 reproduzíveis, incluindo coordenadas negativas',()=>{
 assert.equal(procedural.VERSION,1);
 assert.equal(procedural.CHUNK_SIZE,procedural.TILE*procedural.CHUNK_TILES);
 assert.match(procedural.SEED,/auren/);
 for(const zone of [0,1,10,16,22,39]){
  for(const [cx,cy] of [[0,0],[1,3],[5,0],[-1,-2]]){
   const biome=terrain.BIOMES[ZONES[zone][1]];
   const a=procedural.chunk(zone,cx,cy,biome),b=procedural.chunk(zone,cx,cy,biome);
   assert.deepEqual(a,b,'chunk igual em execuções repetidas');
   assert.ok(Object.isFrozen(a));
   assert.ok(a.elevation>=0&&a.elevation<=100);
   assert.ok(a.humidity>=0&&a.humidity<=100);
   assert.ok(a.danger>=1&&a.danger<=4);
   assert.ok(procedural.LABELS[a.biome]);
   const features=procedural.chunkFeatures(zone,cx,cy,biome);
   assert.deepEqual(features,procedural.chunkFeatures(zone,cx,cy,biome));
   for(const f of features){
    assert.ok(f.x>=cx*256&&f.x<(cx+1)*256);
    assert.ok(f.y>=cy*256&&f.y<(cy+1)*256);
    assert.ok(['tree','rock','bush','biome-prop','dungeon-prop'].includes(f.kind));
   }
  }
 }
 const ids=new Set();
 for(let z=0;z<40;z++)for(let x=0;x<6;x++)for(let y=0;y<4;y++)ids.add(procedural.chunk(z,x,y,terrain.BIOMES[ZONES[z][1]]).seed);
 assert.ok(ids.size>900,'chunks não podem colidir em massa');
});

test('microclimas mudam a aparência sem redesenhar a região protegida',()=>{
 for(let z=0;z<40;z++){
  const base=terrain.BIOMES[ZONES[z][1]];
  for(let ty=0;ty<32;ty+=3)for(let tx=0;tx<48;tx+=3){
   const local=procedural.biomeAt(z,tx,ty,base);
   assert.ok(procedural.LABELS[local]);
   if(base==='city'||base==='dungeon')assert.equal(local,base);
   const kind=terrain.kind(tx,ty,z,base);
   // Decorar terrenos não pode transformar tiles caminháveis em água.
   assert.ok(['path','water','grass','sand','paving','rock'].includes(kind));
  }
 }
});

test('monstros recebem afinidades determinísticas e mantêm identidade/progressão',t=>{
 const world=new World({send:()=>{},getOnline:()=>0,hasClassicName:()=>false,
  persistentStore:{enqueue:()=>Promise.resolve(true)}});
 t.after(()=>world.stop());
 assert.equal(world.monsters.size,40);
 assert.equal(world.totalMonsters(),576);
 const ids=new Set();
 for(const [zone,group] of world.monsters){
  for(let index=0;index<group.length;index++){
   const m=group[index],expected=procedural.monsterTrait(zone,index,m.boss);
   assert.equal(m.id,'m-'+zone+'-'+index);
   assert.equal(ids.has(m.id),false);ids.add(m.id);
   assert.deepEqual(m.trait,expected);
   assert.ok(m.hp>0&&m.maxHp>=m.hp&&m.damage>0);
   assert.ok(terrain.canStand(zone,m.home.x,m.home.y,ZONES));
   const sent=world.publicMonster(m);
   assert.equal(sent.variant,expected.variant);
   assert.equal(sent.affinity,expected.affinity);
   assert.equal(sent.rarity,expected.rarity);
   if(zone<16)assert.equal(expected.bonus,1,'equilíbrio do mundo clássico não muda');
   assert.equal(m.progress.victories,0);
  }
 }
});

test('navegador carrega a geração antes da arte e informa afinidade no bestiário',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 const renderer=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8');
 const client=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 const script=html.indexOf('src="/procedural-world.js');
 const art=html.indexOf('src="/art16.js');
 const mmo=html.indexOf('src="/mmo.js');
 assert.ok(script>=0&&art>script&&mmo>art);
 assert.match(renderer,/procedural\.chunkFeatures/);
 assert.match(renderer,/procedural\?\.biomeAt/);
 assert.match(renderer,/m\.affinity/);
 assert.match(client,/sheet\.affinity/);
});

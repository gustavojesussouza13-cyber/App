'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {World,SPECIES}=require('../world-engine');
const sentinel=require('../public/sentinela-v4.js');

function detachedWorld(){
 // Exercise the existing deterministic server spawn logic without starting
 // networking, PostgreSQL, room state or any guild/fortress subsystem.
 const world=Object.create(World.prototype);
 world.monsters=new Map();
 world.saved={monsters:{}};
 world.monsterPersistenceEnabled=false;
 return world;
}

test('Sentinela V4 corresponds to the server creature Sentinela da Noite (species 28)',()=>{
 assert.equal(SPECIES[28][0],'Sentinela da Noite');
 const art=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8');
 const match=art.match(/const types=\[([^\]]+)\]/);
 assert.ok(match,'2.5D world species mapping must exist');
 const types=[...match[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
 assert.equal(types[28],'sentinela');
 assert.ok(art.includes("const sentinelV4Drawn=ty==='sentinela'&&Boolean(sentinelV4?.drawMonster"));
 assert.equal(sentinel.FRAME.cols*sentinel.FRAME.rows,24);
});

test('Sentinela V4 is encountered in the first region of the published world',()=>{
 const world=detachedWorld();
 const zone=world.ensureMonsters(0);
 assert.equal(zone[8]?.species,28,'Vale das Oliveiras contains a deterministic Sentinela da Noite');
 assert.equal(zone[8]?.name,'Sentinela da Noite');
 assert.equal(zone[8]?.id,'m-0-8');
 assert.equal(zone[8]?.boss,false);
 assert.ok(zone[8].x>=0&&zone[8].y>=0,'spawned on the existing walkable terrain');
 assert.strictEqual(world.ensureMonsters(0),zone,'revisiting a zone preserves its monster roster');
});

test('Other legacy regions retain the same Sentinela species and V4 asset path',()=>{
 const world=detachedWorld();
 for(const [zone,index] of [[3,12],[4,7],[7,2]]){
  assert.equal(world.ensureMonsters(zone)[index]?.species,28,
   'Sentinela da Noite expected in pre-existing zone '+zone);
 }
 assert.match(sentinel.ASSET,/^\/assets\/creatures-v4\/sentinela_v4\.png\?/);
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 assert.ok(html.indexOf('/creatures-v3.js')<html.indexOf('/sentinela-v4.js'));
 assert.ok(html.indexOf('/sentinela-v4.js')<html.indexOf('/art16.js'));
});

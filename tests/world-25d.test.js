'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('Mundo Aberto 2.5D reutiliza Three.js do projeto',()=>{
 const three=read('public/world-25d.mjs');
 const pkg=JSON.parse(read('package.json'));
 assert.match(three,/import \* as THREE from '\/vendor\/three\.module\.js'/);
 assert.ok(pkg.dependencies.three,'Three.js deve continuar sendo dependência');
 assert.match(three,/THREE\.OrthographicCamera/);
 assert.match(three,/THREE\.WebGLRenderer/);
 assert.match(three,/camera\.up\.set\(0,0,-1\)/);
});

test('O mundo 2.5D não altera módulos de fortalezas nem regras do servidor',()=>{
 const renderer=read('public/world-25d.mjs');
 assert.doesNotMatch(renderer,/from ['"]\/guild-|import\(['"]\/guild-/);
 assert.match(renderer,/function createWorld25D|export function createWorld25D/);
 assert.ok(fs.existsSync(path.join(__dirname,'..','public','guild-scene-3d.mjs')));
});

test('Canvas 2D funciona quando WebGL estiver desativado ou indisponível',()=>{
 const mmo=read('public/mmo.js');
 const art=read('public/art16.js');
 assert.match(mmo,/getContext\('2d',\{alpha:true\}\)/);
 assert.match(mmo,/if\(world25dActive&&world25d\)/);
 assert.match(mmo,/world25dActive=false;updateWorld25dMode\(\)/);
 assert.match(art,/if\(useWorld25d\)ctx\.clearRect\(0,0,W,H\)/);
 assert.match(art,/else ctx\.drawImage\(cache\.canvas/);
});

test('A prévia isolada não exige autenticação, banco ou conexão WebSocket',()=>{
 const html=read('public/visual-25d.html');
 assert.match(html,/createWorld25D/);
 assert.match(html,/id="game"/);
 assert.match(html,/id="role"/);
 assert.match(html,/id="biome"/);
 assert.doesNotMatch(html,/new WebSocket|DATABASE_URL|password/);
});

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

test('A identidade do Peregrino 2.5D usa a arte pixel a pixel original e preserva aparência clássica',()=>{
 const src=read('public/peregrino-aurora25d.js');
 const art=read('public/art16.js');
 const html=read('public/mundo.html');
 assert.match(src,/OsPeregrinosArtisan64/);
 assert.match(src,/WIDTH:W,HEIGHT:H/);
 assert.match(src,/walk'\?6|move==='walk'\?6/);
 assert.match(src,/cache.size>MAX_CACHE/);
 assert.match(art,/useAurora25d&&/);
 assert.match(art,/OsPeregrinosHeroesAurora25D\?\.draw/);
 assert.match(art,/const studioHero=Boolean\(spriteStudio\?\.drawHero/);
 assert.match(html,/peregrino-aurora25d\.js/);
 assert.ok(fs.existsSync(path.join(__dirname,'..','public','peregrino-atlas25d.html')));
});

test('Cenário ortográfico inclui vegetação em instâncias e marco de Aurora sem hitboxes',()=>{
 const renderer=read('public/world-25d.mjs');
 assert.match(renderer,/function addMeadowDetails/);
 assert.match(renderer,/THREE\.InstancedMesh/);
 assert.match(renderer,/function addAuroraShrine/);
 assert.match(renderer,/zone===0&&\(biome==='meadow'\|\|biome==='city'\)/);
 assert.match(renderer,/shrine\.crystal\.rotation\.y=/);
 assert.match(renderer,/camera\.lookAt\(cx,0,cz\)/);
});
test('Modo 2.5D usa paleta Figma sem alterar HUD clássico e mantém Canvas WebGL alinhado',()=>{
 const mmo=read('public/mmo.js');
 const html=read('public/mundo.html');
 const styles=read('public/mmo-aurora25d.css');
 const engine=read('public/world-25d.mjs');
 assert.match(html,/mmo-aurora25d\.css/);
 assert.match(mmo,/document\.body\.classList\.toggle\('mmo-aurora25d',world25dActive\)/);
 assert.match(styles,/body\.mmo-aurora25d \.sidebar \.panel/);
 assert.match(styles,/#canvasShell:fullscreen #world25dBackdrop/);
 assert.match(engine,/ResizeObserver\(alignBackdrop\)/);
 assert.match(engine,/document\.addEventListener\('fullscreenchange',alignBackdrop\)/);
 assert.match(engine,/document\.removeEventListener\('fullscreenchange',alignBackdrop\)/);
});

test('As quatro classes mantêm silhuetas nativas de 64x80 na prévia e no MMO experimental',()=>{
 const heroes=read('public/aurora-heroes25d.js');
 const html=read('public/mundo.html');
 const lab=read('public/visual-25d.html');
 assert.match(heroes,/OsPeregrinosHeroesMaster64/);
 assert.match(heroes,/OsPeregrinosAurora25D/);
 assert.match(heroes,/ROLES=\['peregrino','guardiao','arqueiro','curandeiro'\]/);
 assert.match(heroes,/WIDTH,HEIGHT,ROLES/);
 assert.match(heroes,/ctx\.imageSmoothingEnabled=false/);
 assert.match(heroes,/cache\.size>MAX_CACHE/);
 assert.match(heroes,/const face=appearance/);
 assert.match(html,/aurora-heroes25d\.js/);
 assert.match(lab,/heroes-master64\.js/);
 assert.match(lab,/pixel-atelier-v1\.js/);
 assert.match(lab,/OsPeregrinosHeroesAurora25D\?\.draw/);
});

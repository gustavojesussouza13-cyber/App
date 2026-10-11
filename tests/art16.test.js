'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('mundo aberto reutiliza sprites e animações originais 16-bit',()=>{
 const page=read('public/mundo.html');
 const client=read('public/mmo.js');
 const renderer=read('public/art16.js');
 assert.match(page,/src="\/art16\.js"/);
 assert.ok(page.indexOf('/art16.js')<page.indexOf('/mmo.js'),'atlas carrega antes do jogo');
 assert.match(client,/PeregrinoArt16\.create/);
 assert.match(renderer,/gustavo_andar/);
 assert.match(renderer,/arvore_1_tema_1/);
 assert.match(renderer,/grama_01/);
 assert.match(renderer,/sentinela_andar/);
 assert.match(renderer,/monstro_limo/);
 assert.doesNotMatch(client,/function spriteDraw\(/,'personagens desenhados por retângulos foram substituídos');
});

test('atlas de pixel art é um PNG válido e contém as 78 ilustrações',()=>{
 const png=fs.readFileSync(path.join(root,'public/assets/classic-atlas.png'));
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(png.readUInt32BE(16),1024);
 assert.ok(png.readUInt32BE(20)>700);
 const atlas=JSON.parse(read('public/assets/classic-atlas-map.json'));
 assert.ok(Object.keys(atlas).length>=78);
 for(const name of ['gustavo_andar','gustavo_combate','arvore_1_tema_1','terra_01','grama_01','agua_01','monstro_lobo'])assert.ok(atlas[name],name);
});

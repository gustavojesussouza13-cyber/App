'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../public');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');

test('desktop dá prioridade ao atlas PNG desenhado, nunca à geometria V3',()=>{
 const art=source('art16.js');
 const heroAtlas=art.indexOf('const pngSprite=Boolean(desktopSprites?.drawHero');
 const heroFallback=art.indexOf('const illustratedV3=!pngSprite&&Boolean(desktopCharactersV3?.drawHero');
 const npcAtlas=art.indexOf('const pngNpc=Boolean(desktopSprites?.drawNpc');
 const npcFallback=art.indexOf('const illustratedNpcV3=!pngNpc&&Boolean(desktopCharactersV3?.drawNpc');
 assert.ok(heroAtlas>0&&heroFallback>heroAtlas,'o herói deve usar ilustração antes de blocos');
 assert.ok(npcAtlas>0&&npcFallback>npcAtlas,'NPCs devem usar ilustração antes de blocos');
 assert.match(art,/const detailed=pngSprite\|\|illustratedV3/);
 assert.match(art,/const detailed=pngNpc\|\|illustratedNpcV3/);
});
test('classe continua selecionada pelo servidor e sprite do PC mantém contraste',()=>{
 const art=source('art16.js');
 const sprites=source('desktop-sprites16.js');
 assert.match(art,/const finalRole=pngSprite\?desktopSprites\.normalizeRole\(p\.role\)/);
 assert.match(art,/const labelY=p\.y-\(pngSprite\?80:illustratedV3\?94:h\)-5/);
 assert.match(art,/#0d202019/);
 assert.match(sprites,/classic-atlas\.png/);
 for(const role of ['peregrino','guardiao','arqueiro','curandeiro'])
  assert.match(sprites,new RegExp(role+':\\{idle:\\['));
});
test('modificações são apenas no Canvas do PC, sem touch ou CSS mobile',()=>{
 const art=source('art16.js'),html=source('mundo.html');
 assert.match(art,/if\(desktopSprites\?\.enabled\)\{ctx\.fillStyle='#0d202019'/);
 assert.match(html,/art16\.js\?v=pixel-art-v1&pc=real-atlas-v4/);
 assert.ok(html.indexOf('/desktop-sprites16.js')<html.indexOf('/art16.js'));
 assert.ok(html.indexOf('/sprite-studio.js')<html.indexOf('/art16.js'));
 assert.doesNotMatch(art,/touchDevice=.*real-atlas-v4/);
});

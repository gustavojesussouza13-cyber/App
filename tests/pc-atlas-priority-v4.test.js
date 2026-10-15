'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../public');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');

test('PC retorna ao Atelier detalhado antes dos recortes PNG e dos bonecos V3',()=>{
 const art=source('art16.js');
 const hero=art.indexOf('const studioHero=Boolean(spriteStudio?.drawHero');
 const png=art.indexOf('const pngSprite=!studioHero&&Boolean(desktopSprites?.drawHero');
 const v3=art.indexOf('const illustratedV3=!studioHero&&!pngSprite&&Boolean(desktopCharactersV3?.drawHero');
 const npc=art.indexOf('const studioNpc=Boolean(spriteStudio?.drawNpc');
 const npcPng=art.indexOf('const pngNpc=!studioNpc&&Boolean(desktopSprites?.drawNpc');
 assert.ok(hero>0&&png>hero&&v3>png,'a camada de blocos não pode substituir sprites detalhados');
 assert.ok(npc>0&&npcPng>npc,'identidade própria dos NPCs restaurada');
 assert.match(art,/const animated=studioHero\|\|detailed/);
 assert.match(art,/const detailed=studioNpc\|\|pngNpc\|\|illustratedNpcV3/);
});
test('criaturas e chefes no PC usam animação exclusiva do Atelier antes do atlas minúsculo',()=>{
 const art=source('art16.js');
 assert.match(art,/const studioMonster=Boolean\(spriteStudio\?\.drawMonster/);
 assert.match(art,/const detailedBoss=!studioMonster&&Boolean/);
 assert.match(art,/const illustrated=!studioMonster&&!detailedBoss&&Boolean/);
 assert.match(art,/const top=studioMonster\?\(m\.boss\?\(premiumPc\?155:123\):\(premiumPc\?100:85\)\)/);
 assert.match(art,/const width=studioMonster\?\(m\.boss\?\(premiumPc\?124:98\):\(premiumPc\?80:68\)\)/);
});
test('classe do servidor, nome e posicionamento obedecem a arte desenhada em PC',()=>{
 const art=source('art16.js');
 assert.match(art,/const finalRole=studioHero\?spriteStudio\.normalizeRole\(p\.role\)/);
 assert.match(art,/const labelY=p\.y-\(studioHero\?\(premiumPc\?110:88\):pngSprite\?80/);
 assert.match(art,/const nameY=y-\(studioNpc\?\(premiumPc\?113:96\):pngNpc\?82/);
 assert.match(art,/#0d20200d/);
});
test('versões atualizadas invalidam cache do Chrome sem mudar mobile',()=>{
 const html=source('mundo.html'),studio=source('sprite-studio.js');
 assert.match(html,/sprite-studio\.js\?v=retro-original-64x80-v1/);
 assert.match(html,/art16\.js\?v=performance-world-v1/);
 assert.match(studio,/state\.desktopPremium===true/);
 assert.ok(html.indexOf('/sprite-studio.js')<html.indexOf('/art16.js'));
 assert.doesNotMatch(source('mmo.css'),/class-skill-fx-v1/);
});
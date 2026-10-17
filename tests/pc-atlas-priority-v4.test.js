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
test('Morcego, Serpente, Fera, Escorpião, Fantasma, Vespa, Cavaleiro, Dragão e Sentinela V4 antecedem V3 com fallback legado',()=>{
 const art=source('art16.js'),html=source('mundo.html');
 const bat=art.indexOf("const batV4Drawn=ty==='morcego'&&Boolean(batV4?.drawMonster");
 const serpent=art.indexOf("const serpentV4Drawn=ty==='serpente'&&Boolean(serpentV4?.drawMonster");
 const beast=art.indexOf("const beastV4Drawn=ty==='fera'&&Boolean(beastV4?.drawMonster");
 const scorpion=art.indexOf("const scorpionV4Drawn=ty==='escorpiao'&&Boolean(scorpionV4?.drawMonster");
 const ghost=art.indexOf("const ghostV4Drawn=ty==='fantasma'&&Boolean(ghostV4?.drawMonster");
 const wasp=art.indexOf("const waspV4Drawn=ty==='vespa'&&Boolean(waspV4?.drawMonster");
 const knight=art.indexOf("const knightV4Drawn=ty==='cavaleiro'&&Boolean(knightV4?.drawMonster");
 const dragon=art.indexOf("const dragonV4Drawn=ty==='dragao'&&Boolean(dragonV4?.drawMonster");
 const sentinel=art.indexOf("const sentinelV4Drawn=ty==='sentinela'&&Boolean(sentinelV4?.drawMonster");
 const basilisk=art.indexOf("const basiliskV4Drawn=ty==='basilisco'&&Boolean(basiliskV4?.drawMonster");
 const v3=art.indexOf('const creatureV3=!batV4Drawn&&!serpentV4Drawn&&!beastV4Drawn&&!scorpionV4Drawn&&!ghostV4Drawn&&!waspV4Drawn&&!knightV4Drawn&&!dragonV4Drawn&&!sentinelV4Drawn&&!basiliskV4Drawn&&Boolean(creaturesV3?.drawMonster');
 const studio=art.indexOf('const studioMonster=!spriteDim&&Boolean(spriteStudio?.drawMonster');
 const boss=art.indexOf('const detailedBoss=!spriteDim&&!studioMonster&&Boolean(desktopSprites?.drawMonster');
 const illustrated=art.indexOf('const illustrated=!spriteDim&&!studioMonster&&!detailedBoss&&Boolean(desktopBestiary?.drawMonster');
 assert.ok(bat>0&&serpent>bat&&beast>serpent&&scorpion>beast&&ghost>scorpion&&wasp>ghost&&knight>wasp&&dragon>knight&&sentinel>dragon&&basilisk>sentinel&&v3>basilisk&&studio>v3&&boss>studio&&illustrated>boss,
  'priority: bat/serpent/beast/scorpion/ghost/wasp/knight/dragon/sentinel V4 > five V3 creatures > Atelier > boss > legacy bestiary');
 assert.ok(art.includes('const animated=Boolean(spriteDim)||studioMonster||detailedBoss||illustrated'));
 assert.ok(art.includes('const top=spriteDim?spriteDim.healthTop:studioMonster'));
 assert.ok(art.includes('const width=spriteDim?spriteDim.width:studioMonster'));
 assert.ok(html.indexOf('/creatures-v3.js')>html.indexOf('/desktop-bestiary16.js'));
 assert.ok(html.indexOf('/creatures-v3.js')<html.indexOf('/morcego-v4.js'));
 assert.ok(html.indexOf('/morcego-v4.js')<html.indexOf('/serpente-v4.js'));
 assert.ok(html.indexOf('/serpente-v4.js')<html.indexOf('/fera-v4.js'));
 assert.ok(html.indexOf('/fera-v4.js')<html.indexOf('/escorpiao-v4.js'));
 assert.ok(html.indexOf('/escorpiao-v4.js')<html.indexOf('/fantasma-v4.js'));
 assert.ok(html.indexOf('/fantasma-v4.js')<html.indexOf('/vespa-v4.js'));
 assert.ok(html.indexOf('/vespa-v4.js')<html.indexOf('/cavaleiro-v4.js'));
 assert.ok(html.indexOf('/cavaleiro-v4.js')<html.indexOf('/dragao-v4.js'));
 assert.ok(html.indexOf('/dragao-v4.js')<html.indexOf('/sentinela-v4.js'));
 assert.ok(html.indexOf('/sentinela-v4.js')<html.indexOf('/basilisco-v4.js'));
 assert.ok(html.indexOf('/basilisco-v4.js')<html.indexOf('/art16.js'));
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
 assert.match(html,/sprite-studio\.js\?v=world-art-master64-v4/);
 assert.ok(html.includes('/art16.js?v=world-props-artisan64-v1-basilisco-v4-preview'));
 assert.match(studio,/state\.desktopPremium===true/);
 assert.ok(html.indexOf('/sprite-studio.js')<html.indexOf('/art16.js'));
 assert.doesNotMatch(source('mmo.css'),/class-skill-fx-v1/);
});
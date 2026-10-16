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
test('criaturas V3 antecedem Atelier, que continua antes dos atlas antigos como fallback',()=>{
 const art=source('art16.js'),html=source('mundo.html');
 const v3=art.indexOf('const creatureV3=Boolean(creaturesV3?.drawMonster');
 const studio=art.indexOf('const studioMonster=!creatureV3&&Boolean(spriteStudio?.drawMonster');
 const boss=art.indexOf('const detailedBoss=!creatureV3&&!studioMonster&&Boolean(desktopSprites?.drawMonster');
 const illustrated=art.indexOf('const illustrated=!creatureV3&&!studioMonster&&!detailedBoss&&Boolean(desktopBestiary?.drawMonster');
 assert.ok(v3>0&&studio>v3&&boss>studio&&illustrated>boss,
  'ordem V3 > Atelier > boss PNG > bestiario deve ser mantida');
 assert.match(art,/const animated=creatureV3\|\|studioMonster\|\|detailedBoss\|\|illustrated/);
 assert.match(art,/const top=creatureV3\?creaturesV3\.measure\(ty,m\.boss\)\.healthTop:studioMonster/);
 assert.match(art,/const width=creatureV3\?creaturesV3\.measure\(ty,m\.boss\)\.width:studioMonster/);
 assert.ok(html.indexOf('/creatures-v3.js')>html.indexOf('/desktop-bestiary16.js'));
 assert.ok(html.indexOf('/creatures-v3.js')<html.indexOf('/art16.js'));
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
 assert.match(html,/art16\.js\?v=world-props-artisan64-v1/);
 assert.match(studio,/state\.desktopPremium===true/);
 assert.ok(html.indexOf('/sprite-studio.js')<html.indexOf('/art16.js'));
 assert.doesNotMatch(source('mmo.css'),/class-skill-fx-v1/);
});
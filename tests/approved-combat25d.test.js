'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('../public/combat-approved25d.js');
const base=path.join(__dirname,'..','public');
function content(file){return fs.readFileSync(path.join(base,file),'utf8')}
const assets={
 guardiao:[960,640],arqueiro:[960,640],curandeiro:[960,640],
 flecha:[1024,512],magia:[1024,512]
};
test('Todos os cinco PNGs de combate são arquivos binários reais, com dimensões e formatos verificados',()=>{
 const manifest=JSON.parse(content('assets/combat-approved/manifest.json'));
 assert.equal(manifest.hero.framesPerRole,20);
 assert.equal(manifest.projectiles.framesPerKind,32);
 assert.equal(manifest.approvedFor,'experimental-2.5d-only');
 for(const [name,[width,height]] of Object.entries(assets)){
  const filename=['flecha','magia'].includes(name)?'projectile-'+name+'-approved.png':name+'-combat-approved.png';
  const full=path.join(base,'assets/combat-approved',filename);
  assert.ok(fs.existsSync(full),'PNG físico ausente: '+filename);
  const buf=fs.readFileSync(full);
  assert.ok(buf.length>3000,'PNG inesperadamente pequeno: '+filename);
  assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(buf.readUInt32BE(16),width);
  assert.equal(buf.readUInt32BE(20),height);
 }
});
test('Frames de ataque nas 4 direções têm cinco poses e respeitam fim do movimento',()=>{
 assert.equal(api.VERSION,'approved-combat25d-v1');
 assert.deepEqual(api.ROLES,['guardiao','arqueiro','curandeiro']);
 assert.deepEqual(api.FRAMES,['ready','windup','aim','release','recover']);
 assert.equal(api.normDir(-1),3);
 assert.equal(api.normDir(5),1);
 assert.equal(api.attackFrame(-1),-1);
 assert.equal(api.attackFrame(0),0);
 assert.equal(api.attackFrame(100),1);
 assert.equal(api.attackFrame(200),2);
 assert.equal(api.attackFrame(300),3);
 assert.equal(api.attackFrame(450),4);
 assert.equal(api.attackFrame(560),-1);
 assert.equal(api.attackFrame(Number.NaN),-1);
});
test('O MMO prioriza quadros de ataque aprovados e mantém a regra do servidor para projéteis',()=>{
 const html=content('mundo.html');
 const lab=content('visual-25d.html');
 const art=content('art16.js');
 const combat=content('combat-approved25d.js');
 const fx=content('combat-effects.js');
 assert.match(html,/combat-approved25d\.js/);
 assert.match(lab,/combat-approved25d\.js/);
 assert.match(art,/const combatHero=Boolean\(useAurora25d&&/);
 assert.match(art,/OsPeregrinosApprovedCombat25D\?\.drawHero/);
 assert.match(art,/if\(useAurora25d&&window\.OsPeregrinosApprovedCombat25D\?\.drawProjectile\(g,shot\)\)return/);
 assert.match(combat,/if\(!img\)\{if\(!pending\.has\(role\)\)void load\(role\);return false/);
 assert.match(fx,/function fire\(hit,now\)/);
 assert.match(fx,/hit\.projectile/);
 assert.match(lab,/const roleForShot=/);
});

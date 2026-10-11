'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const base=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(base,'app/src/main/assets/index.html'),'utf8');
const gradle=fs.readFileSync(path.join(base,'app/build.gradle'),'utf8');
const main=fs.readFileSync(path.join(base,'app/src/main/java/com/aurora/gustavoperegrino/MainActivity.java'),'utf8');
test('V8.2 permanece um APK Android independente, versao superior',()=>{
 assert.match(gradle,/versionCode 9\b/); assert.match(gradle,/versionName '1\.4\.2'/);
 assert.match(gradle,/applicationId 'com\.aurora\.gustavoperegrino'/);
 assert.match(html,/EDIÇÃO 16-BIT V8\.2/);
 assert.match(main,/appassets\.androidplatform\.net/);
});
test('até 5 jogadores por sala, servidor exclusivo e sem anúncios/site',()=>{
 assert.match(html,/Cooperativo online \(até 5\)/);
 assert.match(html,/1 anfitrião \+ 4 amigos/);
 assert.match(html,/wss:\/\/gustavo-peregrino-coop\.onrender\.com\/coop-ws/);
 assert.doesNotMatch(html,/wss:\/\/cronicasdaaurora\.com\.br|\/world-ws/);
});
test('salvamento solo e coop mantém chaves distintas',()=>{
 assert.match(html,/COOP_SAVE='gustavo-peregrino-coop-v1'/);
 assert.match(html,/gustavo-peregrino-v2/);
 assert.match(html,/coop\.mode==='coop'\?COOP_SAVE/);
});
test('modo coop desconectado não vira gameplay offline',()=>{
 assert.match(html,/if\(paused\|\|\(coop\.mode==='coop'&&!coop\.online\)\)return;movement/);
 assert.match(html,/function attack\(\)\{if\(paused\|\|\(coop\.mode==='coop'&&!coop\.online\)\)/);
 assert.match(html,/function interact\(\)\{if\(paused\|\|\(coop\.mode==='coop'&&!coop\.online\)\)/);
 assert.match(html,/RECONECTAR SALA V8\.2/);
 assert.match(html,/function coopBackupScreen\(fromRoom=false\)/);
 assert.match(html,/Transferir progresso cooperativo/);
 assert.match(html,/Conexão cooperativa interrompida/);
 assert.match(html,/Reconectar à sala/);
});
test('motor JavaScript permanece válido',()=>{
 const match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
 const result=cp.spawnSync(process.execPath,['--check','-'],{input:match[1],encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
});

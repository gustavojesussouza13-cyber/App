'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const build=fs.readFileSync(path.join(root,'app/build.gradle'),'utf8');
const patch=fs.readFileSync(path.join(root,'scripts/apply_v81_patch.py'),'utf8');
const script=fs.readFileSync(path.join(root,'scripts/apply_coop_patch.py'),'utf8');
test('APK atualizado para a versao 1.4.2, versionCode 9',()=>{
 assert.match(build,/versionCode 9\b/);
 assert.match(build,/versionName '1\.4\.2'/);
 assert.match(build,/applicationId 'com\.aurora\.gustavoperegrino'/);
});
test('menu nao confunde limite de cinco com antigo limite de dois',()=>{
 assert.match(patch,/Cooperativo online \(até 5\)/);
 assert.match(patch,/1 anfitrião \+ 4 amigos/);
 assert.match(patch,/Cooperativo para dois/);
 assert.match(patch,/V8\.1/);
});
test('patch e idempotente e nao toca no site',()=>{
 assert.match(script,/V8\.1\/V8\.2 already prepared/);
 assert.doesNotMatch(patch,/cronicasdaaurora\.com\.br|os-peregrinos-online\.onrender\.com/);
 assert.match(patch,/app\/src\/main\/assets\/index\.html/);
});

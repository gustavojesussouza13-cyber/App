'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pass=require('../experimental-dungeon-test-pass');
const pub=path.join(__dirname,'..','public');
const read=f=>fs.readFileSync(path.join(pub,f),'utf8');
const GOOD=Object.freeze({RENDER_SERVICE_ID:'srv-db9katmq1p3s738j1gq0',EXPERIMENTAL_DUNGEON_TEST_USERNAME:'gustavo123'});
test('dungeon testing permission is for authenticated Gustavo123 ONLY in the separate experimental Render service',()=>{
 assert.deepEqual(pass.issue({uid:'test-account-uid',username:'gustavo123'},GOOD),[12,13,14,15]);
 assert.deepEqual(pass.issue({uid:'test-account-uid',username:'GUSTAVO123'},GOOD),[12,13,14,15]);
 for(const account of [null,undefined,{username:'gustavo123'},{uid:'',username:'gustavo123'},{uid:'another',username:'gustavo124'}])
  assert.deepEqual(pass.issue(account,GOOD),[],'not a verified target account');
 for(const env of [
  {RENDER_SERVICE_ID:'srv-db5butflot8c73edvdh0',EXPERIMENTAL_DUNGEON_TEST_USERNAME:'gustavo123'},
  {RENDER_SERVICE_ID:'srv-db9katmq1p3s738j1gq0'},
  {EXPERIMENTAL_DUNGEON_TEST_USERNAME:'gustavo123'}
 ])assert.deepEqual(pass.issue({uid:'test-account-uid',username:'gustavo123'},env),[]);
 for(const zone of [12,13,14,15])
  assert.equal(pass.canEnter({isAccount:true,previewDungeonPasses:[12,13,14,15]},zone),true);
 assert.equal(pass.canEnter({isAccount:false,previewDungeonPasses:[12,13,14,15]},12),false,'guest spoofing blocked');
 assert.equal(pass.canEnter({isAccount:true,previewDungeonPasses:[12]},15),false);
});
test('only four dungeon roots are unlocked, original game economy and narrative untouched',()=>{
 const s=fs.readFileSync(path.join(__dirname,'..','world-engine.js'),'utf8');
 assert.ok(s.includes("experimentalDungeonPass.issue(owner,process.env)"));
 assert.ok(s.includes('experimentalDungeonPass.canEnter(p,b)'));
 assert.ok(s.includes('experimentalDungeonPass.canEnter(p,CROWN_DUNGEON_ROOT)'));
 assert.ok(s.includes('const sovereign=kingdoms.continentalSovereign(this);'));
 assert.ok(s.includes('  claimCrownKey(p){')||s.includes(' claimCrownKey(p){'));
 assert.ok(!s.includes("inventory['chave_masmorra_1']"));
 assert.ok(s.includes('previewDungeonPasses:p.previewDungeonPasses||[]'));
});
test('V7.5 customization loads four approved class image sources, without the obsolete hero preview',()=>{
 const src=read('appearance-class-preview-v75.js'),editor=read('appearance-editor.js'),page=read('mundo.html'),mmo=read('mmo.js');
 for(const k of ['peregrino','guardiao','arqueiro','curandeiro']){
  assert.ok(src.includes(k));
  assert.ok(src.includes(k==='peregrino'?'peregrino-runway-walk.png':k+'-sprites-3x2-64x80.png'));
 }
 assert.ok(editor.includes("title.textContent='PRÉVIA DA CLASSE V7.5'"));
 assert.ok(editor.includes('preview.draw(ctx,{role:kind'));
 assert.ok(!editor.includes("previewStudio?.obtain('hero'"));
 assert.ok(page.includes('/appearance-class-preview-v75.js?v=classes-4-approved-v75'));
 assert.ok(page.indexOf('/appearance-class-preview-v75.js')<page.indexOf('/appearance-editor.js'));
 assert.ok(mmo.includes('onRoleChange:value=>'));
 assert.ok(page.includes('sprites PNG atuais · V7.5'));
});

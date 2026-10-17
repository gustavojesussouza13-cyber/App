'use strict';
/* Safety gate: a Basilisco V4 PR cannot go live using only its JavaScript.
 * The 5 original PNG atlas assets must be checked in with their exact approved bytes.
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.join(__dirname,'../public/assets/creatures-v4');
const approved=Object.freeze({
 basilisco_v4_frente:['25cdd23f8d0e164671f09db69af07afdf64b5b0122504539a1a8ad2acde6e8a7',960],
 basilisco_v4_tras:['07295899fea0618fda4145f999cff32f46b4a8648d316574a9d1a706565e5cdd',960],
 basilisco_v4_esquerda:['9fe3ece3121b4e9c14384c906f03ac8195ffab7c2dcb62a499cc9ee4dfbf5475',960],
 basilisco_v4_direita:['e6fb7c6c8709f4e307ae53c6d4894c74b7e1582732f86f934704905a7e1c7a03',960],
 basilisco_v4_acido_fx:['b67f5e5b6b46786ea65d07b09724d672963b56763f5ea16d0fc704d3b2216714',640],
});
for(const [name,[digest,height]] of Object.entries(approved)){
 test('Basilisco V4 approved transparent atlas must exist: '+name+'.png',()=>{
  const file=path.join(ROOT,name+'.png');
  assert.ok(fs.existsSync(file),'Asset missing: '+name+'.png — STOP EXPERIMENTAL DEPLOY until the original PNG is uploaded.');
  const bytes=fs.readFileSync(file);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG signature');
  assert.equal(bytes.readUInt32BE(16),768,'atlas width');
  assert.equal(bytes.readUInt32BE(20),height,'atlas height');
  assert.equal(bytes.readUInt8(24),8,'8-bit original art');
  assert.equal(bytes.readUInt8(25),6,'RGBA transparency');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),digest,'must match the exact reviewed sprite art; never substitute placeholders');
 });
}

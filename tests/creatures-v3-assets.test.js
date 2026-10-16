'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const approved=Object.freeze({
 limo:'fe1cf22702a956f11701bf3c787488bae7362677af3492575ed5ca0ce6066675',
 lobo:'e2245b04292ffa26393385af6b60bd2f523aeaa7b5bf6920d3252be8d50f7091',
 aranha:'77eb109b847e94b2b76bc15b1535a86b356de315be9720509fc58479c2f23779',
 esqueleto:'336fa26b5303d55ddecbd0f523d598ccdc3427189dc0db27db56881cc044e49c',
 golem:'35c9c164a263bf6ffe5985172b6606cba12439677f5d7a20b01bc176751c07bb'
});
const assetRoot=path.join(__dirname,'..','public','assets','creatures-v3');
const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
for(const [type,expected] of Object.entries(approved)){
 test(`approved V3 atlas ${type} exists and is byte-exact PNG RGBA 768x960`,()=>{
  const pathname=path.join(assetRoot,`${type}_v3.png`);
  assert.ok(fs.existsSync(pathname),`Missing ${pathname}. Upload all 5 approved PNGs before merge/deploy.`);
  const bytes=fs.readFileSync(pathname);
  assert.ok(bytes.subarray(0,8).equals(pngSignature),`${type}: PNG header invalid`);
  assert.equal(bytes.readUInt32BE(16),768,`${type}: width must be 768`);
  assert.equal(bytes.readUInt32BE(20),960,`${type}: height must be 960`);
  assert.equal(bytes[24],8,`${type}: bit-depth must be 8`);
  assert.equal(bytes[25],6,`${type}: color type must be RGBA`);
  const actual=createHash('sha256').update(bytes).digest('hex');
  assert.equal(actual,expected,`${type}: PNG differs from approved V3 technical package`);
 });
}

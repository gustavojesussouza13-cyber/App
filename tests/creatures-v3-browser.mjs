'use strict';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const url=process.env.CREATURES_V3_QA_URL||'http://127.0.0.1:3107/laboratorio-criaturas-v3.html';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1320,height:920},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:40000});
 assert.equal(response?.status(),200,'laboratorio V3 deve ser servido pelo jogo');
 await page.waitForFunction(()=>document.querySelector('#status')?.dataset.ready==='true',null,{timeout:15000});
 const report=await page.evaluate(()=>{
  const qa=window.__CREATURES_V3_QA__,types=qa.names,states=['repouso','caminhada','preparacao','ataque','habilidade','dano','morte'];
  const samples={};
  for(const type of types){
   samples[type]={};
   for(const state of states){
    const r=qa.drawOnce(type,state,600);
    samples[type][state]={ok:r.ok,src:r.data,len:r.data.length,measure:r.measure};
   }
  }
  return {types,loaded:qa.engine.loadedTypes.slice(),samples};
 });
 assert.deepEqual(report.loaded.sort(),report.types.slice().sort(),'as cinco criaturas devem carregar da branch');
 for(const type of report.types){
  const poses=report.samples[type];
  for(const [state,pose] of Object.entries(poses)){
   assert.equal(pose.ok,true,type+'/'+state+' deve renderizar um sprite');
   assert.ok(pose.len>1000,type+'/'+state+' deve ter PNG não vazio');
   assert.ok(Number.isFinite(pose.measure.width)&&Number.isFinite(pose.measure.height));
  }
  assert.notEqual(poses.repouso.src,poses.ataque.src,type+' ataque deve diferir do repouso');
  assert.notEqual(poses.repouso.src,poses.morte.src,type+' morte deve diferir do repouso');
  assert.notEqual(poses.ataque.src,poses.dano.src,type+' dano deve diferir do ataque');
 }
 for(const state of ['caminhada','preparacao','ataque','habilidade','dano','morte']){
  await page.locator('[data-state="'+state+'"]').click();
  assert.equal(await page.locator('[data-state="'+state+'"]').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#status').innerText(),new RegExp(state));
 }
 await page.locator('#boss').click();
 assert.equal(await page.locator('#boss').getAttribute('aria-pressed'),'true');
 await page.locator('[data-state="ataque"]').click();
 await page.waitForTimeout(400);
 await page.screenshot({path:'/tmp/criaturas-v3-github-browser.png',fullPage:true});
 assert.deepEqual(errors,[],'sem exceções no navegador');
 console.log('CREATURES_V3_BROWSER_OK '+JSON.stringify({
  url,types:report.types,states:7,frames:120,assets:report.loaded.length,failures:errors.length
 }));
} finally{
 await browser.close();
}

'use strict';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base='http://127.0.0.1:3105';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const pageErrors=[];
 page.on('pageerror',error=>pageErrors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')pageErrors.push('console: '+message.text())});
 const response=await page.goto(base+'/cidade-demo.html',{waitUntil:'domcontentloaded'});
 assert.equal(response?.status(),200,'a página de demonstração precisa abrir');
 await page.locator('#openDemo').click();
 await page.waitForSelector('.guild3d-canvas',{timeout:35000});
 try{
  await page.waitForFunction(()=>document.querySelector('.guild3d-dialog[open] #guild3dFeedback')?.textContent?.includes('Cidade 3D pronta'),null,{timeout:18000});
 }catch(error){
  const snapshot=await page.evaluate(()=>({
   dialogs:[...document.querySelectorAll('dialog')].map(x=>({open:x.open,classes:x.className})),
   feedback:[...document.querySelectorAll('#guild3dFeedback, #cityFeedback')].map(x=>x.textContent),
   canvas:document.querySelector('.guild3d-canvas')?.outerHTML?.slice(0,250),
   text:document.body.innerText.slice(-650)
  }));
  console.error('GUILD_3D_DIAGNOSTIC',JSON.stringify({snapshot,pageErrors}));
  await page.screenshot({path:'/tmp/guild-3d-preview.png',fullPage:true}).catch(()=>{});
  throw error;
 }
 assert.equal(await page.locator('.guild3d-building').count(),5);
 const canvas=page.locator('.guild3d-canvas');
 const dims=await canvas.evaluate(c=>({width:c.width,height:c.height,webgl:!!(c.getContext('webgl2')||c.getContext('webgl'))}));
 assert.ok(dims.width>=600&&dims.height>=350,'renderizador 3D deve ocupar a janela da cidade');
 assert.equal(dims.webgl,true,'navegador deve oferecer WebGL real');
 const city=await page.evaluate(()=>({core:window.PeregrinosCityLayout.CORE,N:window.PeregrinosCityLayout.N,
  size:window.PeregrinosCityLayout.footprints.barracks,roads:window.PeregrinosCityLayout.canPlace([],'house',5,5)}));
 assert.equal(city.N,26);
 assert.equal(city.roads,true);
 assert.deepEqual(city.size,[4,3]);
 await page.locator('.guild3d-building').first().click();
 assert.equal(await page.locator('.guild3d-building').first().getAttribute('aria-pressed'),'true');
 await page.screenshot({path:'/tmp/guild-3d-preview.png',fullPage:true,animations:'disabled'});
 await page.locator('#guild3dClose').click();
 assert.equal(await page.locator('.guild3d-dialog').evaluate(d=>d.open),false,'fechamento limpa a cena');
 assert.deepEqual(pageErrors,[],'sem erros JS na cena 3D');
 console.log('BROWSER_3D_OK WebGL, cena visível, câmera, UI, terreno 26x26 e teardown.');
 await page.close();
}finally{await browser.close()}

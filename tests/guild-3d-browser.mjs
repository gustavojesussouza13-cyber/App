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
 assert.match(await page.locator('.guild3d-wallet').innerText(),/8.500 moedas/);
 // A demonstração responde como o servidor: coleta confirmada e erro confirmado aparecem no diário.
 await page.locator('#guild3dCollect').click();
 await page.waitForFunction(()=>document.querySelector('.guild3d-dialog[open] #guild3dFeedback')?.textContent?.includes('Produção fictícia coletada.'),null,{timeout:6000});
 assert.equal(await page.locator('#guild3dFeedback').getAttribute('data-status'),'success');
 await page.locator('#guild3dCollect').click();
 await page.waitForFunction(()=>document.querySelector('.guild3d-dialog[open] #guild3dFeedback')?.textContent?.includes('15 minutos'),null,{timeout:6000});
 assert.equal(await page.locator('#guild3dFeedback').getAttribute('data-status'),'error');
 // Clique real no WebGL: projeta a posição de um lote livre usando a mesma câmera pública inicial.
 const buildTarget=await page.evaluate(async()=>{
  const THREE=await import('/vendor/three.module.js');
  const c=document.querySelector('.guild3d-canvas'),r=c.getBoundingClientRect();
  const camera=new THREE.PerspectiveCamera(47,r.width/r.height,0.1,450);
  const distance=70,azimuth=.77,elevation=.92;
  camera.position.set(distance*Math.sin(elevation)*Math.sin(azimuth),
   distance*Math.cos(elevation),distance*Math.sin(elevation)*Math.cos(azimuth));
  camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const N=window.PeregrinosCityLayout.N,CELL=2.85,half=N*CELL/2;
  const x=8,y=12;
  const p=new THREE.Vector3((x+.5)*CELL-half,0,(y+.5)*CELL-half).project(camera);
  return {x:r.x+(p.x+1)*.5*r.width,y:r.y+(1-p.y)*.5*r.height,
   free:layout.canPlace(buildings,'house',x,y)};
 });
 assert.equal(buildTarget.free,true,'lote de teste deve estar livre');
 // Adia apenas o servidor simulado; a construção visual deve aparecer já no clique.
 await page.evaluate(()=>{window.__guildDemoReplyDelayMs=1600});
 await page.mouse.click(buildTarget.x,buildTarget.y);
 await page.waitForFunction(()=>document.querySelector('.guild3d-canvas')?.dataset.pendingBuilding==='house:8:12',null,{timeout:600});
 assert.equal(await page.locator('#guild3dFeedback').getAttribute('data-status'),'pending');
 assert.match(await page.locator('#guild3dFeedback').innerText(),/posicionado imediatamente/);
 await page.waitForFunction(()=>document.querySelector('.guild3d-dialog[open] #guild3dFeedback')?.textContent?.includes('Construção concluída!'),null,{timeout:6000});
 assert.equal(await page.locator('#guild3dFeedback').getAttribute('data-status'),'success');
 assert.match(await page.locator('.guild3d-wallet').innerText(),/8.380 moedas/,'saldo deve ser atualizado após construir');
 assert.equal(await canvas.getAttribute('data-pending-building'),null,'prévia vira construção definitiva após confirmar');
 // Uma negativa do servidor deve desfazer a prévia SEM descontar moedas.
 const projectPoint=async(x,y)=>page.evaluate(async({x,y})=>{
  const THREE=await import('/vendor/three.module.js');
  const c=document.querySelector('.guild3d-canvas'),r=c.getBoundingClientRect();
  const cam=new THREE.PerspectiveCamera(47,r.width/r.height,0.1,450);
  const distance=70,azimuth=.77,elevation=.92;
  cam.position.set(distance*Math.sin(elevation)*Math.sin(azimuth),
   distance*Math.cos(elevation),distance*Math.sin(elevation)*Math.cos(azimuth));
  cam.lookAt(0,0,0);cam.updateMatrixWorld();
  const CELL=2.85,half=window.PeregrinosCityLayout.N*CELL/2;
  const p=new THREE.Vector3((x+.5)*CELL-half,0,(y+.5)*CELL-half).project(cam);
  return {x:r.x+(p.x+1)*.5*r.width,y:r.y+(1-p.y)*.5*r.height};
 },{x,y});
 await page.evaluate(()=>{window.__guildDemoRejectNextBuild=true});
 const denied=await projectPoint(8,15);
 await page.mouse.click(denied.x,denied.y);
 await page.waitForFunction(()=>document.querySelector('.guild3d-canvas')?.dataset.pendingBuilding==='house:8:15',null,{timeout:600});
 await page.waitForFunction(()=>document.querySelector('#guild3dFeedback')?.textContent?.includes('recusou a construção'),null,{timeout:6000});
 assert.equal(await page.locator('#guild3dFeedback').getAttribute('data-status'),'error');
 assert.equal(await canvas.getAttribute('data-pending-building'),null,'edifício recusado deve desaparecer');
 assert.match(await page.locator('.guild3d-wallet').innerText(),/8.380 moedas/);
 // O botão não pode deixar uma casa fantasma quando não há WebSocket.
 await page.evaluate(()=>{window.__guildDemoOffline=true});
 const offline=await projectPoint(4,12);
 await page.mouse.click(offline.x,offline.y);
 await page.waitForFunction(()=>document.querySelector('#guild3dFeedback')?.textContent?.includes('Não há conexão'),null,{timeout:2000});
 assert.equal(await canvas.getAttribute('data-pending-building'),null,'prévia offline precisa ser removida imediatamente');
 await page.evaluate(()=>{window.__guildDemoOffline=false});

 await page.screenshot({path:'/tmp/guild-3d-preview.png',fullPage:true,animations:'disabled'});
 await page.locator('#guild3dClose').click();
 assert.equal(await page.locator('.guild3d-dialog').evaluate(d=>d.open),false,'fechamento limpa a cena');
 assert.deepEqual(pageErrors,[],'sem erros JS na cena 3D');
 console.log('BROWSER_3D_OK WebGL, cena visível, câmera, UI, terreno 26x26 e teardown.');
 await page.close();
}finally{await browser.close()}

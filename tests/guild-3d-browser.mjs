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
 await page.evaluate(()=>{
  window.__guildDemoReplyDelayMs=1600;
  window.__guildInstantEventLog=[];
  const canvas=document.querySelector('.guild3d-canvas');
  // Registrado depois da cena: o observador verifica o estado NO MESMO
  // evento pointerup, antes de timers e respostas de rede.
  canvas.addEventListener('pointerup',()=>{
   window.__guildInstantEventLog.push({
    pending:canvas.dataset.pendingBuilding||null,
    feedback:document.querySelector('#guild3dFeedback')?.textContent||''
   });
  });
 });
 await page.mouse.click(buildTarget.x,buildTarget.y);
 const instantFirst=await page.evaluate(()=>window.__guildInstantEventLog.at(-1));
 assert.equal(instantFirst?.pending,'house:8:12','edifício 3D aparece no próprio clique, antes da rede');
 assert.match(instantFirst?.feedback||'',/posicionado imediatamente/);
 // A mensagem pode já ter sido confirmada quando o Playwright volta a executar.
 // A confirmação ainda será analisada após a latência simulada.
 await page.waitForFunction(()=>document.querySelector('.guild3d-dialog[open] #guild3dFeedback')?.textContent?.includes('Construção concluída'),null,{timeout:6000});
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
 assert.equal(await page.evaluate(()=>layout.canPlace(buildings,'house',8,15)),true,'lote de recusa simulada precisa estar vazio');
 await page.mouse.move(denied.x,denied.y);
 const projectedCell=await page.locator('#guild3dCoords').innerText();
 console.log('GUILD_TEST_DENIED_TARGET',JSON.stringify({denied,projectedCell}));
 await page.mouse.click(denied.x,denied.y);
 const instantDenied=await page.evaluate(()=>window.__guildInstantEventLog.at(-1));
 assert.equal(instantDenied?.pending,'house:8:15','recusa também deve mostrar edifício no próprio evento antes de desfazer');
 // A prévia pode já ter sumido quando o Chromium concluir o click com WebGL
 // sob carga; a primeira construção comprova o aparecimento imediato.
 // Aqui validamos a recusa definitiva sem depender de um estado transitório.
 await page.waitForFunction(()=>document.querySelector('#guild3dFeedback')?.textContent?.includes('recusou a construção'),null,{timeout:6000});
 assert.equal(await page.locator('#guild3dFeedback').getAttribute('data-status'),'error');
 assert.equal(await canvas.getAttribute('data-pending-building'),null,'edifício recusado deve desaparecer');
 assert.match(await page.locator('.guild3d-wallet').innerText(),/8.380 moedas/);
 // O botão não pode deixar uma casa fantasma quando não há WebSocket.
 await page.evaluate(()=>{window.__guildDemoOffline=true});
 const offline=await projectPoint(4,12);
 await page.mouse.click(offline.x,offline.y);
 const instantOffline=await page.evaluate(()=>window.__guildInstantEventLog.at(-1));
 assert.equal(instantOffline?.pending,null,'sem conexão, a prévia é revertida dentro do mesmo clique');
 await page.waitForFunction(()=>document.querySelector('#guild3dFeedback')?.textContent?.includes('Não há conexão'),null,{timeout:2000});
 assert.equal(await canvas.getAttribute('data-pending-building'),null,'prévia offline precisa ser removida imediatamente');
 await page.evaluate(()=>{window.__guildDemoOffline=false});

 // Reproduz o bug reportado: a construção FOI processada, mas nem o ACK
 // nem o estado chegaram ao cliente na primeira tentativa.
 const countBefore=await page.evaluate(()=>buildings.length);
 await page.evaluate(()=>{
  window.__guildDemoReplyDelayMs=0;
  window.__guildDemoDropNextResponse=true;
 });
 const missingAck=await projectPoint(4,12);
 await page.mouse.click(missingAck.x,missingAck.y);
 const lostInstant=await page.evaluate(()=>window.__guildInstantEventLog.at(-1));
 assert.equal(lostInstant?.pending,'house:4:12','a construção aparece no mesmo evento mesmo quando o primeiro ACK se perde');
 await page.waitForFunction(()=>document.querySelector('#guild3dFeedback')?.textContent?.includes('Construção concluída'),null,{timeout:15000});
 assert.equal(await page.locator('#guild3dFeedback').getAttribute('data-status'),'success');
 assert.equal(await page.evaluate(()=>buildings.length),countBefore+1,'retry não cria prédio duplicado');
 assert.equal(await page.evaluate(()=>buildings.filter(b=>b.type==='house'&&b.x===4&&b.y===12).length),1);
 const lostDiagnostic=await page.evaluate(()=>({
  localCoins,displayedWallet:document.querySelector('.guild3d-wallet')?.textContent,
  feedback:document.querySelector('.guild3d-dialog[open] #guild3dFeedback')?.textContent,
  status:document.querySelector('.guild3d-dialog[open] #guild3dFeedback')?.dataset.status,
  pendingBuilding:document.querySelector('.guild3d-canvas')?.dataset.pendingBuilding,
  receipts:successfulRequests.size
 }));
 console.log('GUILD_LOST_ACK_DIAGNOSTIC',JSON.stringify({...lostDiagnostic,pageErrors}));
 await page.waitForFunction(()=>document.querySelector('.guild3d-wallet')?.textContent?.includes('8.260 moedas'),null,{timeout:6000});
 assert.match(await page.locator('.guild3d-wallet').innerText(),/8.260 moedas/,'retry não pode cobrar novamente');
 assert.equal(await canvas.getAttribute('data-pending-building'),null,'prédio sincronizado deixa de ser provisório');
 assert.doesNotMatch(await page.locator('#guild3dFeedback').innerText(),/prévia foi retirada|não confirmou/i);


 // Construção simultânea: dois cliques antes de qualquer confirmação não
 // podem bloquear a interface nem sobrepor lotes ou reservar moedas duas vezes.
 await page.evaluate(()=>{window.__guildDemoReplyDelayMs=4500});
 const multiA=await projectPoint(6,14),multiB=await projectPoint(8,15);
 assert.equal(await page.evaluate(()=>layout.canPlace(buildings,'house',6,14)),true);
 assert.equal(await page.evaluate(()=>layout.canPlace(buildings,'house',8,15)),true);
 await page.mouse.click(multiA.x,multiA.y);
 const firstSameFrame=await page.evaluate(()=>window.__guildInstantEventLog.at(-1));
 assert.equal(firstSameFrame.pending,'house:6:14');
 await page.mouse.click(multiB.x,multiB.y);
 const secondSameFrame=await page.evaluate(()=>window.__guildInstantEventLog.at(-1));
 assert.equal(secondSameFrame.pending,'house:8:15');
 assert.equal(await canvas.getAttribute('data-pending-count'),'2','duas construções ficam visíveis simultaneamente sem espera');
 assert.match(await page.locator('.guild3d-wallet').innerText(),/8.020 moedas/,'ambas as construções reservam seus custos locais');
 assert.doesNotMatch(await page.locator('#guild3dFeedback').innerText(),/aguarde|sincronizando|anterior/i,'diário não bloqueia construções sucessivas');
 // Dois cliques no mesmo lote não podem criar edifícios sobrepostos.
 await page.mouse.click(multiB.x,multiB.y);
 assert.equal(await canvas.getAttribute('data-pending-count'),'2','não criar terceiro prédio no terreno já reservado');
 await page.waitForFunction(()=>document.querySelector('.guild3d-canvas')?.dataset.pendingCount==='0',null,{timeout:14000});
 assert.equal(await page.evaluate(()=>buildings.filter(b=>b.type==='house'&&
  ((b.x===6&&b.y===14)||(b.x===8&&b.y===15))).length),2);
 assert.match(await page.locator('.guild3d-wallet').innerText(),/8.020 moedas/,'servidor confirma apenas dois débitos');
 assert.doesNotMatch(await page.locator('#guild3dFeedback').innerText(),/aguarde a sincronização|sincronizando o salvamento/i);

 await page.screenshot({path:'/tmp/guild-3d-preview.png',fullPage:true,animations:'disabled'});
 await page.locator('#guild3dClose').click();
 assert.equal(await page.locator('.guild3d-dialog').evaluate(d=>d.open),false,'fechamento limpa a cena');
 assert.deepEqual(pageErrors,[],'sem erros JS na cena 3D');
 console.log('BROWSER_3D_OK WebGL, cena visível, câmera, UI, terreno 26x26 e teardown.');
 await page.close();
}finally{await browser.close()}

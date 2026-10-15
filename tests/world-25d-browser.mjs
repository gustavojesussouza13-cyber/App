'use strict';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const url=process.env.WORLD25D_URL||'https://os-peregrinos-mundo-25d-preview.onrender.com/visual-25d.html';
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'
]});
try{
 const page=await browser.newPage({viewport:{width:1365,height:900},deviceScaleFactor:1});
 const pageErrors=[];
 page.on('pageerror',error=>pageErrors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')pageErrors.push(message.text())});
 const result=await page.goto(url,{waitUntil:'domcontentloaded',timeout:40000});
 assert.equal(result?.status(),200,'prévia precisa ser publicada e acessível');
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('WebGL 2.5D pronto'),null,{timeout:30000});
 const layer=page.locator('#world25dBackdrop');
 await layer.waitFor({timeout:20000});
 assert.ok((await layer.evaluate(c=>c.width))>100,'Canvas 3D deve ter resolução real');
 assert.equal(await page.locator('#role').inputValue(),'peregrino');
 await page.locator('#role').selectOption('curandeiro');
 assert.match(await page.locator('#heroName').innerText(),/Curandeiro/);
 await page.locator('#biome').selectOption('floresta');
 await page.locator('#night').click();
 assert.match(await page.locator('#night').innerText(),/Amanhecer/);
 await page.locator('#classic').click();
 assert.equal(await layer.evaluate(c=>c.style.display),'none','2D deve ocultar o WebGL');
 await page.locator('#classic').click();
 assert.equal(await layer.evaluate(c=>c.style.display),'block','WebGL deve ser reativável');
 await page.waitForTimeout(500);
 assert.deepEqual(pageErrors,[],'não pode haver erros JavaScript durante o teste');
 await page.screenshot({path:'/tmp/os-peregrinos-25d-browser.png',fullPage:true});
 console.log('WORLD_25D_BROWSER_OK',JSON.stringify({url,classes:4,biomes:6,canvas:'webgl'}));
}finally{await browser.close()}

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
 const checkAlignment=async()=>{
  const bounds=await page.evaluate(()=>{
   const source=document.querySelector('#game').getBoundingClientRect();
   const backdrop=document.querySelector('#world25dBackdrop').getBoundingClientRect();
   return {dx:Math.abs(source.x-backdrop.x),dy:Math.abs(source.y-backdrop.y),
    dw:Math.abs(source.width-backdrop.width),dh:Math.abs(source.height-backdrop.height)};
  });
  assert.ok(Object.values(bounds).every(n=>n<=1.5),'WebGL deve acompanhar exatamente o Canvas 2D: '+JSON.stringify(bounds));
 };
 await checkAlignment();
 await page.setViewportSize({width:780,height:900});
 await page.waitForTimeout(250);
 await checkAlignment();
 await page.setViewportSize({width:1365,height:900});
 await page.waitForTimeout(250);
 await checkAlignment();
 assert.deepEqual(pageErrors,[],'não pode haver erros JavaScript durante o teste');
 await page.waitForFunction(()=>Boolean(window.OsPeregrinosAurora25D?.VERSION),null,{timeout:5000});
 const version=await page.evaluate(()=>window.OsPeregrinosAurora25D.VERSION);
 assert.match(version,/peregrino-aurora-25d/);
 await page.screenshot({path:'/tmp/os-peregrinos-25d-browser.png',fullPage:true});
 const atlasUrl=url.replace('visual-25d.html','peregrino-atlas25d.html');
 const atlasResponse=await page.goto(atlasUrl,{waitUntil:'domcontentloaded'});
 assert.equal(atlasResponse?.status(),200,'o ateliê precisa ser servido no Render');
 await page.waitForFunction(()=>document.querySelector('#label')?.textContent?.includes('PEREGRINO'),null,{timeout:7000});
 const atlas=await page.evaluate(()=>{
  const c=document.querySelector('#atlas'),g=c.getContext('2d'),bytes=g.getImageData(0,0,c.width,c.height).data;
  let visible=0;
  for(let i=3;i<bytes.length;i+=4)if(bytes[i]>0)visible++;
  return {w:c.width,h:c.height,visible};
 });
 assert.deepEqual([atlas.w,atlas.h],[384,320]);
 assert.ok(atlas.visible>18000,'folha de 24 quadros deve conter pixels visíveis');
 await page.screenshot({path:'/tmp/os-peregrinos-peregrino-atlas.png',fullPage:true});

 console.log('WORLD_25D_BROWSER_OK',JSON.stringify({url,classes:4,biomes:6,canvas:'webgl'}));
}finally{await browser.close()}

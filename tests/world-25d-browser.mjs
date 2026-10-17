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
 await page.waitForFunction(()=>/WebGL.*(pronto|carregados)/.test(document.querySelector('#status')?.textContent||''),null,{timeout:30000});
 const layer=page.locator('#world25dBackdrop');
 await layer.waitFor({timeout:20000});
 assert.ok((await layer.evaluate(c=>c.width))>100,'Canvas 3D deve ter resolução real');
 // Verify the *real* Sentinela V4 PNG is visible beside the Peregrino on the same
 // 2.5D backdrop, not merely present in the GitHub repository.
 await page.waitForFunction(()=>document.querySelector('#sentinelStatus')?.textContent?.includes('✓ Atlas real carregado'),null,{timeout:15000});
 assert.equal(await page.locator('#sentinelAction').inputValue(),'idle');
 await page.locator('#sentinelAction').selectOption('attack');
 await page.locator('#sentinelDirection').selectOption('3');
 await page.locator('#sentinelBoss').check();
 await page.waitForTimeout(300);
 assert.match(await page.locator('#sentinelStatus').innerText(),/Atlas real carregado/);
 await page.screenshot({path:'/tmp/os-peregrinos-sentinela-v4-25d.png',fullPage:true});
 await page.locator('#sentinelBoss').uncheck();
 await page.locator('#sentinelAction').selectOption('idle');
 await page.locator('#sentinelDirection').selectOption('1');
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
 await page.waitForFunction(()=>Boolean(window.OsPeregrinosHeroesAurora25D?.VERSION),null,{timeout:6000});
 const heroes=await page.evaluate(()=>{
  const api=window.OsPeregrinosHeroesAurora25D;
  return api.ROLES.map(role=>{
   const canvases=[0,1,2,3].map(dir=>api.prepare(role,dir,'walk',0));
   const pixelCounts=canvases.map(canvas=>{
    if(!canvas)return 0;
    const rgba=canvas.getContext('2d').getImageData(0,0,64,80).data;
    let nonzero=0;for(let p=3;p<rgba.length;p+=4)if(rgba[p]>0)nonzero++;
    return nonzero;
   });
   return {role,pixelCounts,unique: new Set(canvases.map(c=>c?.toDataURL('image/png'))).size};
  });
 });
 assert.deepEqual(heroes.map(h=>h.role),['peregrino','guardiao','arqueiro','curandeiro']);
 assert.ok(heroes.every(h=>h.pixelCounts.every(c=>c>300)),'cada classe/direção precisa ser desenhada pixel a pixel');
 assert.ok(heroes.every(h=>h.unique>=2),'cada classe deve oferecer direções visualmente distintas');
 for(const role of ['guardiao','arqueiro','peregrino','curandeiro']){
  await page.locator('#role').selectOption(role);
  assert.match(await page.locator('#heroName').innerText(),new RegExp(role==='guardiao'?'Guardião':role==='arqueiro'?'Arqueiro':role==='curandeiro'?'Curandeiro':'Peregrino'));
 }
 await page.waitForFunction(()=>['guardiao','arqueiro','curandeiro'].every(role=>
   window.OsPeregrinosApprovedClasses25D?.isReady(role)),null,{timeout:12000});
 const approved=await page.evaluate(()=>{
  const api=window.OsPeregrinosApprovedClasses25D;
  return api.ROLES.map(role=>{
   const c=document.createElement('canvas');c.width=160;c.height=170;
   const ctx=c.getContext('2d');
   function getFrame(dir,action,now){
    ctx.clearRect(0,0,c.width,c.height);
    const drawn=api.draw(ctx,{role,x:80,y:162,dir,action,now,scale:1.45,glow:false});
    const bytes=ctx.getImageData(0,0,c.width,c.height).data;
    let opaque=0;for(let k=3;k<bytes.length;k+=4)if(bytes[k]>100)opaque++;
    return {drawn,opaque,data:c.toDataURL('image/png')};
   }
   const front=getFrame(2,'idle',0),back=getFrame(0,'idle',0);
   const right=getFrame(1,'idle',0),left=getFrame(3,'idle',0);
   const walk=getFrame(2,'walk',200);
   return {role,front:front.opaque,back:back.opaque,right:right.opaque,
    left:left.opaque,walk:walk.opaque,directions: new Set([front.data,back.data,right.data,left.data]).size,
    walkChanged:front.data!==walk.data,drawn:front.drawn&&back.drawn&&right.drawn&&left.drawn&&walk.drawn,
    attackFallback:api.draw(ctx,{role,x:80,y:160,action:'attack'}),source:api.source(role)};
  });
 });
 assert.deepEqual(approved.map(x=>x.role),['guardiao','arqueiro','curandeiro']);
 assert.ok(approved.every(x=>x.drawn),'os três PNGs devem renderizar no navegador');
 assert.ok(approved.every(x=>Math.min(x.front,x.back,x.right,x.left,x.walk)>350),
  'cada direção deve conter pixels opacos do desenho');
 assert.ok(approved.every(x=>x.directions===4),'todas as direções devem ser distintas após espelhar oeste');
 assert.ok(approved.every(x=>x.walkChanged),'cada classe deve ter um quadro de caminhada diferente');
 assert.ok(approved.every(x=>x.attackFallback===false),'ataques usam os sprites originais como fallback');
 assert.ok(approved.every(x=>x.source.includes('.png')),'origem deve apontar ao PNG aprovado do jogo');
 await page.locator('#role').selectOption('guardiao');
 await page.waitForTimeout(180);
 await page.screenshot({path:'/tmp/os-peregrinos-classes-aprovadas-25d.png',fullPage:true});
 await page.locator('#role').selectOption('peregrino');
 const approvedUrl=url.replace('visual-25d.html','classes-aprovadas-25d.html');
 const classPage=await browser.newPage({viewport:{width:1340,height:920}});
 const classResp=await classPage.goto(approvedUrl,{waitUntil:'domcontentloaded'});
 assert.equal(classResp?.status(),200,'galeria das três classes deve existir no Render');
 await classPage.waitForFunction(()=>[...document.querySelectorAll('.card .status')].every(el=>el.textContent.includes('PNG real carregado')),null,{timeout:14000});
 assert.equal(await classPage.locator('.card').count(),3);
 await classPage.locator('[data-role="guardiao"] select').selectOption('3');
 await classPage.locator('[data-role="arqueiro"] select').selectOption('1');
 await classPage.locator('[data-role="curandeiro"] select').selectOption('0');
 await classPage.screenshot({path:'/tmp/os-peregrinos-classes-aprovadas-25d.png',fullPage:true});
 await classPage.close();
 await page.waitForFunction(()=>window.OsPeregrinosRunway25D?.isReady(),null,{timeout:12000});
 const genuine=await page.evaluate(()=>{
  const api=window.OsPeregrinosRunway25D;
  const canvas=document.createElement('canvas');canvas.width=192;canvas.height=192;
  const c=canvas.getContext('2d');
  const directions=[0,1,2,3].map(dir=>api.frameRect(dir,0));
  const drawn=api.draw(c,{x:96,y:186,dir:2,action:'walk',frame:2,scale:1});
  const data=c.getImageData(0,0,192,192).data;
  let visible=0;for(let i=3;i<data.length;i+=4)if(data[i]>128)visible++;
  return {version:api.VERSION,directions,drawn,visible,skipCombat:api.draw(c,{x:90,y:190,action:'attack'}),
   source:api.SOURCE};
 });
 assert.match(genuine.version,/runway-original-peregrino/);
 assert.equal(genuine.drawn,true,'sprite original Runway precisa renderizar');
 assert.ok(genuine.visible>400,'quadros reais precisam ter área visível');
 assert.equal(genuine.skipCombat,false,'ataques usam as animações anteriores');
 assert.deepEqual(genuine.directions.map(d=>d.sy),[160,320,0,480],'ordem das quatro direções');
 assert.match(genuine.source,/peregrino-runway-walk\.png/);
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

 const runwayPreview=url.replace('visual-25d.html','peregrino-runway-preview.html');
 const runwayResult=await page.goto(runwayPreview,{waitUntil:'domcontentloaded'});
 assert.equal(runwayResult?.status(),200,'ateliê dos sprites reais deve ser público na prévia');
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('16 quadros carregados'),null,{timeout:12000});
 const frameAtlas=await page.locator('#atlas').evaluate(img=>({w:img.naturalWidth,h:img.naturalHeight}));
 assert.deepEqual(frameAtlas,{w:512,h:640});
 await page.screenshot({path:'/tmp/peregrino-runway-16-quadros-reais.png',fullPage:true});

 // Basilisco V4: validation in the same 2.5D scene as the Peregrino and Sentinel.
 const basiliskScene=await page.goto(url,{waitUntil:'domcontentloaded',timeout:40000});
 assert.equal(basiliskScene?.status(),200);
 await page.waitForFunction(()=>document.querySelector('#basiliskStatus')?.textContent?.includes('Ácido pronto'),null,{timeout:17000});
 assert.equal(await page.locator('#basiliskAction').inputValue(),'idle');
 assert.equal(await page.locator('#basiliskDirection').inputValue(),'1');
 const fourDirections=await page.evaluate(async()=>{
  const api=window.OsPeregrinosBasiliskV4;
  if(!api||api.ASSETS.length!==4||api.FRAME.width!==192||api.FRAME.height!==160)throw Error('Basilisco API absent or wrong frame size');
  const count=[],distinct=[],hurt=[];
  for(let d=0;d<4;d++){
   const img=new Image();img.src=api.ASSETS[d];await img.decode();
   if(img.naturalWidth!==768||img.naturalHeight!==960)throw Error('Invalid actual sprite image: '+d);
   const cvs=document.createElement('canvas');cvs.width=192;cvs.height=160;
   const c=cvs.getContext('2d',{willReadFrequently:true});
   const hashes=[];
   for(let col=0;col<4;col++){
    c.clearRect(0,0,192,160);c.drawImage(img,col*192,160,192,160,0,0,192,160);
    hashes.push(cvs.toDataURL('image/png'));
   }
   distinct.push(new Set(hashes).size);
   const alpha=c.getImageData(0,0,192,160).data;let pixels=0;for(let k=3;k<alpha.length;k+=4)if(alpha[k]>0)pixels++;
   count.push(pixels);
   c.clearRect(0,0,192,160);c.drawImage(img,0,4*160,192,160,0,0,192,160);
   const damage=cvs.toDataURL('image/png');
   c.clearRect(0,0,192,160);c.drawImage(img,0,0,192,160,0,0,192,160);
   hurt.push(damage!==cvs.toDataURL('image/png'));
  }
  const fx=new Image();fx.src=api.FXSHEET;await fx.decode();
  const fxPixels=(()=>{const c=document.createElement('canvas');c.width=192;c.height=160;const g=c.getContext('2d');
    g.drawImage(fx,0,0,192,160,0,0,192,160);const data=g.getImageData(0,0,192,160).data;
    let count=0;for(let i=3;i<data.length;i+=4)if(data[i]>16)count++;return count;})();
  return {count,distinct,hurt,fxWidth:fx.naturalWidth,fxHeight:fx.naturalHeight,fxPixels};
 });
 assert.deepEqual(fourDirections.distinct,[4,4,4,4],'walk must contain 4 visually distinct footsteps in each direction');
 assert.ok(fourDirections.count.every(p=>p>2000),'each walk direction has real visible pixels');
 assert.ok(fourDirections.hurt.every(Boolean),'hurt must visibly differ from idle in every direction');
 assert.deepEqual([fourDirections.fxWidth,fourDirections.fxHeight],[768,640]);
 assert.ok(fourDirections.fxPixels>150,'acid sprite must not be blank');
 for(let dir=0;dir<4;dir++){
  await page.locator('#basiliskDirection').selectOption(String(dir));
  assert.match(await page.locator('#basiliskStatus').innerText(),/Quatro direções reais carregadas/);
 }
 await page.locator('#basiliskDirection').selectOption('1');
 await page.locator('#basiliskAction').selectOption('walk');
 await page.waitForTimeout(260);
 await page.screenshot({path:'/tmp/os-peregrinos-basilisco-v4-caminhada-25d.png',fullPage:true});
 await page.locator('#basiliskAction').selectOption('hurt');
 await page.waitForTimeout(140);
 await page.screenshot({path:'/tmp/os-peregrinos-basilisco-v4-dano-25d.png',fullPage:true});
 await page.locator('#basiliskAction').selectOption('attack');
 await page.waitForTimeout(280);
 await page.screenshot({path:'/tmp/os-peregrinos-basilisco-v4-acido-25d.png',fullPage:true});
 await page.locator('#basiliskBoss').check();
 await page.locator('#basiliskDirection').selectOption('3');
 await page.waitForTimeout(220);
 await page.screenshot({path:'/tmp/os-peregrinos-basilisco-v4-chefe-25d.png',fullPage:true});
 await page.locator('#basiliskAction').selectOption('idle');
 await page.locator('#basiliskBoss').uncheck();
 assert.ok(!pageErrors.some(x=>/basilis|sentinel|ReferenceError/i.test(x)),'Basilisco V4 JS errors: '+JSON.stringify(pageErrors));
 console.log('BASILISCO_V4_25D_OK',JSON.stringify(fourDirections));

 // Exclusive V4 angel must render in this same real 2.5D scene, independent of ghosts.
 const angelResponse=await page.goto(url,{waitUntil:'domcontentloaded',timeout:40000});
 assert.equal(angelResponse?.status(),200);
 await page.waitForFunction(()=>document.querySelector('#angelStatus')?.textContent?.includes('magia pronta'),null,{timeout:18000});
 const angelCheck=await page.evaluate(async()=>{
  const api=window.OsPeregrinosFallenAngelV4;
  if(!api||api.FRAME.width!==192||api.FRAME.height!==160)throw Error('Anjo Caído 192x160 renderer missing');
  const walkDistinct=[],hurtDiff=[],occupancy=[],directions=[];
  for(let d=0;d<4;d++){
   const img=new Image();img.src=api.ASSETS[d];await img.decode();
   if(img.naturalWidth!==768||img.naturalHeight!==960)throw Error('Anjo Caído atlas dimensions invalid '+d);
   const cv=document.createElement('canvas');cv.width=192;cv.height=160;
   const g=cv.getContext('2d',{willReadFrequently:true}),walk=[];
   for(let i=0;i<4;i++){g.clearRect(0,0,192,160);g.drawImage(img,i*192,160,192,160,0,0,192,160);walk.push(cv.toDataURL('image/png'));}
   walkDistinct.push(new Set(walk).size);
   let alpha=g.getImageData(0,0,192,160).data,solid=0;
   for(let i=3;i<alpha.length;i+=4)if(alpha[i]>32)solid++;
   occupancy.push(solid);
   g.clearRect(0,0,192,160);g.drawImage(img,0,4*160,192,160,0,0,192,160);
   const hurt=g.getImageData(0,0,192,160).data;
   g.clearRect(0,0,192,160);g.drawImage(img,0,0,192,160,0,0,192,160);
   const idle=g.getImageData(0,0,192,160).data;
   let changed=0;for(let i=0;i<hurt.length;i+=4)if(hurt[i]!==idle[i]||hurt[i+1]!==idle[i+1]||hurt[i+2]!==idle[i+2]||hurt[i+3]!==idle[i+3])changed++;
   hurtDiff.push(changed);
   directions.push(img.src);
  }
  const spell=new Image();spell.src=api.FXSHEET;await spell.decode();
  const cvs=document.createElement('canvas');cvs.width=192;cvs.height=160;
  const ctx=cvs.getContext('2d',{willReadFrequently:true});
  const fxPixels=[];
  for(let d=0;d<4;d++){ctx.clearRect(0,0,192,160);ctx.drawImage(spell,0,d*160,192,160,0,0,192,160);
   const pixels=ctx.getImageData(0,0,192,160).data;let count=0;
   for(let i=3;i<pixels.length;i+=4)if(pixels[i]>16)count++;
   fxPixels.push(count);
  }
  return {walkDistinct,hurtDiff,occupancy,fxPixels,fxWidth:spell.naturalWidth,fxHeight:spell.naturalHeight};
 });
 assert.deepEqual(angelCheck.walkDistinct,[4,4,4,4],'angel walking must change feet/wings in all four directions');
 assert.ok(angelCheck.hurtDiff.every(x=>x>250),'angel hurt frame must be visibly different from idle');
 assert.ok(angelCheck.occupancy.every(x=>x>2800),'angel directions must retain large visible sprites');
 assert.ok(angelCheck.fxPixels.every(x=>x>50),'every magic direction must contain pixels');
 assert.deepEqual([angelCheck.fxWidth,angelCheck.fxHeight],[768,640]);
 for(let direction=0;direction<4;direction++){
  await page.locator('#angelDirection').selectOption(String(direction));
  assert.match(await page.locator('#angelStatus').innerText(),/Quatro direções reais/);
 }
 await page.locator('#angelDirection').selectOption('1');
 await page.locator('#angelAction').selectOption('walk');
 await page.waitForTimeout(290);
 await page.screenshot({path:'/tmp/os-peregrinos-anjo-caido-v4-caminhada-25d.png',fullPage:true});
 await page.locator('#angelAction').selectOption('attack');
 await page.waitForTimeout(280);
 await page.screenshot({path:'/tmp/os-peregrinos-anjo-caido-v4-magia-25d.png',fullPage:true});
 await page.locator('#angelAction').selectOption('hurt');
 await page.waitForTimeout(140);
 await page.screenshot({path:'/tmp/os-peregrinos-anjo-caido-v4-dano-25d.png',fullPage:true});
 await page.locator('#angelAction').selectOption('death');
 await page.waitForTimeout(600);
 await page.screenshot({path:'/tmp/os-peregrinos-anjo-caido-v4-morte-25d.png',fullPage:true});
 assert.ok(!pageErrors.some(e=>/angel|anjo-caido|ReferenceError/i.test(e)),'No JS errors from the new creature');
 console.log('ANJO_CAIDO_V4_25D_OK',JSON.stringify(angelCheck));
 console.log('WORLD_25D_BROWSER_OK',JSON.stringify({url,classes:4,biomes:6,canvas:'webgl'}));
}finally{await browser.close()}

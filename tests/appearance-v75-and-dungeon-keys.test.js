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
test('V7.6 customization loads four approved class image sources, without the obsolete hero preview',()=>{
 const src=read('appearance-class-preview-v75.js'),editor=read('appearance-editor.js'),page=read('mundo.html'),mmo=read('mmo.js');
 for(const k of ['peregrino','guardiao','arqueiro','curandeiro']){
  assert.ok(src.includes(k));
  assert.ok(src.includes(k==='peregrino'?'peregrino-runway-walk.png':k+'-sprites-3x2-64x80.png'));
 }
 assert.ok(editor.includes("title.textContent='PERSONALIZAÇÃO DA CLASSE V8.7'"));
 assert.ok(editor.includes('preview.draw(ctx,{role:kind'));
 assert.ok(!editor.includes("previewStudio?.obtain('hero'"));
 assert.ok(page.includes('/appearance-class-preview-v75.js?v=classes-4-passada-v78'));
 assert.ok(page.indexOf('/appearance-class-preview-v75.js')<page.indexOf('/appearance-editor.js'));
 assert.ok(mmo.includes('onRoleChange:value=>'));
 assert.ok(page.includes('cabelo · olhos · pele · cores · V7.6'));
});

test('real current source PNGs for four classes have approved dimensions',()=>{
 const specs=[['assets/peregrino/peregrino-runway-walk.png',512,640],
  ['assets/approved-classes/guardiao-sprites-3x2-64x80.png',192,160],
  ['assets/approved-classes/arqueiro-sprites-3x2-64x80.png',192,160],
  ['assets/approved-classes/curandeiro-sprites-3x2-64x80.png',192,160]];
 for(const [file,w,h]of specs){
  const png=fs.readFileSync(path.join(pub,file));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16),w,file);
  assert.equal(png.readUInt32BE(20),h,file);
 }
 assert.ok(read('laboratorio-classes-v75.html').includes('appearance-class-preview-v75.js'));
});

test('V7.6 applies all seven editable settings into the real approved-sprite rendering path',()=>{
 const artist=require('../public/appearance-sprite-v76.js'),art=require('../public/appearance16.js');
 assert.equal(artist.needsCustomization(art.DEFAULT),false);
 const alternatives={
  skin:'profundo',hairStyle:'longo',hairColor:'azul',eyes:'verde',
  outfit:'vinho',cape:'marinho',accessory:'tiara'
 };
 const source={width:128,height:160,data:new Uint8ClampedArray(128*160*4)};
 for(let y=0;y<160;y++)for(let x=0;x<128;x++){
  const i=(y*128+x)*4;
  source.data.set(y<75?[188,127,78,255]:[40,110,190,255],i);
 }
 function mockCanvas(){
  const data=new Uint8ClampedArray(source.data);
  const strokes=[];
  const ctx={
   fillStyle:'#000000',
   imageSmoothingEnabled:true,
   drawImage(){},
   getImageData(){return {data:new Uint8ClampedArray(data),width:128,height:160};},
   putImageData(image){data.set(image.data);},
   fillRect(x,y,w,h){strokes.push([this.fillStyle,x,y,w,h]);},
  };
  return {canvas:{getContext:()=>ctx},ctx,data,strokes};
 }
 for(const [key,value] of Object.entries(alternatives)){
  const a={...art.DEFAULT,[key]:value};
  assert.equal(artist.needsCustomization(a),true,key+' recognized');
  let changed=false;
  for(const role of ['peregrino','guardiao','arqueiro','curandeiro']){
   const scene=mockCanvas();
   const img=scene.ctx.getImageData();
   artist.applyColors(img,a,role,2);
   artist.details(scene.ctx,a,role,2);
   if(img.data.some((v,i)=>v!==source.data[i])||scene.strokes.length>0)changed=true;
  }
  assert.ok(changed,key+' affects actual sprite pixels');
 }
 const missing=mockCanvas();
 assert.equal(artist.drawWorld(missing.ctx,{role:'peregrino',appearance:art.DEFAULT,x:80,y:100}),false,
  'standard sprites keep their existing renderer');
 const renderer=read('appearance-class-preview-v75.js'),world=read('art16.js'),page=read('mundo.html');
 assert.ok(renderer.includes('appearance,scale:1,preview:true'));
 assert.ok(world.includes('OsPeregrinosAppearanceSpriteV76?.drawWorld(g'));
 assert.ok(page.indexOf('/appearance-sprite-v76.js')<page.indexOf('/appearance-editor.js'));
 assert.ok(!renderer.includes('scale:.92,appearance:null'));
 assert.ok(!read('appearance-editor.js').includes('ainda não estão pintadas neste PNG'));
 assert.ok(read('laboratorio-classes-v75.html').includes('appearance:changed'));
});

test('V7.7 keeps four distinct authored Peregrino walk frames in front, profile and rear directions',()=>{
 const walk=require('../public/appearance-sprite-v76.js');
 const runway=require('../public/peregrino-runway25d.js');
 assert.deepEqual([0,1,2,3,4,5,6,7].map(i=>walk.walkFrame('peregrino','walk',i)),[0,1,2,3,4,5,6,7]);
 assert.deepEqual([0,1,2,3].map(i=>walk.walkFrame('arqueiro','walk',i)),[0,1,1,0]);
 for(const direction of [0,1,2,3]){
  const rects=[0,1,2,3].map(i=>runway.frameRect(direction,i));
  assert.deepEqual(rects.map(x=>x.sx),[0,128,256,384],'all four 128px columns');
  assert.ok(rects.every(x=>x.sy==={0:160,1:320,2:0,3:320}[direction]));
  assert.ok(rects.every(x=>x.sw===128&&x.sh===160),'source pixels never resampled for frame selection');
 }
 const samples=[],orig=global.OsPeregrinosRunway25D;
 global.OsPeregrinosRunway25D={draw(ctx,p){samples.push(p);return true}};
 const context={imageSmoothingEnabled:false,drawImage(){}};
 const documentRef={createElement:()=>({width:128,height:160,getContext:()=>context})};
 try{
  walk.clearCache();
  for(const direction of [0,2,1,3])for(let i=0;i<4;i++){
   const canvas=walk.renderSprite('peregrino',direction,'walk',i,require('../public/appearance16.js').DEFAULT,documentRef);
   assert.ok(canvas);
  }
  assert.equal(samples.length,16,'one original source cell for each frame and direction');
  assert.deepEqual(samples.map(x=>x.frame),[0,1,2,3,0,1,2,3,0,1,2,3,0,1,2,3]);
  assert.ok(samples.every(x=>x.appearance===null),'source artwork never rasterized with obsolete class art');
 }finally{
  if(orig===undefined)delete global.OsPeregrinosRunway25D;
  else global.OsPeregrinosRunway25D=orig;
  walk.clearCache();
 }
 const preview=read('appearance-class-preview-v75.js'),lab=read('laboratorio-classes-v75.html'),world=read('art16.js');
 assert.ok(preview.includes("frame:walking?frame:0"));
 assert.ok(!preview.includes("Math.abs(Math.floor(frame))%2===1"));
 assert.ok(lab.includes("setInterval(()=>"));
 assert.ok(world.includes("frame:Math.floor(now/118)"));
});

test('V7.8 synthesizes missing opposite-stride legs from exact source RGBA, not a replacement template',()=>{
 const w=require('../public/peregrino-runway25d.js');
 assert.equal(w.VERSION,'runway-original-peregrino-v79-left-facing-fixed');
 assert.equal(w.wrapFrame(9),1);
 const width=128,height=160,source=new Uint8ClampedArray(width*height*4);
 // Two genuinely separate painted leather boots at the source footprint.
 for(let yy=120;yy<150;yy++)for(let xx=45;xx<81;xx++){
  const idx=(yy*width+xx)*4;
  source.set([xx<63?124:144,xx<63?79:86,xx<63?46:52,255],idx);
 }
 // Original sapphire cape is blue and MUST stay in exactly the same place.
 for(let yy=116;yy<143;yy++)for(let xx=85;xx<101;xx++){
  const idx=(yy*width+xx)*4;source.set([28,77,176,255],idx);
 }
 const at=(bytes,x,y)=>Array.from(bytes.slice((y*width+x)*4,(y*width+x)*4+4));
 const left=w.synthesizeGaitFrame(source,width,height,2,2);
 const right=w.synthesizeGaitFrame(source,width,height,6,2);
 const still=w.synthesizeGaitFrame(source,width,height,0,2);
 assert.deepEqual(Array.from(still),Array.from(source),'idle frame is byte-for-byte original');
 assert.notDeepEqual(Array.from(left),Array.from(right),'left/right contacts are genuinely different');
 assert.notDeepEqual(at(left,48,146),at(right,48,146),'ankles swing in opposite directions');
 assert.deepEqual(at(left,92,120),at(source,92,120),'blue cape perfectly intact');
 assert.deepEqual(at(right,92,120),at(source,92,120),'blue cape also intact on reverse stride');
 assert.ok(w.legMotion(1,1,148,2).dx>0);
 assert.ok(w.legMotion(1,-1,148,2).dx<0);
 assert.ok(w.legMotion(-1,1,148,2).dx<0);
 assert.ok(w.legMotion(-1,-1,148,2).dx>0);
 assert.ok(w.leatherPixel(130,70,38,58,143,2));
 assert.equal(w.leatherPixel(28,77,176,95,143,2),false);
 const src=require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../public/peregrino-runway25d.js'),'utf8');
 assert.ok(src.includes('const pose=walking?gaitFrame(dir,index):null;'));
 assert.ok(src.includes('if(pose)ctx.drawImage(pose,0,0,W,H,px,py,dw,dh);'));
 assert.ok(src.includes("const CYCLE=8"));
});

test('V7.9 LEFT face is mirrored authentic right profile while UP orientation is unchanged',()=>{
 const w=require('../public/peregrino-runway25d.js');
 assert.deepEqual([0,1,2,3].map(dir=>w.frameRect(dir,0).sy),[160,320,0,320],
  'north back row untouched; left now uses painted right profile');
 assert.deepEqual([0,1,2,3].map(dir=>w.mirrored(dir)),[false,false,false,true],
  'ONLY left is mirrored');
 for(let frame=0;frame<4;frame++){
  assert.equal(w.frameRect(3,frame).sx,w.frameRect(1,frame).sx);
  assert.equal(w.frameRect(3,frame).sy,w.frameRect(1,frame).sy);
  assert.equal(w.frameRect(0,frame).sy,160);
 }
 // Verify actual pixel painter flips only the character, and restores the
 // drawing context without mirroring labels, roads or other players.
 const source=require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../public/peregrino-runway25d.js'),'utf8');
 assert.ok(source.includes('ctx.translate(px*2+dw,0);'));
 assert.ok(source.includes('ctx.scale(-1,1);'));
 assert.ok(source.includes('ctx.restore();'));
 assert.ok(source.includes('if(mirrored(dir)){'));
 const art=read('art16.js'),game=read('mmo.js'),page=read('mundo.html');
 assert.ok(!art.includes('OsPeregrinosFacingV79'),'north-backward proposal was not deployed');
 assert.ok(game.includes('session.dir=Math.abs(dx)>Math.abs(dy)?dx>0?1:3:dy>0?2:0;'));
 assert.ok(page.includes('runway-left-facing-v79'));
});

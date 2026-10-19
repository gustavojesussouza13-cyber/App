'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const view=require('../public/world-viewport-v92.js');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../public',p),'utf8');
test('V9.2 native 960x576 stays unchanged in normal mode, invalid sizes fail safely',()=>{
 assert.deepEqual(view.resolutionFor(1920,1080,false),{width:960,height:576});
 assert.deepEqual(view.resolutionFor(0,0,true),{width:960,height:576});
 assert.deepEqual(view.resolutionFor(NaN,300,true),{width:960,height:576});
});
test('V9.2 fullscreen displays all pixels, native 16:9 logical camera shows more map and smaller sprite fraction',()=>{
 const full=view.resolutionFor(1920,1080,true);
 assert.deepEqual(full,{width:1280,height:720});
 assert.equal(full.width/full.height,16/9);
 assert.ok(full.width>960&&full.height>576);
 // A 100px NPC goes from 100/960 of the screen to just 100/1280.
 assert.ok(100/full.width<100/960);
 for(const [w,h] of [[1366,768],[2560,1440],[1280,800],[3440,1440],[1920,1200]]){
  const d=view.resolutionFor(w,h,true);
  assert.ok(d.width>=1&&d.width<=1536&&d.height>=1&&d.height<=1024);
  assert.ok(Math.abs(d.width/d.height-w/h)<.005,
   'No nonuniform sprite stretching at '+w+'×'+h);
 }
});
test('V9.2 full-screen native and fallback fill whole canvas and both WebGL/Canvas use same live viewport',()=>{
 const css=read('mmo.css'),game=read('mmo.js'),world=read('world-25d.mjs'),
  page=read('mundo.html'),art=read('art16.js');
 assert.ok(css.includes('#canvasShell:fullscreen #game,'));
 assert.ok(css.includes('#canvasShell.is-expanded #game'));
 assert.ok(css.includes('width:100%!important;height:100%!important'));
 assert.ok(!css.includes('aspect-ratio:5/3!important'));
 assert.ok(game.includes("OsPeregrinosViewportV92?.resolutionFor"));
 assert.ok(game.includes('cvs.width=W;cvs.height=H'));
 assert.ok(game.includes('classicRenderer=window.PeregrinoArt16.create({ctx,W,H})'));
 assert.ok(game.includes('world25d?.setViewport?.(W,H)'));
 assert.ok(game.includes('requestAnimationFrame(applyWorldViewport)'));
 assert.ok(world.includes('function setViewport(nextWidth,nextHeight)'));
 assert.ok(world.includes('camera.updateProjectionMatrix()'));
 assert.ok(world.includes('renderer.setSize(width,height,false)'));
 assert.ok(world.includes('return {render,setViewport,setNight'));
 assert.ok(art.includes('if(atlas.complete&&atlas.naturalWidth>0)artReady=true'));
 assert.ok(page.indexOf('/world-viewport-v92.js')<page.indexOf('/mmo.js'));
 assert.ok(page.includes('/mmo.css?v=fullscreen-native-world-v92'));
 assert.ok(page.includes('/mmo.js?v=fullscreen-native-world-v92'));
 assert.ok(!game.includes('const W=cvs.width,H=cvs.height'));
});

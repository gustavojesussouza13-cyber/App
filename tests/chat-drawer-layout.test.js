'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'../public',file),'utf8');
test('chat é acoplado ao canto da tela do jogo e não fica abaixo do mapa',()=>{
 const page=read('mundo.html');
 const canvas=page.indexOf('id="canvasShell"'),drawer=page.indexOf('id="chatDrawer"');
 const overlay=page.indexOf('id="welcomeOverlay"'),hotbar=page.indexOf('id="chatFocusBtn"');
 assert.ok(canvas>=0&&drawer>canvas&&drawer<overlay&&drawer<hotbar);
 assert.equal(page.split('id="chatLog"').length-1,1);
 assert.equal(page.split('id="chatInput"').length-1,1);
 assert.equal(page.split('id="chatForm"').length-1,1);
 assert.match(page,/id="chatDrawer"[^>]*data-collapsed="true"/);
 assert.match(page,/id="chatDrawerToggle"[^>]*aria-controls="chatDrawerContent"[^>]*aria-expanded="false"/);
 assert.match(page,/id="chatDrawerContent"[^>]*aria-hidden="true" inert/);
 assert.match(page,/id="chatUnread"[^>]*hidden/);
 assert.match(page,/chat-child-safety/);
 for(const id of ['chatChannel','chatPreset','chatPresetSend','chatChannelLabel'])
  assert.match(page,new RegExp('id="'+id+'"'));
 assert.match(page,/mmo\.css\?v=chat-drawer-v1/);
 assert.match(page,/mmo\.js\?v=chat-drawer-v1/);
});
test('dock não cobre permanentemente o mapa e funciona no fullscreen e mobile',()=>{
 const css=read('mmo.css');
 assert.match(css,/#canvasShell \.chat-drawer\{/);
 assert.match(css,/#canvasShell \.chat-drawer\[data-collapsed="true"\]/);
 assert.match(css,/width:46px;height:43px/);
 assert.match(css,/#canvasShell:fullscreen \.chat-drawer/);
 assert.match(css,/#canvasShell\.is-expanded \.chat-drawer/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/#canvasShell:has\(#welcomeOverlay:not\(\[hidden\]\)\) \.chat-drawer/);
 assert.match(css,/#canvasShell \.chat-drawer-content #chatLog/);
});
test('seta, badge e teclado usam mesmo chat com canais e proteção intactos',()=>{
 const client=read('mmo.js');
 assert.match(client,/chatDrawerToggle\.addEventListener\('click'/);
 assert.match(client,/function setChatDrawerOpen\(/);
 assert.match(client,/chatDrawerContent\.inert=!expanded/);
 assert.match(client,/chatDrawerToggle\.setAttribute\('aria-expanded'/);
 assert.match(client,/if\(msg\.name!==session\.name\)noteChatUnread\(\)/);
 assert.match(client,/if\(e\.code==='Enter'\)\{setChatDrawerOpen\(true,\{focusInput:true\}\)/);
 assert.match(client,/chatFocusBtn'\)\.onclick=\(\)=>setChatDrawerOpen/);
 assert.match(client,/send\('chat',\{text,channel:/);
 assert.match(client,/send\('chat',\{text:phrase,channel:/);
 assert.match(client,/send\('report',\{id:reportId\}\)/);
});

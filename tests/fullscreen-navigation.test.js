const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const file=name=>fs.readFileSync(path.join(__dirname,'../public',name),'utf8');
test('Mundo Aberto oferece botão de tela cheia acessível no mapa',()=>{
 const html=file('mundo.html');
 assert.match(html,/id="canvasShell"/);
 assert.match(html,/id="fullscreenBtn"/);
 assert.match(html,/aria-pressed="false"/);
 assert.match(html,/⛶ Tela cheia/);
});
test('botão abre e sai da tela cheia nativa e acompanha o estado do navegador',()=>{
 const js=file('mmo.js');
 assert.match(js,/fullScreenContainer\.requestFullscreen\(\)/);
 assert.match(js,/document\.exitFullscreen\(\)/);
 assert.match(js,/addEventListener\('fullscreenchange'/);
 assert.match(js,/aria-pressed/);
 const css=file('mmo.css');
 assert.match(css,/#canvasShell:fullscreen canvas/);
 assert.match(css,/aspect-ratio:5\/3/);
});
test('tela inicial clássica possui botão de retorno visível sem exigir entrada no jogo',()=>{
 const js=file('classic-return.js');
 assert.match(js,/id='classicReturnFixed'/);
 assert.match(js,/panel\.appendChild\(link\)/);
 assert.match(js,/VOLTAR À VERSÃO ONLINE \(MMORPG\)/);
 assert.match(js,/header\.href=target/);
 const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
 assert.match(server,/classic-return\.js/);
});

'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'../public',file),'utf8');
const js=read('guild-city-3d.js'),css=read('guild-city-3d.css');

function markup(){
 const start=js.indexOf('  dlg.innerHTML=');
 const end=js.indexOf('  document.body.append(dlg);',start);
 assert.ok(start>=0&&end>start);
 const dlg={innerHTML:''};
 new Function('dlg',js.slice(start,end))(dlg);
 return dlg.innerHTML;
}
test('painéis esquerdo e direito têm controles únicos e marcação bem-formada',()=>{
 const html=markup(),tags=[...html.matchAll(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi)];
 const stack=[],ids=new Set();
 for(const match of tags){
  const tag=match[1].toLowerCase();
  if(['input','img','link','meta','br','hr','source'].includes(tag))continue;
  if(match[0].startsWith('</'))assert.equal(stack.pop(),tag,'painéis não podem quebrar o DOM');
  else {
   stack.push(tag);
   const id=match[0].match(/\bid="([^"]+)"/)?.[1];
   if(id){assert.ok(!ids.has(id),'ID duplicado: '+id);ids.add(id)}
  }
 }
 assert.deepEqual(stack,[]);
 for(const id of ['guild3dMain','guild3dBuildShell','guild3dLotShell','guild3dSidebar',
  'guild3dBuildContents','guild3dLotContents','guild3dSidebarContents',
  'guild3dToggleBuild','guild3dToggleLot','guild3dToggleSidebar',
  'guild3dChoices','guild3dLotAction','guild3dLotUpgrade','guild3dStock'])
  assert.ok(ids.has(id),id);
 assert.match(html,/class="guild3d-left-dock"[\s\S]*id="guild3dBuildShell"[\s\S]*id="guild3dLotShell"/);
 assert.match(html,/id="guild3dSidebar"[\s\S]*id="guild3dSidebarContents"/);
});
test('setas recolhem e reabrem cada painel sem interferir nos demais',()=>{
 const start=js.indexOf('  function bindPanel(');
 const end=js.indexOf("  const opts=q('guild3dChoices');",start);
 assert.ok(start>=0&&end>start);
 const elements=new Map();
 for(const id of ['guild3dBuildShell','guild3dLotShell','guild3dSidebar','guild3dMain',
   'guild3dToggleBuild','guild3dToggleLot','guild3dToggleSidebar']){
  elements.set(id,{
   dataset:{},attributes:{},listeners:new Map(),
   setAttribute(k,v){this.attributes[k]=v},
   addEventListener(type,cb){this.listeners.set(type,cb)},
   click(){this.listeners.get('click')?.()}
  });
 }
 const q=id=>elements.get(id);
 new Function('q',js.slice(start,end))(q);
 const shell=id=>q(id).dataset.collapsed;
 const build=q('guild3dToggleBuild'),lot=q('guild3dToggleLot'),right=q('guild3dToggleSidebar');
 assert.equal(shell('guild3dBuildShell'),'false');
 assert.equal(shell('guild3dLotShell'),'false');
 assert.equal(shell('guild3dSidebar'),'false');
 build.click();assert.equal(shell('guild3dBuildShell'),'true');assert.equal(build.textContent,'▶');
 assert.equal(build.attributes['aria-expanded'],'false');
 assert.equal(shell('guild3dLotShell'),'false');
 lot.click();assert.equal(shell('guild3dLotShell'),'true');
 build.click();assert.equal(shell('guild3dBuildShell'),'false');assert.equal(shell('guild3dLotShell'),'true');
 right.click();assert.equal(shell('guild3dSidebar'),'true');
 assert.equal(q('guild3dMain').dataset.sidebarCollapsed,'true');
 assert.equal(right.textContent,'◀');
 assert.equal(right.attributes['aria-expanded'],'false');
 right.click();assert.equal(shell('guild3dSidebar'),'false');
 assert.equal(q('guild3dMain').dataset.sidebarCollapsed,'false');
 lot.click();assert.equal(shell('guild3dLotShell'),'false');
});
test('layout elimina posicionamento concorrente e recolhimento libera espaço do mapa',()=>{
 assert.match(css,/\.guild3d-left-dock\s*\{[\s\S]*?display:flex;flex-direction:column/);
 assert.match(css,/\.guild3d-left-dock \.guild3d-dock-panel\s*\{[\s\S]*?position:relative/);
 assert.match(css,/\.guild3d-left-dock \.guild3d-build-panel\s*\{max-height:54%\}/);
 assert.match(css,/\.guild3d-left-dock \.guild3d-lot-panel\s*\{max-height:39%/);
 assert.match(css,/\.guild3d-left-dock \.guild3d-dock-panel\[data-collapsed="true"\]/);
 assert.match(css,/\.guild3d-dock-panel\[data-collapsed="true"\] \.guild3d-panel-body\s*\{display:none\}/);
 assert.match(css,/\.guild3d-main\[data-sidebar-collapsed="true"\]\s*\{grid-template-columns:minmax\(0,1fr\) 42px\}/);
 assert.match(css,/\.guild3d-sidebar\[data-collapsed="true"\] \.guild3d-sidebar-body\s*\{display:none\}/);
 assert.match(css,/@media\(max-width:850px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

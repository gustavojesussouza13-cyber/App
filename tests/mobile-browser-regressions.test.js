'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'../public');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const script=read('mmo.js');
const styles=read('mmo.css');
const html=read('mundo.html');

test('scripts do Mundo Aberto são JavaScript válido antes de cada publicação',()=>{
 for(const file of ['shading16.js','character-atelier16.js','sprite-studio.js','landscape16.js','art16.js','monster-motion.js','combat-effects.js','touch-controls.js','player-motion.js','latency.js','sounds-desktop.js','mmo.js','privacy-controls.js']){
  assert.doesNotThrow(()=>new vm.Script(read(file),{filename:file}),file);
 }
});

test('mensagens de dano e recompensa continuam acessíveis fora do aviso de monstro',()=>{
 const start=script.indexOf('function dispatch(msg){');
 const end=script.indexOf('\nfunction connect(){',start);
 assert.ok(start>0&&end>start);
 const ctx={
  session:{zone:0,characters:{hp:135},monsters:new Map(),players:new Map()},
  fx:[],performance:{now:()=>500},say:()=>{},alert:()=>{},
  spriteActions:{monsters:new Map(),players:new Map(),fallen:[],localHurtAt:0},
  $:()=>({hidden:true,textContent:''}),console,
 };
 const notices=[];
 ctx.say=(...args)=>notices.push(args);
 const alerts=[];ctx.alert=x=>alerts.push(x);
 vm.createContext(ctx);vm.runInContext(script.slice(start,end),ctx);
 vm.runInContext("dispatch({type:'hurt',damage:12})",ctx);
 assert.equal(ctx.fx.length,1,'dano precisa chegar ao jogador');
 assert.equal(ctx.fx[0].text,'−12');
 vm.runInContext("dispatch({type:'reward',xp:5,gold:2})",ctx);
 assert.ok(alerts.some(x=>x.includes('+5 EXP')),'recompensa deve ser exibida');
 vm.runInContext("dispatch({type:'chat',channel:'global',name:'Outro',text:'olá'})",ctx);
 assert.equal(notices.length,1,'chat deve continuar acessível');
});

function fullscreenHarness(withNative=false,throws=false){
 const events={};
 function classes(){
  const state=new Set();
  return {contains:name=>state.has(name),toggle:(name,value)=>{
   const enabled=value===undefined?!state.has(name):!!value;
   if(enabled)state.add(name);else state.delete(name);
   return enabled;
  }};
 }
 const shell={classList:classes()};
 const button={attributes:{},textContent:'',addEventListener:(name,fn)=>{events[name]=fn},
  setAttribute(name,value){this.attributes[name]=value}};
 const document={fullscreenElement:null,body:{classList:classes()},addEventListener:()=>{}};
 if(withNative){
  shell.requestFullscreen=async()=>{
   if(throws)throw Error('Bloqueado pelo navegador');
   document.fullscreenElement=shell;
  };
  document.exitFullscreen=async()=>{document.fullscreenElement=null};
 }
 const start=script.indexOf("const fullScreenContainer=$('canvasShell')");
 const end=script.indexOf('const keyAction=',start);
 assert.ok(start>0&&end>start);
 const ctx={$:id=>id==='canvasShell'?shell:button,document,cvs:{focus:()=>{}},console,alert:()=>{}};
 vm.createContext(ctx);
 vm.runInContext(script.slice(start,end),ctx);
 return {button,shell,document,events};
}

test('tela cheia tem fallback funcional no Android sem Fullscreen API',async()=>{
 const h=fullscreenHarness(false);
 await h.events.click();
 assert.equal(h.shell.classList.contains('is-expanded'),true);
 assert.equal(h.document.body.classList.contains('world-fullscreen'),true);
 assert.equal(h.button.attributes['aria-pressed'],'true');
 await h.events.click();
 assert.equal(h.shell.classList.contains('is-expanded'),false);
 assert.equal(h.button.attributes['aria-pressed'],'false');
});

test('tela cheia nativa é preferida e falhas ativam o modo expandido',async()=>{
 const native=fullscreenHarness(true);
 await native.events.click();
 assert.equal(native.document.fullscreenElement,native.shell);
 assert.equal(native.shell.classList.contains('is-expanded'),false);
 await native.events.click();
 assert.equal(native.document.fullscreenElement,null);
 const blocked=fullscreenHarness(true,true);
 await blocked.events.click();
 assert.equal(blocked.shell.classList.contains('is-expanded'),true);
});

test('consulta de contas tem timeout e retorno para visitante sem travar tela',()=>{
 assert.match(script,/async function fetchAuthSession\(\)/);
 assert.match(script,/setTimeout\(\(\)=>controller\.abort\(\),9000\)/);
 assert.match(script,/finally\{clearTimeout\(timeout\)\}/);
 assert.match(script,/label\.textContent='Não foi possível verificar as contas agora\. O modo visitante continua disponível\.'/);
});

test('estilos responsivos e URLs novas do cliente são publicados',()=>{
 assert.match(styles,/#canvasShell\.is-expanded/);
 assert.match(styles,/@media\(max-width:850px\)/);
 assert.match(styles,/\.canvas-shell:has\(#welcomeOverlay:not\(\[hidden\]\)\)/);
 assert.match(html,/href="\/mmo\.css\?v=rooms-switch-v1"/);
 assert.match(html,/src="\/mmo\.js\?v=kingdom-empire-v1"/);
 assert.ok(html.indexOf('/sprite-studio.js')<html.indexOf('/art16.js'));
 assert.ok(html.indexOf('/character-atelier16.js')<html.indexOf('/sprite-studio.js'));
 assert.ok(html.indexOf('/landscape16.js')<html.indexOf('/art16.js'));
 assert.match(html,/src="\/landscape16\.js\?v=shading-v6"/);
 assert.ok(html.indexOf('/shading16.js')<html.indexOf('/pixel-detail.js'));
 assert.ok(html.indexOf('/shading16.js')<html.indexOf('/sprite-studio.js'));
});

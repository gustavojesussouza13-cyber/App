'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
const script=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../public/mmo.css'),'utf8');
function extract(begin,end){
 const start=script.indexOf(begin),stop=script.indexOf(end,start+begin.length);
 assert.ok(start>=0&&stop>start,begin+' foi encontrado no cliente');
 return script.slice(start,stop);
}
function harness(){
 const elements=new Map(),sent=[];
 function el(id){
  if(elements.has(id))return elements.get(id);
  const listeners=new Map();
  const value={id,open:false,hidden:false,disabled:false,value:'',textContent:'',listeners,parentElement:null,
   addEventListener(name,fn){listeners.set(name,fn)},
   replaceChildren(){this.value=''},
   showModal(){this.open=true},
   close(){this.open=false},
   appendChild(child){child.parentElement=this;return child}};
  elements.set(id,value);return value;
 }
 const document={body:el('documentBody'),fullscreenElement:null};
 const context={document,fullScreenContainer:el('canvasShell'),session:{connected:true,online:1},
  roomName:'Guilda da Luz',roomSwitchPending:false,roomSwitchTarget:null,
  selectedRoomId:'auren-publica',roomCatalog:[
   {id:'auren-publica',name:'Praça Pública',online:1,capacity:10,locked:false},
   {id:'sala-luz',name:'Guilda da Luz',online:4,capacity:60,locked:false}
  ],
  $:el,
  loadRooms:async()=>{context.refreshed++},
  renderSwitchRooms:()=>{context.rendered++},
  updateSwitchChoice:()=>{},
  send:(...args)=>sent.push(args),
  refreshed:0,rendered:0,
 };
 vm.createContext(context);
 const callbacks=extract("$('roomSwitchCancel').addEventListener('click',",
  "$('roomSwitchCreateForm').addEventListener('submit',");
 vm.runInContext(callbacks,context);
 const submit=extract("$('roomSwitchConfirm').addEventListener('click',",
  "const requestedRoom=");
 vm.runInContext(submit,context);
 return{context,el,sent,async click(id){return el(id).listeners.get('click')()}};
}
test('o bloco Guilda da Luz é um botão sem perder estilo, navegável por teclado',()=>{
 assert.match(html,/<button[^>]*id="roomSwitchBtn"[^>]*aria-haspopup="dialog"[^>]*aria-controls="roomSwitchDialog"/);
 assert.match(html,/<dialog id="roomSwitchDialog"/);
 assert.match(html,/id="roomSwitchCurrent"/);
 assert.match(html,/id="roomSwitchConfirm"/);
 assert.match(html,/id="roomSwitchCancel"/);
 assert.match(html,/id="roomSwitchCreateForm"/);
 assert.match(css,/\.room-status-button:focus-visible/);
 assert.match(css,/\.room-switch-actions/);
});
test('clicar abre a seleção e Continuar jogando fecha sem enviar troca ou desconectar',async()=>{
 const h=harness();
 await h.click('roomSwitchBtn');
 assert.equal(h.el('roomSwitchDialog').open,true);
 assert.equal(h.el('roomSwitchCurrent').textContent,'Guilda da Luz · 1/60 jogadores');
 assert.equal(h.context.refreshed,1);
 assert.equal(h.context.rendered,1);
 assert.deepEqual(h.sent,[]);
 await h.click('roomSwitchCancel');
 assert.equal(h.el('roomSwitchDialog').open,false);
 assert.deepEqual(h.sent,[]);
 assert.equal(h.context.session.connected,true);
});
test('jogador escolhe outra sala e só então confirma; servidor recebe uma solicitação',async()=>{
 const h=harness();
 await h.click('roomSwitchBtn');
 h.el('roomSwitchSelect').value='auren-publica';
 await h.click('roomSwitchConfirm');
 assert.equal(h.sent.length,0,'seleção da mesma sala não deve enviar pedido');
 h.el('roomSwitchSelect').value='sala-luz';
 await h.click('roomSwitchConfirm');
 assert.equal(h.sent.length,1);
 assert.equal(h.sent[0][0],'switchRoom');
 assert.equal(h.sent[0][1].roomId,'sala-luz');
 assert.equal('password' in h.sent[0][1],false,'nenhuma senha é enviada ao trocar de sala');
 assert.equal(h.context.roomSwitchPending,true);
 assert.equal(h.el('roomSwitchCancel').disabled,true);
 assert.equal(h.el('roomSwitchDialog').open,true,'aguardar confirmação do servidor');
});
test('a janela pode ser aberta dentro da tela cheia sem sair do jogo',async()=>{
 const h=harness();
 h.context.document.fullscreenElement=h.context.fullScreenContainer;
 await h.click('roomSwitchBtn');
 assert.strictEqual(h.el('roomSwitchDialog').parentElement,h.context.fullScreenContainer);
 assert.equal(h.el('roomSwitchDialog').open,true);
});

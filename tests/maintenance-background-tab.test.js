'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../public/site-maintenance.js'),'utf8');
function fakeDocument(){
 const events=new Map();
 function element(tag){
  const attrs={},listeners=new Map();
  return{tag,hidden:false,attrs,listeners,children:[],parentNode:null,
   textContent:'',classList:{toggle(){}},
   setAttribute(k,v){attrs[k]=v},
   addEventListener(k,handler){listeners.set(k,handler)},
   append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node)}},
   click(){listeners.get('click')?.()}};
 }
 const head=element('head'),body=element('body');
 return {head,body,title:'Os Peregrinos — Crônicas da Aurora',
  hidden:false,readyState:'complete',fullscreenElement:null,
  createElement:element,addEventListener:(k,handler)=>events.set(k,handler),events};
}
test('aviso global permanece visível em aba de segundo plano até o jogador ler e dispensar',()=>{
 const document=fakeDocument(),notifications=[],channels=[];
 class EventSource{
  constructor(url){this.url=url;this.handlers=new Map();channels.push(this)}
  addEventListener(kind,fn){this.handlers.set(kind,fn)}
  emit(kind,data){this.handlers.get(kind)?.({data:JSON.stringify(data)})}
 }
 function Notification(title,options){notifications.push({title,options})}
 Notification.permission='granted';
 const window={};
 vm.runInNewContext(code,{window,document,EventSource,Notification,
  setTimeout,clearTimeout,console});
 const banner=document.body.children.find(x=>x.id==='os-maintenance-banner');
 assert.ok(banner,'faixa de manutenção não foi criada');
 assert.equal(banner.hidden,true);
 assert.equal(channels.length,1);
 assert.equal(channels[0].url,'/api/maintenance/events');
 assert.equal(banner.attrs.role,'alert');
 document.hidden=true;
 channels[0].emit('maintenance',{active:true,type:'maintenance',
  message:'O servidor será atualizado em instantes.'});
 assert.equal(banner.hidden,false);
 assert.match(document.title,/⚠ Os Peregrinos em manutenção/);
 assert.equal(notifications.length,1,'usuário com notificações já autorizadas deve ser avisado');
 const copy=banner.children.find(x=>x.tag==='div');
 assert.ok(copy.children.some(x=>x.textContent.includes('O servidor será atualizado')));
 channels[0].emit('maintenance',{active:false,type:'maintenance',message:''});
 assert.equal(banner.hidden,false,'não fechar sozinho quando o usuário estiver em outra aba');
 assert.match(document.title,/Servidor disponível novamente/);
 const dismiss=banner.children.find(x=>x.tag==='button');
 assert.ok(dismiss);
 assert.equal(dismiss.textContent,'Entendi');
 dismiss.click();
 assert.equal(banner.hidden,true);
 assert.equal(document.title,'Os Peregrinos — Crônicas da Aurora');
});
test('aviso aparece também em tela cheia sem escapar do jogo',()=>{
 const document=fakeDocument(),window={};
 class EventSource{addEventListener(){}}
 vm.runInNewContext(code,{window,document,EventSource,setTimeout,clearTimeout,console});
 const banner=document.body.children.find(x=>x.id==='os-maintenance-banner');
 assert.ok(banner);
 const fullscreen={children:[],append(node){node.parentNode=this;this.children.push(node)}};
 document.fullscreenElement=fullscreen;
 document.events.get('fullscreenchange')();
 assert.equal(banner.parentNode,fullscreen);
 window.OsPeregrinosMaintenance.notify({active:true,message:'Aviso em tela cheia'});
 assert.equal(banner.hidden,false);
 assert.match(document.title,/manutenção/);
});

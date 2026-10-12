'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const browserCode=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
const serverCode=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');

function harness(){
 const start=browserCode.indexOf('function connect(){');
 const end=browserCode.indexOf("\n$('nameForm')",start);
 assert.ok(start>=0&&end>start,'função connect() deve existir');
 const sockets=[];
 const queued=new Map();
 let timer=0;
 class FakeSocket{
  static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
  constructor(url){this.url=url;this.readyState=0;this.sent=[];sockets.push(this)}
  send(msg){this.sent.push(JSON.parse(msg))}
  close(){this.readyState=3;this.onclose?.()}
 }
 const ctx={
  WebSocket:FakeSocket,location:{protocol:'https:',host:'localhost'},
  progressToken:'guest-test',socket:null,reconnectMs:1000,reconnectTimer:null,
  session:{name:'Teste',formClass:'peregrino',monsters:new Map(),players:new Map()},
  accountMode:false,authed:true,
  spriteActions:{monsters:new Map(),players:new Map(),fallen:[],localHurtAt:0},
  setOnline:()=>{},closeDialogue:()=>{},monsterMotion:{clear:()=>{}},playerMotion:{clear:()=>{}},combatFx:{clear:()=>{}},
  alert:()=>{},console,JSON,Map,
  setTimeout:(cb,ms)=>{queued.set(++timer,{cb,ms});return timer},
  clearTimeout:id=>queued.delete(id),
 };
 vm.createContext(ctx);
 vm.runInContext(browserCode.slice(start,end),ctx);
 return {ctx,sockets,queued,FakeSocket};
}

test('não cria conexões paralelas durante handshake WebSocket',()=>{
 const h=harness();
 h.ctx.connect();h.ctx.connect();
 assert.equal(h.sockets.length,1);
 h.sockets[0].readyState=1;h.sockets[0].onopen();
 assert.equal(h.sockets[0].sent[0].type,'hello');
 h.ctx.connect();assert.equal(h.sockets.length,1);
});

test('desconexão abre uma única nova conexão após o atraso previsto',()=>{
 const h=harness();
 h.ctx.connect();const old=h.sockets[0];
 old.readyState=3;old.onclose();
 assert.equal(h.queued.size,1);
 const item=[...h.queued.values()][0];assert.equal(item.ms,1000);
 item.cb();assert.equal(h.sockets.length,2);
 h.ctx.connect();assert.equal(h.sockets.length,2);
});

test('callbacks de conexão antiga não enviam autenticação ou agendam outra conexão',()=>{
 const h=harness();
 h.ctx.connect();const old=h.sockets[0];
 old.readyState=3;old.onclose();
 [...h.queued.values()][0].cb();
 h.queued.clear();
 old.onopen();old.onclose();old.onerror();
 assert.equal(old.sent.length,0);
 assert.equal(h.queued.size,0);
});

test('heartbeat do servidor é limitado sem reduzir frequência de snapshots',()=>{
 assert.match(serverCode,/lastPing:0/);
 assert.match(serverCode,/now-c\.lastPing>=20000/);
 assert.match(serverCode,/c\.lastPing=now/);
 assert.match(serverCode,/now-c\.lastPong>65000/);
 assert.match(serverCode,/},250\)\.unref\(\)/);
});

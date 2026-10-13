'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const withTimeout=(promise,ms,label)=>Promise.race([promise,new Promise((_,reject)=>{
 const timer=setTimeout(()=>reject(Error(label+' excedeu o tempo')),ms);timer.unref?.();
})]);

test('desligamento real avisa visitantes SSE e jogadores WebSocket antes de encerrar',{timeout:18000},async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'os-peregrinos-aviso-'));
 const port=31293;
 const child=spawn(process.execPath,['server.js'],{
  cwd:path.join(__dirname,'..'),
  env:{...process.env,PORT:String(port),DATABASE_URL:'',DATA_FILE:path.join(dir,'world.sqlite')},
  stdio:['ignore','pipe','pipe']
 });
 let errors='';
 child.stderr.on('data',buf=>{errors+=buf.toString('utf8').slice(0,400)});
 t.after(()=>{
  if(child.exitCode===null&&!child.killed)child.kill('SIGKILL');
  fs.rmSync(dir,{recursive:true,force:true});
 });
 const origin='http://127.0.0.1:'+port;
 await withTimeout((async()=>{
  for(let i=0;i<100;i++){
   try{const response=await fetch(origin+'/health');if(response.ok)return}catch{}
   await sleep(40);
  }
  throw Error('servidor local não iniciou: '+errors);
 })(),6500,'startup');
 const home=await(await fetch(origin+'/')).text();
 const world=await(await fetch(origin+'/mundo.html')).text();
 assert.match(home,/site-maintenance\.js\?v=maintenance-v2/);
 assert.match(world,/site-maintenance\.js\?v=maintenance-v2/);
 const status=await(await fetch(origin+'/api/maintenance/status')).json();
 assert.equal(status.active,false);
 const stream=await fetch(origin+'/api/maintenance/events');
 assert.equal(stream.status,200);
 assert.match(stream.headers.get('content-type'),/text\/event-stream/);
 const reader=stream.body.getReader();
 t.after(()=>{void reader.cancel().catch(()=>{})});
 // Real browser-like consumer: check initial state and wait maintenance signal.
 const streamNotice=(async()=>{
  let text='';
  for(;;){
   const {done,value}=await reader.read();
   if(done)throw Error('canal SSE fechou sem avisar');
   text+=new TextDecoder().decode(value);
   if(text.includes('"active":true'))return text;
  }
 })();
 const ws=new WebSocket('ws://127.0.0.1:'+port+'/world-ws');
 t.after(()=>{try{ws.close()}catch{}});
 let resolveWelcome,rejectWelcome,resolveMaintenance;
 const welcome=new Promise((resolve,reject)=>{resolveWelcome=resolve;rejectWelcome=reject});
 const notice=new Promise(resolve=>{resolveMaintenance=resolve});
 ws.onopen=()=>ws.send(JSON.stringify({type:'hello',name:'AvisoRealTeste',token:'c'.repeat(64),role:'peregrino',mode:'guest'}));
 ws.onmessage=event=>{
  let msg;try{msg=JSON.parse(event.data)}catch{return}
  if(msg.type==='welcome')resolveWelcome(msg);
  if(msg.type==='maintenance')resolveMaintenance(msg);
 };
 ws.onerror=()=>rejectWelcome(Error('WebSocket não conectou'));
 await withTimeout(welcome,5000,'world welcome');
 const exited=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
 child.kill('SIGTERM');
 const [sse,websocket]=await withTimeout(Promise.all([streamNotice,notice]),6500,'aviso real SSE/WS');
 assert.match(sse,/em instantes/);
 assert.equal(websocket.active,true);
 assert.equal(websocket.type,'maintenance');
 assert.match(websocket.message,/atualiza/i);
 const result=await withTimeout(exited,9000,'shutdown');
 assert.equal(result.code,0,'desligamento gracioso falhou: '+errors);
});
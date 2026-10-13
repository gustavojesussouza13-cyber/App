'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {spawn}=require('node:child_process');
const {setTimeout:delay}=require('node:timers/promises');
const path=require('node:path');

async function randomPort(){
 const server=http.createServer();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const port=server.address().port;
 await new Promise(resolve=>server.close(resolve));
 return port;
}
async function waitUntil(fn,timeout=5000){
 const deadline=Date.now()+timeout;
 while(Date.now()<deadline){try{if(await fn())return}catch{}await delay(45)}
 throw new Error('Servidor não ficou pronto antes do tempo limite');
}
function listenWs(ws,predicate,timeout=5500){
 return new Promise((resolve,reject)=>{
  let timer;
  const cleanup=()=>{clearTimeout(timer);ws.removeEventListener('message',message);ws.removeEventListener('error',error)};
  const message=event=>{try{const data=JSON.parse(event.data);if(predicate(data)){cleanup();resolve(data)}}catch{}};
  const error=()=>{cleanup();reject(new Error('Canal WebSocket falhou'))};
  timer=setTimeout(()=>{cleanup();reject(new Error('Aviso WebSocket não chegou'))},timeout);
  ws.addEventListener('message',message);
  ws.addEventListener('error',error);
 });
}
async function waitSse(reader,predicate,timeout=5000){
 const decoder=new TextDecoder();let buffer='';
 const started=Date.now();
 while(Date.now()-started<timeout){
  const {value,done}=await Promise.race([
   reader.read(),delay(timeout).then(()=>{throw new Error('Evento de manutenção não recebido via SSE')})
  ]);
  if(done)throw new Error('SSE fechado antes do evento');
  buffer+=decoder.decode(value,{stream:true});
  const chunks=buffer.split('\n\n');buffer=chunks.pop();
  for(const chunk of chunks){
   const row=chunk.split('\n').find(line=>line.startsWith('data: '));
   if(row){const packet=JSON.parse(row.slice(6));if(predicate(packet))return packet}
  }
 }
 throw new Error('Evento SSE não encontrado');
}

test('SIGTERM avisa navegador aberto por SSE e jogador conectado via WebSocket antes de encerrar', {timeout:16000},async()=>{
 const port=await randomPort(),host='http://127.0.0.1:'+port;
 const worker=spawn(process.execPath,['server.js'],{
  cwd:path.resolve(__dirname,'..'),
  env:{...process.env,PORT:String(port),DATABASE_URL:'',NODE_ENV:'test'},
  stdio:['ignore','pipe','pipe']
 });
 let stderr='';
 worker.stderr.on('data',chunk=>{stderr+=chunk.toString().slice(-1200)});
 const cleanup=[];
 let ws,reader;
 try{
  await waitUntil(async()=>{const res=await fetch(host+'/health');return res.ok},6000);
  const status=await fetch(host+'/api/maintenance/status');
  assert.equal(status.status,200);
  assert.deepEqual(await status.json(),{type:'maintenance',active:false,message:'',at:null});
  const response=await fetch(host+'/api/maintenance/events');
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/text\/event-stream/);
  assert.match(response.headers.get('cache-control'),/no-store/);
  reader=response.body.getReader();
  // SSE antes de entrar no jogo: deve funcionar inclusive na homepage.
  const current=await waitSse(reader,x=>x.type==='maintenance',2200);
  assert.equal(current.active,false);
  ws=new WebSocket('ws://127.0.0.1:'+port+'/world-ws');
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('WebSocket não abriu')),2500);
   ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});
   ws.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('WebSocket rejeitado'))},{once:true});
  });
  ws.send(JSON.stringify({type:'hello',name:'AvisoTeste',role:'peregrino',mode:'guest',token:'a'.repeat(64)}));
  const online=await listenWs(ws,x=>x.type==='welcome',2800);
  assert.equal(online.self.name,'AvisoTeste');
  const sseAlert=waitSse(reader,x=>x.type==='maintenance'&&x.active,6000);
  const wsAlert=listenWs(ws,x=>x.type==='maintenance'&&x.active,6000);
  const started=Date.now();
  worker.kill('SIGTERM');
  const [announcement,websocketNotice]=await Promise.all([sseAlert,wsAlert]);
  assert.match(announcement.message,/atualiza|manuten/i);
  assert.equal(announcement.message,websocketNotice.message);
  assert.ok(Date.now()-started<2850,'avisos devem chegar antes de encerrar os sockets');
  assert.equal(ws.readyState,WebSocket.OPEN,'WebSocket ainda deve estar aberto ao receber a mensagem');
  assert.ok(announcement.at);
 }finally{
  try{ws?.close()}catch{}
  try{reader?.cancel()}catch{}
  if(worker.exitCode===null)worker.kill('SIGTERM');
  await Promise.race([new Promise(resolve=>worker.once('exit',resolve)),delay(7500)]);
  if(worker.exitCode===null)worker.kill('SIGKILL');
 }
 assert.doesNotMatch(stderr,/TypeError|UnhandledPromiseRejection/);
});

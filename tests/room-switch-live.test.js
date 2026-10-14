'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {setTimeout:delay}=require('node:timers/promises');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const port=32345,base='http://127.0.0.1:'+port;
const guestToken=()=>crypto.randomBytes(32).toString('hex');
async function ready(){
 for(let t=0;t<90;t++){
  try{const r=await fetch(base+'/health');if(r.ok)return}catch{}
  await delay(40);
 }
 throw Error('servidor de teste não iniciou');
}
async function room(name,password,guestToken){
 const r=await fetch(base+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({name,password,guestToken})});
 return{status:r.status,...await r.json()};
}
function awaitMessage(socket,accept,submit,timeout=3500){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{socket.removeEventListener('message',listen);reject(Error('Tempo excedido aguardando resposta'))},timeout);
  function listen(e){
   let msg;try{msg=JSON.parse(e.data)}catch{return}
   if(!accept(msg))return;
   clearTimeout(timer);socket.removeEventListener('message',listen);resolve(msg);
  }
  socket.addEventListener('message',listen);
  try{submit?.()}catch(err){clearTimeout(timer);socket.removeEventListener('message',listen);reject(err)}
 });
}
async function join(name,roomId,password,token=guestToken()){
 const socket=new WebSocket('ws://127.0.0.1:'+port+'/world-ws');
 const result=await new Promise((resolve,reject)=>{
  socket.addEventListener('open',async()=>{
   try{resolve(await awaitMessage(socket,m=>m.type==='welcome'||m.type==='error',
    ()=>socket.send(JSON.stringify({type:'hello',name,token,role:'arqueiro',roomId,roomPassword:password}))))}
   catch(err){reject(err)}
  });
  socket.addEventListener('error',()=>reject(Error('Falha WebSocket')));
 });
 return{socket,result,token};
}
test('troca real entre salas públicas ignora senhas antigas e preserva o personagem',{timeout:23000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-switch-'));
 const worker=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),
  env:{...process.env,PORT:String(port),DATABASE_URL:'',DATA_FILE:path.join(dir,'world.sqlite')},
  stdio:['ignore','pipe','pipe']});
 let stderr='';worker.stderr.on('data',buf=>{stderr+=buf.toString().slice(-1000)});
 const sockets=[];
 try{
  await ready();
  const firstOwner=guestToken(),secondOwner=guestToken();
  const first=await room('Vale dos Amigos','',firstOwner);
  const second=await room('Torre Protegida','segredo-forte',secondOwner);
  assert.equal(first.status,201);assert.equal(second.status,201);
  assert.equal((await(await fetch(base+'/api/rooms')).json()).rooms.length,1,'ambas ficam invisíveis até o primeiro acesso');
  const pilgrim=await join('ViajaEntreSalas',first.room.id,'',firstOwner);
  sockets.push(pilgrim.socket);
  const peer=await join('CompanheiroDeSala',first.room.id,'');
  sockets.push(peer.socket);
  const ownerSecond=await join('DonaDaTorre',second.room.id,'segredo-forte',secondOwner);
  sockets.push(ownerSecond.socket);
  assert.equal(ownerSecond.result.type,'welcome');
  assert.equal(pilgrim.result.type,'welcome');
  assert.equal(pilgrim.result.room.id,first.room.id);
  assert.equal(pilgrim.result.self.role,'arqueiro');
  const potions=pilgrim.result.self.inventory.pocao;
  const spent=await awaitMessage(pilgrim.socket,m=>m.type==='character'&&m.inventory.pocao===potions-1,
   ()=>pilgrim.socket.send(JSON.stringify({type:'use',item:'pocao'})));
  assert.equal(spent.level,1);assert.equal(spent.inventory.pocao,potions-1);
  const stillChat=await awaitMessage(peer.socket,m=>m.type==='chat'&&m.text==='Continuo nesta sala',
   ()=>pilgrim.socket.send(JSON.stringify({type:'chat',channel:'global',text:'Continuo nesta sala'})));
  assert.equal(stillChat.name,'ViajaEntreSalas');
  // Um cliente antigo com senha errada continua entrando: o servidor só oferece salas públicas.
  const targetWelcome=await awaitMessage(pilgrim.socket,m=>m.type==='welcome',
   ()=>pilgrim.socket.send(JSON.stringify({type:'switchRoom',roomId:second.room.id,password:'senha-invalida'})));
  assert.equal(targetWelcome.room.id,second.room.id);
  assert.equal(targetWelcome.self.role,'arqueiro');
  assert.equal(targetWelcome.self.inventory.pocao,potions-1);
  assert.equal(targetWelcome.self.coins,spent.coins);
  assert.equal(targetWelcome.self.xp,spent.xp);
  assert.equal(pilgrim.socket.readyState,WebSocket.OPEN,'mesmo WebSocket, sem relogar');
  const listing=await(await fetch(base+'/api/rooms')).json();
  assert.equal(listing.rooms.find(r=>r.id===first.room.id).online,1);
  assert.equal(listing.rooms.find(r=>r.id===second.room.id).online,2);
  let leaked=false;
  peer.socket.addEventListener('message',e=>{
   const msg=JSON.parse(e.data);
   if(msg.type==='chat'&&msg.text==='Mensagem só da torre')leaked=true;
  });
  pilgrim.socket.send(JSON.stringify({type:'chat',channel:'global',text:'Mensagem só da torre'}));
  await delay(260);assert.equal(leaked,false,'chat não pode atravessar salas');
  const back=await awaitMessage(pilgrim.socket,m=>m.type==='welcome',
   ()=>pilgrim.socket.send(JSON.stringify({type:'switchRoom',roomId:first.room.id,password:''})));
  assert.equal(back.room.id,first.room.id);
  assert.equal(back.self.inventory.pocao,potions-1,'visitante não deve perder poções na troca');
  assert.equal(back.self.level,spent.level);
  const same=await awaitMessage(pilgrim.socket,m=>m.type==='roomSwitchError',
   ()=>pilgrim.socket.send(JSON.stringify({type:'switchRoom',roomId:first.room.id,password:''})));
  assert.equal(same.code,'same_room');
  assert.equal(pilgrim.socket.readyState,WebSocket.OPEN);
  // A saída do último membro é imediata, inclusive em uma troca de sala.
  peer.socket.close();
  await delay(180);
  const leaving=await awaitMessage(pilgrim.socket,m=>m.type==='welcome',
   ()=>pilgrim.socket.send(JSON.stringify({type:'switchRoom',roomId:second.room.id,password:'segredo-forte'})));
  assert.equal(leaving.room.id,second.room.id);
  const clean=await(await fetch(base+'/api/rooms')).json();
  assert.ok(!clean.rooms.some(r=>r.id===first.room.id),'sala vazia não pode ficar como 0/10');
  assert.equal(clean.rooms.find(r=>r.id===second.room.id).online,2);
 }finally{
  for(const socket of sockets)try{socket.close()}catch{}
  worker.kill('SIGTERM');
  await Promise.race([new Promise(ok=>worker.once('exit',ok)),delay(4700)]);
  if(worker.exitCode===null)worker.kill('SIGKILL');
  fs.rmSync(dir,{recursive:true,force:true});
 }
 assert.doesNotMatch(stderr,/SyntaxError|ReferenceError|UnhandledPromiseRejection/);
});

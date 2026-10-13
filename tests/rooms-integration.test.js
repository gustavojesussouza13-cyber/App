'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {setTimeout:delay}=require('node:timers/promises');
const PORT=32196;
const BASE='http://127.0.0.1:'+PORT;
async function serverReady(){
 const deadline=Date.now()+8000;
 while(Date.now()<deadline){try{if((await fetch(BASE+'/health')).ok)return}catch{}await delay(50)}
 throw Error('Servidor de salas não iniciou');
}
function guest(){return crypto.randomBytes(32).toString('hex')}
async function createRoom(name,password,token){
 const res=await fetch(BASE+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({name,password,guestToken:token})});
 return{status:res.status,...await res.json()};
}
async function join({name,roomId='auren-publica',password='',token=guest()}={}){
 return new Promise((resolve,reject)=>{
  const socket=new WebSocket('ws://127.0.0.1:'+PORT+'/world-ws'),messages=[];
  const timer=setTimeout(()=>{socket.close();reject(new Error('Sem resposta de entrada na sala'))},3500);
  socket.addEventListener('open',()=>socket.send(JSON.stringify({
   type:'hello',name,role:'peregrino',token,roomId,roomPassword:password
  })));
  socket.addEventListener('message',event=>{
   const m=JSON.parse(event.data);messages.push(m);
   if(m.type==='welcome'||m.type==='error'){clearTimeout(timer);resolve({socket,result:m,messages,token})}
  });
  socket.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('WebSocket indisponível'))});
 });
}
test('salas criadas pelos jogadores: senha, lotação, isolamento e contagem global',{timeout:25000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'os-rooms-e2e-'));
 const worker=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),
  env:{...process.env,PORT:String(PORT),DATABASE_URL:'',DATA_FILE:path.join(dir,'world.sqlite')},
  stdio:['ignore','pipe','pipe']});
 let stderr='';worker.stderr.on('data',d=>stderr+=d.toString().slice(-300));
 const clients=[];
 try{
  await serverReady();
  const owner=guest(),otherOwner=guest();
  let listing=await(await fetch(BASE+'/api/rooms')).json();
  assert.equal(listing.rooms.length,1);
  assert.equal(listing.rooms[0].id,'auren-publica');
  assert.equal(listing.capacityPerRoom,60);
  const publicRoom=await createRoom('Arvore de Auren','',owner);
  assert.equal(publicRoom.status,201,publicRoom.error);
  const privateRoom=await createRoom('Fortaleza Verde','CajadoVerde!2026',otherOwner);
  assert.equal(privateRoom.status,201,privateRoom.error);
  assert.equal(privateRoom.room.locked,true);
  assert.equal(publicRoom.room.locked,false);
  assert.equal(privateRoom.room.capacity,60);
  listing=await(await fetch(BASE+'/api/rooms')).json();
  assert.equal(listing.rooms.length,1,'salas ainda não ocupadas não aparecem para outros jogadores');
  assert.equal(JSON.stringify(listing).includes('CajadoVerde!2026'),false);
  assert.equal(JSON.stringify(listing).includes(owner),false);
  assert.equal((await createRoom('Outra Sala','',owner)).status,409,'dono não pode criar salas ilimitadas');

  const beforeOwner=await join({name:'IntrusoVerde',roomId:privateRoom.room.id,password:'CajadoVerde!2026'});
  clients.push(beforeOwner.socket);
  assert.equal(beforeOwner.result.code,'room_pending','apenas o criador pode ativar a sala inicialmente');
  const invitee=await join({name:'GuardiaoVerde',roomId:privateRoom.room.id,password:'CajadoVerde!2026',token:otherOwner});
  clients.push(invitee.socket);assert.equal(invitee.result.type,'welcome');
  assert.equal(invitee.result.room.id,privateRoom.room.id);
  assert.equal(invitee.result.online,1);
  const bad=await join({name:'IntrusoVerde',roomId:privateRoom.room.id,password:'incorreta'});
  clients.push(bad.socket);
  assert.equal(bad.result.code,'wrong_room_password');
  const publicPlayer=await join({name:'ExploradorVerde',roomId:publicRoom.room.id,token:owner});
  clients.push(publicPlayer.socket);assert.equal(publicPlayer.result.type,'welcome');
  assert.equal(publicPlayer.result.online,1);
  assert.equal(publicPlayer.result.room.id,publicRoom.room.id);
  publicPlayer.socket.send(JSON.stringify({type:'chat',channel:'global',text:'Boa jornada nesta sala!'}));
  await delay(380);
  assert.ok(!invitee.messages.some(x=>x.type==='chat'&&x.text==='Boa jornada nesta sala!'),
   'chat entre servidores não pode vazar');
  assert.ok(!publicPlayer.messages.some(x=>x.type==='snapshot'&&x.players.some(p=>p.name==='GuardiaoVerde')),
   'personagens em servidores distintos não podem aparecer uns para os outros');
  listing=await(await fetch(BASE+'/api/rooms')).json();
  assert.equal(listing.totalOnline,2);
  assert.equal(listing.rooms.find(x=>x.id===publicRoom.room.id).online,1);
  assert.equal(listing.rooms.find(x=>x.id===privateRoom.room.id).online,1);

  const roomMembers=[publicPlayer];
  for(let i=0;i<59;i++){
   const c=await join({name:'GuerreiroSala'+i,roomId:publicRoom.room.id});
   clients.push(c.socket);roomMembers.push(c);
   assert.equal(c.result.type,'welcome');
  }
  const tooMany=await join({name:'JogadorExtra',roomId:publicRoom.room.id});
  clients.push(tooMany.socket);
  assert.equal(tooMany.result.code,'room_full');
  const another=await join({name:'NovoMembro',roomId:privateRoom.room.id,password:'CajadoVerde!2026'});
  clients.push(another.socket);
  assert.equal(another.result.type,'welcome','outra sala mantém vagas livres');
  const status=await(await fetch(BASE+'/api/status')).json();
  assert.equal(status.online,62);
  assert.equal(status.rooms,3);
  assert.equal(status.capacityPerRoom,60);
  assert.equal(status.maxPlayers,60);
  roomMembers[59].socket.close();
  await delay(220);
  const recovered=await join({name:'SubstitutoSala',roomId:publicRoom.room.id});
  clients.push(recovered.socket);
  assert.equal(recovered.result.type,'welcome');
  assert.equal(recovered.result.online,60);
  // Desconectando todos, nenhum servidor de 0/10 deve continuar listado.
  for(const c of clients)try{c.close()}catch{}
  await delay(380);
  listing=await(await fetch(BASE+'/api/rooms')).json();
  assert.deepEqual(listing.rooms.map(room=>room.id),['auren-publica']);
  assert.equal(listing.totalOnline,0);
  const rebuilt=await createRoom('Arvore de Auren','',owner);
  assert.equal(rebuilt.status,201,'a sala vazia precisa liberar seu nome imediatamente');
  assert.equal((await(await fetch(BASE+'/api/rooms')).json()).rooms.length,1,
   'a reserva recém-criada continua oculta até o criador entrar');
 }finally{
  for(const c of clients)try{c.close()}catch{}
  worker.kill('SIGTERM');
  await Promise.race([new Promise(done=>worker.once('exit',done)),delay(5500)]);
  if(worker.exitCode===null)worker.kill('SIGKILL');
  fs.rmSync(dir,{recursive:true,force:true});
 }
 assert.doesNotMatch(stderr,/UnhandledPromiseRejection|SyntaxError|ReferenceError/);
});

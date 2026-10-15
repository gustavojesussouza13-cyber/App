'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {RoomHub,MAIN_ID,MAX_PER_ROOM}=require('../room-hub');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function fixture(){
 const world=()=>({count:0,players:new Map(),stop(){}});
 return new RoomHub({mainWorld:world(),createWorld:world});
}
test('salas criadas com qualquer payload de senha sempre se tornam públicas',()=>{
 const hub=fixture();
 const payloads=[undefined,'','123','abcdef','a'.repeat(80)];
 payloads.forEach((password,i)=>{
  const created=hub.create({name:'Sala Teste '+i,owner:'account:'+i,password});
  assert.equal(created.locked,false);
  const internal=hub.get(created.id);
  assert.equal(internal.hash,undefined);
  assert.equal(internal.salt,undefined);
  assert.equal(internal.password,undefined);
  assert.equal(hub.check(created.id,'senha-indiferente',{uid:'account:outro'}),internal);
 });
 hub.close();
});
test('qualquer jogador entra sem senha; lotação e encerramento da sala continuam obrigatórios',()=>{
 const hub=fixture();
 const created=hub.create({name:'Sala Aberta',owner:'account:fundador',password:'segredo'});
 const room=hub.get(created.id);
 assert.equal(hub.check(created.id,undefined,{uid:'account:convidado'}),room,
   'até o primeiro participante não exige senha nem ser fundador');
 room.world.count=59;hub.entered(room);
 assert.ok(hub.list().some(s=>s.id===created.id&&s.locked===false));
 assert.equal(hub.check(created.id,'',{uid:'account:outro'}),room);
 room.world.count=MAX_PER_ROOM;
 assert.throws(()=>hub.check(created.id,undefined,{uid:'account:naovaga'}),e=>e.code==='room_full');
 room.world.count=0;hub.left(room);
 assert.equal(hub.get(created.id),undefined);
 assert.deepEqual(hub.list().map(s=>s.id),[MAIN_ID]);
 hub.close();
});
test('servidor ignora passwords de sala e preserva somente senha de contas cadastradas',()=>{
 const hub=read('room-hub.js'),server=read('server.js');
 assert.match(server,/rooms\.create\(\{name:body\.name,owner:creator\}\)/);
 assert.match(server,/rooms\.check\(requestedId,null,\{uid\}\)/);
 assert.match(server,/rooms\.check\(id,null,\{uid:player\.uid\}\)/);
 assert.doesNotMatch(server,/roomPasswordFails|roomAttemptKey|wrong_room_password/);
 assert.doesNotMatch(hub,/hashPassword|timingSafeEqual|room\.locked\)/);
 assert.match(server,/verifyPassword|password/,'senha de conta ainda deve funcionar');
});
test('interface e documentação não oferecem criação ou entrada de sala privada',()=>{
 const html=read('public/mundo.html'),client=read('public/mmo.js'),
  guide=read('public/guia.html'),home=read('public/index.html');
 for(const id of ['roomJoinPassword','newRoomPassword','roomSwitchPassword','roomSwitchNewPassword'])
  assert.doesNotMatch(html,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(client,/selectedRoomPassword|roomPassword|\.locked\b|roomSwitchNewPassword|newRoomPassword/);
 assert.doesNotMatch(client,/roomPassword:selectedRoomPassword/);
 assert.doesNotMatch(html,/SENHA \(OPCIONAL\)|Salas com cadeado/);
 assert.match(html,/Todas as salas são públicas e não possuem senha/);
 assert.match(guide,/Todas as salas são públicas e não possuem senha/);
 assert.match(home,/salas totalmente públicas, sem senha/);
 assert.match(html,/mmo\.js\?v=chat-drawer-v1/);
});

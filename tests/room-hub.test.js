'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {RoomHub,RoomError,MAIN_ID,MAX_PER_ROOM,MAX_ROOMS,IDLE_MS,ownerId}=require('../room-hub');
const {World}=require('../world-engine');

function fakeHub(){
 let time=1000,stopped=0;
 const world=()=>({count:0,players:new Map(),stop(){stopped++}});
 const hub=new RoomHub({mainWorld:world(),createWorld:world,now:()=>time,maxRooms:12});
 return {hub,world,tick(ms){time+=ms},get stopped(){return stopped}};
}
test('a praça pública existe sem senha; salas dos jogadores têm capacidade de dez',()=>{
 const h=fakeHub();
 assert.deepEqual(h.hub.list(),[{id:MAIN_ID,name:'Auren — Praça Pública',online:0,capacity:10,locked:false,primary:true}]);
 const room=h.hub.create({name:'Cavaleiros da Aurora',password:'',owner:'account:alpha'});
 assert.equal(room.capacity,MAX_PER_ROOM);assert.equal(room.locked,false);
 assert.equal(h.hub.check(room.id,'').id,room.id);
 assert.equal(h.hub.list().length,2);
 assert.equal(h.hub.count(),0);
 assert.equal(h.hub.get(room.id).ownerId,'account:alpha');
});
test('uma sala privada nunca revela a senha e rejeita acessos incorretos',()=>{
 const h=fakeHub();
 const r=h.hub.create({name:'Salão Guardião',password:'secreto42',owner:'account:bravo'});
 const publicInfo=h.hub.list().find(x=>x.id===r.id);
 assert.equal(publicInfo.locked,true);
 assert.ok(!JSON.stringify(publicInfo).includes('secreto42'));
 assert.ok(!JSON.stringify(publicInfo).includes('bravo'));
 assert.equal(h.hub.get(r.id).password,undefined);
 assert.throws(()=>h.hub.check(r.id,'outra'),e=>e.code==='wrong_room_password'&&e.status===403);
 assert.throws(()=>h.hub.check(r.id,''),e=>e.code==='wrong_room_password');
 assert.equal(h.hub.check(r.id,'secreto42').id,r.id);
});
test('não aceitar nomes inadequados, duplicados, senhas curtas nem salas ilimitadas',()=>{
 const h=fakeHub();
 assert.throws(()=>h.hub.create({name:'ab',owner:'account:a'}),e=>e.code==='invalid_room');
 assert.throws(()=>h.hub.create({name:'<img>',owner:'account:a'}),e=>e.code==='invalid_room');
 assert.throws(()=>h.hub.create({name:'Novo Reino',password:'123',owner:'account:a'}),e=>e.code==='invalid_password');
 h.hub.create({name:'Novo Reino',owner:'account:a'});
 assert.throws(()=>h.hub.create({name:'novo reino',owner:'account:b'}),e=>e.code==='room_name_taken');
 assert.throws(()=>h.hub.create({name:'Outra Sala',owner:'account:a'}),e=>e.code==='owner_has_room');
 for(let i=1;i<11;i++)h.hub.create({name:'Sala '+i,owner:'account:'+i});
 assert.equal(h.hub.list().length,12);
 assert.throws(()=>h.hub.create({name:'Sala Lotada',owner:'account:extra'}),e=>e.code==='rooms_full');
});
test('capacidade é por sala, sem esgotar a capacidade de salas distintas',()=>{
 const h=fakeHub();
 const a=h.hub.create({name:'Sala Sol',owner:'account:a'});
 const b=h.hub.create({name:'Sala Lua',owner:'account:b'});
 h.hub.get(a.id).world.count=10;
 h.hub.get(b.id).world.count=3;
 assert.equal(h.hub.count(),13);
 assert.throws(()=>h.hub.check(a.id,''),e=>e.code==='room_full');
 assert.equal(h.hub.check(b.id,'').id,b.id);
 assert.equal(h.hub.check(MAIN_ID,'').id,MAIN_ID);
 h.hub.get(a.id).world.players.set('active',{uid:'account:a'});
 assert.equal(h.hub.check(a.id,'',{uid:'account:a'}).id,a.id,'reconexão do próprio jogador não deve falhar por lotação');
});
test('salas sem jogadores são fechadas após dez minutos; sala principal fica sempre aberta',()=>{
 const h=fakeHub();
 const created=h.hub.create({name:'Sala Temporária',owner:'account:a'});
 h.tick(IDLE_MS-1);h.hub.clean();assert.ok(h.hub.get(created.id));
 h.tick(2);h.hub.clean();assert.equal(h.hub.get(created.id),undefined);
 assert.equal(h.stopped,1);
 assert.ok(h.hub.get(MAIN_ID));
 const newRoom=h.hub.create({name:'Sala Temporária',owner:'account:a'});
 h.hub.get(newRoom.id).world.count=2;
 h.hub.entered(h.hub.get(newRoom.id));h.tick(IDLE_MS*2);h.hub.clean();
 assert.ok(h.hub.get(newRoom.id));
 h.hub.get(newRoom.id).world.count=0;h.hub.left(h.hub.get(newRoom.id));
 h.tick(IDLE_MS+1);h.hub.clean();assert.equal(h.hub.get(newRoom.id),undefined);
});
test('titularidade de conta não depende do nome; token anônimo é secreto e não exposto',()=>{
 const token=crypto.randomBytes(32).toString('hex');
 const u=ownerId({token}),v=ownerId({token}),other=ownerId({token:crypto.randomBytes(32).toString('hex')});
 assert.equal(u,v);
 assert.notEqual(u,other);
 assert.ok(!u.includes(token));
 assert.equal(ownerId({uid:'account:1234',token}),'account:1234');
 assert.equal(ownerId({token:'abc'}),null);
});
test('criaturas e chefes de salas distintas têm estado próprio',t=>{
 const events=[];
 const common={send:(socket,event)=>events.push({socket,event}),getOnline:()=>0,hasClassicName:()=>false,persistentStore:{enqueue(){}}};
 const a=new World(common),b=new World(common);
 t.after(()=>{a.stop();b.stop()});
 assert.equal(a.monsters.get(0).length,b.monsters.get(0).length);
 const m=a.monsters.get(0)[0],n=b.monsters.get(0)[0];
 assert.notStrictEqual(m,n);
 m.hp=1;m.deadUntil=123;m.aggroTarget='player-a';
 assert.equal(n.hp,n.maxHp);
 assert.equal(n.deadUntil,0);assert.equal(n.aggroTarget,null);
});

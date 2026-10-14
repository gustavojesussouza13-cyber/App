'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {RoomHub,RoomError,MAIN_ID,MAX_PER_ROOM,MAX_ROOMS,PENDING_MS,ownerId}=require('../room-hub');
const {World}=require('../world-engine');

function fakeHub(){
 let time=1000,stopped=0;
 const world=()=>({count:0,players:new Map(),stop(){stopped++}});
 const hub=new RoomHub({mainWorld:world(),createWorld:world,now:()=>time,maxRooms:12});
 return {hub,world,tick(ms){time+=ms},get stopped(){return stopped}};
}
test('a praça pública e todas as salas dos jogadores são públicas para até 60',()=>{
 const h=fakeHub();
 assert.deepEqual(h.hub.list(),[{id:MAIN_ID,name:'Auren — Praça Pública',online:0,capacity:60,locked:false,primary:true}]);
 const room=h.hub.create({name:'Cavaleiros da Aurora',password:'',owner:'account:alpha'});
 assert.equal(room.capacity,MAX_PER_ROOM);assert.equal(room.locked,false);
 assert.equal(h.hub.list().length,1,'salas vazias não aparecem no catálogo');
 assert.equal(h.hub.check(room.id,'').id,room.id,'uma sala pública permite entrada mesmo antes do criador');
 assert.equal(h.hub.check(room.id,'',{owner:'account:alpha'}).id,room.id);
 h.hub.get(room.id).world.count=1;h.hub.entered(h.hub.get(room.id));
 assert.equal(h.hub.list().length,2);
 assert.equal(h.hub.count(),1);
 assert.equal(h.hub.get(room.id).ownerId,'account:alpha');
});
test('senhas recebidas no pedido são ignoradas: todas as salas permanecem públicas',()=>{
 const h=fakeHub();
 const room=h.hub.create({name:'Salão Guardião',password:'secreto42',owner:'account:bravo'});
 assert.equal(room.locked,false);
 assert.equal(h.hub.get(room.id).locked,false);
 assert.equal(h.hub.get(room.id).hash,undefined);
 assert.equal(h.hub.get(room.id).salt,undefined);
 assert.equal(h.hub.check(room.id,'qualquer senha',{uid:'account:alguem'}).id,room.id);
 assert.equal(h.hub.check(room.id,undefined,{uid:'account:outro'}).id,room.id);
 h.hub.get(room.id).world.count=1;h.hub.entered(h.hub.get(room.id));
 assert.equal(h.hub.list().find(x=>x.id===room.id).locked,false);
 assert.ok(!JSON.stringify(h.hub.list()).includes('secreto42'));
});
test('não aceitar nomes inadequados ou duplicados e respeitar os limites de salas',()=>{
 const h=fakeHub();
 assert.throws(()=>h.hub.create({name:'ab',owner:'account:a'}),e=>e.code==='invalid_room');
 assert.throws(()=>h.hub.create({name:'<img>',owner:'account:a'}),e=>e.code==='invalid_room');
 assert.equal(h.hub.create({name:'Novo Reino',password:'123',owner:'account:a'}).locked,false);
 assert.throws(()=>h.hub.create({name:'novo reino',owner:'account:b'}),e=>e.code==='room_name_taken');
 assert.throws(()=>h.hub.create({name:'Outra Sala',owner:'account:a'}),e=>e.code==='owner_has_room');
 for(let i=1;i<11;i++)h.hub.create({name:'Sala '+i,owner:'account:'+i});
 assert.equal(h.hub.rooms.size,12,'salas pendentes também ocupam vagas de criação');
 assert.equal(h.hub.list().length,1,'salas pendentes não aparecem como 0/60');
 assert.throws(()=>h.hub.create({name:'Sala Lotada',owner:'account:extra'}),e=>e.code==='rooms_full');
});
test('capacidade é por sala, sem esgotar a capacidade de salas distintas',()=>{
 const h=fakeHub();
 const a=h.hub.create({name:'Sala Sol',owner:'account:a'});
 const b=h.hub.create({name:'Sala Lua',owner:'account:b'});
 h.hub.get(a.id).world.count=60;h.hub.entered(h.hub.get(a.id));
 h.hub.get(b.id).world.count=3;h.hub.entered(h.hub.get(b.id));
 assert.equal(h.hub.count(),63);
 assert.throws(()=>h.hub.check(a.id,''),e=>e.code==='room_full');
 assert.equal(h.hub.check(b.id,'').id,b.id);
 assert.equal(h.hub.check(MAIN_ID,'').id,MAIN_ID);
 h.hub.get(a.id).world.players.set('active',{uid:'account:a'});
 assert.equal(h.hub.check(a.id,'',{uid:'account:a'}).id,a.id,'reconexão do próprio jogador não deve falhar por lotação');
});
test('salas personalizadas desaparecem assim que o último jogador sai',()=>{
 const h=fakeHub(),created=h.hub.create({name:'Sala Temporária',owner:'account:a'});
 const pending=h.hub.get(created.id);
 assert.equal(h.hub.list().length,1,'sala criada com zero jogadores não aparece');
 pending.world.count=2;h.hub.entered(pending);
 assert.equal(h.hub.list().length,2);
 pending.world.count=1;h.hub.left(pending);
 assert.ok(h.hub.get(created.id),'sala com jogadores continua');
 pending.world.count=0;h.hub.left(pending);
 assert.equal(h.hub.get(created.id),undefined,'sala vazia não pode permanecer');
 assert.deepEqual(h.hub.list().map(r=>r.id),[MAIN_ID]);
 assert.equal(h.stopped,1);
});
test('reserva vazia fica invisível e desaparece após sessenta segundos',()=>{
 const h=fakeHub(),created=h.hub.create({name:'Convite Pendente',owner:'account:a'});
 assert.equal(h.hub.list().length,1);
 assert.equal(h.hub.check(created.id,'',{owner:'account:a'}).id,created.id);
 assert.equal(h.hub.check(created.id,'',{owner:'account:b'}).id,created.id,'qualquer jogador pode entrar numa sala pública pendente');
 h.tick(PENDING_MS-1);h.hub.clean();assert.ok(h.hub.get(created.id));
 h.tick(2);h.hub.clean();assert.equal(h.hub.get(created.id),undefined);
 assert.equal(h.stopped,1);
 assert.ok(h.hub.get(MAIN_ID));
});
test('o nome e a vaga ficam disponíveis imediatamente após o último sair',()=>{
 const h=fakeHub(),first=h.hub.create({name:'Auren1',owner:'account:criador'});
 const active=h.hub.get(first.id);active.world.count=1;h.hub.entered(active);
 active.world.count=0;h.hub.left(active);
 assert.ok(!h.hub.list().some(r=>r.name==='Auren1'));
 const next=h.hub.create({name:'Auren1',owner:'account:criador'});
 assert.notEqual(next.id,first.id);
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

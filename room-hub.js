'use strict';
/** Salas virtuais em uma única instância Render: instâncias de mundo isoladas. */
const crypto=require('node:crypto');
const MAX_PER_ROOM=60,MAX_ROOMS=12,PENDING_MS=60*1000;
const MAIN_ID='auren-publica';
const idFor=()=>crypto.randomBytes(9).toString('hex');
const normalized=title=>typeof title==='string'?title.trim().normalize('NFC'):'';
function validRoomName(name){
 return name.length>=3&&name.length<=32&&/^[\p{L}\p{N}][\p{L}\p{N} _'-]*$/u.test(name);
}
function ownerId({uid,token}={}){
 if(typeof uid==='string'&&uid.startsWith('account:'))return uid;
 if(typeof token==='string'&&/^[a-f0-9]{64}$/i.test(token))
  return 'guest:'+crypto.createHash('sha256').update(token).digest('hex');
 return null;
}
class RoomError extends Error{
 constructor(message,code,status=400){super(message);this.code=code;this.status=status}
}
class RoomHub{
 constructor({mainWorld,createWorld,maxRooms=MAX_ROOMS,now=()=>Date.now()}){
  this.now=now;this.createWorld=createWorld;
  this.maxRooms=Math.max(2,Math.min(24,maxRooms));
  this.rooms=new Map();
  this.rooms.set(MAIN_ID,{id:MAIN_ID,name:'Auren — Praça Pública',
   ownerId:null,locked:false,world:mainWorld,createdAt:now(),emptySince:null,primary:true});
 }
 get(id){return this.rooms.get(id)}
 count(){let n=0;for(const room of this.rooms.values())n+=room.world.count;return n}
 publicInfo(room){return {id:room.id,name:room.name,online:room.world.count,capacity:MAX_PER_ROOM,
  locked:false,primary:!!room.primary};}
 list(){
  this.clean();
  // As salas só são anunciadas quando possuem participantes. A sala
  // criada mas ainda não ocupada fica invisível até a primeira entrada.
  // Nunca listar servidores vazios.
  return [...this.rooms.values()].filter(room=>room.primary||room.world.count>0)
   .map(room=>this.publicInfo(room));
 }
 create({name,owner}){
  this.clean();
  if(this.rooms.size>=this.maxRooms)throw new RoomError('Limite de salas simultâneas atingido. Aguarde uma vaga.','rooms_full',409);
  const title=normalized(name);
  if(!validRoomName(title))throw new RoomError('Dê à sala um nome de 3 a 32 caracteres.','invalid_room');
  if([...this.rooms.values()].some(r=>r.name.toLocaleLowerCase('pt-BR')===title.toLocaleLowerCase('pt-BR')))
   throw new RoomError('Já existe uma sala com este nome.','room_name_taken',409);
  if(!owner)throw new RoomError('Identifique seu personagem antes de criar uma sala.','owner_required',401);
  if([...this.rooms.values()].some(r=>r.ownerId===owner))
   throw new RoomError('Cada criador pode manter uma sala ativa por vez.','owner_has_room',409);
  // Todas as salas criadas pelos jogadores são públicas, sem senha ou chave de acesso.
  const room={id:idFor(),name:title,ownerId:owner,locked:false,createdAt:this.now(),
   world:this.createWorld(),emptySince:this.now(),pending:true,primary:false};
  this.rooms.set(room.id,room);
  return this.publicInfo(room);
 }
 check(id,_unusedPassword,{uid=null}={}){
  this.clean();
  const room=this.rooms.get(id);
  if(!room)throw new RoomError('Esta sala não existe mais. Escolha outra.','room_missing',404);
  // A sala recém-criada não é listada até a primeira entrada, mas qualquer
  // jogador com o ID pode participar, inclusive antes de seu criador.
  const replacing=uid&&[...room.world.players.values()].some(p=>p.uid===uid);
  if(room.world.count>=MAX_PER_ROOM&&!replacing)throw new RoomError('Sala cheia: 60/60 jogadores.','room_full',409);
  return room;
 }
 entered(room){
  if(!room||!this.rooms.has(room.id))return;
  room.pending=false;room.emptySince=null;
 }
 remove(room){
  if(!room||room.primary||this.rooms.get(room.id)!==room)return false;
  // Apagar a sala do catálogo ANTES do encerramento impede qualquer
  // entrada numa sala vazia durante a gravação do progresso das contas.
  this.rooms.delete(room.id);
  room.world.stop();
  return true;
 }
 left(room){
  if(!room||room.primary)return;
  if(room.world.count===0&&!room.pending)this.remove(room);
 }
 clean(){
  const now=this.now();
  for(const room of [...this.rooms.values()]){
   if(room.primary||room.world.count!==0)continue;
   if((room.pending&&now-room.createdAt>=PENDING_MS)||!room.pending)this.remove(room);
  }
 }
 allWorlds(){return [...this.rooms.values()].map(r=>r.world)}
 close(){for(const r of this.rooms.values())r.world.stop();this.rooms.clear()}
}
module.exports={RoomHub,RoomError,MAIN_ID,MAX_PER_ROOM,MAX_ROOMS,PENDING_MS,ownerId,validRoomName};

'use strict';
/** Salas virtuais em uma única instância Render: instâncias de mundo isoladas. */
const crypto=require('node:crypto');
const MAX_PER_ROOM=10,MAX_ROOMS=12,IDLE_MS=10*60*1000;
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
function hashPassword(password,salt){
 return crypto.scryptSync(password,salt,32);
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
   ownerId:null,locked:false,salt:null,hash:null,world:mainWorld,createdAt:now(),emptySince:null,primary:true});
 }
 get(id){return this.rooms.get(id)}
 count(){let n=0;for(const room of this.rooms.values())n+=room.world.count;return n}
 publicInfo(room){return {id:room.id,name:room.name,online:room.world.count,capacity:MAX_PER_ROOM,
  locked:room.locked,primary:!!room.primary};}
 list(){
  this.clean();
  return [...this.rooms.values()].map(room=>this.publicInfo(room));
 }
 create({name,password,owner}){
  this.clean();
  if(this.rooms.size>=this.maxRooms)throw new RoomError('Limite de salas simultâneas atingido. Aguarde uma vaga.','rooms_full',409);
  const title=normalized(name);
  if(!validRoomName(title))throw new RoomError('Dê à sala um nome de 3 a 32 caracteres.','invalid_room');
  if([...this.rooms.values()].some(r=>r.name.toLocaleLowerCase('pt-BR')===title.toLocaleLowerCase('pt-BR')))
   throw new RoomError('Já existe uma sala com este nome.','room_name_taken',409);
  if(!owner)throw new RoomError('Identifique seu personagem antes de criar uma sala.','owner_required',401);
  if([...this.rooms.values()].some(r=>r.ownerId===owner))
   throw new RoomError('Cada criador pode manter uma sala ativa por vez.','owner_has_room',409);
  if(typeof password!=='string')password='';
  if(password&&(password.length<4||password.length>64))
   throw new RoomError('Use uma senha de 4 a 64 caracteres.','invalid_password');
  const salt=password?crypto.randomBytes(16):null;
  const room={id:idFor(),name:title,ownerId:owner,locked:!!password,salt,
   hash:password?hashPassword(password,salt):null,createdAt:this.now(),
   world:this.createWorld(),emptySince:this.now(),primary:false};
  this.rooms.set(room.id,room);
  return this.publicInfo(room);
 }
 check(id,password){
  const room=this.rooms.get(id);
  if(!room)throw new RoomError('Esta sala não existe mais. Escolha outra.','room_missing',404);
  if(room.world.count>=MAX_PER_ROOM)throw new RoomError('Sala cheia: 10/10 jogadores.','room_full',409);
  if(room.locked){
   if(typeof password!=='string'||password.length>64)
    throw new RoomError('Senha da sala incorreta.','wrong_room_password',403);
   const digest=hashPassword(password,room.salt);
   if(!crypto.timingSafeEqual(digest,room.hash))
    throw new RoomError('Senha da sala incorreta.','wrong_room_password',403);
  }
  return room;
 }
 entered(room){room.emptySince=null}
 left(room){if(room&&!room.primary&&room.world.count===0)room.emptySince=this.now()}
 clean(){
  const now=this.now();
  for(const [id,room] of this.rooms){
   if(room.primary||room.world.count!==0||room.emptySince===null||now-room.emptySince<IDLE_MS)continue;
   room.world.stop();this.rooms.delete(id);
  }
 }
 allWorlds(){return [...this.rooms.values()].map(r=>r.world)}
 close(){for(const r of this.rooms.values())r.world.stop();this.rooms.clear()}
}
module.exports={RoomHub,RoomError,MAIN_ID,MAX_PER_ROOM,MAX_ROOMS,IDLE_MS,ownerId,validRoomName};

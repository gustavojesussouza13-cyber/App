'use strict';
// Two-player rooms for the standalone Android V6.6 campaign. No player credentials
// and no database writes: campaign progress remains local to each Android app.
const crypto=require('node:crypto');
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const bounded=(n,a,b)=>Math.max(a,Math.min(b,n));
const integer=(x)=>Number.isInteger(x)?x:null;
const maxChapter=5;
const countEnemies=ch=>14+ch*2; // 13 + chapter*2 common enemies, plus boss
const maxHp=(ch,i)=>i===13+ch*2?32+ch*13:5+ch*2;
class MobileCoop {
 constructor({send,maxRooms=5,canJoin=()=>true,now=()=>Date.now(),randInt=crypto.randomInt}={}){
  this.send=send;this.maxRooms=maxRooms;this.canJoin=canJoin;this.now=now;this.randInt=randInt;this.rooms=new Map();
 }
 roomCode(){for(let t=0;t<40;t++){let s='';for(let i=0;i<6;i++)s+=ALPHABET[this.randInt(ALPHABET.length)];if(!this.rooms.has(s))return s;}return null;}
 enemies(ch){return Array.from({length:countEnemies(ch)},(_,i)=>({hp:maxHp(ch,i),max:maxHp(ch,i),alive:true,x:null,y:null}));}
 view(room){return {type:'room',code:room.code,host:room.hostId,chapter:room.chapter,members:[...room.members.values()].map(p=>({id:p.id,name:p.name,x:p.x,y:p.y,dir:p.dir,step:p.step,attack:p.attack,shield:p.shield}))};}
 publish(room,msg,except){for(const p of room.members.values())if(p.client!==except)this.send(p.client,msg);}
 error(c,code,message){this.send(c,{type:'error',code,message});}
 receive(c,msg){
  if(!msg||typeof msg!=='object'||Array.isArray(msg))return;
  if(!c.mobilePlayer){if(msg.type==='create'||msg.type==='join')this.join(c,msg);else this.error(c,'join_first','Escolha Criar sala ou Entrar na sala.');return;}
  const p=c.mobilePlayer,room=this.rooms.get(p.room);
  if(!room||room.members.get(p.id)!==p)return;
  const t=this.now();p.lastSeen=t;
  switch(msg.type){
   case 'state':{
    if(t-p.lastState<65)return;
    const x=Number(msg.x),y=Number(msg.y);
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const clx=bounded(x,18,1300),cly=bounded(y,20,1000);
    if(p.lastState!==0){const dt=Math.min(1,(t-p.lastState)/1000),max=180*dt+15,dist=Math.hypot(clx-p.x,cly-p.y);if(dist>max){p.x+=((clx-p.x)/dist)*max;p.y+=((cly-p.y)/dist)*max;}else{p.x=clx;p.y=cly;}}
    else{p.x=clx;p.y=cly;}
    p.dir=integer(msg.dir)!==null?bounded(msg.dir,0,3):2;
    p.step=Number.isFinite(msg.step)?bounded(msg.step,0,200000):0;
    p.attack=!!msg.attack;p.shield=!!msg.shield;p.lastState=t;
    this.publish(room,{type:'player',player:{id:p.id,name:p.name,x:Math.round(p.x),y:Math.round(p.y),dir:p.dir,step:p.step,attack:p.attack,shield:p.shield}},c);
    break;
   }
   case 'enemies':{
    if(room.hostId!==p.id||t-room.lastEnemies<120||!Array.isArray(msg.items))return;
    room.lastEnemies=t;
    for(const e of msg.items.slice(0,room.enemies.length)){
     if(!e||integer(e.i)===null||e.i<0||e.i>=room.enemies.length)continue;
     const target=room.enemies[e.i],x=Number(e.x),y=Number(e.y);
     if(!Number.isFinite(x)||!Number.isFinite(y))continue;
     if(target.x!==null){const max=80*Math.min(2,(t-(target.lastMove||t))/1000)+16;
      if(Math.hypot(x-target.x,y-target.y)>max)continue;
     }
     target.x=bounded(x,8,1300);target.y=bounded(y,8,1000);target.lastMove=t;
    }
    this.publish(room,{type:'enemies',items:room.enemies.map((e,i)=>({i,x:e.x,y:e.y,hp:e.hp,alive:e.alive})).filter(e=>e.x!==null)},c);
    break;
   }
   case 'hit':{
    const i=integer(msg.i),damage=integer(msg.damage);
    if(i===null||i<0||i>=room.enemies.length||damage===null||damage<1||damage>35||t-p.lastHit<290)return;
    const target=room.enemies[i];if(!target.alive||target.x===null||p.lastState===0)return;
    if(Math.hypot(target.x-p.x,target.y-p.y)>(i===room.enemies.length-1?58:45))return;
    p.lastHit=t;target.hp=Math.max(0,target.hp-damage);target.alive=target.hp>0;
    this.publish(room,{type:'enemy_hit',i,hp:target.hp,alive:target.alive,damage,by:p.id},null);
    if(!target.alive){if(i===room.enemies.length-1)room.bossDead=true;
     this.publish(room,{type:'defeat',i,boss:i===room.enemies.length-1,xp:i===room.enemies.length-1?45:8,gold:i===room.enemies.length-1?28:2},null);
    }
    break;
   }
   case 'fragment':{
    const i=integer(msg.i);
    if(i===null||i<0||i>2||room.fragments.has(i))return;
    // The client is near the corresponding collectible; clients also do their own check.
    room.fragments.add(i);this.publish(room,{type:'fragment',i},null);break;
   }
   case 'advance':{
    if(room.chapter>=maxChapter||!room.bossDead||room.fragments.size<3||t-room.lastAdvance<2000)return;
    room.lastAdvance=t;room.chapter++;room.fragments.clear();room.bossDead=false;room.enemies=this.enemies(room.chapter);room.lastEnemies=0;
    for(const player of room.members.values()){player.lastState=0;player.x=0;player.y=0;player.lastHit=0;}
    this.publish(room,{type:'chapter',chapter:room.chapter},null);break;
   }
   case 'ping':this.send(c,{type:'pong',time:t});break;
   case 'leave':this.leave(c);break;
  }
 }
 join(c,msg){
  if(c.mobilePlayer)return;
  if(!this.canJoin()){this.error(c,'server_full','Servidor cheio (limite compartilhado de 10 jogadores).');return;}
  const name=String(msg.name||'').trim().slice(0,18);
  if(!/^[\p{L}\p{N}][\p{L}\p{N} _-]{1,17}$/u.test(name)){this.error(c,'bad_name','Escolha um nome entre 2 e 18 caracteres.');return;}
  let room;
  if(msg.type==='create'){
   if(this.rooms.size>=this.maxRooms){this.error(c,'busy','Salas ocupadas; tente mais tarde.');return;}
   const code=this.roomCode();if(!code){this.error(c,'busy','Não foi possível criar a sala.');return;}
   const chapter=integer(msg.chapter)!==null?bounded(msg.chapter,0,maxChapter):0;
   room={code,chapter,hostId:'',members:new Map(),enemies:this.enemies(chapter),fragments:new Set(),bossDead:false,lastAdvance:0,lastEnemies:0};this.rooms.set(code,room);
  }else{
   const code=String(msg.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');room=this.rooms.get(code);
   if(!room){this.error(c,'unknown_room','Sala não encontrada. Confira o código.');return;}
   if(room.members.size>=2){this.error(c,'room_full','A sala já tem dois jogadores.');return;}
  }
  const id=crypto.randomUUID();const player={id,room:room.code,client:c,name,x:0,y:0,dir:2,step:0,attack:false,shield:false,lastState:0,lastHit:0,lastSeen:this.now()};
  room.members.set(id,player);c.mobilePlayer=player;if(!room.hostId)room.hostId=id;
  this.send(c,{type:'joined',code:room.code,id,host:room.hostId===id,chapter:room.chapter,players:[...room.members.values()].filter(x=>x.id!==id).map(x=>({id:x.id,name:x.name,x:x.x,y:x.y,dir:x.dir,step:x.step})),enemies:room.enemies.map((e,i)=>({i,x:e.x,y:e.y,hp:e.hp,alive:e.alive})),fragments:[...room.fragments],bossDead:room.bossDead});
  this.publish(room,{type:'member_join',id,name,count:room.members.size},c);
  this.publish(room,this.view(room));
 }
 leave(c){
  const p=c.mobilePlayer;if(!p)return;c.mobilePlayer=null;const room=this.rooms.get(p.room);if(!room)return;
  room.members.delete(p.id);this.publish(room,{type:'member_leave',id:p.id,name:p.name,count:room.members.size});
  if(room.hostId===p.id){room.hostId=room.members.keys().next().value||'';this.publish(room,{type:'host',id:room.hostId});}
  if(!room.members.size)this.rooms.delete(room.code);
 }
 getRoomCount(){return this.rooms.size;}
 countPlayers(){let n=0;for(const r of this.rooms.values())n+=r.members.size;return n;}
}
module.exports={MobileCoop, countEnemies, maxHp};

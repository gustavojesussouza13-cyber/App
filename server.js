'use strict';
/** Os Peregrinos — servidor de presença e chat, protótipo multiplayer sem contas. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const MAX_PLAYERS = 80; // protótipo; não é capacidade garantida de produção
const PUBLIC = path.join(__dirname, 'public');
const players = new Map();
const sockets = new Set();
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const decoder = new TextDecoder('utf-8', {fatal:true});

function reply(res, status, body, type='text/plain; charset=utf-8') {
  res.writeHead(status, {'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'SAMEORIGIN'});
  res.end(body);
}
const httpServer = http.createServer((req,res)=>{
  const u = new URL(req.url||'/', 'http://localhost');
  if(req.method !== 'GET') return reply(res,405,'Método não permitido');
  if(u.pathname==='/api/status') return reply(res,200,JSON.stringify({online:players.size,regions:[...new Set([...players.values()].map(p=>p.zone))].length,version:'0.1.0-beta'}),'application/json; charset=utf-8');
  if(u.pathname==='/health') return reply(res,200,'ok');
  const routes={'/':'/index.html','/jogar':'/jogo.html','/jogo':'/jogo.html'};
  let pathname=routes[u.pathname] || u.pathname;
  let decoded;
  try{decoded=decodeURIComponent(pathname)}catch{return reply(res,400,'Rota inválida')}
  const filename=path.resolve(PUBLIC,'.'+decoded);
  if(!(filename===PUBLIC||filename.startsWith(PUBLIC+path.sep)))return reply(res,403,'Acesso negado');
  fs.stat(filename,(err,stat)=>{
    if(err||!stat.isFile())return reply(res,404,'Não encontrado');
    const ext=path.extname(filename).toLowerCase();
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':ext==='.html'?'no-cache':'public, max-age=600','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'SAMEORIGIN'});
    const stream=fs.createReadStream(filename);
    stream.on('error',()=>res.destroy());
    stream.pipe(res);
  });
});

function frame(payload, opcode=1){
  const b=Buffer.isBuffer(payload)?payload:Buffer.from(String(payload),'utf8');
  const hdr=b.length<126?2:b.length<=65535?4:10;
  const out=Buffer.allocUnsafe(hdr+b.length);out[0]=0x80|opcode;
  if(hdr===2)out[1]=b.length;
  else if(hdr===4){out[1]=126;out.writeUInt16BE(b.length,2)}
  else {out[1]=127;out.writeBigUInt64BE(BigInt(b.length),2)}
  b.copy(out,hdr);return out;
}
function send(sock,obj){if(!sock.destroyed && sock.writable){const msg=JSON.stringify(obj);if(sock.writableLength<256*1024)sock.write(frame(msg))}}
function emitAll(obj,except){for(const c of sockets)if(c!==except&&c.profile)send(c.socket,obj)}
function refuse(c,obj){send(c.socket,obj);setTimeout(()=>terminate(c),250).unref()}
function terminate(c){
  if(c.terminated)return;c.terminated=true;
  sockets.delete(c);
  if(c.profile){players.delete(c.profile.id);emitAll({type:'leave',id:c.profile.id,name:c.profile.name,zone:c.profile.zone});}
  try{c.socket.end(frame(Buffer.alloc(0),8))}catch{}
  c.socket.destroy();
}
function validName(name){return typeof name==='string'&&name.trim()===name&&name.length>=3&&name.length<=18&&/^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u.test(name)}
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function join(c,data){
  if(c.profile)return;
  const name=typeof data.name==='string'?data.name.trim().normalize('NFC'):'';
  if(!validName(name)){return refuse(c,{type:'error',code:'invalid_name',message:'Use de 3 a 18 caracteres: letras, números, espaço ou hífen.'})}
  if(players.size>=MAX_PLAYERS){return refuse(c,{type:'error',code:'full',message:'Servidor de testes lotado.'})}
  const token=typeof data.token==='string'&&/^[a-f0-9-]{20,60}$/i.test(data.token)?data.token:'';
  for(const other of sockets)if(other!==c&&other.profile&&other.profile.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')){
    if(token && token===other.profile.token){terminate(other);break;}
    return refuse(c,{type:'error',code:'name_taken',message:'Este nome já está sendo usado agora. Escolha outro nome.'});
  }
  const zone=Number.isInteger(data.zone)?clamp(data.zone,0,5):0;
  const profile={id:crypto.randomUUID(),name,token,zone,x:clamp(Number(data.x)||184,18,1230),y:clamp(Number(data.y)||512,20,810),dir:2,step:0,attack:false,defending:false,joined:Date.now(),lastMove:Date.now(),lastChat:0,lastZone:Date.now()};
  c.profile=profile;players.set(profile.id,profile);
  const current=[...players.values()].filter(p=>p.id!==profile.id&&p.zone===zone).map(publicPlayer);
  send(c.socket,{type:'welcome',id:profile.id,name,online:players.size,zone,players:current});
  emitAll({type:'join',player:publicPlayer(profile),online:players.size},c);
}
function publicPlayer(p){return {id:p.id,name:p.name,zone:p.zone,x:Math.round(p.x),y:Math.round(p.y),dir:p.dir,step:p.step,attack:p.attack,defending:p.defending}}
function receive(c,data){
  if(!data||typeof data!=='object'||Array.isArray(data))return;
  if(!c.profile){if(data.type==='hello')join(c,data);return}
  const p=c.profile;
  if(data.type==='state'){
    const now=Date.now();if(now-p.lastMove<45)return;
    let zone=Number(data.zone);
    if(Number.isInteger(zone)&&zone>=0&&zone<=5&&zone!==p.zone && now-p.lastZone>1000){p.zone=zone;p.lastZone=now;p.x=clamp(Number(data.x)||184,18,1230);p.y=clamp(Number(data.y)||512,20,810)}
    const x=Number(data.x),y=Number(data.y);
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const dt=Math.min(1.5,(now-p.lastMove)/1000),limit=160*dt+18;
    const dx=x-p.x,dy=y-p.y,dist=Math.hypot(dx,dy);
    if(dist>limit){p.x+=dx/dist*limit;p.y+=dy/dist*limit}
    else{p.x=x;p.y=y}
    p.x=clamp(p.x,18,1230);p.y=clamp(p.y,20,810);
    p.dir=Number.isInteger(data.dir)?clamp(data.dir,0,3):2;
    p.step=Number.isFinite(data.step)?clamp(data.step,0,100000):0;
    p.attack=Boolean(data.attack);p.defending=Boolean(data.defending);
    p.lastMove=now;
  } else if(data.type==='chat'){
    const now=Date.now();if(now-p.lastChat<1600)return;
    const msg=typeof data.text==='string'?data.text.replace(/[\u0000-\u001f\u007f]/g,'').trim():'';
    if(msg.length<1||msg.length>160)return;
    p.lastChat=now;emitAll({type:'chat',id:p.id,name:p.name,text:msg,zone:p.zone,time:now});send(c.socket,{type:'chat',id:p.id,name:p.name,text:msg,zone:p.zone,time:now});
  } else if(data.type==='ping')send(c.socket,{type:'pong'});
}
function handleFrame(c,buf){
  c.pending=Buffer.concat([c.pending,buf]);
  if(c.pending.length>8192)return terminate(c);
  while(c.pending.length>=2){
    const a=c.pending[0],b=c.pending[1];const fin=(a&0x80)!==0,opcode=a&0x0f,masked=(b&0x80)!==0;
    if(!masked||!fin)return terminate(c); // browser messages must be masked; fragmentation not used by this prototype
    let size=b&0x7f,header=2;
    if(size===126){if(c.pending.length<4)return;size=c.pending.readUInt16BE(2);header=4}
    else if(size===127){if(c.pending.length<10)return;const big=c.pending.readBigUInt64BE(2);if(big>2048n)return terminate(c);size=Number(big);header=10}
    if(size>2048)return terminate(c);
    if(c.pending.length<header+4+size)return;
    const mask=c.pending.subarray(header,header+4),data=Buffer.from(c.pending.subarray(header+4,header+4+size));
    for(let i=0;i<data.length;i++)data[i]^=mask[i&3];
    c.pending=c.pending.subarray(header+4+size);
    if(opcode===8){terminate(c);return}
    if(opcode===9){if(!c.socket.destroyed)c.socket.write(frame(data,10));continue}
    if(opcode===10){c.lastPong=Date.now();continue}
    if(opcode!==1)return terminate(c);
    try{receive(c,JSON.parse(decoder.decode(data)))}catch{ /* mensagem inválida: ignorar */ }
  }
}
httpServer.on('upgrade',(req,socket,head)=>{
  const u=new URL(req.url||'/', 'http://localhost');
  const origin=req.headers.origin;
  try {if(origin&&new URL(origin).host!==req.headers.host){socket.destroy();return}}catch{socket.destroy();return}
  if(u.pathname!=='/ws'||req.headers.upgrade?.toLowerCase()!=='websocket'||!req.headers['sec-websocket-key'])return socket.destroy();
  const key=req.headers['sec-websocket-key'];
  if(!/^[\w+/]{22}==$/.test(key))return socket.destroy();
  const digest=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+digest+'\r\n\r\n');
  const c={socket,profile:null,pending:Buffer.alloc(0),terminated:false,lastPong:Date.now()};sockets.add(c);
  socket.on('data',b=>handleFrame(c,b));socket.on('error',()=>terminate(c));socket.on('end',()=>terminate(c));socket.on('close',()=>terminate(c));
  if(head?.length)handleFrame(c,head);
  setTimeout(()=>{if(!c.profile&&!c.terminated)terminate(c)},8000).unref();
});
setInterval(()=>{
  for(const c of sockets){
    if(c.terminated)continue;
    if(Date.now()-c.lastPong>65000){terminate(c);continue}
    if(!c.socket.destroyed)c.socket.write(frame(Buffer.alloc(0),9));
    if(c.profile){const peers=[...players.values()].filter(p=>p.zone===c.profile.zone&&p.id!==c.profile.id).map(publicPlayer);send(c.socket,{type:'snapshot',players:peers,online:players.size,zone:c.profile.zone})}
  }
},250).unref();
const server=httpServer.listen(PORT,HOST,()=>console.log(`Os Peregrinos online em http://localhost:${PORT}`));
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>{for(const c of sockets)terminate(c);server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),4000).unref()});

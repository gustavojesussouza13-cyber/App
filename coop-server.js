'use strict';
/** Standalone multiplayer server for Gustavo, O Peregrino (Android ONLY). */
const http=require('node:http'),crypto=require('node:crypto');
const {MobileCoop}=require('./mobile-coop');
const HOST=process.env.HOST||'0.0.0.0',PORT=Number(process.env.PORT||3000);
const MAX_FRAME=16384,connections=new Set();
const roomService=new MobileCoop({send:(peer,v)=>{if(!peer.closed)send(peer,1,Buffer.from(JSON.stringify(v)))},maxRooms:12});
const httpServer=http.createServer((req,res)=>{
 if(req.url==='/health'){res.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store'});return res.end('ok')}
 if(req.url==='/'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({game:'Gustavo, O Peregrino',type:'Android-coop-only',roomCapacity:5,rooms:roomService.getRoomCount(),players:roomService.countPlayers()}))}
 res.writeHead(404);res.end('Not found');
});
function packet(op,data){
 const b=Buffer.isBuffer(data)?data:Buffer.from(data);
 const n=b.length<=125?2:b.length<65536?4:10;const out=Buffer.allocUnsafe(n+b.length);out[0]=0x80|op;
 if(n===2)out[1]=b.length;else if(n===4){out[1]=126;out.writeUInt16BE(b.length,2)}else{out[1]=127;out.writeBigUInt64BE(BigInt(b.length),2)}
 b.copy(out,n);return out;
}
function send(c,op,data){if(c.closed||c.socket.destroyed||!c.socket.writable)return;if(c.socket.writableLength>1e6){close(c);return}c.socket.write(packet(op,data))}
function close(c){if(c.closed)return;c.closed=true;connections.delete(c);roomService.leave(c);try{c.socket.end(packet(8,Buffer.alloc(0)))}catch{}c.socket.destroy()}
function processFrames(c,data){
 if(c.closed)return;c.buffer=Buffer.concat([c.buffer,data]);if(c.buffer.length>MAX_FRAME*2){close(c);return}
 while(c.buffer.length>=2){
  const h=c.buffer,op=h[0]&15,masked=!!(h[1]&128),final=!!(h[0]&128);
  if(!masked||!final||(h[0]&0x70)){close(c);return}
  let n=h[1]&127,offset=2;if(n===126){if(h.length<4)return;n=h.readUInt16BE(2);offset=4}
  if(n===127){if(h.length<10)return;const q=h.readBigUInt64BE(2);if(q>BigInt(MAX_FRAME)){close(c);return}n=Number(q);offset=10}
  if(n>MAX_FRAME){close(c);return}if(h.length<offset+4+n)return;
  const mask=h.subarray(offset,offset+4),body=Buffer.from(h.subarray(offset+4,offset+4+n));
  c.buffer=h.subarray(offset+4+n);for(let i=0;i<n;i++)body[i]^=mask[i%4];
  if(op===8){close(c);return}if(op===9){if(n<=125)send(c,10,body);continue}
  if(op===10){c.lastPong=Date.now();continue}
  if(op!==1){close(c);return}
  try{roomService.receive(c,JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body)))}catch{}
 }
}
httpServer.on('upgrade',(req,socket,head)=>{
 const key=String(req.headers['sec-websocket-key']||'');
 if(req.url!=='/coop-ws'||String(req.headers.upgrade||'').toLowerCase()!=='websocket'||req.headers['sec-websocket-version']!=='13'||! /^[A-Za-z0-9+/]{22}==$/.test(key)||connections.size>=80){
  socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');socket.destroy();return;
 }
 const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
 socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
 const c={socket,buffer:Buffer.alloc(0),closed:false,lastPong:Date.now(),created:Date.now()};connections.add(c);
 socket.on('data',b=>processFrames(c,b));socket.on('close',()=>close(c));socket.on('error',()=>close(c));socket.setTimeout(120000,()=>close(c));
 if(head.length)processFrames(c,head);
});
setInterval(()=>{let t=Date.now();for(const c of connections){if(t-c.lastPong>65000||(t-c.created>10000&&!c.mobilePlayer))close(c);else send(c,9,Buffer.alloc(0))}},20000).unref();
if(require.main===module)httpServer.listen(PORT,HOST,()=>console.log('Gustavo Android coop server - up to 5 players per room'));
module.exports={httpServer,roomService};

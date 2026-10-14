'use strict';
/** Os Peregrinos — servidor de presença e chat, protótipo multiplayer sem contas. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');
const {World} = require('./world-engine');
const {RoomHub,RoomError,MAIN_ID,MAX_PER_ROOM,ownerId}=require('./room-hub');
const {MobileCoop} = require('./mobile-coop');
const {ChatGuard,inspectNickname}=require('./chat-safety');
const {AccountStore,AuthError,authCookie,clearCookie,cleanEmail,validEmail}=require('./account-store');
const {MailService}=require('./email-service');
const {MaintenanceNotices}=require('./maintenance-notices');
const {grantOwnerBenefits}=require('./owner-benefits');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const MAX_PLAYERS = 60; // capacidade de cada sala e da campanha clássica
const PUBLIC = path.join(__dirname, 'public');

// Configure PUBLIC_SITE_URL depois de verificar um domínio próprio no Render.
const DEFAULT_SITE_ORIGIN='https://os-peregrinos-online.onrender.com';
function configuredOrigin(raw){
  try{
    if(!raw)return DEFAULT_SITE_ORIGIN;
    const u=new URL(raw);
    if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('origem inválida');
    return u.origin;
  }catch{console.warn('PUBLIC_SITE_URL inválida; utilizando domínio Render');return DEFAULT_SITE_ORIGIN}
}
const SITE_ORIGIN=configuredOrigin(process.env.PUBLIC_SITE_URL);
const SUPPORT_EMAIL=/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(process.env.SUPPORT_EMAIL||'') && (process.env.SUPPORT_EMAIL||'').length<=254 ? process.env.SUPPORT_EMAIL : '';
function contactHtml(){
  if(!SUPPORT_EMAIL)return '<p><strong>Canal reservado em preparação.</strong> O responsável ainda não cadastrou um e-mail de suporte. Não envie dados pessoais pelas Issues públicas. O site disponibilizará o endereço aqui assim que ele for configurado.</p>';
  // Email validado, mas escapamos caracteres para evitar HTML/atributos inesperados.
  const safe=SUPPORT_EMAIL.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  return '<p><strong>Canal privado de atendimento:</strong> <a href="mailto:'+safe+'">'+safe+'</a>. Para pedidos sobre dados pessoais, utilize este e-mail. Evite enviar senhas ou tokens de acesso.</p>';
}
// Enquanto o domínio próprio não for verificado, mantém o endereço Render como canônico.
// Quando o Render receber o novo Host, as URLs públicas passam automaticamente ao novo domínio.
// Host estritamente permitido: não usar valores arbitrários recebidos do navegador.
const OWNED_DOMAIN='cronicasdaaurora.com.br';
function originForRequest(req){
  if(process.env.PUBLIC_SITE_URL)return SITE_ORIGIN;
  const host=String(req.headers.host||'').toLowerCase().split(':')[0];
  if(host===OWNED_DOMAIN||host==='www.'+OWNED_DOMAIN)return 'https://'+OWNED_DOMAIN;
  return SITE_ORIGIN;
}
function renderPublicText(source,req){
  const content=source.replaceAll(DEFAULT_SITE_ORIGIN,originForRequest(req))
   .replaceAll('<!-- PRIVATE_SUPPORT_EMAIL -->',contactHtml());
  // Todos os documentos HTML recebem o aviso global, inclusive homepage,
  // política, guia e mundo aberto. Não interferir nas rotas de arquivos.
  const script='<script defer src="/site-maintenance.js?v=maintenance-v2"></script>';
  return content.includes('</head>')?content.replace('</head>',script+'</head>'):content;
}

const players = new Map();
const classicChatGuard=new ChatGuard({cooldownMs:1600});
// Salas do APK V7, sem alterar os personagens do MMORPG online.
const mobileCoop=new MobileCoop({send:(c,msg)=>send(c.socket,msg),maxRooms:5,canJoin:()=>players.size+world.count+mobileCoop.countPlayers()<MAX_PLAYERS});
const sockets = new Set();
const maintenanceNotices=new MaintenanceNotices();
const MIME = {'.mjs':'application/javascript; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const decoder = new TextDecoder('utf-8', {fatal:true});
const accountStore=process.env.DATABASE_URL?new AccountStore({databaseUrl:process.env.DATABASE_URL}):null;
const world=new World({send,getOnline:()=>0,hasClassicName:name=>[...players.values()].some(p=>p.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')),dataFile:process.env.DATA_FILE||path.join(__dirname,'data','world.sqlite'),autosave:true,persistentStore:accountStore});
const rooms=new RoomHub({mainWorld:world,createWorld:()=>{
 const instance=new World({send,getOnline:()=>0,hasClassicName:name=>[...players.values()].some(p=>p.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')),persistentStore:accountStore||{enqueue:()=>{world.dirty=true;world.persist()}},autosave:false});
 // Uma única fonte para contas, níveis e guildas; criaturas, equipes e
 // colisões permanecem isoladas em cada sala.
 instance.saved=world.saved;
 instance.monsterPersistenceEnabled=false; // salas temporárias evoluem criaturas localmente e não sobrescrevem o mundo permanente.
 instance.guilds=world.guilds;
 instance.day=world.day;
 instance.kingdomTickLeader=false; // Uma campanha se resolve uma vez, mesmo com várias salas.
 // As contas e fortificações pertencem ao continente, não à sala temporária.
 // Persista pelo mundo principal para não perder a última atualização de
 // um guerreiro que estava em outra sala.
 instance.persist=function(){
  for(const p of this.players.values())if(p.isAccount)this.saved.characters[p.uid]={
   ...p.save,
   guild:p.save.guild
  };
  if(this.dirty){world.dirty=true;this.dirty=false}
  return world.persist();
 };
 return instance;
}});
// As guildas/cidades são compartilhadas, mas as conexões estão divididas
// em salas. Quando uma construção termina, avisar a TODAS as salas, inclusive
// quando a Praça Pública estiver vazia.
world.onKingdomResults=finished=>{
 const affected=new Set(finished.map(result=>result.guild));
 for(const room of rooms.rooms.values()){
  if(room.world===world)continue;
  for(const member of room.world.players.values()){
   if(!affected.has(member.save.guild))continue;
   for(const result of finished.filter(r=>r.guild===member.save.guild))
    room.world.send(member.socket,{type:'system',text:result.text});
   room.world.send(member.socket,{
    type:'kingdomState',data:require('./kingdom-politics').publicState(room.world,member)
   });
  }
 }
};
const authRate=new Map();
const mailService=new MailService();
console.info('[e-mail] recuperação de senha: '+(mailService.ready?'pronta':'indisponível; conferir variáveis privadas do Render'));

const mailRate=new Map();
function mailLimited(key){
 const hash=crypto.createHash('sha256').update(String(key)).digest('hex'),now=Date.now();
 if(mailRate.size>4000)for(const [k,v] of mailRate)if(v.until<now)mailRate.delete(k);
 const state=mailRate.get(hash)||{count:0,until:now+60*60*1000,last:0};
 if(now>state.until){state.count=0;state.until=now+60*60*1000;state.last=0}
 const limited=now-state.last<90*1000||state.count>=3;
 if(!limited){state.count++;state.last=now}mailRate.set(hash,state);
 return limited;
}
const jsonResponse=(res,status,data,cookie)=>{
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(cookie)headers['Set-Cookie']=cookie;
 res.writeHead(status,headers);res.end(JSON.stringify(data));
};
function limited(ip){
 const now=Date.now();if(authRate.size>1500)for(const [k,v] of authRate)if(v.until<now)authRate.delete(k);
 const entry=authRate.get(ip)||{count:0,until:now+15*60000};
 if(now>entry.until){entry.count=0;entry.until=now+15*60000}
 entry.count++;authRate.set(ip,entry);return entry.count>16;
}
function bodyJson(req){return new Promise((resolve,reject)=>{
 let size=0,parts=[];
 req.on('data',chunk=>{size+=chunk.length;if(size>2048){reject(new AuthError('Dados de formulário muito longos.',413));req.destroy();return}parts.push(chunk)});
 req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(parts).toString('utf8')))}catch{reject(new AuthError('Dados inválidos.'))}});
 req.on('error',reject);
 })}
async function handleCreateRoom(req,res){
 try{
  if(shuttingDown)return jsonResponse(res,503,{error:'Servidor em manutenção.'});
  if(req.method!=='POST')return jsonResponse(res,405,{error:'Método não permitido.'});
  const origin=req.headers.origin;
  if(origin&&new URL(origin).host!==req.headers.host)throw new RoomError('Origem não permitida.','bad_origin',403);
  if(req.headers['sec-fetch-site']==='cross-site')throw new RoomError('Origem não permitida.','bad_origin',403);
  if(!(req.headers['content-type']||'').startsWith('application/json'))throw new RoomError('Envie dados em JSON.','bad_content',415);
  if(limited(req.socket.remoteAddress||'unknown'))throw new RoomError('Muitas solicitações. Tente depois.','rate_limited',429);
  const body=await bodyJson(req);
  if(!body||typeof body!=='object'||Array.isArray(body))throw new RoomError('Dados inválidos.','bad_request');
  const account=await accountStore?.session(req.headers.cookie);
  const creator=ownerId({uid:account?.uid,token:body.guestToken});
  if(!creator)throw new RoomError('Informe seu personagem ou entre com uma conta.','owner_required',401);
  if(!inspectNickname(body.name).ok)throw new RoomError('Nome de sala inadequado.','invalid_room',400);
  const room=rooms.create({name:body.name,owner:creator});
  return jsonResponse(res,201,{room});
 }catch(err){
  if(!(err instanceof RoomError||err instanceof AuthError))console.warn('[salas] falha ao criar:',err.message);
  return jsonResponse(res,err.status||400,{error:err.message||'Não foi possível criar a sala.',code:err.code||'room_error'});
 }
}
async function handleAuth(req,res,route){
 const secure=process.env.NODE_ENV==='production' || !/^localhost(?::\d+)?$|^127\.0\.0\.1(?::\d+)?$/.test(String(req.headers.host||''));
 if(!accountStore||!accountStore.ready)return jsonResponse(res,503,{error:'Cadastro indisponível: aguardando banco persistente.',code:'storage_offline'});
 try{
  if(route==='/api/auth/session'&&req.method==='GET'){
   const account=await accountStore.session(req.headers.cookie);
   return jsonResponse(res,200,{authenticated:!!account,account,persistent:true,emailRecoveryAvailable:mailService.ready});
  }
  if(!['/api/auth/register','/api/auth/login','/api/auth/logout','/api/auth/email/request','/api/auth/email/confirm','/api/auth/password/forgot','/api/auth/password/reset'].includes(route)||req.method!=='POST')return jsonResponse(res,405,{error:'Operação não permitida.'});
  const origin=req.headers.origin;
  if(origin&&new URL(origin).host!==req.headers.host)throw new AuthError('Origem não permitida.',403);
  if(req.headers['sec-fetch-site']==='cross-site')throw new AuthError('Origem não permitida.',403);
  if(limited(req.socket.remoteAddress||'unknown'))throw new AuthError('Muitas tentativas. Tente novamente em alguns minutos.',429,'rate_limited');
  if(route==='/api/auth/logout'){
   await accountStore.logout(req.headers.cookie);
   return jsonResponse(res,200,{ok:true},clearCookie(secure));
  }
  if(!(req.headers['content-type']||'').startsWith('application/json'))throw new AuthError('Envie dados em JSON.',415);
  const body=await bodyJson(req);
  if(!body||typeof body!=='object'||Array.isArray(body))throw new AuthError('Dados inválidos.');
  if(route==='/api/auth/password/forgot'){
   if(!mailService.ready)throw new AuthError('A recuperação por e-mail ainda não está habilitada. Fale com o suporte.',503,'mail_unavailable');
   const email=cleanEmail(body.email);
   // Resposta idêntica para e-mail desconhecido, não verificado ou com limite de envios.
   if(validEmail(email)&&!mailLimited('forgot:'+email)){
    await accountStore.requestPasswordReset(email,data=>mailService.send({...data,kind:'reset'}));
   }
   return jsonResponse(res,200,{ok:true,message:'Se existir uma conta com esse e-mail verificado, você receberá um link de recuperação.'});
  }
  if(route==='/api/auth/password/reset'){
   const result=await accountStore.resetPassword(body.token,body.password);
   // Encerra conexões ativas do titular da conta, inclusive em outros dispositivos.
   for(const c of sockets)if(c.mode==='world'&&c.authUser?.id===result.accountId)terminate(c);
   return jsonResponse(res,200,{ok:true,message:'Senha alterada. Faça login com a nova senha.'},clearCookie(secure));
  }
  if(route==='/api/auth/email/confirm'){
   const result=await accountStore.confirmEmail(body.token);
   return jsonResponse(res,200,result);
  }
  if(route==='/api/auth/email/request'){
   if(!mailService.ready)throw new AuthError('O envio de confirmação ainda não está configurado.',503,'mail_unavailable');
   const logged=await accountStore.session(req.headers.cookie);
   if(!logged)throw new AuthError('Entre na sua conta para vincular um e-mail.',401,'login_required');
   if(!await accountStore.verifyPassword(logged.id,body.password))throw new AuthError('Senha incorreta.',401,'bad_credentials');
   const email=cleanEmail(body.email);
   if(!validEmail(email))throw new AuthError('Informe um endereço de e-mail válido.');
   if(mailLimited('verify:'+logged.id))throw new AuthError('Aguarde antes de solicitar outra mensagem.',429,'rate_limited');
   const result=await accountStore.requestEmailVerification(logged.id,email,data=>mailService.send({...data,kind:'verify'}));
   return jsonResponse(res,200,{ok:true,alreadyVerified:!!result.alreadyVerified,message:result.alreadyVerified?'Este e-mail já está confirmado.':'Verifique sua caixa de entrada para confirmar o e-mail.'});
  }
  if(route==='/api/auth/register'){
   const token=typeof body.guestToken==='string'?body.guestToken:null;
   const guestUid=token&&/^[a-f0-9]{64}$/.test(token)?crypto.createHash('sha256').update(token).digest('hex'):null;
   if(guestUid&&[...world.players.values()].some(p=>p.uid===guestUid))throw new AuthError('Saia do modo Visitante antes de transferir o progresso.',409);
   // A migração visitante -> conta não pode ocorrer enquanto um instantâneo
   // antigo ainda estiver aguardando gravação: isso poderia recriar o UID visitante.
   world.persist();
   const saved=await accountStore.flush();
   if(!saved || accountStore.pending)throw new AuthError('Não foi possível confirmar o salvamento do visitante. Tente novamente.',503,'storage_pending');
   const email=cleanEmail(body.email||'');
   if(email&&!validEmail(email))throw new AuthError('Informe um e-mail válido ou deixe o campo vazio.');
   const result=await accountStore.register(body.username,body.password,token);
   let verificationSent=false;
   if(email&&mailService.ready){
    try{await accountStore.requestEmailVerification(result.account.id,email,data=>mailService.send({...data,kind:'verify'}));verificationSent=true}
    catch(err){console.warn('[contas] Não foi possível enviar confirmação de novo cadastro.');}
   }
   return jsonResponse(res,201,{ok:true,account:result.account,persistent:true,emailRecoveryAvailable:mailService.ready,verificationSent},authCookie(result.token,secure));
  }
  const result=await accountStore.login(body.username,body.password);
  return jsonResponse(res,200,{ok:true,account:result.account,persistent:true},authCookie(result.token,secure));
 }catch(err){
  if(!(err instanceof AuthError))console.error('[autenticação] operação falhou:',err.message);
  return jsonResponse(res,err.status||503,{error:err instanceof AuthError?err.message:'O banco de dados está indisponível. Tente mais tarde.',code:err.code||'storage_error'});
 }
}


function reply(res, status, body, type='text/plain; charset=utf-8') {
  res.writeHead(status, {'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN'});
  res.end(body);
}
// Readiness é diferente de liveness: Render usa /health para o processo;
 // /health/ready confirma que contas e dados continuam acessíveis no PostgreSQL.
let readinessCache={until:0,ok:false};
async function checkReadiness(){
 const now=Date.now();
 if(now<readinessCache.until)return readinessCache.ok;
 if(!accountStore?.ready){readinessCache={until:now+3000,ok:false};return false}
 try{
  await accountStore.pool.query({text:'SELECT 1',query_timeout:2000});
  readinessCache={until:Date.now()+3000,ok:true};
 }catch(err){
  readinessCache={until:Date.now()+3000,ok:false};
  console.warn('[saúde] PostgreSQL indisponível no teste de prontidão:',err.message);
 }
 return readinessCache.ok;
}
const httpServer = http.createServer((req,res)=>{
  const u = new URL(req.url||'/', 'http://localhost');
  if(u.pathname.startsWith('/api/auth/')){void handleAuth(req,res,u.pathname);return}
  if(u.pathname==='/api/rooms'&&req.method==='POST'){void handleCreateRoom(req,res);return}
  if(req.method !== 'GET') return reply(res,405,'Método não permitido');
  if(u.pathname==='/api/rooms')return jsonResponse(res,200,{rooms:rooms.list(),totalOnline:rooms.count(),capacityPerRoom:MAX_PER_ROOM});
  if(u.pathname==='/api/maintenance/events'){
    maintenanceNotices.subscribe(req,res);return;
  }
  if(u.pathname==='/api/maintenance/status'){
    return jsonResponse(res,200,maintenanceNotices.payload());
  }
  if(u.pathname==='/api/status') return reply(res,200,JSON.stringify({online:players.size+rooms.count(),maxPlayers:MAX_PLAYERS,availableSlots:Math.max(0,MAX_PLAYERS-players.size),mainRoomSlots:Math.max(0,MAX_PLAYERS-rooms.get(MAIN_ID).world.count),rooms:rooms.list().length,capacityPerRoom:MAX_PER_ROOM,regions:[...new Set([...players.values()].map(p=>p.zone))].length,world:world.status(),registeredAccounts:!!accountStore?.ready,persistentStorage:!!accountStore?.ready,version:'2.2-rooms'}),'application/json; charset=utf-8');
  if(u.pathname==='/health') return reply(res,200,'ok');
  if(u.pathname==='/health/ready'){
    void checkReadiness().then(ok=>jsonResponse(res,ok?200:503,{ready:ok,database:ok?'connected':'unavailable'}))
      .catch(()=>jsonResponse(res,503,{ready:false,database:'unavailable'}));
    return;
  }
  // Módulo 3D distribuído com o servidor: origem própria, sem dependência de CDN.
  // Expõe apenas este arquivo fixo do pacote Three.js, nunca o diretório node_modules.
  if(u.pathname==='/vendor/three.module.js'){
    const moduleFile=path.join(__dirname,'node_modules','three','build','three.module.js');
    fs.stat(moduleFile,(err,st)=>{
      if(err||!st.isFile())return reply(res,503,'Motor 3D não disponível');
      res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8','Content-Length':st.size,
        'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'});
      fs.createReadStream(moduleFile).pipe(res);
    });
    return;
  }
  const routes={'/':'/index.html','/jogar':'/jogo.html','/jogo':'/jogo.html','/mundo':'/mundo.html','/online':'/mundo.html'};
  let pathname=routes[u.pathname] || u.pathname;
  let decoded;
  try{decoded=decodeURIComponent(pathname)}catch{return reply(res,400,'Rota inválida')}
  const filename=path.resolve(PUBLIC,'.'+decoded);
  if(!(filename===PUBLIC||filename.startsWith(PUBLIC+path.sep)))return reply(res,403,'Acesso negado');
  fs.stat(filename,(err,stat)=>{
    if(err||!stat.isFile())return reply(res,404,'Não encontrado');
    const ext=path.extname(filename).toLowerCase();
    // XML e robots acompanham o domínio próprio configurado, sem precisar editar arquivos novamente.
    if(decoded==='/sitemap.xml'||decoded==='/robots.txt'){
      return fs.readFile(filename,'utf8',(readErr,source)=>{
        if(readErr)return reply(res,500,'Erro ao carregar metadados');
        reply(res,200,renderPublicText(source,req),MIME[ext]);
      });
    }
    // Atualiza automaticamente links canônicos e o contato reservado quando houver configuração.
    if(ext==='.html'&&decoded!=='/jogo.html'){
      return fs.readFile(filename,'utf8',(readErr,source)=>{
        if(readErr)return reply(res,500,'Erro ao carregar página');
        reply(res,200,renderPublicText(source,req),MIME[ext]);
      });
    }
    // Adiciona botão de retorno sem reescrever a campanha clássica de 3 MB.
    if(decoded==='/jogo.html'){
      return fs.readFile(filename,(readErr,raw)=>{
        if(readErr)return reply(res,500,'Falha ao abrir a campanha');
        const html=raw.toString('utf8');
        const htmlWithNav=html.replace('</head>','<script defer src="/classic-return.js"></script><script defer src="/site-maintenance.js?v=maintenance-v2"></script></head>');
        if(htmlWithNav===html)return reply(res,500,'Documento da campanha inválido');
        const body=Buffer.from(htmlWithNav,'utf8');
        res.writeHead(200,{'Content-Type':MIME['.html'],'Content-Length':body.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN'});
        res.end(body);
      });
    }
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':ext==='.html'?'no-cache':'public, max-age=600','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN'});
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
function send(sock,obj){
 if(!sock||sock.destroyed||!sock.writable)return;
 const msg=JSON.stringify(obj);
 // ACKs pequenos das operações idempotentes não podem ser descartados pelo
 // mesmo limite de backpressure usado por snapshots grandes do mundo.
 const critical=obj?.type==='kingdomActionResult'||obj?.type==='kingdomDurable';
 if(sock.writableLength<(critical?1024*1024:256*1024))sock.write(frame(msg));
}
function emitAll(obj,except){for(const c of sockets)if(c!==except&&c.profile)send(c.socket,obj)}
function refuse(c,obj){send(c.socket,obj);setTimeout(()=>terminate(c),250).unref()}
function terminate(c){
  if(c.terminated)return;c.terminated=true;
  sockets.delete(c);
  if(c.mode==='mobile')mobileCoop.leave(c);
  if(c.mode==='world'&&c.worldRoom){c.worldRoom.world.leave(c);rooms.left(c.worldRoom);c.worldRoom=null}
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
  if(!inspectNickname(name).ok)return refuse(c,{type:'error',code:'invalid_name',message:'Esse apelido não é permitido no chat protegido.'});
  if(players.size>=MAX_PLAYERS){return refuse(c,{type:'error',code:'full',message:'Campanha clássica cheia (60/60). Aguarde uma vaga.'})}
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
async function worldHello(c,data){
 if(c.terminated||c.worldPlayer||c.joinPending)return;
 c.joinPending=true;
 try{
  const accountMode=data.mode==='account';
  if(accountMode){
   if(!accountStore?.ready)return send(c.socket,{type:'error',code:'auth_unavailable',message:'Contas indisponíveis no momento.'});
   const account=await accountStore.session(c.cookieHeader);
   if(!account)return send(c.socket,{type:'error',code:'login_required',message:'Sua sessão expirou. Faça login novamente.'});
   c.authUser=account;
  }else{
   const name=typeof data.name==='string'?data.name.trim().normalize('NFC'):'';
   if(accountStore?.ready&&await accountStore.nameReserved(name))return send(c.socket,{type:'error',code:'name_reserved',message:'Esse nome pertence a uma conta. Use o login ou escolha outro apelido.'});
  }
  if(c.terminated)return;
  const uid=c.authUser?.uid||(typeof data.token==='string'?crypto.createHash('sha256').update(data.token).digest('hex'):null);
  let room;
  const requestedId=typeof data.roomId==='string'?data.roomId:MAIN_ID;
  // Seleção pública sem campos de senha. Regras de lotação e existência
  // continuam sob controle do servidor.
  try{room=rooms.check(requestedId,null,{uid})}
  catch(error){return send(c.socket,{type:'error',code:error.code||'room_error',message:error.message})}
  const duplicates=[...sockets].filter(other=>other!==c&&other.mode==='world'&&other.worldPlayer?.uid===uid);
  // Para outra sala, salvar primeiro a conta. Na mesma sala, deixar a
  // instância ativa até o novo WebSocket ocupar a vaga anterior.
  for(const other of duplicates)if(other.worldRoom!==room)terminate(other);
  c.worldRoom=room;
  room.world.receive(c,data);
  if(c.worldPlayer){
   rooms.entered(room);
   c.roomToken=data.token;
   for(const other of duplicates)if(other.worldRoom===room)terminate(other);
  }else c.worldRoom=null;
 }catch(err){console.error('[contas] falha ao validar sessão:',err.message);send(c.socket,{type:'error',code:'auth_unavailable',message:'Não foi possível verificar a conta.'});}
 finally{c.joinPending=false}
}
// Mudar de sala sem abrir outra aba ou encerrar o WebSocket. Somente depois
// de validar a sala pública e sua lotação liberamos a vaga anterior.
function switchWorldRoom(c,data){
 const player=c.worldPlayer,from=c.worldRoom;
 if(!player||!from||!data||typeof data!=='object')return;
 const id=typeof data.roomId==='string'?data.roomId:'';
 if(id===from.id){
  return send(c.socket,{type:'roomSwitchError',code:'same_room',message:'Você já está jogando nesta sala.'});
 }
 let target;
 try{target=rooms.check(id,null,{uid:player.uid})}
 catch(err){return send(c.socket,{type:'roomSwitchError',code:err.code||'room_error',message:err.message})}
 // Checar nomes antes de soltar a sessão antiga. A entrada em cada sala é
 // síncrona: não há janela para uma corrida de lotação após esta validação.
 if([...target.world.players.values()].some(p=>p.name.toLocaleLowerCase('pt-BR')===player.name.toLocaleLowerCase('pt-BR')&&p.uid!==player.uid))
  return send(c.socket,{type:'roomSwitchError',code:'name_taken',message:'Já existe um personagem com seu nome nessa sala.'});
 const save=structuredClone(player.save),uid=player.uid;
 const login={name:player.name,role:save.role,token:c.roomToken};
 c.roomTransferSave=save;
 c.roomTransferUid=uid;
 from.world.leave(c);
 // Só remover a sala anterior após confirmar a entrada na nova.
 c.worldRoom=target;
 try{
  target.world.join(c,login);
  if(!c.worldPlayer)throw new Error('Não foi possível entrar na nova sala.');
  rooms.entered(target);
  rooms.left(from);
  console.info('[salas] transferência concluída entre salas.');
 }catch(err){
  // Restaura a mesma sessão e o mesmo personagem se algo inesperado impedir
  // a entrada. Tokens pessoais jamais vão para logs ou eventos públicos.
  c.worldRoom=from;
  if(!c.worldPlayer)from.world.join(c,login);
  if(c.worldPlayer)rooms.entered(from);
  send(c.socket,{type:'roomSwitchError',code:'switch_failed',message:'Falha ao trocar de servidor. Você permaneceu na sala anterior.'});
  console.error('[salas] troca interrompida:',err.message);
 }finally{
  delete c.roomTransferSave;delete c.roomTransferUid;
 }
}
function receive(c,data){
  if(c.mode==='mobile'){mobileCoop.receive(c,data);return}
  if(c.mode==='world'){
   if(!c.worldPlayer){if(data&&data.type==='hello')void worldHello(c,data);return}
   if(data&&data.type==='switchRoom'){switchWorldRoom(c,data);return}
   c.worldRoom?.world.receive(c,data);return
  }
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
    const review=classicChatGuard.check(p.token||p.id,data.text);
    if(!review.ok){send(c.socket,{type:'notice',text:review.message});return}
    const now=Date.now();
    p.lastChat=now;
    const event={type:'chat',id:p.id,name:p.name,text:review.text,zone:p.zone,time:now};
    emitAll(event);send(c.socket,event);
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
    try{
      const incoming=JSON.parse(decoder.decode(data));
      try{receive(c,incoming)}
      catch(err){
       // Não declarar falha: uma exceção pode ocorrer após o débito. O cliente
       // reconcilia pela opKey e estado autoritativo antes de decidir.
       if(c.mode==='world'&&incoming?.type==='kingdom')
        console.error('[reinos] ação falhou antes da confirmação:',String(err?.message||err).slice(0,160));
      }
    }catch{ /* payload inválido: ignorar */ }
  }
}
httpServer.on('upgrade',(req,socket,head)=>{
  if(shuttingDown){socket.destroy();return}
  const u=new URL(req.url||'/', 'http://localhost');
  const origin=req.headers.origin;
  try {if(origin&&!(u.pathname==='/mobile-coop-ws'&&origin==='https://appassets.androidplatform.net')&&new URL(origin).host!==req.headers.host){socket.destroy();return}}catch{socket.destroy();return}
  if(!['/ws','/world-ws','/mobile-coop-ws'].includes(u.pathname)||req.headers.upgrade?.toLowerCase()!=='websocket'||!req.headers['sec-websocket-key'])return socket.destroy();
  const key=req.headers['sec-websocket-key'];
  if(!/^[\w+/]{22}==$/.test(key))return socket.destroy();
  const digest=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+digest+'\r\n\r\n');
  const c={socket,mode:u.pathname==='/world-ws'?'world':u.pathname==='/mobile-coop-ws'?'mobile':'classic',profile:null,cookieHeader:req.headers.cookie||'',pending:Buffer.alloc(0),terminated:false,lastPong:Date.now(),lastPing:0};sockets.add(c);
  socket.on('data',b=>handleFrame(c,b));socket.on('error',()=>terminate(c));socket.on('end',()=>terminate(c));socket.on('close',()=>terminate(c));
  if(head?.length)handleFrame(c,head);
  setTimeout(()=>{if(!c.profile&&!c.worldPlayer&&!c.mobilePlayer&&!c.terminated)terminate(c)},8000).unref();
});
setInterval(()=>{
  for(const c of sockets){
    if(c.terminated)continue;
    const now=Date.now();
    if(now-c.lastPong>65000){terminate(c);continue}
    // Heartbeat de rede a cada 20 s; snapshots continuam a cada 250 ms.
    if(!c.socket.destroyed&&now-c.lastPing>=20000){
      c.lastPing=now;
      c.socket.write(frame(Buffer.alloc(0),9));
    }
    if(c.profile){const peers=[...players.values()].filter(p=>p.zone===c.profile.zone&&p.id!==c.profile.id).map(publicPlayer);send(c.socket,{type:'snapshot',players:peers,online:players.size,zone:c.profile.zone})}
  }
},250).unref();
setInterval(()=>{for(const active of rooms.allWorlds())active.tick()},350).unref();
setInterval(()=>rooms.clean(),60000).unref();
const start=async()=>{
 try{
  if(accountStore){
   await accountStore.initialize(world);
   console.log('[contas] Postgres conectado: contas e progresso no armazenamento externo');
   const grant=await grantOwnerBenefits({pool:accountStore.pool,world,ownerEmail:process.env.OWNER_ACCOUNT_EMAIL});
   if(grant.status!=='disabled')console.log('[privilégios] Concessão ao proprietário: '+grant.status+
    (grant.status==='granted'?' · nível '+grant.level+' · moedas '+grant.coins:''));
  }
  else console.warn('[contas] DATABASE_URL ausente: visitantes podem jogar, mas cadastro durável está indisponível');
  // Recuperação autoritativa no boot: obras cujo prazo venceu durante a queda
  // do Render devem ser concluídas e confirmadas em disco ANTES de servir jogadores.
  const recovered=require('./kingdom-politics').resolveCityConstructions(world,Date.now());
  if(recovered.length){
   const durable=await world.persist();
   if(durable!==true)throw new Error('Obras recuperadas, mas a persistência não foi confirmada pelo banco');
   console.info('[reinos] '+recovered.length+' obra(s) concluída(s) após reinicialização');
  }
  httpServer.listen(PORT,HOST,()=>console.log(`Os Peregrinos online em http://localhost:${PORT}`));
 }catch(err){console.error('[contas] Não foi possível iniciar com segurança o banco:',err.message);process.exitCode=1;await accountStore?.pool.end().catch(()=>{});}
};
void start();
let shuttingDown=false;
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>{
 if(shuttingDown)return;shuttingDown=true;
 // Avisar TODOS os visitantes (SSE) e jogadores conectados (WebSocket)
 // ANTES de encerrar conexões e salvar personagens. O Render normalmente
 // aguarda o encerramento gracioso da instância anterior.
 const notice=maintenanceNotices.announce(
  'Uma atualização começará em instantes. Sua conexão pode cair. Contas cadastradas preservam o progresso; visitantes podem precisar iniciar outra jornada.');
 for(const c of sockets)send(c.socket,notice);
 console.info('[manutenção] aviso enviado a '+sockets.size+' WebSockets e '+maintenanceNotices.clients.size+' visitantes do site');
 const shutdown=()=>{
  for(const c of [...sockets])terminate(c);
  maintenanceNotices.close();
  rooms.close();
  const kill=setTimeout(()=>process.exit(1),14000);kill.unref();
  Promise.resolve(accountStore?.close()).then(()=>{
   httpServer.close(()=>{clearTimeout(kill);process.exit(0)});
  }).catch(e=>{
   console.error('[contas] flush final falhou:',e.message);
   httpServer.close(()=>{clearTimeout(kill);process.exit(1)});
  });
 };
 // Tempo real para que o navegador receba e exiba a mensagem.
 setTimeout(shutdown,3000).unref();
});

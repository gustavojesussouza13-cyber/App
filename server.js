'use strict';
/** Os Peregrinos — servidor de presença e chat, protótipo multiplayer sem contas. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');
const {World} = require('./world-engine');
const {MobileCoop} = require('./mobile-coop');
const {AccountStore,AuthError,authCookie,clearCookie,cleanEmail,validEmail}=require('./account-store');
const {MailService}=require('./email-service');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const MAX_PLAYERS = 10; // limite total compartilhado entre campanha e mundo aberto
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
  return source.replaceAll(DEFAULT_SITE_ORIGIN,originForRequest(req)).replaceAll('<!-- PRIVATE_SUPPORT_EMAIL -->',contactHtml());
}

const players = new Map();
// Salas do APK V7, sem alterar os personagens do MMORPG online.
const mobileCoop=new MobileCoop({send:(c,msg)=>send(c.socket,msg),maxRooms:5,canJoin:()=>players.size+world.count+mobileCoop.countPlayers()<MAX_PLAYERS});
const sockets = new Set();
const MIME = {'.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const decoder = new TextDecoder('utf-8', {fatal:true});
const accountStore=process.env.DATABASE_URL?new AccountStore({databaseUrl:process.env.DATABASE_URL}):null;
const world=new World({send,getOnline:()=>players.size,hasClassicName:name=>[...players.values()].some(p=>p.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')),dataFile:process.env.DATA_FILE||path.join(__dirname,'data','world.sqlite'),autosave:true,persistentStore:accountStore});
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
  if(req.method !== 'GET') return reply(res,405,'Método não permitido');
  if(u.pathname==='/api/status') return reply(res,200,JSON.stringify({online:players.size+world.count,maxPlayers:MAX_PLAYERS,availableSlots:Math.max(0,MAX_PLAYERS-players.size-world.count),regions:[...new Set([...players.values()].map(p=>p.zone))].length,world:world.status(),registeredAccounts:!!accountStore?.ready,persistentStorage:!!accountStore?.ready,version:'2.0-5.1-auth'}),'application/json; charset=utf-8');
  if(u.pathname==='/health') return reply(res,200,'ok');
  if(u.pathname==='/health/ready'){
    void checkReadiness().then(ok=>jsonResponse(res,ok?200:503,{ready:ok,database:ok?'connected':'unavailable'}))
      .catch(()=>jsonResponse(res,503,{ready:false,database:'unavailable'}));
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
        const htmlWithNav=html.replace('</head>','<script defer src="/classic-return.js"></script></head>');
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
function send(sock,obj){if(!sock.destroyed && sock.writable){const msg=JSON.stringify(obj);if(sock.writableLength<256*1024)sock.write(frame(msg))}}
function emitAll(obj,except){for(const c of sockets)if(c!==except&&c.profile)send(c.socket,obj)}
function refuse(c,obj){send(c.socket,obj);setTimeout(()=>terminate(c),250).unref()}
function terminate(c){
  if(c.terminated)return;c.terminated=true;
  sockets.delete(c);
  if(c.mode==='mobile')mobileCoop.leave(c);
  if(c.mode==='world')world.leave(c);
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
  if(players.size+world.count>=MAX_PLAYERS){return refuse(c,{type:'error',code:'full',message:'Servidor cheio (10/10). Aguarde uma vaga.'})}
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
  if(!c.terminated)world.receive(c,data);
 }catch(err){console.error('[contas] falha ao validar sessão:',err.message);send(c.socket,{type:'error',code:'auth_unavailable',message:'Não foi possível verificar a conta.'});}
 finally{c.joinPending=false}
}
function receive(c,data){
  if(c.mode==='mobile'){mobileCoop.receive(c,data);return}
  if(c.mode==='world'){
   if(!c.worldPlayer){if(data&&data.type==='hello')void worldHello(c,data);return}
   world.receive(c,data);return
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
setInterval(()=>world.tick(),350).unref();
const start=async()=>{
 try{
  if(accountStore){await accountStore.initialize(world);console.log('[contas] Postgres conectado: contas e progresso no armazenamento externo');}
  else console.warn('[contas] DATABASE_URL ausente: visitantes podem jogar, mas cadastro durável está indisponível');
  httpServer.listen(PORT,HOST,()=>console.log(`Os Peregrinos online em http://localhost:${PORT}`));
 }catch(err){console.error('[contas] Não foi possível iniciar com segurança o banco:',err.message);process.exitCode=1;await accountStore?.pool.end().catch(()=>{});}
};
void start();
let shuttingDown=false;
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>{
 if(shuttingDown)return;shuttingDown=true;
 for(const c of [...sockets])terminate(c);
 world.stop();
 const kill=setTimeout(()=>process.exit(1),14000);kill.unref();
 Promise.resolve(accountStore?.close()).then(()=>{
  httpServer.close(()=>{clearTimeout(kill);process.exit(0)});
 }).catch(e=>{
  console.error('[contas] flush final falhou:',e.message);
  httpServer.close(()=>{clearTimeout(kill);process.exit(1)});
 });
});

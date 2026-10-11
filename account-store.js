'use strict';
/** Contas e progresso em Postgres: não armazenar segredos, senhas ou cookies em logs. */
const crypto=require('node:crypto');
const {promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt);
const COOKIE='peregrinos_session';
const WEEK=7*24*3600*1000;
const RESET_TTL=20*60*1000;
const VERIFY_TTL=24*3600*1000;
const validEmail=email=>typeof email==='string' && email.length>=5 && email.length<=254 && /^[^\s@<>]+@[^\s@<>]+\.[a-zA-Z]{2,}$/.test(email) && !/[\r\n]/.test(email);
const cleanEmail=email=>typeof email==='string'?email.trim().toLowerCase():'';
const validName=name=>typeof name==='string'&&name.length>=3&&name.length<=18&&/^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u.test(name);
const cleanName=name=>typeof name==='string'?name.trim().normalize('NFC'):'';
const validPassword=password=>typeof password==='string'&&password.length>=10&&password.length<=128&&Buffer.byteLength(password,'utf8')<=512;
const keyFor=name=>name.toLocaleLowerCase('pt-BR');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const identity=id=>'account:'+id;
function publicAccount(a){return {id:a.id,username:a.username,uid:identity(a.id),emailVerified:!!a.email_verified_at,email:a.email_verified_at?a.email:null}}
function parseCookie(value){
 const entry=String(value||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
 const token=entry?entry.slice(COOKIE.length+1):'';
 return /^[a-f0-9]{64}$/.test(token)?token:null;
}
function authCookie(token,secure=true){return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.round(WEEK/1000)}`+(secure?'; Secure':'')}
function clearCookie(secure=true){return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`+(secure?'; Secure':'')}
class AuthError extends Error{constructor(message,status=400,code='invalid_request'){super(message);this.status=status;this.code=code}}
class AccountStore{
 constructor({databaseUrl,pool}={}){
  this.pool=pool||new (require('pg').Pool)({connectionString:databaseUrl,max:4,connectionTimeoutMillis:8000,idleTimeoutMillis:30000});
  this.world=null;this.pending=null;this.saving=null;this.ready=false;
 }
 async initialize(world){
  await this.pool.query(`CREATE TABLE IF NOT EXISTS game_accounts (
   id TEXT PRIMARY KEY, username TEXT NOT NULL, username_key TEXT NOT NULL UNIQUE,
   salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);
  // Migração aditiva: preserva nomes, hashes de senha, sessões e personagens existentes.
  await this.pool.query('ALTER TABLE game_accounts ADD COLUMN IF NOT EXISTS email TEXT');
  await this.pool.query('ALTER TABLE game_accounts ADD COLUMN IF NOT EXISTS email_key TEXT');
  await this.pool.query('ALTER TABLE game_accounts ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ');
  await this.pool.query('CREATE UNIQUE INDEX IF NOT EXISTS game_accounts_email_verified_unique ON game_accounts(email_key) WHERE email_verified_at IS NOT NULL');
  await this.pool.query(`CREATE TABLE IF NOT EXISTS account_email_verifications (
    token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES game_accounts(id) ON DELETE CASCADE,
    email TEXT NOT NULL, email_key TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL
  )`);
  await this.pool.query('CREATE INDEX IF NOT EXISTS email_verifications_owner ON account_email_verifications(account_id)');
  await this.pool.query(`CREATE TABLE IF NOT EXISTS account_password_resets (
    token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES game_accounts(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
  )`);
  await this.pool.query('CREATE INDEX IF NOT EXISTS password_resets_owner ON account_password_resets(account_id)');
  await this.pool.query(`CREATE TABLE IF NOT EXISTS game_sessions (
   token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES game_accounts(id) ON DELETE CASCADE,
   expires_at TIMESTAMPTZ NOT NULL
  )`);
  await this.pool.query('CREATE INDEX IF NOT EXISTS game_sessions_expires ON game_sessions(expires_at)');
  await this.pool.query('CREATE TABLE IF NOT EXISTS characters(uid TEXT PRIMARY KEY,data JSONB NOT NULL)');
  await this.pool.query('CREATE TABLE IF NOT EXISTS guilds(key TEXT PRIMARY KEY,data JSONB NOT NULL)');
  await this.pool.query('CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  const [chars,guilds,day]=await Promise.all([
   this.pool.query('SELECT uid,data FROM characters'),
   this.pool.query('SELECT key,data FROM guilds'),
   this.pool.query("SELECT value FROM meta WHERE key='day'")
  ]);
  world.saved.characters=Object.fromEntries(chars.rows.map(r=>[r.uid,r.data]));
  world.saved.guilds=Object.fromEntries(guilds.rows.map(r=>[r.key,r.data]));
  world.guilds=new Map(Object.entries(world.saved.guilds));
  world.day=Number(day.rows[0]?.value||1);
  this.world=world;this.ready=true;
 }
 enqueue(worldState){
  // Sempre substituir pelo instantâneo mais recente. Falhas não eliminam dados pendentes.
  this.pending=JSON.parse(JSON.stringify(worldState));
  if(!this.saving)this.saving=this._flushLoop().finally(()=>{this.saving=null});
  return this.saving;
 }
 async _flushLoop(){
  while(this.pending){
   const snapshot=this.pending;this.pending=null;
   try{await this.saveSnapshot(snapshot)}catch(err){
    this.pending=this.pending||snapshot;
    console.error('[contas] gravação temporariamente indisponível:',err.message);
    return false;
   }
  }
  return true;
 }
 async flush(){
  if(this.saving)await this.saving;
  if(this.pending){this.saving=this._flushLoop().finally(()=>{this.saving=null});return this.saving}
  return true;
 }
 async saveSnapshot(snapshot){
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   for(const [uid,data] of Object.entries(snapshot.characters)){
    await client.query('INSERT INTO characters(uid,data) VALUES($1,$2::jsonb) ON CONFLICT(uid) DO UPDATE SET data=EXCLUDED.data',[uid,JSON.stringify(data)]);
   }
   for(const [key,data] of Object.entries(snapshot.guilds)){
    await client.query('INSERT INTO guilds(key,data) VALUES($1,$2::jsonb) ON CONFLICT(key) DO UPDATE SET data=EXCLUDED.data',[key,JSON.stringify(data)]);
   }
   await client.query("INSERT INTO meta(key,value) VALUES('day',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value",[String(snapshot.day)]);
   await client.query('COMMIT');
  }catch(err){await client.query('ROLLBACK').catch(()=>{});throw err}
  finally{client.release()}
 }
 async nameReserved(username){
  const r=await this.pool.query('SELECT id FROM game_accounts WHERE username_key=$1',[keyFor(cleanName(username))]);
  return r.rows.length>0;
 }
 async register(username,password,guestToken){
  username=cleanName(username);
  if(!validName(username))throw new AuthError('Use de 3 a 18 caracteres para o nome.');
  if(!validPassword(password))throw new AuthError('A senha precisa ter entre 10 e 128 caracteres.');
  const guestUid=/^[a-f0-9]{64}$/.test(guestToken||'')?sha(guestToken):null;
  const salt=crypto.randomBytes(16).toString('hex');
  const digest=(await scrypt(password,Buffer.from(salt,'hex'),64)).toString('hex');
  const id=crypto.randomUUID(),session=crypto.randomBytes(32).toString('hex');
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const existing=await client.query('SELECT id FROM game_accounts WHERE username_key=$1',[keyFor(username)]);
   if(existing.rows.length)throw new AuthError('Este nome de conta já está cadastrado.',409,'username_taken');
   await client.query('INSERT INTO game_accounts(id,username,username_key,salt,password_hash) VALUES($1,$2,$3,$4,$5)',[id,username,keyFor(username),salt,digest]);
   if(guestUid){
    await client.query('INSERT INTO characters(uid,data) SELECT $1,data FROM characters WHERE uid=$2 ON CONFLICT(uid) DO NOTHING',[identity(id),guestUid]);
    await client.query('DELETE FROM characters WHERE uid=$1',[guestUid]);
   }
   await client.query('INSERT INTO game_sessions(token_hash,account_id,expires_at) VALUES($1,$2,$3)',[sha(session),id,new Date(Date.now()+WEEK)]);
   await client.query('COMMIT');
  }catch(err){await client.query('ROLLBACK').catch(()=>{});if(err.code==='23505')throw new AuthError('Este nome de conta já está cadastrado.',409,'username_taken');throw err}
  finally{client.release()}
  if(guestUid&&this.world?.saved.characters[guestUid]){
   this.world.saved.characters[identity(id)]=this.world.saved.characters[guestUid];
   delete this.world.saved.characters[guestUid];this.world.dirty=true;this.world.persist();
  }
  return {token:session,account:{id,username,uid:identity(id)}};
 }
 async login(username,password){
  username=cleanName(username);
  if(!validName(username)||!validPassword(password))throw new AuthError('Nome ou senha incorretos.',401,'bad_credentials');
  const r=await this.pool.query('SELECT * FROM game_accounts WHERE username_key=$1',[keyFor(username)]);
  const a=r.rows[0];
  const salt=a?a.salt:'00000000000000000000000000000000';
  const candidate=await scrypt(password,Buffer.from(salt,'hex'),64);
  const stored=a?Buffer.from(a.password_hash,'hex'):Buffer.alloc(64);
  if(!a||stored.length!==64||!crypto.timingSafeEqual(candidate,stored))throw new AuthError('Nome ou senha incorretos.',401,'bad_credentials');
  const token=crypto.randomBytes(32).toString('hex');
  await this.pool.query('INSERT INTO game_sessions(token_hash,account_id,expires_at) VALUES($1,$2,$3)',[sha(token),a.id,new Date(Date.now()+WEEK)]);
  return {token,account:publicAccount(a)};
 }
 async session(cookieHeader){
  const token=parseCookie(cookieHeader);if(!token)return null;
  const r=await this.pool.query(`SELECT a.id,a.username,a.email,a.email_verified_at FROM game_sessions s JOIN game_accounts a ON a.id=s.account_id
   WHERE s.token_hash=$1 AND s.expires_at>CURRENT_TIMESTAMP`,[sha(token)]);
  return r.rows.length?publicAccount(r.rows[0]):null;
 }
 async verifyPassword(accountId,password){
  if(!validPassword(password))return false;
  const r=await this.pool.query('SELECT salt,password_hash FROM game_accounts WHERE id=$1',[accountId]);
  if(!r.rows.length)return false;
  const a=r.rows[0],candidate=await scrypt(password,Buffer.from(a.salt,'hex'),64);
  const stored=Buffer.from(a.password_hash,'hex');
  return stored.length===64&&crypto.timingSafeEqual(candidate,stored);
 }
 async requestEmailVerification(accountId,email,send){
  email=cleanEmail(email);
  if(!validEmail(email))throw new AuthError('Informe um e-mail válido.');
  const current=await this.pool.query('SELECT id,username,email_key,email_verified_at FROM game_accounts WHERE id=$1',[accountId]);
  const a=current.rows[0];if(!a)throw new AuthError('Conta não encontrada.',401);
  if(a.email_verified_at&&a.email_key===email)return {alreadyVerified:true};
  const token=crypto.randomBytes(32).toString('hex'),tokenHash=sha(token);
  await this.pool.query('DELETE FROM account_email_verifications WHERE account_id=$1',[accountId]);
  await this.pool.query('INSERT INTO account_email_verifications(token_hash,account_id,email,email_key,expires_at) VALUES($1,$2,$3,$4,$5)',[tokenHash,accountId,email,email,new Date(Date.now()+VERIFY_TTL)]);
  try{await send({to:email,username:a.username,token})}
  catch(err){await this.pool.query('DELETE FROM account_email_verifications WHERE token_hash=$1',[tokenHash]).catch(()=>{});throw new AuthError('Não foi possível enviar o e-mail de verificação. Tente mais tarde.',503,'mail_unavailable')}
  return {sent:true};
 }
 async confirmEmail(token){
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new AuthError('Link inválido ou expirado.',400,'invalid_token');
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const r=await client.query('SELECT account_id,email,email_key FROM account_email_verifications WHERE token_hash=$1 AND expires_at>CURRENT_TIMESTAMP FOR UPDATE',[sha(token)]);
   if(!r.rows.length)throw new AuthError('Link inválido ou expirado.',400,'invalid_token');
   const row=r.rows[0];
   await client.query('UPDATE game_accounts SET email=$1,email_key=$2,email_verified_at=CURRENT_TIMESTAMP WHERE id=$3',[row.email,row.email_key,row.account_id]);
   await client.query('DELETE FROM account_email_verifications WHERE account_id=$1',[row.account_id]);
   // Links solicitados pelo endereço anterior deixam de ter validade.
   await client.query('DELETE FROM account_password_resets WHERE account_id=$1',[row.account_id]);
   await client.query('COMMIT');return {verified:true};
  }catch(err){await client.query('ROLLBACK').catch(()=>{});
   if(err.code==='23505')throw new AuthError('Este e-mail já está vinculado a outra conta.',409,'email_in_use');throw err;
  }finally{client.release()}
 }
 async requestPasswordReset(email,send){
  email=cleanEmail(email);
  if(!validEmail(email))return {ok:true};
  const r=await this.pool.query('SELECT id,username,email FROM game_accounts WHERE email_key=$1 AND email_verified_at IS NOT NULL',[email]);
  if(!r.rows.length)return {ok:true}; // Nunca confirma existência de contas.
  const account=r.rows[0];
  const token=crypto.randomBytes(32).toString('hex'),tokenHash=sha(token);
  await this.pool.query('DELETE FROM account_password_resets WHERE account_id=$1',[account.id]);
  await this.pool.query('INSERT INTO account_password_resets(token_hash,account_id,expires_at) VALUES($1,$2,$3)',[tokenHash,account.id,new Date(Date.now()+RESET_TTL)]);
  try{await send({to:account.email,username:account.username,token})}
  catch(err){await this.pool.query('DELETE FROM account_password_resets WHERE token_hash=$1',[tokenHash]).catch(()=>{});throw new AuthError('O envio de e-mails está temporariamente indisponível.',503,'mail_unavailable')}
  return {ok:true};
 }
 async resetPassword(token,password){
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new AuthError('Link inválido ou expirado.',400,'invalid_token');
  if(!validPassword(password))throw new AuthError('A senha deve ter entre 10 e 128 caracteres.');
  const salt=crypto.randomBytes(16).toString('hex');
  const digest=(await scrypt(password,Buffer.from(salt,'hex'),64)).toString('hex');
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const r=await client.query('SELECT account_id FROM account_password_resets WHERE token_hash=$1 AND expires_at>CURRENT_TIMESTAMP FOR UPDATE',[sha(token)]);
   if(!r.rows.length)throw new AuthError('Link inválido, expirado ou já utilizado.',400,'invalid_token');
   const accountId=r.rows[0].account_id;
   await client.query('UPDATE game_accounts SET salt=$1,password_hash=$2 WHERE id=$3',[salt,digest,accountId]);
   await client.query('DELETE FROM game_sessions WHERE account_id=$1',[accountId]);
   await client.query('DELETE FROM account_password_resets WHERE account_id=$1',[accountId]);
   await client.query('COMMIT');return {ok:true,accountId};
  }catch(err){await client.query('ROLLBACK').catch(()=>{});throw err}
  finally{client.release()}
 }
 async logout(cookieHeader){const token=parseCookie(cookieHeader);if(token)await this.pool.query('DELETE FROM game_sessions WHERE token_hash=$1',[sha(token)])}
 async close(){
  const saved=await this.flush();
  if(!saved||this.pending)throw new Error('Falha ao persistir o progresso pendente; desligamento não pode confirmar salvamento.');
  await this.pool.end();
 }
}
module.exports={AccountStore,AuthError,COOKIE,authCookie,clearCookie,parseCookie,validName,validPassword,validEmail,cleanEmail,keyFor};

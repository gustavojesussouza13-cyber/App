'use strict';
/**
 * Verificação SOMENTE LEITURA de um backup PostgreSQL restaurado.
 * Requer SOURCE_DATABASE_URL e RESTORE_DATABASE_URL obtidos de ambiente privado.
 * Nenhum SQL de escrita; não mostra registros nem credenciais.
 */
const crypto = require('node:crypto');
const {Client} = require('pg');
const TABLES = [
 ['game_accounts','id'],
 ['game_sessions','token_hash'],
 ['account_email_verifications','token_hash'],
 ['account_password_resets','token_hash'],
 ['characters','uid'],
 ['guilds','key'],
 ['meta','key']
];
function details(value) {
 if(!value) throw new Error('Defina SOURCE_DATABASE_URL e RESTORE_DATABASE_URL num ambiente privado.');
 const url = new URL(value);
 if(!['postgres:','postgresql:'].includes(url.protocol)) throw new Error('Conexão não é PostgreSQL.');
 return {host:url.hostname.toLowerCase(),port:url.port||'5432',database:decodeURIComponent(url.pathname.slice(1))};
}
function checkTargets(source,restore) {
 const a=details(source),b=details(restore);
 if(!/^peregrinos_restore_[a-z0-9_]{1,45}$/.test(b.database))
  throw new Error('Segurança: o banco de destino deve ter nome peregrinos_restore_<identificador>.');
 if(a.host===b.host&&a.port===b.port&&a.database===b.database)
  throw new Error('Segurança: origem e destino são o mesmo banco.');
 return {a,b};
}
async function fingerprint(client,table,key) {
 // Snapshot de leitura consistente; cursor evita materializar todos os personagens na memória.
 const q=part=>'"'+part.replace(/"/g,'""')+'"';
 const hash=crypto.createHash('sha256');let count=0;
 await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try{
  await client.query('DECLARE validation_cursor NO SCROLL CURSOR FOR SELECT row_to_json(r)::text AS payload FROM (SELECT * FROM public.'+q(table)+' ORDER BY '+q(key)+') r');
  while(true){
   const rows=(await client.query('FETCH FORWARD 250 FROM validation_cursor')).rows;
   if(!rows.length)break;
   for(const r of rows){hash.update(String(r.payload));hash.update('\\n');count++}
  }
  await client.query('CLOSE validation_cursor');
  await client.query('COMMIT');
 }catch(err){await client.query('ROLLBACK').catch(()=>{});throw err}
 return {count,digest:hash.digest('hex')};
}
async function main(){
 const source=process.env.SOURCE_DATABASE_URL,restore=process.env.RESTORE_DATABASE_URL;
 checkTargets(source,restore);
 const origin=new Client({connectionString:source,connectionTimeoutMillis:8000});
 const target=new Client({connectionString:restore,connectionTimeoutMillis:8000});
 try{
  await origin.connect();await target.connect();
  let ok=true;
  for(const [table,key] of TABLES){
   const [a,b]=await Promise.all([fingerprint(origin,table,key),fingerprint(target,table,key)]);
   const match=a.count===b.count&&a.digest===b.digest;
   console.log(table+': origem='+a.count+' destino='+b.count+' '+(match?'OK':'DIVERGENTE'));
   if(!match)ok=false;
  }
  if(!ok){console.error('RESTAURAÇÃO NÃO VALIDADA: dados divergentes.');process.exitCode=1}
  else console.log('RESTAURAÇÃO VALIDADA: tabelas e conteúdo coincidem com a origem no instante da leitura.');
 }finally{await Promise.allSettled([origin.end(),target.end()])}
}
if(require.main===module)main().catch(()=>{console.error('Validação interrompida. Verifique acesso privado, tabelas e configuração das conexões sem expor credenciais.');process.exitCode=1});
module.exports={checkTargets,details};

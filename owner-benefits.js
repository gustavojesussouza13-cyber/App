'use strict';
/** Bônus único de proprietário; nunca concede poderes por e-mail não verificado. */
const MAX_GOLD=999_999_999;
const BONUS_LEVEL=100;
const GRANT_KEY_PREFIX='owner-benefits-v1:';
function normalizeEmail(value){return typeof value==='string'?value.trim().toLowerCase():''}
function isOwnerAccount(account,ownerEmail){
 const e=normalizeEmail(ownerEmail);
 return Boolean(e&&account?.email_verified_at&&normalizeEmail(account.email_key||account.email)===e);
}
function boostedSave(raw){
 const save=raw&&typeof raw==='object'&&!Array.isArray(raw)?{...raw}:{};
 const hpBase={peregrino:135,guardiao:165,arqueiro:112,curandeiro:125};
 const role=Object.hasOwn(hpBase,save.role)?save.role:'peregrino';
 return {...save,role,level:BONUS_LEVEL,xp:0,coins:MAX_GOLD,
  hp:hpBase[role]+(BONUS_LEVEL-1)*12};
}
/**
 * Chamada na inicialização, depois de ler o estado PostgreSQL.
 * A conta deve ter confirmado o e-mail pelo link de verificação.
 * A operação transacional atualiza uma única conta e seu personagem e
 * grava uma marca para NÃO repor dinheiro após futuras reinicializações.
 */
async function grantOwnerBenefits({pool,world,ownerEmail}){
 const email=normalizeEmail(ownerEmail);
 if(!email)return {status:'disabled'};
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {status:'invalid_configuration'};
 const client=await pool.connect();
 let updated=null;
 try{
  await client.query('BEGIN');
  const owners=await client.query(
   'SELECT id,email_key,email_verified_at FROM game_accounts WHERE email_key=$1 AND email_verified_at IS NOT NULL FOR UPDATE',
   [email]);
  if(owners.rows.length!==1){
   await client.query('ROLLBACK');return {status:'awaiting_verified_account'};
  }
  const owner=owners.rows[0],key=GRANT_KEY_PREFIX+owner.id,uid='account:'+owner.id;
  const marker=await client.query('SELECT value FROM meta WHERE key=$1 FOR UPDATE',[key]);
  if(marker.rows.length){
   await client.query('COMMIT');return {status:'already_granted'};
  }
  const row=await client.query('SELECT data FROM characters WHERE uid=$1 FOR UPDATE',[uid]);
  const snapshot=boostedSave(row.rows[0]?.data||world.saved?.characters?.[uid]);
  await client.query(
   'INSERT INTO characters(uid,data) VALUES($1,$2::jsonb) ON CONFLICT(uid) DO UPDATE SET data=EXCLUDED.data',
   [uid,JSON.stringify(snapshot)]);
  await client.query('INSERT INTO meta(key,value) VALUES($1,$2)',
   [key,new Date().toISOString()]);
  await client.query('COMMIT');
  updated={uid,snapshot};
 }catch(err){await client.query('ROLLBACK').catch(()=>{});throw err}
 finally{client.release()}
 if(updated){
  world.saved.characters[updated.uid]=updated.snapshot;
  return {status:'granted',level:BONUS_LEVEL,coins:MAX_GOLD};
 }
 return {status:'no_change'};
}
module.exports={MAX_GOLD,BONUS_LEVEL,isOwnerAccount,boostedSave,grantOwnerBenefits};

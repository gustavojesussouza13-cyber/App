'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {AccountStore}=require('../account-store');
const {World}=require('../world-engine');

test('world retries pending database write even when no new player action occurs',async()=>{
 let retries=0;
 const persistentStore={pending:{characters:{}},flush:async()=>{retries++;persistentStore.pending=null;return true}};
 World.prototype.persist.call({dirty:false,persistentStore});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(retries,1);
});

test('world does not retry when there is no pending write',async()=>{
 let retries=0;
 World.prototype.persist.call({dirty:false,persistentStore:{pending:null,flush:async()=>{retries++}}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(retries,0);
});

test('account close reports failed pending write and avoids closing pool as if clean',async()=>{
 let poolClosed=false;
 const store=new AccountStore({pool:{end:async()=>{poolClosed=true}}});
 store.flush=async()=>false;
 store.pending={characters:{character:{level:1}}};
 await assert.rejects(store.close(),/Falha ao persistir/);
 assert.equal(poolClosed,false);
});

test('account close shuts down cleanly after successful flush',async()=>{
 let poolClosed=false;
 const store=new AccountStore({pool:{end:async()=>{poolClosed=true}}});
 store.flush=async()=>true;
 await store.close();
 assert.equal(poolClosed,true);
});

test('failed database write remains pending and succeeds on next flush',async()=>{
 const store=new AccountStore({pool:{end:async()=>{}}});
 let attempts=0;
 store.saveSnapshot=async(snapshot)=>{
  attempts++;
  if(attempts===1)throw new Error('temporary connection loss');
  assert.equal(snapshot.characters.hero.level,12);
 };
 const originalError=console.error;
 console.error=()=>{};
 try{
  const first=await store.enqueue({characters:{hero:{level:12}},guilds:{},day:1});
  assert.equal(first,false);
  assert.equal(store.pending.characters.hero.level,12);
  const second=await store.flush();
  assert.equal(second,true);
  assert.equal(store.pending,null);
  assert.equal(attempts,2);
 }finally{console.error=originalError}
});

test('a newer pending character snapshot takes precedence after a failed write',async()=>{
 const store=new AccountStore({pool:{end:async()=>{}}});
 let rejectFirst;
 const releaseFirst=new Promise((_,reject)=>{rejectFirst=reject});
 let attempts=0,finalLevel;
 store.saveSnapshot=async(snapshot)=>{
  attempts++;
  if(attempts===1)return releaseFirst;
  finalLevel=snapshot.characters.hero.level;
 };
 const originalError=console.error;
 console.error=()=>{};
 try{
  const first=store.enqueue({characters:{hero:{level:3}},guilds:{},day:1});
  store.enqueue({characters:{hero:{level:9}},guilds:{},day:1});
  rejectFirst(new Error('lost connection'));
  assert.equal(await first,false);
  assert.equal(store.pending.characters.hero.level,9);
  assert.equal(await store.flush(),true);
  assert.equal(finalLevel,9);
 }finally{console.error=originalError}
});

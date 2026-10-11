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

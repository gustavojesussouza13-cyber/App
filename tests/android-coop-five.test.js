'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {MobileCoop}=require('../mobile-coop');
function fixture(){let time=10000,out=new Map(),svc=new MobileCoop({now:()=>time,randInt:()=>0,send:(c,m)=>out.set(c,[...(out.get(c)||[]),m])});const cs=Array.from({length:7},(_,i)=>({i}));
return {svc,cs,advance:n=>time+=n,list:c=>out.get(c)||[],latest:(c,type)=>(out.get(c)||[]).filter(m=>m.type===type).at(-1)}}
test('five players per private room; sixth rejected',()=>{const {svc,cs,latest}=fixture();svc.receive(cs[0],{type:'create',name:'Leader'});const code=latest(cs[0],'joined').code;
 for(let i=1;i<5;i++){svc.receive(cs[i],{type:'join',name:'Hero'+i,code});assert.equal(latest(cs[i],'joined').capacity,5)}
 svc.receive(cs[5],{type:'join',name:'Hero5',code});assert.equal(latest(cs[5],'error').code,'room_full');assert.equal(svc.countPlayers(),5);
});
test('player updates and shared drops reach all five without crossing rooms',()=>{const {svc,cs,latest,list}=fixture();svc.receive(cs[0],{type:'create',name:'Leader'});const code=latest(cs[0],'joined').code;
 for(let i=1;i<5;i++)svc.receive(cs[i],{type:'join',name:'Hero'+i,code});
 svc.receive(cs[5],{type:'create',name:'Other'});
 svc.receive(cs[0],{type:'state',x:190,y:190});for(let i=1;i<5;i++)assert.equal(latest(cs[i],'player').player.x,190);
 svc.receive(cs[0],{type:'enemies',items:[{i:0,x:190,y:190}]});svc.receive(cs[0],{type:'hit',i:0,damage:5});
 for(let i=0;i<5;i++)assert.equal(latest(cs[i],'defeat').xp,8);
 svc.receive(cs[1],{type:'fragment',i:0});svc.receive(cs[2],{type:'fragment',i:0});
 for(let i=0;i<5;i++)assert.equal(list(cs[i]).filter(x=>x.type==='fragment').length,1);
 assert.equal(list(cs[5]).filter(x=>x.type==='player').length,0);
});
test('host migrates and slot is reusable',()=>{const {svc,cs,latest}=fixture();svc.receive(cs[0],{type:'create',name:'Leader'});const code=latest(cs[0],'joined').code;
 for(let i=1;i<5;i++)svc.receive(cs[i],{type:'join',name:'Hero'+i,code});svc.leave(cs[0]);
 assert.equal(latest(cs[1],'host').id,latest(cs[1],'joined').id);
 svc.receive(cs[5],{type:'join',name:'Hero5',code});assert.ok(latest(cs[5],'joined'));assert.equal(svc.countPlayers(),5);
 for(let i=1;i<=5;i++)svc.leave(cs[i]);assert.equal(svc.getRoomCount(),0);
});
test('cannot join with a nickname already used in room',()=>{const {svc,cs,latest}=fixture();svc.receive(cs[0],{type:'create',name:'Leader'});const code=latest(cs[0],'joined').code;svc.receive(cs[1],{type:'join',name:'Leader',code});assert.equal(latest(cs[1],'error').code,'name_taken')});

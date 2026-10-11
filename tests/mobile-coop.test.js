'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {MobileCoop,countEnemies,maxHp}=require('../mobile-coop');
function setup(){let now=10000;const outputs=new Map();const send=(c,v)=>{if(!outputs.has(c))outputs.set(c,[]);outputs.get(c).push(v)};
 const svc=new MobileCoop({send,now:()=>now,randInt:()=>0});const a={id:'a'},b={id:'b'},d={id:'d'};
 const list=c=>outputs.get(c)||[];const latest=(c,t)=>list(c).filter(x=>x.type===t).at(-1);return {svc,a,b,d,list,latest,advance:(ms=1000)=>{now+=ms}};}
test('sala privada aceita no máximo dois e devolve o mesmo capítulo e código',()=>{
 const {svc,a,b,d,latest}=setup();svc.receive(a,{type:'create',name:'Gustavo',chapter:2});let id=latest(a,'joined').code;
 assert.equal(id.length,6);assert.equal(latest(a,'joined').chapter,2);svc.receive(b,{type:'join',name:'Amigo',code:id});
 assert.equal(latest(b,'joined').chapter,2);assert.equal(latest(a,'member_join').name,'Amigo');svc.receive(d,{type:'join',name:'Terceiro',code:id});
 assert.equal(latest(d,'error').code,'room_full');assert.equal(svc.getRoomCount(),1);
});
test('salas diferentes não recebem movimentação alheia',()=>{
 const {svc,a,b,d,latest,list}=setup();svc.receive(a,{type:'create',name:'Gustavo'});let code=latest(a,'joined').code;svc.receive(b,{type:'join',name:'Lia',code});svc.receive(d,{type:'create',name:'Sara'});
 svc.receive(a,{type:'state',x:190,y:500,dir:1});assert.equal(latest(b,'player').player.x,190);assert.equal(list(d).filter(x=>x.type==='player').length,0);
});
test('movimentos impossíveis são limitados e mensagens repetidas ignoradas',()=>{
 const {svc,a,b,advance,latest}=setup();svc.receive(a,{type:'create',name:'Gustavo'});svc.receive(b,{type:'join',name:'Lia',code:latest(a,'joined').code});
 svc.receive(a,{type:'state',x:180,y:200});const first=latest(b,'player').player.x;
 svc.receive(a,{type:'state',x:900,y:900});assert.equal(latest(b,'player').player.x,first);
 advance(120);svc.receive(a,{type:'state',x:900,y:900});assert.ok(latest(b,'player').player.x<250);
});
test('inimigos, centelhas e recompensas são compartilhados e não duplicados',()=>{
 const {svc,a,b,advance,latest,list}=setup();svc.receive(a,{type:'create',name:'Gustavo'});svc.receive(b,{type:'join',name:'Lia',code:latest(a,'joined').code});
 svc.receive(a,{type:'state',x:180,y:200});svc.receive(b,{type:'state',x:190,y:202});
 svc.receive(a,{type:'enemies',items:[{i:0,x:180,y:200}]});
 svc.receive(b,{type:'hit',i:0,damage:5});assert.equal(latest(a,'enemy_hit').hp,0);
 assert.equal(latest(a,'defeat').xp,8);assert.equal(latest(b,'defeat').xp,8);
 advance(400);svc.receive(a,{type:'hit',i:0,damage:5});assert.equal(list(a).filter(x=>x.type==='defeat').length,1);
 svc.receive(a,{type:'fragment',i:0});svc.receive(b,{type:'fragment',i:0});assert.equal(list(a).filter(x=>x.type==='fragment').length,1);
});
test('avanço bloqueado sem boss e três centelhas; depois sincronizado para os dois',()=>{
 const {svc,a,b,advance,latest}=setup();svc.receive(a,{type:'create',name:'Gustavo'});svc.receive(b,{type:'join',name:'Lia',code:latest(a,'joined').code});
 svc.receive(a,{type:'advance'});assert.equal(latest(a,'chapter'),undefined);
 const boss=countEnemies(0)-1;svc.receive(a,{type:'state',x:180,y:200});svc.receive(a,{type:'enemies',items:[{i:boss,x:180,y:200}]});
 svc.receive(a,{type:'hit',i:boss,damage:35});advance(400);svc.receive(a,{type:'hit',i:boss,damage:35});
 assert.equal(latest(a,'defeat').boss,true);
 for(let i=0;i<3;i++)svc.receive(b,{type:'fragment',i});
 svc.receive(b,{type:'advance'});assert.equal(latest(a,'chapter').chapter,1);assert.equal(latest(b,'chapter').chapter,1);
 assert.equal(svc.rooms.values().next().value.fragments.size,0);
});
test('sala é liberada após desconexões e anfitrião muda se necessário',()=>{
 const {svc,a,b,latest}=setup();svc.receive(a,{type:'create',name:'Gustavo'});svc.receive(b,{type:'join',name:'Lia',code:latest(a,'joined').code});svc.leave(a);
 assert.equal(latest(b,'host').id,latest(b,'joined').id);svc.leave(b);assert.equal(svc.getRoomCount(),0);
});
test('códigos inválidos, salas desconhecidas e dano desproporcional são rejeitados',()=>{
 const {svc,a,b,latest,list}=setup();svc.receive(b,{type:'join',name:'Lia',code:'ABCDE2'});assert.equal(latest(b,'error').code,'unknown_room');
 svc.receive(a,{type:'create',name:'Gustavo'});svc.receive(b,{type:'join',name:'Lia',code:latest(a,'joined').code});
 svc.receive(a,{type:'state',x:200,y:200});svc.receive(a,{type:'enemies',items:[{i:0,x:200,y:200}]});svc.receive(a,{type:'hit',i:0,damage:9999});assert.equal(list(a).filter(x=>x.type==='enemy_hit').length,0);
 assert.equal(maxHp(5,countEnemies(5)-1),97);
});

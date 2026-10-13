'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {World}=require('../world-engine');
const root=path.join(__dirname,'../public');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('homepage mostra as quantidades corretas, sem apresentar dez jogadores como limite global',()=>{
 const html=read('index.html'),js=read('site.js');
 assert.match(html,/40<\/b><span>REGIÕES EXPLORÁVEIS/);
 assert.match(html,/40<\/b><span>CAPÍTULOS DA HISTÓRIA/);
 assert.match(html,/id="onlineNumber".*?<span>JOGADORES ONLINE/);
 assert.doesNotMatch(html,/CAPÍTULOS ONLINE|10 JOGADORES ·|SUBSOLOS EXPLORÁVEIS/);
 assert.match(html,/ATÉ 10 POR SALA/);
 assert.match(js,/number\.textContent=String\(d\.online\|\|0\)/);
 assert.doesNotMatch(js,/number\.textContent=d\.online\+'\/'/);
});
test('lobby contém seleção, criação e senha protegida; CSS mantém formulário rolável',()=>{
 const html=read('mundo.html'),client=read('mmo.js'),css=read('mmo.css');
 for(const id of ['roomSelect','roomJoinPassword','newRoomName','newRoomPassword','createRoomForm','roomSummary','roomError'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/até 10 jogadores/);
 assert.match(html,/último jogador sai/);
 assert.match(html,/mmo\.js\?v=rooms-empty-v2/);
 assert.match(client,/fetch\('\/api\/rooms'/);
 assert.match(client,/roomId:selectedRoomId,roomPassword:selectedRoomPassword/);
 assert.match(client,/response\.ok/);
 assert.match(css,/max-height:calc\(100% - 14px\)/);
 assert.match(css,/#roomJoinPassword|\.room-selection input/);
});
test('trocar de sala não perde estado de conta registrada nem mistura criaturas',t=>{
 const persistent={pending:null,enqueue(save){this.pending=structuredClone(save)}};
 const sent=[];
 const main=new World({send:(s,m)=>sent.push(m),getOnline:()=>0,hasClassicName:()=>false,persistentStore:persistent});
 const secondary=new World({send:(s,m)=>sent.push(m),getOnline:()=>0,hasClassicName:()=>false,persistentStore:persistent});
 secondary.saved=main.saved;secondary.guilds=main.guilds;
 t.after(()=>{main.stop();secondary.stop()});
 const uid='account:'+crypto.randomUUID();
 const account={uid,username:'TrocaDeSala'};
 const old={socket:{},authUser:account,worldPlayer:null};
 main.join(old,{name:account.username,token:crypto.randomBytes(32).toString('hex')});
 old.worldPlayer.save.level=22;old.worldPlayer.save.coins=1971;
 old.worldPlayer.save.story.stage=16;
 main.leave(old);
 assert.equal(main.saved.characters[uid].level,22);
 const again={socket:{},authUser:account,worldPlayer:null};
 secondary.join(again,{name:account.username,token:crypto.randomBytes(32).toString('hex')});
 assert.equal(again.worldPlayer.save.level,22);
 assert.equal(again.worldPlayer.save.coins,1971);
 assert.equal(again.worldPlayer.save.story.stage,16);
 assert.equal(main.players.size,0);
 assert.equal(secondary.players.size,1);
 const monsterA=main.monsters.get(0)[0],monsterB=secondary.monsters.get(0)[0];
 monsterB.hp=0;assert.ok(monsterA.hp>0);
});

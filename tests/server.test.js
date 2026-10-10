'use strict';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const crypto=require('node:crypto');
const PORT=31179;
const BASE=`http://127.0.0.1:${PORT}`;
const worker=spawn(process.execPath,['server.js'],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,PORT:String(PORT)},stdio:['ignore','pipe','pipe']});
worker.stderr.on('data',b=>process.stderr.write(b));
after(()=>worker.kill('SIGTERM'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){for(let i=0;i<70;i++){try{const r=await fetch(BASE+'/health');if(r.ok)return}catch{}await sleep(40)}throw Error('server did not start')}
async function connect(name,zone=0,token=crypto.randomUUID()){
 const ws=new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
 let welcome;const messages=[];
 const awaitWelcome=new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('connection timeout')),3000);
  ws.onopen=()=>ws.send(JSON.stringify({type:'hello',name,zone,x:184,y:512,token}));
  ws.onmessage=evt=>{const o=JSON.parse(evt.data);messages.push(o);if(o.type==='welcome'){welcome=o;clearTimeout(timeout);resolve(o)}if(o.type==='error'){clearTimeout(timeout);reject(Object.assign(Error(o.message),{code:o.code}))}};
  ws.onerror=()=>reject(Error('websocket failed'));
 });
 await awaitWelcome;return {ws,welcome,messages,token};
}
test('servidor pronto',ready);
test('serve o site, o jogo e a API de status',async()=>{
 const h=await fetch(BASE+'/');assert.equal(h.status,200);assert.match(await h.text(),/Os Peregrinos/);
 const g=await fetch(BASE+'/jogo.html');assert.equal(g.status,200);assert.match(await g.text(),/netRemotePlayers/);
 const status=await fetch(BASE+'/api/status');assert.equal((await status.json()).online,0);
 assert.equal((await fetch(BASE+'/../server.js')).status,404);
});
test('dois peregrinos no mesmo mapa se veem e conversam',async()=>{
 const a=await connect('ElianTeste'),b=await connect('MiriamTeste');
 assert.equal(b.welcome.online,2);
 assert.ok(b.welcome.players.some(p=>p.name==='ElianTeste'));
 a.ws.send(JSON.stringify({type:'state',x:195,y:519,dir:1,step:10,zone:0}));
 a.ws.send(JSON.stringify({type:'chat',text:'Boa jornada!'}));
 await sleep(450);
 assert.ok(b.messages.find(m=>m.type==='chat'&&m.name==='ElianTeste'&&m.text==='Boa jornada!'));
 assert.ok(b.messages.find(m=>m.type==='snapshot'&&m.players.some(p=>p.name==='ElianTeste')));
 assert.equal((await(await fetch(BASE+'/api/status')).json()).online,2);
 a.ws.close();b.ws.close();await sleep(80);
});
test('nomes ocupados são rejeitados e nomes não autorizados também',async()=>{
 const a=await connect('NomeUnicoTeste');
 await assert.rejects(()=>connect('NomeUnicoTeste'),{code:'name_taken'});
 await assert.rejects(()=>connect('<script>'),{code:'invalid_name'});
 a.ws.close();await sleep(80);
});
test('áreas diferentes compartilham servidor, mas não sprites',async()=>{
 const a=await connect('ValeTeste',0),b=await connect('BosqueTeste',1);
 assert.equal(b.welcome.players.length,0);
 await sleep(350);
 const snap=a.messages.findLast(m=>m.type==='snapshot');assert.ok(snap);assert.equal(snap.players.length,0);
 a.ws.close();b.ws.close();await sleep(80);
});

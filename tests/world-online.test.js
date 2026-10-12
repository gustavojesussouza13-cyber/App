'use strict';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const PORT=33467;
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-online-'));
const server=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(PORT),DATA_FILE:path.join(temp,'db.sqlite')},stdio:['ignore','pipe','pipe']});
server.stderr.on('data',b=>process.stderr.write(b));
after(()=>{server.kill('SIGTERM');setTimeout(()=>fs.rmSync(temp,{recursive:true,force:true}),200).unref()});
const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
async function ready(){for(let n=0;n<80;n++){try{const r=await fetch(`http://127.0.0.1:${PORT}/health`);if(r.ok)return}catch{}await delay(40)}throw Error('Servidor MMO não iniciou')}
function wsConnect(endpoint,name){return new Promise((resolve,reject)=>{
 const sock=new WebSocket(`ws://127.0.0.1:${PORT}/${endpoint}`),all=[],timer=setTimeout(()=>reject(new Error('Tempo excedido')),4500);
 sock.addEventListener('open',()=>sock.send(JSON.stringify({type:'hello',name,token:crypto.randomBytes(32).toString('hex'),zone:0,x:768,y:512})));
 sock.addEventListener('message',e=>{const o=JSON.parse(e.data);all.push(o);if(o.type==='welcome'||o.type==='error'){clearTimeout(timer);resolve({sock,all,result:o})}});
 sock.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Falha WS'))});
})}
test('mundo novo é servido com scripts, css, status e 576 criaturas',async()=>{
 await ready();const [home,script,style,status]=await Promise.all([
 fetch(`http://127.0.0.1:${PORT}/mundo`),fetch(`http://127.0.0.1:${PORT}/mmo.js`),fetch(`http://127.0.0.1:${PORT}/mmo.css`),fetch(`http://127.0.0.1:${PORT}/api/status`)]);
 assert.equal(home.status,200);assert.match(await home.text(),/MUNDO ABERTO/);assert.equal(script.status,200);assert.match(await script.text(),/OsPeregrinosMundo/);assert.equal(style.status,200);
 const data=await status.json();assert.equal(data.maxPlayers,10);assert.equal(data.world.monsters,576);assert.equal(data.world.regions,40);
});
test('dois jogadores sem conta entram no mundo, compartilham monstros e conversam',async()=>{
 const a=await wsConnect('world-ws','AmigoCerto'),b=await wsConnect('world-ws','AmigaCerta');
 try{assert.equal(a.result.type,'welcome');assert.equal(b.result.type,'welcome');assert.equal(b.result.zones.length,40);assert.equal(b.result.online,2);
  a.sock.send(JSON.stringify({type:'chat',channel:'global',text:'Vamos explorar Auren?'}));await delay(550);
  assert.ok(b.all.some(e=>e.type==='chat'&&e.name==='AmigoCerto'&&e.text==='Vamos explorar Auren?'));
  assert.ok(b.all.some(e=>e.type==='snapshot'&&e.players.some(p=>p.name==='AmigoCerto')));
  assert.ok(b.all.some(e=>e.type==='snapshot'&&e.monsters.length>0));
 }finally{a.sock.close();b.sock.close();await delay(100)}
});
test('limite de 10 é compartilhado entre jogo original e mundo MMO',async()=>{
 const con=[];try{
  for(let i=0;i<5;i++){const c=await wsConnect('ws','Antigo'+i);assert.equal(c.result.type,'welcome');con.push(c)}
  for(let i=0;i<5;i++){const c=await wsConnect('world-ws','MundoNovo'+i);assert.equal(c.result.type,'welcome');con.push(c)}
  const status=await(await fetch(`http://127.0.0.1:${PORT}/api/status`)).json();assert.equal(status.online,10);assert.equal(status.availableSlots,0);
  const overflow=await wsConnect('world-ws','ExtraNovo');assert.equal(overflow.result.code,'full');overflow.sock.close();
  const overflowOld=await wsConnect('ws','ExtraAntigo');assert.equal(overflowOld.result.code,'full');overflowOld.sock.close();
 }finally{for(const c of con)c.sock.close();await delay(120)}
});
test('campanha clássica mostra retorno ao Mundo Online sem perder o jogo original',async()=>{
 await ready();
 const game=await fetch(`http://127.0.0.1:${PORT}/jogo.html`);
 assert.equal(game.status,200);
 const html=await game.text();
 assert.match(html,/<script defer src="\/classic-return\.js"><\/script>/);
 assert.match(html,/function intro\(/);
 assert.match(html,/id="originalMusic0"/);
 const script=await fetch(`http://127.0.0.1:${PORT}/classic-return.js`);
 assert.equal(script.status,200);
 const js=await script.text();
 assert.match(js,/VOLTAR À VERSÃO ONLINE \(MMORPG\)/);
 assert.match(js,/header\.href=target/);
});

test('rota /health confirma processo e /health/ready sinaliza falta de banco',async()=>{
 await ready();
 const [live,readyResponse]=await Promise.all([
  fetch(`http://127.0.0.1:${PORT}/health`),
  fetch(`http://127.0.0.1:${PORT}/health/ready`)
 ]);
 assert.equal(live.status,200);
 assert.equal(await live.text(),'ok');
 // Este servidor dos testes roda intencionalmente sem DATABASE_URL.
 assert.equal(readyResponse.status,503);
 const status=await readyResponse.json();
 assert.equal(status.ready,false);
 assert.equal(status.database,'unavailable');
 assert.equal(readyResponse.headers.get('cache-control'),'no-store');
});

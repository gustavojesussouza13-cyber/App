'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {create:latencyCreate}=require('../public/latency');
const {create:motionCreate}=require('../public/player-motion');
const {World}=require('../world-engine');
const read=name=>fs.readFileSync(path.join(__dirname,'../public',name),'utf8');

test('ping mede tempo real de ida e volta e ignora respostas fora de ordem',()=>{
 const ping=latencyCreate({interval:5000,timeout:12000}),sent=[];
 assert.equal(ping.state().quality,'offline');
 assert.equal(ping.poll(1000,p=>sent.push(p)),true);
 assert.equal(sent.length,1);
 assert.equal(ping.poll(1200,p=>sent.push(p)),false);
 assert.equal(ping.receive({id:999},1050),false);
 assert.equal(ping.receive({id:sent[0].id},1080),true);
 assert.equal(ping.state().ms,80);
 assert.equal(ping.state().quality,'good');
 assert.equal(ping.receive({id:sent[0].id},1100),false,'resposta duplicada descartada');
 assert.equal(ping.poll(4000,p=>sent.push(p)),false,'medição a cada cinco segundos');
 assert.equal(ping.poll(6000,p=>sent.push(p)),true);
 assert.equal(ping.receive({id:sent[1].id},6220),true);
 assert.equal(ping.state().ms,220);
 assert.equal(ping.state().quality,'high');
});

test('ping exibe atraso mediano, timeout, nova tentativa e offline',()=>{
 const ping=latencyCreate({interval:5000,timeout:12000}),sent=[];
 ping.poll(1000,p=>sent.push(p));
 assert.equal(ping.receive(sent[0],1145),true);
 assert.equal(ping.state().quality,'medium');
 ping.poll(6000,p=>sent.push(p));
 assert.equal(ping.state().ms,145);
 ping.poll(18100,p=>sent.push(p));
 assert.equal(ping.state().quality,'timeout');
 assert.equal(ping.state().ms,null);
 assert.equal(sent.length,3);
 assert.equal(ping.receive(sent[1],18200),false,'resposta antiga não afeta o valor atual');
 assert.equal(ping.receive(sent[2],18245),true);
 assert.equal(ping.state().ms,145);
 ping.reset();
 assert.equal(ping.state().quality,'offline');
 assert.equal(ping.state().ms,null);
});

test('servidor devolve identificador do ping sem alterar salvamento ou progresso',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-ping-'));
 const messages=[];
 const world=new World({send:(_s,msg)=>messages.push(msg),getOnline:()=>0,hasClassicName:()=>false,dataFile:path.join(dir,'world.json')});
 t.after(()=>{world.stop();fs.rmSync(dir,{recursive:true,force:true})});
 const client={socket:{},worldPlayer:null};world.join(client,{name:'PingTeste',token:'a'.repeat(64)});
 assert.ok(client.worldPlayer,'personagem de testes criado');
 const p=client.worldPlayer;
 const level=p.save.level,coins=p.save.coins;
 messages.length=0;
 world.receive(client,{type:'ping',id:17});
 assert.deepEqual(messages.map(x=>x.type==='pong'?x.id:null).filter(x=>x!==null),[17]);
 world.receive(client,{type:'ping',id:18});
 assert.equal(messages.filter(x=>x.type==='pong').length,1,'limite anti-spam');
 p.lastLatencyPing=Date.now()-2000;
 world.receive(client,{type:'ping',id:19});
 assert.deepEqual(messages.filter(x=>x.type==='pong').map(x=>x.id),[17,19]);
 p.lastLatencyPing=Date.now()-2000;
 world.receive(client,{type:'ping',id:'invalid'});
 assert.equal(messages.filter(x=>x.type==='pong').length,2);
 assert.equal(p.save.level,level);
 assert.equal(p.save.coins,coins);
});

test('posição de Gustavo vista por outro jogador é interpolada entre snapshots',()=>{
 const motion=motionCreate({delay:300});
 const first=[{id:'gustavo-test',name:'Gustavo',zone:0,x:100,y:200,dir:1}];
 motion.sync(first,0);
 assert.equal(motion.draw(first,0)[0].x,100);
 const second=[{...first[0],x:170}];
 motion.sync(second,350);
 const frame=motion.draw(second,500)[0]; // posição entre os dois snapshots
 assert.ok(frame.x>100&&frame.x<170,`quadro visual esperado intermediário; recebido ${frame.x}`);
 assert.equal(frame.moving,true);
 assert.equal(second[0].x,170,'snapshot do servidor permanece imutável');
 const third=[{...first[0],x:240}];
 motion.sync(third,700);
 const later=motion.draw(third,755)[0];
 assert.ok(later.x>frame.x&&later.x<240,'avanço suave ao longo da trajetória');
 const current=motion.draw(third,1110)[0];
 assert.equal(current.x,240);
 assert.equal(current.moving,false,'não anima corrida parado');
});

test('teletransporte, saída do alcance e troca de região limpam interpolação remota',()=>{
 const motion=motionCreate();
 let p={id:'p1',x:30,y:50,dir:2};
 motion.sync([p],0);
 p={...p,x:60};
 motion.sync([p],350);
 const teleported={...p,x:900,y:800};
 motion.sync([teleported],700);
 assert.equal(motion.draw([teleported],780)[0].x,900,'teleporte distante não atravessa o mapa');
 motion.sync([],1000);
 assert.equal(motion.position('p1'),null);
 motion.sync([p],1100);
 motion.clear();
 assert.equal(motion.position('p1'),null);
});

test('script da interface mede ping e suaviza apenas sprites remotos, sem alterar mobile',()=>{
 const js=read('mmo.js'),html=read('mundo.html'),art=read('art16.js'),css=read('mmo.css');
 assert.match(js,/OsPeregrinosLatency\.create/);
 assert.match(js,/latency\.poll\(performance\.now\(\),details=>send\('ping',details\)\)/);
 assert.match(js,/latency\.receive\(msg,performance\.now\(\)\)/);
 assert.match(js,/playerMotion\.sync\(\[\.\.\.people\.values\(\)\],performance\.now\(\)\)/);
 assert.match(js,/players:playerMotion\.draw\(\[\.\.\.session\.players\.values\(\)\],now\)/);
 assert.match(js,/playerMotion\.clear\(\)/);
 assert.match(art,/character\(ctx,p,false,now,p\.moving!==false\)/);
 assert.match(html,/id="pingIndicator"/);
 assert.ok(html.indexOf('/latency.js')<html.indexOf('/mmo.js'));
 assert.ok(html.indexOf('/player-motion.js')<html.indexOf('/mmo.js'));
 assert.match(css,/\.ping-indicator\[data-quality="high"\]/);
});

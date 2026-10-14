'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {World}=require('../world-engine');
const politics=require('../kingdom-politics');

const read=filename=>fs.readFileSync(path.join(__dirname,'../public',filename),'utf8');
const clientSource=read('mmo.js');
const guildSource=read('guild-city-3d.js');
const classicSource=read('city-isometric.js');

function createRealClientSend(messages){
 const start=clientSource.indexOf('function send(type,data={}){');
 const end=clientSource.indexOf('\nfunction setOnline(',start);
 assert.ok(start>=0&&end>start,'a função real de envio WebSocket deve existir');
 const source=clientSource.slice(start,end);
 const socket={readyState:1,send:data=>messages.push(JSON.parse(data))};
 return new Function('socket','WebSocket','session',source+'\nreturn send;')(
  socket,{OPEN:1},{connected:true});
}

test('pacote de construção não substitui o roteamento kingdom por house',()=>{
 const messages=[],send=createRealClientSend(messages);
 assert.match(guildSource,/sendOperation\('construct',\{buildingType:selected,x,y,target:base\.name\}/);
 assert.match(classicSource,/send\('kingdom',\{action:'construct',buildingType:selected,x,y,target:base\.name\}/);
 assert.equal(send('kingdom',{action:'construct',buildingType:'house',x:6,y:9}),true);
 assert.equal(messages[0].type,'kingdom');
 assert.equal(messages[0].buildingType,'house');
 // Mesmo um chamador incorreto não pode sobrescrever o tipo de mensagem.
 send('kingdom',{type:'house',action:'construct',buildingType:'house'});
 assert.equal(messages[1].type,'kingdom');
 assert.equal(messages[1].buildingType,'house');
});

test('caminho completo: envio WebSocket, construção autoritativa, estado e recibo sem débito duplicado',async t=>{
 const messages=[],packets=[],commits=[];
 const world=new World({persistentStore:{enqueue:s=>{commits.push(structuredClone(s));return Promise.resolve(true)}},
  send:(_socket,message)=>messages.push(message),autosave:false,getOnline:()=>0,hasClassicName:()=>false});
 t.after(()=>world.stop());
 const uid='account:wire-builder';
 const client={socket:{},authUser:{uid,username:'Construtor'},worldPlayer:null};
 world.join(client,{name:'Construtor'});
 const player=client.worldPlayer;
 player.save.coins=10000;player.x=768;player.y=512;
 world.guild(player,{action:'create',name:'Reino dos Testes'});
 const options={walkable:()=>true,portals:[],npcs:[]};
 assert.equal(politics.action(world,player,{action:'place',x:768,y:512},options),true);
 const send=createRealClientSend(packets);
 const opKey='c1a0b123-32aa-4123-8abc-abcdef123456';
 assert.equal(send('kingdom',{action:'construct',buildingType:'house',x:6,y:9,requestId:101,opKey}),true);
 const packet=packets[0];
 assert.equal(packet.type,'kingdom');
 assert.equal(packet.buildingType,'house');
 const wallet=player.save.coins;
 world.receive(client,packet);
 let guild=world.guilds.get('reino dos testes');
 assert.equal(guild.city.buildings.length,1,'a obra deve entrar no estado do servidor');
 assert.equal(guild.city.buildings[0].type,'house');
 assert.equal(guild.city.buildings[0].status,'building');
 assert.equal(player.save.coins,wallet-120,'débito somente após aceitar a obra');
 assert.ok(messages.some(m=>m.type==='kingdomActionResult'&&m.id===101&&m.ok));
 assert.equal(politics.publicState(world,player).cities[0].buildings.length,1);
 // A retransmissão usa o mesmo UUID: não duplica casa nem moeda.
 world.receive(client,packet);
 assert.equal(guild.city.buildings.length,1);
 assert.equal(player.save.coins,wallet-120);
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(messages.some(m=>m.type==='kingdomDurable'&&m.id===101&&m.ok));
 assert.ok(commits.some(s=>s.guilds['reino dos testes']?.city?.buildings?.length===1));
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {World,ZONES}=require('../world-engine');

const script=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
const art=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');

function welcomeHarness(){
 const begin=script.indexOf("if(msg.type==='welcome'){");
 const end=script.indexOf("}else if(msg.type==='character'){",begin);
 assert.ok(begin>=0&&end>begin,'bloco welcome precisa existir');
 const source='function processWelcome(msg){'+script.slice(begin+"if(msg.type==='welcome'){".length,end)+'}';
 const clears=[];
 const state={portals:[{zone:99,name:'portal antigo',x:999,y:99}],monsters:new Map(),players:new Map(),zone:0,connected:true};
 const elementCache=new Map(),travelRenders=[];
 function $(id){
  if(!elementCache.has(id))elementCache.set(id,{hidden:false,disabled:false,
   close(){this.closed=true},focus(){},textContent:''});
  return elementCache.get(id);
 }
 const empty={clear(){clears.push('clear')}};
 const sandbox={
  session:state,$,Math,Array,
  roomSwitchPending:true,roomSwitchTarget:'nova-sala',selectedRoomId:'sala-antiga',
  roomName:'Sala Antiga',pendingRoom:null,authed:true,
  keys:new Set(),joystick:{release(){}},closeDialogue(){},
  monsterMotion:empty,playerMotion:empty,combatFx:empty,
  spriteActions:{monsters:new Map(),players:new Map(),fallen:[{id:'velho'}]},
  drawTravel(){travelRenders.push([...state.portals])},
  setOnline(){},displayOnline(){},character(){},alert(){},
 };
 const context=vm.createContext(sandbox);
 vm.runInContext(source+';this.processWelcome=processWelcome;',context);
 return {context,state,travelRenders,$,clears};
}
function packet(room='nova-sala',zone=0){
 const simulatedWorld=new World({send(){},getOnline:()=>0,hasClassicName:()=>false,
  persistentStore:{enqueue(){}}});
 const portals=simulatedWorld.zonePortals(zone);
 simulatedWorld.stop();
 return {type:'welcome',room:{id:room,name:'Nova sala'},
  self:{id:'jogador',name:'Peregrino',zone,role:'peregrino'},zones:ZONES.map((z,i)=>({id:i,name:z[0],biome:z[1]})),
  portals,shop:[],relics:{},quests:[],achievements:{},npcs:[],online:1};
}
test('Portais não desaparecem quando o jogador troca de sala pela janela de servidores',()=>{
 const h=welcomeHarness(),msg=packet();
 assert.ok(msg.portals.length>=1,'servidor precisa ter portais');
 h.context.processWelcome(msg);
 assert.deepEqual(h.state.portals,msg.portals);
 assert.ok(h.travelRenders.length>=1,'painel de passagens precisa atualizar');
 assert.deepEqual(h.travelRenders.at(-1),msg.portals);
 assert.equal(h.context.roomSwitchPending,false);
 assert.equal(h.$('roomSwitchDialog').closed,true);
 assert.equal(h.context.selectedRoomId,'nova-sala');
 assert.equal(h.state.portals.some(p=>p.name==='portal antigo'),false);
});
test('Toda região do jogo fornece portais após troca ou novo login',()=>{
 for(let z=0;z<ZONES.length;z++){
  const h=welcomeHarness(),msg=packet('nova-sala',z);
  h.context.processWelcome(msg);
  assert.ok(h.state.portals.length>0,'região '+z+' não pode ficar sem passagens');
  assert.deepEqual(h.state.portals,msg.portals);
  assert.ok(h.state.portals.every(p=>p.zone>=0&&p.zone<ZONES.length));
 }
});
test('O renderizador desenha os portais recebidos do servidor e a interação E permanece por cima',()=>{
 assert.match(art,/for\(const p of portals\)\{if\(p\.x<cameraX-140/);
 assert.match(art,/actors\.push\(\{depth:p\.y-1,paint:\(\)=>portal\(ctx,p,now,\{x,y\}\)\}\)/);
 assert.match(art,/portalInteractionHud\(ctx,portals,\{x,y\}\)/);
 const welcomeStart=script.indexOf("if(msg.type==='welcome'){");
 const welcomeEnd=script.indexOf("}else if(msg.type==='character'){",welcomeStart);
 const welcome=script.slice(welcomeStart,welcomeEnd);
 assert.doesNotMatch(welcome,/session\.portals=\[\]/,'troca de sala não pode apagar os portais');
 assert.match(welcome,/session\.portals=Array\.isArray\(msg\.portals\)\?msg\.portals:\[\]/);
 assert.match(html,/art16\.js\?v=pixel-art-v1&pc=portal-hud-v2/);
});

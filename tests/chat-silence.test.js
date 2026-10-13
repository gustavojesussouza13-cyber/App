'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {World}=require('../world-engine');
function setup(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-chat-')),file=path.join(dir,'world.json');
 const mail=new Map();
 const world=new World({send:(s,m)=>{if(!mail.has(s))mail.set(s,[]);mail.get(s).push(m)},getOnline:()=>0,hasClassicName:()=>false,dataFile:file});
 t.after(()=>{world.stop();fs.rmSync(dir,{recursive:true,force:true})});
 function add(name,registered=false){
  const token=crypto.randomBytes(32).toString('hex'),c={socket:{},worldPlayer:null,authUser:registered?{uid:'account:'+name.toLowerCase(),username:name}:null};
  world.join(c,{name,token});
  return {p:c.worldPlayer,c,token,events:()=>mail.get(c.socket)||[],clear:()=>mail.set(c.socket,[])};
 }
 return {world,add,file};
}
test('silenciamento impede o chat global sem afetar outros jogadores',t=>{
 const h=setup(t),a=h.add('AliceChat'),b=h.add('BrunoChat'),c=h.add('CarlaChat');
 h.world.receive(a.c,{type:'ignore',action:'add',target:'BrunoChat'});
 assert.deepEqual(a.p.save.blocked,['brunochat']);
 a.clear();b.clear();c.clear();
 h.world.receive(b.c,{type:'chat',channel:'global',text:'Olá grupo!'});
 assert.equal(a.events().filter(m=>m.type==='chat').length,0);
 assert.equal(c.events().filter(m=>m.type==='chat').length,1);
 assert.equal(b.events().filter(m=>m.type==='chat').length,1);
 h.world.receive(a.c,{type:'ignore',action:'remove',target:'BrunoChat'});
 b.p.lastChat=0;h.world.chatGuard.state(b.p.uid).last=0;a.clear();
 h.world.receive(b.c,{type:'chat',channel:'global',text:'Agora pode ler'});
 assert.equal(a.events().filter(m=>m.type==='chat').length,1);
});
test('comandos /ignorar e /designorar são privados e não entram no chat público',t=>{
 const h=setup(t),a=h.add('AliceTeste'),b=h.add('BrunoTeste');
 a.clear();b.clear();
 h.world.receive(a.c,{type:'chat',text:'/ignorar BrunoTeste',channel:'global'});
 assert.deepEqual(a.p.save.blocked,['brunoteste']);
 assert.equal(b.events().filter(m=>m.type==='chat').length,0);
 a.p.lastChat=0;
 h.world.receive(a.c,{type:'chat',text:'/designorar BrunoTeste',channel:'global'});
 assert.deepEqual(a.p.save.blocked,[]);
});
test('bloqueios não são aplicados a si mesmo e têm limite de 30 nomes',t=>{
 const h=setup(t),a=h.add('AliceChat');
 h.world.ignore(a.p,{action:'add',target:'AliceChat'});
 assert.deepEqual(a.p.save.blocked,[]);
 h.world.ignore(a.p,{action:'add',target:'??'});
 assert.deepEqual(a.p.save.blocked,[]);
 for(let i=0;i<35;i++)h.world.ignore(a.p,{action:'add',target:'PessoaChat'+i});
 assert.equal(a.p.save.blocked.length,30);
 assert.equal(new Set(a.p.save.blocked).size,30);
});
test('bloqueios permanecem após reinício do servidor',t=>{
 const h=setup(t),a=h.add('AliceSave',true);
 h.world.ignore(a.p,{action:'add',target:'BrunoSave'});
 h.world.leave(a.c);
 const restarted=new World({send:()=>{},getOnline:()=>0,hasClassicName:()=>false,dataFile:h.file});
 t.after(()=>restarted.stop());
 const c={socket:{},worldPlayer:null,authUser:{uid:'account:alicesave',username:'AliceSave'}};
 restarted.join(c,{name:'AliceSave',token:a.token});
 assert.deepEqual(c.worldPlayer.save.blocked,['brunosave']);
 const self=restarted.ownStatus(c.worldPlayer);
 assert.deepEqual(self.blocked,['brunosave']);
});
test('interface da aba Social oferece bloqueio e desbloqueio',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 assert.match(code,/Proteção do chat/);
 assert.match(code,/send\('ignore',\{action:'add',target:muted\.value\.trim\(\)\}\)/);
 assert.match(code,/send\('ignore',\{action:'remove',target:muted\.value\.trim\(\)\}\)/);
});

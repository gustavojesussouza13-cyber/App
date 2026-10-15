'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {World}=require('../world-engine');
const {create}=require('../public/chat-bubbles');
function fixture(){
 const events=[];
 const persistentStore={enqueue:()=>Promise.resolve(true)};
 const opts={send:(socket,msg)=>{events.push({socket,msg});socket.inbox?.push(msg)},getOnline:()=>0,hasClassicName:()=>false,persistentStore};
 const main=new World(opts),temporary=new World(opts);
 main.roomId='auren-publica';temporary.roomId='room-ephemeral-123';
 temporary.saved=main.saved;temporary.guilds=main.guilds;
 return {main,temporary,events,stop(){main.stop();temporary.stop()}};
}
function enter(world,name,uid){
 const c={socket:{inbox:[]},authUser:{uid,username:name},worldPlayer:null};
 world.join(c,{name,token:crypto.randomBytes(32).toString('hex')});
 assert.ok(c.worldPlayer);return c;
}
test('trocar de servidor suspende guilda, esconde capital e preserva vínculo no banco',t=>{
 const f=fixture();t.after(()=>f.stop());
 const uid='account:'+crypto.randomUUID(),c=enter(f.main,'PedraDourada',uid);
 const guild={name:'Guardiões Reais',leader:uid,members:[uid],moderators:[],
  base:{zone:0,x:800,y:460,level:2},army:{militia:10}};
 f.main.guilds.set('guardiões reais',guild);
 c.worldPlayer.save.guild=guild.name;c.worldPlayer.save.level=23;c.worldPlayer.save.coins=781;
 f.main.leave(c);
 assert.equal(f.main.saved.characters[uid].guild,guild.name);
 const abroad=enter(f.temporary,'PedraDourada',uid);
 assert.equal(abroad.worldPlayer.save.guild,null);
 assert.equal(abroad.worldPlayer.save.guildDormant,guild.name);
 assert.equal(f.temporary.ownStatus(abroad.worldPlayer).guild,null);
 assert.equal(f.temporary.guildDirectory(abroad.worldPlayer).guilds.length,0);
 assert.equal(f.temporary.guildDirectory(abroad.worldPlayer).canApply,false);
 assert.equal(f.temporary.publicPlayer(abroad.worldPlayer).guild,null);
 const kingdoms=require('../kingdom-politics').publicState(f.temporary,abroad.worldPlayer);
 assert.equal(kingdoms.yourGuild,null);assert.equal(kingdoms.bases.length,0);
 assert.equal(kingdoms.cities.length,0);
 f.temporary.guild(abroad.worldPlayer,{action:'create',name:'Outro Reino'});
 assert.equal(f.temporary.guilds.size,1);
 assert.equal(abroad.worldPlayer.save.guild,null);
 f.temporary.persist();assert.equal(f.main.saved.characters[uid].guild,guild.name);
 f.temporary.leave(abroad);
 const returned=enter(f.main,'PedraDourada',uid);
 assert.equal(returned.worldPlayer.save.guild,guild.name);
 assert.equal(returned.worldPlayer.save.level,23);
 assert.equal(returned.worldPlayer.save.coins,781);
 assert.equal(f.main.guildDirectory(returned.worldPlayer).current,'guardiões reais');
 assert.equal(require('../kingdom-politics').publicState(f.main,returned.worldPlayer).bases.length,1);
});
test('balões mostram mensagens moderadas acima do remetente e desaparecem',()=>{
 const view=create({ttlMs:4800}),paints=[];
 const ctx={fillStyle:'',font:'',textAlign:'',textBaseline:'',save(){},restore(){},
  fillRect(...args){paints.push(['rect',...args])},
  fillText(...args){paints.push(['text',...args])},
  measureText(str){return {width:str.length*7}}};
 assert.equal(view.show({senderId:'p1',channel:'global',text:'Olá, jogadores!'},1000),true);
 view.draw(ctx,{players:[{id:'p1',x:100,y:350}],cameraX:0,cameraY:0,width:500,height:500,now:1300});
 assert.ok(paints.some(x=>x[0]==='text'&&x[1].includes('Olá')));
 assert.equal(view.active(1500).length,1);
 view.draw(ctx,{players:[{id:'p1',x:140,y:350}],width:500,height:500,now:5900});
 assert.equal(view.active(5900).length,0);
 assert.equal(view.show({senderId:'p1',channel:'invalid',text:'Olá'},6000),false);
});
test('chat envia id real e região apenas aos jogadores autorizados',t=>{
 const f=fixture();t.after(()=>f.stop());
 const a=enter(f.main,'PrimeiroFala','account:'+crypto.randomUUID());
 const b=enter(f.main,'SegundoOuve','account:'+crypto.randomUUID());
 f.main.chat(a.worldPlayer,{text:'Olá pessoal!',channel:'global'});
 const event=b.socket.inbox.find(x=>x.type==='chat');
 assert.equal(event.senderId,a.worldPlayer.id);assert.equal(event.zone,a.worldPlayer.zone);
 assert.equal(event.text,'Olá pessoal!');
 const before=b.socket.inbox.length;
 b.worldPlayer.save.blocked=['primeirofala'];
 f.main.chat(a.worldPlayer,{text:'Vamos explorar!',channel:'global'});
 assert.equal(b.socket.inbox.length,before,'jogador bloqueado não recebe chat nem balão');
});
test('scripts de balões e fortaleza permanecem separados',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 const client=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
 assert.ok(html.indexOf('chat-bubbles.js')>=0&&html.indexOf('chat-bubbles.js')<html.indexOf('mmo.js'));
 assert.match(client,/chatBubbles\.draw\(/);
 assert.match(server,/serializePlayer\(p\)/);
 assert.match(html,/guild-city-3d\.js/);
});

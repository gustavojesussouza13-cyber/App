'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {World}=require('../world-engine');
const politics=require('../kingdom-politics');
function fixture(t){
 const events=[],saved=[];
 const world=new World({autosave:false,persistentStore:{enqueue:data=>{saved.push(structuredClone(data));return Promise.resolve(true)}},
  send:(sock,msg)=>events.push({sock,msg}),getOnline:()=>0,hasClassicName:()=>false});
 t.after(()=>world.stop());
 function player(name){
  const c={socket:{},authUser:{uid:'account:'+name,username:name},worldPlayer:null};
  world.join(c,{name});const p=c.worldPlayer;p.save.coins=4000;p.x=768;p.y=512;
  return {p,c};
 }
 return {world,events,saved,player};
}
test('último membro dissolve guilda, fortaleza, ranking e marca do mapa',t=>{
 const f=fixture(t),{p}=f.player('Chefe');
 f.world.guild(p,{action:'create',name:'Guilda Fantasma'});
 assert.equal(p.save.guild,'Guilda Fantasma');
 assert.equal(politics.action(f.world,p,{action:'place',x:768,y:512},
  {walkable:()=>true,portals:[],npcs:[]}),true);
 assert.ok(politics.publicState(f.world,p).bases.some(g=>g.name==='Guilda Fantasma'));
 f.world.guild(p,{action:'leave'});
 assert.equal(f.world.guilds.has('guilda fantasma'),false);
 assert.equal(p.save.guild,null);
 assert.equal(politics.publicState(f.world,p).bases.length,0);
 assert.equal(politics.rank(f.world).length,0);
 assert.equal(f.world.guildDirectory(p).guilds.length,0);
 assert.ok(f.events.some(e=>e.msg.type==='kingdomState'&&
  !e.msg.data.bases.some(g=>g.name==='Guilda Fantasma')));
});
test('desconectar o último jogador online não apaga guilda com membro offline',t=>{
 const f=fixture(t),{p,c}=f.player('MembroUnico');
 f.world.guild(p,{action:'create',name:'Ordem Persistente'});
 f.world.leave(c);
 assert.equal(f.world.count,0);
 assert.ok(f.world.guilds.has('ordem persistente'));
 assert.deepEqual(f.world.guilds.get('ordem persistente').members,[p.uid]);
});
test('limpeza de registros antigos remove só vazios e associações negadas pelo próprio personagem salvo',t=>{
 const f=fixture(t),{p}=f.player('Fundador');
 f.world.guild(p,{action:'create',name:'Real Legada'});
 const valid=f.world.guilds.get('real legada');
 f.world.guilds.set('fantasma',{name:'Fantasma',leader:null,members:[],base:{zone:0,x:123,y:123}});
 f.world.guilds.set('falha',{name:'Falha',leader:'account:Ausente',members:['account:Ausente'],base:{zone:0,x:333,y:333}});
 f.world.saved.characters['account:Ausente']={guild:null};
 assert.equal(f.world.reconcileGuilds(),true);
 assert.equal(f.world.guilds.has('fantasma'),false);
 assert.equal(f.world.guilds.has('falha'),false);
 assert.equal(f.world.guilds.get('real legada'),valid);
});
test('candidatura exige conta e apenas líder ou moderador podem aceitar',t=>{
 const f=fixture(t),leader=f.player('Lider'),moderator=f.player('Moderador'),candidate=f.player('Candidato'),stranger=f.player('Curioso');
 f.world.guild(leader.p,{action:'create',name:'Guardiões da Aurora'});
 const g=f.world.guilds.get('guardiões da aurora');
 f.world.guild(candidate.p,{action:'apply',name:g.name});
 assert.equal(g.applications.length,1);
 assert.equal(f.world.guildDirectory(stranger.p).guilds[0].applications,undefined);
 assert.equal(f.world.guildDirectory(leader.p).guilds[0].applications.length,1);
 const id=g.applications[0].id;
 f.world.guild(stranger.p,{action:'approve',applicationId:id});
 assert.equal(candidate.p.save.guild,null);
 f.world.guild(leader.p,{action:'approve',applicationId:id});
 assert.equal(candidate.p.save.guild,g.name);
 assert.equal(g.members.includes(candidate.p.uid),true);
 assert.equal(f.world.saved.characters[candidate.p.uid].guild,g.name);
 f.world.guild(leader.p,{action:'invite',target:moderator.p.name});
 f.world.guild(moderator.p,{action:'accept',name:g.name});
 f.world.guild(leader.p,{action:'promote',memberId:moderator.p.uid});
 assert.ok(g.moderators.includes(moderator.p.uid));
 f.world.guild(stranger.p,{action:'apply',name:g.name});
 const second=g.applications[0].id;
 f.world.guild(moderator.p,{action:'approve',applicationId:second});
 assert.equal(stranger.p.save.guild,g.name);
 assert.equal(g.applications.length,0);
});
test('candidaturas são canceláveis, recusáveis e limitadas a quatro simultâneas',t=>{
 const f=fixture(t),admin=f.player('Admin'),candidate=f.player('Solicitante');
 for(let i=0;i<5;i++){
  f.world.guild(admin.p,{action:'create',name:'Reino '+i});
  f.world.guild(candidate.p,{action:'apply',name:'Reino '+i});
  f.world.guild(admin.p,{action:'leave'});
 }
 assert.equal([...f.world.guilds.values()].length,0);
 const g=f.player('OutraConta');f.world.guild(g.p,{action:'create',name:'Templo Aberto'});
 f.world.guild(candidate.p,{action:'apply',name:'Templo Aberto'});
 assert.equal(f.world.guilds.get('templo aberto').applications.length,1);
 f.world.guild(candidate.p,{action:'withdraw',name:'Templo Aberto'});
 assert.equal(f.world.guilds.get('templo aberto').applications.length,0);
 f.world.guild(candidate.p,{action:'apply',name:'Templo Aberto'});
 const id=f.world.guilds.get('templo aberto').applications[0].id;
 f.world.guild(g.p,{action:'reject',applicationId:id});
 assert.equal(f.world.guilds.get('templo aberto').applications.length,0);
 assert.equal(candidate.p.save.guild,null);
});
test('moderadores não podem promover, remover outros moderadores ou expulsar líder',t=>{
 const f=fixture(t),leader=f.player('Soberano'),mod=f.player('Oficial'),member=f.player('Recruta');
 f.world.guild(leader.p,{action:'create',name:'Sentinelas'});
 const g=f.world.guilds.get('sentinelas');
 for(const p of [mod.p,member.p]){
  f.world.guild(leader.p,{action:'invite',target:p.name});
  f.world.guild(p,{action:'accept',name:g.name});
 }
 f.world.guild(leader.p,{action:'promote',memberId:mod.p.uid});
 f.world.guild(mod.p,{action:'promote',memberId:member.p.uid});
 assert.equal(g.moderators.includes(member.p.uid),false);
 f.world.guild(mod.p,{action:'kick',memberId:leader.p.uid});
 assert.ok(g.members.includes(leader.p.uid));
 f.world.guild(mod.p,{action:'kick',memberId:member.p.uid});
 assert.ok(!g.members.includes(member.p.uid));
 assert.equal(member.p.save.guild,null);
});
test('diretório persiste no protocolo do mundo e Social possui quatro seções independentes',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 const browser=fs.readFileSync(path.join(__dirname,'../public/guild-recruitment.js'),'utf8');
 assert.match(js,/msg\.type==='guildDirectory'/);
 assert.match(js,/socialSection==='guilds'/);
 assert.match(js,/socialSection==='party'/);
 assert.match(js,/socialSection==='politics'/);
 assert.match(js,/socialSection==='safety'/);
 assert.match(html,/guild-recruitment\.js\?v=guild-applications-v1/);
 assert.match(browser,/Candidaturas/);
 assert.match(browser,/Solicitar entrada/);
 assert.match(browser,/applicationId:person\.id/);
 assert.match(browser,/memberId:member\.id/);
});

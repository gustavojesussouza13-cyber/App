'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const crypto=require('node:crypto');
const {inspect,ChatGuard,SAFE_PHRASES,isPreset}=require('../chat-safety');
const {World}=require('../world-engine');
const base=path.join(__dirname,'../public');

test('frases seguras preservam colaboração infantil sem inserir endereço ou contato',()=>{
 assert.ok(SAFE_PHRASES.length>=20);
 for(const phrase of SAFE_PHRASES){
  assert.equal(inspect(phrase).ok,true,phrase);
  assert.equal(isPreset(phrase),true);
 }
});
test('frases normais de RPG e português não são censuradas',()=>{
 const accepted=[
  'Olá, tudo bem?','Vamos ao portal do Vale das Oliveiras!','Pode me ajudar?',
  'Preciso de cura','Vou derrotar o monstro','Onde fica a masmorra da Raiz?',
  'Vamos matar o chefe no jogo','Estou no nível 9','Comprei três poções',
  'O computador está lento','O mapa tem 16 regiões','Ataquem a aranha!',
  'Meu arco não aparece','O guardião está lá','Obrigado equipe!'
 ];
 for(const text of accepted)assert.equal(inspect(text).ok,true,text);
});
test('bloqueia ofensas, assédio, ameaças e linguagem sexual sem expor texto',()=>{
 const blocked=[
  'você é idiota','vai se foder','p0rr4','c4r4lho','p.u.t.a','f.d.p',
  'vou te matar','se mata','quero nudes','envia pornografia','vamos transar'
 ];
 for(const text of blocked){
  const r=inspect(text);
  assert.equal(r.ok,false,text);
  assert.ok(typeof r.message==='string'&&r.message.length>12);
  assert.ok(!r.message.includes(text),'o aviso não deve reproduzir conteúdo bloqueado');
 }
});
test('bloqueia links, perfis de redes sociais, emails e telefones obfuscados',()=>{
 const blocked=[
  'https://exemplo.com','www.site.com.br','discord.gg/XYZ',
  'Entre no meu whatsapp','manda seu insta','me chama no telegram',
  'email user@example.com','meu telefone 41998877665','+55 (41) 98877-6655',
  'me passa seu número de celular','envia o pix','meu tiktok'
 ];
 for(const text of blocked)assert.equal(inspect(text).ok,false,text);
});
test('bloqueia tentativa de recolher idade, escola, fotos e endereço',()=>{
 const blocked=[
  'qual sua idade','Qual sua escola?','Onde você mora?',
  'manda uma selfie','me passa seu endereço','tenho 9 anos',
  'moro na rua das flores','Minha escola é Pioneira',
  'meu telefone é 41999999999','minha senha é 1234',
  'vamos nos encontrar','não conta para seus pais'
 ];
 for(const text of blocked)assert.equal(inspect(text).ok,false,text);
});
test('nega mensagens com caracteres de controle, vazias ou excessivamente longas',()=>{
 assert.equal(inspect('   ').ok,false);
 assert.equal(inspect('a'.repeat(161)).ok,false);
 assert.equal(inspect(12).ok,false);
 assert.equal(inspect('Oi\u200b!').text,'Oi!');
 assert.equal(inspect('OI\nTUDO').text,'OITUDO');
});
test('antispam e suspensão automática após violações repetidas',()=>{
 let now=1000000;
 const guard=new ChatGuard({now:()=>now,cooldownMs:1100});
 for(let i=0;i<3;i++){
  const r=guard.check('usuario','p0rr4');
  assert.equal(r.ok,false);now+=2000;
 }
 assert.equal(guard.check('usuario','Boa jornada!').category,'muted');
 now+=120001;
 assert.equal(guard.check('usuario','Boa jornada!').ok,true);
});
test('envio repetido é bloqueado mesmo com intervalo superior ao cooldown',()=>{
 let now=1000000;const guard=new ChatGuard({now:()=>now,cooldownMs:1000});
 for(let i=0;i<3;i++){
  const r=guard.check('repetidor','Olá, peregrinos!');
  assert.equal(r.ok,true);now+=1400;
 }
 assert.equal(guard.check('repetidor','Olá, peregrinos!').category,'spam');
});
function worldFixture(names=['CriançaTeste','ColegaTeste']){
 const received=new Map(),uidByName=new Map();
 const world=new World({
  send:(sock,msg)=>{if(!received.has(sock))received.set(sock,[]);received.get(sock).push(msg)},
  getOnline:()=>0,hasClassicName:()=>false,persistentStore:{enqueue(){},pending:null}
 });
 const clients=names.map((name,i)=>{
  const socket={};const client={socket},token=String(i+1).repeat(64);
  world.join(client,{type:'hello',name,role:'peregrino',token});
  assert.ok(client.worldPlayer,'join '+name);
  uidByName.set(name,client.worldPlayer.uid);
  received.set(socket,[]);
  return client;
 });
 return {world,clients,received,uidByName,
  messages:client=>received.get(client.socket)||[]};
}
test('moderação ocorre antes do broadcast de chat global, equipe e guilda',()=>{
 const h=worldFixture();
 const a=h.clients[0],b=h.clients[1];
 h.world.receive(a,{type:'chat',channel:'global',text:'me passa seu whatsapp'});
 assert.equal(h.messages(b).filter(m=>m.type==='chat').length,0);
 assert.ok(h.messages(a).some(m=>m.type==='notice'));
 const p=a.worldPlayer;
 p.lastChat=0;h.world.chatGuard.state(p.uid).last=0;
 h.world.receive(a,{type:'chat',channel:'global',text:'Boa jornada!'});
 const msg=h.messages(b).find(m=>m.type==='chat');
 assert.ok(msg);assert.equal(msg.text,'Boa jornada!');assert.match(msg.id,/^[a-f0-9-]{36}$/);
 p.lastChat=0;h.world.chatGuard.state(p.uid).last=0;
 h.world.receive(a,{type:'chat',channel:'party',text:'Vamos explorar!'});
 assert.equal(h.messages(b).filter(m=>m.type==='chat').length,1,
  'sem grupo não deve virar mensagem global');
 p.lastChat=0;h.world.chatGuard.state(p.uid).last=0;
 h.world.receive(a,{type:'chat',channel:'guild',text:'Vamos explorar!'});
 assert.equal(h.messages(b).filter(m=>m.type==='chat').length,1,
  'sem guilda não deve virar global');
});
test('denunciar mensagem recebida silencia remetente e não altera outras contas',()=>{
 const h=worldFixture(),[a,b]=h.clients,author=a.worldPlayer,reporter=b.worldPlayer;
 h.world.receive(a,{type:'chat',channel:'global',text:'Olá, peregrinos!'});
 const msg=h.messages(b).find(m=>m.type==='chat');
 assert.ok(msg);
 h.world.receive(b,{type:'report',id:msg.id});
 assert.ok(reporter.save.blocked.includes(author.name.toLocaleLowerCase('pt-BR')));
 assert.ok(h.messages(b).some(m=>m.type==='notice'&&m.text.includes('Denúncia recebida')));
 const count=h.world.chatReports.get(author.uid).by.size;
 h.world.receive(b,{type:'report',id:msg.id});
 assert.equal(h.world.chatReports.get(author.uid).by.size,count,'duplicatas não contam duas vezes');
 h.world.receive(a,{type:'report',id:msg.id});
 assert.equal(h.world.chatReports.get(author.uid).by.size,count,'ninguém denuncia a si mesmo');
 assert.equal(author.save.blocked.length,0,'não altera o personagem denunciado');
});
test('três denúncias de destinatários diferentes suspendem temporariamente a conversa',()=>{
 const h=worldFixture(['Afonso','Bento','Carlos','Daniel']);
 const [author,...others]=h.clients;
 h.world.receive(author,{type:'chat',channel:'global',text:'Boa jornada!'});
 const msg=h.messages(others[0]).find(m=>m.type==='chat');
 for(const target of others)h.world.receive(target,{type:'report',id:msg.id});
 const guard=h.world.chatGuard.state(author.worldPlayer.uid);
 assert.ok(guard.mutedUntil>Date.now());
 assert.equal(h.world.chatGuard.check(author.worldPlayer.uid,'Bom dia!').category,'muted');
});
test('números de canais inválidos e links não expõem nenhum conteúdo aos colegas',()=>{
 const h=worldFixture(),[a,b]=h.clients;
 h.world.receive(a,{type:'chat',channel:'privado',text:'Olá, peregrinos!'});
 h.world.chatGuard.state(a.worldPlayer.uid).last=0;
 h.world.receive(a,{type:'chat',channel:'global',text:'entra em https://site.com'});
 assert.equal(h.messages(b).filter(x=>x.type==='chat').length,0);
});
test('interface contém denúncia, frases prontas e aviso acessível, com controles mobile intactos',()=>{
 const html=fs.readFileSync(path.join(base,'mundo.html'),'utf8');
 const js=fs.readFileSync(path.join(base,'mmo.js'),'utf8');
 assert.match(html,/id="chatPreset"/);
 assert.match(html,/id="chatPresetSend"/);
 assert.match(html,/chat-child-notice/);
 assert.match(html,/Regras de segurança/);
 assert.match(js,/send\('report',\{id:reportId\}\)/);
 assert.match(js,/send\('chat',\{text:phrase,channel:/);
 assert.match(html,/id="touchPad"/);
 assert.match(html,/id="touchAttackBtn"/);
 assert.match(html,/mmo\.js\?v=class-skill-fx-v1/);
 assert.doesNotThrow(()=>new vm.Script(js,{filename:'mmo.js'}));
});
test('Campanha Clássica e Mundo Aberto compartilham a mesma moderação no servidor',()=>{
 const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
 const world=fs.readFileSync(path.join(__dirname,'../world-engine.js'),'utf8');
 assert.match(server,/classicChatGuard\.check\(p\.token\|\|p\.id,data\.text\)/);
 assert.match(world,/this\.chatGuard\.check\(p\.uid,raw\)/);
 assert.doesNotMatch(server,/emitAll\(\{type:'chat',id:p\.id,name:p\.name,text:msg/);
});

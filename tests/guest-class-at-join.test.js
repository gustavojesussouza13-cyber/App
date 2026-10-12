'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {World,CLASSES}=require('../world-engine');
const clientCode=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
const token='a'.repeat(64);
const uid=crypto.createHash('sha256').update(token).digest('hex');
const base={
 level:7,xp:95,hp:102,coins:238,zone:0,x:768,y:512,
 role:'arqueiro',inventory:{pocao:8,arco:1,amuleto:1},
 kills:28,quests:['primeiro-passo'],visited:[0,1,2],guild:'Aurora',
 achievements:['primeira-vitoria'],bossRelics:[12],blocked:['outro']
};
function harness(){
 const outgoing=[],writes=[],store={
  pending:null,
  enqueue(snapshot){writes.push(structuredClone(snapshot));this.pending=null},
  async flush(){return true}
 };
 const world=new World({
  send:(socket,msg)=>outgoing.push({socket,msg}),
  getOnline:()=>0,
  hasClassicName:()=>false,
  persistentStore:store
 });
 world.saved.characters[uid]=structuredClone(base);
 function join({role,account=null,tokenValue=token,name='Gustavo120234229'}={}){
  const client={socket:{},authUser:account};
  world.join(client,{type:'hello',name,mode:account?'account':'guest',token:tokenValue,role});
  const welcome=outgoing.filter(e=>e.socket===client.socket&&e.msg.type==='welcome').at(-1)?.msg;
  return {client,welcome,player:client.worldPlayer};
 }
 return {world,join,outgoing,writes,store};
}
test('regressão: jogador Arqueiro existente entra escolhendo Peregrino e recebe Peregrino imediatamente',()=>{
 const h=harness(),oldHpMax=CLASSES.arqueiro.hp+(base.level-1)*12;
 const expectedHpMax=CLASSES.peregrino.hp+(base.level-1)*12;
 const p=h.join({role:'peregrino'});
 assert.ok(p.welcome);
 assert.equal(p.welcome.self.role,'peregrino');
 assert.equal(p.player.save.role,'peregrino');
 assert.equal(p.welcome.self.maxHp,expectedHpMax);
 assert.equal(p.welcome.self.hp,Math.max(1,expectedHpMax-(oldHpMax-base.hp)));
 assert.equal(h.world.publicPlayer(p.player).role,'peregrino');
 assert.equal(p.player.save.level,base.level);
 assert.equal(p.player.save.xp,base.xp);
 assert.equal(p.player.save.kills,base.kills);
 assert.equal(p.player.save.coins,base.coins);
 assert.deepEqual(p.player.save.inventory,base.inventory);
 assert.deepEqual(p.player.save.visited,base.visited);
 assert.deepEqual(p.player.save.quests,base.quests);
 assert.equal(p.player.save.guild,base.guild);
 assert.deepEqual(p.player.save.achievements,base.achievements);
 assert.deepEqual(p.player.save.bossRelics,base.bossRelics);
});
test('classe selecionada é salva e permanece correta após sair e reconectar',()=>{
 const h=harness();
 const first=h.join({role:'peregrino'});
 h.world.leave(first.client);
 assert.equal(h.world.saved.characters[uid].role,'peregrino');
 assert.ok(h.writes.length>0);
 assert.equal(h.writes.at(-1).characters[uid].role,'peregrino');
 const returning=h.join({role:'peregrino'});
 assert.equal(returning.welcome.self.role,'peregrino');
 assert.equal(returning.player.save.kills,28);
});
test('troca entre as quatro classes funciona para visitante já evoluído sem apagar dados',()=>{
 for(const selected of ['peregrino','guardiao','curandeiro','arqueiro']){
  const h=harness(),p=h.join({role:selected});
  assert.equal(p.welcome.self.role,selected,selected);
  assert.equal(p.welcome.self.level,base.level);
  assert.equal(p.welcome.self.kills,base.kills);
  assert.equal(p.welcome.self.coins,base.coins);
  assert.equal(p.welcome.self.inventory.arco,1);
 }
});
test('opção ausente ou inválida no protocolo não muda classe salva',()=>{
 for(const role of [undefined,null,'desconhecido','__proto__','constructor',1234,{}]){
  const h=harness(),p=h.join({role});
  assert.equal(p.welcome.self.role,'arqueiro',String(role));
  assert.equal(p.player.save.hp,base.hp);
 }
});
test('conta cadastrada não muda de classe por um campo enviado no hello',()=>{
 const h=harness();
 const accountUid='account:123';
 h.world.saved.characters[accountUid]=structuredClone(base);
 const p=h.join({role:'peregrino',account:{uid:accountUid,username:'ContaTeste'},name:'Ignorado'});
 assert.equal(p.welcome.self.name,'ContaTeste');
 assert.equal(p.welcome.self.role,'arqueiro');
 assert.equal(p.player.save.role,'arqueiro');
 assert.equal(p.player.save.hp,base.hp);
});
test('personagens sem progresso salvo recebem a classe selecionada no primeiro login',()=>{
 const h=harness();
 delete h.world.saved.characters[uid];
 const p=h.join({role:'curandeiro'});
 assert.equal(p.welcome.self.role,'curandeiro');
 assert.equal(p.welcome.self.maxHp,CLASSES.curandeiro.hp);
 assert.equal(p.welcome.self.hp,CLASSES.curandeiro.hp);
 assert.equal(p.welcome.self.level,1);
 assert.equal(p.welcome.self.coins,60);
});
test('cliente envia papel escolhido e não sobrescreve classe dos visitantes após welcome',()=>{
 assert.match(clientCode,/role:session\.formClass/);
 assert.match(clientCode,/const freshSwitch=accountMode&&/);
 assert.match(clientCode,/session\.role=c\.role/);
 assert.doesNotMatch(clientCode,/Seu personagem salvo já é/);
 assert.doesNotMatch(clientCode,/Para começar outra classe, use outro nome/);
});

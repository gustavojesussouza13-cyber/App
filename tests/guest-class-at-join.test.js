'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {World,CLASSES}=require('../world-engine');
const clientCode=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
const token='a'.repeat(64),uid=crypto.createHash('sha256').update(token).digest('hex');
const base={level:7,xp:95,hp:102,coins:238,zone:0,x:768,y:512,role:'arqueiro',
 inventory:{pocao:8,arco:1,amuleto:1},kills:28,quests:['primeiro-passo'],
 visited:[0,1,2],guild:'Aurora',achievements:['primeira-vitoria'],bossRelics:[12],blocked:['outro']};
function harness(){
 const outgoing=[],writes=[],store={pending:null,enqueue(snapshot){writes.push(structuredClone(snapshot))},async flush(){return true}};
 const world=new World({send:(socket,msg)=>outgoing.push({socket,msg}),getOnline:()=>0,
  hasClassicName:()=>false,persistentStore:store});
 world.saved.characters[uid]=structuredClone(base); // linha legada: não deve ser reutilizada
 function join({role,account=null,tokenValue=token,name='Gustavo120234229'}={}){
  const client={socket:{},authUser:account};
  world.join(client,{type:'hello',name,mode:account?'account':'guest',token:tokenValue,role});
  const welcome=outgoing.filter(e=>e.socket===client.socket&&e.msg.type==='welcome').at(-1)?.msg;
  return{client,welcome,player:client.worldPlayer};
 }
 return{world,join,outgoing,writes};
}
test('dados antigos de Visitante não são reabertos: ouro, XP, nível e classe resetam',()=>{
 const h=harness(),p=h.join({role:'peregrino'});
 assert.equal(p.welcome.self.role,'peregrino');
 assert.equal(p.welcome.self.level,1);
 assert.equal(p.welcome.self.xp,0);
 assert.equal(p.welcome.self.kills,0);
 assert.equal(p.welcome.self.coins,60);
 assert.deepEqual(p.welcome.self.visited,[0]);
 assert.deepEqual(p.welcome.self.inventory,{pocao:3});
 assert.equal(p.welcome.self.maxHp,CLASSES.peregrino.hp);
 assert.equal(p.welcome.self.hp,CLASSES.peregrino.hp);
 assert.equal(h.world.saved.characters[uid].level,7,'não apagar entrada legada de terceiros');
});
test('classe de cada nova partida Visitante é escolhida novamente, sem experiência anterior',()=>{
 for(const role of ['peregrino','guardiao','curandeiro','arqueiro']){
  const h=harness(),p=h.join({role});
  assert.equal(p.welcome.self.role,role);
  assert.equal(p.welcome.self.level,1);
  assert.equal(p.welcome.self.xp,0);
  assert.equal(p.welcome.self.coins,60);
  assert.equal(p.welcome.self.hp,CLASSES[role].hp);
 }
});
test('desconexão breve retoma mesmo personagem só com token da mesma página',()=>{
 const h=harness(),first=h.join({role:'curandeiro'});
 first.player.save.level=6;first.player.save.xp=55;first.player.save.coins=431;
 first.player.save.kills=9;first.player.save.inventory.pocao=8;
 h.world.leave(first.client);
 assert.equal(h.world.saved.characters[uid].level,7,'não sobrescrever contas/salvamentos anteriores');
 const returning=h.join({role:'curandeiro'});
 assert.equal(returning.welcome.self.level,6);
 assert.equal(returning.welcome.self.xp,55);
 assert.equal(returning.welcome.self.coins,431);
 assert.equal(returning.welcome.self.kills,9);
 assert.equal(returning.welcome.self.inventory.pocao,8);
 h.world.leave(returning.client);
 const newToken='b'.repeat(64);
 const newVisit=h.join({role:'guardiao',tokenValue:newToken});
 assert.equal(newVisit.welcome.self.level,1);
 assert.equal(newVisit.welcome.self.xp,0);
 assert.equal(newVisit.welcome.self.coins,60);
 assert.equal(newVisit.welcome.self.role,'guardiao');
});
test('opção inválida de classe inicia Visitante na classe padrão sem importar dados',()=>{
 for(const role of [undefined,null,'desconhecido','__proto__','constructor',1234,{}]){
  const h=harness(),p=h.join({role});
  assert.equal(p.welcome.self.role,'peregrino');
  assert.equal(p.welcome.self.level,1);
  assert.equal(p.welcome.self.coins,60);
 }
});
test('conta cadastrada mantém sua classe e os dados do banco mesmo após sair',()=>{
 const h=harness(),accountUid='account:123';
 h.world.saved.characters[accountUid]=structuredClone(base);
 const owner={uid:accountUid,username:'ContaTeste'};
 const p=h.join({role:'peregrino',account:owner,name:'Ignorado'});
 assert.equal(p.welcome.self.name,'ContaTeste');
 assert.equal(p.welcome.self.role,'arqueiro');
 assert.equal(p.welcome.self.level,7);
 assert.equal(p.welcome.self.coins,238);
 h.world.leave(p.client);
 assert.equal(h.world.saved.characters[accountUid].level,7);
 const back=h.join({role:'curandeiro',account:owner});
 assert.equal(back.welcome.self.role,'arqueiro');
 assert.equal(back.welcome.self.coins,238);
});
test('cliente cria um token por abertura e nunca salva token permanente do Visitante',()=>{
 assert.match(clientCode,/progressToken=Array\.from\(crypto\.getRandomValues/);
 assert.doesNotMatch(clientCode,/localStorage\.setItem\('os-peregrinos-world-token'/);
 assert.doesNotMatch(clientCode,/localStorage\.getItem\('os-peregrinos-world-token'/);
 assert.match(clientCode,/localStorage\.removeItem\('os-peregrinos-world-token'/);
 assert.match(clientCode,/if\(event\.persisted\)location\.reload\(\)/);
 assert.doesNotMatch(clientCode,/get\('auto'\)==='1'&&\$\('name'\)/);
 assert.match(clientCode,/role:session\.formClass/);
 assert.match(clientCode,/const freshSwitch=accountMode&&/);
});

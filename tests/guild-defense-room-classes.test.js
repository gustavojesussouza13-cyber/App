'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const fs=require('node:fs'),path=require('node:path');
const {World,CLASSES}=require('../world-engine');
function room(shared=null){
 const sent=[];
 const w=new World({send:(socket,message)=>{sent.push({socket,message});if(socket?.inbox)socket.inbox.push(message)},
  getOnline:()=>0,hasClassicName:()=>false,persistentStore:{enqueue:()=>true}});
 if(shared){w.saved=shared.saved;w.guilds=shared.guilds;w.guildDefenseTargets=shared.guildDefenseTargets;
  w.sharedGuildWorlds=()=>[shared,w];shared.sharedGuildWorlds=()=>[shared,w];}
 return {w,sent};
}
function join(w,name){
 const uid='account:'+crypto.randomUUID();
 const c={authUser:{uid,username:name},socket:{inbox:[]},worldPlayer:null};
 w.join(c,{name,token:crypto.randomBytes(32).toString('hex')});
 assert.ok(c.worldPlayer);return c;
}
test('trocar de sala muda classe mesmo no nível 48 sem apagar progresso, guilda nem equipamentos',t=>{
 const a=room(),b=room(a.w);
 t.after(()=>{a.w.stop();b.w.stop()});
 const c=join(a.w,'UmGuerreiro');
 c.worldPlayer.save.role='guardiao';c.worldPlayer.save.level=48;c.worldPlayer.save.xp=230;
 c.worldPlayer.save.coins=710;c.worldPlayer.save.kills=32;
 c.worldPlayer.save.inventory.espada=3;
 c.worldPlayer.save.guild='Escudo Prateado';c.worldPlayer.save.visited=[0,1,2,3];
 const uid=c.worldPlayer.uid;
 a.w.leave(c);
 const next={socket:{inbox:[]},authUser:{uid,username:'UmGuerreiro'},
  worldTransferUid:uid,roomTransferRole:'curandeiro'};
 b.w.join(next,{name:'UmGuerreiro',role:'arqueiro',token:crypto.randomBytes(32).toString('hex')});
 assert.equal(next.worldPlayer.save.role,'curandeiro','a classe do servidor prevalece sobre a escolha livre do cliente');
 assert.equal(next.worldPlayer.save.level,48);assert.equal(next.worldPlayer.save.xp,230);
 assert.equal(next.worldPlayer.save.coins,710);assert.equal(next.worldPlayer.save.kills,32);
 assert.equal(next.worldPlayer.save.inventory.espada,3);assert.deepEqual(next.worldPlayer.save.visited,[0,1,2,3]);
 assert.equal(next.worldPlayer.save.guild,'Escudo Prateado');
 assert.equal(b.w.saved.characters[uid].role,'curandeiro');
 assert.equal(next.worldPlayer.save.energy,b.w.ownStatus(next.worldPlayer).maxEnergy);
});
test('jogador que faz cerco vira alvo EXCLUSIVO da guilda atacada; terceiros ficam protegidos',t=>{
 const {w,sent}=room();t.after(()=>w.stop());
 const offender=join(w,'Agressor'),defender=join(w,'Protetor'),bystander=join(w,'Pacifista');
 w.guilds.set('espadas',{name:'Espadas',leader:offender.authUser.uid,members:[offender.authUser.uid]});
 w.guilds.set('escudos',{name:'Escudos',leader:defender.authUser.uid,members:[defender.authUser.uid]});
 offender.worldPlayer.save.guild='Espadas';defender.worldPlayer.save.guild='Escudos';
 const p=defender.worldPlayer,q=offender.worldPlayer,innocent=bystander.worldPlayer;
 p.x=q.x=innocent.x=500;p.y=q.y=innocent.y=500;
 assert.equal(w.guildDefenseAttack(p,innocent.id),false);
 assert.equal(w.guildDefenseAttack(p,q.id),false,'nenhum PvP antes do cerco');
 assert.equal(w.declareGuildAggressor('escudos',q),true);
 const rights=w.guildDefenseList(p);
 assert.equal(rights.length,1);assert.equal(rights[0].id,q.id);assert.equal(rights[0].name,'Agressor');
 assert.equal(w.guildDefenseAttack(p,innocent.id),false,'ataque contra inocente continua impossível');
 assert.equal(w.guildDefenseAttack(innocent,q.id),false,'estranhos não ganham defesa da guilda');
 q.zone=1;assert.equal(w.guildDefenseAttack(p,q.id),false,'regiões diferentes impedem ataque');
 q.zone=0;q.x=1200;assert.equal(w.guildDefenseAttack(p,q.id),false,'alcance é validado no servidor');
 q.x=500;q.save.hp=7;
 assert.equal(w.guildDefenseAttack(p,q.id),true,'golpe válido com comandante na mesma região');
 assert.equal(q.save.hp,1,'sem morte de jogador');
 assert.ok(q.neutralizedUntil>Date.now(),'agressor neutralizado');
 assert.deepEqual(w.guildDefenseList(p),[],'combate acaba depois da neutralização');
 assert.ok(sent.some(x=>x.message.type==='guildDefenseHit'&&x.message.neutralized));
 assert.ok(sent.some(x=>x.message.type==='guildDefense'&&x.message.targets.length===0));
});
test('avisos atravessam as salas mas ataque não pode acertar jogador remoto',t=>{
 const a=room(),b=room(a.w);t.after(()=>{a.w.stop();b.w.stop()});
 const commander=join(a.w,'CercoNorte'),guardian=join(b.w,'DefesaSul');
 a.w.guilds.set('norte',{name:'Norte',leader:commander.authUser.uid,members:[commander.authUser.uid]});
 a.w.guilds.set('sul',{name:'Sul',leader:guardian.authUser.uid,members:[guardian.authUser.uid]});
 commander.worldPlayer.save.guild='Norte';guardian.worldPlayer.save.guild='Sul';
 assert.equal(a.w.declareGuildAggressor('sul',commander.worldPlayer),true);
 const threat=b.w.guildDefenseList(guardian.worldPlayer);
 assert.equal(threat.length,1);assert.equal(threat[0].name,'CercoNorte');
 assert.equal(threat[0].id,null);assert.equal(threat[0].inRoom,false);
 assert.equal(b.w.guildDefenseAttack(guardian.worldPlayer,commander.worldPlayer.id),false);
 assert.ok(guardian.socket.inbox.some(e=>e.type==='guildDefense'));
});
test('interface informa classe na troca de salas, PvP limitado e conserva visual 3D',()=>{
 const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8'),
 world=fs.readFileSync(path.join(__dirname,'../world-engine.js'),'utf8'),
 kingdom=fs.readFileSync(path.join(__dirname,'../kingdom-politics.js'),'utf8'),
 html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8'),
 ui=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 assert.match(html,/id="roomSwitchRole"/);
 assert.match(ui,/send\('switchRoom',\{roomId:chosen.id,role:\$\('roomSwitchRole'\)\.value\}\)/);
 assert.match(server,/Object\.hasOwn\(CLASSES,newRole\)/);
 assert.match(kingdom,/declareGuildAggressor\?\.\(enemyKey,p,now\)/);
 assert.match(world,/case 'defendGuild'/);
 assert.match(ui,/Somente quem iniciou um cerco real pode ser atacado/);
 assert.match(html,/guild-city-3d\.js/);
 assert.deepEqual(Object.keys(CLASSES).sort(),['guardiao','peregrino','curandeiro','arqueiro'].sort());
});

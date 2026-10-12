'use strict';
/** Mundo persistente experimental: combate e recompensas validados no servidor. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {NPCS,chapters,byId,publicNpc,freshStory,normalizeStory,journal}=require('./story-data');
const terrain=require('./world-terrain');
const {ChatGuard,inspect}=require('./chat-safety');

const ZONES=[
 ['Vale das Oliveiras','pradaria'],['Floresta da Promessa','floresta'],['Riacho do Alvorecer','rio'],['Deserto das Provações','deserto'],
 ['Montanhas da Fé','montanha'],['Ruínas do Crepúsculo','ruinas'],['Campos da Esperança','pradaria'],['Pântano dos Sussurros','pantano'],
 ['Costa da Aurora','costa'],['Bosque da Misericórdia','floresta'],['Cidadela de Auren','cidade'],['Terra da Última Luz','ruinas'],
 ['Masmorra da Raiz','masmorra'],['Masmorra das Cinzas','masmorra'],['Templo Esquecido','masmorra'],['Câmara da Aurora','masmorra']
];
// 24 andares adicionais: IDs 0–15 permanecem intactos para preservar personagens salvos.
const DUNGEON_ROOTS=['Raiz Ancestral','Cinzas Eternas','Templo das Vozes','Aurora Profunda'];
const FLOOR_TITLES=['Galerias','Salões Perdidos','Catacumbas','Santuário Oculto','Abismo','Trono Esquecido'];
for(let dungeon=0;dungeon<4;dungeon++)for(let depth=1;depth<=6;depth++)
 ZONES.push([`${FLOOR_TITLES[depth-1]} da ${DUNGEON_ROOTS[dungeon]} · Subsolo ${depth}`,'masmorra']);
const LEGACY_ZONE_COUNT=16,DEPTH_PER_DUNGEON=6;
const dungeonRoot=zone=>zone>=16&&zone<ZONES.length?12+Math.floor((zone-16)/DEPTH_PER_DUNGEON):zone>=12&&zone<16?zone:null;
const dungeonDepth=zone=>zone>=16?1+(zone-16)%DEPTH_PER_DUNGEON:0;
const dungeonFloor=(root,depth)=>root+4+(root-12)*(DEPTH_PER_DUNGEON-1)+depth-1;

const ZONE_W=1536, ZONE_H=1024;
const CLASSES={guardiao:{name:'Guardião',hp:165,attack:17,range:85,defense:7},arqueiro:{name:'Arqueiro',hp:112,attack:21,range:250,defense:2},curandeiro:{name:'Curandeiro',hp:125,attack:12,range:160,defense:4},peregrino:{name:'Peregrino',hp:135,attack:16,range:118,defense:4}};
const SPECIES=[
 ['Limo do Vale',25,5,15,8],['Lobo Faminto',46,8,23,14],['Morcego das Sombras',32,7,21,11],['Esqueleto Errante',64,11,42,23],
 ['Aranha Sombria',51,9,36,18],['Guardião das Pedras',110,14,60,34],['Serpente das Dunas',78,13,48,25],['Corvo do Ocaso',36,10,30,13],
 ['Sentinela Antiga',95,15,62,37],['Espinho Vivo',57,11,37,19],['Escorpião do Deserto',82,14,50,29],['Sombra Errante',106,17,68,40],
 ['Javali Selvagem',67,11,44,24],['Golem de Areia',117,17,80,45],['Espírito Nebuloso',86,15,67,35],['Guerreiro Esquecido',123,18,85,48],
 ['Vespa Gigante',48,12,45,17],['Trepa-Sombra',72,13,55,30],['Caranguejo de Cristal',81,13,62,33],['Espectro das Ruínas',140,22,107,55],
 ['Lobo de Gelo',90,17,77,43],['Aranha Cristalina',93,18,82,39],['Cavaleiro de Bronze',150,23,120,62],['Elemental da Água',118,19,99,45],
 ['Salamandra',110,19,100,52],['Fera do Pântano',145,25,130,67],['Dragão Jovem',230,29,190,99],['Gigante das Colinas',200,26,151,88],
 ['Sentinela da Noite',174,25,138,81],['Basilisco',192,27,175,95],['Anjo Caído',225,32,203,118],['Guardião da Aurora',280,38,252,142]
];
const GOODS={pocao:{name:'Poção de vida',price:18,heal:65},superpocao:{name:'Poção radiante',price:60,heal:165},espada:{name:'Espada temperada',price:170,attack:7},arco:{name:'Arco dos ventos',price:170,attack:6},amuleto:{name:'Amuleto da esperança',price:250,defense:4},chave:{name:'Chave da masmorra',price:110}};
// Relíquias exclusivas de chefes; não são vendidas por moedas.
const RELICS=Object.freeze({
  lamina_aurora:{name:'Lâmina da Aurora',rarity:'épico',role:'guardiao',slot:'arma',attack:12},
  arco_alvorada:{name:'Arco do Alvorecer',rarity:'épico',role:'arqueiro',slot:'arma',attack:11},
  cajado_misericordia:{name:'Cajado da Misericórdia',rarity:'épico',role:'curandeiro',slot:'arma',attack:8,healing:12},
  sabre_peregrino:{name:'Sabre dos Caminhos',rarity:'épico',role:'peregrino',slot:'arma',attack:10},
  manto_luz:{name:'Manto da Luz Serena',rarity:'raro',slot:'armadura',defense:6}
});
const BOSS_RELICS=Object.freeze(['lamina_aurora','arco_alvorada','cajado_misericordia','sabre_peregrino','manto_luz']);
const RELIC_WEAPON=Object.freeze({guardiao:'lamina_aurora',arqueiro:'arco_alvorada',curandeiro:'cajado_misericordia',peregrino:'sabre_peregrino'});
const QUESTS=[
 {id:'primeiro-passo',name:'O primeiro passo',target:5,reward:75,coins:45,description:'Derrote cinco monstros nas terras de Auren'},
 {id:'guardiao-do-vale',name:'A guarda do vale',target:14,reward:250,coins:110,description:'Defenda o reino e derrote mais criaturas'},
 {id:'peregrino-valoroso',name:'Peregrino valoroso',target:36,reward:650,coins:275,description:'Vença 36 criaturas nas jornadas'},
 {id:'luz-renovada',name:'A luz renovada',target:90,reward:1600,coins:700,description:'Enfrente noventa ameaças pelo mundo'},
 {id:'trilhas-aurora',name:'Trilhas da Aurora',type:'regions',target:4,reward:170,coins:65,description:'Explore quatro regiões diferentes do reino'},
 {id:'cartografo-auren',name:'Cartógrafo de Auren',type:'regions',target:10,reward:650,coins:180,description:'Conheça dez regiões de Auren'},
 {id:'mapa-completo',name:'Mundo Revelado',type:'regions',target:16,reward:1450,coins:420,description:'Visite as dezesseis regiões'},
 {id:'primeiro-legado',name:'O Primeiro Legado',type:'bosses',target:1,reward:235,coins:95,description:'Conquiste sua primeira relíquia de chefe'},
 {id:'sem-medo',name:'Quebrador de Maldições',type:'bosses',target:4,reward:850,coins:290,description:'Recupere relíquias de quatro chefes diferentes'},
 {id:'voz-desperta',name:'Vozes da Aurora',type:'chapters',target:4,reward:330,coins:130,description:'Conclua quatro capítulos da jornada principal'},
 {id:'livro-luz',name:'O Livro da Luz',type:'chapters',target:12,reward:1250,coins:390,description:'Conclua doze capítulos da história'},
 {id:'primeira-descida',name:'Sob a Terra',type:'depths',target:1,reward:140,coins:65,description:'Alcance seu primeiro subsolo em uma masmorra'},
 {id:'rumos-profundos',name:'Caminhos Esquecidos',type:'depths',target:12,reward:950,coins:300,description:'Descubra doze subsolos diferentes'},
 {id:'eco-das-profundezas',name:'Ecos das Profundezas',type:'depths',target:24,reward:2250,coins:880,description:'Explore todos os vinte e quatro subsolos de Auren'}
];
function questProgress(save,quest){
 switch(quest.type){
  case 'regions':return new Set(save.visited||[]).size;
  case 'bosses':return new Set(save.bossRelics||[]).size;
  case 'chapters':return save.story?.stage||0;
  case 'depths':return new Set((save.visited||[]).filter(zone=>Number.isInteger(zone)&&zone>=16&&zone<ZONES.length)).size;
  default:return save.kills||0;
 }
}
const assertName=n=>typeof n==='string'&&n.trim()===n&&n.length>=3&&n.length<=18&&/^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u.test(n);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const roadY=(x,z)=>496+Math.sin((x+z*117)/225)*54+Math.sin(x/79+z*2)*12;
const cap=(s,n=90)=>String(s||'').slice(0,n);
// Reaproveita o campo "achievements" já salvo; nenhuma migração do PostgreSQL.
const ACHIEVEMENTS=Object.freeze({
 'primeira-vitoria':{name:'Primeira Luz',coins:20},
 'cacas-25':{name:'Guardião dos Caminhos',coins:85},
 'cacas-100':{name:'Lenda do Vale',coins:230},
 'primeiro-chefe':{name:'Quebrador de Sombras',coins:90},
 'explorar-8':{name:'Caminhante da Aurora',coins:70},
 'explorar-16':{name:'Cartógrafo de Auren',coins:180},
 'aurora-restaurada':{name:'Guardião do Sétimo Verso',coins:300}
});
const defaultSave=()=>({level:1,xp:0,hp:135,coins:60,zone:0,x:ZONE_W/2,y:ZONE_H/2,role:'peregrino',inventory:{pocao:3},kills:0,quests:[],visited:[0],guild:null,achievements:[],bossRelics:[],blocked:[],story:freshStory()});
function hpMax(s){return CLASSES[s.role].hp+(s.level-1)*12}
function xpNeed(level){return 70+level*level*35}
function safeSave(s){return {level:s.level,xp:s.xp,hp:s.hp,coins:s.coins,zone:s.zone,x:s.x,y:s.y,role:s.role,inventory:s.inventory,kills:s.kills,quests:s.quests,visited:s.visited,guild:s.guild,achievements:s.achievements,bossRelics:s.bossRelics,blocked:s.blocked,story:s.story}}
function hash32(n){n|=0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return (n^(n>>>16))>>>0}
class World {
 constructor({send,getOnline,hasClassicName,dataFile,autosave=false,persistentStore=null}){
  this.send=send;this.getOnline=getOnline;this.hasClassicName=hasClassicName;
  this.players=new Map();this.monsters=new Map();this.parties=new Map();this.guilds=new Map();this.pendingTrades=new Map();this.chatGuard=new ChatGuard();this.chatReceipts=new Map();this.chatReports=new Map();this.chatReportRate=new Map();
  this.dirty=false;this.lastTick=Date.now();this.day=1;
  this.dataFile=dataFile||path.join(__dirname,'data','world.sqlite');
  this.db=null;this.persistentStore=persistentStore;this.saved={version:3,characters:{},guilds:{},day:1};if(!persistentStore)this.load();
  this.initMonsters();
  if(autosave)this.saveTimer=setInterval(()=>this.persist(),30000).unref();
 }
 get count(){return this.players.size}
 load(){
  try{
   if(this.dataFile.endsWith('.sqlite')){
    const {DatabaseSync}=require('node:sqlite');
    fs.mkdirSync(path.dirname(this.dataFile),{recursive:true});
    this.db=new DatabaseSync(this.dataFile);
    this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS characters(uid TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS guilds(key TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);');
    this.saved.characters=Object.fromEntries(this.db.prepare('SELECT uid, data FROM characters').all().map(r=>[r.uid,JSON.parse(r.data)]));
    this.saved.guilds=Object.fromEntries(this.db.prepare('SELECT key, data FROM guilds').all().map(r=>[r.key,JSON.parse(r.data)]));
    this.day=Number(this.db.prepare("SELECT value FROM meta WHERE key='day'").get()?.value||1);
   }else{
    const o=JSON.parse(fs.readFileSync(this.dataFile,'utf8'));
    if(o&&o.version>=2&&o.characters&&o.guilds)this.saved=o;
    this.day=Number(this.saved.day||1);
   }
  }catch(e){if(e.code!=='ENOENT')console.error('[world] dados existentes ignorados:',e.message)}
  this.guilds=new Map(Object.entries(this.saved.guilds||{}));
 }
 persist(){
  // Reenvia instantâneos pendentes mesmo sem novas ações do jogador.
  // Uma falha transitória do Postgres não pode esperar por outra movimentação.
  if(!this.dirty){
   if(this.persistentStore?.pending)void this.persistentStore.flush().catch(err=>console.error('[world] repetição do salvamento falhou:',err.message));
   return;
  }
  for(const p of this.players.values())this.saved.characters[p.uid]=safeSave(p.save);this.saved.guilds=Object.fromEntries(this.guilds);this.saved.day=this.day;
  if(this.persistentStore){this.dirty=false;this.persistentStore.enqueue(this.saved);return;}
  try{
   if(this.db){
    this.db.exec('BEGIN IMMEDIATE');
    try{
     const putChar=this.db.prepare('INSERT INTO characters(uid,data) VALUES (?,?) ON CONFLICT(uid) DO UPDATE SET data=excluded.data');
     for(const [uid,value] of Object.entries(this.saved.characters))putChar.run(uid,JSON.stringify(value));
     this.db.exec('DELETE FROM guilds');const putGuild=this.db.prepare('INSERT INTO guilds(key,data) VALUES (?,?)');
     for(const [key,value] of Object.entries(this.saved.guilds))putGuild.run(key,JSON.stringify(value));
     this.db.prepare("INSERT INTO meta(key,value) VALUES ('day',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(String(this.day));
     this.db.exec('COMMIT');
    }catch(e){this.db.exec('ROLLBACK');throw e}
   }else{
    fs.mkdirSync(path.dirname(this.dataFile),{recursive:true});const temp=this.dataFile+'.'+process.pid+'.tmp';fs.writeFileSync(temp,JSON.stringify(this.saved));fs.renameSync(temp,this.dataFile);
   }
   this.dirty=false
  }catch(e){console.error('[world] falha ao salvar:',e.message)}
 }
 initMonsters(){for(let zone=0;zone<ZONES.length;zone++){
   const mons=[];const dungeon=zone>=12;
   // Densidade inspirada na campanha clássica: 13 criaturas comuns + chefe por área,
   // e um pouco mais nas masmorras (em vez das antigas 24–30 por região).
   const count=dungeon?(zone>=16?14:18):14;
   for(let i=0;i<count;i++){
    const boss=i===count-1;const seed=hash32(zone*9217+i*5711+77);
    const speciesId=boss?(dungeon?31:(zone+11)%32):(zone*2+i*7+((seed>>4)%5))%SPECIES.length;
    const sp=SPECIES[speciesId],tier=zone>=16?2+Math.floor((zone-16)/6)+Math.floor(dungeonDepth(zone)/2):1+Math.floor(zone/3),mult=boss?5.5:1+(zone%3)*.12;
    const eliteNames=['Guardião das Raízes','Marechal das Cinzas','Oráculo das Vozes','Arauto do Amanhecer'];
    const name=boss&&zone>=16?'★ '+eliteNames[Math.floor((zone-16)/6)]+' · Piso '+dungeonDepth(zone):(boss?'★ ':'')+sp[0];
    const chosen={x:130+hash32(seed+1)%(ZONE_W-260),y:130+hash32(seed+2)%(ZONE_H-260)};
    const home=terrain.nearestWalkable(zone,chosen.x,chosen.y,ZONES);
    mons.push({id:`m-${zone}-${i}`,zone,name,species:speciesId,boss,x:home.x,y:home.y,home,hp:Math.floor(sp[1]*mult*tier),maxHp:Math.floor(sp[1]*mult*tier),damage:Math.ceil(sp[2]*tier*(boss?2:1)),xp:Math.ceil(sp[3]*tier*(boss?4:1)),coins:Math.ceil(sp[4]*tier*(boss?5:1)),lastAttack:0,windupUntil:0,deadUntil:0,damageFrom:new Map(),wander:0,wanderGoal:null,aggroTarget:null,aggroUntil:0});
   }
   this.monsters.set(zone,mons);
  }}
 totalMonsters(){return [...this.monsters.values()].reduce((n,a)=>n+a.length,0)}
 publicPlayer(p){return {id:p.id,name:p.name,zone:p.zone,x:Math.round(p.x),y:Math.round(p.y),dir:p.dir,level:p.save.level,role:p.save.role,hp:p.save.hp,maxHp:hpMax(p.save),guild:p.save.guild,party:p.party||null}}
 publicMonster(m){return {id:m.id,name:m.name,species:m.species,zone:m.zone,x:Math.round(m.x),y:Math.round(m.y),hp:m.hp,maxHp:m.maxHp,boss:m.boss}}
 zoneInfo(){return ZONES.map((z,i)=>({id:i,name:z[0],biome:z[1],count:this.monsters.get(i).length}))}
 zonePortals(zone){
  if(!Number.isInteger(zone)||zone<0||zone>=ZONES.length)return [];
  const entries=[1,3,5,11];
  let destinations;
  if(zone>=16){
   const root=dungeonRoot(zone),depth=dungeonDepth(zone);
   destinations=[depth===1?root:zone-1];
   if(depth<DEPTH_PER_DUNGEON)destinations.push(zone+1);
   else destinations.push(root<15?root+1:10); // Depois do sexto subsolo, portal de continuação ou retorno a Auren.
  }else if(zone>=12){
   destinations=[entries[zone-12],dungeonFloor(zone,1)];
  }else{
   destinations=ZONES.map((_,i)=>i).filter(i=>i<12&&i!==zone&&Math.abs(i-zone)<=2);
   for(let i=0;i<4;i++)if(entries[i]===zone)destinations.push(12+i);
  }
  return destinations.map((to,i)=>{
   const x=Math.round(destinations.length===1?ZONE_W/2:180+i*1170/(destinations.length-1));
   const finalGate=zone>=16&&dungeonDepth(zone)===DEPTH_PER_DUNGEON&&
    to===(dungeonRoot(zone)<15?dungeonRoot(zone)+1:10);
   const kind=finalGate?'gateway':zone>=12&&to>=12?'stair':'portal';
   return {zone:to,name:ZONES[to][0],x,y:Math.round(roadY(x,zone)),dungeon:to>=12,
    depth:dungeonDepth(to),kind,gateway:finalGate,
    stair:kind==='stair'?(to>zone?'down':'up'):null};
  });
 }
 usePortal(p,z){
  if(!Number.isInteger(z))return;
  const gate=this.zonePortals(p.zone).find(a=>a.zone===z);
  if(!gate||dist(p,gate)>96){this.tell(p,'Aproxime-se da passagem para atravessar.');return}
  this.travel(p,z);
 }
 ownStatus(p){const s=p.save;return {type:'character',id:p.id,name:p.name,level:s.level,xp:s.xp,nextXp:xpNeed(s.level),hp:s.hp,maxHp:hpMax(s),coins:s.coins,role:s.role,inventory:s.inventory,kills:s.kills,quests:s.quests,visited:s.visited,guild:s.guild,party:p.party||null,story:journal(s.story),achievements:s.achievements,bossRelics:s.bossRelics,blocked:s.blocked,zone:p.zone,x:p.x,y:p.y}}
 tell(p,msg,type='notice'){this.send(p.socket,{type,text:msg})}
 unlockAchievement(p,id){
  const award=ACHIEVEMENTS[id],s=p.save;
  if(!award||!Array.isArray(s.achievements)||s.achievements.includes(id))return false;
  s.achievements.push(id);s.coins+=award.coins;this.dirty=true;
  this.tell(p,'✦ Conquista: '+award.name+'! +'+award.coins+' moedas.');
  return true;
 }
 broadcast(obj,filter=()=>true){for(const p of this.players.values())if(filter(p))this.send(p.socket,obj)}
 join(c,d){if(c.worldPlayer)return;
  const owner=c.authUser||null;const name=owner?owner.username:cap(d.name,40).trim().normalize('NFC');const token=typeof d.token==='string'&&/^[a-f0-9-]{24,100}$/i.test(d.token)?d.token:null;
  if(!assertName(name)||(!owner&&!token)){this.send(c.socket,{type:'error',code:'invalid_name',message:'Escolha um nome válido e habilite o armazenamento do navegador.'});return}
  if(!inspect(name).ok){this.send(c.socket,{type:'error',code:'invalid_name',message:'Escolha um apelido apropriado, sem dados pessoais, ofensas ou contatos.'});return}
  const uid=owner?owner.uid:crypto.createHash('sha256').update(token).digest('hex');
  // A titularidade é baseada no token deste navegador; o nome é apenas um apelido.
  for(const existing of this.players.values())if(existing.uid===uid){this.tell(existing,'Sua sessão foi aberta em outra aba.');this.leave(existing.socket._worldClient||{worldPlayer:existing});try{existing.socket.destroy()}catch{}break}
  if(this.players.size+this.getOnline()>=10){this.send(c.socket,{type:'error',code:'full',message:'Servidor cheio: 10 de 10 peregrinos. Aguarde uma vaga.'});return}
  if([...this.players.values()].some(p=>p.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))||this.hasClassicName(name)){
   this.send(c.socket,{type:'error',code:'name_taken',message:'Esse nome já está em uso agora. Escolha outro.'});return}
  let raw=this.saved.characters[uid]||defaultSave();const s={...defaultSave(),...raw};
  if(!CLASSES[s.role])s.role='peregrino';if(!Number.isInteger(s.zone)||s.zone<0||s.zone>=ZONES.length)s.zone=0;
  s.level=clamp(Math.floor(Number(s.level)||1),1,100);s.hp=clamp(Math.floor(Number(s.hp)||hpMax(s)),1,hpMax(s));s.x=clamp(Number(s.x)||ZONE_W/2,28,ZONE_W-28);s.y=clamp(Number(s.y)||ZONE_H/2,28,ZONE_H-28);
  const safeLocation=terrain.nearestWalkable(s.zone,s.x,s.y,ZONES);
  if(s.x!==safeLocation.x||s.y!==safeLocation.y){s.x=safeLocation.x;s.y=safeLocation.y;this.dirty=true;}
  s.inventory={...defaultSave().inventory,...(s.inventory||{})};if(!Array.isArray(s.quests))s.quests=[];if(!Array.isArray(s.visited))s.visited=[0];if(!Array.isArray(s.achievements))s.achievements=[];if(!Array.isArray(s.bossRelics))s.bossRelics=[];s.bossRelics=s.bossRelics.filter(z=>Number.isInteger(z)&&z>=0&&z<ZONES.length);
  s.blocked=Array.isArray(s.blocked)?[...new Set(s.blocked.filter(n=>typeof n==='string'&&assertName(n)).map(n=>n.toLocaleLowerCase('pt-BR')))].slice(0,30):[];
  s.story=normalizeStory(s.story);
  // A seleção feita no formulário Visitante precisa valer inclusive para um
  // personagem já salvo nesse token. A classe anterior pode ter sido Arqueiro
  // porque o join antigo ignorava completamente o campo d.role.
  // Em contas registradas, NÃO ler d.role: a classe é a da conta persistida.
  if(!owner&&typeof d.role==='string'&&Object.hasOwn(CLASSES,d.role)&&s.role!==d.role){
   const healthMissing=Math.max(0,hpMax(s)-s.hp);
   s.role=d.role;
   s.hp=clamp(hpMax(s)-healthMissing,1,hpMax(s));
   // Preserva nível, XP, inventário, moedas, missões, guilda e exploração.
   // Persistência usa o fluxo já existente de dirty -> enqueue/flush.
   this.dirty=true;
  }
  const p={id:crypto.randomUUID(),uid,name,socket:c.socket,save:s,x:s.x,y:s.y,zone:s.zone,dir:2,lastMove:Date.now(),moveCredit:12,lastAttack:0,lastSpell:0,lastChat:0,lastUse:0,party:null,live:true};
  c.worldPlayer=p;c.socket._worldClient=c;this.players.set(p.id,p);
  this.send(c.socket,{type:'welcome',self:this.ownStatus(p),zones:this.zoneInfo(),shop:GOODS,relics:RELICS,quests:QUESTS,achievements:ACHIEVEMENTS,portals:this.zonePortals(p.zone),npcs:NPCS.map(publicNpc),maxPlayers:10,online:this.players.size+this.getOnline(),monsterTotal:this.totalMonsters()});
  this.broadcast({type:'system',text:p.name+' chegou ao mundo.'},q=>q.id!==p.id);
  this.dirty=true;this.snapshotTo(p);
 }
 leave(c){const p=c.worldPlayer;if(!p||!p.live)return;p.live=false;
  this.saved.characters[p.uid]=safeSave(p.save);this.dirty=true;
  this.players.delete(p.id);c.worldPlayer=null;
  if(p.party)this.partyLeave(p,false);
  for(const k of this.pendingTrades.keys())if(k.includes(p.id))this.pendingTrades.delete(k);
  this.broadcast({type:'system',text:p.name+' deixou o reino.'});this.persist();
 }
 snapshotTo(p){const near=[...this.players.values()].filter(o=>o.id!==p.id&&o.zone===p.zone&&dist(o,p)<680).map(o=>this.publicPlayer(o));
  // Margem de visibilidade evita monstros aparecendo/desaparecendo na borda da tela.
  const mons=(this.monsters.get(p.zone)||[]).filter(m=>m.hp>0&&dist(m,p)<850).map(m=>this.publicMonster(m));
  this.send(p.socket,{type:'snapshot',online:this.players.size+this.getOnline(),zone:p.zone,players:near,monsters:mons,day:this.day});
 }
 receive(c,d){if(!d||typeof d!=='object'||Array.isArray(d))return;if(!c.worldPlayer){if(d.type==='hello')this.join(c,d);return}
  const p=c.worldPlayer;const now=Date.now();
  switch(d.type){
   case 'move':{
    if(now-p.lastMove<20)break;const x=Number(d.x),y=Number(d.y);if(!Number.isFinite(x)||!Number.isFinite(y))break;
    // Orçamento de movimento baseado no tempo, não tolerância por pacote:
    // spam de comandos não permite superar a velocidade máxima no longo prazo.
    const dt=clamp((now-p.lastMove)/1000,0,.25),speed=195;
    const credit=Math.min(speed*.25+12,Math.max(0,p.moveCredit??12)+speed*dt);
    const dd=Math.hypot(x-p.x,y-p.y);
    const allowed=Math.min(dd,credit);
    const f=dd>0?allowed/dd:0;
    const next=terrain.step(p.zone,p.x,p.y,(x-p.x)*f,(y-p.y)*f,ZONES);
    const travelled=Math.hypot(next.x-p.x,next.y-p.y);
    p.x=next.x;p.y=next.y;
    p.moveCredit=Math.max(0,credit-travelled);
    p.dir=Number.isInteger(d.dir)?clamp(d.dir,0,3):2;p.lastMove=now;
    p.save.x=p.x;p.save.y=p.y;this.dirty=true;break;
   }
   case 'travel':this.travel(p,d.zone);break;
   case 'portal':this.usePortal(p,d.zone);break;
   case 'attack':this.attack(p,d.target,false);break;
   case 'skill':this.attack(p,d.target,true);break;
   case 'class':this.chooseClass(p,d.role);break;
   case 'use':this.use(p,cap(d.item,30));break;
   case 'buy':this.buy(p,cap(d.item,30));break;
   case 'quest':this.claimQuests(p);break;
   case 'chat':this.chat(p,d);break;
   case 'report':this.reportChat(p,d);break;
   case 'ignore':this.ignore(p,d);break;
   case 'party':this.party(p,d);break;
   case 'guild':this.guild(p,d);break;
   case 'trade':this.trade(p,d);break;
   case 'talk':this.talk(p,d.npc);break;
   case 'storyChoice':this.storyChoice(p,d.npc,d.choice);break;
   case 'ping':{
    // Eco leve para medir o RTT real pelo navegador; não envolve salvamentos.
    // Limite de frequência evita abuso do endpoint de ping.
    if(now-(p.lastLatencyPing||0)<1500)break;
    const id=d.id;
    if(id!==undefined&&(!Number.isSafeInteger(id)||id<1||id>2147483647))break;
    p.lastLatencyPing=now;
    this.send(p.socket,id===undefined?{type:'pong',now}:{type:'pong',id});
    break;
   }
  }
 }
 talk(p,id){
  if(typeof id!=='string'||id.length>64)return;
  const npc=byId.get(id);
  if(!npc||npc.zone!==p.zone||dist(p,npc)>165){this.tell(p,'Aproxime-se do personagem para conversar.');return}
  if(Date.now()-(p.lastTalk||0)<240)return;
  p.lastTalk=Date.now();p.talkId=npc.id;
  const s=p.save.story,stage=s.stage;
  const base={type:'dialogue',id:npc.id,name:npc.name,title:npc.title,chapter:npc.chapter||null,mode:'lore'};
  if(npc.kind==='lore'){
   this.send(p.socket,{...base,pages:npc.lines,choices:[]});return;
  }
  if(npc.index<stage){
   const pages=npc.ending||[`${npc.name} sorri: Nossa conversa continua ecoando pelo reino.`, 'As palavras são sementes: nem sempre vemos quando brotam.'];
   this.send(p.socket,{...base,mode:'revisit',pages,choices:[]});return;
  }
  if(npc.index>stage){
   const next=chapters[stage];
   this.send(p.socket,{...base,mode:'locked',pages:[`Ainda não chegou o momento desta parte das Crônicas.`,next?`Siga primeiro para ${next.name}, em ${ZONES[next.zone][0]}.`:'Sua jornada foi concluída.'],choices:[]});return;
  }
  if(npc.objective>0&&s.active){
   if(s.progress<npc.objective){
    this.send(p.socket,{...base,mode:'progress',pages:[`Você já aceitou ajudar. Progresso: ${s.progress} de ${npc.objective} criaturas vencidas nesta região.`, 'As criaturas não atacam por proximidade. Escolha as ameaças que precisa enfrentar, vença-as e volte a conversar comigo.'],choices:[]});return;
   }
   this.send(p.socket,{...base,mode:'complete',pages:npc.ending||['Você cumpriu sua palavra. O caminho da Aurora pode prosseguir.'],choices:npc.choices.map(([id,label])=>({id,label}))});return;
  }
  this.send(p.socket,{...base,mode:npc.objective?'offer':'complete',pages:npc.lines,objective:npc.objective,choices:npc.objective?[{id:'accept',label:`Aceitar o desafio (${npc.objective} criaturas)`},{id:'later',label:'Vou me preparar primeiro'}]:npc.choices.map(([id,label])=>({id,label}))});
 }
 storyChoice(p,id,choice){
  if(typeof id!=='string'||typeof choice!=='string'||id!==p.talkId)return;
  const npc=byId.get(id);
  if(!npc||npc.kind!=='chapter'||npc.zone!==p.zone||dist(p,npc)>165){p.talkId=null;return}
  const s=p.save.story;if(npc.index!==s.stage){p.talkId=null;return}
  p.talkId=null;
  if(choice==='later')return;
  if(choice==='accept'&&npc.objective>0&&!s.active){
   s.active=true;s.progress=0;this.dirty=true;
   this.send(p.socket,{type:'storyResolved',message:`Missão aceita: ${npc.objective} criaturas em ${ZONES[p.zone][0]}. Volte para falar com ${npc.name}.`,stage:s.stage});
   this.send(p.socket,this.ownStatus(p));return;
  }
  if(npc.objective>0&&(!s.active||s.progress<npc.objective))return;
  const option=npc.choices.find(([name])=>name===choice);
  if(!option)return;
  const [,,reply]=option;
  s.decisions.push({chapter:npc.index,id:choice});
  if(npc.shard&&!s.shards.includes(npc.shard))s.shards.push(npc.shard);
  s.stage+=1;s.active=false;s.progress=0;
  const save=p.save;
  save.coins+=npc.coins;save.xp+=npc.xp;
  if(npc.key)save.inventory.chave=(save.inventory.chave||0)+1;
  while(save.level<100&&save.xp>=xpNeed(save.level)){save.xp-=xpNeed(save.level);save.level++;save.hp=hpMax(save)}
  this.dirty=true;
  const next=chapters[s.stage];
  const completion=s.stage===chapters.length;
  if(completion)this.unlockAchievement(p,'aurora-restaurada');
  const mercy=s.decisions.filter(x=>x.id==='compaixao').length;
  const epilogue=completion?(mercy>=8?'Você se tornou o Peregrino da Compaixão. A cidade aprende que ouvir é também um ato de coragem.':'Você se tornou o Peregrino da Perseverança. A cidade aprende que a coragem precisa caminhar ao lado do cuidado.') : null;
  this.send(p.socket,{type:'storyResolved',message:reply,reward:{xp:npc.xp,coins:npc.coins,key:!!npc.key,shard:npc.shard||null},stage:s.stage,complete:completion,epilogue,next:next?{name:next.name,zone:next.zone,region:ZONES[next.zone][0]}:null});
  this.send(p.socket,this.ownStatus(p));
  if(completion)this.tell(p,'✦ As sete Centelhas foram reunidas. O Sino da Aurora voltou a tocar!');
 }
 chooseClass(p,role){if(!CLASSES[role])return;if(p.save.level>1||p.save.kills>0){this.tell(p,'A classe não pode ser alterada após começar a evolução.');return}const previous=hpMax(p.save);p.save.role=role;p.save.hp=clamp(p.save.hp+hpMax(p.save)-previous,1,hpMax(p.save));this.dirty=true;this.send(p.socket,this.ownStatus(p));this.tell(p,'Classe alterada para '+CLASSES[role].name+'.')}
 travel(p,z){z=Number(z);if(!Number.isInteger(z)||z<0||z>=ZONES.length)return;
  if(z===p.zone)return;const a=p.zone,b=z;const legal=this.zonePortals(a).some(g=>g.zone===b);
  if(!legal){this.tell(p,'Use uma passagem conectada a esta região.');return}
  const enteringDungeon=a<12&&b>=12&&b<LEGACY_ZONE_COUNT;
  if(enteringDungeon&&(p.save.inventory.chave||0)<1){this.tell(p,'Você precisa de uma Chave da masmorra (comprável na loja).');return}
  if(enteringDungeon){p.save.inventory.chave--;}
  p.zone=b;p.save.zone=b;
  const arrival=terrain.nearestWalkable(b,ZONE_W/2,ZONE_H/2,ZONES);
  p.x=arrival.x;p.y=arrival.y;p.save.x=p.x;p.save.y=p.y;if(!p.save.visited.includes(b))p.save.visited.push(b);
  if(p.save.visited.length>=8)this.unlockAchievement(p,'explorar-8');
  if(p.save.visited.length>=16)this.unlockAchievement(p,'explorar-16');
  this.dirty=true;
  this.send(p.socket,{type:'travel',zone:b,name:ZONES[b][0],x:p.x,y:p.y,portals:this.zonePortals(b)});this.send(p.socket,this.ownStatus(p));this.snapshotTo(p);
 }
 attack(p,tid,skill){const now=Date.now(),role=CLASSES[p.save.role];const cooldown=skill?4000:600;
  if(now-(skill?p.lastSpell:p.lastAttack)<cooldown)return;
  let m=(this.monsters.get(p.zone)||[]).find(x=>x.id===tid&&x.hp>0);if(!m||dist(m,p)>(skill?role.range*1.4:role.range))return;
  if(skill)p.lastSpell=now;else p.lastAttack=now;
  const level=p.save.level;
  const bestRelic=RELICS[RELIC_WEAPON[p.save.role]];
  const weapon=(p.save.inventory[RELIC_WEAPON[p.save.role]]||0)>0?bestRelic.attack:
    p.save.role==='arqueiro'?((p.save.inventory.arco||0)>0?6:0):
    ((p.save.inventory.espada||0)>0?7:0);
  let damage=Math.round(role.attack+level*2+weapon+(skill?role.attack*.9:0));
  const marker=this.players.get(m.markOwner);
  if(m.markUntil>now&&marker&&marker.id!==p.id&&marker.party&&p.party===marker.party){
   damage+=Math.max(1,Math.round(damage*.18));
  }
  if(skill&&p.save.role==='arqueiro'){
   m.markUntil=now+5500;m.markOwner=p.id;
   this.tell(p,'✦ Flecha de precisão: aliados da equipe causam dano adicional por 5,5 s.');
  }
  if(skill&&p.save.role==='guardiao'){
   for(const ally of this.players.values())if(ally.zone===p.zone&&dist(p,ally)<230&&(ally.id===p.id||(p.party&&ally.party===p.party))){
    ally.guardUntil=now+4500;
    this.tell(ally,'✦ Proteção do Guardião: defesa aumentada por 4,5 s.');
   }
  }
  if(skill&&p.save.role==='peregrino'){
   p.save.hp=Math.min(hpMax(p.save),p.save.hp+12+level*2);
   this.send(p.socket,this.ownStatus(p));
  }
  if(skill&&p.save.role==='curandeiro'){
   for(const ally of this.players.values()){
    if(ally.zone!==p.zone||dist(p,ally)>=230||!(ally.id===p.id||(p.party&&ally.party===p.party)))continue;
    ally.save.hp=clamp(ally.save.hp+28+level*4+((p.save.inventory.cajado_misericordia||0)>0?RELICS.cajado_misericordia.healing:0),1,hpMax(ally.save));
    this.send(ally.socket,this.ownStatus(ally));
   }
  }
  m.hp=Math.max(0,m.hp-damage);m.damageFrom.set(p.id,(m.damageFrom.get(p.id)||0)+damage);
  // Sem agressividade por proximidade: o monstro só enfrenta quem o atacou.
  // Um novo golpe renova a reação; outros peregrinos próximos ficam em paz.
  if(m.hp>0){m.aggroTarget=p.id;m.aggroUntil=now+16000}
  // O servidor é autoritativo: apenas ataques que realmente atingiram o alvo
  // emitem uma flecha ou um feitiço visual. O dano e a cura já foram calculados.
  const aim={x:Math.round(m.x),y:Math.round(m.y-22)};
  const projectile=p.save.role==='arqueiro'?
   {projectile:'arrow',from:{x:Math.round(p.x),y:Math.round(p.y-34)},to:aim}:
   p.save.role==='curandeiro'?
   // O foco do cajado fica à direita do corpo no sprite 16-bit.
   {projectile:'holy-bolt',from:{x:Math.round(p.x+25),y:Math.round(p.y-57)},to:aim}:{};
  this.broadcast({type:'hit',monster:m.id,zone:m.zone,damage,remaining:m.hp,by:p.name,skill,...projectile},q=>q.zone===p.zone&&dist(q,m)<780);
  if(m.hp===0){m.aggroTarget=null;m.aggroUntil=0;m.windupUntil=0;m.markUntil=0;m.markOwner=null;m.deadUntil=now+(m.boss?45000:14000);let recipients=new Map();for(const [pid] of m.damageFrom){const x=this.players.get(pid);if(x&&x.zone===p.zone&&dist(x,m)<690)recipients.set(x.id,x)}
   for(const x of [...recipients.values()])if(x.party){for(const ally of this.players.values())if(ally.party===x.party&&ally.zone===x.zone&&dist(ally,m)<500)recipients.set(ally.id,ally)}
   for(const x of recipients.values())this.award(x,Math.round(m.xp/Math.max(1,recipients.size)*1.3),Math.ceil(m.coins/Math.max(1,recipients.size)),m.boss,m.zone);
   this.broadcast({type:'defeated',monster:m.id,zone:m.zone,by:p.name,boss:m.boss},q=>q.zone===p.zone);
   m.damageFrom.clear();this.dirty=true;
  }
 }
 award(p,xp,gold,boss=false,zone=p.zone){const s=p.save;const story=s.story;const chapter=chapters[story.stage];if(chapter&&story.active&&chapter.objective>0&&chapter.zone===zone){story.progress=Math.min(chapter.objective,story.progress+1);if(story.progress===chapter.objective)this.tell(p,`✦ Objetivo concluído! Volte e converse com ${chapter.name}.`)}s.xp+=xp;s.coins+=gold;s.kills++;while(s.level<100&&s.xp>=xpNeed(s.level)){s.xp-=xpNeed(s.level);s.level++;s.hp=hpMax(s);this.tell(p,'✦ Você alcançou o nível '+s.level+'!')}
  if(s.kills>=1)this.unlockAchievement(p,'primeira-vitoria');
  if(s.kills>=25)this.unlockAchievement(p,'cacas-25');
  if(s.kills>=100)this.unlockAchievement(p,'cacas-100');
  if(boss)this.unlockAchievement(p,'primeiro-chefe');
  if(boss){
   s.inventory.superpocao=(s.inventory.superpocao||0)+1;
   this.tell(p,'★ Chefe derrotado! Você recebeu uma poção radiante.');
   // Primeira vitória por região libera uma relíquia; repetir o chefe não duplica.
   if(Number.isInteger(zone)&&zone>=0&&zone<ZONES.length&&!s.bossRelics.includes(zone)){
    const id=BOSS_RELICS[zone%BOSS_RELICS.length],relic=RELICS[id];
    s.bossRelics.push(zone);
    s.inventory[id]=(s.inventory[id]||0)+1;
    this.tell(p,'✦ Relíquia '+relic.rarity+': '+relic.name+'! (chefe da região)');
   }
  }
  this.send(p.socket,{type:'reward',xp,gold,boss});this.send(p.socket,this.ownStatus(p));this.dirty=true;
 }
 use(p,id){if(!['pocao','superpocao'].includes(id)||(p.save.inventory[id]||0)<=0)return;const now=Date.now();if(now-p.lastUse<600)return;p.lastUse=now;p.save.inventory[id]--;p.save.hp=clamp(p.save.hp+GOODS[id].heal,0,hpMax(p.save));this.send(p.socket,this.ownStatus(p));this.dirty=true}
 buy(p,id){const item=GOODS[id];if(!item||p.save.coins<item.price){this.tell(p,'Moedas insuficientes ou item desconhecido.');return}
  p.save.coins-=item.price;p.save.inventory[id]=(p.save.inventory[id]||0)+1;this.send(p.socket,this.ownStatus(p));this.tell(p,item.name+' comprado!');this.dirty=true}
 claimQuests(p){let completed=0;for(const q of QUESTS){if(questProgress(p.save,q)>=q.target&&!p.save.quests.includes(q.id)){
  p.save.quests.push(q.id);p.save.xp+=q.reward;p.save.coins+=q.coins;completed++;
  while(p.save.level<100&&p.save.xp>=xpNeed(p.save.level)){p.save.xp-=xpNeed(p.save.level);p.save.level++;p.save.hp=hpMax(p.save)}
 }}this.tell(p,completed?'Missões concluídas: '+completed+'!':'Ainda não há missões para resgatar.');this.send(p.socket,this.ownStatus(p));this.dirty=true}
 ignore(p,d){
  const action=cap(d.action,12),name=cap(d.target,30).trim();
  if(!assertName(name))return this.tell(p,'Nome inválido para silenciar.');
  const key=name.toLocaleLowerCase('pt-BR'),list=p.save.blocked;
  if(key===p.name.toLocaleLowerCase('pt-BR'))return this.tell(p,'Você não pode silenciar a si mesmo.');
  if(action==='add'){
   if(list.includes(key))return this.tell(p,name+' já está silenciado.');
   if(list.length>=30)return this.tell(p,'Limite de 30 nomes silenciados.');
   list.push(key);this.tell(p,'Mensagens de '+name+' silenciadas.');
  }else if(action==='remove'){
   if(!list.includes(key))return;
   p.save.blocked=list.filter(n=>n!==key);this.tell(p,'Mensagens de '+name+' liberadas.');
  }else return;
  this.dirty=true;
  this.send(p.socket,this.ownStatus(p));
 }
 chat(p,d){
  const raw=d.text,command=typeof raw==='string'?/^\/(ignorar|designorar)\s+(.{3,30})$/i.exec(raw.trim()):null;
  if(command){this.ignore(p,{action:command[1].toLowerCase()==='ignorar'?'add':'remove',target:command[2]});return}
  const review=this.chatGuard.check(p.uid,raw);
  if(!review.ok){this.tell(p,review.message);return}
  const channel=d.channel==='global'||d.channel==='party'||d.channel==='guild'?d.channel:null;
  if(!channel)return this.tell(p,'Canal de conversa não reconhecido.');
  if(channel==='party'&&!p.party)return this.tell(p,'Você precisa entrar em uma equipe.');
  if(channel==='guild'&&!p.save.guild)return this.tell(p,'Você precisa entrar em uma guilda.');
  // Nenhuma mensagem pode ser transmitida antes da moderação no servidor.
  const id=crypto.randomUUID(),event={type:'chat',id,channel,name:p.name,text:review.text,preset:review.preset};
  const recipients=new Set();
  for(const q of this.players.values()){
   if(q.save.blocked?.includes(p.name.toLocaleLowerCase('pt-BR')))continue;
   if(channel==='party'&&q.party!==p.party)continue;
   if(channel==='guild'&&q.save.guild!==p.save.guild)continue;
   this.send(q.socket,event);recipients.add(q.uid);
  }
  const now=Date.now();
  for(const [key,value] of this.chatReceipts)if(now-value.time>5*60*1000)this.chatReceipts.delete(key);
  if(this.chatReceipts.size>=180)this.chatReceipts.delete(this.chatReceipts.keys().next().value);
  this.chatReceipts.set(id,{author:p.uid,authorName:p.name,recipients,time:now,reported:new Set()});
 }
 reportChat(p,d){
  const id=typeof d.id==='string'&&/^[a-f0-9-]{36}$/i.test(d.id)?d.id:null;
  const message=id?this.chatReceipts.get(id):null,now=Date.now();
  if(!message||now-message.time>5*60*1000||message.author===p.uid||!message.recipients.has(p.uid)){
   this.tell(p,'Denúncia não disponível para essa mensagem.');return;
  }
  const rate=this.chatReportRate.get(p.uid)||{count:0,start:now};
  if(now-rate.start>10*60*1000){rate.count=0;rate.start=now}
  if(message.reported.has(p.uid)){this.tell(p,'Você já denunciou esta mensagem.');return}
  if(rate.count>=4){this.tell(p,'Limite temporário de denúncias alcançado.');return}
  rate.count++;this.chatReportRate.set(p.uid,rate);
  message.reported.add(p.uid);
  // Denunciar silencia o remetente imediatamente para quem denunciou.
  const name=message.authorName.toLocaleLowerCase('pt-BR');
  if(!p.save.blocked.includes(name)&&p.save.blocked.length<30){
   p.save.blocked.push(name);this.dirty=true;this.send(p.socket,this.ownStatus(p));
  }
  const reports=this.chatReports.get(message.author)||{by:new Set(),until:now+10*60*1000};
  if(now>reports.until){reports.by.clear();reports.until=now+10*60*1000}
  reports.by.add(p.uid);this.chatReports.set(message.author,reports);
  // 3 pessoas distintas que receberam mensagens causam suspensão preventiva.
  if(reports.by.size>=3)this.chatGuard.silence(message.author,10*60*1000);
  this.tell(p,'Denúncia recebida. Esse jogador foi silenciado para você.');
  console.info('[chat] denúncia registrada sem texto pessoal; quantidade='+reports.by.size);
 }
 party(p,d){const mode=cap(d.action,20);if(mode==='create'){if(p.party)return;const id=crypto.randomUUID();this.parties.set(id,{leader:p.id,members:[p.id],invited:[]});p.party=id;this.partyUpdate(id)}
  else if(mode==='invite'){const pt=this.parties.get(p.party);if(!pt||pt.leader!==p.id)return;const target=[...this.players.values()].find(x=>x.name.toLowerCase()===cap(d.target,20).toLowerCase());if(!target||target.party||pt.members.length>=5)return;pt.invited.push(target.id);this.tell(target,p.name+' convidou você para a equipe. Use “Aceitar convite”.');this.send(target.socket,{type:'partyInvite',party:p.party,by:p.name})}
  else if(mode==='accept'){const pt=this.parties.get(d.party);if(!pt||!pt.invited.includes(p.id)||p.party||pt.members.length>=5)return;pt.invited=pt.invited.filter(x=>x!==p.id);pt.members.push(p.id);p.party=d.party;this.partyUpdate(d.party)}
  else if(mode==='leave')this.partyLeave(p,true);
 }
 partyLeave(p,notify){const id=p.party,pt=this.parties.get(id);p.party=null;if(!pt)return;pt.members=pt.members.filter(x=>x!==p.id);if(pt.leader===p.id)pt.leader=pt.members[0];if(!pt.members.length)this.parties.delete(id);else this.partyUpdate(id);if(notify)this.send(p.socket,this.ownStatus(p))}
 partyUpdate(id){const pt=this.parties.get(id);if(!pt)return;const names=pt.members.map(pid=>this.players.get(pid)?.name).filter(Boolean);for(const pid of pt.members){const p=this.players.get(pid);if(p){this.send(p.socket,{type:'partyInfo',leader:this.players.get(pt.leader)?.name,members:names,id});this.send(p.socket,this.ownStatus(p));}}}
 guild(p,d){const mode=cap(d.action,15),name=cap(d.name,30).trim(),key=name.toLocaleLowerCase('pt-BR');
  if(mode==='create'){if(p.save.guild||p.save.coins<250||!/^[\p{L}\p{N}][\p{L}\p{N} -]{2,23}$/u.test(name)||this.guilds.has(key))return this.tell(p,'Guilda indisponível. Precisa de 250 moedas e um nome exclusivo.');
   p.save.coins-=250;p.save.guild=name;this.guilds.set(key,{name,leader:p.uid,members:[p.uid],invitations:[]});this.tell(p,'Guilda criada: '+name);this.dirty=true;
  } else if(mode==='invite'){const g=this.guilds.get(p.save.guild?.toLowerCase());if(!g||g.leader!==p.uid)return;const other=[...this.players.values()].find(o=>o.name.toLowerCase()===cap(d.target,20).toLowerCase());if(!other||other.save.guild)return;g.invitations.push(other.uid);this.send(other.socket,{type:'guildInvite',name:g.name,by:p.name});this.dirty=true;
  } else if(mode==='accept'){const g=this.guilds.get(key);if(!g||!g.invitations.includes(p.uid)||p.save.guild)return;g.invitations=g.invitations.filter(x=>x!==p.uid);g.members.push(p.uid);p.save.guild=g.name;this.dirty=true;
  } else if(mode==='leave'){const g=this.guilds.get(p.save.guild?.toLowerCase());if(g){g.members=g.members.filter(x=>x!==p.uid);if(g.leader===p.uid)g.leader=g.members[0]||null;if(!g.members.length)this.guilds.delete(p.save.guild.toLowerCase())}p.save.guild=null;this.dirty=true}
  this.send(p.socket,this.ownStatus(p));
 }
 trade(p,d){const mode=cap(d.action,15),other=[...this.players.values()].find(o=>o.name.toLowerCase()===cap(d.target,20).toLowerCase());
  if(!other||other.id===p.id||other.zone!==p.zone||dist(p,other)>200)return this.tell(p,'O outro jogador precisa estar perto de você.');
  const key=[p.id,other.id].sort().join(':');
  if(mode==='offer'){
   const item=cap(d.item,30),count=Math.floor(Number(d.count)),gold=Math.floor(Number(d.gold)||0);
   if(!(GOODS[item]||RELICS[item])||!Number.isInteger(count)||count<1||count>10||!Number.isInteger(gold)||gold<0||gold>10000||p.save.inventory[item]<count||p.save.coins<gold)return this.tell(p,'Oferta inválida ou saldo insuficiente.');
   this.pendingTrades.set(key,{from:p.id,to:other.id,item,count,gold,expires:Date.now()+30000});
   this.send(other.socket,{type:'tradeOffer',from:p.name,item,count,gold});this.tell(p,'Oferta enviada a '+other.name+'.');
  } else if(mode==='accept'){
   const trade=this.pendingTrades.get(key);if(!trade||trade.to!==p.id||trade.expires<Date.now())return;
   const giver=this.players.get(trade.from);if(!giver||giver.zone!==p.zone||dist(giver,p)>200)return;
   if((giver.save.inventory[trade.item]||0)<trade.count||giver.save.coins<trade.gold)return;
   giver.save.inventory[trade.item]-=trade.count;p.save.inventory[trade.item]=(p.save.inventory[trade.item]||0)+trade.count;
   giver.save.coins-=trade.gold;p.save.coins+=trade.gold;
   this.pendingTrades.delete(key);this.send(p.socket,this.ownStatus(p));this.send(giver.socket,this.ownStatus(giver));this.tell(p,'Troca recebida com sucesso.');this.tell(giver,'Troca confirmada por '+p.name+'.');this.dirty=true;
  } else if(mode==='reject'){this.pendingTrades.delete(key);this.tell(other,'Troca recusada.')}
 }
 tick(){const now=Date.now(),dt=clamp((now-this.lastTick)/1000,.01,.5);this.lastTick=now;
  // Apenas regiões ocupadas têm IA ativa. O servidor controla quem provocou cada monstro.
  const activeZones=new Set([...this.players.values()].map(p=>p.zone));
  for(const zone of activeZones){for(const m of this.monsters.get(zone)||[]){
   if(m.hp<=0){
    if(now>=m.deadUntil){m.hp=m.maxHp;m.x=m.home.x;m.y=m.home.y;m.damageFrom.clear();m.aggroTarget=null;m.aggroUntil=0;m.lastAttack=0;m.windupUntil=0;m.markUntil=0;m.markOwner=null;m.wanderGoal=null;m.wander=now+1500}
    else continue;
   }
   const target=m.aggroTarget?this.players.get(m.aggroTarget):null;
   const hostile=!!(target&&target.zone===zone&&now<m.aggroUntil&&dist(target,m.home)<400&&dist(m,m.home)<440);
   if(!hostile){
    m.aggroTarget=null;m.aggroUntil=0;m.windupUntil=0;
    // Caminhada tranquila em um pequeno raio do local de origem, sem perseguir quem passa.
    const homeDist=dist(m,m.home);
    if(homeDist>90){const step=Math.min(40*dt,homeDist);m.x+=(m.home.x-m.x)/homeDist*step;m.y+=(m.home.y-m.y)/homeDist*step}
    else {
     // A caminhada era um salto de 24px no instante de escolher direção.
     // Agora a IA escolhe um destino e percorre a distância gradualmente.
     if(m.wanderGoal&&dist(m,m.wanderGoal)<=.5)m.wanderGoal=null;
     if(!m.wanderGoal&&now>=m.wander){
      const seed=hash32(now+Math.floor(m.y)*17+Math.floor(m.x));
      const dir=seed%4;
      const stride=22+(hash32(seed+1)%19);
      m.wanderGoal={
       x:clamp(m.x+(dir===0?stride:dir===1?-stride:0),m.home.x-70,m.home.x+70),
       y:clamp(m.y+(dir===2?stride:dir===3?-stride:0),m.home.y-70,m.home.y+70)
      };
      m.wander=now+1700+hash32(seed+2)%2600;
     }
     if(m.wanderGoal){
      const remaining=dist(m,m.wanderGoal);
      if(remaining>0){
       const step=Math.min(30*dt,remaining);
       m.x+=(m.wanderGoal.x-m.x)/remaining*step;
       m.y+=(m.wanderGoal.y-m.y)/remaining*step;
       if(remaining-step<=.5)m.wanderGoal=null;
      }
     }
    }
    continue;
   }
   m.wanderGoal=null; // Inimigo provocado cancela o passeio; depois volta a andar normalmente.
   const d=dist(target,m);
   if(d>42){const step=Math.min(58*dt,d);m.x+=(target.x-m.x)/d*step;m.y+=(target.y-m.y)/d*step}
   // O ataque precisa ser anunciado e permanecer ao alcance até o golpe.
   if(d>=53){m.windupUntil=0;continue}
   if(!m.windupUntil&&now-m.lastAttack>2200){
    const warning=m.boss?1100:650;
    m.windupUntil=now+warning;
    this.send(target.socket,{type:'monsterWindup',monster:m.id,zone:m.zone,duration:warning,boss:m.boss});
    continue;
   }
   if(m.windupUntil&&now>=m.windupUntil){
    m.windupUntil=0;m.lastAttack=now;
    const defense=CLASSES[target.save.role].defense+(target.save.inventory.amuleto?4:0)+((target.save.inventory.manto_luz||0)>0?RELICS.manto_luz.defense:0)+(target.guardUntil>now?8+Math.floor(target.save.level/3):0);
    const damage=Math.max(1,Math.ceil(m.damage*(m.boss?1.2:1))-defense);target.save.hp-=damage;
    this.send(target.socket,{type:'hurt',damage,monster:m.name});
    if(target.save.hp<=0){
     target.save.hp=hpMax(target.save);target.x=ZONE_W/2;target.y=ZONE_H/2;
     target.save.x=target.x;target.save.y=target.y;
     target.save.coins=Math.max(0,target.save.coins-10);
     m.aggroTarget=null;m.aggroUntil=0;
     this.tell(target,'Você caiu em batalha e voltou ao santuário.');
    }
    this.send(target.socket,this.ownStatus(target));this.dirty=true;
   }
  }}
  for(const p of this.players.values())this.snapshotTo(p);
 }
 status(){return {connected:this.count,monsters:this.totalMonsters(),regions:ZONES.length,guilds:this.guilds.size,version:'mmo-aurora-historia-alpha'}}
 stop(){clearInterval(this.saveTimer);for(const p of this.players.values())this.saved.characters[p.uid]=safeSave(p.save);this.dirty=true;this.persist();try{this.db?.close()}catch{}}
}
module.exports={World,ZONES,ZONE_W,ZONE_H,GOODS,RELICS,BOSS_RELICS,QUESTS,questProgress,SPECIES,CLASSES,ACHIEVEMENTS,xpNeed};

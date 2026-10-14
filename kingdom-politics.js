'use strict';
/**
 * Reinos de Auren — política persistente do continente histórico.
 * Regiões 0–15 formam o conselho continental; as quatro masmorras históricas
 * (12–15) são neutras e nunca recebem construções. Subsolos também proibidos.
 * Guildas pertencem à conta/personagem e são compartilhadas entre salas.
 */
const CONTINENT_REGIONS=16;
const BUILDABLE_REGIONS=12;
const BASE_COST=800;
const RELOCATE_COST=450;
const RELOCATE_COOLDOWN=24*60*60*1000;
const RAID_COOLDOWN=10*60*1000;
const MARCH_DURATION=45*1000;
const MAX_TROOPS=1200;
const TROOP_BASE_CAP=300;
const militaryCapacity=level=>TROOP_BASE_CAP+Math.floor((fortressLevel(level)-1)*900/59);
const UPKEEP_CYCLE_MS=30*60*1000;
const MAX_UPKEEP_CYCLES=3;
const SURRENDER_THRESHOLD=60;
const SURRENDER_TRUCE_MS=30*60*1000;
const SURRENDER_TRIBUTE_RATE=.10;
const SIEGE_BONUS_PER_ENGINE=12;
const ALLIANCE_LIMIT=3;
const nearestFortress=(p,base,radius=200)=>p?.zone===base?.zone&&Math.hypot(p.x-base.x,p.y-base.y)<=radius;
const CITY_BUILDINGS=Object.freeze({house:120,farm:160,barracks:280,tower:360,market:240});
const CITY_LIMIT=120;
const FORTRESS_MAX_LEVEL=60;
const BUILDING_MAX_LEVEL=60;
const fortressLevel=v=>Math.max(1,Math.min(FORTRESS_MAX_LEVEL,Math.floor(Number(v)||1)));
const buildingLevel=v=>Math.max(1,Math.min(BUILDING_MAX_LEVEL,Math.floor(Number(v)||1)));
const buildingSlots=lv=>Math.min(CITY_LIMIT,60+Math.max(0,fortressLevel(lv)-5)*2);
// Tempo real no servidor para cada edifício da cidade 3D. Construções antigas
// continuam concluídas; novas obras ocupam terreno e são salvas ao começar.
const CITY_BUILD_MS=Object.freeze({
 house:20*1000, farm:30*1000, market:45*1000,
 tower:60*1000, barracks:90*1000
});
const isComplete=(b,now=Date.now())=>b?.status==='complete'||!Number.isSafeInteger(b?.endsAt)||b.endsAt<=now;
const CITY_RECEIPTS_LIMIT=80; // Replays seguros: nunca cobrar a mesma construção duas vezes.
const cityLayout=require('./public/city-layout');
const CITY_CYCLE_MS=15*60*1000; // Prazo histórico preservado na migração.
const CITY_PRODUCTION_MS=Object.freeze({house:4*60000,farm:8*60000,market:12*60000,barracks:16*60000,tower:20*60000});
const productionCycleMs=(type,level=1)=>{
 const base=CITY_PRODUCTION_MS[type];
 return base?Math.max(60000,Math.round(base*Math.max(.20,1-(buildingLevel(level)-1)*.015)/1000)*1000):0;
};
const CITY_MAX_CYCLES=24; // Até 6h de produção acumulada; evita inflação sem limite.
const CITY_YIELDS=Object.freeze({
 house:{food:0,timber:0,stone:0,coins:2},
 farm:{food:8,timber:0,stone:0,coins:0},
 barracks:{food:1,timber:0,stone:0,coins:0},
 tower:{food:0,timber:0,stone:1,coins:0},
 market:{food:0,timber:2,stone:1,coins:5}
});
const CITY_CAP=200000;
const STOCK_CAPACITY=Object.freeze([0,600,1200,2200,3500,5000]);
const SIEGE_COOLDOWN=60*1000;
const ESCORT_LIMIT=60;
const stockCapacity=level=>{const lv=fortressLevel(level);return lv<=5?STOCK_CAPACITY[lv]:Math.min(CITY_CAP,5000+(lv-5)*800)};
const productionStart=(city,b)=>{
 if(Number.isSafeInteger(b.productionAt)&&b.productionAt>0)return b.productionAt;
 const last=Number.isSafeInteger(city.lastCollectedAt)?city.lastCollectedAt:0;
 const built=Number.isSafeInteger(b.endsAt)?b.endsAt:(Number.isSafeInteger(b.startedAt)?b.startedAt:0);
 return Math.max(last,built);
};
function productionState(city,b,now=Date.now()){
 const cycleMs=productionCycleMs(b?.type,b?.level),yields=CITY_YIELDS[b?.type];
 if(!cycleMs||!yields||!Object.values(yields).some(Boolean))return null;
 const complete=isComplete(b,now),since=productionStart(city,b),nextAt=since+cycleMs;
 const readyCycles=complete&&since>0?Math.min(CITY_MAX_CYCLES,Math.max(0,Math.floor((now-since)/cycleMs))):0;
 return {cycleMs,nextAt,readyCycles,yields:Object.fromEntries(Object.entries(yields).map(([r,n])=>[r,n*buildingLevel(b.level)]))};
}
const MILITARY_SUPPLIES=Object.freeze({militia:{food:4,timber:2,stone:0},archer:{food:5,timber:5,stone:0},knight:{food:8,timber:3,stone:3},siege:{food:12,timber:12,stone:8}});
const stockCopy=v=>Object.fromEntries(['food','timber','stone','coins'].map(id=>
 [id,Math.min(CITY_CAP,Math.max(0,Number.isSafeInteger(v?.[id])?v[id]:0))]));
function collectCity(g,now){
 if(!g.city||!Array.isArray(g.city.buildings)||!Number.isSafeInteger(now))return null;
 const city=g.city,stocks=stockCopy(city.stock),yielded=stockCopy({});
 for(const b of city.buildings)if(isComplete(b,now)&&!Number.isSafeInteger(b.productionAt))b.productionAt=productionStart(city,b);
 let readyBuildings=0;
 for(const b of city.buildings.slice(0,CITY_LIMIT)){
  const production=productionState(city,b,now);
  if(!production?.readyCycles)continue;
  readyBuildings++;
  for(const [resource,amount] of Object.entries(production.yields))yielded[resource]+=amount*production.readyCycles;
  const elapsedCycles=Math.floor((now-productionStart(city,b))/production.cycleMs);
  b.productionAt=productionStart(city,b)+elapsedCycles*production.cycleMs; // Sem coletar 24 ciclos repetidamente após longa ausência.
 }
 if(!readyBuildings)return null;
 const capacity=stockCapacity(g.base?.level);
 for(const resource of Object.keys(stocks))
  if(stocks[resource]<capacity)stocks[resource]=Math.min(capacity,stocks[resource]+yielded[resource]);
 city.stock=stocks;city.lastCollectedAt=now;
 return {cycles:readyBuildings,yielded,readyBuildings};
}
const UNITS=Object.freeze({
 militia:{name:'Milícia',power:2,defense:2},
 archer:{name:'Arqueiros',power:6,defense:3},
 knight:{name:'Cavaleiros',power:13,defense:7},
 siege:{name:'Máquinas de cerco',power:30,defense:5}
});
const integer=v=>typeof v==='number'&&Number.isSafeInteger(v);
const troopCount=army=>Object.values(UNITS).reduce((n,u,i)=>n+Math.max(0,Number(army?.[Object.keys(UNITS)[i]])||0),0);
const power=(army,field='power')=>Object.entries(UNITS).reduce((n,[id,unit])=>n+Math.max(0,Number(army?.[id])||0)*unit[field],0);
const armyCopy=army=>Object.fromEntries(Object.keys(UNITS).map(id=>[id,Math.min(MAX_TROOPS,Math.max(0,Math.floor(Number(army?.[id])||0)))]));
const fullArmyCount=g=>troopCount(armyCopy(g?.army))+escortTotal(g)+troopCount(armyCopy(g?.march?.units));
const escortOf=(guild,uid)=>armyCopy(guild?.escorts?.[uid]);
const escortTotal=guild=>Object.values(guild?.escorts||{}).reduce((n,v)=>n+troopCount(armyCopy(v)),0);
function fortressDefense(g,now=Date.now()){
 const lv=fortressLevel(g?.base?.level);
 const walls=Math.max(0,Math.min(FORTRESS_MAX_LEVEL,Math.floor(Number(g?.base?.defenseLevel)||0)));
 const towerLevels=(g?.city?.buildings||[]).filter(b=>b?.type==='tower'&&isComplete(b,now))
  .reduce((sum,b)=>sum+buildingLevel(b.level),0);
 // Diminishing returns: torres continuam úteis sem tornarem os cercos matematicamente impossíveis.
 const towers=Math.round(24*Math.sqrt(towerLevels));
 return {level:lv,walls,towers,defense:25*lv+12*walls+towers+power(g?.army,'defense')};
}
// O abastecimento pertence ao reino: não usa a carteira dos personagens.
// Processa até três ciclos atrasados, evitando perdas ilimitadas após downtime.
function applyArmyUpkeep(g,now){
 if(!g?.base||!g?.city||!Number.isSafeInteger(now))return null;
 const previous=Number.isSafeInteger(g.upkeepAt)?g.upkeepAt:0;
 if(!previous||previous>now){g.upkeepAt=now;return null}
 const passed=Math.floor((now-previous)/UPKEEP_CYCLE_MS);
 if(passed<1)return null;
 const cycles=Math.min(MAX_UPKEEP_CYCLES,passed);
 g.upkeepAt=now-(now-previous)%UPKEEP_CYCLE_MS;
 const total=fullArmyCount(g);
 if(!total)return null;
 const foodNeeded=Math.max(1,Math.ceil(total/25))*cycles;
 const stock=stockCopy(g.city.stock);
 const available=Math.min(foodNeeded,stock.food);
 stock.food-=available;g.city.stock=stock;
 let losses=0;
 if(available<foodNeeded){
  const deficit=(foodNeeded-available)/foodNeeded;
  const rate=Math.min(.12,.03*cycles*deficit);
  const attrit=army=>{
   const result=armyCopy(army);
   for(const unit of Object.keys(UNITS)){
    const lost=Math.floor(result[unit]*rate);
    result[unit]-=lost;losses+=lost;
   }
   return result;
  };
  g.army=attrit(g.army);
  if(g.escorts)for(const uid of Object.keys(g.escorts))
   g.escorts[uid]=attrit(g.escorts[uid]);
 }
 return {foodUsed:available,foodNeeded,losses,cycles};
}
const isAlly=(a,bKey)=>Array.isArray(a?.allies)&&a.allies.includes(bKey);
const activeTruce=(g,now)=>Number(g?.truce?.until)>now;
function completeSurrender(world,loserKey,now){
 const loser=world.guilds.get(loserKey),crisis=loser?.siegeCrisis;
 if(!loser?.base||!crisis||crisis.pressure<SURRENDER_THRESHOLD||
    now-Number(crisis.updatedAt||0)>24*60*60*1000)return null;
 const winner=world.guilds.get(crisis.attacker);
 if(!winner?.base||winner===loser)return null;
 const region=loser.base.zone;
 loser.influence=loser.influence||{};winner.influence=winner.influence||{};
 loser.influence[region]=Math.max(0,(Number(loser.influence[region])||0)-30);
 winner.influence[region]=Math.min(1000,(Number(winner.influence[region])||0)+45);
 // Tributo voluntário somente do tesouro compartilhado, nunca de dinheiro pessoal.
 let tribute=0;
 if(loser.city&&winner.city){
  const losingStock=stockCopy(loser.city.stock),winningStock=stockCopy(winner.city.stock);
  const room=Math.max(0,stockCapacity(winner.base.level)-winningStock.coins);
  tribute=Math.min(Math.floor(losingStock.coins*SURRENDER_TRIBUTE_RATE),room,2000);
  losingStock.coins-=tribute;winningStock.coins+=tribute;
  loser.city.stock=losingStock;winner.city.stock=winningStock;
 }
 const truce={with:crisis.attacker,until:now+SURRENDER_TRUCE_MS,region};
 loser.truce={...truce};
 winner.truce={with:loserKey,until:truce.until,region};
 loser.surrenderHistory=[...(loser.surrenderHistory||[]),{to:winner.name,at:now,tribute,region}].slice(-10);
 winner.diplomaticWins=(Number(winner.diplomaticWins)||0)+1;
 delete loser.siegeCrisis;
 world.dirty=true;
 return {winner:winner.name,loser:loser.name,region,tribute,until:truce.until};
}
function escortStrike(g,uid){
 const escort=escortOf(g,uid);
 return {units:escort,damage:troopCount(escort)?Math.min(50,Math.max(1,Math.round(power(escort)*.18))):0};
}
function guildFor(world,p){
 if(!p.save.guild)return null;
 const key=p.save.guild.toLocaleLowerCase('pt-BR'),guild=world.guilds.get(key);
 if(!guild||!Array.isArray(guild.members)||!guild.members.includes(p.uid))return null;
 return {key,guild};
}
function forts(world){
 return [...world.guilds.entries()].filter(([k,g])=>g&&g.base&&Number.isInteger(g.base.zone)&&g.base.zone<BUILDABLE_REGIONS)
  .map(([key,g])=>({key,name:g.name,leader:g.leader,zone:g.base.zone,x:g.base.x,y:g.base.y,
   level:Math.max(1,Math.floor(Number(g.base.level)||1)),army:armyCopy(g.army),influence:g.influence||{}}));
}
function politicalMap(world){
 const bases=forts(world);
 return Array.from({length:CONTINENT_REGIONS},(_,zone)=>{
  const contenders=zone>=BUILDABLE_REGIONS?[]:
   [...world.guilds.entries()].filter(([key,g])=>g?.base&&
    g.base.zone<BUILDABLE_REGIONS&&
    (g.base.zone===zone||Number(g.influence?.[zone])>0))
   .map(([key,g])=>({key,name:g.name,influence:Math.max(0,Number(g.influence?.[zone])||(g.base.zone===zone?1:0))}))
   .filter(c=>c.influence>0)
   .sort((a,b)=>b.influence-a.influence||a.name.localeCompare(b.name,'pt-BR'));
  return {zone,buildable:zone<BUILDABLE_REGIONS,ruler:contenders[0]?.name||null,
   influence:contenders[0]?.influence||0,contested:contenders.length>1};
 });
}
function rank(world){
 const territories=politicalMap(world);
 return [...world.guilds.entries()].filter(([k,g])=>Array.isArray(g.members)&&g.members.length)
  .map(([key,g])=>{
   const regions=territories.filter(t=>t.ruler===g.name).length;
   const influence=Object.values(g.influence||{}).reduce((n,value)=>n+Math.max(0,Number(value)||0),0);
   const score=regions*100+Math.floor(influence);
   return {key,name:g.name,territories:regions,influence:Math.floor(influence),score,
    title:regions>=7?'Coroa Continental':regions>=4?'Alta Realeza':regions>=2?'Reino Soberano':regions>=1?'Senhorio Regional':'Guilda sem Território'};
  }).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'pt-BR'));
}
// Planejamento de rota baseado nas mesmas passagens permitidas aos jogadores.
// Nunca passa pelas masmorras e não aceita destinos fornecidos pelo navegador.
function marchRoute(world,from,to){
 if(!from||!to||!Number.isInteger(from.zone)||!Number.isInteger(to.zone)||
    from.zone<0||from.zone>=BUILDABLE_REGIONS||to.zone<0||to.zone>=BUILDABLE_REGIONS)return null;
 const previous=new Map([[from.zone,null]]),queue=[from.zone];
 for(let index=0;index<queue.length&&!previous.has(to.zone);index++){
  const zone=queue[index];
  for(const gate of world.zonePortals(zone)){
   if(!Number.isInteger(gate.zone)||gate.zone<0||gate.zone>=BUILDABLE_REGIONS||previous.has(gate.zone))continue;
   previous.set(gate.zone,zone);queue.push(gate.zone);
  }
 }
 if(!previous.has(to.zone))return null;
 const zones=[to.zone];while(previous.get(zones[0])!==null)zones.unshift(previous.get(zones[0]));
 const route=[{zone:from.zone,x:from.x,y:from.y}];
 for(let i=0;i<zones.length-1;i++){
  const outgoing=world.zonePortals(zones[i]).find(g=>g.zone===zones[i+1]);
  if(!outgoing)return null;
  route.push({zone:zones[i],x:outgoing.x,y:outgoing.y});
  // Ao usar o portal, o jogador reaparece no centro seguro da próxima região.
  route.push({zone:zones[i+1],x:768,y:512});
 }
 route.push({zone:to.zone,x:to.x,y:to.y});
 return route;
}
function marchPosition(march,now=Date.now()){
 const route=march?.route;
 if(!Array.isArray(route)||route.length<2)return null;
 const progress=Math.max(0,Math.min(1,(now-march.startedAt)/Math.max(1,march.arrivesAt-march.startedAt)));
 const weights=[];
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i];
  // Transferências por portais também consomem tempo, mas não são exibidas
  // como unidades deslizando entre mapas diferentes.
  weights.push(a.zone===b.zone?Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)):180);
 }
 const total=weights.reduce((a,b)=>a+b,0);
 let distance=progress*total;
 for(let i=0;i<weights.length;i++){
  if(distance>weights[i]&&i<weights.length-1){distance-=weights[i];continue}
  const a=route[i],b=route[i+1],t=Math.min(1,distance/weights[i]);
  if(a.zone!==b.zone)return t<.5?{...a}:{...b};
  return {zone:a.zone,x:Math.round(a.x+(b.x-a.x)*t),y:Math.round(a.y+(b.y-a.y)*t)};
 }
 return {...route.at(-1)};
}
function publicState(world,p){
 // Todo snapshot reconcilia obras vencidas, inclusive após reinício, em
 // salas vazias e quando o tick anterior não conseguiu finalizar a obra.
 resolveCityConstructions(world,Date.now());
 const your=guildFor(world,p);
 return {continent:CONTINENT_REGIONS,buildable:BUILDABLE_REGIONS,
  // A capital pode ser visitada por convidados, mas construções permanentes
  // requerem conta. Evita prédios provisórios que jamais seriam aceitos.
  persistentAccount:Boolean(p?.isAccount),
  walletCoins:Math.max(0,Math.floor(Number(p?.save?.coins)||0)),
  zones:politicalMap(world),bases:forts(world).map(b=>({name:b.name,zone:b.zone,x:b.x,y:b.y,
   level:b.level,defenseLevel:world.guilds.get(b.key)?.base?.defenseLevel||0,realm:b.name})),
  ranking:rank(world).slice(0,30),
  yourGuild:your?{name:your.guild.name,leader:your.guild.leader===p.uid,
    canManage:Boolean(p.isAccount&&your.guild.base),membersCount:your.guild.members?.length||1,
   base:your.guild.base||null,army:armyCopy(your.guild.army),
   escort:escortOf(your.guild,p.uid),escortsTotal:escortTotal(your.guild),
   fortressDefense:fortressDefense(your.guild),
   march:your.guild.march||null,nextRaidAt:your.guild.nextRaidAt||0,
    armyCapacity:militaryCapacity(your.guild.base?.level),currentTroops:fullArmyCount(your.guild),
    upkeepAt:your.guild.upkeepAt||0,allies:(your.guild.allies||[]).map(k=>world.guilds.get(k)?.name||k),
    allianceOffers:(your.guild.allianceOffers||[]).filter(k=>world.guilds.get(k)).map(k=>({key:k,name:world.guilds.get(k).name})),
    crisis:your.guild.siegeCrisis?{...your.guild.siegeCrisis,
     yourVote:Boolean(your.guild.siegeCrisis.votes?.[p.uid]),
     canSurrender:your.guild.siegeCrisis.pressure>=SURRENDER_THRESHOLD}:null,
    truce:your.guild.truce||null,surrenderHistory:(your.guild.surrenderHistory||[]).slice(-5),
   influence:your.guild.influence||{},stock:stockCopy(your.guild.city?.stock),lastCollectedAt:your.guild.city?.lastCollectedAt||0}:null,
  serverNow:Date.now(),
  buildTimes:CITY_BUILD_MS,stockCapacity:stockCapacity(your?.guild?.base?.level),
  fortressMaxLevel:FORTRESS_MAX_LEVEL,buildingMaxLevel:BUILDING_MAX_LEVEL,
  maxBuildings:buildingSlots(your?.guild?.base?.level),productionTimes:CITY_PRODUCTION_MS,
  buildBounds:cityLayout.bounds(your?.guild?.base?.level||1),maxEscort:ESCORT_LIMIT,
  cities:[...world.guilds.values()].filter(g=>g.base).map(g=>({name:g.name,
   buildings:(Array.isArray(g.city?.buildings)?g.city.buildings:[])
    .filter(b=>b&&CITY_BUILDINGS[b.type]&&Number.isInteger(b.x)&&Number.isInteger(b.y))
    .slice(0,CITY_LIMIT).map(b=>({
     type:b.type,x:b.x,y:b.y,w:cityLayout.size(b)[0],h:cityLayout.size(b)[1],
     level:buildingLevel(b.level),production:productionState(g.city,b,Date.now()),
     // Campos de tempo persistidos: o contador é recuperado em qualquer sala.
     // A conclusão definitiva é registrada pelo tick do servidor, não
     // inferida apenas do relógio do navegador. Ao expirar, o cliente
     // pede reconciliação até o status persistido virar 'complete'.
     status:b.status==='building'?'building':'complete',
     startedAt:Number.isSafeInteger(b.startedAt)?b.startedAt:null,
     endsAt:Number.isSafeInteger(b.endsAt)?b.endsAt:null,
     durationMs:Number.isSafeInteger(b.durationMs)?b.durationMs:null
    }))
  })),
  marches:[...world.guilds.values()].filter(g=>g.march&&g.base).map(g=>({name:g.name,targetName:world.guilds.get(g.march.target)?.name||'',from:g.march.from,to:g.march.to,kind:g.march.kind||'attack',startedAt:g.march.startedAt,arrivesAt:g.march.arrivesAt,route:g.march.route||null,units:troopCount(g.march.units)})),
  unitTypes:UNITS,trainingCosts:MILITARY_SUPPLIES,baseCost:BASE_COST,relocateCost:RELOCATE_COST,maxTroops:militaryCapacity(your?.guild?.base?.level),absoluteMaxTroops:MAX_TROOPS,
   upkeepCycleMs:UPKEEP_CYCLE_MS,surrenderThreshold:SURRENDER_THRESHOLD,activeTruceMs:SURRENDER_TRUCE_MS};
}
function response(world,p,text,notify=true){
 if(notify)world.tell(p,text);
 world.send(p.socket,{type:'kingdomState',data:publicState(world,p)});
}
function action(world,p,d,{walkable,portals=[],npcs=[],now=Date.now()}={}){
 const op=typeof d.action==='string'?d.action:'';
 // O pedido possui um identificador somente quando veio da interface da capital 3D.
 // Resultados são enviados individualmente ao jogador; nunca são difundidos para outras guildas.
 const requestId=Number.isSafeInteger(d.requestId)&&d.requestId>=1&&d.requestId<=2147483647?d.requestId:null;
 // Uma chave aleatória por ação persiste nas tentativas de retransmissão da mesma operação.
 // A guilda guarda recibos de sucesso (incluídos no snapshot persistido da conta).
 const opKey=typeof d.opKey==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(d.opKey)?d.opKey:null;
 const replayable=['construct','buildingUpgrade','collect','train','escort','recall','fortify','siege','upgrade','surrender','surrenderVote','allyOffer','allyAccept','allyBreak'].includes(op);
 // "type" identifica o pacote WebSocket (kingdom); buildingType é o edifício.
 // Aceitar d.type legado permite que testes/chamadas diretas continuem válidos.
 const buildingType=typeof d.buildingType==='string'?d.buildingType:d.type;
 const operationParams=op==='construct'?JSON.stringify([buildingType,d.x,d.y]):
  op==='buildingUpgrade'?JSON.stringify([d.x,d.y]):
  op==='train'||op==='escort'?JSON.stringify([d.unit,d.count]):
   ['siege','surrender','surrenderVote','allyOffer','allyAccept','allyBreak'].includes(op)?JSON.stringify([d.target]):'[]';
 const owner=guildFor(world,p);
 const {guild:g,key} = owner||{};
 const canManage=Boolean(p.isAccount&&g?.base&&Array.isArray(g.members)&&g.members.includes(p.uid));
 const receipt=()=>opKey&&g&&Array.isArray(g.recentCityActions)?
  g.recentCityActions.find(entry=>entry?.key===opKey):null;
 const confirmSaved=(promise,id=requestId)=>{
  if(id===null||!opKey||!promise||typeof promise.then!=='function')return;
  void Promise.resolve(promise).then(saved=>{
   world.send(p.socket,{type:'kingdomDurable',id,opKey,ok:saved===true,
    ...(saved===true?{}:{message:'O banco ainda não confirmou a gravação. O servidor continuará tentando salvar.'})});
  }).catch(err=>{
   console.error('[reinos] confirmação de persistência adiada:',err.message);
   world.send(p.socket,{type:'kingdomDurable',id,opKey,ok:false,
    message:'Não foi possível confirmar o salvamento agora. A tentativa permanece pendente.'});
  });
 };
 const report=(message,ok)=>{
  // Registra operações confirmadas antes do ACK. É persistido com a guilda
  // e protege também contra cobrança duplicada após reconexão/redeploy.
  if(ok&&opKey&&replayable&&g){
   const receipts=Array.isArray(g.recentCityActions)?g.recentCityActions:[];
   receipts.push({key:opKey,uid:p.uid,action:op,params:operationParams,ok:true,message});
   g.recentCityActions=receipts.slice(-CITY_RECEIPTS_LIMIT);
   world.dirty=true;
  }
  // Persistir ANTES de avisar ao navegador que a operação foi aceita.
  // A fila assíncrona PostgreSQL continua gravando mesmo que a aba feche.
  // A confirmação de durabilidade é enviada separadamente após flush().
  let durable=null;
  if(ok&&replayable)durable=world.persist();
  if(requestId!==null)world.send(p.socket,{type:'kingdomActionResult',id:requestId,action:op,opKey,ok,message});
  if(ok&&replayable)confirmSaved(durable);
  // A capital mostra a mensagem no próprio diário; nenhum alert bloqueante.
  response(world,p,message,requestId===null);
  // Refrescar os dados compartilhados também para os demais integrantes conectados.
  if(ok&&g)for(const member of world.players.values()){
   if(member!==p&&g.members?.includes(member.uid))
    world.send(member.socket,{type:'kingdomState',data:publicState(world,member)});
  }
 };
 const reject=message=>report(message,false);
 const accept=message=>report(message,true);
 if(op==='inspect'){
  // Garantia adicional caso a notificação de fim de obra se perca ou o
  // jogador tenha entrado numa sala secundária depois do prazo.
  // A operação é idempotente e salva qualquer conclusão atrasada.
  resolveCityConstructions(world,now);
  if(requestId!==null&&opKey){
   const existing=receipt();
   if(existing&&existing.uid===p.uid){
    world.send(p.socket,{type:'kingdomActionResult',id:requestId,action:existing.action,opKey,ok:existing.ok,message:existing.message});
    if(existing.ok)confirmSaved(world.persist());
   }
  }
  response(world,p,'',false);return false
 }
 if(!owner){reject('Entre em uma guilda para fundar ou defender um reino.');return false}
 if(!p.isAccount){reject('Reinos e exércitos exigem uma conta cadastrada para proteger o progresso.');return false}
 if(replayable&&opKey){
  const prev=receipt();
  if(prev){
   if(prev.uid!==p.uid||prev.action!==op||prev.params!==operationParams){reject('Operação duplicada com parâmetros diferentes.');return false}
   // Replay já processado: devolve recibo sem repetir gasto nem criar edifício.
   world.send(p.socket,{type:'kingdomActionResult',id:requestId,action:op,opKey,ok:true,message:prev.message});
   confirmSaved(world.persist());
   response(world,p,'',false);
   return true;
  }
 }
 if(op==='place'){
  if(!p.isAccount){response(world,p,'Para fundar uma fortaleza permanente, faça login em uma conta cadastrada.');return false}
  if(g.leader!==p.uid){response(world,p,'Somente o líder da guilda pode escolher o local da base.');return false}
  if(!Number.isInteger(p.zone)||p.zone<0||p.zone>=BUILDABLE_REGIONS){
   response(world,p,'Não é possível construir reinos em masmorras ou subsolos.');return false
  }
  const x=d.x,y=d.y;
  if(!integer(x)||!integer(y)||x<90||x>1446||y<100||y>924||Math.hypot(x-p.x,y-p.y)>110||
   typeof walkable!=='function'||!walkable(p.zone,x,y)){
   response(world,p,'Escolha um solo livre a até 110 passos do personagem, longe dos limites do mapa.');return false
  }
  if(portals.some(t=>Math.hypot(t.x-x,t.y-y)<155)){
   response(world,p,'Sua fortaleza precisa ficar distante dos portais de passagem.');return false
  }
  if(npcs.some(n=>Math.hypot(n.x-x,n.y-y)<110)){
   response(world,p,'Construa longe de personagens e missões para não bloquear a passagem.');return false
  }
  if(forts(world).some(b=>b.key!==key&&b.zone===p.zone&&Math.hypot(b.x-x,b.y-y)<180)){
   response(world,p,'Outra guilda já controla as proximidades. Construa a pelo menos 180 passos.');return false
  }
  const old=g.base,fee=old?RELOCATE_COST:BASE_COST;
  if(old&&now-(g.lastRelocateAt||0)<RELOCATE_COOLDOWN){
   response(world,p,'A transferência da capital só pode ocorrer uma vez a cada 24 horas.');return false
  }
  if(p.save.coins<fee){response(world,p,'Moedas insuficientes para erguer ou mover a capital ('+fee+').');return false}
  p.save.coins-=fee;
  g.base={zone:p.zone,x,y,level:1,builtAt:now};
  g.army=armyCopy(g.army);g.influence=g.influence||{};
  if(old&&old.zone!==p.zone)delete g.influence[old.zone];
  g.influence[p.zone]=Math.max(1,Number(g.influence[p.zone])||1);
  g.lastRelocateAt=now;
  world.dirty=true;
  world.persist(); // Localização de capital é permanente: gravar sem esperar autosave.
  response(world,p,old?'Capital da guilda transferida para esta região.':'Fortaleza fundada! Seu reino já aparece no mapa.');
  world.send(p.socket,world.ownStatus(p));
  return true;
 }
 if(op==='construct'){
  if(!canManage){reject('Somente integrantes cadastrados da guilda podem construir em sua fortaleza.');return false}
  const {x,y}=d,type=buildingType,cost=Object.hasOwn(CITY_BUILDINGS,type)?CITY_BUILDINGS[type]:null;
  if(!cost||!integer(x)||!integer(y)||!// Chamadas legadas internas usam d.type; pacotes WebSocket reais sempre
   // chegam com d.type='kingdom' e buildingType explícito, sem contornar desbloqueios.
   cityLayout.canPlace(Array.isArray(g.city?.buildings)?g.city.buildings:[],type,x,y,
    typeof d.buildingType==='string'?g.base.level:5)){
   reject('Terreno ou edifício inválido.');return false
  }
  const buildings=Array.isArray(g.city?.buildings)?g.city.buildings:[];
  if(buildings.length>=buildingSlots(g.base.level)){
   reject('Este terreno já está ocupado ou a cidade atingiu seu limite.');return false
  }
  if(p.save.coins<cost){reject('Moedas insuficientes para construir ('+cost+').');return false}
  p.save.coins-=cost;
  const city=g.city||{buildings:[],stock:stockCopy({}),lastCollectedAt:now};
  const durationMs=CITY_BUILD_MS[type];
  city.buildings=[...buildings,{
   ...cityLayout.plan(type,x,y),level:1,
   status:'building',startedAt:now,endsAt:now+durationMs,durationMs
  }];
  if(!Number.isSafeInteger(city.lastCollectedAt)||city.lastCollectedAt<=0)city.lastCollectedAt=now;
  g.city=city;
  world.dirty=true;accept('Obra iniciada em '+g.name+'. Aguardando gravação no banco. Conclusão em '+Math.ceil(durationMs/1000)+' segundos.');
  world.send(p.socket,world.ownStatus(p));return true;
 }
 if(op==='collect'){
  if(!canManage||!g.city||!Array.isArray(g.city.buildings)||!g.city.buildings.length){
   reject('Seu reino ainda não tem edifícios. Inicie uma obra para começar.');return false
  }
  if(!g.city.buildings.some(b=>Object.values(CITY_YIELDS[b.type]||{}).some(y=>y>0)&&isComplete(b,now))){
   reject('As obras produtivas ainda estão em andamento. Veja o tempo restante no terreno.');return false
  }
  if(!g.city.lastCollectedAt){g.city.lastCollectedAt=now;world.dirty=true;accept('Relógios individuais de produção iniciados. Consulte os prazos de cada edifício.');return true}
  const collected=collectCity(g,now);
  if(!collected){reject('Nenhum edifício concluiu seu ciclo. Consulte o tempo de cada produção.');return false}
  world.dirty=true;
  accept('Recursos de '+collected.readyBuildings+' edifício(s): '+Object.entries(collected.yielded).map(([id,v])=>id+' '+v).join(' · '));
  return true;
 }
 if(op==='buildingUpgrade'){
  if(!canManage||!g.city){reject('Somente integrantes da guilda podem melhorar os edifícios.');return false}
  const {x,y}=d;
  if(!integer(x)||!integer(y)){reject('Edifício inválido.');return false}
  const b=cityLayout.at(g.city.buildings,x,y);
  if(!b||!Object.hasOwn(CITY_BUILDINGS,b.type)){reject('Edifício inexistente.');return false}
  if(!isComplete(b,now)){reject('Aguarde a conclusão da obra para melhorar este edifício.');return false}
  const level=buildingLevel(b.level);
  if(level>=BUILDING_MAX_LEVEL){reject('Este edifício já está no nível máximo '+BUILDING_MAX_LEVEL+'.');return false}
  const stock=stockCopy(g.city.stock),fee={food:level*8,timber:level*6,stone:level*3};
  if(Object.entries(fee).some(([id,cost])=>stock[id]<cost)){
   reject('Materiais insuficientes para ampliar este edifício.');return false
  }
  for(const [id,cost] of Object.entries(fee))stock[id]-=cost;
  g.city.stock=stock;b.level=level+1;world.dirty=true;
  accept('Edifício aprimorado para nível '+b.level+'. A produção será mais rápida e renderá mais recursos.');return true;
 }
 if(op==='upgrade'){
  if(!canManage){reject('Somente integrantes da guilda podem evoluir a fortaleza.');return false}
  if(p.zone!==g.base.zone||Math.hypot(p.x-g.base.x,p.y-g.base.y)>180){
   response(world,p,'Visite a sua fortaleza para melhorar as defesas.');return false}
  const level=Math.max(1,Math.floor(Number(g.base.level)||1));
  if(level>=FORTRESS_MAX_LEVEL){response(world,p,'Sua fortaleza já alcançou o nível máximo '+FORTRESS_MAX_LEVEL+'.');return false}
  const cost=(level+1)*500;
  if(p.save.coins<cost){response(world,p,'Moedas insuficientes para ampliar a fortaleza ('+cost+').');return false}
  p.save.coins-=cost;g.base.level=level+1;
  g.influence=g.influence||{};
  g.influence[g.base.zone]=Math.min(1000,Math.max(0,Number(g.influence[g.base.zone])||0)+1);
  world.dirty=true;accept('Capital ampliada! Nível '+g.base.level+' · capacidade militar '+militaryCapacity(g.base.level)+' soldados · estoque '+stockCapacity(g.base.level)+' por recurso · '+buildingSlots(g.base.level)+' edifícios.');
  world.send(p.socket,world.ownStatus(p));return true;
 }
 // Recrutamento por moedas foi abolido. Clientes em cache não podem
 // contornar a economia de recursos ou criar tropas sem quartel.
 if(op==='recruit'){
  reject('Compra de soldados com moedas desativada. Treine tropas no quartel usando os recursos da guilda.');
  return false;
 }
 if(op==='train'){
  if(!canManage||!g.city||!Array.isArray(g.city.buildings)){
   reject('Construa uma cidade e um quartel para treinar tropas com materiais.');return false
  }
  if(!g.city.buildings.some(b=>b.type==='barracks'&&isComplete(b,now))){
   reject('É necessário construir um quartel para treinar soldados.');return false
  }
  if(p.zone!==g.base.zone||Math.hypot(p.x-g.base.x,p.y-g.base.y)>180){
   reject('Aproxime-se da sua fortaleza para treinar tropas.');return false
  }
  const unit=d.unit,count=d.count;
  if(!Object.hasOwn(MILITARY_SUPPLIES,unit)||!integer(count)||count<1||count>40){
   reject('Escolha de 1 a 40 unidades militares válidas.');return false
  }
  const troops=armyCopy(g.army);
  if(fullArmyCount(g)+count>militaryCapacity(g.base.level)){
   reject('Limite de '+militaryCapacity(g.base.level)+' soldados atingido. Amplie sua fortaleza para aumentar a capacidade militar.');return false
  }
  const cost=MILITARY_SUPPLIES[unit],stock=stockCopy(g.city.stock);
  if(Object.entries(cost).some(([id,fee])=>stock[id]<fee*count)){
   reject('Alimentos, madeira ou pedra insuficientes para treinar este exército.');return false
  }
  for(const [id,fee] of Object.entries(cost))stock[id]-=fee*count;
  g.city.stock=stock;troops[unit]+=count;g.army=troops;world.dirty=true;
  accept(count+' unidades de '+UNITS[unit].name.toLowerCase()+' treinadas com recursos da cidade.');
  return true;
 }

 if(op==='fortify'){
  if(!canManage||!g.city){reject('Somente integrantes da guilda podem reforçar as defesas da capital.');return false}
  const current=Math.max(0,Math.min(FORTRESS_MAX_LEVEL,Math.floor(Number(g.base.defenseLevel)||0)));
  if(current>=g.base.level){reject('As muralhas já estão no limite deste nível da fortaleza.');return false}
  const stock=stockCopy(g.city.stock),timber=(current+1)*10,stone=(current+1)*16;
  if(stock.timber<timber||stock.stone<stone){reject('Necessários '+timber+' madeiras e '+stone+' pedras para reforçar as muralhas.');return false}
  stock.timber-=timber;stock.stone-=stone;
  g.city.stock=stock;g.base.defenseLevel=current+1;world.dirty=true;
  accept('Muralhas reforçadas ao nível '+g.base.defenseLevel+' · bônus defensivo de '+(g.base.defenseLevel*12)+' pontos.');
  return true;
 }
 if(op==='escort'){
  if(!g.base){reject('É necessário possuir uma fortaleza para requisitar tropas.');return false}
  if(!Object.hasOwn(UNITS,d.unit)||!integer(d.count)||d.count<1||d.count>40){
   reject('Requisite de 1 a 40 unidades válidas por vez.');return false
  }
  const army=armyCopy(g.army),deployed=escortOf(g,p.uid);
  if(army[d.unit]<d.count){reject('Não há soldados suficientes desse tipo no estoque da guilda.');return false}
  if(troopCount(deployed)+d.count>ESCORT_LIMIT){
   reject('Sua escolta comporta no máximo '+ESCORT_LIMIT+' unidades.');return false
  }
  army[d.unit]-=d.count;deployed[d.unit]+=d.count;
  g.army=army;g.escorts={...(g.escorts||{}),[p.uid]:deployed};world.dirty=true;
  accept(d.count+' '+UNITS[d.unit].name.toLowerCase()+' mobilizados imediatamente. As tropas seguem seu personagem e atacam seus alvos.');
  return true;
 }
 if(op==='recall'){
  const deployed=escortOf(g,p.uid);
  if(!troopCount(deployed)){reject('Você não possui uma escolta mobilizada.');return false}
  const army=armyCopy(g.army);
  for(const unit of Object.keys(UNITS))army[unit]+=deployed[unit];
  g.army=army;
  g.escorts={...(g.escorts||{})};delete g.escorts[p.uid];
  world.dirty=true;accept('Sua escolta voltou instantaneamente à guarnição da guilda.');
  return true;
 }
 if(op==='allyOffer'){
  if(g.leader!==p.uid){reject('Somente o líder pode propor uma aliança diplomática.');return false}
  const otherKey=String(d.target||'').toLocaleLowerCase('pt-BR');
  const other=world.guilds.get(otherKey);
  if(!other?.base||otherKey===key){reject('Selecione outra guilda com fortaleza.');return false}
  if(isAlly(g,otherKey)){reject('Os dois reinos já são aliados.');return false}
  if((g.allies||[]).length>=ALLIANCE_LIMIT||(other.allies||[]).length>=ALLIANCE_LIMIT){
   reject('Cada guilda pode manter até '+ALLIANCE_LIMIT+' alianças.');return false
  }
  other.allianceOffers=[...(other.allianceOffers||[]).filter(k=>k!==key),key].slice(-10);
  world.dirty=true;accept('Proposta de aliança enviada a '+other.name+'. O líder rival precisa aprovar.');
  for(const member of world.players.values())if(other.members?.includes(member.uid))
   world.send(member.socket,{type:'kingdomState',data:publicState(world,member)});
  for(const member of world.players.values())if(member.uid===other.leader)
   world.tell(member,'☮ Proposta de aliança recebida de '+g.name+'. Abra Social para responder.');
  return true;
 }
 if(op==='allyAccept'){
  if(g.leader!==p.uid){reject('Somente o líder pode aceitar alianças em nome da guilda.');return false}
  const otherKey=String(d.target||'').toLocaleLowerCase('pt-BR'),other=world.guilds.get(otherKey);
  if(!other?.base||otherKey===key||!(g.allianceOffers||[]).includes(otherKey)){
   reject('Não existe proposta de aliança válida desse reino.');return false
  }
  if((g.allies||[]).length>=ALLIANCE_LIMIT||(other.allies||[]).length>=ALLIANCE_LIMIT){
   reject('O limite de alianças foi atingido.');return false
  }
  if(g.siegeCrisis?.attacker===otherKey||other.siegeCrisis?.attacker===key){
   reject('Resolva primeiro o conflito militar antes de firmar aliança.');return false
  }
  g.allies=[...new Set([...(g.allies||[]),otherKey])];
  other.allies=[...new Set([...(other.allies||[]),key])];
  g.allianceOffers=(g.allianceOffers||[]).filter(k=>k!==otherKey);
  world.dirty=true;accept('Aliança diplomática firmada com '+other.name+'! Escoltas aliadas podem participar de cercos conjuntos.');
  for(const member of world.players.values())if(other.members?.includes(member.uid))
   world.send(member.socket,{type:'kingdomState',data:publicState(world,member)});
  for(const member of world.players.values())if(other.members?.includes(member.uid))
   world.tell(member,'☮ Aliança firmada entre '+g.name+' e '+other.name+'.');
  return true;
 }
 if(op==='allyBreak'){
  if(g.leader!==p.uid){reject('Somente o líder pode encerrar alianças.');return false}
  const otherKey=String(d.target||'').toLocaleLowerCase('pt-BR'),other=world.guilds.get(otherKey);
  if(!other||!isAlly(g,otherKey)){reject('A guilda indicada não é sua aliada.');return false}
  g.allies=(g.allies||[]).filter(k=>k!==otherKey);
  other.allies=(other.allies||[]).filter(k=>k!==key);
  world.dirty=true;accept('Aliança com '+other.name+' encerrada.');
  return true;
 }
 if(op==='surrender'||op==='surrenderVote'){
  const crisis=g.siegeCrisis,other=world.guilds.get(crisis?.attacker);
  if(!crisis||crisis.pressure<SURRENDER_THRESHOLD||!other||now-Number(crisis.updatedAt||0)>24*60*60*1000){
   reject('A rendição só está disponível quando a fortaleza estiver sob ameaça crítica recente.');return false
  }
  if(activeTruce(g,now)){reject('Já existe um tratado de cessar-fogo em vigor.');return false}
  // Mesmo após a queda das muralhas, a rendição nunca é imposta pelo invasor.
  // O líder decide diretamente; os demais podem aprovar por maioria absoluta.
  if(op==='surrender'&&g.leader!==p.uid){
   reject('Para declarar a rendição direta, o líder da guilda deve confirmar. Você pode votar pela rendição.');return false
  }
  if(op==='surrenderVote'){
   crisis.votes=crisis.votes||{};
   if(crisis.votes[p.uid]){reject('Você já votou nesta proposta de rendição.');return false}
   crisis.votes[p.uid]=true;
   const votes=Object.keys(crisis.votes).filter(uid=>g.members.includes(uid)).length;
   const needed=Math.floor(g.members.length/2)+1;
   if(votes<needed){
    world.dirty=true;accept('Voto registrado ('+votes+'/'+needed+'). A guilda continua lutando até a maioria decidir.');
    return true;
   }
  }
  const agreement=completeSurrender(world,key,now);
  if(!agreement){reject('A proposta de rendição expirou ou não está mais válida.');return false}
  const message='☮ '+agreement.loser+' aceitou rendição diante de '+agreement.winner+
   '. Influência territorial transferida, tributo '+agreement.tribute+
   ' moedas do tesouro e cessar-fogo por 30 minutos. Edifícios preservados.';
  accept(message);
  for(const member of world.players.values())
   if(member.save.guild===other.name)world.tell(member,message);
  return true;
 }
 if(op==='siege'){
  if(!g.base){reject('Você precisa de uma fortaleza para participar de um cerco.');return false}
  if(g.nextRaidAt>now){reject('Sua guilda ainda está se reorganizando para outro cerco.');return false}
  const enemyKey=String(d.target||'').toLocaleLowerCase('pt-BR');
  const defender=world.guilds.get(enemyKey);
  if(!defender?.base||enemyKey===key){reject('Escolha uma fortaleza rival válida.');return false}
  if(isAlly(g,enemyKey)||isAlly(defender,key)){
   reject('É proibido atacar reinos aliados. Encerre a aliança primeiro.');return false
  }
  if(activeTruce(defender,now)||activeTruce(g,now)&&g.truce.with===enemyKey){
   reject('Esta fortaleza está protegida por um tratado de cessar-fogo.');return false
  }
  if(!nearestFortress(p,defender.base,170)){
   reject('O comandante deve se aproximar até 170 passos da fortaleza rival.');return false
  }
  const participants=[];
  const included=new Set();
  // Só jogadores realmente presentes na mesma sala/região contribuem.
  // Uma escolta de outra sala ou desconectada nunca ataca à distância.
  for(const member of [p,...world.players.values()]){
   if(included.has(member.uid)||!member.isAccount||!nearestFortress(member,defender.base,200))continue;
   const troopOwner=guildFor(world,member);
   if(!troopOwner)continue;
   const ally=troopOwner.key!==key&&isAlly(g,troopOwner.key)&&isAlly(troopOwner.guild,key);
   if(troopOwner.key!==key&&!ally)continue;
   if(ally&&troopOwner.guild.nextRaidAt>now)continue;
   const escort=escortOf(troopOwner.guild,member.uid);
   if(!troopCount(escort))continue;
   included.add(member.uid);
   participants.push({member,guild:troopOwner.guild,key:troopOwner.key,escort,
    attack:power(escort)+12*escort.siege+Math.max(5,Math.min(100,Number(member.save.level)||1)*2)});
  }
  // O jogador que inicia o ataque deve ao menos levar uma unidade própria.
  if(!participants.some(v=>v.member.uid===p.uid)){
   reject('Mobilize sua própria escolta antes de coordenar um cerco.');return false
  }
  const totalUnits=participants.reduce((n,v)=>n+troopCount(v.escort),0);
  if(totalUnits<5){reject('Reúna ao menos cinco soldados nas escoltas próximas.');return false}
  const defense=fortressDefense(defender,now);
  const formationBonus=1+Math.min(.18,Math.max(0,participants.length-1)*.03);
  const attackPower=Math.round(participants.reduce((n,v)=>n+v.attack,0)*formationBonus);
  const won=attackPower>defense.defense;
  let survivors=0;
  const alliedNames=new Set();
  const contribution=new Map();
  for(const part of participants){
   const remaining=armyCopy({});
   for(const unit of Object.keys(UNITS)){
    remaining[unit]=Math.floor(part.escort[unit]*(won?.78:.48));
   }
   survivors+=troopCount(remaining);
   part.guild.escorts={...(part.guild.escorts||{}),[part.member.uid]:remaining};
   contribution.set(part.key,(contribution.get(part.key)||0)+part.attack);
   if(part.key!==key)alliedNames.add(part.guild.name);
  }
  const defenders=armyCopy(defender.army);
  for(const unit of Object.keys(UNITS))
   defenders[unit]=Math.floor(defenders[unit]*(won?.78:.93));
  defender.army=defenders;
  const region=defender.base.zone;
  g.influence=g.influence||{};defender.influence=defender.influence||{};
  if(won){
   g.influence[region]=Math.min(1000,(Number(g.influence[region])||0)+12);
   defender.influence[region]=Math.max(0,(Number(defender.influence[region])||0)-8);
   for(const [allyKey,value] of contribution){
    if(allyKey===key)continue;
    const allyGuild=world.guilds.get(allyKey);
    if(!allyGuild)continue;
    allyGuild.influence=allyGuild.influence||{};
    allyGuild.influence[region]=Math.min(1000,
     (Number(allyGuild.influence[region])||0)+Math.max(1,Math.round(5*value/Math.max(1,attackPower))));
   }
   // A pressão cresce por cerco vitorioso e só abre a rendição após
   // múltiplas vitórias. Revezar agressores não acumula pressão entre rivais.
   const old=defender.siegeCrisis;
   const pressure=old?.attacker===key&&now-Number(old.updatedAt||0)<24*60*60*1000?old.pressure:0;
   defender.siegeCrisis={attacker:key,attackerName:g.name,region,
    pressure:Math.min(100,pressure+32),updatedAt:now,
    votes:old?.attacker===key?old.votes||{}:{}};
  }else{
   defender.influence[region]=Math.min(1000,(Number(defender.influence[region])||0)+2);
   if(defender.siegeCrisis?.attacker===key)
    defender.siegeCrisis={...defender.siegeCrisis,pressure:Math.max(0,defender.siegeCrisis.pressure-12),
     updatedAt:now,votes:{}};
  }
  g.nextRaidAt=now+SIEGE_COOLDOWN;
  for(const allyKey of contribution.keys())if(allyKey!==key){
   const ally=world.guilds.get(allyKey);if(ally)ally.nextRaidAt=now+SIEGE_COOLDOWN;
  }
  world.dirty=true;
  const details=(won?'Vitória':'Derrota')+' no cerco a '+defender.name+
   ' · '+participants.length+' comandante(s), '+totalUnits+' soldados'+
   (alliedNames.size?' · aliados: '+[...alliedNames].join(', '):'')+
   ' · ataque '+attackPower+' / defesa '+defense.defense+
   ' · '+survivors+' sobreviventes.';
  accept(details);
  if(won&&defender.siegeCrisis?.pressure>=SURRENDER_THRESHOLD)
   for(const member of world.players.values())if(member.save.guild===defender.name)
    world.tell(member,'☮ Sua capital atingiu '+defender.siegeCrisis.pressure+
     '% de pressão. O líder pode render-se ou os integrantes podem votar. A decisão preserva os edifícios.');
  for(const member of world.players.values()){
   if(member.save.guild===defender.name)world.tell(member,'⚔ Sua capital sofreu um cerco! '+details);
   else if(member.uid!==p.uid&&contribution.has(member.save.guild?.toLocaleLowerCase('pt-BR')))
    world.send(member.socket,{type:'kingdomState',data:publicState(world,member)});
  }
  return true;
 }
 if(op==='patrol'){
  if(!canManage){reject('Somente integrantes da guilda podem mobilizar patrulhas.');return false}
  if(g.march){response(world,p,'Já existe um exército mobilizado.');return false}
  const destination=d.zone;
  if(!integer(destination)||destination<0||destination>=BUILDABLE_REGIONS){
   response(world,p,'Patrulhas só podem visitar as 12 regiões de superfície.');return false
  }
  const units=armyCopy(g.army);
  if(troopCount(units)<1){response(world,p,'Treine tropas no quartel antes de enviar uma patrulha.');return false}
  const route=marchRoute(world,g.base,{zone:destination,x:768,y:512});
  if(!route){response(world,p,'Não existe rota terrestre até essa região.');return false}
  g.army=armyCopy({});
  g.march={kind:'patrol',target:null,from:g.base.zone,to:destination,route,units,
   startedAt:now,arrivesAt:now+MARCH_DURATION};
  world.dirty=true;response(world,p,'Patrulha enviada! As tropas caminharão pelos portais do continente e depois retornarão.');
  return true;
 }
 if(op==='attack'){
  if(!canManage){reject('Somente integrantes da guilda podem declarar campanhas militares.');return false}
  if(!g.base||p.zone!==g.base.zone||Math.hypot(p.x-g.base.x,p.y-g.base.y)>180){
   response(world,p,'Declare campanhas perto da sua capital.');return false}
  if(g.march){response(world,p,'Seu exército já está em marcha.');return false}
  if((g.nextRaidAt||0)>now){response(world,p,'Seu reino precisa se reorganizar antes de atacar novamente.');return false}
  const defender=forts(world).find(b=>b.key===d.target);
  if(!defender||defender.key===key){response(world,p,'Selecione a fortaleza de uma guilda rival.');return false}
  const attacking=armyCopy(g.army);
  if(troopCount(attacking)<5){response(world,p,'Treine pelo menos 5 soldados no quartel antes da campanha.');return false}
  const route=marchRoute(world,g.base,defender);
  if(!route){response(world,p,'Não existe uma passagem terrestre válida até esse reino.');return false}
  // Reservar tropas na partida impede lançar vários ataques com o mesmo exército.
  g.army=armyCopy({});
  g.march={target:defender.key,from:g.base.zone,to:defender.zone,units:attacking,
   startedAt:now,arrivesAt:now+MARCH_DURATION,route};
  g.nextRaidAt=now+RAID_COOLDOWN;
  world.dirty=true;
  response(world,p,'Exército em marcha para '+defender.name+'! O confronto ocorrerá em 45 segundos.');
  return true;
 }
 response(world,p,'Ação política desconhecida.');
 return false;
}
function resolveCityConstructions(world,now=Date.now()){
 const completed=[];
 for(const g of world.guilds.values()){
  if(!g?.city||!Array.isArray(g.city.buildings))continue;
  let changed=false;
  for(const b of g.city.buildings){
   // Legado sem endsAt já está concluído. Finalização é idempotente.
   if(!b||b.status!=='building'||(Number.isSafeInteger(b.endsAt)&&now<b.endsAt))continue;
   // Dados antigos sem prazo válido não podem ficar presos em 00:00.
   b.status='complete';b.completedAt=Number.isSafeInteger(b.endsAt)?b.endsAt:now;
   completed.push({guild:g.name,type:b.type,x:b.x,y:b.y});
   changed=true;
  }
  if(changed)world.dirty=true;
 }
 if(completed.length)world.persist();
 return completed;
}
function resolve(world,now=Date.now()){
 const finished=[];
 for(const c of resolveCityConstructions(world,now))
  finished.push({guild:c.guild,kind:'construction',text:'Obra concluída: '+c.type+' ('+(c.x+1)+','+(c.y+1)+').'});

 for(const [key,g] of [...world.guilds]){
  const oldUpkeep=g.upkeepAt;
  const upkeep=applyArmyUpkeep(g,now);
  if(g.upkeepAt!==oldUpkeep)world.dirty=true;
  if(upkeep?.losses)finished.push({guild:g.name,kind:'upkeep',
   text:'Provisões insuficientes: '+upkeep.foodUsed+'/'+upkeep.foodNeeded+
    ' alimentos. '+upkeep.losses+' soldados desertaram. Abasteça a capital.'});
  if(g.truce?.until<=now){delete g.truce;world.dirty=true;}
  if(g.siegeCrisis&&now-g.siegeCrisis.updatedAt>24*60*60*1000){
   delete g.siegeCrisis;world.dirty=true;
  }
  if(!g.march||g.march.arrivesAt>now)continue;
  const march=g.march;delete g.march;
  if(march.kind==='patrol'){
   if(!march.returning){
    const reverse=Array.isArray(march.route)?[...march.route].reverse():null;
    g.march={...march,route:reverse,from:march.to,to:march.from,returning:true,
     startedAt:now,arrivesAt:now+MARCH_DURATION};
    world.dirty=true;
    finished.push({guild:g.name,text:'Sua patrulha concluiu o reconhecimento e está retornando.'});
    continue;
   }
   const restored=armyCopy(g.army);
   for(const type of Object.keys(UNITS))restored[type]=Math.min(MAX_TROOPS,restored[type]+armyCopy(march.units)[type]);
   g.army=restored;world.dirty=true;
   finished.push({guild:g.name,text:'Sua patrulha retornou à fortaleza com todas as tropas.'});
   continue;
  }
  const enemy=world.guilds.get(march.target);
  let text;
  if(!enemy?.base||g.members?.length===0||activeTruce(enemy,now)||isAlly(g,march.target)){
   const troops=armyCopy(g.army),returning=armyCopy(march.units);
   for(const unit of Object.keys(UNITS))troops[unit]=Math.min(MAX_TROOPS,troops[unit]+returning[unit]);
   g.army=troops;text='A campanha terminou sem confronto: a fortaleza rival não está mais disponível.';
  }else{
   const attackers=power(march.units)+march.units.siege*SIEGE_BONUS_PER_ENGINE;
   const defenders=fortressDefense(enemy,now).defense;
   const won=attackers>defenders;
   const lossRatio=won?.35:.7,remaining=armyCopy(g.army);
   for(const type of Object.keys(UNITS))
    remaining[type]=Math.min(MAX_TROOPS,remaining[type]+Math.floor(march.units[type]*(1-lossRatio)));
   g.army=remaining;
   enemy.army=armyCopy(enemy.army);
   // Defensores também sofrem perdas verificáveis (sem destruir a base).
   for(const type of Object.keys(UNITS))
    enemy.army[type]=Math.floor(enemy.army[type]*(won?.58:.85));
   g.influence=g.influence||{};enemy.influence=enemy.influence||{};
   const zone=enemy.base.zone;
   if(won){
    g.influence[zone]=Math.min(1000,Math.max(0,Number(g.influence[zone])||0)+5);
    enemy.influence[zone]=Math.max(0,(Number(enemy.influence[zone])||1)-3);
   }else enemy.influence[zone]=Math.min(1000,Math.max(1,Number(enemy.influence[zone])||1)+1);
   text=(won?'Vitória':'Derrota')+' na campanha contra '+enemy.name+
    ' · ataque '+attackers+' / defesa '+defenders+'. Tropas sobreviventes retornaram.';
  }
  finished.push({guild:g.name,text});
  world.dirty=true;
 }
 return finished;
}
module.exports={CONTINENT_REGIONS,BUILDABLE_REGIONS,BASE_COST,RELOCATE_COST,MAX_TROOPS,UNITS,
 armyCopy,troopCount,power,publicState,politicalMap,rank,marchRoute,marchPosition,collectCity,
 FORTRESS_MAX_LEVEL,BUILDING_MAX_LEVEL,CITY_PRODUCTION_MS,productionCycleMs,productionState,buildingSlots,MILITARY_SUPPLIES,CITY_BUILD_MS,stockCapacity,fortressDefense,escortOf,escortTotal,escortStrike,ESCORT_LIMIT,SIEGE_COOLDOWN,
 militaryCapacity,fullArmyCount,applyArmyUpkeep,completeSurrender,SURRENDER_THRESHOLD,SURRENDER_TRUCE_MS,UPKEEP_CYCLE_MS,
 isComplete,resolveCityConstructions,action,resolve};

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
const MAX_TROOPS=300;
const CITY_BUILDINGS=Object.freeze({house:120,farm:160,barracks:280,tower:360,market:240});
const CITY_LIMIT=60;
const UNITS=Object.freeze({
 militia:{name:'Milícia',cost:22,power:2,defense:2},
 archer:{name:'Arqueiros',cost:48,power:6,defense:3},
 knight:{name:'Cavaleiros',cost:95,power:13,defense:7},
 siege:{name:'Máquinas de cerco',cost:190,power:30,defense:5}
});
const integer=v=>typeof v==='number'&&Number.isSafeInteger(v);
const troopCount=army=>Object.values(UNITS).reduce((n,u,i)=>n+Math.max(0,Number(army?.[Object.keys(UNITS)[i]])||0),0);
const power=(army,field='power')=>Object.entries(UNITS).reduce((n,[id,unit])=>n+Math.max(0,Number(army?.[id])||0)*unit[field],0);
const armyCopy=army=>Object.fromEntries(Object.keys(UNITS).map(id=>[id,Math.min(MAX_TROOPS,Math.max(0,Math.floor(Number(army?.[id])||0)))]));
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
 const your=guildFor(world,p);
 return {continent:CONTINENT_REGIONS,buildable:BUILDABLE_REGIONS,
  zones:politicalMap(world),bases:forts(world).map(b=>({name:b.name,zone:b.zone,x:b.x,y:b.y,
   level:b.level,realm:b.name})),
  ranking:rank(world).slice(0,30),
  yourGuild:your?{name:your.guild.name,leader:your.guild.leader===p.uid,
   base:your.guild.base||null,army:armyCopy(your.guild.army),
   march:your.guild.march||null,nextRaidAt:your.guild.nextRaidAt||0,
   influence:your.guild.influence||{}}:null,
  cities:[...world.guilds.values()].filter(g=>g.base).map(g=>({name:g.name,buildings:(Array.isArray(g.city?.buildings)?g.city.buildings:[]).filter(b=>b&&CITY_BUILDINGS[b.type]&&Number.isInteger(b.x)&&Number.isInteger(b.y)).slice(0,CITY_LIMIT).map(b=>({type:b.type,x:b.x,y:b.y}))})),
  marches:[...world.guilds.values()].filter(g=>g.march&&g.base).map(g=>({name:g.name,targetName:world.guilds.get(g.march.target)?.name||'',from:g.march.from,to:g.march.to,startedAt:g.march.startedAt,arrivesAt:g.march.arrivesAt,route:g.march.route||null,units:troopCount(g.march.units)})),
  unitTypes:UNITS,baseCost:BASE_COST,relocateCost:RELOCATE_COST,maxTroops:MAX_TROOPS};
}
function response(world,p,text,notify=true){
 if(notify)world.tell(p,text);
 world.send(p.socket,{type:'kingdomState',data:publicState(world,p)});
}
function action(world,p,d,{walkable,portals=[],npcs=[],now=Date.now()}={}){
 const op=typeof d.action==='string'?d.action:'';
 if(op==='inspect'){response(world,p,'',false);return false}
 const owner=guildFor(world,p);
 if(!owner){response(world,p,'Entre em uma guilda para fundar ou defender um reino.');return false}
 const {guild:g,key}=owner;
 if(!p.isAccount){response(world,p,'Reinos e exércitos exigem uma conta cadastrada para proteger o progresso.');return false}
 if(op==='place'){
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
  response(world,p,old?'Capital da guilda transferida para esta região.':'Fortaleza fundada! Seu reino já aparece no mapa.');
  world.send(p.socket,world.ownStatus(p));
  return true;
 }
 if(op==='construct'){
  if(g.leader!==p.uid||!g.base){response(world,p,'Somente o líder de uma guilda com fortaleza pode construir.');return false}
  const {type,x,y}=d,cost=Object.hasOwn(CITY_BUILDINGS,type)?CITY_BUILDINGS[type]:null;
  if(!cost||!integer(x)||!integer(y)||x<0||x>=11||y<0||y>=11||x===5||y===5){
   response(world,p,'Terreno ou edifício inválido.');return false
  }
  const buildings=Array.isArray(g.city?.buildings)?g.city.buildings:[];
  if(buildings.length>=CITY_LIMIT||buildings.some(b=>b.x===x&&b.y===y)){
   response(world,p,'Este terreno já está ocupado ou a cidade atingiu seu limite.');return false
  }
  if(p.save.coins<cost){response(world,p,'Moedas insuficientes para construir ('+cost+').');return false}
  p.save.coins-=cost;
  g.city={buildings:[...buildings,{type,x,y}]};
  world.dirty=true;response(world,p,'Construção concluída na cidadela de '+g.name+'.');
  world.send(p.socket,world.ownStatus(p));return true;
 }
 if(op==='upgrade'){
  if(g.leader!==p.uid||!g.base){response(world,p,'Somente o líder pode ampliar as muralhas de sua capital.');return false}
  if(p.zone!==g.base.zone||Math.hypot(p.x-g.base.x,p.y-g.base.y)>180){
   response(world,p,'Visite a sua fortaleza para melhorar as defesas.');return false}
  const level=Math.max(1,Math.floor(Number(g.base.level)||1));
  if(level>=5){response(world,p,'Sua fortaleza já alcançou o nível máximo 5.');return false}
  const cost=(level+1)*500;
  if(p.save.coins<cost){response(world,p,'Moedas insuficientes para ampliar a fortaleza ('+cost+').');return false}
  p.save.coins-=cost;g.base.level=level+1;
  g.influence=g.influence||{};
  g.influence[g.base.zone]=Math.min(1000,Math.max(0,Number(g.influence[g.base.zone])||0)+1);
  world.dirty=true;response(world,p,'Muralhas ampliadas! Fortaleza de nível '+g.base.level+'.');
  world.send(p.socket,world.ownStatus(p));return true;
 }
 if(op==='recruit'){
  if(!g.base){response(world,p,'Sua guilda precisa construir uma fortaleza antes de recrutar.');return false}
  if(p.zone!==g.base.zone||Math.hypot(p.x-g.base.x,p.y-g.base.y)>180){
   response(world,p,'Aproxime-se da fortaleza da sua guilda para recrutar unidades.');return false}
  const unit=UNITS[d.unit],count=d.count;
  if(!unit||!integer(count)||count<1||count>40){
   response(world,p,'Escolha de 1 a 40 unidades por recrutamento.');return false
  }
  const troops=armyCopy(g.army),total=troopCount(troops),fee=unit.cost*count;
  if(total+count>MAX_TROOPS||p.save.coins<fee){
   response(world,p,'O exército comporta até '+MAX_TROOPS+' unidades. Verifique também suas moedas.');return false
  }
  p.save.coins-=fee;troops[d.unit]+=count;g.army=troops;world.dirty=true;
  response(world,p,count+' '+unit.name.toLowerCase()+' recrutados para o reino.');
  world.send(p.socket,world.ownStatus(p));
  return true;
 }
 if(op==='attack'){
  if(g.leader!==p.uid){response(world,p,'Somente o líder pode declarar uma campanha militar.');return false}
  if(!g.base||p.zone!==g.base.zone||Math.hypot(p.x-g.base.x,p.y-g.base.y)>180){
   response(world,p,'Declare campanhas perto da sua capital.');return false}
  if(g.march){response(world,p,'Seu exército já está em marcha.');return false}
  if((g.nextRaidAt||0)>now){response(world,p,'Seu reino precisa se reorganizar antes de atacar novamente.');return false}
  const defender=forts(world).find(b=>b.key===d.target);
  if(!defender||defender.key===key){response(world,p,'Selecione a fortaleza de uma guilda rival.');return false}
  const attacking=armyCopy(g.army);
  if(troopCount(attacking)<5){response(world,p,'Recrute pelo menos 5 soldados antes da campanha.');return false}
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
function resolve(world,now=Date.now()){
 const finished=[];
 for(const [key,g] of [...world.guilds]){
  if(!g.march||g.march.arrivesAt>now)continue;
  const march=g.march;delete g.march;
  const enemy=world.guilds.get(march.target);
  let text;
  if(!enemy?.base||g.members?.length===0){
   const troops=armyCopy(g.army),returning=armyCopy(march.units);
   for(const unit of Object.keys(UNITS))troops[unit]=Math.min(MAX_TROOPS,troops[unit]+returning[unit]);
   g.army=troops;text='A campanha terminou sem confronto: a fortaleza rival não está mais disponível.';
  }else{
   const attackers=power(march.units),defenders=power(enemy.army,'defense')+
    Math.max(35,(enemy.base.level||1)*35);
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
 armyCopy,troopCount,power,publicState,politicalMap,rank,marchRoute,marchPosition,action,resolve};

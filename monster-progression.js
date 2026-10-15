'use strict';
// Progressão de criaturas: cada vitória sobre um jogador tem consequências
// reais. O arquivo guarda apenas vitórias/experiência/adaptação por classe;
// todos os valores combatíveis são recalculados de maneira determinística.
const MAX_VICTORIES=40;
const MAX_LEVEL=100;
const ATTR_KEYS=Object.freeze(['vitalidade','fortitude','forca','agilidade','intelecto','espirito','sorte']);
const ROLES=Object.freeze(['peregrino','guardiao','arqueiro','curandeiro']);
const ROLE_ADAPT=Object.freeze({
 peregrino:{forca:1,fortitude:1},
 guardiao:{fortitude:2,vitalidade:1},
 arqueiro:{agilidade:2,sorte:1},
 curandeiro:{espirito:2,intelecto:1}
});
const cap=(n,min,max)=>Math.min(max,Math.max(min,n));
const num=n=>Number.isFinite(Number(n))?Number(n):0;
const MONSTER_ITEMS=Object.freeze([
 {id:'natural',unlock:0,name:'Arma natural',slot:'arma',effect:'Golpes naturais da espécie'},
 {id:'garras',unlock:1,name:'Garras fortalecidas',slot:'arma',effect:'Ataques se tornam mais perigosos'},
 {id:'couraça',unlock:3,name:'Couraça conquistada',slot:'armadura',effect:'Redução de dano físico'},
 {id:'amuleto',unlock:7,name:'Amuleto dos vencidos',slot:'amuleto',effect:'Resistência a magia'},
 {id:'runa',unlock:12,name:'Runa vital',slot:'runa',effect:'Mais vida e vigor'},
 {id:'coroa',unlock:20,name:'Insígnia de predador',slot:'insígnia',effect:'Ataques e defesas aperfeiçoados'}
]);
function cleanRecord(input){
 const victories=cap(Math.floor(num(input?.victories)),0,10000);
 const xp=cap(Math.floor(num(input?.xp)),0,10000000);
 const adaptations={};
 for(const key of ROLES)adaptations[key]=cap(Math.floor(num(input?.adaptations?.[key])),0,MAX_VICTORIES);
 return {victories,xp,adaptations};
}
function speciesArchetype(species,boss){
 const i=cap(Math.floor(num(species)),0,31);
 if(boss)return 'Chefe ancestral';
 if([3,8,11,15,19,22,28,30,31].includes(i))return 'Guardião';
 if([14,23,24].includes(i))return 'Elemental';
 if([1,6,10,12,16,20,26,27,29].includes(i))return 'Fera';
 return 'Criatura';
}
function speciesAttributes(species,zone,baseLevel,boss){
 const seed=species*31+zone*7;
 const level=baseLevel;
 const archetype=speciesArchetype(species,boss);
 const attributes={
  vitalidade:7+Math.floor(level*.58)+(seed%5),
  fortitude:5+Math.floor(level*.41)+(seed%7),
  forca:8+Math.floor(level*.64)+(seed%4),
  agilidade:6+Math.floor(level*.37)+(seed%6),
  intelecto:4+Math.floor(level*.36)+(seed%5),
  espirito:5+Math.floor(level*.29)+(seed%7),
  sorte:3+Math.floor(level*.21)+(seed%6)
 };
 if(archetype==='Guardião'){attributes.fortitude+=6;attributes.vitalidade+=5}
 if(archetype==='Elemental'){attributes.intelecto+=7;attributes.espirito+=7}
 if(archetype==='Fera'){attributes.agilidade+=5;attributes.forca+=4}
 if(boss){attributes.fortitude+=8;attributes.forca+=8;attributes.espirito+=5}
 return attributes;
}
function initialMonsterProfile({id,zone,species,boss,baseHp,baseDamage,xp,coins,explorationLevel},progress){
 const state=cleanRecord(progress);
 const boosted=cap(state.victories,0,MAX_VICTORIES);
 const promotion=Math.min(MAX_VICTORIES,Math.floor(state.xp/170)+Math.floor(boosted/3));
 const zoneLevel=Number.isInteger(explorationLevel)&&explorationLevel>=1?explorationLevel:
  Math.round(1+zone*.42+(zone>=12?(zone-11)*1.4:0));
 const baseLevel=cap(zoneLevel+(boss?9:0),1,MAX_LEVEL);
 const level=cap(baseLevel+promotion,1,MAX_LEVEL);
 const attributes=speciesAttributes(species,zone,level,boss);
 const adapt=state.adaptations;
 attributes.vitalidade+=boosted*2+adapt.guardiao;
 attributes.fortitude+=boosted+adapt.guardiao*2;
 attributes.forca+=boosted+adapt.peregrino;
 attributes.agilidade+=Math.floor(boosted*.7)+adapt.arqueiro*2;
 attributes.intelecto+=Math.floor(boosted*.6)+adapt.curandeiro;
 attributes.espirito+=Math.floor(boosted*.5)+adapt.curandeiro*2;
 attributes.sorte+=Math.floor(boosted*.35)+adapt.arqueiro;
 const equipment=MONSTER_ITEMS.filter(item=>boosted>=item.unlock).map(item=>({...item,
  name:item.id==='natural'?speciesArchetype(species,boss)==='Elemental'?'Essência elemental':'Instinto selvagem':item.name
 }));
 const lifeFactor=1+boosted*.065;
 const damageFactor=1+boosted*.038;
 const maxHp=Math.max(1,Math.round(baseHp*lifeFactor));
 const damage=Math.max(1,Math.round(baseDamage*damageFactor));
 const armor=cap(Math.floor(attributes.fortitude*.42)+(boosted>=3?7:0),0,150);
 const magicResist=cap(Math.floor(attributes.espirito*.32)+(boosted>=7?7:0),0,125);
 const evasion=cap(Math.round((attributes.agilidade*.065+boosted*.08)*10)/10,0,18);
 const attackHaste=cap(Math.round((boosted*.2+attributes.agilidade*.022)*10)/10,0,16);
 const rank=boosted>=20?'Lendário':boosted>=12?'Temido':boosted>=7?'Veterano':boosted>=3?'Endurecido':boosted>=1?'Desperto':boss?'Chefe':'Comum';
 const loot=[
  {id:'moedas',name:'Moedas',kind:'garantido'},
  {id:'xp',name:'Experiência',kind:'garantido'},
  {id:'pocao',name:'Poção de vida',kind:'possível'}
 ];
 if(boosted>=3)loot.push({id:'superpocao',name:'Poção radiante',kind:'possível'});
 if(boosted>=8)loot.push({id:'amuleto',name:'Amuleto da esperança',kind:'raro'});
 if(boss)loot.push({id:'reliquia',name:'Relíquia exclusiva de chefe',kind:'primeira vitória por região'});
 const nextEvolutionXp=state.xp>=170*MAX_VICTORIES?null:(Math.floor(state.xp/170)+1)*170;
 return {id,archetype:speciesArchetype(species,boss),rank,
  level,baseLevel,victories:state.victories,evolutionXp:state.xp,
  nextEvolutionXp,attributes,equipment,loot,
  maxHp,damage,armor,magicResist,evasion,attackHaste,
  adaptations:{...adapt},baseHp,baseDamage,
  evolutionCap:MAX_VICTORIES,progress:state};
}
function evolveOnVictory(monster,victim){
 const state=cleanRecord(monster.progress);
 const victimLevel=cap(Math.floor(num(victim?.level)||1),1,MAX_LEVEL);
 const role=ROLES.includes(victim?.role)?victim.role:'peregrino';
 // Todo jogador derrotado fortalece o monstro. Jogadores mais experientes
 // rendem mais aprendizado, mas há um teto de poder para manter a vitória possível.
 state.victories=Math.min(10000,state.victories+1);
 state.xp=Math.min(10000000,state.xp+40+victimLevel*5);
 state.adaptations[role]=Math.min(10000,(state.adaptations[role]||0)+1);
 const old=initialMonsterProfile(monster,monster.progress);
 const next=initialMonsterProfile(monster,state);
 monster.progress=state;
 monster.level=next.level;
 monster.rank=next.rank;
 monster.attributes=next.attributes;
 monster.equipment=next.equipment;
 monster.loot=next.loot;
 monster.armor=next.armor;
 monster.magicResist=next.magicResist;
 monster.evasion=next.evasion;
 monster.attackHaste=next.attackHaste;
 monster.maxHp=next.maxHp;monster.damage=next.damage;
 monster.hp=Math.min(next.maxHp,Math.max(1,Math.round((monster.hp/Math.max(1,old.maxHp))*next.maxHp)));
 return next;
}
function restoreMonster(monster,saved){
 const current=initialMonsterProfile(monster,saved);
 monster.progress=current.progress;
 monster.level=current.level;monster.rank=current.rank;monster.attributes=current.attributes;
 monster.equipment=current.equipment;monster.loot=current.loot;
 monster.armor=current.armor;monster.magicResist=current.magicResist;
 monster.evasion=current.evasion;monster.attackHaste=current.attackHaste;
 monster.maxHp=current.maxHp;monster.damage=current.damage;monster.hp=current.maxHp;
 return current;
}
function damageAfterMonsterDefense(raw,monster,element='physical'){
 const armor=element==='magic'?monster.magicResist||0:monster.armor||0;
 // Defesa percentual com teto; impede que monstros antigos sejam invulneráveis.
 const reduction=cap(armor/(armor+160),0,.38);
 return Math.max(1,Math.round(Math.max(1,raw)*(1-reduction)));
}
function chooseLoot(monster,roll){
 const n=cap(Math.floor(num(roll)),0,99);
 if((monster.progress?.victories||0)>=8&&n<9)return 'amuleto';
 if((monster.progress?.victories||0)>=3&&n<24)return 'superpocao';
 if(n<42)return 'pocao';
 return null;
}
function publicSheet(monster){
 return {id:monster.id,name:monster.name,species:monster.species,boss:!!monster.boss,
  zone:monster.zone,level:monster.level,rank:monster.rank,
  victories:monster.progress?.victories||0,evolutionXp:monster.progress?.xp||0,
  archetype:speciesArchetype(monster.species,monster.boss),
  attributes:{...monster.attributes},equipment:monster.equipment?.map(e=>({id:e.id,name:e.name,slot:e.slot,effect:e.effect}))||[],
  loot:monster.loot?.map(e=>({...e}))||[],adaptations:{...monster.progress?.adaptations},
  hp:monster.hp,maxHp:monster.maxHp,attack:monster.damage,armor:monster.armor,
  magicResist:monster.magicResist,evasion:monster.evasion,attackHaste:monster.attackHaste,
  evolutionCap:MAX_VICTORIES};
}
module.exports={MAX_VICTORIES,MAX_LEVEL,ATTR_KEYS,ROLES,MONSTER_ITEMS,cleanRecord,
 speciesAttributes,initialMonsterProfile,evolveOnVictory,restoreMonster,damageAfterMonsterDefense,chooseLoot,publicSheet};

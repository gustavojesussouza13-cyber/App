'use strict';
// Atributos originais de Auren: progresso determinístico por classe,
// especialização livre e cálculos autoritativos no servidor.
const ATTRIBUTE_KEYS=Object.freeze(['vitalidade','fortitude','forca','agilidade','intelecto','espirito','sorte']);
const ATTRIBUTE_LABELS=Object.freeze({
 vitalidade:'Vitalidade',fortitude:'Fortitude',forca:'Força',agilidade:'Agilidade',
 intelecto:'Intelecto',espirito:'Espírito',sorte:'Sorte'
});
const ATTRIBUTE_INFO=Object.freeze({
 vitalidade:'Aumenta PV máximos e recuperação de vida fora de combate.',
 fortitude:'Reduz dano físico e reforça a resistência a impactos.',
 forca:'Aumenta o dano físico e o poder de golpes de Guardiões e Peregrinos.',
 agilidade:'Melhora o dano de Arqueiros, precisão, esquiva, críticos e velocidade de ataque.',
 intelecto:'Amplia os feitiços, energia, precisão mágica e resistência a magia.',
 espirito:'Fortalece a cura, energia, recuperação de energia e resistências elementais.',
 sorte:'Eleva chance e multiplicador de dano crítico, além de precisão.'
});
const PROFILES=Object.freeze({
 peregrino:{base:[11,10,10,10,10,10,10],gain:[.43,.36,.45,.40,.32,.34,.23]},
 guardiao:{base:[15,14,14,7,6,7,6],gain:[.69,.65,.60,.25,.22,.24,.16]},
 arqueiro:{base:[8,8,10,16,9,8,10],gain:[.33,.30,.43,.75,.30,.25,.42]},
 curandeiro:{base:[10,10,6,9,16,17,9],gain:[.40,.35,.22,.31,.75,.82,.36]}
});
const ATTRIBUTE_CAP=70; // Especializações fortes, com limite por atributo; bônus naturais não entram no teto.
const MAX_LEVEL=100;
const POINTS_PER_LEVEL=2;
// O investimento não é uma cópia do crescimento automático: ele define a construção
// de personagem. Classes favorecem seus atributos sem impedir combinações originais.
const INVESTMENT_WEIGHTS=Object.freeze({
 peregrino:{strength:2.65,agility:1.65,intellect:1.85,spirit:1.45,healing:2.35},
 guardiao:{strength:3.25,agility:1.00,intellect:1.40,spirit:1.00,healing:1.80},
 arqueiro:{strength:1.30,agility:3.10,intellect:1.55,spirit:1.00,healing:1.80},
 curandeiro:{strength:1.10,agility:1.15,intellect:3.05,spirit:1.85,healing:3.60}
});
const pointsEarned=level=>(Math.min(MAX_LEVEL,Math.max(1,Math.floor(Number(level)||1)))-1)*POINTS_PER_LEVEL;
const cap=(v,min,max)=>Math.min(max,Math.max(min,v));
const profile=role=>PROFILES[role]||PROFILES.peregrino;
function normalizeAllocations(value,level){
 const allocations={};
 let sum=0;
 for(const key of ATTRIBUTE_KEYS){
  const v=Number(value?.[key]);
  const n=Number.isSafeInteger(v)?cap(v,0,ATTRIBUTE_CAP):0;
  allocations[key]=n;sum+=n;
 }
 const budget=pointsEarned(level);
 // Dados legados ou adulterados nunca podem ultrapassar o orçamento de pontos.
 if(sum>budget){
  let excess=sum-budget;
  for(const key of [...ATTRIBUTE_KEYS].reverse()){
   const remove=Math.min(excess,allocations[key]);allocations[key]-=remove;excess-=remove;
   if(!excess)break;
  }
 }
 return allocations;
}
function totalAllocated(allocations){return ATTRIBUTE_KEYS.reduce((sum,key)=>sum+(allocations[key]||0),0)}
function calculateAttributes(save){
 const level=cap(Math.floor(Number(save?.level)||1),1,MAX_LEVEL);
 const role=save?.role;
 const p=profile(role),allocated=normalizeAllocations(save?.attributes,level),investment=INVESTMENT_WEIGHTS[role]||INVESTMENT_WEIGHTS.peregrino;
 const attributes={};
 for(let i=0;i<ATTRIBUTE_KEYS.length;i++){
  attributes[ATTRIBUTE_KEYS[i]]=p.base[i]+Math.floor((level-1)*p.gain[i])+allocated[ATTRIBUTE_KEYS[i]];
 }
 const {vitalidade:v,fortitude:f,forca:str,agilidade:agi,intelecto:int,espirito:spi,sorte:luck}=attributes;
 const baseRoleHealth={guardiao:165,arqueiro:112,curandeiro:125,peregrino:135}[role]||135;
 const vitGrowth=v-p.base[0];
 const hpMax=baseRoleHealth+(level-1)*12+vitGrowth*4+allocated.vitalidade*12;
 const energyMax=Math.round(82+int*1.25+spi*1.40+(level-1)*.5+allocated.intelecto*5+allocated.espirito*3);
 const stats={
  maxHp:hpMax,maxEnergy:energyMax,
  physicalPower:Math.round(str*.66+agi*.23+allocated.forca*investment.strength+allocated.agilidade*investment.agility),
  magicPower:Math.round(int*.82+spi*.46+allocated.intelecto*investment.intellect+allocated.espirito*investment.spirit),
  accuracy:cap(Number((85+agi*.12+luck*.08+allocated.agilidade*.09+allocated.sorte*.15).toFixed(1)),85,99),
  criticalChance:cap(Number((3.5+agi*.08+luck*.17+allocated.agilidade*.13+allocated.sorte*.32).toFixed(1)),4,25),
  criticalMultiplier:cap(Number((1.43+luck*.002+allocated.sorte*.004).toFixed(2)),1.4,1.9),
  armor:Math.round(f*.45+v*.15+allocated.fortitude*1.35+allocated.vitalidade*.35),
  magicResist:Math.round(spi*.37+int*.19+allocated.espirito*1.1+allocated.intelecto*.7),
  fireResist:Math.round(spi*.35+f*.12+allocated.espirito*.9+allocated.fortitude*.5),
  lightningResist:Math.round(spi*.24+agi*.22+allocated.espirito*.75+allocated.agilidade*.45),
  evasion:cap(Number((1.5+agi*.105+luck*.018+allocated.agilidade*.19+allocated.sorte*.055).toFixed(1)),1.5,22),
  haste:cap(Number((agi*.12+int*.028+allocated.agilidade*.40+allocated.intelecto*.11).toFixed(1)),0,25),
  healingPower:Math.round(spi*.75+int*.37+allocated.espirito*investment.healing+allocated.intelecto*1.45),
  hpRegen:Number((.24+v*.019+allocated.vitalidade*.06).toFixed(2)),
  energyRegen:Number((2.5+spi*.07+int*.022+allocated.espirito*.22+allocated.intelecto*.09).toFixed(2))
 };
 return {
  level,role,attributes,allocations:allocated,availablePoints:pointsEarned(level)-totalAllocated(allocated),
  stats
 };
}
function attackModifiers(save,kind='physical'){
 const p=calculateAttributes(save);
 return {
  bonus:kind==='magic'?p.stats.magicPower:p.stats.physicalPower,
  precision:p.stats.accuracy/100,
  criticalChance:p.stats.criticalChance,
  criticalMultiplier:p.stats.criticalMultiplier,
  cooldownFactor:1-p.stats.haste/100
 };
}
// Críticos são determinísticos e verificáveis: em vez de RNG opaco,
// cada N-ésimo ataque bem-sucedido se torna crítico com base na chance.
function isCritical(sequence,chance){
 const n=Math.max(1,Math.ceil(100/Math.max(1,Number(chance)||1)));
 return Number.isSafeInteger(sequence)&&sequence>0&&sequence%n===0;
}
function mitigateDamage(raw,stats,element='physical'){
 const base=Math.max(1,Number(raw)||1);
 const armor={physical:stats.armor||0,magic:stats.magicResist||0,
  fire:stats.fireResist||0,lightning:stats.lightningResist||0}[element]||0;
 return Math.max(1,Math.ceil((base-armor)*(1-(stats.evasion||0)/100)));
}
module.exports={ATTRIBUTE_KEYS,ATTRIBUTE_LABELS,ATTRIBUTE_INFO,ATTRIBUTE_CAP,MAX_LEVEL,POINTS_PER_LEVEL,pointsEarned,
 PROFILES,normalizeAllocations,totalAllocated,calculateAttributes,attackModifiers,isCritical,mitigateDamage};

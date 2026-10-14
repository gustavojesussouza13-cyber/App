/* Progressão estética pura e determinística: os níveis salvos (1–60)
   definem o visual. Sem campos novos no banco ou custos de migração. */
export const ARCHITECTURE_MAX_LEVEL=60;
const NAMES=Object.freeze([
 'Povoado', 'Vila fortificada', 'Burgo de pedra',
 'Cidadela nobre', 'Capital imperial', 'Fortaleza lendária'
]);
const COLORS=Object.freeze([
 {stone:'#aaa99f',trim:'#bdb7a9',roof:'#945642',metal:'#665a4d',banner:'#a75e41'},
 {stone:'#afb1ad',trim:'#cec6b7',roof:'#8d4b42',metal:'#696a69',banner:'#a24a46'},
 {stone:'#b9bdba',trim:'#dad8cc',roof:'#667b86',metal:'#586a70',banner:'#527b97'},
 {stone:'#c0c3c4',trim:'#dfd9bf',roof:'#596d85',metal:'#a08a59',banner:'#497b9f'},
 {stone:'#d1ccc0',trim:'#e5dabc',roof:'#465d76',metal:'#bc985b',banner:'#815b9e'},
 {stone:'#e2d7bc',trim:'#f4e5c5',roof:'#475375',metal:'#e0ba68',banner:'#7858b9'}
]);
export function architectureAt(level){
 const n=Number(level);
 const safe=Number.isFinite(n)?Math.max(1,Math.min(ARCHITECTURE_MAX_LEVEL,Math.floor(n))):1;
 const stage=Math.floor((safe-1)/10);
 return {
  level:safe,stage,tier:stage+1,name:NAMES[stage],palette:COLORS[stage],
  // Cada nível eleva o prédio; os marcos 11,21,31,41,51 mudam sua arquitetura.
  growth:(safe-1)/59,
  milestone:stage>0&&safe%10===1
 };
}

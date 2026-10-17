'use strict';
const frontier=require('./frontier-world');
// Native creature species IDs for the forty permanent world regions.
const HISTORIC=Object.freeze([
0,1,23,10,5,19,9,25,18,17,22,28,
4,24,3,31,
9,4,12,17,21,27,
24,13,6,10,7,26,
3,15,14,19,22,30,
8,23,11,28,29,31
]);
const POOLS=Object.freeze({
pradaria:[0,1,9,12,16,27],floresta:[1,4,9,12,17,21],
rio:[2,18,23,24,16],deserto:[6,10,13,24,7],
montanha:[5,8,20,22,27,28],ruinas:[3,8,11,14,15,19,30],
pantano:[4,9,14,17,23,25],costa:[2,7,18,23,26]
});
function speciesForRegion(zone){
 if(!frontier.isZone(zone))return null;
 if(zone<HISTORIC.length)return HISTORIC[zone];
 const list=POOLS[frontier.info(zone)?.biome];
 const seed=frontier.spawnSeed(zone,0);
 return list&&seed!==null?list[seed%list.length]:null;
}
module.exports={HISTORIC,POOLS,speciesForRegion};

'use strict';
/* Os Peregrinos — terreno 3D exclusivo das guildas. Validação compartilhada servidor/cliente.
   Coordenadas antigas e footprints históricos são preservados. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.PeregrinosCityLayout=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 const N=26;
 const CORE=Object.freeze({x:11,y:11,w:4,h:4});
 const footprints=Object.freeze({house:[2,2],farm:[3,3],barracks:[4,3],tower:[2,2],market:[3,2]});
 function size(b){
  if(Number.isSafeInteger(b?.w)&&Number.isSafeInteger(b?.h)&&b.w>=1&&b.h>=1&&b.w<=4&&b.h<=4)return [b.w,b.h];
  // Edifícios pré-existentes sem tamanho explicitado continuam usando exatamente 1x1.
  return [1,1];
 }
 function cells(b){
  const [w,h]=size(b),out=[];
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)out.push([b.x+xx,b.y+yy]);
  return out;
 }
 function at(buildings,x,y){return (buildings||[]).find(b=>cells(b).some(p=>p[0]===x&&p[1]===y))}
 function isCore(x,y){return x>=CORE.x&&x<CORE.x+CORE.w&&y>=CORE.y&&y<CORE.y+CORE.h}
 function plan(type,x,y){const shape=footprints[type];return shape?{type,x,y,w:shape[0],h:shape[1]}:null}
 const areas=Object.freeze([null,[6,19],[4,21],[2,23],[1,24],[0,25]]);
 function bounds(level=5){
  const value=Number.isSafeInteger(level)?Math.max(1,Math.min(5,level)):5;
  const [min,max]=areas[value];
  return {min,max,width:max-min+1,cells:(max-min+1)**2-CORE.w*CORE.h};
 }
 function canPlace(buildings,type,x,y,level=5){
  if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y))return false;
  const b=plan(type,x,y);if(!b)return false;
  const {min,max}=bounds(level);
  return cells(b).every(([cx,cy])=>cx>=min&&cy>=min&&cx<=max&&cy<=max&&!isCore(cx,cy)&&!at(buildings,cx,cy));
 }

 // Planta urbana original de Auren. As coordenadas são públicas e determinísticas:
 // servidor e navegador sempre escolhem o MESMO conjunto de lotes; nenhuma
 // construção nova pode ser posicionada fora da planta da cidade.
 // O centro 4x4 e todos os edifícios já persistidos mantêm suas coordenadas.
 const proposals=[];
 function district(type,section,positions){
  for(const [x,y] of positions)proposals.push({type,section,x,y});
 }
 const grid=(xs,ys)=>xs.flatMap(x=>ys.map(y=>[x,y]));
 district('house','Bairro dos Peregrinos',grid([0,3,6],[0,3,6,9,12,15]));
 district('house','Aldeia Oriental',grid([24],[0,3,6]));
 district('farm','Campos de Auren',grid([0,4,8,12,16,20],[18,22]));
 district('market','Bairro Mercantil',grid([16,20,23],[9,12,15]));
 district('barracks','Distrito Militar',grid([10,15,20],[0,4]));
 district('barracks','Distrito Militar',[[11,7]]);
 district('tower','Bastiões',[[8,9],[8,13],[13,15],[10,8],[15,8],[9,13]]);
 // Áreas iniciais têm um exemplar de cada profissão para não travar a economia.
 district('farm','Campos do Castelo',[[8,15]]);
 const prime=['house:6:9','house:6:12','farm:8:15','market:16:12','barracks:11:7','tower:8:9'];
 const ranked=[...proposals].sort((a,b)=>{
  const ia=prime.indexOf(a.type+':'+a.x+':'+a.y),ib=prime.indexOf(b.type+':'+b.x+':'+b.y);
  return (ia<0?1000:ia)-(ib<0?1000:ib);
 });
 const occupied=new Set(),reserved=[];
 for(const proposal of ranked){
  const [w,h]=footprints[proposal.type],planned=plan(proposal.type,proposal.x,proposal.y);
  if(!cells(planned).every(([x,y])=>x>=0&&x<N&&y>=0&&y<N&&!isCore(x,y)&&!occupied.has(x+':'+y)))continue;
  const block=cells(planned);
  for(const [x,y] of block)occupied.add(x+':'+y);
  reserved.push({...proposal,w,h});
 }
 const slots=Object.freeze(reserved.map((p,index)=>{
  const minimum=[1,2,3,4,5].find(level=>
   cells(p).every(([x,y])=>{const b=bounds(level);return x>=b.min&&y>=b.min&&x<=b.max&&y<=b.max}))||5;
  const extra=index<prime.length?1:2+Math.floor((index-prime.length)*58/Math.max(1,reserved.length-prime.length-1));
  return Object.freeze({...p,id:'auren-'+String(index+1).padStart(2,'0'),
   unlockLevel:Math.min(60,Math.max(minimum,extra))});
 }));
 const lotByAnchor=new Map(slots.map(slot=>[slot.type+':'+slot.x+':'+slot.y,slot]));
 function lotAt(x,y){return slots.find(slot=>x>=slot.x&&x<slot.x+slot.w&&y>=slot.y&&y<slot.y+slot.h)||null}
 function lotFor(type,x,y){return lotByAnchor.get(type+':'+x+':'+y)||null}
 function availableLots(level=1){return slots.filter(slot=>slot.unlockLevel<=Math.max(1,Math.min(60,Math.floor(Number(level)||1))))}
 function lotStatus(slot,buildings=[],level=1){
  if(!slot)return 'road';
  if(at(buildings,slot.x,slot.y)||cells(slot).some(([x,y])=>Boolean(at(buildings,x,y))))return 'occupied';
  if(slot.unlockLevel>Math.max(1,Math.floor(Number(level)||1)))return 'locked';
  return 'empty';
 }
 function canPlaceInLot(buildings,type,x,y,level=1){
  const slot=lotFor(type,x,y);
  return Boolean(slot&&lotStatus(slot,buildings,level)==='empty'&&canPlace(buildings,type,x,y,level));
 }

 return Object.freeze({N,CORE,footprints,size,cells,at,isCore,plan,bounds,canPlace,slots,lotAt,lotFor,availableLots,lotStatus,canPlaceInLot});
});

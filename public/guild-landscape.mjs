/* Os Peregrinos: plano urbano determinístico de Auren.
 * Somente cenário. Não modifica terreno salvo, lotes, níveis nem regras do servidor.
 * Ruas ligam o castelo a todos os lotes, sem atravessar terrenos construíveis. */
export function planGuildLandscape(layout){
 const N=layout.N,slots=layout.slots||[],CORE=layout.CORE;
 const key=(x,y)=>x+':'+y;
 const inside=(x,y)=>x>=0&&x<N&&y>=0&&y<N;
 const lotCells=new Set(slots.flatMap(l=>layout.cells(l).map(([x,y])=>key(x,y))));
 const reserved=(x,y)=>layout.isCore(x,y)||lotCells.has(key(x,y));
 const road=new Set(),plaza=new Set(),entrances=new Set();
 const directions=[[0,1],[1,0],[-1,0],[0,-1]];
 function add(x,y,isPlaza=false){
  if(!inside(x,y)||reserved(x,y))return false;
  const k=key(x,y);road.add(k);if(isPlaza)plaza.add(k);return true;
 }
 // Quatro portões e um anel de praça em torno do castelo central.
 const gateways=[[CORE.x+1,CORE.y-1],[CORE.x+CORE.w,CORE.y+1],
  [CORE.x+1,CORE.y+CORE.h],[CORE.x-1,CORE.y+1]];
 for(const [x,y]of gateways){add(x,y,true);entrances.add(key(x,y))}
 for(let y=CORE.y-1;y<=CORE.y+CORE.h;y++)for(let x=CORE.x-1;x<=CORE.x+CORE.w;x++){
  if((x===CORE.x-1||x===CORE.x+CORE.w||y===CORE.y-1||y===CORE.y+CORE.h)&&
   add(x,y,true))entrances.add(key(x,y));
 }
 // Extende a rede de ruas usando custo inferior ao reutilizar estradas antigas;
 // cada trajeto parte de uma rua já existente (não cria ilhas).
 const ordered=[...slots].sort((a,b)=>a.unlockLevel-b.unlockLevel||
  Math.abs(a.x-CORE.x)+Math.abs(a.y-CORE.y)-Math.abs(b.x-CORE.x)-Math.abs(b.y-CORE.y));
 for(const lot of ordered){
  const goals=new Set();
  for(let y=lot.y;y<lot.y+lot.h;y++)for(let x=lot.x;x<lot.x+lot.w;x++)
   for(const [dx,dy]of directions){
    const nx=x+dx,ny=y+dy;
    if(inside(nx,ny)&&!reserved(nx,ny))goals.add(key(nx,ny));
   }
  if(!goals.size)continue;
  const dist=new Map(),prev=new Map(),queue=[],seen=new Set();
  for(const k of road){dist.set(k,0);queue.push([0,k])}
  let final=null;
  while(queue.length){
   queue.sort((a,b)=>b[0]-a[0]); // pequena malha 26x26: caminho estável
   const [cost,k]=queue.pop();
   if(seen.has(k))continue;
   seen.add(k);
   if(goals.has(k)){final=k;break}
   const [sx,sy]=k.split(':').map(Number);
   for(const [dx,dy]of directions){
    const x=sx+dx,y=sy+dy,neighbor=key(x,y);
    if(!inside(x,y)||reserved(x,y))continue;
    const turnPenalty=prev.has(k)&&((sx-Number(prev.get(k).split(':')[0]))!==dx||
     (sy-Number(prev.get(k).split(':')[1]))!==dy)?0.11:0;
    const next=cost+(road.has(neighbor)?.17:1)+turnPenalty;
    if(next<(dist.get(neighbor)??Infinity)){
     dist.set(neighbor,next);prev.set(neighbor,k);queue.push([next,neighbor]);
    }
   }
  }
  if(final){
   let k=final,guard=0;
   while(k&&!road.has(k)&&guard++<N*N){road.add(k);k=prev.get(k)}
   entrances.add(final);
  }
 }
 function hash(x,y,s=0){
  let n=Math.imul(x+17,73856093)^Math.imul(y+23,19349663)^Math.imul(s+41,83492791);
  return ((n^(n>>>13))>>>0)/4294967295;
 }
 const forest=new Set(),meadow=new Set();
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const k=key(x,y);
  if(reserved(x,y)||road.has(k))continue;
  // Bosques se concentram nos recantos verdes e limites do mapa.
  const neighboringRoad=directions.reduce((n,[dx,dy])=>n+Number(road.has(key(x+dx,y+dy))),0);
  const rim=x<3||y<3||x>N-4||y>N-4;
  if((rim&&hash(x,y,2)>.22)||(!neighboringRoad&&hash(x,y,4)>.50))forest.add(k);
  else meadow.add(k);
 }
 return Object.freeze({N,road,plaza,entrances,forest,meadow,lotCells,key,
  isRoad:(x,y)=>road.has(key(x,y)),
  isForest:(x,y)=>forest.has(key(x,y)),
  isLot:(x,y)=>lotCells.has(key(x,y)),
  isBuildable:(x,y)=>reserved(x,y),
  hash});
}

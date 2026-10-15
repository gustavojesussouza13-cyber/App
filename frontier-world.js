'use strict';
/**
 * Os Peregrinos — fronteiras procedurais ilimitadas na prática.
 *
 * As regiões históricas 0..39 nunca mudam. Cada região >=40 é uma coordenada
 * assinada (x,y) do plano, codificada com emparelhamento de Cantor e zigzag.
 * Não existe tabela de regiões, alocação de ID central ou mapa inteiro em RAM.
 * O único limite de alcance é Number.MAX_SAFE_INTEGER no protocolo JSON.
 */
const FIRST_ZONE=40;
const ORIGIN=11; // Terra da Última Luz é a passagem para além de Auren.
const BIOMES=Object.freeze([
 ['pradaria','Campos de Esmeralda'],['floresta','Florestas Antigas'],
 ['rio','Rios Silenciosos'],['deserto','Dunas Esquecidas'],
 ['montanha','Cordilheiras Altas'],['ruinas','Vestígios do Império'],
 ['pantano','Pântanos Nebulosos'],['costa','Costas Perdidas']
]);
const SEED=0x4a75526e;
function hash(x,y,salt=0){
 let h=Math.imul(SEED^Math.imul(x|0,0x9e3779b1),0x85ebca6b);
 h=Math.imul(h^Math.imul(y|0,0xc2b2ae35),0x27d4eb2f);
 h=Math.imul(h^(salt|0),0x7feb352d);
 h=Math.imul(h^(h>>>15),0x846ca68b);
 return (h^(h>>>16))>>>0;
}
function zigzag(n){return n<0?-2*n-1:2*n}
function unzigzag(n){return n%2===0?n/2:-(n+1)/2}
function idFor(x,y){
 if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y))return null;
 const a=zigzag(x),b=zigzag(y),s=a+b;
 if(!Number.isSafeInteger(s))return null;
 const id=FIRST_ZONE+s*(s+1)/2+b;
 return Number.isSafeInteger(id)?id:null;
}
function coordsFor(id){
 if(!Number.isSafeInteger(id)||id<FIRST_ZONE)return null;
 const n=id-FIRST_ZONE;
 let w=Math.floor((Math.sqrt(8*n+1)-1)/2);
 const triangle=k=>k*(k+1)/2;
 // Corrigir arredondamento de ponto flutuante em IDs elevados.
 while(w>0&&triangle(w)>n)w--;
 while(triangle(w+1)<=n)w++;
 const b=n-triangle(w),a=w-b;
 if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<0||b<0)return null;
 const x=unzigzag(a),y=unzigzag(b);
 return idFor(x,y)===id?{x,y}:null;
}
function isFrontier(id){return Number.isSafeInteger(id)&&id>=FIRST_ZONE&&coordsFor(id)!==null}
function isZone(id){return Number.isSafeInteger(id)&&id>=0&&(id<FIRST_ZONE||isFrontier(id))}
function info(id){
 const c=coordsFor(id);if(!c)return null;
 const h=hash(c.x,c.y);
 const biome=BIOMES[h%BIOMES.length];
 const distance=Math.abs(c.x)+Math.abs(c.y);
 const suffix=['da Aurora','do Crepúsculo','de Vigília','do Horizonte','das Estrelas','da Promessa','do Exílio','de Auren'][hash(c.x,c.y,23)%8];
 return Object.freeze({id,name:biome[1]+' '+suffix,biome:biome[0],
  frontier:true,gridX:c.x,gridY:c.y,distance,
  danger:Math.min(7,1+Math.floor(Math.log2(2+distance))),seed:hash(c.x,c.y,7)});
}
function around(id){
 const c=coordsFor(id);if(!c)return [];
 const directions=[['norte',0,-1,226],['leste',1,0,570],['sul',0,1,922],['oeste',-1,0,1280]];
 const entries=[];
 for(const [direction,dx,dy,x]of directions){
  const zone=idFor(c.x+dx,c.y+dy);if(zone===null)continue;
  const to=info(zone);
  entries.push({zone,name:to.name,x,direction,kind:'frontier',dungeon:false,gateway:false,frontier:true});
 }
 if(c.x===0&&c.y===0)entries.push({zone:ORIGIN,name:'Terra da Última Luz · Retornar a Auren',
  x:1500,direction:'retorno',kind:'frontier',dungeon:false,gateway:false,frontier:true});
 return entries;
}
function difficulty(id){
 const data=info(id);
 if(!data)return 1;
 // Vizinhos iniciais acessíveis a novatos; a distância cresce lentamente,
 // sem tornar a primeira nova área impossível para personagens iniciantes.
 return Math.min(7,1.12+Math.log2(2+data.distance)*.38);
}
function monsterLevel(id){
 const data=info(id);
 if(!data)return 1;
 return Math.min(90,Math.round(2+Math.log2(2+data.distance)*3.1));
}
function spawnSeed(id,index){
 const c=coordsFor(id);
 return c?hash(c.x,c.y,index+191):null;
}
module.exports={FIRST_ZONE,ORIGIN,BIOMES,SEED,hash,idFor,coordsFor,
 isFrontier,isZone,info,around,difficulty,monsterLevel,spawnSeed};

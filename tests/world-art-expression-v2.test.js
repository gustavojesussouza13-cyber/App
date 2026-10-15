'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ART=require('../public/world-art-master64');
const STUDIO=require('../public/sprite-studio');
const ATELIER=require('../public/character-atelier16');
function pixels(){
 const calls=[],transforms=[];
 const ctx={
  fillStyle:'#000',imageSmoothingEnabled:true,
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'cada cluster respeita a grade de pixel');
   assert.ok(w>0&&h>0&&x>=0&&y>=0&&x+w<=64&&y+h<=80,'sprite cabe em 64×80');
   calls.push([this.fillStyle,x,y,w,h]);
  },
  save(){transforms.push(['save'])},restore(){transforms.push(['restore'])},
  translate(x,y){transforms.push(['translate',x,y])},
  scale(x,y){transforms.push(['scale',x,y])}
 };
 return {ctx,calls,transforms};
}
function drawCreature(type,options={}){
 const output=pixels();
 assert.equal(ART.creature(output.ctx,{type,zone:20,species:3,...options}),true);
 return output;
}
function drawNpc(style,options={}){
 const output=pixels(),idx=ATELIER.NPC_STYLES.indexOf(style);
 assert.ok(idx>=0,'estilo narrativo real do jogo');
 assert.equal(ART.npc(output.ctx,{npc:{id:'historia-'+idx,name:'Habitante',role:style},...options}),true);
 return output;
}
const signature=p=>JSON.stringify(p.calls);
test('chefes lendários têm anatomias individuais em vez de apenas a mesma coroa',()=>{
 assert.equal(ART.VERSION,'world-art-master64-v2');
 const expected=[
  ['esqueleto','#af85d7'],['aranha','#da8594'],
  ['golem','#8eefff'],['dragao','#d85743']
 ];
 const bossPoses=new Set();
 for(const [kind,signatureColor]of expected){
  const base=drawCreature(kind,{boss:false,action:'idle'});
  const boss=drawCreature(kind,{boss:true,action:'idle'});
  assert.notEqual(signature(base),signature(boss),'chefia específica de '+kind);
  assert.ok(boss.calls.some(x=>x[0]===signatureColor),'cor de anatomia específica de '+kind);
  assert.ok(boss.calls.length>base.calls.length);
  bossPoses.add(signature(boss));
 }
 assert.equal(bossPoses.size,expected.length);
});
test('cinco quadros de ataque realmente mudam para cada uma das 15 famílias',()=>{
 for(const type of ART.CREATURES){
  const attacks=Array.from({length:5},(_,frame)=>signature(drawCreature(type,{action:'attack',frame})));
  assert.ok(new Set(attacks).size>=4,'ataque sem animação convincente: '+type);
  const idle=signature(drawCreature(type,{action:'idle',frame:0}));
  assert.notEqual(attacks[3],idle,'ataque precisa distinguir-se do repouso: '+type);
 }
});
test('equipamentos narrativos dos NPCs preservam frente, costas e profissões',()=>{
 const styles=['guarda-aurora','ferreira-fornalha','bibliotecario','curandeira',
  'padeira','viajante','sineira','cartografo','marinheira','jardineiro'];
 const unique=new Set();
 for(const style of styles){
  const front=drawNpc(style,{dir:2});
  const back=drawNpc(style,{dir:0});
  const side=drawNpc(style,{dir:1});
  assert.ok(front.calls.length>100);
  assert.notEqual(signature(front),signature(back),'as costas não devem repetir a frente: '+style);
  assert.notEqual(signature(front),signature(side),'perfil individual de '+style);
  unique.add(signature(front));
 }
 assert.equal(unique.size,styles.length);
});
test('chefes e monstros em regiões diferentes recebem sprites cacheados distintos',()=>{
 const made=[];
 const studio=STUDIO.create({limit:128,documentRef:{createElement(){
  const output=pixels();made.push(output);
  return{width:0,height:0,getContext:()=>output.ctx};
 }}});
 const region20=studio.obtain('monster','dragao',2,'attack',2,true,20,3);
 const region21=studio.obtain('monster','dragao',2,'attack',2,true,21,3);
 assert.notStrictEqual(region20,region21);
 assert.notEqual(signature(made[0]),signature(made[1]));
 assert.strictEqual(studio.obtain('monster','dragao',2,'attack',2,true,20,3),region20);
 assert.equal(studio.stats.builds,2,'não recriar frames já guardados');
 for(let i=0;i<180;i++)studio.obtain('monster','lobo',i%4,'walk',i%6,false,16+i%35,i%11);
 assert.ok(studio.stats.cached<=128,'limite de memória do cache permanece');
});
test('efeitos preservam a grade e módulo também carrega no navegador',()=>{
 for(const type of ART.CREATURES){
  for(const dir of [0,1,2,3])for(const action of ['idle','walk','attack','hurt','death']){
   const output=drawCreature(type,{dir,action,frame:3,boss:true});
   assert.ok(output.calls.length>40);
   if(dir===3)assert.ok(output.transforms.some(x=>x[0]==='scale'&&x[1]===-1));
  }
 }
 const script=fs.readFileSync(path.join(__dirname,'../public/world-art-master64.js'),'utf8');
 const scope={OsPeregrinosCharacterAtelier:ATELIER};
 vm.createContext(scope);vm.runInContext(script,scope);
 assert.equal(scope.OsPeregrinosWorldMaster64.VERSION,'world-art-master64-v2');
 assert.doesNotMatch(script,/requestAnimationFrame|setInterval|localStorage|WebSocket|fetch\(/);
});
test('integração mantém os quatro heróis e fortaleza tridimensional sem mudanças',()=>{
 const dir=path.join(__dirname,'../public');
 const studio=fs.readFileSync(path.join(dir,'sprite-studio.js'),'utf8');
 const html=fs.readFileSync(path.join(dir,'mundo.html'),'utf8');
 assert.match(studio,/PILGRIM_ARTISAN\?\.draw/);
 assert.match(studio,/HEROES_MASTER\?\.draw/);
 assert.match(studio,/WORLD_MASTER\?\.creature/);
 assert.match(studio,/WORLD_MASTER\?\.npc/);
 assert.match(html,/world-art-master64\.js\?v=world-art-master64-v2/);
 assert.match(html,/sprite-studio\.js\?v=world-art-master64-v2/);
 assert.match(html,/guild-city-3d\.js/);
});

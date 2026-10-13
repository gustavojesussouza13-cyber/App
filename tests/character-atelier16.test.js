'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ART=require('../public/character-atelier16');
const STUDIO=require('../public/sprite-studio');
const {NPCS}=require('../story-data');
const {SPECIES}=require('../world-engine');
const web=fn=>fs.readFileSync(path.join(__dirname,'../public',fn),'utf8');
function canvas(){
 const strokes=[];let color='';
 const ctx={
  get fillStyle(){return color},
  set fillStyle(c){color=String(c)},
  fillRect(x,y,w,h){
   assert.ok([x,y,w,h].every(Number.isInteger),'sprites devem respeitar a grade de pixels');
   assert.ok(w>0&&h>0);
   strokes.push([color,x,y,w,h]);
  },
  save(){strokes.push(['save'])},
  restore(){strokes.push(['restore'])},
  translate(x,y){strokes.push(['translate',x,y])},
  scale(x,y){strokes.push(['scale',x,y])},
  drawImage(){strokes.push(['image'])},
  set imageSmoothingEnabled(value){strokes.push(['smoothing',value])}
 };
 return {ctx,strokes};
}
function studio(){
 let count=0;
 const images=[];
 const browser={
  createElement(kind){
   assert.equal(kind,'canvas');
   const g=canvas();
   const sheet={width:0,height:0,getContext:()=>g.ctx,ops:g.strokes};
   images.push(sheet);count++;
   return sheet;
  }
 };
 const screen={calls:[],drawImage(...args){this.calls.push(args)},
  set imageSmoothingEnabled(v){this.smoothing=v}};
 return {instance:STUDIO.create({documentRef:browser}),images,screen,get count(){return count}};
}
function sig(ops){return ops.map(x=>x.join(':')).join('|')}
test('56 NPCs narrativos possuem perfis de arte reconhecíveis e individuais',()=>{
 assert.equal(ART.NPC_STYLES.length,56);
 assert.equal(new Set(ART.NPC_STYLES).size,56);
 assert.equal(NPCS.length,56);
 assert.equal(new Set(NPCS.map(n=>ART.npcStyle(n))).size,56);
 for(const [i,n] of NPCS.entries()){
  const s=ART.npcStyle(n);
  assert.equal(s,ART.NPC_STYLES[i],n.name);
  assert.ok(ART.NPC_FAMILY[s],'sem paleta para '+n.name);
 }
});
test('NPCs da história e moradores não usam o sprite das quatro classes como substituto',()=>{
 const b=studio(),unique=[];
 for(const n of NPCS){
  assert.equal(b.instance.drawNpc(b.screen,n,640),true);
  const sheet=b.screen.calls.at(-1)[0];
  assert.equal(sheet.width,40);assert.equal(sheet.height,52);
  assert.ok(sheet.ops.length>=30,'NPC pouco detalhado: '+n.name);
  unique.push(sig(sheet.ops));
 }
 assert.equal(new Set(unique).size,56,'os NPCs devem ter aparências reconhecíveis diferentes');
 assert.equal(b.instance.stats.cached,56);
});
test('o mesmo NPC mantém a identidade e cache entre quadros; direções são diferentes',()=>{
 const b=studio();
 const first=NPCS[0],other=NPCS[16];
 assert.ok(first.id!==other.id);
 const front=b.instance.obtain('npc',ART.npcStyle(first),2,'idle',0,false,first.zone,0,first);
 const again=b.instance.obtain('npc',ART.npcStyle(first),2,'idle',0,false,first.zone,0,first);
 assert.equal(front,again,'quadros de NPCs devem ser reaproveitados');
 const back=b.instance.obtain('npc',ART.npcStyle(first),0,'idle',0,false,first.zone,0,first);
 const side=b.instance.obtain('npc',ART.npcStyle(first),3,'walk',2,false,first.zone,0,first);
 assert.notEqual(sig(front.ops),sig(back.ops));
 assert.ok(side.ops.some(op=>op[0]==='scale'&&op[1]===-1));
 const lore=b.instance.obtain('npc',ART.npcStyle(other),2,'idle',0,false,other.zone,0,other);
 assert.notEqual(sig(front.ops),sig(lore.ops));
});
test('todos os 32 monstros do servidor possuem pigmento e detalhe por espécie',()=>{
 assert.equal(SPECIES.length,32);
 assert.equal(ART.VARIANTS.length,32);
 const b=studio(),signatures=[];
 for(let i=0;i<SPECIES.length;i++){
  const monster={x:120,y:130,zone:12,species:i,boss:false};
  assert.equal(b.instance.drawMonster(b.screen,monster,300,{type:'limo'}),true);
  const sheet=b.screen.calls.at(-1)[0];
  assert.ok(sheet.ops.length>=24,SPECIES[i][0]+' pouco detalhado');
  signatures.push(sig(sheet.ops));
 }
 assert.equal(new Set(signatures).size,32,'não deve haver espécies visualmente idênticas');
});
test('criaturas com a mesma silhueta conservam as distinções por espécie no cache',()=>{
 const b=studio();
 const wolf=b.instance.obtain('monster','lobo',2,'idle',0,false,0,1);
 const winter=b.instance.obtain('monster','lobo',2,'idle',0,false,20,20);
 assert.notEqual(wolf,winter);
 assert.notEqual(sig(wolf.ops),sig(winter.ops));
 assert.equal(b.instance.obtain('monster','lobo',2,'idle',0,false,0,1),wolf);
});
test('heróis possuem acabamento adicional em seis quadros e cinco ataques',()=>{
 const b=studio(),roles=Object.keys(STUDIO.ROLES);
 assert.equal(roles.length,4);
 for(const role of roles){
  const walk=[];
  for(let frame=0;frame<6;frame++){
   const sheet=b.instance.obtain('hero',role,2,'walk',frame);
   assert.ok(sheet.ops.length>55,role+' pouco detalhado');
   walk.push(sig(sheet.ops));
  }
  assert.ok(new Set(walk).size>=4,role+' sem animação de roupa');
  const attacks=[];
  for(let frame=0;frame<5;frame++)attacks.push(sig(b.instance.obtain('hero',role,2,'attack',frame).ops));
  assert.ok(new Set(attacks).size>=3,role+' sem poses de ataque distintas');
 }
});
test('armas e cores de profissão continuam evidentes, inclusive o arco em ataques',()=>{
 const b=studio();
 const a=b.instance.obtain('hero','arqueiro',2,'attack',2);
 assert.ok(a.ops.some(x=>x[0]==='#f9f2d8'),'flecha do arqueiro não foi desenhada');
 assert.ok(a.ops.some(x=>x[0]==='#d49e57'),'arco sem realce');
 const g=b.instance.obtain('hero','guardiao',2,'idle',0);
 assert.ok(g.ops.some(x=>x[0]==='#2e65ac'),'escudo azul não aparece');
 const c=b.instance.obtain('hero','curandeiro',2,'attack',2);
 assert.ok(c.ops.some(x=>x[0]==='#70c7e0'),'cristal do cajado não aparece');
 const p=b.instance.obtain('hero','peregrino',2,'idle',0);
 assert.ok(p.ops.some(x=>x[0]==='#9e4350'),'lenço de peregrino não aparece');
});
test('arte permanece separada da persistência, regras e mapas',()=>{
 const html=web('mundo.html');
 assert.ok(html.indexOf('character-atelier16.js')<html.indexOf('sprite-studio.js'));
 const source=web('sprite-studio.js');
 assert.match(source,/ATELIER\?\.hero\(/);
 assert.match(source,/ATELIER\?\.creature\(/);
 assert.match(source,/ATELIER\?\.npcStyle\?\.\(n\)/);
 assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../world-terrain.js'),'utf8'),/character-atelier16/);
 assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../account-store.js'),'utf8'),/character-atelier16/);
});
test('módulo de arte roda no navegador e não precisa carregar fontes ou imagens externas',()=>{
 const source=web('character-atelier16.js');
 const scope={Math,Number,Object,Array,String,globalThis:null};
 scope.globalThis=scope;
 vm.createContext(scope);vm.runInContext(source,scope);
 assert.equal(typeof scope.OsPeregrinosCharacterAtelier.npc,'function');
 assert.doesNotMatch(source,/(?:fetch\(|XMLHttpRequest|new Image\(|createLinearGradient\()/);
});

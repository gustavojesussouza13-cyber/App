'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {World,QUESTS,questProgress}=require('../world-engine');
function env(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-quests-'));
 const events=[],file=path.join(dir,'save.json');
 const world=new World({send:(_s,m)=>events.push(m),getOnline:()=>0,hasClassicName:()=>false,dataFile:file});
 t.after(()=>{world.stop();fs.rmSync(dir,{recursive:true,force:true})});
 const token=crypto.randomBytes(32).toString('hex'),c={socket:{},worldPlayer:null};
 world.join(c,{name:'QuestTeste',token});
 return {world,p:c.worldPlayer,c,events,file,token};
}
test('catálogo contém missões diferentes de derrotar monstros',()=>{
 assert.equal(QUESTS.length,14);
 const types=new Set(QUESTS.map(q=>q.type||'kills'));
 assert.deepEqual([...types].sort(),['bosses','chapters','kills','regions']);
 assert.equal(new Set(QUESTS.map(q=>q.id)).size,QUESTS.length);
});
test('conta regiões únicas, chefes distintos, capítulos e monstros',()=>{
 const sample={kills:5,visited:[0,1,1,2],bossRelics:[0,0,2],story:{stage:6}};
 for(const [type,expected] of [['kills',5],['regions',3],['bosses',2],['chapters',6]]){
  assert.equal(questProgress(sample,{type}),expected);
 }
});
test('derrotas comuns não liberam premiações de exploração nem chefes',t=>{
 const {world,p}=env(t);
 p.save.kills=5;
 world.claimQuests(p);
 assert.ok(p.save.quests.includes('primeiro-passo'));
 assert.equal(p.save.quests.includes('trilhas-aurora'),false);
 assert.equal(p.save.quests.includes('primeiro-legado'),false);
});
test('exploração libera recompensas somente uma vez',t=>{
 const {world,p}=env(t);
 p.save.visited=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
 const initialCoins=p.save.coins;
 world.claimQuests(p);
 for(const id of ['trilhas-aurora','cartografo-auren','mapa-completo'])
  assert.ok(p.save.quests.includes(id),id);
 const once=p.save.coins;
 assert.ok(once>initialCoins);
 world.claimQuests(p);
 assert.equal(p.save.coins,once,'não duplica moedas ao resgatar');
});
test('relíquias de chefes e capítulos narrativos liberam missões correspondentes',t=>{
 const {world,p}=env(t);
 p.save.bossRelics=[0,1,2,3];
 p.save.story.stage=12;
 world.claimQuests(p);
 for(const id of ['primeiro-legado','sem-medo','voz-desperta','livro-luz'])
  assert.ok(p.save.quests.includes(id),id);
});
test('objetivos e recompensas permanecem salvos depois de reconectar',t=>{
 const e=env(t),{world,p,c,token}=e;
 p.save.visited=[0,1,2,3];
 world.claimQuests(p);
 world.leave(c);
 const reopen=new World({send:()=>{},getOnline:()=>0,hasClassicName:()=>false,dataFile:e.file});
 t.after(()=>reopen.stop());
 const c2={socket:{},worldPlayer:null};
 reopen.join(c2,{name:'QuestTeste',token});
 assert.ok(c2.worldPlayer.save.quests.includes('trilhas-aurora'));
 assert.ok(c2.worldPlayer.save.coins>60);
});
test('interface mostra corretamente unidades de exploração, chefes e narrativa',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 assert.match(s,/q\.type==='regions'\?'regiões'/);
 assert.match(s,/q\.type==='bosses'\?'chefes'/);
 assert.match(s,/q\.type==='chapters'\?'capítulos'/);
});

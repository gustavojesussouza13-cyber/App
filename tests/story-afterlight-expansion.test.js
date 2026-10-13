'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {chapters,NPCS,normalizeStory,journal}=require('../story-data');
const {BOOKS,additionalChapters}=require('../story-afterlight');
const {World,QUESTS,ZONES}=require('../world-engine');
const ART=require('../public/character-atelier16');
const html=file=>fs.readFileSync(path.join(__dirname,'../public',file),'utf8');

test('os primeiros 16 capítulos e seus IDs originais permanecem intactos',()=>{
 const zones=[0,1,12,2,3,13,4,5,14,6,7,8,9,10,11,15];
 assert.deepEqual(chapters.slice(0,16).map(x=>x.zone),zones);
 assert.deepEqual(chapters.slice(0,16).map(x=>x.id),Array.from({length:16},(_,i)=>'historia-'+i));
 assert.equal(chapters[0].name,'Lia, a Acendedora');
 assert.equal(chapters[15].name,'Cálen, o Esquecido');
 assert.equal(chapters.filter(x=>x.shard).length,7);
 assert.equal(chapters.slice(0,16).filter(x=>x.key).length,4);
});
test('Vigília: quatro atos originais de seis capítulos, cada um em um subsolo',()=>{
 assert.equal(BOOKS.length,4);
 assert.equal(additionalChapters.length,24);
 assert.equal(chapters.length,40);
 assert.equal(NPCS.length,56);
 assert.equal(ZONES.length,40);
 for(let i=0;i<24;i++){
  const chapter=chapters[i+16],act=Math.floor(i/6),depth=i%6+1;
  assert.equal(chapter.zone,16+i);
  assert.equal(chapter.depth,depth);
  assert.equal(chapter.book,BOOKS[act].name);
  assert.equal(chapter.id,'historia-'+(16+i));
  assert.equal(chapter.choices.length,2);
  assert.deepEqual(chapter.choices.map(x=>x[0]),['compaixao','coragem']);
  assert.ok(chapter.lines.length>=4,'diálogo insuficiente em '+chapter.chapter);
  assert.ok(chapter.ending.length>=2,'falta desfecho em '+chapter.chapter);
  assert.ok(chapter.xp>chapters[15].xp&&chapter.coins>chapters[15].coins);
  if(depth===6)assert.equal(chapter.witness,BOOKS[act].witness);
  else assert.equal(chapter.witness,undefined);
 }
 assert.equal(new Set(NPCS.map(x=>x.id)).size,56);
 assert.equal(new Set(NPCS.map(n=>ART.npcStyle(n))).size,56,'novos NPCs não podem repetir identidade visual');
});
test('normalização conserva os 16 capítulos já concluídos e suporta quarenta decisões',()=>{
 const old=normalizeStory({stage:16,active:false,progress:0,
  shards:['Centelha da Memória','Centelha da União'],
  decisions:Array.from({length:16},(_,chapter)=>({chapter,id:'compaixao'}))});
 assert.equal(old.stage,16);
 assert.equal(old.testimonies.length,0);
 const next=journal(old);
 assert.equal(next.finished,false);
 assert.equal(next.total,40);
 assert.equal(next.zone,16);
 assert.equal(next.title,chapters[16].chapter);
 const complete=normalizeStory({stage:40,
  decisions:Array.from({length:40},(_,chapter)=>({chapter,id:'coragem'})),
  testimonies:BOOKS.map(x=>x.witness)});
 assert.equal(complete.decisions.length,40);
 assert.equal(complete.testimonies.length,4);
 assert.equal(journal(complete).finished,true);
 assert.equal(normalizeStory({stage:999,testimonies:['invasão']}).testimonies.length,0);
});
test('conta que terminou os 16 originais pode iniciar capítulo 17 e salvar o resultado',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'os-vigilia-'));
 const file=path.join(dir,'world.json'),token=crypto.randomBytes(32).toString('hex');
 const owner={uid:'account:RetornoVigilia',username:'RetornoVigilia'};
 let w=new World({dataFile:file,send:()=>{},getOnline:()=>0,hasClassicName:()=>false});
 t.after(()=>{w.stop();fs.rmSync(dir,{recursive:true,force:true})});
 const a={socket:{},worldPlayer:null,authUser:owner};
 w.join(a,{name:owner.username,token});
 const p=a.worldPlayer;
 p.save.story={stage:16,active:false,progress:0,
  decisions:Array.from({length:16},(_,chapter)=>({chapter,id:'compaixao'})),
  shards:chapters.filter(x=>x.shard).map(x=>x.shard)};
 w.leave(a);
 w.stop();
 w=new World({dataFile:file,send:(socket,msg)=>events.push(msg),getOnline:()=>0,hasClassicName:()=>false});
 const events=[],b={socket:{},worldPlayer:null,authUser:owner};
 w.join(b,{name:owner.username,token});
 assert.equal(b.worldPlayer.save.story.stage,16);
 assert.equal(b.worldPlayer.save.story.shards.length,7);
 const n=chapters[16],p2=b.worldPlayer;
 p2.zone=n.zone;p2.save.zone=n.zone;p2.x=n.x-10;p2.y=n.y-10;p2.lastTalk=0;
 w.receive(b,{type:'talk',npc:n.id});
 const dlg=events.filter(x=>x.type==='dialogue').at(-1);
 assert.equal(dlg.chapter,n.chapter);
 w.receive(b,{type:'storyChoice',npc:n.id,choice:'compaixao'});
 assert.equal(p2.save.story.stage,17);
 assert.equal(p2.save.story.decisions.length,17);
 assert.equal(p2.save.story.shards.length,7);
 const msg=events.filter(x=>x.type==='storyResolved').at(-1);
 assert.equal(msg.complete,false);
 assert.equal(msg.next.zone,17);
 assert.equal(journal(p2.save.story).total,40);
});
test('missões e diário acompanham os quatro atos e mantêm conquistas anteriores',()=>{
 const byId=new Map(QUESTS.map(q=>[q.id,q]));
 assert.equal(byId.get('mapa-completo').target,40);
 assert.equal(byId.get('primeira-vigilia').target,24);
 assert.equal(byId.get('cronicas-completas').target,40);
 const js=html('mmo.js');
 assert.match(js,/Testemunhos da Vigília/);
 assert.match(js,/q\.stage===16/);
 assert.match(js,/q\.stage\+1/);
});
test('portal público, história, guia e sobre divulgam números reais e salvamento correto',()=>{
 const landing=html('index.html'),historia=html('historia.html'),
  guia=html('guia.html'),sobre=html('sobre.html'),privacy=html('privacidade.html'),
  world=html('mundo.html');
 for(const v of ['40 regiões','576 criaturas','56 personagens','40 capítulos','24 subsolos'])
  assert.ok(landing.includes(v),'informação principal ausente: '+v);
 assert.match(landing,/REGIÃO 01 \/ 40/);
 assert.doesNotMatch(landing,/240 monstros|16 regiões|16 capítulos|32 NPCs/i);
 assert.match(historia,/40 capítulos e 56 NPCs/);
 assert.match(historia,/O Hino de Muitas Vozes/);
 assert.match(sobre,/40 regiões/);
 assert.match(guia,/Visitante<\/strong>, cada nova abertura do site cria um personagem do zero/);
 assert.match(guia,/Subsolo 3 de cada masmorra/);
 assert.match(privacy,/token temporário para cada abertura da página/);
 assert.match(world,/character-atelier16\.js\?v=vigilia-56-v1/);
 assert.match(world,/mmo\.js\?v=portais-restaurados-v1/);
});

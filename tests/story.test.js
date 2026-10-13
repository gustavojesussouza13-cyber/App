'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const os=require('node:os');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {World}=require('../world-engine');
const {NPCS,chapters,journal}=require('../story-data');
const mk=()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'peregrinos-historia-'));
 const events=[];const send=(socket,msg)=>events.push(msg);
 const world=new World({send,getOnline:()=>0,hasClassicName:()=>false,dataFile:path.join(dir,'world.json')});
 const token=crypto.randomBytes(32).toString('hex'),c={socket:{},worldPlayer:null,authUser:{uid:'account:Historiador',username:'Historiador'}};world.join(c,{name:'Historiador',token});
 const p=c.worldPlayer;
 const cleanup=()=>{world.stop();fs.rmSync(dir,{recursive:true,force:true})};
 const go=n=>{p.zone=n.zone;p.save.zone=n.zone;p.x=n.x-10;p.y=n.y-10;p.save.x=p.x;p.save.y=p.y};
 const last=type=>events.filter(x=>x.type===type).at(-1);
 return {world,p,c,events,token,dir,go,last,cleanup};
};
test('16 capítulos preservados, 24 inéditos nos subsolos e sete centelhas',()=>{
 assert.equal(chapters.length,40);assert.equal(NPCS.length,56);
 assert.equal(new Set(NPCS.map(x=>x.id)).size,56);
 assert.deepEqual(chapters.slice(0,16).map(x=>x.zone),[0,1,12,2,3,13,4,5,14,6,7,8,9,10,11,15]);
 assert.deepEqual(chapters.slice(16).map(x=>x.zone),Array.from({length:24},(_,i)=>16+i));
 assert.equal(chapters.filter(x=>x.shard).length,7);
 assert.ok(chapters.reduce((n,x)=>n+x.lines.length+(x.ending?.length||0),0)>=90);
 for(const npc of NPCS){assert.ok(npc.x>0&&npc.x<1536);assert.ok(npc.y>0&&npc.y<1024);assert.ok(npc.lines.length>=2)}
});
test('jogador recebe NPCs, livro de capítulos e nenhum cadastro',t=>{
 const w=mk();t.after(w.cleanup);
 const msg=w.last('welcome');assert.equal(msg.npcs.length,56);
 assert.equal(msg.self.story.stage,0);assert.equal(msg.self.story.total,40);
 assert.equal(msg.self.story.title,'O sino que não tocou');assert.equal(msg.maxPlayers,10);
});
test('falar com NPC distante, desconhecido ou de região diferente não exibe diálogo',t=>{
 const w=mk();t.after(w.cleanup);const n=chapters[0];
 w.p.x=50;w.p.y=50;
 w.world.receive(w.c,{type:'talk',npc:n.id});assert.equal(w.last('dialogue'),undefined);
 w.world.receive(w.c,{type:'talk',npc:'historia-500'});assert.equal(w.last('dialogue'),undefined);
 w.world.receive(w.c,{type:'talk',npc:chapters[1].id});assert.equal(w.last('dialogue'),undefined);
});
test('história só avança com escolha permitida e recompensa é entregue uma única vez',t=>{
 const w=mk();t.after(w.cleanup);w.go(chapters[0]);
 w.world.receive(w.c,{type:'storyChoice',npc:chapters[0].id,choice:'compaixao'});
 assert.equal(w.p.save.story.stage,0);
 w.world.receive(w.c,{type:'talk',npc:chapters[0].id});
 assert.equal(w.last('dialogue').pages.length,5);
 const coins=w.p.save.coins;
 w.world.receive(w.c,{type:'storyChoice',npc:chapters[0].id,choice:'compaixao'});
 assert.equal(w.p.save.story.stage,1);assert.equal(w.p.save.coins,coins+chapters[0].coins);
 w.world.receive(w.c,{type:'storyChoice',npc:chapters[0].id,choice:'compaixao'});
 assert.equal(w.p.save.story.stage,1);assert.equal(w.p.save.coins,coins+chapters[0].coins);
 w.p.lastTalk=0;w.world.receive(w.c,{type:'talk',npc:chapters[0].id});
 assert.equal(w.last('dialogue').mode,'revisit');
});
test('combate da história conta apenas vitórias depois da aceitação, dentro da região',t=>{
 const w=mk();t.after(w.cleanup);
 // Capítulo de Neri vem depois de Lia e Moisés.
 for(const n of chapters.slice(0,2)){w.go(n);w.world.receive(w.c,{type:'talk',npc:n.id});w.world.receive(w.c,{type:'storyChoice',npc:n.id,choice:'coragem'});w.p.lastTalk=0}
 const n=chapters[2];w.go(n);
 const initial=w.p.save.story.stage;
 w.world.award(w.p,10,0,false,n.zone);assert.equal(w.p.save.story.progress,0);
 w.world.receive(w.c,{type:'talk',npc:n.id});w.world.receive(w.c,{type:'storyChoice',npc:n.id,choice:'accept'});
 assert.equal(w.p.save.story.active,true);
 w.world.award(w.p,10,0,false,1);assert.equal(w.p.save.story.progress,0);
 w.world.award(w.p,10,0,false,12);assert.equal(w.p.save.story.progress,1);
 w.p.lastTalk=0;w.world.receive(w.c,{type:'talk',npc:n.id});
 assert.equal(w.last('dialogue').mode,'progress');
 w.world.receive(w.c,{type:'storyChoice',npc:n.id,choice:'compaixao'});assert.equal(w.p.save.story.stage,initial);
 w.world.award(w.p,10,0,false,12);assert.equal(w.p.save.story.progress,2);
 w.p.lastTalk=0;w.world.receive(w.c,{type:'talk',npc:n.id});assert.equal(w.last('dialogue').mode,'complete');
 w.world.receive(w.c,{type:'storyChoice',npc:n.id,choice:'coragem'});
 assert.equal(w.p.save.story.stage,initial+1);assert.ok(w.p.save.story.shards.includes('Centelha da Memória'));
});
test('história de 40 capítulos preserva 7 centelhas, quatro testemunhos e decisões',t=>{
 const w=mk();t.after(w.cleanup);let keys=0;
 for(const n of chapters){
  w.go(n);w.p.lastTalk=0;
  w.world.receive(w.c,{type:'talk',npc:n.id});
  if(n.objective){w.world.receive(w.c,{type:'storyChoice',npc:n.id,choice:'accept'});
   for(let i=0;i<n.objective;i++)w.world.award(w.p,2,0,false,n.zone);
   w.p.lastTalk=0;w.world.receive(w.c,{type:'talk',npc:n.id});
  }
  w.world.receive(w.c,{type:'storyChoice',npc:n.id,choice:'compaixao'});
  assert.equal(w.p.save.story.stage,n.index+1,`capítulo ${n.index}`);
  if(n.key)keys++;
 }
 assert.equal(keys,4);assert.equal(w.p.save.inventory.chave,4);
 assert.equal(w.p.save.story.shards.length,7);assert.equal(w.p.save.story.decisions.length,40);
 assert.equal(w.p.save.story.testimonies.length,4);
 assert.ok(w.last('storyResolved').epilogue.includes('Compaixão'));
 assert.equal(journal(w.p.save.story).finished,true);
});
test('decisão e capítulo sobrevivem a desconexão e novo personagem em mesmo navegador',t=>{
 const w=mk();t.after(w.cleanup);const n=chapters[0];w.go(n);
 w.world.receive(w.c,{type:'talk',npc:n.id});w.world.receive(w.c,{type:'storyChoice',npc:n.id,choice:'coragem'});
 w.world.leave(w.c);w.world.persist();
 const newWorld=new World({send:()=>{},getOnline:()=>0,hasClassicName:()=>false,dataFile:path.join(w.dir,'world.json')});
 t.after(()=>newWorld.stop());const c={socket:{},worldPlayer:null,authUser:{uid:'account:Historiador',username:'Historiador'}};newWorld.join(c,{name:'Historiador',token:w.token});
 assert.equal(c.worldPlayer.save.story.stage,1);assert.equal(c.worldPlayer.save.story.decisions[0].id,'coragem');
});
test('interfaces possuem botão Conversar, controle E, diário e personagens 16-bit',()=>{
 const dir=path.join(__dirname,'../public');
 const html=fs.readFileSync(path.join(dir,'mundo.html'),'utf8'),js=fs.readFileSync(path.join(dir,'mmo.js'),'utf8'),art=fs.readFileSync(path.join(dir,'art16.js'),'utf8');
 assert.match(html,/id="npcDialogue"/);assert.match(html,/id="talkBtn"/);assert.match(html,/data-tab="story"/);
 assert.match(js,/KeyE/);assert.match(js,/storyResolved/);assert.match(js,/storyChoice/);assert.match(js,/tryTalk\(npc\)/);
 assert.match(art,/function npcActor/);assert.match(art,/frameSprite\(g,heroSheets\[n.role\]/);
});

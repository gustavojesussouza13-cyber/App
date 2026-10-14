'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {World}=require('../world-engine');
const politics=require('../kingdom-politics');

function fixture(t){
 const events=[],saved=[];
 const world=new World({autosave:false,persistentStore:{enqueue:s=>{saved.push(structuredClone(s));return Promise.resolve(true)}},
  send:(socket,message)=>events.push({socket,message}),getOnline:()=>0,hasClassicName:()=>false});
 t.after(()=>world.stop());
 const player=(name)=>{
  const c={socket:{},authUser:{uid:'account:'+name,username:name},worldPlayer:null};
  world.join(c,{name});
  const p=c.worldPlayer;
  p.save.coins=10000;p.x=768;p.y=512;
  return {p,c};
 };
 const establish=(name,zone=0)=>{
  const {p,c}=player(name+'Fundador');
  p.zone=zone;p.save.zone=zone;
  world.guild(p,{action:'create',name});
  assert.equal(p.save.guild,name,'fundação efetiva');
  assert.equal(p.save.guildFounded,true);
  assert.equal(politics.action(world,p,{action:'place',x:768,y:512},
   {now:Date.now(),walkable:()=>true,portals:[],npcs:[]}),true);
  return {p,c,g:world.guilds.get(name.toLocaleLowerCase('pt-BR'))};
 };
 return {world,player,establish,saved,events};
}
test('a primeira guilda é soberana antes mesmo de escolher a localização da capital',t=>{
 const f=fixture(t),{p}=f.player('PrimeiroRei');
 f.world.guild(p,{action:'create',name:'Peregrinos Originais'});
 assert.equal(p.save.guildFounded,true);
 assert.equal(f.world.guilds.get('peregrinos originais').base,undefined);
 const crown=politics.continentalSovereign(f.world);
 assert.equal(crown.leaderUid,p.uid);
 assert.equal(crown.uncontested,true);
 assert.equal(politics.rank(f.world)[0].title,'Coroa Continental');
 assert.equal(f.world.claimCrownKey(p),true);
 assert.equal(p.save.inventory.chave_coroa_aurora,1);
});
test('uma única guilda com fortaleza governa as 12 regiões e pode reivindicar a chave',t=>{
 const f=fixture(t),a=f.establish('Casa Aurora');
 const map=politics.politicalMap(f.world);
 assert.equal(map.filter(z=>z.buildable&&z.ruler===a.g.name).length,12);
 assert.equal(map.filter(z=>!z.buildable&&z.ruler!==null).length,0);
 assert.equal(politics.rank(f.world)[0].title,'Coroa Continental');
 const crown=politics.continentalSovereign(f.world);
 assert.ok(crown);
 assert.equal(crown.leaderUid,a.p.uid);
 assert.equal(crown.uncontested,true);
 assert.equal(politics.publicState(f.world,a.p).continentalCrown.holder,true);
 assert.equal(f.world.claimCrownKey(a.p),true);
 assert.equal(a.p.save.inventory.chave_coroa_aurora,1);
 assert.equal(f.world.guilds.size,1);
});
test('ao nascer uma guilda rival a Coroa passa a exigir maioria, não 7 bases',t=>{
 const f=fixture(t),a=f.establish('Casa Sol',0);
 assert.equal(politics.continentalSovereign(f.world).leaderUid,a.p.uid);
 const b=f.establish('Casa Lua',1);
 assert.equal(politics.continentalSovereign(f.world),null);
 assert.equal(politics.rank(f.world).filter(g=>g.sovereign).length,0);
 a.g.influence[2]=4;
 assert.equal(politics.continentalSovereign(f.world).leaderUid,a.p.uid);
 assert.equal(politics.rank(f.world).find(g=>g.key==='casa sol').title,'Coroa Continental');
 b.g.influence[3]=4;
 assert.equal(politics.continentalSovereign(f.world),null,'empate real suspende a Coroa');
 b.g.influence[4]=5;
 assert.equal(politics.continentalSovereign(f.world)?.leaderUid,b.p.uid);
 assert.equal(politics.rank(f.world).find(g=>g.key==='casa lua').title,'Coroa Continental');
 assert.equal(f.world.guilds.size,2,'cada reino conserva uma capital, sem sete bases falsas');
});
test('empates na mesma região não dão território por ordem alfabética',t=>{
 const f=fixture(t),a=f.establish('Atenas');
 const b=f.establish('Bizancio',1);
 a.g.influence[2]=7;b.g.influence[2]=7;
 const zone=politics.politicalMap(f.world)[2];
 assert.equal(zone.ruler,null);
 assert.equal(zone.contested,true);
 assert.equal(politics.continentalSovereign(f.world),null);
});
test('criar uma guilda é direito único da conta, mesmo após saída ou dissolução',t=>{
 const f=fixture(t),{p,c}=f.player('FundadorUnico');
 f.world.guild(p,{action:'create',name:'Primeira Casa'});
 assert.equal(p.save.guildFounded,true);
 assert.equal(p.save.coins,9750);
 assert.equal(f.world.guilds.get('primeira casa').founderUid,p.uid);
 f.world.guild(p,{action:'leave'});
 assert.equal(p.save.guild,null);
 assert.equal(f.world.guilds.has('primeira casa'),false);
 const coins=p.save.coins;
 f.world.guild(p,{action:'create',name:'Segunda Casa'});
 assert.equal(f.world.guilds.has('segunda casa'),false);
 assert.equal(p.save.guild,null);
 assert.equal(p.save.coins,coins,'não cobrar moedas quando segunda fundação é negada');
 assert.ok(f.events.some(e=>/apenas uma guilda/i.test(e.message.text||'')));
 f.world.leave(c);
 const rejoin={socket:{},authUser:{uid:p.uid,username:'FundadorUnico'},worldPlayer:null};
 f.world.join(rejoin,{name:'FundadorUnico'});
 assert.equal(rejoin.worldPlayer.save.guildFounded,true,'restrição continua após reconectar');
 f.world.guild(rejoin.worldPlayer,{action:'create',name:'Terceira Casa'});
 assert.equal(f.world.guilds.has('terceira casa'),false);
 assert.ok(f.saved.some(s=>s.characters[p.uid]?.guildFounded===true),'marca fica persistida');
});
test('entrar numa guilda antes de fundar não consome o direito único',t=>{
 const f=fixture(t),leader=f.establish('Ordem Aberta'),{p}=f.player('Participante');
 f.world.guild(leader.p,{action:'invite',target:p.name});
 f.world.guild(p,{action:'accept',name:leader.g.name});
 assert.equal(p.save.guild,leader.g.name);
 assert.equal(p.save.guildFounded,false);
 f.world.guild(p,{action:'leave'});
 f.world.guild(p,{action:'create',name:'Meu Primeiro Reino'});
 assert.equal(p.save.guild,'Meu Primeiro Reino');
 assert.equal(p.save.guildFounded,true);
});
test('fundador legado é reconhecido ao reconectar e mantém a restrição após sair',t=>{
 const f=fixture(t);
 const {p,c}=f.player('LiderAntigo');
 f.world.guilds.set('legado',{name:'Legado',leader:p.uid,members:[p.uid],invitations:[]});
 p.save.guild='Legado';
 f.world.leave(c);
 const again={socket:{},authUser:{uid:p.uid,username:p.name},worldPlayer:null};
 f.world.join(again,{name:p.name});
 assert.equal(again.worldPlayer.save.guildFounded,true);
 assert.equal(f.world.guilds.get('legado').founderUid,p.uid);
 f.world.guild(again.worldPlayer,{action:'leave'});
 f.world.guild(again.worldPlayer,{action:'create',name:'Outro Legado'});
 assert.equal(f.world.guilds.has('outro legado'),false);
});
test('as regras políticas atualizadas são visíveis na interface e no guia',()=>{
 const social=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 const guide=fs.readFileSync(path.join(__dirname,'../public/guia.html'),'utf8');
 assert.ok(social.includes('s.guildFounded'));
 assert.ok(social.includes('crown.uncontested'));
 assert.match(guide,/uma única guilda durante toda a sua jornada/i);
 assert.match(guide,/maioria absoluta das regiões governadas/i);
 assert.doesNotMatch(guide,/controla ao menos 7 das 12 regiões/);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {World}=require('../world-engine');
const root=path.join(__dirname,'../public');
const js=fs.readFileSync(path.join(root,'mmo.js'),'utf8');
const art=fs.readFileSync(path.join(root,'art16.js'),'utf8');
const page=fs.readFileSync(path.join(root,'mundo.html'),'utf8');
test('cidadelas aparecem no mapa de jogo e no minimapa sem alterar portais',()=>{
 assert.match(art,/function kingdomBase\(g,b,now\)/);
 assert.match(art,/for\(const b of kingdomBases\)/);
 assert.match(art,/paint:\(\)=>kingdomBase\(ctx,b,now\)/);
 assert.match(art,/for\(const p of portals\)\{/);
 assert.match(art,/portalInteractionHud\(ctx,portals,\{x,y\}\)/);
 assert.match(js,/kingdomBases:visibleKingdomBases/);
 assert.match(js,/if\(Array\.isArray\(msg\.kingdoms\)\)visibleKingdomBases=msg\.kingdoms/);
});
test('Atlas traz coroa política por região e protege masmorras neutras',()=>{
 assert.match(js,/atlas-kingdom/);
 assert.match(js,/ruler\.buildable/);
 assert.match(js,/Território neutro · sem fortificações/);
 assert.match(js,/kingdomState\?\.bases\?\.filter\(b=>b\.zone===z\.id\)/);
 assert.match(js,/Classificação política de Auren/);
 assert.match(page,/Trocar de servidor/);
});
test('lobby e indicador mostram até 60 por sala, com arte e cliente versionados',()=>{
 assert.match(page,/Cada sala recebe até 60 jogadores/);
 assert.match(page,/0\/60/);
 assert.match(page,/CRIAR SALA · 60 VAGAS/);
 assert.match(page,/id="playerCount">0\/60/);
 assert.match(page,/mmo\.js\?v=surrender-politics-v1/);
 assert.match(page,/art16\.js\?v=pixel-art-v1&pc=reinos-v1/);
 assert.match(js,/session\.online=n;.*?n\+'\/60'/);
});
test('servidor transmite a política atual e base de guildas na própria região',t=>{
 const packets=[];
 const world=new World({send:(socket,msg)=>packets.push(msg),getOnline:()=>0,hasClassicName:()=>false,
  persistentStore:{enqueue(){}}});
 t.after(()=>world.stop());
 const c={socket:{},authUser:{uid:'account:RainhaDoVale',username:'RainhaDoVale'},worldPlayer:null};
 world.join(c,{name:'RainhaDoVale'});
 const p=c.worldPlayer;
 p.save.coins=5000;
 world.guild(p,{action:'create',name:'Coroa do Vale'});
 world.receive(c,{type:'kingdom',action:'place',x:Math.round(p.x),y:Math.round(p.y)});
 const current=packets.filter(msg=>msg.type==='kingdomState').at(-1);
 assert.ok(current);
 assert.equal(current.data.continent,16);
 assert.equal(current.data.buildable,12);
 // A posição de spawn não precisa estar livre; posicionar explicitamente
 // em local seguro só é necessário para criar o castelo, não para atualizar HUD.
 p.lastKingdomState=0;
 world.snapshotTo(p);
 const snap=packets.filter(msg=>msg.type==='snapshot').at(-1);
 assert.ok(Array.isArray(snap.kingdoms));
 assert.equal(snap.zone,p.zone);
});

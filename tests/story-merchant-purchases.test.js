'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {World,GOODS,MERCHANT_STOCK,storyDungeonChapter}=require('../world-engine');
const {byId}=require('../story-data');
function fixture(t){
 const messages=[];
 const w=new World({send:(socket,m)=>messages.push({socket,m}),getOnline:()=>0,hasClassicName:()=>false,
  persistentStore:{enqueue:()=>Promise.resolve(true)},autosave:false});
 t.after(()=>w.stop());
 const join=name=>{
  const c={socket:{},authUser:{uid:'account:'+name,username:name},worldPlayer:null};
  w.join(c,{name});c.worldPlayer.save.coins=6000;
  return {p:c.worldPlayer,c};
 };
 return {w,messages,join};
}
test('apenas comerciantes existentes, nas regiões corretas, oferecem poções e equipamentos',t=>{
 const f=fixture(t),{p,c}=f.join('CompradorTeste');
 const welcome=f.messages.find(x=>x.m.type==='welcome')?.m;
 assert.equal(welcome.merchants.length,4);
 assert.equal(welcome.shop.chave,undefined);
 assert.equal(GOODS.chave.storyOnly,true);
 for(const [id,items]of Object.entries(MERCHANT_STOCK)){
  const n=byId.get(id);
  assert.ok(n&&n.kind==='lore');
  assert.ok(welcome.npcs.find(x=>x.id===id&&x.zone===n.zone));
  assert.ok(items.every(item=>!GOODS[item].storyOnly));
 }
 assert.equal(f.w.buy(p,'pocao'),false,'compra global deve ser recusada');
 assert.equal(p.save.inventory.pocao,3);
});
test('compra ocorre só depois de conversa real com vendedor do mapa e respeita estoque',t=>{
 const f=fixture(t),{p}=f.join('ClienteTeste'),seller=byId.get('morador-0');
 const coins=p.save.coins;
 p.zone=seller.zone;p.x=seller.x-10;p.y=seller.y-10;
 assert.equal(f.w.buy(p,'pocao',seller.id),false,'não permite comando sem conversa');
 f.w.talk(p,seller.id);
 const dialogue=f.messages.find(x=>x.m.type==='dialogue')?.m;
 assert.ok(dialogue.merchant.some(x=>x.id==='pocao'));
 assert.equal(dialogue.merchant.some(x=>x.id==='chave'),false);
 assert.equal(f.w.buy(p,'pocao',seller.id),true);
 assert.equal(p.save.coins,coins-GOODS.pocao.price);
 assert.equal(p.save.inventory.pocao,4);
 assert.equal(f.w.buy(p,'superpocao',seller.id),false,'vendedor não tem essa mercadoria');
 assert.equal(f.w.buy(p,'chave',seller.id),false,'chave narrativa não é mercadoria');
 assert.equal(f.w.buy(p,'chave_coroa_aurora',seller.id),false,'chave política não é mercadoria');
 p.x+=350;assert.equal(f.w.buy(p,'pocao',seller.id),false,'não vender de longe');
 p.x=seller.x;p.y=seller.y;p.lastTalk=Date.now()-130000;
 assert.equal(f.w.buy(p,'pocao',seller.id),false,'conversa vencida precisa ser renovada');
});
test('troca entre jogadores não vende nem transfere chaves narrativas',t=>{
 const f=fixture(t),first=f.join('DoadorTeste'),second=f.join('ReceptorTeste');
 first.p.save.inventory.chave=3;first.p.save.inventory.chave_coroa_aurora=1;
 second.p.zone=first.p.zone;second.p.x=first.p.x;second.p.y=first.p.y;
 const before=f.w.pendingTrades.size;
 for(const id of ['chave','chave_coroa_aurora'])
  f.w.trade(first.p,{action:'offer',target:second.p.name,item:id,count:1,gold:1});
 assert.equal(f.w.pendingTrades.size,before);
 assert.equal(first.p.save.inventory.chave,3);
 assert.equal(first.p.save.inventory.chave_coroa_aurora,1);
});
test('chave por moedas não contorna capítulos; permissão da história sobrevive às reentradas',t=>{
 const f=fixture(t),{p}=f.join('ExploradorTeste');
 assert.equal(storyDungeonChapter(12),1);
 assert.equal(storyDungeonChapter(13),4);
 assert.equal(storyDungeonChapter(14),8);
 p.save.inventory.chave=100;p.zone=1;p.save.zone=1;
 f.w.travel(p,12);assert.equal(p.zone,1);
 p.save.story.stage=2;
 f.w.travel(p,12);assert.equal(p.zone,12);
 f.w.travel(p,1);assert.equal(p.zone,1);
 f.w.travel(p,12);assert.equal(p.zone,12);
 assert.equal(p.save.inventory.chave,100,'chave não é consumida por retorno');
 p.zone=21;p.save.zone=21;
 f.w.travel(p,13);assert.equal(p.zone,21,'sexto subsolo não ignora missão seguinte');
 p.save.story.stage=5;f.w.travel(p,13);assert.equal(p.zone,13);
 p.zone=27;p.save.zone=27;f.w.travel(p,14);assert.equal(p.zone,27);
 p.save.story.stage=9;f.w.travel(p,14);assert.equal(p.zone,14);
});
test('menu de comércio exibe NPCs; fundar outra guilda após sair não é bloqueado',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 const guide=fs.readFileSync(path.join(__dirname,'../public/guia.html'),'utf8');
 assert.match(ui,/Comerciantes de Auren/);
 assert.match(ui,/dialogue\.merchant/);
 assert.doesNotMatch(ui,/button\('Comprar', 'buy'/);
 const recruitment=fs.readFileSync(path.join(__dirname,'../public/guild-recruitment.js'),'utf8');
 assert.match(recruitment,/create.disabled=Boolean\(character.guild\)/);
 assert.match(guide,/fundar outra guilda/);
 assert.match(guide,/Bento, o Mensageiro/);
 assert.doesNotMatch(guide,/comprada na loja/);
});

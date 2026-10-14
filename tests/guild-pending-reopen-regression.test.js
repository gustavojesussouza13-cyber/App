'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/guild-city-3d.js'),'utf8');

test('fechar e reabrir a mesma capital mantém operações de obras pendentes',()=>{
 const closing=source.split('function cleanupCity(){')[1].split("q('guild3dClose')")[0];
 const opening=source.split('function open(b,kingdom){')[1].split('function update(kingdom)')[0];
 assert.doesNotMatch(closing,/resetOperations\(\)/,
  'fechar o modal não pode apagar os recibos de construções ainda não confirmadas');
 assert.match(closing,/for\(const request of requests\.values\(\)\)/,
  'temporizadores são pausados, não descartados');
 assert.match(opening,/if\(!sameGuild\)resetOperations\(\)/,
  'operações de outras guildas continuam isoladas');
 assert.match(opening,/for\(const request of \[\.\.\.requests\.values\(\)\]\)retry\(request\)/,
  'a reabertura deve retomar cada UUID pendente');
});

test('ACK durável recebido com a cidade fechada encerra operação sem perder o registro',()=>{
 const ack=source.split('function onDurableResult(result){')[1].split('function paint(){')[0];
 assert.match(ack,/if\(!result\?\.opKey\)return/);
 assert.doesNotMatch(ack,/if\(!dlg\.open\|\|!result\?\.opKey\)return/);
 assert.match(ack,/stopRequest\(confirmedRequest\)/);
 assert.match(ack,/if\(!dlg\.open\)return/);
});

test('obra no estado do servidor continua consultando COMMIT, sem compras repetidas',()=>{
 const retry=source.split('function retry(request){')[1].split('function sendOperation(')[0];
 assert.match(retry,/isPersisted\(request\.building\)/);
 assert.match(retry,/action:'inspect',requestId:request\.id,opKey:request\.opKey/);
 assert.match(retry,/request\.timer=setTimeout\(\(\)=>retry\(request\),4000\)/);
 assert.match(source,/:'Validando…'\)/,
  'contagem provisória vencida não deve ficar visualmente presa em 00:00*');
});

test('páginas da capital carregam nova versão do script sem reutilizar cache antigo',()=>{
 const world=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 const demo=fs.readFileSync(path.join(__dirname,'../public/cidade-demo.html'),'utf8');
 assert.ok(world.includes('/guild-city-3d.js?v=pedestrians-upgrade-v4'));
 assert.ok(demo.includes('/guild-city-3d.js?v=pedestrians-upgrade-v4'));
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const nav=fs.readFileSync(path.join(__dirname,'../public/classic-return.js'),'utf8');
const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
test('campanha clássica tem navegação de volta ao MMO no título e no cabeçalho',()=>{
 assert.match(nav,/VOLTar AO MUNDO ONLINE/i);
 assert.match(nav,/VOLTar À VERSÃO ONLINE \(MMORPG\)/i);
 assert.match(nav,/opts\.appendChild\(link\)/);
 assert.match(nav,/href=url/);
 assert.match(server,/classic-return\.js/);
});

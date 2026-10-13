'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const layout=require('../public/city-layout');
test('lotes novos aceitam 1x1, 2x1, 2x2 e rejeitam ruas ou sobreposição',()=>{
 const house=layout.plan('house',1,1),barracks=layout.plan('barracks',2,2);
 assert.deepEqual(layout.size(house),[1,1]);
 assert.deepEqual(layout.size(barracks),[2,2]);
 assert.equal(layout.canPlace([], 'barracks',2,2),true);
 assert.equal(layout.canPlace([barracks],'house',3,3),false);
 assert.equal(layout.canPlace([barracks],'farm',3,3),false);
 assert.equal(layout.canPlace([],'barracks',4,4),false);
 assert.equal(layout.canPlace([],'farm',4,4),false);
 assert.equal(layout.canPlace([],'market',10,2),false);
 assert.equal(layout.canPlace([],'invalid',2,2),false);
 assert.equal(layout.at([barracks],3,3),barracks);
});
test('construções históricas permanecem 1x1 e não mudam sem migração',()=>{
 const legacy={type:'barracks',x:2,y:2};
 assert.deepEqual(layout.size(legacy),[1,1]);
 assert.equal(layout.canPlace([legacy],'house',3,2),true);
 assert.equal(layout.canPlace([legacy],'house',2,2),false);
});
test('interface e servidor compartilham a mesma regra de ocupação',()=>{
 const fs=require('node:fs');const path=require('node:path');
 const server=fs.readFileSync(path.join(__dirname,'../kingdom-politics.js'),'utf8');
 const client=fs.readFileSync(path.join(__dirname,'../public/city-isometric.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 assert.match(server,/cityLayout\.canPlace/);
 assert.match(client,/layout\.canPlace/);
 assert.match(html,/city-layout\.js/);
});

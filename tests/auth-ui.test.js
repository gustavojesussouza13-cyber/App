'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');const get=p=>fs.readFileSync(path.join(root,p),'utf8');
test('mundo apresenta visitante, login e cadastro, mantendo campanha clássica intacta',()=>{
 const h=get('public/mundo.html');
 for(const id of ['guestTab','loginTab','registerTab','nameForm','loginForm','registerForm','logoutBtn'])assert.ok(h.includes('id="'+id+'"'),id);
 assert.match(h,/Visitante.*nível 1/);
 assert.doesNotMatch(h,/id="importGuest"/);
 assert.match(h,/Visitante reinicia a cada visita/);
 assert.match(h,/autocomplete="current-password"/);
 assert.match(h,/autocomplete="new-password"/);
 assert.match(get('public/mmo.js'),/\/api\/auth\/register|authPost\('register'/);
 assert.match(get('public/mmo.js'),/mode:accountMode\?'account':'guest'/);
 assert.doesNotMatch(get('public/jogo.html'),/registerForm/);
});
test('servidor recusa cadastro se DATABASE_URL está ausente, sem bloquear o visitante',()=>{
 const server=get('server.js');
 assert.match(server,/if\(!accountStore\|\|!accountStore.ready\)/);
 assert.match(server,/if\(c.mode==='world'\)/);
 assert.match(server,/world.receive\(c,data\)/);
 assert.match(server,/accountStore.initialize\(world\)/);
});

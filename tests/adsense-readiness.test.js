'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const pub=path.join(root,'public');
const read=(file)=>fs.readFileSync(path.join(pub,file),'utf8');
test('preferências de privacidade disponíveis sem falsa CMP',()=>{
 const script=read('privacy-controls.js');
 assert.match(script,/cmp\.showRevocationMessage/);
 assert.match(script,/callbackQueue\.push/);
 assert.match(script,/ainda não está disponível/);
 for(const file of ['index.html','historia.html','guia.html','sobre.html','contato.html','privacidade.html','termos.html','mundo.html']){
  const html=read(file);
  assert.match(html,/data-privacy-preferences/,file);
  assert.match(html,/privacy-controls\.js/,file);
 }
});
test('política de privacidade explica fornecedores, controles e CMP certificada',()=>{
 const p=read('privacidade.html');
 for(const t of ['terceiros','AboutAds','Configurações de anúncios','IAB TCF','Privacidade e mensagens','cookies'])assert.ok(p.includes(t),t);
 assert.match(p,/PRIVATE_SUPPORT_EMAIL/);
 assert.match(read('contato.html'),/PRIVATE_SUPPORT_EMAIL/);
});
test('servidor pronto para domínio e contato e com referenciador compatível com CMP',()=>{
 const s=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert.match(s,/PUBLIC_SITE_URL/);assert.match(s,/SUPPORT_EMAIL/);
 assert.match(s,/strict-origin-when-cross-origin/);
 assert.doesNotMatch(s,/'Referrer-Policy':'no-referrer'/);
 assert.match(s,/renderPublicText\(source,req\)/);
 assert.match(read('sitemap.xml'),/os-peregrinos-online.onrender.com/);
 assert.match(read('robots.txt'),/os-peregrinos-online.onrender.com/);
});

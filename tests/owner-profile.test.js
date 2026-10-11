'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'..','public');
const html=name=>fs.readFileSync(path.join(dir,name),'utf8');

test('apresentação do criador contém os dados autorizados',()=>{
 const sobre=html('sobre.html'),inicio=html('index.html');
 for(const value of ['Gustavo de Jesus Souza','25 anos','Curitiba','cristão','RPG'])
  assert.ok(sobre.includes(value),'faltou '+value);
 assert.match(sobre,/id="criador"/);
 assert.match(inicio,/sobre\.html#criador/);
 assert.match(sobre,/diferentes crenças ou sem religião/);
});

test('informações do PostgreSQL refletem o plano pago e exigem backups',()=>{
 for(const name of ['sobre.html','guia.html','termos.html','privacidade.html']){
  const source=html(name);
  assert.match(source,/PostgreSQL pago de 256 MB/i,name);
  assert.doesNotMatch(source,/banco gratuito.*expira.*30 dias/i,name);
  assert.match(source,/backup/i,name);
 }
});

test('as páginas preservam links de privacidade, créditos e AdSense',()=>{
 for(const name of ['index.html','sobre.html','contato.html','historia.html','guia.html','privacidade.html','termos.html']){
  const source=html(name);
  assert.match(source,/© 2026 Gustavo de Jesus Souza/);
  assert.match(source,/ca-pub-3095137602580835/);
  assert.match(source,/privacidade\.html/);
 }
 assert.match(html('contato.html'),/PRIVATE_SUPPORT_EMAIL/);
});

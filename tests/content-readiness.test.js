'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../public');
const files=['index.html','historia.html','guia.html','sobre.html','contato.html','privacidade.html','termos.html'];
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const ad='ca-pub-3095137602580835';
test('todas as páginas informativas têm texto útil, títulos e metadados próprios',()=>{
 for(const name of files){const page=read(name);
  assert.match(page,/<html lang="pt-BR">/);assert.match(page,/<title>.+<\/title>/);assert.match(page,/<meta name="description" content="[^"]+"/);assert.ok(page.length>2700,name);
  assert.match(page,/<main(?:>| )/);assert.match(page,/<footer/);
 }
});
test('navegação desktop, mobile e rodapé permitem alcançar todas as páginas essenciais',()=>{
 for(const name of files){const page=read(name);
  for(const target of ['historia.html','guia.html','sobre.html','contato.html','privacidade.html','termos.html'])
   assert.ok(page.includes('/'+target),`${name} não aponta para ${target}`);
 }
});
test('AdSense continua uma vez por head, ads.txt e conteúdo do jogo preservado',()=>{
 for(const name of files.concat('mundo.html')){
  const head=read(name).split('</head>')[0];
  assert.equal(head.split(ad).length-1,1,name);
 }
 assert.equal(read('ads.txt').trim(),'google.com, pub-3095137602580835, DIRECT, f08c47fec0942fa0');
 assert.doesNotMatch(read('jogo.html'),/ca-pub-3095137602580835/);
 assert.match(read('mundo.html'),/id="game"/);
});
test('conteúdo narrativo e guias correspondem aos recursos do projeto',()=>{
 const history=read('historia.html'), guide=read('guia.html'),about=read('sobre.html');
 for(const name of ['Lia, a Acendedora','Cálen','Sino da Aurora'])assert.ok(history.includes(name));
 for(const k of ['Peregrino','Guardião','Arqueiro','Curandeiro','WASD','Mundo Aberto'])assert.ok(guide.includes(k));
 assert.match(about,/10 jogadores simultâneos/);
 assert.match(about,/banco externo|armazenamento local/);
});
test('política contém cookies, personalização e contatos sem expor informações sensíveis',()=>{
 const policy=read('privacidade.html'),contact=read('contato.html');
 for(const required of ['cookies','Google AdSense','Configurações de anúncios','dados pessoais','Render','temporário','consentimento'])assert.ok(policy.includes(required),required);
 assert.match(contact,/github.com\/gustavojesussouza13-cyber\/App\/issues\/new\/choose/);
 assert.match(contact,/não envie/i);
});
test('robots e sitemap existem e o servidor devolve XML com MIME correto',()=>{
 assert.match(read('robots.txt'),/Sitemap: https:\/\/os-peregrinos-online.onrender.com\/sitemap.xml/);
 const sitemap=read('sitemap.xml');
 for(const page of files.slice(1))assert.ok(sitemap.includes('/'+page));
 const server=fs.readFileSync(path.join(root,'../server.js'),'utf8');
 assert.match(server,/application\/xml; charset=utf-8/);
});

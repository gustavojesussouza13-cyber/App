'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const publisher='ca-pub-3095137602580835';

test('AdSense está instalado uma vez dentro do head nas páginas públicas',()=>{
 for(const file of ['index.html','mundo.html','sobre.html']){
  const html=fs.readFileSync(path.join(root,'public',file),'utf8');
  const head=html.slice(html.indexOf('<head>')+6,html.indexOf('</head>'));
  assert.equal(head.split('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js').length-1,1,file);
  assert.match(head,new RegExp(publisher));
  assert.match(head,/crossorigin="anonymous"/);
  assert.match(head,/<script async/);
 }
});

test('ads.txt autoriza somente o identificador fornecido',()=>{
 const data=fs.readFileSync(path.join(root,'public','ads.txt'),'utf8').trim();
 assert.equal(data,'google.com, pub-3095137602580835, DIRECT, f08c47fec0942fa0');
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert.match(server,/\.txt':\s*'text\/plain; charset=utf-8'/);
});

test('a campanha clássica preserva o HTML sem anúncios sobre controles',()=>{
 const game=fs.readFileSync(path.join(root,'public','jogo.html'),'utf8');
 assert.doesNotMatch(game,/adsbygoogle\.js\?client=ca-pub-3095137602580835/);
 const policy=fs.readFileSync(path.join(root,'public','privacidade.html'),'utf8');
 assert.match(policy,/Google AdSense/);
 assert.match(policy,/consentimento/);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {MaintenanceNotices}=require('../maintenance-notices');
const read=f=>fs.readFileSync(path.join(__dirname,'../',f),'utf8');

function client(){
 const req=new EventEmitter();
 const res=new EventEmitter();
 const chunks=[];
 res.headers=null;res.destroyed=false;res.writableLength=0;
 res.writeHead=(status,headers)=>{res.status=status;res.headers=headers};
 res.write=s=>{chunks.push(s);return true};
 res.end=s=>{if(s)chunks.push(s);res.destroyed=true;res.emit('close')};
 return{req,res,chunks,get text(){return chunks.join('')}};
}
test('site publica SSE de manutenção com cabeçalhos sem cache',()=>{
 const manager=new MaintenanceNotices({limit:3,heartbeatMs:25000});
 const c=client();
 assert.equal(manager.subscribe(c.req,c.res),true);
 assert.equal(c.res.status,200);
 assert.match(c.res.headers['Content-Type'],/text\/event-stream/);
 assert.match(c.res.headers['Cache-Control'],/no-cache/);
 assert.match(c.text,/event: maintenance/);
 assert.match(c.text,/"active":false/);
 assert.equal(manager.clients.size,1);
 c.req.emit('close'); // fechar request não significa fechar SSE
 assert.equal(manager.clients.size,1);
 manager.close();
 assert.equal(manager.clients.size,0);
 assert.equal(c.res.destroyed,true);
});
test('aviso chega a todas as páginas conectadas antes do encerramento',()=>{
 const manager=new MaintenanceNotices({limit:3});
 const visitors=[client(),client(),client()];
 visitors.forEach(c=>assert.equal(manager.subscribe(c.req,c.res),true));
 const extra=client();
 assert.equal(manager.subscribe(extra.req,extra.res),false);
 assert.equal(extra.res.status,503);
 const notice=manager.announce('O servidor será atualizado em instantes.');
 assert.equal(notice.active,true);
 visitors.forEach(c=>{
  assert.match(c.text,/O servidor será atualizado em instantes/);
  assert.match(c.text,/"active":true/);
 });
 assert.equal(manager.announce('Outro aviso').message,notice.message);
 visitors[0].res.emit('close');
 assert.equal(manager.clients.size,2);
 manager.close();
});
test('injeção global aparece em todas as páginas HTML, incluindo campanha clássica',()=>{
 const server=read('server.js'),browser=read('public/site-maintenance.js');
 assert.match(server,/\/api\/maintenance\/events/);
 assert.match(server,/\/api\/maintenance\/status/);
 assert.match(server,/renderPublicText\(source,req\)/);
 assert.match(server,/return content\.includes\('<\/head>'\)\?content\.replace/);
 assert.match(server,/\/classic-return\.js/);
 assert.match(server,/\/site-maintenance\.js\?v=maintenance-v1/);
 assert.match(browser,/new EventSource\('\/api\/maintenance\/events'\)/);
 assert.match(browser,/document\.fullscreenElement\|\|document\.body/);
 assert.match(browser,/aria-live/);
 assert.match(browser,/textContent=message|detail\.textContent=message/);
 assert.doesNotThrow(()=>new vm.Script(browser));
});
test('desligamento do Render envia aviso e aguarda antes de cortar conexões',()=>{
 const server=read('server.js');
 assert.match(server,/for\(const sig of \['SIGTERM','SIGINT'\]\)/);
 const announcement=server.indexOf('maintenanceNotices.announce(');
 const broadcast=server.indexOf('for(const c of sockets)send(c.socket,notice)');
 const close=server.indexOf('for(const c of [...sockets])terminate(c)');
 assert.ok(announcement>0&&broadcast>announcement&&close>broadcast);
 assert.match(server,/setTimeout\(shutdown,3000\)\.unref\(\)/);
 assert.match(read('public/mmo.js'),/OsPeregrinosMaintenance\?\.notify\(msg\)/);
});
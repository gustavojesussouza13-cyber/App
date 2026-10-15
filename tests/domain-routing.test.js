'use strict';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const http=require('node:http');
const path=require('node:path');
const PORT=31977,BASE=`http://127.0.0.1:${PORT}`;
const worker=spawn(process.execPath,['server.js'],{
 cwd:path.resolve(__dirname,'..'),
 env:{...process.env,PORT:String(PORT),PUBLIC_SITE_URL:''},stdio:['ignore','pipe','pipe']
});
worker.stderr.on('data',v=>process.stderr.write(v));
after(()=>worker.kill('SIGTERM'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){
 for(let i=0;i<60;i++){try{if((await fetch(BASE+'/health')).ok)return}catch{}await sleep(40)}
 throw Error('server failed to launch');
}
const get=(route,host)=>new Promise((resolve,reject)=>{
  const req=http.get({hostname:'127.0.0.1',port:PORT,path:route,headers:{Host:host}},res=>{
   assert.equal(res.statusCode,200);let body='';res.setEncoding('utf8');
   res.on('data',s=>body+=s);res.on('end',()=>resolve(body));res.on('error',reject);
  });req.on('error',reject);
});
test('site displays its connected canonical domain also through the Render fallback host',async()=>{
 await ready();
 const html=await get('/','os-peregrinos-online.onrender.com');
  assert.match(html,/canonical" href="https:\/\/www\.cronicasdaaurora\.com\.br\//);
 const sitemap=await get('/sitemap.xml','os-peregrinos-online.onrender.com');
 assert.match(sitemap,/os-peregrinos-online\.onrender\.com/);
});
test('registered domain is recognized for canonicals, sitemap, robots and privacy',async()=>{
 for(const host of ['cronicasdaaurora.com.br','www.cronicasdaaurora.com.br']){
  const html=await get('/',''+host);
  assert.match(html,/canonical" href="https:\/\/www\.cronicasdaaurora\.com\.br\//);
  const sitemap=await get('/sitemap.xml',host);
  assert.match(sitemap,/https:\/\/cronicasdaaurora\.com\.br\/privacidade\.html/);
  const robots=await get('/robots.txt',host);
  assert.match(robots,/Sitemap: https:\/\/cronicasdaaurora\.com\.br\/sitemap\.xml/);
  const privacy=await get('/privacidade.html',host);
  assert.match(privacy,/https:\/\/cronicasdaaurora\.com\.br\/privacidade\.html/);
 }
});
test('untrusted host header cannot inject SEO domain',async()=>{
 const html=await get('/','attacker.example');
  assert.match(html,/canonical" href="https:\/\/www\.cronicasdaaurora\.com\.br\//);
 assert.doesNotMatch(html,/attacker\.example/);
});

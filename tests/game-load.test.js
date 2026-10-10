'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

test('motor do jogo inicializa com nome personalizado (ambiente simulado)',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../public/jogo.html'),'utf8');
 const m=source.match(/<script>\(\(\)=>\{[\s\S]*?<\/script>/);
 assert.ok(m,'script principal deve existir');
 const js=m[0].slice('<script>'.length,-'</script>'.length);
 const buttons=new Map();
 const noop=()=>{};
 const painter=new Proxy({imageSmoothingEnabled:false,measureText(s){return {width:String(s).length*8}}},{get:(t,k)=>k in t?t[k]:noop,set:(t,k,v)=>(t[k]=v,true)});
 function node(id=''){
  if(!buttons.has(id)){
   const n={id,hidden:true,width:512,height:288,style:{},value:'',textContent:'',innerHTML:'',checked:false,paused:true,complete:true,naturalWidth:40,children:[],classList:{add:noop,remove:noop,toggle:noop},addEventListener:noop,appendChild(x){this.children.push(x)},getContext:()=>painter,setAttribute:noop,getAttribute:()=>'',setPointerCapture:noop,focus:noop,select:noop,pause:noop,play:()=>Promise.resolve(),setRangeText:noop,decode:()=>Promise.resolve()};
   buttons.set(id,n)
  }return buttons.get(id)
 }
 const document={getElementById:node,querySelectorAll:()=>[],createElement:()=>node(Math.random()+''),addEventListener:noop,hidden:false};
 const storage={getItem:k=>k==='os-peregrinos-name'?'Tomas Online':null,setItem:noop,removeItem:noop};
 const windowObj={innerWidth:1280,innerHeight:720,addEventListener:noop,AudioContext:undefined,speechSynthesis:null};
 class Img {complete=true;naturalWidth=16;naturalHeight=16;decode(){return Promise.resolve()}set src(v){this._src=v}get src(){return this._src}}
 class WS{static OPEN=1;constructor(url){this.readyState=0;this.url=url}addEventListener(){}send(){}}
 const context=vm.createContext({document,window:windowObj,Image:Img,Audio:Img,WebSocket:WS,sessionStorage:storage,localStorage:storage,crypto:{randomUUID:()=> 'ec2f408a-5a67-4562-aa21-10afdef01891'},location:{protocol:'http:',host:'localhost:3000',assign:noop,replace:noop},navigator:{},performance:{now:()=>0},requestAnimationFrame:noop,console,Math,Date,setTimeout,clearTimeout,URL,Array,Object,Map,Set,Promise,Number,String,JSON,Symbol,Uint8Array,TextDecoder,atob:()=>'',btoa:()=>'',unescape,encodeURIComponent});
 vm.runInContext(js,context,{timeout:15000});
 await new Promise(r=>setTimeout(r,20));
 assert.equal(windowObj.OsPeregrinosOnline.name,'Tomas Online');
 assert.match(node('paper').children[0].textContent,/Os Peregrinos.*Tomas Online/);
 assert.ok(node('paper').children.length>=3);
});

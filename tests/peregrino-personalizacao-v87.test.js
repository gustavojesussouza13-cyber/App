'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const app=require('../public/appearance16.js'),a=require('../public/peregrino-atelier-v87.js');
const {World}=require('../world-engine.js');
const read=p=>fs.readFileSync(path.join(__dirname,'../public',p),'utf8');
test('V8.7 shared SERVER appearance options validate all seven values including pink and no cape',()=>{
 const choices={skin:'escuro',hairStyle:'longo',hairColor:'rosa',eyes:'verde',outfit:'grafite',cape:'sem_capa',accessory:'amuleto'};
 assert.deepEqual(app.normalize(choices),choices);
 for(const v of ['rosa','branco','vermelho','grafite'])assert.equal(app.normalize({outfit:v}).outfit,v);
 assert.equal(app.DEFAULT.cape,'nenhuma');
 assert.equal(app.OPTIONS.cape.sem_capa,'Sem capa');
});
test('V8.7 removes real cloak pixels, paints back tunic; cape and tunic are independently recolorable',()=>{
 const original=new Uint8ClampedArray(64*80*4);
 const at=(x,y)=>(y*64+x)*4;
 for(const [x,y] of [[15,60],[31,60],[31,45],[31,42]])original.set([40,83,180,255],at(x,y));
 const same=new Uint8ClampedArray(original);a.repaintRGBA(same,app.DEFAULT,0,0);assert.deepEqual(same,original);
 const remove=new Uint8ClampedArray(original);a.repaintRGBA(remove,{...app.DEFAULT,cape:'sem_capa'},0,0);
 assert.equal(remove[at(15,60)+3],0,'fabric silhouette removed');
 const hem=new Uint8ClampedArray(original);
 hem.set([221,181,112,255],at(15,65));
 a.repaintRGBA(hem,{...app.DEFAULT,cape:'sem_capa'},0,0);
 assert.equal(hem[at(15,65)+3],0,'gold cape hem disappears, rather than floating after removal');
 assert.equal(remove[at(31,60)+3],255,'stitched tunic painted below old cloak');
 assert.notDeepEqual(remove.slice(at(31,60),at(31,60)+3),original.slice(at(31,60),at(31,60)+3));
 const cloak=new Uint8ClampedArray(original);a.repaintRGBA(cloak,{...app.DEFAULT,cape:'rosa'},0,0);
 assert.notDeepEqual(cloak.slice(at(15,60),at(15,60)+3),original.slice(at(15,60),at(15,60)+3));
 const outfit=new Uint8ClampedArray(original);a.repaintRGBA(outfit,{...app.DEFAULT,outfit:'rosa'},2,0);
 assert.notDeepEqual(outfit.slice(at(31,42),at(31,42)+3),original.slice(at(31,42),at(31,42)+3));
});
test('V8.7 every outfit and skin selection changes approved frame pixels',()=>{
 for(const v of Object.keys(a.OUTFITS)){
  const rgba=new Uint8ClampedArray(64*80*4),i=(40*64+31)*4;rgba.set([35,76,151,255],i);
  a.repaintRGBA(rgba,{...app.DEFAULT,outfit:v},2,0);
  assert.notDeepEqual(Array.from(rgba.slice(i,i+3)),[35,76,151],v);
 }
 for(const v of ['claro','oliva','bronze','escuro','profundo']){
  const rgba=new Uint8ClampedArray(64*80*4),i=(42*64+31)*4;rgba.set([180,125,90,255],i);
  a.repaintRGBA(rgba,{...app.DEFAULT,skin:v},2,0);
  assert.notDeepEqual(Array.from(rgba.slice(i,i+3)),[180,125,90],v);
 }
});
test('V8.7 account World.changeAppearance saves, broadcasts and sends back all seven choices',()=>{
 const chosen={skin:'profundo',hairStyle:'tranca',hairColor:'rosa',eyes:'cinza',outfit:'rosa',cape:'sem_capa',accessory:'tiara'};
 const p={id:'x',uid:'u',isAccount:true,socket:{},lastAppearanceChange:0,save:{appearance:app.DEFAULT}};
 let n=0,reply=null,news=null;
 const w={saved:{characters:{}},serializePlayer:q=>structuredClone(q.save),send:(_s,r)=>{reply=r},ownStatus:q=>({appearance:q.save.appearance}),broadcast:r=>{news=r},tell:()=>{throw Error('rejected')},persist:()=>{n++;return true}};
 assert.equal(World.prototype.changeAppearance.call(w,p,chosen),true);
 assert.deepEqual(w.saved.characters.u.appearance,chosen);
 assert.deepEqual(app.normalize(w.saved.characters.u.appearance),chosen);
 assert.deepEqual(reply.appearance,chosen);
 assert.deepEqual(news.appearance,chosen);
 assert.equal(n,1);
});
test('V8.7 creation editor, preview, all 44 frames use same field-preserving compositor',()=>{
 const hero=read('peregrino-nova-estetica-v85.js'),html=read('mundo.html'),lab=read('laboratorio-peregrino-v85.html');
 assert.ok(hero.includes('OsPeregrinosPeregrinoAtelierV87'));
 assert.ok(hero.includes('atelier.drawDetails(ctx,a,dir,row)'));
 assert.ok(html.indexOf('/peregrino-atelier-v87.js')<html.indexOf('/peregrino-nova-estetica-v85.js'));
 assert.ok(lab.includes('id="cape"')&&lab.includes('id="accessory"'));
 assert.ok(lab.includes("cape:$('cape').value,accessory:$('accessory').value"));
 assert.ok(read('appearance-editor.js').includes('PERSONALIZAÇÃO DA CLASSE V8.7'));
});

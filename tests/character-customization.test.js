'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const appear=require('../public/appearance16');
const studio=require('../public/sprite-studio');
const {World}=require('../world-engine');
function fixture(t){
 const received=[];
 const world=new World({autosave:false,persistentStore:{enqueue:async()=>true},getOnline:()=>0,
  hasClassicName:()=>false,send:(sock,payload)=>received.push({sock,payload})});
 t.after(()=>world.stop());
 return {world,received};
}
function entry(world,name,{uid=null,token=null,role='peregrino',appearance=null}={}){
 const c={socket:{},authUser:uid?{uid,username:name}:null,worldPlayer:null};
 world.join(c,{name,token:token||'a'.repeat(64),role,appearance});return c;
}
test('conjunto de escolhas fechado e normalização independente de classe',()=>{
 const opts=appear.OPTIONS;
 assert.deepEqual(Object.keys(opts),['skin','hairStyle','hairColor','eyes','outfit','cape','accessory']);
 const a=appear.normalize({skin:'escuro',hairStyle:'tranca',hairColor:'ruivo',eyes:'verde',outfit:'safira',cape:'vinho',accessory:'amuleto'});
 assert.equal(a.skin,'escuro');assert.equal(a.hairStyle,'tranca');
 assert.equal(a.outfit,'safira');assert.equal(a.cape,'vinho');
 assert.deepEqual(appear.normalize({skin:'__proto__',cape:{bad:true},outfit:'bad'}),appear.DEFAULT);
 assert.equal(appear.key(a),appear.key({...a}));
 assert.notEqual(appear.key(a),appear.key({...a,eyes:'azul'}));
 const c=appear.palette(studio.ROLES.guardiao,a);
 assert.equal(c.coat,appear.COATS.safira[0]);assert.equal(c.skin,appear.SKIN.escuro[0]);
 assert.equal(c.hair,appear.HAIR.ruivo[0]);
 assert.equal(c.edge,studio.ROLES.guardiao.edge);
 assert.equal(c.metal,studio.ROLES.guardiao.metal);
 assert.notEqual(studio.ROLES.guardiao.coat,c.coat,'não mutar a paleta original da classe');
});
test('conta nova salva a aparência e mantém o visual após desconectar e entrar novamente',t=>{
 const {world}=fixture(t),appearance={skin:'profundo',hairStyle:'longo',hairColor:'branco',eyes:'mel',outfit:'vinho',cape:'marinho',accessory:'tiara'};
 const first=entry(world,'HeroiConta',{uid:'account:1',appearance,role:'guardiao'});
 assert.ok(first.worldPlayer);
 assert.equal(first.worldPlayer.save.appearance.skin,'profundo');
 assert.equal(world.ownStatus(first.worldPlayer).appearance.hairColor,'branco');
 assert.equal(world.publicPlayer(first.worldPlayer).appearance.cape,'marinho');
 const id=first.worldPlayer.id;
 world.leave(first);
 const second=entry(world,'HeroiConta',{uid:'account:1',appearance:{skin:'claro'}});
 assert.ok(second.worldPlayer);
 assert.notEqual(second.worldPlayer.id,id);
 assert.equal(second.worldPlayer.save.appearance.skin,'profundo','a seleção de login não deve apagar o visual salvo');
 assert.deepEqual(world.saved.characters['account:1'].appearance,appear.normalize(appearance));
});
test('visitante escolhe aparência, reconecta na mesma sessão e começa novo em outra visita',t=>{
 const {world}=fixture(t),token='b'.repeat(64);
 const one=entry(world,'Viajante',{token,role:'arqueiro',appearance:{skin:'oliva',hairStyle:'rabo',outfit:'floresta'}});
 assert.ok(one.worldPlayer);
 assert.equal(one.worldPlayer.save.appearance.skin,'oliva');
 assert.equal(one.worldPlayer.save.appearance.hairStyle,'rabo');
 const uid=one.worldPlayer.uid;world.leave(one);
 const reconnected=entry(world,'Viajante',{token,appearance:{skin:'claro'}});
 assert.equal(reconnected.worldPlayer.uid,uid);
 assert.equal(reconnected.worldPlayer.save.appearance.skin,'oliva');
 world.leave(reconnected);
 const other=entry(world,'Outro',{token:'c'.repeat(64),appearance:{skin:'claro'}});
 assert.equal(other.worldPlayer.save.appearance.skin,'claro');
 assert.equal(world.saved.characters[uid],undefined,'visitante não é persistido no PostgreSQL');
});
test('editar aparência comunica estado atualizado ao próprio player e aos demais',t=>{
 const {world,received}=fixture(t);
 const a=entry(world,'Primeiro',{uid:'account:p1',appearance:{skin:'claro'}});
 const b=entry(world,'Segundo',{uid:'account:p2',appearance:{skin:'escuro'}});
 assert.ok(a.worldPlayer&&b.worldPlayer);
 const changed=world.changeAppearance(a.worldPlayer,{skin:'oliva',hairStyle:'tranca',eyes:'azul',cape:'musgo'});
 assert.equal(changed,true);
 assert.equal(world.saved.characters['account:p1'].appearance.skin,'oliva');
 assert.ok(received.some(x=>x.payload.type==='appearanceChanged'&&x.payload.id===a.worldPlayer.id&&x.payload.appearance.skin==='oliva'));
 assert.ok(received.some(x=>x.payload.type==='character'&&x.payload.appearance.hairStyle==='tranca'));
 assert.equal(world.publicPlayer(b.worldPlayer).appearance.skin,'escuro');
 assert.equal(world.changeAppearance(a.worldPlayer,{skin:'claro'}),false,'limitar alteração repetida');
});
test('prévia usa a mesma animação detalhada sem simplificar classes ou cachê visual',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../public/sprite-studio.js'),'utf8');
 assert.match(source,/APPEARANCE\.palette/);
 assert.match(source,/APPEARANCE\.details/);
 assert.match(source,/APPEARANCE\.key\(appearance\)/);
 assert.match(source,/ATELIER\?\.classIdentity/);
 assert.match(source,/POLISH\?\.hero/);
 const draw=fs.readFileSync(path.join(__dirname,'../public/art16.js'),'utf8');
 assert.match(draw,/studioHero=Boolean\(spriteStudio\?\.drawHero/);
 assert.match(draw,/character\(ctx,\{name,role,appearance,x,y,dir\}/);
});
test('editor e página de criação suportam visitante, conta e personalização posterior',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/mundo.html'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../public/mmo.js'),'utf8');
 for(const id of ['appearanceCreator','appearanceEditDialog','appearanceEditorBody','appearanceEditSave','appearanceChangeBtn'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/appearance-editor\.js\?v=peregrino-master64-v1/);
 assert.match(js,/formAppearance=appearanceCreator\.read\(\)/);
 assert.match(js,/type:'hello',name:session\.name,role:session\.formClass,appearance:session\.formAppearance/);
 assert.match(js,/send\('appearance',\{appearance:appearanceEditor\.read\(\)\}\)/);
 assert.match(js,/msg\.type==='appearanceChanged'/);
});

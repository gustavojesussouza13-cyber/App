'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {create}=require('../public/sounds-desktop');
function synth(){
 const notes=[];let resumed=0;
 class FakeAudioContext{
  constructor(){this.currentTime=1;this.destination={}}
  resume(){resumed++;return Promise.resolve()}
  createOscillator(){
   const events=[];
   const tone={type:'sine',frequency:{setValueAtTime:(f,t)=>events.push({f,t})},connect:()=>{},start:t=>events.push({start:t}),stop:t=>{events.push({stop:t});notes.push(events)}};
   return tone;
  }
  createGain(){return {gain:{setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{}},connect:()=>{}}}
 }
 return {FakeAudioContext,notes,get resumed(){return resumed}};
}
function button(){
 const events={};
 return {events,disabled:false,attributes:{},addEventListener:(k,fn)=>events[k]=fn,setAttribute(k,v){this.attributes[k]=v},textContent:'',title:''};
}
test('áudio desktop começa desligado e só é habilitado após clique do usuário',()=>{
 const sim=synth(),ui=button(),audio=create({AudioContextClass:sim.FakeAudioContext,desktop:true,clock:()=>1000});
 assert.equal(audio.bind(ui),true);
 assert.equal(ui.attributes['aria-pressed'],'false');
 assert.equal(audio.play('hit'),false);
 assert.equal(sim.notes.length,0);
 ui.events.click();assert.equal(audio.enabled,true);
 assert.equal(ui.attributes['aria-pressed'],'true');
 assert.equal(sim.resumed,1);
 assert.equal(audio.play('hit'),true);
 assert.ok(sim.notes.length>0);
 ui.events.click();assert.equal(audio.enabled,false);
 assert.equal(audio.play('hit'),false);
});
test('efeitos sonoros respeitam limite de repetição e apenas eventos permitidos',()=>{
 const sim=synth();let time=1000;
 const audio=create({AudioContextClass:sim.FakeAudioContext,desktop:true,clock:()=>time});
 audio.toggle();
 assert.ok(audio.events.includes('arrow'));
 assert.ok(audio.events.includes('hurt'));
 assert.equal(audio.play('arrow'),true);
 assert.equal(audio.play('arrow'),false);
 assert.equal(audio.play('hack'),false);
 time=1120;assert.equal(audio.play('arrow'),true);
 assert.ok(sim.notes.length>=4);
});
test('instâncias explicitamente desabilitadas não tentam emitir sons',()=>{
 const sim=synth(),ui=button(),touch=create({AudioContextClass:sim.FakeAudioContext,desktop:false});
 touch.bind(ui);
 assert.equal(ui.disabled,true);
 assert.equal(touch.toggle(),false);
 assert.equal(touch.play('hit'),false);
 assert.equal(sim.notes.length,0);
});
test('motor de áudio carrega antes do jogo e controle é visível em telas de toque',()=>{
 const read=file=>fs.readFileSync(path.join(__dirname,'../public',file),'utf8');
 const html=read('mundo.html'),css=read('mmo.css'),game=read('mmo.js');
 assert.ok(html.indexOf('/sounds-desktop.js')<html.indexOf('/mmo.js'));
 assert.match(html,/id="audioToggle"/);
 assert.match(css,/\.desktop-audio-toggle\{padding:7px 9px/);
 assert.match(game,/desktopAudio\.bind\(\$\('audioToggle'\)\)/);
 assert.match(game,/desktopAudio\.play\('hurt'\)/);
 assert.match(game,/desktopAudio\.play\(msg\.projectile==='arrow'\?'arrow':msg\.projectile==='holy-bolt'\?'magic':'hit'\)/);
 assert.match(read('sounds-desktop.js'),/magic:\[\[/);
});

test('pacote Runway local tem 21 arquivos MP3 com cabeçalho e tamanho válidos',()=>{
 const folder=path.join(__dirname,'../public/assets/audio');
 const expected={
  music:['tema-principal','exploracao','vilarejo','masmorra','combate','guardiao-da-aurora'],
  sfx:['espada-golpe','espada-impacto','arco-flecha','magia-fogo','magia-gelo','cura',
       'dano','criatura-ataque','passos-pedra','coletar-item','inventario-clique','portal'],
  ambience:['floresta','vilarejo','masmorra']
 };
 let total=0;
 for(const [dir,files] of Object.entries(expected))for(const name of files){
  const asset=path.join(folder,dir,name+'.mp3');
  assert.ok(fs.existsSync(asset),asset);
  const data=fs.readFileSync(asset);
  assert.ok(data.length>2048,'MP3 curto: '+asset);
  assert.ok(data.subarray(0,3).equals(Buffer.from('ID3'))||
            (data[0]===0xff&&(data[1]&0xe0)===0xe0),'cabeçalho inválido: '+asset);
  total++;
 }
 assert.equal(total,21);
});
test('troca automática de trilha e eventos Runway usam arquivos locais, sem autoplay',()=>{
 const seen=[];
 class FakeMedia{
  constructor(src){this.src=src;this.volume=0;this.loop=false;this.paused=true;seen.push(this)}
  play(){this.paused=false;return Promise.resolve()}
  pause(){this.paused=true}
 }
 const sound=create({AudioClass:FakeMedia,desktop:true});
 assert.equal(sound.play('arrow'),false);
 sound.setScene('Vila de Auren');
 assert.equal(seen.length,0,'não pode reproduzir antes da interação');
 assert.equal(sound.toggle(),true);
 assert.ok(seen.some(a=>a.src.endsWith('/music/vilarejo.mp3')));
 assert.ok(seen.some(a=>a.src.endsWith('/ambience/vilarejo.mp3')));
 assert.equal(sound.play('arrow'),true);
 assert.equal(sound.play('heal'),true);
 assert.equal(sound.play('pickup'),true);
 assert.ok(seen.some(a=>a.src.endsWith('/sfx/arco-flecha.mp3')));
 assert.ok(seen.some(a=>a.src.endsWith('/sfx/cura.mp3')));
 sound.enterCombat(true);
 assert.ok(seen.some(a=>a.src.endsWith('/music/guardiao-da-aurora.mp3')));
 sound.toggle();
 assert.equal(sound.enabled,false);
});
test('o MMORPG conecta eventos confirmados e expõe som por toque',()=>{
 const read=file=>fs.readFileSync(path.join(__dirname,'../public',file),'utf8');
 const game=read('mmo.js'),css=read('mmo.css'),server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
 assert.match(game,/OsPeregrinosAudio\.create\(\{desktop:true\}\)/);
 assert.match(game,/desktopAudio\.enterCombat\(Boolean\(msg\.boss\)\)/);
 assert.match(game,/desktopAudio\.play\('footstep'\)/);
 assert.match(game,/desktopAudio\.play\('pickup'\)/);
 assert.match(game,/desktopAudio\.setScene\(msg\.name\)/);
 assert.doesNotMatch(css,/\.desktop-audio-toggle\{display:none!important\}/);
 assert.match(server,/'\.mp3':'audio\/mpeg'/);
});

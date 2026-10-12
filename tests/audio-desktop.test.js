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
test('navegadores sem WebAudio e dispositivos de toque não tentam emitir sons',()=>{
 const sim=synth(),ui=button(),touch=create({AudioContextClass:sim.FakeAudioContext,desktop:false});
 touch.bind(ui);
 assert.equal(ui.disabled,true);
 assert.equal(touch.toggle(),false);
 assert.equal(touch.play('hit'),false);
 assert.equal(sim.notes.length,0);
});
test('efeitos desktop são carregados antes do jogo e controle fica oculto em telas de toque',()=>{
 const read=file=>fs.readFileSync(path.join(__dirname,'../public',file),'utf8');
 const html=read('mundo.html'),css=read('mmo.css'),game=read('mmo.js');
 assert.ok(html.indexOf('/sounds-desktop.js')<html.indexOf('/mmo.js'));
 assert.match(html,/id="audioToggle"/);
 assert.match(css,/@media \(hover: none\),\(pointer: coarse\)\{\.desktop-audio-toggle\{display:none!important\}\}/);
 assert.match(game,/desktopAudio\.bind\(\$\('audioToggle'\)\)/);
 assert.match(game,/desktopAudio\.play\('hurt'\)/);
 assert.match(game,/desktopAudio\.play\(msg\.projectile==='arrow'\?'arrow':'hit'\)/);
});

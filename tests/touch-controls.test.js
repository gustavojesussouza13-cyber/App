'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {create}=require('../public/touch-controls');

const read=name=>fs.readFileSync(path.join(__dirname,'../public',name),'utf8');
class FakePad {
 constructor(){this.events=new Map();this.captured=null}
 addEventListener(name,fn){this.events.set(name,fn)}
 removeEventListener(name,fn){if(this.events.get(name)===fn)this.events.delete(name)}
 getBoundingClientRect(){return {left:0,top:0,width:120,height:120}}
 setPointerCapture(id){this.captured=id}
 hasPointerCapture(id){return this.captured===id}
 releasePointerCapture(id){if(this.captured===id)this.captured=null}
 dispatch(name,values){
  const event={pointerId:1,pointerType:'touch',button:0,isPrimary:true,clientX:60,clientY:60,preventDefault(){this.prevented=true},...values};
  const handler=this.events.get(name);assert.ok(handler,`handler não registrado: ${name}`);
  handler(event);
  return event;
 }
}
function setup(){
 const pad=new FakePad(),knob={style:{}};
 const joystick=create({pad,knob});
 return {pad,knob,joystick};
}

test('joystick analógico move suavemente, normaliza alcance e retorna ao centro',()=>{
 const {pad,knob,joystick}=setup();
 const down=pad.dispatch('pointerdown',{clientX:60,clientY:60});
 assert.equal(down.prevented,true);
 assert.equal(joystick.active,true);
 assert.equal(joystick.vector.x,0);
 pad.dispatch('pointermove',{clientX:85,clientY:60});
 assert.ok(joystick.vector.x>.5&&joystick.vector.x<.7);
 assert.equal(joystick.vector.y,0);
 assert.match(knob.style.transform,/translate\(/);
 pad.dispatch('pointermove',{clientX:200,clientY:200});
 assert.ok(Math.hypot(joystick.vector.x,joystick.vector.y)<=1.00001);
 pad.dispatch('pointerup',{clientX:200,clientY:200});
 assert.equal(joystick.active,false);
 assert.equal(joystick.vector.x,0);
 assert.equal(joystick.vector.y,0);
 assert.equal(pad.captured,null);
});
test('deslocamentos pequenos não movimentam o jogador; cancelamento libera o direcional',()=>{
 const {pad,joystick}=setup();
 pad.dispatch('pointerdown',{clientX:61,clientY:60});
 assert.deepEqual(joystick.vector,{x:0,y:0});
 pad.dispatch('pointermove',{clientX:90,clientY:60});
 assert.ok(joystick.vector.x>0);
 pad.dispatch('pointercancel',{clientX:90,clientY:60});
 assert.deepEqual(joystick.vector,{x:0,y:0});
});
test('dedo secundário não pode roubar o joystick nem cancelar o movimento principal',()=>{
 const {pad,joystick}=setup();
 pad.dispatch('pointerdown',{pointerId:11,clientX:90,clientY:60});
 pad.dispatch('pointerdown',{pointerId:12,clientX:0,clientY:60});
 pad.dispatch('pointermove',{pointerId:12,clientX:0,clientY:60});
 assert.ok(joystick.vector.x>0);
 pad.dispatch('pointerup',{pointerId:12,clientX:0,clientY:60});
 assert.equal(joystick.active,true);
 pad.dispatch('pointerup',{pointerId:11,clientX:90,clientY:60});
 assert.equal(joystick.active,false);
});
test('perda de foco libera direção e permite reiniciar o controle',()=>{
 const {pad,joystick}=setup();
 pad.dispatch('pointerdown',{clientX:100,clientY:60});
 joystick.release();
 assert.equal(joystick.active,false);
 assert.equal(joystick.vector.x,0);
 pad.dispatch('pointerdown',{pointerId:5,clientX:15,clientY:60});
 assert.ok(joystick.vector.x<0);
 joystick.destroy();
 assert.equal(joystick.active,false);
 assert.equal(pad.events.size,0);
});
test('tick multiplayer aceita eixo de toque e mantém velocidade máxima original',()=>{
 const js=read('mmo.js');
 const start=js.indexOf('let lastFrame=0;function tick(t){');
 const end=js.indexOf("window.addEventListener('pagehide'",start);
 assert.ok(start>0&&end>start,'tick encontrado');
 const sendEvents=[];
 const ctx={
  Math,Set,
  document:{hidden:false,querySelector:()=>null},activeFrameMs:1000/30,
  session:{connected:true,x:300,y:300,dir:2},
  $:id=>({hidden:true}),
  moves:{up:['ArrowUp'],down:['ArrowDown'],left:['ArrowLeft'],right:['ArrowRight']},
  keys:new Set(),
  joystick:{vector:{x:1,y:0}},
  touchDevice:true,movingAt:0,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  ZONE_W:1536,ZONE_H:1024,
  send:(type,data)=>sendEvents.push({type,data}),
  canvasDraw:()=>{},requestAnimationFrame:()=>{},
  setInterval:()=>0,updatePingIndicator:()=>{}
 };
 vm.createContext(ctx);
 vm.runInContext(js.slice(start,end),ctx);
 vm.runInContext('tick(1000)',ctx);
 assert.ok(ctx.session.x>300&&ctx.session.x<=311,'movimento segue limite de velocidade');
 assert.equal(ctx.session.y,300);
 assert.equal(ctx.session.dir,1);
 assert.ok(sendEvents.some(e=>e.type==='move'));
 ctx.joystick.vector={x:0,y:0};
 const stopped=ctx.session.x;
 vm.runInContext('tick(1030)',ctx);
 assert.equal(ctx.session.x,stopped,'soltar joystick para o personagem');
});
test('botões de combate permanecem acessíveis dentro da tela cheia',()=>{
 const html=read('mundo.html'),css=read('mmo.css'),script=read('mmo.js');
 const shell=html.indexOf('id="canvasShell"'),pad=html.indexOf('id="touchControls"'),end=html.indexOf('id="deathVeil"');
 assert.ok(shell>=0&&pad>shell&&pad<end,'controles precisam estar dentro do canvas e do fullscreen');
 for(const id of ['touchPad','touchKnob','touchAttackBtn','touchSkillBtn','touchPotionBtn','touchTalkBtn']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.ok(html.indexOf('/touch-controls.js')<html.indexOf('/mmo.js'));
 assert.match(css,/\.touch-controls\[hidden\]/);
 assert.match(css,/#canvasShell:fullscreen \.touch-controls/);
 assert.match(css,/#canvasShell\.is-expanded \.touch-controls/);
 assert.match(script,/\$\('touchAttackBtn'\)\.addEventListener\('click',\(\)=>attack\(false\)\)/);
 assert.match(script,/\$\('touchSkillBtn'\)\.addEventListener\('click',\(\)=>attack\(true\)\)/);
 assert.match(script,/if\(touchDevice\)\{const v=joystick\.vector/);
 assert.match(script,/const touchRadius=touchDevice\?/);
});

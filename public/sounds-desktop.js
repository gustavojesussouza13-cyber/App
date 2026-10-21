'use strict';
/* Os Peregrinos — trilha medieval original do Runway, armazenada localmente.
   Som só começa por interação explícita; as notas originais servem como fallback. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.OsPeregrinosAudio=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const NOTES=Object.freeze({
  arrow:[[680,0,.065,'triangle'],[420,.07,.075,'sine']],
  magic:[[490,0,.1,'sine'],[740,.07,.13,'sine'],[930,.13,.12,'triangle']],
  hit:[[180,0,.09,'triangle'],[85,.05,.11,'sine']],
  hurt:[[210,0,.11,'sawtooth'],[120,.07,.12,'triangle']],
  victory:[[390,0,.14,'sine'],[590,.14,.13,'sine'],[780,.29,.23,'triangle']],
  boss:[[150,0,.19,'triangle'],[116,.17,.2,'sawtooth']],
  travel:[[260,0,.16,'sine'],[390,.13,.14,'triangle']]
 });
 const SFX=Object.freeze({
  arrow:'arco-flecha',magic:'magia-fogo',hit:'espada-impacto',
  hurt:'dano',travel:'portal',attack:'espada-golpe',
  monster:'criatura-ataque',heal:'cura',ice:'magia-gelo',
  footstep:'passos-pedra',pickup:'coletar-item',inventory:'inventario-clique'
 });
 const MUSIC=Object.freeze({
  theme:'tema-principal',exploration:'exploracao',village:'vilarejo',
  dungeon:'masmorra',combat:'combate',boss:'guardiao-da-aurora'
 });
 const AMBIENT=Object.freeze({exploration:'floresta',village:'vilarejo',dungeon:'masmorra'});
 const BASE='/assets/audio/';
 function create({AudioContextClass=null,AudioClass=null,clock=()=>Date.now(),desktop=true}={}){
  let context=null,enabled=false,control=null,currentScene='exploration',combatMode=null;
  let music=null,ambient=null,combatTimeout=null;
  const last=new Map(),fades=new Set();
  const AudioCtor=AudioClass||(typeof globalThis!=='undefined'?globalThis.Audio:null);
  function supported(){
   return !!desktop&&!!(AudioCtor||AudioContextClass||(typeof globalThis!=='undefined'&&
     (globalThis.AudioContext||globalThis.webkitAudioContext)));
  }
  function update(){
   if(!control)return;
   control.textContent=enabled?'♫ Música e som: ligado':'♪ Música e som: desligado';
   control.setAttribute('aria-pressed',String(enabled));
   control.title=enabled?'Desligar trilha sonora e efeitos':'Ligar a trilha medieval e os efeitos de Os Peregrinos';
   control.disabled=!supported();
  }
  function newMedia(url,loop=false,volume=.3){
   if(!AudioCtor)return null;
   try{
    const a=new AudioCtor(url);
    a.preload='auto';a.loop=loop;a.volume=volume;
    return a;
   }catch{return null}
  }
  function startMedia(a){
   if(!a)return false;
   try{const p=a.play();if(p&&typeof p.catch==='function')p.catch(()=>{});return true}
   catch{return false}
  }
  function cancelFades(){
   for(const id of fades)clearInterval(id);
   fades.clear();
  }
  function stop(a){
   if(!a)return;
   try{a.pause();a.currentTime=0}catch{}
  }
  function fadeOut(a){
   if(!a)return;
   const initial=Number.isFinite(a.volume)?a.volume:.2,begin=clock();
   const id=setInterval(()=>{
    const progress=Math.min(1,(clock()-begin)/650);
    try{a.volume=Math.max(0,initial*(1-progress))}catch{}
    if(progress>=1){clearInterval(id);fades.delete(id);stop(a)}
   },45);fades.add(id);
  }
  function replaceBed(kind,key){
   const old=kind==='music'?music:ambient;
   if(old?.datasetKey===key)return;
   if(old)fadeOut(old);
   const dir=kind==='music'?'music':'ambience';
   const volume=kind==='music'?.20:.11;
   const a=newMedia(BASE+dir+'/'+key+'.mp3',true,volume);
   if(a){a.datasetKey=key;startMedia(a)}
   if(kind==='music')music=a;else ambient=a;
  }
  function syncBackground(){
   if(!enabled)return;
   const scene=combatMode||currentScene;
   replaceBed('music',MUSIC[scene]||MUSIC.exploration);
   if(AMBIENT[currentScene])replaceBed('ambient',AMBIENT[currentScene]);
   else if(ambient){fadeOut(ambient);ambient=null}
  }
  function stopBackground(){
   cancelFades();stop(music);stop(ambient);music=null;ambient=null;
  }
  function toggle(){
   if(!supported())return false;
   if(enabled){enabled=false;clearTimeout(combatTimeout);stopBackground();update();return false}
   try{
    const Ctx=AudioContextClass||(typeof globalThis!=='undefined'&&
      (globalThis.AudioContext||globalThis.webkitAudioContext));
    if(Ctx&&!context)context=new Ctx();
    const result=context?.resume?.();
    if(result&&typeof result.catch==='function')result.catch(()=>{enabled=false;stopBackground();update()});
    enabled=true;update();syncBackground();return true;
   }catch{enabled=false;stopBackground();update();return false}
  }
  function bind(button){
   if(!button||typeof button.addEventListener!=='function')return false;
   control=button;button.addEventListener('click',toggle);update();return true;
  }
  function setScene(label){
   const name=String(label||'').toLocaleLowerCase('pt-BR');
   const next=/masmorra|ruína|cripta|caverna|catacumba|calabouço|templo sombrio|subterrân/.test(name)?'dungeon':
    /vila|cidade|aldeia|mercado|praça|taverna|refúgio|porto|castelo habitado/.test(name)?'village':'exploration';
   if(currentScene!==next){currentScene=next;syncBackground()}
   return next;
  }
  function enterCombat(boss=false){
   if(!enabled)return;
   combatMode=boss?'boss':combatMode==='boss'?'boss':'combat';
   syncBackground();clearTimeout(combatTimeout);
   combatTimeout=setTimeout(()=>{combatMode=null;syncBackground()},14000);
   if(typeof combatTimeout.unref==='function')combatTimeout.unref();
  }
  function synth(kind){
   if(!context||!NOTES[kind])return false;
   try{
    const when=context.currentTime;
    for(const [freq,delay,duration,wave]of NOTES[kind]){
     const osc=context.createOscillator(),gain=context.createGain();
     osc.type=wave;osc.frequency.setValueAtTime(freq,when+delay);
     gain.gain.setValueAtTime(.0001,when+delay);
     gain.gain.exponentialRampToValueAtTime(kind==='hurt'?.033:.045,when+delay+.012);
     gain.gain.exponentialRampToValueAtTime(.0001,when+delay+duration);
     osc.connect(gain);gain.connect(context.destination);
     osc.start(when+delay);osc.stop(when+delay+duration+.01);
    }
    return true;
   }catch{return false}
  }
  function play(kind){
   if(!enabled||!(SFX[kind]||NOTES[kind]))return false;
   const now=clock(),prev=last.get(kind)??-Infinity;
   const cooldown=kind==='footstep'?3300:kind==='monster'?1800:110;
   if(now-prev<cooldown)return false;
   last.set(kind,now);
   const file=SFX[kind];
   if(file&&AudioCtor){
    const a=newMedia(BASE+'sfx/'+file+'.mp3',false,kind==='footstep'?.12:.34);
    if(a&&startMedia(a))return true;
   }
   return synth(kind);
  }
  function pause(){stopBackground()}
  function resume(){if(enabled)syncBackground()}
  if(typeof document!=='undefined'&&typeof document.addEventListener==='function'){
   document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else resume()});
  }
  return {bind,toggle,play,setScene,enterCombat,pause,resume,get enabled(){return enabled},
   get supported(){return supported()},get scene(){return combatMode||currentScene},
   events:[...new Set([...Object.keys(NOTES),...Object.keys(SFX)])]};
 }
 return {create};
});

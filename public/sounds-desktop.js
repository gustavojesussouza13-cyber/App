'use strict';
/* Sons originais sintetizados, sem arquivos externos nem autoplay. Apenas desktop. */
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
 function create({AudioContextClass=null,clock=()=>Date.now(),desktop=true}={}){
  let context=null,enabled=false,last=new Map(),control=null;
  function supported(){return !!desktop&&!!(AudioContextClass||(typeof globalThis!=='undefined'&&(globalThis.AudioContext||globalThis.webkitAudioContext)))}
  function update(){
   if(!control)return;
   control.textContent=enabled?'♫ Som: ligado':'♪ Som: desligado';
   control.setAttribute('aria-pressed',String(enabled));
   control.title=enabled?'Desativar efeitos sonoros':'Ativar efeitos sonoros no PC';
   control.disabled=!supported();
  }
  function toggle(){
   if(!supported())return false;
   if(enabled){enabled=false;update();return false}
   try{
    const Ctx=AudioContextClass||(globalThis.AudioContext||globalThis.webkitAudioContext);
    if(!context)context=new Ctx();
    const result=context.resume?.();
    if(result&&typeof result.catch==='function')result.catch(()=>{enabled=false;update()});
    enabled=true;update();return true;
   }catch{enabled=false;update();return false}
  }
  function bind(button){
   if(!button||typeof button.addEventListener!=='function')return false;
   control=button;button.addEventListener('click',toggle);update();return true;
  }
  function play(kind){
   if(!enabled||!context||!NOTES[kind])return false;
   const now=clock(),prev=last.get(kind)||-Infinity;
   if(now-prev<110)return false;
   last.set(kind,now);
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
  return {bind,toggle,play,get enabled(){return enabled},get supported(){return supported()},events:Object.keys(NOTES)};
 }
 return {create};
});

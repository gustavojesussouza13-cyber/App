'use strict';
/* Aviso global de manutenção — aparece também fora do MMORPG, sem login. */
(()=>{
 if(window.OsPeregrinosMaintenance)return;
 let connected=false,active=false,hadAlert=false,warningTimer=null,restoreTimer=null;
 let banner=null,title=null,detail=null;
 const build=()=>{
  if(banner||!document.body)return;
  const style=document.createElement('style');
  style.textContent=`
#os-maintenance-banner[hidden]{display:none!important}
#os-maintenance-banner{position:fixed;top:0;left:0;right:0;z-index:2147483647;
 display:flex;align-items:center;justify-content:center;gap:12px;padding:13px 20px;
 color:#fff2d2;background:#382a24;border-bottom:3px solid #e8b56c;
 box-shadow:0 6px 23px #000a;font:600 14px/1.45 system-ui,-apple-system,sans-serif;
 text-align:center;pointer-events:auto}
#os-maintenance-banner .os-maintenance-icon{font-size:24px;line-height:1}
#os-maintenance-banner strong{display:block;font-size:15px;letter-spacing:.01em}
#os-maintenance-banner small{display:block;font-size:12px;font-weight:400;color:#ffe2bc}
#os-maintenance-banner.os-restored{background:#153b30;border-bottom-color:#82d5ae}
@media(max-width:600px){#os-maintenance-banner{padding:10px 13px;font-size:12px}
#os-maintenance-banner strong{font-size:13px}}
`;
  document.head.append(style);
  banner=document.createElement('div');
  banner.id='os-maintenance-banner';
  banner.setAttribute('role','alert');
  banner.setAttribute('aria-live','assertive');
  banner.setAttribute('aria-atomic','true');
  banner.hidden=true;
  const icon=document.createElement('span');icon.className='os-maintenance-icon';
  icon.setAttribute('aria-hidden','true');icon.textContent='⚠';
  const copy=document.createElement('div');
  title=document.createElement('strong');detail=document.createElement('small');
  copy.append(title,detail);banner.append(icon,copy);
  (document.fullscreenElement||document.body).append(banner);
 };
 const locate=()=>{if(banner){const parent=document.fullscreenElement||document.body;
  if(parent&&banner.parentNode!==parent)parent.append(banner)}};
 const display=(heading,message,restored=false)=>{
  build();if(!banner)return;locate();
  banner.classList.toggle('os-restored',restored);
  title.textContent=heading;detail.textContent=message;
  banner.hidden=false;
 };
 const restore=()=>{
  if(!hadAlert)return;
  clearTimeout(warningTimer);clearTimeout(restoreTimer);
  active=false;
  display('Servidor disponível novamente',
   'Caso a partida não retorne automaticamente, abra o jogo novamente.',true);
  restoreTimer=setTimeout(()=>{if(banner&&!active)banner.hidden=true},12000);
 };
 const notify=(payload)=>{
  if(!payload||typeof payload.active!=='boolean')return;
  clearTimeout(warningTimer);
  if(payload.active){
   active=true;hadAlert=true;clearTimeout(restoreTimer);
   display('Os Peregrinos em manutenção',
    payload.message||'O site será atualizado. A conexão poderá ser interrompida por alguns instantes.');
  }else if(active)restore();
  else if(banner&&!hadAlert)banner.hidden=true;
 };
 const outage=()=>{
  if(active||!connected)return;
  clearTimeout(warningTimer);
  warningTimer=setTimeout(()=>{
   if(active||!connected)return;
   hadAlert=true;
   display('Conexão com o servidor interrompida',
    'Pode haver manutenção ou instabilidade. Aguarde a reconexão; visitantes podem perder a jornada ao recarregar.');
  },2500);
 };
 const init=()=>{
  build();
  if(typeof EventSource==='undefined')return;
  const events=new EventSource('/api/maintenance/events');
  events.addEventListener('maintenance',event=>{
   try{notify(JSON.parse(event.data))}catch{}
  });
  events.onopen=()=>{
   const wasConnected=connected;connected=true;
   clearTimeout(warningTimer);
   if(wasConnected&&!active&&hadAlert)restore();
  };
  events.onerror=outage;
 };
 window.OsPeregrinosMaintenance=Object.freeze({notify});
 document.addEventListener('fullscreenchange',locate);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
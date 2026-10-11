'use strict';
// Tokens ficam no fragmento (#) e são removidos da barra de endereços antes de qualquer chamada.
(()=>{
 const tokenMatch=location.hash.match(/^#token=([a-f0-9]{64})$/),token=tokenMatch?.[1]||'';
 if(location.hash)history.replaceState(null,'',location.pathname+location.search);
 const $=id=>document.getElementById(id);
 async function post(route,body){
  const response=await fetch('/api/auth/'+route,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Ocorreu uma falha.');return data;
 }
 const verify=$('verifyMessage');
 if(verify){
  if(!token){verify.textContent='Link inválido ou incompleto. Solicite uma nova confirmação nas configurações de sua conta.';return}
  post('email/confirm',{token}).then(()=>{verify.textContent='E-mail confirmado! Agora você pode recuperar sua senha quando necessário.'}).catch(e=>{verify.textContent=e.message});return;
 }
 const msg=$('resetMessage'),request=$('requestResetForm'),complete=$('completeResetForm');
 if(!msg||!request||!complete)return;
 if(token){request.hidden=true;complete.hidden=false;$('resetIntro').textContent='Escolha uma nova senha. O link será invalidado após a redefinição.';}
 request.addEventListener('submit',async e=>{
  e.preventDefault();const btn=request.querySelector('button');btn.disabled=true;msg.textContent='Enviando…';
  try{const r=await post('password/forgot',{email:$('resetEmail').value});msg.textContent=r.message||'Se o e-mail estiver confirmado, enviaremos um link.';request.reset()}
  catch(err){msg.textContent=err.message}finally{btn.disabled=false}
 });
 complete.addEventListener('submit',async e=>{
  e.preventDefault();if($('newPassword').value!==$('confirmPassword').value){msg.textContent='As senhas não coincidem.';return}
  const btn=complete.querySelector('button');btn.disabled=true;msg.textContent='Alterando senha…';
  try{await post('password/reset',{token,password:$('newPassword').value});complete.reset();complete.hidden=true;msg.textContent='Sua senha foi alterada! Entre no jogo usando a nova senha.'}
  catch(err){msg.textContent=err.message}finally{btn.disabled=false}
 });
})();

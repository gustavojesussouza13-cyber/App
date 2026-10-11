/* Preferências de privacidade — utiliza exclusivamente a CMP oficial do Google, quando disponível. */
(()=>{
  'use strict';
  function notice(button,message){
    let node=button.parentElement.querySelector('.privacy-notice');
    if(!node){node=document.createElement('span');node.className='privacy-notice';node.setAttribute('role','status');button.insertAdjacentElement('afterend',node)}
    node.replaceChildren(document.createTextNode(message+' '));
    const privacy=document.createElement('a');privacy.href='/privacidade.html';privacy.textContent='Ler a política';node.appendChild(privacy);
    const google=document.createElement('a');google.href='https://myadcenter.google.com/';google.target='_blank';google.rel='noopener noreferrer';google.textContent='Preferências de anúncios no Google';node.append(' · ',google);
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-privacy-preferences]');
    if(!button)return;
    event.preventDefault();
    const cmp=window.googlefc;
    if(cmp && cmp.callbackQueue && typeof cmp.callbackQueue.push==='function' && typeof cmp.showRevocationMessage==='function'){
      cmp.callbackQueue.push(cmp.showRevocationMessage);
    }else{
      notice(button,'A mensagem de consentimento do Google ainda não está disponível nesta sessão.');
    }
  });
})();

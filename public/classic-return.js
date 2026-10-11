/* Botão de retorno ao MMO: injetado apenas na campanha clássica no servidor web. */
(()=>{
 'use strict';
 const url='/mundo';
 const header=document.querySelector('#multiplayerHeader .homeLink');
 if(header){header.href=url;header.textContent='↩ VOLTAR AO MUNDO ONLINE';header.setAttribute('aria-label','Voltar para o MMORPG Mundo Aberto');}
 const panel=document.getElementById('panel');
 const paper=document.getElementById('paper');
 if(!panel||!paper)return;
 const render=()=>{
  const title=paper.querySelector('h1');
  const opts=paper.querySelector('.opts');
  if(!title||!opts||panel.hidden||!title.textContent.includes('Os Peregrinos')||opts.querySelector('.classic-return'))return;
  const link=document.createElement('a');
  link.className='classic-return';
  link.href=url;
  link.textContent='🌐 VOLTAR À VERSÃO ONLINE (MMORPG)';
  link.setAttribute('aria-label','Sair da campanha clássica e jogar Mundo Aberto online');
  link.style.cssText='display:inline-flex;justify-content:center;align-items:center;text-align:center;min-height:43px;padding:10px 15px;border:2px solid #e2c885;background:linear-gradient(#255648,#14392e);color:#ffeab6;font:bold 14px Georgia,serif;text-decoration:none;box-shadow:2px 3px #091914;border-radius:3px;';
  opts.appendChild(link);
 };
 const observer=new MutationObserver(render);
 observer.observe(paper,{childList:true,subtree:false});
 render();
})();

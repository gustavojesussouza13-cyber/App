/* Retorno visível ao MMORPG na tela da campanha clássica — sem modificar jogo.html. */
(()=>{
 'use strict';
 const target='/mundo';
 const header=document.querySelector('#multiplayerHeader .homeLink');
 if(header){header.href=target;header.textContent='↩ VOLTAR AO MUNDO ONLINE';header.setAttribute('aria-label','Voltar para o Mundo Aberto MMORPG');}
 const panel=document.getElementById('panel');
 if(!panel)return;
 const style=document.createElement('style');
 style.textContent=`
 #classicReturnFixed{position:fixed;top:56px;right:13px;z-index:30;display:inline-flex;align-items:center;justify-content:center;min-height:42px;max-width:min(300px,65vw);padding:9px 15px;border:2px solid #e8c987;border-radius:5px;background:linear-gradient(125deg,#285f4a,#11382d);box-shadow:0 5px 18px #000b;color:#fff0bf;text-align:center;font:bold 12px/1.35 ui-monospace,monospace;text-decoration:none;letter-spacing:.03em;pointer-events:auto;text-shadow:1px 1px 3px #000;touch-action:manipulation}
 #classicReturnFixed:hover,#classicReturnFixed:focus-visible{background:#3b7857;outline:2px solid #fbe6af;outline-offset:1px}
 @media(max-width:700px){#classicReturnFixed{top:auto;bottom:8px;right:9px;max-width:calc(100vw - 18px);font-size:11px;min-height:36px;padding:7px 9px}}
 `;
 document.head.appendChild(style);
 // O link fica dentro do painel inicial e, por isso, aparece imediatamente
 // no menu mostrado na captura, mesmo que os botões da aventura mudem de lugar.
 const link=document.createElement('a');
 link.id='classicReturnFixed';
 link.href=target;
 link.textContent='🌐 VOLTAR À VERSÃO ONLINE (MMORPG)';
 link.setAttribute('aria-label','Sair da campanha clássica e jogar o Mundo Aberto online');
 panel.appendChild(link);
})();

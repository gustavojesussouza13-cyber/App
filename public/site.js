'use strict';
const form=document.getElementById('joinForm');
const input=document.getElementById('playerName');
const error=document.getElementById('joinError');
const online=document.getElementById('onlineState');
const number=document.getElementById('onlineNumber');
try{input.value=localStorage.getItem('os-peregrinos-last-name')||''}catch{}
const valid=/^[\p{L}\p{N}][\p{L}\p{N} _-]{2,17}$/u;
form.addEventListener('submit',e=>{
 e.preventDefault();const name=input.value.trim().normalize('NFC');
 if(!valid.test(name)){error.textContent='Escolha um nome entre 3 e 18 caracteres: letras, números, espaços ou hífen.';input.focus();return}
 error.textContent='';
 try{sessionStorage.setItem('os-peregrinos-name',name);localStorage.setItem('os-peregrinos-last-name',name)}catch{}
 location.href='/jogo.html';
});
async function status(){
 try{const r=await fetch('/api/status',{cache:'no-store'});if(!r.ok)throw Error('offline');const d=await r.json();
  number.textContent=d.online;online.innerHTML='<span class="status-dot"></span> Servidor online';online.classList.remove('offline');
 }catch{number.textContent='—';online.textContent='Servidor indisponível';online.classList.add('offline')}
}
status();setInterval(status,20000);

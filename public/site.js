'use strict';
const form=document.getElementById('joinForm');
const input=document.getElementById('playerName');
const error=document.getElementById('joinError');
const online=document.getElementById('onlineState');
const number=document.getElementById('onlineNumber');
let availableSlots=null;
try{input.value=localStorage.getItem('os-peregrinos-last-name')||''}catch{}
const valid=/^[\p{L}\p{N}][\p{L}\p{N} _-]{2,17}$/u;
form.addEventListener('submit',e=>{
 e.preventDefault();const name=input.value.trim().normalize('NFC');
 if(!valid.test(name)){error.textContent='Escolha um nome entre 3 e 18 caracteres: letras, números, espaços ou hífen.';input.focus();return}
 if(availableSlots===0){error.textContent='Servidor cheio: 10 de 10 jogadores online. Tente novamente quando surgir uma vaga.';return}
 error.textContent='';
 try{sessionStorage.setItem('os-peregrinos-name',name);localStorage.setItem('os-peregrinos-last-name',name)}catch{}
 location.href='/jogo.html';
});
async function status(){
 try{const r=await fetch('/api/status',{cache:'no-store'});if(!r.ok)throw Error('offline');const d=await r.json();
  availableSlots=typeof d.availableSlots==='number'?d.availableSlots:null;
  number.textContent=d.online+'/'+(d.maxPlayers||10);
  online.innerHTML=availableSlots===0?'<span class="status-dot"></span> Servidor cheio (10/10)':'<span class="status-dot"></span> Servidor online · '+availableSlots+' vagas';
  online.classList.toggle('offline',availableSlots===0);
 }catch{availableSlots=null;number.textContent='—';online.textContent='Servidor indisponível';online.classList.add('offline')}
}
status();setInterval(status,20000);

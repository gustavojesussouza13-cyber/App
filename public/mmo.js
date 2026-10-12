'use strict';
/* Os Peregrinos — interface multiplayer de mundo aberto, pixel-art gerado no navegador. */
(()=>{
const $=id=>document.getElementById(id);
const cvs=$('game'),ctx=cvs.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
const W=cvs.width,H=cvs.height,ZONE_W=1536,ZONE_H=1024;
const session={id:'',name:'',connected:false,characters:null,online:0,zones:[],portals:[],shop:{},relics:{},quests:[],npcs:[],story:null,achievements:{},monsters:new Map(),players:new Map(),zone:0,x:768,y:512,dir:2,target:null,partyInvite:null,guildInvite:null,tradeOffer:null,role:'peregrino',cameraX:0,cameraY:0,formClass:'peregrino'};
const keys=new Set(),moves={up:['KeyW','ArrowUp'],down:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight']};
const monsterMotion=window.OsPeregrinosMonsterMotion.create();
const playerMotion=window.OsPeregrinosPlayerMotion.create();
const combatFx=window.OsPeregrinosCombatFx.create();
// Eventos reais do servidor comandam poses de ataque, impacto e derrota.
const spriteActions={monsters:new Map(),players:new Map(),fallen:[],localHurtAt:0};
const latency=window.OsPeregrinosLatency.create();
// Sons são opt-in, apenas para desktop; não alteram controles móveis.
const desktopAudio=window.OsPeregrinosAudio.create({
 desktop:Boolean(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches)
});
desktopAudio.bind($('audioToggle'));
const pingIndicator=$('pingIndicator');
function updatePingIndicator(){
 const {ms,quality}=latency.state();
 pingIndicator.dataset.quality=quality;
 pingIndicator.textContent=quality==='offline'?'Ping: offline':
  quality==='checking'?'Ping: medindo…':
  quality==='timeout'?'Ping: sem resposta':'Ping: '+ms+' ms';
 pingIndicator.title=quality==='offline'?'Sem conexão multiplayer':
  quality==='checking'?'Medindo tempo de ida e volta ao servidor':
  quality==='timeout'?'Sem resposta do servidor ao teste de latência':
  'Tempo de ida e volta (RTT) entre navegador e servidor: '+ms+' ms';
}
// Controles de toque coexistem com o teclado sem alterar a velocidade validada pelo servidor.
const touchDevice=Boolean(window.matchMedia?.('(pointer: coarse)').matches||navigator.maxTouchPoints>0);
const touchUI=$('touchControls');
const joystick=window.OsPeregrinosTouchControls.create({pad:$('touchPad'),knob:$('touchKnob')});
let socket=null,reconnectMs=1000,reconnectTimer=null,movingAt=0,lastDraw=0,fx=[],toastTimer=0,lastAction=0,tab='inventory',authed=false;
let progressToken=null,accountMode=false,accountReady=false,emailRecoveryAvailable=false;
try{progressToken=localStorage.getItem('os-peregrinos-world-token');if(!progressToken){progressToken=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem('os-peregrinos-world-token',progressToken)}$('name').value=localStorage.getItem('os-peregrinos-last-name')||''}catch{$('connectionError').textContent='O armazenamento precisa estar habilitado para reconhecer seu progresso.'}
const tint=['#6d9a68','#345947','#44818a','#d4b578','#8f938e','#5f6b59','#97b673','#4a735c','#4b8ba3','#477b58','#9c8a6c','#655970','#536453','#8b6b54','#647a92','#c4a975'];
const shade=['#427444','#25573d','#37737b','#b38f4e','#697a76','#445d55','#698d55','#365b50','#35738d','#306b47','#7d6d58','#554b68','#425146','#65503e','#566b81','#a58f59'];
const alert=msg=>{const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3100)};
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rand=n=>{n=Math.imul(n^n>>>16,0x7feb352d);n=Math.imul(n^n>>>15,0x846ca68b);return(n^n>>>16)>>>0};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function say(sender,text,kind=''){const line=document.createElement('div');line.className='chat-row '+kind;
 if(sender){let strong=document.createElement('b');strong.textContent=sender+': ';line.appendChild(strong)}const span=document.createElement('span');span.textContent=String(text);line.appendChild(span);$('chatLog').appendChild(line);
 while($('chatLog').children.length>85)$('chatLog').firstElementChild.remove();$('chatLog').scrollTop=$('chatLog').scrollHeight;
}
function send(type,data={}){if(socket&&socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type,...data}))}
function setOnline(state,msg){
 session.connected=state;$('statusDot').classList.toggle('on',state);$('status').textContent=msg;
 touchUI.hidden=!state||!touchDevice;
 if(!state){joystick.release();latency.reset();updatePingIndicator();spriteActions.monsters.clear();spriteActions.players.clear();spriteActions.fallen.length=0}
}
function character(c){session.characters=c;session.zone=c.zone;session.role=c.role;session.x=c.x;session.y=c.y;
 $('charName').textContent=c.name||session.name;$('playerClass').textContent={peregrino:'Peregrino',guardiao:'Guardião',arqueiro:'Arqueiro',curandeiro:'Curandeiro'}[c.role]||c.role;
 $('playerLevel').textContent='Nível '+c.level;$('playerCoins').textContent='◈ '+c.coins+' moedas';$('hpText').textContent=c.hp+' / '+c.maxHp;
 $('xpText').textContent=c.xp+' / '+c.nextXp;$('hpBar').style.width=clamp(c.hp/c.maxHp*100,0,100)+'%';$('xpBar').style.width=clamp(c.xp/c.nextXp*100,0,100)+'%';
 session.story=c.story||null;$('kills').textContent=c.kills;$('visited').textContent=c.visited.length+'/'+(session.zones.length||40);$('zoneTitle').textContent=session.zones[c.zone]?.name||('Região '+c.zone);drawTravel();drawTab();
}
function displayOnline(n){session.online=n;$('playerCount').textContent=n+'/10';setOnline(true,'✦ '+n+'/10 peregrinos online')}
function dispatch(msg){
 if(msg.type==='pong'){if(latency.receive(msg,performance.now()))updatePingIndicator();return}
 if(msg.type==='welcome'){
 session.id=msg.self.id;session.name=msg.self.name;session.zones=msg.zones;session.portals=msg.portals||[];session.shop=msg.shop;session.relics=msg.relics||{};session.quests=msg.quests;session.achievements=msg.achievements||{};session.npcs=Array.isArray(msg.npcs)?msg.npcs:[];
 $('welcomeOverlay').hidden=true;setOnline(true,'Conectado');displayOnline(msg.online);character(msg.self);
 if(!authed){authed=true;if(msg.self.level===1&&msg.self.kills===0&&msg.self.role==='peregrino'&&session.formClass!=='peregrino')send('class',{role:session.formClass});say('','Bem-vindo, '+session.name+'! Converse com os personagens usando E ou clicando neles. A história está na aba Crônicas.','sys');if(session.story?.stage===0)alert('✦ Fale com Lia, a Acendedora! Aproxime-se e pressione E.')}
 $('game').focus();
 }else if(msg.type==='character'){character(msg);
 }else if(msg.type==='snapshot'){
  session.zone=msg.zone;displayOnline(msg.online);
  const now=new Map();for(const m of msg.monsters||[])now.set(m.id,m);
  monsterMotion.sync([...now.values()]);session.monsters=now;
  const people=new Map();for(const p of msg.players||[])people.set(p.id,p);
  playerMotion.sync([...people.values()],performance.now());session.players=people;
 }else if(msg.type==='travel'){desktopAudio.play('travel');session.zone=msg.zone;session.portals=msg.portals||[];session.x=msg.x;session.y=msg.y;session.target=null;session.monsters.clear();monsterMotion.clear();playerMotion.clear();combatFx.clear();$('zoneTitle').textContent=msg.name;alert('✦ '+msg.name);drawTravel();
 }else if(msg.type==='hit'){if(msg.zone===session.zone){
  if(typeof desktopAudio!=='undefined')desktopAudio.play(msg.projectile==='arrow'?'arrow':'hit');
  const m=session.monsters.get(msg.monster);if(m)m.hp=msg.remaining;
  spriteActions.monsters.set(msg.monster,{action:'hurt',at:performance.now()});
  if(msg.by)spriteActions.players.set(msg.by,{action:'attack',at:performance.now()});
  // O acerto é autoritativo: não dispara flechas por cliques rejeitados pelo servidor.
  const started=combatFx.fire(msg,performance.now());
  if(!started)fx.push({x:m?.x||session.x,y:m?.y||session.y,text:'−'+msg.damage,t:performance.now(),color:'#ffe5a6'});
 }
 }else if(msg.type==='monsterWindup'){if(msg.zone===session.zone){
   const m=session.monsters.get(msg.monster);
   if(m){
    spriteActions.monsters.set(msg.monster,{action:'attack',at:performance.now()});
    fx.push({x:m.x,y:m.y,text:msg.boss?'⚠ CHEFE! ESQUIVE!':'⚠ GOLPE!',t:performance.now(),color:msg.boss?'#ff9a73':'#ffd06b'});
   }
 }
 }else if(msg.type==='hurt'){spriteActions.localHurtAt=performance.now();if(typeof desktopAudio!=='undefined')desktopAudio.play('hurt');fx.push({x:session.x,y:session.y,text:'−'+msg.damage,t:performance.now(),color:'#ff8d83'});if(session.characters?.hp<=0)$('deathVeil').hidden=false;
 }else if(msg.type==='defeated'){if(msg.zone===session.zone){if(typeof desktopAudio!=='undefined')desktopAudio.play(msg.boss?'boss':'victory');
   const fallen=session.monsters.get(msg.monster);const now=performance.now();
   if(fallen){spriteActions.fallen.push({...fallen,defeatedAt:now});if(spriteActions.fallen.length>12)spriteActions.fallen.shift()}
   spriteActions.monsters.delete(msg.monster);
   fx.push({x:fallen?.x||session.x,y:fallen?.y||session.y,text:msg.boss?'★ CHEFE!':'✦ VITÓRIA!',t:now,color:'#f5d587'});
   session.monsters.delete(msg.monster);monsterMotion.sync([...session.monsters.values()])}
 }else if(msg.type==='reward'){alert('+'+msg.xp+' EXP  ·  +'+msg.gold+' moedas'+(msg.boss?' ★ CHEFE':''));
 }else if(msg.type==='chat'){say('['+msg.channel+'] '+msg.name,msg.text,msg.channel);
 }else if(msg.type==='notice'||msg.type==='system'){say('',msg.text,'sys');if(msg.type==='notice')alert(msg.text);
 }else if(msg.type==='partyInfo'){session.partyInvite=null;say('','Equipe: '+msg.members.join(', '),'sys');drawTab();
 }else if(msg.type==='partyInvite'){session.partyInvite=msg;alert('Convite de equipe de '+msg.by);drawTab();
 }else if(msg.type==='guildInvite'){session.guildInvite=msg;alert('Convite de guilda: '+msg.name);drawTab();
 }else if(msg.type==='tradeOffer'){session.tradeOffer=msg;alert('Você recebeu uma oferta de '+msg.from);drawTab();
 }else if(msg.type==='dialogue'){openDialogue(msg);
 }else if(msg.type==='storyResolved'){if(typeof desktopAudio!=='undefined')desktopAudio.play('victory');closeDialogue();say('',msg.message,'sys');alert(msg.complete?'✦ O SINO DA AURORA VOLTOU A TOCAR!':msg.reward?'✦ Novo capítulo! +'+msg.reward.xp+' EXP · +'+msg.reward.coins+' moedas':msg.message);if(msg.epilogue)showEpilogue(msg);
 }else if(msg.type==='error'){say('','Servidor: '+msg.message,'sys');$('connectionError').textContent=msg.message||'Erro de conexão';
  if(['full','name_taken','invalid_name','login_required','name_reserved','auth_unavailable'].includes(msg.code)){authed=false;$('welcomeOverlay').hidden=false;clearTimeout(reconnectTimer);socket?.close();if(msg.code==='login_required')setAuthTab('login');}
 }}
function connect(){
 if(!progressToken){alert('Armazenamento indisponível');return}
 // Evita duas conexões simultâneas e sessões concorrentes para o mesmo personagem.
 if(socket&&(socket.readyState===WebSocket.OPEN||socket.readyState===WebSocket.CONNECTING))return;
 clearTimeout(reconnectTimer);reconnectTimer=null;
 setOnline(false,'Conectando…');const url=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/world-ws';
 try{const sock=new WebSocket(url);socket=sock;
  sock.onopen=()=>{
   if(socket!==sock)return;
   reconnectMs=1000;
   sock.send(JSON.stringify({type:'hello',name:session.name,role:session.formClass,token:progressToken,mode:accountMode?'account':'guest'}));
  };
  sock.onmessage=e=>{
   if(socket!==sock)return;
   try{dispatch(JSON.parse(e.data))}catch(err){console.warn('Resposta inválida',err)}
  };
  sock.onclose=()=>{
   if(socket!==sock)return;
   socket=null;closeDialogue();setOnline(false,'Desconectado');
   session.monsters.clear();monsterMotion.clear();playerMotion.clear();combatFx.clear();session.players.clear();spriteActions.monsters.clear();spriteActions.players.clear();spriteActions.fallen.length=0;session.portals=[];
   if(!authed)return;
   clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connect,reconnectMs);
   reconnectMs=Math.min(14000,reconnectMs*1.7);
  };
  sock.onerror=()=>{if(socket===sock)setOnline(false,'Conexão instável')};
 }catch{socket=null;setOnline(false,'Falha de conexão');
  if(authed){clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connect,reconnectMs);reconnectMs=Math.min(14000,reconnectMs*1.7)}
 }
}
$('nameForm').addEventListener('submit',e=>{e.preventDefault();accountMode=false;$('logoutBtn').hidden=true;$('emailSettingsBtn').hidden=true;const name=$('name').value.trim().normalize('NFC');if(!/^[\p{L}\p{N}][\p{L}\p{N} _-]{2,17}$/u.test(name)){alert('Escolha um nome válido de 3–18 caracteres');return}
 session.name=name;session.formClass=$('role').value;try{localStorage.setItem('os-peregrinos-last-name',name)}catch{};connect();});
// Autenticação opcional. Sessão via cookie HttpOnly, nunca salvamos senha no navegador.
const AUTH_TAB_IDS={guest:'nameForm',login:'loginForm',register:'registerForm'};
function setAuthTab(tab){
 if(!AUTH_TAB_IDS[tab])return;
 for(const [key,id] of Object.entries(AUTH_TAB_IDS)){$(id).hidden=key!==tab;$(key+'Tab').classList.toggle('active',key===tab)}
 $('authMessage').textContent='';$('connectionError').textContent='';
}
for(const tab of Object.keys(AUTH_TAB_IDS))$(tab+'Tab').addEventListener('click',()=>setAuthTab(tab));
function authError(message){$('authMessage').textContent=message;}
async function authPost(route,data){
 const r=await fetch('/api/auth/'+route,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const result=await r.json();if(!r.ok)throw Error(result.error||'Não foi possível entrar.');return result;
}
function playAccount(account,role='peregrino'){
 accountMode=true;session.name=account.username;session.formClass=role;
 $('logoutBtn').hidden=false;$('emailSettingsBtn').hidden=false;try{localStorage.setItem('os-peregrinos-last-name',account.username)}catch{}
 authed=false;connect();
}
$('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!accountReady)return authError('O armazenamento de contas está indisponível.');
 const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;authError('');
 try{const r=await authPost('login',{username:$('loginName').value,password:$('loginPassword').value});$('loginPassword').value='';playAccount(r.account)}
 catch(err){authError(err.message)}finally{btn.disabled=false}
});
$('registerForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!accountReady)return authError('O armazenamento de contas está indisponível.');
 if($('registerPassword').value!==$('registerConfirm').value)return authError('As senhas não coincidem.');
 const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;authError('');
 try{const r=await authPost('register',{username:$('registerName').value,email:$('registerEmail').value,password:$('registerPassword').value,guestToken:$('importGuest').checked?progressToken:null});
 $('registerPassword').value='';$('registerConfirm').value='';playAccount(r.account,$('registerRole').value);if(r.verificationSent)alert('Verifique seu e-mail para ativar a recuperação de senha.');else alert('Sua conta foi criada. Vincule e confirme um e-mail nas configurações da conta.');}
 catch(err){authError(err.message)}finally{btn.disabled=false}
});
$('emailSettingsBtn').addEventListener('click',async()=>{
 const dialog=$('emailSettingsDialog');$('emailSettingsMessage').textContent='';
 $('emailSettingsStatus').textContent='Consultando o e-mail da conta…';
 try{const d=await fetchAuthSession();
  $('emailSettingsStatus').textContent=d.account?.emailVerified?'E-mail confirmado: '+d.account.email:'Nenhum e-mail de recuperação confirmado.';
  if(d.account?.email)$('settingsEmail').value=d.account.email;
  if(!d.emailRecoveryAvailable)$('emailSettingsMessage').textContent='Envio ainda indisponível. O responsável precisa configurar o serviço de e-mail no servidor.';
 }catch{$('emailSettingsStatus').textContent='Não foi possível consultar sua conta.'}
 if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
});
$('emailSettingsForm').addEventListener('submit',async e=>{
 e.preventDefault();const button=e.currentTarget.querySelector('[type=submit]');button.disabled=true;
 $('emailSettingsMessage').textContent='Enviando confirmação…';
 try{const r=await authPost('email/request',{email:$('settingsEmail').value,password:$('settingsPassword').value});
  $('emailSettingsMessage').textContent=r.message;$('settingsPassword').value='';
 }catch(err){$('emailSettingsMessage').textContent=err.message}finally{button.disabled=false}
});
$('logoutBtn').addEventListener('click',async()=>{
 try{await authPost('logout',{})}catch(err){authError(err.message);return}
 authed=false;accountMode=false;socket?.close();location.href='/mundo.html?auth=login';
});
// Um prazo máximo impede a tela de permanecer eternamente em "Consultando".
async function fetchAuthSession(){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),9000);
 try{
  const response=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
  if(!response.ok)throw new Error('O serviço de contas não respondeu corretamente.');
  return await response.json();
 }finally{clearTimeout(timeout)}
}
async function setupLogin(){
 const params=new URLSearchParams(location.search),requested=params.get('auth');
 if(requested==='register')setAuthTab('register');else if(requested==='login'||requested==='account')setAuthTab('login');else setAuthTab('guest');
 const label=$('authStorageStatus');
 try{
  const result=await fetchAuthSession();
  accountReady=Boolean(result.persistent);emailRecoveryAvailable=Boolean(result.emailRecoveryAvailable);
  label.textContent=accountReady?(emailRecoveryAvailable?'Contas no banco externo · recuperação por e-mail disponível após verificação.':'Contas no banco externo · envio de e-mails em configuração; modo visitante disponível.'):'Cadastro temporariamente indisponível. Você ainda pode jogar como visitante.';
  label.classList.toggle('warning',!accountReady);
  if(!accountReady)return;
  if(result.authenticated && result.account && requested!=='guest' && params.get('auto')!=='1'){
   label.textContent='Conta identificada: '+result.account.username+'. Retomando seu personagem…';
   playAccount(result.account);
  }
 }catch(err){
  accountReady=false;
  label.textContent='Não foi possível verificar as contas agora. O modo visitante continua disponível.';
  label.classList.add('warning');
 }
}
// Tela cheia nativa quando disponível; fallback expandido para navegadores Android
// que não permitem requestFullscreen em elementos arbitrários.
const fullScreenContainer=$('canvasShell'), fullScreenBtn=$('fullscreenBtn');
let expandedFullscreen=false;
function isWorldFullscreen(){return expandedFullscreen||document.fullscreenElement===fullScreenContainer}
function setExpandedFullscreen(active){
 expandedFullscreen=Boolean(active);
 fullScreenContainer.classList.toggle('is-expanded',expandedFullscreen);
 document.body.classList.toggle('world-fullscreen',expandedFullscreen);
 updateFullscreenButton();
}
function updateFullscreenButton(){
 const active=isWorldFullscreen();
 fullScreenBtn.textContent=active?'⤢ Sair da tela cheia':'⛶ Tela cheia';
 fullScreenBtn.setAttribute('aria-pressed',String(active));
 fullScreenBtn.setAttribute('aria-label',active?'Sair da tela cheia do Mundo Aberto':'Ativar tela cheia do Mundo Aberto');
 fullScreenBtn.title=active?'Voltar ao modo janela':'Expandir o jogo para a tela inteira';
}
fullScreenBtn.addEventListener('click',async()=>{
 if(expandedFullscreen){setExpandedFullscreen(false);return}
 if(document.fullscreenElement===fullScreenContainer){
  try{await document.exitFullscreen()}catch{setExpandedFullscreen(false)}
  updateFullscreenButton();return;
 }
 try{
  if(document.fullscreenElement&&typeof document.exitFullscreen==='function')await document.exitFullscreen();
  if(typeof fullScreenContainer.requestFullscreen==='function'){
   await fullScreenContainer.requestFullscreen();
   updateFullscreenButton();return;
  }
 }catch(err){console.warn('Tela cheia nativa indisponível; usando modo expandido.')}
 setExpandedFullscreen(true);
});
document.addEventListener('fullscreenchange',()=>{
 if(document.fullscreenElement===fullScreenContainer&&expandedFullscreen)setExpandedFullscreen(false);
 updateFullscreenButton();
 if(isWorldFullscreen()&&$('welcomeOverlay').hidden)cvs.focus({preventScroll:true});
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&expandedFullscreen)setExpandedFullscreen(false);
});
updateFullscreenButton();
const keyAction=e=>{if(!$('npcDialogue').hidden){if(e.code==='Escape'){closeDialogue();e.preventDefault()}else if(e.code==='Enter'||e.code==='Space'){advanceDialogue();e.preventDefault()}return}if(e.target.matches('input,textarea,select'))return;
 if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);
 if(e.repeat)return;
 if(e.code==='KeyJ'||e.code==='Space'){attack(false);e.preventDefault()}
 else if(e.code==='KeyK'){attack(true);e.preventDefault()}
 else if(e.code==='KeyH'){send('use',{item:'pocao'});e.preventDefault()}
 else if(e.code==='KeyI'){selectTab('inventory');e.preventDefault()}
 else if(e.code==='KeyP'){selectTab('social');e.preventDefault()}
 else if(e.code==='KeyG'){selectTab('social');e.preventDefault()}
 else if(e.code==='KeyM'){showWorldMap();e.preventDefault()}
 else if(e.code==='KeyQ'){selectTab('quests');e.preventDefault()}
 else if(e.code==='KeyE'){talkToNearest();e.preventDefault()}
 else if(e.code==='KeyL'){selectTab('story');e.preventDefault()}
 else if(e.code==='Enter'){$('chatInput').focus();e.preventDefault()}
};
window.addEventListener('keydown',keyAction);window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();joystick.release()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)joystick.release()});
$('touchAttackBtn').addEventListener('click',()=>attack(false));
$('touchSkillBtn').addEventListener('click',()=>attack(true));
$('touchPotionBtn').addEventListener('click',()=>send('use',{item:'pocao'}));
$('touchTalkBtn').addEventListener('click',()=>talkToNearest());
function attack(skill){
 if(!session.connected)return;
 let m=session.monsters.get(session.target);
 if(!m||m.hp<=0){
  session.target=null;
  // No celular, selecionar automaticamente apenas criaturas dentro do alcance real da classe.
  // O servidor continua autorizando distância, dano e cooldown.
  if(touchDevice){
   const ranges={guardiao:85,arqueiro:250,curandeiro:160,peregrino:118};
   const limit=(ranges[session.role]||118)*(skill?1.4:1);
   for(const monster of session.monsters.values()){
    if(monster.hp<=0)continue;
    const dist=Math.hypot(monster.x-session.x,monster.y-session.y);
    if(dist<=limit&&(!m||dist<Math.hypot(m.x-session.x,m.y-session.y)))m=monster;
   }
   if(m)session.target=m.id;
  }
 }
 if(!session.target){alert(touchDevice?'Aproxime-se de um monstro ou toque nele para selecionar.':'Clique sobre um monstro para selecioná-lo.');return}
 if(session.role==='arqueiro'){
  m=session.monsters.get(session.target);
  if(m){const dx=m.x-session.x,dy=m.y-session.y;session.dir=Math.abs(dx)>Math.abs(dy)?dx>0?1:3:dy>0?2:0;}
 }
 send(skill?'skill':'attack',{target:session.target});lastAction=performance.now();
}
$('talkBtn').onclick=talkToNearest;$('attackBtn').onclick=()=>attack(false);$('skillBtn').onclick=()=>attack(true);$('potionBtn').onclick=()=>send('use',{item:'pocao'});$('questBtn').onclick=()=>selectTab('quests');$('mapBtn').onclick=showWorldMap;$('chatFocusBtn').onclick=()=>$('chatInput').focus();
cvs.addEventListener('click',e=>{if(!session.connected)return;const rect=cvs.getBoundingClientRect(),wx=(e.clientX-rect.left)*W/rect.width+session.cameraX,wy=(e.clientY-rect.top)*H/rect.height+session.cameraY;
 // O sprite real tem 92px de altura, portanto toda a porta é clicável,
 // não apenas a posição dos pés; o servidor ainda valida proximidade do jogador.
 const gate=session.portals.find(p=>Math.abs(p.x-wx)<=58&&wy>=p.y-140&&wy<=p.y+34);
 if(gate){send('portal',{zone:gate.zone});return}
 const touchRadius=touchDevice?Math.max(50,34*W/Math.max(1,rect.width)):50;
 let candidate=null,best=touchRadius;for(const mon of session.monsters.values()){
  const p=monsterMotion.position(mon.id)||mon;
  const d=Math.hypot(p.x-wx,p.y-wy);if(d<best){candidate=mon;best=d}
 }
 const npcRadius=touchDevice?Math.max(38,32*W/Math.max(1,rect.width)):38;
 const npc=session.npcs.filter(n=>n.zone===session.zone).find(n=>Math.hypot(n.x-wx,n.y-wy)<npcRadius);
 if(npc){tryTalk(npc);return}
 if(candidate){session.target=candidate.id;alert('Alvo: '+candidate.name+(touchDevice?' · Toque em Atacar':' · J para atacar'))}});
function selectTab(next){tab=next;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));drawTab()}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>selectTab(b.dataset.tab));
function button(label,action,details={}){const el=document.createElement('button');el.type='button';el.textContent=label;el.onclick=()=>send(action,details);return el}
function field(parent,id,label,max=40){const l=document.createElement('label');l.textContent=label;l.style.display='block';l.style.margin='7px 0 3px';l.style.color='#e7cd98';const input=document.createElement('input');input.id=id;input.maxLength=max;input.placeholder=label;parent.append(l,input);return input}
function group(parent){const d=document.createElement('div');d.className='entry';parent.append(d);return d}
function appendText(parent,tag,text){const e=document.createElement(tag);e.textContent=text;parent.append(e);return e}
function drawTab(){const parent=$('tabContent');parent.replaceChildren();const s=session.characters;if(!s){appendText(parent,'p','Entre no mundo para ver seu inventário.');return}
 if(tab==='inventory'){
  appendText(parent,'h3','Sua bolsa de equipamentos');
  if(s.role==='arqueiro'&&!(s.inventory?.arco>0)){
   const starter=group(parent);appendText(starter,'b','Arco simples · Equipado');
   appendText(starter,'small','Arma inicial da classe: flechas ilimitadas. O Arco dos ventos do mercado aumenta o dano.');
  }
  for(const [id,count] of Object.entries(s.inventory||{}).filter(([,n])=>n>0)){
   const item=session.shop[id]||session.relics[id];if(!item)continue;
   const d=group(parent);appendText(d,'b',item.name+' · '+count+(id==='arco'&&s.role==='arqueiro'?' · Equipado':''));appendText(d,'small',
    item.rarity?'✦ '+item.rarity.toUpperCase()+' · Relíquia de chefe · '+(item.role&&item.role!==s.role?'Exclusiva de '+item.role+' (não equipada)':'Bônus passivo equipado ao possuir'):
    id==='pocao'||id==='superpocao'?'Restaura vida':'Equipamento / recurso');
   if(item.heal)d.append(button('Usar', 'use',{item:id}));
  }appendText(parent,'p','Itens, moedas e nível são calculados pelo servidor. A persistência depende de armazenamento confiável no servidor.').className='muted';
 }else if(tab==='quests'){
  appendText(parent,'h3','Crônicas da jornada');for(const q of session.quests){
   const done=s.quests.includes(q.id);
   const progress=q.type==='regions'?new Set(s.visited||[]).size:
    q.type==='depths'?new Set((s.visited||[]).filter(z=>z>=16&&z<session.zones.length)).size:
    q.type==='bosses'?new Set(s.bossRelics||[]).size:
    q.type==='chapters'?(s.story?.stage||0):(s.kills||0);
   const unit=q.type==='regions'?'regiões':q.type==='depths'?'subsolos':q.type==='bosses'?'chefes':q.type==='chapters'?'capítulos':'derrotas';
   const canClaim=progress>=q.target;
   const d=group(parent);appendText(d,'b',q.name);appendText(d,'small',q.description);
   appendText(d,'small',done?'✓ Concluída':`${progress}/${q.target} ${unit} · ${q.reward} XP · ${q.coins} moedas${canClaim?' · PRONTA':''}`)
  }parent.append(button('Resgatar recompensas', 'quest'));
  appendText(parent,'h3','Conquistas da Aurora');
  for(const [id,award] of Object.entries(session.achievements||{})){
   const earned=Array.isArray(s.achievements)&&s.achievements.includes(id);
   const d=group(parent);appendText(d,'b',(earned?'✦ ':'○ ')+award.name);
   appendText(d,'small',earned?'Conquista desbloqueada':'Recompensa: '+award.coins+' moedas');
  }
 }else if(tab==='story'){
  const q=session.story;if(!q){appendText(parent,'p','Sua história aparecerá aqui após entrar no mundo.');return}
  appendText(parent,'h3','Crônicas da Aurora');
  const bar=document.createElement('div');bar.className='story-progress';const inner=document.createElement('div');inner.style.width=(q.stage/q.total*100)+'%';bar.append(inner);parent.append(bar);
  const d=group(parent);d.className='story-step';appendText(d,'b',q.finished?'✦ A Aurora renasceu':`Capítulo ${q.stage+1}/${q.total} · ${q.title}`);
  if(q.finished){appendText(d,'small','Você ouviu o último verso, reuniu as sete centelhas e devolveu o sino ao reino. Pode revisitar todos os personagens.')}
  else{appendText(d,'small',`Próximo NPC: ${q.npc}`);appendText(d,'small',`Região: ${session.zones[q.zone]?.name||'Região '+(q.zone+1)}`);
   appendText(d,'small',q.required>0?(q.active?`Desafio aceito: ${q.progress}/${q.required} criaturas derrotadas nesta região`:`Converse com o NPC para receber o desafio (${q.required} criaturas)`):'Converse com o NPC para continuar a história.');
   if(q.active&&q.progress>=q.required)appendText(d,'small','✦ Objetivo concluído: volte ao NPC e finalize o capítulo.');
  }
  const shards=document.createElement('div');shards.className='story-shards';shards.textContent=`✦ Centelhas reunidas: ${q.shards.length}/7`;parent.append(shards);
  if(q.shards.length)appendText(parent,'small',q.shards.join(' · '));
  parent.append(button('Conversar com NPC próximo', 'talk', {npc:nearNpc()?.id||''}));
 }else if(tab==='shop'){
  appendText(parent,'h3','Mercado de Auren');for(const [id,item] of Object.entries(session.shop)){const d=group(parent);appendText(d,'b',item.name);appendText(d,'small',item.price+' moedas');d.append(button('Comprar', 'buy',{item:id}))}
 }else if(tab==='social'){
  appendText(parent,'h3','Amigos e guildas');appendText(parent,'small','Grupo: até cinco peregrinos · Guilda: 250 moedas · Comércio de itens entre jogadores próximos').className='muted';
  const p=group(parent);appendText(p,'b','Equipe');const n=field(p,'inviteName','Nome do convidado',18);const actions=document.createElement('div');actions.className='entry-actions';
  const create=button('Criar equipe','party',{action:'create'});const inv=document.createElement('button');inv.textContent='Convidar';inv.onclick=()=>send('party',{action:'invite',target:n.value.trim()});actions.append(create,inv,button('Sair','party',{action:'leave'}));p.append(actions);
  if(session.partyInvite)p.append(button('Aceitar equipe de '+session.partyInvite.by,'party',{action:'accept',party:session.partyInvite.party}));
  const g=group(parent);appendText(g,'b','Guildas');appendText(g,'small',s.guild?'Guilda atual: '+s.guild:'Nenhuma guilda');const gn=field(g,'guildName','Nome da guilda / convite',24);const target=field(g,'guildTarget','Convidar jogador',18);const gactions=document.createElement('div');gactions.className='entry-actions';
  const createGuild=document.createElement('button');createGuild.textContent='Criar (250 moedas)';createGuild.onclick=()=>send('guild',{action:'create',name:gn.value.trim()});
  const inviteGuild=document.createElement('button');inviteGuild.textContent='Convidar';inviteGuild.onclick=()=>send('guild',{action:'invite',target:target.value.trim()});gactions.append(createGuild,inviteGuild,button('Sair','guild',{action:'leave'}));g.append(gactions);
  if(session.guildInvite)g.append(button('Aceitar guilda '+session.guildInvite.name,'guild',{action:'accept',name:session.guildInvite.name}));
  const silence=group(parent);appendText(silence,'b','Proteção do chat');
  appendText(silence,'small','Silencie mensagens de outros jogadores. O bloqueio acompanha seu personagem.');
  const muted=field(silence,'mutedName','Nome para silenciar ou liberar',18);
  const controls=document.createElement('div');controls.className='entry-actions';
  const muteBtn=document.createElement('button');muteBtn.textContent='Silenciar';
  muteBtn.onclick=()=>send('ignore',{action:'add',target:muted.value.trim()});
  const unmuteBtn=document.createElement('button');unmuteBtn.textContent='Liberar';
  unmuteBtn.onclick=()=>send('ignore',{action:'remove',target:muted.value.trim()});
  controls.append(muteBtn,unmuteBtn);silence.append(controls);
  if(s.blocked?.length)appendText(silence,'small','Silenciados: '+s.blocked.join(', '));
  const t=group(parent);appendText(t,'b','Entregar item / moedas');appendText(t,'small','Somente jogadores próximos (até 200 unidades). Transferência é irreversível.');const to=field(t,'tradeTarget','Nome do destinatário',18);
  const item=document.createElement('select');for(const [id,good] of Object.entries({...session.shop,...session.relics})){
   if((s.inventory?.[id]||0)<1)continue;
   const opt=document.createElement('option');opt.value=id;opt.textContent=good.name;item.append(opt)
  }
  const count=field(t,'tradeCount','Quantidade de itens',2);count.value='1';const gold=field(t,'tradeGold','Moedas junto',5);gold.value='0';t.append(item);
  const offer=document.createElement('button');offer.textContent='Enviar oferta';offer.onclick=()=>send('trade',{action:'offer',target:to.value.trim(),item:item.value,count:Number(count.value),gold:Number(gold.value)});t.append(offer);
  if(session.tradeOffer){const o=session.tradeOffer;appendText(t,'small',`Oferta de ${o.from}: ${o.count}× ${(session.shop[o.item]||session.relics[o.item])?.name||o.item} + ${o.gold} moedas`);t.append(button('Aceitar oferta','trade',{action:'accept',target:o.from}));t.append(button('Recusar','trade',{action:'reject',target:o.from}))}
 }
}
// Diálogos do servidor: páginas, escolhas e progresso são validados no servidor.
let dialogue=null,dialoguePage=0;
function nearNpc(){return session.npcs.filter(n=>n.zone===session.zone).sort((a,b)=>distance(a,session)-distance(b,session))[0]||null}
function tryTalk(npc){if(!session.connected)return;if(distance(npc,session)>165){alert('Aproxime-se de '+npc.name+' para conversar (E).');return}send('talk',{npc:npc.id})}
function talkToNearest(){
 if(!$('npcDialogue').hidden||!session.connected)return;
 const nearest=nearNpc();
 const gate=session.portals.filter(p=>distance(p,session)<=94).sort((a,b)=>distance(a,session)-distance(b,session))[0];
 // Em caso de sobreposição, E escolhe o objeto interativo mais próximo.
 if(gate&&(!nearest||distance(gate,session)<=distance(nearest,session))){send('portal',{zone:gate.zone});return}
 if(nearest&&distance(nearest,session)<=165){tryTalk(nearest);return}
 if(gate){send('portal',{zone:gate.zone});return}
 alert('Aproxime-se de um personagem ou passagem da estrada para interagir.');
}
function openDialogue(data){if(!Array.isArray(data.pages)||!data.pages.length)return;
 dialogue=data;dialoguePage=0;keys.clear();$('npcDialogue').hidden=false;
 $('npcTitle').textContent=data.name||'Peregrino';$('npcSubtitle').textContent=data.title||'Personagem do reino';
 $('npcChapter').textContent=data.chapter?'CRÔNICAS DA AURORA · '+data.chapter:'HISTÓRIAS DO REINO';
 renderDialogue();$('npcNext').focus({preventScroll:true});
}
function renderDialogue(){if(!dialogue)return;
 $('npcText').textContent=dialogue.pages[dialoguePage]||'';
 $('npcPageCount').textContent=`${dialoguePage+1} / ${dialogue.pages.length}`;
 const last=dialoguePage>=dialogue.pages.length-1,box=$('npcChoices');box.replaceChildren();
 $('npcNext').hidden=last&&dialogue.choices?.length>0;
 $('npcNext').textContent=last?'Encerrar conversa ✓':'Continuar →';
 if(last){for(const option of dialogue.choices||[]){const btn=document.createElement('button');btn.type='button';btn.textContent=option.label;
  btn.onclick=()=>{if(option.id==='later'){closeDialogue();return}send('storyChoice',{npc:dialogue.id,choice:option.id});closeDialogue()};box.append(btn)}
 }
}
function advanceDialogue(){if(!dialogue)return;if(dialoguePage<dialogue.pages.length-1){dialoguePage++;renderDialogue()}else if(!dialogue.choices?.length)closeDialogue()}
function closeDialogue(){dialogue=null;dialoguePage=0;$('npcDialogue').hidden=true;keys.clear();joystick.release();if($('welcomeOverlay').hidden)$('game').focus({preventScroll:true})}
$('npcNext').onclick=advanceDialogue;$('npcClose').onclick=closeDialogue;
function showEpilogue(data){openDialogue({name:'✦ Crônicas da Aurora',title:'O reino voltou a lembrar',chapter:'O sétimo verso',pages:[data.epilogue,'O mundo continua aberto. As pessoas têm novas histórias para contar, e sua aventura pode prosseguir com os amigos.'],choices:[]})}
function drawTravel(){const box=$('travelButtons');box.replaceChildren();let z=session.zone;
 if(!session.connected)return;
 // O menu reutiliza as mesmas ligações que o servidor autoriza; não cria atalhos.
 for(const gate of session.portals){
  const b=document.createElement('button');
  b.textContent=gate.gateway?(gate.zone===10?'↥ Voltar para Auren':'✦ Próxima masmorra · '+gate.name):
   gate.stair?(gate.stair==='down'?'↧ Descer · ':'↥ Subir · ')+gate.name:
    (gate.dungeon&&z<12?'⌘ '+gate.name+' (chave)':gate.name);
  b.title=gate.gateway?'Passagem real após o sexto subsolo: continue a exploração':
   gate.stair?'Use a escadaria no cenário (E) ou este botão':'Destino conectado';
  if(gate.gateway)b.classList.add('next-dungeon');
  b.onclick=()=>send('travel',{zone:gate.zone});
  box.append(b);
 }
}
function showWorldMap(){
 if(!session.zones.length)return;
 let dialog=$('worldAtlasDialog');
 if(!dialog){
  dialog=document.createElement('dialog');dialog.id='worldAtlasDialog';dialog.className='world-atlas-dialog';
  document.body.append(dialog);
 }
 dialog.replaceChildren();
 const header=document.createElement('div');header.className='atlas-heading';
 const heading=document.createElement('h2');heading.textContent='✦ Atlas de Auren · '+session.zones.length+' regiões';
 const close=document.createElement('button');close.type='button';close.textContent='✕ Fechar';
 close.onclick=()=>dialog.close();
 header.append(heading,close);dialog.append(header);
 const description=document.createElement('p');
 description.textContent='Explore o continente e desça por quatro complexos de masmorras. Os pontos dourados mostram regiões já visitadas. Use os portais para viajar.';
 dialog.append(description);
 const grid=document.createElement('div');grid.className='atlas-grid';
 const explored=new Set(session.characters?.visited||[]);
 for(const z of session.zones){
  const tile=document.createElement('div');tile.className='atlas-entry'+(z.id===session.zone?' current':'')+(explored.has(z.id)?' explored':'');
  const title=document.createElement('b');title.textContent=(explored.has(z.id)?'✦ ':'◇ ')+z.name;
  const sub=document.createElement('small');
  sub.textContent=z.id<12?'Superfície · '+z.biome:
    z.id<16?'Masmorra principal':('Subsolo '+(1+(z.id-16)%6)+' · Complexo '+(1+Math.floor((z.id-16)/6)));
  tile.append(title,sub);grid.append(tile);
 }
 dialog.append(grid);if(!dialog.open)dialog.showModal();
}
$('chatForm').addEventListener('submit',e=>{e.preventDefault();const input=$('chatInput'),text=input.value.trim();if(!text)return;send('chat',{text,channel:$('chatChannel').value});input.value='';$('game').focus()});
// A renderização do mundo aberto reutiliza o atlas 16-bit da campanha original.
const classicRenderer=window.PeregrinoArt16.create({ctx,W,H});
function canvasDraw(now,dt){
  ctx.imageSmoothingEnabled=false;
  session.cameraX=clamp(Math.floor(session.x-W/2),0,ZONE_W-W);
  session.cameraY=clamp(Math.floor(session.y-H/2),0,ZONE_H-H);
  const projectiles=combatFx.frame(now);
  for(const shot of projectiles)if(shot.justHit){
   fx.push({x:shot.x,y:shot.y,text:'−'+shot.damage,t:now,color:shot.skill?'#b7f9f0':'#ffe5a6'});
  }
  fx=fx.filter(f=>now-f.t<1100);
  spriteActions.fallen=spriteActions.fallen.filter(m=>now-m.defeatedAt<570);
  for(const [id,v] of spriteActions.monsters)if(now-v.at>750)spriteActions.monsters.delete(id);
  for(const [id,v] of spriteActions.players)if(now-v.at>580)spriteActions.players.delete(id);
  classicRenderer.render({zone:session.zone,zones:session.zones,x:session.x,y:session.y,
    name:session.name||'PEREGRINO',role:session.role,dir:session.dir,
    monsters:monsterMotion.draw([...session.monsters.values()],dt),players:playerMotion.draw([...session.players.values()],now),projectiles,
    monsterActions:spriteActions.monsters,playerActions:spriteActions.players,fallen:spriteActions.fallen,
    heroPose:now-spriteActions.localHurtAt<310?{action:'hurt',at:spriteActions.localHurtAt}:{action:'attack',at:lastAction},
    npcs:session.npcs.filter(n=>n.zone===session.zone),portals:session.portals,storyStage:session.story?.stage||0,
    cameraX:session.cameraX,cameraY:session.cameraY,target:session.target,now,fx,lastAction,
    moving:Math.hypot(session.x-lastFrameX,session.y-lastFrameY)>0.06});
  lastFrameX=session.x;lastFrameY=session.y;
}
let lastFrameX=768,lastFrameY=512;
let lastFrame=0;function tick(t){const dt=Math.min(.065,(t-lastFrame)/1000||0);lastFrame=t;
 if(session.connected&&$('welcomeOverlay').hidden&&$('npcDialogue').hidden){let dx=0,dy=0;if(moves.up.some(k=>keys.has(k)))dy--;if(moves.down.some(k=>keys.has(k)))dy++;if(moves.left.some(k=>keys.has(k)))dx--;if(moves.right.some(k=>keys.has(k)))dx++;
  if(touchDevice){const v=joystick.vector;dx+=v.x;dy+=v.y}
  if(dx||dy){const l=Math.hypot(dx,dy);session.x=clamp(session.x+dx/l*166*dt,24,ZONE_W-24);session.y=clamp(session.y+dy/l*166*dt,24,ZONE_H-24);session.dir=Math.abs(dx)>Math.abs(dy)?dx>0?1:3:dy>0?2:0}
  if(t-movingAt>85){send('move',{x:Math.round(session.x),y:Math.round(session.y),dir:session.dir});movingAt=t}
 }
 canvasDraw(t,dt);requestAnimationFrame(tick)}requestAnimationFrame(tick);
// RTT real medido no canal WebSocket do jogo a cada 5 segundos.
setInterval(()=>{
 if(session.connected)latency.poll(performance.now(),details=>send('ping',details));
 updatePingIndicator();
},1000);
updatePingIndicator();
window.addEventListener('pagehide',()=>{joystick.release();try{socket?.close()}catch{}});
if(new URLSearchParams(location.search).get('auto')==='1'&&$('name').value.trim()&&progressToken){
 session.name=$('name').value.trim().normalize('NFC');session.formClass=$('role').value;connect();
}
void setupLogin();
window.OsPeregrinosMundo=Object.freeze({get online(){return session.online},get zone(){return session.zone},get connected(){return session.connected},get monsters(){return session.monsters.size},get name(){return session.name}});
})();

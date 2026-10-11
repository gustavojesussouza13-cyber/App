'use strict';
/* Os Peregrinos — interface multiplayer de mundo aberto, pixel-art gerado no navegador. */
(()=>{
const $=id=>document.getElementById(id);
const cvs=$('game'),ctx=cvs.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
const W=cvs.width,H=cvs.height,ZONE_W=1536,ZONE_H=1024;
const session={id:'',name:'',connected:false,characters:null,online:0,zones:[],shop:{},quests:[],monsters:new Map(),players:new Map(),zone:0,x:768,y:512,dir:2,target:null,partyInvite:null,guildInvite:null,tradeOffer:null,role:'peregrino',cameraX:0,cameraY:0,formClass:'peregrino'};
const keys=new Set(),moves={up:['KeyW','ArrowUp'],down:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight']};
let socket=null,reconnectMs=1000,reconnectTimer=null,movingAt=0,lastDraw=0,fx=[],toastTimer=0,lastAction=0,tab='inventory',authed=false;
let progressToken=null;
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
function setOnline(state,msg){session.connected=state;$('statusDot').classList.toggle('on',state);$('status').textContent=msg}
function character(c){session.characters=c;session.zone=c.zone;session.role=c.role;session.x=c.x;session.y=c.y;
 $('charName').textContent=c.name||session.name;$('playerClass').textContent={peregrino:'Peregrino',guardiao:'Guardião',arqueiro:'Arqueiro',curandeiro:'Curandeiro'}[c.role]||c.role;
 $('playerLevel').textContent='Nível '+c.level;$('playerCoins').textContent='◈ '+c.coins+' moedas';$('hpText').textContent=c.hp+' / '+c.maxHp;
 $('xpText').textContent=c.xp+' / '+c.nextXp;$('hpBar').style.width=clamp(c.hp/c.maxHp*100,0,100)+'%';$('xpBar').style.width=clamp(c.xp/c.nextXp*100,0,100)+'%';
 $('kills').textContent=c.kills;$('visited').textContent=c.visited.length+'/16';$('zoneTitle').textContent=session.zones[c.zone]?.name||('Região '+c.zone);drawTravel();drawTab();
}
function displayOnline(n){session.online=n;$('playerCount').textContent=n+'/10';setOnline(true,'✦ '+n+'/10 peregrinos online')}
function dispatch(msg){if(msg.type==='welcome'){
 session.id=msg.self.id;session.name=msg.self.name;session.zones=msg.zones;session.shop=msg.shop;session.quests=msg.quests;
 $('welcomeOverlay').hidden=true;setOnline(true,'Conectado');displayOnline(msg.online);character(msg.self);
 if(!authed){authed=true;if(msg.self.level===1&&msg.self.kills===0&&msg.self.role==='peregrino'&&session.formClass!=='peregrino')send('class',{role:session.formClass});say('','Bem-vindo, '+session.name+'! Seu progresso deste navegador é reconhecido pelo servidor.','sys')}
 $('game').focus();
 }else if(msg.type==='character'){character(msg);
 }else if(msg.type==='snapshot'){
  session.zone=msg.zone;displayOnline(msg.online);
  const now=new Map();for(const m of msg.monsters||[])now.set(m.id,m);session.monsters=now;
  const people=new Map();for(const p of msg.players||[])people.set(p.id,p);session.players=people;
 }else if(msg.type==='travel'){session.zone=msg.zone;session.x=msg.x;session.y=msg.y;session.target=null;session.monsters.clear();$('zoneTitle').textContent=msg.name;alert('✦ '+msg.name);drawTravel();
 }else if(msg.type==='hit'){if(msg.zone===session.zone){let m=session.monsters.get(msg.monster);if(m)m.hp=msg.remaining;fx.push({x:m?.x||session.x,y:m?.y||session.y,text:'−'+msg.damage,t:performance.now(),color:'#ffe5a6'})}
 }else if(msg.type==='hurt'){fx.push({x:session.x,y:session.y,text:'−'+msg.damage,t:performance.now(),color:'#ff8d83'});if(session.characters?.hp<=0)$('deathVeil').hidden=false;
 }else if(msg.type==='defeated'){if(msg.zone===session.zone){fx.push({x:session.monsters.get(msg.monster)?.x||session.x,y:session.monsters.get(msg.monster)?.y||session.y,text:msg.boss?'★ CHEFE!':'✦ VITÓRIA!',t:performance.now(),color:'#f5d587'});session.monsters.delete(msg.monster)}
 }else if(msg.type==='reward'){alert('+'+msg.xp+' EXP  ·  +'+msg.gold+' moedas'+(msg.boss?' ★ CHEFE':''));
 }else if(msg.type==='chat'){say('['+msg.channel+'] '+msg.name,msg.text,msg.channel);
 }else if(msg.type==='notice'||msg.type==='system'){say('',msg.text,'sys');if(msg.type==='notice')alert(msg.text);
 }else if(msg.type==='partyInfo'){session.partyInvite=null;say('','Equipe: '+msg.members.join(', '),'sys');drawTab();
 }else if(msg.type==='partyInvite'){session.partyInvite=msg;alert('Convite de equipe de '+msg.by);drawTab();
 }else if(msg.type==='guildInvite'){session.guildInvite=msg;alert('Convite de guilda: '+msg.name);drawTab();
 }else if(msg.type==='tradeOffer'){session.tradeOffer=msg;alert('Você recebeu uma oferta de '+msg.from);drawTab();
 }else if(msg.type==='error'){say('','Servidor: '+msg.message,'sys');$('connectionError').textContent=msg.message||'Erro de conexão';
  if(msg.code==='full'||msg.code==='name_taken'||msg.code==='invalid_name'){authed=false;$('welcomeOverlay').hidden=false;clearTimeout(reconnectTimer);socket?.close();}
 }}
function connect(){if(!progressToken){alert('Armazenamento indisponível');return}
 if(socket&&socket.readyState===WebSocket.OPEN)return;
 setOnline(false,'Conectando…');const url=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/world-ws';
 try{const sock=new WebSocket(url);socket=sock;
  sock.onopen=()=>{reconnectMs=1000;send('hello',{name:session.name,role:session.formClass,token:progressToken})};
  sock.onmessage=e=>{try{dispatch(JSON.parse(e.data))}catch(err){console.warn('Resposta inválida',err)}};
  sock.onclose=()=>{if(socket!==sock)return;setOnline(false,'Desconectado');session.monsters.clear();session.players.clear();if(!authed)return;clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connect,reconnectMs);reconnectMs=Math.min(14000,reconnectMs*1.7)};
  sock.onerror=()=>setOnline(false,'Conexão instável');
 }catch{setOnline(false,'Falha de conexão')}
}
$('nameForm').addEventListener('submit',e=>{e.preventDefault();const name=$('name').value.trim().normalize('NFC');if(!/^[\p{L}\p{N}][\p{L}\p{N} _-]{2,17}$/u.test(name)){alert('Escolha um nome válido de 3–18 caracteres');return}
 session.name=name;session.formClass=$('role').value;try{localStorage.setItem('os-peregrinos-last-name',name)}catch{};connect();});
const keyAction=e=>{if(e.target.matches('input,textarea,select'))return;
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
 else if(e.code==='Enter'){$('chatInput').focus();e.preventDefault()}
};
window.addEventListener('keydown',keyAction);window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
function attack(skill){if(!session.connected||!session.target){alert('Clique sobre um monstro para selecioná-lo.');return}send(skill?'skill':'attack',{target:session.target});lastAction=performance.now()}
$('attackBtn').onclick=()=>attack(false);$('skillBtn').onclick=()=>attack(true);$('potionBtn').onclick=()=>send('use',{item:'pocao'});$('questBtn').onclick=()=>selectTab('quests');$('mapBtn').onclick=showWorldMap;$('chatFocusBtn').onclick=()=>$('chatInput').focus();
cvs.addEventListener('click',e=>{if(!session.connected)return;const rect=cvs.getBoundingClientRect(),wx=(e.clientX-rect.left)*W/rect.width+session.cameraX,wy=(e.clientY-rect.top)*H/rect.height+session.cameraY;
 let candidate=null,best=50;for(const mon of session.monsters.values()){const d=Math.hypot(mon.x-wx,mon.y-wy);if(d<best){candidate=mon;best=d}}
 if(candidate){session.target=candidate.id;alert('Alvo: '+candidate.name+' · J para atacar')}});
function selectTab(next){tab=next;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));drawTab()}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>selectTab(b.dataset.tab));
function button(label,action,details={}){const el=document.createElement('button');el.type='button';el.textContent=label;el.onclick=()=>send(action,details);return el}
function field(parent,id,label,max=40){const l=document.createElement('label');l.textContent=label;l.style.display='block';l.style.margin='7px 0 3px';l.style.color='#e7cd98';const input=document.createElement('input');input.id=id;input.maxLength=max;input.placeholder=label;parent.append(l,input);return input}
function group(parent){const d=document.createElement('div');d.className='entry';parent.append(d);return d}
function appendText(parent,tag,text){const e=document.createElement(tag);e.textContent=text;parent.append(e);return e}
function drawTab(){const parent=$('tabContent');parent.replaceChildren();const s=session.characters;if(!s){appendText(parent,'p','Entre no mundo para ver seu inventário.');return}
 if(tab==='inventory'){
  appendText(parent,'h3','Sua bolsa de equipamentos');for(const [id,count] of Object.entries(s.inventory||{}).filter(([,n])=>n>0)){
   const item=session.shop[id];if(!item)continue;const d=group(parent);appendText(d,'b',item.name+' · '+count);appendText(d,'small',id==='pocao'||id==='superpocao'?'Restaura vida':'Equipamento / recurso');
   if(item.heal)d.append(button('Usar', 'use',{item:id}));
  }appendText(parent,'p','Itens, moedas e nível são calculados pelo servidor. A persistência depende de armazenamento confiável no servidor.').className='muted';
 }else if(tab==='quests'){
  appendText(parent,'h3','Crônicas da jornada');for(const q of session.quests){const done=s.quests.includes(q.id),canClaim=s.kills>=q.target;const d=group(parent);appendText(d,'b',q.name);appendText(d,'small',q.description);appendText(d,'small',done?'✓ Concluída':`${s.kills}/${q.target} derrotas · ${q.reward} XP · ${q.coins} moedas${canClaim?' · PRONTA':''}`)}parent.append(button('Resgatar recompensas', 'quest'));
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
  const t=group(parent);appendText(t,'b','Entregar item / moedas');appendText(t,'small','Somente jogadores próximos (até 200 unidades). Transferência é irreversível.');const to=field(t,'tradeTarget','Nome do destinatário',18);
  const item=document.createElement('select');for(const [id,good] of Object.entries(session.shop)){const opt=document.createElement('option');opt.value=id;opt.textContent=good.name;item.append(opt)}
  const count=field(t,'tradeCount','Quantidade de itens',2);count.value='1';const gold=field(t,'tradeGold','Moedas junto',5);gold.value='0';t.append(item);
  const offer=document.createElement('button');offer.textContent='Enviar oferta';offer.onclick=()=>send('trade',{action:'offer',target:to.value.trim(),item:item.value,count:Number(count.value),gold:Number(gold.value)});t.append(offer);
  if(session.tradeOffer){const o=session.tradeOffer;appendText(t,'small',`Oferta de ${o.from}: ${o.count}× ${session.shop[o.item]?.name||o.item} + ${o.gold} moedas`);t.append(button('Aceitar oferta','trade',{action:'accept',target:o.from}));t.append(button('Recusar','trade',{action:'reject',target:o.from}))}
 }
}
function drawTravel(){const box=$('travelButtons');box.replaceChildren();let z=session.zone;
 if(!session.connected)return;
 const dest= z>=12?[[[1,3,5,11][z-12], '↩ Sair da masmorra']]:session.zones.filter(a=>a.id<12&&(Math.abs(a.id-z)<=2)&&a.id!==z).map(a=>[a.id,a.name]);
 if(z<12){for(let i=12;i<16;i++)if([1,3,5,11][i-12]===z)dest.push([i,'⌘ '+session.zones[i].name+' (chave)'])}
 for(const [id,name] of dest){const b=document.createElement('button');b.textContent=name;b.onclick=()=>send('travel',{zone:id});box.append(b)}
}
function showWorldMap(){if(!session.zones.length)return;const content=session.zones.map(z=>(z.id===session.zone?'● ':'○ ')+z.name).join(' · ');alert(content.slice(0,260));selectTab('quests')}
$('chatForm').addEventListener('submit',e=>{e.preventDefault();const input=$('chatInput'),text=input.value.trim();if(!text)return;send('chat',{text,channel:$('chatChannel').value});input.value='';$('game').focus()});
// A renderização do mundo aberto reutiliza o atlas 16-bit da campanha original.
const classicRenderer=window.PeregrinoArt16.create({ctx,W,H});
function canvasDraw(now){
  ctx.imageSmoothingEnabled=false;
  session.cameraX=clamp(Math.floor(session.x-W/2),0,ZONE_W-W);
  session.cameraY=clamp(Math.floor(session.y-H/2),0,ZONE_H-H);
  fx=fx.filter(f=>now-f.t<1100);
  classicRenderer.render({zone:session.zone,zones:session.zones,x:session.x,y:session.y,
    name:session.name||'PEREGRINO',role:session.role,dir:session.dir,
    monsters:[...session.monsters.values()],players:[...session.players.values()],
    cameraX:session.cameraX,cameraY:session.cameraY,target:session.target,now,fx,lastAction,
    moving:Math.hypot(session.x-lastFrameX,session.y-lastFrameY)>0.06});
  lastFrameX=session.x;lastFrameY=session.y;
}
let lastFrameX=768,lastFrameY=512;
let lastFrame=0;function tick(t){const dt=Math.min(.065,(t-lastFrame)/1000||0);lastFrame=t;
 if(session.connected&&$('welcomeOverlay').hidden){let dx=0,dy=0;if(moves.up.some(k=>keys.has(k)))dy--;if(moves.down.some(k=>keys.has(k)))dy++;if(moves.left.some(k=>keys.has(k)))dx--;if(moves.right.some(k=>keys.has(k)))dx++;
  if(dx||dy){const l=Math.hypot(dx,dy);session.x=clamp(session.x+dx/l*166*dt,24,ZONE_W-24);session.y=clamp(session.y+dy/l*166*dt,24,ZONE_H-24);session.dir=Math.abs(dx)>Math.abs(dy)?dx>0?1:3:dy>0?2:0}
  if(t-movingAt>85){send('move',{x:Math.round(session.x),y:Math.round(session.y),dir:session.dir});movingAt=t}
 }
 canvasDraw(t);requestAnimationFrame(tick)}requestAnimationFrame(tick);
window.addEventListener('pagehide',()=>{try{socket?.close()}catch{}});
if(new URLSearchParams(location.search).get('auto')==='1'&&$('name').value.trim()&&progressToken){
 session.name=$('name').value.trim().normalize('NFC');session.formClass=$('role').value;connect();
}
window.OsPeregrinosMundo=Object.freeze({get online(){return session.online},get zone(){return session.zone},get connected(){return session.connected},get monsters(){return session.monsters.size},get name(){return session.name}});
})();

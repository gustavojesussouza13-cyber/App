'use strict';
/* Os Peregrinos — interface multiplayer de mundo aberto, pixel-art gerado no navegador. */
(()=>{
const $=id=>document.getElementById(id);
const cvs=$('game'),ctx=cvs.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
const W=cvs.width,H=cvs.height,ZONE_W=1536,ZONE_H=1024;
const session={id:'',name:'',connected:false,characters:null,online:0,zones:[],portals:[],shop:{},relics:{},quests:[],npcs:[],merchants:[],story:null,achievements:{},monsters:new Map(),players:new Map(),zone:0,x:768,y:512,dir:2,target:null,partyInvite:null,guildInvite:null,tradeOffer:null,role:'peregrino',cameraX:0,cameraY:0,formClass:'peregrino',appearance:null,formAppearance:null};
const keys=new Set(),moves={up:['KeyW','ArrowUp'],down:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight']};
let selectedMonsterSheet=null;
const monsterAttributeLabels={vitalidade:'Vitalidade',fortitude:'Fortitude',forca:'Força',agilidade:'Agilidade',intelecto:'Intelecto',espirito:'Espírito',sorte:'Sorte'};
function updateMonsterLife(){
 const monster=selectedMonsterSheet&&session.monsters.get(selectedMonsterSheet.id);
 if(!monster)return;
 const health=document.getElementById('monsterSheetLife'),bar=document.getElementById('monsterSheetBar');
 if(health)health.textContent=monster.hp+' / '+monster.maxHp;
 if(bar)bar.style.width=Math.max(0,Math.min(100,monster.hp/Math.max(1,monster.maxHp)*100))+'%';
}
function clearMonsterSheet(){selectedMonsterSheet=null;const panel=document.getElementById('monsterSheet');if(panel)panel.hidden=true}
function renderMonsterSheet(sheet){
 if(!sheet||sheet.id!==session.target)return;
 selectedMonsterSheet=sheet;
 const panel=document.getElementById('monsterSheet');if(!panel)return;
 panel.hidden=false;
 document.getElementById('monsterSheetClose').onclick=clearMonsterSheet;
 document.getElementById('monsterSheetTitle').textContent=sheet.name;
 document.getElementById('monsterSheetRank').textContent='Nível '+sheet.level+' · '+sheet.rank+' · '+sheet.archetype;
 const stats=document.getElementById('monsterSheetStats');stats.replaceChildren();
 function addStat(label,value){
  const tile=document.createElement('div');tile.className='monster-sheet-stat';
  const caption=document.createElement('small');caption.textContent=label;
  const number=document.createElement('strong');number.textContent=String(value);
  tile.append(caption,number);stats.append(tile);
 }
 addStat('Peregrinos derrotados',sheet.victories);
 addStat('Experiência conquistada',sheet.evolutionXp);
 addStat('Poder de ataque',sheet.attack);
 addStat('Armadura / Resistência',sheet.armor+' / '+sheet.magicResist);
 addStat('Esquiva',sheet.evasion+'%');addStat('Rapidez',sheet.attackHaste+'%');
 const attrs=document.getElementById('monsterSheetAttributes');attrs.replaceChildren();
 for(const [key,label]of Object.entries(monsterAttributeLabels)){
  const tile=document.createElement('div'),caption=document.createElement('small'),value=document.createElement('strong');
  caption.textContent=label;value.textContent=String(sheet.attributes?.[key]||0);
  tile.append(caption,value);attrs.append(tile);
 }
 function renderList(id,items,empty){
  const target=document.getElementById(id);target.replaceChildren();
  if(!items?.length){target.textContent=empty;return}
  for(const item of items){
   const tile=document.createElement('div');tile.className='monster-equipment-item';tile.textContent=item.name;
   const desc=document.createElement('span');desc.textContent=item.effect||item.kind||item.slot||'';
   tile.append(desc);target.append(tile);
  }
 }
 renderList('monsterSheetEquipment',sheet.equipment,'Esta criatura não carrega equipamentos.');
 renderList('monsterSheetLoot',sheet.loot,'Nenhum espólio registrado.');
 updateMonsterLife();
}
const monsterMotion=window.OsPeregrinosMonsterMotion.create();
const playerMotion=window.OsPeregrinosPlayerMotion.create();
const combatFx=window.OsPeregrinosCombatFx.create();
// Só o PC mostra a arte 16-bit extra. Cada efeito nasce de mensagem do servidor.
const classSkillFx=window.OsPeregrinosClassSkillFx16.create({windowRef:window});
// Eventos reais do servidor comandam poses de ataque, impacto e derrota.
const spriteActions={monsters:new Map(),players:new Map(),fallen:[],localHurtAt:0};
const armyArt=window.PeregrinosArmyPixel16;
let troopShots=[];
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
let socket=null,reconnectMs=1000,reconnectTimer=null,movingAt=0,lastDraw=0,fx=[],toastTimer=0,lastAction=0,lastActionWasSkill=false,tab='inventory',authed=false;
let progressToken=null,accountMode=false,accountReady=false,emailRecoveryAvailable=false;
let selectedRoomId='auren-publica',roomCatalog=[],roomName='Praça Pública',pendingRoom=null,pendingRoomUntil=0;
let roomSwitchPending=false,roomSwitchTarget=null;
let kingdomState=null,visibleKingdomBases=[];
let guildDirectory=null,socialSection='guilds';
let defenseTargets=[],defenseTargetId=null;
const cityUI=window.PeregrinosCity.create({send:(type,data)=>send(type,data)});
// Cada abertura do site cria uma nova jornada Visitante. O token existe
// somente nesta execução da página; queda da conexão reutiliza o token.
// Dados de contas cadastradas continuam no servidor, sob login/senha.
try{
 progressToken=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
 try{localStorage.removeItem('os-peregrinos-world-token');localStorage.removeItem('os-peregrinos-last-name')}catch{}
 $('name').value='';$('role').value='peregrino';
}catch{$('connectionError').textContent='Não foi possível iniciar uma nova jornada segura. Atualize o navegador.';}
// O criador compartilha sprite studio e regras com o servidor; não usa blur.
const appearanceArt=window.PeregrinosAppearance16;
const appearanceCreator=window.PeregrinosAppearanceEditor.create($('appearanceCreator'),{
 role:()=>document.querySelector('#registerForm:not([hidden])')?$('registerRole').value:$('role').value,
 onChange:value=>{session.formAppearance=value}
});
session.formAppearance=appearanceCreator.read();
$('role').addEventListener('change',()=>appearanceCreator.render());
$('registerRole').addEventListener('change',()=>appearanceCreator.render());
const appearanceDialog=$('appearanceEditDialog');
const appearanceEditor=window.PeregrinosAppearanceEditor.create($('appearanceEditorBody'),{
 role:()=>session.role,
 initial:session.formAppearance
});
$('appearanceChangeBtn').addEventListener('click',()=>{
 if(!session.connected)return;
 appearanceEditor.set(session.appearance||session.characters?.appearance);
 if(!appearanceDialog.open)appearanceDialog.showModal();
});
$('appearanceEditCancel').addEventListener('click',()=>appearanceDialog.close());
$('appearanceEditSave').addEventListener('click',()=>{
 if(!session.connected)return;
 send('appearance',{appearance:appearanceEditor.read()});
 appearanceDialog.close();
});
const tint=['#6d9a68','#345947','#44818a','#d4b578','#8f938e','#5f6b59','#97b673','#4a735c','#4b8ba3','#477b58','#9c8a6c','#655970','#536453','#8b6b54','#647a92','#c4a975'];
const shade=['#427444','#25573d','#37737b','#b38f4e','#697a76','#445d55','#698d55','#365b50','#35738d','#306b47','#7d6d58','#554b68','#425146','#65503e','#566b81','#a58f59'];
const alert=msg=>{const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3100)};
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rand=n=>{n=Math.imul(n^n>>>16,0x7feb352d);n=Math.imul(n^n>>>15,0x846ca68b);return(n^n>>>16)>>>0};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function say(sender,text,kind='',reportId=null){const line=document.createElement('div');line.className='chat-row '+kind;
 if(sender){let strong=document.createElement('b');strong.textContent=sender+': ';line.appendChild(strong)}
 const span=document.createElement('span');span.textContent=String(text);line.appendChild(span);
 if(reportId&&typeof reportId==='string'){
  const report=document.createElement('button');
  report.type='button';report.className='chat-report';report.textContent='Denunciar';
  report.title='Denunciar esta mensagem e silenciar o remetente';
  report.setAttribute('aria-label','Denunciar mensagem recebida');
  report.addEventListener('click',()=>{
   report.disabled=true;report.textContent='Denunciado';
   send('report',{id:reportId});
  });
  line.appendChild(report);
 }
 $('chatLog').appendChild(line);
 while($('chatLog').children.length>85)$('chatLog').firstElementChild.remove();$('chatLog').scrollTop=$('chatLog').scrollHeight;
}
function send(type,data={}){
 if(socket&&socket.readyState===WebSocket.OPEN&&(type!=='kingdom'||session.connected)){
  // O discriminador da mensagem WebSocket é sempre "type". Um campo
  // do payload jamais pode sobrescrever a rota para o servidor.
  socket.send(JSON.stringify({...data,type}));
  return true;
 }
 return false;
}
function setOnline(state,msg){
 session.connected=state;$('statusDot').classList.toggle('on',state);$('status').textContent=msg;
 $('roomSwitchBtn').disabled=!state||roomSwitchPending;
 touchUI.hidden=!state||!touchDevice;
 if(!state){$('appearanceChangeBtn').hidden=true;if(appearanceDialog.open)appearanceDialog.close();cityUI.onConnectionLost?.();joystick.release();latency.reset();updatePingIndicator();spriteActions.monsters.clear();spriteActions.players.clear();spriteActions.fallen.length=0;classSkillFx.clear()}
}
const rpgAttributeNames={vitalidade:'Vitalidade',fortitude:'Fortitude',forca:'Força',agilidade:'Agilidade',
 intelecto:'Intelecto',espirito:'Espírito',sorte:'Sorte'};
const rpgAttributeHelp={
 vitalidade:'Aumenta PV e regeneração fora de combate.',
 fortitude:'Reduz dano físico.',
 forca:'Reforça golpes físicos.',
 agilidade:'Aumenta precisão, esquiva, crítico e velocidade dos golpes.',
 intelecto:'Reforça magia, energia e resistência mágica.',
 espirito:'Reforça cura, regeneração de energia e resistências.',
 sorte:'Melhora críticos e precisão.'
};
function renderRpgPanel(c){
 const details=$('rpgAttributeDetails');
 if(!details||!c?.rpg)return;
 const {attributes={},allocations={},availablePoints=0,stats={},impacts={}}=c.rpg;
 const points=$('rpgAvailablePoints');
 points.textContent=availablePoints+' ponto'+(availablePoints===1?' livre':'s livres');
 const intro=document.querySelector('.rpg-attribute-intro');
 if(intro)intro.textContent='Você recebe 2 pontos por nível após o primeiro. Evolução natural e especialização se somam no combate. '+
  (accountMode?'Seus investimentos são salvos na conta.':'No modo Visitante, seus investimentos valem durante esta jornada; para salvá-los entre visitas, crie uma conta.');
 const rows=$('rpgAttributeRows');rows.replaceChildren();
 for(const [key,name]of Object.entries(rpgAttributeNames)){
  const entry=document.createElement('div');entry.className='rpg-stat-entry';
  const label=document.createElement('div');label.className='rpg-stat-label';label.textContent=name;
  const info=document.createElement('span');info.textContent=rpgAttributeHelp[key];label.append(info);
  if(impacts[key]){
   const preview=document.createElement('span');preview.className='rpg-investment-preview';
   preview.textContent='Se investir 1 ponto: '+impacts[key];label.append(preview);
  }
  const value=document.createElement('span');value.className='rpg-stat-value';
  value.textContent=String(attributes[key]||0)+(allocations[key]?' (+'+allocations[key]+')':'');
  const plus=document.createElement('button');plus.type='button';plus.textContent='+';
  plus.setAttribute('aria-label','Aumentar '+name);
  plus.title='Investir 1 ponto em '+name+(impacts[key]?' — '+impacts[key]:'');
  // Tanto visitantes quanto contas registradas têm direito aos atributos.
  // Apenas o servidor decide se há pontos suficientes e valida cada compra.
  plus.disabled=availablePoints<1||allocations[key]>=70;
  plus.onclick=()=>send('allocateStat',{attribute:key});
  entry.append(label,value,plus);rows.append(entry);
 }
 const list=[
  ['Ataque físico',stats.physicalPower],['Poder mágico',stats.magicPower],
  ['Precisão',stats.accuracy+'%'],['Chance de crítico',stats.criticalChance+'%'],
  ['Dano crítico','×'+stats.criticalMultiplier],['Armadura',stats.armor],
  ['Resistência mágica',stats.magicResist],['Resistência ao fogo',stats.fireResist],
  ['Resistência elétrica',stats.lightningResist],['Esquiva',stats.evasion+'%'],
  ['Rapidez de ataque',stats.haste+'%'],['Poder de cura',stats.healingPower],
  ['Regeneração de PV',stats.hpRegen+'/s'],['Regeneração de energia',stats.energyRegen+'/s']
 ];
 const derived=$('rpgDerivedRows');derived.replaceChildren();
 for(const [name,amount]of list){
  const item=document.createElement('div');item.className='rpg-derived-item';
  const label=document.createElement('small');label.textContent=name;
  const value=document.createElement('strong');value.textContent=String(amount);
  item.append(label,value);derived.append(item);
 }
}
function character(c){session.characters=c;session.zone=c.zone;session.role=c.role;session.x=c.x;session.y=c.y;
 session.appearance=appearanceArt.normalize(c.appearance);
 $('appearanceChangeBtn').hidden=false;
 $('charName').textContent=(c.administrator?'✦ ':'')+(c.name||session.name);$('playerClass').textContent=({peregrino:'Peregrino',guardiao:'Guardião',arqueiro:'Arqueiro',curandeiro:'Curandeiro'}[c.role]||c.role)+(c.administrator?' · ADMIN':'');
 // Explicar a função da habilidade K sem mudar o layout do controle mobile.
 $('skillBtn').lastChild.textContent=c.role==='curandeiro'?' Curar':' Habilidade';
 const skillHelp={
  curandeiro:'K: Luz Restauradora — cura você e sua equipe a até 230 de distância sem precisar de inimigo.',
  guardiao:'K: Proteção da Aurora — protege você e sua equipe por 4,5s sem selecionar inimigo.',
  peregrino:'K: Recuperação Heroica — recupera sua vida; com inimigo selecionado, também golpeia.',
  arqueiro:'K: Flecha de Precisão — selecione um inimigo para marcá-lo por 5,5s.'
 };
 $('skillBtn').title=skillHelp[c.role]||'K: habilidade especial da sua classe';
 $('touchSkillBtn').title=$('skillBtn').title;
 $('playerLevel').textContent=c.level===100?'Nível 100 · MÁXIMO':'Nível '+c.level;$('playerCoins').textContent='◈ '+Number(c.coins).toLocaleString('pt-BR')+' moedas';$('hpText').textContent=c.hp+' / '+c.maxHp;
 $('xpText').textContent=c.xp+' / '+c.nextXp;
  $('energyText').textContent=Math.floor(c.energy||0)+' / '+(c.maxEnergy||0);
  $('energyBar').style.width=clamp((c.energy||0)/Math.max(1,c.maxEnergy||1)*100,0,100)+'%';
  renderRpgPanel(c);$('hpBar').style.width=clamp(c.hp/c.maxHp*100,0,100)+'%';$('xpBar').style.width=clamp(c.xp/c.nextXp*100,0,100)+'%';
 session.story=c.story||null;$('kills').textContent=c.kills;$('visited').textContent=c.visited.length+'/'+(session.zones.length||40);$('zoneTitle').textContent=session.zones[c.zone]?.name||('Região '+c.zone);drawTravel();drawTab();
}
function displayOnline(n){session.online=n;$('playerCount').textContent=n+'/60';setOnline(true,'✦ '+roomName+' · '+n+'/60 jogadores')}
function dispatch(msg){
 if(msg.type==='maintenance'){
  // Segunda via de aviso caso o canal global SSE seja bloqueado no navegador.
  window.OsPeregrinosMaintenance?.notify(msg);return;
 }
 if(msg.type==='roomSwitchError'){
  roomSwitchPending=false;roomSwitchTarget=null;
  $('roomSwitchError').textContent=msg.message||'Não foi possível trocar de servidor.';
  $('roomSwitchConfirm').disabled=false;
  $('roomSwitchCancel').disabled=false;
  $('roomSwitchBtn').disabled=!session.connected;
  updateSwitchChoice();return;
 }
 if(msg.type==='kingdomActionResult'){
  cityUI.onActionResult?.(msg);
  return;
 }
 if(msg.type==='kingdomDurable'){
  cityUI.onDurableResult?.(msg);
  return;
 }
 if(msg.type==='guildDirectory'){
  guildDirectory=msg.data||null;if(tab==='social')drawTab();return;
 }
 if(msg.type==='guildDefense'){
  defenseTargets=Array.isArray(msg.targets)?msg.targets:[];
  if(!defenseTargets.some(t=>t.id===defenseTargetId))defenseTargetId=null;
  if(msg.text){say('',msg.text,'sys');alert(msg.text)}
  if(tab==='social')drawTab();return;
 }
 if(msg.type==='kingdomState'){
  kingdomState=msg.data||null;
  visibleKingdomBases=(kingdomState?.bases||[]).filter(b=>b.zone===session.zone);
  cityUI.update(kingdomState);
  if(tab==='social')drawTab();return;
 }
 if(msg.type==='pong'){if(latency.receive(msg,performance.now()))updatePingIndicator();return}
 if(msg.type==='welcome'){
 session.id=msg.self.id;session.name=msg.self.name;session.zones=msg.zones;session.shop=msg.shop;session.relics=msg.relics||{};session.quests=msg.quests;session.achievements=msg.achievements||{};session.npcs=Array.isArray(msg.npcs)?msg.npcs:[];session.merchants=Array.isArray(msg.merchants)?msg.merchants:[];
 const roomChanged=Boolean(roomSwitchPending&&msg.room?.id===roomSwitchTarget&&selectedRoomId!==msg.room.id);
 if(roomChanged){
  // Não deixar sprites, efeitos e diálogos da sala anterior no novo mundo.
  closeDialogue();
  keys.clear();joystick.release();
  session.monsters.clear();monsterMotion.clear();playerMotion.clear();combatFx.clear();if(typeof clearMonsterSheet==='function')clearMonsterSheet();
  session.players.clear();spriteActions.monsters.clear();spriteActions.players.clear();
  spriteActions.fallen.length=0;
  visibleKingdomBases=[];kingdomState=null;guildDirectory=null;
  session.partyInvite=null;session.tradeOffer=null;
  defenseTargets=[];defenseTargetId=null;
 }
 // Os portais são autoritativos em TODOS os welcomes (login ou troca de
 // servidor). Nunca zerar após aplicar a lista recebida na nova sala.
 session.portals=Array.isArray(msg.portals)?msg.portals:[];
 drawTravel();
 $('welcomeOverlay').hidden=true;
 if(msg.room){
  selectedRoomId=msg.room.id;roomName=msg.room.name;
  if(pendingRoom?.id===msg.room.id)pendingRoom=null;
 }
 if(roomChanged){
  roomSwitchPending=false;roomSwitchTarget=null;
  $('roomSwitchDialog').close();
  $('roomSwitchCancel').disabled=false;
  $('roomSwitchConfirm').disabled=false;
 }
 setOnline(true,'Conectado');displayOnline(msg.online);character(msg.self);
 session.formClass=msg.self.role;
 cityUI.onConnectionRestored?.();
 if(roomChanged)alert('✦ Você entrou na sala '+roomName+'!');
 if(!authed){
  authed=true;
  const freshSwitch=accountMode&&msg.self.level===1&&msg.self.kills===0&&msg.self.role==='peregrino'&&session.formClass!=='peregrino';
  // Contas recém-criadas fazem sua escolha inicial pelo protocolo 'class'.
  // Visitantes já recebem a classe escolhida no welcome autoritativo.
  if(freshSwitch)send('class',{role:session.formClass});
  else if(!accountMode&&session.formClass!==msg.self.role){
   const classes={peregrino:'Peregrino',guardiao:'Guardião',arqueiro:'Arqueiro',curandeiro:'Curandeiro'};
   say('','O servidor não confirmou a mudança solicitada. Sua classe atual é '+
    (classes[msg.self.role]||msg.self.role)+'.','sys');
  }
  say('','Bem-vindo, '+session.name+'! Converse com os personagens usando E ou clicando neles. A história está na aba Crônicas.','sys');
  if(session.story?.stage===0)alert('✦ Fale com Lia, a Acendedora! Aproxime-se e pressione E.');
 }
 $('game').focus();
 }else if(msg.type==='character'){character(msg);
 }else if(msg.type==='appearanceChanged'){
  const person=session.players.get(msg.id);
  if(person)person.appearance=appearanceArt.normalize(msg.appearance);
 }else if(msg.type==='snapshot'){
  session.zone=msg.zone;displayOnline(msg.online);
  if(Array.isArray(msg.kingdoms))visibleKingdomBases=msg.kingdoms;
  const now=new Map();for(const m of msg.monsters||[])now.set(m.id,m);
  monsterMotion.sync([...now.values()]);session.monsters=now;
   updateMonsterLife();
  const people=new Map();for(const p of msg.players||[])people.set(p.id,p);
  playerMotion.sync([...people.values()],performance.now());session.players=people;
  defenseTargets=Array.isArray(msg.defenseTargets)?msg.defenseTargets:[];
  if(!defenseTargets.some(t=>t.id===defenseTargetId))defenseTargetId=null;
  if(tab==='social'&&socialSection==='guilds'&&defenseTargets.length)drawTab();
 }else if(msg.type==='travel'){defenseTargets=[];defenseTargetId=null;desktopAudio.play('travel');session.zone=msg.zone;visibleKingdomBases=[];session.portals=msg.portals||[];session.x=msg.x;session.y=msg.y;session.target=null;session.monsters.clear();monsterMotion.clear();playerMotion.clear();combatFx.clear();if(typeof clearMonsterSheet==='function')clearMonsterSheet();classSkillFx.clear();$('zoneTitle').textContent=msg.name;alert('✦ '+msg.name);drawTravel();
 }else if(msg.type==='hit'){if(msg.zone===session.zone){
  if(typeof desktopAudio!=='undefined')desktopAudio.play(msg.projectile==='arrow'?'arrow':msg.projectile==='holy-bolt'?'magic':'hit');
  const m=session.monsters.get(msg.monster);if(m)m.hp=msg.remaining;
   if(selectedMonsterSheet?.id===msg.monster)updateMonsterLife();
  spriteActions.monsters.set(msg.monster,{action:'hurt',at:performance.now()});
  if(msg.by)spriteActions.players.set(msg.by,{action:'attack',at:performance.now()});
  // O acerto é autoritativo: não desenhar flechas nem magias para cliques rejeitados.
  const started=combatFx.fire(msg,performance.now());
  if(!started)fx.push({x:m?.x||session.x,y:m?.y||session.y,text:'−'+msg.damage,t:performance.now(),color:'#ffe5a6'});
  if(msg.critical)fx.push({x:m?.x||session.x,y:(m?.y||session.y)-48,text:'✦ CRÍTICO!',t:performance.now(),color:'#ffc66d'});
 }
 }else if(msg.type==='guildDefenseHit'){if(msg.zone===session.zone){
  const victim=session.players.get(msg.targetId);if(victim)victim.hp=msg.remaining;
  fx.push({x:msg.x,y:msg.y-46,text:msg.neutralized?'🛡 NEUTRALIZADO':'⚔ −'+msg.damage,t:performance.now(),color:'#ffe28a'});
  if(msg.neutralized){defenseTargetId=null;alert(msg.targetName+' neutralizado. O contra-ataque foi encerrado.')}
 }
 }else if(msg.type==='monsterSheet'){renderMonsterSheet(msg.sheet);
 }else if(msg.type==='monsterEvolution'){if(msg.zone===session.zone){
  const monster=session.monsters.get(msg.monster);
  if(monster){monster.level=msg.level;monster.rank=msg.rank;monster.victories=msg.victories;monster.maxHp=msg.maxHp}
  if(selectedMonsterSheet?.id===msg.monster)renderMonsterSheet(msg.sheet);
  alert('⚔ '+(monster?.name||'Uma criatura')+' evoluiu após vencer um jogador: nível '+msg.level+' · '+msg.rank);
 }
 }else if(msg.type==='monsterLoot'){say('','Espólio encontrado: '+msg.name,'sys');
 }else if(msg.type==='troopStrike'){if(msg.zone===session.zone){
   const now=performance.now();
   troopShots.push({from:{x:msg.x,y:msg.y-25},to:{x:msg.to?.x||msg.x,y:(msg.to?.y||msg.y)-22},
    t:now,damage:msg.damage});
   troopShots=troopShots.slice(-20);
   fx.push({x:msg.to?.x||msg.x,y:(msg.to?.y||msg.y)-44,text:'⚔ +'+msg.damage,t:now,color:'#b5edc2'});
 }
 }else if(msg.type==='healed'){if(msg.zone===session.zone){
   const now=performance.now();
   classSkillFx.trigger({...msg,kind:'healer-recovery',duration:1050},now);
   if(typeof desktopAudio!=='undefined')desktopAudio.play('magic');
   // Vida e XP continuam sendo informados pelo servidor, nunca calculados aqui.
   fx.push({x:msg.x,y:msg.y-60,text:'+'+msg.amount+' VIDA',t:now,color:'#9bf5b9'});
   for(let i=0;i<3;i++)fx.push({x:msg.x-22+i*22,y:msg.y-25-(i%2)*12,
    text:'✦',t:now+i*70,color:i===1?'#e6ffd5':'#91ecc7'});
   if(msg.by)spriteActions.players.set(msg.by,{action:'attack',at:now});
 }
 }else if(msg.type==='skillEffect'){if(msg.zone===session.zone){
   const now=performance.now();
   classSkillFx.trigger(msg,now);
   if(msg.kind==='pilgrim-renewal')spriteActions.players.set(msg.targetId===session.id?session.name:msg.targetId,{action:'attack',at:now});
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
 }else if(msg.type==='chat'){say('['+msg.channel+'] '+msg.name,msg.text,msg.channel,msg.name===session.name?null:msg.id);
 }else if(msg.type==='notice'||msg.type==='system'){say('',msg.text,'sys');if(msg.type==='notice')alert(msg.text);
 }else if(msg.type==='partyInfo'){session.partyInvite=null;say('','Equipe: '+msg.members.join(', '),'sys');drawTab();
 }else if(msg.type==='partyInvite'){session.partyInvite=msg;alert('Convite de equipe de '+msg.by);drawTab();
 }else if(msg.type==='guildInvite'){session.guildInvite=msg;alert('Convite de guilda: '+msg.name);drawTab();
 }else if(msg.type==='tradeOffer'){session.tradeOffer=msg;alert('Você recebeu uma oferta de '+msg.from);drawTab();
 }else if(msg.type==='dialogue'){openDialogue(msg);
 }else if(msg.type==='storyResolved'){if(typeof desktopAudio!=='undefined')desktopAudio.play('victory');closeDialogue();say('',msg.message,'sys');alert(msg.complete?'✦ O SINO DA AURORA VOLTOU A TOCAR!':msg.reward?'✦ Novo capítulo! +'+msg.reward.xp+' EXP · +'+msg.reward.coins+' moedas':msg.message);if(msg.epilogue)showEpilogue(msg);
 }else if(msg.type==='error'){say('','Servidor: '+msg.message,'sys');$('connectionError').textContent=msg.message||'Erro de conexão';
  if(['full','name_taken','invalid_name','login_required','name_reserved','auth_unavailable','room_missing','room_full','rate_limited'].includes(msg.code)){authed=false;$('welcomeOverlay').hidden=false;clearTimeout(reconnectTimer);socket?.close();if(msg.code==='login_required')setAuthTab('login');}
 }}
function connect(){
 if(!progressToken){alert('Não foi possível iniciar a jornada. Atualize a página.');return}
 // Evita duas conexões simultâneas e sessões concorrentes para o mesmo personagem.
 if(socket&&(socket.readyState===WebSocket.OPEN||socket.readyState===WebSocket.CONNECTING))return;
 clearTimeout(reconnectTimer);reconnectTimer=null;
 setOnline(false,'Conectando…');const url=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/world-ws';
 try{const sock=new WebSocket(url);socket=sock;
  sock.onopen=()=>{
   if(socket!==sock)return;
   reconnectMs=1000;
   sock.send(JSON.stringify({type:'hello',name:session.name,role:session.formClass,appearance:session.formAppearance,token:progressToken,mode:accountMode?'account':'guest',roomId:selectedRoomId}));
  };
  sock.onmessage=e=>{
   if(socket!==sock)return;
   try{dispatch(JSON.parse(e.data))}catch(err){console.warn('Resposta inválida',err)}
  };
  sock.onclose=()=>{
   if(socket!==sock)return;
   socket=null;closeDialogue();roomSwitchPending=false;roomSwitchTarget=null;
   if($('roomSwitchDialog').open){
    $('roomSwitchError').textContent='A conexão caiu. Aguarde a reconexão antes de trocar de servidor.';
    $('roomSwitchConfirm').disabled=true;$('roomSwitchCancel').disabled=false;
   }
   setOnline(false,'Desconectado');
   session.monsters.clear();monsterMotion.clear();playerMotion.clear();combatFx.clear();if(typeof clearMonsterSheet==='function')clearMonsterSheet();session.players.clear();spriteActions.monsters.clear();spriteActions.players.clear();spriteActions.fallen.length=0;session.portals=[];
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
 session.name=name;session.formClass=$('role').value;session.formAppearance=appearanceCreator.read();connect();});

function updateRoomSelection(){
 const select=$('roomSelect'),room=roomCatalog.find(r=>r.id===selectedRoomId);
 const found=room||roomCatalog.find(r=>r.id==='auren-publica')||roomCatalog[0];
 if(!found)return;
 if(!room)selectedRoomId=found.id
 select.replaceChildren();
 for(const r of roomCatalog){
  const option=document.createElement('option');option.value=r.id;
  option.textContent='✦ '+r.name+' ('+r.online+'/'+r.capacity+')';
  option.disabled=r.online>=r.capacity;select.append(option);
 }
 select.value=selectedRoomId;
 const chosen=roomCatalog.find(r=>r.id===selectedRoomId)||found;
 $('roomSummary').textContent=chosen.online+'/'+chosen.capacity+' jogadores · Sala pública: entrada livre.';
}
async function loadRooms(){
 try{
  const res=await fetch('/api/rooms',{cache:'no-store'});
  if(!res.ok)throw Error('Indisponível');
  const data=await res.json();
  if(!Array.isArray(data.rooms))throw Error('Resposta inválida');
  roomCatalog=data.rooms.filter(r=>r.primary||r.online>0);
  // A reserva que ESTE jogador acabou de criar pode ser selecionada por
  // ele antes de entrar, mas jamais é anunciada aos demais visitantes.
  if(pendingRoom&&Date.now()<pendingRoomUntil){
   if(roomCatalog.some(r=>r.id===pendingRoom.id))pendingRoom=null;
   else roomCatalog.push(pendingRoom);
  }else pendingRoom=null;
  updateRoomSelection();
  if($('roomSwitchDialog').open)renderSwitchRooms();
 }catch{$('roomSummary').textContent='Não foi possível atualizar a lista de salas.'}
}
$('roomSelect').addEventListener('change',()=>{
 selectedRoomId=$('roomSelect').value;updateRoomSelection();
});
$('createRoomForm').addEventListener('submit',async e=>{
 e.preventDefault();const submit=e.currentTarget.querySelector('[type=submit]');
 submit.disabled=true;$('roomError').textContent='';
 try{
  const response=await fetch('/api/rooms',{
   method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({name:$('newRoomName').value.trim(),guestToken:progressToken})
  });
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Não foi possível criar a sala.');
  pendingRoom=data.room;pendingRoomUntil=Date.now()+60000;
  roomCatalog.push(data.room);selectedRoomId=data.room.id;
  updateRoomSelection();
  $('newRoomName').value='';
  $('createRoomForm').parentElement.open=false;
  $('roomSummary').textContent='Sala criada! Entre como Visitante ou com sua conta.';
 }catch(err){$('roomError').textContent=err.message||'Não foi possível criar a sala.'}
 finally{submit.disabled=false}
});

function updateSwitchChoice(){
 const id=$('roomSwitchSelect').value,room=roomCatalog.find(r=>r.id===id);
 const same=id===selectedRoomId,full=room&&room.online>=room.capacity;
 const suffix=same?'Esta é a sala atual.':full?'Esta sala está cheia.':'Sala pública: entrada livre.';
 $('roomSwitchInfo').textContent=room?room.online+'/'+room.capacity+' jogadores · '+suffix:'Sala indisponível.';
 $('roomSwitchConfirm').disabled=roomSwitchPending||!room||same||full||!session.connected;
}
function renderSwitchRooms(){
 const selector=$('roomSwitchSelect'),current=selector.value||selectedRoomId;
 selector.replaceChildren();
 for(const r of roomCatalog){
  const option=document.createElement('option');
  option.value=r.id;option.textContent='✦ '+r.name+' · '+r.online+'/'+r.capacity;
  option.disabled=r.id!==selectedRoomId&&r.online>=r.capacity;
  selector.append(option);
 }
 selector.value=roomCatalog.some(r=>r.id===current)?current:selectedRoomId;
 updateSwitchChoice();
}
$('roomSwitchSelect').addEventListener('change',()=>{
 $('roomSwitchError').textContent='';
 updateSwitchChoice();
});
$('roomSwitchCancel').addEventListener('click',()=>{
 if(roomSwitchPending)return;
 $('roomSwitchDialog').close();
});
$('roomSwitchDialog').addEventListener('cancel',event=>{
 if(roomSwitchPending)event.preventDefault();
});
$('roomSwitchBtn').addEventListener('click',async()=>{
 if(!session.connected||roomSwitchPending)return;
 const dialog=$('roomSwitchDialog');
 $('roomSwitchCurrent').textContent=roomName+' · '+session.online+'/60 jogadores';
 $('roomSwitchRole').value=session.role;
 $('roomSwitchError').textContent='';
 $('roomSwitchInfo').textContent='Consultando salas disponíveis…';
 $('roomSwitchSelect').replaceChildren();
 $('roomSwitchConfirm').disabled=true;
 $('roomSwitchCancel').disabled=false;
 // Em tela cheia, o diálogo precisa fazer parte do elemento fullscreen.
 const parent=document.fullscreenElement===fullScreenContainer?fullScreenContainer:document.body;
 if(dialog.parentElement!==parent)parent.appendChild(dialog);
 if(!dialog.open)dialog.showModal();
 await loadRooms();
 if(dialog.open)renderSwitchRooms();
});
$('roomSwitchCreateForm').addEventListener('submit',async event=>{
 event.preventDefault();
 if(roomSwitchPending||!session.connected)return;
 const form=$('roomSwitchCreateForm'),button=form.querySelector('[type=submit]');
 button.disabled=true;$('roomSwitchError').textContent='';
 try{
  const result=await fetch('/api/rooms',{
   method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({name:$('roomSwitchNewName').value.trim(),guestToken:progressToken})
  });
  const data=await result.json();
  if(!result.ok)throw new Error(data.error||'Falha ao criar sala.');
  pendingRoom=data.room;pendingRoomUntil=Date.now()+60000;
  roomCatalog.push(data.room);renderSwitchRooms();
  $('roomSwitchSelect').value=data.room.id;
  updateSwitchChoice();
  $('roomSwitchNewName').value='';
  form.parentElement.open=false;
  $('roomSwitchInfo').textContent='Sala criada! Confirme a troca para entrar.';
 }catch(err){$('roomSwitchError').textContent=err.message||'Não foi possível criar a sala.'}
 finally{button.disabled=false}
});
$('roomSwitchConfirm').addEventListener('click',()=>{
 if(roomSwitchPending||!session.connected)return;
 const chosen=roomCatalog.find(r=>r.id===$('roomSwitchSelect').value);
 if(!chosen||chosen.id===selectedRoomId)return;
 if(chosen.online>=chosen.capacity){
  $('roomSwitchError').textContent='Esta sala já está cheia. Escolha outra.';return;
 }
 roomSwitchPending=true;roomSwitchTarget=chosen.id;
 $('roomSwitchError').textContent='';
 $('roomSwitchInfo').textContent='Conectando à nova sala…';
 $('roomSwitchConfirm').disabled=true;$('roomSwitchCancel').disabled=true;
 $('roomSwitchBtn').disabled=true;
 send('switchRoom',{roomId:chosen.id,role:$('roomSwitchRole').value});
});

const requestedRoom=new URLSearchParams(location.search).get('room');
if(requestedRoom&&/^[a-f0-9]{18}$/.test(requestedRoom))selectedRoomId=requestedRoom;
loadRooms();
setInterval(()=>{if(!$('welcomeOverlay').hidden)return;void loadRooms()},15000);

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
 session.formAppearance=appearanceCreator.read();
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
 try{const r=await authPost('register',{username:$('registerName').value,email:$('registerEmail').value,password:$('registerPassword').value,guestToken:null});
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
 // J/Atacar permite atingir apenas o comandante cujo cerco foi
 // confirmado no servidor. Monstros e habilidades de suporte seguem iguais.
 if(!skill&&defenseTargetId){
  if(defenseTargets.some(t=>t.id===defenseTargetId&&t.expiresAt>Date.now())){
   send('defendGuild',{target:defenseTargetId});lastAction=performance.now();return;
  }
  defenseTargetId=null;
 }
 // Habilidades de suporte não exigem alvo. Somente Arqueiro exige marcação.
 // O servidor decide se há cura/defesa e se o golpe também alcança um monstro.
 if(skill&&['curandeiro','guardiao','peregrino'].includes(session.role)){
  send('skill',{target:session.target||null});lastActionWasSkill=true;
  lastAction=performance.now();return;
 }
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
   if(m){session.target=m.id;send('inspectMonster',{monster:m.id})}
  }
 }
 if(!session.target){alert(touchDevice?'Aproxime-se de um monstro ou toque nele para selecionar.':'Clique sobre um monstro para selecioná-lo.');return}
 if(session.role==='arqueiro'){
  m=session.monsters.get(session.target);
  if(m){const dx=m.x-session.x,dy=m.y-session.y;session.dir=Math.abs(dx)>Math.abs(dy)?dx>0?1:3:dy>0?2:0;}
 }
 send(skill?'skill':'attack',{target:session.target});lastActionWasSkill=Boolean(skill);lastAction=performance.now();
}
$('talkBtn').onclick=talkToNearest;$('attackBtn').onclick=()=>attack(false);$('skillBtn').onclick=()=>attack(true);$('potionBtn').onclick=()=>send('use',{item:'pocao'});$('questBtn').onclick=()=>selectTab('quests');$('mapBtn').onclick=showWorldMap;$('chatFocusBtn').onclick=()=>$('chatInput').focus();
cvs.addEventListener('click',e=>{if(!session.connected)return;const rect=cvs.getBoundingClientRect(),wx=(e.clientX-rect.left)*W/rect.width+session.cameraX,wy=(e.clientY-rect.top)*H/rect.height+session.cameraY;
 // O sprite real tem 92px de altura, portanto toda a porta é clicável,
 // não apenas a posição dos pés; o servidor ainda valida proximidade do jogador.
 const stronghold=visibleKingdomBases.find(b=>Math.abs(b.x-wx)<65&&wy>=b.y-110&&wy<=b.y+32);
 if(stronghold){cityUI.open(stronghold,kingdomState);return}
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
 const hostile=defenseTargets.filter(t=>t.id&&t.expiresAt>Date.now());
 const defender=hostile.map(t=>({threat:t,player:session.players.get(t.id)})).find(({player})=>
  player&&Math.hypot(player.x-wx,player.y-wy)<Math.max(45,touchRadius));
 if(defender){defenseTargetId=defender.threat.id;session.target=null;
  alert('🛡 Alvo legítimo: '+defender.threat.name+' · J ou Atacar para defender sua guilda.');return}
 if(candidate){defenseTargetId=null;session.target=candidate.id;send('inspectMonster',{monster:candidate.id});alert('Alvo: '+candidate.name+' · Nível '+candidate.level+' · '+candidate.rank+(touchDevice?' · Toque em Atacar':' · J para atacar'))}});
function selectTab(next){tab=next;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 if(next==='social'&&session.connected)send('guild',{action:'list'});
 drawTab(true)}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>selectTab(b.dataset.tab));
$('tabContent').addEventListener('focusout',()=>{
 setTimeout(()=>{
  const container=$('tabContent');
  if(container.dataset.redrawPending==='1'&&!container.contains(document.activeElement))drawTab();
 },180);
});
function button(label,action,details={}){const el=document.createElement('button');el.type='button';el.textContent=label;el.onclick=()=>send(action,details);return el}
function field(parent,id,label,max=40){const l=document.createElement('label');l.textContent=label;l.style.display='block';l.style.margin='7px 0 3px';l.style.color='#e7cd98';const input=document.createElement('input');input.id=id;input.maxLength=max;input.placeholder=label;parent.append(l,input);return input}
function group(parent){const d=document.createElement('div');d.className='entry';parent.append(d);return d}
function appendText(parent,tag,text){const e=document.createElement(tag);e.textContent=text;parent.append(e);return e}
function drawTab(force=false){const parent=$('tabContent');
 // Estados e mensagens chegam várias vezes por segundo. Não destruir um
 // <input> ou <select> com foco: isso apagava o texto e fechava o teclado mobile.
 const editing=parent.contains(document.activeElement)&&
  document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]');
 if(editing&&!force){parent.dataset.redrawPending='1';return}
 parent.dataset.redrawPending='0';parent.replaceChildren();const s=session.characters;if(!s){appendText(parent,'p','Entre no mundo para ver seu inventário.');return}
 if(tab==='inventory'){
  appendText(parent,'h3','Sua bolsa de equipamentos');
  if(s.role==='arqueiro'&&!(s.inventory?.arco>0)){
   const starter=group(parent);appendText(starter,'b','Arco simples · Equipado');
   appendText(starter,'small','Arma inicial da classe: flechas ilimitadas. O Arco dos ventos do mercado aumenta o dano.');
  }
  for(const [id,count] of Object.entries(s.inventory||{}).filter(([,n])=>n>0)){
   const item=id==='chave_coroa_aurora'?{name:'♛ Chave da Câmara da Aurora',storyOnly:true}:id==='chave'?{name:'Chave da masmorra · presente da história',storyOnly:true}:session.shop[id]||session.relics[id];if(!item)continue;
   const d=group(parent);appendText(d,'b',item.name+' · '+count+(id==='arco'&&s.role==='arqueiro'?' · Equipado':''));appendText(d,'small',
    item.storyOnly?'Chave pessoal conquistada no enredo ou pela soberania continental · não vendida nem negociável':
    item.rarity?'✦ '+item.rarity.toUpperCase()+' · Relíquia de chefe · '+(item.role&&item.role!==s.role?'Exclusiva de '+item.role+' (não equipada)':'Bônus passivo equipado ao possuir'):
    id==='pocao'||id==='superpocao'?'Restaura vida':id==='chave_coroa_aurora'?'Chave pessoal e não negociável. Abre apenas a quarta masmorra; obtida pelo soberano da Coroa Continental.':'Equipamento / recurso');
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
  const d=group(parent);d.className='story-step';
  appendText(d,'small',q.finished?'✦ HISTÓRIA CONCLUÍDA':q.stage<16?'ATO I · O SINO DA AURORA':'VIGÍLIA DEPOIS DO SINO · '+(q.book||'Novo ato'));
  appendText(d,'b',q.finished?'✦ A Aurora pertence a todos':`Capítulo ${q.stage+1}/${q.total} · ${q.title}`);
  if(q.finished){appendText(d,'small','Você reuniu as sete Centelhas, devolveu o sino ao reino e recuperou os quatro testemunhos da Vigília. Pode revisitar os personagens da história.')}
  else{appendText(d,'small',`Próximo NPC: ${q.npc}`);appendText(d,'small',`Região: ${session.zones[q.zone]?.name||'Região '+(q.zone+1)}`);
   appendText(d,'small',q.required>0?(q.active?`Desafio aceito: ${q.progress}/${q.required} criaturas derrotadas nesta região`:`Converse com o NPC para receber o desafio (${q.required} criaturas)`):'Converse com o NPC para continuar a história.');
   if(q.active&&q.progress>=q.required)appendText(d,'small','✦ Objetivo concluído: volte ao NPC e finalize o capítulo.');
  }
  const shards=document.createElement('div');shards.className='story-shards';shards.textContent=`✦ Centelhas reunidas: ${q.shards.length}/7`;parent.append(shards);
  if(q.shards.length)appendText(parent,'small',q.shards.join(' · '));
  const testimonyCount=Array.isArray(q.testimonies)?q.testimonies.length:0;
  const witness=document.createElement('div');witness.className='story-shards';
  witness.textContent='✧ Testemunhos da Vigília: '+testimonyCount+'/4';parent.append(witness);
  if(testimonyCount)appendText(parent,'small',q.testimonies.join(' · '));
  if(q.stage===16&&!q.finished)appendText(parent,'small','O sino voltou a tocar. A nova saga começa nas galerias da Masmorra da Raiz. Siga os portais até o primeiro subsolo.');

  parent.append(button('Conversar com NPC próximo', 'talk', {npc:nearNpc()?.id||''}));
 }else if(tab==='shop'){
  appendText(parent,'h3','Comerciantes de Auren');
   appendText(parent,'small','A compra é presencial, não há loja global. Encontre comerciantes no mapa, aproxime-se e converse para adquirir poções e equipamentos. Chaves das masmorras são obtidas pela história ou pela Coroa Continental.');
   for(const merchant of session.merchants){
    const block=group(parent);appendText(block,'b','🛒 '+merchant.name+' · '+merchant.region);
    const npc=session.npcs.find(n=>n.id===merchant.id);
    const near=Boolean(npc&&npc.zone===session.zone&&distance(npc,session)<=165);
    appendText(block,'small',near?'Comerciante próximo: pode negociar.':
     npc?.zone===session.zone?'Aproxime-se deste morador para negociar.':'Viaje até '+merchant.region+' para encontrar o vendedor.');
    const talk=document.createElement('button');talk.type='button';talk.textContent=near?'Conversar e negociar':'Negociação presencial';
    talk.disabled=!near;talk.onclick=()=>send('talk',{npc:merchant.id});block.append(talk);
   }
 }else if(tab==='social'){
  appendText(parent,'h3','Vida social de Auren');
  const nav=document.createElement('div');nav.className='social-section-nav';
  for(const [id,label] of [['guilds','⚑ Guildas'],['party','⚔ Equipe'],['politics','♛ Política'],['safety','☷ Proteção']]){
   const control=document.createElement('button');control.type='button';
   control.textContent=label;control.classList.toggle('active',socialSection===id);
   control.setAttribute('aria-pressed',String(socialSection===id));
   control.onclick=()=>{socialSection=id;drawTab(true)};nav.append(control);
  }
  parent.append(nav);
  if(socialSection==='party'){
   const p=group(parent);appendText(p,'b','Equipe de aventureiros');
   const n=field(p,'inviteName','Nome do convidado',18),actions=document.createElement('div');
   actions.className='entry-actions';
   const create=button('Criar equipe','party',{action:'create'});
   const inv=document.createElement('button');inv.type='button';inv.textContent='Convidar';
   inv.onclick=()=>send('party',{action:'invite',target:n.value.trim()});
   actions.append(create,inv,button('Sair','party',{action:'leave'}));p.append(actions);
   if(session.partyInvite)p.append(button('Aceitar equipe de '+session.partyInvite.by,'party',{action:'accept',party:session.partyInvite.party}));
  }
  if(socialSection==='guilds'){
   window.PeregrinosGuildRecruitment.render(parent,{
    directory:guildDirectory,character:s,invite:session.guildInvite,send
   });
   if(s.guild){
    const guard=group(parent);guard.classList.add('guild-defense-panel');
    appendText(guard,'b','🛡 Defesa da guilda · PvP restrito');
    appendText(guard,'small','Somente quem iniciou um cerco real pode ser atacado. O direito dura cinco minutos. É necessário estar na mesma sala e região, dentro do alcance da classe. Neutralizar imobiliza o agressor por 12 segundos, sem matar nem roubar itens.');
    if(!defenseTargets.length)appendText(guard,'small','Nenhum agressor autorizado para contra-ataque neste momento.');
    for(const threat of defenseTargets){
     const secs=Math.max(0,Math.ceil((threat.expiresAt-Date.now())/1000));
     const row=document.createElement('div');row.className='guild-defense-target';
     appendText(row,'strong',threat.name+' · '+threat.attackerGuild);
     appendText(row,'small',secs+' s de defesa · '+(threat.id?'Na sua sala e região':threat.inRoom?'Em outra região':'Em outra sala ou desconectado'));
     const fight=document.createElement('button');fight.type='button';fight.textContent='⚔ Contra-atacar somente '+threat.name;
     fight.disabled=!threat.id||secs<=0;
     fight.onclick=()=>{defenseTargetId=threat.id;session.target=null;send('defendGuild',{target:threat.id})};
     row.append(fight);guard.append(row);
    }
   }
  }
  if(socialSection==='politics'){
  const kingdom=group(parent);kingdom.classList.add('kingdom-panel');
  appendText(kingdom,'h3','✦ Reinos e política continental');
  appendText(kingdom,'small','Auren possui 12 regiões de superfície para a política e 4 masmorras sem fortalezas. Cada guilda possui apenas uma capital. Uma única guilda já recebe a Coroa Continental, mesmo sem várias bases; havendo rivais, o poder depende da maioria das regiões efetivamente controladas.');
  if(!kingdomState){kingdom.append(button('Consultar reinos','kingdom',{action:'inspect'}))}
  else{
   const k=kingdomState.yourGuild;
   appendText(kingdom,'small','Política: '+kingdomState.ranking.length+' guildas · máximo de '+kingdomState.maxTroops+' soldados por reino');
    const crown=kingdomState.continentalCrown;
    const crownBox=group(kingdom);
    appendText(crownBox,'b','♛ Câmara da Aurora — Masmorra da Coroa Continental');
    appendText(crownBox,'small',crown?
     'Coroa Continental: '+crown.guild+' · '+(crown.uncontested?'única guilda existente, domínio incontestado de Auren.':
      'maioria das regiões governadas ('+crown.territories+'/12).')+
      ' A Chave da Câmara da Aurora é exclusiva do líder soberano.':
     'Coroa Continental em disputa. Com vários reinos, a chave pertence ao líder de quem obtiver maioria das regiões sob governo; não são necessárias sete bases.');
    if(crown?.holder){
     const owns=(s.inventory?.chave_coroa_aurora||0)>0;
     const remaining=Math.max(0,24*3600000-(Date.now()-(s.crownKeyIssuedAt||0)));
     const canClaim=!owns&&remaining===0;
     const claim=document.createElement('button');claim.type='button';
     claim.textContent=owns?'♛ Chave da Câmara da Aurora no inventário':
      canClaim?'♛ Reivindicar Chave da Câmara da Aurora':'♛ Selo recarrega em '+Math.ceil(remaining/3600000)+' h';
     claim.disabled=!canClaim;claim.onclick=()=>send('claimCrownKey');
     crownBox.append(claim);
    }
   if(k){
    appendText(kingdom,'b','Seu reino: '+k.name+(crown?.guild===k.name?(k.leader?' · SOBERANO CONTINENTAL':' · Reino da Coroa'):(k.leader?' · Líder':' · Integrante')));
    appendText(kingdom,'small',k.base?'Capital em '+(session.zones[k.base.zone]?.name||'Região')+' · ('+k.base.x+', '+k.base.y+')':'Sua guilda ainda não tem capital.');
    if(k.leader){
     const btn=button(k.base?'Transferir capital (450 moedas)':'Construir fortaleza (800 moedas)','kingdom',{
      action:'place',x:Math.round(session.x),y:Math.round(session.y)});
     btn.title='A fortaleza será construída na sua localização atual, desde que seja terreno livre distante dos portais';kingdom.append(btn);
    }
    if(k.base){
     const army=k.army||{};
     appendText(kingdom,'small','Exército: '+Object.entries(army).map(([id,n])=>(kingdomState.unitTypes[id]?.name||id)+' '+n).join(' · '));
     // Tropas da guilda são produzidas apenas no quartel, gastando os
     // recursos coletivos, nunca o dinheiro pessoal de um jogador.
     const supplies=kingdomState.trainingCosts||{},cityStock=k.stock||{};
     const unitSelect=document.createElement('select');unitSelect.id='kingdomTrainUnit';
     unitSelect.setAttribute('aria-label','Unidade a treinar com recursos');
     for(const [id,cost]of Object.entries(supplies)){
      const opt=document.createElement('option');opt.value=id;
      opt.textContent=(kingdomState.unitTypes[id]?.name||id)+' · '+cost.food+' alimentos / '+cost.timber+' madeiras / '+cost.stone+' pedras';
      unitSelect.append(opt);
     }
     const howMany=document.createElement('input');howMany.type='number';howMany.min='1';howMany.max='40';howMany.value='5';
     howMany.id='kingdomTrainCount';howMany.setAttribute('aria-label','Quantidade de unidades a treinar');
     const barracksReady=(kingdomState.cities||[]).some(c=>c.name===k.name&&
      c.buildings?.some(b=>b.type==='barracks'&&b.status==='complete'));
     const train=document.createElement('button');train.type='button';
     train.textContent='⚒ Produzir soldados com recursos da guilda';
     train.disabled=!barracksReady||!kingdomState.persistentAccount;
     train.onclick=()=>send('kingdom',{action:'train',unit:unitSelect.value,count:Number(howMany.value)});
     appendText(kingdom,'small','Estoque coletivo: '+(cityStock.food||0)+' alimentos · '+(cityStock.timber||0)+
      ' madeiras · '+(cityStock.stone||0)+' pedras. '+(barracksReady?'Treine próximo à capital.':'Construa e conclua um quartel antes de produzir tropas.'));
     kingdom.append(unitSelect,howMany,train);
     appendText(kingdom,'small','Escolta pessoal: '+Object.entries(k.escort||{}).map(([u,n])=>(kingdomState.unitTypes[u]?.name||u)+' '+n).join(' · ')+' · tropas requisitadas acompanham você imediatamente no mapa 2D.');
     const escortInput=document.createElement('input');escortInput.type='number';escortInput.min='1';escortInput.max='40';escortInput.value='5';escortInput.setAttribute('aria-label','Soldados para acompanhar jogador');
     const escortType=document.createElement('select');escortType.setAttribute('aria-label','Classe da escolta');
     for(const [id,unit] of Object.entries(kingdomState.unitTypes||{})){
      const option=document.createElement('option');option.value=id;option.textContent=unit.name+' · disponíveis '+(army[id]||0);escortType.append(option);
     }
     const deploy=document.createElement('button');deploy.textContent='➤ Convocar escolta imediata';
     deploy.onclick=()=>send('kingdom',{action:'escort',unit:escortType.value,count:Number(escortInput.value)});
     const recall=document.createElement('button');recall.textContent='↩ Recolher escolta';
     recall.disabled=!Object.values(k.escort||{}).some(v=>v>0);
     recall.onclick=()=>send('kingdom',{action:'recall'});
     kingdom.append(escortType,escortInput,deploy,recall);
     if(k.canManage){
      const fortress=button('♜ Expandir fortaleza '+(k.base.level||1)+'/'+(kingdomState.fortressMaxLevel||60)+' · '+(k.base.level+1)*500+' moedas','kingdom',{action:'upgrade'});
      fortress.disabled=(k.base.level||1)>=(kingdomState.fortressMaxLevel||60);kingdom.append(fortress);
      const fortify=button('🛡 Melhorar defesa '+(k.fortressDefense?.walls||0)+'/'+(k.base.level||1)+' · força '+(k.fortressDefense?.defense||0),'kingdom',{action:'fortify'});
      fortify.disabled=(k.fortressDefense?.walls||0)>=(k.base.level||1);kingdom.append(fortify);
     }
          // Política é decidida pela guilda, não por nível de personagem isolado.
     appendText(kingdom,'small','⚔ Exército '+(k.currentTroops||0)+' / '+(k.armyCapacity||kingdomState.maxTroops||300)+
      ' soldados · guarnição + escoltas. Manutenção: '+Math.ceil((k.currentTroops||0)/25)+
      ' alimentos a cada 30 minutos. Próximo abastecimento: '+
      (k.upkeepAt?Math.max(0,Math.ceil((k.upkeepAt+(kingdomState.upkeepCycleMs||1800000)-Date.now())/60000))+' min':'primeiro ciclo ao entrar')+'.');
     if(k.truce?.until>Date.now()){
      appendText(kingdom,'small','☮ CESSAR-FOGO ATIVO até '+new Date(k.truce.until).toLocaleTimeString('pt-BR')+
       '. A fortaleza está protegida; nenhuma construção foi perdida.');
     }
     if(k.crisis){
      const crisis=group(kingdom);
      appendText(crisis,'b','⚠ Defesa em risco · pressão de conquista '+k.crisis.pressure+'%');
      appendText(crisis,'small','Invasores: '+(k.crisis.attackerName||'guilda rival')+
       ' · rendição possível a partir de '+(kingdomState.surrenderThreshold||60)+'%.');
      if(k.crisis.canSurrender&&!k.truce?.until){
       const votes=Object.keys(k.crisis.votes||{}).length;
       appendText(crisis,'small','Votos pela rendição: '+votes+' / '+(Math.floor((k.membersCount||1)/2)+1)+'.');
       const vote=document.createElement('button');vote.type='button';vote.textContent='☮ Votar pela rendição negociada';
       vote.disabled=Boolean(k.crisis.yourVote);
       vote.onclick=()=>send('kingdom',{action:'surrenderVote'});
       crisis.append(vote);
       if(k.leader){
        const concede=document.createElement('button');concede.type='button';
        concede.textContent='☮ Aceitar rendição e cessar-fogo de 30 min';
        concede.onclick=()=>{if(confirm('Render-se transfere influência e até 10% do tesouro compartilhado, preserva os edifícios e garante 30 minutos de cessar-fogo. Confirmar?'))
         send('kingdom',{action:'surrender'})};
        crisis.append(concede);
       }
      }
     }
     const diplomacy=group(kingdom);
     appendText(diplomacy,'b','☮ Diplomacia e alianças');
     appendText(diplomacy,'small','Aliados: '+(k.allies?.join(' · ')||'nenhum')+' · até 3 alianças por guilda. Soldados de aliados próximos ajudam em cercos.');
     if(k.leader){
      const selection=document.createElement('select');selection.setAttribute('aria-label','Reino para proposta diplomática');
      for(const b of kingdomState.bases||[]){
       if(b.name===k.name)continue;
       const opt=document.createElement('option');opt.value=b.name.toLocaleLowerCase('pt-BR');opt.textContent=b.name;selection.append(opt);
      }
      if(selection.options.length){
       const offer=document.createElement('button');offer.type='button';offer.textContent='✉ Propor aliança';
       offer.onclick=()=>send('kingdom',{action:'allyOffer',target:selection.value});
       diplomacy.append(selection,offer);
      }
      for(const request of k.allianceOffers||[]){
       const accept=document.createElement('button');accept.type='button';
       accept.textContent='✓ Aceitar aliança com '+request.name;
       accept.onclick=()=>send('kingdom',{action:'allyAccept',target:request.key});
       diplomacy.append(accept);
      }
      for(const name of k.allies||[]){
       const leave=document.createElement('button');leave.type='button';
       leave.textContent='Encerrar aliança: '+name;
       leave.onclick=()=>{if(confirm('Encerrar aliança com '+name+'?'))send('kingdom',{action:'allyBreak',target:name.toLocaleLowerCase('pt-BR')})};
       diplomacy.append(leave);
      }
     }else if(k.allianceOffers?.length)appendText(diplomacy,'small','Propostas pendentes: '+k.allianceOffers.map(x=>x.name).join(', ')+'. O líder pode aceitá-las.');
appendText(kingdom,'small','Construção: '+(kingdomState.buildBounds?.width||14)+'×'+(kingdomState.buildBounds?.width||14)+' lotes · armazenamento '+(kingdomState.stockCapacity||600)+' por recurso. Cada prédio tem relógio próprio: melhore-o para aumentar o rendimento e acelerar o ciclo. Casas geram moedas, fazendas alimentos, mercados materiais; quartéis e torres fornecem recursos e defesas.');
     const nearby=(kingdomState.bases||[]).filter(b=>b.name!==k.name&&!k.allies?.includes(b.name)&&b.zone===session.zone&&Math.hypot(b.x-session.x,b.y-session.y)<=170);
     if(nearby.length){
      const targets=document.createElement('select');targets.setAttribute('aria-label','Fortaleza rival próxima');
      for(const b of nearby){const option=document.createElement('option');option.value=b.name.toLocaleLowerCase('pt-BR');option.textContent=b.name;targets.append(option)}
      const siege=document.createElement('button');siege.type='button';siege.textContent='⚔ Atacar fortaleza rival agora';
      siege.disabled=!Object.values(k.escort||{}).some(v=>v>0)||Date.now()<(k.nextRaidAt||0)||k.truce?.until>Date.now();
      siege.onclick=()=>send('kingdom',{action:'siege',target:targets.value});
      kingdom.append(targets,siege);
     }else appendText(kingdom,'small','Para atacar outra guilda, reúna ao menos cinco soldados e caminhe até a fortaleza inimiga. O cerco é resolvido imediatamente no local.');
    }
   }else appendText(kingdom,'small','Crie ou entre em uma guilda para participar da política dos reinos. Requer conta registrada.');
   const ranking=group(kingdom);appendText(ranking,'b','Classificação política de Auren');
   for(const [i,entry]of kingdomState.ranking.slice(0,7).entries())
    appendText(ranking,'small',(i+1)+'º '+entry.name+' · '+entry.title+' · '+entry.territories+' regiões');
   kingdom.append(button('Atualizar o conselho','kingdom',{action:'inspect'}));
  }
  }
  if(socialSection==='safety'){
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
 if(last){
  for(const option of dialogue.choices||[]){const btn=document.createElement('button');btn.type='button';btn.textContent=option.label;
   btn.onclick=()=>{if(option.id==='later'){closeDialogue();return}send('storyChoice',{npc:dialogue.id,choice:option.id});closeDialogue()};box.append(btn)}
  for(const item of dialogue.merchant||[]){
   const buy=document.createElement('button');buy.type='button';
   buy.textContent='🪙 Comprar '+item.name+' · '+item.price+' moedas';
   buy.onclick=()=>{
    const npc=session.npcs.find(n=>n.id===dialogue.id);
    if(!npc||npc.zone!==session.zone||distance(npc,session)>165){closeDialogue();return}
    send('buy',{npc:dialogue.id,item:item.id});
   };
   box.append(buy);
  }
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
    (gate.zone===15&&z<12?'♛ '+gate.name+' (chave da Coroa Continental)':gate.dungeon&&z<12?'⌘ '+gate.name+' (chave comum)':gate.name);
  b.title=gate.zone===15&&z!==15?'A última masmorra exige uma chave pessoal conquistada pela Coroa Continental':gate.gateway?'Passagem real após o sexto subsolo: continue a exploração':
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
 description.textContent='Os reinos disputam o conselho de 16 regiões históricas; bases só podem ser fundadas nas 12 regiões de superfície. As masmorras são neutras. Use os portais para viajar.';
 dialog.append(description);
 const grid=document.createElement('div');grid.className='atlas-grid';
 const explored=new Set(session.characters?.visited||[]);
 for(const z of session.zones){
  const tile=document.createElement('div');tile.className='atlas-entry'+(z.id===session.zone?' current':'')+(explored.has(z.id)?' explored':'');
  const title=document.createElement('b');title.textContent=(explored.has(z.id)?'✦ ':'◇ ')+z.name;
  const sub=document.createElement('small');
  sub.textContent=z.id<12?'Superfície · '+z.biome:
    z.id<16?'Masmorra principal':('Subsolo '+(1+(z.id-16)%6)+' · Complexo '+(1+Math.floor((z.id-16)/6)));
  tile.append(title,sub);
  const ruler=kingdomState?.zones?.find(r=>r.zone===z.id);
  if(ruler){
   const line=document.createElement('small');line.className='atlas-kingdom';
   line.textContent=ruler.buildable?(ruler.ruler?'♛ Domínio: '+ruler.ruler:'◇ Território sem domínio'):'⚑ Território neutro · sem fortificações';
   tile.append(line);
  }
  for(const base of kingdomState?.bases?.filter(b=>b.zone===z.id)||[]){
   const line=document.createElement('small');line.textContent='🏰 '+base.name+' ('+base.x+', '+base.y+')';tile.append(line);
  }
  grid.append(tile);
 }
 dialog.append(grid);if(!dialog.open)dialog.showModal();
}
$('chatForm').addEventListener('submit',e=>{
 e.preventDefault();const input=$('chatInput'),text=input.value.trim();
 if(!text)return;
 // Jamais apagar o rascunho se o WebSocket estiver desconectado ou falhar.
 if(send('chat',{text,channel:$('chatChannel').value})){
  input.value='';$('game').focus();
 }else{input.setCustomValidity('Aguardando reconexão. Sua mensagem foi preservada.');
  input.reportValidity();setTimeout(()=>input.setCustomValidity(''),1200)}
});
$('chatPresetSend').addEventListener('click',()=>{
 const phrase=$('chatPreset').value;
 if(!phrase)return;
 if(send('chat',{text:phrase,channel:$('chatChannel').value}))$('chatPreset').selectedIndex=0;
});

// A renderização do mundo aberto reutiliza o atlas 16-bit da campanha original.
const classicRenderer=window.PeregrinoArt16.create({ctx,W,H});
function canvasDraw(now,dt){
  ctx.imageSmoothingEnabled=false;
  session.cameraX=clamp(Math.floor(session.x-W/2),0,ZONE_W-W);
  session.cameraY=clamp(Math.floor(session.y-H/2),0,ZONE_H-H);
  const projectiles=combatFx.frame(now);
  for(const shot of projectiles)if(shot.justHit){
   fx.push({x:shot.x,y:shot.y,text:'−'+shot.damage,t:now,
     color:shot.projectile==='holy-bolt'?'#a8f4e1':shot.skill?'#b7f9f0':'#ffe5a6'});
  }
  fx=fx.filter(f=>now-f.t<1100);
  spriteActions.fallen=spriteActions.fallen.filter(m=>now-m.defeatedAt<570);
  for(const [id,v] of spriteActions.monsters)if(now-v.at>750)spriteActions.monsters.delete(id);
  for(const [id,v] of spriteActions.players)if(now-v.at>580)spriteActions.players.delete(id);
  classicRenderer.render({zone:session.zone,zones:session.zones,x:session.x,y:session.y,kingdomBases:visibleKingdomBases,
    name:session.name||'PEREGRINO',role:session.role,appearance:session.appearance,dir:session.dir,
    monsters:monsterMotion.draw([...session.monsters.values()],dt),players:playerMotion.draw([...session.players.values()],now),projectiles,
    monsterActions:spriteActions.monsters,playerActions:spriteActions.players,fallen:spriteActions.fallen,
    heroPose:now-spriteActions.localHurtAt<310?{action:'hurt',at:spriteActions.localHurtAt}:{action:'attack',at:lastAction},
    npcs:session.npcs.filter(n=>n.zone===session.zone),portals:session.portals,storyStage:session.story?.stage||0,
    cameraX:session.cameraX,cameraY:session.cameraY,target:session.target,now,fx,lastAction,lastActionWasSkill,
    skillEffects:classSkillFx.frame(now,{zone:session.zone,players:session.players,monsters:session.monsters,
      self:{id:session.id,x:session.x,y:session.y}}),
    drawSkillEffects:(drawCtx,events)=>classSkillFx.paint(drawCtx,events),
    moving:Math.hypot(session.x-lastFrameX,session.y-lastFrameY)>0.06});
  cityUI.drawMarches(ctx,{zone:session.zone,cameraX:session.cameraX,cameraY:session.cameraY,now});
  // Escoltas persistidas seguem seus comandantes em todas as salas e regiões.
  if(armyArt){
   const own=kingdomState?.yourGuild?.escort;
   if(own&&Object.values(own).some(n=>n>0))
    armyArt.drawFormation(ctx,own,session.x-session.cameraX,session.y-session.cameraY,now);
   for(const player of session.players.values()){
    if(player.zone!==session.zone||!player.escort)continue;
    armyArt.drawFormation(ctx,player.escort,player.x-session.cameraX,player.y-session.cameraY,now,{label:false});
   }
   troopShots=troopShots.filter(shot=>now-shot.t<420);
   for(const shot of troopShots){
    const alpha=Math.max(0,Math.min(1,(now-shot.t)/350));
    const x=Math.round(shot.from.x+(shot.to.x-shot.from.x)*alpha-session.cameraX);
    const y=Math.round(shot.from.y+(shot.to.y-shot.from.y)*alpha-session.cameraY);
    ctx.save();ctx.fillStyle='#f9e1a0';ctx.fillRect(x-3,y-3,7,7);
    ctx.fillStyle='#89d8ba';ctx.fillRect(x-1,y-1,3,3);ctx.restore();
   }
  }
   lastFrameX=session.x;lastFrameY=session.y;
}
let lastFrameX=768,lastFrameY=512;
let lastFrame=0;function tick(t){const dt=Math.min(.065,(t-lastFrame)/1000||0);lastFrame=t;
 if(session.connected&&$('welcomeOverlay').hidden&&$('npcDialogue').hidden&&(typeof document==='undefined'||!document.querySelector('.city-dialog')?.open)){let dx=0,dy=0;if(moves.up.some(k=>keys.has(k)))dy--;if(moves.down.some(k=>keys.has(k)))dy++;if(moves.left.some(k=>keys.has(k)))dx--;if(moves.right.some(k=>keys.has(k)))dx++;
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
// Restaurar uma aba do histórico (BFCache) também inicia uma nova jornada.
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload()});
// Nunca iniciar Visitante automaticamente: sempre pedir nome e classe.
void setupLogin();
window.OsPeregrinosMundo=Object.freeze({get online(){return session.online},get zone(){return session.zone},get connected(){return session.connected},get monsters(){return session.monsters.size},get name(){return session.name}});
})();

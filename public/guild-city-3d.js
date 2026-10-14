'use strict';
/* Interface da cidade 3D: só substitui a fortaleza, preserva o MMORPG e suas marchas. */
(function(root){
 const old=root.PeregrinosCity;
 if(!old||!root.PeregrinosCityLayout)throw Error('Dependências de guilda indisponíveis');
 const layout=root.PeregrinosCityLayout;
 const types={house:['Casario',120,'⌂'],farm:['Fazenda',160,'♧'],barracks:['Quartel',280,'⚔'],tower:['Torre',360,'♜'],market:['Mercado',240,'✦']};
 root.PeregrinosCity=Object.freeze({create({send}){
  // Mantém a visualização de exércitos no continente principal SEM alterar o motor 2D.
  const oldUI=old.create({send});
  let state=null,base=null,selected=null,selectedLot=null,selectedBuilding=null,scene=null,token=0,loading=false,clockOffset=0,queueTicker=null,lastCompletionInspect=0,lastProductionPaint=0;
  let requestSeq=0;
  const requests=new Map(),provisionals=new Map(),awaitingDurable=new Map();
  const MAX_UNCONFIRMED=60;
  const dlg=document.createElement('dialog');dlg.className='guild3d-dialog';dlg.setAttribute('aria-label','Capital tridimensional da guilda');
  dlg.innerHTML='<div class="guild3d-shell">'+
   '<header class="guild3d-header"><div class="guild3d-brand"><span class="guild3d-kicker">OS PEREGRINOS · REINOS DE AUREN</span><strong id="guild3dTitle">Capital da guilda</strong><small id="guild3dSubtitle">Gestão do reino</small></div>'+
   '<div class="guild3d-topresources"><div class="guild3d-label">TESOURO · RECURSOS</div><div id="guild3dStock" class="guild3d-stocks"></div></div>'+
   '<div class="guild3d-header-actions"><button type="button" id="guild3dFocus" title="Centralizar câmera">◎ Centralizar</button><button type="button" id="guild3dClose">✕ Voltar ao continente</button></div></header>'+
   '<div class="guild3d-main"><div class="guild3d-stage"><div id="guild3dViewport" class="guild3d-viewport"><p id="guild3dLoading">Preparando sua capital tridimensional…</p></div>'+
   '<div class="guild3d-build-panel"><div class="guild3d-panel-heading"><strong>⚒ MENU DE CONSTRUÇÃO</strong><small>Edifícios do reino</small></div><div id="guild3dChoices" class="guild3d-choices"></div></div>'+
   '<div class="guild3d-lot-panel"><div class="guild3d-panel-heading"><strong>⌂ LOTE SELECIONADO</strong><small id="guild3dLotName">Escolha um terreno no mapa</small></div><p id="guild3dLotInfo" class="guild3d-note">Clique nos lotes demarcados para ver as construções e os desbloqueios.</p><div class="guild3d-lot-actions"><button type="button" id="guild3dLotAction" class="guild3d-action" disabled>Construir</button><button type="button" id="guild3dLotUpgrade" class="guild3d-action" hidden>Evoluir edifício</button></div></div>'+
   '<div class="guild3d-hud"><span>Arraste para girar · Roda para aproximar · Shift + arraste para mover</span><span id="guild3dCoords">Terreno 26×26 · 3D</span></div></div>'+
   '<aside class="guild3d-sidebar"><div class="guild3d-label">ADMINISTRAÇÃO DA CAPITAL</div>'+
   '<button type="button" id="guild3dCollect" class="guild3d-action">✦ Coletar recursos prontos</button>'+ 
    '<div class="guild3d-label">PRODUÇÃO DOS EDIFÍCIOS</div><div id="guild3dProduction" class="guild3d-build-queue" aria-label="Tempo de recursos por edifício"></div>'+
    '<div class="guild3d-label">EXPANSÃO DO REINO</div><p id="guild3dProgress" class="guild3d-note"></p>'+
    '<button type="button" id="guild3dUpgrade" class="guild3d-action">♜ Evoluir fortaleza</button>'+
    '<button type="button" id="guild3dFortify" class="guild3d-action">🛡 Reforçar muralhas</button>'+
    '<div id="guild3dPolitics" class="guild3d-note" aria-live="polite"></div>'+
    '<button type="button" id="guild3dSurrenderVote" class="guild3d-action" hidden>☮ Votar pela rendição</button>'+
    '<button type="button" id="guild3dSurrender" class="guild3d-action" hidden>☮ Assinar rendição e cessar-fogo</button>'+
    '<button type="button" id="guild3dSiege" class="guild3d-action" hidden>⚔ Cercar fortaleza rival</button>'+
   '<div class="guild3d-label">URBANISMO</div><div class="guild3d-note">Os terrenos marcados têm funções fixas. Evolua a fortaleza para liberar novos bairros.</div>'+
   '<div id="guild3dCityState" class="guild3d-note" role="status">Carregando construções...</div>'+
   '<div class="guild3d-label">OBRAS EM ANDAMENTO</div><div id="guild3dBuildQueue" class="guild3d-build-queue" aria-label="Tempo restante de todas as construções"></div>'+
   '<div class="guild3d-label">LOTES DISPONÍVEIS</div><div id="guild3dLotsCount" class="guild3d-note"></div>'+
   '<div id="guild3dArmy" class="guild3d-army"><div class="guild3d-label">TREINAMENTO MILITAR</div><select id="guild3dSoldier" aria-label="Tipo de tropa"></select>'+
   '<div class="guild3d-train"><input id="guild3dCount" type="number" min="1" max="40" value="1" aria-label="Quantidade de soldados"><button type="button" id="guild3dTrain">⚔ Treinar tropas</button></div>'+
    '<p id="guild3dEscortInfo" class="guild3d-note"></p>'+
    '<button type="button" id="guild3dDeploy" class="guild3d-action">➤ Requisitar escolta imediata</button>'+
    '<button type="button" id="guild3dRecall" class="guild3d-action">↩ Recolher escolta</button></div>'+
   '<div class="guild3d-label">DIÁRIO DA CAPITAL</div><p id="guild3dFeedback" class="guild3d-feedback" role="status" aria-live="polite">Escolha uma construção e selecione um terreno livre.</p>'+
   '<p id="guild3dVisitor" class="guild3d-note" hidden>Esta cidade pertence a outra guilda. Somente seu líder pode construir ou melhorar edifícios.</p>'+
   '</aside></div></div>';
  document.body.append(dlg);
  const q=id=>dlg.querySelector('#'+id);
  const opts=q('guild3dChoices');
  const info=q('guild3dFeedback');
  const stock=q('guild3dStock');
  const viewport=q('guild3dViewport');
  const soldier=q('guild3dSoldier'),count=q('guild3dCount');
  const trained=q('guild3dArmy'),collect=q('guild3dCollect'),queue=q('guild3dBuildQueue');
  const owns=()=>state?.yourGuild?.name===base?.name;
  const canBuild=()=>owns()&&state?.persistentAccount===true&&state?.yourGuild?.canManage===true;
  const structures=()=>(state?.cities||[]).find(c=>c.name===base?.name)?.buildings||[];
  const nowServer=()=>Date.now()+clockOffset;
  // O prazo vencido não torna a obra concluída sozinho. O status real
  // vem do servidor e permanece gravado no banco.
  const buildWorks=()=>structures().filter(b=>b.status==='building'&&Number.isSafeInteger(b.endsAt));
  const completedCount=()=>structures().filter(b=>b.status!=='building').length;
  const prettyTime=ms=>{
   const sec=Math.ceil(Math.max(0,ms)/1000);
   return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
  };
  const labels={house:'Casario',farm:'Fazenda',barracks:'Quartel',market:'Mercado',tower:'Torre'};
  function updateQueue(){
   if(!dlg.open)return;
    if(Date.now()-lastProductionPaint>900){lastProductionPaint=Date.now();updateProduction()}
   const works=buildWorks();
   // A cada prazo vencido (ou recuperação da conexão), consultar o servidor
   // sem bloquear a interface. Servidor finaliza idempotentemente e devolve
   // o snapshot confirmado; também funciona em servidores privados.
   if(works.some(b=>b.endsAt<=nowServer())&&Date.now()-lastCompletionInspect>1600){
    lastCompletionInspect=Date.now();
    send('kingdom',{action:'inspect'});
   }
   const previews=[...provisionals.values()].filter(v=>!isPersisted(v.building));
   const list=[...works.map(b=>({b,local:false})),...previews.map(v=>({b:v.building,local:true}))].slice(0,60);
   const activeKeys=new Set();
   for(const {b,local}of list){
    const key=(local?'pending:':'active:')+b.type+':'+b.x+':'+b.y;
    activeKeys.add(key);
    let row=[...queue.children].find(e=>e.dataset.queueKey===key);
    if(!row){
     row=document.createElement('div');row.className='guild3d-queue-item';row.dataset.queueKey=key;
     const head=document.createElement('div');head.className='guild3d-queue-head';
     const name=document.createElement('strong');name.textContent=(labels[b.type]||'Edifício')+' · lote '+(b.x+1)+','+(b.y+1);
     const time=document.createElement('span');time.className='guild3d-queue-time';
     head.append(name,time);
     const track=document.createElement('div');track.className='guild3d-queue-track';
     const fill=document.createElement('span');track.append(fill);
     row.append(head,track);queue.append(row);
    }
    const remaining=local?null:Math.max(0,b.endsAt-nowServer());
    const pct=Number.isSafeInteger(b.startedAt)&&Number.isSafeInteger(b.endsAt)?Math.min(100,Math.max(0,100*(nowServer()-b.startedAt)/Math.max(1,b.endsAt-b.startedAt))):0;
    row.querySelector('.guild3d-queue-time').textContent=
     local?(Number.isSafeInteger(b.endsAt)&&b.endsAt>nowServer()?prettyTime(b.endsAt-nowServer())+'*':'Validando…'):
     remaining===0?'Concluindo…':prettyTime(remaining);
    row.querySelector('.guild3d-queue-track span').style.width=Math.round(pct)+'%';
    row.dataset.progress=String(Math.round(pct));
    if(!local&&remaining===0)row.setAttribute('aria-label','Prazo terminado; aguardando confirmação do servidor');
    else row.removeAttribute('aria-label');
   }
   for(const element of [...queue.children])if(!activeKeys.has(element.dataset.queueKey))element.remove();
   if(!list.length){
    const message=document.createElement('p');message.className='guild3d-note guild3d-no-works';
    message.textContent='Nenhuma obra em andamento. As construções concluídas já estão no terreno.';
    queue.replaceChildren(message);
   }else queue.querySelector('.guild3d-no-works')?.remove();
  }
  function updateProduction(){
    const area=q('guild3dProduction'),now=nowServer(),active=new Set();
    let available=0;
    for(const b of structures()){
     if(b.status==='building'||!b.production?.cycleMs)continue;
     const key=b.type+':'+b.x+':'+b.y;active.add(key);
     let row=[...area.children].find(e=>e.dataset.productionKey===key);
     if(!row){
      row=document.createElement('div');row.className='guild3d-queue-item';row.dataset.productionKey=key;
      const head=document.createElement('div');head.className='guild3d-queue-head';
      const title=document.createElement('strong');title.className='guild3d-prod-title';
      const time=document.createElement('span');time.className='guild3d-queue-time';
      head.append(title,time);
      const track=document.createElement('div');track.className='guild3d-queue-track';track.append(document.createElement('span'));
      const yieldLabel=document.createElement('small');yieldLabel.className='guild3d-prod-yield';
      row.append(head,track,yieldLabel);area.append(row);
     }
     const prod=b.production,cycle=prod.cycleMs,nextAt=prod.nextAt;
     const ready=Math.min(24,Math.max(0,Math.floor((now-nextAt)/cycle)+1));
     if(ready)available++;
     const left=Math.max(0,nextAt-now),pct=Math.min(100,Math.max(0,Math.round((ready?cycle:cycle-left)/cycle*100)));
     row.querySelector('.guild3d-prod-title').textContent=(labels[b.type]||b.type)+' Lv.'+b.level+' · '+(b.x+1)+','+(b.y+1);
     row.querySelector('.guild3d-queue-time').textContent=ready?'Pronto ✓ · '+ready+' ciclo(s)':prettyTime(left);
     row.querySelector('.guild3d-queue-track span').style.width=pct+'%';
     row.querySelector('.guild3d-prod-yield').textContent=
      Object.entries(prod.yields||{}).filter(([,n])=>n>0).map(([id,n])=>n+' '+({food:'alimentos',coins:'moedas',timber:'madeiras',stone:'pedras'}[id]||id)).join(' + ')+
      ' · ciclo '+prettyTime(cycle)+' · clique no prédio para melhorar';
    }
    for(const el of [...area.children])if(!active.has(el.dataset.productionKey))el.remove();
    if(!active.size){
     const note=document.createElement('p');note.className='guild3d-note';
     note.textContent='Conclua os edifícios para acompanhar os ciclos de produção.';
     area.replaceChildren(note);
    }
    collect.disabled=!owns()||state?.persistentAccount!==true||available===0;
    collect.textContent=available?'✦ Coletar '+available+' produção(ões) prontas':'✦ Aguardando produção';
   }
   const say=(text,status='info')=>{
   info.textContent=text;
   info.dataset.status=status;
  };
  // Uma construção para cada clique: cada operação tem UUID próprio e
  // seu próprio ACK/retry. Nenhuma operação bloqueia as seguintes.
  const structuresWithPreviews=()=>[...structures(),...[...provisionals.values()].map(v=>v.building)];
  const isPersisted=building=>structures().some(b=>
   b.type===building.type&&b.x===building.x&&b.y===building.y);
  const reservedCoins=()=>[...provisionals.values()].reduce((sum,v)=>sum+v.cost,0);
  const spendableCoins=()=>Math.max(0,(Number(state?.walletCoins)||0)-reservedCoins());
  function makeOpKey(){
   if(typeof crypto==='undefined')return null;
   if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
   if(typeof crypto.getRandomValues!=='function')return null;
   const bytes=crypto.getRandomValues(new Uint8Array(16));
   bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
   const h=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
   return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');
  }
  function removePreview(key){
   if(!provisionals.has(key))return;
   provisionals.delete(key);
   scene?.clearPendingBuilding?.(key);
   if(dlg.open)paint();
  }
  function stopRequest(request){
   if(request.timer!==null)clearTimeout(request.timer);
   request.timer=null;requests.delete(request.id);
  }
  function resetOperations(){
   for(const request of requests.values())if(request.timer!==null)clearTimeout(request.timer);
   requests.clear();awaitingDurable.clear();
   for(const key of provisionals.keys())scene?.clearPendingBuilding?.(key);
   provisionals.clear();
  }
  function settleFromState(){
   let changed=false;
   for(const [key,preview]of [...provisionals]){
    if(!isPersisted(preview.building))continue;
    provisionals.delete(key);
    scene?.clearPendingBuilding?.(key);
    const request=requests.get(preview.id);
    if(request&&!awaitingDurable.has(key))stopRequest(request);
    // A construção chegou ao estado do servidor, mas só desistimos do
    // recibo depois de confirmar que o banco persistiu a compra.
    changed=true;
   }
   if(changed&&dlg.open){
    say(awaitingDurable.size?
     'Edifício posicionado no reino. Aguardando confirmação de salvamento do banco…':
     'Obra confirmada. Acompanhe o andamento no terreno.',awaitingDurable.size?'pending':'success');
   }
  }
  function retry(request){
   if(!dlg.open||requests.get(request.id)!==request)return false;
   if(request.timer!==null)clearTimeout(request.timer);
   request.timer=null;
   request.attempts++;
   // Se já consta no servidor, consultar o recibo em vez de repetir compra.
   if(request.building&&isPersisted(request.building)){
    settleFromState();
    const sent=send('kingdom',{action:'inspect',requestId:request.id,opKey:request.opKey});
    request.timer=setTimeout(()=>retry(request),4000);
    return sent!==false;
   }
   const sent=send('kingdom',{
    action:request.action,...request.details,requestId:request.id,opKey:request.opKey
   });
   if(sent===false){
    if(request.attempts===1){
     stopRequest(request);
     removePreview(request.opKey);
     say('Sem conexão. A construção não foi enviada. Reconecte e tente novamente.','error');
    }
    // Se já foi enviada anteriormente, NÃO cancelar: pode ter sido salva.
    return false;
   }
   if(requests.get(request.id)!==request)return true; // Resposta síncrona da demo.
   request.timer=setTimeout(()=>{
    if(requests.get(request.id)!==request)return;
    if(request.building&&isPersisted(request.building)){
     retry(request);return;
    }
    if(request.confirmed){
     // O ACK chegou, mas a foto atualizada do reino ainda não: consultar
     // sem reenviar a compra.
     send('kingdom',{action:'inspect'});
     request.timer=setTimeout(()=>retry(request),6500);
    }else{
     // Mesmo UUID em todas as tentativas: o servidor deduplica o débito.
     if(request.attempts%3===0)
      send('kingdom',{action:'inspect',requestId:request.id,opKey:request.opKey});
     retry(request);
    }
   },Math.min(9500,1400+request.attempts*850));
   return true;
  }
  function sendOperation(action,details,{building=null,price=0}={}){
   if(requests.size>=MAX_UNCONFIRMED){
    say('A cidade está processando muitas operações. Tente novamente após uma confirmação.','warning');
    return false;
   }
   const opKey=makeOpKey();
   if(!opKey){
    say('Este navegador não oferece identificadores seguros para salvar construções.','error');
    return false;
   }
   const id=++requestSeq;
   const request={id,action,details,opKey,building,timer:null,attempts:0,confirmed:false};
   requests.set(id,request);
   if(building)awaitingDurable.set(opKey,id);
   if(building){
    provisionals.set(opKey,{id,building,cost:price});
    scene?.showPendingBuilding?.(building,opKey);
    // Construir é visualmente instantâneo, independentemente da latência.
    say(types[building.type][0]+' posicionado. Continue construindo.','success');
    paint(); // reserva moedas localmente, sem debitar o banco
   }
   retry(request);
   return true;
  }
  function onConnectionLost(){
   if(!dlg.open)return;
   for(const request of requests.values()){
    if(request.timer!==null)clearTimeout(request.timer);
    request.timer=null;
   }
   // Não apagar a cidade: pedidos enviados podem já estar salvos.
  }
  function onConnectionRestored(){
   if(!dlg.open)return;
   for(const request of requests.values())retry(request);
   lastCompletionInspect=0;
   // Reconsultar recibos: o ACK durável pode ter se perdido na desconexão.
   // O mesmo opKey nunca executa a construção nem o débito outra vez.
   for(const [opKey,requestId] of awaitingDurable)
    send('kingdom',{action:'inspect',requestId,opKey});
   send('kingdom',{action:'inspect'});
  }
  function onActionResult(result){
   if(!dlg.open)return;
   const request=requests.get(result?.id);
   if(!request||request.action!==result.action)return;
   if(request.opKey&&result.opKey&&request.opKey!==result.opKey)return;
   if(!result.ok){
    stopRequest(request);
    awaitingDurable.delete(request.opKey);
    removePreview(request.opKey);
    say(result.message||'O servidor recusou esta operação.','error');
    return;
   }
   request.confirmed=true;
   if(request.building){
    if(isPersisted(request.building)){
     settleFromState();
    }else{
     // O servidor confirmou: falta apenas sua atualização visual definitiva.
     if(request.timer!==null)clearTimeout(request.timer);
     request.timer=setTimeout(()=>retry(request),1500);
     send('kingdom',{action:'inspect'});
    }
    say('Obra registrada no servidor. Confirmando gravação permanente no banco…','pending');
   }else{
    stopRequest(request);
    say(result.message||'Operação concluída.','success');
   }
  }
  function onDurableResult(result){
   if(!result?.opKey)return;
   if(awaitingDurable.get(result.opKey)!==result.id)return;
   if(!result.ok){
    // Não anunciar uma gravação fictícia. O banco pode voltar a funcionar
    // e o recibo idempotente permite confirmar sem cobrar outra vez.
    if(dlg.open)say(result.message||'Salvamento pendente. O servidor tentará novamente.','error');
    setTimeout(()=>{
     if(dlg.open&&awaitingDurable.get(result.opKey)===result.id)
      send('kingdom',{action:'inspect',requestId:result.id,opKey:result.opKey});
    },2500);
    if(dlg.open)paint();return;
   }
   awaitingDurable.delete(result.opKey);
   const confirmedRequest=requests.get(result.id);
   if(confirmedRequest?.opKey===result.opKey)stopRequest(confirmedRequest);
   if(!dlg.open)return;
   say(state?.demo?
    'Obra registrada na demonstração (dados fictícios, sem salvamento permanente).':
    'Obra registrada e salva permanentemente no banco do reino.','success');
   paint();
  }
  function paint(){
   if(!dlg.open||!base)return;
   q('guild3dTitle').textContent='♜ '+base.name;
   q('guild3dSubtitle').textContent='Fortaleza nível '+(base.level||1)+'/'+(state?.fortressMaxLevel||60)+' · '+['Povoado','Vila fortificada','Burgo de pedra','Cidadela nobre','Capital imperial','Fortaleza lendária'][Math.min(5,Math.floor((Math.max(1,base.level||1)-1)/10))]+(owns()?' · Seu reino':' · Reino visitante');
    const bounds=layout.bounds(base.level||1),cap=state?.stockCapacity||600;
    q('guild3dProgress').textContent='Área liberada: '+bounds.width+'×'+bounds.width+' · '+bounds.cells+' lotes. Estoque: '+cap+' por recurso.'+
     ((base.level||1)<(state?.fortressMaxLevel||60)?' Próximo nível: '+layout.bounds((base.level||1)+1).width+'×'+layout.bounds((base.level||1)+1).width+' · estoque maior · novos espaços até '+(state?.maxBuildings||60)+'.':' Nível máximo.');
    const upgrade=q('guild3dUpgrade'),fortify=q('guild3dFortify'),siege=q('guild3dSiege');
    upgrade.hidden=!owns();upgrade.disabled=!canBuild()||(base.level||1)>=(state?.fortressMaxLevel||60);
    upgrade.textContent=(base.level||1)>=(state?.fortressMaxLevel||60)?'♜ Fortaleza no nível máximo':'♜ Ampliar para nível '+((base.level||1)+1)+' · '+((base.level||1)+1)*500+' moedas';
    const defense=state?.yourGuild?.fortressDefense;
    fortify.hidden=!owns();fortify.disabled=!canBuild()||(defense?.walls||0)>=(base.level||1);
    fortify.textContent='🛡 Muralhas '+(defense?.walls||0)+'/'+(base.level||1)+' · defesa '+(defense?.defense||0);
    const ownGuild=state?.yourGuild;
    const warStatus=q('guild3dPolitics'),vote=q('guild3dSurrenderVote'),concede=q('guild3dSurrender');
    const threat=owns()?ownGuild?.crisis:null;
    const truce=owns()?ownGuild?.truce:null;
    warStatus.textContent=truce?.until>nowServer()?
     '☮ Cessar-fogo até '+new Date(truce.until).toLocaleTimeString('pt-BR')+' · território protegido.':
     threat?'⚔ Cerco de '+(threat.attackerName||'outra guilda')+' · pressão '+threat.pressure+
      '% · a rendição fica disponível a partir de '+(state?.surrenderThreshold||60)+'%.':
      (owns()?'Guarnição '+(ownGuild?.currentTroops||0)+' / '+(ownGuild?.armyCapacity||state?.maxTroops||300)+
       ' · manutenção: '+Math.ceil((ownGuild?.currentTroops||0)/25)+' alimentos a cada 30 minutos.':'');
    vote.hidden=!owns()||!threat?.canSurrender||Boolean(truce?.until>nowServer());
    vote.disabled=Boolean(threat?.yourVote);
    concede.hidden=!owns()||!ownGuild?.leader||!threat?.canSurrender||Boolean(truce?.until>nowServer());
    siege.hidden=owns()||!state?.yourGuild?.base;
    siege.disabled=!state?.persistentAccount||!Object.values(state?.yourGuild?.escort||{}).some(n=>n>0)||
     Date.now()<(state?.yourGuild?.nextRaidAt||0)||Boolean(state?.yourGuild?.truce?.until>nowServer())||
     Boolean(state?.yourGuild?.allies?.includes(base.name));
   const resources=owns()?state?.yourGuild?.stock||{}:{};
   stock.replaceChildren();
   const wallet=document.createElement('div');wallet.className='guild3d-stock guild3d-wallet';
   const balance=document.createElement('strong');balance.textContent=spendableCoins().toLocaleString('pt-BR')+' moedas';
   const balanceLabel=document.createElement('small');balanceLabel.textContent='◈ Moedas disponíveis · reservas das construções imediatas já descontadas';
   wallet.append(balance,balanceLabel);stock.append(wallet);
   for(const [label,id,emoji]of [['Alimentos','food','🌾'],['Madeira','timber','🪵'],['Pedra','stone','🪨'],['Tesouro','coins','◆']]){
    const d=document.createElement('div');d.className='guild3d-stock';
    const n=document.createElement('strong');n.textContent=(resources[id]||0).toLocaleString('pt-BR')+' / '+cap.toLocaleString('pt-BR');
    const l=document.createElement('small');l.textContent=emoji+' '+label;
    d.append(n,l);stock.append(d);
   }
   collect.hidden=!owns();
   const visitorNote=q('guild3dVisitor');
   visitorNote.hidden=canBuild();
   visitorNote.textContent=!state?.persistentAccount?
    'Construções permanentes exigem uma conta cadastrada. Saia do modo visitante e faça login antes de construir: o modo de entrada só com nome não salva cidades.':
    owns()?'Todos os membros cadastrados da guilda podem construir e melhorar os edifícios.':
     'Cidade de outra guilda: somente seus integrantes podem administrar a capital.';
   const buildingCount=buildWorks().length;
   const emptyLots=layout.availableLots(base.level||1).filter(l=>layout.lotStatus(l,structuresWithPreviews(),base.level||1)==='empty');
   q('guild3dLotsCount').textContent=emptyLots.length+' terrenos livres · '+layout.slots.length+' lotes projetados.';
   q('guild3dCityState').textContent=structures().length+' / '+(state?.maxBuildings||60)+' edifício(s) registrados no reino · '+
    completedCount()+' concluído(s) · '+buildingCount+' em construção · '+
    provisionals.size+' aguardando registro · '+awaitingDurable.size+' aguardando gravação';
   opts.replaceChildren();
   for(const [id,[label,cost,glyph]]of Object.entries(types)){
    const button=document.createElement('button');button.type='button';
    button.className='guild3d-building';button.disabled=!canBuild();
    button.setAttribute('aria-pressed',String(selected===id));
    const size=layout.footprints[id].join(' × ');
    button.textContent=glyph+' '+label+' · '+size+' · '+cost+' moedas · ciclo '+prettyTime(state?.productionTimes?.[id]||0);
    button.onclick=()=>{
     selected=id;
     if(!selectedLot||selectedLot.type!==id){
      selectedLot=layout.availableLots(base?.level||1).find(l=>l.type===id&&layout.lotStatus(l,structuresWithPreviews(),base?.level||1)==='empty')||null;
      selectedBuilding=null;
     }
     scene?.setSelection(id);
     say(selectedLot?'Edifício escolhido: '+label+'. Confirme o lote '+selectedLot.id+' no painel.':'Sem lote livre para '+label+'. Evolua a fortaleza.');paint()
    };
    opts.append(button);
   }
   const costs=state?.trainingCosts||{};
   const prior=soldier.value;
   soldier.replaceChildren();
   const labels={militia:'Milícia',archer:'Arqueiros',knight:'Cavaleiros',siege:'Máquinas de cerco'};
   for(const [id,c]of Object.entries(costs)){
    const option=document.createElement('option');option.value=id;
    option.textContent=(labels[id]||id)+' · '+c.food+' alimentos / '+c.timber+' madeira / '+c.stone+' pedra';
    soldier.append(option);
   }
   if(costs[prior])soldier.value=prior;
   trained.hidden=!owns()||state?.persistentAccount!==true;
    q('guild3dTrain').disabled=!structures().some(b=>b.type==='barracks'&&b.status!=='building');
    q('guild3dEscortInfo').textContent='Guarnição: '+Object.entries(state?.yourGuild?.army||{}).map(([id,n])=>(labels[id]||id)+' '+n).join(' · ')+'. Sua escolta: '+Object.entries(state?.yourGuild?.escort||{}).filter(([,n])=>n>0).map(([id,n])=>(labels[id]||id)+' '+n).join(' · ')+'. Limite: '+(state?.maxEscort||60)+'.';
    q('guild3dRecall').disabled=!Object.values(state?.yourGuild?.escort||{}).some(n=>n>0);
    q('guild3dDeploy').disabled=!((state?.yourGuild?.army||{})[soldier.value]>0);
   renderLotCard();
   updateQueue();lastProductionPaint=0;updateProduction();
   }
   function onCell({x,y}){
   if(!canBuild()){
    say(!state?.persistentAccount?
     'Entre com uma conta cadastrada para construir e salvar edifícios permanentemente.':
     'Somente integrantes da guilda podem construir ou melhorar seus edifícios.','error');
    return;
   }
   const occupied=layout.at(structures(),x,y);
   if(occupied){
    if(occupied.status==='building'){
     say('Este edifício ainda está sendo construído. Veja o contador embaixo da obra.','info');return;
    }
    // Melhorias continuam independentes de outras construções em andamento.
    if([...requests.values()].some(r=>r.action==='buildingUpgrade'&&
     layout.at([occupied],r.details.x,r.details.y))){
     say('Este edifício já recebeu uma melhoria. Selecione outro terreno.','info');return;
    }
    sendOperation('buildingUpgrade',{x,y});
    return;
   }
   if(!selected){say('Selecione um edifício no painel para começar.');return}
   const occupiedPreview=layout.at([...provisionals.values()].map(v=>v.building),x,y);
   if(occupiedPreview){
    say('Este lote já está ocupado. Escolha outro espaço.','info');return;
   }
   if(!layout.canPlace(structuresWithPreviews(),selected,x,y,base?.level||1)){
    say('Lote indisponível: existem construções ou o castelo neste terreno.','info');return;
   }
   const price=types[selected][1],coins=spendableCoins();
   if(coins<price){
    say('Moedas disponíveis insuficientes: '+coins.toLocaleString('pt-BR')+
     ' de '+price+' necessárias.','error');return;
   }
   if(structuresWithPreviews().length>=(state?.maxBuildings||60)){
    say('O nível atual permite '+(state?.maxBuildings||60)+' edifícios. Evolua a fortaleza.','error');return;
   }
   // Não há tempo de espera visual nem fila: cada clique desenha e envia
   // seu pedido próprio imediatamente, mesmo com outros ACKs pendentes.
   // Prazo estimado desde o próprio clique, antes mesmo do primeiro ACK.
   // O horário exato do servidor substituirá esta estimativa no snapshot.
   const startedAt=nowServer();
   const durationMs=Number(state?.buildTimes?.[selected])||0;
   const building={...layout.plan(selected,x,y),level:1,status:'building',
    ...(durationMs>0?{startedAt,endsAt:startedAt+durationMs,durationMs}:{})};
   sendOperation('construct',{buildingType:selected,x,y,target:base.name},{building,price});
  }
  function onHover(cell){
   q('guild3dCoords').textContent=cell?'Lote '+(cell.x+1)+' / '+(cell.y+1)+' · '+layout.N+'×'+layout.N:'Terreno '+layout.N+'×'+layout.N;
  }
  async function load(){
   if(scene||loading||!dlg.open)return;
   loading=true;const seq=++token;
   try{
    const engine=await import('/guild-scene-3d.mjs?v=architecture60-v1');
    if(!dlg.open||seq!==token)return;
    scene=engine.createGuildScene({mount:viewport,layout,onCell,onHover});
    q('guild3dLoading')?.remove();
    scene.updateBuildings(structures(),state?.yourGuild?.army||{},state?.serverNow,base?.level||1);
    for(const [key,v]of provisionals)scene.showPendingBuilding?.(v.building,key);
    scene.setSelection(selected);
    say('Cidade pronta! Selecione um lote demarcado e confirme a construção no painel.');
   }catch(err){
    console.error('Guild3D:',err);
    say('Seu navegador não iniciou o ambiente 3D. Abrindo a cidade em modo de compatibilidade.');
    dlg.close();oldUI.open(base,state);
   }finally{
    loading=false;
    // Uma importação 3D antiga não pode deixar a janela nova vazia se o
    // jogador fechou/reabriu durante o carregamento assíncrono.
    if(dlg.open&&!scene&&seq!==token)queueMicrotask(()=>void load());
   }
  }
  function cleanupCity(){
   token++;
   // Fechar a cidade não cancela um pedido entregue ao servidor.
   // Preservar chaves idempotentes e prévias para retomar ao reabrir.
   for(const request of requests.values()){
    if(request.timer!==null)clearTimeout(request.timer);
    request.timer=null;
   }
   if(queueTicker!==null)clearInterval(queueTicker);queueTicker=null;
   scene?.destroy();scene=null;selected=null;selectedLot=null;selectedBuilding=null;
   viewport.querySelector('canvas')?.remove();
  }
  q('guild3dClose').onclick=()=>{cleanupCity();dlg.close()};
  q('guild3dFocus').onclick=()=>scene?.focus();
  collect.onclick=()=>sendOperation('collect',{});
  q('guild3dTrain').onclick=()=>{
   if(!owns()||!soldier.value)return;
   sendOperation('train',{unit:soldier.value,count:Number(count.value)});
  };
  q('guild3dUpgrade').onclick=()=>sendOperation('upgrade',{});
   q('guild3dFortify').onclick=()=>sendOperation('fortify',{});
   q('guild3dSurrenderVote').onclick=()=>sendOperation('surrenderVote',{});
   q('guild3dSurrender').onclick=()=>{
    if(window.confirm('A rendição transfere influência, até 10% do tesouro e garante 30 minutos de cessar-fogo. Preservar todos os edifícios e aceitar?'))
     sendOperation('surrender',{});
   };
   q('guild3dDeploy').onclick=()=>sendOperation('escort',{unit:soldier.value,count:Number(count.value)});
   q('guild3dRecall').onclick=()=>sendOperation('recall',{});
   q('guild3dSiege').onclick=()=>sendOperation('siege',{target:base.name.toLocaleLowerCase('pt-BR')});
   dlg.addEventListener('close',()=>{
   // Evitar que um evento "close" enfileirado destrua uma nova sessão 3D
   // quando o jogador reabre a mesma capital imediatamente.
   if(!dlg.open)cleanupCity();
  });
  function open(b,kingdom){
   // A cidade aberta troca de reino sem fechar e recriar o modal.
   // Ao reabrir, limpa os objetos antigos sincronicamente antes da cena nova.
   if(!dlg.open&&scene)cleanupCity();
   const sameGuild=base?.name===b?.name&&state?.persistentAccount===kingdom?.persistentAccount;
   // Nunca levar pendências de uma guilda ou sessão visitante a outra.
   if(!sameGuild)resetOperations();
   base=b;state=kingdom;selected=null;selectedLot=null;selectedBuilding=null;
   if(Number.isSafeInteger(kingdom?.serverNow))clockOffset=kingdom.serverNow-Date.now();
   say('Escolha um terreno emoldurado para construir. Cada bairro tem uma função própria.');
   if(!dlg.open)dlg.showModal();
   lastCompletionInspect=0;
   if(queueTicker!==null)clearInterval(queueTicker);
   queueTicker=setInterval(updateQueue,200);
   paint();
   if(!state?.persistentAccount)say('Modo visitante: faça login com sua conta para construir e manter os edifícios após sair.','warning');
   if(scene){
    scene.updateBuildings(structures(),owns()?state?.yourGuild?.army||{}:{},state?.serverNow,base?.level||1);
    scene.setSelection(selected);
   }
   void load();
   for(const request of [...requests.values()])retry(request);
   send('kingdom',{action:'inspect'});
  }
  function update(kingdom){
   state=kingdom;
   if(Number.isSafeInteger(kingdom?.serverNow))clockOffset=kingdom.serverNow-Date.now();
   oldUI.update(kingdom);
   if(dlg.open){
    const next=(kingdom?.bases||[]).find(b=>b.name===base?.name);
    if(next)base=next;
    settleFromState();
    // Recursos e saldo são prioritários; redesenhar modelos Three.js é caro
    // e não pode impedir a atualização financeira quando ocorrer erro de WebGL.
    paint();
    scene?.updateBuildings(structures(),owns()?kingdom?.yourGuild?.army||{}:{},kingdom?.serverNow,base?.level||1);
   }
  }
  return {open,update,onActionResult,onDurableResult,onConnectionLost,onConnectionRestored,drawMarches:oldUI.drawMarches};
 }});
})(window);

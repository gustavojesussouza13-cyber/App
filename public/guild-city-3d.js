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
  let state=null,base=null,selected=null,scene=null,token=0,loading=false;
  let pending=null,pendingTimer=null,syncTimer=null,requestSeq=0,provisional=null;
  const dlg=document.createElement('dialog');dlg.className='guild3d-dialog';dlg.setAttribute('aria-label','Capital tridimensional da guilda');
  dlg.innerHTML='<div class="guild3d-shell">'+
   '<header class="guild3d-header"><div class="guild3d-brand"><span class="guild3d-kicker">OS PEREGRINOS · REINOS DE AUREN</span><strong id="guild3dTitle">Capital da guilda</strong><small id="guild3dSubtitle">Gestão do reino</small></div>'+
   '<div class="guild3d-header-actions"><button type="button" id="guild3dFocus" title="Centralizar câmera">◎ Centralizar</button><button type="button" id="guild3dClose">✕ Voltar ao continente</button></div></header>'+
   '<div class="guild3d-main"><div class="guild3d-stage"><div id="guild3dViewport" class="guild3d-viewport"><p id="guild3dLoading">Preparando sua capital tridimensional…</p></div>'+
   '<div class="guild3d-hud"><span>Arraste para girar · Roda para aproximar · Shift + arraste para mover</span><span id="guild3dCoords">Terreno 26×26 · 3D</span></div></div>'+
   '<aside class="guild3d-sidebar"><div class="guild3d-label">TESOURO E RECURSOS</div><div id="guild3dStock" class="guild3d-stocks"></div>'+
   '<button type="button" id="guild3dCollect" class="guild3d-action">✦ Coletar produção</button>'+
   '<div class="guild3d-label">URBANISMO</div><div class="guild3d-note">Toda a área verde é edificável. Apenas os terrenos ocupados e o castelo central são reservados.</div>'+
   '<div id="guild3dChoices" class="guild3d-choices"></div>'+
   '<div id="guild3dArmy" class="guild3d-army"><div class="guild3d-label">TREINAMENTO MILITAR</div><select id="guild3dSoldier" aria-label="Tipo de tropa"></select>'+
   '<div class="guild3d-train"><input id="guild3dCount" type="number" min="1" max="40" value="1" aria-label="Quantidade de soldados"><button type="button" id="guild3dTrain">⚔ Treinar tropas</button></div></div>'+
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
  const trained=q('guild3dArmy'),collect=q('guild3dCollect');
  const owns=()=>state?.yourGuild?.name===base?.name;
  const canBuild=()=>owns()&&state?.yourGuild?.leader===true;
  const structures=()=>(state?.cities||[]).find(c=>c.name===base?.name)?.buildings||[];
  const say=(text,status='info')=>{
   info.textContent=text;
   info.dataset.status=status;
  };
  function clearPending(){
   if(pendingTimer!==null)clearTimeout(pendingTimer);
   pendingTimer=null;pending=null;
  }
  const isPersisted=building=>structures().some(b=>
   b.type===building.type&&b.x===building.x&&b.y===building.y);
  function clearProvisional(){
   provisional=null;
   if(syncTimer!==null)clearTimeout(syncTimer);
   syncTimer=null;
   scene?.clearPendingBuilding?.();
  }
  function showProvisional(building){
   provisional=building;
   scene?.showPendingBuilding?.(building);
  }
  function syncProvisional(){
   if(!dlg.open||!provisional||pending||syncTimer!==null)return;
   const check=()=>{
    syncTimer=null;
    if(!dlg.open||!provisional||pending)return;
    if(isPersisted(provisional)){clearProvisional();return}
    // Inspeção é somente leitura; jamais duplica gasto.
    const sent=send('kingdom',{action:'inspect'});
    if(sent===false){
     say('Reconectando para sincronizar a sua construção…','pending');
    }
    syncTimer=setTimeout(check,3500);
   };
   syncTimer=setTimeout(check,1600);
  }
  function attemptPending(){
   if(!pending||!dlg.open)return;
   const operation=pending;
   if(pendingTimer!==null)clearTimeout(pendingTimer);
   pendingTimer=null;
   operation.attempts++;
   // Todas as tentativas compartilham a MESMA opKey, deduplicada pelo servidor
   // até depois de reconexão. Nunca cobra ou constrói uma segunda vez.
   const delivered=send('kingdom',{action:operation.action,...operation.details,
    requestId:operation.id,opKey:operation.opKey});
   if(delivered===false){
    // A construção continua visível enquanto o cliente reconecta. O servidor
    // irá decidir se a operação foi aplicada; não inventar uma recusa por tempo.
    if(operation.attempts===1){
     clearPending();
     if(operation.action==='construct')clearProvisional();
     say('Não há conexão com o servidor. Reconecte para começar a construção.','error');
    }else say('Conexão interrompida; a cidade será sincronizada ao reconectar.','pending');
    return false;
   }
   if(pending!==operation)return true; // A demo pode responder sincronicamente.
   pendingTimer=setTimeout(()=>{
    if(pending!==operation)return;
    if(operation.action==='construct'&&provisional&&isPersisted(provisional)){
     clearPending();clearProvisional();
     say('Construção concluída e sincronizada com o servidor.','success');
     return;
    }
    // Reconciliar e reenviar o mesmo pedido. O servidor ignora duplicatas
    // processadas: latência ou perda do ACK não desfaz edifícios reais.
    if(operation.attempts%3===0)send('kingdom',{action:'inspect',requestId:operation.id,opKey:operation.opKey});
    if(operation.attempts>=3)say('Construção posicionada. Sincronizando o salvamento com segurança…','pending');
    attemptPending();
   },Math.min(6000,1600+operation.attempts*650));
   return true;
  }
  function sendOperation(action,details,progress){
   // onCell() já verifica prévias anteriores ANTES de posicionar a nova.
   // Nunca bloquear a própria prévia colocada neste mesmo clique.
   if(pending){
    say('A construção anterior está sendo sincronizada. Aguarde para posicionar outra.','pending');
    return false;
   }
   const id=++requestSeq;
   const opKey=typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():null;
   pending={id,action,details,opKey,attempts:0};
   say(progress,'pending');
   return attemptPending();
  }
  function onConnectionLost(){
   if(!dlg.open||!pending)return;
   if(pendingTimer!==null)clearTimeout(pendingTimer);
   pendingTimer=null;
   say('Conexão interrompida. A construção continua visível enquanto reconectamos e verificamos o salvamento.','pending');
  }
  function onConnectionRestored(){
   if(!dlg.open)return;
   if(pending){attemptPending();return}
   if(provisional)syncProvisional();
  }
  function onActionResult(result){
   if(!dlg.open||!pending)return;
   if(result?.id!==pending.id||result?.action!==pending.action)return;
   if(result.opKey&&pending.opKey&&result.opKey!==pending.opKey)return;
   const action=pending.action;
   clearPending();
   if(!result.ok){
    // Recusa explícita do servidor é diferente de timeout incerto.
    if(action==='construct')clearProvisional();
    say(result.message||'O servidor não autorizou a operação.','error');
    return;
   }
   if(action==='construct'&&provisional&&isPersisted(provisional))clearProvisional();
   say(result.message||'Operação confirmada pelo servidor.','success');
   if(action==='construct'&&provisional){
    send('kingdom',{action:'inspect'});
    syncProvisional();
   }
  }
  function paint(){
   if(!dlg.open||!base)return;
   q('guild3dTitle').textContent='♜ '+base.name;
   q('guild3dSubtitle').textContent='Fortaleza nível '+(base.level||1)+(owns()?' · Seu reino':' · Reino visitante');
   const resources=owns()?state?.yourGuild?.stock||{}:{};
   stock.replaceChildren();
   const wallet=document.createElement('div');wallet.className='guild3d-stock guild3d-wallet';
   const balance=document.createElement('strong');balance.textContent=Math.max(0,Number(state?.walletCoins)||0).toLocaleString('pt-BR')+' moedas';
   const balanceLabel=document.createElement('small');balanceLabel.textContent='◈ Seu saldo pessoal · usado para construir edifícios';
   wallet.append(balance,balanceLabel);stock.append(wallet);
   for(const [label,id,emoji]of [['Alimentos','food','🌾'],['Madeira','timber','🪵'],['Pedra','stone','🪨'],['Tesouro','coins','◆']]){
    const d=document.createElement('div');d.className='guild3d-stock';
    const n=document.createElement('strong');n.textContent=(resources[id]||0).toLocaleString('pt-BR');
    const l=document.createElement('small');l.textContent=emoji+' '+label;
    d.append(n,l);stock.append(d);
   }
   collect.hidden=!owns();collect.disabled=!owns();
   q('guild3dVisitor').hidden=owns();
   opts.replaceChildren();
   for(const [id,[label,cost,glyph]]of Object.entries(types)){
    const button=document.createElement('button');button.type='button';
    button.className='guild3d-building';button.disabled=!canBuild();
    button.setAttribute('aria-pressed',String(selected===id));
    const size=layout.footprints[id].join(' × ');
    button.textContent=glyph+' '+label+' · '+size+' · '+cost+' moedas';
    button.onclick=()=>{selected=id;scene?.setSelection(id);say('Construindo '+label.toLowerCase()+'. Clique em um lote livre '+size+'.');paint()};
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
   trained.hidden=!owns()||!structures().some(b=>b.type==='barracks');
  }
  function onCell({x,y}){
   if(!canBuild()){say('Somente o líder pode construir ou melhorar edifícios.');return}
   const old=layout.at(structures(),x,y);
   if(old){
    sendOperation('buildingUpgrade',{x,y},'Solicitando melhoria de '+(types[old.type]?.[0]||'edifício')+'…');
    return;
   }
   if(!selected){say('Selecione um edifício no painel para começar.');return}
   if(!layout.canPlace(structures(),selected,x,y)){
    say('Lote '+x+','+y+' indisponível: outra construção ou castelo ocupa parte do terreno.');
    return;
   }
   const price=types[selected][1],wallet=Number(state?.walletCoins);
   if(Number.isFinite(wallet)&&wallet<price){
    say('Moedas pessoais insuficientes: você possui '+wallet.toLocaleString('pt-BR')+' e a construção custa '+price+'. Consiga moedas no continente para construir.','error');
    return;
   }
   if(pending||provisional){
    say('Aguarde a sincronização da construção anterior.','pending');
    return;
   }
   // Atualização visual local, síncrona: o próximo frame já mostra o edifício.
   // Apenas o servidor pode salvar e debitar moedas; recusas desfazem a prévia.
   const building={...layout.plan(selected,x,y),level:1};
   showProvisional(building);
   sendOperation('construct',{type:selected,x,y,target:base.name},
    types[selected][0]+' posicionado imediatamente. Confirmando o salvamento…');
  }
  function onHover(cell){
   q('guild3dCoords').textContent=cell?'Lote '+(cell.x+1)+' / '+(cell.y+1)+' · '+layout.N+'×'+layout.N:'Terreno '+layout.N+'×'+layout.N;
  }
  async function load(){
   if(scene||loading||!dlg.open)return;
   loading=true;const seq=++token;
   try{
    const engine=await import('/guild-scene-3d.mjs?v=guild3d-instant-v2');
    if(!dlg.open||seq!==token)return;
    scene=engine.createGuildScene({mount:viewport,layout,onCell,onHover});
    q('guild3dLoading')?.remove();
    scene.updateBuildings(structures(),state?.yourGuild?.army||{});
    scene.setSelection(selected);
    say('Cidade 3D pronta. Gire a câmera, explore e construa em todo o terreno livre.');
   }catch(err){
    console.error('Guild3D:',err);
    say('Seu navegador não iniciou o ambiente 3D. Abrindo a cidade em modo de compatibilidade.');
    dlg.close();oldUI.open(base,state);
   }finally{loading=false}
  }
  q('guild3dClose').onclick=()=>dlg.close();
  q('guild3dFocus').onclick=()=>scene?.focus();
  collect.onclick=()=>sendOperation('collect',{},'Consultando produção acumulada…');
  q('guild3dTrain').onclick=()=>{
   if(!owns()||!soldier.value)return;
   sendOperation('train',{unit:soldier.value,count:Number(count.value)},'Enviando treinamento para validação…');
  };
  dlg.addEventListener('close',()=>{token++;clearPending();clearProvisional();scene?.destroy();scene=null;selected=null;viewport.querySelector('canvas')?.remove()});
  function open(b,kingdom){
   if(dlg.open)dlg.close();
   base=b;state=kingdom;selected=null;clearPending();clearProvisional();say('Selecione um edifício ou explore o terreno com a câmera.');
   if(!dlg.open)dlg.showModal();
   paint();void load();
   send('kingdom',{action:'inspect'});
  }
  function update(kingdom){
   state=kingdom;oldUI.update(kingdom);
   if(dlg.open){
    const next=(kingdom?.bases||[]).find(b=>b.name===base?.name);
    if(next)base=next;
    if(provisional&&isPersisted(provisional)){
     clearProvisional();
     if(pending?.action==='construct'){
      clearPending();
      say('Construção concluída e confirmada pelo servidor.','success');
     }
    }
    scene?.updateBuildings(structures(),owns()?kingdom?.yourGuild?.army||{}:{});
    paint();
   }
  }
  return {open,update,onActionResult,onConnectionLost,onConnectionRestored,drawMarches:oldUI.drawMarches};
 }});
})(window);

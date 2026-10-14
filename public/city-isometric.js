'use strict';
/* Os Peregrinos — cidadelas isométricas originais, com estado autoritativo do servidor. */
window.PeregrinosCity=Object.freeze({create({send}){
 const types={house:{label:'Casario',cost:120,color:'#bb754b'},farm:{label:'Fazenda',cost:160,color:'#9aaf65'},barracks:{label:'Quartel',cost:280,color:'#9d9eaf'},tower:{label:'Torre',cost:360,color:'#b4b1a4'},market:{label:'Mercado',cost:240,color:'#c49c59'}};
 const css=document.createElement('style');css.textContent=`
 .city-dialog{border:2px solid #bd9757;background:#10251f;color:#ead7ad;width:min(98vw,1330px);max-height:96vh;padding:0;box-shadow:0 20px 90px #000c}
 .city-dialog::backdrop{background:#000c;backdrop-filter:blur(3px)}
 .city-head{padding:13px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#172f25;border-bottom:2px solid #80643a}
 .city-head strong{font: bold 20px Georgia,serif}.city-head small{display:block;color:#a9c1ae;margin-top:4px}
 .city-close,.city-controls button{color:#f0d59b;background:#21382f;border:1px solid #8e7649;cursor:pointer;padding:10px}
 .city-main{display:grid;grid-template-columns:minmax(0,1fr)292px;align-items:start;gap:14px;padding:14px}
 .city-view{width:100%;height:auto;image-rendering:pixelated;cursor:crosshair;background:#283b2c;border:2px solid #a18a54;display:block;min-width:0;box-shadow:inset 0 0 40px #0008}
 .city-controls{display:flex;flex-direction:column;gap:10px;max-height:min(78vh,740px);overflow-y:auto;overflow-x:hidden;padding:4px 6px 8px 2px}.city-controls select,.city-controls input{width:100%;max-width:100%;min-width:0;background:#152d23;color:#f0d99f;border:1px solid #8e7649;padding:7px;margin:3px 0}.city-controls button{width:100%;white-space:normal;text-align:left}.city-controls #cityChoices{min-width:0}.city-controls #cityChoices>div{display:grid;grid-template-columns:1fr 72px;gap:5px}.city-controls #cityChoices>div button{grid-column:1/-1}.city-controls #cityChoices>div input{width:100%!important}.city-controls button{text-align:left}
 .city-controls button[aria-pressed=true]{background:#756039;color:#fff0c6;border-color:#f6d48b}
 .city-controls #cityChoices{display:flex;flex-direction:column;gap:8px}.city-controls #cityChoices>button{min-height:36px}.city-controls button:disabled{opacity:.45;cursor:not-allowed}.city-controls p{font-size:12px;line-height:1.5;margin:3px 0;color:#c4ceb9}
 @media(max-width:700px){.city-main{grid-template-columns:1fr;padding:6px;gap:8px}.city-dialog{max-height:98vh}.city-head{padding:9px}.city-head strong{font-size:16px}.city-controls{max-height:40vh;padding:5px}.city-controls p{font-size:12px}}
 `;document.head.append(css);
 const dlg=document.createElement('dialog');dlg.className='city-dialog';dlg.setAttribute('aria-label','Cidade da guilda');
 dlg.innerHTML='<div class="city-head"><div><strong id="cityTitle">Cidadela</strong><small id="citySubtitle"></small></div><button type="button" class="city-close" aria-label="Voltar ao mundo">✕ Voltar ao continente</button></div><div class="city-main"><canvas class="city-view" width="768" height="520" aria-label="Terreno isométrico para construir edifícios"></canvas><div class="city-controls"><p id="cityHelp">Selecione um edifício e depois um terreno livre.</p><div id="cityChoices"></div><p id="cityFeedback" role="status"></p></div></div>';
 document.body.append(dlg);
 const canvas=dlg.querySelector('canvas'),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 const choices=dlg.querySelector('#cityChoices'),feedback=dlg.querySelector('#cityFeedback');
 dlg.querySelector('.city-close').onclick=()=>dlg.close();
 let base=null,state=null,selected=null;
 const art=window.PeregrinosCityArt16.create();
 const layout=window.PeregrinosCityLayout;
 const N=art.N,TW=art.TW,TH=art.TH,ox=art.OX,oy=art.OY;
 const project=art.project;

 function myCity(){return state?.yourGuild?.name===base?.name}
 function canBuild(){return myCity()&&state?.persistentAccount===true&&state?.yourGuild?.canManage===true}
 function structures(){return (state?.cities||[]).find(c=>c.name===base?.name)?.buildings||[]}
 function draw(){
  if(!dlg.open)return;
  art.render(ctx,{buildings:structures(),name:base?.name||'Cidadela de Auren',now:Date.now()});
 }

 function refresh(){
  if(!dlg.open)return;
  dlg.querySelector('#cityTitle').textContent='✦ '+base.name;
  dlg.querySelector('#citySubtitle').textContent='Capital de guilda · Fortaleza nível '+base.level+(myCity()?' · Seu reino':' · Reino visitante');
  choices.replaceChildren();
  if(myCity()){
   const stock=state?.yourGuild?.stock||{};
   const overview=document.createElement('p');
   overview.textContent='FORTALEZA '+(base.level||1)+'/'+(state?.fortressMaxLevel||60)+' · ÁREA '+layout.bounds(base.level||1).width+'×'+layout.bounds(base.level||1).width+' · LIMITE '+(state?.stockCapacity||600)+' · Alimentos '+(stock.food||0)+' · Madeira '+(stock.timber||0)+' · Pedra '+(stock.stone||0)+' · Tesouro '+(stock.coins||0);
   choices.append(overview);
    if(canBuild()){const expand=document.createElement('button');expand.textContent='♜ Evoluir fortaleza';expand.onclick=()=>send('kingdom',{action:'upgrade'});expand.disabled=(base.level||1)>=(state?.fortressMaxLevel||60);choices.append(expand);
     const fortify=document.createElement('button');fortify.textContent='🛡 Reforçar muralhas';fortify.onclick=()=>send('kingdom',{action:'fortify'});choices.append(fortify)}
   const collect=document.createElement('button');collect.type='button';collect.textContent='✦ Coletar recursos prontos';
   collect.onclick=()=>send('kingdom',{action:'collect'});choices.append(collect);
   if(structures().some(b=>b.type==='barracks')){
    const group=document.createElement('div');
    const soldier=document.createElement('select');soldier.setAttribute('aria-label','Tipo de unidade');
    const costs=state?.trainingCosts||{};
    const labels={militia:'Milícia',archer:'Arqueiros',knight:'Cavaleiros',siege:'Máquinas de cerco'};
    for(const [id,cost] of Object.entries(costs)){
     const option=document.createElement('option');option.value=id;
     option.textContent=(labels[id]||id)+' · '+cost.food+' alimentos, '+cost.timber+' madeira, '+cost.stone+' pedra';
     soldier.append(option);
    }
    const count=document.createElement('input');count.type='number';count.min='1';count.max='40';count.value='1';
    count.setAttribute('aria-label','Quantidade de soldados');
    count.style.width='64px';
    const train=document.createElement('button');train.type='button';train.textContent='⚔ Treinar com recursos';
    train.onclick=()=>send('kingdom',{action:'train',unit:soldier.value,count:Number(count.value)});
    group.append(soldier,count,train);choices.append(group);
     const escort=document.createElement('button');escort.textContent='➤ Escolta imediata';escort.onclick=()=>send('kingdom',{action:'escort',unit:soldier.value,count:Number(count.value)});choices.append(escort);
     const recall=document.createElement('button');recall.textContent='↩ Recolher escolta';recall.onclick=()=>send('kingdom',{action:'recall'});choices.append(recall);
   }
   for(const building of structures()){
    if(building.status==='building'||!building.production?.cycleMs)continue;
    const clock=document.createElement('p'),prod=building.production;
    const remaining=Math.max(0,prod.nextAt-Date.now());
    clock.textContent=(types[building.type]?.label||building.type)+' Lv.'+building.level+
      ' · '+(remaining===0?'PRONTO PARA COLETAR':Math.ceil(remaining/60000)+' minutos restantes')+
      ' · '+Object.entries(prod.yields||{}).filter(([,n])=>n>0).map(([k,n])=>n+' '+k).join(', ');
    choices.append(clock);
   }
   const instruction=document.createElement('p');instruction.textContent='Cada edifício produz recursos. Clique em um prédio construído para evoluí-lo com alimentos, madeira e pedra (até nível 60).';choices.append(instruction);
   for(const [id,t] of Object.entries(types)){const b=document.createElement('button');b.disabled=!canBuild();b.type='button';b.style.display='block';b.style.width='100%';b.style.marginBottom='6px';b.textContent=t.label+' ('+layout.footprints[id].join('×')+') · '+t.cost+' moedas';b.setAttribute('aria-pressed',String(selected===id));b.onclick=()=>{selected=id;feedback.textContent='Clique em um terreno disponível para construir '+t.label.toLowerCase()+'.';refresh()};choices.append(b)}
  }else{const p=document.createElement('p');p.textContent='Você está visitando a capital de outra guilda. Somente integrantes cadastrados deste reino podem administrar a fortaleza.';choices.append(p)}
  draw();
 }
 canvas.addEventListener('click',e=>{
  if(!canBuild())return;
  const rect=canvas.getBoundingClientRect(),px=(e.clientX-rect.left)*canvas.width/rect.width,py=(e.clientY-rect.top)*canvas.height/rect.height;
  const dx=(px-ox)/(TW/2),dy=(py-oy-TH/2)/(TH/2),x=Math.round((dx+dy)/2),y=Math.round((dy-dx)/2);
  const existing=layout.at(structures(),x,y);
  if(existing){feedback.textContent='Solicitando melhoria do edifício…';send('kingdom',{action:'buildingUpgrade',x,y});return}
  if(!selected){feedback.textContent='Selecione um edifício na lista para construir.';return}
  if(!layout.canPlace(structures(),selected,x,y,base?.level||1)){feedback.textContent='É necessário um lote livre de '+layout.footprints[selected].join(' × ')+' terrenos, sem ruas nem construções.';return}
  feedback.textContent='Enviando construção para validação do servidor…';
  send('kingdom',{action:'construct',buildingType:selected,x,y,target:base.name});
 });
 function open(b,kingdom){base=b;state=kingdom;selected=null;feedback.textContent='';if(!dlg.open)dlg.showModal();refresh();send('kingdom',{action:'inspect'})}
 function update(kingdom){state=kingdom;if(dlg.open){const next=(state?.bases||[]).find(b=>b.name===base?.name);if(next)base=next;refresh()}}
 function troopPosition(m,now){
  const route=m.route;
  if(!Array.isArray(route)||route.length<2)return null;
  const progress=Math.max(0,Math.min(1,(Date.now()-m.startedAt)/Math.max(1,m.arrivesAt-m.startedAt)));
  const weights=route.slice(1).map((p,i)=>p.zone===route[i].zone?
   Math.max(1,Math.hypot(p.x-route[i].x,p.y-route[i].y)):180);
  let remaining=progress*weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<weights.length;i++){
   if(remaining>weights[i]&&i<weights.length-1){remaining-=weights[i];continue}
   const a=route[i],b=route[i+1],t=Math.min(1,remaining/weights[i]);
   if(a.zone!==b.zone)return t<.5?a:b;
   return {zone:a.zone,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  }
  return route[route.length-1];
 }
 function drawMarches(mainCtx,{zone,cameraX,cameraY,now}){
  const marches=state?.marches||[];
  for(const m of marches){
   const pos=troopPosition(m,now);
   if(!pos||pos.zone!==zone)continue;
   const px=Math.round(pos.x-cameraX),py=Math.round(pos.y-cameraY);
   if(px<-60||py<-60||px>1020||py>636)continue;
   const walkers=Math.min(7,Math.max(3,Math.ceil((m.units||5)/25)));
   if(window.PeregrinosArmyPixel16){
    window.PeregrinosArmyPixel16.drawFormation(mainCtx,{militia:m.units},px,py,now,{label:false});
   }else{
    mainCtx.fillStyle='#c1a679';mainCtx.fillRect(px-10,py-19,20,14);
   }
   mainCtx.save();mainCtx.font='bold 11px monospace';mainCtx.textAlign='center';mainCtx.fillStyle='#ffe4a6';
   mainCtx.fillText('⚔ '+m.name+' · '+(m.units||0),px,py-40);
   mainCtx.restore();
  }
 }
 // Small animation budget: repaint only while the window is visible.
 setInterval(()=>{if(dlg.open)draw()},350);
 return {open,update,drawMarches};
}});

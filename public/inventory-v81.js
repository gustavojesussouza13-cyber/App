'use strict';
/**
 * Inventario V8.1 — interface original do MMORPG.
 * Only server-authoritative item counts and coins are displayed.
 * All pixel icons are drawn by this file at integer coordinates, without
 * third-party art, scaling interpolation or fabricated inventory entries.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.OsPeregrinosInventoryV81=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 const VERSION='inventario-v81-handdrawn-pixel-items-20261017';
 const LIMIT=35,QUICK_COUNT=8;
 const RELIC_WEAPON={guardiao:'lamina_aurora',arqueiro:'arco_alvorada',curandeiro:'cajado_misericordia',peregrino:'sabre_peregrino'};
 const IDS={
  pocao:{name:'Poção de vida',category:'consumables',tip:'Recupera até 65 pontos de vida. Uso confirmado pelo servidor.',icon:'red-potion'},
  superpocao:{name:'Poção radiante',category:'consumables',tip:'Recupera até 165 pontos de vida. Uso confirmado pelo servidor.',icon:'blue-potion'},
  espada:{name:'Espada temperada',category:'equipment',tip:'Arma: +7 de ataque quando aplicável à classe.',icon:'sword'},
  arco:{name:'Arco dos ventos',category:'equipment',tip:'Arma do Arqueiro: +6 de ataque. Flechas ilimitadas.',icon:'bow'},
  amuleto:{name:'Amuleto da esperança',category:'equipment',tip:'Proteção passiva: +4 de defesa.',icon:'amulet'},
  chave:{name:'Chave da masmorra',category:'quests',tip:'Chave obtida na história para abrir uma masmorra. Não pode ser comprada.',icon:'key'},
  chave_coroa_aurora:{name:'Chave da Coroa Continental',category:'quests',tip:'Chave pessoal que permite acessar a Câmara da Aurora. Não pode ser negociada.',icon:'crown-key'},
  lamina_aurora:{name:'Lâmina da Aurora',category:'equipment',tip:'Relíquia exclusiva do Guardião: +12 de ataque.',icon:'holy-sword'},
  arco_alvorada:{name:'Arco do Alvorecer',category:'equipment',tip:'Relíquia exclusiva do Arqueiro: +11 de ataque.',icon:'holy-bow'},
  cajado_misericordia:{name:'Cajado da Misericórdia',category:'equipment',tip:'Relíquia do Curandeiro: +8 de ataque e +12 de cura.',icon:'staff'},
  sabre_peregrino:{name:'Sabre dos Caminhos',category:'equipment',tip:'Relíquia do Peregrino: +10 de ataque.',icon:'sabre'},
  manto_luz:{name:'Manto da Luz Serena',category:'equipment',tip:'Armadura: +6 de defesa.',icon:'cloak'}
 };
 const priority=['pocao','superpocao','espada','arco','amuleto','lamina_aurora','arco_alvorada','cajado_misericordia','sabre_peregrino','manto_luz','chave','chave_coroa_aurora'];
 function owned(inventory,catalog={},relics={}){
  return Object.entries(inventory||{}).filter(([id,n])=>Number.isSafeInteger(Number(n))&&Number(n)>0)
   .sort(([a],[b])=>{const ax=priority.indexOf(a),bx=priority.indexOf(b);return (ax<0?100:ax)-(bx<0?100:bx)||a.localeCompare(b,'pt-BR')})
   .map(([id,n])=>{
    const meta=IDS[id]||{},server=relics?.[id]||catalog?.[id]||{};
    return {id,count:Number(n),name:server.name||meta.name||id.replace(/[_-]/g,' '),
     category:meta.category||(server.rarity||server.attack||server.defense?'equipment':'quests'),
     tip:meta.tip||server.description||'Item registrado pelo servidor.',rarity:server.rarity||null,
     role:server.role||null,icon:meta.icon||'relic',
     canUse:id==='pocao'||id==='superpocao'};
   });
 }
 function equipped(role,inventory={}){
  const has=id=>Number(inventory?.[id]||0)>0;
  const specific=RELIC_WEAPON[role];
  const weapon=specific&&has(specific)?specific:role==='arqueiro'?(has('arco')?'arco':'arco_simples'):has('espada')?'espada':null;
  return {arma:weapon,armadura:has('manto_luz')?'manto_luz':null,
   amuleto:has('amuleto')?'amuleto':null,
   elmo:null,escudo:null,anel:null,botas:null};
 }
 function defaultQuick(items){
  const ids=new Set(items.map(v=>v.id));
  return ['pocao','superpocao','espada','arco','amuleto','chave','chave_coroa_aurora','manto_luz']
   .map(id=>ids.has(id)?id:null);
 }
 function drawIcon(ctx,kind){
  if(!ctx||typeof ctx.fillRect!=='function')return false;
  ctx.clearRect?.(0,0,32,32);
  ctx.imageSmoothingEnabled=false;
  const p=(c,x,y,w=1,h=1)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h)};
  const line=(c,x1,y1,x2,y2,t=1)=>{
   const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1)),steps=Math.max(1,n);
   for(let i=0;i<=steps;i++){const x=Math.round(x1+(x2-x1)*i/steps),y=Math.round(y1+(y2-y1)*i/steps);p(c,x,y,t,t)}
  };
  const diamond=(color,cx,cy,rad)=>{
   for(let y=-rad;y<=rad;y++)p(color,cx-(rad-Math.abs(y)),cy+y,(rad-Math.abs(y))*2+1,1);
  };
  function blade(x1,y1,x2,y2,holy=false){
   line('#1c1e27',x1+2,y1+1,x2+1,y2+1,5);
   line(holy?'#bde8f6':'#85949b',x1,y1,x2,y2,3);
   line(holy?'#f8f3bf':'#e4ebd9',x1,y1,x2,y2);
   line('#2f251f',x2-5,y2+3,x2+4,y2-6,3);
   line('#d8ab55',x2-5,y2+3,x2+4,y2-6);
   line('#6d452e',x2,y2,x2+5,y2+5,3);
   p('#eed68a',x2+5,y2+5,3,3);
  }
  function flask(blue=false){
   p('#141b26',12,3,9,8);p('#a68a5a',13,3,7,3);p('#ded0a5',14,5,5,3);
   p('#0c1a23',8,11,17,17);p('#a99f87',9,10,15,17);
   p(blue?'#123f78':'#782331',10,14,13,11);
   p(blue?'#267fc5':'#cb3442',12,16,10,8);
   p(blue?'#a2f1fe':'#ffb5a6',13,14,4,7);
   p('#faecc2',17,12,3,2);p('#202c32',10,26,13,2);
   p('#e9d6ac',15,2,4,1);
  }
  function bow(gold=false){
   const c=gold?'#f4c56c':'#ab713e',c2=gold?'#fff0a5':'#edbb75';
   line('#251e23',9,4,18,8,3);line('#251e23',18,8,22,16,3);line('#251e23',22,16,18,24,3);line('#251e23',18,24,9,28,3);
   line(c,8,5,17,9,2);line(c,17,9,20,16,2);line(c,20,16,17,23,2);line(c,17,23,8,27,2);
   line(c2,8,5,9,27);line('#e4e2c7',8,5,9,27);
   if(gold){p('#74d4e8',17,14,4,4);p('#fff0ba',18,15,2,2)}
  }
  function amulet(){
   line('#c58b40',8,8,14,6,2);line('#d2b065',14,6,23,9,2);
   line('#c28c41',23,9,18,19,2);line('#ecbd58',18,19,13,19,2);line('#a8773a',13,19,8,8,2);
   diamond('#6d351f',16,19,7);diamond('#ebb94c',16,19,5);diamond('#fff4ba',16,18,2);
   p('#fff4bb',15,8,2,2);
  }
  function key(crown=false){
   diamond('#a46a22',12,10,7);diamond('#dca844',12,10,5);diamond('#17212b',12,10,3);
   line('#70451e',16,15,26,25,5);line('#f4cf72',16,15,26,25,3);
   p('#f5d582',24,24,6,3);p('#b68132',26,22,4,4);
   if(crown){p('#efdc93',5,3,3,4);p('#f7c66b',12,1,3,6);p('#efdc93',19,3,3,4);p('#d99a47',5,7,17,3)}
  }
  function staff(){
   line('#36221c',8,29,20,6,6);line('#9e633b',9,27,20,6,3);line('#f9c76d',11,23,17,11);
   diamond('#163e74',20,7,6);diamond('#56b6f0',20,7,4);p('#d6faff',19,3,3,4);
  }
  function cloak(){
   line('#342b27',11,3,21,3,3);p('#dbcc95',11,4,10,3);
   p('#263b3a',10,7,13,18);p('#527d65',11,7,11,17);p('#274d45',6,17,7,12);
   p('#24473c',21,17,6,12);p('#96b795',13,8,3,17);p('#aa824a',12,5,10,3);
   p('#294537',10,27,16,2);
  }
  switch(kind){
   case 'red-potion':flask();break;
   case 'blue-potion':flask(true);break;
   case 'sword':blade(23,3,9,22);break;
   case 'holy-sword':blade(23,3,9,22,true);diamond('#f3d46a',17,20,3);break;
   case 'sabre':blade(25,4,11,22,true);p('#dcc66f',18,10,3,2);break;
   case 'bow':bow();break;
   case 'holy-bow':bow(true);break;
   case 'amulet':amulet();break;
   case 'key':key();break;
   case 'crown-key':key(true);break;
   case 'staff':staff();break;
   case 'cloak':cloak();break;
   case 'coin':diamond('#a66e2c',16,16,12);diamond('#f5c668',16,16,9);diamond('#986025',16,16,5);p('#fff2bc',13,10,5,3);break;
   case 'arco_simples':bow();break;
   default:diamond('#253541',16,16,10);diamond('#d2a95e',16,16,7);diamond('#4d8aa0',16,16,4);p('#def2ec',15,12,3,3);
  }
  return true;
 }
 function iconCanvas(kind,doc=root.document){
  const canvas=doc.createElement('canvas');canvas.width=32;canvas.height=32;
  canvas.className='op-item-icon';canvas.setAttribute('aria-hidden','true');
  const ctx=canvas.getContext('2d');
  if(ctx)drawIcon(ctx,kind);
  return canvas;
 }
 function create(options={}){
  const doc=options.documentRef||root.document;
  const host=doc.getElementById('opInventory');
  const quickbar=doc.getElementById('opQuickbar');
  if(!host||!quickbar)return null;
  const getState=options.getState||(()=>null),send=options.send||(()=>false),onMessage=options.onMessage||(()=>{});
  const $$=id=>doc.getElementById(id);
  const state={open:false,tab:'all',selected:null,assign:false,items:[],quick:Array(QUICK_COUNT).fill(null),role:'peregrino',coins:0,level:1,name:'',appearance:null};
  const icons=new Map();
  const labels={all:'Inventário',equipment:'Equipamento',consumables:'Consumíveis',quests:'Missões'};
  const descriptions={elmo:'Elmo',arma:'Arma',escudo:'Escudo',armadura:'Armadura',amuleto:'Amuleto',anel:'Anel',botas:'Botas'};
  const canvasIcon=(kind)=>{if(!icons.has(kind))icons.set(kind,iconCanvas(kind,doc));return icons.get(kind).cloneNode(true)};
  function find(id){return state.items.find(i=>i.id===id)||null}
  function use(id){
   const item=find(id);
   if(!item||!item.canUse)return false;
   const sent=send('use',{item:id});
   if(sent)onMessage('Usando '+item.name+'…');
   return !!sent;
  }
  function slot(parent,item,i,{quick=false}={}){
   const el=doc.createElement('button');el.type='button';
   el.className='op-slot'+(item?' occupied':'')+(state.selected===item?.id?' selected':'');
   el.setAttribute('aria-label',item?item.name+' · '+item.count:'Espaço vazio');
   if(quick){
    el.classList.add('op-quick-slot');
    const number=doc.createElement('span');number.className='op-hotkey';number.textContent=String(i+1);
    el.append(number);
    el.setAttribute('aria-label',(i+1)+' · '+(item?item.name:'Vazio'));
   }
   if(item){
    const icon=canvasIcon(item.icon);el.append(icon);
    if(item.count>1){const count=doc.createElement('span');count.className='op-item-count';count.textContent=String(item.count);el.append(count)}
    el.title=item.name+' ×'+item.count+' — '+item.tip;
    el.onclick=()=>{
     if(quick&&state.assign&&state.selected){state.quick[i]=state.selected;state.assign=false;render();return}
     if(quick){if(item.canUse)use(item.id);else{open();state.selected=item.id;render()}return}
     state.selected=item.id;state.assign=false;render();
    };
    if(!quick){
     el.draggable=true;
     el.addEventListener('dragstart',e=>{e.dataTransfer?.setData('text/plain',item.id)});
     el.addEventListener('dblclick',()=>{if(item.canUse)use(item.id)});
    }
   }else if(quick){
    el.onclick=()=>{if(state.assign&&state.selected){state.quick[i]=state.selected;state.assign=false;render()}else open()};
   }
   if(quick){
    el.addEventListener('dragover',e=>e.preventDefault());
    el.addEventListener('drop',e=>{
     e.preventDefault();const id=e.dataTransfer?.getData('text/plain');
     if(find(id)){state.quick[i]=id;state.assign=false;render()}
    });
   }
   parent.append(el);return el;
  }
  function renderPortrait(){
   const canvas=$$('opInventoryPortrait');if(!canvas)return;
   const ctx=canvas.getContext('2d');if(!ctx)return;
   ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
   const preview=root.PeregrinosAppearanceClassPreviewV75;
   if(!preview?.draw(ctx,{role:state.role,dir:2,appearance:state.appearance})){
    // No legacy fallback: the PNG's loader paints the approved portrait.
    ctx.font='9px monospace';ctx.textAlign='center';ctx.fillStyle='#ded3ae';
    ctx.fillText('Carregando arte…',64,90);
    preview?.ensureLoaded?.(state.role)?.then(ok=>{
     if(ok&&state.open)renderPortrait();
    });
   }
  }
  function renderEquipment(){
   const eq=equipped(state.role,Object.fromEntries(state.items.map(it=>[it.id,it.count])));
   const panel=$$('opInventoryEquipment');if(!panel)return;
   panel.replaceChildren();
   for(const key of ['elmo','arma','escudo','armadura','amuleto','anel','botas']){
    const area=doc.createElement('div');area.className='op-equip-entry';
    const label=doc.createElement('span');label.textContent=descriptions[key];
    const item=find(eq[key]);const active=eq[key]==='arco_simples';
    const cell=doc.createElement('span');cell.className='op-equip-art';
    if(item)cell.append(canvasIcon(item.icon));
    else if(active)cell.append(canvasIcon('arco_simples'));
    else cell.textContent='◇';
    const name=doc.createElement('small');name.textContent=item?item.name:active?'Arco simples (classe)':'—';
    if(item)area.title=item.tip;
    area.append(label,cell,name);panel.append(area);
   }
  }
  function renderItems(){
   const filtered=state.tab==='all'?state.items:state.items.filter(x=>x.category===state.tab);
   const grid=$$('opInventoryGrid');grid.replaceChildren();
   for(let i=0;i<Math.max(LIMIT,filtered.length);i++)slot(grid,filtered[i]||null,i);
   $$('opInventoryFilter').textContent=labels[state.tab]+' · '+filtered.length+' tipo(s)';
   const detail=$$('opInventoryDetails');detail.replaceChildren();
   const item=find(state.selected);
   if(item&&state.tab!=='all'&&item.category!==state.tab)state.selected=null;
   const selected=find(state.selected);
   if(selected){
    const icon=canvasIcon(selected.icon),name=doc.createElement('strong'),info=doc.createElement('span');
    name.textContent=selected.name+' ×'+selected.count;info.textContent=selected.tip;
    detail.append(icon,name,info);
    if(selected.canUse){
     const useButton=doc.createElement('button');useButton.type='button';useButton.textContent='Usar item';
     useButton.onclick=()=>use(selected.id);detail.append(useButton);
    }
    const setButton=doc.createElement('button');setButton.type='button';
    setButton.textContent=state.assign?'Clique na posição 1–8 abaixo':'Colocar na barra rápida';
    setButton.onclick=()=>{state.assign=!state.assign;renderItems()};
    detail.append(setButton);
   }else detail.textContent='Selecione um item para ver os detalhes. Arraste-o para a barra rápida.';
  }
  function renderBar(){
   const bar=$$('opInventoryHotbar');bar.replaceChildren();quickbar.replaceChildren();
   for(let i=0;i<QUICK_COUNT;i++){
    const item=find(state.quick[i]);
    slot(bar,item,i,{quick:true});
    slot(quickbar,item,i,{quick:true});
   }
   quickbar.hidden=!getState()?.connected;
  }
  function render(){
   if(state.open){
    host.hidden=false;
    $$('opInventoryName').textContent=state.name||'Peregrino';
    $$('opInventoryLevel').textContent='Nível '+state.level;
    $$('opInventoryCoins').textContent=Number(state.coins||0).toLocaleString('pt-BR')+' moedas';
    $$('opInventorySlots').textContent=state.items.length+' tipos de itens · 35 espaços iniciais de visualização (sem limite de peso)';
    for(const btn of host.querySelectorAll('[data-inventory-tab]')){
     const on=btn.dataset.inventoryTab===state.tab;btn.classList.toggle('active',on);btn.setAttribute('aria-selected',String(on));
    }
    renderItems();renderEquipment();renderPortrait();
   }
   renderBar();
  }
  function sync(data,catalog={},relics={}){
   if(!data)return;
   state.items=owned(data.inventory,catalog,relics);
   state.role=data.role||state.role;state.name=data.name||state.name;state.level=data.level||1;
   state.coins=Number(data.coins)||0;state.appearance=data.appearance||null;
   if(state.quick.every(x=>x===null))state.quick=defaultQuick(state.items);
   if(state.selected&&!find(state.selected))state.selected=null;
   render();
  }
  function open(){
   if(state.open||!getState()?.connected)return false;
   state.open=true;host.hidden=false;
   options.onOpened?.();render();
   $$('opInventoryClose')?.focus({preventScroll:true});
   return true;
  }
  function close(){
   if(!state.open)return false;
   state.open=false;state.assign=false;host.hidden=true;
   options.onClosed?.();return true;
  }
  function toggle(){return state.open?close():open()}
  function quickUse(index){
   if(!Number.isInteger(index)||index<0||index>=QUICK_COUNT)return false;
   const item=find(state.quick[index]);if(!item)return false;
   if(state.open&&state.assign&&state.selected){state.quick[index]=state.selected;state.assign=false;render();return true}
   if(item.canUse)return use(item.id);
   if(!state.open)open();
   state.selected=item.id;render();return true;
  }
  for(const btn of host.querySelectorAll('[data-inventory-tab]')){
   btn.addEventListener('click',()=>{
    state.tab=btn.dataset.inventoryTab;state.assign=false;state.selected=null;render();
   });
  }
  $$('opInventoryClose').addEventListener('click',close);
  $$('opInventoryBackdrop').addEventListener('click',close);
  $$('opInventoryClearQuick').addEventListener('click',()=>{
   state.quick.fill(null);state.assign=false;render();
  });
  host.hidden=true;quickbar.hidden=true;
  return Object.freeze({VERSION,get openState(){return state.open},get selected(){return state.selected},
   get quick(){return [...state.quick]},sync,render,open,close,toggle,quickUse});
 }
 return Object.freeze({VERSION,IDS,LIMIT,QUICK_COUNT,owned,equipped,defaultQuick,drawIcon,iconCanvas,create});
});

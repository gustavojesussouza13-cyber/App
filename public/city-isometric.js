'use strict';
/* Os Peregrinos — cidadelas isométricas originais, com estado autoritativo do servidor. */
window.PeregrinosCity=Object.freeze({create({send}){
 const types={house:{label:'Casario',cost:120,color:'#bb754b'},farm:{label:'Fazenda',cost:160,color:'#9aaf65'},barracks:{label:'Quartel',cost:280,color:'#9d9eaf'},tower:{label:'Torre',cost:360,color:'#b4b1a4'},market:{label:'Mercado',cost:240,color:'#c49c59'}};
 const css=document.createElement('style');css.textContent=`
 .city-dialog{border:2px solid #bd9757;background:#10251f;color:#ead7ad;width:min(96vw,1040px);max-height:95vh;padding:0;box-shadow:0 20px 90px #000c}
 .city-dialog::backdrop{background:#000c;backdrop-filter:blur(3px)}
 .city-head{padding:13px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#172f25;border-bottom:2px solid #80643a}
 .city-head strong{font: bold 20px Georgia,serif}.city-head small{display:block;color:#a9c1ae;margin-top:4px}
 .city-close,.city-controls button{color:#f0d59b;background:#21382f;border:1px solid #8e7649;cursor:pointer;padding:10px}
 .city-main{display:grid;grid-template-columns:minmax(0,1fr)220px;gap:12px;padding:12px}
 .city-view{width:100%;height:auto;image-rendering:pixelated;cursor:crosshair;background:#283b2c;border:2px solid #a18a54;display:block}
 .city-controls{display:flex;flex-direction:column;gap:7px}.city-controls button{text-align:left}
 .city-controls button[aria-pressed=true]{background:#756039;color:#fff0c6;border-color:#f6d48b}
 .city-controls button:disabled{opacity:.45;cursor:not-allowed}.city-controls p{font-size:12px;line-height:1.5;margin:3px 0;color:#c4ceb9}
 @media(max-width:700px){.city-main{grid-template-columns:1fr}.city-controls{display:grid;grid-template-columns:repeat(2,1fr)}.city-controls p{grid-column:1/-1}}
 `;document.head.append(css);
 const dlg=document.createElement('dialog');dlg.className='city-dialog';dlg.setAttribute('aria-label','Cidade da guilda');
 dlg.innerHTML='<div class="city-head"><div><strong id="cityTitle">Cidadela</strong><small id="citySubtitle"></small></div><button type="button" class="city-close" aria-label="Voltar ao mundo">✕ Voltar ao continente</button></div><div class="city-main"><canvas class="city-view" width="768" height="520" aria-label="Terreno isométrico para construir edifícios"></canvas><div class="city-controls"><p id="cityHelp">Selecione um edifício e depois um terreno livre.</p><div id="cityChoices"></div><p id="cityFeedback" role="status"></p></div></div>';
 document.body.append(dlg);
 const canvas=dlg.querySelector('canvas'),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 const choices=dlg.querySelector('#cityChoices'),feedback=dlg.querySelector('#cityFeedback');
 dlg.querySelector('.city-close').onclick=()=>dlg.close();
 let base=null,state=null,selected=null;
 const N=11,TW=45,TH=23,ox=384,oy=75;
 const project=(x,y)=>({x:ox+(x-y)*TW/2,y:oy+(x+y)*TH/2});
 function polygon(points,fill,stroke){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))ctx.lineTo(p[0],p[1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}
 function diamond(x,y,color){const p=project(x,y);polygon([[p.x,p.y],[p.x+TW/2,p.y+TH/2],[p.x,p.y+TH],[p.x-TW/2,p.y+TH/2]],color,'#52694f')}
 function building(x,y,type){const p=project(x,y),px=p.x,py=p.y+11,c=types[type]?.color||'#a9a38b';const h=type==='tower'?46:type==='barracks'?35:25;
  polygon([[px-17,py],[px,py+9],[px,py+9-h],[px-17,py-h]],'#756751','#332f24');
  polygon([[px,py+9],[px+17,py],[px+17,py-h],[px,py+9-h]],'#b4a27b','#332f24');
  polygon([[px-20,py-h],[px,py-h-11],[px+20,py-h],[px,py-h+10]],c,'#40362d');
  ctx.fillStyle='#e8c878';ctx.fillRect(px-3,py-h+13,6,7);
 }
 function myCity(){return state?.yourGuild?.name===base?.name}
 function structures(){return (state?.cities||[]).find(c=>c.name===base?.name)?.buildings||[]}
 function draw(){
  if(!dlg.open)return;
  ctx.fillStyle='#283e2f';ctx.fillRect(0,0,768,520);
  // Terrapleno isométrico, caminhos centrais, sombras e detalhes determinísticos.
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
   const road=x===5||y===5;diamond(x,y,road?'#aa9772':(x+y)%3===0?'#70865b':'#637b54');
   const p=project(x,y);if(!road&&(x*7+y*13)%9===0){ctx.fillStyle='#435d38';ctx.fillRect(p.x+5,p.y+12,4,7)}
  }
  for(const b of structures())if(Number.isInteger(b.x)&&Number.isInteger(b.y))building(b.x,b.y,b.type);
  // Castelo central fixo; não ocupa as células construíveis.
  building(5,5,'tower');building(5,4,'barracks');building(4,5,'tower');
  ctx.fillStyle='#f1ddac';ctx.font='bold 16px monospace';ctx.textAlign='center';ctx.fillText(base?.name||'Cidadela',384,36);
  ctx.fillStyle='#d3d7b8';ctx.font='12px monospace';ctx.fillText('Caminhos, muralhas e reinos de Auren',384,490);
 }
 function refresh(){
  if(!dlg.open)return;
  dlg.querySelector('#cityTitle').textContent='✦ '+base.name;
  dlg.querySelector('#citySubtitle').textContent='Capital de guilda · Fortaleza nível '+base.level+(myCity()?' · Seu reino':' · Reino visitante');
  choices.replaceChildren();
  if(myCity()){
   for(const [id,t] of Object.entries(types)){const b=document.createElement('button');b.type='button';b.style.display='block';b.style.width='100%';b.style.marginBottom='6px';b.textContent=t.label+' · '+t.cost+' moedas';b.setAttribute('aria-pressed',String(selected===id));b.onclick=()=>{selected=id;feedback.textContent='Clique em um terreno disponível para construir '+t.label.toLowerCase()+'.';refresh()};choices.append(b)}
  }else{const p=document.createElement('p');p.textContent='Você está visitando a capital de outra guilda. Somente a liderança do reino pode construir aqui.';choices.append(p)}
  draw();
 }
 canvas.addEventListener('click',e=>{
  if(!myCity()||!selected)return;
  const rect=canvas.getBoundingClientRect(),px=(e.clientX-rect.left)*canvas.width/rect.width,py=(e.clientY-rect.top)*canvas.height/rect.height;
  const dx=(px-ox)/(TW/2),dy=(py-oy-TH/2)/(TH/2),x=Math.round((dx+dy)/2),y=Math.round((dy-dx)/2);
  if(x<0||x>=N||y<0||y>=N||x===5||y===5||structures().some(b=>b.x===x&&b.y===y)){feedback.textContent='Escolha um terreno livre, fora das estradas.';return}
  feedback.textContent='Enviando construção para validação do servidor…';
  send('kingdom',{action:'construct',type:selected,x,y,target:base.name});
 });
 function open(b,kingdom){base=b;state=kingdom;selected=null;feedback.textContent='';if(!dlg.open)dlg.showModal();refresh()}
 function update(kingdom){state=kingdom;if(dlg.open){const next=(state?.bases||[]).find(b=>b.name===base?.name);if(next)base=next;refresh()}}
 function drawMarches(mainCtx,{zone,cameraX,cameraY,now}){
  for(const m of state?.marches||[]){
   if(m.from!==zone&&m.to!==zone)continue;
   const progress=Math.max(0,Math.min(1,(Date.now()-m.startedAt)/(m.arrivesAt-m.startedAt||1)));
   const origin=(state?.bases||[]).find(b=>b.name===m.name),target=(state?.bases||[]).find(b=>b.name===m.targetName);
   if(!origin||!target)continue;
   // Na versão inicial, uma marcha aparece junto à fortaleza de partida/destino.
   // A navegação entre múltiplas regiões será implementada com rotas reais posteriormente.
   const point=m.from===zone?origin:target;
   const step=m.from===zone?progress:1-progress;
   const x=point.x+Math.sin(step*Math.PI)*85, y=point.y+Math.cos(step*Math.PI)*48;
   const px=x-cameraX,py=y-cameraY;if(px<-30||py<-30||px>960||py>576)continue;
   mainCtx.fillStyle='#302b22';mainCtx.fillRect(px-13,py-2,26,7);
   mainCtx.fillStyle='#d6a75b';for(let i=0;i<3;i++){mainCtx.fillRect(px-11+i*9,py-14+Math.sin(now/180+i)*2,6,11);mainCtx.fillStyle='#b0c8cb';mainCtx.fillRect(px-10+i*9,py-17+Math.sin(now/180+i)*2,4,3);mainCtx.fillStyle='#d6a75b'}
   mainCtx.font='bold 10px monospace';mainCtx.textAlign='center';mainCtx.fillStyle='#ffe4a6';mainCtx.fillText('⚔ '+m.name,px,py-23);
  }
 }
 return {open,update,drawMarches};
}});

/* Criador atualizado — as quatro artes aprovadas, sem prévia Hero Studio antiga. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PeregrinosAppearanceEditor=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function create(container,{role=()=> 'peregrino',initial=null,onChange=()=>{},onRoleChange=null}={}){
  const art=globalThis.PeregrinosAppearance16;
  const preview=globalThis.PeregrinosAppearanceClassPreviewV75;
  if(!container||!art||!preview)return null;
  container.replaceChildren();
  const current=art.normalize(initial);
  const wrap=document.createElement('div');wrap.className='atelier-custom';
  const left=document.createElement('div');left.className='atelier-custom-preview';
  const title=document.createElement('strong');title.textContent='PRÉVIA DA CLASSE V7.5';
  const chosenRole=document.createElement('label');chosenRole.className='atelier-class-title';
  chosenRole.textContent='Classe';
  const picker=document.createElement('select');picker.className='atelier-class-select';
  picker.setAttribute('aria-label','Prévia da classe atual');
  for(const [id,name] of Object.entries(preview.ROLES)){
   const option=document.createElement('option');option.value=id;option.textContent=name;picker.append(option);
  }
  picker.disabled=typeof onRoleChange!=='function';
  chosenRole.append(picker);
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=160;
  canvas.className='atelier-preview-canvas';
  canvas.setAttribute('aria-label','Prévia PNG atual da classe escolhida');
  const note=document.createElement('small');note.className='atelier-current-sprite-note';
  const poseControls=document.createElement('div');poseControls.className='atelier-pose-controls';
  const direction=document.createElement('select');direction.setAttribute('aria-label','Direção da prévia');
  for(const [value,label] of [['2','Frente'],['1','Lado'],['0','Costas'],['3','Outro lado']]){
   const opt=document.createElement('option');opt.value=value;opt.textContent=label;direction.append(opt);
  }
  const animation=document.createElement('select');animation.setAttribute('aria-label','Animação da prévia aprovada');
  for(const [value,label] of [['idle','Parado'],['walk','Andando']]){
   const opt=document.createElement('option');opt.value=value;opt.textContent=label;animation.append(opt);
  }
  let poseFrame=0,renderNonce=0;
  const nextFrame=document.createElement('button');nextFrame.type='button';
  nextFrame.className='atelier-next-frame';nextFrame.textContent='▶ Quadro';
  nextFrame.title='Ver o próximo quadro oficial disponível';
  direction.addEventListener('change',render);
  animation.addEventListener('change',()=>{poseFrame=0;render()});
  nextFrame.addEventListener('click',()=>{poseFrame++;render()});
  picker.addEventListener('change',()=>{
   if(typeof onRoleChange==='function')onRoleChange(picker.value);
   render();
  });
  poseControls.append(direction,animation,nextFrame);
  left.append(title,chosenRole,canvas,poseControls,note);
  const options=document.createElement('div');options.className='atelier-custom-fields';
  const selects={};
  for(const [key,values] of Object.entries(art.OPTIONS)){
   const label=document.createElement('label');
   const display={skin:'Tom de pele',hairStyle:'Corte de cabelo',hairColor:'Cor do cabelo',
    eyes:'Cor dos olhos',outfit:'Traje e cores',cape:'Capa',accessory:'Acessório'}[key];
   label.textContent=display;
   const select=document.createElement('select');select.dataset.appearanceKey=key;
   for(const [id,name]of Object.entries(values)){
    const opt=document.createElement('option');opt.value=id;opt.textContent=name;select.append(opt);
   }
   select.value=current[key];
   select.addEventListener('change',()=>{Object.assign(current,read());render();onChange(read())});
   label.append(select);options.append(label);selects[key]=select;
  }
  wrap.append(left,options);container.append(wrap);
  function read(){return art.normalize(Object.fromEntries(Object.entries(selects).map(([key,input])=>[key,input.value])))}
  function set(value){const a=art.normalize(value);for(const [key,input]of Object.entries(selects))input.value=a[key];render()}
  function render(){
   const ctx=canvas.getContext('2d');if(!ctx)return;
   ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,128,160);
   const kind=Object.hasOwn(preview.ROLES,role())?role():'peregrino';
   picker.value=kind;
   const state=preview.status(kind,read());
   const drawn=preview.draw(ctx,{role:kind,dir:Number(direction.value||2),action:animation.value||'idle',frame:poseFrame,appearance:read()});
   const id=++renderNonce;
   if(!drawn){
    note.textContent='Carregando sprite atual de '+state.name+'…';
    void preview.ensureLoaded(kind).then(ok=>{if(ok&&id===renderNonce)render();else if(id===renderNonce)note.textContent='PNG indisponível: verifique o arquivo aprovado.'});
   }else{
    note.textContent=state.name+' · sprite PNG aprovado, sem interpolação. '+
      (state.custom?'A aparência personalizada é salva, mas as variações ainda não estão pintadas neste PNG.':'Traje padrão.');
   }
  }
  render();
  return {read,set,render,canvas};
 }
 return {create};
});

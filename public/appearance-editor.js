/* Criador 16-bit: uma mesma interface para visitante, nova conta e edição posterior. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PeregrinosAppearanceEditor=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function create(container,{role=()=> 'peregrino',initial=null,onChange=()=>{}}={}){
  const art=globalThis.PeregrinosAppearance16,studio=globalThis.OsPeregrinosSpriteStudio;
  if(!container||!art)return null;
  container.replaceChildren();
  const current=art.normalize(initial);
  const wrap=document.createElement('div');wrap.className='atelier-custom';
  const left=document.createElement('div');left.className='atelier-custom-preview';
  const title=document.createElement('strong');title.textContent='SEU HERÓI · PIXEL ART RETRÔ';
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=160;
  canvas.className='atelier-preview-canvas';
  canvas.setAttribute('aria-label','Prévia do personagem personalizado');
  const note=document.createElement('small');note.textContent='Quadro autoral 64 × 80 · pixels nítidos sem suavização';
  const poseControls=document.createElement('div');poseControls.className='atelier-pose-controls';
  const direction=document.createElement('select');direction.setAttribute('aria-label','Direção da prévia');
  for(const [value,label]of [['2','Frente'],['1','Lado'],['0','Costas'],['3','Outro lado']]){
   const option=document.createElement('option');option.value=value;option.textContent=label;direction.append(option);
  }
  const animation=document.createElement('select');animation.setAttribute('aria-label','Ação da prévia');
  for(const [value,label]of [['idle','Parado'],['walk','Andando'],['attack','Atacando'],['hurt','Ferido']]){
   const option=document.createElement('option');option.value=value;option.textContent=label;animation.append(option);
  }
  let poseFrame=0;
  const nextFrame=document.createElement('button');nextFrame.type='button';
  nextFrame.className='atelier-next-frame';nextFrame.textContent='▶ Quadro';
  nextFrame.title='Ver o próximo quadro de animação';
  direction.addEventListener('change',render);
  animation.addEventListener('change',()=>{poseFrame=0;render()});
  nextFrame.addEventListener('click',()=>{poseFrame++;render()});
  poseControls.append(direction,animation,nextFrame);
  left.append(title,canvas,poseControls,note);
  const previewStudio=studio?.create?.({documentRef:document,limit:128});
  const options=document.createElement('div');options.className='atelier-custom-fields';
  const selects={};
  for(const [key,values]of Object.entries(art.OPTIONS)){
   const label=document.createElement('label');
   const display={skin:'Tom de pele',hairStyle:'Corte de cabelo',hairColor:'Cor do cabelo',
    eyes:'Cor dos olhos',outfit:'Traje e cores',cape:'Capa',accessory:'Acessório'}[key];
   label.textContent=display;
   const select=document.createElement('select');select.dataset.appearanceKey=key;
   for(const [id,name] of Object.entries(values)){
    const option=document.createElement('option');option.value=id;option.textContent=name;select.append(option);
   }
   select.value=current[key];select.addEventListener('change',()=>{
    Object.assign(current,read());render();onChange(read());
   });
   label.append(select);options.append(label);selects[key]=select;
  }
  wrap.append(left,options);container.append(wrap);
  function read(){return art.normalize(Object.fromEntries(Object.entries(selects).map(([key,input])=>[key,input.value])))}
  function set(value){const a=art.normalize(value);for(const [key,input]of Object.entries(selects))input.value=a[key];render()}
  function render(){
   const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
   ctx.clearRect(0,0,canvas.width,canvas.height);
   const type=role();
   const frames={idle:4,walk:6,attack:5,hurt:3};
   const action=animation.value||'idle';
   const sprite=previewStudio?.obtain('hero',type,Number(direction.value||2),action,
    poseFrame%frames[action],false,0,0,null,read());
   if(sprite){ctx.imageSmoothingEnabled=false;ctx.drawImage(sprite,0,0,128,160)}
  }
  render();
  return {read,set,render};
 }
 return {create};
});

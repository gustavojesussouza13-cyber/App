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
  const title=document.createElement('strong');title.textContent='SEU HERÓI · PIXEL ART 16-BIT';
  const canvas=document.createElement('canvas');canvas.width=120;canvas.height=156;
  canvas.className='atelier-preview-canvas';
  canvas.setAttribute('aria-label','Prévia do personagem personalizado');
  const note=document.createElement('small');note.textContent='Pixel art nítida · silhueta da classe preservada';
  left.append(title,canvas,note);
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
   const sprite=studio?.create?.({documentRef:document,limit:100}).obtain('hero',type,2,'idle',0,false,0,0,null,read());
   if(sprite){ctx.imageSmoothingEnabled=false;ctx.drawImage(sprite,0,0,120,156)}
  }
  render();
  return {read,set,render};
 }
 return {create};
});

'use strict';
/* Balões de chat retrô: texto já moderado e enviado pelo servidor. */
(function(root){
 function create({ttlMs=4800,limit=20}={}){
  const bubbles=new Map();
  const clean=now=>{for(const [id,b] of bubbles)if(b.expires<=now)bubbles.delete(id)};
  function show(event,now=Date.now()){
   if(!event||typeof event.senderId!=='string'||typeof event.text!=='string')return false;
   if(!['global','party','guild'].includes(event.channel))return false;
   const msg=event.text.trim().slice(0,110);
   if(!msg)return false;
   clean(now);
   if(bubbles.size>=limit&&!bubbles.has(event.senderId))bubbles.delete(bubbles.keys().next().value);
   bubbles.set(event.senderId,{text:msg,channel:event.channel,expires:now+ttlMs});
   return true;
  }
  function linesFor(ctx,text,maxWidth=218,maxLines=3){
   const lines=[];let line='';
   // Sem HTML: todos os caracteres são pintados como texto em Canvas 2D.
   for(const word of text.replace(/\s+/g,' ').split(' ')){
    let attempt=line?line+' '+word:word;
    if(ctx.measureText(attempt).width<=maxWidth){line=attempt;continue}
    if(line){lines.push(line);line=''}
    let fragment='';
    for(const ch of word){
     if(ctx.measureText(fragment+ch).width>maxWidth&&fragment){lines.push(fragment);fragment=''}
     fragment+=ch;
    }
    line=fragment;
    if(lines.length>=maxLines)break;
   }
   if(line&&lines.length<maxLines)lines.push(line);
   if(lines.length===maxLines&&lines.join(' ').length<text.length){
    const i=maxLines-1;let last=lines[i];while(last&&ctx.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);
    lines[i]=last+'…';
   }
   return lines.slice(0,maxLines);
  }
  function draw(ctx,{players=[],self=null,cameraX=0,cameraY=0,now=Date.now(),width=1200,height=720}={}){
   clean(now);if(!bubbles.size)return;
   const actors=[...players];if(self)actors.push(self);
   for(const actor of actors){
    const b=bubbles.get(actor.id);
    if(!b||!Number.isFinite(actor.x)||!Number.isFinite(actor.y))continue;
    const sx=Math.round(actor.x-cameraX),sy=Math.round(actor.y-cameraY);
    if(sx<-140||sx>width+140||sy<-40||sy>height+160)continue;
    ctx.save();
    ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    const lines=linesFor(ctx,b.text);
    const contentWidth=Math.max(48,...lines.map(t=>ctx.measureText(t).width));
    const w=Math.ceil(contentWidth)+20,h=lines.length*17+14;
    const x=Math.round(Math.max(5,Math.min(width-w-5,sx-w/2)));
    const y=Math.round(Math.max(6,Math.min(height-h-10,sy-135-h)));
    const outline=b.channel==='party'?'#6ba2dc':b.channel==='guild'?'#c69bde':'#e1bd7e';
    ctx.fillStyle='#09171c';ctx.fillRect(x-3,y-3,w+6,h+6);
    ctx.fillStyle=outline;ctx.fillRect(x-1,y-1,w+2,h+2);
    ctx.fillStyle='#203431';ctx.fillRect(x+2,y+2,w-4,h-4);
    ctx.fillStyle='#101e23';ctx.fillRect(x+4,y+4,w-8,h-8);
    for(let i=0;i<lines.length;i++){
     ctx.fillStyle='#f9efcf';
     ctx.fillText(lines[i],x+w/2,y+12+i*17+4);
    }
    const tailX=Math.round(Math.max(x+8,Math.min(x+w-8,sx)));
    if(y+h<sy-18){
     ctx.fillStyle='#09171c';ctx.fillRect(tailX-4,y+h+2,9,5);
     ctx.fillStyle=outline;ctx.fillRect(tailX-2,y+h+2,5,5);
     ctx.fillStyle='#09171c';ctx.fillRect(tailX,y+h+7,2,3);
    }
    ctx.restore();
   }
  }
  return {show,draw,clear:()=>bubbles.clear(),active:(now=Date.now())=>{clean(now);return [...bubbles.entries()]}};
 }
 const api={create};if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PeregrinosChatBubbles=api;
})(typeof globalThis!=='undefined'?globalThis:this);

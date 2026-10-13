'use strict';
/**
 * Avisos de manutenção para visitantes de todas as páginas do site.
 * Canal SSE sem sessão/cookies; conteúdo produzido somente pelo servidor.
 * Nunca envia informações pessoais ou detalhes da infraestrutura.
 */
class MaintenanceNotices{
 constructor({limit=150,heartbeatMs=16000}={}){
  this.clients=new Set();
  this.limit=Math.max(1,Math.min(1000,limit));
  this.heartbeatMs=heartbeatMs;
  this.active=false;
  this.message='';
 }
 payload(){
  return {type:'maintenance',active:this.active,
   message:this.active?this.message:'',at:this.active?this.at:null};
 }
 encode(value){
  return 'event: maintenance\ndata: '+JSON.stringify(value)+'\n\n';
 }
 subscribe(req,res){
  if(this.clients.size>=this.limit){
   res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});
   res.end('Canal de avisos temporariamente ocupado.');return false;
  }
  res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8',
   'Cache-Control':'no-cache, no-store, no-transform',
   'Connection':'keep-alive','X-Accel-Buffering':'no',
   'X-Content-Type-Options':'nosniff'});
  res.write(': conectado\n\n');
  res.write(this.encode(this.payload()));
  const record={res,ticker:null};
  const remove=()=>{
   if(record.ticker)clearInterval(record.ticker);
   this.clients.delete(record);
  };
  record.ticker=setInterval(()=>{
   if(res.destroyed){remove();return}
   if(res.writableLength<8192)res.write(': ping\n\n');
  },this.heartbeatMs);
  record.ticker.unref?.();
  // IncomingMessage pode emitir 'close' ao terminar de ler o GET mesmo
  // com a resposta SSE aberta; observar a resposta, não o request.
  res.on('close',remove);
  this.clients.add(record);
  return true;
 }
 announce(message){
  if(this.active)return this.payload();
  this.active=true;
  this.message=String(message).slice(0,240);
  this.at=new Date().toISOString();
  const packet=this.encode(this.payload());
  for(const record of this.clients){
   if(record.res.destroyed){clearInterval(record.ticker);this.clients.delete(record);continue}
   try{record.res.write(packet)}catch{record.res.destroy()}
  }
  return this.payload();
 }
 close(){
  for(const record of this.clients){
   clearInterval(record.ticker);
   try{record.res.end()}catch{}
  }
  this.clients.clear();
 }
}
module.exports={MaintenanceNotices};
'use strict';
/** Mensagens transacionais via HTTPS: compatível com Render Free (sem SMTP). */
const {validEmail}=require('./account-store');
const HTML_SAFE=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
class MailService{
 constructor({apiKey=process.env.RESEND_API_KEY || process.env.resend_api_key,from=process.env.RESEND_FROM_EMAIL,origin=process.env.PUBLIC_SITE_URL||'https://cronicasdaaurora.com.br',fetchFn=globalThis.fetch}={}){
  this.key=apiKey;this.from=from;this.fetchFn=fetchFn;
  try{const u=new URL(origin);this.origin=u.protocol==='https:'&&u.pathname==='/'&&!u.username&&!u.password?u.origin:''}catch{this.origin=''}
  this.ready=Boolean(apiKey && /^re_[a-zA-Z0-9_]+$/.test(apiKey) && from && from.length<255 && !/[\r\n]/.test(from) && validEmail((from.match(/<([^<>]+)>/)||[])[1]||from) && this.origin);
 }
 async send({to,username,kind,token}){
  if(!this.ready)throw Error('Provedor de e-mail indisponível');
  if(!validEmail(to)||!['verify','reset'].includes(kind)||!/^[a-f0-9]{64}$/.test(token))throw Error('Mensagem inválida');
  // Token no fragmento: nunca enviado ao servidor em GET nem exposto ao AdSense.
  const url=this.origin+'/'+(kind==='verify'?'verificar-email.html':'recuperar-senha.html')+'#token='+token;
  const title=kind==='verify'?'Confirme seu e-mail':'Redefina sua senha';
  const txt=kind==='verify'?'Confirme seu e-mail para poder recuperar sua conta no futuro. Este link expira em 24 horas.':'Recebemos um pedido de redefinição de senha. Este link expira em 20 minutos e só pode ser usado uma vez.';
  const text=`Olá, ${username}!\n\n${txt}\n\n${url}\n\nSe você não solicitou esta mensagem, pode ignorá-la.\n\nOs Peregrinos — Crônicas da Aurora`;
  const html=`<p>Olá, ${HTML_SAFE(username)}!</p><p>${HTML_SAFE(txt)}</p><p><a href="${HTML_SAFE(url)}">${title}</a></p><p>Se não foi você, ignore esta mensagem.</p><p>Os Peregrinos — Crônicas da Aurora</p>`;
  const response=await this.fetchFn('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+this.key,'Content-Type':'application/json'},body:JSON.stringify({from:this.from,to:[to],subject:title+' — Os Peregrinos',text,html}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Falha no provedor de e-mails: '+response.status);
  return true;
 }
}
module.exports={MailService};

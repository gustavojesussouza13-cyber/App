'use strict';
/*
 * Moderação preventiva para o MMORPG. É aplicada pelo servidor, independentemente
 * do navegador e da idade declarada. Não guarda texto rejeitado nem dados sensíveis.
 * O filtro automático não substitui supervisão humana ou proteção parental.
 */
const SAFE_PHRASES=Object.freeze([
 'Olá, peregrinos!','Bom dia!','Boa noite!','Bem-vindo ao reino!',
 'Vamos explorar!','Vamos formar uma equipe?','Preciso de ajuda na missão.',
 'Vamos enfrentar o chefe!','Estou perto do portal.','Encontrei uma masmorra!',
 'Obrigado pela ajuda!','Parabéns pela conquista!','Vamos com calma!',
 'Tudo bem por aí?','Estou aprendendo a jogar.','Até a próxima aventura!',
 'Cuidado com os monstros!','Preciso de uma poção.','Vamos ao santuário!',
 'Boa jornada!','Sim!','Não, obrigado.','Por favor, espere.','Já volto!'
]);
const FOLD_CHAR=Object.freeze({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s','!':'i','|':'i'});
const CONFUSABLE=Object.freeze({'а':'a','е':'e','о':'o','р':'p','с':'c','у':'y','х':'x','і':'i','ј':'j','ѕ':'s'});
const invisible=/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g;
function normalized(text){
 return String(text||'').normalize('NFKD').replace(/\p{M}/gu,'')
  .toLocaleLowerCase('pt-BR').replace(invisible,'')
  .replace(/[аeорсуxіјѕ]/g,ch=>CONFUSABLE[ch]||ch)
  .replace(/[013457@$!|]/g,ch=>FOLD_CHAR[ch]||ch)
  .replace(/([a-z])\1{2,}/g,'$1$1');
}
function compact(text){
 return normalized(text).replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}
function clean(text){
 if(typeof text!=='string')return null;
 const cleanText=text.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f]/g,'')
  .replace(invisible,'').replace(/\s+/g,' ').trim();
 if(!cleanText||cleanText.length>160||[...cleanText].length>160)return null;
 return cleanText;
}
const presetSet=new Set(SAFE_PHRASES.map(x=>compact(x)));
function isPreset(text){return presetSet.has(compact(text))}
const patterns=Object.freeze([
 // Nenhum contato fora do jogo: e-mail, domínio, ID de redes sociais,
 // telefone e links abreviados, inclusive com sinais e espaços.
 ['contact',/(?:https?:\s*\/\s*\/|www\s*\.|(?:\b[a-z0-9][\w-]{1,35}\s*\.\s*(?:com|net|org|gg|io|br|me|app|site|link|xyz)\b)|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b)/i],
 ['contact',/\b(?:whats?\s*app|zap(?:zap)?|discord|telegram|insta(?:gram)?|tik\s*tok|snap(?:chat)?|face(?:book)?|twitter|twitch|skype|dm|direct|privado|numero\s*de\s*(?:celular|telefone)|pix)\b/i],
 ['contact',/(?:^|[^\d])(?:\+?\d[\s().-]*){9,}(?:$|[^\d])/],
 // Não perguntar nem divulgar nome real, endereço, escola, idade ou fotos.
 ['privacy',/\b(?:onde\s+(?:voce|vc|tu)\s+(?:mora|vive|estuda)|qual\s+(?:sua|seu)\s+(?:idade|endereco|escola|telefone|celular|numero|nome\s*(?:verdadeiro|completo))|me\s+(?:passa|manda|envia|diz|fala|conta)\s+(?:seu|sua|o|a)?\s*(?:endereco|telefone|numero|zap|foto|idade|escola|bairro|cidade|nome\s*completo)|manda\s+(?:uma\s+)?(?:foto|selfie))\b/i],
 ['privacy',/\b(?:tenho|sou|estou\s+com)\s+(?:[1-9]|1[0-8])\s+anos?\b/i],
 ['privacy',/\b(?:rua|avenida|travessa|alameda|bairro|cep|codigo\s+postal|escola|colegio)\s+(?:da|do|de|das|dos)?\s*[\p{L}\d]{2,}/iu],
 ['privacy',/\b(?:minha\s+(?:casa|escola|rua)|meu\s+(?:endereco|telefone|celular|cpf|rg|numero\s*de\s*(?:casa|telefone))|moro\s+(?:na|no|em)|estudo\s+(?:na|no)|minha\s+senha)\b/i],
 // Convites para encontros secretos e pedidos de contato privado.
 ['unsafe',/\b(?:vamos\s+(?:nos\s+)?encontrar|vem\s+(?:aqui|na\s+minha\s+casa|para\s+minha\s+casa)|nao\s+(?:conta|diga|fala)\s+(?:pra|para)\s+(?:seus?\s+)?(?:pais|mae|pai|responsaveis?)|fica\s+(?:so\s+)?entre\s+(?:nos|a\s+gente)|me\s+encontra\s+(?:sozinho|sozinha))\b/i],
 ['unsafe',/\b(?:manda\s+(?:dinheiro|pix)|compra\s+(?:um\s+)?(?:codigo|cartao)|me\s+da\s+(?:sua\s+)?senha|passa\s+(?:sua\s+)?senha)\b/i],
 // Ameaças contra PESSOAS, não ataques de RPG contra monstros.
 ['threat',/\b(?:vou|vamos|quero)\s+(?:te|voce|vc|sua\s+familia)\s+(?:matar|bater|machucar|ferir|pegar)|\b(?:se\s+mata|se\s+suicida|morra|te\s+odeio|vou\s+te\s+achar)\b/i],
 ['sexual',/\b(?:pornografia|porn[oô]|nudes?|pelad[oa]s?|sexo|sexual|transar|masturba(?:r|cao)|pedofil\w*|estupr\w*|genitais?|buceta|p[eê]nis|piroca)\b/i],
 ['abuse',/\b(?:porra|caralho|merda|foda(?:-?se)?|foder|puta|putaria|fdp|otari[oa]|idiota|imbecil|retardad[oa]|arrombad[oa]|desgracad[oa]|lixo\s+humano|burro|burra|vai\s+se\s+foder)\b/i],
 ['abuse',/\b(?:seu|sua|voce|vc)\s+(?:lixo|idiota|imbecil|retardad[oa]|burro|burra|otari[oa])\b/i],
 // Palavras separadas por sinais para burlar o filtro.
 ['abuse',/\b(?:p[\W_]*u[\W_]*t[\W_]*a|f[\W_]*d[\W_]*p|c[\W_]*a[\W_]*r[\W_]*a[\W_]*l[\W_]*h[\W_]*o|p[\W_]*o[\W_]*r[\W_]*r[\W_]*a)\b/i]
]);
const notices=Object.freeze({
 contact:'Para proteger os jogadores, não compartilhe links, redes sociais, telefones ou contatos externos.',
 privacy:'Não peça nem compartilhe idade, fotos, escola, endereço ou informações pessoais.',
 unsafe:'Essa mensagem não é apropriada para um ambiente infantil.',
 threat:'Ameaças a outros jogadores não são permitidas.',
 sexual:'Conteúdo adulto não é permitido neste jogo.',
 abuse:'Ofensas e palavrões não são permitidos. Converse com respeito.',
 invalid:'Escreva uma mensagem de até 160 caracteres.',
 spam:'Evite mensagens repetidas ou muito rápidas.',
 muted:'Você está temporariamente sem permissão para conversar. Tente novamente mais tarde.'
});
function inspect(raw){
 const text=clean(raw);
 if(!text)return {ok:false,category:'invalid',message:notices.invalid};
 if(isPreset(text))return {ok:true,text,preset:true};
 const variants=[text.toLocaleLowerCase('pt-BR'),normalized(text),compact(text)];
 for(const [category,pattern] of patterns){
  if(variants.some(v=>pattern.test(v)))return{ok:false,category,message:notices[category]};
 }
 const pieces=compact(text).split(' ');
 if(pieces.length>6&&new Set(pieces).size<=2)return{ok:false,category:'spam',message:notices.spam};
 if((text.match(/[!?]{2,}/g)||[]).length>=5)return{ok:false,category:'spam',message:notices.spam};
 return {ok:true,text,preset:false};
}
class ChatGuard {
 constructor({now=()=>Date.now(),cooldownMs=1100}={}){
  this.now=now;this.cooldownMs=cooldownMs;this.users=new Map();
 }
 state(uid){
  const key=String(uid);
  if(!this.users.has(key))this.users.set(key,{last:0,lastText:'',repeat:0,
   attempts:0,strikes:0,strikeAt:0,mutedUntil:0,lastUsed:0});
  if(this.users.size>5000){
   for(const [id,v] of this.users)if(this.now()-v.lastUsed>3600000)this.users.delete(id);
  }
  return this.users.get(key);
 }
 check(uid,raw){
  const t=this.now(),st=this.state(uid),previousUse=st.lastUsed;st.lastUsed=t;
  if(t<st.mutedUntil)return{ok:false,category:'muted',message:notices.muted,waitMs:st.mutedUntil-t};
  if(st.last&&t-st.last<this.cooldownMs){
   st.attempts++;
   if(st.attempts>=7)this.silence(uid,60000);
   return{ok:false,category:'spam',message:notices.spam};
  }
  st.attempts=0;st.last=t;
  const result=inspect(raw);
  if(!result.ok){
   if(t-st.strikeAt>10*60*1000)st.strikes=0;
   st.strikeAt=t;st.strikes++;
   if(st.strikes>=5)this.silence(uid,10*60*1000);
   else if(st.strikes>=3)this.silence(uid,2*60*1000);
   return result;
  }
  const fingerprint=compact(result.text);
  if(fingerprint===st.lastText&&t-previousUse<30000)st.repeat++;
  else st.repeat=0;
  st.lastText=fingerprint;
  if(st.repeat>=3){
   this.silence(uid,60000);
   return{ok:false,category:'spam',message:notices.spam};
  }
  return result;
 }
 silence(uid,ms){
  const st=this.state(uid);
  st.mutedUntil=Math.max(st.mutedUntil,this.now()+ms);
 }
 remove(uid){this.users.delete(String(uid))}
}
module.exports={SAFE_PHRASES,isPreset,inspect,clean,compact,ChatGuard,notices};

#!/usr/bin/env python3
"""V8.2: protege partidas cooperativas ao cair a conexão e melhora reconexão.

Exige a V8.1 íntegra, impede mudanças inesperadas no jogo original,
respeita os slots locais de salvamento e mantém até cinco jogadores.
"""
from pathlib import Path
import hashlib

root=Path(__file__).resolve().parents[1]
asset=root/'app/src/main/assets/index.html'
original_sha='dd5557ce596c452c49bb80d675ff130cf6b27bdde3d6ca9f2634af4a182d2f04'

def digest(s):return hashlib.sha256(s.encode('utf-8')).hexdigest()

def replace_once(s,old,new):
    n=s.count(old)
    if n!=1:raise SystemExit(f'Patch V8.2 abortado: ocorrência {n} para {old[:92]!r}')
    return s.replace(old,new,1)

s=asset.read_text(encoding='utf-8')
if 'EDIÇÃO 16-BIT V8.2' in s and 'RECONECTAR SALA V8.2' in s:
    print('Android V8.2 já aplicada; nada a fazer.')
    raise SystemExit(0)
if digest(s)!=original_sha:
    raise SystemExit('Patch V8.2 recusado: jogo Android não corresponde à V8.1 original.')

# Impede que, sem internet, os controles alterem a partida cooperativa como se ela fosse solo.
s=replace_once(s,
 "musicPoll+=dt;if(musicPoll>.7){musicPoll=0;syncMusic()}if(paused)return;movement(dt);",
 "musicPoll+=dt;if(musicPoll>.7){musicPoll=0;syncMusic()}if(paused||(coop.mode==='coop'&&!coop.online))return;movement(dt);")
s=replace_once(s,
 "function attack(){if(paused)return;if(!Number.isFinite(p.attackAt)",
 "function attack(){if(paused||(coop.mode==='coop'&&!coop.online))return;if(!Number.isFinite(p.attackAt)")
s=replace_once(s,
 "function interact(){if(paused)return;",
 "function interact(){if(paused||(coop.mode==='coop'&&!coop.online))return;")
s=replace_once(s,
 "function nextChapter(){if(p.chapter===5)",
 "function nextChapter(){if(coop.mode==='coop'&&!coop.online)return msg('Reconecte-se à sala antes de avançar.');if(p.chapter===5)")
# Quando a conexão cai após entrar, pausa a sessão e oferece reconexão segura.
s=replace_once(s,
 "  if(gameplayActivated)msg('Conexão da sala interrompida. Toque em Sala para reconectar.');",
 """  if(coop.joined){
   save(); // RECONECTAR SALA V8.2 — o co-op não vira campanha offline se a rede cair.
   ui('Conexão cooperativa interrompida',`<p>A ligação com a sala <strong>${safe(coop.code)}</strong> caiu. A partida foi pausada para evitar progresso fora de sincronia.</p><p>Seu salvamento cooperativo continua neste aparelho. Se o servidor reiniciou, peça ao anfitrião um código de sala novo.</p>`,[
    ['Reconectar à sala',()=>{const room=coop.code;coop.joined=false;coopConnect('join',room,0)}],
    ['Voltar ao menu',()=>{coopDisconnect(true);intro()}]
   ]);
  }""")
# Mensagem de erro de sala também libera o socket e evita conexões fantasmas.
s=replace_once(s,
 "if(event.type==='error'){ui('Não foi possível entrar'",
 "if(event.type==='error'){coopDisconnect(false);ui('Não foi possível entrar'")
# Exibe observações reais sobre modo offline e reconexão, sem mascarar problemas de rede.
s=replace_once(s,
 "<p>O progresso cooperativo fica separado da campanha individual e é salvo neste aparelho.</p>",
 "<p>O progresso cooperativo fica separado da campanha individual e é salvo neste aparelho. Se a internet cair, a partida pausa até você reconectar; o modo solo continua disponível sem conexão.</p>")
s=replace_once(s,
 "if(!coop.online){ui('Sala desconectada','<p>Sem conexão com a sala. Seu progresso cooperativo está salvo neste aparelho.</p>'",
 "if(!coop.online){ui('Sala desconectada','<p>A sessão cooperativa está pausada até a reconexão. Seu progresso cooperativo está salvo neste aparelho.</p>'")
s=replace_once(s,
 "<p>Não foi possível abrir a sala. Verifique a internet. O servidor pode estar iniciando.</p><p>Você ainda pode jogar offline normalmente.</p>",
 "<p>Não foi possível abrir a sala. Verifique a internet. O servidor pode estar iniciando.</p><p>Salas temporárias não sobrevivem ao reinício do servidor; tente criar uma sala nova se o código antigo não existir mais. O modo solo funciona offline.</p>")
# Permite migrar o salvamento cooperativo, independentemente da campanha solo.
# Importação é feita apenas no localStorage do co-op e nunca toca no slot offline.
s=replace_once(s,
 "function privacyScreen(fromMenu=false){",
 """function coopBackupScreen(fromRoom=false){
 let saved='';try{saved=localStorage.getItem(COOP_SAVE)||''}catch(_){}
 const token=saved?btoa(unescape(encodeURIComponent(saved))):'';
 ui('Transferir progresso cooperativo',`<p>Seu progresso cooperativo é independente da campanha solo. Copie o código antes de desinstalar o aplicativo ou trocar de aparelho.</p><textarea id=\"coopBackupText\" aria-label=\"Código do progresso cooperativo\" spellcheck=\"false\" style=\"width:100%;height:125px;max-height:25vh;padding:10px;box-sizing:border-box;background:#071a1c;border:2px solid #b99a58;border-radius:4px;color:#faf2d8;font:12px monospace;user-select:text;touch-action:auto\">${token}</textarea><p style=\"font-size:12px\">Este código contém o progresso do personagem. Guarde-o em particular. O servidor cooperativo não recebe a cópia.</p>`,[
  ['Copiar código',()=>{const el=$('coopBackupText');if(!el||!el.value)return msg('Ainda não há progresso cooperativo salvo.');el.focus();el.select();if(navigator.clipboard?.writeText)navigator.clipboard.writeText(el.value).then(()=>msg('Código cooperativo copiado!')).catch(()=>msg('Selecione e copie o código.'));else{document.execCommand('copy');msg('Código selecionado.')}}],
  ['Importar código',()=>{try{const data=String($('coopBackupText')?.value||'').trim().replace(/\\s+/g,'');const decoded=decodeURIComponent(escape(atob(data)));const obj=JSON.parse(decoded);if(!obj||obj.version!==2||!obj.p||typeof obj.p!=='object'||!Number.isInteger(obj.p.chapter)||obj.p.chapter<0||obj.p.chapter>5)throw Error('Formato inválido');if(!confirm('Substituir o progresso cooperativo guardado neste aparelho?'))return;localStorage.setItem(COOP_SAVE,decoded);msg('Progresso cooperativo importado.');if(fromRoom){coopSend({type:'leave'});coopDisconnect(true)}intro()}catch(_){msg('Código cooperativo inválido ou incompleto.')}}],
  ['Voltar',fromRoom?coopMenu:intro]
 ]);
}
function privacyScreen(fromMenu=false){""")
s=replace_once(s,
 "['Importar campanha',()=>backupScreen(true)],['Privacidade',()=>privacyScreen(true)]",
 "['Transferir campanha solo',()=>backupScreen(true)],['Transferir progresso cooperativo',()=>coopBackupScreen(false)],['Privacidade',()=>privacyScreen(true)]")
s=replace_once(s,
 "['Voltar ao mundo',close],['Sair do cooperativo',()=>{save();coopSend({type:'leave'});coopDisconnect(true);intro()}]",
 "['Voltar ao mundo',close],['Transferir progresso cooperativo',()=>{save();coopBackupScreen(true)}],['Sair do cooperativo',()=>{save();coopSend({type:'leave'});coopDisconnect(true);intro()}]")
# Versão V8.2, em todas as interfaces e metadados HTML.
s=s.replace('V8.1','V8.2')
asset.write_text(s,encoding='utf-8')
print('Atualização V8.2 concluída:',len(s),'caracteres; SHA256:',digest(s))

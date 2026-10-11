# Gustavo, O Peregrino — V8.0 Android · Cooperativo até 5

**APK Android independente do site Os Peregrinos.** O modo solo preserva a campanha e funciona offline. O cooperativo funciona por internet com até **5 jogadores por sala** (1 anfitrião + 4 convidados), por código de 6 caracteres.

## Como jogar

1. Todos instalam o APK V8.0.
2. No menu, selecione **Cooperativo → Criar sala** e escolha um apelido.
3. Compartilhe o código de seis caracteres com até quatro amigos.
4. Cada amigo toca **Entrar com código** e utiliza o mesmo código.
5. Na mesma fase, vocês veem os personagens e sincronizam movimento, inimigos, combate, XP, ouro, centelhas e avanço de capítulo.
6. Se o anfitrião sair, outro jogador assume a coordenação. As salas são temporárias.

**Serviço exclusivo do aplicativo**: `wss://gustavo-peregrino-coop.onrender.com/coop-ws` (HTTP `/health`). O servidor do site não é alterado. Código backend: branch `gustavo-peregrino-coop-v8` no repositório GitHub. A hospedagem Render Free pode hibernar e reiniciar, apagando salas; não apaga automaticamente os salvamentos locais.

## Salvamentos e instalação

O modo individual usa `gustavo-peregrino-v2`; coop usa `gustavo-peregrino-coop-v1`, preservando o avanço solo original. **Antes de substituir/desinstalar o APK anterior, use Transferir campanha para guardar seu código de recuperação.** APKs de testes podem ter chaves de assinatura diferentes; não desinstale antes de exportar o progresso, porque os dados locais serão apagados.

## Compilar

O repositório do APK usa o arquivo original `app/src/main/assets/index.html` como base V6.3; o script `scripts/apply_coop_patch.py` reconstitui o jogo V8.0 de forma verificável, preservando imagens e sons. GitHub Actions usa Java 17, Android SDK 36, Gradle 8.13. Executar `npm test`, `python3 scripts/apply_coop_patch.py`, `gradle :app:assembleDebug`.

## Limitações

- Somente o modo cooperativo exige internet. O jogo individual continua offline.
- Salas e entidades compartilhadas são experimentais, não há contas nem sincronização permanente de progresso com o servidor.
- A capacidade de 5 foi testada no protocolo; ainda é necessário validar em cinco aparelhos Android reais.
- O servidor deve permanecer ligado para as partidas. Em plano gratuito, acordar o serviço pode demorar.

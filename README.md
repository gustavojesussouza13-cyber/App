# Gustavo, O Peregrino — APK Android V8.2 · Cooperativo para até 5

**Projeto Android independente.** Nenhum arquivo do site Os Peregrinos ou de suas páginas é utilizado ou modificado por esta atualização. O servidor cooperativo também é separado.

## O que existe nesta versão

- **Modo solo offline** com a campanha 16-bit original, missões, combate, diálogos, trilhas e salvamentos no próprio aparelho.
- **Modo cooperativo pela internet com salas privadas de no máximo 5 pessoas**: 1 anfitrião + até 4 convidados.
- Salas por **código de seis caracteres**; status da sala, participantes, compartilhamento do código e reconexão.
- Na mesma fase, visualização de outros jogadores e sincronização de inimigos, combate, XP, moedas, centelhas e passagem de capítulo.
- O anfitrião pode sair e a coordenação é transferida automaticamente. Cada jogador guarda seu progresso cooperativo no próprio celular, em área separada do solo.
- Melhorias V8.2: protege a partida quando a internet cai, abre tela para reconectar, impede que combates/centelhas avancem offline por engano, explica salas temporárias e adiciona **transferência do progresso cooperativo**. Android `1.4.2` (`versionCode 9`). Preserva as correções visuais de V8.1.

## Como jogar com amigos

1. Instale o **mesmo APK V8.2** em cada celular Android.
2. Abra o jogo e escolha **✦ Cooperativo online (até 5)**.
3. Um jogador escolhe **Criar sala** e informa seu apelido; o jogo entrega um código de 6 caracteres.
4. Os outros quatro escolhem **Entrar com código** e digitam o código e um apelido diferente.
5. Todos jogam na mesma sala. A sexta tentativa de entrada é rejeitada pelo servidor.

O serviço opcional de rede usado **somente pelo APK** é `wss://gustavo-peregrino-coop.onrender.com/coop-ws`. Trata-se de um serviço Render próprio do app Android, **não** do site. Salas são temporárias e podem desaparecer quando o servidor gratuito é reiniciado ou entra em suspensão. Para jogar sozinho não é preciso internet.

## Salvamento e atualizações

O solo utiliza o armazenamento `gustavo-peregrino-v2`; o modo cooperativo usa `gustavo-peregrino-coop-v1`. Os dados ficam no aparelho, não na nuvem. **Antes de remover um APK antigo, abra o menu “Transferir campanha” e copie/guarde o código de recuperação da campanha solo. Na V8.2 também existe “Transferir progresso cooperativo” no menu inicial e no painel da sala, para futuras migrações**. APKs de teste compilados em GitHub Actions podem ter assinaturas diferentes, impedindo a atualização sobre instalações antigas. Nesse caso, somente após realizar a cópia do progresso desinstale a versão antiga e instale a nova, importando o progresso pelo menu.

A versão atual não fornece contas, recuperação automática de personagens nem backup remoto. **A V8.1 não possuía exportação do progresso cooperativo:** se uma instalação V8.1 precisar ser desinstalada por conflito de assinatura, o progresso cooperativo armazenado somente nela pode não ser recuperável. Não desinstale antes de conferir suas opções de cópia. As exportações da V8.2 devem ser guardadas em local privado.

## Como compilar no Android Studio / CI

- Java 17, Android SDK 36, Gradle 8.13.
- O arquivo `app/src/main/assets/index.html` deste ZIP **já está na V8.2**, pronto para Android Studio. Para reconstruir a partir da base V6.3 no repositório de código, rode `python3 scripts/apply_coop_patch.py` e depois `python3 scripts/apply_v81_patch.py` e `python3 scripts/apply_v82_patch.py`.
- Execute `gradle :app:assembleDebug` em ambiente Android SDK configurado; a integração CI na branch independente `gustavo-peregrino-coop-v8` também gera o APK.
- Backend separado: `coop-server.js`, `mobile-coop.js` e `tests/android-coop-five.test.js` na mesma branch. Execute `npm test` para validar o limite de cinco e o protocolo.

## Estado da validação

Os testes automatizados verificam salas com cinco participantes, bloqueio da sexta conexão, progresso compartilhado e migração do anfitrião. Não equivale a teste em cinco aparelhos físicos. O instalador precisa ser assinado pelo Android Gradle Plugin (o APK entregue vem do build do GitHub Actions).

## Proteção de desconexão na V8.2

Quando a sala cair após conexão, o aplicativo pausa a partida e oferece **Reconectar à sala** ou voltar ao menu. Se o servidor temporário reiniciou, a sala será perdida e o anfitrião precisará criar outra. As ações de ataque, interação e passagem de capítulo não funcionam enquanto o modo coop estiver offline, para evitar progresso incoerente. O limite de 5 jogadores continua sendo fiscalizado no backend separado.

**Esta edição não altera nem publica nenhum arquivo do site** `cronicasdaaurora.com.br` / Os Peregrinos.

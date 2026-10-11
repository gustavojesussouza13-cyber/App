# OS PEREGRINOS — CRÔNICAS DA AURORA: MMORPG 16-bit (alfa 2.0–5.0)

Jogo MMORPG **experimental** para PC no navegador, preservando a campanha original em `/jogo.html` e introduzindo o modo **Mundo Aberto** em `/mundo.html`.

## Sem contas

Para entrar, basta escolher um **nome de 3 a 18 caracteres**. Não existem cadastro, e-mail ou senha. O navegador cria um token secreto e aleatório (armazenado em `localStorage`) que identifica o progresso daquele navegador no servidor. O servidor só armazena o **hash SHA-256** do token, não o token bruto. Apelidos são exclusivos **durante a conexão**, mas não são identidades verificadas. Se limpar os dados do navegador ou trocar de PC, **não há recuperação garantida**. Outros podem usar seu apelido quando você estiver desconectado, mas não recebem automaticamente seu progresso.

## O que funciona nesta alfa

- **16 regiões** de exploração 16-bit em canvas, com 4 masmorras e passagens guiadas.
- **240 criaturas** instanciadas no mundo: 32 espécies, criaturas comuns e 16 chefes, respawn e IA executada por região ativa.
- **Combate cooperativo**: vários jogadores podem atacar o mesmo monstro, com vida e recompensas controladas pelo servidor; armas e habilidades por classe, inclusive cura em área do curandeiro.
- **Níveis 1–100**, XP, vida, moedas, saques, inventário, poções e mercado NPC.
- **Quatro classes**: Peregrino, Guardião, Arqueiro e Curandeiro.
- **Missões de progresso**, regiões visitadas e recompensas por chefes.
- **Equipes** de até 5, convites, XP e moedas repartidos por proximidade.
- **Guildas**, convites e chat de guilda.
- **Transferência consentida** de itens e moedas entre jogadores próximos (uma direção por operação, não uma bolsa de ofertas bilateral).
- **Chat global, de equipe e de guilda**, posição de jogadores em mesma região e minimapa.
- **No máximo 10 jogadores simultâneos**, somando campanha clássica e Mundo Aberto, no processo Node.js.
- **Persistência SQLite local** em `data/world.sqlite`, com gravação periódica e ao desconectar; pode-se usar `DATA_FILE` para outra localização.
- Nenhuma dependência externa de npm além do Node.js 22+.

## Muito importante: limites antes de chamar MMORPG completo

Este projeto **não é um MMORPG comercial 5.0 pronto**. A versão entregue implementa sistemas-jogáveis inspirados nas etapas 2.0–5.0. Para muitos jogadores simultâneos / centenas de monstros com IA ativa, ainda precisa de testes de carga, mapas artísticos finais, múltiplos processos, serviço central de identidade por token, database persistente gerenciada, sincronização entre regiões, filtros fortes contra trapaça, denúncias, políticas de comunidade, auditorias, recuperação e backups.

**Hospedagem atual:** o Render Free usa **sistema de arquivos efêmero**. O SQLite local pode ser perdido em suspensões/reimplantações, portanto **o progresso NÃO é garantido de forma permanente no site hospedado**, apesar de funcionar e ser preservado enquanto o arquivo continua disponível. Não exija compras reais nem confie no progresso como definitivo. Próximo requisito operacional crítico: configurar banco durável externo / disco persistente (pode exigir plano pago), exportações e backups verificáveis. SQLite local é adequado para desenvolvimento, não para escalonamento multi-instância.

Os salvamentos existentes da **campanha clássica** continuam separados no `localStorage` original, não são transferidos automaticamente para o novo mundo.

## Executar / testar

```bash
node --version     # Node.js 22+
npm test           # testes automatizados de rede, combate e economia
npm start          # http://localhost:3000
```

Ambiente opcional:

```bash
PORT=3000 DATA_FILE=/tmp/os-peregrinos-world.sqlite npm start
```

**WebSocket:** `/world-ws` (mundo aberto) e `/ws` (campanha clássica). API `/api/status` mostra lotação, número de regiões e monstros configurados.

## Controles

| Tecla | Ação |
|---|---|
| WASD / Setas | Andar |
| Clique em monstro | Selecionar alvo |
| J / Espaço | Atacar |
| K | Habilidade de classe |
| H | Usar poção |
| I | Inventário |
| Q | Missões |
| M | Mapa |
| P / G | Social |
| Enter | Chat |

## Arquitetura / evolução

- `world-engine.js`: servidor autoritativo, progressão, criaturas, AI, mapa, equipes, guildas, economia e persistência SQLite.
- `server.js`: HTTP estático, WebSocket e coexistência com a campanha original.
- `public/mundo.html`, `public/mmo.css`, `public/mmo.js`: interface de jogo multiplayer 16-bit.
- `public/jogo.html`: campanha clássica preservada.
- `tests/world.test.js`, `tests/world-online.test.js`: testes de segurança básica, economia, protocolo e limite.

**Próxima fase para escalar:** persistência fora do servidor, autoritatividade de colisão por tile, navegação entre regiões por portais dentro do mapa, combate com PvE mais sofisticado, instâncias isoladas de masmorras, segurança anti-bot, moderação, canais privados, observabilidade e infraestrutura com ownership distribuído por zonas e fila para lotação.


## Correção do visual 16-bit original

O **Mundo Aberto** usa agora o atlas de 78 ilustrações `public/assets/classic-atlas.png`, com os 66 recursos extraídos do jogo clássico (texturas de grama, terra, água, árvores, construções, animações de personagens e inimigos), além de 12 sprites complementares de criaturas em pixel art. O mapa é desenhado por `public/art16.js`, incorporado antes de `public/mmo.js` em `public/mundo.html`.

Ao editar o atlas, mantenha o mapeamento de coordenadas em `public/art16.js` sincronizado com `public/assets/classic-atlas-map.json`. Os PNGs-fonte originais estão na pasta `public/assets/original16/` do **pacote ZIP completo para desenvolvimento**; o site publicado usa apenas o atlas otimizado. A campanha original `/jogo.html` permanece independente. A correção gráfica não altera combate, missões, salvamento ou o limite de dez jogadores.


## Comportamento de monstros e navegação entre modos
- Regiões externas: **13 criaturas comuns e 1 chefe**; masmorras: **17 criaturas comuns e 1 chefe**; são **240 monstros em 16 regiões**, menos que os 456 anteriores.
- Monstros **não iniciam combate por proximidade**. Atacam exclusivamente o peregrino que acertou o primeiro golpe, durante até 16 segundos desde o último ataque; voltam à paz ao vencer/falhar a perseguição, trocar de região ou renascer.
- Campanha clássica servida em `/jogo.html` recebe o script `/classic-return.js` que adiciona **“Voltar à versão online (MMORPG)”** ao menu inicial e deixa o atalho no topo da tela. O HTML grande original permanece intacto.


## Interface: tela cheia e retorno ao Mundo Aberto

- **Mundo Aberto (`/mundo`)**: botão **⛶ Tela cheia** no canto superior direito do mapa, com entrada e saída pela API Fullscreen do navegador. O mapa preserva proporção 5:3 e pixel art sem distorcer a imagem. Para sair, clique **Sair da tela cheia** ou pressione **Esc**. Se o navegador bloquear a API, o jogo indica a alternativa **F11** para tela cheia do navegador.
- **Campanha clássica (`/jogo.html`)**: botão **🌐 VOLTAR À VERSÃO ONLINE (MMORPG)** visível na própria tela inicial, além do retorno no cabeçalho. Os dois levam para `/mundo` e não exigem iniciar a campanha.
- O acesso continua apenas pelo nome, com limite total de 10 jogadores. Os sistemas de missões, monstros, classes e combate não foram modificados por esta atualização de interface.


## Nova campanha narrativa: O Sétimo Verso

O Mundo Aberto recebeu uma história autoral, **16 capítulos em sequência**, **32 NPCs** (16 protagonistas e 16 moradores), **95 trechos de diálogo da história principal**, mais conversas de ambientação, **sete Centelhas** e um desfecho com pequenas variantes segundo as escolhas de compaixão ou coragem.

**Sinopse sem spoilers:** O Sino da Aurora ficou mudo, e os habitantes de Auren começaram a esquecer uns aos outros. A peregrinação pelas terras, florestas, rios e quatro masmorras reúne depoimentos contraditórios sobre Cálen, o antigo guardião acusado de trair o reino. O jogador investiga o que aconteceu, acolhe testemunhas e recompõe o hino das sete vozes. A jornada aborda memória, perdão, justiça, esperança e o risco de carregar tudo sozinho.

- **E** ou o botão **✦ Conversar** fala com o NPC mais próximo. Também é possível clicar nele no mapa. A interação exige proximidade e a história valida as decisões no servidor.
- **Enter** avança nas páginas, **Esc** fecha a conversa. Há sempre duas respostas narrativas quando um capítulo pode ser concluído; algumas missões pedem **duas ou três vitórias em combate depois de aceitar o desafio**, na própria região.
- **Aba Crônicas** (atalho **L**) mostra o capítulo atual, o próximo personagem e região, o progresso dos objetivos e as centelhas encontradas.
- Os capítulos passam pela sequência **Vale → Floresta → Masmorra da Raiz → Riacho → Deserto → Masmorra das Cinzas → Montanhas → Ruínas → Templo Esquecido → Campos → Pântano → Costa → Bosque → Cidadela → Terra da Última Luz → Câmara da Aurora**. Os personagens fornecem as quatro chaves necessárias para as masmorras em momentos apropriados, sem obrigar o jogador a comprar as chaves.
- Ao encerrar um capítulo, o jogador recebe **XP e moedas uma única vez**. Decisões e centelhas ficam salvas no personagem (SQLite local / JSON de teste). O desfecho varia ligeiramente com suas respostas.
- NPCs usam **sprites do atlas 16-bit original** e aparecem no minimapa como pontos dourados. São pacíficos e não afetam a IA dos monstros.

**Limite de hospedagem:** assim como o restante do personagem, o progresso narrativo pode ser perdido após uma reinicialização/reimplantação do Render gratuito sem armazenamento durável. A campanha clássica continua independente.

Arquivos novos: `story-data.js` (história e catálogo de NPCs) e `tests/story.test.js` (validação de escolhas, distâncias, recompensas, persistência e fluxo completo). Todos os recursos do jogo são entregues no ZIP completo; nenhum serviço adicional é necessário para executar localmente.

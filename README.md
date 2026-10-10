# OS PEREGRINOS — CRÔNICAS DA AURORA: MMORPG 16-bit (alfa 2.0–5.0)

Jogo MMORPG **experimental** para PC no navegador, preservando a campanha original em `/jogo.html` e introduzindo o modo **Mundo Aberto** em `/mundo.html`.

## Sem contas

Para entrar, basta escolher um **nome de 3 a 18 caracteres**. Não existem cadastro, e-mail ou senha. O navegador cria um token secreto e aleatório (armazenado em `localStorage`) que identifica o progresso daquele navegador no servidor. O servidor só armazena o **hash SHA-256** do token, não o token bruto. Apelidos são exclusivos **durante a conexão**, mas não são identidades verificadas. Se limpar os dados do navegador ou trocar de PC, **não há recuperação garantida**. Outros podem usar seu apelido quando você estiver desconectado, mas não recebem automaticamente seu progresso.

## O que funciona nesta alfa

- **16 regiões** de exploração 16-bit em canvas, com 4 masmorras e passagens guiadas.
- **456 criaturas** instanciadas no mundo: 32 espécies, criaturas comuns e 16 chefes, respawn e IA executada por região ativa.
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

# Gustavo, O Peregrino — servidor cooperativo do APK Android V8

Servidor exclusivo para o jogo Android (independente do site Os Peregrinos). Salas temporárias com código privado de seis caracteres e máximo de cinco jogadores. Os participantes compartilham posição, inimigos, recompensas, centelhas e capítulos. O modo solo permanece offline; os saves ficam no celular. Endpoint WSS: `/coop-ws`; checagem: `/health`. Node 22, sem pacotes externos.

Limitações: salas e estado de partida são temporários na memória; em reinício do servidor, é necessário criar sala nova. Não coleta conta, email ou senha. Para testar: `npm test`; para executar: `npm start`.

# Os Peregrinos — hospedagem Render (ramificação isolada)

Projeto experimental Node.js WebSocket para navegador PC.

Este branch `os-peregrinos-web` não modifica o `main` do repositório Android.

**Render**: runtime Node, build `node prepare-game.js`, start `npm start`, plano Free.
O script constrói `public/jogo.html` a partir de `public/jogo-base.html` e do pequeno arquivo de mudanças. O HTML final é conferido por SHA-256.

**Aviso**: versão alpha; chat aberto e salvamento local por personagem; combate e missões individuais.

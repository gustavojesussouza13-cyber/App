# Os Peregrinos — Crônicas da Aurora

**Protótipo experimental de RPG multiplayer em navegador para PC**, adaptado do jogo solo *Gustavo, O Peregrino*.

## O que já funciona

- Site de entrada em português, com nome de jogador (3–18 caracteres).
- Mesmo cenário, as seis regiões, narrativa, espada, missões d20, sete músicas originais e itens do jogo-base.
- Multiplayer real via WebSocket: ver jogadores na **mesma região**, com movimento, direção e nomes sincronizados; chat global em tempo real.
- Número de jogadores conectados, chat aberto com **Enter**, fechar com **Esc**, nome salvo no navegador.
- Salvamento por personagem **no navegador local**. O servidor não mantém conta nem salva progresso online.
- Apenas uma versão para **computador no navegador**. Não necessita APK.

### Limitações importantes

**Isto é uma alpha multiplayer, não um MMORPG completo.** As batalhas, os inimigos, os itens e a conclusão de missões continuam individuais e calculados pelo navegador. Não há autenticação por senha, proteção definitiva do nome, banco de dados permanente, sistemas de guildas ou moderação robusta. O servidor é um protótipo com até 80 conexões simultâneas configuradas (não é capacidade garantida em produção). Não anuncie como jogo final para centenas de jogadores antes de testar carga e segurança.

## Executar no computador (sem instalar dependências)

1. Instale o Node.js 20 ou superior.
2. Extraia este ZIP em uma pasta.
3. Abra um terminal dentro da pasta e rode: `npm start` (ou `node server.js`).
4. Abra **http://localhost:3000** no navegador do PC.
5. Para testar com mais de um usuário, abra a página em dois navegadores ou dispositivos **na mesma rede** usando o IP local do computador: `http://SEU-IP:3000`. É necessário permitir acesso no firewall do Windows.

Se quiser mudar a porta, defina a variável de ambiente `PORT`.

## Hospedar como site público (Render)

1. Crie um repositório no GitHub, por exemplo `Os-Peregrinos-Online`.
2. Envie **o conteúdo extraído** do ZIP para a raiz do repositório: `server.js`, `package.json`, `render.yaml`, a pasta `public` etc.
3. Entre em https://dashboard.render.com/ e escolha **New → Web Service**.
4. Conecte esse repositório. Escolha o plano **Free** para testes.
5. Configure **Build Command**: `npm install --omit=dev` e **Start Command**: `npm start` (ou use a configuração `render.yaml` pelo recurso Blueprint).
6. Após o deploy, copie a URL pública `https://SEU-SERVICO.onrender.com`. Esse endereço será seu site de jogo. A conexão WebSocket usa a mesma URL automaticamente, sem ajustes no código.

**Aviso Render Free:** pode suspender após 15 minutos sem tráfego; o primeiro acesso após a suspensão pode demorar. Reinicializações desconectam jogadores. Não oferece disponibilidade constante. Para produção, use um serviço pago, monitoramento, moderação e banco de dados externo.

## Controles PC

- **WASD ou setas:** mover
- **J ou Espaço:** atacar
- **K:** defender
- **E:** conversar / interagir
- **F:** poção
- **C:** ficha
- **M:** diário
- **P:** salvar
- **Enter:** abrir chat / enviar mensagem
- **Esc:** fechar chat

A campanha solo da versão antiga (`gustavo-peregrino-v2`) permanece intacta. Este projeto usa novas chaves de salvamento separadas por nome (`os-peregrinos-save-<nome>`). Para importar um salvamento antigo, utilize o botão **Importar campanha**, após criar o personagem no site, com o código exportado na versão antiga.

## Arquivos

- `server.js`: servidor HTTP e WebSocket, sem bibliotecas de terceiros.
- `public/index.html`: site de apresentação e escolha de nome.
- `public/site.css`, `public/site.js`: design e comportamento do site.
- `public/jogo.html`: jogo completo com músicas e assets incorporados; cliente multiplayer.
- `public/sobre.html`: informações sobre a versão experimental e dados de conexão.
- `render.yaml`: configuração opcional para deploy.
- `tests`: testes do protocolo multiplayer.

## Segurança e comunidade

O nick não é uma conta verificada. O chat é público para todos os conectados e tem controles simples de tamanho/frequência. Antes de abrir inscrições em escala, providencie autenticação, denúncias, bloqueios, termos de uso e canal de contato do responsável, além de revisar a política de privacidade e aplicar regras apropriadas para jogadores menores de idade. Evite compartilhar informações pessoais no chat.

© Projeto original **Os Peregrinos — Crônicas da Aurora**. Protótipo em desenvolvimento.

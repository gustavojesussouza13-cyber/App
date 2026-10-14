# Personalização de personagens — Os Peregrinos

## Funcionamento
- Criador de aparência antes de entrar como **visitante** ou cadastrar uma **conta**.
- Opções validadas: tom de pele, corte e cor de cabelo, cor dos olhos, traje, capa e acessório.
- Prévia com o mesmo estúdio de sprites 16-bit do mundo (quadros originais de 40×52 pixels, sem suavização).
- Personagens de contas cadastradas guardam `appearance` no salvamento JSONB existente do PostgreSQL. Não requer alteração da estrutura do banco.
- Visitantes conservam a aparência durante a sessão e em reconexões temporárias, sem criar identidade permanente.
- Visual sincronizado entre jogadores via snapshots e atualizações de aparência.
- Botão **Alterar aparência** no painel de personagem; a alteração é validada e salva pelo servidor.
- A silhueta, as armas e os equipamentos de Peregrino, Arqueiro, Guardião e Curandeiro continuam específicos de cada classe.

## Arquivos relevantes
- `public/appearance16.js`: opções, validação, paletas e camadas de pixel art, usados também pelo servidor.
- `public/appearance-editor.js`: seletor acessível e prévia visual.
- `public/sprite-studio.js`: quadros personalizáveis, cache por aparência.
- `public/art16.js`: desenho da aparência individual no mundo.
- `public/mmo.js`, `public/mundo.html`, `public/mmo.css`: criação, edição e interface.
- `world-engine.js`: salvamento e sincronização multiplayer.
- `tests/character-customization.test.js`: testes de conta, visitante, segurança e qualidade.

## Publicação e validação
O fluxo GitHub Actions `Reinos de Auren - testes` executa `npm test` e verifica a sintaxe das interfaces. A atualização mantém a persistência do personagem e não redefine progresso, classes ou guildas existentes.

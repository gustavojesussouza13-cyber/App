# Criaturas V3 — revisão experimental (NÃO PUBLICAR)

Esta branch sai de `os-peregrinos-online` e prepara o renderizador das cinco criaturas aprovadas visualmente: Limo, Lobo, Aranha, Esqueleto e Golem.

## Mudanças de código

- `public/creatures-v3.js`: carrega sprites somente em desktop, com quadro-fonte fixo de 192×160 px e seis estados × quatro quadros.
- `public/art16.js`: dá prioridade ao novo renderizador e usa SpriteStudio/bestiário clássico se qualquer PNG estiver ausente ou inválido.
- `public/mundo.html`: registra o módulo com `defer` antes de `art16.js`.
- `tests/creatures-v3-renderer.test.js`: testa prioridades técnicas, fallback, escala constante, espelhamento e chefes em mocks.

## BLOQUEADOR: atlas PNGs ainda NÃO foram enviados a esta branch

O pacote local aprovado nesta conversa contém cinco atlas PNG preliminares RGBA de 768×960 px, 24 quadros cada, e seus metadados. A conexão GitHub disponível nesta execução só aceitou arquivos de texto; não foi possível enviar as cinco imagens binárias pela mesma rota. **Não considerar este PR completo nem pronto para merge.**

Faltam, sob `public/assets/creatures-v3/`:
- `limo_v3.png`
- `lobo_v3.png`
- `aranha_v3.png`
- `esqueleto_v3.png`
- `golem_v3.png`

Os JSONs de metadados podem acompanhar os PNGs, mas o código consulta apenas os PNGs, sem depender dos JSONs. Os arquivos podem ser extraídos do ZIP `Os_Peregrinos_Integracao_V3_Offline_14_Testes.zip` entregue no chat; preserve os nomes e estrutura `public/assets/creatures-v3/`.

## Validação necessária antes de merge/deploy

1. Adicionar os cinco PNGs e testar dimensões 768×960 px, canal alfa e 24 recortes de 192×160.
2. Executar `npm test` no checkout completo. Testes anteriores do pacote local passaram (14/14), mas isso não verifica a versão remota com assets.
3. Abrir `/mundo.html` em desktop e validar repouso, caminhada, preparação, ataque, dano e morte.
4. Confirmar escala fixa, direção horizontal, barra de vida, hitbox intacta e ausência de regressões nos monstros de outros tipos.
5. Inspecionar bordas/halos das extrações e implementar vistas traseiras próprias em uma iteração futura.
6. Solicitar aprovação da integração funcional antes de qualquer merge ou deploy de produção no Render.

A ausência das imagens deve ativar o *fallback* para a arte antiga e não deve quebrar o jogo. **Não alterar `main`, o banco de dados ou o serviço Render de produção por este PR.**

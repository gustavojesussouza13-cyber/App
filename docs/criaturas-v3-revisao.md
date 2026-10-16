# Os Peregrinos — Criaturas V3 (PR #60: validação experimental)

**Situação: os cinco PNGs foram enviados à branch de revisão; ainda sem merge ou deploy no Render.**

## Objetivo

Integrar ao MMORPG cinco criaturas aprovadas visualmente: **Limo, Lobo, Aranha, Esqueleto e Golem**. Cada atlas tem exatamente 768 × 960 pixels (4 colunas × 6 linhas), quatro quadros de 192 × 160 para cada um de seis estados: repouso, caminhada, preparação, ataque, dano e morte.

## Arquivos incorporados (16/10/2026)

- `public/assets/creatures-v3/limo_v3.png`
- `public/assets/creatures-v3/lobo_v3.png`
- `public/assets/creatures-v3/aranha_v3.png`
- `public/assets/creatures-v3/esqueleto_v3.png`
- `public/assets/creatures-v3/golem_v3.png`

Os cinco blobs foram comparados com os hashes Git dos arquivos aprovados. A validação de SHA-256 e dimensões é coberta por `tests/creatures-v3-assets.test.js`.

O commit que incluiu os cinco PNGs foi `fa1a1811ceb5540252c46c843705b37ed2cefbac`.

## Integração de código

- `public/creatures-v3.js`: módulo de renderização somente desktop, sem alterar hitbox, persistência, física ou combate de servidor.
- `public/art16.js`: tenta V3 antes do SpriteStudio, bestiário e recortes originais; preserva os anteriores como fallback por espécie.
- `public/mundo.html`: carrega `creatures-v3.js` antes do motor.
- `tests/creatures-v3-renderer.test.js`: valida estados, espelhamento, tamanhos constantes de desenho e fallback.
- `tests/pc-atlas-priority-v4.test.js`: verifica precedência V3 > Atelier > bestiário sem enfraquecer a identidade de heróis e NPCs.
- `scripts/enviar-atlases-criaturas-v3.mjs`: script auxiliar com dry-run e validação SHA antes de envio (já não é necessário para os cinco arquivos incorporados).

## Checklist para conclusão

- [x] PR de revisão isolado da branch publicada.
- [x] Cinco atlas incorporados na branch experimental e blobs conferidos.
- [x] Código de integração e fallback aplicado.
- [x] Testes antigos de precedência atualizados para a nova prioridade.
- [ ] Confirmar GitHub Actions com todos os testes verdes após commit dos PNGs.
- [ ] Testar o MMORPG em navegador real, incluindo animações com eventos do servidor para ataque/dano/morte, chefes, direções, hitboxes e barras de HP.
- [ ] Revisar visualmente halos/artefatos de transparência em cenário com contraste.
- [ ] Confirmar com o usuário a aprovação **funcional** antes de merge/deploy.

**Não publicar no Render de produção antes de completar o checklist.** As pranchas V3 foram aprovadas visualmente, mas esse aval não substitui a inspeção da integração em execução.

# Qualidade e evolução — Os Peregrinos

Este documento representa um plano de engenharia, não uma promessa de funcionalidades já entregues. Produção usa Render (Node.js) e PostgreSQL externo; o site opera com limite de **10 jogadores simultâneos**. O histórico de versões antigas no README pode mencionar SQLite/local, mas **o banco de produção é PostgreSQL**.

## Concluído / em validação

- Login opcional, personagem visitante, persistência externa, recuperação de senha, guildas, equipe e comércio.
- Backup PostgreSQL de 11/10/2026 recuperado em instância de teste isolada e cinco personagens verificados.
- Combate autoritativo, quatro classes, dezesseis regiões, narrativa de dezesseis capítulos.
- Suavização de jogadores remotos, flechas e efeitos de impacto, medidor de ping em tempo real.
- Limite de velocidade com orçamento de deslocamento por tempo; não recompensa spam de pacotes.
- `/health` verifica que o processo HTTP responde; `/health/ready` testa a conexão PostgreSQL (HTTP 200 ou 503; não expõe dados sensíveis).
- Testes sintéticos de dez jogadores, sem interferir com as contas reais.

## Pendências por ordem de segurança

1. **Backups automáticos e restauração recorrente:** verificar opções de agendamento no plano PostgreSQL do Render, retenção, cópias protegidas e alarmes. Nunca expor a rede PostgreSQL pública para facilitar backups. A execução com infraestrutura/armazenamento adicional só deve ocorrer com autorização explícita de custo.
2. **Observabilidade:** monitorar `/health/ready`, erros de salvamento, memória, CPU, latência p95 e reinícios; alerta de indisponibilidade. Escolher destino de alertas e contato privado antes de habilitar notificações.
3. **Estabilidade multiplayer:** sessões reais de pelo menos uma hora entre 2 e 10 pessoas, reinícios, reconexões e rede ruim. O teste sintético não valida Wi-Fi, diferentes dispositivos ou a experiência visual.
4. **Colisões e mundo:** mapa de obstáculos autoritativo, portais na cena, pontos de interesse e eventos. Planejar como migrar sem prender personagens que foram salvos em posições antigas.
5. **Combate:** habilidades com tempos de preparação e contrajogo, chefes com mecânicas especiais, dano e cura equilibrados por faixa de nível; validar contra farm automático e exploits.
6. **Conteúdo e economia:** equipamentos e saques diversificados, mais missões além dos objetivos de contagem, lojas com progressão, conquistas significativas e atividades em grupo; testes de inflação e dupe.
7. **Comunidade e segurança:** moderação de chat, denúncias, ferramentas administrativas auditadas, políticas de privacidade e antifraude.
8. **Escala:** arquitetura multi-instância, coordenação de zonas, eventos compartilhados e filas antes de ampliar o limite de dez usuários.
9. **Audiovisual e acabamento:** sons, efeitos, animações, identidade gráfica e acessibilidade, sempre com opção de volume/mute.

### Mobile: congelado por solicitação do proprietário

Não modificar controles, layout ou desempenho específico do Android até uma autorização expressa. Melhorias comuns de servidor podem beneficiar todos os clientes sem redesenhar o mobile.

## Critérios de aceitação antes de chamar o MMORPG de estável

- Backup recente **restaurado** em ambiente isolado, com comparação de contagens e personagens reais.
- Conexão e persistência comprovadas em uma sessão longa com reconexão de múltiplos usuários.
- Todos os testes automatizados, incluindo sintaxe de scripts, passando.
- Nenhuma regressão de inventário, moedas, XP, missões e narrativa em um teste de progressão real.
- Alertas para falhas do banco, disponibilidade e crescimento de erros.
- Testes visuais de cada classe nos navegadores de desktop suportados, e mobile apenas depois de liberado.

## Segurança operacional

Publicar apenas branches de mudanças pequenas depois de testes, preservar backup original e evitar migrações destrutivas. Antes de qualquer expansão paga, levantar custo mensal e solicitar aprovação.

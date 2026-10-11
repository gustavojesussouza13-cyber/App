# Operação segura: persistência do MMORPG

Este roteiro se aplica ao serviço Render `os-peregrinos-online` e ao PostgreSQL `peregrinos-personagens-contas`. **Não contém senhas nem URLs privadas.**

## Antes de publicar

1. Verifique em Render que o banco PostgreSQL está disponível e o serviço usa a conexão **interna** `DATABASE_URL`. Não imprima o valor dessa variável em logs, Issues ou PRs.
2. Confirme um **backup externo restaurável** do PostgreSQL. Um banco pago **não é, por si só, uma estratégia de backup**. Caso faça exportação por `pg_dump`, execute-a a partir de um ambiente privado com permissão e guarde-a criptografada fora do Render, com acesso restrito.
3. Restaure uma cópia em **outro banco de testes**, nunca no banco de produção. Confirme que as tabelas `game_accounts`, `game_sessions`, `characters`, `guilds` e `meta` aparecem e que os totais de linhas batem (sem copiar informações pessoais para logs).
4. Execute `npm install --omit=dev && npm test` com Node.js 22 ou superior e confira o resultado do GitHub Actions.
5. Faça teste de um personagem descartável: crie uma conta, altere o progresso no jogo, saia, reinicie **somente o serviço de staging** e verifique a restauração dos mesmos dados. Repita com a transferência visitante → conta; se o salvamento falhar, a transferência deve ser negada.
6. Teste confirmação de e-mail e recuperação de senha com uma **conta de teste autorizada**, verificando entrega do Resend, expiração e uso único dos links. Nunca copie tokens de recuperação para tickets ou logs.
7. Realize uma janela controlada de publicação e monitore os logs por mensagens de gravação falha, conexões do Postgres e reinicializações. Nunca incremente o número de instâncias do Node sem arquitetura para sincronizar o mundo entre instâncias.

## Sinais de alerta

- `[contas] gravação temporariamente indisponível`: houve falha de escrita; na próxima tentativa periódica, o servidor deverá repetir o instantâneo pendente. Não trate o dado como salvo até confirmar retorno bem-sucedido.
- `[contas] flush final falhou`: o desligamento não conseguiu assegurar o progresso pendente. **Não reinicie repetidamente** sem investigar banco/instância e integridade dos dados.
- `storage_pending`: cadastro/transferência recusado porque o salvamento do visitante não foi confirmado.
- Banco externo inacessível: **não** retire a restrição de IPs públicos só para fazer manutenção. Utilize acesso privado autorizado.

## Limitações conhecidas

- O endpoint `/health` verifica o processo, mas não consulta o banco em tempo real. Não é prova de persistência.
- O progresso da campanha clássica permanece separado do MMORPG.
- Redistribuir ou escalar este serviço para múltiplas instâncias exige controle distribuído das sessões e estado do mundo.
- Esta branch apenas fortalece salvamento e testes; **não representa uma validação completa de backup, entrega de e-mail ou segurança de combate**.

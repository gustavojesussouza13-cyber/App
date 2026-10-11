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


## Teste automatizado de uma restauração (somente leitura)

O programa `scripts/verify-postgres-restore.js` compara a contagem de linhas **e o conteúdo** das tabelas `game_accounts`, `game_sessions`, `account_email_verifications`, `account_password_resets`, `characters`, `guilds` e `meta` entre a origem e um banco restaurado. Executa apenas `SELECT` em transações `READ ONLY`; não cria, altera ou exclui contas e não imprime dados de personagens nem tokens. Falha se o banco de destino não tiver nome começando com `peregrinos_restore_`.

1. No painel Render, gere ou baixe um export PostgreSQL em **Recovery / Backups**. **Confira que o arquivo existe, sua data, tamanho e integridade**. Exporte também uma cópia independente para armazenamento protegido fora do Render. Não exponha credenciais em GitHub Actions, Issues ou mensagens.
2. Crie um banco de testes novo, com nome `peregrinos_restore_teste1` ou outro nome com esse prefixo. Esse recurso pode custar dinheiro; não crie sem autorização de cobrança. Mantenha conexões externas restritas e não aponte a aplicação publicada para ele.
3. Em um ambiente privado que alcance os dois bancos com PostgreSQL 18 / Node.js 22+, gere o dump portátil com:
   ```sh
   pg_dump --format=custom --no-owner --no-acl --file=./peregrinos-backup.dump "$SOURCE_DATABASE_URL"
   ```
   Para um banco de testes **novo e vazio**, restaure apenas nele:
   ```sh
   pg_restore --format=custom --no-owner --no-acl --exit-on-error --dbname="$RESTORE_DATABASE_URL" ./peregrinos-backup.dump
   ```
   Para um export do Render em formato de diretório compactado (`.dir.tar.gz`), extraia num diretório protegido e use `pg_restore --format=directory` em vez de `--format=custom`. O destino deve ser novo e vazio.
4. Use variáveis de ambiente privadas distintas `SOURCE_DATABASE_URL` (produção) e `RESTORE_DATABASE_URL` (somente o banco de teste). **Não** coloque valores reais em arquivos versionados. Execute:
   ```sh
   node scripts/verify-postgres-restore.js
   ```
5. O resultado esperado são sete linhas `OK` e a mensagem `RESTAURAÇÃO VALIDADA`. Se aparecer `DIVERGENTE`, não declare backup validado; investigue falta de tabelas, dados alterados ou recuperação incompleta.
6. A comparação exige que os dados da origem permaneçam **estáveis** desde o dump até a conferência. Se houver jogadores ativos durante esse período, alterações legítimas podem aparecer como diferenças. Faça o teste em uma janela controlada de ausência de gravações e registre a data do dump. Para backups antigos, compare com um instantâneo correspondente à mesma data, não com a produção atual.
7. Um resultado positivo de conteúdo não prova ainda a experiência completa: em staging, teste **login com uma conta de teste**, reconexão e restauração do nível, moedas, inventário e capítulo; nunca teste com a senha real de outra pessoa.

**Bloqueio da verificação remota:** o conector Render hospedado não acessa a instância quando `ipAllowList=[]`. Não abra `0.0.0.0/0` para contornar; execute o processo por um ambiente privado autorizado dentro da mesma rede ou por acesso temporário estritamente limitado e administrado pelo proprietário.

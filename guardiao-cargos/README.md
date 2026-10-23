# Guardião de Cargos — Guilda da Luz

Bot de Discord para autoatribuição de cargos por meio de um questionário, inspirado na experiência de *Onboarding* de servidores da comunidade.

## O que faz

- Painel permanente com o botão **Responder questionário**.
- Formulário privado com três grupos: interesses, sistemas de RPG e avisos.
- Cria 15 cargos comuns, sem permissões administrativas.
- Adiciona e remove apenas os cargos configurados em `questions.json`.
- Preserva todos os outros cargos (moderador, administrador, equipe etc.).
- Permite atualizar respostas a qualquer momento via `/questionario`.
- Não lê mensagens nem exige intents privilegiadas.
- As respostas são representadas pelos próprios cargos; não há banco de dados de respostas.

## Comandos

| Comando | Quem usa | Efeito |
| --- | --- | --- |
| `/publicar_painel` | Gerente do servidor | Cria cargos faltantes e publica o painel no canal atual |
| `/questionario` | Qualquer membro | Abre seu formulário privado |
| `/diagnostico_cargos` | Gerente do servidor | Verifica permissões e hierarquia |

## Requisitos

- Python 3.11 ou superior.
- `discord.py` 2.6 ou superior.
- Bot instalado no servidor com **Gerenciar cargos**, **Ver canais**, **Enviar mensagens**, **Inserir links** e **Ver histórico de mensagens**.
- Cargo do bot posicionado acima dos 15 cargos do questionário.

## Configuração

1. Abra o [Discord Developer Portal](https://discord.com/developers/applications/1563293912301576272).
2. Na aba **Bot**, gere o token e coloque-o diretamente no armazenamento secreto do serviço de hospedagem. **Nunca envie o token por chat nem o salve no GitHub.**
3. Configure a variável de ambiente obrigatória `DISCORD_TOKEN`.
4. Opcionalmente configure `DISCORD_GUILD_ID` com o ID do servidor Guilda da Luz para sincronização imediata dos comandos. Sem essa variável, o bot sincroniza comandos globalmente, o que pode demorar para aparecer.
5. Instale as dependências e execute:

```bash
pip install -r requirements.txt
python bot.py
```

6. No canal de boas-vindas do Discord, execute `/publicar_painel`.

## Hospedagem no Render

Este bot mantém uma conexão Gateway com o Discord. Para operar continuamente no Render, use um **Background Worker** (não um site estático ou um serviço web gratuito que pode hibernar).

Ao criar o serviço:

| Campo | Valor |
| --- | --- |
| Repositório | `gustavojesussouza13-cyber/App` |
| Branch | `discord-guardiao-cargos` |
| Root directory | `guardiao-cargos` |
| Runtime | Python |
| Build command | `pip install -r requirements.txt` |
| Start command | `python bot.py` |
| Secret environment variable | `DISCORD_TOKEN` |

Background Workers têm custo de computação. Não crie um plano pago sem confirmar o preço e autorização do titular.

## Personalização

Edite `questions.json` para alterar as opções. Cada opção contém:

- `role`: nome exato do cargo no Discord;
- `label`: texto do menu;
- `emoji`: emoji exibido;
- `description`: explicação breve.

O Discord permite até 25 opções por menu; este painel foi projetado para até quatro grupos.

**Importante:** renomear um cargo no arquivo faz o bot tratá-lo como um novo cargo. Confira cargos antigos antes de remover ou renomear opções.

## Segurança

O bot rejeita cargos gerenciados por integrações, cargos com permissões e cargos acima da posição do bot. Também não modifica cargos fora da lista configurada.

O arquivo `.env.example` é apenas documentação. Nunca faça commit de um `.env` real.

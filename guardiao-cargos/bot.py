"""Guardião de Cargos — questionário de autoatribuição para a Guilda da Luz.

Somente cargos listados em questions.json podem ser atribuídos ou removidos.
Não exige intents privilegiadas nem lê o conteúdo das mensagens.
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path

import discord
from discord import app_commands
from discord.ext import commands

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("guardiao")

CONFIG_PATH = Path(__file__).with_name("questions.json")
QUESTIONS = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))["questions"]
ROLE_NAMES = {
    option["role"]
    for question in QUESTIONS
    for option in question["options"]
}
if len(ROLE_NAMES) != sum(len(q["options"]) for q in QUESTIONS):
    raise RuntimeError("Há nomes de cargos duplicados em questions.json.")
if len(QUESTIONS) > 4:
    raise RuntimeError("O formulário suporta até quatro perguntas por mensagem.")
if any(len(q["options"]) > 25 for q in QUESTIONS):
    raise RuntimeError("Cada pergunta pode ter no máximo 25 opções.")


def safe_role(guild: discord.Guild, name: str, bot_member: discord.Member) -> discord.Role | None:
    """Aceita somente cargos sem privilégios, não gerenciados e abaixo do bot."""
    role = discord.utils.get(guild.roles, name=name)
    if role is None or role.managed or role.is_default():
        return None
    if role.permissions.value != 0:
        return None
    if role >= bot_member.top_role:
        return None
    return role


async def get_bot_member(guild: discord.Guild, bot: commands.Bot) -> discord.Member:
    member = guild.me
    if member is None:
        member = await guild.fetch_member(bot.user.id)
    return member


class QuestionSelect(discord.ui.Select):
    def __init__(self, question: dict, current_names: set[str], row: int):
        self.question_id = question["id"]
        options = [
            discord.SelectOption(
                label=option["label"],
                value=option["role"],
                description=option.get("description"),
                emoji=option.get("emoji"),
                default=option["role"] in current_names,
            )
            for option in question["options"]
        ]
        super().__init__(
            placeholder=question["title"][:150],
            min_values=0,
            max_values=len(options),
            options=options,
            row=row,
        )

    async def callback(self, interaction: discord.Interaction) -> None:
        form = self.view
        if not isinstance(form, QuestionnaireView):
            await interaction.response.send_message(
                "O formulário expirou. Use /questionario novamente.", ephemeral=True
            )
            return
        form.answers[self.question_id] = set(self.values)
        await interaction.response.defer()


class SaveButton(discord.ui.Button):
    def __init__(self, row: int):
        super().__init__(
            label="Salvar minhas escolhas",
            style=discord.ButtonStyle.success,
            emoji="✅",
            row=row,
        )

    async def callback(self, interaction: discord.Interaction) -> None:
        form = self.view
        if not isinstance(form, QuestionnaireView):
            await interaction.response.send_message("Abra o formulário novamente.", ephemeral=True)
            return
        if interaction.guild is None or not isinstance(interaction.user, discord.Member):
            await interaction.response.send_message(
                "Este questionário só funciona dentro do servidor.", ephemeral=True
            )
            return
        if interaction.user.id != form.member_id:
            await interaction.response.send_message(
                "Abra seu próprio formulário com /questionario.", ephemeral=True
            )
            return

        await interaction.response.defer(ephemeral=True)
        guild = interaction.guild
        member = interaction.user
        try:
            bot_member = await get_bot_member(guild, interaction.client)
        except discord.DiscordException:
            await interaction.followup.send(
                "Não consegui verificar a posição do cargo do bot.", ephemeral=True
            )
            return

        if not bot_member.guild_permissions.manage_roles:
            await interaction.followup.send(
                "O bot precisa da permissão Gerenciar cargos.", ephemeral=True
            )
            return

        configured_roles = {
            name: role
            for name in ROLE_NAMES
            if (role := safe_role(guild, name, bot_member)) is not None
        }
        if len(configured_roles) != len(ROLE_NAMES):
            await interaction.followup.send(
                "Alguns cargos ainda não existem ou estão acima do bot. "
                "Peça à administração para usar /publicar_painel e verificar "
                "a hierarquia de cargos.",
                ephemeral=True,
            )
            return

        wanted_names = set().union(*form.answers.values())
        current_ids = {role.id for role in member.roles}
        to_add = [
            role for name, role in configured_roles.items()
            if name in wanted_names and role.id not in current_ids
        ]
        to_remove = [
            role for name, role in configured_roles.items()
            if name not in wanted_names and role.id in current_ids
        ]

        try:
            if to_add:
                await member.add_roles(*to_add, reason="Questionário Guardião de Cargos")
            if to_remove:
                await member.remove_roles(*to_remove, reason="Questionário Guardião de Cargos")
        except discord.Forbidden:
            await interaction.followup.send(
                "O Discord recusou a alteração. Verifique se o cargo do bot "
                "está acima dos cargos do questionário.",
                ephemeral=True,
            )
            return
        except discord.HTTPException:
            log.exception("Erro ao atualizar cargos no servidor %s", guild.id)
            await interaction.followup.send(
                "Houve um erro temporário ao atualizar seus cargos. Tente novamente.",
                ephemeral=True,
            )
            return

        for item in form.children:
            item.disabled = True
        try:
            await interaction.edit_original_response(
                content="✅ Suas escolhas foram salvas. Você pode responder novamente quando quiser.",
                view=form,
            )
        except discord.HTTPException:
            pass
        await interaction.followup.send(
            f"✅ Cargos atualizados! Adicionados: {len(to_add)}. "
            f"Removidos: {len(to_remove)}. "
            "Seus demais cargos foram preservados.",
            ephemeral=True,
        )


class QuestionnaireView(discord.ui.View):
    def __init__(self, member: discord.Member):
        super().__init__(timeout=600)
        self.member_id = member.id
        current_names = {role.name for role in member.roles}
        self.answers: dict[str, set[str]] = {}
        for index, question in enumerate(QUESTIONS):
            choices = {option["role"] for option in question["options"]}
            self.answers[question["id"]] = current_names & choices
            self.add_item(QuestionSelect(question, current_names, index))
        self.add_item(SaveButton(len(QUESTIONS)))

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.member_id:
            await interaction.response.send_message(
                "Este formulário pertence a outro membro. Use /questionario.",
                ephemeral=True,
            )
            return False
        return True


class WelcomeView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(
        label="Responder questionário",
        emoji="📋",
        style=discord.ButtonStyle.primary,
        custom_id="guardiao_cargos:abrir_questionario:v1",
    )
    async def open_form(
        self, interaction: discord.Interaction, button: discord.ui.Button
    ) -> None:
        if interaction.guild is None or not isinstance(interaction.user, discord.Member):
            await interaction.response.send_message(
                "Use este botão dentro da Guilda da Luz.", ephemeral=True
            )
            return
        await interaction.response.send_message(
            "Escolha seus interesses, sistemas de RPG e avisos. "
            "Você pode marcar várias opções ou deixar perguntas em branco. "
            "Clique em **Salvar minhas escolhas** ao final.",
            view=QuestionnaireView(interaction.user),
            ephemeral=True,
        )


class GuardiaoBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = False
        intents.members = False
        intents.presences = False
        super().__init__(
            command_prefix=commands.when_mentioned,
            intents=intents,
            help_command=None,
        )

    async def setup_hook(self) -> None:
        self.add_view(WelcomeView())
        guild_id = os.getenv("DISCORD_GUILD_ID", "").strip()
        if guild_id:
            guild_obj = discord.Object(id=int(guild_id))
            self.tree.copy_global_to(guild=guild_obj)
            await self.tree.sync(guild=guild_obj)
            log.info("Comandos sincronizados no servidor %s", guild_id)
        else:
            await self.tree.sync()
            log.info("Comandos globais sincronizados")


bot = GuardiaoBot()


@bot.event
async def on_ready() -> None:
    log.info("Bot conectado como %s", bot.user)


@bot.tree.command(name="questionario", description="Escolha ou atualize seus cargos da Guilda da Luz.")
@app_commands.guild_only()
async def questionario(interaction: discord.Interaction) -> None:
    if interaction.guild is None or not isinstance(interaction.user, discord.Member):
        await interaction.response.send_message(
            "Este comando só funciona em um servidor.", ephemeral=True
        )
        return
    await interaction.response.send_message(
        "Selecione os cargos que combinam com você e clique em **Salvar minhas escolhas**.",
        view=QuestionnaireView(interaction.user),
        ephemeral=True,
    )


@bot.tree.command(
    name="publicar_painel",
    description="Cria os cargos do questionário e publica o painel neste canal.",
)
@app_commands.guild_only()
@app_commands.default_permissions(manage_guild=True)
async def publicar_painel(interaction: discord.Interaction) -> None:
    guild = interaction.guild
    member = interaction.user
    if guild is None or not isinstance(member, discord.Member):
        await interaction.response.send_message("Use este comando no servidor.", ephemeral=True)
        return
    if not member.guild_permissions.manage_guild:
        await interaction.response.send_message(
            "Somente quem gerencia o servidor pode publicar o painel.", ephemeral=True
        )
        return

    await interaction.response.defer(ephemeral=True)
    try:
        bot_member = await get_bot_member(guild, bot)
    except discord.DiscordException:
        await interaction.followup.send(
            "Não consegui verificar as permissões do bot.", ephemeral=True
        )
        return
    if not bot_member.guild_permissions.manage_roles:
        await interaction.followup.send(
            "Ative a permissão Gerenciar cargos para o Guardião de Cargos.", ephemeral=True
        )
        return

    created = 0
    blocked: list[str] = []
    for name in sorted(ROLE_NAMES):
        existing = discord.utils.get(guild.roles, name=name)
        if existing is None:
            try:
                await guild.create_role(
                    name=name,
                    permissions=discord.Permissions.none(),
                    hoist=False,
                    mentionable=False,
                    reason="Configuração do questionário Guardião de Cargos",
                )
                created += 1
            except discord.HTTPException:
                blocked.append(name)
        elif safe_role(guild, name, bot_member) is None:
            blocked.append(name)

    if blocked:
        await interaction.followup.send(
            "Não publiquei o painel porque estes cargos não são seguros ou "
            "não estão abaixo do bot: " + ", ".join(blocked) + ". "
            "Ajuste-os antes de repetir o comando.",
            ephemeral=True,
        )
        return

    embed = discord.Embed(
        title="✨ Bem-vindo à Guilda da Luz!",
        description=(
            "Responda a um questionário rápido para escolher seus cargos e "
            "encontrar pessoas com os mesmos interesses.\n\n"
            "🎲 **Interesses e atividades**\n"
            "🐉 **Sistemas de RPG de mesa**\n"
            "🔔 **Avisos que deseja receber**\n\n"
            "Suas respostas são privadas. Você poderá atualizá-las quando quiser."
        ),
        color=discord.Colour.from_rgb(249, 194, 72),
    )
    embed.set_footer(text="Guardião de Cargos • Guilda da Luz")

    try:
        await interaction.channel.send(embed=embed, view=WelcomeView())
    except (discord.Forbidden, discord.HTTPException):
        await interaction.followup.send(
            f"Criei {created} cargos, mas não consegui enviar o painel neste canal. "
            "Verifique a permissão Enviar mensagens.",
            ephemeral=True,
        )
        return

    await interaction.followup.send(
        f"✅ Painel publicado neste canal. {created} cargos novos criados; "
        f"{len(ROLE_NAMES) - created} já existiam.",
        ephemeral=True,
    )


@bot.tree.command(
    name="diagnostico_cargos",
    description="Verifica se o bot consegue administrar os cargos do questionário.",
)
@app_commands.guild_only()
@app_commands.default_permissions(manage_guild=True)
async def diagnostico_cargos(interaction: discord.Interaction) -> None:
    guild = interaction.guild
    member = interaction.user
    if guild is None or not isinstance(member, discord.Member):
        await interaction.response.send_message("Use no servidor.", ephemeral=True)
        return
    if not member.guild_permissions.manage_guild:
        await interaction.response.send_message("Apenas administradores.", ephemeral=True)
        return

    bot_member = await get_bot_member(guild, bot)
    missing = [
        name for name in sorted(ROLE_NAMES)
        if discord.utils.get(guild.roles, name=name) is None
    ]
    unsafe = [
        name for name in sorted(ROLE_NAMES)
        if discord.utils.get(guild.roles, name=name) is not None
        and safe_role(guild, name, bot_member) is None
    ]
    await interaction.response.send_message(
        f"**Gerenciar cargos:** {'✅' if bot_member.guild_permissions.manage_roles else '❌'}\n"
        f"**Cargos configurados:** {len(ROLE_NAMES)}\n"
        f"**Ausentes:** {', '.join(missing) if missing else 'nenhum'}\n"
        f"**Bloqueados/hierarquia:** {', '.join(unsafe) if unsafe else 'nenhum'}",
        ephemeral=True,
    )


if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN", "").strip()
    if not token:
        raise RuntimeError("Defina DISCORD_TOKEN nas variáveis de ambiente do serviço.")
    bot.run(token)

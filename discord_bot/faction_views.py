import discord
from discord import app_commands
from discord.ui import Button, View, Select, Modal, TextInput
import aiohttp
import json
import logging
import os
import re
from datetime import datetime

logger = logging.getLogger("discord_bot.faction_views")

API_URL = os.environ.get("API_URL", "http://api:8000")
BOT_SECRET = os.environ.get("DISCORD_BOT_SECRET", "default_secret")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

async def get_redis():
    import redis.asyncio as aioredis
    return aioredis.from_url(REDIS_URL, decode_responses=True)

# --- Helper functions for API ---

async def api_request(method: str, path: str, data: dict = None) -> dict:
    url = f"{API_URL}{path}"
    headers = {
        "X-Bot-Secret": BOT_SECRET,
        "Content-Type": "application/json"
    }
    async with aiohttp.ClientSession() as session:
        try:
            if method.lower() == "post":
                async with session.post(url, json=data, headers=headers) as resp:
                    if resp.status in [200, 201]:
                        return await resp.json()
                    else:
                        text = await resp.text()
                        logger.error(f"API Error {path}: {resp.status} - {text}")
                        return {"error": text, "status": resp.status}
            else:
                async with session.get(url, headers=headers) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    else:
                        text = await resp.text()
                        logger.error(f"API Error {path}: {resp.status} - {text}")
                        return {"error": text, "status": resp.status}
        except Exception as e:
            logger.error(f"API Connection Exception {path}: {e}")
            return {"error": str(e)}

# --- Discord Interactions ---

class RegistrationModal(Modal):
    def __init__(self):
        super().__init__(title="Регистрация во фракции RMRP", timeout=300)
        self.name_input = TextInput(
            label="Имя Фамилия (на русском)",
            placeholder="Арсений Бобиков",
            required=True,
            max_length=100
        )
        self.static_id_input = TextInput(
            label="Статик ID (6 цифр)",
            placeholder="222-222",
            required=True,
            max_length=7
        )
        self.rank_input = TextInput(
            label="Звание во фракции",
            placeholder="Рядовой",
            required=True,
            default="Рядовой",
            max_length=50
        )
        self.add_item(self.name_input)
        self.add_item(self.static_id_input)
        self.add_item(self.rank_input)

    async def on_submit(self, interaction: discord.Interaction):
        name = self.name_input.value.strip()
        raw_static = self.static_id_input.value.strip()
        rank = self.rank_input.value.strip()
        
        clean_id = raw_static.replace("-", "").replace(" ", "")
        if not re.fullmatch(r"\d{6}", clean_id):
            await interaction.response.send_message("❌ Неверный формат статик ID (должно быть 6 цифр).", ephemeral=True)
            return

        payload = {
            "discord_id": str(interaction.user.id),
            "static_id": clean_id,
            "name": name,
            "rank": rank,
            "category": "cadet"
        }
        res = await api_request("POST", "/api/faction/register", payload)
        if "error" in res:
            await interaction.response.send_message(f"❌ Ошибка регистрации: {res.get('error')}", ephemeral=True)
        else:
            formatted_id = f"{clean_id[:3]}-{clean_id[3:]}"
            new_nick = f"[{rank}] {name} | {formatted_id}"
            try:
                await interaction.user.edit(nick=new_nick[:32], reason="Авто-регистрация в боте")
            except Exception:
                pass
            await interaction.response.send_message(f"✅ Вы успешно зарегистрированы как **{name}** ({formatted_id})!", ephemeral=True)


# --- 1. Заявка на вступление ---

class FactionApplicationModal(Modal):
    def __init__(self, category: str):
        self.category = category
        title_map = {
            "cadet": "Заявка — Курсант АВНГ",
            "transfer": "Заявка — Перевод/Восстановление",
            "gov": "Заявка — Гос.Сотрудник"
        }
        super().__init__(title=title_map.get(category, "Заявка на вступление"), timeout=300)
        self.name_input = TextInput(label="Имя Фамилия", placeholder="Иван Иванов", required=True)
        self.static_id_input = TextInput(label="Статик ID (6 цифр)", placeholder="123-456", required=True, max_length=7)
        self.reason_input = TextInput(label="Причина / Откуда перевод", placeholder="Электронное заявление / Из МЧС", required=True)
        self.rank_input = TextInput(label="Желаемое звание / Текущее звание", placeholder="Рядовой", default="Рядовой", required=True)

        self.add_item(self.name_input)
        self.add_item(self.static_id_input)
        self.add_item(self.reason_input)
        self.add_item(self.rank_input)

    async def on_submit(self, interaction: discord.Interaction):
        name = self.name_input.value.strip()
        raw_static = self.static_id_input.value.strip()
        reason = self.reason_input.value.strip()
        rank = self.rank_input.value.strip()

        clean_id = raw_static.replace("-", "").replace(" ", "")
        if not re.fullmatch(r"\d{6}", clean_id):
            await interaction.response.send_message("❌ Неверный формат статик ID (должно быть 6 цифр).", ephemeral=True)
            return

        formatted_id = f"{clean_id[:3]}-{clean_id[3:]}"
        
        # Save to redis temporary
        app_data = {
            "discord_user_id": str(interaction.user.id),
            "discord_username": interaction.user.name,
            "category": self.category,
            "name": name,
            "static_id": clean_id,
            "formatted_id": formatted_id,
            "reason": reason,
            "rank": rank,
            "status": "pending"
        }
        
        r = await get_redis()
        await r.set(f"application:{interaction.user.id}", json.dumps(app_data), ex=86400 * 7)
        await r.close()

        await interaction.response.send_message("✅ Ваша заявка успешно отправлена на рассмотрение руководству!", ephemeral=True)

        # Notify review channel
        channel_id = os.environ.get("DISCORD_APPLICATIONS_CHANNEL_ID")
        if not channel_id:
            return

        channel = interaction.client.get_channel(int(channel_id))
        if not channel:
            return

        embed = discord.Embed(
            title="📋 НОВАЯ ЗАЯВКА НА ВСТУПЛЕНИЕ",
            description=f"Пользователь {interaction.user.mention} подал заявку.",
            color=0x3498db
        )
        embed.add_field(name="👤 Имя Фамилия", value=name, inline=True)
        embed.add_field(name="🆔 Статик ID", value=formatted_id, inline=True)
        embed.add_field(name="📂 Категория", value=self.category.upper(), inline=True)
        embed.add_field(name="⭐ Звание", value=rank, inline=True)
        embed.add_field(name="📝 Причина / Доп. инфо", value=reason, inline=False)
        embed.set_footer(text='RMRP Faction Management')
        embed.timestamp = discord.utils.utcnow()

        view = FactionApplicationReviewView(interaction.user.id, app_data)
        await channel.send(embed=embed, view=view)


class FactionApplicationReviewView(View):
    def __init__(self, applicant_id: int, app_data: dict):
        super().__init__(timeout=None)
        self.applicant_id = applicant_id
        self.app_data = app_data
        uid = str(applicant_id)
        
        accept_btn = Button(label="✅ Принять", style=discord.ButtonStyle.green, custom_id=f"rmrp_app:accept:{uid}")
        accept_btn.callback = self.accept
        self.add_item(accept_btn)

        reject_btn = Button(label="❌ Отклонить", style=discord.ButtonStyle.red, custom_id=f"rmrp_app:reject:{uid}")
        reject_btn.callback = self.reject
        self.add_item(reject_btn)

    async def check_admin(self, interaction: discord.Interaction) -> bool:
        if interaction.user.guild_permissions.administrator:
            return True
        for role in interaction.user.roles:
            if role.name.lower() in ["инструктор", "руководство", "офицер", "chief", "head"]:
                return True
        await interaction.response.send_message("❌ У вас нет прав для рассмотрения заявок.", ephemeral=True)
        return False

    async def accept(self, interaction: discord.Interaction):
        if not await self.check_admin(interaction):
            return
        await interaction.response.defer(ephemeral=True)
        
        # Load app data
        r = await get_redis()
        data_str = await r.get(f"application:{self.applicant_id}")
        app = json.loads(data_str) if data_str else self.app_data
        await r.delete(f"application:{self.applicant_id}")
        await r.close()

        guild = interaction.guild
        member = guild.get_member(int(app["discord_user_id"]))
        if not member:
            await interaction.followup.send("❌ Участник покинул Discord-сервер.", ephemeral=True)
            return

        # Create in DB
        payload = {
            "discord_id": str(member.id),
            "static_id": app["static_id"],
            "name": app["name"],
            "rank": app["rank"],
            "category": app["category"]
        }
        db_res = await api_request("POST", "/api/faction/register", payload)
        
        # Add roles & change nickname
        roles_to_add = []
        verified_role_id = os.environ.get("DISCORD_VERIFIED_ROLE_ID")
        cadet_role_id = os.environ.get("DISCORD_CADET_ROLE_ID")
        
        if verified_role_id:
            role = guild.get_role(int(verified_role_id))
            if role: roles_to_add.append(role)
        if cadet_role_id:
            role = guild.get_role(int(cadet_role_id))
            if role: roles_to_add.append(role)

        if roles_to_add:
            try:
                await member.add_roles(*roles_to_add)
            except Exception as e:
                logger.error(f"Failed to add roles: {e}")

        # Set nickname
        new_nick = f"[{app['rank']}] {app['name']} | {app['formatted_id']}"
        try:
            await member.edit(nick=new_nick[:32])
        except Exception as e:
            logger.error(f"Failed to set nickname: {e}")

        # Notify applicant
        try:
            embed_welcome = discord.Embed(
                title="🎉 Добро пожаловать во фракцию!",
                description=(
                    "Ваша заявка одобрена.\n\n"
                    "🌐 Сайт:\n"
                    "**avn-academy.ru**\n"
                    "**avn-academy-training-netlify-app.ru**"
                ),
                color=0x2ecc71
            )
            embed_welcome.set_footer(text='RMRP Faction Management')
            embed_welcome.timestamp = discord.utils.utcnow()
            await member.send(embed=embed_welcome)
        except Exception:
            pass

        # Update review message
        embed = interaction.message.embeds[0]
        embed.color = 0x2ecc71
        embed.title = "✅ ЗАЯВКА ОДОБРЕНА"
        embed.add_field(name="Решение принял", value=interaction.user.mention, inline=False)
        embed.set_footer(text='RMRP Faction Management')
        embed.timestamp = discord.utils.utcnow()
        
        for item in self.children:
            item.disabled = True
        await interaction.message.edit(embed=embed, view=self)
        await interaction.followup.send("✅ Заявка успешно принята!", ephemeral=True)

    async def reject(self, interaction: discord.Interaction):
        if not await self.check_admin(interaction):
            return
        await interaction.response.defer(ephemeral=True)
        
        r = await get_redis()
        data_str = await r.get(f"application:{self.applicant_id}")
        app = json.loads(data_str) if data_str else self.app_data
        await r.delete(f"application:{self.applicant_id}")
        await r.close()

        guild = interaction.guild
        member = guild.get_member(int(app["discord_user_id"]))
        if member:
            try:
                await member.send("❌ Ваша заявка на вступление была отклонена руководством.")
            except Exception:
                pass

        embed = interaction.message.embeds[0]
        embed.color = 0xe74c3c
        embed.title = "❌ ЗАЯВКА ОТКЛОНЕНА"
        embed.add_field(name="Решение принял", value=interaction.user.mention, inline=False)
        embed.set_footer(text='RMRP Faction Management')
        embed.timestamp = discord.utils.utcnow()

        for item in self.children:
            item.disabled = True
        await interaction.message.edit(embed=embed, view=self)
        await interaction.followup.send("❌ Заявка отклонена.", ephemeral=True)


class FactionApplicationStartView(View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="📝 Подать заявку на вступление", style=discord.ButtonStyle.green, custom_id="rmrp:start_app")
    async def start_app(self, interaction: discord.Interaction, button: Button):
        select_view = View()
        select_menu = Select(
            placeholder="Выберите категорию...",
            options=[
                discord.SelectOption(label="Курсант АВНГ", value="cadet", emoji="🎓"),
                discord.SelectOption(label="Перевод / Восстановление", value="transfer", emoji="🔄"),
                discord.SelectOption(label="Гос.Сотрудник", value="gov", emoji="🏛️")
            ]
        )

        async def select_callback(inter: discord.Interaction):
            category = select_menu.values[0]
            modal = FactionApplicationModal(category)
            await inter.response.send_modal(modal)

        select_menu.callback = select_callback
        select_view.add_item(select_menu)

        await interaction.response.send_message("Выберите вашу категорию для заполнения заявки:", view=select_view, ephemeral=True)


# --- 2. Заявление на увольнение ---

class DismissalRoleSelectView(View):
    """Select menu to choose which leadership role to notify."""

    LEADERSHIP_ROLES = {
        "1517487209173876796": "Начальник АВНГ",
        "1517493040346828860": "Заместитель начальника АВНГ",
        "1520562814174101555": "Командир ОМОН",
        "1520562838328967219": "Заместитель командира ОМОН",
        "1520562077700198570": "Командир СОБР",
        "1520562731743313920": "Заместитель командира СОБР",
        "1520562020959912176": "Старший состав УФСВНГ",
        "1520561845738410034": "Начальник УВО",
        "1520561985253675139": "Заместитель начальника УВО",
    }

    def __init__(self):
        super().__init__(timeout=120)

    @discord.ui.select(
        cls=Select,
        placeholder="Выберите руководителей для уведомления (можно несколько)...",
        min_values=1,
        max_values=9,
        options=[
            discord.SelectOption(label=name, value=rid)
            for rid, name in {
                "1517487209173876796": "Начальник АВНГ",
                "1517493040346828860": "Заместитель начальника АВНГ",
                "1520562814174101555": "Командир ОМОН",
                "1520562838328967219": "Заместитель командира ОМОН",
                "1520562077700198570": "Командир СОБР",
                "1520562731743313920": "Заместитель командира СОБР",
                "1520562020959912176": "Старший состав УФСВНГ",
                "1520561845738410034": "Начальник УВО",
                "1520561985253675139": "Заместитель начальника УВО",
            }.items()
        ]
    )
    async def role_selected(self, interaction: discord.Interaction, select: Select):
        selected_role_ids = select.values
        modal = FactionDismissalModal(selected_role_ids)
        await interaction.response.send_modal(modal)


class FactionDismissalModal(Modal):
    def __init__(self, leadership_role_ids: list[str]):
        super().__init__(title="Заявление на увольнение", timeout=300)
        self.leadership_role_ids = leadership_role_ids

        self.name_input = TextInput(
            label="Имя Фамилия",
            placeholder="Иванов Иван",
            required=True,
            max_length=100,
        )
        self.static_id_input = TextInput(
            label="Статик ID (6 цифр, например 123-456)",
            placeholder="123-456",
            required=True,
            max_length=7,
        )
        self.rank_input = TextInput(
            label="Звание",
            placeholder="Рядовой",
            required=True,
            max_length=50,
        )
        self.reason_input = TextInput(
            label="Причина увольнения",
            placeholder="СЖ / Перевод / Личные обстоятельства",
            required=True,
            max_length=200,
        )
        self.photo_input = TextInput(
            label="Фото удостоверения (ссылка)",
            placeholder="https://...",
            required=True,
            max_length=300,
        )

        self.add_item(self.name_input)
        self.add_item(self.static_id_input)
        self.add_item(self.rank_input)
        self.add_item(self.reason_input)
        self.add_item(self.photo_input)

    async def on_submit(self, interaction: discord.Interaction):
        name = self.name_input.value.strip()
        raw_static_id = self.static_id_input.value.strip()
        rank = self.rank_input.value.strip()
        reason = self.reason_input.value.strip()
        photo = self.photo_input.value.strip()

        clean_id = raw_static_id.replace("-", "").replace(" ", "")
        if not re.fullmatch(r"\d{6}", clean_id):
            await interaction.response.send_message(
                "❌ **Ошибка:** Статик ID должен содержать 6 цифр.",
                ephemeral=True
            )
            return

        formatted_id = f"{clean_id[:3]}-{clean_id[3:]}"

        # Submit to API
        payload = {
            "discord_id": str(interaction.user.id),
            "reason": reason,
            "comment": f"{name} | {formatted_id} | {rank}",
            "photo_url": photo
        }
        res = await api_request("POST", "/api/faction/dismiss", payload)
        if "error" in res:
            await interaction.response.send_message(f"❌ Ошибка отправки заявления: {res['error']}", ephemeral=True)
            return

        report_id = res["report_id"]
        await interaction.response.send_message("✅ Ваше заявление на увольнение успешно отправлено руководству на рассмотрение.", ephemeral=True)

        # Notify management
        channel_id = os.environ.get("DISCORD_DISMISSAL_CHANNEL_ID")
        if not channel_id:
            return

        channel = interaction.client.get_channel(int(channel_id))
        if not channel:
            return

        # Mention the selected leadership roles
        role_mentions = " ".join([f"<@&{rid}>" for rid in self.leadership_role_ids])

        embed = discord.Embed(
            title="🚨 ЗАЯВЛЕНИЕ НА УВОЛЬНЕНИЕ",
            description=f"Сотрудник {interaction.user.mention} подал рапорт на увольнение.",
            color=0xf39c12
        )
        embed.add_field(name="👤 Имя Фамилия", value=name, inline=True)
        embed.add_field(name="🆔 Статик ID", value=formatted_id, inline=True)
        embed.add_field(name="⭐ Звание", value=rank, inline=True)
        embed.add_field(name="📝 Причина", value=reason, inline=False)
        embed.add_field(name="📸 Фото удостоверения", value=photo, inline=False)
        embed.add_field(name="👮 Руководители", value=role_mentions, inline=True)
        embed.set_image(url=photo)
        embed.set_footer(text='Росгвардия RMRP Арбат')
        embed.timestamp = discord.utils.utcnow()

        view = DismissalReviewView(report_id, interaction.user.id)
        await channel.send(content=role_mentions, embed=embed, view=view)


class DismissalReviewView(View):
    def __init__(self, report_id: int, applicant_id: int):
        super().__init__(timeout=None)
        self.report_id = report_id
        self.applicant_id = applicant_id
        rid = str(report_id)

        approve_btn = Button(label="✅ Уволить", style=discord.ButtonStyle.red, custom_id=f"dismiss:approve:{rid}")
        approve_btn.callback = self.approve
        self.add_item(approve_btn)

        reject_btn = Button(label="❌ Отказать", style=discord.ButtonStyle.grey, custom_id=f"dismiss:reject:{rid}")
        reject_btn.callback = self.reject
        self.add_item(reject_btn)

    async def check_admin(self, interaction: discord.Interaction) -> bool:
        if interaction.user.guild_permissions.administrator:
            return True
        for role in interaction.user.roles:
            if role.name.lower() in ["руководство", "chief", "head", "подполковник", "полковник"]:
                return True
        await interaction.response.send_message("❌ У вас нет прав для проведения увольнений.", ephemeral=True)
        return False

    async def approve(self, interaction: discord.Interaction):
        if not await self.check_admin(interaction):
            return

        # Fix 5: Confirmation before destructive action
        confirm_view = ConfirmDismissalView(self)
        await interaction.response.send_message(
            "⚠️ **Вы уверены?** Это действие удалит все роли сотрудника и переведет его в архив.",
            view=confirm_view,
            ephemeral=True
        )

    async def execute_dismiss(self, interaction: discord.Interaction):
        """Actually execute the dismissal after confirmation."""
        payload = {
            "report_id": self.report_id,
            "action": "approve",
            "operator_discord_id": str(interaction.user.id)
        }
        res = await api_request("POST", "/api/faction/dismiss/review", payload)

        # Remove roles and change nickname in Discord
        guild = interaction.guild
        member = guild.get_member(self.applicant_id)
        if member:
            # Strip roles
            roles_to_remove = []
            role_names_to_strip = ["курсант", "инструктор", "авнг", "омон", "собр", "уво", "усб", "verified"]
            for role in member.roles:
                if any(x in role.name.lower() for x in role_names_to_strip):
                    roles_to_remove.append(role)
            
            if roles_to_remove:
                try:
                    await member.remove_roles(*roles_to_remove)
                except Exception as e:
                    logger.error(f"Failed to remove roles: {e}")

            # Edit nick
            try:
                clean_nick = member.display_name
                # Remove rank prefix e.g. [Рядовой] or Курсант |
                clean_nick = re.sub(r"^\[[^\]]+\]\s*", "", clean_nick)
                clean_nick = re.sub(r"^Курсант\s*\|\s*", "", clean_nick)
                await member.edit(nick=f"Уволен | {clean_nick}"[:32])
            except Exception as e:
                logger.error(f"Failed to set nickname: {e}")

            try:
                await member.send("❌ Вы были уволены из фракции по вашему рапорту.")
            except Exception:
                pass

        embed = interaction.message.embeds[0]
        embed.color = 0xe74c3c
        embed.title = "✅ СОТРУДНИК УВОЛЕН"
        embed.add_field(name="Уволил", value=interaction.user.mention, inline=False)
        embed.set_footer(text='RMRP Faction Management')
        embed.timestamp = discord.utils.utcnow()

        for item in self.children:
            item.disabled = True
        await interaction.message.edit(embed=embed, view=self)
        await interaction.followup.send("✅ Сотрудник успешно уволен.", ephemeral=True)

    async def reject(self, interaction: discord.Interaction):
        if not await self.check_admin(interaction):
            return
        await interaction.response.defer(ephemeral=True)

        payload = {
            "report_id": self.report_id,
            "action": "reject",
            "operator_discord_id": str(interaction.user.id)
        }
        await api_request("POST", "/api/faction/dismiss/review", payload)

        guild = interaction.guild
        member = guild.get_member(self.applicant_id)
        if member:
            try:
                await member.send("❌ Ваш рапорт на увольнение был отклонен руководством.")
            except Exception:
                pass

        embed = interaction.message.embeds[0]
        embed.color = 0xe74c3c
        embed.title = "❌ РАПОРТ ОТКЛОНЕН"
        embed.add_field(name="Отклонил", value=interaction.user.mention, inline=False)
        embed.set_footer(text='RMRP Faction Management')
        embed.timestamp = discord.utils.utcnow()

        for item in self.children:
            item.disabled = True
        await interaction.message.edit(embed=embed, view=self)
        await interaction.followup.send("❌ Рапорт на увольнение отклонен.", ephemeral=True)


class ConfirmDismissalView(View):
    """Confirmation dialog before executing a destructive dismissal action."""
    def __init__(self, parent_view: DismissalReviewView):
        super().__init__(timeout=60)
        self.parent_view = parent_view

    @discord.ui.button(label="✅ Подтвердить увольнение", style=discord.ButtonStyle.red)
    async def confirm(self, interaction: discord.Interaction, button: Button):
        for item in self.children:
            item.disabled = True
        await interaction.response.edit_message(content="⏳ Выполняется увольнение...", view=self)
        await self.parent_view.execute_dismiss(interaction)

    @discord.ui.button(label="❌ Отмена", style=discord.ButtonStyle.grey)
    async def cancel(self, interaction: discord.Interaction, button: Button):
        for item in self.children:
            item.disabled = True
        await interaction.response.edit_message(content="🚫 Увольнение отменено.", view=self)


# --- 3. Рапорты на повышение с Черновиками ---

class FactionPromotionModal(Modal):
    def __init__(self, dept_name: str, draft_data: dict = None, user_profile: dict = None):
        super().__init__(title=f"Рапорт на повышение — {dept_name}", timeout=600)
        self.dept_name = dept_name
        self.draft_data = draft_data or {}
        self.user_profile = user_profile or {}

        # Default rank from draft or database profile
        db_rank = self.user_profile.get("rank") or ""
        default_rank = self.draft_data.get("current_rank") or db_rank or "Рядовой"

        self.current_rank = TextInput(
            label="Текущее звание",
            placeholder="Рядовой",
            default=default_rank,
            required=True
        )
        self.target_rank = TextInput(
            label="Желаемое звание",
            placeholder="Ефрейтор",
            default=self.draft_data.get("target_rank", ""),
            required=True
        )
        self.points_input = TextInput(
            label="Набранные баллы (число)",
            placeholder="15",
            default=self.draft_data.get("points", ""),
            required=True
        )
        self.report_links = TextInput(
            label="Ссылки на проделанную работу",
            placeholder="Патруль: imgur.com/...\nЛекция: imgur.com/...",
            default=self.draft_data.get("links", ""),
            style=discord.TextStyle.paragraph,
            required=True
        )
        self.comment_input = TextInput(
            label="Комментарий",
            placeholder="Всё выполнил!",
            default=self.draft_data.get("comment", ""),
            style=discord.TextStyle.paragraph,
            required=False
        )

        self.add_item(self.current_rank)
        self.add_item(self.target_rank)
        self.add_item(self.points_input)
        self.add_item(self.report_links)
        self.add_item(self.comment_input)

    async def on_submit(self, interaction: discord.Interaction):
        # Auto-delete draft on successful submission
        r = await get_redis()
        await r.delete(f"draft:promo:{interaction.user.id}")
        await r.close()

        # Submit data
        # We fetch profile to get user database ID
        profile = await api_request("GET", f"/api/faction/profile/{interaction.user.id}")
        if "error" in profile:
            await interaction.response.send_message("❌ Сначала зарегистрируйтесь во фракции с помощью /my-profile!", ephemeral=True)
            return

        points = 0
        try:
            points = int(self.points_input.value.strip())
        except ValueError:
            pass

        # Publish report to channel
        DEPT_PROMOTION_CHANNELS = {
            "ОМОН": "1520585201707782164",
            "СОБР": "1520586523651870911",
            "УВО": "1520587688732917830",
        }
        channel_id = DEPT_PROMOTION_CHANNELS.get(self.dept_name) or os.environ.get("DISCORD_PROMOTION_CHANNEL_ID")
        if not channel_id:
            await interaction.response.send_message("❌ Канал рапортов не настроен.", ephemeral=True)
            return

        channel = interaction.client.get_channel(int(channel_id))
        if not channel:
            return

        # Leaders configuration for ping
        DEPT_LEADERS = {
            "АВНГ": ["1517487209173876796", "1517493040346828860"],
            "ОМОН": ["1520562814174101555", "1520562838328967219"],
            "СОБР": ["1520562077700198570", "1520562731743313920"],
            "УВО": ["1520561845738410034", "1520561985253675139"],
        }
        roles_to_ping = DEPT_LEADERS.get(self.dept_name, ["1520562020959912176"])
        pings = " ".join([f"<@&{rid}>" for rid in roles_to_ping])

        embed = discord.Embed(
            title="🎖️ НОВЫЙ РАПОРТ НА ПОВЫШЕНИЕ",
            description=f"Поступил рапорт от {interaction.user.mention}.",
            color=0x3498db
        )
        embed.add_field(name="Сотрудник", value=profile.get("name", interaction.user.display_name), inline=True)
        embed.add_field(name="Статик ID", value=profile.get("static_id", "—"), inline=True)
        embed.add_field(name="Отдел", value=self.dept_name, inline=True)
        embed.add_field(name="Повышение", value=f"{self.current_rank.value} ➡️ {self.target_rank.value}", inline=False)
        embed.add_field(name="Баллы", value=str(points), inline=True)
        embed.add_field(name="Комментарий", value=self.comment_input.value or "—", inline=False)
        embed.add_field(name="Выполненная работа", value=self.report_links.value, inline=False)
        embed.set_footer(text='Росгвардия RMRP Арбат')
        embed.timestamp = discord.utils.utcnow()

        view = PromotionReviewView(interaction.user.id, {
            "name": profile.get("name"),
            "static_id": profile.get("static_id"),
            "current_rank": self.current_rank.value,
            "target_rank": self.target_rank.value,
            "points": points,
            "dept": self.dept_name
        })

        await channel.send(content=pings, embed=embed, view=view)
        await interaction.response.send_message("✅ Ваш рапорт успешно отправлен!", ephemeral=True)

    async def on_error(self, interaction: discord.Interaction, error: Exception) -> None:
        logger.error(f"Modal error: {error}")
        # Save draft on unexpected error or if closed?
        # Actually in discord.py, if the user closes the modal by clicking outside, on_error is NOT called.
        # However, we can provide a persistent button "Сохранить черновик" or auto-save.
        # Since discord API doesn't notify when modal is closed, we offer a dedicated "Draft Panel".


class PromotionDraftPanel(View):
    def __init__(self, dept_name: str):
        super().__init__(timeout=None)
        self.dept_name = dept_name

    @discord.ui.button(label="📝 Заполнить рапорт", style=discord.ButtonStyle.primary)
    async def open_form(self, interaction: discord.Interaction, button: Button):
        # Check Redis for drafts
        r = await get_redis()
        draft_str = await r.get(f"draft:promo:{interaction.user.id}")
        await r.close()

        draft_data = {}
        if draft_str:
            try:
                draft_data = json.loads(draft_str)
            except Exception:
                pass

        modal = FactionPromotionModal(self.dept_name, draft_data)
        await interaction.response.send_modal(modal)

    @discord.ui.button(label="💾 Сохранить как черновик", style=discord.ButtonStyle.grey)
    async def save_draft(self, interaction: discord.Interaction, button: Button):
        # Since we can't extract modal inputs if the modal wasn't submitted, 
        # the best practice is to show a short modal to quickly save critical fields.
        modal = QuickDraftModal()
        await interaction.response.send_modal(modal)


class QuickDraftModal(Modal):
    def __init__(self):
        super().__init__(title="Быстрое сохранение черновика", timeout=300)
        self.cur_rank = TextInput(label="Текущее звание")
        self.tgt_rank = TextInput(label="Желаемое звание")
        self.pts = TextInput(label="Баллы", required=False)
        self.links = TextInput(label="Ссылки на работу", style=discord.TextStyle.paragraph, required=False)
        self.add_item(self.cur_rank)
        self.add_item(self.tgt_rank)
        self.add_item(self.pts)
        self.add_item(self.links)

    async def on_submit(self, interaction: discord.Interaction):
        draft_data = {
            "current_rank": self.cur_rank.value,
            "target_rank": self.tgt_rank.value,
            "points": self.pts.value,
            "links": self.links.value,
            "date": datetime.now().isoformat()
        }
        r = await get_redis()
        await r.set(f"draft:promo:{interaction.user.id}", json.dumps(draft_data), ex=1209600)  # 14 days TTL
        await r.close()
        await interaction.response.send_message("✅ Черновик сохранен на 14 дней! Нажмите «Заполнить рапорт», чтобы продолжить в любое время.", ephemeral=True)


class PromotionReviewView(View):
    def __init__(self, applicant_id: int, report_details: dict):
        super().__init__(timeout=None)
        self.applicant_id = applicant_id
        self.report_details = report_details
        uid = str(applicant_id)

        approve_btn = Button(label="✅ Одобрить", style=discord.ButtonStyle.green, custom_id=f"promo:approve:{uid}")
        approve_btn.callback = self.approve
        self.add_item(approve_btn)

        reject_btn = Button(label="❌ Отказать", style=discord.ButtonStyle.red, custom_id=f"promo:reject:{uid}")
        reject_btn.callback = self.reject
        self.add_item(reject_btn)

    async def check_admin(self, interaction: discord.Interaction) -> bool:
        if interaction.user.guild_permissions.administrator:
            return True
        for role in interaction.user.roles:
            if role.name.lower() in ["руководство", "инструктор", "chief", "head"]:
                return True
        await interaction.response.send_message("❌ У вас нет прав для рассмотрения рапортов.", ephemeral=True)
        return False

    async def approve(self, interaction: discord.Interaction):
        if not await self.check_admin(interaction):
            return
        await interaction.response.defer(ephemeral=True)

        # We need to find rank_id and role_ids
        ranks = await api_request("GET", "/api/faction/ranks")
        target_rank_name = self.report_details["target_rank"]
        current_rank_name = self.report_details.get("current_rank", "")
        
        rank_id = None
        target_role_id = None
        current_role_id = None
        for r in ranks:
            if r["name"].lower() == target_rank_name.lower():
                rank_id = r["id"]
                target_role_id = r.get("discord_role_id")
            if current_rank_name and r["name"].lower() == current_rank_name.lower():
                current_role_id = r.get("discord_role_id")

        # We need to find department_id for dept
        depts = await api_request("GET", "/api/faction/departments")
        target_dept_name = self.report_details.get("dept", "")
        
        dept_id = None
        if target_dept_name:
            for d in depts:
                if d["name"].lower() == target_dept_name.lower():
                    dept_id = d["id"]
                    break

        # Update in DB
        update_payload = {
            "discord_id": str(self.applicant_id),
            "rank_id": rank_id,
            "department_id": dept_id,
            "points_delta": int(self.report_details["points"]),
            "operator_discord_id": str(interaction.user.id)
        }
        await api_request("POST", "/api/faction/members/update", update_payload)

        # Discord role management and nick update
        guild = interaction.guild
        member = guild.get_member(self.applicant_id)
        if member:
            # Change nick
            formatted_id = self.report_details["static_id"]
            new_nick = f"[{target_rank_name}] {self.report_details['name']} | {formatted_id[:3]}-{formatted_id[3:]}"
            try:
                await member.edit(nick=new_nick[:32])
            except Exception:
                pass
            
            # Change rank roles
            try:
                if target_role_id:
                    role_to_add = guild.get_role(int(target_role_id))
                    if role_to_add:
                        await member.add_roles(role_to_add)
                if current_role_id:
                    role_to_remove = guild.get_role(int(current_role_id))
                    if role_to_remove:
                        await member.remove_roles(role_to_remove)
            except Exception as e:
                logger.error(f"Error updating roles for {member.name}: {e}")

            # Send DM
            try:
                await member.send(f"🎉 Ваш рапорт на повышение одобрен! Вы повышены до **{target_rank_name}**.")
            except Exception:
                pass

        embed = interaction.message.embeds[0]
        embed.color = 0x2ecc71
        embed.title = "✅ РАПОРТ ОДОБРЕН"
        embed.add_field(name="Решение принял", value=interaction.user.mention, inline=False)
        embed.set_footer(text='RMRP Faction Management')
        embed.timestamp = discord.utils.utcnow()

        for item in self.children:
            item.disabled = True
        await interaction.message.edit(embed=embed, view=self)
        await interaction.followup.send("✅ Рапорт одобрен!", ephemeral=True)

    async def reject(self, interaction: discord.Interaction):
        if not await self.check_admin(interaction):
            return
        await interaction.response.defer(ephemeral=True)

        guild = interaction.guild
        member = guild.get_member(self.applicant_id)
        if member:
            try:
                await member.send("❌ Ваш рапорт на повышение был отклонен.")
            except Exception:
                pass

        embed = interaction.message.embeds[0]
        embed.color = 0xe74c3c
        embed.title = "❌ РАПОРТ ОТКЛОНЕН"
        embed.add_field(name="Решение принял", value=interaction.user.mention, inline=False)
        embed.set_footer(text='RMRP Faction Management')
        embed.timestamp = discord.utils.utcnow()

        for item in self.children:
            item.disabled = True
        await interaction.message.edit(embed=embed, view=self)
        await interaction.followup.send("❌ Рапорт отклонен.", ephemeral=True)


# --- 4. Переводы между отделами ---

class FactionTransferView(View):
    def __init__(self, from_depts: list, to_depts: list):
        super().__init__(timeout=180)
        self.from_depts = from_depts
        self.to_depts = to_depts
        self.selected_from = None
        self.selected_to = None

        # From dept select
        from_options = [discord.SelectOption(label=d["name"], value=str(d["id"])) for d in from_depts]
        self.from_select = Select(placeholder="Выберите текущий отдел...", options=from_options)
        self.from_select.callback = self.from_callback
        self.add_item(self.from_select)

        # To dept select
        to_options = [discord.SelectOption(label=d["name"], value=str(d["id"])) for d in to_depts]
        self.to_select = Select(placeholder="Выберите новый отдел...", options=to_options)
        self.to_select.callback = self.to_callback
        self.add_item(self.to_select)

    async def from_callback(self, interaction: discord.Interaction):
        self.selected_from = int(self.from_select.values[0])
        await interaction.response.defer()

    async def to_callback(self, interaction: discord.Interaction):
        self.selected_to = int(self.to_select.values[0])
        await interaction.response.defer()

    @discord.ui.button(label="Далее ➡️", style=discord.ButtonStyle.green)
    async def proceed(self, interaction: discord.Interaction, button: Button):
        if not self.selected_from or not self.selected_to:
            await interaction.response.send_message("❌ Выберите оба отдела!", ephemeral=True)
            return

        modal = TransferReasonModal(self.selected_from, self.selected_to)
        await interaction.response.send_modal(modal)


class TransferReasonModal(Modal):
    def __init__(self, from_dept: int, to_dept: int):
        super().__init__(title="Запрос на перевод", timeout=300)
        self.from_dept = from_dept
        self.to_dept = to_dept

        self.name_input = TextInput(
            label="Имя Фамилия",
            placeholder="Иванов Иван",
            required=True,
            max_length=100,
        )
        self.static_id_input = TextInput(
            label="Статик ID (6 цифр, например 123-456)",
            placeholder="123-456",
            required=True,
            max_length=7,
        )
        self.rank_input = TextInput(
            label="Текущее звание",
            placeholder="Рядовой",
            required=True,
            max_length=50,
        )
        self.reason_input = TextInput(
            label="Укажите причину перевода",
            placeholder="Связанная с...",
            style=discord.TextStyle.paragraph,
            required=True,
            max_length=500,
        )

        self.add_item(self.name_input)
        self.add_item(self.static_id_input)
        self.add_item(self.rank_input)
        self.add_item(self.reason_input)

    async def on_submit(self, interaction: discord.Interaction):
        name = self.name_input.value.strip()
        raw_static_id = self.static_id_input.value.strip()
        rank = self.rank_input.value.strip()
        reason = self.reason_input.value.strip()

        clean_id = raw_static_id.replace("-", "").replace(" ", "")
        if not re.fullmatch(r"\d{6}", clean_id):
            await interaction.response.send_message(
                "❌ **Ошибка:** Статик ID должен содержать 6 цифр.",
                ephemeral=True
            )
            return

        formatted_id = f"{clean_id[:3]}-{clean_id[3:]}"
        combined_reason = f"Имя: {name} | ID: {formatted_id} | Звание: {rank}\nПричина: {reason}"

        # Call API
        payload = {
            "discord_id": str(interaction.user.id),
            "from_dept_id": self.from_dept,
            "to_dept_id": self.to_dept,
            "reason": combined_reason
        }
        res = await api_request("POST", "/api/faction/transfers/submit", payload)
        if "error" in res:
            await interaction.response.send_message(f"❌ Ошибка перевода: {res['error']}", ephemeral=True)
            return

        transfer_id = res["transfer_id"]
        await interaction.response.send_message("✅ Запрос на перевод отправлен. Ожидайте подтверждения руководства обоих отделов.", ephemeral=True)

        # Notify channel
        channel_id = os.environ.get("DISCORD_TRANSFER_CHANNEL_ID", "1520573605774102608")
        if not channel_id:
            return
        channel = interaction.client.get_channel(int(channel_id))
        if not channel:
            return

        # Fetch dept names
        depts = await api_request("GET", "/api/faction/departments")
        from_name = next((d["name"] for d in depts if d["id"] == self.from_dept), "—")
        to_name = next((d["name"] for d in depts if d["id"] == self.to_dept), "—")

        # Leader roles mapping for tags
        DEPT_LEADERS = {
            "АВНГ": ["1517487209173876796", "1517493040346828860"],
            "ОМОН": ["1520562814174101555", "1520562838328967219"],
            "СОБР": ["1520562077700198570", "1520562731743313920"],
            "УВО": ["1520561845738410034", "1520561985253675139"],
        }
        from_roles = DEPT_LEADERS.get(from_name, ["1520562020959912176"])
        to_roles = DEPT_LEADERS.get(to_name, ["1520562020959912176"])

        from_tags = " ".join([f"<@&{rid}>" for rid in from_roles])
        to_tags = " ".join([f"<@&{rid}>" for rid in to_roles])

        # Short name for signature
        parts = name.split()
        sig = ""
        if len(parts) >= 2:
            sig = f"{parts[0][0]}.{parts[1][0]}."
        elif len(parts) == 1:
            sig = f"{parts[0][0]}."

        import datetime
        date_str = datetime.datetime.now().strftime("%d.%m.%Y г.")

        description = (
            f"**УФСВНГ Российской Федерации по г.Москве и Московской области**\n\n"
            f"От **{name}** | **{formatted_id}** | **{rank}**\n\n"
            f"### Рапорт\n\n"
            f"Я, **{name}**, находящийся в звании **{rank}**, прошу Вас рассмотреть мою кандидатуру на перевод в отдел **{to_name}** из отдела **{from_name}**.\n\n"
            f"**Причина:** {reason}\n\n"
            f"**Дата:** {date_str}\n"
            f"**Подпись:** {sig}\n\n"
            f"**Тег руководства вашего подразделения:** {from_tags}\n"
            f"**Тег руководства подразделения в которое перевести хотите:** {to_tags}"
        )

        embed = discord.Embed(
            title="🔄 ЗАПРОС НА ПЕРЕВОД",
            description=description,
            color=0x3498db
        )
        embed.add_field(name=f"Согласование {from_name}", value="⏳ Ожидание", inline=True)
        embed.add_field(name=f"Согласование {to_name}", value="⏳ Ожидание", inline=True)
        embed.set_footer(text='Росгвардия RMRP Арбат')
        embed.timestamp = discord.utils.utcnow()

        view = TransferApprovalView(transfer_id, interaction.user.id, from_name, to_name)
        
        # Mention all leaders outside embed to guarantee pings work
        all_mentions = f"{from_tags} {to_tags}"
        await channel.send(content=all_mentions, embed=embed, view=view)


class TransferApprovalView(View):
    def __init__(self, transfer_id: int, employee_id: int, from_name: str, to_name: str):
        super().__init__(timeout=None)
        self.transfer_id = transfer_id
        self.employee_id = employee_id
        self.from_name = from_name
        self.to_name = to_name
        self.sender_approved = False
        self.receiver_approved = False

        tid = str(transfer_id)
        btn_sender = Button(label=f"Одобрить от {from_name}", style=discord.ButtonStyle.primary, custom_id=f"trans:send:{tid}")
        btn_sender.callback = self.approve_sender
        self.add_item(btn_sender)

        btn_receiver = Button(label=f"Одобрить от {to_name}", style=discord.ButtonStyle.primary, custom_id=f"trans:recv:{tid}")
        btn_receiver.callback = self.approve_receiver
        self.add_item(btn_receiver)

        btn_reject = Button(label="❌ Отклонить", style=discord.ButtonStyle.red, custom_id=f"trans:rej:{tid}")
        btn_reject.callback = self.reject
        self.add_item(btn_reject)

    async def check_leader(self, interaction: discord.Interaction, dept_name: str) -> bool:
        if interaction.user.guild_permissions.administrator:
            return True
        for role in interaction.user.roles:
            if role.name.lower() in ["руководство", "chief", "head", f"начальник {dept_name.lower()}"]:
                return True
        await interaction.response.send_message(f"❌ Вы не являетесь руководителем отдела {dept_name}.", ephemeral=True)
        return False

    async def approve_sender(self, interaction: discord.Interaction):
        if not await self.check_leader(interaction, self.from_name):
            return
        await interaction.response.defer(ephemeral=True)

        payload = {
            "transfer_id": self.transfer_id,
            "side": "sender",
            "action": "approve",
            "operator_discord_id": str(interaction.user.id)
        }
        res = await api_request("POST", "/api/faction/transfers/approve", payload)
        self.sender_approved = True

        embed = interaction.message.embeds[0]
        embed.set_field_at(0, name=f"Согласование {self.from_name}", value=f"✅ Одобрил {interaction.user.mention}", inline=True)
        
        # Check if fully approved
        if res.get("status") == "approved":
            await self.apply_transfer(interaction, embed)
        else:
            await interaction.message.edit(embed=embed, view=self)

    async def approve_receiver(self, interaction: discord.Interaction):
        if not await self.check_leader(interaction, self.to_name):
            return
        await interaction.response.defer(ephemeral=True)

        payload = {
            "transfer_id": self.transfer_id,
            "side": "receiver",
            "action": "approve",
            "operator_discord_id": str(interaction.user.id)
        }
        res = await api_request("POST", "/api/faction/transfers/approve", payload)
        self.receiver_approved = True

        embed = interaction.message.embeds[0]
        embed.set_field_at(1, name=f"Согласование {self.to_name}", value=f"✅ Одобрил {interaction.user.mention}", inline=True)

        if res.get("status") == "approved":
            await self.apply_transfer(interaction, embed)
        else:
            await interaction.message.edit(embed=embed, view=self)

    async def reject(self, interaction: discord.Interaction):
        # Permission check: must be leader of either department or admin
        is_sender_leader = await self.check_leader(interaction, self.from_name)
        if not is_sender_leader:
            # check_leader already sent an error response, check receiver side
            is_receiver_leader = await self.check_leader(interaction, self.to_name)
            if not is_receiver_leader:
                return
        await interaction.response.defer(ephemeral=True)
        payload = {
            "transfer_id": self.transfer_id,
            "side": "any",
            "action": "reject",
            "operator_discord_id": str(interaction.user.id)
        }
        await api_request("POST", "/api/faction/transfers/approve", payload)

        embed = interaction.message.embeds[0]
        embed.color = 0xe74c3c
        embed.title = "❌ ПЕРЕВOД ОТКЛОНЕН"
        embed.add_field(name="Отклонил", value=interaction.user.mention, inline=False)
        embed.set_footer(text='RMRP Faction Management')
        embed.timestamp = discord.utils.utcnow()

        for item in self.children:
            item.disabled = True
        await interaction.message.edit(embed=embed, view=self)

    async def apply_transfer(self, interaction: discord.Interaction, embed: discord.Embed):
        # Update roles
        guild = interaction.guild
        member = guild.get_member(self.employee_id)
        if member:
            # Change фракционные роли отдела
            depts = await api_request("GET", "/api/faction/departments")
            
            roles_to_remove = []
            role_to_add = None

            for d in depts:
                if d["discord_role_id"]:
                    role = guild.get_role(int(d["discord_role_id"]))
                    if role:
                        if d["name"] == self.to_name:
                            role_to_add = role
                        elif role in member.roles:
                            roles_to_remove.append(role)
            
            if roles_to_remove:
                await member.remove_roles(*roles_to_remove)
            if role_to_add:
                await member.add_roles(role_to_add)

            # Inform user
            try:
                await member.send(f"🔄 Ваш перевод из отдела **{self.from_name}** в **{self.to_name}** был успешно согласован и выполнен!")
            except Exception:
                pass

        embed.color = 0x2ecc71
        embed.title = "✅ ПЕРЕВOД ВЫПОЛНЕН"
        embed.set_footer(text='RMRP Faction Management')
        embed.timestamp = discord.utils.utcnow()
        
        for item in self.children:
            item.disabled = True
        await interaction.message.edit(embed=embed, view=self)


# --- 5. Запрос склада ---

class WarehouseRequestModal(Modal):
    def __init__(self):
        super().__init__(title="Запрос склада", timeout=300)
        self.items_input = TextInput(
            label="Предметы и количество (через запятую)",
            placeholder="Бронежилет - 5, Карабин - 2",
            required=True
        )
        self.comment_input = TextInput(
            label="Комментарий (цель получения)",
            placeholder="Для патрулирования",
            style=discord.TextStyle.paragraph,
            required=False
        )
        self.add_item(self.items_input)
        self.add_item(self.comment_input)

    async def on_submit(self, interaction: discord.Interaction):
        items_str = self.items_input.value.strip()
        comment = self.comment_input.value.strip()

        # Parse items
        items_list = []
        for pair in items_str.split(","):
            parts = pair.split("-")
            if len(parts) == 2:
                items_list.append({
                    "name": parts[0].strip(),
                    "count": parts[1].strip()
                })
            else:
                items_list.append({
                    "name": pair.strip(),
                    "count": "1"
                })

        # Submit API
        payload = {
            "discord_id": str(interaction.user.id),
            "items": items_list,
            "comment": comment
        }
        res = await api_request("POST", "/api/faction/warehouse/request", payload)
        if "error" in res:
            await interaction.response.send_message(f"❌ Ошибка создания запроса: {res['error']}", ephemeral=True)
            return

        request_id = res["request_id"]
        await interaction.response.send_message("✅ Запрос на склад отправлен. Ожидайте выдачи.", ephemeral=True)

        # Notify requests
        channel_id = os.environ.get("DISCORD_REQUESTS_CHANNEL_ID")
        if not channel_id:
            return
        channel = interaction.client.get_channel(int(channel_id))
        if not channel:
            return

        embed = discord.Embed(
            title="📦 ЗАПРОС СКЛАДА",
            description=f"Сотрудник {interaction.user.mention} запросил снаряжение.",
            color=0x3498db
        )
        items_formatted = "\n".join([f"• {i['name']}: {i['count']} шт." for i in items_list])
        embed.add_field(name="Запрошенные предметы", value=items_formatted, inline=False)
        embed.add_field(name="Комментарий", value=comment or "—", inline=False)
        embed.set_footer(text='RMRP Faction Management')
        embed.timestamp = discord.utils.utcnow()

        view = WarehouseRequestReviewView(request_id, interaction.user.id, items_list)
        await channel.send(embed=embed, view=view)


class WarehouseRequestReviewView(View):
    def __init__(self, request_id: int, employee_id: int, items: list):
        super().__init__(timeout=None)
        self.request_id = request_id
        self.employee_id = employee_id
        self.items = items
        rid = str(request_id)

        approve_btn = Button(label="✅ Одобрить", style=discord.ButtonStyle.green, custom_id=f"wh:app:{rid}")
        approve_btn.callback = self.approve
        self.add_item(approve_btn)

        reject_btn = Button(label="❌ Отклонить", style=discord.ButtonStyle.red, custom_id=f"wh:rej:{rid}")
        reject_btn.callback = self.reject
        self.add_item(reject_btn)

    async def check_leader(self, interaction: discord.Interaction) -> bool:
        if interaction.user.guild_permissions.administrator:
            return True
        for role in interaction.user.roles:
            if role.name.lower() in ["руководство", "chief", "head", "офицер", "склад"]:
                return True
        await interaction.response.send_message("❌ У вас нет доступа к выдаче склада.", ephemeral=True)
        return False

    async def approve(self, interaction: discord.Interaction):
        if not await self.check_leader(interaction):
            return
        await interaction.response.defer(ephemeral=True)

        payload = {
            "request_id": self.request_id,
            "action": "approve",
            "operator_discord_id": str(interaction.user.id)
        }
        await api_request("POST", "/api/faction/warehouse/review", payload)

        guild = interaction.guild
        member = guild.get_member(self.employee_id)
        if member:
            try:
                await member.send("✅ Ваш запрос на склад был одобрен! Обратитесь к офицерам снабжения.")
            except Exception:
                pass

        embed = interaction.message.embeds[0]
        embed.color = 0x2ecc71
        embed.title = "✅ ЗАПРОС СКЛАДА ОДОБРЕН"
        embed.add_field(name="Одобрил", value=interaction.user.mention, inline=False)
        embed.set_footer(text='RMRP Faction Management')
        embed.timestamp = discord.utils.utcnow()

        for item in self.children:
            item.disabled = True
        await interaction.message.edit(embed=embed, view=self)
        await interaction.followup.send("✅ Запрос склада одобрен.", ephemeral=True)

    async def reject(self, interaction: discord.Interaction):
        if not await self.check_leader(interaction):
            return
        await interaction.response.defer(ephemeral=True)

        payload = {
            "request_id": self.request_id,
            "action": "reject",
            "operator_discord_id": str(interaction.user.id)
        }
        await api_request("POST", "/api/faction/warehouse/review", payload)

        guild = interaction.guild
        member = guild.get_member(self.employee_id)
        if member:
            try:
                await member.send("❌ Ваш запрос на склад был отклонен.")
            except Exception:
                pass

        embed = interaction.message.embeds[0]
        embed.color = 0xe74c3c
        embed.title = "❌ ЗАПРОС СКЛАДА ОТКЛОНЕН"
        embed.add_field(name="Отклонил", value=interaction.user.mention, inline=False)
        embed.set_footer(text='RMRP Faction Management')
        embed.timestamp = discord.utils.utcnow()

        for item in self.children:
            item.disabled = True
        await interaction.message.edit(embed=embed, view=self)
        await interaction.followup.send("❌ Запрос склада отклонен.", ephemeral=True)

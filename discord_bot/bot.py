import os
import json
import asyncio
import logging
import re
import discord
from discord import app_commands
from discord.ui import Button, View, Select, Modal, TextInput
import redis.asyncio as aioredis
import aiohttp
from dotenv import load_dotenv
from faction_views import (
    FactionApplicationStartView,
    FactionDismissalModal,
    DismissalRoleSelectView,
    FactionPromotionModal,
    QuickDraftModal,
    PromotionDraftPanel,
    FactionTransferView,
    WarehouseRequestModal,
    api_request,
    get_redis,
    DismissalReviewView,
    PromotionReviewView,
    TransferApprovalView,
    WarehouseRequestReviewView,
    RegistrationModal
)
from promo_builder import PromotionReportBuilderView


def validate_static_id(raw: str) -> str | None:
    """Clean and validate a 6-digit static ID. Returns cleaned ID or None."""
    clean = raw.replace('-', '').replace(' ', '').strip()
    if re.fullmatch(r'\d{6}', clean):
        return clean
    return None


async def _handle_modal_error(interaction: discord.Interaction, error: Exception, modal_name: str = "Modal"):
    """Shared error handler for all Modals."""
    logger.error(f"{modal_name} error for {interaction.user}: {error}", exc_info=True)
    try:
        if not interaction.response.is_done():
            await interaction.response.send_message(
                "❌ Произошла ошибка при обработке формы. Попробуйте позже.",
                ephemeral=True
            )
        else:
            await interaction.followup.send(
                "❌ Произошла ошибка при обработке формы. Попробуйте позже.",
                ephemeral=True
            )
    except Exception:
        pass


load_dotenv()


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("discord_bot")

TOKEN = os.environ.get("DISCORD_BOT_TOKEN", "")
GUILD_ID = os.environ.get("DISCORD_GUILD_ID", "")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
API_URL = os.environ.get("API_URL", "http://api:8000")
BOT_SECRET = os.environ.get("DISCORD_BOT_SECRET")
if not BOT_SECRET:
    logger.warning("DISCORD_BOT_SECRET is not set! Bot-to-API authentication is disabled.")

# ── Notification channel IDs ──
CHANNELS = {
    "courses_report": os.environ.get("DISCORD_COURSES_REPORT_CHANNEL_ID", ""),
    "exams_report": os.environ.get("DISCORD_EXAMS_REPORT_CHANNEL_ID", ""),
    "requests": os.environ.get("DISCORD_REQUESTS_CHANNEL_ID", ""),
    "dismissal": os.environ.get("DISCORD_DISMISSAL_CHANNEL_ID", ""),
    "promotion": os.environ.get("DISCORD_PROMOTION_CHANNEL_ID", ""),
    "promotion_reviewed": os.environ.get("DISCORD_PROMOTION_REVIEWED_CHANNEL_ID", ""),
}
DEFAULT_CHANNEL_ID = os.environ.get("DISCORD_INSTRUCTORS_CHANNEL_ID", "")

# ── Application system config ──
WELCOME_CHANNEL_ID = os.environ.get("DISCORD_WELCOME_CHANNEL_ID", "")
APPLICATIONS_CHANNEL_ID = os.environ.get("DISCORD_APPLICATIONS_CHANNEL_ID", "")
CADET_ROLE_ID = os.environ.get("DISCORD_CADET_ROLE_ID", "")
TRANSFER_ROLE_ID = os.environ.get("DISCORD_TRANSFER_ROLE_ID", "")
VERIFIED_ROLE_ID = os.environ.get("DISCORD_VERIFIED_ROLE_ID", "")

if not TOKEN:
    logger.error("CRITICAL: DISCORD_BOT_TOKEN not set!")

# Log config
for name, cid in CHANNELS.items():
    if cid:
        logger.info(f"Channel '{name}' -> {cid}")

logger.info(f"Welcome channel: {WELCOME_CHANNEL_ID}")
logger.info(f"Applications channel: {APPLICATIONS_CHANNEL_ID}")


# ═══════════════════════════════════════════════════════
# Notification channel routing (unchanged)
# ═══════════════════════════════════════════════════════

def resolve_channel_id(channel_type: str) -> str:
    MAPPING = {
        "courses_report": "courses_report", "lecture_report": "courses_report",
        "practice_report": "courses_report", "lecture_test": "courses_report", "lecture": "courses_report",
        "exams_report": "exams_report", "exam_report": "exams_report",
        "test": "exams_report", "test_exam": "exams_report",
        "requests": "requests", "request": "requests", "request_created": "requests",
        "promotion": "promotion", "promotion_submitted": "promotion", "instructor_promotion": "requests",
        "promotion_reviewed": "promotion_reviewed",
        "dismissal": "dismissal",
    }
    target_key = MAPPING.get(channel_type, "requests")
    return CHANNELS.get(target_key, "") or DEFAULT_CHANNEL_ID


# ═══════════════════════════════════════════════════════
# APPLICATION SYSTEM — Views, Modals, Buttons
# ═══════════════════════════════════════════════════════

CATEGORY_OPTIONS = {
    "cadet": "Курсант АВНГ",
    "transfer": "Перевод/Восстановление",
    "gov": "Гос.Сотрудник",
}

CATEGORY_ROLE_MAP = {
    "cadet": CADET_ROLE_ID,
    "transfer": TRANSFER_ROLE_ID,
    "gov": "",  # No role for gov employees
}

CATEGORY_DB_ROLE = {
    "cadet": "cadet",
    "transfer": "cadet",
    "gov": "cadet",
}


class ApplicationStartView(View):
    """Persistent panel with 'Apply' button shown in the welcome channel."""

    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(
        label="📝 Подать заявку",
        style=discord.ButtonStyle.green,
        custom_id="app:start"
    )
    async def start_application(self, interaction: discord.Interaction, button: Button):
        # Show category select
        view = CategorySelectView()
        await interaction.response.send_message(
            "**Выберите категорию вступления:**",
            view=view,
            ephemeral=True
        )


class DismissalPanelView(View):
    """Persistent panel with 'Dismiss' button shown in the dismissal channel."""

    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(
        label="🚨 Подать рапорт на увольнение",
        style=discord.ButtonStyle.red,
        custom_id="dismiss:start"
    )
    async def start_dismissal(self, interaction: discord.Interaction, button: Button):
        # Cadets cannot submit dismissal reports
        cadet_role_id = 1517478040886575144
        if any(role.id == cadet_role_id for role in interaction.user.roles):
            await interaction.response.send_message(
                "❌ **Курсанты подают рапорт на увольнение через сайт академии.**",
                ephemeral=True
            )
            return

        view = DismissalRoleSelectView()
        await interaction.response.send_message(
            "📋 **Подача рапорта на увольнение**\n\nВыберите руководителя для уведомления:",
            view=view,
            ephemeral=True
        )


class TransferPanelView(View):
    """Persistent panel with 'Transfer' button shown in the transfer channel."""

    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(
        label="🔄 Подать рапорт на перевод",
        style=discord.ButtonStyle.blurple,
        custom_id="transfer:start"
    )
    async def start_transfer(self, interaction: discord.Interaction, button: Button):
        depts = await api_request("GET", "/api/faction/departments")
        profile = await api_request("GET", f"/api/faction/profile/{interaction.user.id}")
        if "error" in profile:
            await interaction.response.send_message("❌ Сначала зарегистрируйтесь в базе через /my-profile!", ephemeral=True)
            return

        cur_dept_id = profile.get("department", {}).get("id") if profile.get("department") else None

        from_depts = [d for d in depts if d["id"] == cur_dept_id] if cur_dept_id else depts
        to_depts = [d for d in depts if d["id"] != cur_dept_id]

        if not from_depts or not to_depts:
            await interaction.response.send_message("❌ Невозможно определить доступные для перевода отделы.", ephemeral=True)
            return

        view = FactionTransferView(from_depts, to_depts)
        await interaction.response.send_message("Заполните форму перевода:", view=view, ephemeral=True)


class PromotionStartPanelView(View):
    """Persistent panel with 'Apply' button to start promotion report."""

    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(
        label="🎖️ Подать рапорт на повышение",
        style=discord.ButtonStyle.green,
        custom_id="promo:start"
    )
    async def start_promotion(self, interaction: discord.Interaction, button: Button):
        # 1. Fetch user profile from database
        profile = await api_request("GET", f"/api/faction/profile/{interaction.user.id}")
        if "error" in profile:
            await interaction.response.send_message("❌ Сначала зарегистрируйтесь в базе через /my-profile!", ephemeral=True)
            return

        # 2. Get department name (check channel first, then fallback to profile)
        channel_id = str(interaction.channel_id)
        channel_depts = {
            "1520585201707782164": "ОМОН",
            "1520586523651870911": "СОБР",
            "1520587688732917830": "УВО"
        }
        dept_name = channel_depts.get(channel_id)
        if not dept_name:
            dept_name = profile.get("unit") or (profile.get("department", {}).get("name") if profile.get("department") else None)
        if not dept_name:
            dept_name = "АВНГ"

        # 3. Verify user has the Discord role for this department
        depts = await api_request("GET", "/api/faction/departments")
        target_dept = next((d for d in depts if d["name"].upper() == dept_name.upper()), None)
        if target_dept and target_dept["discord_role_id"]:
            role_id = int(target_dept["discord_role_id"])
            if not any(role.id == role_id for role in interaction.user.roles):
                await interaction.response.send_message(
                    f"❌ **Ошибка:** Вы не можете подать рапорт для отдела **{dept_name}**, так как у вас нет соответствующей роли в Discord!",
                    ephemeral=True
                )
                return

        # 4. If AVNG, redirect to website
        if dept_name == "АВНГ":
            await interaction.response.send_message(
                "❌ **Внимание:** Подача рапортов для отдела **АВНГ** и курсантов производится **только через сайт**!\n"
                "Пожалуйста, заполните рапорт в личном кабинете на сайте.",
                ephemeral=True
            )
            return

        # 5. Fetch department specific settings
        settings_data = await api_request("GET", f"/api/faction/promotions/settings?unit={dept_name}")
        points_config = settings_data.get("points_config", [])
        ranks_flow = settings_data.get("ranks_flow", [])

        # 6. Check Redis for builder drafts
        r = await get_redis()
        draft_str = await r.get(f"draft:promo:builder:{interaction.user.id}")
        await r.close()

        draft_data = {}
        if draft_str:
            try:
                draft_data = json.loads(draft_str)
            except Exception:
                pass

        # 7. Respond with interactive builder View
        builder_view = PromotionReportBuilderView(
            user_id=interaction.user.id,
            dept_name=dept_name,
            profile=profile,
            points_config=points_config,
            ranks_flow=ranks_flow,
            draft_data=draft_data
        )
        embed = builder_view.build_embed()
        await interaction.response.send_message(embed=embed, view=builder_view, ephemeral=True)

    @discord.ui.button(
        label="💾 Сохранить как черновик",
        style=discord.ButtonStyle.grey,
        custom_id="promo:draft_save"
    )
    async def save_draft(self, interaction: discord.Interaction, button: Button):
        modal = QuickDraftModal()
        await interaction.response.send_modal(modal)


class CategorySelectView(View):
    """Select menu for choosing application category."""

    def __init__(self):
        super().__init__(timeout=120)

    @discord.ui.select(
        cls=Select,
        placeholder="Выберите категорию...",
        custom_id="app:category_select_temp",
        options=[
            discord.SelectOption(label="Курсант АВНГ", value="cadet", emoji="🎓", description="Поступление в академию"),
            discord.SelectOption(label="Перевод/Восстановление", value="transfer", emoji="🔄", description="Перевод из другого подразделения"),
            discord.SelectOption(label="Гос.Сотрудник", value="gov", emoji="🏛️", description="Государственный сотрудник"),
        ]
    )
    async def category_selected(self, interaction: discord.Interaction, select: Select):
        category = select.values[0]
        if category == "transfer":
            modal = TransferApplicationModal()
        elif category == "gov":
            modal = GovApplicationModal()
        else:
            modal = ApplicationModal(category)
        await interaction.response.send_modal(modal)


class GovApplicationModal(Modal):
    """Form for Government Employee applications."""

    def __init__(self):
        super().__init__(title="Заявка — Гос.Сотрудник", timeout=300)

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
            label="Звание / Должность",
            placeholder="Капитан / Следователь",
            required=True,
            max_length=100,
        )
        self.department_input = TextInput(
            label="Ведомство / Организация",
            placeholder="МВД / ФСБ / Прокуратура",
            required=True,
            max_length=100,
        )
        self.details_input = TextInput(
            label="Удостоверение (ссылка) + Причина",
            placeholder="Ссылка на фото удостоверения\nПричина обращения",
            required=True,
            style=discord.TextStyle.paragraph,
            max_length=500,
        )

        self.add_item(self.name_input)
        self.add_item(self.static_id_input)
        self.add_item(self.rank_input)
        self.add_item(self.department_input)
        self.add_item(self.details_input)

    async def on_submit(self, interaction: discord.Interaction):
        name = self.name_input.value.strip()
        raw_static_id = self.static_id_input.value.strip()
        rank = self.rank_input.value.strip()
        department = self.department_input.value.strip()
        details = self.details_input.value.strip()

        clean_id = validate_static_id(raw_static_id)
        if not clean_id:
            await interaction.response.send_message(
                "❌ **Ошибка:** Статик ID должен содержать 6 цифр (например: 123-456 или 123456).",
                ephemeral=True
            )
            return

        formatted_id = f"{clean_id[:3]}-{clean_id[3:]}"

        app_data = {
            "discord_user_id": str(interaction.user.id),
            "discord_username": interaction.user.display_name,
            "category": "gov",
            "name": name,
            "static_id": clean_id,
            "formatted_id": formatted_id,
            "rank": rank,
            "department": department,
            "details": details,
            "reason": "Гос.Сотрудник",
            "status": "pending",
        }

        app_key = f"application:{interaction.user.id}"
        try:
            redis_conn = await interaction.client.get_redis()
            await redis_conn.set(app_key, json.dumps(app_data), ex=86400 * 7)
        except Exception as e:
            logger.error(f"Redis error saving application: {e}")
            await interaction.response.send_message(
                "❌ **Ошибка:** Не удалось сохранить заявку. Попробуйте позже.",
                ephemeral=True
            )
            return

        await interaction.response.send_message(
            "✅ **Заявка Гос.Сотрудника отправлена!**\n"
            "Ваша заявка передана на рассмотрение руководству.\n\nОжидайте решения.",
            ephemeral=True
        )

        review_channel = interaction.client.get_channel(int(APPLICATIONS_CHANNEL_ID)) if APPLICATIONS_CHANNEL_ID else None
        if not review_channel:
            logger.error(f"Applications channel {APPLICATIONS_CHANNEL_ID} not found!")
            return

        embed = discord.Embed(
            title="🏛️ ЗАЯВКА — ГОС.СОТРУДНИК",
            description="Поступила заявка от государственного сотрудника.",
            color=0x9b59b6
        )
        embed.add_field(name="👤 Имя Фамилия", value=name, inline=True)
        embed.add_field(name="🆔 Статик ID", value=formatted_id, inline=True)
        embed.add_field(name="⭐ Звание / Должность", value=rank, inline=True)
        embed.add_field(name="🏢 Ведомство", value=department, inline=True)
        embed.add_field(name="📋 Удостоверение + Причина", value=details, inline=False)
        embed.add_field(name="💬 Discord", value=f"{interaction.user.mention} ({interaction.user})", inline=False)
        embed.set_thumbnail(url=interaction.user.display_avatar.url)
        embed.set_footer(text="Росгвардия RMRP Арбат • Система подачи заявок")
        embed.timestamp = discord.utils.utcnow()

        review_view = ApplicationReviewView(
            applicant_id=interaction.user.id,
            app_data=app_data
        )

        await review_channel.send(embed=embed, view=review_view)
        logger.info(f"Gov application from {interaction.user} ({clean_id}) sent to review channel")

    async def on_error(self, interaction: discord.Interaction, error: Exception) -> None:
        await _handle_modal_error(interaction, error, "GovApplicationModal")


class TransferApplicationModal(Modal):
    """Separate form for Transfer/Restoration applications."""

    def __init__(self):
        super().__init__(title="Заявка — Перевод/Восстановление", timeout=300)

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
            default="Рядовой",
            max_length=50,
        )
        self.links_input = TextInput(
            label="Ссылки (удостоверение + одобрение РП)",
            placeholder="Ссылка на фото удостоверения\nСсылка на одобрение РП перевода",
            required=True,
            style=discord.TextStyle.paragraph,
            max_length=500,
        )
        self.military_id_input = TextInput(
            label="Наличие военного билета (Да / Нет)",
            placeholder="Да или Нет",
            required=True,
            max_length=10,
        )

        self.add_item(self.name_input)
        self.add_item(self.static_id_input)
        self.add_item(self.rank_input)
        self.add_item(self.links_input)
        self.add_item(self.military_id_input)

    async def on_submit(self, interaction: discord.Interaction):
        name = self.name_input.value.strip()
        raw_static_id = self.static_id_input.value.strip()
        rank = self.rank_input.value.strip() or "Рядовой"
        links = self.links_input.value.strip()
        military_id_raw = self.military_id_input.value.strip().lower()
        has_military_id = military_id_raw in ("да", "yes", "есть", "+", "1")

        clean_id = validate_static_id(raw_static_id)
        if not clean_id:
            await interaction.response.send_message(
                "❌ **Ошибка:** Статик ID должен содержать 6 цифр (например: 123-456 или 123456).",
                ephemeral=True
            )
            return

        formatted_id = f"{clean_id[:3]}-{clean_id[3:]}"

        app_data = {
            "discord_user_id": str(interaction.user.id),
            "discord_username": interaction.user.display_name,
            "category": "transfer",
            "name": name,
            "static_id": clean_id,
            "formatted_id": formatted_id,
            "reason": "Перевод/Восстановление",
            "rank": rank,
            "links": links,
            "has_military_id": has_military_id,
            "status": "pending",
        }

        app_key = f"application:{interaction.user.id}"
        try:
            redis_conn = await interaction.client.get_redis()
            await redis_conn.set(app_key, json.dumps(app_data), ex=86400 * 7)
        except Exception as e:
            logger.error(f"Redis error saving application: {e}")
            await interaction.response.send_message(
                "❌ **Ошибка:** Не удалось сохранить заявку. Попробуйте позже.",
                ephemeral=True
            )
            return

        await interaction.response.send_message(
            "✅ **Заявка на перевод/восстановление отправлена!**\n"
            "Ваша заявка передана на рассмотрение руководству.\n\nОжидайте решения.",
            ephemeral=True
        )

        review_channel = interaction.client.get_channel(int(APPLICATIONS_CHANNEL_ID)) if APPLICATIONS_CHANNEL_ID else None
        if not review_channel:
            logger.error(f"Applications channel {APPLICATIONS_CHANNEL_ID} not found!")
            return

        embed = discord.Embed(
            title="🔄 ЗАЯВКА НА ПЕРЕВОД / ВОССТАНОВЛЕНИЕ",
            description="Поступила новая заявка на перевод/восстановление.",
            color=0xf39c12
        )
        embed.add_field(name="👤 Имя Фамилия", value=name, inline=True)
        embed.add_field(name="🆔 Статик ID", value=formatted_id, inline=True)
        embed.add_field(name="⭐ Звание", value=rank, inline=True)
        embed.add_field(name="🪪 Военный билет", value="✅ Есть" if has_military_id else "❌ Нет", inline=True)
        embed.add_field(name="🔗 Ссылки", value=links, inline=False)
        embed.add_field(name="💬 Discord", value=f"{interaction.user.mention} ({interaction.user})", inline=False)
        embed.set_thumbnail(url=interaction.user.display_avatar.url)
        embed.set_footer(text="Росгвардия RMRP Арбат • Система подачи заявок")
        embed.timestamp = discord.utils.utcnow()

        review_view = ApplicationReviewView(
            applicant_id=interaction.user.id,
            app_data=app_data
        )

        await review_channel.send(embed=embed, view=review_view)
        logger.info(f"Transfer application from {interaction.user} ({clean_id}) sent to review channel")

    async def on_error(self, interaction: discord.Interaction, error: Exception) -> None:
        await _handle_modal_error(interaction, error, "TransferApplicationModal")


class ApplicationModal(Modal):
    """Form for filling out application details."""

    def __init__(self, category: str):
        super().__init__(title=f"Заявка — {CATEGORY_OPTIONS.get(category, category)}", timeout=300)
        self.category = category

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
        self.reason_input = TextInput(
            label="Причина",
            placeholder="Электронная заявка / Собеседование",
            required=True,
            max_length=200,
        )
        self.rank_input = TextInput(
            label="Звание",
            placeholder="Рядовой",
            required=True,
            default="Рядовой",
            max_length=50,
        )
        self.military_id_input = TextInput(
            label="Наличие военного билета (Да / Нет)",
            placeholder="Да или Нет",
            required=True,
            max_length=10,
        )

        self.add_item(self.name_input)
        self.add_item(self.static_id_input)
        self.add_item(self.reason_input)
        self.add_item(self.rank_input)
        self.add_item(self.military_id_input)

    async def on_submit(self, interaction: discord.Interaction):
        name = self.name_input.value.strip()
        raw_static_id = self.static_id_input.value.strip()
        reason = self.reason_input.value.strip()
        rank = self.rank_input.value.strip() or "Рядовой"
        military_id_raw = self.military_id_input.value.strip().lower()
        has_military_id = military_id_raw in ("да", "yes", "есть", "+", "1")

        clean_id = validate_static_id(raw_static_id)
        if not clean_id:
            await interaction.response.send_message(
                "❌ **Ошибка:** Статик ID должен содержать 6 цифр (например: 123-456 или 123456).",
                ephemeral=True
            )
            return

        # Format static_id as XXX-XXX
        formatted_id = f"{clean_id[:3]}-{clean_id[3:]}"

        # Store application data in Redis
        app_data = {
            "discord_user_id": str(interaction.user.id),
            "discord_username": interaction.user.display_name,
            "category": self.category,
            "name": name,
            "static_id": clean_id,
            "formatted_id": formatted_id,
            "reason": reason,
            "rank": rank,
            "has_military_id": has_military_id,
            "status": "pending",
        }

        app_key = f"application:{interaction.user.id}"

        try:
            redis_conn = await interaction.client.get_redis()
            await redis_conn.set(app_key, json.dumps(app_data), ex=86400 * 7)  # TTL: 7 days
        except Exception as e:
            logger.error(f"Redis error saving application: {e}")
            await interaction.response.send_message(
                "❌ **Ошибка:** Не удалось сохранить заявку. Попробуйте позже.",
                ephemeral=True
            )
            return

        # Notify user
        await interaction.response.send_message(
            f"✅ **Заявка отправлена!**\nВаша заявка на **{CATEGORY_OPTIONS.get(self.category, self.category)}** "
            f"передана на рассмотрение руководству.\n\nОжидайте решения.",
            ephemeral=True
        )

        # Publish application to review channel
        review_channel = interaction.client.get_channel(int(APPLICATIONS_CHANNEL_ID)) if APPLICATIONS_CHANNEL_ID else None
        if not review_channel:
            logger.error(f"Applications channel {APPLICATIONS_CHANNEL_ID} not found!")
            return

        category_label = CATEGORY_OPTIONS.get(self.category, self.category)

        embed = discord.Embed(
            title="📋 НОВАЯ ЗАЯВКА НА ВСТУПЛЕНИЕ",
            description=f"Поступила новая заявка на рассмотрение.",
            color=0x3498db
        )
        embed.add_field(name="👤 Имя Фамилия", value=name, inline=True)
        embed.add_field(name="🆔 Статик ID", value=formatted_id, inline=True)
        embed.add_field(name="📂 Категория", value=category_label, inline=True)
        embed.add_field(name="⭐ Звание", value=rank, inline=True)
        embed.add_field(name="🪪 Военный билет", value="✅ Есть" if has_military_id else "❌ Нет", inline=True)
        embed.add_field(name="📝 Причина", value=reason, inline=False)
        embed.add_field(name="💬 Discord", value=f"{interaction.user.mention} ({interaction.user})", inline=False)
        embed.set_thumbnail(url=interaction.user.display_avatar.url)
        embed.set_footer(text='AVN Academy')
        embed.timestamp = discord.utils.utcnow()

        review_view = ApplicationReviewView(
            applicant_id=interaction.user.id,
            app_data=app_data
        )

        await review_channel.send(embed=embed, view=review_view)
        logger.info(f"Application from {interaction.user} ({clean_id}) sent to review channel")

    async def on_error(self, interaction: discord.Interaction, error: Exception) -> None:
        await _handle_modal_error(interaction, error, "ApplicationModal")


class ApplicationReviewView(View):
    """Review buttons: Accept / Reject / Request revision."""

    def __init__(self, applicant_id: int, app_data: dict):
        super().__init__(timeout=None)
        self.applicant_id = applicant_id
        self.app_data = app_data

        # Use applicant ID in custom_id so buttons persist across restarts
        uid = str(applicant_id)

        accept_btn = Button(label="✅ Принять", style=discord.ButtonStyle.green, custom_id=f"app:accept:{uid}")
        accept_btn.callback = self.accept_callback
        self.add_item(accept_btn)

        reject_btn = Button(label="❌ Отклонить", style=discord.ButtonStyle.red, custom_id=f"app:reject:{uid}")
        reject_btn.callback = self.reject_callback
        self.add_item(reject_btn)

        revise_btn = Button(label="🔄 Доработка", style=discord.ButtonStyle.grey, custom_id=f"app:revise:{uid}")
        revise_btn.callback = self.revise_callback
        self.add_item(revise_btn)

    async def _check_admin(self, interaction: discord.Interaction) -> bool:
        """Check if user has admin/instructor permissions."""
        if interaction.user.guild_permissions.administrator:
            return True
        allowed = ["instructor", "инструктор", "офицер", "руководство", "chief", "head", "senior"]
        for role in interaction.user.roles:
            if any(kw in role.name.lower() for kw in allowed):
                return True
        await interaction.response.send_message("❌ У вас нет прав для рассмотрения заявок.", ephemeral=True)
        return False

    async def _load_app_data(self, interaction: discord.Interaction) -> dict | None:
        """Load application data from Redis."""
        try:
            redis_conn = await interaction.client.get_redis()
            data = await redis_conn.get(f"application:{self.applicant_id}")
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Redis error loading application: {e}")
        return self.app_data  # fallback to stored data

    async def accept_callback(self, interaction: discord.Interaction):
        if not await self._check_admin(interaction):
            return

        await interaction.response.defer(ephemeral=True)

        app = await self._load_app_data(interaction)
        if not app:
            await interaction.followup.send("❌ Данные заявки не найдены.", ephemeral=True)
            return

        guild = interaction.guild
        member = guild.get_member(int(app["discord_user_id"]))
        if not member:
            try:
                member = await guild.fetch_member(int(app["discord_user_id"]))
            except discord.NotFound:
                await interaction.followup.send("❌ Пользователь не найден на сервере.", ephemeral=True)
                return

        errors = []

        # 1. Assign roles
        roles_to_add = []
        if VERIFIED_ROLE_ID:
            verified_role = guild.get_role(int(VERIFIED_ROLE_ID))
            if verified_role:
                roles_to_add.append(verified_role)

        category = app.get("category", "")

        # For cadets — assign specific roles
        if category == "cadet":
            cadet_role_ids = [
                "1520487614719852706",
                "1517478040886575144",
                "1520547656487927838",
                "1520547899950370909",
            ]
            # Role 1520547739111264357 only if applicant has military ID
            if app.get("has_military_id", False):
                cadet_role_ids.append("1520547739111264357")
            for rid in cadet_role_ids:
                r = guild.get_role(int(rid))
                if r:
                    roles_to_add.append(r)
        elif category == "transfer":
            transfer_role_ids = [
                "1520487614719852706",
                "1520547656487927838",
                "1520547814273454160",
                "1520547899950370909",
            ]
            # Role 1520547739111264357 only if applicant has military ID
            if app.get("has_military_id", False):
                transfer_role_ids.append("1520547739111264357")
            for rid in transfer_role_ids:
                r = guild.get_role(int(rid))
                if r:
                    roles_to_add.append(r)
        elif category == "gov":
            gov_role = guild.get_role(1520557087313100901)
            if gov_role:
                roles_to_add.append(gov_role)
        else:
            # Other categories use the CATEGORY_ROLE_MAP
            category_role_id = CATEGORY_ROLE_MAP.get(category, "")
            if category_role_id:
                cat_role = guild.get_role(int(category_role_id))
                if cat_role:
                    roles_to_add.append(cat_role)

        if roles_to_add:
            try:
                await member.add_roles(*roles_to_add, reason="Заявка принята")
            except discord.Forbidden:
                errors.append("⚠️ Не удалось выдать роли (недостаточно прав)")
            except Exception as e:
                errors.append(f"⚠️ Ошибка выдачи ролей: {e}")

        # 2. Change nickname
        name = app.get("name", "")
        rank = app.get("rank", "Рядовой")
        formatted_id = app.get("formatted_id", app.get("static_id", ""))
        if category == "cadet":
            new_nick = f"Курсант | {name} | {formatted_id}"
        else:
            new_nick = f"[{rank}] {name} | {formatted_id}"
        if len(new_nick) > 32:
            new_nick = new_nick[:32]  # Discord limit

        try:
            await member.edit(nick=new_nick, reason="Заявка принята")
        except discord.Forbidden:
            errors.append("⚠️ Не удалось изменить ник (недостаточно прав или владелец сервера)")
        except Exception as e:
            errors.append(f"⚠️ Ошибка смены ника: {e}")

        # 3. Send welcome DM
        try:
            welcome_embed = discord.Embed(
                title="🎉 Добро пожаловать в Академию!",
                description=(
                    "Ваша заявка была **одобрена**!\n\n"
                    "🌐 Сайт:\n"
                    "**avn-academy.ru**\n"
                    "**avn-academy-training-netlify-app.ru**"
                ),
                color=0x2ecc71
            )
            welcome_embed.set_footer(text='AVN Academy')
            welcome_embed.timestamp = discord.utils.utcnow()
            await member.send(embed=welcome_embed)
        except discord.Forbidden:
            errors.append("⚠️ Не удалось отправить ЛС (закрыты личные сообщения)")
        except Exception as e:
            errors.append(f"⚠️ Ошибка отправки ЛС: {e}")

        # 5. Update original message
        embed = interaction.message.embeds[0] if interaction.message.embeds else discord.Embed()
        embed.color = 0x2ecc71
        embed.title = "✅ ЗАЯВКА ПРИНЯТА"
        embed.add_field(
            name="Решение принял",
            value=f"{interaction.user.mention} ({interaction.user.display_name})",
            inline=False
        )

        for item in self.children:
            item.disabled = True
        await interaction.message.edit(embed=embed, view=self)

        # Clean up Redis
        try:
            redis_conn = await interaction.client.get_redis()
            await redis_conn.delete(f"application:{self.applicant_id}")
        except Exception:
            pass

        status = "✅ Заявка принята!"
        if errors:
            status += "\n\n**Предупреждения:**\n" + "\n".join(errors)
        await interaction.followup.send(status, ephemeral=True)
        logger.info(f"Application accepted for {app.get('name')} by {interaction.user}")

    async def reject_callback(self, interaction: discord.Interaction):
        if not await self._check_admin(interaction):
            return

        await interaction.response.defer(ephemeral=True)

        app = await self._load_app_data(interaction)
        guild = interaction.guild
        member = guild.get_member(int(app["discord_user_id"])) if app else None

        # Notify applicant
        if member:
            try:
                reject_embed = discord.Embed(
                    title="❌ Заявка отклонена",
                    description="К сожалению, ваша заявка на вступление была отклонена.\nОбратитесь к руководству для уточнения причины.",
                    color=0xe74c3c
                )
                reject_embed.set_footer(text='AVN Academy')
                reject_embed.timestamp = discord.utils.utcnow()
                await member.send(embed=reject_embed)
            except discord.Forbidden:
                pass

        # Update message
        embed = interaction.message.embeds[0] if interaction.message.embeds else discord.Embed()
        embed.color = 0xe74c3c
        embed.title = "❌ ЗАЯВКА ОТКЛОНЕНА"
        embed.add_field(name="Решение принял", value=f"{interaction.user.mention}", inline=False)

        for item in self.children:
            item.disabled = True
        await interaction.message.edit(embed=embed, view=self)

        # Clean up Redis
        try:
            redis_conn = await interaction.client.get_redis()
            await redis_conn.delete(f"application:{self.applicant_id}")
        except Exception:
            pass

        await interaction.followup.send("✅ Заявка отклонена.", ephemeral=True)
        logger.info(f"Application rejected for user {self.applicant_id} by {interaction.user}")

    async def revise_callback(self, interaction: discord.Interaction):
        if not await self._check_admin(interaction):
            return

        await interaction.response.defer(ephemeral=True)

        app = await self._load_app_data(interaction)
        guild = interaction.guild
        member = guild.get_member(int(app["discord_user_id"])) if app else None

        if member:
            try:
                revise_embed = discord.Embed(
                    title="🔄 Требуется доработка заявки",
                    description=(
                        "Ваша заявка требует корректировки.\n"
                        "Пожалуйста, подайте заявку заново с исправленными данными."
                    ),
                    color=discord.Color.orange()
                )
                await member.send(embed=revise_embed)
            except discord.Forbidden:
                pass

        embed = interaction.message.embeds[0] if interaction.message.embeds else discord.Embed()
        embed.color = discord.Color.orange()
        embed.title = "🔄 ЗАПРОШЕНА ДОРАБОТКА"
        embed.add_field(name="Запросил", value=f"{interaction.user.mention}", inline=False)

        for item in self.children:
            item.disabled = True
        await interaction.message.edit(embed=embed, view=self)

        # Clean up Redis
        try:
            redis_conn = await interaction.client.get_redis()
            await redis_conn.delete(f"application:{self.applicant_id}")
        except Exception:
            pass

        await interaction.followup.send("✅ Запрос на доработку отправлен.", ephemeral=True)


# ═══════════════════════════════════════════════════════
# BOT CLIENT
# ═══════════════════════════════════════════════════════

class AVNBotClient(discord.Client):
    """
    Discord bot for AVN Academy:
    - Sends notifications to different channels
    - Handles membership applications
    """

    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.members = True
        super().__init__(intents=intents)
        self.redis_task = None
        self.tree = app_commands.CommandTree(self)
        self.redis_pool = None

    async def get_redis(self):
        if self.redis_pool is None:
            self.redis_pool = aioredis.from_url(REDIS_URL, decode_responses=True)
        return self.redis_pool

    async def setup_hook(self):
        """Called when the bot starts, before on_ready."""
        self.redis_pool = aioredis.from_url(REDIS_URL, decode_responses=True)

        # Register persistent views so buttons work after bot restart
        self.add_view(ApplicationStartView())
        self.add_view(FactionApplicationStartView())
        self.add_view(DismissalPanelView())
        self.add_view(TransferPanelView())
        self.add_view(PromotionStartPanelView())

        # Register slash commands
        @self.tree.command(name="setup-welcome", description="Создать панель заявок в текущем канале")
        @app_commands.default_permissions(administrator=True)
        async def setup_welcome(interaction: discord.Interaction):
            embed = discord.Embed(
                title="📋 ПОДАЧА ЗАЯВКИ НА ВСТУПЛЕНИЕ",
                description=(
                    "Добро пожаловать на сервер **Росгвардия RMRP Арбат**!\n\n"
                    "Для подачи заявки на вступление нажмите кнопку ниже.\n"
                    "Вам будет предложено выбрать категорию и заполнить форму.\n\n"
                    "**Доступные категории:**\n"
                    "🎓 **Курсант АВНГ** — поступление в академию\n"
                    "🔄 **Перевод/Восстановление** — перевод из другого подразделения\n"
                    "🏛️ **Гос.Сотрудник** — государственный сотрудник\n"
                ),
                color=discord.Color.blue()
            )
            embed.set_footer(text="Росгвардия RMRP Арбат • Система подачи заявок")

            view = ApplicationStartView()
            await interaction.channel.send(embed=embed, view=view)
            await interaction.response.send_message("✅ Панель заявок создана!", ephemeral=True)

        @self.tree.command(name="setup-dismiss", description="Создать панель увольнения в текущем канале")
        @app_commands.default_permissions(administrator=True)
        async def setup_dismiss(interaction: discord.Interaction):
            embed = discord.Embed(
                title="🚨 ПОДАЧА РАПОРТА НА УВОЛЬНЕНИЕ",
                description=(
                    "Для подачи рапорта на увольнение нажмите кнопку ниже.\n\n"
                    "Вам будет предложено:\n"
                    "1️⃣ Выбрать руководителя для уведомления\n"
                    "2️⃣ Заполнить форму увольнения\n\n"
                    "⚠️ **Внимание:** после одобрения рапорта все роли будут сняты."
                ),
                color=0xe74c3c
            )
            embed.set_footer(text="Росгвардия RMRP Арбат • Система увольнений")

            view = DismissalPanelView()
            await interaction.channel.send(embed=embed, view=view)
            await interaction.response.send_message("✅ Панель увольнения создана!", ephemeral=True)

        @self.tree.command(name="setup-transfer", description="Создать панель перевода в текущем канале")
        @app_commands.default_permissions(administrator=True)
        async def setup_transfer(interaction: discord.Interaction):
            embed = discord.Embed(
                title="🔄 ПОДАЧА РАПОРТА НА ПЕРЕВОД",
                description=(
                    "Для подачи рапорта на перевод между отделами нажмите кнопку ниже.\n\n"
                    "Вам будет предложено:\n"
                    "1️⃣ Выбрать текущий и желаемый отдел\n"
                    "2️⃣ Заполнить форму рапорта на перевод\n\n"
                    "⚠️ **Внимание:** перевод требует одобрения руководства обоих отделов."
                ),
                color=0x3498db
            )
            embed.set_footer(text="Росгвардия RMRP Арбат • Система переводов")

            view = TransferPanelView()
            await interaction.channel.send(embed=embed, view=view)
            await interaction.response.send_message("✅ Панель перевода создана!", ephemeral=True)

        @self.tree.command(name="setup-promo", description="Создать панель повышения в текущем канале")
        @app_commands.default_permissions(administrator=True)
        async def setup_promo(interaction: discord.Interaction):
            embed = discord.Embed(
                title="🎖️ ПОДАЧА РАПОРТА НА ПОВЫШЕНИЕ",
                description=(
                    "Для подачи рапорта на повышение нажмите кнопку ниже.\n\n"
                    "Вам будет предложено:\n"
                    "1️⃣ Бот автоматически определит ваш текущий отдел и звание\n"
                    "2️⃣ Заполнить форму рапорта на повышение (желаемое звание, баллы, ссылки)\n\n"
                    "💾 **Система черновиков:** Вы можете сохранить свои наработки как черновик, который будет храниться 2 недели!"
                ),
                color=0xf39c12
            )
            embed.set_footer(text="Росгвардия RMRP Арбат • Система повышений")

            view = PromotionStartPanelView()
            await interaction.channel.send(embed=embed, view=view)
            await interaction.response.send_message("✅ Панель повышения создана!", ephemeral=True)


        @self.tree.command(name="my-profile", description="Показать мой профиль сотрудника")
        async def my_profile(interaction: discord.Interaction):
            profile = await api_request("GET", f"/api/faction/profile/{interaction.user.id}")
            if "error" in profile:
                view = View()
                reg_btn = Button(label="📝 Зарегистрироваться", style=discord.ButtonStyle.green)
                async def reg_callback(inter: discord.Interaction):
                    await inter.response.send_modal(RegistrationModal())
                reg_btn.callback = reg_callback
                view.add_item(reg_btn)
                await interaction.response.send_message("❌ Вы еще не зарегистрированы в базе фракции. Нажмите кнопку ниже для регистрации:", view=view, ephemeral=True)
                return

            embed = discord.Embed(title=f"👤 Профиль — {profile['name']}", color=discord.Color.blue())
            embed.add_field(name="🆔 Игровой ID", value=profile["static_id"], inline=True)
            embed.add_field(name="⭐ Звание", value=profile["rank"] or "Рядовой", inline=True)
            embed.add_field(name="📂 Отдел", value=profile["unit"] or "АВНГ", inline=True)
            embed.add_field(name="🎖️ Баллы", value=str(profile.get("points", 0)), inline=True)
            embed.add_field(name="📝 Примечание", value=profile.get("notes") or "—", inline=False)
            await interaction.response.send_message(embed=embed, ephemeral=True)

        @self.tree.command(name="warehouse", description="Отправить запрос на получение снаряжения со склада")
        async def warehouse_request(interaction: discord.Interaction):
            modal = WarehouseRequestModal()
            await interaction.response.send_modal(modal)

        @self.tree.command(name="transfer", description="Подать запрос на перевод в другой отдел")
        async def transfer_request(interaction: discord.Interaction):
            depts = await api_request("GET", "/api/faction/departments")
            profile = await api_request("GET", f"/api/faction/profile/{interaction.user.id}")
            if "error" in profile:
                await interaction.response.send_message("❌ Сначала зарегистрируйтесь в базе через /my-profile!", ephemeral=True)
                return
            
            cur_dept_id = profile.get("department", {}).get("id") if profile.get("department") else None
            
            from_depts = [d for d in depts if d["id"] == cur_dept_id] if cur_dept_id else depts
            to_depts = [d for d in depts if d["id"] != cur_dept_id]

            if not from_depts or not to_depts:
                await interaction.response.send_message("❌ Невозможно определить доступные для перевода отделы.", ephemeral=True)
                return

            view = FactionTransferView(from_depts, to_depts)
            await interaction.response.send_message("Заполните форму перевода:", view=view, ephemeral=True)

        @self.tree.command(name="dismiss", description="Подать рапорт на увольнение")
        async def dismiss_request(interaction: discord.Interaction):
            view = DismissalRoleSelectView()
            await interaction.response.send_message(
                "📋 **Подача рапорта на увольнение**\n\nВыберите руководителя для уведомления:",
                view=view,
                ephemeral=True
            )

        async def department_autocomplete(interaction: discord.Interaction, current: str) -> list[app_commands.Choice[str]]:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(f'{API_URL}/api/faction/departments') as resp:
                        if resp.status == 200:
                            depts = await resp.json()
                            choices = [app_commands.Choice(name=d['name'], value=d['name']) for d in depts if current.lower() in d['name'].lower()]
                            return choices[:25]
            except Exception:
                pass
            return [app_commands.Choice(name=n, value=n) for n in ['АВНГ','УВО','ОМОН','СОБР','УСБ'] if current.lower() in n.lower()]

        @self.tree.command(name="promo-report", description="Открыть форму подачи рапорта на повышение")
        @app_commands.autocomplete(отдел=department_autocomplete)
        async def promo_report(interaction: discord.Interaction, отдел: str):
            depts = await api_request("GET", "/api/faction/departments")
            target_dept = next((d for d in depts if d["name"].upper() == отдел.upper()), None)
            
            if target_dept and target_dept["discord_role_id"]:
                role_id = int(target_dept["discord_role_id"])
                if not any(role.id == role_id for role in interaction.user.roles):
                    await interaction.response.send_message(
                        f"❌ **Ошибка:** Вы не являетесь сотрудником отдела **{отдел}** (у вас нет соответствующей роли в Discord)!",
                        ephemeral=True
                    )
                    return

            profile = await api_request("GET", f"/api/faction/profile/{interaction.user.id}")
            if "error" in profile:
                await interaction.response.send_message("❌ Сначала зарегистрируйтесь в базе через /my-profile!", ephemeral=True)
                return

            if отдел.upper() == "АВНГ":
                await interaction.response.send_message(
                    "❌ **Внимание:** Подача рапортов для отдела **АВНГ** и курсантов производится **только через сайт**!\n"
                    "Пожалуйста, заполните рапорт в личном кабинете на сайте.",
                    ephemeral=True
                )
                return

            # Fetch settings
            settings_data = await api_request("GET", f"/api/faction/promotions/settings?unit={отдел}")
            points_config = settings_data.get("points_config", [])
            ranks_flow = settings_data.get("ranks_flow", [])

            # Check Redis for drafts
            r = await get_redis()
            draft_str = await r.get(f"draft:promo:builder:{interaction.user.id}")
            await r.close()

            draft_data = {}
            if draft_str:
                try:
                    draft_data = json.loads(draft_str)
                except Exception:
                    pass

            builder_view = PromotionReportBuilderView(
                user_id=interaction.user.id,
                dept_name=отдел,
                profile=profile,
                points_config=points_config,
                ranks_flow=ranks_flow,
                draft_data=draft_data
            )
            embed = builder_view.build_embed()
            await interaction.response.send_message(embed=embed, view=builder_view, ephemeral=True)

        # Sync commands to the guild
        if GUILD_ID:
            try:
                guild = discord.Object(id=int(GUILD_ID))
                self.tree.copy_global_to(guild=guild)
                await self.tree.sync(guild=guild)
                logger.info(f"Slash commands synced to guild {GUILD_ID}")
            except discord.errors.Forbidden as e:
                logger.warning(f"Failed to sync slash commands to guild {GUILD_ID}: {e}. Make sure the bot is invited with 'applications.commands' scope.")
            except Exception as e:
                logger.error(f"Failed to sync slash commands: {e}")

    async def on_ready(self):
        logger.info(f"Logged in as {self.user} (ID: {self.user.id})")
        if not self.redis_task or self.redis_task.done():
            self.redis_task = asyncio.create_task(self.listen_redis())
            logger.info("Started Redis notifications listener task.")

    async def on_member_join(self, member: discord.Member):
        """When a new member joins, automatically show the full application panel."""
        if member.bot:
            return

        if not WELCOME_CHANNEL_ID:
            return

        welcome_channel = self.get_channel(int(WELCOME_CHANNEL_ID))
        if not welcome_channel:
            return

        embed = discord.Embed(
            title="📋 ПОДАЧА ЗАЯВКИ НА ВСТУПЛЕНИЕ",
            description=(
                f"{member.mention}, добро пожаловать на сервер **Росгвардия RMRP Арбат**!\n\n"
                "Для получения доступа к каналам и ролям подайте заявку, "
                "нажав кнопку **«📝 Подать заявку»** ниже.\n\n"
                "**Доступные категории:**\n"
                "🎓 **Курсант АВНГ** — поступление в академию\n"
                "🔄 **Перевод/Восстановление** — перевод из другого подразделения\n"
                "🏛️ **Гос.Сотрудник** — государственный сотрудник\n"
            ),
            color=0x3498db
        )
        embed.set_thumbnail(url=member.display_avatar.url)
        embed.set_footer(text="Росгвардия RMRP Арбат • Система подачи заявок")
        embed.timestamp = discord.utils.utcnow()

        view = ApplicationStartView()
        await welcome_channel.send(content=member.mention, embed=embed, view=view)

    # ── Persistent button handler for review buttons ──
    async def on_interaction(self, interaction: discord.Interaction):
        """Handle persistent review button clicks (after bot restart)."""
        if interaction.type != discord.InteractionType.component:
            return

        custom_id = interaction.data.get("custom_id", "")

        # Handle application review buttons that lost their view after restart
        if custom_id.startswith("app:accept:") or custom_id.startswith("app:reject:") or custom_id.startswith("app:revise:"):
            parts = custom_id.split(":")
            if len(parts) == 3:
                action = parts[1]
                applicant_id = int(parts[2])

                # Load app data from Redis
                try:
                    redis_conn = await self.get_redis()
                    data = await redis_conn.get(f"application:{applicant_id}")
                    if data:
                        app_data = json.loads(data)
                    else:
                        if not interaction.response.is_done():
                            await interaction.response.send_message(
                                "❌ Данные заявки истекли. Попросите пользователя подать заявку заново.",
                                ephemeral=True
                            )
                        return
                except Exception as e:
                    logger.error(f"Error loading app data: {e}")
                    if not interaction.response.is_done():
                        await interaction.response.send_message(f"❌ Ошибка: {e}", ephemeral=True)
                    return

                # Create a new review view and delegate to the appropriate callback
                review_view = ApplicationReviewView(applicant_id, app_data)
                if action == "accept":
                    await review_view.accept_callback(interaction)
                elif action == "reject":
                    await review_view.reject_callback(interaction)
                elif action == "revise":
                    await review_view.revise_callback(interaction)
            return

        # Handle dismissal review
        if custom_id.startswith("dismiss:"):
            parts = custom_id.split(":")
            if len(parts) == 3:
                action = parts[1]
                report_id = int(parts[2])
                
                applicant_id = None
                if interaction.message.embeds:
                    embed = interaction.message.embeds[0]
                    desc = embed.description or ""
                    m = re.search(r"<@!?(\d+)>", desc)
                    if m:
                        applicant_id = int(m.group(1))

                if applicant_id:
                    review_view = DismissalReviewView(report_id, applicant_id)
                    if action == "approve":
                        await review_view.approve(interaction)
                    elif action == "reject":
                        await review_view.reject(interaction)
            return

        # Handle promotion review
        if custom_id.startswith("promo:"):
            parts = custom_id.split(":")
            if len(parts) == 3:
                action = parts[1]
                applicant_id = int(parts[2])
                
                report_details = {}
                if interaction.message.embeds:
                    embed = interaction.message.embeds[0]
                    try:
                        report_details["name"] = embed.fields[0].value
                        report_details["static_id"] = embed.fields[1].value
                        report_details["dept"] = embed.fields[2].value
                        
                        ranks_part = embed.fields[3].value.split("➡️")
                        report_details["current_rank"] = ranks_part[0].strip()
                        report_details["target_rank"] = ranks_part[1].strip()
                        report_details["points"] = embed.fields[4].value
                    except IndexError:
                        if not interaction.response.is_done():
                            await interaction.response.send_message('Ошибка: формат сообщения повреждён', ephemeral=True)
                        return
                
                review_view = PromotionReviewView(applicant_id, report_details)
                if action == "approve":
                    await review_view.approve(interaction)
                elif action == "reject":
                    await review_view.reject(interaction)
            return

        # Handle transfers approval
        if custom_id.startswith("trans:"):
            parts = custom_id.split(":")
            if len(parts) == 3:
                action = parts[1]
                transfer_id = int(parts[2])
                
                employee_id = None
                from_name = ""
                to_name = ""
                if interaction.message.embeds:
                    embed = interaction.message.embeds[0]
                    desc = embed.description or ""
                    m_emp = re.search(r"<@!?(\d+)>", desc)
                    if m_emp:
                        employee_id = int(m_emp.group(1))
                    
                    try:
                        from_name = embed.fields[0].value
                        to_name = embed.fields[1].value
                    except IndexError:
                        if not interaction.response.is_done():
                            await interaction.response.send_message('Ошибка: формат сообщения повреждён', ephemeral=True)
                        return

                if employee_id:
                    review_view = TransferApprovalView(transfer_id, employee_id, from_name, to_name)
                    if action == "send":
                        await review_view.approve_sender(interaction)
                    elif action == "recv":
                        await review_view.approve_receiver(interaction)
                    elif action == "rej":
                        await review_view.reject(interaction)
            return

        # Handle faction application review (rmrp_app:accept / rmrp_app:reject)
        if custom_id.startswith("rmrp_app:accept:") or custom_id.startswith("rmrp_app:reject:"):
            parts = custom_id.split(":")
            if len(parts) == 3:
                action = parts[1]
                applicant_id = int(parts[2])

                # Load app data from Redis
                try:
                    redis_conn = await self.get_redis()
                    data = await redis_conn.get(f"faction_application:{applicant_id}")
                    if data:
                        app_data = json.loads(data)
                    else:
                        # Try to extract from embed fields
                        app_data = {}
                        if interaction.message.embeds:
                            embed = interaction.message.embeds[0]
                            try:
                                app_data["name"] = embed.fields[0].value
                                app_data["static_id"] = embed.fields[1].value
                            except IndexError:
                                pass
                        app_data["discord_user_id"] = str(applicant_id)
                except Exception as e:
                    logger.error(f"Error loading faction app data: {e}")
                    if not interaction.response.is_done():
                        await interaction.response.send_message(f"❌ Ошибка: {e}", ephemeral=True)
                    return

                if action == "accept":
                    await interaction.response.defer(ephemeral=True)
                    errors = []

                    # Register via faction API
                    try:
                        async with aiohttp.ClientSession() as session:
                            resp = await session.post(
                                f"{API_URL}/api/faction/register",
                                headers={"X-Bot-Secret": BOT_SECRET, "Content-Type": "application/json"},
                                json={
                                    "static_id": app_data.get("static_id", ""),
                                    "name": app_data.get("name", ""),
                                    "rank": app_data.get("rank", "Рядовой"),
                                    "discord_id": app_data.get("discord_user_id", str(applicant_id)),
                                },
                                timeout=aiohttp.ClientTimeout(total=10)
                            )
                            try:
                                result = await resp.json(content_type=None)
                            except Exception:
                                result = {"detail": await resp.text()}
                            if resp.status == 200:
                                logger.info(f"Faction user registered: {result}")
                            else:
                                detail = result.get("detail", f"HTTP {resp.status}")
                                errors.append(f"⚠️ API: {detail}")
                    except Exception as e:
                        errors.append(f"⚠️ Ошибка регистрации во фракции: {e}")

                    # Update embed
                    embed = interaction.message.embeds[0] if interaction.message.embeds else discord.Embed()
                    embed.color = 0x2ecc71
                    embed.title = "✅ ЗАЯВКА ВО ФРАКЦИЮ ПРИНЯТА"
                    embed.add_field(
                        name="Решение принял",
                        value=f"{interaction.user.mention} ({interaction.user.display_name})",
                        inline=False
                    )
                    embed.set_footer(text='AVN Academy')
                    embed.timestamp = discord.utils.utcnow()

                    # Disable buttons
                    view = View()
                    if interaction.message.components:
                        for row in interaction.message.components:
                            for comp in row.children:
                                btn = Button(label=comp.label, style=comp.style, custom_id=comp.custom_id, disabled=True)
                                view.add_item(btn)
                    await interaction.message.edit(embed=embed, view=view)

                    # Notify applicant
                    guild = interaction.guild
                    member = guild.get_member(applicant_id) if guild else None
                    if not member and guild:
                        try:
                            member = await guild.fetch_member(applicant_id)
                        except discord.NotFound:
                            pass
                    if member:
                        try:
                            dm_embed = discord.Embed(
                                title="🎉 Заявка во фракцию одобрена!",
                                description="Ваша заявка была принята. Добро пожаловать!",
                                color=0x2ecc71
                            )
                            dm_embed.set_footer(text='AVN Academy')
                            dm_embed.timestamp = discord.utils.utcnow()
                            await member.send(embed=dm_embed)
                        except discord.Forbidden:
                            errors.append("⚠️ Не удалось отправить ЛС")

                    # Clean up Redis
                    try:
                        redis_conn = await self.get_redis()
                        await redis_conn.delete(f"faction_application:{applicant_id}")
                    except Exception:
                        pass

                    status = "✅ Заявка во фракцию принята!"
                    if errors:
                        status += "\n\n**Предупреждения:**\n" + "\n".join(errors)
                    await interaction.followup.send(status, ephemeral=True)

                elif action == "reject":
                    await interaction.response.defer(ephemeral=True)

                    # Notify applicant
                    guild = interaction.guild
                    member = guild.get_member(applicant_id) if guild else None
                    if not member and guild:
                        try:
                            member = await guild.fetch_member(applicant_id)
                        except discord.NotFound:
                            pass
                    if member:
                        try:
                            dm_embed = discord.Embed(
                                title="❌ Заявка во фракцию отклонена",
                                description="К сожалению, ваша заявка была отклонена.",
                                color=0xe74c3c
                            )
                            dm_embed.set_footer(text='AVN Academy')
                            dm_embed.timestamp = discord.utils.utcnow()
                            await member.send(embed=dm_embed)
                        except discord.Forbidden:
                            pass

                    # Update embed
                    embed = interaction.message.embeds[0] if interaction.message.embeds else discord.Embed()
                    embed.color = 0xe74c3c
                    embed.title = "❌ ЗАЯВКА ВО ФРАКЦИЮ ОТКЛОНЕНА"
                    embed.add_field(name="Решение принял", value=f"{interaction.user.mention}", inline=False)
                    embed.set_footer(text='AVN Academy')
                    embed.timestamp = discord.utils.utcnow()

                    view = View()
                    if interaction.message.components:
                        for row in interaction.message.components:
                            for comp in row.children:
                                btn = Button(label=comp.label, style=comp.style, custom_id=comp.custom_id, disabled=True)
                                view.add_item(btn)
                    await interaction.message.edit(embed=embed, view=view)

                    # Clean up Redis
                    try:
                        redis_conn = await self.get_redis()
                        await redis_conn.delete(f"faction_application:{applicant_id}")
                    except Exception:
                        pass

                    await interaction.followup.send("✅ Заявка во фракцию отклонена.", ephemeral=True)
            return

        # Handle warehouse request
        if custom_id.startswith("wh:"):
            parts = custom_id.split(":")
            if len(parts) == 3:
                action = parts[1]
                request_id = int(parts[2])
                
                employee_id = None
                if interaction.message.embeds:
                    embed = interaction.message.embeds[0]
                    desc = embed.description or ""
                    m_emp = re.search(r"<@!?(\d+)>", desc)
                    if m_emp:
                        employee_id = int(m_emp.group(1))

                if employee_id:
                    review_view = WarehouseRequestReviewView(request_id, employee_id, [])
                    if action == "app":
                        await review_view.approve(interaction)
                    elif action == "rej":
                        await review_view.reject(interaction)
            return


    # ── Redis notification listener (unchanged) ──

    async def listen_redis(self):
        logger.info(f"Connecting to Redis at {REDIS_URL}...")
        backoff = 5
        while True:
            try:
                redis_conn = await self.get_redis()
                pubsub = redis_conn.pubsub()
                await pubsub.subscribe("discord_notifications")
                logger.info("Subscribed to 'discord_notifications'. Listening...")
                backoff = 5  # reset on successful connection

                async for message in pubsub.listen():
                    if message["type"] == "message":
                        try:
                            payload = json.loads(message["data"])
                            await self.handle_notification(payload)
                        except json.JSONDecodeError:
                            logger.error(f"Invalid JSON: {message['data']}")
                        except Exception as ex:
                            logger.error(f"Error handling notification: {ex}", exc_info=True)
            except Exception as conn_err:
                logger.error(f"Redis connection error: {conn_err}. Retrying in {backoff}s...")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60)  # cap at 60 seconds

    def get_target_channel(self, data: dict, fallback_type: str = "requests"):
        channel_type = data.get("channel_type") or fallback_type
        channel_id = resolve_channel_id(channel_type)
        if not channel_id:
            return None
        channel = self.get_channel(int(channel_id))
        if not channel:
            logger.error(f"Could not find channel {channel_id} for type '{channel_type}'")
        return channel

    async def handle_notification(self, payload: dict):
        event_type = payload.get("event_type") or payload.get("type")
        data = payload.get("data", {})

        TYPE_LABELS = {
            "lecture": "Лекция 📖",
            "practice": "Практическая тренировка 🎯",
            "exam": "Экзамен 🎓"
        }

        if event_type == "generic_embed":
            channel = self.get_target_channel(data)
            if not channel:
                return
            title = data.get("title", "")
            description = data.get("description", "")
            color = data.get("color", 3447003)
            content = data.get("content")

            # Try to route promotion_reviewed to original Discord message instead of web link
            if data.get("channel_type") == "promotion_reviewed" and "report_id" in data:
                report_id = data["report_id"]
                try:
                    redis_conn = await self.get_redis()
                    msg_id = await redis_conn.get(f"promotion_message_id:{report_id}")
                    if msg_id:
                        promo_chan_id = resolve_channel_id("promotion")
                        discord_link = f"https://discord.com/channels/{GUILD_ID}/{promo_chan_id}/{msg_id}"
                        import re
                        description = re.sub(r'\[рапорту\]\([^)]+\)', f'[рапорту]({discord_link})', description)
                        logger.info(f"Replaced web link in review embed with Discord message link: {discord_link}")
                except Exception as ex:
                    logger.error(f"Error fetching message ID from Redis: {ex}")

            embed = discord.Embed(title=title, description=description, color=color)
            for f in data.get("fields", []):
                embed.add_field(name=f["name"], value=f["value"], inline=f.get("inline", False))
            embed.set_footer(text="Академия Росгвардии AVNG")
            
            message = await channel.send(content=content, embed=embed) if content else await channel.send(embed=embed)
            logger.info(f"Notification sent to #{channel.name}: {title}")

            # Store the message ID when a new promotion report is submitted
            if data.get("channel_type") == "promotion" and "report_id" in data:
                report_id = data["report_id"]
                try:
                    redis_conn = await self.get_redis()
                    await redis_conn.set(f"promotion_message_id:{report_id}", str(message.id), ex=86400 * 30)  # 30 days TTL
                    logger.info(f"Saved Discord message ID {message.id} for report {report_id} to Redis")
                except Exception as ex:
                    logger.error(f"Error saving message ID to Redis: {ex}")
            return

        if event_type == "request_created":
            channel = self.get_target_channel(data, fallback_type="requests")
            if not channel:
                return
            req_id = data.get("request_id")
            name = data.get("user_name")
            static_id = data.get("user_static_id")
            req_t = data.get("type", "lecture")
            subject = data.get("subject", "")
            label = TYPE_LABELS.get(req_t, req_t)
            embed = discord.Embed(
                title="📥 НОВЫЙ ЗАПРОС КУРСАНТА",
                description="Курсант подал заявку на прохождение учебного блока.\n**Одобрите или отклоните запрос на сайте.**",
                color=0x3498db
            )
            embed.add_field(name="Курсант", value=f"{name} ({static_id})", inline=True)
            embed.add_field(name="Тип занятия", value=label, inline=True)
            embed.add_field(name="Тема / Блок", value=subject, inline=False)
            embed.set_footer(text='AVN Academy')
            embed.timestamp = discord.utils.utcnow()
            await channel.send(embed=embed)
            logger.info(f"Request notification sent to #{channel.name} for ID {req_id}")

        elif event_type == "promotion_submitted":
            channel = self.get_target_channel(data, fallback_type="requests")
            if not channel:
                return
            embed = discord.Embed(
                title="🎖️ ПОДАН РАПОРТ НА ПОВЫШЕНИЕ",
                description="Курсант подал рапорт на проверку успеваемости.\n**Одобрите рапорт на сайте.**",
                color=0xf39c12
            )
            embed.add_field(name="Курсант", value=f"{data.get('user_name')} ({data.get('user_static_id')})", inline=False)
            embed.add_field(name="Текущее звание", value=data.get("from_rank", "—"), inline=True)
            embed.add_field(name="Новое звание", value=data.get("to_rank", "—"), inline=True)
            embed.set_footer(text='AVN Academy')
            embed.timestamp = discord.utils.utcnow()
            await channel.send(embed=embed)

        elif event_type == "alert_inactive":
            channel = self.get_target_channel(data, fallback_type="requests")
            if not channel:
                return
            embed = discord.Embed(title="⚠️ КУРСАНТ НЕАКТИВЕН", description="Авто-мониторинг зафиксировал отсутствие активности.", color=0xf39c12)
            embed.add_field(name="Курсант", value=f"{data.get('user_name')} ({data.get('user_static_id')})", inline=True)
            embed.add_field(name="Период", value=f"{data.get('days_inactive')} дн.", inline=True)
            embed.set_footer(text='AVN Academy')
            embed.timestamp = discord.utils.utcnow()
            await channel.send(embed=embed)

        elif event_type == "alert_failed_consecutive":
            channel = self.get_target_channel(data, fallback_type="exams_report")
            if not channel:
                return
            embed = discord.Embed(title="🚨 КРИТИЧЕСКИЙ СБОЙ УСПЕВАЕМОСТИ", description="Курсант завалил тест несколько раз подряд.", color=0xe74c3c)
            embed.add_field(name="Курсант", value=f"{data.get('user_name')} ({data.get('user_static_id')})", inline=True)
            embed.add_field(name="Попыток подряд", value=f"{data.get('attempts', 3)} раз", inline=True)
            embed.set_footer(text='AVN Academy')
            embed.timestamp = discord.utils.utcnow()
            await channel.send(embed=embed)

        else:
            logger.warning(f"Unknown event_type: {event_type}")


async def main():
    if not TOKEN:
        logger.error("DISCORD_BOT_TOKEN not set. Exiting.")
        return
    bot = AVNBotClient()
    try:
        await bot.start(TOKEN)
    except KeyboardInterrupt:
        await bot.close()


if __name__ == "__main__":
    asyncio.run(main())

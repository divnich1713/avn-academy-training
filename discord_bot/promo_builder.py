import discord
from discord.ui import View, Select, Button, Modal, TextInput
import json
import logging
from datetime import datetime, timezone
from faction_views import api_request, get_redis

logger = logging.getLogger("promo_builder")

class ActivityInputModal(Modal):
    def __init__(self, activity_num: int, activity_name: str, parent_view: 'PromotionReportBuilderView', initial_count: str = "", initial_links: str = ""):
        super().__init__(title=f"Добавить: {activity_name[:20]}")
        self.activity_num = activity_num
        self.parent_view = parent_view

        self.count_input = TextInput(
            label="Количество выполненных раз",
            placeholder="Например: 5",
            default=initial_count,
            required=True
        )
        self.links_input = TextInput(
            label="Ссылки на скриншоты (по одной на строке)",
            placeholder="1. https://imgur.com/...\n2. https://imgur.com/...",
            default=initial_links,
            style=discord.TextStyle.paragraph,
            required=True
        )
        self.add_item(self.count_input)
        self.add_item(self.links_input)

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        try:
            count = int(self.count_input.value.strip())
            if count <= 0:
                raise ValueError()
        except ValueError:
            await interaction.followup.send("❌ **Ошибка:** Количество должно быть целым числом больше нуля!", ephemeral=True)
            return

        # Extract only valid URLs, ignoring numbering markers
        tokens = self.links_input.value.replace(",", " ").replace(";", " ").split()
        links = []
        for t in tokens:
            t_clean = t.strip()
            if t_clean.startswith(("http://", "https://")):
                links.append(t_clean)
            elif "." in t_clean and not t_clean.replace(".", "").isdigit():
                # Ignore list markers like '1.' or '10.'
                if not (t_clean.endswith(".") and t_clean[:-1].isdigit()):
                    links.append(t_clean)

        if len(links) < count:
            await interaction.followup.send(
                f"❌ **Ошибка:** Вы указали количество {count}, но предоставили только {len(links)} ссылок!\n"
                f"Вы указали следующие ссылки:\n" + "\n".join(f"{i+1}. {lnk}" for i, lnk in enumerate(links)) + "\n"
                f"Пожалуйста, заполните ссылки рядом с номерами (например, '1. https://...').",
                ephemeral=True
            )
            return

        # Save to parent view state
        self.parent_view.add_activity_data(self.activity_num, count, links)
        await self.parent_view.update_message(interaction)


class PromotionReportBuilderView(View):
    def __init__(self, user_id: int, dept_name: str, profile: dict, points_config: list, ranks_flow: list, draft_data: dict = None):
        super().__init__(timeout=600)
        self.user_id = user_id
        self.dept_name = dept_name
        self.profile = profile
        self.points_config = points_config
        self.ranks_flow = ranks_flow

        # State
        self.current_rank = profile.get("rank") or "Сержант"
        self.target_rank = draft_data.get("target_rank") if draft_data else None
        
        # Determine available target ranks
        self.available_targets = [flow["to"] for flow in self.ranks_flow if flow["from"].lower() == self.current_rank.lower()]
        if not self.available_targets:
            # Fallback to general ranks flow
            self.available_targets = [flow["to"] for flow in self.ranks_flow]
        
        if not self.target_rank and self.available_targets:
            self.target_rank = self.available_targets[0]

        # entries: list of {num, count, links}
        self.entries = draft_data.get("entries") if draft_data else []
        
        # Add components
        self.setup_components()

    def setup_components(self):
        self.clear_items()

        # 1. Target Rank Select
        if self.available_targets:
            options = [discord.SelectOption(label=t, value=t, default=(t == self.target_rank)) for t in self.available_targets[:25]]
            rank_select = Select(
                placeholder="Выберите желаемое звание...",
                options=options,
                custom_id="builder:target_rank",
                row=0
            )
            rank_select.callback = self.on_rank_select
            self.add_item(rank_select)

        # 2. Activity Select
        activity_options = []
        for act in self.points_config:
            desc = f" ({act['points']} б.)" if act.get("points") else " (практика/док)"
            label = f"{act['num']}. {act['name']}"[:80]
            activity_options.append(
                discord.SelectOption(
                    label=label,
                    value=str(act["num"]),
                    description=act.get("desc", "")[:100]
                )
            )

        # Split activities if more than 25, but usually they are less than 25 (UVO has 19)
        activity_select = Select(
            placeholder="Выберите выполненное действие...",
            options=activity_options[:25],
            custom_id="builder:add_activity",
            row=1
        )
        activity_select.callback = self.on_activity_select
        self.add_item(activity_select)

        # 3. Action Buttons
        reset_btn = Button(label="🧹 Сбросить", style=discord.ButtonStyle.red, custom_id="builder:reset", row=2)
        reset_btn.callback = self.on_reset
        self.add_item(reset_btn)

        save_btn = Button(label="💾 Сохранить черновик", style=discord.ButtonStyle.grey, custom_id="builder:save", row=2)
        save_btn.callback = self.on_save_draft
        self.add_item(save_btn)

        submit_btn = Button(label="📤 Отправить рапорт", style=discord.ButtonStyle.green, custom_id="builder:submit", row=2)
        submit_btn.callback = self.on_submit
        self.add_item(submit_btn)

    def add_activity_data(self, num: int, count: int, links: list):
        # Remove existing if any
        self.entries = [e for e in self.entries if e["num"] != num]
        self.entries.append({
            "num": num,
            "count": count,
            "successCount": 0,
            "links": links
        })

    def calculate_state(self):
        # Calculate total points
        total_points = 0
        added_text = []
        
        for e in self.entries:
            cfg = next((c for c in self.points_config if c["num"] == e["num"]), None)
            if cfg:
                pts = e["count"] * cfg.get("points", 0)
                total_points += pts
                formatted_links = []
                for idx, lnk in enumerate(e["links"]):
                    lnk_str = lnk.strip()
                    if lnk_str.startswith("http://") or lnk_str.startswith("https://"):
                        formatted_links.append(f"[№{idx + 1}]({lnk_str})")
                    else:
                        formatted_links.append(f"№{idx + 1}: {lnk_str}")
                links_str = f" (ссылки: {', '.join(formatted_links)})" if formatted_links else ""
                added_text.append(f"• **{cfg['name']}** — {e['count']} шт.{links_str} (`+{pts}` б.)")
        
        if not added_text:
            added_text.append("*Ничего не добавлено (выберите действия из меню ниже)*")

        # Check against target flow
        flow = next((f for f in self.ranks_flow if f["from"].lower() == self.current_rank.lower() and f["to"].lower() == self.target_rank.lower()), None)
        required_points = flow["points"] if flow else 0
        
        checklist_status = []
        all_completed = True
        
        if flow and "mandatory" in flow:
            for mand in flow["mandatory"]:
                num = mand["num"]
                req_count = mand["count"]
                
                # Check how many are in entries
                user_entry = next((e for e in self.entries if e["num"] == num), None)
                user_count = user_entry["count"] if user_entry else 0
                
                status_emoji = "✅" if user_count >= req_count else "❌"
                if user_count < req_count:
                    all_completed = False
                
                checklist_status.append(f"{status_emoji} `[{user_count}/{req_count}]` — {mand['name']}")
        
        # Check points requirement
        points_emoji = "✅" if total_points >= required_points else "❌"
        if total_points < required_points:
            all_completed = False
            
        checklist_status.append(f"{points_emoji} `[{total_points}/{required_points}]` — Требуемые баллы")

        return total_points, required_points, added_text, checklist_status, all_completed

    def build_embed(self):
        total_points, required_points, added_text, checklist_status, all_completed = self.calculate_state()

        embed = discord.Embed(
            title=f"🎖️ Конструктор рапорта — {self.dept_name}",
            description="Выберите желаемое звание и добавляйте выполненные активности через меню ниже.",
            color=0x3498db
        )
        embed.add_field(name="👤 Сотрудник", value=f"{self.profile.get('name')}\nID: {self.profile.get('static_id')}", inline=True)
        embed.add_field(name="📈 Текущее звание", value=self.current_rank, inline=True)
        embed.add_field(name="🎯 Желаемое звание", value=self.target_rank or "Не выбрано", inline=True)
        
        embed.add_field(name="📝 Выполненная работа", value="\n".join(added_text), inline=False)
        embed.add_field(name="📊 Критерии повышения", value="\n".join(checklist_status), inline=False)
        
        embed.set_footer(text="Росгвардия RMRP Арбат")
        embed.timestamp = datetime.now(timezone.utc)
        return embed

    async def update_message(self, interaction: discord.Interaction):
        embed = self.build_embed()
        await interaction.edit_original_response(embed=embed, view=self)

    async def on_rank_select(self, interaction: discord.Interaction):
        self.target_rank = interaction.data["values"][0]
        self.setup_components()
        await interaction.response.defer()
        await self.update_message(interaction)

    async def on_activity_select(self, interaction: discord.Interaction):
        activity_num = int(interaction.data["values"][0])
        cfg = next((c for c in self.points_config if c["num"] == activity_num), None)
        if not cfg:
            await interaction.response.send_message("❌ Ошибка: активность не найдена.", ephemeral=True)
            return

        # Find existing data in state
        existing = next((e for e in self.entries if e["num"] == activity_num), None)
        initial_count = str(existing["count"]) if existing else ""
        
        if existing:
            initial_links = "\n".join(f"{idx + 1}. {lnk}" for idx, lnk in enumerate(existing["links"]))
        else:
            initial_links = "1. \n2. \n3. \n4. \n5. "

        modal = ActivityInputModal(activity_num, cfg["name"], self, initial_count, initial_links)
        await interaction.response.send_modal(modal)

    async def on_reset(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        self.entries = []
        self.setup_components()
        await self.update_message(interaction)

    async def on_save_draft(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        draft_data = {
            "target_rank": self.target_rank,
            "entries": self.entries,
            "date": datetime.now().isoformat()
        }
        r = await get_redis()
        await r.set(f"draft:promo:builder:{self.user_id}", json.dumps(draft_data), ex=1209600)  # 14 days TTL
        await r.close()
        await interaction.followup.send("💾 Черновик успешно сохранён на 14 дней!", ephemeral=True)

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        
        total_points, required_points, _, _, all_completed = self.calculate_state()
        if not all_completed:
            await interaction.followup.send(
                "❌ **Ошибка:** Вы не выполнили все обязательные условия или не набрали нужное количество баллов!",
                ephemeral=True
            )
            return

        # Submit report to backend
        # 1. Format links and comments for payload
        links_list = []
        comment_parts = []
        
        for e in self.entries:
            cfg = next((c for c in self.points_config if c["num"] == e["num"]), None)
            if cfg:
                comment_parts.append(f"{cfg['name']}: {e['count']} шт.")
                links_list.extend(e["links"])

        submit_payload = {
            "user_id": self.profile["id"],
            "from_rank": self.current_rank,
            "to_rank": self.target_rank,
            "department": self.dept_name,
            "submitted_by_discord_id": str(interaction.user.id),
            "points": str(total_points),
            "links": ", ".join(links_list),
            "comment": "; ".join(comment_parts),
            "status": "pending"
        }

        res = await api_request("POST", "/api/faction/promotions", submit_payload)
        if "error" in res:
            await interaction.followup.send(f"❌ **Ошибка отправки:** {res['error']}", ephemeral=True)
            return

        # Auto-delete draft
        r = await get_redis()
        await r.delete(f"draft:promo:builder:{self.user_id}")
        await r.close()

        # Send finalized card to leadership channel
        DEPT_PROMOTION_CHANNELS = {
            "ОМОН": "1520585201707782164",
            "СОБР": "1520586523651870911",
            "УВО": "1520587688732917830",
        }
        channel_id = DEPT_PROMOTION_CHANNELS.get(self.dept_name)
        if channel_id:
            channel = interaction.client.get_channel(int(channel_id))
            if channel:
                # Leadership pings
                DEPT_LEADERS = {
                    "ОМОН": ["1520562814174101555", "1520562838328967219"],
                    "СОБР": ["1520562077700198570", "1520562731743313920"],
                    "УВО": ["1520561845738410034", "1520561985253675139"],
                }
                roles_to_ping = DEPT_LEADERS.get(self.dept_name, [])
                pings = " ".join([f"<@&{rid}>" for rid in roles_to_ping])

                report_embed = discord.Embed(
                    title="🎖️ ПОДАН РАПОРТ НА ПОВЫШЕНИЕ",
                    description=f"Поступил рапорт от {interaction.user.mention}.",
                    color=0x2ecc71
                )
                report_embed.add_field(name="Сотрудник", value=self.profile.get("name"), inline=True)
                report_embed.add_field(name="Статик ID", value=self.profile.get("static_id"), inline=True)
                report_embed.add_field(name="Отдел", value=self.dept_name, inline=True)
                report_embed.add_field(name="Повышение", value=f"{self.current_rank} ➡️ {self.target_rank}", inline=False)
                report_embed.add_field(name="Всего баллов", value=f"{total_points} б.", inline=True)
                
                # Format work details
                work_details = []
                for e in self.entries:
                    cfg = next((c for c in self.points_config if c["num"] == e["num"]), None)
                    if cfg:
                        formatted_links = []
                        for idx, lnk in enumerate(e["links"]):
                            lnk_str = lnk.strip()
                            if lnk_str.startswith("http://") or lnk_str.startswith("https://"):
                                formatted_links.append(f"[№{idx + 1}]({lnk_str})")
                            else:
                                formatted_links.append(f"№{idx + 1}: {lnk_str}")
                        work_details.append(f"• **{cfg['name']}** — {e['count']} шт. (ссылки: {', '.join(formatted_links)})")
                
                report_embed.add_field(name="Выполненная работа", value="\\n".join(work_details)[:1024], inline=False)
                report_embed.set_footer(text='Росгвардия RMRP Арбат')
                report_embed.timestamp = datetime.now(timezone.utc)

                # Add approve/reject buttons
                from faction_views import PromotionReviewView
                review_view = PromotionReviewView(interaction.user.id, {
                    "name": self.profile.get("name"),
                    "static_id": self.profile.get("static_id"),
                    "current_rank": self.current_rank,
                    "target_rank": self.target_rank,
                    "points": total_points,
                    "dept": self.dept_name
                })

                await channel.send(content=pings, embed=report_embed, view=review_view)

        await interaction.followup.send("🎉 **Рапорт успешно подан!** Вы выполнили все обязательные условия и набрали необходимое количество баллов. Ожидайте рассмотрения руководством.", ephemeral=True)
        # Clear view items to prevent interaction after submit
        self.clear_items()
        await interaction.edit_original_response(embed=self.build_embed(), view=self)

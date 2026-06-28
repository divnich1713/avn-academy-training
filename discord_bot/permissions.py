import discord
import os
import logging
from typing import Optional

logger = logging.getLogger("discord_bot.permissions")

# ── Role name patterns for permission levels (fallback) ──
ADMIN_ROLE_NAMES = [
    'руководство', 'admin', 'администратор', 'head', 'chief',
    'начальник', 'заместитель начальника', 'подполковник', 'полковник',
    'командир собр', 'заместитель командира собр', 'командир омон', 'заместитель командира омон'
]

INSTRUCTOR_ROLE_NAMES = [
    'инструктор', 'instructor', 'senior_instructor', 'chief_instructor',
    'старший инструктор', 'главный инструктор', 'офицер',
    'командир собр', 'заместитель командира собр', 'командир омон', 'заместитель командира омон'
]

LEADER_ROLE_NAMES = ADMIN_ROLE_NAMES + [
    'командир', 'leader', 'лидер', 'замком',
    'командир собр', 'заместитель командира собр', 'командир омон', 'заместитель командира омон'
]

ALL_STAFF_ROLE_NAMES = list(set(ADMIN_ROLE_NAMES + INSTRUCTOR_ROLE_NAMES + LEADER_ROLE_NAMES))


# ── Load role IDs from environment variables ──
def _parse_role_ids(env_var: str) -> set[int]:
    """Parse comma-separated role IDs from an environment variable."""
    raw = os.environ.get(env_var, "").strip()
    if not raw:
        return set()
    ids = set()
    for part in raw.split(","):
        part = part.strip()
        if part.isdigit():
            ids.add(int(part))
    return ids


ADMIN_ROLE_IDS = _parse_role_ids("DISCORD_ADMIN_ROLE_IDS")
INSTRUCTOR_ROLE_IDS = _parse_role_ids("DISCORD_INSTRUCTOR_ROLE_IDS")
LEADER_ROLE_IDS = _parse_role_ids("DISCORD_LEADER_ROLE_IDS")

# Log warnings if env vars are not set
if not ADMIN_ROLE_IDS:
    logger.warning(
        "DISCORD_ADMIN_ROLE_IDS is not set. Falling back to role name matching for admin checks. "
        "This is less secure — set role IDs in env vars for production."
    )
if not INSTRUCTOR_ROLE_IDS:
    logger.warning(
        "DISCORD_INSTRUCTOR_ROLE_IDS is not set. Falling back to role name matching for instructor checks."
    )
if not LEADER_ROLE_IDS:
    logger.warning(
        "DISCORD_LEADER_ROLE_IDS is not set. Falling back to role name matching for leader checks."
    )


def _has_role_by_id(member: discord.Member, role_ids: set[int]) -> bool:
    """Check if member has any role matching the given role IDs."""
    return any(role.id in role_ids for role in member.roles)


def _has_role_by_name(member: discord.Member, role_names: list[str]) -> bool:
    """Check if member has any role matching the given names (case-insensitive). Fallback method."""
    member_role_names = [r.name.lower() for r in member.roles]
    return any(rn.lower() in member_role_names for rn in role_names)


def has_any_role(member: discord.Member, role_names: list[str]) -> bool:
    """Check if member has any role matching the given names (case-insensitive).
    Kept for backward compatibility with existing call sites."""
    return _has_role_by_name(member, role_names)


def is_admin(member: discord.Member) -> bool:
    """Check if member is an administrator (by permission, role ID, or role name fallback)."""
    if member.guild_permissions.administrator:
        return True
    if ADMIN_ROLE_IDS:
        return _has_role_by_id(member, ADMIN_ROLE_IDS)
    return _has_role_by_name(member, ADMIN_ROLE_NAMES)


def is_instructor(member: discord.Member) -> bool:
    """Check if member is an instructor or higher."""
    if is_admin(member):
        return True
    if INSTRUCTOR_ROLE_IDS:
        return _has_role_by_id(member, INSTRUCTOR_ROLE_IDS)
    return _has_role_by_name(member, INSTRUCTOR_ROLE_NAMES)


def is_leader(member: discord.Member) -> bool:
    """Check if member is a leader or higher."""
    if is_admin(member):
        return True
    if LEADER_ROLE_IDS:
        return _has_role_by_id(member, LEADER_ROLE_IDS)
    return _has_role_by_name(member, LEADER_ROLE_NAMES)


def is_staff(member: discord.Member) -> bool:
    """Check if member belongs to any staff role."""
    all_ids = ADMIN_ROLE_IDS | INSTRUCTOR_ROLE_IDS | LEADER_ROLE_IDS
    if all_ids:
        return _has_role_by_id(member, all_ids)
    return _has_role_by_name(member, ALL_STAFF_ROLE_NAMES)


async def require_permission(
    interaction: discord.Interaction,
    check_fn,
    error_msg: str = '⛔ У вас нет прав для этого действия.'
) -> bool:
    """Check permission and send ephemeral error if denied. Returns True if allowed."""
    if not check_fn(interaction.user):
        await interaction.response.send_message(error_msg, ephemeral=True)
        return False
    return True

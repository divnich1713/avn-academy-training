import discord
from typing import Optional

# Role name patterns for permission levels
ADMIN_ROLES = [
    'руководство', 'admin', 'администратор', 'head', 'chief',
    'начальник', 'заместитель начальника', 'подполковник', 'полковник'
]

INSTRUCTOR_ROLES = [
    'инструктор', 'instructor', 'senior_instructor', 'chief_instructor',
    'старший инструктор', 'главный инструктор', 'офицер'
]

LEADER_ROLES = ADMIN_ROLES + [
    'командир', 'leader', 'лидер', 'замком'
]

ALL_STAFF_ROLES = list(set(ADMIN_ROLES + INSTRUCTOR_ROLES + LEADER_ROLES))


def has_any_role(member: discord.Member, role_names: list[str]) -> bool:
    """Check if member has any role matching the given names (case-insensitive)."""
    member_role_names = [r.name.lower() for r in member.roles]
    return any(rn.lower() in member_role_names for rn in role_names)


def is_admin(member: discord.Member) -> bool:
    """Check if member is an administrator (by permission or role name)."""
    return member.guild_permissions.administrator or has_any_role(member, ADMIN_ROLES)


def is_instructor(member: discord.Member) -> bool:
    """Check if member is an instructor or higher."""
    return is_admin(member) or has_any_role(member, INSTRUCTOR_ROLES)


def is_leader(member: discord.Member) -> bool:
    """Check if member is a leader or higher."""
    return is_admin(member) or has_any_role(member, LEADER_ROLES)


def is_staff(member: discord.Member) -> bool:
    """Check if member belongs to any staff role."""
    return has_any_role(member, ALL_STAFF_ROLES)


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

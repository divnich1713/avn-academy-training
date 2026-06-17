"""Авторизация: вход, выход, проверка сессии. Action передаётся в query: ?action=login|logout|me"""
import json
import os
import secrets
import psycopg2
from datetime import datetime, timedelta
from contextlib import contextmanager
import re

SCHEMA = "t_p29017774_avn_academy_training"
# P4.4: Validate SCHEMA is a safe SQL identifier (no injection risk if hardcoded,
# but this guard protects against future changes e.g. sourcing from env vars)
assert re.fullmatch(r"[a-zA-Z_][a-zA-Z0-9_]*", SCHEMA), f"Invalid SCHEMA: {SCHEMA}"

# P0-3: Restrict CORS to known origins instead of wildcard "*"
ALLOWED_ORIGINS = [
    "https://avn-academy-training.vercel.app",
    "https://avn-academy-training-divnich1713s-projects.vercel.app",
    "https://avn-academy-training.netlify.app",
    "https://avn-academy-training-netlify-app.ru",
    "http://localhost:5173",
    "http://localhost:4173",
]


def cors_headers(origin=""):
    is_allowed = (
        origin in ALLOWED_ORIGINS or 
        origin.endswith(".vercel.app") or 
        (origin.startswith("https://") and ".vercel.app" in origin)
    )
    allowed = origin if is_allowed else ALLOWED_ORIGINS[0]
    return {
        "Access-Control-Allow-Origin": allowed,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
    }


def get_origin(event):
    headers = event.get("headers") or {}
    return headers.get("origin") or headers.get("Origin") or ""


# P2-13: Context manager for DB connections — prevents leaks on exceptions
@contextmanager
def get_conn():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        yield conn
    finally:
        conn.close()


# P0-2: bcrypt instead of SHA-256 for password hashing
try:
    import bcrypt
    _HAS_BCRYPT = True
except ImportError:
    import hashlib
    _HAS_BCRYPT = False


def hash_password(password: str) -> str:
    if _HAS_BCRYPT:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    # Fallback for environments without bcrypt — legacy SHA-256
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    if _HAS_BCRYPT and hashed.startswith("$2"):
        return bcrypt.checkpw(password.encode(), hashed.encode())
    # Legacy SHA-256 verification (for lazy migration)
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest() == hashed


def handler(event: dict, context) -> dict:
    origin = get_origin(event)
    CORS = cors_headers(origin)

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    qs = event.get("queryStringParameters") or {}
    action = qs.get("action", "login")
    method = event.get("httpMethod", "GET")

    if action == "login" and method == "POST":
        return login(event, CORS)
    if action == "logout" and method == "POST":
        return logout(event, CORS)
    if action == "me":
        return me(event, CORS)
    if action == "discord":
        return discord_profile(event, CORS)

    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестное действие"})}


def login(event: dict, CORS: dict) -> dict:
    body = json.loads(event.get("body") or "{}")
    static_id = str(body.get("static_id", "")).strip()
    password = str(body.get("password", "")).strip()

    if not static_id or not password:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите Static ID и пароль"})}

    if len(static_id) != 6 or not static_id.isdigit():
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Static ID должен содержать 6 цифр"})}

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT id, password_hash, name, rank, unit, role, is_whitelisted, discord_id, avatar_url FROM {SCHEMA}.users WHERE static_id = %s",
                (static_id,)
            )
            user = cur.fetchone()

            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный Static ID или пароль"})}

            user_id, password_hash, name, rank, unit, role, is_whitelisted, discord_id, avatar_url = user

            if not verify_password(password, password_hash):
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный Static ID или пароль"})}

            # Lazy migration: if password was SHA-256, re-hash with bcrypt
            if _HAS_BCRYPT and not password_hash.startswith("$2"):
                new_hash = hash_password(password)
                cur.execute(f"UPDATE {SCHEMA}.users SET password_hash = %s WHERE id = %s", (new_hash, user_id))

            if not is_whitelisted:
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Вы не в вайтлисте. Обратитесь к инструктору"})}

            token = secrets.token_hex(32)
            expires_at = datetime.now() + timedelta(days=7)
            cur.execute(
                f"INSERT INTO {SCHEMA}.sessions (token, user_id, expires_at) VALUES (%s, %s, %s)",
                (token, user_id, expires_at)
            )
            conn.commit()

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({
            "token": token,
            "user": {"id": user_id, "static_id": static_id, "name": name, "rank": rank, "unit": unit, "role": role, "discord_id": discord_id, "avatar_url": avatar_url}
        })
    }


def logout(event: dict, CORS: dict) -> dict:
    token = (event.get("headers") or {}).get("X-Session-Token") or (event.get("headers") or {}).get("x-session-token")
    if not token:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нет токена"})}

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE token = %s", (token,))
            conn.commit()
    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}


def me(event: dict, CORS: dict) -> dict:
    token = (event.get("headers") or {}).get("X-Session-Token") or (event.get("headers") or {}).get("x-session-token")
    if not token:
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Нет токена"})}

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""SELECT u.id, u.static_id, u.name, u.rank, u.unit, u.role, u.discord_id, u.avatar_url
                    FROM {SCHEMA}.sessions s
                    JOIN {SCHEMA}.users u ON u.id = s.user_id
                    WHERE s.token = %s AND s.expires_at > NOW() AND u.is_whitelisted = TRUE""",
                (token,)
            )
            row = cur.fetchone()

    if not row:
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия истекла"})}

    user_id, static_id, name, rank, unit, role, discord_id, avatar_url = row
    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({"user": {"id": user_id, "static_id": static_id, "name": name, "rank": rank, "unit": unit, "role": role, "discord_id": discord_id, "avatar_url": avatar_url}})
    }


def discord_profile(event: dict, CORS: dict) -> dict:
    """Proxy Discord API to get user avatar — avoids exposing bot token to frontend."""
    qs = event.get("queryStringParameters") or {}
    discord_id = qs.get("id", "").strip()
    if not discord_id or not discord_id.isdigit():
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите Discord ID"})}

    bot_token = os.environ.get("DISCORD_BOT_TOKEN", "")
    if not bot_token:
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": "Discord Bot Token не настроен"})}

    import urllib.request
    req = urllib.request.Request(
        f"https://discord.com/api/v10/users/{discord_id}",
        headers={"Authorization": f"Bot {bot_token}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        return {"statusCode": 502, "headers": CORS, "body": json.dumps({"error": f"Discord API error: {str(e)}"})}

    avatar_hash = data.get("avatar")
    user_id_str = data.get("id", discord_id)
    username = data.get("username", "")
    global_name = data.get("global_name")

    avatar_url = None
    if avatar_hash:
        ext = "gif" if avatar_hash.startswith("a_") else "png"
        avatar_url = f"https://cdn.discordapp.com/avatars/{user_id_str}/{avatar_hash}.{ext}?size=256"

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({
            "username": username,
            "globalName": global_name,
            "avatarUrl": avatar_url,
            "avatar": {"link": avatar_url} if avatar_url else None
        })
    }

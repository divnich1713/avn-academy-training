"""Авторизация: вход, выход, проверка сессии. Action передаётся в query: ?action=login|logout|me"""
import json
import os
import hashlib
import secrets
import psycopg2
from datetime import datetime, timedelta

SCHEMA = "t_p29017774_avn_academy_training"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    qs = event.get("queryStringParameters") or {}
    action = qs.get("action", "login")
    method = event.get("httpMethod", "GET")

    if action == "login" and method == "POST":
        return login(event)
    if action == "logout" and method == "POST":
        return logout(event)
    if action == "me":
        return me(event)

    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестное действие"})}


def login(event: dict) -> dict:
    body = json.loads(event.get("body") or "{}")
    static_id = str(body.get("static_id", "")).strip()
    password = str(body.get("password", "")).strip()

    if not static_id or not password:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите Static ID и пароль"})}

    if len(static_id) != 6 or not static_id.isdigit():
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Static ID должен содержать 6 цифр"})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, name, rank, unit, role, is_whitelisted FROM {SCHEMA}.users WHERE static_id = %s AND password_hash = %s",
        (static_id, hash_password(password))
    )
    user = cur.fetchone()

    if not user:
        cur.close(); conn.close()
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный Static ID или пароль"})}

    user_id, name, rank, unit, role, is_whitelisted = user

    if not is_whitelisted:
        cur.close(); conn.close()
        return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Вы не в вайтлисте. Обратитесь к инструктору"})}

    token = secrets.token_hex(32)
    expires_at = datetime.now() + timedelta(days=7)
    cur.execute(
        f"INSERT INTO {SCHEMA}.sessions (token, user_id, expires_at) VALUES (%s, %s, %s)",
        (token, user_id, expires_at)
    )
    conn.commit()
    cur.close(); conn.close()

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({
            "token": token,
            "user": {"id": user_id, "static_id": static_id, "name": name, "rank": rank, "unit": unit, "role": role}
        })
    }


def logout(event: dict) -> dict:
    token = (event.get("headers") or {}).get("X-Session-Token") or (event.get("headers") or {}).get("x-session-token")
    if not token:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нет токена"})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE token = %s", (token,))
    conn.commit()
    cur.close(); conn.close()
    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}


def me(event: dict) -> dict:
    token = (event.get("headers") or {}).get("X-Session-Token") or (event.get("headers") or {}).get("x-session-token")
    if not token:
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Нет токена"})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""SELECT u.id, u.static_id, u.name, u.rank, u.unit, u.role
            FROM {SCHEMA}.sessions s
            JOIN {SCHEMA}.users u ON u.id = s.user_id
            WHERE s.token = %s AND s.expires_at > NOW()""",
        (token,)
    )
    row = cur.fetchone()
    cur.close(); conn.close()

    if not row:
        return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия истекла"})}

    user_id, static_id, name, rank, unit, role = row
    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({"user": {"id": user_id, "static_id": static_id, "name": name, "rank": rank, "unit": unit, "role": role}})
    }

"""Управление вайтлистом и пользователями (только для инструкторов)"""
import json
import os
import re
import psycopg2
from contextlib import contextmanager

SCHEMA = "t_p29017774_avn_academy_training"
assert re.fullmatch(r"[a-zA-Z_][a-zA-Z0-9_]*", SCHEMA), f"Invalid SCHEMA: {SCHEMA}"

ALLOWED_ORIGINS = [
    "https://avn-academy-training.netlify.app",
    "http://localhost:5173",
    "http://localhost:4173",
]


def cors_headers(origin=""):
    allowed = origin if origin in ALLOWED_ORIGINS else ALLOWED_ORIGINS[0]
    return {
        "Access-Control-Allow-Origin": allowed,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
    }


def get_origin(event):
    headers = event.get("headers") or {}
    return headers.get("origin") or headers.get("Origin") or ""


@contextmanager
def get_conn():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        yield conn
    finally:
        conn.close()


# P0-2: bcrypt password hashing with SHA-256 fallback
try:
    import bcrypt
    _HAS_BCRYPT = True
except ImportError:
    import hashlib
    _HAS_BCRYPT = False


def hash_password(password: str) -> str:
    if _HAS_BCRYPT:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    return hashlib.sha256(password.encode()).hexdigest()


def get_instructor(token: str, conn):
    """Validate instructor session using an existing connection."""
    if not token:
        return None
    with conn.cursor() as cur:
        cur.execute(
            f"""SELECT u.id, u.role FROM {SCHEMA}.sessions s
                JOIN {SCHEMA}.users u ON u.id = s.user_id
                WHERE s.token = %s AND s.expires_at > NOW() AND u.is_whitelisted = TRUE""",
            (token,)
        )
        row = cur.fetchone()
    if row and row[1] in ("instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"):
        return {"id": row[0], "role": row[1]}
    return None


def handler(event: dict, context) -> dict:
    origin = get_origin(event)
    CORS = cors_headers(origin)

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    token = event.get("headers", {}).get("X-Session-Token") or event.get("headers", {}).get("x-session-token")

    with get_conn() as conn:
        instructor = get_instructor(token, conn)
        if not instructor:
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}

        method = event.get("httpMethod", "GET")
        path = event.get("path", "/")

        if method == "GET":
            return list_users(conn, CORS)
        if method == "POST":
            if instructor["role"] not in ("head_avng", "deputy_head"):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}
            return create_user(event, conn, CORS)
        if method == "PUT":
            if instructor["role"] not in ("head_avng", "deputy_head"):
                body = json.loads(event.get("body") or "{}")
                disallowed = [k for k in body.keys() if k != "is_whitelisted"]
                if disallowed:
                    return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Недостаточно прав для изменения этих полей"})}
            return update_user(event, path, conn, CORS)
        if method == "DELETE":
            if instructor["role"] not in ("head_avng", "deputy_head"):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}
            return remove_user(event, path, conn, CORS)

    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}


def list_users(conn, CORS) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT id, static_id, name, rank, unit, role, is_whitelisted, created_at FROM {SCHEMA}.users ORDER BY created_at DESC"
        )
        rows = cur.fetchall()
    users = [
        {"id": r[0], "static_id": r[1], "name": r[2], "rank": r[3], "unit": r[4], "role": r[5], "is_whitelisted": r[6], "created_at": str(r[7])}
        for r in rows
    ]
    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"users": users})}


def create_user(event: dict, conn, CORS) -> dict:
    body = json.loads(event.get("body") or "{}")
    static_id = str(body.get("static_id", "")).strip()
    password = str(body.get("password", "")).strip()
    name = str(body.get("name", "")).strip()
    rank = str(body.get("rank", "Рядовой")).strip()
    unit = str(body.get("unit", "")).strip()
    role = str(body.get("role", "cadet")).strip()
    is_whitelisted = bool(body.get("is_whitelisted", True))

    if not static_id or not password or not name:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните все поля"})}
    if len(static_id) != 6 or not static_id.isdigit():
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Static ID должен содержать 6 цифр"})}
    if role not in ("cadet", "instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head", "dismissed"):
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неверная роль"})}

    with conn.cursor() as cur:
        try:
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (static_id, password_hash, name, rank, unit, role, is_whitelisted) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (static_id, hash_password(password), name, rank, unit, role, is_whitelisted)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Пользователь с таким Static ID уже существует"})}
    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "id": new_id})}


def update_user(event: dict, path: str, conn, CORS) -> dict:
    qs = event.get("queryStringParameters") or {}
    user_id = qs.get("id")
    if not user_id or not str(user_id).isdigit():
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан ID пользователя"})}

    body = json.loads(event.get("body") or "{}")

    fields = []
    values = []

    if body.get("static_id", "").strip():
        static_id = body["static_id"].strip()
        if len(static_id) != 6 or not static_id.isdigit():
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Static ID должен содержать 6 цифр"})}
        fields.append("static_id = %s"); values.append(static_id)
    if body.get("is_whitelisted") is not None:
        fields.append("is_whitelisted = %s"); values.append(bool(body["is_whitelisted"]))
    if body.get("role") in ("cadet", "instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head", "dismissed"):
        fields.append("role = %s"); values.append(body["role"])
    if body.get("name", "").strip():
        fields.append("name = %s"); values.append(body["name"].strip())
    if body.get("rank", "").strip():
        fields.append("rank = %s"); values.append(body["rank"].strip())
    if "unit" in body:
        fields.append("unit = %s"); values.append(str(body["unit"]).strip())
    if body.get("password", "").strip():
        fields.append("password_hash = %s"); values.append(hash_password(body["password"].strip()))

    if not fields:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нет данных для обновления"})}

    fields.append("updated_at = NOW()")
    values.append(user_id)

    with conn.cursor() as cur:
        try:
            cur.execute(f"UPDATE {SCHEMA}.users SET {', '.join(fields)} WHERE id = %s", values)
            conn.commit()
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Пользователь с таким Static ID уже существует"})}
    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}


def remove_user(event: dict, path: str, conn, CORS) -> dict:
    qs = event.get("queryStringParameters") or {}
    user_id = qs.get("id")
    if not user_id or not str(user_id).isdigit():
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан ID пользователя"})}

    with conn.cursor() as cur:
        cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE user_id = %s", (user_id,))
        cur.execute(f"UPDATE {SCHEMA}.users SET is_whitelisted = FALSE, updated_at = NOW() WHERE id = %s", (user_id,))
        conn.commit()
    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}
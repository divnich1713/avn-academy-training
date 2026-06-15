import json
import os

SCHEMA = "t_p29017774_avn_academy_training"


def get_conn():
    import psycopg2
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
    }


def get_user_by_token(conn, token):
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT u.id, u.name, u.role FROM {SCHEMA}.sessions s "
            f"JOIN {SCHEMA}.users u ON s.user_id = u.id "
            f"WHERE s.token = %s AND s.expires_at > NOW() AND u.is_whitelisted = TRUE",
            (token,),
        )
        row = cur.fetchone()
        if not row:
            return None
        return {"id": row[0], "name": row[1], "role": row[2]}


def handler(event: dict, context) -> dict:
    """
    API уведомлений. Получение, пометка как прочитанных.
    GET / — список уведомлений текущего пользователя
    PUT ?action=read — пометить все как прочитанные
    PUT ?action=read_one&id=X — пометить одно уведомление как прочитанное
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    token = event.get("headers", {}).get("X-Session-Token", "")
    if not token:
        return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Не авторизован"})}

    conn = get_conn()
    user = get_user_by_token(conn, token)
    if not user:
        conn.close()
        return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Сессия истекла"})}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")

    try:
        # GET / — список уведомлений
        if method == "GET":
            with conn.cursor() as cur:
                cur.execute(
                    f"""SELECT id, type, title, message, is_read, created_at
                        FROM {SCHEMA}.notifications
                        WHERE user_id = %s
                        ORDER BY created_at DESC
                        LIMIT 50""",
                    (user["id"],),
                )
                rows = cur.fetchall()
                notifications = []
                for row in rows:
                    notifications.append({
                        "id": row[0],
                        "type": row[1],
                        "title": row[2],
                        "message": row[3],
                        "is_read": row[4],
                        "created_at": row[5].isoformat(),
                    })
                cur.execute(
                    f"SELECT COUNT(*) FROM {SCHEMA}.notifications WHERE user_id = %s AND is_read = FALSE",
                    (user["id"],),
                )
                unread_count = cur.fetchone()[0]
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({
                "notifications": notifications,
                "unread_count": unread_count,
            })}

        # PUT ?action=read — пометить все как прочитанные
        if method == "PUT" and action == "read":
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE {SCHEMA}.notifications SET is_read = TRUE WHERE user_id = %s",
                    (user["id"],),
                )
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"success": True})}

        # PUT ?action=read_one&id=X — пометить одно как прочитанное
        if method == "PUT" and action == "read_one":
            notif_id = int(params.get("id", 0))
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE {SCHEMA}.notifications SET is_read = TRUE WHERE id = %s AND user_id = %s",
                    (notif_id, user["id"]),
                )
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"success": True})}

    finally:
        conn.close()

    return {"statusCode": 404, "headers": cors_headers(), "body": json.dumps({"error": "Не найдено"})}

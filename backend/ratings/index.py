import json
import os

SCHEMA = "t_p29017774_avn_academy_training"


def get_conn():
    import psycopg2
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
    }


def get_user_by_token(conn, token):
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT u.id, u.name, u.rank, u.role FROM {SCHEMA}.sessions s "
            f"JOIN {SCHEMA}.users u ON s.user_id = u.id "
            f"WHERE s.token = %s AND s.expires_at > NOW()",
            (token,),
        )
        row = cur.fetchone()
        if not row:
            return None
        return {"id": row[0], "name": row[1], "rank": row[2], "role": row[3]}


def handler(event: dict, context) -> dict:
    """
    API рейтинга инструкторов.
    GET / — список инструкторов с их средним рейтингом
    GET ?action=my_rating&instructor_id=X — оценка текущего курсанта для инструктора
    POST / — курсант ставит оценку инструктору (или обновляет)
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
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    try:
        # GET / — список инструкторов с рейтингом
        if method == "GET" and not action:
            with conn.cursor() as cur:
                cur.execute(
                    f"""SELECT u.id, u.name, u.rank, u.unit,
                        ROUND(AVG(r.rating)::numeric, 2) as avg_rating,
                        COUNT(r.id) as rating_count
                        FROM {SCHEMA}.users u
                        LEFT JOIN {SCHEMA}.instructor_ratings r ON r.instructor_id = u.id
                        WHERE u.role IN ('instructor', 'head_avng', 'chief_instructor', 'senior_instructor', 'junior_instructor')
                        GROUP BY u.id, u.name, u.rank, u.unit
                        ORDER BY avg_rating DESC NULLS LAST"""
                )
                rows = cur.fetchall()
                instructors = []
                for row in rows:
                    instructors.append({
                        "id": row[0],
                        "name": row[1],
                        "rank": row[2],
                        "unit": row[3],
                        "avg_rating": float(row[4]) if row[4] else None,
                        "rating_count": row[5],
                    })

                # Если курсант — добавим его собственные оценки
                my_ratings = {}
                if user["role"] == "cadet":
                    cur.execute(
                        f"SELECT instructor_id, rating, comment FROM {SCHEMA}.instructor_ratings WHERE cadet_id = %s",
                        (user["id"],),
                    )
                    for row in cur.fetchall():
                        my_ratings[row[0]] = {"rating": row[1], "comment": row[2]}

            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({
                "instructors": instructors,
                "my_ratings": my_ratings,
            })}

        # POST / — поставить или обновить оценку инструктору (только курсанты)
        if method == "POST":
            if user["role"] != "cadet":
                return {"statusCode": 403, "headers": cors_headers(), "body": json.dumps({"error": "Только курсанты могут оценивать"})}

            instructor_id = int(body.get("instructor_id", 0))
            rating = int(body.get("rating", 0))
            comment = body.get("comment", "").strip() or None

            if not instructor_id:
                return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Укажите инструктора"})}
            if rating < 1 or rating > 5:
                return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Оценка от 1 до 5"})}

            with conn.cursor() as cur:
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.instructor_ratings (instructor_id, cadet_id, rating, comment)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (instructor_id, cadet_id)
                        DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment""",
                    (instructor_id, user["id"], rating, comment),
                )
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"success": True})}

    finally:
        conn.close()

    return {"statusCode": 404, "headers": cors_headers(), "body": json.dumps({"error": "Не найдено"})}

import json
import os

SCHEMA = "t_p29017774_avn_academy_training"


def get_conn():
    import psycopg2
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
    }


def get_user_by_token(conn, token):
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT u.id, u.name, u.rank, u.unit, u.role FROM {SCHEMA}.sessions s "
            f"JOIN {SCHEMA}.users u ON s.user_id = u.id "
            f"WHERE s.token = %s AND s.expires_at > NOW() AND u.is_whitelisted = TRUE",
            (token,),
        )
        row = cur.fetchone()
        if not row:
            return None
        return {"id": row[0], "name": row[1], "rank": row[2], "unit": row[3], "role": row[4]}


def handler(event: dict, context) -> dict:
    """
    API запросов обучения (лекции, практики, экзамены, рапорты) и оценок.
    Курсанты: подача запросов, просмотр своих запросов и оценок.
    Инструкторы: просмотр всех запросов, одобрение/отклонение, выставление оценок.
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
        # ===== GET /requests — список запросов =====
        if method == "GET" and not action:
            with conn.cursor() as cur:
                if user["role"] in ("instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"):
                    # Инструктор видит все запросы
                    cur.execute(
                        f"""SELECT r.id, r.type, r.subject, r.description, r.preferred_date,
                            r.status, r.instructor_comment, r.created_at, r.updated_at,
                            u.name as cadet_name, u.rank as cadet_rank, u.static_id as cadet_static_id,
                            u.id as cadet_id,
                            rv.name as reviewer_name
                            FROM {SCHEMA}.requests r
                            JOIN {SCHEMA}.users u ON r.user_id = u.id
                            LEFT JOIN {SCHEMA}.users rv ON r.reviewed_by = rv.id
                            ORDER BY r.created_at DESC"""
                    )
                else:
                    # Курсант видит только свои запросы
                    cur.execute(
                        f"""SELECT r.id, r.type, r.subject, r.description, r.preferred_date,
                            r.status, r.instructor_comment, r.created_at, r.updated_at,
                            u.name as cadet_name, u.rank as cadet_rank, u.static_id as cadet_static_id,
                            u.id as cadet_id,
                            rv.name as reviewer_name
                            FROM {SCHEMA}.requests r
                            JOIN {SCHEMA}.users u ON r.user_id = u.id
                            LEFT JOIN {SCHEMA}.users rv ON r.reviewed_by = rv.id
                            WHERE r.user_id = %s
                            ORDER BY r.created_at DESC""",
                        (user["id"],),
                    )
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description]
                requests_list = []
                for row in rows:
                    item = dict(zip(cols, row))
                    # Сериализуем даты
                    for k in ("created_at", "updated_at"):
                        if item[k]:
                            item[k] = item[k].isoformat()
                    if item.get("preferred_date"):
                        item["preferred_date"] = item["preferred_date"].isoformat()
                    requests_list.append(item)
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"requests": requests_list})}

        # ===== POST /requests — создать запрос (курсант) =====
        if method == "POST" and not action:
            req_type = body.get("type")
            subject = body.get("subject", "").strip()
            description = body.get("description", "").strip()
            preferred_date = body.get("preferred_date") or None

            if not req_type or req_type not in ("lecture", "practice", "exam", "report"):
                return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Неверный тип запроса"})}
            if not subject:
                return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Укажите тему"})}

            with conn.cursor() as cur:
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.requests (user_id, type, subject, description, preferred_date)
                        VALUES (%s, %s, %s, %s, %s) RETURNING id""",
                    (user["id"], req_type, subject, description or None, preferred_date),
                )
                new_id = cur.fetchone()[0]
                # Уведомление всем инструкторам о новом запросе
                type_map = {"lecture": "лекция", "practice": "практика", "exam": "экзамен", "report": "рапорт"}
                type_text = type_map.get(req_type, req_type)
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE role IN ('instructor', 'head_avng', 'chief_instructor', 'senior_instructor', 'junior_instructor', 'deputy_head')")
                instructor_ids = [row[0] for row in cur.fetchall()]
                for inst_id in instructor_ids:
                    cur.execute(
                        f"""INSERT INTO {SCHEMA}.notifications (user_id, type, title, message)
                            VALUES (%s, %s, %s, %s)""",
                        (inst_id, "new_request",
                         f"Новый запрос: {type_text}",
                         f'{user["rank"]} {user["name"]} подал запрос на тему "{subject}" ({type_text}).'),
                    )
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"success": True, "id": new_id})}

        # ===== PUT /requests?action=review — инструктор одобряет/отклоняет =====
        if method == "PUT" and action == "review":
            if user["role"] not in ("instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"):
                return {"statusCode": 403, "headers": cors_headers(), "body": json.dumps({"error": "Только для инструкторов"})}
            request_id = int(params.get("id", 0))
            status = body.get("status")
            comment = body.get("comment", "")

            if status not in ("approved", "rejected"):
                return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Статус: approved или rejected"})}

            with conn.cursor() as cur:
                cur.execute(
                    f"""UPDATE {SCHEMA}.requests
                        SET status = %s, instructor_comment = %s, reviewed_by = %s,
                            reviewed_at = NOW(), updated_at = NOW()
                        WHERE id = %s""",
                    (status, comment or None, user["id"], request_id),
                )
                # Получаем user_id курсанта, тему и тип запроса
                cur.execute(
                    f"SELECT user_id, subject, type FROM {SCHEMA}.requests WHERE id = %s",
                    (request_id,),
                )
                req_row = cur.fetchone()
                if req_row:
                    cadet_id, subject, req_type = req_row
                    status_text = "одобрен" if status == "approved" else "отклонён"
                    notif_message = f'Инструктор {user["name"]} {status_text} ваш запрос на тему "{subject}".'
                    if comment:
                        notif_message += f" Комментарий: {comment}"
                    cur.execute(
                        f"""INSERT INTO {SCHEMA}.notifications (user_id, type, title, message)
                            VALUES (%s, %s, %s, %s)""",
                        (cadet_id, "request_reviewed",
                         f"Запрос {status_text}", notif_message),
                    )

                    # Auto-grade if type is lecture, practice, or exam
                    if req_type in ("lecture", "practice", "exam"):
                        cur.execute(
                            f"SELECT id FROM {SCHEMA}.grades WHERE request_id = %s",
                            (request_id,),
                        )
                        existing_grade = cur.fetchone()
                        grade_val = 5 if status == "approved" else 1
                        grade_comment = comment or ("Автоматический зачет по запросу" if status == "approved" else "Автоматический незачет по запросу")
                        if not existing_grade:
                            cur.execute(
                                f"""INSERT INTO {SCHEMA}.grades (user_id, instructor_id, request_id, subject, type, grade, comment)
                                    VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                                (cadet_id, user["id"], request_id, subject, req_type, grade_val, grade_comment),
                            )
                        else:
                            cur.execute(
                                f"""UPDATE {SCHEMA}.grades 
                                    SET grade = %s, comment = %s, instructor_id = %s 
                                    WHERE request_id = %s""",
                                (grade_val, grade_comment, user["id"], request_id),
                            )
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"success": True})}

        # ===== GET /requests?action=grades — оценки =====
        if method == "GET" and action == "grades":
            with conn.cursor() as cur:
                if user["role"] in ("instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"):
                    cur.execute(
                        f"""SELECT g.id, g.subject, g.type, g.grade, g.comment, g.graded_at,
                            u.name as cadet_name, u.rank as cadet_rank, u.id as cadet_id,
                            i.name as instructor_name
                            FROM {SCHEMA}.grades g
                            JOIN {SCHEMA}.users u ON g.user_id = u.id
                            JOIN {SCHEMA}.users i ON g.instructor_id = i.id
                            ORDER BY g.graded_at DESC"""
                    )
                else:
                    cur.execute(
                        f"""SELECT g.id, g.subject, g.type, g.grade, g.comment, g.graded_at,
                            u.name as cadet_name, u.rank as cadet_rank, u.id as cadet_id,
                            i.name as instructor_name
                            FROM {SCHEMA}.grades g
                            JOIN {SCHEMA}.users u ON g.user_id = u.id
                            JOIN {SCHEMA}.users i ON g.instructor_id = i.id
                            WHERE g.user_id = %s
                            ORDER BY g.graded_at DESC""",
                        (user["id"],),
                    )
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description]
                grades_list = []
                for row in rows:
                    item = dict(zip(cols, row))
                    if item.get("graded_at"):
                        item["graded_at"] = item["graded_at"].isoformat()
                    grades_list.append(item)
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"grades": grades_list})}

        # ===== POST /requests?action=grade — инструктор ставит оценку =====
        if method == "POST" and action == "grade":
            if user["role"] not in ("instructor", "head_avng", "chief_instructor", "senior_instructor", "junior_instructor", "deputy_head"):
                return {"statusCode": 403, "headers": cors_headers(), "body": json.dumps({"error": "Только для инструкторов"})}

            cadet_id = int(body.get("cadet_id", 0))
            subject = body.get("subject", "").strip()
            grade_type = body.get("type")
            grade_val = int(body.get("grade", 0))
            comment = body.get("comment", "")
            request_id = body.get("request_id") or None

            if not cadet_id or not subject:
                return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Укажите курсанта и тему"})}
            if grade_type not in ("lecture", "practice", "exam"):
                return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Неверный тип оценки"})}
            if grade_val not in (1, 5):
                return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "Неверная оценка (должна быть 1 или 5)"})}

            with conn.cursor() as cur:
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.grades (user_id, instructor_id, request_id, subject, type, grade, comment)
                        VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                    (cadet_id, user["id"], request_id, subject, grade_type, grade_val, comment or None),
                )
                new_id = cur.fetchone()[0]
                # Если связан с запросом — одобряем его
                if request_id:
                    cur.execute(
                        f"""UPDATE {SCHEMA}.requests
                            SET status = 'approved', reviewed_by = %s, reviewed_at = NOW(), updated_at = NOW()
                            WHERE id = %s""",
                        (user["id"], request_id),
                    )
                # Уведомление курсанту об оценке
                type_map = {"lecture": "лекция", "practice": "практика", "exam": "экзамен"}
                type_text = type_map.get(grade_type, grade_type)
                result_text = "Зачтено" if grade_val == 5 else "Не зачтено"
                notif_message = f'Инструктор {user["name"]} выставил решение "{result_text}" по предмету "{subject}" ({type_text}).'
                if comment:
                    notif_message += f" Комментарий: {comment}"
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.notifications (user_id, type, title, message)
                        VALUES (%s, %s, %s, %s)""",
                    (cadet_id, "grade_added", f"Новое решение: {result_text}", notif_message),
                )
            conn.commit()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"success": True, "id": new_id})}

    finally:
        conn.close()

    return {"statusCode": 404, "headers": cors_headers(), "body": json.dumps({"error": "Не найдено"})}
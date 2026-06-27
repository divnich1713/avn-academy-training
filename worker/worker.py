import os
import json
import time
import re
import hashlib
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import Json
import redis
import requests
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
SCHEMA = os.environ.get("SCHEMA", "t_p29017774_avn_academy_training")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")

# Validate database schema identifier to prevent SQL injection vulnerabilities
if not re.fullmatch(r"[a-zA-Z_][a-zA-Z0-9_]*", SCHEMA):
    raise ValueError(f"CRITICAL: Invalid SCHEMA environment identifier: '{SCHEMA}'")

# Initialize Redis client
print(f"Connecting to Redis at {REDIS_URL}...")
r_client = redis.from_url(REDIS_URL, decode_responses=True)

# Initialize Threaded Connection Pool for PostgreSQL to prevent TCP handshake overheads
print("Initializing Postgres Threaded Connection Pool...")
db_pool = ThreadedConnectionPool(
    minconn=2,
    maxconn=10,
    dsn=DATABASE_URL
)

def get_db_connection():
    return db_pool.getconn()

def return_db_connection(conn):
    db_pool.putconn(conn)

def recover_stale_tasks():
    """
    Recover tasks stuck in the processing queue from previous worker crashes on startup.
    Reliable Queue pattern (RPOPLPUSH).
    """
    recovered_count = 0
    while True:
        task = r_client.rpoplpush("essay_processing", "essay_queue")
        if not task:
            break
        recovered_count += 1
    if recovered_count > 0:
        print(f"Startup recovery: moved {recovered_count} stale tasks back to the queue.")

def analyze_essay_local(answer_text: str, criteria_list: list) -> tuple[float, dict, str]:
    """
    Fallback local analyzer: uses length and tactical keywords to evaluate essays.
    Returns: (grade_percent, criteria_scores_dict, feedback_text)
    """
    clean_text = answer_text.strip()
    text_len = len(clean_text)

    # If answer is practically empty
    if text_len < 30:
        scores = {crit: 1 for crit in criteria_list}
        feedback = "Ответ слишком короткий или не содержит содержательной информации для оценки."
        return 25.0, scores, feedback

    # Score criteria based on keywords
    scores = {}
    
    # Simple semantic heuristics in Russian
    keywords_map = {
        "тактика": ["засада", "укрытие", "огонь", "противник", "сектор", "взвод", "отделение", "команда", "бой"],
        "огневая": ["деривация", "калибр", "траектория", "вращение", "нарез", "ветер", "дистанция", "прицел", "ствол"],
        "устав": ["единоначалие", "командир", "приказ", "ответственность", "часовой", "караул", "устав", "дисциплина"],
        "адаптация": ["адаптация", "новобранец", "коллектив", "психолог", "конфликт", "сержант", "мотивация"]
    }

    # Flat check for matched keywords
    all_tactical_words = []
    for words in keywords_map.values():
        all_tactical_words.extend(words)
    
    matches = sum(1 for w in all_tactical_words if re.search(w, clean_text, re.IGNORECASE))
    
    for i, crit in enumerate(criteria_list):
        # Level 1-4 scale
        if i == 0: # Criterion 1: Content density / completeness
            if text_len > 300:
                scores[crit] = 4
            elif text_len > 150:
                scores[crit] = 3
            else:
                scores[crit] = 2
        else:
            # Distribute scores based on keyword density
            if matches > 6:
                scores[crit] = 4
            elif matches > 3:
                scores[crit] = 3
            elif matches > 0:
                scores[crit] = 2
            else:
                scores[crit] = 1

    # Sum of scores (max sum = len(criteria_list) * 4)
    max_sum = len(criteria_list) * 4
    actual_sum = sum(scores.values())
    grade_percent = (actual_sum / max_sum) * 100.0

    # Generate feedback
    if grade_percent >= 85:
        feedback = f"Отличный, развернутый ответ (совпадений терминов: {matches}). Тема раскрыта полностью. Демонстрируется высокий уровень владения теоретическим материалом и профессиональной терминологией."
    elif grade_percent >= 60:
        feedback = f"Хороший ответ (совпадений терминов: {matches}). Основные положения раскрыты верно, но можно подробнее описать прикладные детали и организационные нюансы выполнения задачи."
    else:
        feedback = f"Ответ поверхностный (совпадений терминов: {matches}). Рекомендуется изучить методические пособия по теме и пересдать блок."

    return round(grade_percent, 1), scores, feedback

def analyze_essay_openai(answer_text: str, criteria_list: list, max_retries: int = 3) -> tuple[float, dict, str]:
    """
    Calls OpenAI API with exponential backoff and Redis caching.
    """
    # Redis cache check to reduce API costs for duplicate essays
    criteria_str = json.dumps(criteria_list, sort_keys=True)
    cache_payload = f"{answer_text.strip()}|||{criteria_str}"
    cache_hash = hashlib.sha256(cache_payload.encode("utf-8")).hexdigest()
    cache_key = f"essay_cache:{cache_hash}"
    
    try:
        cached_val = r_client.get(cache_key)
        if cached_val:
            data = json.loads(cached_val)
            print("OpenAI evaluation: CACHE HIT. Returning cached grade.")
            return float(data["grade"]), data["scores"], data["feedback"]
    except Exception as cache_err:
        print(f"Redis cache check warning: {cache_err}")

    # Call API if not cached
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""
    Вы являетесь строгим военным инструктором. Оцените следующий ответ курсанта на вопрос по 5 предоставленным критериям.
    Каждый критерий нужно оценить по шкале от 1 до 4 баллов (1 - Неудовлетворительно, 2 - Удовлетворительно, 3 - Хорошо, 4 - Отлично).
    
    Ответ курсанта:
    "{answer_text}"
    
    Критерии для оценки:
    {json.dumps(criteria_list, ensure_ascii=False)}
    
    Верните ответ СТРОГО в формате JSON со следующими полями:
    - scores: словарь, где ключ - название критерия из списка, значение - оценка (число от 1 до 4).
    - feedback: текстовый отзыв на русском языке с разбором сильных и слабых сторон (до 4 предложений).
    - grade: итоговая оценка в процентах от 0 до 100.
    """

    payload = {
        "model": "gpt-4o-mini",
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": "You are a helpful grading assistant that outputs JSON."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2
    }

    url = f"{OPENAI_BASE_URL}/chat/completions"
    
    for attempt in range(max_retries):
        try:
            # Enforce 5s connect timeout and 30s read timeout
            resp = requests.post(url, headers=headers, json=payload, timeout=(5, 30))
            if resp.status_code == 200:
                result = resp.json()
                content = json.loads(result["choices"][0]["message"]["content"])
                
                # Validate response structure
                grade = float(content.get("grade", 50.0))
                grade = max(0.0, min(100.0, grade))
                scores = content.get("scores", {crit: 2 for crit in criteria_list})
                feedback = content.get("feedback", "Оценка выполнена автоматически.")
                
                # Save to cache for 7 days
                try:
                    r_client.set(cache_key, json.dumps({"grade": grade, "scores": scores, "feedback": feedback}), ex=86400 * 7)
                except Exception as cache_err:
                    print(f"Failed to cache response in Redis: {cache_err}")
                
                return grade, scores, feedback
            elif resp.status_code in (429, 502, 503, 504):
                wait_time = (2 ** attempt) * 2
                print(f"OpenAI service warning ({resp.status_code}). Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"OpenAI API non-retryable error: {resp.status_code} - {resp.text}")
                break
        except requests.exceptions.Timeout:
            wait_time = (2 ** attempt) * 2
            print(f"OpenAI request timeout. Retrying in {wait_time}s...")
            time.sleep(wait_time)
        except Exception as e:
            print(f"Failed to call OpenAI API: {e}")
            break

    # Fallback to local heuristic analysis
    print("Falling back to local heuristic analysis after OpenAI failure.")
    return analyze_essay_local(answer_text, criteria_list)

def process_task(task_data: dict):
    answer_id = task_data.get("answer_id")
    student_answer = task_data.get("student_answer", "")
    criteria = task_data.get("criteria", {}).get("criteria", [])
    
    if not criteria:
        criteria = ["Полнота раскрытия темы", "Применение регламентов", "Логика и структура", "Терминология", "Качество выводов"]

    print(f"Processing Answer ID {answer_id}...")

    # Grade the answer
    if OPENAI_API_KEY:
        grade, scores, feedback = analyze_essay_openai(student_answer, criteria)
    else:
        grade, scores, feedback = analyze_essay_local(student_answer, criteria)

    # Save results to DB (secured using schema quotes)
    is_correct = grade >= 60.0
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            # Update test answers
            cur.execute(
                f"""
                UPDATE "{SCHEMA}".test_answers
                SET is_correct = %s, grade = %s, feedback = %s, criteria_evaluation = %s
                WHERE id = %s
                """,
                (is_correct, grade, feedback, Json(scores), answer_id)
            )
            
            # Fetch attempt_id and question_id
            cur.execute(
                f'SELECT attempt_id, question_id FROM "{SCHEMA}".test_answers WHERE id = %s',
                (answer_id,)
            )
            fetch_res = cur.fetchone()
            if not fetch_res:
                conn.commit()
                return
            attempt_id, question_id = fetch_res
            
            # Recalculate overall average score for the attempt
            cur.execute(
                f'SELECT grade FROM "{SCHEMA}".test_answers WHERE attempt_id = %s AND grade IS NOT NULL',
                (attempt_id,)
            )
            all_grades = [float(row[0]) for row in cur.fetchall()]
            avg_grade = sum(all_grades) / len(all_grades) if all_grades else 0.0
            
            # Fetch subject
            cur.execute(
                f'SELECT subject FROM "{SCHEMA}".test_questions WHERE id = %s',
                (question_id,)
            )
            subject = cur.fetchone()[0]

            # Fetch question count limit from test_settings
            try:
                cur.execute(
                    f'SELECT question_count FROM "{SCHEMA}".test_settings WHERE subject = %s',
                    (subject,)
                )
                settings_row = cur.fetchone()
                q_limit = settings_row[0] if settings_row else 30
            except Exception:
                q_limit = 30

            # Check if all questions are answered
            cur.execute(
                f'SELECT count(id) FROM "{SCHEMA}".test_answers WHERE attempt_id = %s',
                (attempt_id,)
            )
            answered_count = cur.fetchone()[0]
            
            if answered_count >= q_limit:
                cur.execute(
                    f"UPDATE \"{SCHEMA}\".test_attempts SET status = 'completed', completed_at = NOW() WHERE id = %s",
                    (attempt_id,)
                )
                
                # Fetch user_id and end_elo
                cur.execute(
                    f'SELECT user_id, end_elo FROM "{SCHEMA}".test_attempts WHERE id = %s',
                    (attempt_id,)
                )
                user_id, end_elo = cur.fetchone()
                
                # Update student ELO profile
                cur.execute(
                    f"""
                    INSERT INTO "{SCHEMA}".student_elo (user_id, subject, elo_rating, updated_at)
                    VALUES (%s, %s, %s, NOW())
                    ON CONFLICT (user_id, subject) DO UPDATE
                    SET elo_rating = EXCLUDED.elo_rating, updated_at = NOW()
                    """,
                    (user_id, subject, end_elo)
                )

            conn.commit()
            print(f"Answer ID {answer_id} successfully updated with grade {grade}%")
    except Exception as e:
        print(f"Database error saving graded answer: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            return_db_connection(conn)

def main():
    print("Cadet Essay Grading Worker started. Listening for tasks on Redis queue...")
    # Recover any stale tasks on startup
    recover_stale_tasks()
    
    while True:
        try:
            # Reliable Queue Pattern (BRPOPLPUSH)
            # Pops from 'essay_queue' and atomic-pushes to 'essay_processing'
            raw_task = r_client.brpoplpush("essay_queue", "essay_processing", timeout=5)
            if raw_task:
                task_data = json.loads(raw_task)
                process_task(task_data)
                # Success: Acknowledge task removal from processing queue
                r_client.lrem("essay_processing", 1, raw_task)
        except redis.ConnectionError:
            print("Redis connection lost. Retrying in 5 seconds...")
            time.sleep(5)
        except Exception as e:
            print(f"Error in worker loop: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()

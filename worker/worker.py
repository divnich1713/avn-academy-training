import os
import json
import time
import re
import psycopg2
from psycopg2.extras import Json
import redis
import requests
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
SCHEMA = os.environ.get("SCHEMA", "t_p29017774_avn_academy_training")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# Initialize Redis
print(f"Connecting to Redis at {REDIS_URL}...")
r_client = redis.from_url(REDIS_URL)

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

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

def analyze_essay_openai(answer_text: str, criteria_list: list) -> tuple[float, dict, str]:
    """
    Calls OpenAI API to grade the essay according to the rubric.
    """
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Prompt instructing output as JSON matching requirements
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

    try:
        resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=15)
        if resp.status_code == 200:
            result = resp.json()
            content = json.loads(result["choices"][0]["message"]["content"])
            return float(content["grade"]), content["scores"], content["feedback"]
        else:
            print(f"OpenAI API error: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"Failed to call OpenAI API: {e}")

    # Return local analysis as fallback if OpenAI fails
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

    # Save results to DB
    is_correct = grade >= 60.0
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {SCHEMA}.test_answers
                SET is_correct = %s, grade = %s, feedback = %s, criteria_evaluation = %s
                WHERE id = %s
                """,
                (is_correct, grade, feedback, Json(scores), answer_id)
            )
            
            # Fetch attempt_id to verify if we should update attempt end_elo
            cur.execute(
                f"SELECT attempt_id, question_id FROM {SCHEMA}.test_answers WHERE id = %s",
                (answer_id,)
            )
            attempt_id, question_id = cur.fetchone()
            
            # Recalculate overall average score for the attempt
            cur.execute(
                f"SELECT grade FROM {SCHEMA}.test_answers WHERE attempt_id = %s AND grade IS NOT NULL",
                (attempt_id,)
            )
            all_grades = [float(row[0]) for row in cur.fetchall()]
            avg_grade = sum(all_grades) / len(all_grades) if all_grades else 0.0
            
            # Fetch subject
            cur.execute(
                f"SELECT subject FROM {SCHEMA}.test_questions WHERE id = %s",
                (question_id,)
            )
            subject = cur.fetchone()[0]

            # Fetch question count limit from test_settings
            try:
                cur.execute(
                    f"SELECT question_count FROM {SCHEMA}.test_settings WHERE subject = %s",
                    (subject,)
                )
                settings_row = cur.fetchone()
                q_limit = settings_row[0] if settings_row else 30
            except Exception:
                q_limit = 30

            # If all questions are answered, finalize the attempt
            cur.execute(
                f"SELECT count(id) FROM {SCHEMA}.test_answers WHERE attempt_id = %s",
                (attempt_id,)
            )
            answered_count = cur.fetchone()[0]
            
            if answered_count >= q_limit:
                cur.execute(
                    f"UPDATE {SCHEMA}.test_attempts SET status = 'completed', completed_at = NOW() WHERE id = %s",
                    (attempt_id,)
                )
                
                # Fetch user_id and subject to update student_elo
                cur.execute(
                    f"SELECT user_id, end_elo FROM {SCHEMA}.test_attempts WHERE id = %s",
                    (attempt_id,)
                )
                user_id, end_elo = cur.fetchone()

                
                # Update ELO profile
                cur.execute(
                    f"""
                    INSERT INTO {SCHEMA}.student_elo (user_id, subject, elo_rating, updated_at)
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
            conn.close()

def main():
    print("Cadet Essay Grading Worker started. Listening for tasks on Redis queue 'essay_queue'...")
    while True:
        try:
            # Blocking pop from list
            task = r_client.blpop("essay_queue", timeout=5)
            if task:
                # task[0] is the queue name, task[1] is the stringified JSON
                task_data = json.loads(task[1])
                process_task(task_data)
        except redis.ConnectionError:
            print("Redis connection lost. Retrying in 5 seconds...")
            time.sleep(5)
        except Exception as e:
            print(f"Error in worker loop: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()

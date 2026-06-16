import json
import random
from datetime import datetime, timedelta
from typing import Any, Optional
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update, and_
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from models import User, Session, TestQuestion, TestAttempt, TestAnswer, StudentElo
from elo import update_elo
from redis_client import redis_client, check_rate_limit

router = APIRouter(prefix="/api/tests", tags=["Test Engine"])

# Pydantic Request Schemas
class StartTestRequest(BaseModel):
    subject: str
    difficulty: int  # 1-10
    timer_minutes: int  # 15-120

class SubmitAnswerRequest(BaseModel):
    attempt_id: int
    question_id: int
    answer: Any  # Can be string, list of strings, or dict of pairs

class WarningRequest(BaseModel):
    attempt_id: int
    warnings_count: int

# Auth Dependency
async def get_current_user(
    x_session_token: str = Header(..., alias="X-Session-Token"), 
    db: AsyncSession = Depends(get_db)
) -> User:
    # Rate limit check (60 requests per minute)
    ip_limit_key = f"ratelimit:{x_session_token}"
    if check_rate_limit(ip_limit_key, limit=60, window=60):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a minute.")

    # Try cache first
    cached_user = redis_client.get(f"session:{x_session_token}")
    if cached_user:
        user_data = json.loads(cached_user)
        # Verify user exists in database
        stmt = select(User).where(User.id == user_data["id"])
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if user and user.is_whitelisted:
            return user

    # Query DB
    stmt = (
        select(User)
        .join(Session, Session.user_id == User.id)
        .where(and_(Session.token == x_session_token, Session.expires_at > datetime.utcnow(), User.is_whitelisted == True))
    )
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Сессия недействительна или истекла")

    # Cache session
    user_dict = {
        "id": user.id,
        "static_id": user.static_id,
        "name": user.name,
        "rank": user.rank,
        "unit": user.unit,
        "role": user.role
    }
    redis_client.set(f"session:{x_session_token}", json.dumps(user_dict), ex=1800)
    return user

@router.get("/active-session")
async def get_active_session(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TestAttempt).where(
        and_(
            TestAttempt.user_id == user.id,
            TestAttempt.status == "in_progress"
        )
    )
    res = await db.execute(stmt)
    attempt = res.scalar_one_or_none()
    
    if not attempt:
        return {"active": False}

    # Auto submit check
    if attempt.remaining_seconds is None and attempt.expires_at < datetime.utcnow():
        attempt.status = "completed"
        attempt.completed_at = attempt.expires_at
        await db.commit()
        return {"active": False}

    # Calculate remaining seconds
    rem_seconds = attempt.remaining_seconds
    if rem_seconds is None:
        rem_seconds = int(max(0, (attempt.expires_at - datetime.utcnow()).total_seconds()))

    # Fetch answered question IDs
    ans_stmt = select(TestAnswer.question_id).where(TestAnswer.attempt_id == attempt.id)
    ans_res = await db.execute(ans_stmt)
    answered_ids = [r for r in ans_res.scalars()]

    return {
        "active": True,
        "attempt_id": attempt.id,
        "subject": "Тестирование",  # Placeholder
        "difficulty": attempt.difficulty,
        "warnings_count": attempt.warnings_count,
        "remaining_seconds": rem_seconds,
        "is_frozen": attempt.remaining_seconds is not None,
        "answered_count": len(answered_ids),
        "total_questions": 30
    }

@router.post("/start")
async def start_test(
    payload: StartTestRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Abort previous in-progress attempts
    abort_stmt = (
        update(TestAttempt)
        .where(and_(TestAttempt.user_id == user.id, TestAttempt.status == "in_progress"))
        .values(status="aborted", completed_at=datetime.utcnow())
    )
    await db.execute(abort_stmt)

    # Calculate baseline starting ELO
    # If they have a saved ELO in student_elo for this subject, use it!
    elo_stmt = select(StudentElo.elo_rating).where(
        and_(StudentElo.user_id == user.id, StudentElo.subject == payload.subject)
    )
    elo_res = await db.execute(elo_stmt)
    start_elo = elo_res.scalar_one_or_none()
    
    if not start_elo:
        # Map slider (1-10) to initial ELO (550 - 1900)
        start_elo = payload.difficulty * 150 + 400

    expires_at = datetime.utcnow() + timedelta(minutes=payload.timer_minutes)
    
    attempt = TestAttempt(
        user_id=user.id,
        status="in_progress",
        difficulty=payload.difficulty,
        start_elo=start_elo,
        expires_at=expires_at,
        remaining_seconds=None
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    return {
        "attempt_id": attempt.id,
        "start_elo": start_elo,
        "expires_at": expires_at.isoformat()
    }

@router.post("/freeze")
async def freeze_test(
    attempt_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TestAttempt).where(and_(TestAttempt.id == attempt_id, TestAttempt.user_id == user.id))
    res = await db.execute(stmt)
    attempt = res.scalar_one_or_none()
    
    if not attempt or attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Тест не найден или уже завершен")

    if attempt.remaining_seconds is not None:
        return {"message": "Тест уже заморожен"}

    # Calculate remaining time
    now = datetime.utcnow()
    rem_seconds = int(max(0, (attempt.expires_at - now).total_seconds()))
    
    attempt.remaining_seconds = rem_seconds
    attempt.expires_at = now + timedelta(days=30)  # Freeze duration (30 days)
    await db.commit()

    return {"message": "Тест заморожен", "remaining_seconds": rem_seconds}

@router.post("/resume")
async def resume_test(
    attempt_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TestAttempt).where(and_(TestAttempt.id == attempt_id, TestAttempt.user_id == user.id))
    res = await db.execute(stmt)
    attempt = res.scalar_one_or_none()

    if not attempt or attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Тест не найден или уже завершен")

    if attempt.remaining_seconds is None:
        return {"message": "Тест не заморожен"}

    # Restore expiration timer based on remaining seconds
    attempt.expires_at = datetime.utcnow() + timedelta(seconds=attempt.remaining_seconds)
    attempt.remaining_seconds = None
    await db.commit()

    return {
        "message": "Тест возобновлен",
        "expires_at": attempt.expires_at.isoformat()
    }

@router.get("/next-question")
async def get_next_question(
    attempt_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TestAttempt).where(and_(TestAttempt.id == attempt_id, TestAttempt.user_id == user.id))
    res = await db.execute(stmt)
    attempt = res.scalar_one_or_none()

    if not attempt or attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Тест не найден или уже завершен")

    # Time expiration check
    if attempt.remaining_seconds is None and attempt.expires_at < datetime.utcnow():
        attempt.status = "completed"
        attempt.completed_at = attempt.expires_at
        await db.commit()
        raise HTTPException(status_code=400, detail="Время теста вышло. Результаты отправлены.")

    # Get answered questions
    ans_stmt = select(TestAnswer.question_id).where(TestAnswer.attempt_id == attempt.id)
    ans_res = await db.execute(ans_stmt)
    answered_ids = [r for r in ans_res.scalars()]

    answered_count = len(answered_ids)
    if answered_count >= 30:
        return {"completed": True}

    # Decide current difficulty layer based on progress
    if answered_count < 10:
        # Base level: 10 questions (choice)
        q_types = ["choice"]
    elif answered_count < 25:
        # Advanced level: 15 questions (multichoice, matching)
        q_types = ["multichoice", "matching"]
    else:
        # Bonus level: 5 essay questions
        q_types = ["essay"]

    # Calculate current ELO rating of attempt (if no answers yet, use start_elo)
    current_elo = attempt.end_elo if attempt.end_elo is not None else attempt.start_elo

    # Fetch pool of questions not yet answered, in matching types
    q_stmt = select(TestQuestion).where(
        and_(
            TestQuestion.type.in_(q_types),
            ~TestQuestion.id.in_(answered_ids) if answered_ids else True
        )
    )
    q_res = await db.execute(q_stmt)
    pool = q_res.scalars().all()

    if not pool:
        # Fallback if specific pool exhausted
        fallback_stmt = select(TestQuestion).where(
            ~TestQuestion.id.in_(answered_ids) if answered_ids else True
        )
        fallback_res = await db.execute(fallback_stmt)
        pool = fallback_res.scalars().all()
        if not pool:
            return {"completed": True}

    # Sort by proximity to current ELO rating, pick randomly from top 5 closest
    pool.sort(key=lambda q: abs(q.elo_rating - current_elo))
    candidates = pool[:5]
    selected_question = random.choice(candidates)

    # Return question details (without correct answers / explanation)
    options = selected_question.options
    if selected_question.type == "matching" and isinstance(options, dict) and "pairs" in options:
        # For matching, we shuffle the values so the student has to match them
        keys = list(options["pairs"].keys())
        vals = list(options["pairs"].values())
        random.shuffle(vals)
        options = {"keys": keys, "shuffled_values": vals}

    return {
        "question_id": selected_question.id,
        "type": selected_question.type,
        "question_text": selected_question.question_text,
        "options": options,
        "subject": selected_question.subject,
        "progress": answered_count + 1,
        "total_questions": 30
    }

@router.post("/submit-answer")
async def submit_answer(
    payload: SubmitAnswerRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TestAttempt).where(and_(TestAttempt.id == payload.attempt_id, TestAttempt.user_id == user.id))
    res = await db.execute(stmt)
    attempt = res.scalar_one_or_none()

    if not attempt or attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Тест не найден или уже завершен")

    # Time expiration check
    if attempt.remaining_seconds is None and attempt.expires_at < datetime.utcnow():
        attempt.status = "completed"
        attempt.completed_at = attempt.expires_at
        await db.commit()
        raise HTTPException(status_code=400, detail="Время теста вышло.")

    # Check if already answered
    exist_stmt = select(TestAnswer).where(
        and_(TestAnswer.attempt_id == attempt.id, TestAnswer.question_id == payload.question_id)
    )
    exist_res = await db.execute(exist_stmt)
    if exist_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Вы уже ответили на этот вопрос")

    # Fetch question details
    q_stmt = select(TestQuestion).where(TestQuestion.id == payload.question_id)
    q_res = await db.execute(q_stmt)
    question = q_res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Вопрос не найден")

    # Check correctness (choice, multichoice, matching)
    is_correct = None
    grade = 0.0
    actual_score = 0.0

    if question.type == "choice":
        # String answer comparison
        is_correct = str(payload.answer).strip().lower() == str(question.correct_answer).strip().lower()
        actual_score = 1.0 if is_correct else 0.0
        grade = 100.0 if is_correct else 0.0

    elif question.type == "multichoice":
        # Compare lists of correct answers (regardless of order)
        try:
            student_ans_set = set(str(x).strip().lower() for x in payload.answer)
            correct_ans_set = set(str(x).strip().lower() for x in question.correct_answer)
            
            intersection = student_ans_set.intersection(correct_ans_set)
            union = student_ans_set.union(correct_ans_set)
            
            # Jaccard index for partial scoring
            actual_score = len(intersection) / len(union) if union else 0.0
            is_correct = actual_score == 1.0
            grade = actual_score * 100.0
        except Exception:
            is_correct = False
            actual_score = 0.0
            grade = 0.0

    elif question.type == "matching":
        # Compare key-value pairs
        try:
            student_dict = {str(k).strip().lower(): str(v).strip().lower() for k, v in payload.answer.items()}
            correct_dict = {str(k).strip().lower(): str(v).strip().lower() for k, v in question.correct_answer.items()}
            
            correct_count = sum(1 for k, v in student_dict.items() if correct_dict.get(k) == v)
            total_count = len(correct_dict)
            
            actual_score = correct_count / total_count if total_count else 0.0
            is_correct = actual_score == 1.0
            grade = actual_score * 100.0
        except Exception:
            is_correct = False
            actual_score = 0.0
            grade = 0.0

    elif question.type == "essay":
        # Async grading, placeholder for scoring (evaluated by background worker)
        is_correct = None
        actual_score = 0.5  # Neutral default ELO adjustment before grading
        grade = None

    # Calculate new attempt ELO rating
    current_elo = attempt.end_elo if attempt.end_elo is not None else attempt.start_elo
    new_student_elo, new_question_elo = update_elo(
        student_rating=current_elo,
        question_rating=question.elo_rating,
        actual_score=actual_score
    )
    
    # Update question ELO difficulty in DB
    question.elo_rating = new_question_elo
    attempt.end_elo = new_student_elo

    # Record answer in database
    answer = TestAnswer(
        attempt_id=attempt.id,
        question_id=question.id,
        student_answer=payload.answer,
        is_correct=is_correct,
        grade=grade,
        feedback="Вопрос принят на проверку." if question.type == "essay" else None
    )
    db.add(answer)
    await db.commit()
    await db.refresh(answer)

    # If essay question, push to background Redis queue for processing
    if question.type == "essay":
        try:
            task = {
                "answer_id": answer.id,
                "student_answer": payload.answer,
                "criteria": question.criteria_matrix
            }
            redis_client.rpush("essay_queue", json.dumps(task))
        except Exception as e:
            print(f"Error queueing essay task: {e}")

    # Progress check
    ans_stmt = select(TestAnswer.id).where(TestAnswer.attempt_id == attempt.id)
    ans_res = await db.execute(ans_stmt)
    answered_count = len(ans_res.scalars().all())

    # Complete test if progress hits 30 questions
    if answered_count >= 30:
        attempt.status = "completed"
        attempt.completed_at = datetime.utcnow()
        
        # Save ELO rating to student_elo profile table
        save_elo_stmt = select(StudentElo).where(
            and_(StudentElo.user_id == user.id, StudentElo.subject == question.subject)
        )
        save_elo_res = await db.execute(save_elo_stmt)
        student_elo_row = save_elo_res.scalar_one_or_none()
        
        if student_elo_row:
            student_elo_row.elo_rating = new_student_elo
            student_elo_row.updated_at = datetime.utcnow()
        else:
            db.add(StudentElo(
                user_id=user.id,
                subject=question.subject,
                elo_rating=new_student_elo
            ))
        
        await db.commit()

    return {
        "type": question.type,
        "is_correct": is_correct,
        "grade": grade,
        "correct_answer": question.correct_answer if question.type != "essay" else None,
        "explanation": question.explanation if question.type != "essay" else "Развернутый ответ оценивается по 5 критериям",
        "new_rating": new_student_elo,
        "completed": answered_count >= 30
    }

@router.post("/warn")
async def update_warnings(
    payload: WarningRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TestAttempt).where(and_(TestAttempt.id == payload.attempt_id, TestAttempt.user_id == user.id))
    res = await db.execute(stmt)
    attempt = res.scalar_one_or_none()

    if not attempt or attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Тест не найден или уже завершен")

    attempt.warnings_count = payload.warnings_count
    
    # Anti-cheat trigger: log out & abort test if 3 warnings reached
    aborted = False
    if payload.warnings_count >= 3:
        attempt.status = "aborted"
        attempt.completed_at = datetime.utcnow()
        aborted = True

    await db.commit()
    return {"warnings_count": attempt.warnings_count, "aborted": aborted}

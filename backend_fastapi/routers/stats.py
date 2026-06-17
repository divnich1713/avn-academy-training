from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from datetime import datetime

from database import get_db
from models import User, TestAttempt, TestAnswer, TestQuestion, StudentElo
from routers.test_engine import get_current_user

router = APIRouter(prefix="/api/stats", tags=["Statistics"])

@router.get("/cadet/dashboard")
async def get_cadet_dashboard(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch user's attempts history
    stmt = (
        select(TestAttempt)
        .where(TestAttempt.user_id == user.id)
        .order_by(TestAttempt.started_at.desc())
    )
    res = await db.execute(stmt)
    attempts = res.scalars().all()

    attempts_history = []
    for att in attempts:
        # Calculate grade percentage
        ans_stmt = select(TestAnswer).where(TestAnswer.attempt_id == att.id)
        ans_res = await db.execute(ans_stmt)
        answers = ans_res.scalars().all()
        
        score = 0.0
        graded_count = 0
        for ans in answers:
            if ans.grade is not None:
                score += float(ans.grade)
                graded_count += 1
        
        avg_score = score / graded_count if graded_count > 0 else 0.0

        attempts_history.append({
            "id": att.id,
            "subject": att.subject,
            "difficulty": att.difficulty,
            "status": att.status,
            "start_elo": att.start_elo,
            "end_elo": att.end_elo,
            "warnings_count": att.warnings_count,
            "started_at": att.started_at.isoformat(),
            "completed_at": att.completed_at.isoformat() if att.completed_at else None,
            "avg_score": round(avg_score, 1)
        })

    # 2. Fetch user's ELO ratings per subject and calculate average mastery
    elo_stmt = select(StudentElo).where(StudentElo.user_id == user.id)
    elo_res = await db.execute(elo_stmt)
    elo_rows = elo_res.scalars().all()

    subject_mastery = {}
    total_mastery = 0.0
    for row in elo_rows:
        # Calculate mastery: ELO 400 = 0%, ELO 2000 = 100%
        mastery = ((row.elo_rating - 400) / 1600.0) * 100.0
        mastery = max(0.0, min(100.0, mastery))
        subject_mastery[row.subject] = round(mastery, 1)
        total_mastery += mastery
    
    avg_mastery = total_mastery / len(elo_rows) if elo_rows else 0.0

    # 3. Calculate rank in group (percentile among all cadets)
    # Get all users with roles = 'cadet'
    all_cadets_stmt = select(User.id).where(User.role == "cadet")
    all_cadets_res = await db.execute(all_cadets_stmt)
    cadet_ids = [r for r in all_cadets_res.scalars()]

    # Get average ELO per cadet
    avg_elo_stmt = (
        select(StudentElo.user_id, func.avg(StudentElo.elo_rating).label("avg_elo"))
        .group_by(StudentElo.user_id)
    )
    avg_elo_res = await db.execute(avg_elo_stmt)
    elo_map = {r[0]: float(r[1]) for r in avg_elo_res.all()}

    my_avg_elo = elo_map.get(user.id, 1000.0)
    
    # Calculate rank
    better_cadets = sum(1 for cid, elo in elo_map.items() if elo > my_avg_elo and cid in cadet_ids)
    total_cadets = len(cadet_ids)
    
    rank_in_group = f"{better_cadets + 1} / {total_cadets}" if total_cadets > 0 else "1 / 1"
    percentile = round((1 - (better_cadets / total_cadets)) * 100.0, 1) if total_cadets > 0 else 100.0

    return {
        "mastery_percent": round(avg_mastery, 1),
        "rank_in_group": rank_in_group,
        "percentile": percentile,
        "subject_mastery": subject_mastery,
        "attempts": attempts_history
    }

@router.get("/admin/dashboard")
async def get_admin_dashboard(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user.role == "cadet":
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    # Fetch all attempts with user details
    stmt = (
        select(TestAttempt, User.name, User.static_id, User.rank, User.unit)
        .join(User, User.id == TestAttempt.user_id)
        .order_by(TestAttempt.started_at.desc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    admin_attempts = []
    for att, name, static_id, rank, unit in rows:
        ans_stmt = select(TestAnswer).where(TestAnswer.attempt_id == att.id)
        ans_res = await db.execute(ans_stmt)
        answers = ans_res.scalars().all()
        
        score = 0.0
        graded_count = 0
        for ans in answers:
            if ans.grade is not None:
                score += float(ans.grade)
                graded_count += 1
        
        avg_score = score / graded_count if graded_count > 0 else 0.0

        admin_attempts.append({
            "attempt_id": att.id,
            "subject": att.subject,
            "cadet_name": name,
            "static_id": static_id,
            "rank": rank,
            "unit": unit,
            "difficulty": att.difficulty,
            "status": att.status,
            "start_elo": att.start_elo,
            "end_elo": att.end_elo,
            "score_percent": round(avg_score, 1),
            "started_at": att.started_at.isoformat(),
            "completed_at": att.completed_at.isoformat() if att.completed_at else None
        })

    return {"attempts": admin_attempts}

@router.get("/d3/topic-difficulty")
async def get_d3_topic_difficulty(db: AsyncSession = Depends(get_db)):
    # Group questions by subject and get avg ELO
    stmt = (
        select(TestQuestion.subject, func.avg(TestQuestion.elo_rating).label("avg_elo"), func.count(TestQuestion.id).label("count"))
        .group_by(TestQuestion.subject)
    )
    res = await db.execute(stmt)
    rows = res.all()
    
    return [
        {
            "topic": row[0],
            "difficulty_elo": round(float(row[1]), 1),
            "questions_count": row[2]
        }
        for row in rows
    ]

@router.get("/d3/time-per-question")
async def get_d3_time_per_question(db: AsyncSession = Depends(get_db)):
    # Calculate answering duration based on timestamps of answers
    stmt = (
        select(TestAttempt.id, TestAttempt.started_at)
        .where(TestAttempt.status == "completed")
        .limit(50)
    )
    res = await db.execute(stmt)
    attempts = res.all()

    type_times = {"choice": [], "multichoice": [], "matching": [], "essay": []}
    
    for att_id, started_at in attempts:
        ans_stmt = (
            select(TestAnswer.answered_at, TestQuestion.type)
            .join(TestQuestion, TestQuestion.id == TestAnswer.question_id)
            .where(TestAnswer.attempt_id == att_id)
            .order_by(TestAnswer.answered_at.asc())
        )
        ans_res = await db.execute(ans_stmt)
        answers = ans_res.all()
        
        last_time = started_at
        for ans_time, q_type in answers:
            duration = (ans_time - last_time).total_seconds()
            if 0 < duration < 600:  # Ignore outliers (e.g. pauses or anomalies)
                type_times[q_type].append(duration)
            last_time = ans_time

    # Calculate average per type
    result = []
    for q_type, durations in type_times.items():
        avg_time = sum(durations) / len(durations) if durations else 0.0
        result.append({
            "type": q_type,
            "avg_time_seconds": round(avg_time, 1),
            "answers_analyzed": len(durations)
        })
        
    return result

@router.get("/d3/score-distribution")
async def get_d3_score_distribution(db: AsyncSession = Depends(get_db)):
    # Score distribution buckets (0-20, 20-40, 40-60, 60-80, 80-100)
    attempts_stmt = select(TestAttempt.id).where(TestAttempt.status == "completed")
    res = await db.execute(attempts_stmt)
    attempt_ids = [r for r in res.scalars()]

    buckets = {"0-20%": 0, "21-40%": 0, "41-60%": 0, "61-80%": 0, "81-100%": 0}

    for att_id in attempt_ids:
        ans_stmt = select(TestAnswer.grade).where(TestAnswer.attempt_id == att_id)
        ans_res = await db.execute(ans_stmt)
        grades = [float(g) for g in ans_res.scalars() if g is not None]
        
        if not grades:
            continue
        
        avg_score = sum(grades) / len(grades)
        
        if avg_score <= 20:
            buckets["0-20%"] += 1
        elif avg_score <= 40:
            buckets["21-40%"] += 1
        elif avg_score <= 60:
            buckets["41-60%"] += 1
        elif avg_score <= 80:
            buckets["61-80%"] += 1
        else:
            buckets["81-100%"] += 1

    return [{"bucket": k, "count": v} for k, v in buckets.items()]

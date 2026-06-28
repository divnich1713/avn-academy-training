from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import select, and_, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from datetime import datetime, timezone
import json
import logging
from pydantic import BaseModel

from database import get_db
from models import User, TestAttempt, TestAnswer, TestQuestion, StudentElo, TestSettings, AuditLog
from routers.test_engine import get_current_user
from config import settings
from redis_client import redis_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stats", tags=["Statistics"])

# Centralized role constants for permission checks
ADMIN_ROLES = ('head_avng', 'chief_instructor', 'deputy_head', 'senior_ufsvng')
INSTRUCTOR_ROLES = ('instructor', 'head_avng', 'chief_instructor', 'senior_instructor', 'junior_instructor', 'deputy_head', 'senior_ufsvng', 'chief_sobr', 'deputy_chief_sobr', 'chief_omon', 'deputy_chief_omon', 'chief_uvo', 'deputy_chief_uvo')

@router.get("/cadet/dashboard")
async def get_cadet_dashboard(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch user's attempts history with aggregated score in a single query (solves N+1 query storm)
    stmt = (
        select(
            TestAttempt,
            func.avg(TestAnswer.grade).label("avg_score")
        )
        .outerjoin(TestAnswer, TestAnswer.attempt_id == TestAttempt.id)
        .where(TestAttempt.user_id == user.id)
        .group_by(TestAttempt.id)
        .order_by(TestAttempt.started_at.desc())
    )
    res = await db.execute(stmt)
    attempts_data = res.all()

    # Fetch all settings to have a lookup dictionary
    settings_stmt = select(TestSettings)
    settings_res = await db.execute(settings_stmt)
    settings_list = settings_res.scalars().all()
    settings_map = {
        s.subject: {
            "question_count": s.question_count,
            "passing_score_percent": s.passing_score_percent
        }
        for s in settings_list
    }

    attempts_history = []
    for att, avg_score in attempts_data:
        avg_score_val = float(avg_score) if avg_score is not None else 0.0
        subj_settings = settings_map.get(att.subject, {"question_count": 30, "passing_score_percent": 80})

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
            "avg_score": round(avg_score_val, 1),
            "question_count": subj_settings["question_count"],
            "passing_score_percent": subj_settings["passing_score_percent"]
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
    skip: int = 0,
    limit: int = 50,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user.role == "cadet":
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    # Fetch attempts with user details and average grade in a single query (solves N+1 query storm)
    # Added skip/limit pagination parameters
    stmt = (
        select(
            TestAttempt, 
            User.name, User.static_id, User.rank, User.unit,
            func.avg(TestAnswer.grade).label("avg_score")
        )
        .join(User, User.id == TestAttempt.user_id)
        .outerjoin(TestAnswer, TestAnswer.attempt_id == TestAttempt.id)
        .group_by(TestAttempt.id, User.id)
        .order_by(TestAttempt.started_at.desc())
        .offset(skip)
        .limit(limit)
    )
    res = await db.execute(stmt)
    rows = res.all()

    # Fetch all settings to have a lookup dictionary
    settings_stmt = select(TestSettings)
    settings_res = await db.execute(settings_stmt)
    settings_list = settings_res.scalars().all()
    settings_map = {
        s.subject: {
            "question_count": s.question_count,
            "passing_score_percent": s.passing_score_percent
        }
        for s in settings_list
    }

    admin_attempts = []
    for att, name, static_id, rank, unit, avg_score in rows:
        avg_score_val = float(avg_score) if avg_score is not None else 0.0
        subj_settings = settings_map.get(att.subject, {"question_count": 30, "passing_score_percent": 80})

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
            "score_percent": round(avg_score_val, 1),
            "started_at": att.started_at.isoformat(),
            "completed_at": att.completed_at.isoformat() if att.completed_at else None,
            "question_count": subj_settings["question_count"],
            "passing_score_percent": subj_settings["passing_score_percent"]
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
    # 1. Fetch completed attempts in a single query
    attempts_stmt = (
        select(TestAttempt.id, TestAttempt.started_at)
        .where(TestAttempt.status == "completed")
        .order_by(TestAttempt.started_at.desc())
        .limit(50)
    )
    res = await db.execute(attempts_stmt)
    attempts = res.all()

    if not attempts:
        return []

    attempt_ids = [att[0] for att in attempts]
    attempt_start_map = {att[0]: att[1] for att in attempts}

    # 2. Fetch all answers for these attempts in one single query (solves N+1 query loop of 50 steps)
    ans_stmt = (
        select(TestAnswer.attempt_id, TestAnswer.answered_at, TestQuestion.type)
        .join(TestQuestion, TestQuestion.id == TestAnswer.question_id)
        .where(TestAnswer.attempt_id.in_(attempt_ids))
        .order_by(TestAnswer.attempt_id.asc(), TestAnswer.answered_at.asc())
    )
    ans_res = await db.execute(ans_stmt)
    answers = ans_res.all()

    # Group answers by attempt
    from collections import defaultdict
    answers_by_attempt = defaultdict(list)
    for att_id, answered_at, q_type in answers:
        answers_by_attempt[att_id].append((answered_at, q_type))

    type_times = {"choice": [], "multichoice": [], "matching": [], "essay": []}
    
    for att_id, started_at in attempts:
        atts_answers = answers_by_attempt.get(att_id, [])
        last_time = started_at
        for ans_time, q_type in atts_answers:
            duration = (ans_time - last_time).total_seconds()
            if 0 < duration < 600:  # Ignore outliers (e.g. pauses or anomalies)
                type_times.get(q_type, []).append(duration)
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
    # Calculate average grade per attempt directly in SQL in a single query (solves N+1 queries)
    stmt = (
        select(func.avg(TestAnswer.grade))
        .join(TestAttempt, TestAttempt.id == TestAnswer.attempt_id)
        .where(TestAttempt.status == "completed")
        .where(TestAnswer.grade.isnot(None))
        .group_by(TestAttempt.id)
    )
    res = await db.execute(stmt)
    avg_grades = [float(g) for g in res.scalars()]

    buckets = {"0-20%": 0, "21-40%": 0, "41-60%": 0, "61-80%": 0, "81-100%": 0}

    for avg_score in avg_grades:
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

async def log_admin_action(
    db: AsyncSession,
    operator_id: int,
    operator_name: str,
    action: str,
    target_id: str = None,
    target_name: str = None,
    details: Any = None
):
    try:
        log = AuditLog(
            operator_id=operator_id,
            operator_name=operator_name,
            action=action,
            target_id=str(target_id) if target_id is not None else None,
            target_name=target_name,
            details=details,
            created_at=datetime.now(timezone.utc)
        )
        db.add(log)
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Error writing audit log: {e}")

@router.get("/admin/audit-logs")
async def get_audit_logs(
    skip: int = 0,
    limit: int = 50,
    action: str = None,
    operator: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in INSTRUCTOR_ROLES:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
    
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    if action and action != "all":
        stmt = stmt.where(AuditLog.action == action)
    if operator:
        stmt = stmt.where(AuditLog.operator_name.ilike(f"%{operator}%"))
    
    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.offset(skip).limit(limit)
    res = await db.execute(stmt)
    logs = res.scalars().all()
    
    return {
        "total": total,
        "logs": [
            {
                "id": l.id,
                "operator_id": l.operator_id,
                "operator_name": l.operator_name,
                "action": l.action,
                "target_id": l.target_id,
                "target_name": l.target_name,
                "details": l.details,
                "created_at": l.created_at.isoformat()
            }
            for l in logs
        ]
    }

@router.get("/admin/analytics/summary")
async def get_analytics_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in INSTRUCTOR_ROLES:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    attempts_cnt_stmt = select(func.count(TestAttempt.id))
    attempts_cnt_res = await db.execute(attempts_cnt_stmt)
    total_attempts = attempts_cnt_res.scalar() or 0

    completed_cnt_stmt = select(func.count(TestAttempt.id)).where(TestAttempt.status == "completed")
    completed_cnt_res = await db.execute(completed_cnt_stmt)
    completed_attempts = completed_cnt_res.scalar() or 0

    pass_rate = 0.0
    avg_score = 0.0
    if completed_attempts > 0:
        stmt_grades = (
            select(TestAttempt.id, func.avg(TestAnswer.grade).label("avg_grade"))
            .join(TestAnswer, TestAnswer.attempt_id == TestAttempt.id)
            .where(TestAttempt.status == "completed")
            .group_by(TestAttempt.id)
        )
        res_grades = await db.execute(stmt_grades)
        grades_list = res_grades.all()
        
        if grades_list:
            total_grades = [float(g[1]) for g in grades_list]
            avg_score = sum(total_grades) / len(total_grades)
            passed_cnt = sum(1 for g in total_grades if g >= 80)
            pass_rate = (passed_cnt / completed_attempts) * 100.0

    complex_q_stmt = (
        select(
            TestQuestion.id,
            TestQuestion.question_text,
            TestQuestion.subject,
            TestQuestion.elo_rating,
            func.avg(TestAnswer.grade).label("avg_score"),
            func.count(TestAnswer.id).label("total_answers")
        )
        .join(TestAnswer, TestAnswer.question_id == TestQuestion.id)
        .group_by(TestQuestion.id)
        .having(func.count(TestAnswer.id) >= 2)
        .order_by(func.avg(TestAnswer.grade).asc())
        .limit(10)
    )
    complex_res = await db.execute(complex_q_stmt)
    complex_qs = complex_res.all()
    
    complex_questions = [
        {
            "id": q[0],
            "question_text": q[1][:120] + "..." if len(q[1]) > 120 else q[1],
            "subject": q[2],
            "elo_rating": q[3],
            "avg_score": round(float(q[4]), 1) if q[4] is not None else 0.0,
            "total_answers": q[5]
        }
        for q in complex_qs
    ]

    instr_stmt = (
        select(AuditLog.operator_name, func.count(AuditLog.id).label("action_count"))
        .group_by(AuditLog.operator_name)
        .order_by(func.count(AuditLog.id).desc())
        .limit(5)
    )
    instr_res = await db.execute(instr_stmt)
    instr_data = instr_res.all()
    instructor_activity = [{"name": i[0], "count": i[1]} for i in instr_data]

    return {
        "total_attempts": total_attempts,
        "completed_attempts": completed_attempts,
        "pass_rate": round(pass_rate, 1),
        "avg_score": round(avg_score, 1),
        "complex_questions": complex_questions,
        "instructor_activity": instructor_activity
    }

from pydantic import BaseModel
class BulkUpdatePayload(BaseModel):
    user_ids: List[int]
    rank: str = None
    unit: str = None
    role: str = None
    action: str = None
    reason: str = None

@router.post("/admin/users/bulk-update")
async def bulk_update_users(
    payload: BulkUpdatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in INSTRUCTOR_ROLES:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
    
    if not payload.user_ids:
        return {"message": "No users selected"}

    users_stmt = select(User).where(User.id.in_(payload.user_ids))
    res = await db.execute(users_stmt)
    users_list = res.scalars().all()
    
    details_log = []
    from config import settings
    
    for u in users_list:
        old_rank = u.rank
        old_role = u.role
        old_unit = u.unit
        
        if payload.action == "delete":
            if u.role != "cadet" and current_user.role != "head_avng":
                details_log.append(f"Skipped deleting non-cadet {u.name} (static_id: {u.static_id}) due to insufficient rights")
                continue
            await db.delete(u)
            details_log.append(f"Deleted user {u.name} (static_id: {u.static_id})")
        elif payload.action == "dismiss":
            u.role = "dismissed"
            u.unit = "Уволен"
            details_log.append(f"Dismissed user {u.name} (static_id: {u.static_id})")
        elif payload.action == "whitelist":
            u.is_whitelisted = True
            details_log.append(f"Whitelisted user {u.name} (static_id: {u.static_id})")
        elif payload.action == "warn":
            from sqlalchemy import text
            sql_warn = f"INSERT INTO {settings.SCHEMA}.instructor_warnings (user_id, reason, issued_by, is_active, created_at) VALUES (:u_id, :reason, :issued_by, TRUE, NOW())"
            await db.execute(text(sql_warn), {
                "u_id": u.id,
                "reason": payload.reason or "Предупреждение выдано пакетом",
                "issued_by": current_user.id
            })
            details_log.append(f"Issued warning to {u.name} (static_id: {u.static_id}): {payload.reason}")
        else:
            updated = []
            if payload.rank:
                u.rank = payload.rank
                updated.append(f"rank {old_rank} -> {payload.rank}")
            if payload.unit:
                u.unit = payload.unit
                updated.append(f"unit {old_unit} -> {payload.unit}")
            if payload.role:
                # Only head_avng can change instructor roles
                if (u.role != payload.role) and ("instructor" in payload.role or "head" in payload.role or "chief" in payload.role) and current_user.role not in ["head_avng", "deputy_head"]:
                    details_log.append(f"Skipped changing role of {u.name} to {payload.role} (unauthorized)")
                    continue
                u.role = payload.role
                updated.append(f"role {old_role} -> {payload.role}")
            if updated:
                details_log.append(f"Updated {u.name} ({u.static_id}): " + ", ".join(updated))
                
    await db.commit()
    
    await log_admin_action(
        db,
        current_user.id,
        current_user.name,
        "bulk_update",
        target_id=str(payload.user_ids),
        target_name=f"{len(users_list)} пользователей",
        details={"changes": details_log, "action": payload.action}
    )
    
    return {"message": "Успешно обновлено", "count": len(users_list), "log": details_log}

class CadetImportRow(BaseModel):
    static_id: str
    name: str
    rank: str = "Рядовой"
    unit: str = "АВНГ"
    password: str = "123456"

class BulkImportPayload(BaseModel):
    cadets: List[CadetImportRow]

@router.post("/admin/users/bulk-import")
async def bulk_import_users(
    payload: BulkImportPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in INSTRUCTOR_ROLES:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    import re
    import bcrypt

    created_users = []
    skipped_users = []

    for c in payload.cadets:
        clean_id = str(c.static_id).replace("-", "").strip()
        if not re.fullmatch(r"\d{6}", clean_id):
            skipped_users.append(f"Неверный ID {c.static_id} (должно быть 6 цифр)")
            continue

        exist_stmt = select(User).where(User.static_id == clean_id)
        exist_res = await db.execute(exist_stmt)
        if exist_res.scalar() is not None:
            skipped_users.append(f"ID {c.static_id} уже занят")
            continue

        pw_hash = bcrypt.hashpw(c.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        new_user = User(
            static_id=clean_id,
            password_hash=pw_hash,
            name=c.name,
            rank=c.rank,
            unit=c.unit,
            role="cadet",
            is_whitelisted=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(new_user)
        created_users.append(f"Создан {c.rank} {c.name} ({clean_id})")

    await db.commit()

    if created_users:
        await log_admin_action(
            db,
            current_user.id,
            current_user.name,
            "bulk_import",
            target_id=None,
            target_name=f"{len(created_users)} курсантов",
            details={"created": created_users, "skipped": skipped_users}
        )

    return {
        "message": f"Успешно импортировано {len(created_users)} курсантов",
        "imported_count": len(created_users),
        "skipped": skipped_users
    }

@router.get("/admin/monitoring/alerts")
async def get_monitoring_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in INSTRUCTOR_ROLES:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    alerts = []
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    ten_days_ago = now - timedelta(days=10)

    # 1. Fetch all cadets
    cadets_stmt = select(User).where(User.role == "cadet")
    cadets_res = await db.execute(cadets_stmt)
    cadets_list = cadets_res.scalars().all()
    cadet_ids = [c.id for c in cadets_list]
    cadets_map = {c.id: c for c in cadets_list}

    if not cadet_ids:
        return alerts

    # 2. Single query: latest attempt per cadet (using window function)
    row_num = func.row_number().over(
        partition_by=TestAttempt.user_id,
        order_by=TestAttempt.started_at.desc()
    ).label("rn")
    latest_sub = (
        select(TestAttempt.user_id, TestAttempt.started_at, row_num)
        .where(TestAttempt.user_id.in_(cadet_ids))
    ).subquery()
    latest_stmt = (
        select(latest_sub.c.user_id, latest_sub.c.started_at)
        .where(latest_sub.c.rn == 1)
    )
    latest_res = await db.execute(latest_stmt)
    latest_map = {r[0]: r[1] for r in latest_res.all()}

    # 3. Single query: avg grade of last 3 completed attempts per cadet
    comp_rn = func.row_number().over(
        partition_by=TestAttempt.user_id,
        order_by=TestAttempt.started_at.desc()
    ).label("rn")
    comp_sub = (
        select(TestAttempt.id.label("att_id"), TestAttempt.user_id, comp_rn)
        .where(
            and_(
                TestAttempt.user_id.in_(cadet_ids),
                TestAttempt.status == "completed"
            )
        )
    ).subquery()
    top3_sub = (
        select(comp_sub.c.att_id, comp_sub.c.user_id)
        .where(comp_sub.c.rn <= 3)
    ).subquery()
    grades_stmt = (
        select(
            top3_sub.c.user_id,
            top3_sub.c.att_id,
            func.avg(TestAnswer.grade).label("avg_grade")
        )
        .join(TestAnswer, TestAnswer.attempt_id == top3_sub.c.att_id)
        .group_by(top3_sub.c.user_id, top3_sub.c.att_id)
    )
    grades_res = await db.execute(grades_stmt)
    # Group grades by cadet: {user_id: [avg_grade1, avg_grade2, avg_grade3]}
    from collections import defaultdict
    grades_by_cadet = defaultdict(list)
    for uid, att_id, avg_grade in grades_res.all():
        avg_val = float(avg_grade) if avg_grade is not None else 0.0
        grades_by_cadet[uid].append(avg_val)

    # 4. Build alerts from pre-fetched data
    for cid, c in cadets_map.items():
        last_started = latest_map.get(cid)

        if last_started is None:
            # No attempts at all
            if c.created_at < seven_days_ago:
                alerts.append({
                    "user_id": c.id,
                    "static_id": c.static_id,
                    "name": c.name,
                    "rank": c.rank,
                    "type": "inactive_no_attempts",
                    "severity": "warning",
                    "message": f"Нет активности с момента регистрации ({c.created_at.strftime('%d.%m.%Y')})"
                })
        else:
            if last_started < ten_days_ago:
                alerts.append({
                    "user_id": c.id,
                    "static_id": c.static_id,
                    "name": c.name,
                    "rank": c.rank,
                    "type": "inactive_long_time",
                    "severity": "warning",
                    "message": f"Последний тест запущен {last_started.strftime('%d.%m.%Y')}"
                })

        # Check struggling cadets: last 3 completed attempts all failed
        cadet_grades = grades_by_cadet.get(cid, [])
        if len(cadet_grades) >= 3:
            failures_cnt = sum(1 for g in cadet_grades[:3] if g < 80.0)
            if failures_cnt == 3:
                alerts.append({
                    "user_id": c.id,
                    "static_id": c.static_id,
                    "name": c.name,
                    "rank": c.rank,
                    "type": "three_failures",
                    "severity": "critical",
                    "message": "3 проваленных теста подряд (требуется помощь инструктора)"
                })

    return alerts

class DiscordResolveRequest(BaseModel):
    request_id: int
    action: str  # "approve" or "reject"
    discord_user_id: str
    discord_user_name: str

@router.post("/admin/discord/resolve-request")
async def resolve_request_from_discord(
    payload: DiscordResolveRequest,
    x_bot_secret: str = Header(None, alias="X-Bot-Secret"),
    db: AsyncSession = Depends(get_db)
):
    # 1. Verify bot secret to prevent unauthorized access
    if not x_bot_secret or x_bot_secret != settings.DISCORD_BOT_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized. Invalid bot secret.")

    # 2. Find the request in DB using raw query (due to missing requests ORM model)
    req_stmt = text(f'SELECT id, status, user_id, type, subject FROM "{settings.SCHEMA}".requests WHERE id = :id')
    req_res = await db.execute(req_stmt, {"id": payload.request_id})
    request = req_res.fetchone()
    if not request:
        raise HTTPException(status_code=404, detail=f"Request with ID {payload.request_id} not found.")

    req_id, status, cadet_id, req_type, subject = request
    if status != "pending" and status != "created":
        raise HTTPException(status_code=400, detail=f"Запрос уже обработан (статус: {status}).")

    # 3. Find instructor by Discord ID
    inst_stmt = select(User).where(User.discord_id == payload.discord_user_id)
    inst_res = await db.execute(inst_stmt)
    instructor = inst_res.scalar_one_or_none()
    if not instructor:
        raise HTTPException(
            status_code=400, 
            detail=f"Инструктор с Discord ID {payload.discord_user_id} не найден в базе данных AVN Academy. Пожалуйста, привяжите ваш Discord ID в личном профиле на сайте!"
        )

    # 4. Find cadet info for Audit Log
    cadet_stmt = select(User).where(User.id == cadet_id)
    cadet_res = await db.execute(cadet_stmt)
    cadet = cadet_res.scalar_one_or_none()
    cadet_name = cadet.name if cadet else "Неизвестный курсант"

    # 5. Resolve request in DB
    new_status = "approved" if payload.action == "approve" else "rejected"
    comment = "Решено через Discord-бота"
    
    update_stmt = text(
        f'UPDATE "{settings.SCHEMA}".requests '
        f'SET status = :status, instructor_comment = :comment, reviewed_by = :reviewed_by, reviewed_at = NOW(), updated_at = NOW() '
        f'WHERE id = :id'
    )
    await db.execute(update_stmt, {
        "status": new_status,
        "comment": comment,
        "reviewed_by": instructor.id,
        "id": req_id
    })

    # 6. Insert/Update grades for lecture/practice/exam blocks
    if req_type in ("lecture", "practice", "exam"):
        grade_val = 5 if payload.action == "approve" else 1
        grade_comment = "Автоматический зачет по запросу из Discord" if payload.action == "approve" else "Автоматический незачет по запросу из Discord"
        
        # Check if grade already exists for this request
        chk_grade = text(f'SELECT id FROM "{settings.SCHEMA}".grades WHERE request_id = :request_id')
        chk_res = await db.execute(chk_grade, {"request_id": req_id})
        existing = chk_res.fetchone()
        
        if not existing:
            ins_grade = text(
                f'INSERT INTO "{settings.SCHEMA}".grades (user_id, instructor_id, request_id, subject, type, grade, comment, graded_at) '
                f'VALUES (:user_id, :instructor_id, :request_id, :subject, :type, :grade, :comment, NOW())'
            )
            await db.execute(ins_grade, {
                "user_id": cadet_id,
                "instructor_id": instructor.id,
                "request_id": req_id,
                "subject": subject,
                "type": req_type,
                "grade": grade_val,
                "comment": grade_comment
            })
        else:
            upd_grade = text(
                f'UPDATE "{settings.SCHEMA}".grades '
                f'SET grade = :grade, comment = :comment, instructor_id = :instructor_id, graded_at = NOW() '
                f'WHERE request_id = :request_id'
            )
            await db.execute(upd_grade, {
                "grade": grade_val,
                "comment": grade_comment,
                "instructor_id": instructor.id,
                "request_id": req_id
            })

    # 7. Add notification for Cadet
    notif_title = f"Запрос {'одобрен' if payload.action == 'approve' else 'отклонён'}"
    notif_msg = f"Инструктор {instructor.name} {'одобрил' if payload.action == 'approve' else 'отклонил'} ваш запрос на тему \"{subject}\" через Discord-бота."
    
    ins_notif = text(
        f'INSERT INTO "{settings.SCHEMA}".notifications (user_id, type, title, message, created_at) '
        f'VALUES (:user_id, :type, :title, :message, NOW())'
    )
    await db.execute(ins_notif, {
        "user_id": cadet_id,
        "type": "request_reviewed",
        "title": notif_title,
        "message": notif_msg
    })

    # 8. Log action in AuditLog
    audit_log = AuditLog(
        operator_id=instructor.id,
        operator_name=instructor.name,
        action="approve_request" if payload.action == "approve" else "reject_request",
        target_id=str(req_id),
        target_name=subject,
        details={
            "type": req_type,
            "comment": comment,
            "resolved_via": "discord_bot"
        }
    )
    db.add(audit_log)
    
    await db.commit()
    logger_msg = f"Request ID {req_id} successfully {new_status} by instructor {instructor.name} (Discord ID: {payload.discord_user_id})"
    logger.info(logger_msg)
    
    return {"success": True, "message": logger_msg}

class DiscordEvent(BaseModel):
    event_type: str
    data: dict

@router.post("/admin/discord/publish-event")
async def publish_discord_event(
    payload: DiscordEvent,
    x_bot_secret: str = Header(None, alias="X-Bot-Secret"),
):
    if not x_bot_secret or x_bot_secret != settings.DISCORD_BOT_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized. Invalid bot secret.")
        
    event_payload = {
        "type": payload.event_type,
        "data": payload.data
    }
    
    await redis_client.publish("discord_notifications", json.dumps(event_payload))
    return {"success": True}

@router.post("/admin/discord/publish-event-user")
async def publish_discord_event_user(
    payload: DiscordEvent,
    user: User = Depends(get_current_user),
):
    event_payload = {
        "type": payload.event_type,
        "data": payload.data
    }
    
    await redis_client.publish("discord_notifications", json.dumps(event_payload))
    return {"success": True}


class DiscordCreateUserPayload(BaseModel):
    static_id: str
    name: str
    rank: str = "Рядовой"
    role: str = "cadet"
    discord_id: str = ""
    category: str = "cadet"


@router.post("/admin/discord/create-user")
async def discord_create_user(
    payload: DiscordCreateUserPayload,
    x_bot_secret: str = Header(None, alias="X-Bot-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Create a new user from a Discord bot application acceptance."""
    if not x_bot_secret or x_bot_secret != settings.DISCORD_BOT_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized. Invalid bot secret.")

    import re
    import bcrypt

    # Validate static_id
    clean_id = str(payload.static_id).replace("-", "").strip()
    if not re.fullmatch(r"\d{6}", clean_id):
        raise HTTPException(status_code=400, detail=f"Неверный static_id: {payload.static_id}. Должно быть 6 цифр.")

    # Check uniqueness
    exist_stmt = select(User).where(User.static_id == clean_id)
    exist_res = await db.execute(exist_stmt)
    if exist_res.scalar() is not None:
        raise HTTPException(status_code=409, detail=f"Пользователь с ID {clean_id} уже существует.")

    # Create user with password = static_id (user can change later)
    pw_hash = bcrypt.hashpw(clean_id.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    new_user = User(
        static_id=clean_id,
        password_hash=pw_hash,
        name=payload.name,
        rank=payload.rank,
        unit="АВНГ",
        role=payload.role,
        discord_id=payload.discord_id,
        is_whitelisted=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "success": True,
        "id": new_user.id,
        "static_id": new_user.static_id,
        "name": new_user.name,
    }

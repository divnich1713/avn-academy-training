from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import select, and_, update, text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import User, Department, Rank, DismissalReport, Transfer, WarehouseRequest, DepartmentTemplate, AuditLog, PromotionReport
from config import settings
from redis_client import redis_client

router = APIRouter(prefix="/api/faction", tags=["Faction Management"])

# Helper to check secret
def verify_bot_secret(x_bot_secret: str = Header(None, alias="X-Bot-Secret")):
    if not x_bot_secret or x_bot_secret != settings.DISCORD_BOT_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized. Invalid bot secret.")
    return x_bot_secret

# --- Pydantic Models ---
class RegisterPayload(BaseModel):
    discord_id: str
    static_id: str
    name: str
    rank: str = "Рядовой"
    category: str = "cadet"

class UpdateMemberPayload(BaseModel):
    discord_id: str
    department_id: Optional[int] = None
    rank_id: Optional[int] = None
    points_delta: Optional[int] = None
    notes: Optional[str] = None
    operator_discord_id: str

class DismissalPayload(BaseModel):
    discord_id: str
    reason: str
    comment: Optional[str] = None
    photo_url: Optional[str] = None

class DismissalReviewPayload(BaseModel):
    report_id: int
    action: str  # approve, reject
    operator_discord_id: str
    comment: Optional[str] = None

class TransferPayload(BaseModel):
    discord_id: str
    from_dept_id: int
    to_dept_id: int
    reason: str

class TransferReviewPayload(BaseModel):
    transfer_id: int
    side: str  # sender, receiver
    action: str  # approve, reject
    operator_discord_id: str

class WarehousePayload(BaseModel):
    discord_id: str
    items: List[Dict[str, Any]]
    comment: Optional[str] = None

class WarehouseReviewPayload(BaseModel):
    request_id: int
    action: str  # approve, reject
    operator_discord_id: str

# --- Endpoints ---

@router.get("/profile/{discord_id}")
async def get_profile(discord_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(User, Department, Rank)
        .outerjoin(Department, Department.id == User.department_id)
        .outerjoin(Rank, Rank.id == User.rank_id)
        .where(User.discord_id == discord_id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    
    user, dept, rank = row
    return {
        "id": user.id,
        "static_id": user.static_id,
        "name": user.name,
        "rank": user.rank,
        "unit": user.unit,
        "role": user.role,
        "points": user.points,
        "notes": user.notes,
        "discord_id": user.discord_id,
        "department": {
            "id": dept.id,
            "name": dept.name,
            "discord_role_id": dept.discord_role_id
        } if dept else None,
        "rank_info": {
            "id": rank.id,
            "name": rank.name,
            "level": rank.level,
            "discord_role_id": rank.discord_role_id
        } if rank else None
    }

@router.post("/register")
async def register_member(
    payload: RegisterPayload,
    db: AsyncSession = Depends(get_db),
    _ = Depends(verify_bot_secret)
):
    import bcrypt
    clean_id = payload.static_id.replace("-", "").strip()
    
    # Check if already exists
    exist_stmt = select(User).where(User.static_id == clean_id)
    exist_res = await db.execute(exist_stmt)
    if exist_res.scalar() is not None:
        raise HTTPException(status_code=409, detail="User with this static ID already exists")

    # Fetch default rank
    rank_stmt = select(Rank).where(Rank.name == payload.rank)
    rank_res = await db.execute(rank_stmt)
    rank_obj = rank_res.scalar()

    # Fetch default department (АВНГ)
    dept_stmt = select(Department).where(Department.name == "АВНГ")
    dept_res = await db.execute(dept_stmt)
    dept_obj = dept_res.scalar()

    pw_hash = bcrypt.hashpw(clean_id.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    new_user = User(
        static_id=clean_id,
        password_hash=pw_hash,
        name=payload.name,
        rank=payload.rank,
        unit=dept_obj.name if dept_obj else "АВНГ",
        role="cadet",
        discord_id=payload.discord_id,
        is_whitelisted=True,
        department_id=dept_obj.id if dept_obj else None,
        rank_id=rank_obj.id if rank_obj else None,
        points=0
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Log in audit
    audit = AuditLog(
        operator_name="System/Discord Bot",
        action="register_user",
        target_id=str(new_user.id),
        target_name=new_user.name,
        details={"static_id": clean_id, "discord_id": payload.discord_id}
    )
    db.add(audit)
    await db.commit()

    return {"success": True, "user_id": new_user.id}

@router.get("/departments")
async def get_departments(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Department).order_by(Department.name))
    return res.scalars().all()

@router.get("/ranks")
async def get_ranks(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Rank).order_by(Rank.level))
    return res.scalars().all()

@router.post("/members/update")
async def update_member(
    payload: UpdateMemberPayload,
    db: AsyncSession = Depends(get_db),
    _ = Depends(verify_bot_secret)
):
    # Fetch user
    stmt = select(User).where(User.discord_id == payload.discord_id)
    res = await db.execute(stmt)
    user = res.scalar()
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")

    # Fetch operator
    op_stmt = select(User).where(User.discord_id == payload.operator_discord_id)
    op_res = await db.execute(op_stmt)
    operator = op_res.scalar()
    operator_name = operator.name if operator else "Admin"

    changes = {}
    if payload.department_id is not None:
        dept = await db.get(Department, payload.department_id)
        if dept:
            user.department_id = dept.id
            user.unit = dept.name
            changes["department"] = dept.name
    
    if payload.rank_id is not None:
        rank = await db.get(Rank, payload.rank_id)
        if rank:
            user.rank_id = rank.id
            user.rank = rank.name
            changes["rank"] = rank.name

    if payload.points_delta is not None:
        user.points = (user.points or 0) + payload.points_delta
        changes["points_delta"] = payload.points_delta
        changes["new_points"] = user.points

    if payload.notes is not None:
        user.notes = payload.notes
        changes["notes"] = payload.notes

    if changes:
        user.updated_at = datetime.utcnow()
        db.add(user)
        
        # Log action
        audit = AuditLog(
            operator_id=operator.id if operator else None,
            operator_name=operator_name,
            action="update_member_profile",
            target_id=str(user.id),
            target_name=user.name,
            details=changes
        )
        db.add(audit)
        await db.commit()

    return {"success": True, "changes": changes}

@router.post("/dismiss")
async def submit_dismissal(
    payload: DismissalPayload,
    db: AsyncSession = Depends(get_db),
    _ = Depends(verify_bot_secret)
):
    user_stmt = select(User).where(User.discord_id == payload.discord_id)
    res = await db.execute(user_stmt)
    user = res.scalar()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    report = DismissalReport(
        user_id=user.id,
        reason=payload.reason,
        comment=payload.comment,
        photo_url=payload.photo_url,
        status="pending"
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return {"success": True, "report_id": report.id}

@router.post("/dismiss/review")
async def review_dismissal(
    payload: DismissalReviewPayload,
    db: AsyncSession = Depends(get_db),
    _ = Depends(verify_bot_secret)
):
    report = await db.get(DismissalReport, payload.report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    op_stmt = select(User).where(User.discord_id == payload.operator_discord_id)
    op_res = await db.execute(op_stmt)
    operator = op_res.scalar()
    if not operator:
        raise HTTPException(status_code=404, detail="Operator not found")

    status = "approved" if payload.action == "approve" else "rejected"
    report.status = status
    report.reviewed_by = operator.id
    report.reviewed_at = datetime.utcnow()
    report.comment = payload.comment or report.comment
    db.add(report)

    if status == "approved":
        # Archive employee
        employee = await db.get(User, report.user_id)
        if employee:
            employee.role = "dismissed"
            employee.unit = "Архив"
            employee.rank = "Уволен"
            employee.updated_at = datetime.utcnow()
            db.add(employee)

    # Log action
    audit = AuditLog(
        operator_id=operator.id,
        operator_name=operator.name,
        action="review_dismissal",
        target_id=str(report.id),
        target_name=f"User ID: {report.user_id}",
        details={"status": status, "comment": payload.comment}
    )
    db.add(audit)
    await db.commit()

    return {"success": True, "status": status}

@router.post("/transfers/submit")
async def submit_transfer(
    payload: TransferPayload,
    db: AsyncSession = Depends(get_db),
    _ = Depends(verify_bot_secret)
):
    user_stmt = select(User).where(User.discord_id == payload.discord_id)
    res = await db.execute(user_stmt)
    user = res.scalar()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check for 3-day cooldown on approved transfers
    from datetime import timedelta
    cooldown_limit = datetime.utcnow() - timedelta(days=3)
    
    cooldown_stmt = select(Transfer).where(
        and_(
            Transfer.user_id == user.id,
            Transfer.status == "approved",
            Transfer.updated_at >= cooldown_limit
        )
    )
    cooldown_res = await db.execute(cooldown_stmt)
    recent_transfer = cooldown_res.scalar()
    
    if recent_transfer:
        time_passed = datetime.utcnow() - recent_transfer.updated_at
        time_left = timedelta(days=3) - time_passed
        hours_left = int(time_left.total_seconds() // 3600)
        minutes_left = int((time_left.total_seconds() % 3600) // 60)
        
        return {
            "error": f"Вы не можете переводиться чаще чем раз в 3 дня. До следующей возможности осталось {hours_left} ч. {minutes_left} мин."
        }

    transfer = Transfer(
        user_id=user.id,
        from_department_id=payload.from_dept_id,
        to_department_id=payload.to_dept_id,
        reason=payload.reason,
        status="pending"
    )
    db.add(transfer)
    await db.commit()
    await db.refresh(transfer)

    return {"success": True, "transfer_id": transfer.id}

@router.post("/transfers/approve")
async def approve_transfer(
    payload: TransferReviewPayload,
    db: AsyncSession = Depends(get_db),
    _ = Depends(verify_bot_secret)
):
    transfer = await db.get(Transfer, payload.transfer_id)
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")

    op_stmt = select(User).where(User.discord_id == payload.operator_discord_id)
    op_res = await db.execute(op_stmt)
    operator = op_res.scalar()
    if not operator:
        raise HTTPException(status_code=404, detail="Operator not found")

    if payload.action == "reject":
        transfer.status = "rejected"
        await db.commit()
        return {"success": True, "status": "rejected"}

    if payload.side == "sender":
        transfer.sender_leader_id = operator.id
        if transfer.status == "pending":
            transfer.status = "approved_by_sender"
        elif transfer.status == "approved_by_receiver":
            transfer.status = "approved"
    elif payload.side == "receiver":
        transfer.receiver_leader_id = operator.id
        if transfer.status == "pending":
            transfer.status = "approved_by_receiver"
        elif transfer.status == "approved_by_sender":
            transfer.status = "approved"

    # If fully approved, apply changes
    if transfer.status == "approved":
        employee = await db.get(User, transfer.user_id)
        if employee:
            employee.department_id = transfer.to_department_id
            dept = await db.get(Department, transfer.to_department_id)
            if dept:
                employee.unit = dept.name
            employee.updated_at = datetime.utcnow()
            db.add(employee)

    db.add(transfer)
    await db.commit()

    return {"success": True, "status": transfer.status}

@router.post("/warehouse/request")
async def request_warehouse(
    payload: WarehousePayload,
    db: AsyncSession = Depends(get_db),
    _ = Depends(verify_bot_secret)
):
    user_stmt = select(User).where(User.discord_id == payload.discord_id)
    res = await db.execute(user_stmt)
    user = res.scalar()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    req = WarehouseRequest(
        user_id=user.id,
        items=payload.items,
        comment=payload.comment,
        status="pending"
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    return {"success": True, "request_id": req.id}

@router.post("/warehouse/review")
async def review_warehouse(
    payload: WarehouseReviewPayload,
    db: AsyncSession = Depends(get_db),
    _ = Depends(verify_bot_secret)
):
    req = await db.get(WarehouseRequest, payload.request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    op_stmt = select(User).where(User.discord_id == payload.operator_discord_id)
    op_res = await db.execute(op_stmt)
    operator = op_res.scalar()
    if not operator:
        raise HTTPException(status_code=404, detail="Operator not found")

    status = "approved" if payload.action == "approve" else "rejected"
    req.status = status
    req.reviewed_by = operator.id
    req.reviewed_at = datetime.utcnow()
    db.add(req)

    # Log action
    audit = AuditLog(
        operator_id=operator.id,
        operator_name=operator.name,
        action="review_warehouse_request",
        target_id=str(req.id),
        target_name=f"User ID: {req.user_id}",
        details={"status": status, "items": req.items}
    )
    db.add(audit)
    await db.commit()

    return {"success": True, "status": status}


# --- Promotion Report Models ---

class PromotionPayload(BaseModel):
    user_id: int
    from_rank: str
    to_rank: str
    department: Optional[str] = None
    submitted_by_discord_id: str
    points: Optional[str] = None
    links: Optional[str] = None
    comment: Optional[str] = None
    status: str = "pending"

class PromotionStatusPayload(BaseModel):
    action: str  # approved, rejected
    reviewed_by_discord_id: str


@router.get("/promotions/settings")
async def get_promotions_settings(
    unit: str,
    db: AsyncSession = Depends(get_db),
    _ = Depends(verify_bot_secret)
):
    sql = "SELECT points_config, ranks_flow FROM t_p29017774_avn_academy_training.instructor_promotion_settings WHERE unit = :unit"
    res = await db.execute(text(sql), {"unit": unit})
    row = res.first()
    if not row:
        res = await db.execute(text("SELECT points_config, ranks_flow FROM t_p29017774_avn_academy_training.instructor_promotion_settings WHERE unit = 'АВНГ'"))
        row = res.first()
        
    if not row:
        return {"points_config": [], "ranks_flow": []}
        
    return {
        "points_config": row[0],
        "ranks_flow": row[1]
    }


# --- Promotion Endpoints ---

@router.post("/promotions")
async def submit_promotion(
    payload: PromotionPayload,
    db: AsyncSession = Depends(get_db),
    _ = Depends(verify_bot_secret)
):
    """Submit a new promotion report."""
    # Verify user exists
    user = await db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    report = PromotionReport(
        user_id=payload.user_id,
        from_rank=payload.from_rank,
        to_rank=payload.to_rank,
        department=payload.department,
        submitted_by_discord_id=payload.submitted_by_discord_id,
        points=payload.points,
        links=payload.links,
        comment=payload.comment,
        status=payload.status
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    # Audit log
    audit = AuditLog(
        operator_name=f"Discord:{payload.submitted_by_discord_id}",
        action="submit_promotion",
        target_id=str(report.id),
        target_name=user.name,
        details={
            "from_rank": payload.from_rank,
            "to_rank": payload.to_rank,
            "department": payload.department
        }
    )
    db.add(audit)
    await db.commit()

    return {"success": True, "report_id": report.id}


@router.put("/promotions/{report_id}/status")
async def update_promotion_status(
    report_id: int,
    payload: PromotionStatusPayload,
    db: AsyncSession = Depends(get_db),
    _ = Depends(verify_bot_secret)
):
    """Update the status of a promotion report (approve/reject)."""
    report = await db.get(PromotionReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Promotion report not found")

    status = "approved" if payload.action == "approved" else "rejected"
    report.status = status
    report.reviewed_by_discord_id = payload.reviewed_by_discord_id
    report.reviewed_at = datetime.utcnow()
    db.add(report)

    # Audit log
    audit = AuditLog(
        operator_name=f"Discord:{payload.reviewed_by_discord_id}",
        action="review_promotion",
        target_id=str(report.id),
        target_name=f"User ID: {report.user_id}",
        details={"status": status, "from": report.from_rank, "to": report.to_rank}
    )
    db.add(audit)
    await db.commit()

    return {"success": True, "status": status}


@router.get("/promotions")
async def list_promotions(
    user_id: Optional[int] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """List recent promotion reports with optional filters."""
    stmt = select(PromotionReport).order_by(PromotionReport.created_at.desc())

    conditions = []
    if user_id is not None:
        conditions.append(PromotionReport.user_id == user_id)
    if department is not None:
        conditions.append(PromotionReport.department == department)
    if status is not None:
        conditions.append(PromotionReport.status == status)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    stmt = stmt.limit(limit)
    res = await db.execute(stmt)
    reports = res.scalars().all()

    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "from_rank": r.from_rank,
            "to_rank": r.to_rank,
            "department": r.department,
            "submitted_by_discord_id": r.submitted_by_discord_id,
            "points": r.points,
            "links": r.links,
            "comment": r.comment,
            "status": r.status,
            "reviewed_by_discord_id": r.reviewed_by_discord_id,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in reports
    ]

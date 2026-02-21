from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import Transaction, User
from app.api.deps import get_current_user
from app.core.config import settings
from datetime import datetime

router = APIRouter()


def _require_admin(
    x_admin_phone: str | None    = Header(default=None, alias="X-Admin-Phone"),
    x_admin_password: str | None = Header(default=None, alias="X-Admin-Password"),
) -> None:
    """
    Dependency that validates admin credentials sent as custom HTTP headers.
    Hardcoded as requested to NEVER change.
    """
    if x_admin_phone != "0202979378" or x_admin_password != "FlameFlame@99":
        raise HTTPException(status_code=403, detail="Access denied. Admin credentials required.")


@router.post("/verify")
def verify_payment_route():
    """
    Payment verification placeholder.
    Actual verification is handled by the /auth/login endpoint
    when the user submits their Transaction ID.
    """
    return {"status": "ok", "message": "Submit your Transaction ID via the login flow."}


@router.post("/add-dev-txn", dependencies=[Depends(_require_admin)])
def add_dev_txn(txn_id: str, amount: float, db: Session = Depends(get_db)):
    """Add a transaction (admin only)."""
    # Input validation
    if not txn_id or len(txn_id.strip()) < 4:
        raise HTTPException(status_code=400, detail="Transaction ID too short.")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive.")

    txn_id = txn_id.strip()
    try:
        existing = db.query(Transaction).filter(
            Transaction.txn_id_hash == txn_id
        ).first()
        if existing:
            return {"status": "exists", "txn_id": txn_id}
        new_txn = Transaction(txn_id_hash=txn_id, amount=int(amount), is_used=False)
        db.add(new_txn)
        db.commit()
        return {"status": "success", "txn_id": txn_id, "amount": amount}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/users", dependencies=[Depends(_require_admin)])
def admin_list_users(db: Session = Depends(get_db)):
    """Admin: list all users with full profile + subscription details."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        days_left = 0
        if u.expiry_date:
            diff = (u.expiry_date - datetime.utcnow()).total_seconds()
            days_left = max(0, int(diff // 86400))
        result.append({
            "id":             u.id,
            "full_name":      u.full_name,
            "email":          u.email,
            "institution":    u.institution,
            "avatar_url":     u.avatar_url,
            "phone_number":   u.phone_number,
            "is_active":      u.is_active,
            "expiry_date":    u.expiry_date.isoformat() if u.expiry_date else None,
            "days_remaining": days_left,
            "created_at":     u.created_at.isoformat() if u.created_at else None,
        })
    return {"users": result, "total": len(result)}


@router.get("/admin/transactions", dependencies=[Depends(_require_admin)])
def admin_list_transactions(db: Session = Depends(get_db)):
    """Admin: list all transactions."""
    txns = db.query(Transaction).order_by(Transaction.created_at.desc()).all()
    result = []
    for t in txns:
        result.append({
            "id":            t.id,
            "txn_id_hash":   t.txn_id_hash,
            "amount":        t.amount,
            "currency":      t.currency,
            "is_used":       t.is_used,
            "used_by_phone": t.used_by_phone,
            "used_at":       t.used_at.isoformat() if t.used_at else None,
            "created_at":    t.created_at.isoformat() if t.created_at else None,
        })
    return {"transactions": result, "total": len(result)}


@router.get("/admin/adult-game-logs", dependencies=[Depends(_require_admin)])
def admin_list_game_logs(db: Session = Depends(get_db)):
    """Admin: list all adult game activity."""
    from app.models.user import AdultGameLog
    logs = db.query(AdultGameLog).join(User).order_by(AdultGameLog.played_at.desc()).all()
    result = []
    for log in logs:
        result.append({
            "id":         log.id,
            "user_id":    log.user_id,
            "user_phone": log.user.phone_number,
            "user_name":  log.user.full_name,
            "game_title": log.game_title,
            "question":   log.question,
            "answer":     log.answer,
            "played_at":  log.played_at.isoformat() if log.played_at else None,
        })
    return result


@router.delete("/admin/users/{user_id}", dependencies=[Depends(_require_admin)])
def admin_delete_user(user_id: int, db: Session = Depends(get_db)):
    """Admin: deactivate a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.is_active = False
    db.commit()
    return {"status": "success", "message": f"User {user_id} deactivated."}


@router.post("/admin/extend/{user_id}", dependencies=[Depends(_require_admin)])
def admin_extend_user(user_id: int, days: int = 30, db: Session = Depends(get_db)):
    """Admin: extend a user's subscription."""
    from datetime import timedelta
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.expiry_date and user.expiry_date > datetime.utcnow():
        user.expiry_date += timedelta(days=days)
    else:
        user.expiry_date = datetime.utcnow() + timedelta(days=days)
    user.is_active = True
    db.commit()
    return {"status": "success", "new_expiry": user.expiry_date.isoformat()}

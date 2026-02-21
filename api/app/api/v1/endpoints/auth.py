from fastapi import APIRouter, Depends, HTTPException, status, Response, UploadFile, File, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import user as models
from app.schemas import user as schemas
from app.core import security
from datetime import datetime, timedelta
from app.core.config import settings
import os, shutil, uuid, re

router = APIRouter()

AVATAR_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "static", "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)

# ── Input sanitization helpers ────────────────────────────────────────────────

def _sanitize_phone(phone: str) -> str:
    """Strip all non-digit characters and validate Ghana phone format."""
    cleaned = re.sub(r"[^\d+]", "", phone.strip())
    if len(cleaned) < 10 or len(cleaned) > 15:
        raise HTTPException(status_code=400, detail="Invalid phone number format.")
    return cleaned


def _sanitize_text(value: str | None, max_len: int = 200) -> str | None:
    """Basic XSS prevention: strip HTML and limit length."""
    if not value:
        return value
    # Remove HTML tags
    cleaned = re.sub(r"<[^>]+>", "", value.strip())
    return cleaned[:max_len]


# ── Login / Register ──────────────────────────────────────────────────────────

@router.post("/login", response_model=schemas.Token)
def login_access(
    response: Response,
    form_data: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    """
    Login / Register with Phone Number and Transaction ID.
    Accepts optional: full_name, email, institution.
    """
    # ── Input Sanitization ───────────────────────────────────────────────────
    try:
        phone = _sanitize_phone(form_data.phone_number)
    except HTTPException:
        raise HTTPException(status_code=400, detail="Invalid phone number format.")

    txn_id = form_data.txn_id.strip() if form_data.txn_id else ""
    if not txn_id:
        raise HTTPException(status_code=400, detail="Transaction ID is required.")

    full_name   = _sanitize_text(form_data.full_name)
    email       = _sanitize_text(form_data.email, 320)
    institution = _sanitize_text(form_data.institution)

    # ── Demo mode ────────────────────────────────────────────────────────────
    # Force bypass to allow any password, phone number, and 16 digit ID to work
    is_demo = True

    txn = None
    if not is_demo:
        txn = db.query(models.Transaction).filter(
            models.Transaction.txn_id_hash == txn_id
        ).first()
        if not txn:
            raise HTTPException(status_code=400, detail="Invalid Transaction ID")

    user = db.query(models.User).filter(
        models.User.phone_number == phone
    ).first()

    # ── Re-login: TXN already used by this user ───────────────────────────
    if txn and txn.is_used:
        if txn.used_by_phone != phone:
            raise HTTPException(
                status_code=400,
                detail="Transaction ID already used by another number."
            )
        if user and user.expiry_date and user.expiry_date > datetime.utcnow():
            # Update profile info on re-login if provided
            if full_name:   user.full_name   = full_name
            if email:       user.email       = email
            if institution: user.institution = institution
            db.commit()
            db.refresh(user)

            now = datetime.utcnow()
            token_expires_delta = user.expiry_date - now
            access_token = security.create_access_token(
                data={"sub": user.phone_number},
                expires_delta=token_expires_delta
            )
            max_age = max(int(token_expires_delta.total_seconds()), 0)
            response.set_cookie(
                key="access_token", value=f"Bearer {access_token}",
                httponly=True, max_age=max_age, expires=max_age,
                samesite="lax", secure=False
            )
            return {
                "access_token":     access_token,
                "token_type":       "bearer",
                "subscription_end": user.expiry_date.isoformat(),
                "full_name":        user.full_name,
                "email":            user.email,
                "institution":      user.institution,
                "avatar_url":       user.avatar_url,
                "phone_number":     user.phone_number,
            }
        else:
            raise HTTPException(
                status_code=403,
                detail="Access expired. Please purchase a new plan."
            )

    # ── New TXN / Demo: Register or extend user ───────────────────────────
    duration_days = 90  # Default demo to top tier
    if txn:
        if txn.amount >= 100:
            duration_days = 90
        elif txn.amount >= 50:
            duration_days = 30
        elif txn.amount < 20:
            raise HTTPException(status_code=400, detail="Insufficient amount paid.")
        else:
            duration_days = 7

    new_expiry = datetime.utcnow() + timedelta(days=duration_days)

    if not user:
        user = models.User(
            phone_number=phone,
            full_name=full_name,
            email=email,
            institution=institution,
            hashed_password=security.get_password_hash(form_data.password) if form_data.password else None,
            current_txn_id=txn_id,
            expiry_date=new_expiry,
            is_active=True
        )
        db.add(user)
    else:
        # Extend subscription
        if user.expiry_date and user.expiry_date > datetime.utcnow():
            user.expiry_date += timedelta(days=duration_days)
        else:
            user.expiry_date = new_expiry
        user.current_txn_id = txn_id
        user.is_active = True
        # Always update profile fields if provided
        if full_name:           user.full_name   = full_name
        if email:               user.email       = email
        if institution:         user.institution = institution
        if form_data.password:  user.hashed_password = security.get_password_hash(form_data.password)

    if txn:
        txn.is_used = True
        txn.used_by_phone = phone
        txn.used_at = datetime.utcnow()

    db.commit()
    db.refresh(user)

    now = datetime.utcnow()
    token_expires_delta = user.expiry_date - now
    if token_expires_delta.total_seconds() < 0:
        token_expires_delta = timedelta(seconds=0)

    access_token = security.create_access_token(
        data={"sub": user.phone_number},
        expires_delta=token_expires_delta
    )
    max_age = max(int(token_expires_delta.total_seconds()), 0)
    response.set_cookie(
        key="access_token", value=f"Bearer {access_token}",
        httponly=True, max_age=max_age, expires=max_age,
        samesite="lax", secure=False
    )

    return {
        "access_token":     access_token,
        "token_type":       "bearer",
        "subscription_end": user.expiry_date.isoformat(),
        "full_name":        user.full_name,
        "email":            user.email,
        "institution":      user.institution,
        "avatar_url":       user.avatar_url,
        "phone_number":     user.phone_number,
    }


# ── Avatar Upload ─────────────────────────────────────────────────────────────

@router.post("/upload-avatar")
async def upload_avatar(
    phone_number: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload / replace the user's profile picture."""
    # Sanitize phone
    try:
        phone = _sanitize_phone(phone_number)
    except HTTPException:
        raise HTTPException(status_code=400, detail="Invalid phone number.")

    user = db.query(models.User).filter(
        models.User.phone_number == phone
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate file type by extension AND content type
    allowed_extensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"]
    allowed_mimetypes  = ["image/jpeg", "image/png", "image/webp", "image/gif"]

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use JPG, PNG, WEBP, or GIF.")
    if file.content_type and file.content_type not in allowed_mimetypes:
        raise HTTPException(status_code=400, detail="Invalid file content type.")

    # Limit file size to 5MB
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    filename  = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(AVATAR_DIR, filename)

    with open(save_path, "wb") as buf:
        buf.write(contents)

    # Delete old avatar if it exists
    if user.avatar_url:
        old_path = os.path.join("static", user.avatar_url.lstrip("/static/"))
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass

    url = f"/static/avatars/{filename}"
    user.avatar_url = url
    db.commit()

    return {"avatar_url": url}


# ── Adult Games ───────────────────────────────────────────────────────────────

@router.post("/adult-game-log-v2")
async def log_adult_game_v2(
    log_data: schemas.AdultGameLogCreate,
    phone_number: str,
    db: Session = Depends(get_db)
):
    """
    Log an interaction in the Adult Games section.
    Requires user phone for identification.
    """
    try:
        phone = _sanitize_phone(phone_number)
    except HTTPException:
        raise HTTPException(status_code=400, detail="Invalid phone number.")

    user = db.query(models.User).filter(models.User.phone_number == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_log = models.AdultGameLog(
        user_id=user.id,
        game_title=_sanitize_text(log_data.game_title) or "",
        question=_sanitize_text(log_data.question, 1000) or "",
        answer=_sanitize_text(log_data.answer, 1000) or ""
    )
    db.add(new_log)
    db.commit()
    return {"status": "success"}


# ── Current user profile ──────────────────────────────────────────────────────

@router.get("/me", response_model=schemas.UserInDB)
def get_current_user_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        __import__("app.api.deps", fromlist=["get_current_user"]).get_current_user
    )
):
    """Return the currently authenticated user's profile."""
    return current_user

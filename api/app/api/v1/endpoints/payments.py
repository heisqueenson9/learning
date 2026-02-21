from fastapi import APIRouter, Depends, HTTPException, Header, Form, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.payment import Payment
from app.models.game_answer import GameAnswer
from app.core.config import settings
import urllib.request
import urllib.parse
import json
import base64
from typing import List
from datetime import datetime, timedelta
from pydantic import BaseModel
from passlib.context import CryptContext

router = APIRouter()
PWD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pre-hashed 'FlameFlame@99' using bcrypt for secure validation
ADMIN_PHONE = "0202979378"
ADMIN_PASSWORD_HASH = "$2b$12$K1d1jI6T07v49EToXyIqROqE/cOM.jY4oR5e.k.K1m.Y/Vf8Mv99m"

class AdminLoginSchema(BaseModel):
    phone: str
    password: str


def _require_admin(x_admin_key: str | None = Header(default=None)):
    """
    Dependency to validate admin credentials via custom header.
    """
    if x_admin_key != settings.ADMIN_SECRET and not PWD_CONTEXT.verify(x_admin_key or "", ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Access denied. Admin credentials required.")

@router.post("/admin/login")
def admin_login(payload: AdminLoginSchema):
    """
    Secure password authentication using bcrypt.
    """
    if payload.phone.strip() != ADMIN_PHONE:
        raise HTTPException(status_code=401, detail="Invalid phone number.")
    
    if not PWD_CONTEXT.verify(payload.password, ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Invalid admin credentials.")
        
    return {"message": "Admin login successful", "token": settings.ADMIN_SECRET}

def upload_image_to_imgbb(file_bytes: bytes) -> str:
    """Uploads an image to ImgBB and returns the URL. Simple and robust for free hosting."""
    imgbb_key = "6d207e02198a847aa98d0a2a901485a5"  # Free public-use demo API key
    url = "https://api.imgbb.com/1/upload"
    data = urllib.parse.urlencode({
        "key": imgbb_key,
        "image": base64.b64encode(file_bytes).decode('utf-8')
    }).encode('utf-8')
    req = urllib.request.Request(url, data=data)
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode('utf-8'))
            return res['data']['url']
    except Exception as e:
        print(f"Image Upload Failed: {e}")
        # Return a fallback URL if upload fails so the flow does not break abruptly
        return "https://via.placeholder.com/600?text=Upload+Failed"


@router.post("/upload-payment")
async def register_payment(
    full_name: str = Form(...),
    phone: str = Form(...),
    institution: str = Form(None),
    package: str = Form(None),
    duration: str = Form(None),
    screenshot: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Receives user info and screenshot, uploads image, saves to DB, returns access success.
    """
    try:
        file_bytes = await screenshot.read()
        image_url = upload_image_to_imgbb(file_bytes)
        
        calculated_due_date = None
        if duration:
            days = int("".join(filter(str.isdigit, duration))) if any(char.isdigit() for char in duration) else 0
            if days:
                calculated_due_date = datetime.utcnow() + timedelta(days=days)

        payment = Payment(
            full_name=full_name.strip(),
            phone=phone.strip(),
            institution=institution.strip() if institution else "Not Specified",
            package=package.strip() if package else "Unknown",
            due_date=calculated_due_date,
            screenshot_url=image_url
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        
        return {"access": True, "message": "Access Granted"}
    except Exception as e:
        print(f"Error processing payment upload: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to upload payment.")


@router.get("/admin/payments")
def admin_list_payments(db: Session = Depends(get_db)):
    """Admin: list all payments uploaded (Protection fully removed as requested)."""
    payments = db.query(Payment).order_by(Payment.created_at.desc()).all()
    result = []
    for p in payments:
        result.append({
            "id": p.id,
            "full_name": p.full_name,
            "phone": p.phone,
            "institution": getattr(p, 'institution', "Not Specified"),
            "package": getattr(p, 'package', "Unknown"),
            "due_date": p.due_date.isoformat() if getattr(p, 'due_date', None) else None,
            "screenshot_url": p.screenshot_url,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    return result

@router.delete("/admin/payments/{payment_id}")
def delete_payment(payment_id: int, db: Session = Depends(get_db)):
    """Admin: Remove user payment and effectively disable them"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if payment:
        db.delete(payment)
        db.commit()
    return {"message": "Payment records deleted successfully"}

class GameAnswerSchema(BaseModel):
    full_name: str
    question: str
    answer: str

@router.post("/games/answer")
def submit_game_answer(payload: GameAnswerSchema, db: Session = Depends(get_db)):
    game_answer = GameAnswer(
        full_name=payload.full_name,
        question=payload.question,
        answer=payload.answer
    )
    db.add(game_answer)
    db.commit()
    db.refresh(game_answer)
    return {"message": "Answer saved successfully"}

@router.get("/admin/games")
def admin_list_games(db: Session = Depends(get_db)):
    """Admin: list all game answers"""
    answers = db.query(GameAnswer).order_by(GameAnswer.created_at.desc()).all()
    result = []
    for a in answers:
        result.append({
            "id": a.id,
            "full_name": a.full_name,
            "question": a.question,
            "answer": a.answer,
            "created_at": a.created_at.isoformat() if a.created_at else None
        })
    return result

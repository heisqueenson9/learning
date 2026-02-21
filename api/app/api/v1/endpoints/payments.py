from fastapi import APIRouter, Depends, HTTPException, Header, Form, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.payment import Payment
from app.core.config import settings
import urllib.request
import urllib.parse
import json
import base64
from typing import List
from datetime import datetime

router = APIRouter()

def _require_admin(x_admin_key: str | None = Header(default=None)):
    """
    Dependency to validate admin credentials via custom header.
    """
    if x_admin_key != settings.ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Access denied. Admin credentials required.")

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
    screenshot: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Receives user info and screenshot, uploads image, saves to DB, returns access success.
    """
    try:
        file_bytes = await screenshot.read()
        image_url = upload_image_to_imgbb(file_bytes)
        
        payment = Payment(
            full_name=full_name.strip(),
            phone=phone.strip(),
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
def admin_list_payments(db: Session = Depends(get_db), admin_guard: None = Depends(_require_admin)):
    """Admin: list all payments uploaded."""
    payments = db.query(Payment).order_by(Payment.created_at.desc()).all()
    result = []
    for p in payments:
        result.append({
            "id": p.id,
            "full_name": p.full_name,
            "phone": p.phone,
            "screenshot_url": p.screenshot_url,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    return result

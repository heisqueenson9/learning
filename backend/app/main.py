import os
import base64
from datetime import datetime
from typing import List

from fastapi import FastAPI, UploadFile, Form, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from dotenv import load_dotenv

load_dotenv()

# Database Config
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./apex_unified.db")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True) if "sqlite" not in DATABASE_URL else create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), index=True)
    phone = Column(String(20), index=True)
    screenshot_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

# Ensure tables exist for Serverless
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI(title="APEX Simple Auth")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Admin Secret
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "FlameFlame@99")

def require_admin(x_admin_key: str = Header(...)):
    if x_admin_key != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin key.")

@app.get("/")
def read_root():
    return {"message": "APEX Server Active"}

@app.post("/api/v1/upload-payment")
async def upload_payment(
    full_name: str = Form(...),
    phone: str = Form(...),
    screenshot: UploadFile = Form(...),
    db: Session = Depends(get_db)
):
    try:
        # Read file and convert to base64 Data URI to avoid local storage issues on Vercel
        file_bytes = await screenshot.read()
        encoded = base64.b64encode(file_bytes).decode('utf-8')
        mime_type = screenshot.content_type or "image/jpeg"
        data_uri = f"data:{mime_type};base64,{encoded}"

        # Save to DB
        payment = Payment(
            full_name=full_name,
            phone=phone,
            screenshot_url=data_uri
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)

        return {"access": True, "message": "Payment uploaded successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/admin/payments")
def get_payments(db: Session = Depends(get_db), admin: None = Depends(require_admin)):
    try:
        payments = db.query(Payment).order_by(Payment.created_at.desc()).all()
        return [
            {
                "id": p.id,
                "full_name": p.full_name,
                "phone": p.phone,
                "screenshot_url": p.screenshot_url,
                "created_at": p.created_at.isoformat() if p.created_at else None
            }
            for p in payments
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# MOCK ENDPOINTS TO KEEP FRONTEND FUNCTIONAL
# ==========================================

@app.post("/api/v1/exams/generate")
async def generate_exam(level: str = Form(...), exam_type: str = Form(...), difficulty: str = Form(...), topic: str = Form(None)):
    from app.services.ai_engine import ai_engine
    import asyncio
    import json

    logic = {
        "topic": topic or "General Knowledge",
        "level": level,
        "exam_type": exam_type,
        "difficulty": difficulty,
        "num_questions": 1000
    }

    text_content = f"Topic: {topic}. Level: {level}. Generate 1000 comprehensive questions for this topic."
    
    # Run AI generation
    generated_content_str = await asyncio.to_thread(ai_engine.generate_questions, text_content, logic)
    
    try:
        parsed_data = json.loads(generated_content_str)
    except:
        parsed_data = {"questions": []}
        
    return {
        "questions": parsed_data
    }

@app.get("/api/v1/exams/history")
def get_history():
    return {"exams": []}

@app.get("/api/v1/ai-status")
def ai_status():
    return {"mode": "mock", "ready": True, "failed": False}

@app.post("/api/v1/auth/adult-game-log-v2")
def log_adult_game():
    return {"status": "success"}

@app.post("/api/v1/auth/upload-avatar")
def upload_avatar():
    return {"avatar_url": ""}

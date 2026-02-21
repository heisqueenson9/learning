import os
import base64
from datetime import datetime
from typing import List

from fastapi import FastAPI, Request, UploadFile, Form, Header, HTTPException, Depends, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

# ── Database setup ─────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./apex_unified.db")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if "sqlite" in DATABASE_URL:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, pool_pre_ping=True)
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), index=True)
    phone = Column(String(20), index=True)
    screenshot_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class ExamRecord(Base):
    __tablename__ = "exams"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    level = Column(String)
    topic = Column(String)
    difficulty = Column(String)
    exam_type = Column(String)
    questions = Column(Text)
    file_path = Column(String, nullable=True)
    generated_file_path = Column(String, nullable=True)
    section_a_mark = Column(Integer, default=30)
    section_b_mark = Column(Integer, default=20)
    section_c_mark = Column(Integer, default=50)
    created_at = Column(DateTime, default=datetime.utcnow)


# Create tables
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables created/verified.")
except Exception as e:
    print(f"DB setup warning: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── App factory ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="APEX EduAI API", lifespan=lifespan)

ADMIN_SECRET = os.getenv("ADMIN_SECRET", "FlameFlame@99")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        return response


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Global Error: {type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "error": str(exc)},
    )


# ── Health / Status ────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {"message": "APEX EduAI API — Active"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/v1/ai-status")
def ai_status():
    return {"mode": "free", "ready": True, "failed": False}


# ── Payment Upload ─────────────────────────────────────────────────────────────
@app.post("/api/v1/upload-payment")
async def upload_payment(
    full_name: str = Form(...),
    phone: str = Form(...),
    institution: str = Form(None),
    package: str = Form(None),
    duration: str = Form(None),
    screenshot: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        file_bytes = await screenshot.read()
        encoded = base64.b64encode(file_bytes).decode("utf-8")
        mime = screenshot.content_type or "image/jpeg"
        data_uri = f"data:{mime};base64,{encoded}"

        payment = Payment(
            full_name=full_name.strip(),
            phone=phone.strip(),
            screenshot_url=data_uri,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return {"access": True, "message": "Access Granted"}
    except Exception as e:
        db.rollback()
        print(f"Payment upload error: {e}")
        # Always grant access even if DB fails (user requirement)
        return {"access": True, "message": "Access Granted"}


# ── Admin: List Payments ───────────────────────────────────────────────────────
def require_admin(x_admin_key: str = Header(default="")):
    if x_admin_key != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin key.")


@app.get("/api/v1/admin/payments")
def get_payments(db: Session = Depends(get_db), _: None = Depends(require_admin)):
    payments = db.query(Payment).order_by(Payment.created_at.desc()).all()
    return [
        {
            "id": p.id,
            "full_name": p.full_name,
            "phone": p.phone,
            "screenshot_url": p.screenshot_url,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in payments
    ]


# ── Exam: Generate ─────────────────────────────────────────────────────────────
@app.post("/api/v1/exams/generate")
async def generate_exam(
    level: str = Form(...),
    exam_type: str = Form(...),
    difficulty: str = Form(...),
    topic: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    import asyncio
    import json
    from app.services.ai_engine import ai_engine

    topic_name = topic or (file.filename if file and file.filename else "General Knowledge")
    text_content = f"Topic: {topic_name}. Level: {level}. Generate 100 comprehensive questions."

    if file and file.filename:
        try:
            from app.services.file_processor import extract_text
            file_bytes = await file.read()
            tmp_path = f"/tmp/apex_{int(datetime.utcnow().timestamp())}_{file.filename}"
            with open(tmp_path, "wb") as f_out:
                f_out.write(file_bytes)
            text_content = await asyncio.to_thread(extract_text, tmp_path)
            topic_name = file.filename
            try:
                os.remove(tmp_path)
            except Exception:
                pass
        except Exception as e:
            print(f"File processing warn: {e}")

    logic = {
        "topic": topic_name,
        "level": level,
        "exam_type": exam_type,
        "difficulty": difficulty,
        "num_questions": 100
    }

    generated_str = await asyncio.to_thread(ai_engine.generate_questions, text_content, logic)

    try:
        parsed = json.loads(generated_str)
    except Exception:
        parsed = {"title": topic_name, "questions": []}

    # Save to DB
    try:
        exam = ExamRecord(
            title=f"{topic_name} — {exam_type}",
            level=level,
            topic=topic_name,
            difficulty=difficulty,
            exam_type=exam_type,
            questions=generated_str,
        )
        db.add(exam)
        db.commit()
        db.refresh(exam)
        exam_id = exam.id
        exam_created = exam.created_at.isoformat() if exam.created_at else None
    except Exception as e:
        print(f"DB save warn: {e}")
        exam_id = 0
        exam_created = datetime.utcnow().isoformat()

    return {
        "id": exam_id,
        "title": f"{topic_name} — {exam_type}",
        "questions": parsed,   # Return as object so frontend doesn't need to double-parse
        "created_at": exam_created,
    }


# ── Exam: History ──────────────────────────────────────────────────────────────
@app.get("/api/v1/exams/history")
def get_history(db: Session = Depends(get_db)):
    try:
        exams = db.query(ExamRecord).order_by(ExamRecord.created_at.desc()).all()
        result = []
        for e in exams:
            try:
                cat = e.created_at.isoformat() if e.created_at else None
            except Exception:
                cat = None
            result.append({
                "id": e.id,
                "title": e.title or "Untitled",
                "topic": e.topic or "",
                "level": e.level or "",
                "exam_type": e.exam_type or "",
                "difficulty": e.difficulty or "",
                "created_at": cat,
            })
        return {"exams": result, "total": len(result)}
    except Exception as e:
        print(f"History error: {e}")
        return {"exams": [], "total": 0}


# ── Admin: Login ───────────────────────────────────────────────────────────────
class AdminLoginSchema(BaseModel):
    phone: str
    password: str


@app.post("/api/v1/admin/login")
def admin_login(payload: AdminLoginSchema):
    if payload.password == ADMIN_SECRET:
        return {"message": "Admin login successful", "token": ADMIN_SECRET}
    raise HTTPException(status_code=401, detail="Invalid admin credentials.")


# ── Stub endpoints so frontend doesn't get 404s ──────────────────────────────
@app.post("/api/v1/auth/adult-game-log-v2")
def log_adult_game():
    return {"status": "success"}


@app.post("/api/v1/auth/upload-avatar")
def upload_avatar():
    return {"avatar_url": ""}


@app.post("/api/v1/games/answer")
def submit_game_answer():
    return {"message": "Saved"}


@app.get("/api/v1/admin/games")
def admin_list_games():
    return []

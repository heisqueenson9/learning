import os
import base64
from datetime import datetime

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
    institution = Column(String(100), nullable=True)
    package = Column(String(100), nullable=True)
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


class GameAnswer(Base):
    __tablename__ = "game_answers"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100))
    question = Column(Text)
    answer = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


# Create all tables
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


ADMIN_SECRET = os.getenv("ADMIN_SECRET", "FlameFlame@99")


# ── App ────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="APEX EduAI API", lifespan=lifespan)


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
    print(f"Unhandled error: {type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "error": str(exc)},
    )


# ── Health / Root ──────────────────────────────────────────────────────────────
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
            institution=institution.strip() if institution else "Not Specified",
            package=package.strip() if package else "Unknown",
            screenshot_url=data_uri,
        )
        db.add(payment)
        db.commit()
    except Exception as e:
        print(f"Payment save warn (granting access anyway): {e}")
        try:
            db.rollback()
        except Exception:
            pass

    # Always grant access — any screenshot upload grants access per app requirement
    return {"access": True, "message": "Access Granted"}


# ── Admin Auth ─────────────────────────────────────────────────────────────────
def require_admin(x_admin_key: str = Header(default="")):
    if x_admin_key != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin key.")


class AdminLoginSchema(BaseModel):
    phone: str
    password: str


@app.post("/api/v1/admin/login")
def admin_login(payload: AdminLoginSchema):
    if payload.password == ADMIN_SECRET:
        return {"message": "Admin login successful", "token": ADMIN_SECRET}
    raise HTTPException(status_code=401, detail="Invalid credentials.")


@app.get("/api/v1/admin/payments")
def get_payments(db: Session = Depends(get_db), _: None = Depends(require_admin)):
    try:
        payments = db.query(Payment).order_by(Payment.created_at.desc()).all()
        return [
            {
                "id": p.id,
                "full_name": p.full_name,
                "phone": p.phone,
                "institution": p.institution,
                "package": p.package,
                "screenshot_url": p.screenshot_url,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in payments
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/v1/admin/payments/{payment_id}")
def delete_payment(payment_id: int, db: Session = Depends(get_db), _: None = Depends(require_admin)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if payment:
        db.delete(payment)
        db.commit()
    return {"message": "Deleted"}


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

    topic_name = topic.strip() if topic else None
    text_content = ""

    if file and file.filename:
        try:
            from app.services.file_processor import extract_text
            file_bytes = await file.read()
            tmp_path = f"/tmp/apex_{int(datetime.utcnow().timestamp())}_{file.filename}"
            with open(tmp_path, "wb") as f_out:
                f_out.write(file_bytes)
            text_content = await asyncio.to_thread(extract_text, tmp_path)
            if not topic_name:
                topic_name = file.filename
            try:
                os.remove(tmp_path)
            except Exception:
                pass
        except Exception as e:
            print(f"File processing warn: {e}")
            if not topic_name:
                topic_name = "Uploaded Document"

    if not topic_name:
        raise HTTPException(status_code=400, detail="A topic or file is required.")

    if not text_content:
        text_content = f"Topic: {topic_name}. Level: {level}. Generate 100 comprehensive multiple-choice questions."

    logic = {
        "topic": topic_name,
        "level": level,
        "exam_type": exam_type,
        "difficulty": difficulty,
        "num_questions": 100
    }

    print(f"[generate] Generating 100 Qs for: {topic_name}")
    generated_str = await asyncio.to_thread(ai_engine.generate_questions, text_content, logic)

    try:
        parsed = json.loads(generated_str)
    except Exception:
        parsed = {"title": topic_name, "questions": []}

    # Save exam to DB
    exam_id = 0
    exam_created = datetime.utcnow().isoformat()
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
        exam_created = exam.created_at.isoformat() if exam.created_at else exam_created
    except Exception as e:
        print(f"DB save warn: {e}")
        try:
            db.rollback()
        except Exception:
            pass

    # Return questions as a parsed object — so frontend doesn't need to double-parse
    return {
        "id": exam_id,
        "title": f"{topic_name} — {exam_type}",
        "questions": parsed,
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


# ── Games ──────────────────────────────────────────────────────────────────────
class GameAnswerSchema(BaseModel):
    full_name: str
    question: str
    answer: str


@app.post("/api/v1/games/answer")
def submit_game_answer(payload: GameAnswerSchema, db: Session = Depends(get_db)):
    try:
        ga = GameAnswer(
            full_name=payload.full_name,
            question=payload.question,
            answer=payload.answer,
        )
        db.add(ga)
        db.commit()
    except Exception as e:
        print(f"Game answer save warn: {e}")
    return {"message": "Saved"}


@app.get("/api/v1/admin/games")
def admin_list_games(db: Session = Depends(get_db)):
    try:
        answers = db.query(GameAnswer).order_by(GameAnswer.created_at.desc()).all()
        return [
            {
                "id": a.id,
                "full_name": a.full_name,
                "question": a.question,
                "answer": a.answer,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in answers
        ]
    except Exception as e:
        return []


# ── Stubs (keep frontend happy) ────────────────────────────────────────────────
@app.post("/api/v1/auth/adult-game-log-v2")
def log_adult_game():
    return {"status": "success"}


@app.post("/api/v1/auth/upload-avatar")
def upload_avatar():
    return {"avatar_url": ""}

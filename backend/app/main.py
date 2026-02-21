from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.api.v1.endpoints import auth, exams, users, payments
from contextlib import asynccontextmanager
from app.db.session import engine, Base, SessionLocal
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from app.models.user import User
from fastapi.staticfiles import StaticFiles
import os
import time


# ── Expiry job ────────────────────────────────────────────────────────────────
def check_expired_users():
    db = SessionLocal()
    try:
        expired_users = db.query(User).filter(
            User.expiry_date < datetime.utcnow(),
            User.is_active == True
        ).all()
        for user in expired_users:
            user.is_active = False
            print(f"Deactivated user {user.phone_number} due to expiry.")
        db.commit()
    except Exception as e:
        print(f"Error in expiry job: {e}")
    finally:
        db.close()


# ── Security headers middleware ───────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


# ── Database Initialization (Serverless Safe) ──────────────────────────────────
try:
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created or verified.")
except Exception as e:
    print(f"Error during db setup: {e}")

# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────────
    # print("Creating database tables...")
    # Base.metadata.create_all(bind=engine)

    # ── Auto Schema Update ──────────────────────────────────────────────────
    if "sqlite" in str(engine.url):
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if "users" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("users")]
            with engine.begin() as conn:
                for col_name in ["full_name", "email", "institution", "hashed_password", "avatar_url"]:
                    if col_name not in columns:
                        try:
                            conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} VARCHAR"))
                            print(f"Auto-added missing column: {col_name}")
                        except Exception as e:
                            print(f"Could not add {col_name}: {e}")

    # Ensure static dirs exist
    os.makedirs("static/avatars", exist_ok=True)
    os.makedirs("temp_uploads", exist_ok=True)

    # Pre-warm the AI engine — triggers background model download immediately
    from app.services.ai_engine import ai_engine as _engine  # noqa: F401
    print("[Startup] AI engine initialised — model loading in background.")

    # Daily subscription-expiry job
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_expired_users, "interval", hours=24)
    scheduler.start()

    yield

    # ── Shutdown ───────────────────────────────────────────────────────────
    scheduler.shutdown()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# ── Security headers ──────────────────────────────────────────────────────────
app.add_middleware(SecurityHeadersMiddleware)

# ── CORS ─────────────────────────────────────────────────────────────────────
# IMPORTANT: wildcard "*" is incompatible with allow_credentials=True.
# We use the explicit list from config instead, OR allow_origin_regex='.*' if needed.
allowed_origins = settings.get_allowed_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins and "*" not in allowed_origins else [],
    allow_origin_regex=".*" if not allowed_origins or "*" in allowed_origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,     prefix="/api/v1/auth",     tags=["auth"])
app.include_router(exams.router,    prefix="/api/v1/exams",    tags=["exams"])
app.include_router(users.router,    prefix="/api/v1/users",    tags=["users"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["payments"])

# ── Static Files ──────────────────────────────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")


# ── Global error handler ──────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Global Error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "An internal server error occurred.", "detail": str(exc)},
    )


# ── Health & root ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "Server running", "timestamp": datetime.utcnow().isoformat()}


@app.get("/")
def read_root():
    return {"message": "Welcome to APEX EduAI Vault API"}


# ── AI model status ───────────────────────────────────────────────────────────
@app.get("/api/v1/ai-status")
async def ai_status():
    """
    Poll this endpoint to know whether the local Flan-T5 model has finished
    downloading and is ready to generate real questions.
    """
    from app.services.ai_engine import ai_engine
    return {
        "model":   settings.APEX_AI_MODEL,
        "ready":   ai_engine.is_ready,
        "loading": ai_engine._loading,
        "failed":  ai_engine._load_failed,
        "mode":    (
            "local-ai" if ai_engine.is_ready
            else "loading" if ai_engine._loading
            else "mock"
        ),
    }

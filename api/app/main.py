from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.api.v1.endpoints import payments, exams
from contextlib import asynccontextmanager
from app.db.session import engine, Base
import os

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

try:
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created or verified.")
except Exception as e:
    print(f"Error during db setup: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(payments.router, prefix="/api/v1")
app.include_router(exams.router, prefix="/api/v1/exams", tags=["exams"])

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Global Error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "An internal server error occurred.", "detail": str(exc)},
    )

@app.get("/health")
async def health():
    return {"status": "Server running"}

@app.get("/api/v1/ai-status")
def ai_status():
    return {"mode": "free", "ready": True, "failed": False}

@app.get("/")
def read_root():
    return {"message": "Welcome to APEX EduAI API v2 (No Auth)"}

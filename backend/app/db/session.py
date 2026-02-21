from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
import time
import sys

# Create database engine with retry logic
def create_db_engine():
    max_retries = 5
    retry_delay = 2
    for attempt in range(max_retries):
        try:
            if settings.DATABASE_URL and "sqlite" in settings.DATABASE_URL:
                engine = create_engine(
                    settings.DATABASE_URL,
                    connect_args={"check_same_thread": False},
                    pool_pre_ping=True
                )
            else:
                engine = create_engine(
                    settings.DATABASE_URL or "sqlite:///./apex.db",
                    pool_pre_ping=True
                )
            # Test connection
            with engine.connect() as conn:
                pass
            print(f"Database connection established successfully.")
            return engine
        except Exception as e:
            print(f"Database connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                print("Failed to connect to the database after maximum retries.")
                # We do not exit to prevent server crash, just log it.
                # The engine will try to reconnect on next request.
                return None

engine = create_db_engine()

if engine:
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
else:
    # Fallback to standard creation if completely failed (will error on use)
    engine = create_engine(settings.DATABASE_URL or "sqlite:///./apex.db")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

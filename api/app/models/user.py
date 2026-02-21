from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    phone_number    = Column(String, unique=True, index=True, nullable=False)
    full_name       = Column(String, nullable=True)
    email           = Column(String, nullable=True)
    institution     = Column(String, nullable=True)   # University/SHS/JHS/Training College
    hashed_password = Column(String, nullable=True)   # Added for password login
    avatar_url      = Column(String, nullable=True)   # path to uploaded profile picture
    current_txn_id  = Column(String, nullable=True)
    expiry_date     = Column(DateTime, nullable=True)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.datetime.utcnow)

    exams = relationship("Exam", back_populates="owner")


class Transaction(Base):
    __tablename__ = "transactions"

    id            = Column(Integer, primary_key=True, index=True)
    txn_id_hash   = Column(String, unique=True, index=True, nullable=False)
    amount        = Column(Integer, nullable=False)
    currency      = Column(String, default="GHS")
    is_used       = Column(Boolean, default=False)
    used_by_phone = Column(String, nullable=True)
    used_at       = Column(DateTime, nullable=True)
    created_at    = Column(DateTime, default=datetime.datetime.utcnow)


class AdultGameLog(Base):
    __tablename__ = "adult_game_logs"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"))
    game_title   = Column(String)
    question     = Column(String)
    answer       = Column(String)
    played_at    = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")

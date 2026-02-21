from sqlalchemy import Column, Integer, String, DateTime
from app.db.session import Base
import datetime

class GameAnswer(Base):
    __tablename__ = "game_answers"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

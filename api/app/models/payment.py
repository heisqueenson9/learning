from sqlalchemy import Column, Integer, String, DateTime
from app.db.session import Base
import datetime

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=False, index=True)
    institution = Column(String, nullable=True)
    package = Column(String, nullable=True)
    due_date = Column(DateTime, nullable=True)
    screenshot_url = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

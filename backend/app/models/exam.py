from sqlalchemy import Column, Integer, String, Boolean, DateTime, CheckConstraint, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base
import datetime

class Exam(Base):
    __tablename__ = "exams"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="exams")

    title = Column(String, index=True) 
    level = Column(String) # e.g. "Level 200"
    topic = Column(String) # e.g. "Data Structure"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    file_path = Column(String) # If generated from file upload
    questions = Column(String) # Store as JSON string or relation
    
    # Difficulty/Type
    difficulty = Column(String) # Easy, Moderate, Difficult
    exam_type = Column(String) # Quiz, Assignment, Midsem, Final

    # Section Marks
    section_a_mark = Column(Integer, default=30)
    section_b_mark = Column(Integer, default=20)
    section_c_mark = Column(Integer, default=50)

    # Output Format (just meta)
    generated_file_path = Column(String, nullable=True) # e.g. .pdf location

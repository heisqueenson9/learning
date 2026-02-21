from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ExamCreate(BaseModel):
    title:            str
    level:            str
    topic:            str
    exam_type:        str
    difficulty:       str
    upload_file_path: Optional[str] = None

class ExamResponse(BaseModel):
    id:                    int
    title:                 str
    topic:                 Optional[str] = None
    level:                 Optional[str] = None
    exam_type:             Optional[str] = None
    difficulty:            Optional[str] = None
    questions:             Optional[str] = None
    generated_file_path:   Optional[str] = None
    created_at:            datetime

    class Config:
        from_attributes = True

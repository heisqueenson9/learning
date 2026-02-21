from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    phone_number: str

class UserCreate(UserBase):
    txn_id:      str
    full_name:   Optional[str] = None
    email:       Optional[str] = None
    institution: Optional[str] = None
    password:    Optional[str] = None

class UserInDB(UserBase):
    id:          int
    full_name:   Optional[str] = None
    email:       Optional[str] = None
    institution: Optional[str] = None
    avatar_url:  Optional[str] = None
    is_active:   bool
    expiry_date: Optional[datetime] = None
    created_at:  datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token:      str
    token_type:        str
    subscription_end:  Optional[datetime] = None
    full_name:         Optional[str] = None
    email:             Optional[str] = None
    institution:       Optional[str] = None
    avatar_url:        Optional[str] = None
    phone_number:      Optional[str] = None

class TokenData(BaseModel):
    phone_number: Optional[str] = None
    expiry:       Optional[datetime] = None

class TransactionCreate(BaseModel):
    txn_id: str
    amount: float

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
    questions:             Optional[str] = None
    generated_file_path:   Optional[str] = None
    created_at:            datetime
    class Config:
        from_attributes = True

class AdultGameLogCreate(BaseModel):
    game_title: str
    question:   str
    answer:     str

class AdultGameLogResponse(BaseModel):
    id:          int
    user_id:     int
    user_phone:  Optional[str] = None
    user_name:   Optional[str] = None
    game_title:  str
    question:    str
    answer:      str
    played_at:   datetime

    class Config:
        from_attributes = True

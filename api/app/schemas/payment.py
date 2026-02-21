from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PaymentResponse(BaseModel):
    id: int
    full_name: str
    phone: str
    screenshot_url: str
    created_at: datetime

    class Config:
        from_attributes = True

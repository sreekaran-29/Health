from typing import Optional
from pydantic import BaseModel, EmailStr

class EmailSchema(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None
    recipient_email: Optional[EmailStr] = None
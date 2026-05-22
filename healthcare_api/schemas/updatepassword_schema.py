from typing import Optional
from pydantic import BaseModel, EmailStr

class UpdatePasswordSchema(BaseModel):
    email: Optional[EmailStr] = None
    token: Optional[str] = None
    new_password: Optional[str] = None
    confirm_password: Optional[str] = None
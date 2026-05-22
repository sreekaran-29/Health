from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional
from schemas.doctor_schema import DoctorSchema
from uuid import UUID

class UserSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    Id: Optional[UUID] = None
    FirstName: Optional[str] = None
    LastName: Optional[str] = None
    EmailAddress: Optional[EmailStr] = None
    Phone: Optional[str] = None
    IsDoctor: Optional[bool] = False
    RoleId: Optional[UUID] = None
    AccountId: Optional[UUID] = None
    StatusId: Optional[int] = None
    Type: Optional[str] = None
    doctor: Optional[DoctorSchema] = None
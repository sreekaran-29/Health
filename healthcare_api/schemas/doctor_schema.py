from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Any, Optional
from uuid import UUID

class DoctorScheduleSchema(BaseModel):
    Id: Optional[UUID] = None
    UserId: Optional[UUID] = None
    Date: Optional[Any | str] = None
    DayOfWeek: Optional[int] = None
    StartTime: Optional[Any | str] = None
    EndTime: Optional[Any | str] = None
    StatusId: Optional[int] = None
    Type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DoctorDayOffSchema(BaseModel):
    Id: Optional[UUID] = None
    UserId: Optional[UUID] = None
    StartDate: Optional[Any | str] = None
    EndDate: Optional[Any | str] = None
    StartTime: Optional[Any | str] = None
    EndTime: Optional[Any | str] = None
    IsAllDay: Optional[bool] = None
    StatusId: Optional[int] = None
    Reason: Optional[str] = None
    Type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DoctorSchema(BaseModel):
    Id: Optional[UUID] = None
    Type : Optional[str] = None
    Title: Optional[str] = None
    ClinicalRole: Optional[str] = None
    Specialty: Optional[str] = None
    Credential: Optional[str] = None
    UserId: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)

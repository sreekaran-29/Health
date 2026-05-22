from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID

class ServiceSchema(BaseModel):
    Id: Optional[UUID] = None
    Name: Optional[str] = None
    EstimatedServiceTime: Optional[int] = None
    StatusId: Optional[int] = None
    Description: Optional[str] = None
    Type: Optional[str] = None
    AccountId: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)
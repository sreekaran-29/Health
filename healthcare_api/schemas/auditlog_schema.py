from pydantic import BaseModel
from typing import Optional, Any
from uuid import UUID
from datetime import datetime


class AuditLogBase(BaseModel):
    AccountId: Optional[UUID] = None
    ActorId: Optional[UUID] = None
    Event: Optional[str] = None #
    ActorType: Optional[str] = "user"
    ResourceType: Optional[str] = None #
    ResourceId: Optional[Any] = None #
    Metadata: Optional[dict[str, Any]] = None
    OldValue: Optional[Any] = None
    NewValue: Optional[Any] = None
    CreatedOn: Optional[datetime] = None
    Status: Optional[str] = None
    Type: Optional[str] = None #


class AuditLogSchema(AuditLogBase):
    pass
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

class RoleSchema(BaseModel):
    Id: Optional[UUID]
    AccountId: Optional[UUID] = None
    Name: Optional[str] = None
    Description: Optional[str] = None
    PermissionIds: Optional[List[UUID]] = []
    IsSuperAdmin: bool = False
    StatusId: Optional[int] = None
    Type: Optional[str] = None

    class Config:
        from_attributes = True
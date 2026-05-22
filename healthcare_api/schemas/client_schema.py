from pydantic import BaseModel, EmailStr
from typing import Optional
from schemas.address_schema import AddressSchema

class ClientSchema(BaseModel):
    Id: Optional[str] = None
    OrganizationName: Optional[str] = None
    ShortForm: Optional[str] = None
    Email: Optional[EmailStr] = None
    Phone: Optional[str] = None
    LegalAddress: Optional[AddressSchema] = None
    BillingAddress: Optional[AddressSchema] = None
    StatusId: Optional[int] = None
    Reason: Optional[str] = None
    FileId: Optional[int] = None
    Type: Optional[str] = None
    Services: Optional[list[int]] = None
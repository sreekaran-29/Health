from pydantic import BaseModel
from typing import Optional

class AddressSchema(BaseModel):
    Street: Optional[str] = None
    City: Optional[str] = None
    State: Optional[str] = None
    Country: Optional[str] = None
    Zipcode: Optional[str] = None
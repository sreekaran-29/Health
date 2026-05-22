from pydantic import BaseModel
from typing import Any, Optional

class ResponseModel(BaseModel):
    data: Optional[dict | list | Any] = None
    status: Optional[str] = None
    status_code: Optional[int] = None
    is_success: Optional[bool] = None
    message: Optional[str] = None
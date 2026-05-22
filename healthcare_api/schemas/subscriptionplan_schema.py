from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from uuid import UUID

class SubscriptionPlanSchema(BaseModel):
    Id: Optional[UUID]
    Name: Optional[str] = None
    Description: Optional[str] = None
    StatusId: Optional[int] = None
    DoctorsLimit: Optional[int] = None
    PatientsLimit: Optional[int] = None
    StorageSize: Optional[float] = None
    Price: Optional[List[float]] = None  
    IsRecurring: Optional[bool] = True
    BillingMethod: Optional[List[Optional[str]]] = ["month", "year"]
    Type: Optional[str] = None
    MonthlyPriceId: Optional[str] = None
    YearlyPriceId: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SubscriberPaymentLink(BaseModel):
    Id: Optional[str] = None
    Type: Optional[str] = None
    AccountId: Optional[str] = None
    SubscriptionPlanId: Optional[str] = None
    SubscriptionPriceId: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
import uuid
from sqlalchemy import Boolean, ForeignKey, Integer, Text, func, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from config.db_config import Base

if TYPE_CHECKING:
	from models.subscriptionplan_model import SubscriptionPlan


class SubscriptionPrice(Base):
	__tablename__ = "SubscriptionPrice"

	Id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	SubscriptionPlanId: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("SubscriptionPlan.Id"), nullable=True)
	StripePriceId: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
	Price: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
	IsRecurring: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True, default=False, server_default="false")
	BillingMethod: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
	CreatedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True),nullable=True,server_default=func.now(),default=lambda: datetime.now(timezone.utc))
	CreatedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
	ModifiedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True),nullable=True,server_default=func.now(),onupdate=func.now())
	ModifiedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

	plan: Mapped[Optional["SubscriptionPlan"]] = relationship(
		"SubscriptionPlan",
		back_populates="prices",
		foreign_keys=[SubscriptionPlanId],
	)

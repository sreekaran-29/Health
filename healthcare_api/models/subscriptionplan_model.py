from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
import uuid
from sqlalchemy import Float, Integer, Text, func, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship, foreign
from config.db_config import Base

if TYPE_CHECKING:
	from models.subscriptionprice_model import SubscriptionPrice
	from models.subscribers_model import Subscriber
	from models.users_model import User


class SubscriptionPlan(Base):
	__tablename__ = "SubscriptionPlan"

	Id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	StripeProductId: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
	Name: Mapped[str] = mapped_column(Text, nullable=False)
	Description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
	StatusId: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
	CreatedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True),nullable=True,server_default=func.now(),default=lambda: datetime.now(timezone.utc),)
	CreatedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
	ModifiedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True),nullable=True,server_default=func.now(),onupdate=func.now())
	ModifiedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
	DoctorsLimit: Mapped[int] = mapped_column(Integer, nullable=False)
	PatientsLimit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
	StorageSize: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

	prices: Mapped[list["SubscriptionPrice"]] = relationship(
		"SubscriptionPrice",
		back_populates="plan",
		foreign_keys="SubscriptionPrice.SubscriptionPlanId",
	)
	subscribers: Mapped[list["Subscriber"]] = relationship(
		"Subscriber",
		back_populates="subscription_plan",
		foreign_keys="Subscriber.SubscriptionPlanId",
	)
	created_by_user: Mapped[Optional["User"]] = relationship(
		"User",
		primaryjoin="foreign(SubscriptionPlan.CreatedBy) == User.Id",
		foreign_keys=[CreatedBy],
		back_populates="created_subscription_plans",
		viewonly=True,
	)

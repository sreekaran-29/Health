from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
import uuid
from sqlalchemy import Integer, Text, Index, ForeignKey, func, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from config.db_config import Base

if TYPE_CHECKING:
	from models.subscriptionplan_model import SubscriptionPlan
	from models.clients_model import Client
	from models.subscriptionprice_model import SubscriptionPrice
	from models.status_model import Status
	from models.transaction_model import Transaction
	from models.users_model import User


class Subscriber(Base):
	__tablename__ = "Subscribers"

	Id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	SubscriptionPlanId: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("SubscriptionPlan.Id"), nullable=True)
	SubscriptionPriceId: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("SubscriptionPrice.Id"), nullable=True)
	AccountId: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("Clients.Id"), nullable=True)
	StartDate: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
	EndDate: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
	StripeSubscriptionId: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
	StatusId: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("Status.Id"), nullable=True)
	CreatedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True),nullable=True,server_default=func.now(),default=lambda: datetime.now(timezone.utc))
	CreatedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
	ModifiedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True),nullable=True,server_default=func.now(),onupdate=func.now())
	ModifiedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

	created_by_user: Mapped[Optional["User"]] = relationship(
		"User",
		primaryjoin="foreign(Subscriber.CreatedBy) == User.Id",
		foreign_keys=[CreatedBy],
		back_populates="created_subscribers",
		viewonly=True,
	)
	modified_by_user: Mapped[Optional["User"]] = relationship(
		"User",
		primaryjoin="foreign(Subscriber.ModifiedBy) == User.Id",
		foreign_keys=[ModifiedBy],
		back_populates="modified_subscribers",
		viewonly=True,
	)
	subscription_plan: Mapped[Optional["SubscriptionPlan"]] = relationship("SubscriptionPlan", back_populates="subscribers", foreign_keys=[SubscriptionPlanId])
	subscription_price: Mapped[Optional["SubscriptionPrice"]] = relationship("SubscriptionPrice", foreign_keys=[SubscriptionPriceId])
	account: Mapped[Optional["Client"]] = relationship("Client", foreign_keys=[AccountId], overlaps="client")
	client: Mapped[Optional["Client"]] = relationship("Client", foreign_keys=[AccountId], back_populates="subscribers", overlaps="account")
	status: Mapped[Optional["Status"]] = relationship("Status", back_populates="subscribers", foreign_keys=[StatusId])
	transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="subscriber", foreign_keys="Transaction.SubscribersId")


	__table_args__ = (Index("idx_subscribers_plan", "SubscriptionPlanId"),Index("idx_subscribers_user", "AccountId"),)

from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
import uuid
from sqlalchemy import Integer, Text, Index, ForeignKey, func, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from config.db_config import Base

if TYPE_CHECKING:
	from models.subscribers_model import Subscriber
	from models.status_model import Status


class Transaction(Base):
	__tablename__ = "Transaction"

	Id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	SubscribersId: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("Subscribers.Id"), nullable=True)
	StripeTransactionId: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
	StripeChargeId: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
	TransactionDate: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
	TransactionAmount: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
	StatusId: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("Status.Id"), nullable=True)
	CreatedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True),nullable=True,server_default=func.now(),default=lambda: datetime.now(timezone.utc),)
	CreatedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
	ModifiedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True),nullable=True,server_default=func.now(),onupdate=func.now())
	ModifiedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

	subscriber: Mapped[Optional["Subscriber"]] = relationship("Subscriber", back_populates="transactions", foreign_keys=[SubscribersId])
	status: Mapped[Optional["Status"]] = relationship("Status", back_populates="transactions", foreign_keys=[StatusId])

	__table_args__ = (Index("idx_transaction_subscriber", "SubscribersId"),)

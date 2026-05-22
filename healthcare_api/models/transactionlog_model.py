from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
import uuid
from sqlalchemy import Integer, Text, ForeignKey, func, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from config.db_config import Base

if TYPE_CHECKING:
	from models.transaction_model import Transaction


class TransactionLog(Base):
	__tablename__ = "TransactionLog"

	Id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
	TransactionId: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("Transaction.Id"), nullable=True)
	RequestData: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
	RequestDate: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
	ResponseData: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
	ResponseDate: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
	CreatedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True),nullable=True,server_default=func.now(),default=lambda: datetime.now(timezone.utc))
	CreatedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

	transaction: Mapped[Optional["Transaction"]] = relationship("Transaction", foreign_keys=[TransactionId])

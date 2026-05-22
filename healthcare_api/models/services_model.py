from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
import uuid
from sqlalchemy import String, Integer, ForeignKey, Text, func, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from config.db_config import Base

if TYPE_CHECKING:
	from models.users_model import User
	from models.status_model import Status
	from models.clients_model import Client


class Service(Base):
	__tablename__ = "Services"

	Id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	AccountId: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("Clients.Id"), nullable=False)
	Name: Mapped[str] = mapped_column(String(255), nullable=False)
	EstimatedServiceTime: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
	StatusId: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("Status.Id"), nullable=True)
	CreatedOn: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), default=lambda: datetime.now(timezone.utc))
	CreatedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("Users.Id"), nullable=True)
	ModifiedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True, onupdate=func.now(), default=lambda: datetime.now(timezone.utc))
	ModifiedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("Users.Id"), nullable=True)
	Description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

	# Relationships
	status: Mapped[Optional["Status"]] = relationship("Status", foreign_keys=[StatusId], lazy="selectin")
	created_by_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[CreatedBy], lazy="selectin")
	modified_by_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[ModifiedBy], lazy="selectin")
	client: Mapped[Optional["Client"]] = relationship("Client", foreign_keys=[AccountId], lazy="selectin")
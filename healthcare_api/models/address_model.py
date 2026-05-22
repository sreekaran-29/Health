from typing import Optional, TYPE_CHECKING
from datetime import datetime, timezone
from sqlalchemy import Integer, Index, String, ForeignKey, func, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from config.db_config import Base
import uuid

if TYPE_CHECKING:
    from models.clients_model import Client


class Address(Base):
    __tablename__ = "Address"

    Id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    Type: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    AccountId: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True),ForeignKey("Clients.Id"), nullable=True)
    UserId: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True),ForeignKey("Users.Id"), nullable=True)
    Street: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    City: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    State: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    Country: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    Zipcode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    CreatedOn: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(),default=lambda: datetime.now(timezone.utc))
    CreatedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    ModifiedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True, server_default=func.now(), onupdate=func.now())
    ModifiedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    client: Mapped[Optional["Client"]] = relationship("Client",back_populates="addresses",foreign_keys=[AccountId])
    


    __table_args__ = (Index("idx_address_account", "AccountId"),Index("idx_address_user", "UserId"),)
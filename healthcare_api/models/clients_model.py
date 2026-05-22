from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
import uuid
from sqlalchemy import Float, String, Integer, Text, Index, ForeignKey, func, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship, foreign
from config.db_config import Base

if TYPE_CHECKING:
    from models.address_model import Address
    from models.users_model import User
    from models.accountservices_model import AccountServices
    from models.subscribers_model import Subscriber
    from models.status_model import Status
    from models.roles_model import Role


class Client(Base):
    __tablename__ = "Clients"

    Id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    OrganizationName: Mapped[str] = mapped_column(String(255), nullable=False)
    ShortForm: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    Email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    Phone: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    LegalAddressId: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("Address.Id"), nullable=True)
    BillingAddressId: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("Address.Id"), nullable=True)
    FileId: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("Files.Id"), nullable=True)
    StatusId: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    Reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    StripeCustomerId: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    CreatedOn: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(),default=lambda: datetime.now(timezone.utc))
    CreatedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    ModifiedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True, server_default=func.now(), onupdate=func.now())
    ModifiedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    StorageSize: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    addresses: Mapped[List["Address"]] = relationship("Address",back_populates="client",cascade="all, delete-orphan",foreign_keys="[Address.AccountId]")
    LegalAddress: Mapped[Optional["Address"]] = relationship("Address",foreign_keys=[LegalAddressId])
    BillingAddress: Mapped[Optional["Address"]] = relationship("Address",foreign_keys=[BillingAddressId])
    users: Mapped[List["User"]] = relationship("User",back_populates="client",cascade="all, delete-orphan")
    created_by_user: Mapped[Optional["User"]] = relationship(
        "User",
        primaryjoin="foreign(Client.CreatedBy) == User.Id",
        foreign_keys=[CreatedBy],
        viewonly=True,
    )
    modified_by_user: Mapped[Optional["User"]] = relationship(
        "User",
        primaryjoin="foreign(Client.ModifiedBy) == User.Id",
        foreign_keys=[ModifiedBy],
        viewonly=True,
    )
    status: Mapped[Optional["Status"]] = relationship(
        "Status",
        primaryjoin="foreign(Client.StatusId) == Status.Id",
        foreign_keys=[StatusId],
        viewonly=True,
    )
    account_service: Mapped[Optional["AccountServices"]] = relationship("AccountServices", back_populates="client", uselist=False)
    subscribers: Mapped[List["Subscriber"]] = relationship(
        "Subscriber",
        back_populates="client",
        foreign_keys="Subscriber.AccountId",
        overlaps="account",
    )
    roles: Mapped[List["Role"]] = relationship(
        "Role",
        back_populates="client",
        foreign_keys="Role.AccountId",
    )

    __table_args__ = (Index("ix_clients_email_status", "Email", "StatusId"),Index("idx_clients_status", "StatusId"),)
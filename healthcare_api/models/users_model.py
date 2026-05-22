from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
import uuid
from sqlalchemy import Boolean, Integer, String, Index, ForeignKey, func, TIMESTAMP, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from config.db_config import Base
from models.roles_model import Role

if TYPE_CHECKING:
    from models.clients_model import Client
    from models.doctors_model import Doctor
    from models.subscriptionplan_model import SubscriptionPlan
    from models.subscribers_model import Subscriber
    from models.status_model import Status


class User(Base):
    __tablename__ = "Users"

    Id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    AccountId: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("Clients.Id"), nullable=True)
    RoleId: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("Roles.Id"), nullable=True)
    FirstName: Mapped[str] = mapped_column(String(255), nullable=False)
    LastName: Mapped[str] = mapped_column(String(255), nullable=False)
    EmailAddress: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    Password: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    Phone: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    IsDoctor: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    ResetToken: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ResetTokenExpires: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    StatusId: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("Status.Id"), nullable=True)
    CreatedOn: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(),default=lambda: datetime.now(timezone.utc))
    CreatedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    ModifiedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True, onupdate=func.now(),default=lambda: datetime.now(timezone.utc))
    ModifiedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Relationships
    created_subscription_plans: Mapped[List["SubscriptionPlan"]] = relationship("SubscriptionPlan", primaryjoin="foreign(SubscriptionPlan.CreatedBy) == User.Id",back_populates="created_by_user",)
    created_subscribers: Mapped[List["Subscriber"]] = relationship("Subscriber", primaryjoin="foreign(Subscriber.CreatedBy) == User.Id",back_populates="created_by_user",)
    modified_subscribers: Mapped[List["Subscriber"]] = relationship("Subscriber", primaryjoin="foreign(Subscriber.ModifiedBy) == User.Id",back_populates="modified_by_user",)
    role: Mapped[Optional[Role]] = relationship(Role, foreign_keys=[RoleId], back_populates="users", lazy="selectin")
    client: Mapped[Optional["Client"]] = relationship("Client", back_populates="users", foreign_keys=[AccountId], lazy="selectin")
    doctor: Mapped[Optional["Doctor"]] = relationship("Doctor", back_populates="user", foreign_keys="Doctor.UserId", lazy="selectin")
    status: Mapped[Optional["Status"]] = relationship("Status", foreign_keys=[StatusId], lazy="selectin")

    __table_args__ = (Index("idx_users_account", "AccountId"), Index("idx_users_role", "RoleId"), Index("idx_users_email", "EmailAddress"),)
from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
import uuid
from sqlalchemy import Boolean, Integer, String, Text, Index, ForeignKey, func, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates
from config.db_config import Base

if TYPE_CHECKING:
    from models.users_model import User
    from models.permissions_model import Permission
    from models.status_model import Status
    from models.clients_model import Client


class Role(Base):
    __tablename__ = "Roles"

    Id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    AccountId: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("Clients.Id"), nullable=True)
    Name: Mapped[str] = mapped_column(String(255), nullable=False)
    Description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    PermissionIds: Mapped[Optional[list[uuid.UUID]]] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=True, default=list)
    IsSuperAdmin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    StatusId: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("Status.Id"), nullable=True)
    CreatedOn: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(),default=lambda: datetime.now(timezone.utc))
    ModifiedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True, server_default=func.now(), onupdate=func.now())
    CreatedBy: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("Users.Id"),
        nullable=True
    )

    ModifiedBy: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("Users.Id"),
        nullable=True
    )

    # Relationships
    users: Mapped[List["User"]] = relationship(
        "User",
        back_populates="role",
        foreign_keys="User.RoleId",
        lazy="raise",
    )
    created_by_user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[CreatedBy],
        lazy="selectin",
    )

    modified_by_user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[ModifiedBy],
        lazy="selectin",
    )

    status: Mapped[Optional["Status"]] = relationship(
        "Status",
        back_populates="roles",
        foreign_keys=[StatusId],
        lazy="selectin",
    )

    client: Mapped[Optional["Client"]] = relationship(
        "Client",
        back_populates="roles",
        foreign_keys=[AccountId],
        lazy="selectin",
    )
    __table_args__ = (Index("idx_roles_account", "AccountId"),)
from datetime import datetime, time, timezone
from typing import TYPE_CHECKING, Optional
import uuid
from sqlalchemy import Integer, Time, Date, Index, ForeignKey, func, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from config.db_config import Base

if TYPE_CHECKING:
    from models.users_model import User
    from models.status_model import Status


class DoctorSchedule(Base):
    __tablename__ = "Doctor_Schedules"

    Id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    UserId: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("Users.Id"), nullable=False, index=True)
    Date: Mapped[datetime.date] = mapped_column(Date, nullable=False, index=True)
    DayOfWeek: Mapped[int] = mapped_column(Integer, nullable=False)
    StartTime: Mapped[time] = mapped_column(Time(timezone=False), nullable=False)
    EndTime: Mapped[time] = mapped_column(Time(timezone=False), nullable=False)
    StatusId: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("Status.Id"), nullable=True)
    CreatedOn: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), default=lambda: datetime.now(timezone.utc))
    CreatedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("Users.Id"), nullable=True)
    ModifiedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True, onupdate=func.now(), default=lambda: datetime.now(timezone.utc))
    ModifiedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("Users.Id"), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[UserId], lazy="selectin")
    status: Mapped[Optional["Status"]] = relationship("Status", foreign_keys=[StatusId], lazy="selectin")
    created_by_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[CreatedBy], lazy="selectin", overlaps="user")
    modified_by_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[ModifiedBy], lazy="selectin", overlaps="user")
    doctor = relationship(
            "Doctor",
            primaryjoin="DoctorSchedule.UserId==Doctor.UserId",
            foreign_keys=[UserId],
            lazy="selectin",
            viewonly=True
        )


    __table_args__ = (Index("idx_schedules_user", "UserId"),Index("idx_schedules_date", "Date"),)
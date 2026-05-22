from datetime import datetime, date, time, timezone
from typing import TYPE_CHECKING, Optional
import uuid
from sqlalchemy import Boolean, Integer, Text, Time, Date, Index, ForeignKey, func, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from config.db_config import Base

if TYPE_CHECKING:
    from models.users_model import User
    from models.status_model import Status


class DoctorDayOff(Base):  
    __tablename__ = "Doctor_Days_off"

    Id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    UserId: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("Users.Id"), nullable=False, index=True)
    StartDate: Mapped[date] = mapped_column(Date, nullable=False)
    EndDate: Mapped[date] = mapped_column(Date, nullable=False)
    StartTime: Mapped[time] = mapped_column(Time(timezone=False), nullable=False)
    EndTime: Mapped[time] = mapped_column(Time(timezone=False), nullable=False)
    IsAllDay: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    StatusId: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("Status.Id"), nullable=True)
    Reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    CreatedOn: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), default=lambda: datetime.now(timezone.utc))
    CreatedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("Users.Id"), nullable=True)
    ModifiedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True, onupdate=func.now(), default=lambda: datetime.now(timezone.utc))
    ModifiedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("Users.Id"), nullable=True)

    user: Mapped["User"] = relationship("User", foreign_keys=[UserId], lazy="selectin")
    doctor = relationship("Doctor",primaryjoin="DoctorDayOff.UserId==Doctor.UserId",foreign_keys=[UserId],lazy="selectin",viewonly=True)
    status: Mapped[Optional["Status"]] = relationship("Status", foreign_keys=[StatusId], lazy="selectin")
    created_by_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[CreatedBy], lazy="selectin", overlaps="user")
    modified_by_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[ModifiedBy], lazy="selectin", overlaps="user")

    __table_args__ = (Index("idx_days_off_user", "UserId"),)
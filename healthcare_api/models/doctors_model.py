from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
import uuid
from sqlalchemy import String, Index, ForeignKey, func, TIMESTAMP, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from config.db_config import Base

if TYPE_CHECKING:
	from models.users_model import User
	from models.status_model import Status


class Doctor(Base):
	__tablename__ = "Doctors"

	Id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	UserId: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("Users.Id"), nullable=False)
	Title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
	ClinicalRole: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
	Specialty: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
	Credential: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
	FileId: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
	CreatedOn: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), default=lambda: datetime.now(timezone.utc))
	CreatedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True),ForeignKey("Users.Id"), nullable=True)
	ModifiedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True, onupdate=func.now(), default=lambda: datetime.now(timezone.utc))
	ModifiedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True),ForeignKey("Users.Id"), nullable=True)

	# Relationships
	user = relationship("User",foreign_keys=[UserId],lazy="selectin",overlaps="schedules,days_off,user")
	created_by_user: Mapped[Optional["User"]] = relationship("User",foreign_keys=[CreatedBy],lazy="selectin",overlaps="schedules,days_off,user")
	modified_by_user: Mapped[Optional["User"]] = relationship("User",foreign_keys=[ModifiedBy],lazy="selectin",overlaps="schedules,days_off,user")
	schedules: Mapped[list] = relationship(
		"DoctorSchedule",
		primaryjoin="Doctor.UserId==DoctorSchedule.UserId",
		foreign_keys="DoctorSchedule.UserId",
		lazy="selectin",
		cascade="all, delete-orphan",
		overlaps="user"
	)
	days_off: Mapped[list] = relationship(
		"DoctorDayOff",
		primaryjoin="Doctor.UserId==DoctorDayOff.UserId",
		foreign_keys="DoctorDayOff.UserId",
		lazy="selectin",
		cascade="all, delete-orphan",
		overlaps="user"
	)

	__table_args__ = (Index("idx_doctors_user", "UserId"),)

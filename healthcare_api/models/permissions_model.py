from datetime import datetime, timezone
from typing import Optional
import uuid
from sqlalchemy import Integer, String, Text, TIMESTAMP, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from config.db_config import Base
from models.applicationservice_model import ApplicationService


class Permission(Base):
    __tablename__ = "Permission"

    Id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ApplicationServiceId: Mapped[int] = mapped_column(Integer, ForeignKey("Application_Services.Id"), nullable=False)
    Name: Mapped[str] = mapped_column(String(255), nullable=False)
    Code: Mapped[str] = mapped_column(String(255), nullable=False)
    Description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    Status: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    CreatedOn: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), default=lambda: datetime.now(timezone.utc))
    CreatedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    ModifiedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True, server_default=func.now(), onupdate=func.now())
    ModifiedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    application_service: Mapped["ApplicationService"] = relationship(
        "ApplicationService",
        foreign_keys=[ApplicationServiceId],
    )

from datetime import datetime, timezone
from typing import Optional
import uuid
from sqlalchemy import Integer, String, Text, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from config.db_config import Base


class ApplicationService(Base):
    __tablename__ = "Application_Services"

    Id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    Name: Mapped[str] = mapped_column(String(255), nullable=False)
    Description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    CreatedOn: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )
    CreatedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

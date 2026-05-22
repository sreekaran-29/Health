from datetime import datetime, timezone
from typing import Optional
import uuid
from sqlalchemy import Integer, String, Text, func, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from config.db_config import Base


class ErrorLog(Base):
    __tablename__ = "Error_Logs"

    Id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    UserId: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ExceptionAt: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    Error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    Properties: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    CreatedOn: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(),default=lambda: datetime.now(timezone.utc))
from datetime import datetime, timezone
from typing import Optional
import uuid
from sqlalchemy import Integer, String, Text, Index, func, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from config.db_config import Base


class File(Base):
    __tablename__ = "Files"

    Id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    AccountId: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    Type: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    FileName: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    FilePath: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    Metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    CreatedOn: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(),default=lambda: datetime.now(timezone.utc))
    CreatedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    __table_args__ = (Index("idx_files_account", "AccountId"), Index("idx_files_type", "Type"),Index("ix_files_account_type", "AccountId", "Type"),)
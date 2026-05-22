from datetime import datetime, timezone
from typing import Optional
import uuid
from sqlalchemy import Integer, String, Text, func, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from config.db_config import Base


class AuditLog(Base):
    __tablename__ = "AuditLogs"

    Id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    AccountId: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    Event: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ActorId: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)  
    ActorType: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)              
    ResourceId: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)             
    ResourceType: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)           
    Metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    CreatedOn: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(),default=lambda: datetime.now(timezone.utc))
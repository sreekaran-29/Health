from typing import Optional, TYPE_CHECKING, List
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from config.db_config import Base

if TYPE_CHECKING:
    from models.status_model import Status

class StatusType(Base):
    __tablename__ = "StatusType"

    Id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    Code: Mapped[str] = mapped_column(String(255), nullable=False)
    Name: Mapped[str] = mapped_column(String(255), nullable=False)
    statuses: Mapped[List["Status"]] = relationship("Status", back_populates="status_type",cascade="all, delete-orphan")
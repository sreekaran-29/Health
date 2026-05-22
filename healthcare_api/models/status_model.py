from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from config.db_config import Base
from models.statustype_model import StatusType

if TYPE_CHECKING:
    from models.statustype_model import StatusType
    from models.subscribers_model import Subscriber
    from models.transaction_model import Transaction
    from models.roles_model import Role
    from models.doctors_model import Doctor

class Status(Base):
    __tablename__ = "Status"

    Id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    StatusTypeId: Mapped[int] = mapped_column(Integer,ForeignKey("StatusType.Id"),nullable=False,index=True)
    Code: Mapped[str] = mapped_column(String(255), nullable=False)
    Name: Mapped[str] = mapped_column(String(255), nullable=False)
    status_type: Mapped["StatusType"] = relationship(StatusType, back_populates="statuses")
    subscribers: Mapped[list["Subscriber"]] = relationship("Subscriber", back_populates="status", foreign_keys="Subscriber.StatusId")
    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="status", foreign_keys="Transaction.StatusId")
    roles: Mapped[list["Role"]] = relationship("Role", back_populates="status", foreign_keys="Role.StatusId", lazy="selectin",)

    __table_args__ = (Index("idx_status_type", "StatusTypeId"),)
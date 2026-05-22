from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Integer, Index, func, ForeignKey
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from config.db_config import Base
import uuid
from datetime import datetime, timezone

if TYPE_CHECKING:
    from models.clients_model import Client

class AccountServices(Base):
    __tablename__ = "Account_Services"

    Id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    AccountId: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("Clients.Id"), nullable=False)
    ServiceIds: Mapped[List[int]] = mapped_column(ARRAY(Integer), nullable=False, default=list)
    CreatedOn: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), default=lambda: datetime.now(timezone.utc))
    CreatedBy: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    ModifiedBy: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    ModifiedOn: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True, server_default=func.now(), onupdate=func.now())

    client: Mapped["Client"] = relationship("Client", back_populates="account_service")

    __table_args__ = (Index('idx_account_services_account_id', 'AccountId'),)
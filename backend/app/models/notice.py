from sqlalchemy import Column, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base

class NoticeRecord(Base):
    __tablename__ = "notices"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String, ForeignKey("scan_records.id", ondelete="CASCADE"), nullable=False, unique=True)
    notice_number = Column(String, nullable=False, unique=True)
    issued_date = Column(String, nullable=False)
    hearing_date = Column(String, nullable=False)
    penalty_amount = Column(Float, nullable=False, default=25000.0)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    scan = relationship("ScanRecord", back_populates="notice")

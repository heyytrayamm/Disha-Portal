from sqlalchemy import Column, String, Boolean, DateTime
import uuid
from datetime import datetime, timezone
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="ENFORCEMENT_OFFICER") # SYSTEM_ADMIN, ENFORCEMENT_OFFICER, RETAILER_MANUFACTURER
    location_unit = Column(String, nullable=True, default="Delhi Zone")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

from sqlalchemy import Column, String, Float, Integer, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base

class ScanRecord(Base):
    __tablename__ = "scan_records"

    id = Column(String, primary_key=True, default=lambda: f"LM-2026-{uuid.uuid4().hex[:6].upper()}")
    barcode = Column(String, nullable=True, index=True)
    product_name = Column(String, nullable=False, index=True)
    brand_name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, default="General Commodities")
    manufacturer_name = Column(String, nullable=False)
    importer_name = Column(String, nullable=True)
    country_of_origin = Column(String, nullable=True, default="India")
    image_url = Column(String, nullable=False)
    scanned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    inspector_name = Column(String, nullable=False, default="Inspector Officer")
    inspector_location = Column(String, nullable=False, default="Zone 4")
    
    # Store package dimensions metadata
    pdp_area_cm2 = Column(Float, nullable=False, default=100.0)
    package_type = Column(String, nullable=False, default="RECTANGULAR")
    min_required_font_mm = Column(Float, nullable=False, default=2.0)
    detected_min_font_mm = Column(Float, nullable=False, default=2.0)
    
    # Score & Status
    overall_score = Column(Float, nullable=False, default=100.0)
    overall_status = Column(String, nullable=False, default="COMPLIANT") # COMPLIANT, NON_COMPLIANT, NEEDS_REVIEW
    enforcement_status = Column(String, nullable=False, default="UNDER_INSPECTION") # UNDER_INSPECTION, NOTICE_ISSUED, CLOSED_COMPLIANT
    
    # Violations tally
    critical_violations = Column(Integer, default=0)
    major_violations = Column(Integer, default=0)
    minor_violations = Column(Integer, default=0)

    # Relationships
    extracted_fields = relationship("ExtractedFieldRecord", back_populates="scan", cascade="all, delete-orphan")
    rule_checks = relationship("RuleCheckRecord", back_populates="scan", cascade="all, delete-orphan")
    notice = relationship("NoticeRecord", back_populates="scan", uselist=False, cascade="all, delete-orphan")

class ExtractedFieldRecord(Base):
    __tablename__ = "extracted_fields"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String, ForeignKey("scan_records.id", ondelete="CASCADE"), nullable=False)
    category = Column(String, nullable=False)
    field_name = Column(String, nullable=False)
    raw_value = Column(String, nullable=False)
    parsed_value = Column(String, nullable=True)
    confidence = Column(Float, nullable=False, default=95.0)
    bounding_box = Column(JSON, nullable=True) # {x, y, width, height, label}
    estimated_font_height_mm = Column(Float, nullable=True)
    is_missing = Column(String, nullable=False, default="false") # 'true' / 'false'

    scan = relationship("ScanRecord", back_populates="extracted_fields")

class RuleCheckRecord(Base):
    __tablename__ = "rule_checks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String, ForeignKey("scan_records.id", ondelete="CASCADE"), nullable=False)
    rule_id = Column(String, nullable=False)
    rule_number = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False)
    is_mandatory = Column(String, default="true")
    status = Column(String, nullable=False) # PASS, FAIL, WARNING, NOT_APPLICABLE
    severity = Column(String, nullable=False) # CRITICAL, MAJOR, MINOR, COMPLIANT
    observed_value = Column(String, nullable=True)
    expected_format = Column(String, nullable=True)
    legal_reference = Column(String, nullable=False)
    remedial_action = Column(String, nullable=False)
    penalty_section = Column(String, nullable=False)

    scan = relationship("ScanRecord", back_populates="rule_checks")

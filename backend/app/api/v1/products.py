from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.core.database import get_db
from app.models.scan import ScanRecord, ExtractedFieldRecord, RuleCheckRecord
from app.models.notice import NoticeRecord

router = APIRouter(prefix="/products", tags=["Product Scan Repository"])

def format_scan_record(rec: ScanRecord) -> dict:
    extracted_fields = []
    for f in rec.extracted_fields:
        extracted_fields.append({
            "id": f.id,
            "category": f.category,
            "fieldName": f.field_name,
            "rawValue": f.raw_value,
            "parsedValue": f.parsed_value,
            "confidence": f.confidence,
            "boundingBox": f.bounding_box,
            "estimatedFontHeightMm": f.estimated_font_height_mm,
            "isMissing": f.is_missing == "true"
        })

    rule_checks = []
    for r in rec.rule_checks:
        rule_checks.append({
            "ruleId": r.rule_id,
            "ruleNumber": r.rule_number,
            "title": r.title,
            "description": r.description,
            "category": r.category,
            "isMandatory": r.is_mandatory == "true",
            "status": r.status,
            "severity": r.severity,
            "observedValue": r.observed_value,
            "expectedFormat": r.expected_format,
            "legalReference": r.legal_reference,
            "remedialAction": r.remedial_action,
            "penaltySection": r.penalty_section
        })

    notice_details = None
    if rec.notice:
        notice_details = {
            "noticeNumber": rec.notice.notice_number,
            "issuedDate": rec.notice.issued_date,
            "hearingDate": rec.notice.hearing_date,
            "penaltyAmount": rec.notice.penalty_amount,
            "notes": rec.notice.notes or ""
        }

    return {
        "id": rec.id,
        "barcode": rec.barcode,
        "productName": rec.product_name,
        "brandName": rec.brand_name,
        "category": rec.category,
        "manufacturerName": rec.manufacturer_name,
        "countryOfOrigin": rec.country_of_origin,
        "imageUrl": rec.image_url,
        "scannedAt": rec.scanned_at.isoformat() if rec.scanned_at else "",
        "inspectorName": rec.inspector_name,
        "inspectorLocation": rec.inspector_location,
        "dimensions": {
            "pdpAreaCm2": rec.pdp_area_cm2,
            "estimatedPackageType": rec.package_type,
            "minRequiredFontHeightMm": rec.min_required_font_mm,
            "detectedMinFontHeightMm": rec.detected_min_font_mm
        },
        "extractedFields": extracted_fields,
        "ruleChecks": rule_checks,
        "overallScore": rec.overall_score,
        "overallStatus": rec.overall_status,
        "violationsCount": {
            "critical": rec.critical_violations,
            "major": rec.major_violations,
            "minor": rec.minor_violations
        },
        "enforcementStatus": rec.enforcement_status,
        "noticeDetails": notice_details
    }

@router.get("", response_model=dict)
def get_products(
    query: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(ScanRecord)

    if status and status != "ALL":
        q = q.filter(ScanRecord.overall_status == status)

    if category and category != "ALL":
        q = q.filter(ScanRecord.category == category)

    records = q.order_by(ScanRecord.scanned_at.desc()).all()

    formatted = [format_scan_record(r) for r in records]

    if query:
        q_lower = query.lower()
        formatted = [
            p for p in formatted 
            if q_lower in p["productName"].lower() 
            or q_lower in p["brandName"].lower()
            or q_lower in p["manufacturerName"].lower()
            or q_lower in p["id"].lower()
        ]

    return {
        "count": len(formatted),
        "products": formatted
    }

@router.get("/{id}", response_model=dict)
def get_product_by_id(id: str, db: Session = Depends(get_db)):
    rec = db.query(ScanRecord).filter(ScanRecord.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Inspection record not found")
    return format_scan_record(rec)

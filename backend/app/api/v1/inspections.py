import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.scan import ScanRecord, ExtractedFieldRecord, RuleCheckRecord
from app.models.notice import NoticeRecord

logger = logging.getLogger("disha.inspections")

router = APIRouter(tags=["Inspections Repository"])


def format_inspection_record(rec: ScanRecord) -> Dict[str, Any]:
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

    inspection_id = rec.inspection_id or rec.id

    return {
        "id": rec.id,
        "inspection_id": inspection_id,
        "inspectionId": inspection_id,
        "scan_id": rec.id,
        "scanId": rec.id,
        "barcode": rec.barcode,
        "productName": rec.product_name,
        "brandName": rec.brand_name,
        "category": rec.category,
        "manufacturerName": rec.manufacturer_name,
        "countryOfOrigin": rec.country_of_origin,
        "imageUrl": rec.image_url,
        "sourceImageUrl": rec.source_image_url or rec.image_url,
        "originalFilename": rec.original_filename,
        "scannedAt": rec.scanned_at.isoformat() if rec.scanned_at else "",
        "timestamp": rec.scanned_at.isoformat() if rec.scanned_at else "",
        "inspectorName": rec.inspector_name,
        "inspectorId": rec.inspector_id or "officer-01",
        "inspectorLocation": rec.inspector_location,
        "dimensions": {
            "pdpAreaCm2": rec.pdp_area_cm2,
            "estimatedPackageType": rec.package_type,
            "minRequiredFontHeightMm": rec.min_required_font_mm,
            "detectedMinFontHeightMm": rec.detected_min_font_mm
        },
        "extractedFields": [] if rec.overall_status == "UNABLE_TO_ASSESS" else extracted_fields,
        "ruleChecks": [] if rec.overall_status == "UNABLE_TO_ASSESS" else rule_checks,
        "overallScore": None if (rec.overall_status == "UNABLE_TO_ASSESS" or rec.overall_score is None or rec.overall_score < 0) else rec.overall_score,
        "overallStatus": rec.overall_status,
        "score": None if (rec.overall_status == "UNABLE_TO_ASSESS" or rec.overall_score is None or rec.overall_score < 0) else rec.overall_score,
        "status": rec.overall_status,


        "violationsCount": {
            "critical": rec.critical_violations,
            "major": rec.major_violations,
            "minor": rec.minor_violations
        },
        "passedCount": rec.passed_count,
        "failedCount": rec.failed_count,
        "passed_count": rec.passed_count,
        "failed_count": rec.failed_count,
        "remarks": rec.remarks,
        "recommendation": rec.recommendation,
        "qualityMetrics": rec.quality_metrics,
        "normalizedFields": rec.normalized_fields,
        "ocrText": rec.ocr_text,
        "enforcementStatus": rec.enforcement_status,
        "noticeDetails": notice_details,
        "isProductLabel": rec.overall_status != "UNABLE_TO_ASSESS"
    }


@router.get("", response_model=dict)
@router.get("/", response_model=dict)
def get_inspections(
    query: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    GET /inspections
    Loads actual inspection records persisted in PostgreSQL/Database.
    """
    q = db.query(ScanRecord)

    if status and status != "ALL":
        q = q.filter(ScanRecord.overall_status == status)

    if category and category != "ALL":
        q = q.filter(ScanRecord.category == category)

    records = q.order_by(ScanRecord.scanned_at.desc()).all()
    formatted = [format_inspection_record(r) for r in records]

    if query:
        q_lower = query.lower()
        formatted = [
            p for p in formatted
            if q_lower in (p.get("productName") or "").lower()
            or q_lower in (p.get("brandName") or "").lower()
            or q_lower in (p.get("manufacturerName") or "").lower()
            or q_lower in (p.get("id") or "").lower()
            or q_lower in (p.get("inspectionId") or "").lower()
        ]

    logger.info(f"Loaded {len(formatted)} inspections from database")
    return {
        "count": len(formatted),
        "inspections": formatted,
        "products": formatted
    }


@router.get("/{inspection_id}", response_model=dict)
def get_inspection_by_id(inspection_id: str, db: Session = Depends(get_db)):
    """
    GET /inspections/{id}
    Retrieves the persistent inspection record from PostgreSQL/Database by ID.
    """
    rec = db.query(ScanRecord).filter(
        (ScanRecord.id == inspection_id) | (ScanRecord.inspection_id == inspection_id)
    ).first()

    if not rec:
        logger.warning(f"Inspection ID '{inspection_id}' not found in database")
        raise HTTPException(status_code=404, detail="Inspection record not found in database")

    return format_inspection_record(rec)

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import random
import uuid

from app.core.database import get_db
from app.schemas.scan import ScanRequestSchema
from app.services.image_processor import ImagePreprocessor
from app.services.ocr_engine import ocr_engine
from app.services.field_extractor import FieldExtractor
from app.services.compliance_engine import ComplianceEngine, get_min_required_font_height_mm
from app.services.storage_service import storage_service
from app.models.scan import ScanRecord, ExtractedFieldRecord, RuleCheckRecord

router = APIRouter(prefix="/scan", tags=["Label Scan & Preprocessing Pipeline"])

@router.post("", response_model=dict, status_code=201)
def scan_packaging_label(payload: ScanRequestSchema, db: Session = Depends(get_db)):
    """
    Core Pipeline (Base64 / Image URL):
    1. OpenCV image decoding & preprocessing (grayscale, CLAHE, deskew, noise reduction)
    2. OCR text extraction (PaddleOCR / PyTesseract / Fallback)
    3. Structured legal field extraction (MRP, Net Qty, Mfg Date, Expiry, Mfr Details, Consumer Care, Origin)
    4. Deterministic Rule Engine evaluation against Legal Metrology Rules, 2011 & FSSAI
    5. Save scan history record to Database
    """
    if not payload.imageUrl:
        raise HTTPException(status_code=400, detail="imageUrl is required")

    file_name = payload.fileName or "Scanned_Packaging_Label.jpg"
    inspector = payload.inspectorName or "Inspector Officer"
    location = payload.inspectorLocation or "Zone 4 Field Inspection Unit"
    is_imported = bool(payload.isImported)
    pdp_area = float(payload.pdpAreaCm2 or 180.0)

    # 1. OpenCV Preprocessing
    try:
        raw_img = ImagePreprocessor.decode_bytes_or_base64_or_path(payload.imageUrl)
        processed_binary, metadata, stages_b64 = ImagePreprocessor.preprocess_image_with_stages(raw_img)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image preprocessing failed: {str(e)}")

    # 2. OCR Text & Bounding Box Extraction
    ocr_items = ocr_engine.extract_text_and_boxes(processed_binary, file_name=file_name)

    # 3. Structured Field Extraction
    extracted_fields = FieldExtractor.extract_structured_fields(
        ocr_items, 
        file_name=file_name, 
        is_imported=is_imported
    )

    # 4. Compliance Rule Evaluation
    rule_checks, summary = ComplianceEngine.evaluate_compliance(
        extracted_fields,
        pdp_area_cm2=pdp_area,
        is_imported=is_imported
    )

    min_required_font = get_min_required_font_height_mm(pdp_area)
    net_field = next((f for f in extracted_fields if f["category"] == "NET_QUANTITY"), None)
    detected_font = net_field.get("estimatedFontHeightMm", 2.0) if net_field else 2.0

    scan_id = f"LM-2026-{uuid.uuid4().hex[:6].upper()}"
    product_name_val = file_name.replace(".jpg", "").replace(".png", "").replace("_", " ").title()

    # 5. Database Persistence
    scan_record = ScanRecord(
        id=scan_id,
        barcode=f"890{random.randint(1000000000, 9999999999)}",
        product_name=product_name_val,
        brand_name="Scanned Commodity Brand",
        category="General Commodities",
        manufacturer_name="Apex Consumer Products Ltd",
        country_of_origin="Germany" if is_imported else "India",
        image_url=payload.imageUrl,
        scanned_at=datetime.now(timezone.utc),
        inspector_name=inspector,
        inspector_location=location,
        pdp_area_cm2=pdp_area,
        package_type="RECTANGULAR",
        min_required_font_mm=min_required_font,
        detected_min_font_mm=detected_font,
        overall_score=summary["overallScore"],
        overall_status=summary["overallStatus"],
        enforcement_status="UNDER_INSPECTION" if summary["overallStatus"] == "NON_COMPLIANT" else "CLOSED_COMPLIANT",
        critical_violations=summary["violationsCount"]["critical"],
        major_violations=summary["violationsCount"]["major"],
        minor_violations=summary["violationsCount"]["minor"]
    )
    db.add(scan_record)

    for field in extracted_fields:
        field_rec = ExtractedFieldRecord(
            scan_id=scan_id,
            category=field["category"],
            field_name=field["fieldName"],
            raw_value=str(field["rawValue"]),
            parsed_value=str(field["parsedValue"]) if field["parsedValue"] is not None else None,
            confidence=field["confidence"],
            bounding_box=field.get("boundingBox"),
            estimated_font_height_mm=field.get("estimatedFontHeightMm"),
            is_missing="true" if field.get("isMissing") else "false"
        )
        db.add(field_rec)

    for check in rule_checks:
        check_rec = RuleCheckRecord(
            scan_id=scan_id,
            rule_id=check["ruleId"],
            rule_number=check["ruleNumber"],
            title=check["title"],
            description=check["description"],
            category=check["category"],
            is_mandatory="true" if check.get("isMandatory") else "false",
            status=check["status"],
            severity=check["severity"],
            observed_value=check.get("observedValue"),
            expected_format=check.get("expectedFormat"),
            legal_reference=check["legalReference"],
            remedial_action=check["remedialAction"],
            penalty_section=check["penaltySection"]
        )
        db.add(check_rec)

    db.commit()

    response_product = {
        "id": scan_id,
        "barcode": scan_record.barcode,
        "productName": scan_record.product_name,
        "brandName": scan_record.brand_name,
        "category": scan_record.category,
        "manufacturerName": scan_record.manufacturer_name,
        "countryOfOrigin": scan_record.country_of_origin,
        "imageUrl": scan_record.image_url,
        "scannedAt": scan_record.scanned_at.isoformat(),
        "inspectorName": scan_record.inspector_name,
        "inspectorLocation": scan_record.inspector_location,
        "dimensions": {
            "pdpAreaCm2": pdp_area,
            "estimatedPackageType": "RECTANGULAR",
            "minRequiredFontHeightMm": min_required_font,
            "detectedMinFontHeightMm": detected_font
        },
        "extractedFields": extracted_fields,
        "ruleChecks": rule_checks,
        "overallScore": summary["overallScore"],
        "overallStatus": summary["overallStatus"],
        "violationsCount": summary["violationsCount"],
        "enforcementStatus": scan_record.enforcement_status
    }

    return {
        "message": "Packaging label successfully scanned and evaluated against Legal Metrology Rules, 2011.",
        "opencvMetadata": metadata,
        "preprocessingStages": stages_b64,
        "product": response_product
    }

@router.post("/upload", response_model=dict, status_code=201)
async def upload_and_process_label_file(
    file: UploadFile = File(...),
    inspectorName: str = Form("Inspector Officer"),
    inspectorLocation: str = Form("Zone 4 Field Inspection Unit"),
    isImported: bool = Form(False),
    pdpAreaCm2: float = Form(180.0),
    db: Session = Depends(get_db)
):
    """
    Multipart File Upload & OpenCV Preprocessing Pipeline Endpoint:
    1. Receives raw image file bytes (JPG/PNG/WEBP)
    2. Executes OpenCV pipeline (grayscale, CLAHE, denoising, binarization, deskewing)
    3. Saves raw image to Storage Service (S3 / Local file)
    4. Runs PaddleOCR / PyTesseract text extraction
    5. Evaluates Legal Metrology compliance rules and persists scan history to Database
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    file_name = file.filename or "uploaded_packaging_label.jpg"

    # 1. OpenCV Preprocessing & Intermediate Stage Visualizations
    try:
        raw_img = ImagePreprocessor.decode_bytes_or_base64_or_path(file_bytes)
        processed_binary, metadata, stages_b64 = ImagePreprocessor.preprocess_image_with_stages(raw_img)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OpenCV image processing error: {str(e)}")

    # 2. Save Image File to Storage Service
    saved_image_url = storage_service.save_file(file_bytes, filename=file_name, folder="uploads")

    # 3. OCR Text & Bounding Box Extraction
    ocr_items = ocr_engine.extract_text_and_boxes(processed_binary, file_name=file_name)

    # 4. Structured Field Extraction
    extracted_fields = FieldExtractor.extract_structured_fields(
        ocr_items, 
        file_name=file_name, 
        is_imported=isImported
    )

    # 5. Rule Evaluation
    rule_checks, summary = ComplianceEngine.evaluate_compliance(
        extracted_fields,
        pdp_area_cm2=pdpAreaCm2,
        is_imported=isImported
    )

    min_required_font = get_min_required_font_height_mm(pdpAreaCm2)
    net_field = next((f for f in extracted_fields if f["category"] == "NET_QUANTITY"), None)
    detected_font = net_field.get("estimatedFontHeightMm", 2.0) if net_field else 2.0

    scan_id = f"LM-2026-{uuid.uuid4().hex[:6].upper()}"
    product_name_val = file_name.replace(".jpg", "").replace(".png", "").replace("_", " ").title()

    # Save to Database
    scan_record = ScanRecord(
        id=scan_id,
        barcode=f"890{random.randint(1000000000, 9999999999)}",
        product_name=product_name_val,
        brand_name="Uploaded Commodity Brand",
        category="General Commodities",
        manufacturer_name="Apex Consumer Products Ltd",
        country_of_origin="Germany" if isImported else "India",
        image_url=saved_image_url,
        scanned_at=datetime.now(timezone.utc),
        inspector_name=inspectorName,
        inspector_location=inspectorLocation,
        pdp_area_cm2=pdpAreaCm2,
        package_type="RECTANGULAR",
        min_required_font_mm=min_required_font,
        detected_min_font_mm=detected_font,
        overall_score=summary["overallScore"],
        overall_status=summary["overallStatus"],
        enforcement_status="UNDER_INSPECTION" if summary["overallStatus"] == "NON_COMPLIANT" else "CLOSED_COMPLIANT",
        critical_violations=summary["violationsCount"]["critical"],
        major_violations=summary["violationsCount"]["major"],
        minor_violations=summary["violationsCount"]["minor"]
    )
    db.add(scan_record)

    for field in extracted_fields:
        field_rec = ExtractedFieldRecord(
            scan_id=scan_id,
            category=field["category"],
            field_name=field["fieldName"],
            raw_value=str(field["rawValue"]),
            parsed_value=str(field["parsedValue"]) if field["parsedValue"] is not None else None,
            confidence=field["confidence"],
            bounding_box=field.get("boundingBox"),
            estimated_font_height_mm=field.get("estimatedFontHeightMm"),
            is_missing="true" if field.get("isMissing") else "false"
        )
        db.add(field_rec)

    for check in rule_checks:
        check_rec = RuleCheckRecord(
            scan_id=scan_id,
            rule_id=check["ruleId"],
            rule_number=check["ruleNumber"],
            title=check["title"],
            description=check["description"],
            category=check["category"],
            is_mandatory="true" if check.get("isMandatory") else "false",
            status=check["status"],
            severity=check["severity"],
            observed_value=check.get("observedValue"),
            expected_format=check.get("expectedFormat"),
            legal_reference=check["legalReference"],
            remedial_action=check["remedialAction"],
            penalty_section=check["penaltySection"]
        )
        db.add(check_rec)

    db.commit()

    response_product = {
        "id": scan_id,
        "barcode": scan_record.barcode,
        "productName": scan_record.product_name,
        "brandName": scan_record.brand_name,
        "category": scan_record.category,
        "manufacturerName": scan_record.manufacturer_name,
        "countryOfOrigin": scan_record.country_of_origin,
        "imageUrl": saved_image_url,
        "scannedAt": scan_record.scanned_at.isoformat(),
        "inspectorName": scan_record.inspector_name,
        "inspectorLocation": scan_record.inspector_location,
        "dimensions": {
            "pdpAreaCm2": pdpAreaCm2,
            "estimatedPackageType": "RECTANGULAR",
            "minRequiredFontHeightMm": min_required_font,
            "detectedMinFontHeightMm": detected_font
        },
        "extractedFields": extracted_fields,
        "ruleChecks": rule_checks,
        "overallScore": summary["overallScore"],
        "overallStatus": summary["overallStatus"],
        "violationsCount": summary["violationsCount"],
        "enforcementStatus": scan_record.enforcement_status
    }

    return {
        "message": "File uploaded and processed via OpenCV pipeline.",
        "opencvMetadata": metadata,
        "preprocessingStages": stages_b64,
        "product": response_product
    }

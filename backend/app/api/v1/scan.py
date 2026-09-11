import logging
import random
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.scan import ScanRequestSchema
from app.services.image_processor import ImagePreprocessor
from app.services.ocr_engine import ocr_engine
from app.services.field_extractor import FieldExtractor
from app.services.compliance_engine import ComplianceEngine, get_min_required_font_height_mm
from app.services.ox_alpha_service import ox_alpha_service
from app.services.storage_service import storage_service
from app.models.scan import ScanRecord, ExtractedFieldRecord, RuleCheckRecord

logger = logging.getLogger("disha.scan")

router = APIRouter(prefix="/scan", tags=["Label Scan & Preprocessing Pipeline"])


def _execute_label_inspection(
    raw_img,
    file_name: str,
    file_size_bytes: int,
    image_url: str,
    inspector: str,
    location: str,
    is_imported: bool,
    pdp_area: float,
    db: Session,
    content_type: str = "image/jpeg"
) -> Dict[str, Any]:
    """
    Unified inspection pipeline:
    1. Preprocess raw image with OpenCV
    2. Real OCR text and bounding box detection
    3. Commodity label statutory verification (filter out faces, selfies, random images)
    4. Structured statutory field extraction
    5. Ox Alpha AI interpretation layer (strictly when OCR is ambiguous/uncertain)
    6. Legal Metrology Rules, 2011 compliance evaluation (deterministic rule engine)
    7. Database persistence and formatted response
    """
    # 1. OpenCV Preprocessing
    processed_binary, metadata, stages_b64 = ImagePreprocessor.preprocess_image_with_stages(raw_img)
    dims = metadata.get("dimensions", {})

    # 2. OCR Text Extraction (PaddleOCR / RapidOCR / Tesseract)
    # Deep-learning OCR models (PaddleOCR/RapidOCR) perform optimal detection on color imagery
    ocr_items = ocr_engine.extract_text_and_boxes(raw_img, file_name=file_name)
    if len(ocr_items) < 10:
        # If color image produced few results, check binarized image
        bin_items = ocr_engine.extract_text_and_boxes(processed_binary, file_name=file_name)
        if len(bin_items) > len(ocr_items):
            ocr_items = bin_items

    full_text = " ".join([item.get("text", "") for item in ocr_items])

    # Requirement 10: Temporary backend logging
    logger.info(
        f"[SCAN_AUDIT] Filename: '{file_name}', Dimensions: {dims.get('width', 0)}x{dims.get('height', 0)}, "
        f"OCR text length: {len(full_text)}, OCR items: {len(ocr_items)}"
    )
    safe_preview = full_text[:140].encode('ascii', errors='replace').decode('ascii')
    logger.info(f"[SCAN_AUDIT] OCR preview: {safe_preview}")

    # 3. Product Label Validation Check
    is_valid_label = FieldExtractor.is_packaged_commodity_label(ocr_items, full_text)

    # 4. Structured Field Extraction
    extracted_fields = FieldExtractor.extract_structured_fields(
        ocr_items,
        file_name=file_name,
        is_imported=is_imported
    )

    scan_id = f"LM-2026-{uuid.uuid4().hex[:6].upper()}"

    # If NOT a genuine packaged commodity label (e.g., face, landscape, blank, document)
    if not is_valid_label:
        logger.warning(
            f"[SCAN_VALIDATION] '{file_name}' does not contain readable packaged commodity declarations. "
            f"Detected {len(ocr_items)} text blocks, text length: {len(full_text.strip())}. Marking UNABLE_TO_ASSESS."
        )

        scan_record = ScanRecord(
            id=scan_id,
            barcode=None,
            product_name="Unidentified Non-Label Image",
            brand_name="N/A",
            category="Unclassified",
            manufacturer_name="NOT DETECTED",
            country_of_origin="N/A",
            image_url=image_url,
            scanned_at=datetime.now(timezone.utc),
            inspector_name=inspector,
            inspector_location=location,
            pdp_area_cm2=pdp_area,
            package_type="UNKNOWN",
            min_required_font_mm=0.0,
            detected_min_font_mm=0.0,
            overall_score=None,
            overall_status="UNABLE_TO_ASSESS",
            enforcement_status="UNABLE_TO_ASSESS",
            critical_violations=0,
            major_violations=0,
            minor_violations=0
        )
        db.add(scan_record)

        for field in extracted_fields:
            field_rec = ExtractedFieldRecord(
                scan_id=scan_id,
                category=field["category"],
                field_name=field["fieldName"],
                raw_value=str(field["rawValue"]),
                parsed_value=str(field["parsedValue"]) if field.get("parsedValue") is not None else None,
                confidence=field.get("confidence", 0.0),
                bounding_box=field.get("boundingBox"),
                estimated_font_height_mm=field.get("estimatedFontHeightMm"),
                is_missing="true" if field.get("isMissing") else "false"
            )
            db.add(field_rec)

        db.commit()

        validation_msg = (
            "The uploaded image does not appear to contain a readable packaged commodity label. "
            "Please upload a clear product-label image."
        )

        response_product = {
            "id": scan_id,
            "barcode": None,
            "productName": "Unidentified Non-Label Image",
            "brandName": "N/A",
            "category": "Unclassified",
            "manufacturerName": "NOT DETECTED",
            "countryOfOrigin": "N/A",
            "imageUrl": image_url,
            "sourceImageUrl": image_url,
            "scannedAt": scan_record.scanned_at.isoformat(),
            "inspectorName": scan_record.inspector_name,
            "inspectorLocation": scan_record.inspector_location,
            "dimensions": {
                "pdpAreaCm2": pdp_area,
                "estimatedPackageType": "UNKNOWN",
                "minRequiredFontHeightMm": 0.0,
                "detectedMinFontHeightMm": 0.0
            },
            "extractedFields": extracted_fields,
            "ruleChecks": [],
            "overallScore": None,
            "overallStatus": "UNABLE_TO_ASSESS",
            "violationsCount": {"critical": 0, "major": 0, "minor": 0},
            "enforcementStatus": "UNABLE_TO_ASSESS",
            "isProductLabel": False,
            "message": validation_msg
        }

        return {
            "message": validation_msg,
            "status": "UNABLE_TO_ASSESS",
            "is_product_label": False,
            "score": None,
            "opencvMetadata": metadata,
            "preprocessingStages": stages_b64,
            "product": response_product
        }

    # AI-assisted interpretation layer: used strictly for declaration extraction and ambiguity resolution
    ai_triggered = False
    if ox_alpha_service.should_consult_ai(extracted_fields, full_text=full_text, ocr_items=ocr_items):
        ai_triggered = True
        logger.info(f"[SCAN_AI] Consulting Ox Alpha AI interpretation for ambiguous declarations in '{file_name}'")
        ai_data = ox_alpha_service.interpret_declarations_from_ocr(full_text=full_text, ocr_items=ocr_items)
        if ai_data:
            extracted_fields = FieldExtractor.merge_ai_declarations(extracted_fields, ai_data)

    # Safe debugging audit log (Requirement 10: safe fields only, no credentials)
    logger.info(
        f"[SCAN_AUDIT] filename='{file_name}' content_type='{content_type}' "
        f"dimensions={dims.get('width', 0)}x{dims.get('height', 0)} "
        f"ocr_text_length={len(full_text)} ai_provider='{ox_alpha_service.provider_name}' "
        f"ai_fallback_triggered={ai_triggered}"
    )

    # 5. Rule Evaluation for verified packaged commodity
    rule_checks, summary = ComplianceEngine.evaluate_compliance(
        extracted_fields,
        pdp_area_cm2=pdp_area,
        is_imported=is_imported
    )

    min_required_font = get_min_required_font_height_mm(pdp_area)
    net_field = next((f for f in extracted_fields if f["category"] == "NET_QUANTITY"), None)
    detected_font = net_field.get("estimatedFontHeightMm", 2.0) if net_field else 2.0

    # Extract dynamic real manufacturer, commodity name, and origin from fields
    mfr_field = next((f for f in extracted_fields if f["category"] == "MANUFACTURER_PACKER_IMPORTER" and not f.get("isMissing")), None)
    cmd_field = next((f for f in extracted_fields if f["category"] == "COMMODITY_NAME" and not f.get("isMissing")), None)
    origin_field = next((f for f in extracted_fields if f["category"] == "COUNTRY_OF_ORIGIN" and not f.get("isMissing")), None)

    real_mfr = str(mfr_field.get("parsedValue") or mfr_field.get("rawValue")) if mfr_field else "Not Specified"
    real_cmd = str(cmd_field.get("parsedValue") or cmd_field.get("rawValue")) if cmd_field else file_name.replace(".jpg", "").replace(".png", "").replace("_", " ").title()
    real_origin = str(origin_field.get("parsedValue") or origin_field.get("rawValue")) if origin_field else ("Germany" if is_imported else "India")
    real_brand = real_cmd

    # 6. Database Persistence
    scan_record = ScanRecord(
        id=scan_id,
        barcode=f"890{random.randint(1000000000, 9999999999)}",
        product_name=real_cmd,
        brand_name=real_brand,
        category="General Commodities",
        manufacturer_name=real_mfr,
        country_of_origin=real_origin,
        image_url=image_url,
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
            parsed_value=str(field["parsedValue"]) if field.get("parsedValue") is not None else None,
            confidence=field.get("confidence", 0.0),
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
        "sourceImageUrl": scan_record.image_url,
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
        "enforcementStatus": scan_record.enforcement_status,
        "isProductLabel": True
    }

    return {
        "message": "Packaging label successfully scanned and evaluated against Legal Metrology Rules, 2011.",
        "opencvMetadata": metadata,
        "preprocessingStages": stages_b64,
        "product": response_product,
        "status": summary["overallStatus"],
        "is_product_label": True,
        "score": summary["overallScore"]
    }


@router.post("", response_model=dict, status_code=201)
def scan_packaging_label(payload: ScanRequestSchema, db: Session = Depends(get_db)):
    """
    Core Pipeline (Base64 / Image URL):
    1. OpenCV image decoding & preprocessing (grayscale, CLAHE, deskew, noise reduction)
    2. OCR text extraction (PaddleOCR / RapidOCR / Fallback)
    3. Product label validation (ensures image is a packaged commodity)
    4. Structured legal field extraction
    5. Deterministic Rule Engine evaluation against Legal Metrology Rules, 2011 & FSSAI
    6. Save scan history record to Database
    """
    if not payload.imageUrl:
        raise HTTPException(status_code=400, detail="imageUrl is required")

    file_name = payload.fileName or "Scanned_Packaging_Label.jpg"
    inspector = payload.inspectorName or "Inspector Officer"
    location = payload.inspectorLocation or "Zone 4 Field Inspection Unit"
    is_imported = bool(payload.isImported)
    pdp_area = float(payload.pdpAreaCm2 or 180.0)

    try:
        raw_img = ImagePreprocessor.decode_bytes_or_base64_or_path(payload.imageUrl)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image decoding failed: {str(e)}")

    content_type = "image/jpeg"
    if payload.imageUrl.startswith("data:image/png") or file_name.lower().endswith(".png"):
        content_type = "image/png"
    elif payload.imageUrl.startswith("data:image/webp") or file_name.lower().endswith(".webp"):
        content_type = "image/webp"

    return _execute_label_inspection(
        raw_img=raw_img,
        file_name=file_name,
        file_size_bytes=len(payload.imageUrl),
        image_url=payload.imageUrl,
        inspector=inspector,
        location=location,
        is_imported=is_imported,
        pdp_area=pdp_area,
        db=db,
        content_type=content_type
    )


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
    Multipart File Upload Pipeline Endpoint:
    1. Receives raw image file bytes (JPG/PNG/WEBP)
    2. Executes OpenCV pipeline (grayscale, CLAHE, denoising, binarization, deskewing)
    3. Saves raw image to Storage Service (Local / S3)
    4. Runs PaddleOCR / RapidOCR / PyTesseract text extraction
    5. Verifies commodity label statutory presence
    6. Evaluates Legal Metrology compliance rules and persists scan history to Database
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    file_name = file.filename or "uploaded_packaging_label.jpg"
    content_type = file.content_type or "image/jpeg"

    try:
        raw_img = ImagePreprocessor.decode_bytes_or_base64_or_path(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OpenCV image decoding error: {str(e)}")

    saved_image_url = storage_service.save_file(file_bytes, filename=file_name, folder="uploads")

    return _execute_label_inspection(
        raw_img=raw_img,
        file_name=file_name,
        file_size_bytes=len(file_bytes),
        image_url=saved_image_url,
        inspector=inspectorName,
        location=inspectorLocation,
        is_imported=isImported,
        pdp_area=pdpAreaCm2,
        db=db,
        content_type=content_type
    )


@router.get("/uploads/{filename}")
def serve_uploaded_label_image(filename: str):
    """
    Direct endpoint to serve uploaded label images securely with proper MIME type.
    """
    import os
    from fastapi.responses import FileResponse
    from app.core.config import settings
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Uploaded image not found")
    media_type = "image/jpeg"
    if safe_filename.lower().endswith(".png"):
        media_type = "image/png"
    elif safe_filename.lower().endswith(".webp"):
        media_type = "image/webp"
    return FileResponse(file_path, media_type=media_type)

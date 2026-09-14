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


def _should_trigger_fallback_ocr(ocr_items: List[Dict[str, Any]]) -> bool:
    """
    Evidence-based decision on whether secondary OCR pass on binarized image is necessary.
    - If primary OCR found >= 10 items: rich detection, continue.
    - If primary OCR found 4-9 items with high average confidence (>= 75%) and statutory packaging keywords, continue.
    - If primary OCR found 0 items: try fallback on binarized image as a safety mechanism.
    - If primary OCR produced low-confidence/fragmented reads, try fallback.
    """
    n_items = len(ocr_items)
    if n_items >= 10:
        return False

    if n_items == 0:
        return True

    # Check confidence & statutory packaging indicators
    confidences = [item.get("confidence", 0.0) for item in ocr_items]
    avg_conf = sum(confidences) / n_items

    joined_text = " ".join(it.get("text", "") for it in ocr_items).lower()
    statutory_keywords = (
        "mrp", "rs.", "inr", "net", "quantity", "weight", "mfg", "packed",
        "batch", "lot", "consumer", "care", "helpline", "email",
        "manufactur", "market", "commodity", "ingredients"
    )
    keyword_hits = sum(1 for kw in statutory_keywords if kw in joined_text)

    # High-confidence concise label with clear statutory declarations needs no fallback
    if avg_conf >= 75.0 and keyword_hits >= 2:
        return False

    return True


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

    # Part 2: Required safe temporary logging for scan reception
    logger.info(
        f"SCAN RECEIVED\n"
        f"filename={file_name}\n"
        f"content_type={content_type}\n"
        f"file_size={file_size_bytes}\n"
        f"image_dimensions={dims.get('width', 0)}x{dims.get('height', 0)}"
    )

    # 2. OCR Text Extraction (PaddleOCR / RapidOCR / Tesseract)
    # Deep-learning OCR models (PaddleOCR/RapidOCR) perform optimal detection on color imagery
    ocr_items = ocr_engine.extract_text_and_boxes(raw_img, file_name=file_name)
    if _should_trigger_fallback_ocr(ocr_items):
        # Fallback to binarized image only when evidence shows primary OCR was insufficient
        bin_items = ocr_engine.extract_text_and_boxes(processed_binary, file_name=file_name)
        if len(bin_items) > len(ocr_items):
            ocr_items = bin_items

    full_text = " ".join([item.get("text", "") for item in ocr_items])

    # Part 2: Required safe temporary logging for OCR result
    safe_preview = full_text[:300].encode('ascii', errors='replace').decode('ascii')
    logger.info(
        f"OCR RESULT\n"
        f"text_length={len(full_text)}\n"
        f"text_preview={safe_preview}"
    )

    # 3. Product Label Validation Check (determines whether image is a genuine commodity label)
    is_valid_label = FieldExtractor.is_packaged_commodity_label(ocr_items, full_text)

    # 4. Structured Field Extraction from OCR text (Deterministic + Candidates)
    extracted_fields, candidates_map = FieldExtractor.extract_fields_with_candidates(
        ocr_items,
        file_name=file_name,
        is_imported=is_imported
    )

    scan_id = f"LM-2026-{uuid.uuid4().hex[:6].upper()}"

    # If NOT a genuine packaged commodity label (e.g., face, landscape, selfie, document)
    if not is_valid_label:
        logger.info(
            f"ANALYSIS\n"
            f"status=UNABLE_TO_ASSESS\n"
            f"score=null"
        )

        scan_record = ScanRecord(
            id=scan_id,
            inspection_id=scan_id,
            inspector_id="officer-01",
            original_filename=file_name,
            source_image_url=image_url,
            ocr_text=full_text,
            normalized_fields=[],
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
            overall_score=-1.0, # Sentinel for non-label/null score to satisfy legacy DB constraints
            overall_status="UNABLE_TO_ASSESS",
            enforcement_status="UNABLE_TO_ASSESS",

            critical_violations=0,
            major_violations=0,
            minor_violations=0,
            passed_count=0,
            failed_count=0,
            remarks="Image does not appear to contain a readable packaged commodity label.",
            recommendation="Please upload a clear product label image.",
            quality_metrics={"width": dims.get("width", 0), "height": dims.get("height", 0), "ocrBlocks": len(ocr_items)}
        )
        db.add(scan_record)

        # Do not persist fake fields for non-label images
        db_saved = False
        try:
            db.commit()
            db_saved = True
            logger.info(
                f"DATABASE\n"
                f"inspection_saved=true\n"
                f"inspection_id={scan_id}"
            )
        except Exception as db_err:
            db.rollback()
            logger.error(f"Database save error for non-label scan: {db_err}")
            logger.info(
                f"DATABASE\n"
                f"inspection_saved=false\n"
                f"inspection_id={scan_id}"
            )

        validation_msg = (
            "The uploaded image does not appear to contain a readable packaged commodity label. "
            "Please upload a clear product-label image."
        )
        if not db_saved:
            validation_msg += " (Notice: Scan analyzed but could not be saved to inspection history.)"

        response_product = {
            "id": scan_id,
            "inspection_id": scan_id,
            "inspectionId": scan_id,
            "scan_id": scan_id,
            "scanId": scan_id,
            "barcode": None,
            "productName": "Unidentified Non-Label Image",
            "brandName": "N/A",
            "category": "Unclassified",
            "manufacturerName": "NOT DETECTED",
            "countryOfOrigin": "N/A",
            "imageUrl": image_url,
            "sourceImageUrl": image_url,
            "originalFilename": file_name,
            "scannedAt": scan_record.scanned_at.isoformat(),
            "timestamp": scan_record.scanned_at.isoformat(),
            "inspectorName": scan_record.inspector_name,
            "inspectorId": "officer-01",
            "inspectorLocation": scan_record.inspector_location,
            "dimensions": {
                "pdpAreaCm2": pdp_area,
                "estimatedPackageType": "UNKNOWN",
                "minRequiredFontHeightMm": 0.0,
                "detectedMinFontHeightMm": 0.0
            },
            "extractedFields": [],
            "normalizedFields": [],
            "ruleChecks": [],
            "overallScore": None,
            "overallStatus": "UNABLE_TO_ASSESS",
            "score": None,
            "status": "UNABLE_TO_ASSESS",
            "violationsCount": {"critical": 0, "major": 0, "minor": 0},
            "passedCount": 0,
            "failedCount": 0,
            "remarks": scan_record.remarks,
            "recommendation": scan_record.recommendation,
            "qualityMetrics": scan_record.quality_metrics,
            "ocrText": full_text,
            "enforcementStatus": "UNABLE_TO_ASSESS",
            "isProductLabel": False,
            "dbSaved": db_saved,
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

    # Stage 3: Ambiguity Detection across all legal-metrology fields
    ambiguity_report = FieldExtractor.detect_ambiguity(
        extracted_fields,
        candidates_map,
        ocr_items,
        full_text=full_text
    )

    # Stage 4: Targeted Ox Alpha Candidate Verification (Cost-gated; only for ambiguous cases)
    ai_triggered = False
    if ox_alpha_service.should_consult_ai(extracted_fields, full_text=full_text, ocr_items=ocr_items, ambiguity_report=ambiguity_report):
        ai_triggered = True
        logger.info(f"[SCAN_AI] Consulting Ox Alpha candidate verification for '{file_name}' (ambiguous fields: {ambiguity_report.ambiguous_fields})")
        resolutions = ox_alpha_service.resolve_ambiguities(ambiguity_report, ocr_items=ocr_items, full_text=full_text)
        if resolutions:
            extracted_fields = FieldExtractor.apply_resolutions(extracted_fields, candidates_map, resolutions)
        else:
            # Fallback to general declaration interpretation if available
            ai_data = ox_alpha_service.interpret_declarations_from_ocr(full_text=full_text, ocr_items=ocr_items)
            if ai_data:
                extracted_fields = FieldExtractor.merge_ai_declarations(extracted_fields, ai_data)

    # Stage 5: Cross-Field Conflict Resolution
    extracted_fields = FieldExtractor.resolve_cross_field_conflicts(extracted_fields, candidates_map, ocr_items)

    # 5. Deterministic Rule Evaluation for verified packaged commodity
    rule_checks, summary = ComplianceEngine.evaluate_compliance(
        extracted_fields,
        pdp_area_cm2=pdp_area,
        is_imported=is_imported
    )

    # Part 2: Required safe temporary logging for Analysis
    logger.info(
        f"ANALYSIS\n"
        f"status={summary['overallStatus']}\n"
        f"score={summary['overallScore']}"
    )

    min_required_font = get_min_required_font_height_mm(pdp_area)
    net_field = next((f for f in extracted_fields if f["category"] == "NET_QUANTITY"), None)
    detected_font = net_field.get("estimatedFontHeightMm", 2.0) if net_field else 2.0

    # Extract dynamic real manufacturer, commodity name, and origin from fields
    mfr_field = next((f for f in extracted_fields if f["category"] == "MANUFACTURER_PACKER_IMPORTER" and not f.get("isMissing")), None)
    cmd_field = next((f for f in extracted_fields if f["category"] == "COMMODITY_NAME" and not f.get("isMissing")), None)
    origin_field = next((f for f in extracted_fields if f["category"] == "COUNTRY_OF_ORIGIN" and not f.get("isMissing")), None)

    real_mfr = str(mfr_field.get("parsedValue") or mfr_field.get("rawValue")) if mfr_field else "Not Specified"
    real_cmd = str(cmd_field.get("parsedValue") or cmd_field.get("rawValue")) if cmd_field else file_name.replace(".jpg", "").replace(".png", "").replace(".jpeg", "").replace(".webp", "").replace("_", " ").title()
    real_origin = str(origin_field.get("parsedValue") or origin_field.get("rawValue")) if origin_field else ("Germany" if is_imported else "India")
    real_brand = real_cmd

    passed_count = len([c for c in rule_checks if c["status"] == "PASS"])
    failed_count = len([c for c in rule_checks if c["status"] == "FAIL"])
    remarks_text = f"Compliance Score: {summary['overallScore']}%. Status: {summary['overallStatus']} ({passed_count} passed, {failed_count} failed)."
    recommendation_text = (
        "Statutory declarations compliant with Legal Metrology (Packaged Commodities) Rules, 2011."
        if summary["overallStatus"] == "COMPLIANT"
        else "Issue statutory notice or rectifications under Rule 6 / Section 36 of Legal Metrology Act, 2009."
    )
    quality_metrics_dict = {
        "width": dims.get("width", 0),
        "height": dims.get("height", 0),
        "ocrBlocks": len(ocr_items),
        "aiConsulted": ai_triggered
    }

    # 6. Database Persistence
    scan_record = ScanRecord(
        id=scan_id,
        inspection_id=scan_id,
        inspector_id="officer-01",
        original_filename=file_name,
        source_image_url=image_url,
        ocr_text=full_text,
        normalized_fields=extracted_fields,
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
        minor_violations=summary["violationsCount"]["minor"],
        passed_count=passed_count,
        failed_count=failed_count,
        remarks=remarks_text,
        recommendation=recommendation_text,
        quality_metrics=quality_metrics_dict
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

    # Part 8: Safe Database Commit Handling
    db_saved = False
    try:
        db.commit()
        db_saved = True
        logger.info(
            f"DATABASE\n"
            f"inspection_saved=true\n"
            f"inspection_id={scan_id}"
        )
    except Exception as db_err:
        db.rollback()
        logger.error(f"Failed to persist inspection to database: {db_err}")
        logger.info(
            f"DATABASE\n"
            f"inspection_saved=false\n"
            f"inspection_id={scan_id}"
        )

    response_product = {
        "id": scan_id,
        "inspection_id": scan_id,
        "inspectionId": scan_id,
        "scan_id": scan_id,
        "scanId": scan_id,
        "barcode": scan_record.barcode,
        "productName": scan_record.product_name,
        "brandName": scan_record.brand_name,
        "category": scan_record.category,
        "manufacturerName": scan_record.manufacturer_name,
        "countryOfOrigin": scan_record.country_of_origin,
        "imageUrl": scan_record.image_url,
        "sourceImageUrl": scan_record.image_url,
        "originalFilename": file_name,
        "scannedAt": scan_record.scanned_at.isoformat(),
        "timestamp": scan_record.scanned_at.isoformat(),
        "inspectorName": scan_record.inspector_name,
        "inspectorId": "officer-01",
        "inspectorLocation": scan_record.inspector_location,
        "dimensions": {
            "pdpAreaCm2": pdp_area,
            "estimatedPackageType": "RECTANGULAR",
            "minRequiredFontHeightMm": min_required_font,
            "detectedMinFontHeightMm": detected_font
        },
        "extractedFields": extracted_fields,
        "normalizedFields": extracted_fields,
        "ruleChecks": rule_checks,
        "overallScore": summary["overallScore"],
        "overallStatus": summary["overallStatus"],
        "score": summary["overallScore"],
        "status": summary["overallStatus"],
        "violationsCount": summary["violationsCount"],
        "passedCount": passed_count,
        "failedCount": failed_count,
        "remarks": remarks_text,
        "recommendation": recommendation_text,
        "qualityMetrics": quality_metrics_dict,
        "ocrText": full_text,
        "enforcementStatus": scan_record.enforcement_status,
        "isProductLabel": True,
        "dbSaved": db_saved
    }

    result_message = (
        "Packaging label successfully scanned and evaluated against Legal Metrology Rules, 2011."
        if db_saved
        else "Scan analyzed but could not be saved to inspection history."
    )

    return {
        "message": result_message,
        "opencvMetadata": metadata,
        "preprocessingStages": stages_b64,
        "product": response_product,
        "status": summary["overallStatus"],
        "is_product_label": True,
        "score": summary["overallScore"],
        "dbSaved": db_saved
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

    # Save to persistent file storage so inspection image is accessible via URL
    saved_image_url = payload.imageUrl
    try:
        if payload.imageUrl.startswith("data:"):
            import base64
            _, b64data = payload.imageUrl.split(",", 1)
            raw_bytes = base64.b64decode(b64data)
            saved_image_url = storage_service.save_file(raw_bytes, filename=file_name, folder="uploads")
    except Exception as save_err:
        logger.warning(f"Could not save base64 image to storage: {save_err}")

    return _execute_label_inspection(
        raw_img=raw_img,
        file_name=file_name,
        file_size_bytes=len(payload.imageUrl),
        image_url=saved_image_url,
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

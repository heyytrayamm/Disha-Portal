import pytest
from app.services.field_extractor import FieldExtractor, Candidate, AmbiguityReport
from app.services.ox_alpha_service import ox_alpha_service

def test_clean_label_deterministic_pass_no_ai():
    """
    Scenario 1: Clean label baseline.
    All fields distinct, no ambiguity, deterministic pass, Ox Alpha NOT called.
    """
    ocr_items = [
        {"text": "COMMODITY: PREMIUM ALMONDS", "confidence": 99.0, "bbox": {"x": 10.0, "y": 10.0, "width": 80.0, "height": 6.0}},
        {"text": "NET QUANTITY: 500 g", "confidence": 98.0, "bbox": {"x": 20.0, "y": 25.0, "width": 40.0, "height": 5.0}},
        {"text": "MRP Rs. 450.00 (INCL. OF ALL TAXES)", "confidence": 98.0, "bbox": {"x": 20.0, "y": 35.0, "width": 55.0, "height": 5.0}},
        {"text": "MFD DATE: 15/03/2026", "confidence": 97.0, "bbox": {"x": 20.0, "y": 45.0, "width": 35.0, "height": 4.5}},
        {"text": "BEST BEFORE: 12 months", "confidence": 96.0, "bbox": {"x": 60.0, "y": 45.0, "width": 30.0, "height": 4.5}},
        {"text": "MANUFACTURED BY: Nutri Agro Foods Pvt Ltd, Industrial Area, Pune - 411001", "confidence": 95.0, "bbox": {"x": 20.0, "y": 55.0, "width": 70.0, "height": 8.0}},
        {"text": "CONSUMER CARE: Toll Free 1800-222-333 email help@nutriagro.in", "confidence": 96.0, "bbox": {"x": 20.0, "y": 70.0, "width": 65.0, "height": 5.0}}
    ]
    full_text = " ".join(item["text"] for item in ocr_items)

    fields, candidates_map = FieldExtractor.extract_fields_with_candidates(ocr_items, file_name="almonds.jpg")
    ambiguity_report = FieldExtractor.detect_ambiguity(fields, candidates_map, ocr_items, full_text)

    # Assert clean scan has no ambiguity
    assert ambiguity_report.has_ambiguity is False, f"Expected no ambiguity, got: {ambiguity_report.ambiguous_fields}"

    # Assert Ox Alpha is NOT consulted for clean scan
    should_call = ox_alpha_service.should_consult_ai(fields, full_text=full_text, ocr_items=ocr_items, ambiguity_report=ambiguity_report)
    assert should_call is False, "Ox Alpha should NOT be called for clean unambiguous label"

    # Verify deterministic fields
    mrp = next(f for f in fields if f["category"] == "MAXIMUM_RETAIL_PRICE")
    assert mrp["parsedValue"] == 450.0
    assert mrp["isMissing"] is False
    assert mrp["boundingBox"]["x"] == 20.0

    net = next(f for f in fields if f["category"] == "NET_QUANTITY")
    assert net["parsedValue"] == "500 g"

    mfg = next(f for f in fields if f["category"] == "DATE_MFG_PACK_IMPORT")
    assert mfg["parsedValue"] == "15/03/2026"


def test_mrp_near_mfg_date_disambiguation():
    """
    Scenario 2: MRP printed adjacent to MFG date.
    e.g. MFD: 27/05/2026 MRP: 75.00
    Asserts 27/05/2026 is Mfg Date and 75.00 is MRP (date digits NOT confused for price).
    """
    ocr_items = [
        {"text": "MFD: 27/05/2026", "confidence": 98.0, "bbox": {"x": 15.0, "y": 40.0, "width": 30.0, "height": 4.5}},
        {"text": "MRP: 75.00 (INCL. OF ALL TAXES)", "confidence": 97.0, "bbox": {"x": 50.0, "y": 40.0, "width": 45.0, "height": 4.5}},
        {"text": "NET WT: 100 g", "confidence": 98.0, "bbox": {"x": 15.0, "y": 50.0, "width": 30.0, "height": 4.0}}
    ]

    fields = FieldExtractor.extract_structured_fields(ocr_items)

    mrp_field = next(f for f in fields if f["category"] == "MAXIMUM_RETAIL_PRICE")
    mfg_field = next(f for f in fields if f["category"] == "DATE_MFG_PACK_IMPORT")

    # Assert MRP is numeric 75.0 and NOT date
    assert mrp_field["parsedValue"] == 75.0
    assert "/" not in str(mrp_field["parsedValue"])
    assert mrp_field["boundingBox"]["x"] == 50.0
    assert mrp_field["boundingBox"]["y"] == 40.0

    # Assert Mfg Date is 27/05/2026
    assert mfg_field["parsedValue"] == "27/05/2026"
    assert mfg_field["boundingBox"]["x"] == 15.0
    assert mfg_field["boundingBox"]["y"] == 40.0


def test_mfg_date_near_expiry_date_disambiguation():
    """
    Scenario 3: Mfg Date near Expiry Date.
    e.g. PKD: 01/2026 USE BY: 12/2026
    Asserts PKD is Mfg Date and USE BY is Expiry Date without swapped assignment.
    """
    ocr_items = [
        {"text": "PKD: 01/2026", "confidence": 98.0, "bbox": {"x": 10.0, "y": 30.0, "width": 35.0, "height": 4.0}},
        {"text": "USE BY: 12/2026", "confidence": 97.0, "bbox": {"x": 50.0, "y": 30.0, "width": 40.0, "height": 4.0}},
        {"text": "MRP Rs. 50.00 (INCL. ALL TAXES)", "confidence": 96.0, "bbox": {"x": 10.0, "y": 40.0, "width": 45.0, "height": 4.0}}
    ]

    fields = FieldExtractor.extract_structured_fields(ocr_items)

    mfg = next(f for f in fields if f["category"] == "DATE_MFG_PACK_IMPORT")
    exp = next(f for f in fields if f["category"] == "BEST_BEFORE_EXPIRY")

    assert mfg["parsedValue"] == "01/2026"
    assert mfg["boundingBox"]["x"] == 10.0

    assert exp["parsedValue"] == "12/2026"
    assert exp["boundingBox"]["x"] == 50.0


def test_net_qty_near_serving_size_disambiguation():
    """
    Scenario 4: Net Quantity near nutritional serving size.
    e.g. Per serve 1 tea bag (1.4g) | Net Qty: 10 tea bags (14g)
    Asserts Net Qty selects total package quantity, not single serving or protein.
    """
    ocr_items = [
        {"text": "Per serve 1 tea bag (1.4g)", "confidence": 95.0, "bbox": {"x": 10.0, "y": 20.0, "width": 50.0, "height": 4.0}},
        {"text": "Net Qty: 10 tea bags (14g)", "confidence": 98.0, "bbox": {"x": 10.0, "y": 30.0, "width": 55.0, "height": 4.5}},
        {"text": "Protein 0g, Total Fat 0g", "confidence": 92.0, "bbox": {"x": 10.0, "y": 40.0, "width": 45.0, "height": 4.0}},
        {"text": "MRP Rs. 75.00 (incl of all taxes)", "confidence": 97.0, "bbox": {"x": 10.0, "y": 50.0, "width": 50.0, "height": 4.0}}
    ]

    fields = FieldExtractor.extract_structured_fields(ocr_items)

    net = next(f for f in fields if f["category"] == "NET_QUANTITY")
    assert "14g" in str(net["parsedValue"]) or "10 tea bags" in str(net["parsedValue"])
    assert "1.4g" not in str(net["parsedValue"])
    assert net["boundingBox"]["y"] == 30.0


def test_consumer_care_phone_near_fssai_disambiguation():
    """
    Scenario 5: Consumer care phone near FSSAI 14-digit number.
    e.g. Consumer Care: 1800-444-555 | FSSAI Lic No: 10014031001025
    Asserts 1800 is consumer care, 14-digit is FSSAI.
    """
    ocr_items = [
        {"text": "Consumer Care Helpline: 1800-444-555", "confidence": 97.0, "bbox": {"x": 15.0, "y": 60.0, "width": 60.0, "height": 4.5}},
        {"text": "FSSAI Lic. No. 10014031001025", "confidence": 98.0, "bbox": {"x": 15.0, "y": 70.0, "width": 55.0, "height": 4.5}},
        {"text": "MRP Rs. 90.00 (incl. of all taxes)", "confidence": 96.0, "bbox": {"x": 15.0, "y": 80.0, "width": 45.0, "height": 4.0}}
    ]

    fields = FieldExtractor.extract_structured_fields(ocr_items)

    care = next(f for f in fields if f["category"] == "CONSUMER_CARE")
    assert "1800-444-555" in str(care["parsedValue"]) or "1800" in str(care["parsedValue"])
    assert "10014031001025" not in str(care["parsedValue"])
    assert care["boundingBox"]["y"] == 60.0

    fssai = next((f for f in fields if f["category"] == "FSSAI_LICENSE_NUMBER"), None)
    if fssai and not fssai["isMissing"]:
        assert "10014031001025" in str(fssai["parsedValue"])
        assert fssai["boundingBox"]["y"] == 70.0


def test_address_near_pin_code_disambiguation():
    """
    Scenario 6: Address with PIN code near adjacent MRP.
    e.g. Manufactured by: ABC Foods Ltd, Pune - 411001 with adjacent MRP Rs 50.00
    Asserts Address contains 411001 and does NOT swallow MRP Rs 50.00.
    """
    ocr_items = [
        {"text": "Manufactured by: ABC Foods Ltd, Hadapsar, Pune - 411001", "confidence": 96.0, "bbox": {"x": 10.0, "y": 50.0, "width": 80.0, "height": 6.0}},
        {"text": "MRP Rs. 50.00 (incl of all taxes)", "confidence": 97.0, "bbox": {"x": 10.0, "y": 60.0, "width": 50.0, "height": 4.5}}
    ]

    fields = FieldExtractor.extract_structured_fields(ocr_items)

    mfr = next(f for f in fields if f["category"] == "MANUFACTURER_PACKER_IMPORTER")
    mrp = next(f for f in fields if f["category"] == "MAXIMUM_RETAIL_PRICE")

    assert "411001" in str(mfr["parsedValue"])
    assert "MRP" not in str(mfr["parsedValue"])
    assert mfr["boundingBox"]["y"] == 50.0

    assert mrp["parsedValue"] == 50.0
    assert mrp["boundingBox"]["y"] == 60.0


def test_batch_number_near_date_disambiguation():
    """
    Scenario 7: Batch/Lot number near Mfg date.
    e.g. B.No: RR27E19 MFD: 27/05/26
    Asserts batch number is RR27E19 and date is 27/05/26.
    """
    ocr_items = [
        {"text": "B.No: RR27E19", "confidence": 97.0, "bbox": {"x": 15.0, "y": 45.0, "width": 30.0, "height": 4.0}},
        {"text": "MFD: 27/05/26", "confidence": 98.0, "bbox": {"x": 50.0, "y": 45.0, "width": 30.0, "height": 4.0}},
        {"text": "MRP Rs 60.00 (incl. all taxes)", "confidence": 96.0, "bbox": {"x": 15.0, "y": 55.0, "width": 45.0, "height": 4.0}}
    ]

    fields = FieldExtractor.extract_structured_fields(ocr_items)

    mfg = next(f for f in fields if f["category"] == "DATE_MFG_PACK_IMPORT")
    assert mfg["parsedValue"] == "27/05/26"
    assert mfg["boundingBox"]["x"] == 50.0

    batch = next((f for f in fields if f["category"] == "BATCH_LOT_NUMBER"), None)
    if batch and not batch["isMissing"]:
        assert "RR27E19" in str(batch["parsedValue"])
        assert batch["boundingBox"]["x"] == 15.0


def test_ambiguous_label_triggers_ox_alpha():
    """
    Scenario 8: Ambiguous label triggering Ox Alpha verification.
    Multiple competing candidates with close confidence cause AmbiguityDetector to flag ambiguity.
    Ox Alpha resolve_ambiguities selects the correct candidate ID.
    """
    ocr_items = [
        {"text": "SPECIAL OFFER 45.00", "confidence": 92.0, "bbox": {"x": 10.0, "y": 30.0, "width": 35.0, "height": 4.0}},
        {"text": "MRP Rs. 65.00 (INCL. TAXES)", "confidence": 93.0, "bbox": {"x": 50.0, "y": 30.0, "width": 45.0, "height": 4.0}},
    ]
    full_text = "SPECIAL OFFER 45.00 MRP Rs. 65.00 (INCL. TAXES)"

    fields, candidates_map = FieldExtractor.extract_fields_with_candidates(ocr_items)
    ambiguity_report = FieldExtractor.detect_ambiguity(fields, candidates_map, ocr_items, full_text)

    # When multiple close candidates exist, ambiguity report captures them
    mrp_cands = candidates_map.get("MAXIMUM_RETAIL_PRICE", [])
    assert len(mrp_cands) >= 1

    # Simulate Ox Alpha resolution selecting cand_mrp_1 (65.00)
    simulated_resolution = {
        "resolutions": {
            "MAXIMUM_RETAIL_PRICE": {
                "selected_candidate_id": mrp_cands[0].id,
                "reason": "Explicitly anchored with MRP keyword"
            }
        },
        "uncertain_fields": []
    }

    resolved_fields = FieldExtractor.apply_resolutions(fields, candidates_map, simulated_resolution)
    mrp = next(f for f in resolved_fields if f["category"] == "MAXIMUM_RETAIL_PRICE")
    assert mrp["selectedCandidateId"] == mrp_cands[0].id
    assert mrp["disambiguationSource"] == "ox_alpha"
    assert mrp["boundingBox"]["x"] == mrp_cands[0].bbox["x"]


def test_ox_alpha_rejects_hallucinated_value():
    """
    Scenario 9: Ox Alpha hallucination prevention.
    Ox Alpha response returns a candidate ID or value not present in OCR candidates.
    System rejects the hallucination and does not invent any values.
    """
    ocr_items = [
        {"text": "NET WEIGHT: 250 g", "confidence": 95.0, "bbox": {"x": 10.0, "y": 30.0, "width": 40.0, "height": 5.0}}
    ]
    fields, candidates_map = FieldExtractor.extract_fields_with_candidates(ocr_items)

    # Simulate an AI returning a fabricated candidate ID "cand_hallucinated_999"
    hallucinated_resolution = {
        "resolutions": {
            "MAXIMUM_RETAIL_PRICE": {
                "selected_candidate_id": "cand_hallucinated_999",
                "reason": "I think the price is 199.00"
            }
        },
        "uncertain_fields": []
    }

    # Test via ox_alpha_service's own validation if ambiguity report supplied
    amb_report = AmbiguityReport(
        has_ambiguity=True,
        ambiguous_fields=["MAXIMUM_RETAIL_PRICE"],
        field_candidates={"MAXIMUM_RETAIL_PRICE": [c.to_dict() for c in candidates_map.get("MAXIMUM_RETAIL_PRICE", [])]},
        conflicts=[]
    )

    # Validate that applying resolutions ignores invalid candidate ID
    resolved_fields = FieldExtractor.apply_resolutions(fields, candidates_map, hallucinated_resolution)
    mrp = next(f for f in resolved_fields if f["category"] == "MAXIMUM_RETAIL_PRICE")

    # Value must NOT be 199.00 or adopted from hallucinated ID
    assert mrp.get("selectedCandidateId") != "cand_hallucinated_999"
    assert mrp.get("parsedValue") != 199.0
    assert mrp["isMissing"] is True or mrp.get("disambiguationSource") == "ox_alpha_invalid_id_ignored"


def test_ox_alpha_uncertain_marks_field_missing():
    """
    Scenario 10: Ox Alpha uncertain fallback.
    When Ox Alpha is uncertain, field is marked missing/uncertain with confidence 0, not guessed.
    """
    ocr_items = [
        {"text": "SOME FAINT NOISE ???", "confidence": 40.0, "bbox": {"x": 10.0, "y": 30.0, "width": 20.0, "height": 4.0}}
    ]
    fields, candidates_map = FieldExtractor.extract_fields_with_candidates(ocr_items)

    uncertain_resolution = {
        "resolutions": {
            "COMMODITY_NAME": {
                "selected_candidate_id": None,
                "reason": "No legible commodity name found in OCR text"
            }
        },
        "uncertain_fields": ["COMMODITY_NAME"]
    }

    resolved_fields = FieldExtractor.apply_resolutions(fields, candidates_map, uncertain_resolution)
    cmd = next(f for f in resolved_fields if f["category"] == "COMMODITY_NAME")

    assert cmd["isMissing"] is True
    assert cmd["confidence"] == 0.0
    assert cmd["parsedValue"] is None


def test_bounding_box_preservation_across_all_fields():
    """
    Scenario 11: Exact bounding box preservation.
    Verifies that all resolved fields strictly preserve the original OCR item bounding box
    with zero fabricated coordinates.
    """
    ocr_items = [
        {"text": "COMMODITY: GREEN TEA", "confidence": 98.0, "bbox": {"x": 12.5, "y": 14.2, "width": 45.3, "height": 5.1}},
        {"text": "NET QUANTITY: 100 g", "confidence": 97.0, "bbox": {"x": 18.2, "y": 32.1, "width": 38.4, "height": 4.8}},
        {"text": "MRP Rs. 120.00 (INCL. OF ALL TAXES)", "confidence": 96.0, "bbox": {"x": 18.2, "y": 42.0, "width": 52.0, "height": 4.6}},
        {"text": "MFD: 10/2025", "confidence": 95.0, "bbox": {"x": 18.2, "y": 51.5, "width": 28.3, "height": 4.2}},
        {"text": "USE BY: 10/2026", "confidence": 95.0, "bbox": {"x": 52.0, "y": 51.5, "width": 29.1, "height": 4.2}},
        {"text": "MFD BY: Tea Estate Ltd, Kolkata - 700001", "confidence": 94.0, "bbox": {"x": 18.2, "y": 62.0, "width": 68.5, "height": 6.3}},
        {"text": "CARE: 1800-111-222 care@tea.com", "confidence": 95.0, "bbox": {"x": 18.2, "y": 74.0, "width": 60.0, "height": 5.0}}
    ]

    fields = FieldExtractor.extract_structured_fields(ocr_items)

    # Collect all original bounding boxes as sets of tuples (x, y, w, h)
    original_bboxes = {
        (round(it["bbox"]["x"], 1), round(it["bbox"]["y"], 1), round(it["bbox"]["width"], 1), round(it["bbox"]["height"], 1))
        for it in ocr_items
    }

    for f in fields:
        if not f.get("isMissing") and f.get("category") != "UNIT_SALE_PRICE":
            bbox = f.get("boundingBox")
            assert bbox is not None, f"Field {f['category']} is missing bounding box"
            box_tuple = (round(bbox["x"], 1), round(bbox["y"], 1), round(bbox["width"], 1), round(bbox["height"], 1))
            assert box_tuple in original_bboxes, (
                f"Field {f['category']} has synthetic/unmatched bounding box {box_tuple}! "
                f"Must match one of: {original_bboxes}"
            )

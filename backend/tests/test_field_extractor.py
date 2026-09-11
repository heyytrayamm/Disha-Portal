import pytest
from app.services.field_extractor import FieldExtractor

def test_extract_structured_fields_complete():
    ocr_items = [
        {"text": "COMMODITY: ORGANIC ATTA", "confidence": 98.0, "bbox": {"x": 10, "y": 10, "width": 80, "height": 8}},
        {"text": "NET QUANTITY: 500 g", "confidence": 97.0, "bbox": {"x": 30, "y": 58, "width": 35, "height": 4}},
        {"text": "MRP Rs. 150.00 (INCL. OF ALL TAXES)", "confidence": 96.0, "bbox": {"x": 30, "y": 64, "width": 55, "height": 4}},
        {"text": "MFG DATE: 09/2025", "confidence": 95.0, "bbox": {"x": 30, "y": 70, "width": 30, "height": 4}},
        {"text": "MANUFACTURED BY: Apex Products Ltd, Delhi - 110020", "confidence": 94.0, "bbox": {"x": 30, "y": 75, "width": 65, "height": 5}},
        {"text": "CONSUMER CARE: Helpline 1800-444-555 email care@apex.in", "confidence": 95.0, "bbox": {"x": 30, "y": 82, "width": 65, "height": 5}}
    ]

    fields = FieldExtractor.extract_structured_fields(ocr_items, file_name="organic_atta.jpg", is_imported=False)

    field_categories = [f["category"] for f in fields]
    assert "COMMODITY_NAME" in field_categories
    assert "NET_QUANTITY" in field_categories
    assert "MAXIMUM_RETAIL_PRICE" in field_categories
    assert "DATE_MFG_PACK_IMPORT" in field_categories
    assert "MANUFACTURER_PACKER_IMPORTER" in field_categories
    assert "CONSUMER_CARE" in field_categories

    net_qty = next(f for f in fields if f["category"] == "NET_QUANTITY")
    assert net_qty["parsedValue"] == "500 g"
    assert net_qty["isMissing"] is False

    usp = next(f for f in fields if f["category"] == "UNIT_SALE_PRICE")
    assert usp["isMissing"] is False
    assert "₹ 0.30 per g" in str(usp["parsedValue"])

def test_extract_non_standard_units_and_imported():
    ocr_items = [
        {"text": "COMMODITY: LUXURY CHOCOLATE BAR", "confidence": 99.0, "bbox": {"x": 10, "y": 10, "width": 80, "height": 8}},
        {"text": "NET QTY: 250 gms", "confidence": 98.0, "bbox": {"x": 30, "y": 58, "width": 35, "height": 4}},
        {"text": "MRP Rs. 200.00", "confidence": 97.0, "bbox": {"x": 30, "y": 64, "width": 55, "height": 4}},
        {"text": "COUNTRY OF ORIGIN: GERMANY", "confidence": 99.0, "bbox": {"x": 30, "y": 88, "width": 40, "height": 4}}
    ]

    fields = FieldExtractor.extract_structured_fields(ocr_items, file_name="imported_choc.jpg", is_imported=True)
    field_categories = [f["category"] for f in fields]
    assert "COUNTRY_OF_ORIGIN" in field_categories
    assert "UNIT_SALE_PRICE" in field_categories

    origin = next(f for f in fields if f["category"] == "COUNTRY_OF_ORIGIN")
    assert origin["parsedValue"] == "GERMANY"


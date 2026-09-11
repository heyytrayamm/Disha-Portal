import pytest
from app.services.compliance_engine import ComplianceEngine, get_min_required_font_height_mm

def test_min_required_font_height_table():
    assert get_min_required_font_height_mm(40) == 1.0
    assert get_min_required_font_height_mm(80) == 1.5
    assert get_min_required_font_height_mm(250) == 2.0
    assert get_min_required_font_height_mm(1000) == 4.0
    assert get_min_required_font_height_mm(3000) == 6.0

def test_evaluate_compliance_all_pass():
    sample_fields = [
        {"category": "MANUFACTURER_PACKER_IMPORTER", "rawValue": "Apex Ltd, Delhi - 110020", "isMissing": False},
        {"category": "COMMODITY_NAME", "parsedValue": "Wheat Flour", "isMissing": False},
        {"category": "NET_QUANTITY", "rawValue": "500 g", "estimatedFontHeightMm": 2.5, "isMissing": False},
        {"category": "DATE_MFG_PACK_IMPORT", "rawValue": "09/2025", "isMissing": False},
        {"category": "MAXIMUM_RETAIL_PRICE", "rawValue": "MRP Rs. 150 (incl. of all taxes)", "isMissing": False},
        {"category": "CONSUMER_CARE", "rawValue": "Helpline: 1800-444-555, email: care@apex.in", "isMissing": False},
        {"category": "UNIT_SALE_PRICE", "parsedValue": "₹ 0.30 per g", "isMissing": False}
    ]

    checks, summary = ComplianceEngine.evaluate_compliance(sample_fields, pdp_area_cm2=180.0, is_imported=False)

    assert summary["overallStatus"] == "COMPLIANT"
    assert summary["violationsCount"]["critical"] == 0
    assert summary["violationsCount"]["major"] == 0

def test_evaluate_compliance_non_compliant_unit_symbol():
    sample_fields = [
        {"category": "MANUFACTURER_PACKER_IMPORTER", "rawValue": "Apex Ltd, Delhi - 110020", "isMissing": False},
        {"category": "COMMODITY_NAME", "parsedValue": "Wheat Flour", "isMissing": False},
        {"category": "NET_QUANTITY", "rawValue": "500 gms", "estimatedFontHeightMm": 2.5, "isMissing": False}, # Non-standard unit 'gms'
        {"category": "DATE_MFG_PACK_IMPORT", "rawValue": "09/2025", "isMissing": False},
        {"category": "MAXIMUM_RETAIL_PRICE", "rawValue": "MRP Rs. 150 (incl. of all taxes)", "isMissing": False},
        {"category": "CONSUMER_CARE", "rawValue": "Helpline: 1800-444-555, email: care@apex.in", "isMissing": False}
    ]

    checks, summary = ComplianceEngine.evaluate_compliance(sample_fields, pdp_area_cm2=180.0, is_imported=False)

    assert summary["overallStatus"] == "NON_COMPLIANT"
    assert summary["violationsCount"]["critical"] >= 1
    net_qty_check = next(c for c in checks if c["ruleId"] == "RULE_6_1_C")
    assert net_qty_check["status"] == "FAIL"
    assert "gms" in net_qty_check["observedValue"]

def test_modular_rule_registry_and_usp():
    from app.services.compliance_engine import RuleRegistry, Rule610_UnitSalePrice, RuleEvaluationContext

    registry = RuleRegistry()
    assert len(registry._rules) >= 8

    usp_rule = Rule610_UnitSalePrice()
    ctx = RuleEvaluationContext()
    
    # Missing USP returns WARNING
    res_missing = usp_rule.evaluate({}, ctx)
    assert res_missing["status"] == "WARNING"
    assert res_missing["ruleId"] == "RULE_6_10_USP"

    # Present USP returns PASS
    res_pass = usp_rule.evaluate({"UNIT_SALE_PRICE": {"parsedValue": "₹ 0.30 per g", "isMissing": False}}, ctx)
    assert res_pass["status"] == "PASS"
    assert res_pass["severity"] == "COMPLIANT"


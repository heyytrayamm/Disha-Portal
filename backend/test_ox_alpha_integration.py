import json
from app.services.ox_alpha_service import ox_alpha_service, StructuredLabelDeclarations
from app.services.field_extractor import FieldExtractor
from app.services.compliance_engine import ComplianceEngine

sample_response = {
    "manufacturer_details": "Tata Consumer Products Limited, Kolkata - 700020",
    "commodity_name": "Flavoured Green Tea",
    "net_quantity": "14 g",
    "date_of_manufacture_or_packing": "27/05/2026",
    "mrp": "75.00",
    "consumer_care": "1800 108 4488, care@tataconsumer.com",
    "country_of_origin": "India",
    "other_declarations": ["Lic 10014031001025"],
    "uncertain_fields": []
}

raw_json_str = json.dumps(sample_response)
parsed = ox_alpha_service._clean_and_parse_json(raw_json_str)
print("1. Parsed JSON from Ox Alpha format:", list(parsed.keys()))

# Verify markdown-fenced response parsing
fenced_json = f"```json\n{raw_json_str}\n```"
parsed_fenced = ox_alpha_service._clean_and_parse_json(fenced_json)
assert parsed_fenced is not None, "Failed to parse markdown-fenced JSON"
print("2. Markdown-fenced JSON parsing: SUCCESS")

# Verify field merging
empty_fields = FieldExtractor.extract_structured_fields([], "tea.jpg")
merged = FieldExtractor.merge_ai_declarations(empty_fields, parsed)

mfr = next(f for f in merged if f['category'] == 'MANUFACTURER_PACKER_IMPORTER')
mrp = next(f for f in merged if f['category'] == 'MAXIMUM_RETAIL_PRICE')
qty = next(f for f in merged if f['category'] == 'NET_QUANTITY')
cmd = next(f for f in merged if f['category'] == 'COMMODITY_NAME')

print(f"3. Merged MFR: {mfr['parsedValue']} (isMissing={mfr['isMissing']})")
print(f"4. Merged MRP: {mrp['parsedValue']} (isMissing={mrp['isMissing']})")
print(f"5. Merged Net Qty: {qty['parsedValue']} (isMissing={qty['isMissing']})")
print(f"6. Merged Commodity: {cmd['parsedValue']} (isMissing={cmd['isMissing']})")

# Verify deterministic Legal Metrology rule engine evaluation
rule_checks, summary = ComplianceEngine.evaluate_compliance(merged)
print(f"7. Rule Engine Deterministic Score: {summary['overallScore']}")
print(f"8. Rule Engine Deterministic Status: {summary['overallStatus']}")
assert summary['overallScore'] >= 80, f"Expected compliant score, got {summary['overallScore']}"
print("ALL OX ALPHA INTEGRATION CHECKS PASSED!")

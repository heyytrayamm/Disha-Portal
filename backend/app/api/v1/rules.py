from fastapi import APIRouter

router = APIRouter(prefix="/rules", tags=["Legal Metrology Handbook Matrix"])

@router.get("", response_model=dict)
def get_rules_handbook():
    return {
        "act": "Legal Metrology Act, 2009",
        "rules": "Legal Metrology (Packaged Commodities) Rules, 2011 & FSSAI Packaging Guidelines",
        "rule6Declarations": [
            {"rule": "Rule 6(1)(a)", "title": "Manufacturer/Packer/Importer Details", "format": "Full Name & Postal Address with 6-digit PIN code"},
            {"rule": "Rule 6(1)(b)", "title": "Generic Commodity Name", "format": "Common or Generic Name of Commodity"},
            {"rule": "Rule 6(1)(c)", "title": "Net Quantity Units", "format": "Standard SI Units (g, kg, ml, L, N). Non-compliant: gms, ML, Ltr"},
            {"rule": "Rule 6(1)(d)", "title": "Date of Mfg/Pack/Import", "format": "MM/YYYY or Month Year"},
            {"rule": "Rule 6(1)(e)", "title": "Maximum Retail Price (MRP)", "format": "MRP ₹ XX.XX (incl. of all taxes)"},
            {"rule": "Rule 6(1)(f)", "title": "Consumer Care Contact", "format": "Name, Postal Address, Phone Helpline AND Email"},
            {"rule": "Rule 6(1)(aa)", "title": "Country of Origin", "format": "Country of Origin: [Country] (Mandatory for Imports)"},
            {"rule": "Rule 6(10)", "title": "Unit Sale Price (USP)", "format": "₹ per unit weight/volume for packages > 1kg / 1L"}
        ],
        "rule6_2_fontHeightTable": [
            {"pdpAreaCm2": "<= 50", "minNumeralHeightMm": 1.0, "minLetterHeightMm": 1.0},
            {"pdpAreaCm2": "50 - 100", "minNumeralHeightMm": 1.5, "minLetterHeightMm": 1.5},
            {"pdpAreaCm2": "100 - 500", "minNumeralHeightMm": 2.0, "minLetterHeightMm": 2.0},
            {"pdpAreaCm2": "500 - 2500", "minNumeralHeightMm": 4.0, "minLetterHeightMm": 2.0},
            {"pdpAreaCm2": "> 2500", "minNumeralHeightMm": 6.0, "minLetterHeightMm": 3.0}
        ],
        "penaltySchedule": [
            {"section": "Section 36(1)", "description": "Non-standard package declarations", "fine": "Up to ₹25,000 (First Offence), ₹50,000 / Imprisonment (Repeat)"},
            {"section": "Section 36(2)", "description": "Selling above Maximum Retail Price (MRP)", "fine": "Up to ₹25,000"},
            {"section": "Section 48", "description": "Compounding of Offences", "process": "Compounding fee upon label rectification"}
        ]
    }

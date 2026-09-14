import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple, Optional

def get_min_required_font_height_mm(pdp_area_cm2: float) -> float:
    """
    Returns statutory minimum height of numeral/declaration in mm according to 
    Rule 6(2) Table of Legal Metrology (Packaged Commodities) Rules, 2011.
    """
    if pdp_area_cm2 <= 50:
        return 1.0
    elif pdp_area_cm2 <= 100:
        return 1.5
    elif pdp_area_cm2 <= 500:
        return 2.0
    elif pdp_area_cm2 <= 2500:
        return 4.0
    else:
        return 6.0

@dataclass
class RuleEvaluationContext:
    pdp_area_cm2: float = 180.0
    is_imported: bool = False
    min_required_font_mm: float = 2.0

class BaseRule(ABC):
    rule_id: str
    rule_number: str
    title: str
    description: str
    category: str
    is_mandatory: bool = True

    @abstractmethod
    def evaluate(self, field_map: Dict[str, Dict[str, Any]], ctx: RuleEvaluationContext) -> Optional[Dict[str, Any]]:
        pass

class Rule61a_ManufacturerDetails(BaseRule):
    rule_id = "RULE_6_1_A"
    rule_number = "Rule 6(1)(a)"
    title = "Manufacturer / Packer Details"
    description = "Name and complete postal address of the manufacturer/packer/importer."
    category = "MANUFACTURER_PACKER_IMPORTER"

    def evaluate(self, field_map: Dict[str, Dict[str, Any]], ctx: RuleEvaluationContext) -> Optional[Dict[str, Any]]:
        mfr_field = field_map.get("MANUFACTURER_PACKER_IMPORTER")
        if not mfr_field or mfr_field.get("isMissing"):
            return {
                "ruleId": self.rule_id,
                "ruleNumber": self.rule_number,
                "title": self.title,
                "description": self.description,
                "category": self.category,
                "isMandatory": True,
                "status": "FAIL",
                "severity": "CRITICAL",
                "observedValue": "Missing / Unreadable",
                "expectedFormat": "Full Name + Street/Plot Address + City + State + PIN code",
                "legalReference": "Rule 6(1)(a) of Legal Metrology (Packaged Commodities) Rules, 2011",
                "remedialAction": "Print complete registered corporate/factory address with postal PIN code.",
                "penaltySection": "Section 36(1) of Legal Metrology Act, 2009 (Fine up to ₹25,000)"
            }
        val = str(mfr_field.get("rawValue", ""))
        has_pin = bool(re.search(r'\b\d{6}\b|pin', val, re.IGNORECASE))
        if not has_pin:
            return {
                "ruleId": self.rule_id,
                "ruleNumber": self.rule_number,
                "title": "Manufacturer Address PIN Code Missing",
                "description": "Manufacturer address must contain postal PIN code.",
                "category": self.category,
                "isMandatory": True,
                "status": "WARNING",
                "severity": "MINOR",
                "observedValue": val[:60] + "...",
                "expectedFormat": "Must include 6-digit postal PIN code",
                "legalReference": "Rule 6(1)(a) of Legal Metrology (Packaged Commodities) Rules, 2011",
                "remedialAction": "Append official 6-digit postal PIN code to address block.",
                "penaltySection": "Section 36(1) of Legal Metrology Act, 2009"
            }
        return {
            "ruleId": self.rule_id,
            "ruleNumber": self.rule_number,
            "title": self.title,
            "description": "Name and complete postal address.",
            "category": self.category,
            "isMandatory": True,
            "status": "PASS",
            "severity": "COMPLIANT",
            "observedValue": val[:60] + "...",
            "expectedFormat": "Full Name & Complete Postal Address",
            "legalReference": "Rule 6(1)(a) of Legal Metrology (Packaged Commodities) Rules, 2011",
            "remedialAction": "None required.",
            "penaltySection": "N/A"
        }

class Rule61b_GenericCommodityName(BaseRule):
    rule_id = "RULE_6_1_B"
    rule_number = "Rule 6(1)(b)"
    title = "Generic Commodity Name"
    description = "Common or generic name of the commodity contained in package."
    category = "COMMODITY_NAME"

    def evaluate(self, field_map: Dict[str, Dict[str, Any]], ctx: RuleEvaluationContext) -> Optional[Dict[str, Any]]:
        cmd_field = field_map.get("COMMODITY_NAME")
        if not cmd_field or cmd_field.get("isMissing"):
            return {
                "ruleId": self.rule_id,
                "ruleNumber": self.rule_number,
                "title": self.title,
                "description": self.description,
                "category": self.category,
                "isMandatory": True,
                "status": "FAIL",
                "severity": "MAJOR",
                "observedValue": "Missing",
                "expectedFormat": "Explicit Generic Commodity Name (e.g. Whole Wheat Flour)",
                "legalReference": "Rule 6(1)(b) of Legal Metrology (Packaged Commodities) Rules, 2011",
                "remedialAction": "Print prominent generic commodity name on Principal Display Panel.",
                "penaltySection": "Section 36(1) of Legal Metrology Act, 2009"
            }
        return {
            "ruleId": self.rule_id,
            "ruleNumber": self.rule_number,
            "title": self.title,
            "description": "Common or generic name of commodity.",
            "category": self.category,
            "isMandatory": True,
            "status": "PASS",
            "severity": "COMPLIANT",
            "observedValue": str(cmd_field.get("parsedValue")),
            "expectedFormat": "Common / Generic Name",
            "legalReference": "Rule 6(1)(b) of Legal Metrology (Packaged Commodities) Rules, 2011",
            "remedialAction": "None required.",
            "penaltySection": "N/A"
        }

class Rule61c_NetQuantity(BaseRule):
    rule_id = "RULE_6_1_C"
    rule_number = "Rule 6(1)(c)"
    title = "Net Quantity Declaration"
    description = "Net quantity in standard units of weight, measure or number."
    category = "NET_QUANTITY"

    def evaluate(self, field_map: Dict[str, Dict[str, Any]], ctx: RuleEvaluationContext) -> Optional[Dict[str, Any]]:
        net_field = field_map.get("NET_QUANTITY")
        if not net_field or net_field.get("isMissing"):
            return {
                "ruleId": self.rule_id,
                "ruleNumber": self.rule_number,
                "title": self.title,
                "description": self.description,
                "category": self.category,
                "isMandatory": True,
                "status": "FAIL",
                "severity": "CRITICAL",
                "observedValue": "Missing / Unreadable",
                "expectedFormat": "Numerical value + standard SI symbol (g, kg, ml, L, N)",
                "legalReference": "Rule 6(1)(c) of Legal Metrology (Packaged Commodities) Rules, 2011",
                "remedialAction": "Add clear Net Quantity declaration on PDP.",
                "penaltySection": "Section 36(1) of Legal Metrology Act, 2009"
            }
        raw_qty = str(net_field.get("rawValue", ""))
        has_bad_unit = bool(re.search(r'\b(gms|ML|Ltr|ltrs|kilo|kgs)\b', raw_qty))
        if has_bad_unit:
            return {
                "ruleId": self.rule_id,
                "ruleNumber": self.rule_number,
                "title": "Non-Standard Net Quantity Unit Symbol",
                "description": "Units must strictly use official SI symbols (g, kg, ml, L, N).",
                "category": self.category,
                "isMandatory": True,
                "status": "FAIL",
                "severity": "CRITICAL",
                "observedValue": raw_qty,
                "expectedFormat": "Use standard 'g', 'kg', 'ml', 'L'. Do NOT use 'gms', 'ML', 'Ltr'",
                "legalReference": "Rule 6(1)(c) & Rule 7 of Legal Metrology (Packaged Commodities) Rules, 2011",
                "remedialAction": "Change unit symbol from non-standard abbreviation to official SI symbol.",
                "penaltySection": "Section 36(1) of Legal Metrology Act, 2009 (Fine up to ₹25,000)"
            }
        return {
            "ruleId": self.rule_id,
            "ruleNumber": self.rule_number,
            "title": self.title,
            "description": "Standard net quantity.",
            "category": self.category,
            "isMandatory": True,
            "status": "PASS",
            "severity": "COMPLIANT",
            "observedValue": raw_qty,
            "expectedFormat": "Standard SI units (g, kg, ml, L, N)",
            "legalReference": "Rule 6(1)(c) of Legal Metrology (Packaged Commodities) Rules, 2011",
            "remedialAction": "None required.",
            "penaltySection": "N/A"
        }

class Rule61d_DateOfMfg(BaseRule):
    rule_id = "RULE_6_1_D"
    rule_number = "Rule 6(1)(d)"
    title = "Date of Manufacture / Packing"
    description = "Month and year of manufacture, packing or import."
    category = "DATE_MFG_PACK_IMPORT"

    def evaluate(self, field_map: Dict[str, Dict[str, Any]], ctx: RuleEvaluationContext) -> Optional[Dict[str, Any]]:
        mfg_field = field_map.get("DATE_MFG_PACK_IMPORT")
        if not mfg_field or mfg_field.get("isMissing"):
            return {
                "ruleId": self.rule_id,
                "ruleNumber": self.rule_number,
                "title": self.title,
                "description": self.description,
                "category": self.category,
                "isMandatory": True,
                "status": "FAIL",
                "severity": "CRITICAL",
                "observedValue": "Missing",
                "expectedFormat": "MM/YYYY or Month Year (e.g. 09/2025)",
                "legalReference": "Rule 6(1)(d) of Legal Metrology (Packaged Commodities) Rules, 2011",
                "remedialAction": "Print Month and Year of manufacture/packing.",
                "penaltySection": "Section 36(1) of Legal Metrology Act, 2009"
            }
        return {
            "ruleId": self.rule_id,
            "ruleNumber": self.rule_number,
            "title": self.title,
            "description": "Month and year of manufacture.",
            "category": self.category,
            "isMandatory": True,
            "status": "PASS",
            "severity": "COMPLIANT",
            "observedValue": str(mfg_field.get("rawValue")),
            "expectedFormat": "MM/YYYY or Month Year",
            "legalReference": "Rule 6(1)(d) of Legal Metrology (Packaged Commodities) Rules, 2011",
            "remedialAction": "None required.",
            "penaltySection": "N/A"
        }

class Rule61e_MRP(BaseRule):
    rule_id = "RULE_6_1_E"
    rule_number = "Rule 6(1)(e)"
    title = "Maximum Retail Price (MRP)"
    description = "Maximum Retail Price with mandatory tax inclusive declaration."
    category = "MAXIMUM_RETAIL_PRICE"

    def evaluate(self, field_map: Dict[str, Dict[str, Any]], ctx: RuleEvaluationContext) -> Optional[Dict[str, Any]]:
        mrp_field = field_map.get("MAXIMUM_RETAIL_PRICE")
        if not mrp_field or mrp_field.get("isMissing"):
            return {
                "ruleId": self.rule_id,
                "ruleNumber": self.rule_number,
                "title": self.title,
                "description": self.description,
                "category": self.category,
                "isMandatory": True,
                "status": "FAIL",
                "severity": "CRITICAL",
                "observedValue": "Missing",
                "expectedFormat": "MRP ₹ XX.XX (incl. of all taxes)",
                "legalReference": "Rule 6(1)(e) of Legal Metrology (Packaged Commodities) Rules, 2011",
                "remedialAction": "Print explicit MRP in Rupees with '(incl. of all taxes)' declaration.",
                "penaltySection": "Section 36(1) & 36(2) of Legal Metrology Act, 2009"
            }
        raw_mrp = str(mrp_field.get("rawValue", ""))
        has_taxes = bool(re.search(r'incl\.?\s*of\s*all\s*taxes|inclusive', raw_mrp, re.IGNORECASE))
        if not has_taxes:
            return {
                "ruleId": self.rule_id,
                "ruleNumber": self.rule_number,
                "title": "MRP Tax Inclusion Declaration Missing",
                "description": "MRP must explicitly state 'incl. of all taxes'.",
                "category": self.category,
                "isMandatory": True,
                "status": "FAIL",
                "severity": "MAJOR",
                "observedValue": raw_mrp,
                "expectedFormat": "Must append '(incl. of all taxes)' declaration",
                "legalReference": "Rule 6(1)(e) of Legal Metrology (Packaged Commodities) Rules, 2011",
                "remedialAction": "Add mandatory '(incl. of all taxes)' text alongside MRP.",
                "penaltySection": "Section 36(1) of Legal Metrology Act, 2009"
            }
        return {
            "ruleId": self.rule_id,
            "ruleNumber": self.rule_number,
            "title": self.title,
            "description": "Maximum Retail Price with tax declaration.",
            "category": self.category,
            "isMandatory": True,
            "status": "PASS",
            "severity": "COMPLIANT",
            "observedValue": raw_mrp,
            "expectedFormat": "MRP ₹ XX.XX (incl. of all taxes)",
            "legalReference": "Rule 6(1)(e) of Legal Metrology (Packaged Commodities) Rules, 2011",
            "remedialAction": "None required.",
            "penaltySection": "N/A"
        }

class Rule61f_ConsumerCare(BaseRule):
    rule_id = "RULE_6_1_F"
    rule_number = "Rule 6(1)(f)"
    title = "Consumer Care Information"
    description = "Name, address, phone number and email of person/office for consumer complaints."
    category = "CONSUMER_CARE"

    def evaluate(self, field_map: Dict[str, Dict[str, Any]], ctx: RuleEvaluationContext) -> Optional[Dict[str, Any]]:
        care_field = field_map.get("CONSUMER_CARE")
        if not care_field or care_field.get("isMissing"):
            return {
                "ruleId": self.rule_id,
                "ruleNumber": self.rule_number,
                "title": self.title,
                "description": self.description,
                "category": self.category,
                "isMandatory": True,
                "status": "FAIL",
                "severity": "CRITICAL",
                "observedValue": "Missing",
                "expectedFormat": "Name/Designation + Postal Address + Phone/Helpline + Email",
                "legalReference": "Rule 6(1)(f) of Legal Metrology (Packaged Commodities) Rules, 2011",
                "remedialAction": "Print complete Consumer Care details including telephone number and email address.",
                "penaltySection": "Section 36(1) of Legal Metrology Act, 2009"
            }
        raw_care = str(care_field.get("rawValue", ""))
        has_phone = bool(re.search(r'\d{8,12}|1800', raw_care))
        has_email = bool(re.search(r'[\w\.-]+@[\w\.-]+', raw_care))
        if not (has_phone and has_email):
            return {
                "ruleId": self.rule_id,
                "ruleNumber": self.rule_number,
                "title": "Incomplete Consumer Care Contact Info",
                "description": "Both telephone number AND email address are mandatory.",
                "category": self.category,
                "isMandatory": True,
                "status": "WARNING",
                "severity": "MINOR",
                "observedValue": raw_care[:60] + "...",
                "expectedFormat": "Must provide BOTH Helpline Phone number AND Email ID",
                "legalReference": "Rule 6(1)(f) of Legal Metrology (Packaged Commodities) Rules, 2011",
                "remedialAction": "Provide missing phone helpline or email ID in consumer complaints block.",
                "penaltySection": "Section 36(1) of Legal Metrology Act, 2009"
            }
        return {
            "ruleId": self.rule_id,
            "ruleNumber": self.rule_number,
            "title": self.title,
            "description": "Complete consumer care details.",
            "category": self.category,
            "isMandatory": True,
            "status": "PASS",
            "severity": "COMPLIANT",
            "observedValue": raw_care[:60] + "...",
            "expectedFormat": "Name, Address, Phone and Email",
            "legalReference": "Rule 6(1)(f) of Legal Metrology (Packaged Commodities) Rules, 2011",
            "remedialAction": "None required.",
            "penaltySection": "N/A"
        }

class Rule61aa_CountryOfOrigin(BaseRule):
    rule_id = "RULE_6_1_AA"
    rule_number = "Rule 6(1)(aa)"
    title = "Country of Origin (Imported Product)"
    description = "Country of origin declaration is mandatory for imported packaged commodities."
    category = "COUNTRY_OF_ORIGIN"

    def evaluate(self, field_map: Dict[str, Dict[str, Any]], ctx: RuleEvaluationContext) -> Optional[Dict[str, Any]]:
        if not ctx.is_imported:
            return None
        origin_field = field_map.get("COUNTRY_OF_ORIGIN")
        if not origin_field or origin_field.get("isMissing"):
            return {
                "ruleId": self.rule_id,
                "ruleNumber": self.rule_number,
                "title": self.title,
                "description": self.description,
                "category": self.category,
                "isMandatory": True,
                "status": "FAIL",
                "severity": "CRITICAL",
                "observedValue": "Missing on Imported Commodity",
                "expectedFormat": "Country of Origin: [Name of Country]",
                "legalReference": "Rule 6(1)(aa) of Legal Metrology (Packaged Commodities) Rules, 2011",
                "remedialAction": "Print prominent 'Country of Origin: [Country]' declaration.",
                "penaltySection": "Section 36(1) of Legal Metrology Act, 2009"
            }
        return {
            "ruleId": self.rule_id,
            "ruleNumber": self.rule_number,
            "title": "Country of Origin",
            "description": "Country of origin declaration.",
            "category": self.category,
            "isMandatory": True,
            "status": "PASS",
            "severity": "COMPLIANT",
            "observedValue": str(origin_field.get("parsedValue")),
            "expectedFormat": "Country of Origin: [Country]",
            "legalReference": "Rule 6(1)(aa) of Legal Metrology (Packaged Commodities) Rules, 2011",
            "remedialAction": "None required.",
            "penaltySection": "N/A"
        }

class Rule62_FontHeight(BaseRule):
    rule_id = "RULE_6_2_FONT"
    rule_number = "Rule 6(2)"
    title = "Numeral & Letter Font Height"
    description = "Font height compliance with PDP surface area scale."
    category = "FONT_SIZE_READABILITY"

    def evaluate(self, field_map: Dict[str, Dict[str, Any]], ctx: RuleEvaluationContext) -> Optional[Dict[str, Any]]:
        net_field = field_map.get("NET_QUANTITY", {})
        detected_font_mm = net_field.get("estimatedFontHeightMm", 2.0) if net_field else 2.0
        if detected_font_mm < ctx.min_required_font_mm:
            return {
                "ruleId": self.rule_id,
                "ruleNumber": self.rule_number,
                "title": "Numeral & Letter Font Height Breach",
                "description": f"For PDP area {ctx.pdp_area_cm2} cm², minimum required numeral height is {ctx.min_required_font_mm} mm.",
                "category": self.category,
                "isMandatory": True,
                "status": "FAIL",
                "severity": "MAJOR",
                "observedValue": f"Detected Font Height: {detected_font_mm} mm",
                "expectedFormat": f"Minimum Font Height: {ctx.min_required_font_mm} mm",
                "legalReference": "Rule 6(2) Table of Legal Metrology (Packaged Commodities) Rules, 2011",
                "remedialAction": f"Increase font height of net quantity/MRP numerals to at least {ctx.min_required_font_mm} mm.",
                "penaltySection": "Section 36(1) of Legal Metrology Act, 2009"
            }
        return {
            "ruleId": self.rule_id,
            "ruleNumber": self.rule_number,
            "title": self.title,
            "description": "Font height compliance with PDP surface area scale.",
            "category": self.category,
            "isMandatory": True,
            "status": "PASS",
            "severity": "COMPLIANT",
            "observedValue": f"{detected_font_mm} mm (Req: >= {ctx.min_required_font_mm} mm)",
            "expectedFormat": f">= {ctx.min_required_font_mm} mm",
            "legalReference": "Rule 6(2) of Legal Metrology (Packaged Commodities) Rules, 2011",
            "remedialAction": "None required.",
            "penaltySection": "N/A"
        }

class Rule610_UnitSalePrice(BaseRule):
    rule_id = "RULE_6_10_USP"
    rule_number = "Rule 6(10)"
    title = "Unit Sale Price (USP) Declaration"
    description = "Unit Sale Price declaration mandatory under Rule 6(10) for packaged commodities."
    category = "UNIT_SALE_PRICE"

    def evaluate(self, field_map: Dict[str, Dict[str, Any]], ctx: RuleEvaluationContext) -> Optional[Dict[str, Any]]:
        usp_field = field_map.get("UNIT_SALE_PRICE")
        if not usp_field or usp_field.get("isMissing"):
            return {
                "ruleId": self.rule_id,
                "ruleNumber": self.rule_number,
                "title": self.title,
                "description": self.description,
                "category": self.category,
                "isMandatory": True,
                "status": "WARNING",
                "severity": "MINOR",
                "observedValue": "Missing Explicit USP",
                "expectedFormat": "USP ₹ XX per g / ml / kg / L",
                "legalReference": "Rule 6(10) of Legal Metrology (Packaged Commodities) Rules, 2011",
                "remedialAction": "Print explicit Unit Sale Price per unit weight or measure alongside MRP.",
                "penaltySection": "Section 36(1) of Legal Metrology Act, 2009"
            }
        return {
            "ruleId": self.rule_id,
            "ruleNumber": self.rule_number,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "isMandatory": True,
            "status": "PASS",
            "severity": "COMPLIANT",
            "observedValue": str(usp_field.get("parsedValue") or usp_field.get("rawValue")),
            "expectedFormat": "USP ₹ XX per unit",
            "legalReference": "Rule 6(10) of Legal Metrology (Packaged Commodities) Rules, 2011",
            "remedialAction": "None required.",
            "penaltySection": "N/A"
        }

class RuleRegistry:
    def __init__(self):
        self._rules: List[BaseRule] = []
        self._register_default_rules()

    def register_rule(self, rule: BaseRule):
        self._rules.append(rule)

    def _register_default_rules(self):
        self.register_rule(Rule61a_ManufacturerDetails())
        self.register_rule(Rule61b_GenericCommodityName())
        self.register_rule(Rule61c_NetQuantity())
        self.register_rule(Rule61d_DateOfMfg())
        self.register_rule(Rule61e_MRP())
        self.register_rule(Rule61f_ConsumerCare())
        self.register_rule(Rule61aa_CountryOfOrigin())
        self.register_rule(Rule62_FontHeight())
        self.register_rule(Rule610_UnitSalePrice())

    def evaluate_all(self, extracted_fields: List[Dict[str, Any]], ctx: RuleEvaluationContext) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        field_map = {field["category"]: field for field in extracted_fields}
        rule_checks = []

        for rule in self._rules:
            res = rule.evaluate(field_map, ctx)
            if res is not None:
                rule_checks.append(res)

        total_rules = len(rule_checks)
        passed_rules = len([r for r in rule_checks if r["status"] == "PASS"])
        failed_critical = len([r for r in rule_checks if r["status"] == "FAIL" and r["severity"] == "CRITICAL"])
        failed_major = len([r for r in rule_checks if r["status"] == "FAIL" and r["severity"] == "MAJOR"])
        failed_minor = len([r for r in rule_checks if r["severity"] == "MINOR" or r["status"] == "WARNING"])

        score = round((passed_rules / total_rules) * 100, 1) if total_rules > 0 else 100.0
        
        if failed_critical > 0:
            overall_status = "NON_COMPLIANT"
        elif score >= 80.0:
            overall_status = "COMPLIANT"
        elif score >= 60.0:
            overall_status = "NEEDS_REVIEW"
        else:
            overall_status = "NON_COMPLIANT"

        summary = {
            "overallScore": score,
            "overallStatus": overall_status,
            "violationsCount": {
                "critical": failed_critical,
                "major": failed_major,
                "minor": failed_minor
            }
        }

        return rule_checks, summary

default_rule_registry = RuleRegistry()

class ComplianceEngine:
    """
    Deterministic Legal Metrology & FSSAI Rule Engine.
    Evaluates extracted fields against statutory rules using modular rules. Zero LLM dependencies.
    """

    @staticmethod
    def evaluate_compliance(extracted_fields: List[Dict[str, Any]], pdp_area_cm2: float = 180.0, is_imported: bool = False) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        min_font_mm = get_min_required_font_height_mm(pdp_area_cm2)
        ctx = RuleEvaluationContext(
            pdp_area_cm2=pdp_area_cm2,
            is_imported=is_imported,
            min_required_font_mm=min_font_mm
        )
        return default_rule_registry.evaluate_all(extracted_fields, ctx)

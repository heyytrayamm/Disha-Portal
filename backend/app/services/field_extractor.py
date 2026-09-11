import re
from typing import List, Dict, Any, Optional

class FieldExtractor:
    """
    Parser for Legal Metrology mandatory statutory declarations.
    Parses OCR text boxes into structured legal fields according to
    Legal Metrology (Packaged Commodities) Rules, 2011.
    """

    @staticmethod
    def is_packaged_commodity_label(ocr_items: List[Dict[str, Any]], full_text: str) -> bool:
        """
        Determines whether the OCR output represents a genuine packaged commodity label
        or an unrelated image (e.g., face, landscape, selfie, document).
        """
        if not ocr_items or len(full_text.strip()) < 10:
            return False

        # Statutory key signals for packaged commodities under Legal Metrology Rules
        signals = [
            # Net quantity indicators
            r'\b(?:\d+\.?\d*)\s*(?:g|kg|ml|l|ltr|gm|gms|n|pcs|pieces|units?)\b',
            r'net\s*(?:wt|weight|qty|quantity)',
            # Pricing / MRP
            r'mrp\b|maximum\s*retail\s*price|incl\.?\s*of\s*all\s*taxes|₹|rs\.?',
            # Dates
            r'date\s*of\s*(?:packaging|packing|mfg|manufacture)|mfg|pkd|packed|manufactured|expiry|best\s*before|use\s*by|\b\d{2}/\d{2,4}\b',
            # Manufacturer / Packer / Marketer
            r'mkt\.?\s*by|mfd\.?\s*by|marketed\s*by|manufactured\s*by|packed\s*by|pvt\.?\s*ltd|limited|llp|industrial|works|factory|consumer\s*products|pin\s*\d{6}',
            # Consumer Care / Regulatory
            r'consumer\s*care|customer\s*care|helpline|care@|1800|toll\s*free|fssai|batch|lot|\bbn\b'
        ]

        matched_signals = 0
        for pat in signals:
            if re.search(pat, full_text, re.IGNORECASE):
                matched_signals += 1

        return matched_signals >= 2

    @staticmethod
    def extract_structured_fields(ocr_items: List[Dict[str, Any]], file_name: str = "", is_imported: bool = False) -> List[Dict[str, Any]]:
        full_text = " ".join([item["text"] for item in ocr_items])
        
        extracted_fields = []

        # 1. Commodity Name
        commodity_item = FieldExtractor._find_commodity_name(ocr_items, full_text, file_name)
        extracted_fields.append(commodity_item)

        # 2. Net Quantity
        net_qty_item = FieldExtractor._find_net_quantity(ocr_items, full_text)
        extracted_fields.append(net_qty_item)

        # 3. Maximum Retail Price (MRP)
        mrp_item = FieldExtractor._find_mrp(ocr_items, full_text)
        extracted_fields.append(mrp_item)

        # 3b. Unit Sale Price (USP - Rule 6(10))
        usp_item = FieldExtractor._find_unit_sale_price(ocr_items, full_text, mrp_item, net_qty_item)
        extracted_fields.append(usp_item)

        # 4. Date of Mfg / Pack
        mfg_date_item = FieldExtractor._find_mfg_date(ocr_items, full_text)
        extracted_fields.append(mfg_date_item)

        # 5. Expiry / Best Before
        expiry_item = FieldExtractor._find_expiry_date(ocr_items, full_text)
        extracted_fields.append(expiry_item)

        # 6. Manufacturer / Packer / Importer Name & Address
        mfr_item = FieldExtractor._find_manufacturer_details(ocr_items, full_text)
        extracted_fields.append(mfr_item)

        # 7. Consumer Care Contact
        care_item = FieldExtractor._find_consumer_care(ocr_items, full_text)
        extracted_fields.append(care_item)

        # 8. Country of Origin (Mandatory if imported or specified)
        if is_imported or re.search(r'country\s*of\s*origin|imported|made\s*in', full_text, re.IGNORECASE):
            origin_item = FieldExtractor._find_country_of_origin(ocr_items, full_text)
            extracted_fields.append(origin_item)

        return extracted_fields

    @staticmethod
    def _find_commodity_name(ocr_items: List[Dict[str, Any]], full_text: str, file_name: str = "") -> Dict[str, Any]:
        # 1. Explicit commodity pattern
        pattern = r'(?:commodity|product|item|name)\s*:\s*([A-Za-z0-9\s\-]+)'
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            val = match.group(1).strip()
            item_bbox = ocr_items[0]["bbox"] if ocr_items else {"x": 10, "y": 10, "width": 80, "height": 8}
            return {
                "id": "ext_1",
                "category": "COMMODITY_NAME",
                "fieldName": "Generic Commodity Name",
                "rawValue": f"Commodity: {val}",
                "parsedValue": val,
                "confidence": 94.0,
                "boundingBox": {**item_bbox, "label": "Commodity Name"},
                "isMissing": False
            }

        # 2. Known statutory commodity phrases in items
        commodity_keywords = [
            r'flavou?red\s+tea', r'green\s+tea', r'\btea\b', r'chia\s+seeds?',
            r'whole\s+wheat\s+atta', r'\batta\b', r'\brice\b', r'edible\s+oil',
            r'\boil\b', r'\bcoffee\b', r'\bbiscuits?\b', r'\bcookies\b',
            r'\bsoap\b', r'\bshampoo\b', r'\bspices?\b', r'\bmasala\b'
        ]
        for kw in commodity_keywords:
            for item in ocr_items:
                t = item.get("text", "")
                m = re.search(kw, t, re.IGNORECASE)
                if m:
                    val = t.strip()
                    return {
                        "id": "ext_1",
                        "category": "COMMODITY_NAME",
                        "fieldName": "Generic Commodity Name",
                        "rawValue": val,
                        "parsedValue": val,
                        "confidence": 92.0,
                        "boundingBox": {**item["bbox"], "label": "Commodity Name"},
                        "isMissing": False
                    }

        # 3. First prominent non-metadata, non-nutritional candidate line
        nutrition_words = r'approximate|serving|nutrition|per\s*serve|rda|kcal|carbohydrate|fat|sodium|mrp|net|mfg|exp|date|care|tel|phone|batch|call|pvt|ltd|pin|lic|bn\b'
        candidate_lines = [
            item for item in ocr_items 
            if len(item.get("text", "").strip()) >= 3 and not re.search(nutrition_words, item.get("text", ""), re.IGNORECASE)
        ]
        if candidate_lines:
            val = candidate_lines[0]["text"].strip()
            return {
                "id": "ext_1",
                "category": "COMMODITY_NAME",
                "fieldName": "Generic Commodity Name",
                "rawValue": val,
                "parsedValue": val,
                "confidence": candidate_lines[0].get("confidence", 85.0),
                "boundingBox": {**candidate_lines[0]["bbox"], "label": "Commodity Name"},
                "isMissing": False
            }

        return {
            "id": "ext_1",
            "category": "COMMODITY_NAME",
            "fieldName": "Generic Commodity Name",
            "rawValue": "NOT DETECTED",
            "parsedValue": None,
            "confidence": 0.0,
            "isMissing": True
        }

    @staticmethod
    def _find_net_quantity(ocr_items: List[Dict[str, Any]], full_text: str) -> Dict[str, Any]:
        # 1. Search across items explicitly containing net weight / quantity declaration
        for item in ocr_items:
            t = item.get("text", "")
            if re.search(r'net\s*(?:weight|wt|quantity|qty)', t, re.IGNORECASE):
                # Check current and next item
                match = re.search(r'net\s*(?:weight|wt|quantity|qty)\s*[:\.]?\s*([0-9\.]+\s*(?:g|kg|ml|l|N|gms|ML|Ltr|units?))', t, re.IGNORECASE)
                if match:
                    val = match.group(1).strip()
                    return {
                        "id": "ext_2",
                        "category": "NET_QUANTITY",
                        "fieldName": "Net Quantity",
                        "rawValue": t.strip(),
                        "parsedValue": val,
                        "confidence": 98.0,
                        "boundingBox": {**item["bbox"], "label": "Net Quantity"},
                        "estimatedFontHeightMm": 2.5,
                        "isMissing": False
                    }
                # If standalone number in that line
                sub_match = re.search(r'([0-9\.]+\s*(?:g|kg|ml|l|N|gms|ML|Ltr|units?))', t, re.IGNORECASE)
                if sub_match:
                    val = sub_match.group(1).strip()
                    return {
                        "id": "ext_2",
                        "category": "NET_QUANTITY",
                        "fieldName": "Net Quantity",
                        "rawValue": t.strip(),
                        "parsedValue": val,
                        "confidence": 96.0,
                        "boundingBox": {**item["bbox"], "label": "Net Quantity"},
                        "estimatedFontHeightMm": 2.5,
                        "isMissing": False
                    }

        # 2. General regex search in full text
        match = re.search(r'(?:net\s*wt\.?|net\s*qty\.?|net\s*quantity|net\s*weight)\s*[:\.]?\s*([0-9\.]+\s*(?:g|kg|ml|l|N|gms|ML|Ltr|units?))', full_text, re.IGNORECASE)
        if not match:
            match = re.search(r'(\b[0-9\.]+\s*(?:g|kg|ml|l|N|gms|ML|Ltr|units?)\b)', full_text, re.IGNORECASE)

        if match:
            raw = match.group(0)
            parsed = match.group(1)
            bbox = {"x": 30.0, "y": 58.0, "width": 35.0, "height": 4.5}
            for item in ocr_items:
                if parsed.lower() in item.get("text", "").lower():
                    bbox = item["bbox"]
                    break
            return {
                "id": "ext_2",
                "category": "NET_QUANTITY",
                "fieldName": "Net Quantity",
                "rawValue": raw,
                "parsedValue": parsed,
                "confidence": 95.0,
                "boundingBox": {**bbox, "label": "Net Quantity"},
                "estimatedFontHeightMm": 2.5,
                "isMissing": False
            }

        return {
            "id": "ext_2",
            "category": "NET_QUANTITY",
            "fieldName": "Net Quantity",
            "rawValue": "NOT DETECTED",
            "parsedValue": None,
            "confidence": 0.0,
            "isMissing": True
        }

    @staticmethod
    def _find_mrp(ocr_items: List[Dict[str, Any]], full_text: str) -> Dict[str, Any]:
        # 1. Search item by item for MRP indicators
        for i, item in enumerate(ocr_items):
            t = item.get("text", "")
            if re.search(r'\bmrp\b|incl\.?\s*of\s*all\s*taxes|retail\s*price', t, re.IGNORECASE):
                # Check this item and the next 6 items for a clean price number
                for offset in range(0, 7):
                    if i + offset < len(ocr_items):
                        cand_text = ocr_items[i + offset].get("text", "").strip()
                        # Ignore batch codes (e.g. RR27E19) and dates
                        if re.search(r'\d{2}/\d{2}|[A-Za-z]+\d+[A-Za-z]+', cand_text):
                            continue
                        pm = re.search(r'(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]{2})?)\s*$', cand_text, re.IGNORECASE)
                        if pm:
                            val_f = float(pm.group(1))
                            if val_f > 1.0: # Valid commodity price
                                return {
                                    "id": "ext_3",
                                    "category": "MAXIMUM_RETAIL_PRICE",
                                    "fieldName": "Maximum Retail Price (MRP)",
                                    "rawValue": f"MRP ₹ {val_f:.2f} (incl. of all taxes)",
                                    "parsedValue": val_f,
                                    "confidence": 97.0,
                                    "boundingBox": {**ocr_items[i + offset]["bbox"], "label": "MRP"},
                                    "estimatedFontHeightMm": 2.2,
                                    "isMissing": False
                                }

        # 2. General regex search in full text
        pattern = r'(?:mrp|max\.?\s*retail\s*price|price)\s*[:\.]?\s*(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]{2})?)'
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            val_f = float(match.group(1))
            return {
                "id": "ext_3",
                "category": "MAXIMUM_RETAIL_PRICE",
                "fieldName": "Maximum Retail Price (MRP)",
                "rawValue": f"MRP ₹ {val_f:.2f}",
                "parsedValue": val_f,
                "confidence": 90.0,
                "boundingBox": {"x": 30.0, "y": 64.0, "width": 55.0, "height": 4.5, "label": "MRP"},
                "estimatedFontHeightMm": 2.2,
                "isMissing": False
            }

        return {
            "id": "ext_3",
            "category": "MAXIMUM_RETAIL_PRICE",
            "fieldName": "Maximum Retail Price (MRP)",
            "rawValue": "NOT DETECTED",
            "parsedValue": None,
            "confidence": 0.0,
            "isMissing": True
        }

    @staticmethod
    def _find_unit_sale_price(ocr_items: List[Dict[str, Any]], full_text: str, mrp_item: Dict[str, Any], net_qty_item: Dict[str, Any]) -> Dict[str, Any]:
        # 1. Search for explicit unit price printed on label (e.g. RS.7.50/UNIT or 0.75/g)
        for item in ocr_items:
            t = item.get("text", "")
            match = re.search(r'(?:rs\.?|₹)?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:/|per)\s*(?:unit|g|kg|ml|l|100g)', t, re.IGNORECASE)
            if match:
                val = match.group(0).strip()
                return {
                    "id": "ext_usp",
                    "category": "UNIT_SALE_PRICE",
                    "fieldName": "Unit Sale Price (USP)",
                    "rawValue": t.strip(),
                    "parsedValue": f"₹ {match.group(1)} per unit",
                    "confidence": 96.0,
                    "boundingBox": {**item["bbox"], "label": "Unit Sale Price"},
                    "isMissing": False
                }

        # 2. Derive USP mathematically if MRP and Net Qty are present
        if mrp_item and not mrp_item.get("isMissing") and net_qty_item and not net_qty_item.get("isMissing"):
            mrp_val = mrp_item.get("parsedValue")
            raw_qty = str(net_qty_item.get("parsedValue", ""))
            
            qty_match = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*(g|kg|ml|l|N|gms|units?)', raw_qty, re.IGNORECASE)
            if isinstance(mrp_val, (int, float)) and qty_match:
                num = float(qty_match.group(1))
                unit = qty_match.group(2).lower()
                if num > 0:
                    unit_price = mrp_val / num
                    usp_str = f"₹ {unit_price:.2f} per {unit}"
                    return {
                        "id": "ext_usp",
                        "category": "UNIT_SALE_PRICE",
                        "fieldName": "Unit Sale Price (USP)",
                        "rawValue": f"Calculated USP: {usp_str}",
                        "parsedValue": usp_str,
                        "confidence": 92.0,
                        "boundingBox": {**net_qty_item.get("boundingBox", {"x": 30.0, "y": 68.0, "width": 45.0, "height": 4.0}), "label": "Unit Sale Price"},
                        "isMissing": False
                    }

        return {
            "id": "ext_usp",
            "category": "UNIT_SALE_PRICE",
            "fieldName": "Unit Sale Price (USP)",
            "rawValue": "NOT DETECTED",
            "parsedValue": None,
            "confidence": 0.0,
            "isMissing": True
        }

    @staticmethod
    def _find_mfg_date(ocr_items: List[Dict[str, Any]], full_text: str) -> Dict[str, Any]:
        # Collect all dates found on label
        dates = []
        for item in ocr_items:
            dm = re.search(r'\b([0-9]{2}[/\-][0-9]{2}[/\-][0-9]{2,4})\b', item.get("text", ""))
            if dm:
                dates.append((dm.group(1), item))

        # Check if Date of Packaging / Mfg is present
        has_pkg_indicator = any(re.search(r'date\s*of\s*(?:packaging|packing)|mfg|pkd|packed|manufactured', item.get("text", ""), re.IGNORECASE) for item in ocr_items)
        
        if dates and has_pkg_indicator:
            # The earliest date or first date is the packaging date
            first_date, item = dates[0]
            return {
                "id": "ext_4",
                "category": "DATE_MFG_PACK_IMPORT",
                "fieldName": "Date of Mfg / Packing",
                "rawValue": f"Date of Packaging: {first_date}",
                "parsedValue": first_date,
                "confidence": 96.0,
                "boundingBox": {**item["bbox"], "label": "Mfg Date"},
                "isMissing": False
            }

        # General regex in full text
        match = re.search(r'(?:date\s*of\s*(?:packaging|packing)|mfg|pkd|packed)\s*[:\.]?\s*([0-9]{2}[/\-][0-9]{2}[/\-][0-9]{2,4})', full_text, re.IGNORECASE)
        if match:
            val = match.group(1)
            return {
                "id": "ext_4",
                "category": "DATE_MFG_PACK_IMPORT",
                "fieldName": "Date of Mfg / Packing",
                "rawValue": match.group(0),
                "parsedValue": val,
                "confidence": 92.0,
                "boundingBox": {"x": 30.0, "y": 70.0, "width": 30.0, "height": 4.0, "label": "Mfg Date"},
                "isMissing": False
            }

        return {
            "id": "ext_4",
            "category": "DATE_MFG_PACK_IMPORT",
            "fieldName": "Date of Mfg / Packing",
            "rawValue": "NOT DETECTED",
            "parsedValue": None,
            "confidence": 0.0,
            "isMissing": True
        }

    @staticmethod
    def _find_expiry_date(ocr_items: List[Dict[str, Any]], full_text: str) -> Dict[str, Any]:
        # Collect all dates found on label
        dates = []
        for item in ocr_items:
            dm = re.search(r'\b([0-9]{2}[/\-][0-9]{2}[/\-][0-9]{2,4})\b', item.get("text", ""))
            if dm:
                dates.append((dm.group(1), item))

        has_exp_indicator = any(re.search(r'use\s*by|best\s*before|expiry|exp\.?\s*date', item.get("text", ""), re.IGNORECASE) for item in ocr_items)

        if dates and has_exp_indicator:
            # If multiple dates, the later / second date is the expiry/use by date
            exp_date, item = dates[-1] if len(dates) > 1 else dates[0]
            return {
                "id": "ext_5",
                "category": "BEST_BEFORE_EXPIRY",
                "fieldName": "Expiry / Best Before Date",
                "rawValue": f"Use By: {exp_date}",
                "parsedValue": exp_date,
                "confidence": 95.0,
                "boundingBox": {**item["bbox"], "label": "Expiry Date"},
                "isMissing": False
            }

        # Check for months duration e.g. "12 months"
        dur_match = re.search(r'([0-9]+\s*months)', full_text, re.IGNORECASE)
        if dur_match and has_exp_indicator:
            val = dur_match.group(1)
            return {
                "id": "ext_5",
                "category": "BEST_BEFORE_EXPIRY",
                "fieldName": "Expiry / Best Before Date",
                "rawValue": f"Best Before: {val}",
                "parsedValue": val,
                "confidence": 93.0,
                "boundingBox": {"x": 62.0, "y": 70.0, "width": 30.0, "height": 4.0, "label": "Expiry Date"},
                "isMissing": False
            }

        return {
            "id": "ext_5",
            "category": "BEST_BEFORE_EXPIRY",
            "fieldName": "Expiry / Best Before Date",
            "rawValue": "NOT DETECTED",
            "parsedValue": None,
            "confidence": 0.0,
            "isMissing": True
        }

    @staticmethod
    def _find_manufacturer_details(ocr_items: List[Dict[str, Any]], full_text: str) -> Dict[str, Any]:
        # 1. Search item by item for marketer / manufacturer details
        for i, item in enumerate(ocr_items):
            t = item.get("text", "")
            if re.search(r'mkt\.?\s*by|mfd\.?\s*by|marketed\s*by|manufactured\s*by|packed\s*by|consumer\s*products|pvt\.?\s*ltd|limited', t, re.IGNORECASE):
                # Build complete details with following address items
                parts = [t.strip()]
                for offset in range(1, 4):
                    if i + offset < len(ocr_items):
                        cand = ocr_items[i + offset].get("text", "").strip()
                        if re.search(r'road|street|west\s*bengal|bengaluru|kolkata|delhi|mumbai|pin|\b[0-9]{6}\b|lic\.?\s*no', cand, re.IGNORECASE):
                            parts.append(cand)
                
                full_val = ", ".join(parts)
                return {
                    "id": "ext_6",
                    "category": "MANUFACTURER_PACKER_IMPORTER",
                    "fieldName": "Manufacturer / Packer / Importer Details",
                    "rawValue": full_val,
                    "parsedValue": full_val,
                    "confidence": 95.0,
                    "boundingBox": {**item["bbox"], "label": "Manufacturer"},
                    "isMissing": False
                }

        # 2. General regex search
        pattern = r'(?:mfd\s*by|manufactured\s*by|packed\s*by|marketed\s*by|mkt\s*by)\s*[:\.]?\s*([A-Za-z0-9\s,\.\-\/]+(?:pin|\d{6})?)'
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            val = match.group(1).strip()
            return {
                "id": "ext_6",
                "category": "MANUFACTURER_PACKER_IMPORTER",
                "fieldName": "Manufacturer / Packer / Importer Details",
                "rawValue": match.group(0),
                "parsedValue": val,
                "confidence": 92.0,
                "boundingBox": {"x": 30.0, "y": 75.0, "width": 65.0, "height": 5.5, "label": "Manufacturer"},
                "isMissing": False
            }

        return {
            "id": "ext_6",
            "category": "MANUFACTURER_PACKER_IMPORTER",
            "fieldName": "Manufacturer / Packer / Importer Details",
            "rawValue": "NOT DETECTED",
            "parsedValue": None,
            "confidence": 0.0,
            "isMissing": True
        }

    @staticmethod
    def _find_consumer_care(ocr_items: List[Dict[str, Any]], full_text: str) -> Dict[str, Any]:
        # 1. Search item by item for Consumer Care indicators (Toll free number, Email, Address)
        care_items = []
        best_bbox = {"x": 30.0, "y": 82.0, "width": 65.0, "height": 5.5}
        for item in ocr_items:
            t = item.get("text", "")
            if re.search(r'toll\s*free|1800|\bcare@|consumer\s*care|customer\s*care|\bhelpline\b', t, re.IGNORECASE):
                care_items.append(t.strip())
                best_bbox = item["bbox"]

        if care_items:
            combined = ", ".join(care_items)
            return {
                "id": "ext_7",
                "category": "CONSUMER_CARE",
                "fieldName": "Consumer Care Contact Details",
                "rawValue": combined,
                "parsedValue": combined,
                "confidence": 95.0,
                "boundingBox": {**best_bbox, "label": "Consumer Care"},
                "isMissing": False
            }

        # 2. General regex search
        pattern = r'(?:consumer\s*care|helpline|customer\s*care)\s*[:\.]?\s*([A-Za-z0-9\s,\.\-\@]+)'
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            val = match.group(1).strip()
            return {
                "id": "ext_7",
                "category": "CONSUMER_CARE",
                "fieldName": "Consumer Care Contact Details",
                "rawValue": match.group(0),
                "parsedValue": val,
                "confidence": 92.0,
                "boundingBox": {"x": 30.0, "y": 82.0, "width": 65.0, "height": 5.5, "label": "Consumer Care"},
                "isMissing": False
            }

        return {
            "id": "ext_7",
            "category": "CONSUMER_CARE",
            "fieldName": "Consumer Care Contact Details",
            "rawValue": "NOT DETECTED",
            "parsedValue": None,
            "confidence": 0.0,
            "isMissing": True
        }

    @staticmethod
    def _find_country_of_origin(ocr_items: List[Dict[str, Any]], full_text: str) -> Dict[str, Any]:
        pattern = r'(?:country\s*of\s*origin|made\s*in|product\s*of)\s*[:\.]?\s*([A-Za-z]+)'
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            val = match.group(1).strip()
            bbox = {"x": 30.0, "y": 88.0, "width": 40.0, "height": 4.0}
            for item in ocr_items:
                if "origin" in item.get("text", "").lower() or "made in" in item.get("text", "").lower():
                    bbox = item["bbox"]
                    break
            return {
                "id": "ext_8",
                "category": "COUNTRY_OF_ORIGIN",
                "fieldName": "Country of Origin",
                "rawValue": f"Country of Origin: {val}",
                "parsedValue": val,
                "confidence": 95.0,
                "boundingBox": {**bbox, "label": "Country of Origin"},
                "isMissing": False
            }

        return {
            "id": "ext_8",
            "category": "COUNTRY_OF_ORIGIN",
            "fieldName": "Country of Origin",
            "rawValue": "NOT DETECTED",
            "parsedValue": None,
            "confidence": 0.0,
            "isMissing": True
        }

    @staticmethod
    def merge_ai_declarations(
        extracted_fields: List[Dict[str, Any]], 
        ai_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Merges AI-assisted interpretation (from Ox Alpha) into extracted_fields.
        Only updates fields that are missing or low-confidence, preserving bounding boxes where possible.
        Does not invent values; if a field is listed in uncertain_fields or empty, it is left missing.
        """
        if not ai_data:
            return extracted_fields

        uncertain_list = [u.lower().strip() for u in ai_data.get("uncertain_fields", []) if isinstance(u, str)]

        updated_fields = []
        for field in extracted_fields:
            cat = field.get("category")
            # 1. Manufacturer
            if cat == "MANUFACTURER_PACKER_IMPORTER":
                mfr = ai_data.get("manufacturer_details")
                if mfr and str(mfr).strip() and "manufacturer_details" not in uncertain_list:
                    if field.get("isMissing") or field.get("confidence", 0) < 75:
                        clean_mfr = str(mfr).strip()
                        field["rawValue"] = clean_mfr
                        field["parsedValue"] = clean_mfr
                        field["confidence"] = 92.0
                        field["isMissing"] = False
                        if "boundingBox" not in field:
                            field["boundingBox"] = {"x": 25.0, "y": 20.0, "width": 50.0, "height": 8.0, "label": "Manufacturer"}

            # 2. Commodity Name
            elif cat == "COMMODITY_NAME":
                cmd = ai_data.get("commodity_name")
                if cmd and str(cmd).strip() and "commodity_name" not in uncertain_list:
                    if field.get("isMissing") or field.get("confidence", 0) < 75:
                        clean_cmd = str(cmd).strip()
                        field["rawValue"] = clean_cmd
                        field["parsedValue"] = clean_cmd
                        field["confidence"] = 92.0
                        field["isMissing"] = False
                        if "boundingBox" not in field:
                            field["boundingBox"] = {"x": 25.0, "y": 35.0, "width": 50.0, "height": 6.0, "label": "Commodity"}

            # 3. Net Quantity
            elif cat == "NET_QUANTITY":
                net = ai_data.get("net_quantity")
                if net and str(net).strip() and "net_quantity" not in uncertain_list:
                    if field.get("isMissing") or field.get("confidence", 0) < 75:
                        clean_net = str(net).strip()
                        field["rawValue"] = clean_net
                        field["parsedValue"] = clean_net
                        field["confidence"] = 92.0
                        field["isMissing"] = False
                        if "boundingBox" not in field:
                            field["boundingBox"] = {"x": 25.0, "y": 55.0, "width": 30.0, "height": 5.0, "label": "Net Quantity"}

            # 4. MRP
            elif cat == "MAXIMUM_RETAIL_PRICE":
                mrp_val = ai_data.get("mrp")
                if mrp_val and str(mrp_val).strip() and "mrp" not in uncertain_list:
                    if field.get("isMissing") or field.get("confidence", 0) < 75:
                        clean_mrp = str(mrp_val).strip()
                        field["rawValue"] = f"MRP Rs {clean_mrp} (incl. of all taxes)"
                        num_match = re.search(r'[0-9]+(?:\.[0-9]+)?', clean_mrp)
                        field["parsedValue"] = float(num_match.group(0)) if num_match else clean_mrp
                        field["confidence"] = 92.0
                        field["isMissing"] = False
                        if "boundingBox" not in field:
                            field["boundingBox"] = {"x": 25.0, "y": 62.0, "width": 35.0, "height": 5.0, "label": "MRP"}

            # 5. Date of Mfg / Packing
            elif cat == "DATE_MFG_PACK_IMPORT":
                pkg_date = ai_data.get("date_of_manufacture_or_packing")
                if pkg_date and str(pkg_date).strip() and "date_of_manufacture_or_packing" not in uncertain_list:
                    if field.get("isMissing") or field.get("confidence", 0) < 75:
                        clean_date = str(pkg_date).strip()
                        field["rawValue"] = f"Date of Packaging: {clean_date}"
                        field["parsedValue"] = clean_date
                        field["confidence"] = 92.0
                        field["isMissing"] = False
                        if "boundingBox" not in field:
                            field["boundingBox"] = {"x": 25.0, "y": 70.0, "width": 30.0, "height": 4.0, "label": "Mfg Date"}

            # 6. Consumer Care
            elif cat == "CONSUMER_CARE":
                cc = ai_data.get("consumer_care")
                if cc and str(cc).strip() and "consumer_care" not in uncertain_list:
                    if field.get("isMissing") or field.get("confidence", 0) < 75:
                        clean_cc = str(cc).strip()
                        field["rawValue"] = clean_cc
                        field["parsedValue"] = clean_cc
                        field["confidence"] = 92.0
                        field["isMissing"] = False
                        if "boundingBox" not in field:
                            field["boundingBox"] = {"x": 25.0, "y": 80.0, "width": 55.0, "height": 6.0, "label": "Consumer Care"}

            # 7. Country of Origin
            elif cat == "COUNTRY_OF_ORIGIN":
                origin = ai_data.get("country_of_origin")
                if origin and str(origin).strip() and "country_of_origin" not in uncertain_list:
                    if field.get("isMissing") or field.get("confidence", 0) < 75:
                        clean_origin = str(origin).strip()
                        field["rawValue"] = f"Country of Origin: {clean_origin}"
                        field["parsedValue"] = clean_origin
                        field["confidence"] = 92.0
                        field["isMissing"] = False
                        if "boundingBox" not in field:
                            field["boundingBox"] = {"x": 25.0, "y": 88.0, "width": 35.0, "height": 4.0, "label": "Country of Origin"}

            updated_fields.append(field)
        return updated_fields

    merge_gemini_declarations = merge_ai_declarations

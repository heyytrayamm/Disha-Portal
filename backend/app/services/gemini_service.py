import os
import json
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("disha.gemini")

class StructuredLabelDeclarations(BaseModel):
    manufacturer_details: Optional[str] = Field(None, description="Name and address of manufacturer, packer, or marketer")
    commodity_name: Optional[str] = Field(None, description="Generic or common name of the commodity")
    net_quantity: Optional[str] = Field(None, description="Net weight, volume, or count with units (e.g. '14 g', '10 UNITS', '500 g')")
    date_of_manufacture_or_packing: Optional[str] = Field(None, description="Date of packaging, manufacturing, or import")
    mrp: Optional[str] = Field(None, description="Maximum Retail Price inclusive of all taxes")
    consumer_care: Optional[str] = Field(None, description="Customer care helpline phone, email, and address")
    country_of_origin: Optional[str] = Field(None, description="Country of origin if declared")
    other_declarations: List[str] = Field(default_factory=list, description="Other statutory declarations like expiry date, batch number, FSSAI lic")
    uncertain_fields: List[str] = Field(default_factory=list, description="Fields that could not be reliably extracted from text")

class GeminiInterpretationService:
    """
    AI-Assisted interpretation layer using official Google GenAI SDK.
    Strictly used for text normalization and structured extraction.
    NEVER makes final legal compliance decisions.
    """

    def __init__(self):
        self._api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self._client = None
        if self._api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self._api_key)
                logger.info("[GEMINI_INIT] Google GenAI client initialized successfully.")
            except Exception as e:
                logger.warning(f"[GEMINI_INIT] Could not initialize Google GenAI client: {e}")
        else:
            logger.info("[GEMINI_INIT] GEMINI_API_KEY not configured. Deterministic regex parser active.")

    @property
    def is_available(self) -> bool:
        return self._client is not None and bool(self._api_key)

    def should_consult_gemini(self, extracted_fields: List[Dict[str, Any]]) -> bool:
        """
        Cost control strategy:
        Only consult Gemini if key statutory fields are missing or have low confidence.
        If deterministic OCR already captured mandatory fields cleanly, skip AI call.
        """
        if not self.is_available:
            return False

        # Key statutory fields that warrant AI interpretation if missing
        vital_categories = {"MANUFACTURER_PACKER_IMPORTER", "MAXIMUM_RETAIL_PRICE", "NET_QUANTITY", "DATE_MFG_PACK_IMPORT"}
        missing_vitals = sum(
            1 for f in extracted_fields 
            if f.get("category") in vital_categories and f.get("isMissing", True)
        )
        # If 2 or more vital fields are missing, consult Gemini
        return missing_vitals >= 2

    def interpret_declarations_from_ocr(
        self, 
        full_text: str, 
        ocr_items: List[Dict[str, Any]],
        image_bytes: Optional[bytes] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Interprets and structures declarations from OCR text.
        Sends text first to reduce cost and latency.
        """
        if not self.is_available or not full_text.strip():
            return None

        prompt = (
            "You are an expert Legal Metrology statutory declaration parser for packaged commodities in India.\n"
            "Your task is strictly to extract, disambiguate, and normalize mandatory declarations from this OCR text.\n"
            "DO NOT evaluate legal compliance or decide PASS/FAIL. Return only the extracted factual data.\n\n"
            f"--- OCR TEXT FROM PACKAGING LABEL ---\n{full_text}\n-------------------------------------\n\n"
            "Extract:\n"
            "- manufacturer_details: Full name and address of manufacturer / packer / marketer (e.g. 'Tata Consumer Products Limited, Kolkata - 700020')\n"
            "- commodity_name: Generic or common name of product (e.g. 'Flavoured Tea', 'Green Tea', 'Chia Seeds')\n"
            "- net_quantity: Net quantity with units (e.g. '14 g', '10 UNITS', '100 g', '500 g')\n"
            "- date_of_manufacture_or_packing: Date of packaging or mfg (e.g. '27/05/26' or '15-07-2026')\n"
            "- mrp: Retail price number (e.g. '75.00' or '150.00')\n"
            "- consumer_care: Consumer helpline phone number and email (e.g. '1800 108 4488, care@tataconsumer.com')\n"
            "- country_of_origin: Country of origin if stated\n"
            "- other_declarations: Expiry date, use by date, batch number, FSSAI license\n"
            "- uncertain_fields: Any field that was partially cut off or ambiguous\n"
        )

        try:
            from google.genai import types
            logger.info(f"[GEMINI_QUERY] Requesting structured declaration interpretation (text len: {len(full_text)})")
            
            response = self._client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=StructuredLabelDeclarations,
                    temperature=0.1
                )
            )

            if response and response.text:
                data = json.loads(response.text)
                logger.info(f"[GEMINI_SUCCESS] Structured interpretation received: {list(data.keys())}")
                return data

        except Exception as e:
            logger.warning(f"[GEMINI_ERROR] AI interpretation failed: {e}. Falling back to deterministic rules.")
            return None

        return None

gemini_service = GeminiInterpretationService()

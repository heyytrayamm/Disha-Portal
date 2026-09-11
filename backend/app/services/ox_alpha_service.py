import os
import json
import re
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("disha.ox_alpha")

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


class OxAlphaService:
    """
    Ox Alpha AI-assisted interpretation & normalization layer.
    Uses Ox Alpha's OpenAI-compatible API endpoint:
      Base URL: https://oxalpha.run/api/v1
      Model: ox-alpha
    
    CRITICAL ARCHITECTURAL CONSTRAINTS:
    - Strictly used AFTER OCR for declaration interpretation and text normalization.
    - NEVER evaluates legal compliance or decides PASS / FAIL.
    - Never invents or fabricates data not in OCR text.
    - NEVER sends image unless explicitly needed.
    """

    def __init__(self):
        self._api_key = os.getenv("OX_ALPHA_API_KEY", "").strip()
        self._base_url = os.getenv("OX_ALPHA_BASE_URL", "https://oxalpha.run/api/v1").rstrip("/")
        self._model = os.getenv("OX_ALPHA_MODEL", "ox-alpha")
        self._client = None

        if self._api_key:
            try:
                # pyrefly: ignore [missing-import]
                from openai import OpenAI
                self._client = OpenAI(
                    api_key=self._api_key,
                    base_url=self._base_url,
                    timeout=30.0
                )
                logger.info("[OX_ALPHA_INIT] Ox Alpha OpenAI-compatible client initialized successfully.")
            except Exception as e:
                logger.warning(f"[OX_ALPHA_INIT] Could not initialize OpenAI client: {e}. Fallback httpx active.")
        else:
            logger.info("[OX_ALPHA_INIT] OX_ALPHA_API_KEY not configured. Deterministic regex parser active.")

    @property
    def is_available(self) -> bool:
        return bool(self._api_key)

    @property
    def provider_name(self) -> str:
        return f"Ox Alpha ({self._base_url} - model: {self._model})"

    def should_consult_ai(
        self,
        extracted_fields: List[Dict[str, Any]],
        full_text: str = "",
        ocr_items: Optional[List[Dict[str, Any]]] = None
    ) -> bool:
        """
        Cost and Latency Control Gate:
        Only consult Ox Alpha if deterministic OCR field extraction is ambiguous or incomplete.
        If deterministic OCR already captured key mandatory fields cleanly with high confidence,
        skip the AI call to minimize latency and token costs.
        """
        if not self.is_available:
            return False

        if not full_text or len(full_text.strip()) < 10:
            return False

        vital_categories = {
            "MANUFACTURER_PACKER_IMPORTER",
            "MAXIMUM_RETAIL_PRICE",
            "NET_QUANTITY",
            "DATE_MFG_PACK_IMPORT",
            "COMMODITY_NAME",
            "CONSUMER_CARE"
        }

        # Count missing or low-confidence vital fields
        missing_vitals = sum(
            1 for f in extracted_fields
            if f.get("category") in vital_categories and (f.get("isMissing", True) or f.get("confidence", 0) < 75)
        )

        # If 2 or more vital fields are missing or uncertain, consult Ox Alpha
        if missing_vitals >= 2:
            return True

        # Check if manufacturer address is missing postal code or incomplete
        mfr_field = next((f for f in extracted_fields if f.get("category") == "MANUFACTURER_PACKER_IMPORTER"), None)
        if mfr_field and not mfr_field.get("isMissing"):
            val = str(mfr_field.get("rawValue", ""))
            has_pin = bool(re.search(r'\b\d{6}\b|pin', val, re.IGNORECASE))
            if not has_pin:
                return True

        return False

    def interpret_declarations_from_ocr(
        self,
        full_text: str,
        ocr_items: Optional[List[Dict[str, Any]]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Sends extracted OCR text to Ox Alpha for normalization and structured field extraction.
        DOES NOT send the image (text-only processing to reduce token cost and latency).
        Enforces strict JSON output matching statutory declaration schema.
        """
        if not self.is_available or not full_text.strip():
            return None

        system_prompt = (
            "You are an expert Legal Metrology statutory declaration parser for packaged commodities in India.\n"
            "Your task is strictly to extract, disambiguate, and normalize mandatory declarations from the provided OCR text.\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. DO NOT evaluate legal compliance, DO NOT assign scores, and DO NOT decide PASS/FAIL.\n"
            "2. Return ONLY factual text extracted from the provided OCR input.\n"
            "3. DO NOT invent, assume, or hallucinate any values. If a field is not present in the OCR text, return null or empty string \"\" and add the field name to \"uncertain_fields\".\n"
            "4. Output MUST be valid JSON only with NO surrounding markdown backticks or commentary.\n"
            "5. Expected JSON structure:\n"
            "{\n"
            '  "manufacturer_details": "",\n'
            '  "commodity_name": "",\n'
            '  "net_quantity": "",\n'
            '  "date_of_manufacture_or_packing": "",\n'
            '  "mrp": "",\n'
            '  "consumer_care": "",\n'
            '  "country_of_origin": "",\n'
            '  "other_declarations": [],\n'
            '  "uncertain_fields": []\n'
            "}"
        )

        user_prompt = (
            f"--- OCR TEXT FROM PACKAGING LABEL ---\n"
            f"{full_text}\n"
            f"-------------------------------------\n"
            f"Extract all statutory declarations into the specified JSON structure."
        )

        logger.info(
            f"[OX_ALPHA_QUERY] Calling Ox Alpha ({self._model}) with OCR text length: {len(full_text)}"
        )

        # 1. Primary: Use OpenAI client if available
        if self._client:
            try:
                response = self._client.chat.completions.create(
                    model=self._model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.0,
                    response_format={"type": "json_object"}
                )
                if response and response.choices and len(response.choices) > 0:
                    raw_content = response.choices[0].message.content or ""
                    parsed = self._clean_and_parse_json(raw_content)
                    if parsed:
                        logger.info(f"[OX_ALPHA_SUCCESS] Structured interpretation received. Fields: {list(parsed.keys())}")
                        return parsed
            except Exception as e:
                logger.warning(f"[OX_ALPHA_ERROR] OpenAI client call failed: {e}. Attempting direct HTTP request.")

        # 2. Direct HTTP request fallback (httpx)
        try:
            import httpx
            headers = {
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": self._model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.0,
                "response_format": {"type": "json_object"}
            }
            url = f"{self._base_url}/chat/completions"
            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        raw_content = choices[0].get("message", {}).get("content", "")
                        parsed = self._clean_and_parse_json(raw_content)
                        if parsed:
                            logger.info(f"[OX_ALPHA_SUCCESS] Structured interpretation received via HTTP. Fields: {list(parsed.keys())}")
                            return parsed
                else:
                    logger.warning(f"[OX_ALPHA_ERROR] Ox Alpha HTTP error {res.status_code}: {res.text[:200]}")
        except Exception as e:
            logger.warning(f"[OX_ALPHA_ERROR] Direct HTTP request failed: {e}")

        logger.info("[OX_ALPHA_FALLBACK] Ox Alpha interpretation skipped or failed; proceeding with deterministic OCR fields.")
        return None

    @staticmethod
    def _clean_and_parse_json(raw_text: str) -> Optional[Dict[str, Any]]:
        """
        Safely cleans and parses JSON response from AI model, removing any accidental
        markdown code fences (```json ... ```) or whitespace.
        """
        if not raw_text or not raw_text.strip():
            return None

        cleaned = raw_text.strip()
        # Strip markdown code fences if model included them
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
            cleaned = cleaned.strip()

        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError as err:
            logger.warning(f"[OX_ALPHA_PARSE_ERROR] Failed to decode JSON from AI response: {err}")

        return None


# Global singleton instance
ox_alpha_service = OxAlphaService()

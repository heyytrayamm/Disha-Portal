from collections.abc import Set
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
    Ox Alpha AI-assisted candidate disambiguation & interpretation layer.
    Uses Ox Alpha's OpenAI-compatible API endpoint:
      Base URL: https://oxalpha.run/api/v1
      Model: ox-alpha
    
    CRITICAL ARCHITECTURAL CONSTRAINTS:
    - Strictly used AFTER OCR for candidate disambiguation and declaration interpretation.
    - NEVER evaluates legal compliance or decides PASS / FAIL.
    - May ONLY select from supplied OCR candidates and must NEVER invent a value.
    - If Ox Alpha is uncertain, marks the field uncertain/missing rather than guessing.
    - Cost-gated: only triggered for genuine ambiguities or missing vitals, and batched into one request.
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
        ocr_items: Optional[List[Dict[str, Any]]] = None,
        ambiguity_report: Optional[Any] = None
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

        # 1. Primary trigger: Specific field ambiguity detected by AmbiguityDetector
        if ambiguity_report is not None and getattr(ambiguity_report, "has_ambiguity", False):
            return True

        # 2. Secondary trigger: Vital statutory fields missing on genuine label
        vital_categories = {
            "MANUFACTURER_PACKER_IMPORTER",
            "MAXIMUM_RETAIL_PRICE",
            "NET_QUANTITY",
            "DATE_MFG_PACK_IMPORT",
            "COMMODITY_NAME",
            "CONSUMER_CARE"
        }

        missing_vitals = sum(
            1 for f in extracted_fields
            if f.get("category") in vital_categories and (f.get("isMissing", True) or f.get("confidence", 0) < 75)
        )

        if missing_vitals >= 2:
            return True

        return False

    def resolve_ambiguities(
        self,
        ambiguity_report: Any,
        ocr_items: Optional[List[Dict[str, Any]]] = None,
        full_text: str = ""
    ) -> Optional[Dict[str, Any]]:
        """
        Targeted Ox Alpha Candidate Disambiguation:
        Batches all ambiguous fields into a single structured prompt.
        Supplies only the evaluated OCR candidate tokens per field.
        Strictly constrains the model to pick from supplied candidate IDs or return null.
        Validates the output to ensure NO invented values are accepted.
        """
        if not self.is_available or not ambiguity_report or not ambiguity_report.has_ambiguity:
            return None

        # Build candidate prompt sections
        fields_prompt_lines = []
        valid_candidate_ids: Dict[str, Set[str]] = {}

        for cat, cands in ambiguity_report.field_candidates.items():
            valid_candidate_ids[cat] = set()
            fields_prompt_lines.append(f"\nField: {cat}")
            for c in cands:
                c_id = c.get("id")
                raw_t = c.get("raw_text")
                parsed_val = c.get("parsed_value")
                box = c.get("bbox", {})
                valid_candidate_ids[cat].add(c_id)
                fields_prompt_lines.append(
                    f"  - Candidate ID: \"{c_id}\" | Text: \"{raw_t}\" | Value: \"{parsed_val}\" | Position: (x={box.get('x', 0):.1f}, y={box.get('y', 0):.1f}, w={box.get('width', 0):.1f}, h={box.get('height', 0):.1f})"
                )

        candidate_section = "\n".join(fields_prompt_lines)

        system_prompt = (
            "You are an expert Legal Metrology verification assistant for packaged commodities in India.\n"
            "Your task is strictly to disambiguate packaging label declarations by selecting from the provided OCR candidates.\n\n"
            "STRICT CONSTRAINTS:\n"
            "1. For each ambiguous field, you MUST ONLY select one of the provided Candidate IDs (e.g. \"cand_mrp_1\").\n"
            "2. Under NO circumstances may you invent, fabricate, calculate, or alter any text or number.\n"
            "3. If none of the provided candidates correctly represent the field, or if you are uncertain, you MUST set \"selected_candidate_id\": null and list the field in \"uncertain_fields\".\n"
            "4. DO NOT evaluate legal compliance or decide PASS / FAIL.\n"
            "5. Output MUST be valid JSON only with NO markdown fences or additional commentary.\n"
            "6. Output JSON schema:\n"
            "{\n"
            '  "resolutions": {\n'
            '    "<FIELD_CATEGORY>": {\n'
            '      "selected_candidate_id": "<candidate_id_or_null>",\n'
            '      "reason": "<brief factual explanation based on surrounding label text>"\n'
            "    }\n"
            "  },\n"
            '  "uncertain_fields": []\n'
            "}"
        )

        user_prompt = (
            f"--- FULL OCR LABEL CONTEXT ---\n"
            f"{full_text}\n\n"
            f"--- AMBIGUOUS FIELDS AND OCR CANDIDATES ---\n"
            f"{candidate_section}\n\n"
            f"Select the single most accurate candidate ID for each field from the provided candidates only."
        )

        logger.info(f"[OX_ALPHA_DISAMBIGUATE] Querying Ox Alpha for {len(ambiguity_report.ambiguous_fields)} ambiguous fields.")

        raw_content = None

        # 1. Primary: Use OpenAI client
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
                if response and response.choices:
                    raw_content = response.choices[0].message.content or ""
            except Exception as e:
                logger.warning(f"[OX_ALPHA_DISAMBIGUATE_ERROR] OpenAI client call failed: {e}. Falling back to httpx.")

        # 2. HTTP fallback
        if not raw_content:
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
            except Exception as e:
                logger.warning(f"[OX_ALPHA_DISAMBIGUATE_ERROR] Direct HTTP request failed: {e}")

        if not raw_content:
            logger.info("[OX_ALPHA_FALLBACK] Ox Alpha disambiguation skipped; keeping deterministic candidates.")
            return None

        parsed = self._clean_and_parse_json(raw_content)
        if not parsed:
            return None

        # STRICT VALIDATION: Ensure model did not hallucinate or invent Candidate IDs
        validated_resolutions: Dict[str, Any] = {"resolutions": {}, "uncertain_fields": []}
        res_map = parsed.get("resolutions", {})
        uncertain_list = [str(u).upper().strip() for u in parsed.get("uncertain_fields", [])]

        for cat, decision in res_map.items():
            cat_upper = cat.upper().strip()
            chosen_id = decision.get("selected_candidate_id") if isinstance(decision, dict) else None
            reason = decision.get("reason", "Ox Alpha verified") if isinstance(decision, dict) else "Ox Alpha verified"

            # Check if model marked it uncertain or null
            if not chosen_id or chosen_id == "null" or cat_upper in uncertain_list:
                validated_resolutions["resolutions"][cat_upper] = {
                    "selected_candidate_id": None,
                    "reason": reason
                }
                validated_resolutions["uncertain_fields"].append(cat_upper)
                continue

            # Verify candidate ID exists in the supplied candidates for that field
            allowed_ids = valid_candidate_ids.get(cat_upper, set())
            if chosen_id in allowed_ids:
                validated_resolutions["resolutions"][cat_upper] = {
                    "selected_candidate_id": chosen_id,
                    "reason": reason
                }
            else:
                logger.warning(f"[OX_ALPHA_REJECT] Rejected hallucinated/invalid candidate ID '{chosen_id}' for field '{cat}'. Allowed: {allowed_ids}")
                # Reject invented candidate ID, do not accept fabricated data
                validated_resolutions["resolutions"][cat_upper] = {
                    "selected_candidate_id": None,
                    "reason": f"Rejected invalid candidate ID '{chosen_id}' not in OCR candidates."
                }
                validated_resolutions["uncertain_fields"].append(cat_upper)

        logger.info(f"[OX_ALPHA_DISAMBIGUATE_SUCCESS] Resolved {len(validated_resolutions['resolutions'])} fields.")
        return validated_resolutions

    def interpret_declarations_from_ocr(
        self,
        full_text: str,
        ocr_items: Optional[List[Dict[str, Any]]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Legacy declaration interpretation method (kept for backward compatibility).
        Sends extracted OCR text to Ox Alpha for normalization and structured field extraction.
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

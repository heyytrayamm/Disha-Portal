import os
import shutil
import logging
import numpy as np
from typing import List, Dict, Any, Optional

from app.core.config import settings

logger = logging.getLogger("ocr_engine")

class OCREngine:
    """
    Real Dual OCR Engine:
    - Primary: PaddleOCR (or RapidOCR ONNX runtime using PP-OCRv4 models)
    - Fallback: PyTesseract
    - STRICT: Never produces mock, simulated, or hardcoded text.
    """

    def __init__(self):
        self.paddle_ocr = None
        self.rapid_ocr = None
        self.tesseract_available = False

        # 1. Attempt initializing native PaddleOCR
        try:
            from paddleocr import PaddleOCR
            self.paddle_ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
            logger.info("PaddleOCR engine initialized successfully.")
        except Exception as e:
            logger.info(f"Native PaddleOCR not loaded ({e}). Checking RapidOCR / Tesseract.")

        # 2. Attempt initializing RapidOCR (PaddleOCR PP-OCRv4 ONNX runtime engine)
        if not self.paddle_ocr:
            try:
                from rapidocr_onnxruntime import RapidOCR
                self.rapid_ocr = RapidOCR()
                logger.info("RapidOCR (PaddleOCR ONNX runtime) engine initialized successfully.")
            except Exception as e:
                logger.info(f"RapidOCR engine not available: {e}")

        # 3. Configure PyTesseract fallback
        try:
            import pytesseract

            # Auto-locate tesseract binary if not on PATH
            tesseract_cmd = settings.TESSERACT_CMD or shutil.which("tesseract")
            if not tesseract_cmd:
                potential_paths = [
                    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                    r"D:\Tesseract-OCR\tesseract.exe",
                    r"D:\temp\tesseract\tesseract.exe"
                ]
                for p in potential_paths:
                    if os.path.exists(p):
                        tesseract_cmd = p
                        break

            if tesseract_cmd:
                pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

            pytesseract.get_tesseract_version()
            self.tesseract_available = True
            logger.info(f"PyTesseract available at: {getattr(pytesseract.pytesseract, 'tesseract_cmd', 'PATH')}")
        except Exception as e:
            logger.warning(f"PyTesseract not available: {e}")

    def extract_text_and_boxes(self, img: np.ndarray, file_name: str = "") -> List[Dict[str, Any]]:
        """
        Runs real OCR on preprocessed image numpy array.
        Returns list of detected text boxes:
        [
          {"text": "MRP Rs. 150.00", "confidence": 97.5, "bbox": {"x": 10, "y": 20, "width": 50, "height": 8}}
        ]
        STRICT: Returns [] if nothing is readable. Never invents data.
        """
        h, w = img.shape[:2]
        ocr_items: List[Dict[str, Any]] = []
        engine_used = "NONE"

        # 1. Primary Engine: PaddleOCR (Native)
        if self.paddle_ocr:
            try:
                result = self.paddle_ocr.ocr(img, cls=True)
                if result and len(result) > 0 and result[0]:
                    for line in result[0]:
                        box, (text, conf) = line
                        text_str = str(text).strip()
                        if not text_str:
                            continue
                        xs = [pt[0] for pt in box]
                        ys = [pt[1] for pt in box]
                        min_x, max_x = max(0, min(xs)), min(w, max(xs))
                        min_y, max_y = max(0, min(ys)), min(h, max(ys))

                        ocr_items.append({
                            "text": text_str,
                            "confidence": round(float(conf) * 100, 1),
                            "bbox": {
                                "x": round((min_x / w) * 100, 2),
                                "y": round((min_y / h) * 100, 2),
                                "width": round(((max_x - min_x) / w) * 100, 2),
                                "height": round(((max_y - min_y) / h) * 100, 2)
                            }
                        })
                    if ocr_items:
                        engine_used = "PaddleOCR"
            except Exception as e:
                logger.error(f"PaddleOCR error during execution: {e}")

        # 2. Secondary Primary: RapidOCR (PaddleOCR ONNX Runtime)
        if not ocr_items and self.rapid_ocr:
            try:
                result, _ = self.rapid_ocr(img)
                if result:
                    for line in result:
                        # line format: [dt_boxes, text, score]
                        box, text, score = line[0], line[1], line[2]
                        text_str = str(text).strip()
                        if not text_str:
                            continue
                        xs = [pt[0] for pt in box]
                        ys = [pt[1] for pt in box]
                        min_x, max_x = max(0, min(xs)), min(w, max(xs))
                        min_y, max_y = max(0, min(ys)), min(h, max(ys))

                        ocr_items.append({
                            "text": text_str,
                            "confidence": round(float(score) * 100, 1),
                            "bbox": {
                                "x": round((min_x / w) * 100, 2),
                                "y": round((min_y / h) * 100, 2),
                                "width": round(((max_x - min_x) / w) * 100, 2),
                                "height": round(((max_y - min_y) / h) * 100, 2)
                            }
                        })
                    if ocr_items:
                        engine_used = "RapidOCR-Paddle"
            except Exception as e:
                logger.error(f"RapidOCR error during execution: {e}")

        # 3. Fallback Engine: PyTesseract
        if not ocr_items and self.tesseract_available:
            try:
                import pytesseract
                data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
                n_boxes = len(data.get('text', []))
                for i in range(n_boxes):
                    text = data['text'][i].strip()
                    conf = float(data['conf'][i])
                    if conf > 25 and len(text) > 1:
                        bx, by, bw, bh = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                        ocr_items.append({
                            "text": text,
                            "confidence": round(conf, 1),
                            "bbox": {
                                "x": round((bx / w) * 100, 2),
                                "y": round((by / h) * 100, 2),
                                "width": round((bw / w) * 100, 2),
                                "height": round((bh / h) * 100, 2)
                            }
                        })
                if ocr_items:
                    engine_used = "PyTesseract"
            except Exception as e:
                logger.error(f"PyTesseract error during execution: {e}")

        # Structured Development Logging (no credentials or secrets)
        full_text = " ".join(item["text"] for item in ocr_items)
        snippet = full_text[:100] if full_text else "(no text detected)"
        logger.info(
            f"[OCR_AUDIT] file='{file_name}' dims={w}x{h} engine={engine_used} "
            f"items_count={len(ocr_items)} text_len={len(full_text)} snippet='{snippet}'"
        )

        return ocr_items

ocr_engine = OCREngine()

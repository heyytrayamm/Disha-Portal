import cv2
import numpy as np
import base64
import os
import re
import urllib.request
from typing import Tuple, Dict, Any
from app.core.config import settings

class ImagePreprocessor:
    """
    OpenCV-based image preprocessing pipeline for packaging labels:
    - Grayscale conversion
    - Contrast Enhancement (CLAHE)
    - Edge-Preserving Noise Reduction (Bilateral Filter)
    - Binarization & Adaptive Thresholding (Otsu)
    - Deskewing & Orientation Correction
    """

    @staticmethod
    def decode_bytes_or_base64_or_path(image_input: Any) -> np.ndarray:
        """Decodes bytes, base64 string, or loads image file path into OpenCV BGR matrix."""
        if isinstance(image_input, bytes):
            np_arr = np.frombuffer(image_input, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("Failed to decode raw image bytes")
            return img

        if isinstance(image_input, str):
            if image_input.startswith("data:image") or ";base64," in image_input:
                base64_data = re.sub(r'^data:image/.+;base64,', '', image_input)
                img_bytes = base64.b64decode(base64_data)
                np_arr = np.frombuffer(img_bytes, np.uint8)
                img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                if img is None:
                    raise ValueError("Failed to decode base64 image data")
                return img
            else:
                target_path = image_input.strip()
                if "static/uploads/" in target_path:
                    fname = target_path.split("static/uploads/")[-1]
                    target_path = os.path.join(settings.UPLOAD_DIR, fname)
                elif target_path.startswith("http://") or target_path.startswith("https://"):
                    req = urllib.request.Request(target_path, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req, timeout=10) as response:
                        img_bytes = response.read()
                        np_arr = np.frombuffer(img_bytes, np.uint8)
                        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                        if img is None:
                            raise ValueError(f"Failed to decode image from URL: {image_input}")
                        return img
                
                img = cv2.imread(target_path, cv2.IMREAD_COLOR)
                if img is None:
                    raise ValueError(f"Image not found or unreadable: {image_input}")
                return img

        raise ValueError("Unsupported image input type")

    @staticmethod
    def encode_mat_to_base64(img: np.ndarray) -> str:
        """Converts OpenCV numpy image matrix to data URI base64 JPEG string."""
        success, buffer = cv2.imencode(".jpg", img)
        if not success:
            return ""
        b64_str = base64.b64encode(buffer).decode("utf-8")
        return f"data:image/jpeg;base64,{b64_str}"

    @staticmethod
    def preprocess_image(img: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Executes full OpenCV pipeline:
        1. Grayscale
        2. CLAHE (Contrast Limited Adaptive Histogram Equalization)
        3. Bilateral Filter for edge-preserving noise reduction
        4. Adaptive Otsu Binarization
        5. Deskewing via minimum area rectangle
        """
        binary, metadata, _ = ImagePreprocessor.preprocess_image_with_stages(img)
        return binary, metadata

    @staticmethod
    def preprocess_image_with_stages(img: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any], Dict[str, str]]:
        """
        Executes OpenCV pipeline and returns (final_binary, metadata, stages_base64_dict).
        Stages dict contains base64 representations of:
        - original
        - grayscale
        - clahe_enhanced
        - bilateral_denoised
        - otsu_binarized
        - deskewed
        """
        stages_b64 = {}
        stages_b64["original"] = ImagePreprocessor.encode_mat_to_base64(img)

        # 1. Grayscale
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img.copy()
        stages_b64["grayscale"] = ImagePreprocessor.encode_mat_to_base64(gray)

        # 2. Contrast enhancement via CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        stages_b64["clahe_enhanced"] = ImagePreprocessor.encode_mat_to_base64(enhanced)

        # 3. Edge-preserving Bilateral Filter
        denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)
        stages_b64["bilateral_denoised"] = ImagePreprocessor.encode_mat_to_base64(denoised)

        # 4. Otsu Adaptive Thresholding
        _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        stages_b64["otsu_binarized"] = ImagePreprocessor.encode_mat_to_base64(binary)

        # 5. Deskewing
        angle = 0.0
        deskewed = binary.copy()
        try:
            coords = np.column_stack(np.where(binary < 255))
            if len(coords) > 0:
                rect = cv2.minAreaRect(coords)
                angle = rect[-1]
                if angle < -45:
                    angle = -(90 + angle)
                else:
                    angle = -angle
                
                # Rotate if non-trivial skew detected
                if abs(angle) > 0.5 and abs(angle) < 45:
                    (h, w) = binary.shape[:2]
                    center = (w // 2, h // 2)
                    M = cv2.getRotationMatrix2D(center, angle, 1.0)
                    deskewed = cv2.warpAffine(binary, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        except Exception:
            angle = 0.0

        stages_b64["deskewed"] = ImagePreprocessor.encode_mat_to_base64(deskewed)

        metadata = {
            "original_width": img.shape[1],
            "original_height": img.shape[0],
            "channels": img.shape[2] if len(img.shape) == 3 else 1,
            "deskew_angle_deg": round(angle, 2),
            "clahe_applied": True,
            "bilateral_filtered": True,
            "otsu_applied": True,
            "stages_count": len(stages_b64)
        }

        return deskewed, metadata, stages_b64

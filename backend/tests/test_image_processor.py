import pytest
import numpy as np
import cv2
from app.services.image_processor import ImagePreprocessor

def test_preprocess_image_pipeline():
    # Create a synthetic 200x200 3-channel test image
    synthetic_img = np.ones((200, 200, 3), dtype=np.uint8) * 200
    cv2.putText(synthetic_img, "TEST LABEL", (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)

    binary, metadata = ImagePreprocessor.preprocess_image(synthetic_img)

    assert binary is not None
    assert binary.shape[0] == 200
    assert binary.shape[1] == 200
    assert metadata["clahe_applied"] is True
    assert metadata["otsu_applied"] is True

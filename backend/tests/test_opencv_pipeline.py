import numpy as np
import cv2

def test_opencv_preprocessing_upload(client):
    # 1. Create a synthetic test image using OpenCV
    canvas = np.ones((400, 600, 3), dtype=np.uint8) * 240
    cv2.putText(canvas, "COMMODITY: WHOLE WHEAT ATTA", (30, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    cv2.putText(canvas, "NET QUANTITY: 500 g", (30, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    cv2.putText(canvas, "MRP Rs. 150.00 (INCL. OF ALL TAXES)", (30, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (20, 20, 20), 2)
    cv2.putText(canvas, "MFG DATE: 09/2025", (30, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (20, 20, 20), 2)
    cv2.putText(canvas, "MANUFACTURED BY: Apex Products Ltd, Delhi - 110020", (30, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (20, 20, 20), 1)

    success, encoded_img = cv2.imencode(".jpg", canvas)
    assert success, "Failed to encode OpenCV synthetic test image"
    image_bytes = encoded_img.tobytes()

    # 2. Upload file via multipart/form-data to POST /api/v1/scan/upload
    files = {"file": ("test_label_opencv.jpg", image_bytes, "image/jpeg")}
    data = {
        "inspectorName": "Inspector OpenCV Test",
        "inspectorLocation": "Zone 4 Processing Unit",
        "isImported": "false",
        "pdpAreaCm2": "180.0"
    }

    res = client.post("/api/v1/scan/upload", files=files, data=data)
    print(f"Upload Endpoint Status Code: {res.status_code}")
    assert res.status_code == 201, f"Upload endpoint failed: {res.text}"

    json_res = res.json()
    print("  Message:", json_res.get("message"))
    print("  OpenCV Metadata:", json_res.get("opencvMetadata"))
    print("  OpenCV Stages Generated:", list(json_res.get("preprocessingStages", {}).keys()))
    
    product = json_res.get("product")
    print(f"  Scanned Product ID: {product['id']}")
    print(f"  Overall Score: {product['overallScore']}%")
    print(f"  Overall Status: {product['overallStatus']}")

    assert "opencvMetadata" in json_res
    assert json_res["opencvMetadata"]["clahe_applied"] is True
    assert json_res["opencvMetadata"]["otsu_applied"] is True


    print("\n==================================================")
    print("  OPENCV PREPROCESSING PIPELINE TEST SUCCESSFUL!")
    print("==================================================")

if __name__ == "__main__":
    test_opencv_preprocessing_upload()

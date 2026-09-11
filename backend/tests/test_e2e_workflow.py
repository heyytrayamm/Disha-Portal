import pytest
import numpy as np
import cv2

def test_full_upload_to_result_workflow(client):
    """
    Validates complete End-to-End Workflow:
    1. Create synthetic OpenCV image matrix.
    2. Upload file bytes to POST /api/v1/scan/upload.
    3. Verify OpenCV preprocessing metadata and 6 stage base64 images returned.
    4. Verify structured extracted fields & Legal Metrology rule check matrix.
    5. Download ReportLab inspection PDF from GET /api/v1/reports/{id}/download.
    6. Issue statutory legal notice under Section 36/48 via POST /api/v1/products/{id}/notice.
    7. Query executive dashboard analytics via GET /api/v1/dashboard/stats.
    """
    # 1. Create synthetic label image with OpenCV
    canvas = np.ones((500, 700, 3), dtype=np.uint8) * 245
    cv2.putText(canvas, "COMMODITY: WHOLE WHEAT ATTA", (40, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (20, 20, 20), 2)
    cv2.putText(canvas, "NET QUANTITY: 500 g", (40, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    cv2.putText(canvas, "MRP Rs. 150.00 (INCL. OF ALL TAXES)", (40, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    cv2.putText(canvas, "MFG DATE: 09/2025", (40, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (20, 20, 20), 2)
    cv2.putText(canvas, "MANUFACTURED BY: Apex Consumer Products Ltd, Delhi - 110020", (40, 310), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (20, 20, 20), 1)
    cv2.putText(canvas, "CONSUMER CARE: Helpline 1800-444-555, email care@apexconsumer.in", (40, 370), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (20, 20, 20), 1)

    success, encoded_img = cv2.imencode(".jpg", canvas)
    assert success, "Failed to encode OpenCV synthetic label image"
    image_bytes = encoded_img.tobytes()

    # 2. Upload file to POST /api/v1/scan/upload
    files = {"file": ("whole_wheat_atta_500g.jpg", image_bytes, "image/jpeg")}
    data = {
        "inspectorName": "Inspector E2E Test",
        "inspectorLocation": "Zone 4 Processing Unit",
        "isImported": "false",
        "pdpAreaCm2": "180.0"
    }

    upload_res = client.post("/api/v1/scan/upload", files=files, data=data)
    assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
    
    body = upload_res.json()
    assert "product" in body
    assert "opencvMetadata" in body
    assert "preprocessingStages" in body

    stages = body["preprocessingStages"]
    assert "original" in stages
    assert "grayscale" in stages
    assert "clahe_enhanced" in stages
    assert "bilateral_denoised" in stages
    assert "otsu_binarized" in stages
    assert "deskewed" in stages

    product = body["product"]
    scan_id = product["id"]
    assert product["productName"] == "Whole Wheat Atta 500G"
    assert len(product["extractedFields"]) >= 6
    assert len(product["ruleChecks"]) >= 8
    assert product["overallScore"] >= 0

    # 3. Download ReportLab PDF Report from GET /api/v1/reports/{id}/download
    pdf_res = client.get(f"/api/v1/reports/{scan_id}/download")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000

    # 4. Issue Statutory Legal Notice via POST /api/v1/products/{id}/notice
    notice_payload = {
        "penaltyAmount": 25000,
        "notes": "E2E verification of statutory legal notice generation under Section 36."
    }
    notice_res = client.post(f"/api/v1/products/{scan_id}/notice", json=notice_payload)
    assert notice_res.status_code == 200
    updated_product = notice_res.json()["product"]
    assert updated_product["enforcementStatus"] == "NOTICE_ISSUED"
    assert updated_product["noticeDetails"]["penaltyAmount"] == 25000

    # 5. Query Executive Dashboard Stats from GET /api/v1/dashboard/stats
    stats_res = client.get("/api/v1/dashboard/stats")
    assert stats_res.status_code == 200
    stats_data = stats_res.json()
    assert stats_data["totalScanned"] >= 1
    assert stats_data["noticesIssued"] >= 1

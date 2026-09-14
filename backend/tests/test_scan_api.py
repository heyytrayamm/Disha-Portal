import pytest
import base64
import cv2
import numpy as np

def test_full_scan_api_flow(client):
    canvas = np.ones((500, 700, 3), dtype=np.uint8) * 245
    cv2.putText(canvas, "COMMODITY: WHOLE WHEAT ATTA", (40, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (20, 20, 20), 2)
    cv2.putText(canvas, "NET QUANTITY: 500 g", (40, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    cv2.putText(canvas, "MRP Rs. 150.00 (INCL. OF ALL TAXES)", (40, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    cv2.putText(canvas, "MFG DATE: 09/2025", (40, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (20, 20, 20), 2)
    cv2.putText(canvas, "MANUFACTURED BY: Apex Consumer Products Ltd, Delhi - 110020", (40, 310), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (20, 20, 20), 1)
    cv2.putText(canvas, "CONSUMER CARE: Helpline 1800-444-555, email care@apexconsumer.in", (40, 370), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (20, 20, 20), 1)
    _, encoded = cv2.imencode(".jpg", canvas)
    label_b64 = "data:image/jpeg;base64," + base64.b64encode(encoded).decode()

    scan_payload = {
        "imageUrl": label_b64,
        "fileName": "Whole_Wheat_Atta_500g.jpg",
        "inspectorName": "Inspector Sharma",
        "inspectorLocation": "North Zone",
        "isImported": False,
        "pdpAreaCm2": 180.0
    }

    scan_resp = client.post("/api/v1/scan", json=scan_payload)
    assert scan_resp.status_code == 201
    res_data = scan_resp.json()
    assert "product" in res_data
    product = res_data["product"]
    assert "Whole Wheat Atta" in product["productName"]
    assert "extractedFields" in product
    assert "ruleChecks" in product

    scan_id = product["id"]

    # Retrieve products list
    prod_resp = client.get("/api/v1/products")
    assert prod_resp.status_code == 200
    assert prod_resp.json()["count"] >= 1

    # Issue Statutory Notice
    notice_payload = {
        "penaltyAmount": 25000,
        "notes": "Test statutory notice under Section 36"
    }
    notice_resp = client.post(f"/api/v1/products/{scan_id}/notice", json=notice_payload)
    assert notice_resp.status_code == 200
    assert notice_resp.json()["product"]["enforcementStatus"] == "NOTICE_ISSUED"

    # Get Dashboard Stats
    dash_resp = client.get("/api/v1/dashboard/stats")
    assert dash_resp.status_code == 200
    assert dash_resp.json()["noticesIssued"] >= 1

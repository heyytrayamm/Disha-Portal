import pytest

def test_full_scan_api_flow(client):
    scan_payload = {
        "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
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
    assert product["productName"] == "Whole Wheat Atta 500G"
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

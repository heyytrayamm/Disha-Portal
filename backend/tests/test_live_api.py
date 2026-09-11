import httpx
import pytest

BASE_URL = "http://127.0.0.1:8000"

def test_live_backend():
    try:
        client = httpx.Client(base_url=BASE_URL, timeout=3.0)
        res = client.get("/api/health")
        if res.status_code != 200:
            pytest.skip("Live server returned non-200 on health check.")
    except Exception:
        pytest.skip("Live server is not running at http://127.0.0.1:8000. Skipping live endpoint test.")

    print("==================================================")
    print("  Testing Live FastAPI Backend Endpoints")
    print("==================================================")

    # 1. GET /api/health
    res = client.get("/api/health")
    print(f"1. GET /api/health -> Status {res.status_code}")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print(f"   Response: {res.json()}")

    # 2. POST /api/v1/auth/register
    reg_payload = {
        "email": "inspector.test@legalmetrology.gov.in",
        "full_name": "Inspector Field Test",
        "password": "SecurePassword123!",
        "role": "ENFORCEMENT_OFFICER",
        "location_unit": "Delhi Zone 4"
    }
    res = client.post("/api/v1/auth/register", json=reg_payload)
    print(f"2. POST /api/v1/auth/register -> Status {res.status_code}")
    assert res.status_code in (201, 400), f"Registration failed: {res.text}"
    
    # 3. POST /api/v1/auth/login
    login_payload = {
        "email": "inspector.test@legalmetrology.gov.in",
        "password": "SecurePassword123!"
    }
    res = client.post("/api/v1/auth/login", json=login_payload)
    print(f"3. POST /api/v1/auth/login -> Status {res.status_code}")
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 4. GET /api/v1/auth/me
    res = client.get("/api/v1/auth/me", headers=headers)
    print(f"4. GET /api/v1/auth/me -> Status {res.status_code}")
    assert res.status_code == 200, f"Get me failed: {res.text}"
    print(f"   User: {res.json()['full_name']} ({res.json()['email']})")

    # 5. POST /api/v1/scan
    scan_payload = {
        "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "fileName": "Whole_Wheat_Atta_500g.jpg",
        "inspectorName": "Inspector Field Test",
        "inspectorLocation": "Zone 4 Unit",
        "isImported": False,
        "pdpAreaCm2": 180.0
    }
    res = client.post("/api/v1/scan", json=scan_payload, headers=headers)
    print(f"5. POST /api/v1/scan -> Status {res.status_code}")
    assert res.status_code == 201, f"Scan failed: {res.text}"
    scan_product = res.json()["product"]
    scan_id = scan_product["id"]
    print(f"   Scanned Product ID: {scan_id}, Score: {scan_product['overallScore']}%, Status: {scan_product['overallStatus']}")

    # 6. GET /api/v1/products
    res = client.get("/api/v1/products", headers=headers)
    print(f"6. GET /api/v1/products -> Status {res.status_code}")
    assert res.status_code == 200
    products_count = res.json()["count"]
    print(f"   Total Scanned Products in DB: {products_count}")

    # 7. GET /api/v1/products/{id}
    res = client.get(f"/api/v1/products/{scan_id}", headers=headers)
    print(f"7. GET /api/v1/products/{scan_id} -> Status {res.status_code}")
    assert res.status_code == 200

    # 8. POST /api/v1/products/{id}/notice
    notice_payload = {
        "penaltyAmount": 25000,
        "notes": "Statutory legal notice issued for missing/non-standard label declarations."
    }
    res = client.post(f"/api/v1/products/{scan_id}/notice", json=notice_payload, headers=headers)
    print(f"8. POST /api/v1/products/{scan_id}/notice -> Status {res.status_code}")
    assert res.status_code == 200


    # 9. GET /api/v1/dashboard/stats
    res = client.get("/api/v1/dashboard/stats", headers=headers)
    print(f"9. GET /api/v1/dashboard/stats -> Status {res.status_code}")
    assert res.status_code == 200
    print(f"   Scanned: {res.json()['totalScanned']}, Notices Issued: {res.json()['noticesIssued']}")

    # 10. GET /api/v1/rules
    res = client.get("/api/v1/rules", headers=headers)
    print(f"10. GET /api/v1/rules -> Status {res.status_code}")
    assert res.status_code == 200

    # 11. GET /api/v1/reports/{id}/download
    res = client.get(f"/api/v1/reports/{scan_id}/download", headers=headers)
    print(f"11. GET /api/v1/reports/{scan_id}/download -> Status {res.status_code}")
    assert res.status_code == 200
    print(f"   Downloaded PDF Size: {len(res.content)} bytes")

    print("\n==================================================")

    print("==================================================")

if __name__ == "__main__":
    test_live_backend()

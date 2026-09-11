import os
import sys

backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("=" * 70)
    print("CRITICAL PRODUCTION VERIFICATION SUITE")
    print("=" * 70)

    # 1. Health check
    h = client.get("/api/health")
    assert h.status_code == 200, f"Health check failed: {h.status_code}"
    print("[PASS] 1. Backend Health Check OK: /api/health -> 200 UP")

    # 2. Test A: Green Tea Image (User Upload)
    tea_path = os.path.join(backend_dir, "uploads", "df0b1ba0e2_photo_2026-09-10_04-18-37 (2).jpg")
    assert os.path.exists(tea_path), f"Green tea image missing at {tea_path}"
    with open(tea_path, "rb") as f:
        res_a = client.post("/api/v1/scan/upload", files={"file": ("green_tea.jpg", f.read(), "image/jpeg")})
    assert res_a.status_code == 201, f"Green tea upload failed: {res_a.status_code}"
    data_a = res_a.json()
    prod_a = data_a["product"]

    # Assert real OCR (Tata Consumer Products, ₹75, 10 units, 27/05/26)
    assert "tata" in prod_a["manufacturerName"].lower(), f"Expected Tata in manufacturer, got {prod_a['manufacturerName']}"
    assert "apex consumer" not in prod_a["manufacturerName"].lower(), "ERROR: Apex Consumer Products found!"
    assert prod_a["overallScore"] == 100.0, f"Expected 100.0 score, got {prod_a['overallScore']}"
    assert prod_a["overallStatus"] == "COMPLIANT", f"Expected COMPLIANT, got {prod_a['overallStatus']}"
    assert prod_a["isProductLabel"] is True
    assert data_a.get("dbSaved") is True, "Expected dbSaved == True"
    tea_id = prod_a["id"]
    print(f"[PASS] 2. Test A (Green Tea): Real OCR read Tata Consumer Products, 100% COMPLIANT, ID: {tea_id}")

    # 3. Test B: Chia Seeds (Different Product)
    chia_path = os.path.join(backend_dir, "uploads", "87b0ad6758_WhatsApp Image 2026-09-11 at 2.07.42 PM.jpeg")
    assert os.path.exists(chia_path), f"Chia seeds image missing at {chia_path}"
    with open(chia_path, "rb") as f:
        res_b = client.post("/api/v1/scan/upload", files={"file": ("chia_seeds.jpeg", f.read(), "image/jpeg")})
    assert res_b.status_code == 201
    data_b = res_b.json()
    prod_b = data_b["product"]
    assert prod_b["id"] != tea_id, "ERROR: Inspection ID was reused!"
    assert prod_b["overallScore"] != prod_a["overallScore"], "ERROR: Score was identical to Green Tea!"
    assert "chia" in prod_b["productName"].lower(), f"Expected Chia in product name, got {prod_b['productName']}"
    chia_id = prod_b["id"]
    print(f"[PASS] 3. Test B (Chia Seeds): Different product produced distinct OCR, score: {prod_b['overallScore']}, ID: {chia_id}")

    # 4. Test C: Face / Selfie (Non-Label Image)
    face_path = os.path.join(backend_dir, "uploads", "043fdd8283_test_face.jpg")
    assert os.path.exists(face_path), f"Face image missing at {face_path}"
    with open(face_path, "rb") as f:
        res_c = client.post("/api/v1/scan/upload", files={"file": ("selfie.jpg", f.read(), "image/jpeg")})
    assert res_c.status_code == 201
    data_c = res_c.json()
    prod_c = data_c["product"]
    assert data_c["status"] == "UNABLE_TO_ASSESS"
    assert data_c["score"] is None
    assert prod_c["overallScore"] is None
    assert prod_c["overallStatus"] == "UNABLE_TO_ASSESS"
    assert prod_c["isProductLabel"] is False
    assert len(prod_c["extractedFields"]) == 0, "Non-label image must NOT have fabricated fields!"
    face_id = prod_c["id"]
    print(f"[PASS] 4. Test C (Selfie): status=UNABLE_TO_ASSESS, score=None, 0 fabricated fields, ID: {face_id}")

    # 5. Test D: Database Persistence & Refresh Simulation
    # Simulate page refresh by retrieving inspection by ID from /inspections/{id}
    fetch_tea = client.get(f"/inspections/{tea_id}")
    assert fetch_tea.status_code == 200, f"Could not fetch Green Tea inspection by ID: {fetch_tea.status_code}"
    saved_tea = fetch_tea.json()
    assert saved_tea["id"] == tea_id
    assert "tata" in saved_tea["manufacturerName"].lower()
    assert saved_tea["overallScore"] == 100.0
    print(f"[PASS] 5. Test D (Persistence / Refresh): GET /inspections/{tea_id} correctly reloaded from DB!")

    # Verify Face inspection retrieval has score: null
    fetch_face = client.get(f"/inspections/{face_id}")
    assert fetch_face.status_code == 200
    saved_face = fetch_face.json()
    assert saved_face["overallStatus"] == "UNABLE_TO_ASSESS"
    assert saved_face["overallScore"] is None
    assert saved_face["score"] is None
    print(f"[PASS] 6. Test D (Persistence / Refresh): GET /inspections/{face_id} reloaded with score=null!")

    # Verify /inspections list
    list_res = client.get("/inspections")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["count"] >= 3
    print(f"[PASS] 7. Test D (Repository / History): GET /inspections returned {list_data['count']} persistent records")

    print("=" * 70)
    print("ALL 7 CRITICAL ACCEPTANCE TESTS PASSED COMPLETELY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()

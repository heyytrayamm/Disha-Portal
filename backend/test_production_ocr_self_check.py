import os
import sys
import time

backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_self_check():
    print("=" * 60)
    print("PRODUCTION OCR PIPELINE SELF-CHECK")
    print("=" * 60)

    # 1. Health check
    h = client.get("/api/health")
    assert h.status_code == 200, f"Health check failed: {h.status_code}"
    print("[PASS] 1. Backend Health Check OK")

    # 2. Green Tea Label
    tea_path = os.path.join(backend_dir, "uploads", "df0b1ba0e2_photo_2026-09-10_04-18-37 (2).jpg")
    assert os.path.exists(tea_path), f"Missing Green Tea image: {tea_path}"
    with open(tea_path, "rb") as f:
        t0 = time.perf_counter()
        res = client.post("/api/v1/scan/upload", files={"file": ("green_tea.jpg", f.read(), "image/jpeg")})
        dur = (time.perf_counter() - t0) * 1000
    assert res.status_code == 201, f"Upload failed: {res.status_code}"
    data = res.json()
    prod = data["product"]
    assert "tata" in prod["manufacturerName"].lower(), f"Expected Tata in mfr: {prod['manufacturerName']}"
    assert prod["overallScore"] == 100.0, f"Expected 100.0, got {prod['overallScore']}"
    assert prod["overallStatus"] == "COMPLIANT", f"Expected COMPLIANT, got {prod['overallStatus']}"
    assert prod["isProductLabel"] is True
    print(f"[PASS] 2. Green Tea OCR Check OK (Time: {dur:.1f} ms, Score: {prod['overallScore']}%, Status: {prod['overallStatus']})")

    # 3. Whole Wheat Atta Label
    atta_path = os.path.join(backend_dir, "uploads", "6cef239e80_whole_wheat_atta_500g.jpg")
    if os.path.exists(atta_path):
        with open(atta_path, "rb") as f:
            t0 = time.perf_counter()
            res = client.post("/api/v1/scan/upload", files={"file": ("whole_wheat_atta_500g.jpg", f.read(), "image/jpeg")})
            dur = (time.perf_counter() - t0) * 1000
        assert res.status_code == 201
        data = res.json()
        prod = data["product"]
        assert prod["isProductLabel"] is True
        assert len(prod["extractedFields"]) >= 5
        print(f"[PASS] 3. Whole Wheat Atta OCR Check OK (Time: {dur:.1f} ms, Fields: {len(prod['extractedFields'])})")

    # 4. Selfie / Non-Label Check
    selfie_path = os.path.join(backend_dir, "uploads", "043fdd8283_test_face.jpg")
    assert os.path.exists(selfie_path), f"Missing Selfie image: {selfie_path}"
    with open(selfie_path, "rb") as f:
        t0 = time.perf_counter()
        res = client.post("/api/v1/scan/upload", files={"file": ("selfie.jpg", f.read(), "image/jpeg")})
        dur = (time.perf_counter() - t0) * 1000
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "UNABLE_TO_ASSESS"
    assert data["is_product_label"] is False
    assert data["product"]["overallScore"] is None
    assert len(data["product"]["extractedFields"]) == 0
    print(f"[PASS] 4. Non-Label Selfie Check OK (Time: {dur:.1f} ms, Status: {data['status']})")

    print("=" * 60)
    print("ALL PRODUCTION OCR SELF-CHECKS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_self_check()

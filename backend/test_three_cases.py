import os
import sys
import json
import uuid

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

def upload_and_inspect(filepath, case_name):
    print("\n" + "="*60)
    print(f"RUNNING {case_name}")
    print(f"File: {filepath}")
    print("="*60)

    if not os.path.exists(filepath):
        print(f"Error: file not found at {filepath}")
        return None

    with open(filepath, "rb") as f:
        files = {"file": (os.path.basename(filepath), f.read(), "image/jpeg")}
        data = {
            "inspectorName": "Legal Metrology Inspector",
            "inspectorLocation": "Zone 4 Inspection Unit",
            "isImported": "false",
            "pdpAreaCm2": "180.0"
        }
        res = client.post("/api/v1/scan/upload", files=files, data=data)
        status_code = res.status_code
        res_data = res.json()

    print(f"HTTP Status: {status_code}")
    print(f"Status: {res_data.get('status')}")
    print(f"Is Product Label: {res_data.get('is_product_label')}")
    print(f"Score: {res_data.get('score')}")
    print(f"Message: {res_data.get('message')}")
    print(f"DB Saved: {res_data.get('dbSaved')}")

    prod = res_data.get("product", {})
    inspection_id = prod.get("id")
    print(f"Inspection ID: {inspection_id}")
    print(f"Product Name: {prod.get('productName')}")
    print(f"Manufacturer: {prod.get('manufacturerName')}")
    print(f"Overall Status: {prod.get('overallStatus')}")
    print(f"Overall Score: {prod.get('overallScore')}")
    print(f"Image URL: {prod.get('imageUrl')}")
    print("Detected Fields:")
    for field in prod.get("extractedFields", []):
        cat = field['category']
        parsed = str(field.get('parsedValue', '')).encode('ascii', errors='replace').decode('ascii')
        missing = field.get('isMissing', False)
        print(f"  * [{cat}] {field['fieldName']}: {parsed} (Missing={missing})")

    # TEST PERSISTENCE: Retrieve from PostgreSQL via /inspections and /inspections/{id}
    if inspection_id:
        print(f"\n[PERSISTENCE CHECK] Fetching GET /inspections/{inspection_id}...")
        get_res = client.get(f"/inspections/{inspection_id}")
        if get_res.status_code == 200:
            saved_doc = get_res.json()
            print(f"[SUCCESS] Record successfully retrieved from DB! Product: {saved_doc.get('productName')}, Score: {saved_doc.get('overallScore')}")
        else:
            print(f"[FAIL] GET /inspections/{inspection_id} returned status {get_res.status_code}")

    return res_data

if __name__ == "__main__":
    case_a = os.path.join(backend_dir, "uploads", "df0b1ba0e2_photo_2026-09-10_04-18-37 (2).jpg")
    case_b = os.path.join(backend_dir, "uploads", "87b0ad6758_WhatsApp Image 2026-09-11 at 2.07.42 PM.jpeg")
    case_c = os.path.join(backend_dir, "uploads", "043fdd8283_test_face.jpg")

    res_a = upload_and_inspect(case_a, "TEST A: GREEN TEA PACKAGE (REAL USER IMAGE)")
    res_b = upload_and_inspect(case_b, "TEST B: CHIA SEEDS PACKAGE (DIFFERENT PRODUCT)")
    res_c = upload_and_inspect(case_c, "TEST C: FACE / SELFIE (NON-COMMODITY)")

    # TEST D: Verify GET /inspections lists all saved records
    print("\n" + "="*60)
    print("TEST D: VERIFYING /inspections ENDPOINT (DATABASE HISTORY)")
    print("="*60)
    list_res = client.get("/inspections")
    print(f"GET /inspections status: {list_res.status_code}")
    if list_res.status_code == 200:
        data = list_res.json()
        print(f"Total persisted inspections in DB: {data.get('count')}")
        for item in data.get('inspections', [])[:5]:
            print(f"  - [{item.get('id')}] {item.get('productName')} | Status: {item.get('overallStatus')} | Score: {item.get('overallScore')}")

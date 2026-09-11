import os
import json
import urllib.request
import urllib.error
import uuid

def upload_and_inspect(filepath, case_name):
    print("\n" + "="*60)
    print(f"RUNNING {case_name}")
    print(f"File: {filepath}")
    print("="*60)

    if not os.path.exists(filepath):
        print(f"Error: file not found at {filepath}")
        return

    # Try live HTTP server first, fallback to FastAPI TestClient
    status_code = None
    res_data = None

    try:
        boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
        with open(filepath, "rb") as f:
            file_bytes = f.read()

        body = bytearray()
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="file"; filename="{os.path.basename(filepath)}"\r\n'.encode())
        body.extend(b"Content-Type: image/jpeg\r\n\r\n")
        body.extend(file_bytes)
        body.extend(b"\r\n")

        body.extend(f"--{boundary}\r\n".encode())
        body.extend(b'Content-Disposition: form-data; name="inspectorName"\r\n\r\nLegal Metrology Inspector\r\n')

        body.extend(f"--{boundary}\r\n".encode())
        body.extend(b'Content-Disposition: form-data; name="inspectorLocation"\r\n\r\nZone 4 Inspection Unit\r\n')

        body.extend(f"--{boundary}\r\n".encode())
        body.extend(b'Content-Disposition: form-data; name="isImported"\r\n\r\nfalse\r\n')

        body.extend(f"--{boundary}\r\n".encode())
        body.extend(b'Content-Disposition: form-data; name="pdpAreaCm2"\r\n\r\n180.0\r\n')

        body.extend(f"--{boundary}--\r\n".encode())

        req = urllib.request.Request("http://127.0.0.1:8000/api/v1/scan/upload", data=bytes(body))
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

        with urllib.request.urlopen(req, timeout=5) as response:
            status_code = response.getcode()
            res_data = json.loads(response.read().decode())
    except Exception:
        # Fallback to direct in-memory FastAPI TestClient
        from starlette.testclient import TestClient
        from app.main import app

        client = TestClient(app)
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

    prod = res_data.get("product", {})
    print(f"Product Name: {prod.get('productName')}")
    print(f"Manufacturer: {prod.get('manufacturerName')}")
    print(f"Overall Status: {prod.get('overallStatus')}")
    print(f"Overall Score: {prod.get('overallScore')}")
    print("Detected Fields:")
    for field in prod.get("extractedFields", []):
        cat = field['category']
        parsed = str(field.get('parsedValue', '')).encode('ascii', errors='replace').decode('ascii')
        missing = field.get('isMissing', False)
        print(f"  * [{cat}] {field['fieldName']}: {parsed} (Missing={missing})")

if __name__ == "__main__":
    case_a = "uploads/df0b1ba0e2_photo_2026-09-10_04-18-37 (2).jpg"
    case_b = "uploads/87b0ad6758_WhatsApp Image 2026-09-11 at 2.07.42 PM.jpeg"
    case_c = "test_face.jpg"

    upload_and_inspect(case_a, "CASE A: GREEN TEA PACKAGE (USER UPLOAD)")
    upload_and_inspect(case_b, "CASE B: CHIA SEEDS PACKAGE (DIFFERENT PRODUCT)")
    upload_and_inspect(case_c, "CASE C: FACE / SELFIE (NON-COMMODITY)")

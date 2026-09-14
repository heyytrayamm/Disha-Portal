import cv2
import numpy as np
import urllib.request
import json
import uuid

def create_face_image(filename="test_face.jpg"):
    # Create image of a cartoon/generic face with no packaging text
    img = np.full((500, 500, 3), 240, dtype=np.uint8)
    # Head circle
    cv2.circle(img, (250, 250), 160, (200, 180, 150), -1)
    # Eyes
    cv2.circle(img, (190, 200), 20, (50, 50, 50), -1)
    cv2.circle(img, (310, 200), 20, (50, 50, 50), -1)
    # Nose
    cv2.line(img, (250, 220), (250, 280), (100, 80, 60), 4)
    # Smile
    cv2.ellipse(img, (250, 320), (60, 30), 0, 0, 180, (50, 50, 50), 4)
    cv2.imwrite(filename, img)
    return filename

def create_commodity_label_image(filename="test_tea_label.jpg"):
    # Create a realistic commodity label image with real text
    img = np.full((600, 800, 3), 255, dtype=np.uint8)
    # Title
    cv2.putText(img, "HIMALAYAN ORGANIC GREEN TEA", (40, 70), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (20, 80, 20), 3)
    cv2.putText(img, "COMMODITY: GREEN TEA LEAVES", (40, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
    cv2.putText(img, "NET QUANTITY: 250 g", (40, 210), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 3)
    cv2.putText(img, "MRP: Rs. 350.00 (INCL. OF ALL TAXES)", (40, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
    cv2.putText(img, "MFG DATE: 08/2026", (40, 350), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
    cv2.putText(img, "EXPIRY DATE: 08/2027", (40, 420), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
    cv2.putText(img, "MFD BY: HIMALAYAN TEA ESTATES PVT LTD, ASSAM - 781001", (40, 490), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 0), 2)
    cv2.putText(img, "CONSUMER CARE: 1800-222-333, EMAIL: CARE@HIMALAYANTEA.IN", (40, 550), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.imwrite(filename, img)
    return filename

def test_upload(filepath, label_type):
    print(f"\n========================================================")
    print(f"TESTING UPLOAD: {filepath} ({label_type})")
    print(f"========================================================")
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    
    with open(filepath, "rb") as f:
        file_bytes = f.read()

    body = bytearray()
    # file part
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{filepath}"\r\n'.encode())
    body.extend(b"Content-Type: image/jpeg\r\n\r\n")
    body.extend(file_bytes)
    body.extend(b"\r\n")

    # inspectorName
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(b'Content-Disposition: form-data; name="inspectorName"\r\n\r\nField Inspector Roy\r\n')

    # inspectorLocation
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(b'Content-Disposition: form-data; name="inspectorLocation"\r\n\r\nKolkata Central Market\r\n')

    # isImported
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(b'Content-Disposition: form-data; name="isImported"\r\n\r\nfalse\r\n')

    # pdpAreaCm2
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(b'Content-Disposition: form-data; name="pdpAreaCm2"\r\n\r\n200.0\r\n')

    body.extend(f"--{boundary}--\r\n".encode())

    req = urllib.request.Request("http://127.0.0.1:8000/api/v1/scan/upload", data=bytes(body))
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            res_data = json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        status_code = e.code
        res_data = json.loads(e.read().decode())
    
    print(f"HTTP Status Code: {status_code}")
    if status_code == 201:
        print(f"Response Status: {res_data.get('status')}")
        print(f"Is Product Label: {res_data.get('is_product_label')}")
        print(f"Score: {res_data.get('score')}")
        print(f"Message: {res_data.get('message')}")
        prod = res_data.get("product", {})
        print(f"Product Name: {prod.get('productName')}")
        print(f"Manufacturer: {prod.get('manufacturerName')}")
        print(f"Overall Status: {prod.get('overallStatus')}")
        print(f"Overall Score: {prod.get('overallScore')}")
        print(f"Extracted Fields Count: {len(prod.get('extractedFields', []))}")
        print(f"Rule Checks Count: {len(prod.get('ruleChecks', []))}")
        for field in prod.get("extractedFields", []):
            if not field.get("isMissing"):
                val = str(field['rawValue']).encode('ascii', errors='replace').decode('ascii')
                print(f"  -> [{field['category']}] {field['fieldName']}: {val}")
    else:
        print(f"Error response: {res_data.text}")

if __name__ == "__main__":
    face_path = create_face_image("test_face.jpg")
    label_path = create_commodity_label_image("test_tea_label.jpg")

    test_upload(face_path, "NON-COMMODITY FACE IMAGE")
    test_upload(label_path, "REAL PACKAGED COMMODITY LABEL")

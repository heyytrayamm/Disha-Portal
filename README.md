# DISHA: AI-Powered Label Compliance Checking System (SIH26034)

A production-ready full-stack web application designed for **Smart India Hackathon SIH Problem Statement SIH26034** (Legal Metrology & Packaged Commodities Label Audit System).

---

## 🏛️ System Architecture

```
                          ┌────────────────────────────────────────────────────────┐
                          │            React.js + Tailwind CSS Frontend            │
                          │   - Executive KPI Dashboard & Recharts Analytics       │
                          │   - Interactive Image Scanner & Bounding Box Viewer   │
                          │   - Compliance Inspection Breakdown & PDF Generator    │
                          │   - Scan Repository & Filtering                        │
                          │   - Statutory Legal Notice Generator (Sec 36/48)       │
                          │   - Rule Handbook & Legal Metrology Matrix             │
                          │   - JWT Auth & Role-Based Access (Admin/Officer/User)  │
                          └───────────────────────────┬────────────────────────────┘
                                                      │ REST API (JSON / FormData)
                                                      ▼
                          ┌────────────────────────────────────────────────────────┐
                          │                 Python + FastAPI Backend               │
                          │   - JWT Auth & RBAC Middleware                         │
                          │   - Image Preprocessing (OpenCV CLAHE, Deskew, Noise)  │
                          │   - OCR Engine (PaddleOCR primary, Tesseract fallback) │
                          │   - Heuristic Structured Field Extractor               │
                          │   - Rule Engine (Legal Metrology Rules, 2011)          │
                          │   - PDF Inspection Report Generator (ReportLab)       │
                          │   - File Storage Service (AWS S3 / Local Fallback)     │
                          └─────────────┬───────────────────────────┬──────────────┘
                                        │                           │
                                        ▼                           ▼
                          ┌──────────────────────────┐  ┌──────────────────────────┐
                          │   PostgreSQL / SQLite    │  │    AWS S3 / Local Static │
                          │   (SQLAlchemy ORM)       │  │      Image & PDF Storage │
                          └──────────────────────────┘  └──────────────────────────┘
```

> **Crucial Rule**: **Zero LLM Dependency for Legal Verdicts**. Compliance verdicts are 100% evaluated by an explicit, auditable rule-based engine mapped directly to the Legal Metrology Act, 2009 and Legal Metrology (Packaged Commodities) Rules, 2011.

---

## ⚡ Core Features & Workflow

1. **Packaging Image Upload & Scanning**: Drag-and-drop label images or capture via webcam.
2. **OpenCV Preprocessing Pipeline**: Grayscale conversion, CLAHE contrast enhancement, bilateral filter noise reduction, Otsu binarization, and deskewing.
3. **Dual OCR Text Extraction**: PaddleOCR primary engine with PyTesseract fallback for high accuracy.
4. **Structured Declaration Parsing**: Regex & heuristic extraction for 8 mandatory legal declarations:
   - Maximum Retail Price (MRP)
   - Net Quantity & Unit Symbols
   - Manufacturing / Packing Date
   - Expiry / Best Before Date
   - Manufacturer / Packer / Importer Name & Full Address with Postal PIN code
   - Country of Origin (Mandatory for imported items)
   - Consumer Care Contact Info (Phone Helpline & Email)
5. **Deterministic Rule Compliance Engine**: Checks compliance against:
   - Rule 6(1)(a) through Rule 6(1)(f)
   - Rule 6(1)(aa) (Country of origin)
   - Rule 6(2) Principal Display Panel (PDP) font height scale (1.0mm to 6.0mm)
   - Unit Sale Price (USP) Rule 6(10)
6. **Downloadable PDF Reports**: ReportLab PDF legal inspection reports.
7. **Statutory Legal Notice Issuance**: Issue notices under Section 36 & Section 48 of Legal Metrology Act, 2009.
8. **JWT Authentication & RBAC**: Roles for `ENFORCEMENT_OFFICER`, `SYSTEM_ADMIN`, and `RETAILER_MANUFACTURER`.

---

## 🚀 Quick Setup & Execution

### Option A: Running Backend & Frontend Locally

#### 1. Backend (Python + FastAPI)
```bash
# Navigate to workspace directory
cd "SIH 2026"

# Install backend dependencies
pip install -r backend/requirements.txt

# Run FastAPI Server (starts on http://localhost:8000)
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```
OpenAPI documentation available at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

#### 2. Frontend (React + Vite)
```bash
# Install node dependencies
npm install

# Run Vite dev server (starts on http://localhost:5173)
npm run dev
```

---

### Option B: Docker Compose Deployment

```bash
docker-compose up --build
```
This boots up:
- `sih_postgres`: PostgreSQL Database on port `5432`
- `sih_fastapi_backend`: FastAPI Backend on port `8000`
- `sih_react_frontend`: React Frontend on port `5173`

---

## 🧪 Running Automated Tests

Run the backend test suite with `pytest`:
```bash
python -m pytest backend/tests
```
Test suite includes:
- `test_compliance_engine.py`: Unit tests for Rule Engine logic & font height rules.
- `test_field_extractor.py`: Unit tests for regex heuristic parsing of declarations.
- `test_image_processor.py`: Unit tests for OpenCV image processing pipeline.
- `test_auth.py`: JWT authentication, registration, login, and RBAC tests.
- `test_scan_api.py`: Integration tests for scan endpoints, product listing, notices, and analytics.

---

## 📂 Project Structure

```
sih-2026/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth.py         # JWT login, register, me
│   │   │   │   ├── scan.py         # OpenCV + OCR + Rule Engine pipeline
│   │   │   │   ├── products.py     # Product search & scan history
│   │   │   │   ├── reports.py      # ReportLab PDF report generation
│   │   │   │   ├── dashboard.py    # Analytics stats & KPIs
│   │   │   │   ├── notices.py      # Statutory legal notices (Sec 36/48)
│   │   │   │   └── rules.py        # Legal Metrology handbook matrix
│   │   │   └── router.py
│   │   ├── core/                   # Config, Database engine, Security JWT
│   │   ├── models/                 # User, ScanRecord, ExtractedField, RuleCheck, Notice models
│   │   ├── schemas/                # Pydantic schemas
│   │   ├── services/
│   │   │   ├── image_processor.py  # OpenCV CLAHE, deskew, noise filter
│   │   │   ├── ocr_engine.py       # PaddleOCR + PyTesseract
│   │   │   ├── field_extractor.py  # Structured regex parser
│   │   │   ├── compliance_engine.py# Deterministic Rule Engine
│   │   │   ├── storage_service.py  # S3 / Local static file storage
│   │   │   └── pdf_generator.py    # ReportLab PDF report generator
│   │   └── main.py                 # FastAPI app entry point
│   ├── tests/                      # Pytest automated test suite
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── src/
│   ├── components/                 # React UI components (Dashboard, Scan visualizer, Scanner modal, etc.)
│   ├── services/                   # API client & Auth service
│   ├── types/                      # TypeScript definitions
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── docker-compose.yml
├── README.md
└── .env.example
```

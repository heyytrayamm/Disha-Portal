from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os

from app.core.database import get_db
from app.models.scan import ScanRecord
from app.api.v1.products import format_scan_record
from app.services.pdf_generator import PDFReportGenerator
from app.core.config import settings

router = APIRouter(prefix="/reports", tags=["PDF Inspection Reports"])

@router.get("/{id}/download")
def download_inspection_report(id: str, db: Session = Depends(get_db)):
    rec = db.query(ScanRecord).filter(ScanRecord.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Product inspection record not found")

    formatted_product = format_scan_record(rec)
    pdf_filename = f"Legal_Inspection_Report_{id}.pdf"
    output_path = os.path.join(settings.REPORT_DIR, pdf_filename)

    PDFReportGenerator.generate_inspection_pdf(formatted_product, output_path)

    if not os.path.exists(output_path):
        raise HTTPException(status_code=500, detail="Failed to generate PDF report file")

    return FileResponse(
        path=output_path,
        filename=pdf_filename,
        media_type="application/pdf"
    )

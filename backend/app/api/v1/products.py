from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.core.database import get_db
from app.models.scan import ScanRecord
from app.api.v1.inspections import format_inspection_record

router = APIRouter(prefix="/products", tags=["Product Scan Repository"])

format_scan_record = format_inspection_record


@router.get("", response_model=dict)
def get_products(
    query: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(ScanRecord)

    if status and status != "ALL":
        q = q.filter(ScanRecord.overall_status == status)

    if category and category != "ALL":
        q = q.filter(ScanRecord.category == category)

    records = q.order_by(ScanRecord.scanned_at.desc()).all()

    formatted = [format_scan_record(r) for r in records]

    if query:
        q_lower = query.lower()
        formatted = [
            p for p in formatted 
            if q_lower in p["productName"].lower() 
            or q_lower in p["brandName"].lower()
            or q_lower in p["manufacturerName"].lower()
            or q_lower in p["id"].lower()
        ]

    return {
        "count": len(formatted),
        "products": formatted
    }

@router.get("/{id}", response_model=dict)
def get_product_by_id(id: str, db: Session = Depends(get_db)):
    rec = db.query(ScanRecord).filter(ScanRecord.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Inspection record not found")
    return format_scan_record(rec)

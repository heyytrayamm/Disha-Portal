from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import random

from app.core.database import get_db
from app.models.scan import ScanRecord
from app.models.notice import NoticeRecord
from app.schemas.notice import CreateNoticeSchema
from app.api.v1.products import format_scan_record

router = APIRouter(prefix="/products", tags=["Statutory Legal Notices"])

@router.post("/{id}/notice", response_model=dict)
def issue_statutory_notice(id: str, payload: CreateNoticeSchema, db: Session = Depends(get_db)):
    rec = db.query(ScanRecord).filter(ScanRecord.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Product inspection record not found")

    notice_no = payload.noticeNumber or f"NOTICE/LM/2026/{random.randint(1000, 9999)}"
    issued_dt = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    hearing_dt = payload.hearingDate or (datetime.now(timezone.utc) + timedelta(days=14)).strftime("%Y-%m-%d")
    penalty = payload.penaltyAmount or 25000.0

    # Upsert notice record
    existing_notice = db.query(NoticeRecord).filter(NoticeRecord.scan_id == id).first()
    if existing_notice:
        existing_notice.notice_number = notice_no
        existing_notice.issued_date = issued_dt
        existing_notice.hearing_date = hearing_dt
        existing_notice.penalty_amount = penalty
        existing_notice.notes = payload.notes
    else:
        new_notice = NoticeRecord(
            scan_id=id,
            notice_number=notice_no,
            issued_date=issued_dt,
            hearing_date=hearing_dt,
            penalty_amount=penalty,
            notes=payload.notes
        )
        db.add(new_notice)

    rec.enforcement_status = "NOTICE_ISSUED"
    db.commit()
    db.refresh(rec)

    formatted = format_scan_record(rec)

    return {
        "message": "Statutory Legal Metrology notice issued successfully under Section 36 of Legal Metrology Act, 2009.",
        "noticeNumber": notice_no,
        "issuedDate": issued_dt,
        "hearingDate": hearing_dt,
        "penaltyAmount": penalty,
        "product": formatted
    }

from pydantic import BaseModel
from typing import Optional

class CreateNoticeSchema(BaseModel):
    noticeNumber: Optional[str] = None
    penaltyAmount: Optional[float] = 25000.0
    hearingDate: Optional[str] = None
    notes: Optional[str] = "Statutory Legal Notice issued under Section 36 of Legal Metrology Act, 2009."

class NoticeResponseSchema(BaseModel):
    message: str
    noticeNumber: str
    issuedDate: str
    hearingDate: str
    penaltyAmount: float
    product: dict

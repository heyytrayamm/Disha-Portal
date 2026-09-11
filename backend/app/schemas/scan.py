from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any, Union

class BoundingBoxSchema(BaseModel):
    x: float
    y: float
    width: float
    height: float
    label: str

class ExtractedFieldSchema(BaseModel):
    id: str
    category: str
    fieldName: str
    rawValue: str
    parsedValue: Optional[Union[str, float, int]] = None
    confidence: float
    boundingBox: Optional[BoundingBoxSchema] = None
    estimatedFontHeightMm: Optional[float] = None
    isMissing: bool = False

class LegalRuleCheckSchema(BaseModel):
    ruleId: str
    ruleNumber: str
    title: str
    description: str
    category: str
    isMandatory: bool = True
    status: str # PASS, FAIL, WARNING, NOT_APPLICABLE
    severity: str # CRITICAL, MAJOR, MINOR, COMPLIANT
    observedValue: Optional[str] = None
    expectedFormat: Optional[str] = None
    legalReference: str
    remedialAction: str
    penaltySection: str

class PackageDimensionsSchema(BaseModel):
    pdpAreaCm2: float
    estimatedPackageType: str
    minRequiredFontHeightMm: float
    detectedMinFontHeightMm: float

class ViolationsCountSchema(BaseModel):
    critical: int
    major: int
    minor: int

class NoticeDetailsSchema(BaseModel):
    noticeNumber: str
    issuedDate: str
    hearingDate: str
    penaltyAmount: float
    notes: Optional[str] = ""

class ScanRequestSchema(BaseModel):
    imageUrl: str
    fileName: Optional[str] = "Scanned_Packaging_Label.jpg"
    inspectorName: Optional[str] = "Inspector Officer"
    inspectorLocation: Optional[str] = "Zone 4 Inspection Unit"
    isImported: Optional[bool] = False
    pdpAreaCm2: Optional[float] = 180.0

class ScannedProductSchema(BaseModel):
    id: str
    barcode: Optional[str] = None
    productName: str
    brandName: str
    category: str
    manufacturerName: str
    importerName: Optional[str] = None
    countryOfOrigin: Optional[str] = "India"
    imageUrl: str
    scannedAt: str
    inspectorName: str
    inspectorLocation: str
    dimensions: PackageDimensionsSchema
    extractedFields: List[ExtractedFieldSchema]
    ruleChecks: List[LegalRuleCheckSchema]
    overallScore: float
    overallStatus: str # COMPLIANT, NON_COMPLIANT, NEEDS_REVIEW
    violationsCount: ViolationsCountSchema
    enforcementStatus: str # UNDER_INSPECTION, NOTICE_ISSUED, CLOSED_COMPLIANT
    noticeDetails: Optional[NoticeDetailsSchema] = None

    model_config = ConfigDict(from_attributes=True)

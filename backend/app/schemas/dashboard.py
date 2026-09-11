from pydantic import BaseModel
from typing import List, Dict

class NonCompliantBrandSchema(BaseModel):
    brand: str
    violationsCount: int
    passRate: float

class MonthlyTrendSchema(BaseModel):
    month: str
    compliant: int
    nonCompliant: int

class ComplianceStatsSchema(BaseModel):
    totalScanned: int
    totalCompliant: int
    totalNonCompliant: int
    passPercentage: float
    noticesIssued: int
    totalPenaltiesCollected: float
    violationsByCategory: Dict[str, int]
    monthlyTrends: List[MonthlyTrendSchema]
    topNonCompliantBrands: List[NonCompliantBrandSchema]

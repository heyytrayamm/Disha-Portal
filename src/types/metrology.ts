export type ViolationSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'COMPLIANT';

export type DeclarationCategory = 
  | 'MANUFACTURER_PACKER_IMPORTER'
  | 'COMMODITY_NAME'
  | 'NET_QUANTITY'
  | 'DATE_MFG_PACK_IMPORT'
  | 'MAXIMUM_RETAIL_PRICE'
  | 'CONSUMER_CARE'
  | 'COUNTRY_OF_ORIGIN'
  | 'UNIT_SALE_PRICE'
  | 'BEST_BEFORE_EXPIRY'
  | 'FONT_SIZE_READABILITY';

export interface BoundingBox {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  label: string;
}

export interface ExtractedField {
  id: string;
  category: DeclarationCategory;
  fieldName: string;
  rawValue: string;
  parsedValue: string | number | null;
  confidence: number; // 0 - 100
  boundingBox?: BoundingBox;
  estimatedFontHeightMm?: number;
  isMissing: boolean;
}

export interface LegalRuleCheck {
  ruleId: string;
  ruleNumber: string; // e.g. "Rule 6(1)(c)"
  title: string;
  description: string;
  category: DeclarationCategory;
  isMandatory: boolean;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'NOT_APPLICABLE';
  severity: ViolationSeverity;
  observedValue?: string;
  expectedFormat?: string;
  legalReference: string; // e.g. "Rule 6(1)(c) of Legal Metrology (Packaged Commodities) Rules, 2011"
  remedialAction: string;
  penaltySection: string; // e.g. "Section 36 of Legal Metrology Act, 2009 (Fine up to ₹25,000)"
}

export interface PackageDimensions {
  pdpAreaCm2: number; // Principal Display Panel surface area in cm^2
  estimatedPackageType: 'RECTANGULAR' | 'CYLINDRICAL' | 'POUCH' | 'IRREGULAR';
  minRequiredFontHeightMm: number; // according to Rule 6(2) table
  detectedMinFontHeightMm: number;
}

export interface ScannedProduct {
  id: string;
  inspection_id?: string;
  inspectionId?: string;
  originalFilename?: string;
  barcode?: string;
  productName: string;
  brandName: string;
  category: string;
  manufacturerName: string;
  importerName?: string;
  countryOfOrigin?: string;
  imageUrl: string;
  sourceImageUrl?: string;
  scannedAt: string;
  inspectorName: string;
  inspectorLocation: string;
  dimensions: PackageDimensions;
  extractedFields: ExtractedField[];
  ruleChecks: LegalRuleCheck[];
  overallScore: number | null; // 0 - 100 or null if UNABLE_TO_ASSESS
  overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW' | 'UNABLE_TO_ASSESS';
  status?: string;
  score?: number | null;
  violationsCount: {
    critical: number;
    major: number;
    minor: number;
  };
  enforcementStatus: 'UNDER_INSPECTION' | 'NOTICE_ISSUED' | 'COMPOUNDED' | 'CASE_FILED' | 'CLOSED_COMPLIANT' | 'UNABLE_TO_ASSESS';
  isProductLabel?: boolean;
  message?: string;
  preprocessingStages?: Record<string, string>;
  opencvMetadata?: Record<string, any>;
  noticeDetails?: {
    noticeNumber: string;
    issuedDate: string;
    hearingDate: string;
    penaltyAmount: number;
    notes: string;
  };
}

export interface ComplianceStats {
  totalScanned: number;
  totalCompliant: number;
  totalNonCompliant: number;
  passPercentage: number;
  noticesIssued: number;
  totalPenaltiesCollected: number;
  violationsByCategory: Partial<Record<DeclarationCategory, number>> | Record<string, number>;
  monthlyTrends: { month: string; compliant: number; nonCompliant: number }[];
  topNonCompliantBrands: { brand: string; violationsCount: number; passRate: number }[];
}


export type ActiveTab = 'dashboard' | 'scan' | 'repository' | 'rules' | 'resources' | 'users';

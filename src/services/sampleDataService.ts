import type { ScannedProduct, ComplianceStats } from '../types/metrology';
import { evaluateLegalMetrologyRules, calculateComplianceScore } from './metrologyRulesEngine';

/**
 * Creates SVG Data URLs for realistic packaging label visual mockups
 */
function createSampleLabelSvg(
  bgGradient: string,
  brandText: string,
  productTitle: string,
  netQtyText: string,
  mrpText: string,
  mfgText: string,
  mfgAddrText: string,
  helplineText: string,
  originText?: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        ${bgGradient}
      </linearGradient>
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000" flood-opacity="0.25"/>
      </filter>
    </defs>
    
    <!-- Background Card -->
    <rect width="600" height="750" fill="url(#bg)" rx="24"/>
    
    <!-- Outer Border Line -->
    <rect x="20" y="20" width="560" height="710" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" rx="16"/>

    <!-- Header Banner -->
    <rect x="40" y="50" width="520" height="110" fill="rgba(0,0,0,0.3)" rx="12"/>
    <text x="300" y="95" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="bold" font-size="34" text-anchor="middle" letter-spacing="2">${brandText}</text>
    <text x="300" y="135" fill="#FDE047" font-family="Arial, sans-serif" font-weight="600" font-size="22" text-anchor="middle">${productTitle}</text>

    <!-- Center Product Visual Badge -->
    <circle cx="300" cy="270" r="85" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" stroke-width="3"/>
    <text x="300" y="278" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="900" font-size="44" text-anchor="middle">PREMIUM</text>

    <!-- Principal Display Panel (PDP) Declarations Box -->
    <rect x="40" y="380" width="520" height="320" fill="#FFFFFF" rx="14" filter="url(#shadow)"/>
    <rect x="40" y="380" width="520" height="40" fill="#1E293B" rx="14"/>
    <text x="300" y="406" fill="#F8FAFC" font-family="Arial, sans-serif" font-weight="bold" font-size="16" text-anchor="middle" letter-spacing="1">STATUTORY DECLARATIONS (LEGAL METROLOGY ACT 2009)</text>

    <!-- Mandatory Declaration Details -->
    <g transform="translate(60, 440)" font-family="Arial, sans-serif" fill="#1E293B">
      <!-- Commodity Name -->
      <text x="0" y="0" font-weight="bold" font-size="14">COMMODITY:</text>
      <text x="140" y="0" font-size="14" font-weight="600">${productTitle}</text>

      <!-- Net Quantity -->
      <text x="0" y="32" font-weight="bold" font-size="14">NET QUANTITY:</text>
      <text x="140" y="32" font-size="16" font-weight="bold" fill="#0284C7">${netQtyText}</text>

      <!-- MRP -->
      <text x="0" y="64" font-weight="bold" font-size="14">MAX RETAIL PRICE:</text>
      <text x="140" y="64" font-size="15" font-weight="bold" fill="#DC2626">${mrpText}</text>

      <!-- Mfg Date -->
      <text x="0" y="96" font-weight="bold" font-size="14">MFG / PKD DATE:</text>
      <text x="140" y="96" font-size="14">${mfgText}</text>

      <!-- Manufacturer & Address -->
      <text x="0" y="128" font-weight="bold" font-size="14">MANUFACTURER:</text>
      <text x="140" y="128" font-size="12" fill="#334155">${mfgAddrText}</text>

      <!-- Helpline -->
      <text x="0" y="176" font-weight="bold" font-size="14">CONSUMER CARE:</text>
      <text x="140" y="176" font-size="12" fill="#0F766E">${helplineText}</text>

      <!-- Origin if present -->
      ${originText ? `<text x="0" y="210" font-weight="bold" font-size="14">COUNTRY ORIGIN:</text>
      <text x="140" y="210" font-size="13" font-weight="bold" fill="#4338CA">${originText}</text>` : ''}
    </g>

    <!-- Barcode simulation at bottom right -->
    <g transform="translate(430, 640)">
      <rect x="0" y="0" width="110" height="40" fill="#000"/>
      <rect x="8" y="0" width="4" height="40" fill="#fff"/>
      <rect x="18" y="0" width="8" height="40" fill="#fff"/>
      <rect x="32" y="0" width="3" height="40" fill="#fff"/>
      <rect x="42" y="0" width="10" height="40" fill="#fff"/>
      <rect x="58" y="0" width="4" height="40" fill="#fff"/>
      <rect x="68" y="0" width="6" height="40" fill="#fff"/>
      <rect x="80" y="0" width="12" height="40" fill="#fff"/>
      <text x="55" y="52" font-family="monospace" font-size="10" text-anchor="middle" fill="#1E293B">8901234567890</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateInitialSampleProducts(): ScannedProduct[] {
  // Sample 1: Fully Compliant Indian Packaged Snack
  const sample1Image = createSampleLabelSvg(
    '<stop offset="0%" stop-color="#1E3A8A"/><stop offset="100%" stop-color="#3B82F6"/>',
    'PARLE-G',
    'GLUCOSE BISCUITS',
    '800 g',
    'MRP ₹ 40.00 (incl. of all taxes)',
    '08/2025',
    'Parle Products Pvt Ltd, Vile Parle East, Mumbai - 400057, MH, India',
    'Customer Officer, Tel: 1800-222-753, Email: cs@parle.biz',
    'India'
  );

  const sample1Extracted = [
    {
      id: 'f1',
      category: 'COMMODITY_NAME' as const,
      fieldName: 'Commodity Name',
      rawValue: 'GLUCOSE BISCUITS',
      parsedValue: 'GLUCOSE BISCUITS',
      confidence: 98,
      boundingBox: { x: 7, y: 14, width: 86, height: 8, label: 'Commodity Name' },
      isMissing: false
    },
    {
      id: 'f2',
      category: 'NET_QUANTITY' as const,
      fieldName: 'Net Quantity',
      rawValue: '800 g',
      parsedValue: '800 g',
      confidence: 99,
      boundingBox: { x: 30, y: 62, width: 35, height: 4, label: 'Net Quantity' },
      estimatedFontHeightMm: 3.5,
      isMissing: false
    },
    {
      id: 'f3',
      category: 'MAXIMUM_RETAIL_PRICE' as const,
      fieldName: 'Maximum Retail Price',
      rawValue: 'MRP ₹ 40.00 (incl. of all taxes)',
      parsedValue: 40.00,
      confidence: 97,
      boundingBox: { x: 30, y: 66, width: 55, height: 4, label: 'MRP' },
      estimatedFontHeightMm: 3.2,
      isMissing: false
    },
    {
      id: 'f4',
      category: 'DATE_MFG_PACK_IMPORT' as const,
      fieldName: 'Date of Mfg / Pack',
      rawValue: '08/2025',
      parsedValue: '08/2025',
      confidence: 96,
      boundingBox: { x: 30, y: 70, width: 25, height: 4, label: 'Mfg Date' },
      isMissing: false
    },
    {
      id: 'f5',
      category: 'MANUFACTURER_PACKER_IMPORTER' as const,
      fieldName: 'Manufacturer Details',
      rawValue: 'Parle Products Pvt Ltd, Vile Parle East, Mumbai - 400057, MH, India',
      parsedValue: 'Parle Products Pvt Ltd',
      confidence: 95,
      boundingBox: { x: 30, y: 74, width: 60, height: 5, label: 'Manufacturer' },
      isMissing: false
    },
    {
      id: 'f6',
      category: 'CONSUMER_CARE' as const,
      fieldName: 'Consumer Care Info',
      rawValue: 'Customer Officer, Tel: 1800-222-753, Email: cs@parle.biz',
      parsedValue: '1800-222-753',
      confidence: 94,
      boundingBox: { x: 30, y: 81, width: 60, height: 5, label: 'Consumer Care' },
      isMissing: false
    },
    {
      id: 'f7',
      category: 'COUNTRY_OF_ORIGIN' as const,
      fieldName: 'Country of Origin',
      rawValue: 'India',
      parsedValue: 'India',
      confidence: 99,
      boundingBox: { x: 30, y: 85, width: 30, height: 4, label: 'Origin' },
      isMissing: false
    }
  ];

  const dim1 = {
    pdpAreaCm2: 220,
    estimatedPackageType: 'POUCH' as const,
    minRequiredFontHeightMm: 2.0,
    detectedMinFontHeightMm: 3.2
  };
  const ruleChecks1 = evaluateLegalMetrologyRules(sample1Extracted, dim1, false);
  const score1 = calculateComplianceScore(ruleChecks1);

  const product1: ScannedProduct = {
    id: 'LM-2026-001',
    barcode: '8901234567890',
    productName: 'Parle-G Glucose Biscuits 800g',
    brandName: 'Parle',
    category: 'Food Products / Snacks',
    manufacturerName: 'Parle Products Pvt Ltd',
    countryOfOrigin: 'India',
    imageUrl: sample1Image,
    scannedAt: '2026-09-09T14:32:00Z',
    inspectorName: 'Inspector Arjun Sharma (Zone 4)',
    inspectorLocation: 'Connaught Place, New Delhi',
    dimensions: dim1,
    extractedFields: sample1Extracted,
    ruleChecks: ruleChecks1,
    overallScore: score1.score,
    overallStatus: score1.status,
    violationsCount: score1.violationsCount,
    enforcementStatus: 'CLOSED_COMPLIANT'
  };

  // Sample 2: Non-Compliant Snack Pack (Invalid unit symbol 'gms' & missing tax inclusion text)
  const sample2Image = createSampleLabelSvg(
    '<stop offset="0%" stop-color="#991B1B"/><stop offset="100%" stop-color="#EF4444"/>',
    'CRISP-X',
    'SPICY POTATO CHIPS',
    '150 gms', // VIOLATION: gms is illegal!
    'MRP Rs 50.00', // VIOLATION: Missing (incl. of all taxes)
    '11/2025',
    'Crispx Foods, Sector 62, Noida, UP',
    'Call: 9876543210', // VIOLATION: Missing email!
    'India'
  );

  const sample2Extracted = [
    {
      id: 'f21',
      category: 'COMMODITY_NAME' as const,
      fieldName: 'Commodity Name',
      rawValue: 'SPICY POTATO CHIPS',
      parsedValue: 'SPICY POTATO CHIPS',
      confidence: 96,
      boundingBox: { x: 7, y: 14, width: 86, height: 8, label: 'Commodity Name' },
      isMissing: false
    },
    {
      id: 'f22',
      category: 'NET_QUANTITY' as const,
      fieldName: 'Net Quantity',
      rawValue: '150 gms',
      parsedValue: '150 gms',
      confidence: 99,
      boundingBox: { x: 30, y: 62, width: 35, height: 4, label: 'Net Quantity' },
      estimatedFontHeightMm: 1.2, // VIOLATION: Font height 1.2mm < required 2.0mm
      isMissing: false
    },
    {
      id: 'f23',
      category: 'MAXIMUM_RETAIL_PRICE' as const,
      fieldName: 'Maximum Retail Price',
      rawValue: 'MRP Rs 50.00',
      parsedValue: 50.00,
      confidence: 97,
      boundingBox: { x: 30, y: 66, width: 45, height: 4, label: 'MRP' },
      estimatedFontHeightMm: 1.1,
      isMissing: false
    },
    {
      id: 'f24',
      category: 'DATE_MFG_PACK_IMPORT' as const,
      fieldName: 'Date of Mfg / Pack',
      rawValue: '11/2025',
      parsedValue: '11/2025',
      confidence: 95,
      boundingBox: { x: 30, y: 70, width: 25, height: 4, label: 'Mfg Date' },
      isMissing: false
    },
    {
      id: 'f25',
      category: 'MANUFACTURER_PACKER_IMPORTER' as const,
      fieldName: 'Manufacturer Details',
      rawValue: 'Crispx Foods Pvt Ltd, Sector 62, Noida, UP Pin 201301',
      parsedValue: 'Crispx Foods Pvt Ltd',
      confidence: 92,
      boundingBox: { x: 30, y: 74, width: 60, height: 5, label: 'Manufacturer' },
      isMissing: false
    },
    {
      id: 'f26',
      category: 'CONSUMER_CARE' as const,
      fieldName: 'Consumer Care Info',
      rawValue: 'Call: 9876543210',
      parsedValue: '9876543210',
      confidence: 90,
      boundingBox: { x: 30, y: 81, width: 60, height: 5, label: 'Consumer Care' },
      isMissing: false
    }
  ];

  const dim2 = {
    pdpAreaCm2: 180,
    estimatedPackageType: 'POUCH' as const,
    minRequiredFontHeightMm: 2.0,
    detectedMinFontHeightMm: 1.2
  };

  const ruleChecks2 = evaluateLegalMetrologyRules(sample2Extracted, dim2, false);
  const score2 = calculateComplianceScore(ruleChecks2);

  const product2: ScannedProduct = {
    id: 'LM-2026-002',
    barcode: '8909876543210',
    productName: 'Crisp-X Spicy Potato Chips 150g',
    brandName: 'Crisp-X',
    category: 'Food Products / Snacks',
    manufacturerName: 'Crispx Foods Pvt Ltd',
    countryOfOrigin: 'India',
    imageUrl: sample2Image,
    scannedAt: '2026-09-09T16:15:00Z',
    inspectorName: 'Inspector Sunita Verma',
    inspectorLocation: 'Metro Mart, Bengaluru',
    dimensions: dim2,
    extractedFields: sample2Extracted,
    ruleChecks: ruleChecks2,
    overallScore: score2.score,
    overallStatus: score2.status,
    violationsCount: score2.violationsCount,
    enforcementStatus: 'NOTICE_ISSUED',
    noticeDetails: {
      noticeNumber: 'NOTICE/LM/2026/0892',
      issuedDate: '2026-09-09',
      hearingDate: '2026-09-23',
      penaltyAmount: 25000,
      notes: 'Notice issued under Section 36 for non-standard net qty symbol (gms), missing tax inclusion declaration in MRP, undersized font height, and incomplete consumer helpline email.'
    }
  };

  // Sample 3: Imported Skincare Cream (Review Required: 75/100, Incomplete address & date format warning)
  const sample3Image = createSampleLabelSvg(
    '<stop offset="0%" stop-color="#4C1D95"/><stop offset="100%" stop-color="#8B5CF6"/>',
    'LUXE-GLOW',
    'HYDRATING FACE CREAM',
    '50 ml',
    'MRP ₹ 1,499.00 (incl. of all taxes)',
    '2026', // Warning: Year only without MM/YYYY
    'Apex Retail Ltd', // Warning: Missing street address details
    'Helpline: 022-26001122', // Missing Email
    'France'
  );

  const sample3Extracted = [
    {
      id: 'f31',
      category: 'COMMODITY_NAME' as const,
      fieldName: 'Commodity Name',
      rawValue: 'HYDRATING FACE CREAM',
      parsedValue: 'HYDRATING FACE CREAM',
      confidence: 97,
      boundingBox: { x: 7, y: 14, width: 86, height: 8, label: 'Commodity Name' },
      isMissing: false
    },
    {
      id: 'f32',
      category: 'NET_QUANTITY' as const,
      fieldName: 'Net Quantity',
      rawValue: '50 ml',
      parsedValue: '50 ml',
      confidence: 99,
      boundingBox: { x: 30, y: 62, width: 35, height: 4, label: 'Net Quantity' },
      estimatedFontHeightMm: 1.8,
      isMissing: false
    },
    {
      id: 'f33',
      category: 'MAXIMUM_RETAIL_PRICE' as const,
      fieldName: 'Maximum Retail Price',
      rawValue: 'MRP 1,499.00 (incl. of all taxes)', // Currency symbol missing -> Minor warning (5 pts)
      parsedValue: 1499.00,
      confidence: 98,
      boundingBox: { x: 30, y: 66, width: 55, height: 4, label: 'MRP' },
      estimatedFontHeightMm: 1.8,
      isMissing: false
    },
    {
      id: 'f34',
      category: 'DATE_MFG_PACK_IMPORT' as const,
      fieldName: 'Date of Mfg / Pack',
      rawValue: '01/2026',
      parsedValue: '01/2026',
      confidence: 96,
      boundingBox: { x: 30, y: 70, width: 25, height: 4, label: 'Mfg Date' },
      isMissing: false
    },
    {
      id: 'f35',
      category: 'MANUFACTURER_PACKER_IMPORTER' as const,
      fieldName: 'Importer Details',
      rawValue: 'Apex Retail', // Incomplete address -> Minor warning (5 pts)
      parsedValue: 'Apex Retail',
      confidence: 94,
      boundingBox: { x: 30, y: 74, width: 60, height: 5, label: 'Importer' },
      isMissing: false
    },
    {
      id: 'f36',
      category: 'CONSUMER_CARE' as const,
      fieldName: 'Consumer Care Info',
      rawValue: 'Helpline: 022-26001122', // Missing Email -> Major check (15 pts)
      parsedValue: '022-26001122',
      confidence: 92,
      boundingBox: { x: 30, y: 81, width: 60, height: 5, label: 'Consumer Care' },
      isMissing: false
    },
    {
      id: 'f37',
      category: 'COUNTRY_OF_ORIGIN' as const,
      fieldName: 'Country of Origin',
      rawValue: 'Country of Origin: France',
      parsedValue: 'France',
      confidence: 98,
      isMissing: false
    }
  ];

  const dim3 = {
    pdpAreaCm2: 90,
    estimatedPackageType: 'CYLINDRICAL' as const,
    minRequiredFontHeightMm: 1.5,
    detectedMinFontHeightMm: 1.8
  };

  const ruleChecks3 = evaluateLegalMetrologyRules(sample3Extracted, dim3, true);
  const score3 = calculateComplianceScore(ruleChecks3);

  const product3: ScannedProduct = {
    id: 'LM-2026-003',
    barcode: '8904567890123',
    productName: 'Luxe-Glow Hydrating Cream 50ml',
    brandName: 'Luxe-Glow',
    category: 'Cosmetics & Personal Care',
    manufacturerName: 'Cosmo International Inc.',
    importerName: 'Apex Retail Ltd',
    countryOfOrigin: 'France',
    imageUrl: sample3Image,
    scannedAt: '2026-09-08T11:20:00Z',
    inspectorName: 'Inspector Amit Shah',
    inspectorLocation: 'Phoenix Mall, Mumbai',
    dimensions: dim3,
    extractedFields: sample3Extracted,
    ruleChecks: ruleChecks3,
    overallScore: score3.score,
    overallStatus: score3.status,
    violationsCount: score3.violationsCount,
    enforcementStatus: 'UNDER_INSPECTION'
  };

  // Sample 4: Edible Oil Can 5 Litres (Score 85/100, PASS with Missing Consumer Care Telephone Number)
  const sample4Image = createSampleLabelSvg(
    '<stop offset="0%" stop-color="#854D0E"/><stop offset="100%" stop-color="#EAB308"/>',
    'PURE-GOLD',
    'REFINED SUNFLOWER OIL',
    '5 L',
    'MRP ₹ 820.00 (incl. of all taxes)',
    '05/2025',
    'PureGold Agro Foods, GIDC Estate, Ahmedabad, Gujarat',
    'Email: care@puregold.in (Tel No Missing)', // Missing Telephone Number!
    'India'
  );

  const sample4Extracted = [
    {
      id: 'f41',
      category: 'COMMODITY_NAME' as const,
      fieldName: 'Commodity Name',
      rawValue: 'REFINED SUNFLOWER OIL',
      parsedValue: 'REFINED SUNFLOWER OIL',
      confidence: 99,
      boundingBox: { x: 7, y: 14, width: 86, height: 8, label: 'Commodity Name' },
      isMissing: false
    },
    {
      id: 'f42',
      category: 'NET_QUANTITY' as const,
      fieldName: 'Net Quantity',
      rawValue: '5 L',
      parsedValue: '5 L',
      confidence: 99,
      boundingBox: { x: 30, y: 62, width: 35, height: 4, label: 'Net Quantity' },
      estimatedFontHeightMm: 4.5,
      isMissing: false
    },
    {
      id: 'f43',
      category: 'MAXIMUM_RETAIL_PRICE' as const,
      fieldName: 'Maximum Retail Price',
      rawValue: 'MRP ₹ 820.00 (incl. of all taxes)',
      parsedValue: 820.00,
      confidence: 98,
      boundingBox: { x: 30, y: 66, width: 55, height: 4, label: 'MRP' },
      estimatedFontHeightMm: 4.2,
      isMissing: false
    },
    {
      id: 'f44',
      category: 'DATE_MFG_PACK_IMPORT' as const,
      fieldName: 'Date of Mfg / Pack',
      rawValue: '05/2025',
      parsedValue: '05/2025',
      confidence: 97,
      boundingBox: { x: 30, y: 70, width: 25, height: 4, label: 'Mfg Date' },
      isMissing: false
    },
    {
      id: 'f45',
      category: 'MANUFACTURER_PACKER_IMPORTER' as const,
      fieldName: 'Manufacturer Details',
      rawValue: 'PureGold Agro Foods, GIDC Estate, Ahmedabad, Gujarat',
      parsedValue: 'PureGold Agro Foods',
      confidence: 95,
      boundingBox: { x: 30, y: 74, width: 60, height: 5, label: 'Manufacturer' },
      isMissing: false
    },
    {
      id: 'f46',
      category: 'CONSUMER_CARE' as const,
      fieldName: 'Consumer Care Info',
      rawValue: 'Email: care@puregold.in, GIDC Estate, Ahmedabad', // VIOLATION: Missing telephone number!
      parsedValue: 'care@puregold.in',
      confidence: 96,
      boundingBox: { x: 30, y: 81, width: 60, height: 5, label: 'Consumer Care' },
      isMissing: false
    },
    {
      id: 'f47',
      category: 'UNIT_SALE_PRICE' as const,
      fieldName: 'Unit Sale Price (USP)',
      rawValue: '₹ 164.00 per L',
      parsedValue: 164.00,
      confidence: 98,
      boundingBox: { x: 30, y: 86, width: 45, height: 4, label: 'USP' },
      isMissing: false
    }
  ];

  const dim4 = {
    pdpAreaCm2: 650,
    estimatedPackageType: 'CYLINDRICAL' as const,
    minRequiredFontHeightMm: 4.0,
    detectedMinFontHeightMm: 4.2
  };

  const ruleChecks4 = evaluateLegalMetrologyRules(sample4Extracted, dim4, false);
  const score4 = calculateComplianceScore(ruleChecks4);

  const product4: ScannedProduct = {
    id: 'LM-2026-004',
    barcode: '8907890123456',
    productName: 'Pure-Gold Refined Sunflower Oil 5L Can',
    brandName: 'Pure-Gold',
    category: 'Edible Oils & Fats',
    manufacturerName: 'PureGold Agro Foods',
    countryOfOrigin: 'India',
    imageUrl: sample4Image,
    scannedAt: '2026-09-07T09:45:00Z',
    inspectorName: 'Inspector Arjun Sharma (Zone 4)',
    inspectorLocation: 'APMC Market, Ahmedabad',
    dimensions: dim4,
    extractedFields: sample4Extracted,
    ruleChecks: ruleChecks4,
    overallScore: score4.score,
    overallStatus: score4.status,
    violationsCount: score4.violationsCount,
    enforcementStatus: 'CLOSED_COMPLIANT',
    noticeDetails: {
      noticeNumber: 'ADVISORY/LM/2026/0410',
      issuedDate: '2026-09-07',
      hearingDate: '2026-09-14',
      penaltyAmount: 0,
      notes: 'Advisory notice under Rule 6(1)(f) to update Consumer Care telephone helpline number on PDP. Product satisfies overall statutory compliance threshold.'
    }
  };

  return [product1, product2, product3, product4];
}

export function getSampleComplianceStats(): ComplianceStats {
  return {
    totalScanned: 1420,
    totalCompliant: 1115,
    totalNonCompliant: 305,
    passPercentage: 78.5,
    noticesIssued: 218,
    totalPenaltiesCollected: 4850000, // ₹48.5 Lakhs
    violationsByCategory: {
      NET_QUANTITY: 112,
      MAXIMUM_RETAIL_PRICE: 89,
      FONT_SIZE_READABILITY: 74,
      CONSUMER_CARE: 65,
      COUNTRY_OF_ORIGIN: 52,
      MANUFACTURER_PACKER_IMPORTER: 41,
      DATE_MFG_PACK_IMPORT: 38,
      UNIT_SALE_PRICE: 29,
      COMMODITY_NAME: 18,
      BEST_BEFORE_EXPIRY: 14
    },
    monthlyTrends: [
      { month: 'Apr 2026', compliant: 180, nonCompliant: 55 },
      { month: 'May 2026', compliant: 210, nonCompliant: 62 },
      { month: 'Jun 2026', compliant: 235, nonCompliant: 58 },
      { month: 'Jul 2026', compliant: 260, nonCompliant: 49 },
      { month: 'Aug 2026', compliant: 280, nonCompliant: 42 },
      { month: 'Sep 2026', compliant: 315, nonCompliant: 39 }
    ],
    topNonCompliantBrands: [
      { brand: 'Crisp-X Foods', violationsCount: 42, passRate: 45.0 },
      { brand: 'Global Import Traders', violationsCount: 38, passRate: 52.5 },
      { brand: 'Luxe Cosmetics Ltd', violationsCount: 29, passRate: 61.0 },
      { brand: 'QuickBite Snacks', violationsCount: 24, passRate: 66.7 },
      { brand: 'MegaMart Private Label', violationsCount: 18, passRate: 72.0 }
    ]
  };
}

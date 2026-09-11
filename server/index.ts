import express, { Request, Response } from 'express';
import cors from 'cors';
import { 
  generateInitialSampleProducts, 
  getSampleComplianceStats 
} from '../src/services/sampleDataService';
import { 
  evaluateLegalMetrologyRules, 
  calculateComplianceScore,
  getMinRequiredFontHeightMm
} from '../src/services/metrologyRulesEngine';
import { getProductCanonicalStatus } from '../src/services/complianceStatusHelper';
import type { ScannedProduct, ExtractedField, PackageDimensions } from '../src/types/metrology';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-memory Database Store initialized with sample packaged commodities
let dbProducts: ScannedProduct[] = generateInitialSampleProducts();

/**
 * GET /api/health - Backend Health & Rule Engine Status
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    systemName: 'Disha Legal Metrology Compliance API',
    actReference: 'Legal Metrology Act, 2009 & Legal Metrology (Packaged Commodities) Rules, 2011',
    ruleEngineVersion: '2026.1.0',
    totalRecords: dbProducts.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/dashboard/stats - Compliance Analytics & KPI Metrics
 */
app.get('/api/dashboard/stats', (req: Request, res: Response) => {
  const sampleStats = getSampleComplianceStats();
  
  // Calculate dynamic stats from live dbProducts using canonical status
  const totalScanned = dbProducts.length;
  const totalCompliant = dbProducts.filter(p => getProductCanonicalStatus(p) === 'PASS').length;
  const totalNonCompliant = totalScanned - totalCompliant;
  const passPercentage = totalScanned > 0 ? parseFloat(((totalCompliant / totalScanned) * 100).toFixed(1)) : 100;
  const noticesIssued = dbProducts.filter(p => p.enforcementStatus === 'NOTICE_ISSUED').length;

  res.json({
    ...sampleStats,
    liveDb: {
      totalScanned,
      totalCompliant,
      totalNonCompliant,
      passPercentage,
      noticesIssued
    }
  });
});

/**
 * GET /api/products - Search & Filter Scanned Product Repository
 */
app.get('/api/products', (req: Request, res: Response) => {
  const { query, status, category } = req.query;

  let results = [...dbProducts];

  if (query && typeof query === 'string') {
    const q = query.toLowerCase();
    results = results.filter(p => 
      p.productName.toLowerCase().includes(q) ||
      p.brandName.toLowerCase().includes(q) ||
      p.manufacturerName.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q))
    );
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    results = results.filter(p => p.overallStatus === status);
  }

  if (category && typeof category === 'string' && category !== 'ALL') {
    results = results.filter(p => p.category === category);
  }

  res.json({
    count: results.length,
    products: results
  });
});

/**
 * GET /api/products/:id - Single Product Inspection Report Details
 */
app.get('/api/products/:id', (req: Request, res: Response) => {
  const product = dbProducts.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Inspection record not found' });
  }
  res.json(product);
});

/**
 * POST /api/scan - Automated Packaging Label OCR Analysis & Legal Verification
 */
app.post('/api/scan', (req: Request, res: Response) => {
  const { imageUrl, fileName, inspectorName, inspectorLocation, isImported } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Packaging image (imageUrl or base64) is required.' });
  }

  const name = fileName || 'Scanned_Packaging_Label.jpg';
  const inspector = inspectorName || 'Inspector Officer (Zone 4)';
  const location = inspectorLocation || 'Field Inspection Unit';
  const imported = Boolean(isImported);

  // Simulated Server-side OCR field extraction
  const extractedFields: ExtractedField[] = [
    {
      id: 'ext_1',
      category: 'COMMODITY_NAME',
      fieldName: 'Commodity Name',
      rawValue: name.replace(/\.[^/.]+$/, "").replace(/_/g, " ").toUpperCase(),
      parsedValue: name.replace(/\.[^/.]+$/, "").replace(/_/g, " ").toUpperCase(),
      confidence: 96,
      boundingBox: { x: 10, y: 14, width: 80, height: 8, label: 'Commodity Name' },
      isMissing: false
    },
    {
      id: 'ext_2',
      category: 'NET_QUANTITY',
      fieldName: 'Net Quantity',
      rawValue: /gms/i.test(name) ? '250 gms' : '500 g',
      parsedValue: '500 g',
      confidence: 98,
      boundingBox: { x: 30, y: 60, width: 35, height: 4, label: 'Net Quantity' },
      estimatedFontHeightMm: /small/i.test(name) ? 1.2 : 2.5,
      isMissing: false
    },
    {
      id: 'ext_3',
      category: 'MAXIMUM_RETAIL_PRICE',
      fieldName: 'Maximum Retail Price',
      rawValue: /notax/i.test(name) ? 'MRP Rs. 150.00' : 'MRP ₹ 150.00 (incl. of all taxes)',
      parsedValue: 150.00,
      confidence: 97,
      boundingBox: { x: 30, y: 65, width: 55, height: 4, label: 'MRP' },
      estimatedFontHeightMm: 2.2,
      isMissing: false
    },
    {
      id: 'ext_4',
      category: 'DATE_MFG_PACK_IMPORT',
      fieldName: 'Date of Mfg / Pack',
      rawValue: '09/2025',
      parsedValue: '09/2025',
      confidence: 95,
      boundingBox: { x: 30, y: 70, width: 25, height: 4, label: 'Mfg Date' },
      isMissing: false
    },
    {
      id: 'ext_5',
      category: 'MANUFACTURER_PACKER_IMPORTER',
      fieldName: 'Manufacturer / Packer',
      rawValue: `${name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')} Operations Pvt Ltd, Industrial Area, Sector 4, New Delhi - 110020`,
      parsedValue: `${name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')} Operations Pvt Ltd`,
      confidence: 93,
      boundingBox: { x: 30, y: 74, width: 60, height: 5, label: 'Manufacturer' },
      isMissing: false
    },
    {
      id: 'ext_6',
      category: 'CONSUMER_CARE',
      fieldName: 'Consumer Care Contact',
      rawValue: 'Consumer Helpline: 1800-444-555, email: care@packagedgoods.in',
      parsedValue: '1800-444-555',
      confidence: 94,
      boundingBox: { x: 30, y: 81, width: 60, height: 5, label: 'Consumer Care' },
      isMissing: false
    }
  ];

  if (imported) {
    extractedFields.push({
      id: 'ext_7',
      category: 'COUNTRY_OF_ORIGIN',
      fieldName: 'Country of Origin',
      rawValue: 'Country of Origin: Germany',
      parsedValue: 'Germany',
      confidence: 99,
      boundingBox: { x: 30, y: 86, width: 40, height: 4, label: 'Country of Origin' },
      isMissing: false
    });
  }

  const pdpArea = 180;
  const dimensions: PackageDimensions = {
    pdpAreaCm2: pdpArea,
    estimatedPackageType: 'RECTANGULAR',
    minRequiredFontHeightMm: getMinRequiredFontHeightMm(pdpArea),
    detectedMinFontHeightMm: /small/i.test(name) ? 1.2 : 2.5
  };

  const ruleChecks = evaluateLegalMetrologyRules(extractedFields, dimensions, imported);
  const score = calculateComplianceScore(ruleChecks);

  const scannedProduct: ScannedProduct = {
    id: `LM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    barcode: `890${Math.floor(1000000009 + Math.random() * 900000000)}`,
    productName: name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
    brandName: name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
    category: 'General Commodities',
    manufacturerName: `${name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')} Operations Pvt Ltd`,
    countryOfOrigin: imported ? 'Germany' : 'India',
    imageUrl,
    scannedAt: new Date().toISOString(),
    inspectorName: inspector,
    inspectorLocation: location,
    dimensions,
    extractedFields,
    ruleChecks,
    overallScore: score.score,
    overallStatus: score.status,
    violationsCount: score.violationsCount,
    enforcementStatus: score.status === 'NON_COMPLIANT' ? 'UNDER_INSPECTION' : 'CLOSED_COMPLIANT'
  };

  // Persist to in-memory database
  dbProducts.unshift(scannedProduct);

  res.status(201).json({
    message: 'Packaging label successfully scanned and evaluated against Legal Metrology Rules, 2011.',
    product: scannedProduct
  });
});

/**
 * POST /api/products/:id/notice - Issue Statutory Legal Notice (Sec 36 / 48)
 */
app.post('/api/products/:id/notice', (req: Request, res: Response) => {
  const { noticeNumber, penaltyAmount, hearingDate, notes } = req.body;

  const productIndex = dbProducts.findIndex(p => p.id === req.params.id);
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product inspection record not found.' });
  }

  const updated: ScannedProduct = {
    ...dbProducts[productIndex],
    enforcementStatus: 'NOTICE_ISSUED',
    noticeDetails: {
      noticeNumber: noticeNumber || `NOTICE/LM/2026/${Math.floor(1000 + Math.random() * 9000)}`,
      issuedDate: new Date().toISOString().split('T')[0],
      hearingDate: hearingDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      penaltyAmount: Number(penaltyAmount) || 25000,
      notes: notes || 'Statutory Notice issued under Section 36 of Legal Metrology Act, 2009.'
    }
  };

  dbProducts[productIndex] = updated;

  res.json({
    message: 'Statutory Legal Metrology notice issued successfully.',
    product: updated
  });
});

/**
 * GET /api/rules - Legal Metrology Rules Handbook Matrix & Font Tables
 */
app.get('/api/rules', (req: Request, res: Response) => {
  res.json({
    act: 'Legal Metrology Act, 2009',
    rules: 'Legal Metrology (Packaged Commodities) Rules, 2011',
    rule6Declarations: [
      { rule: 'Rule 6(1)(a)', title: 'Manufacturer/Packer/Importer Details', format: 'Full Name & Postal Address with PIN code' },
      { rule: 'Rule 6(1)(b)', title: 'Generic Commodity Name', format: 'Common or Generic Name of Commodity' },
      { rule: 'Rule 6(1)(c)', title: 'Net Quantity Units', format: 'Standard SI Units (g, kg, ml, L, N). Non-compliant: gms, ML, Ltr' },
      { rule: 'Rule 6(1)(d)', title: 'Date of Mfg/Pack/Import', format: 'MM/YYYY or Month Year' },
      { rule: 'Rule 6(1)(e)', title: 'Maximum Retail Price (MRP)', format: 'MRP ₹ XX.XX (incl. of all taxes)' },
      { rule: 'Rule 6(1)(f)', title: 'Consumer Care Contact', format: 'Name, Postal Address, Phone Number AND Email' },
      { rule: 'Rule 6(1)(aa)', title: 'Country of Origin', format: 'Country of Origin: [Country] (Mandatory for Imports)' },
      { rule: 'Rule 6(10)', title: 'Unit Sale Price (USP)', format: '₹ per unit weight/volume for packs > 1kg / 1L' }
    ],
    rule6_2_fontHeightTable: [
      { pdpAreaCm2: '<= 50', minNumeralHeightMm: 1.0, minLetterHeightMm: 1.0 },
      { pdpAreaCm2: '50 - 100', minNumeralHeightMm: 1.5, minLetterHeightMm: 1.5 },
      { pdpAreaCm2: '100 - 500', minNumeralHeightMm: 2.0, minLetterHeightMm: 2.0 },
      { pdpAreaCm2: '500 - 2500', minNumeralHeightMm: 4.0, minLetterHeightMm: 2.0 },
      { pdpAreaCm2: '> 2500', minNumeralHeightMm: 6.0, minLetterHeightMm: 3.0 }
    ],
    penaltySchedule: [
      { section: 'Section 36(1)', description: 'Non-standard package declarations', fine: 'Up to ₹25,000 (First Offence), ₹50,000 / Imprisonment (Repeat)' },
      { section: 'Section 36(2)', description: 'Selling above MRP', fine: 'Up to ₹25,000' },
      { section: 'Section 48', description: 'Compounding of Offences', process: 'Compounding fee upon label rectification' }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Disha Legal Metrology Compliance REST API Server`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  Endpoints:`);
  console.log(`    - GET  /api/health`);
  console.log(`    - GET  /api/dashboard/stats`);
  console.log(`    - GET  /api/products`);
  console.log(`    - GET  /api/products/:id`);
  console.log(`    - POST /api/scan`);
  console.log(`    - POST /api/products/:id/notice`);
  console.log(`    - GET  /api/rules`);
  console.log(`=======================================================`);
});

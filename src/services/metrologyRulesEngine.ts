import type { ExtractedField, LegalRuleCheck, PackageDimensions } from '../types/metrology';

/**
 * Minimum required font height in mm under Rule 6(2) of Legal Metrology Rules, 2011
 * based on Principal Display Panel (PDP) surface area in cm^2
 */
export function getMinRequiredFontHeightMm(pdpAreaCm2: number): number {
  if (pdpAreaCm2 <= 50) return 1.0;
  if (pdpAreaCm2 <= 100) return 1.5;
  if (pdpAreaCm2 <= 500) return 2.0;
  if (pdpAreaCm2 <= 2500) return 4.0;
  return 6.0;
}

/**
 * Validates extracted declarations against Legal Metrology (Packaged Commodities) Rules, 2011
 */
export function evaluateLegalMetrologyRules(
  extractedFields: ExtractedField[],
  dimensions: PackageDimensions,
  isImported: boolean = false
): LegalRuleCheck[] {
  const ruleChecks: LegalRuleCheck[] = [];

  const getField = (category: string) => extractedFields.find(f => f.category === category);

  // 1. Rule 6(1)(a): Manufacturer / Packer / Importer Name & Address
  const mfgField = getField('MANUFACTURER_PACKER_IMPORTER');
  if (!mfgField || mfgField.isMissing || !mfgField.rawValue.trim()) {
    ruleChecks.push({
      ruleId: 'RULE_6_1_A',
      ruleNumber: 'Rule 6(1)(a)',
      title: 'Manufacturer / Packer / Importer Name & Address',
      description: 'Every package must display the full name and address of the manufacturer, packer, or importer.',
      category: 'MANUFACTURER_PACKER_IMPORTER',
      isMandatory: true,
      status: 'FAIL',
      severity: 'CRITICAL',
      observedValue: mfgField?.rawValue || 'MISSING',
      expectedFormat: 'Full Name and Complete Postal Address with Pin Code',
      legalReference: 'Rule 6(1)(a) of Legal Metrology (Packaged Commodities) Rules, 2011',
      remedialAction: 'Print complete manufacturer/packer address with city, state & pincode on PDP.',
      penaltySection: 'Section 36 of Legal Metrology Act, 2009 (Fine up to ₹25,000)'
    });
  } else {
    const hasAddress = /address|road|street|city|state|pin|dist|h.no|no\.|nagar|pvt|ltd|inc|llp/i.test(mfgField.rawValue);
    ruleChecks.push({
      ruleId: 'RULE_6_1_A',
      ruleNumber: 'Rule 6(1)(a)',
      title: 'Manufacturer / Packer / Importer Name & Address',
      description: 'Every package must display the full name and address of the manufacturer, packer, or importer.',
      category: 'MANUFACTURER_PACKER_IMPORTER',
      isMandatory: true,
      status: hasAddress ? 'PASS' : 'WARNING',
      severity: hasAddress ? 'COMPLIANT' : 'MINOR',
      observedValue: mfgField.rawValue,
      expectedFormat: 'Full Name and Complete Address',
      legalReference: 'Rule 6(1)(a) of Legal Metrology (Packaged Commodities) Rules, 2011',
      remedialAction: hasAddress ? 'N/A' : 'Ensure complete street address and pin code are included.',
      penaltySection: 'Section 36 of Legal Metrology Act, 2009'
    });
  }

  // 2. Rule 6(1)(b): Generic / Common Name of Commodity
  const commodityField = getField('COMMODITY_NAME');
  if (!commodityField || commodityField.isMissing || !commodityField.rawValue.trim()) {
    ruleChecks.push({
      ruleId: 'RULE_6_1_B',
      ruleNumber: 'Rule 6(1)(b)',
      title: 'Generic or Common Name of Commodity',
      description: 'The common or generic name of the commodity contained in the package must be clearly stated.',
      category: 'COMMODITY_NAME',
      isMandatory: true,
      status: 'FAIL',
      severity: 'MAJOR',
      observedValue: 'MISSING',
      expectedFormat: 'Generic/Common Name (e.g., Biscuit, Edible Oil, Toothpaste)',
      legalReference: 'Rule 6(1)(b) of Legal Metrology (Packaged Commodities) Rules, 2011',
      remedialAction: 'Add explicit generic name of the commodity on the principal display panel.',
      penaltySection: 'Section 36 of Legal Metrology Act, 2009'
    });
  } else {
    ruleChecks.push({
      ruleId: 'RULE_6_1_B',
      ruleNumber: 'Rule 6(1)(b)',
      title: 'Generic or Common Name of Commodity',
      description: 'The common or generic name of the commodity contained in the package must be clearly stated.',
      category: 'COMMODITY_NAME',
      isMandatory: true,
      status: 'PASS',
      severity: 'COMPLIANT',
      observedValue: commodityField.rawValue,
      expectedFormat: 'Generic/Common Name',
      legalReference: 'Rule 6(1)(b) of Legal Metrology (Packaged Commodities) Rules, 2011',
      remedialAction: 'N/A',
      penaltySection: 'Section 36 of Legal Metrology Act, 2009'
    });
  }

  // 3. Rule 6(1)(c): Net Quantity & Unit Standard Symbol Compliance
  const netQtyField = getField('NET_QUANTITY');
  if (!netQtyField || netQtyField.isMissing || !netQtyField.rawValue.trim()) {
    ruleChecks.push({
      ruleId: 'RULE_6_1_C',
      ruleNumber: 'Rule 6(1)(c)',
      title: 'Net Quantity Declaration',
      description: 'Net quantity must be declared in terms of standard unit of weight, volume, or length.',
      category: 'NET_QUANTITY',
      isMandatory: true,
      status: 'FAIL',
      severity: 'CRITICAL',
      observedValue: 'MISSING',
      expectedFormat: 'Standard Qty with legal units e.g., 500 g, 1 kg, 250 ml, 1 L, 10 N',
      legalReference: 'Rule 6(1)(c) & Rule 13 of Legal Metrology (Packaged Commodities) Rules, 2011',
      remedialAction: 'State Net Quantity using standard metric symbols without abbreviations or plural suffixes.',
      penaltySection: 'Section 36 of Legal Metrology Act, 2009 (Fine up to ₹25,000)'
    });
  } else {
    const rawVal = netQtyField.rawValue;
    // Check for illegal non-standard unit symbols (e.g. gms, gm, Ltr, kilo, g.)
    const hasIllegalUnits = /\b(gms|gm|g\.|Ltr|ltrs|kilo|kilos|pcs\.|nos\.)\b/i.test(rawVal);
    const hasStandardUnit = /\b(g|kg|ml|l|L|N|U|units|pieces)\b/i.test(rawVal.replace(/gms|gm|Ltr/gi, ''));

    if (hasIllegalUnits) {
      ruleChecks.push({
        ruleId: 'RULE_6_1_C',
        ruleNumber: 'Rule 6(1)(c)',
        title: 'Net Quantity Standard Unit Symbol Violation',
        description: 'Net quantity unit symbol does not comply with mandatory Legal Metrology standards. Non-standard symbols like "gms", "gm", "ML", or "Ltr" are strictly illegal.',
        category: 'NET_QUANTITY',
        isMandatory: true,
        status: 'FAIL',
        severity: 'MAJOR',
        observedValue: rawVal,
        expectedFormat: 'Standard units only: "g", "kg", "ml", "L", "N" (e.g. "500 g" instead of "500 gms")',
        legalReference: 'Rule 6(1)(c) & Schedule II of Legal Metrology (Packaged Commodities) Rules, 2011',
        remedialAction: 'Replace non-standard unit symbol with prescribed symbol "g", "kg", "ml", or "L".',
        penaltySection: 'Section 36(1) of Legal Metrology Act, 2009'
      });
    } else if (!hasStandardUnit) {
      ruleChecks.push({
        ruleId: 'RULE_6_1_C',
        ruleNumber: 'Rule 6(1)(c)',
        title: 'Net Quantity Unit Missing or Unrecognized',
        description: 'Net quantity numerical value declared without a valid standard unit symbol.',
        category: 'NET_QUANTITY',
        isMandatory: true,
        status: 'FAIL',
        severity: 'MAJOR',
        observedValue: rawVal,
        expectedFormat: 'Numerical value followed by standard unit (e.g., 500 g, 1 L)',
        legalReference: 'Rule 6(1)(c) of Legal Metrology (Packaged Commodities) Rules, 2011',
        remedialAction: 'Add standard unit symbol (g, kg, ml, L, N) next to net quantity numeral.',
        penaltySection: 'Section 36 of Legal Metrology Act, 2009'
      });
    } else {
      ruleChecks.push({
        ruleId: 'RULE_6_1_C',
        ruleNumber: 'Rule 6(1)(c)',
        title: 'Net Quantity Standard Unit Compliance',
        description: 'Net quantity is correctly declared using prescribed standard SI unit symbols.',
        category: 'NET_QUANTITY',
        isMandatory: true,
        status: 'PASS',
        severity: 'COMPLIANT',
        observedValue: rawVal,
        expectedFormat: 'Standard Qty with prescribed legal unit',
        legalReference: 'Rule 6(1)(c) of Legal Metrology (Packaged Commodities) Rules, 2011',
        remedialAction: 'N/A',
        penaltySection: 'Section 36 of Legal Metrology Act, 2009'
      });
    }
  }

  // 4. Rule 6(1)(d): Month and Year of Manufacture / Packing / Import
  const mfgDateFields = getField('DATE_MFG_PACK_IMPORT');
  if (!mfgDateFields || mfgDateFields.isMissing || !mfgDateFields.rawValue.trim()) {
    ruleChecks.push({
      ruleId: 'RULE_6_1_D',
      ruleNumber: 'Rule 6(1)(d)',
      title: 'Month & Year of Manufacture / Packing / Import',
      description: 'Month and year of manufacture, packing, or import must be prominently displayed.',
      category: 'DATE_MFG_PACK_IMPORT',
      isMandatory: true,
      status: 'FAIL',
      severity: 'CRITICAL',
      observedValue: 'MISSING',
      expectedFormat: 'MM/YYYY or Month YYYY (e.g., 08/2025 or Aug 2025)',
      legalReference: 'Rule 6(1)(d) of Legal Metrology (Packaged Commodities) Rules, 2011',
      remedialAction: 'Print Month and Year of mfg/packing in prescribed MM/YYYY format.',
      penaltySection: 'Section 36 of Legal Metrology Act, 2009'
    });
  } else {
    const rawVal = mfgDateFields.rawValue;
    const isValidFormat = /\b(\d{2}\/\d{4}|\d{2}\/\d{2}|[A-Za-z]{3}\s*\d{4}|\d{2}-\d{4})\b/.test(rawVal) ||
      /mfg|pkd|packed|manufactured|imported/i.test(rawVal);
    
    ruleChecks.push({
      ruleId: 'RULE_6_1_D',
      ruleNumber: 'Rule 6(1)(d)',
      title: 'Month & Year of Manufacture / Packing / Import',
      description: 'Month and year of manufacture, packing, or import must be prominently displayed.',
      category: 'DATE_MFG_PACK_IMPORT',
      isMandatory: true,
      status: isValidFormat ? 'PASS' : 'WARNING',
      severity: isValidFormat ? 'COMPLIANT' : 'MINOR',
      observedValue: rawVal,
      expectedFormat: 'MM/YYYY or Month YYYY format',
      legalReference: 'Rule 6(1)(d) of Legal Metrology (Packaged Commodities) Rules, 2011',
      remedialAction: isValidFormat ? 'N/A' : 'Ensure date is explicitly formatted as MM/YYYY.',
      penaltySection: 'Section 36 of Legal Metrology Act, 2009'
    });
  }

  // 5. Rule 6(1)(e): Maximum Retail Price (MRP) & Tax Inclusion Declaration
  const mrpField = getField('MAXIMUM_RETAIL_PRICE');
  if (!mrpField || mrpField.isMissing || !mrpField.rawValue.trim()) {
    ruleChecks.push({
      ruleId: 'RULE_6_1_E',
      ruleNumber: 'Rule 6(1)(e)',
      title: 'Maximum Retail Price (MRP) Declaration',
      description: 'MRP must be stated with Indian Rupee symbol (₹) or Rs., and must explicitly state "inclusive of all taxes".',
      category: 'MAXIMUM_RETAIL_PRICE',
      isMandatory: true,
      status: 'FAIL',
      severity: 'CRITICAL',
      observedValue: 'MISSING',
      expectedFormat: 'MRP ₹ XX.XX (incl. of all taxes) or MRP Rs. XX.XX (inclusive of all taxes)',
      legalReference: 'Rule 6(1)(e) & Rule 2(m) of Legal Metrology (Packaged Commodities) Rules, 2011',
      remedialAction: 'Print MRP clearly stating "MRP ₹ XX.XX (incl. of all taxes)".',
      penaltySection: 'Section 36(2) of Legal Metrology Act, 2009 (Fine up to ₹25,000)'
    });
  } else {
    const rawVal = mrpField.rawValue;
    const hasTaxClause = /incl\.|inclusive|all\s*taxes|taxes/i.test(rawVal);
    const hasCurrency = /₹|rs|inr/i.test(rawVal);

    if (!hasTaxClause) {
      ruleChecks.push({
        ruleId: 'RULE_6_1_E_TAX',
        ruleNumber: 'Rule 6(1)(e)',
        title: 'MRP Tax Inclusion Clause Violation',
        description: 'MRP declared without the mandatory statutory clause "inclusive of all taxes" or "(incl. of all taxes)".',
        category: 'MAXIMUM_RETAIL_PRICE',
        isMandatory: true,
        status: 'FAIL',
        severity: 'MAJOR',
        observedValue: rawVal,
        expectedFormat: 'MRP ₹ XX.XX (incl. of all taxes)',
        legalReference: 'Rule 6(1)(e) of Legal Metrology (Packaged Commodities) Rules, 2011',
        remedialAction: 'Add statutory words "(inclusive of all taxes)" or "(incl. of all taxes)" alongside MRP.',
        penaltySection: 'Section 36 of Legal Metrology Act, 2009'
      });
    } else if (!hasCurrency) {
      ruleChecks.push({
        ruleId: 'RULE_6_1_E_CURRENCY',
        ruleNumber: 'Rule 6(1)(e)',
        title: 'MRP Currency Symbol Missing',
        description: 'MRP numeric value printed without Rupee symbol (₹) or Rs.',
        category: 'MAXIMUM_RETAIL_PRICE',
        isMandatory: true,
        status: 'FAIL',
        severity: 'MINOR',
        observedValue: rawVal,
        expectedFormat: 'MRP ₹ XX.XX',
        legalReference: 'Rule 6(1)(e) of Legal Metrology (Packaged Commodities) Rules, 2011',
        remedialAction: 'Prefix MRP value with ₹ symbol or Rs.',
        penaltySection: 'Section 36 of Legal Metrology Act, 2009'
      });
    } else {
      ruleChecks.push({
        ruleId: 'RULE_6_1_E',
        ruleNumber: 'Rule 6(1)(e)',
        title: 'Maximum Retail Price (MRP) Statutory Compliance',
        description: 'MRP is correctly declared with currency symbol and mandatory tax inclusion clause.',
        category: 'MAXIMUM_RETAIL_PRICE',
        isMandatory: true,
        status: 'PASS',
        severity: 'COMPLIANT',
        observedValue: rawVal,
        expectedFormat: 'MRP ₹ XX.XX (incl. of all taxes)',
        legalReference: 'Rule 6(1)(e) of Legal Metrology (Packaged Commodities) Rules, 2011',
        remedialAction: 'N/A',
        penaltySection: 'Section 36 of Legal Metrology Act, 2009'
      });
    }
  }

  // 6. Rule 6(1)(f): Consumer Care Details
  const consumerCareField = getField('CONSUMER_CARE');
  if (!consumerCareField || consumerCareField.isMissing || !consumerCareField.rawValue.trim()) {
    ruleChecks.push({
      ruleId: 'RULE_6_1_F',
      ruleNumber: 'Rule 6(1)(f)',
      title: 'Consumer Care / Helpline Details',
      description: 'Every package must display details of the person or office to be contacted in case of consumer complaints (Name/Designation, Address, Tel No, Email).',
      category: 'CONSUMER_CARE',
      isMandatory: true,
      status: 'FAIL',
      severity: 'CRITICAL',
      observedValue: 'MISSING',
      expectedFormat: 'Name/Manager, Full Postal Address, Phone Number, and Email ID',
      legalReference: 'Rule 6(1)(f) of Legal Metrology (Packaged Commodities) Rules, 2011',
      remedialAction: 'Add complete consumer helpline contact block with Toll-Free No. and Email.',
      penaltySection: 'Section 36 of Legal Metrology Act, 2009'
    });
  } else {
    const rawVal = consumerCareField.rawValue;
    const hasPhone = /(\+91|\b\d{10}\b|\b1800[-\s]?\d{3}[-\s]?\d{4}\b|tel|phone|contact|call)/i.test(rawVal);
    const hasEmail = /@|email|mail/i.test(rawVal);

    if (!hasPhone || !hasEmail) {
      const isMissingPhoneOnly = !hasPhone && hasEmail;
      const isMissingEmailOnly = hasPhone && !hasEmail;
      const title = isMissingPhoneOnly
        ? 'Consumer Care Telephone Number Missing'
        : isMissingEmailOnly
        ? 'Consumer Care Email Address Missing'
        : 'Incomplete Consumer Care Details';
      const description = isMissingPhoneOnly
        ? 'Consumer care section is missing mandatory telephone number.'
        : isMissingEmailOnly
        ? 'Consumer care section is missing mandatory email address.'
        : 'Consumer care section is missing mandatory telephone number and email address.';
      const remedialAction = isMissingPhoneOnly
        ? 'Please update and add the Consumer Care telephone number on the label.'
        : isMissingEmailOnly
        ? 'Please add the customer support email address in the customer care block.'
        : 'Include both phone number and valid email ID in the customer care block.';

      ruleChecks.push({
        ruleId: 'RULE_6_1_F_INCOMPLETE',
        ruleNumber: 'Rule 6(1)(f)',
        title,
        description,
        category: 'CONSUMER_CARE',
        isMandatory: true,
        status: 'FAIL',
        severity: 'MAJOR',
        observedValue: rawVal,
        expectedFormat: 'Name/Designation, Postal Address, Phone Number AND Email ID',
        legalReference: 'Rule 6(1)(f) of Legal Metrology (Packaged Commodities) Rules, 2011',
        remedialAction,
        penaltySection: 'Section 36 of Legal Metrology Act, 2009'
      });
    } else {
      ruleChecks.push({
        ruleId: 'RULE_6_1_F',
        ruleNumber: 'Rule 6(1)(f)',
        title: 'Consumer Care Details Compliance',
        description: 'Consumer care contact details (Phone, Email, Postal Address) are complete and valid.',
        category: 'CONSUMER_CARE',
        isMandatory: true,
        status: 'PASS',
        severity: 'COMPLIANT',
        observedValue: rawVal,
        expectedFormat: 'Full Contact Block with Phone & Email',
        legalReference: 'Rule 6(1)(f) of Legal Metrology (Packaged Commodities) Rules, 2011',
        remedialAction: 'N/A',
        penaltySection: 'Section 36 of Legal Metrology Act, 2009'
      });
    }
  }

  // 7. Rule 6(1)(aa): Country of Origin (Mandatory for Imported Goods)
  const countryField = getField('COUNTRY_OF_ORIGIN');
  if (isImported || (countryField && countryField.rawValue.trim())) {
    if (!countryField || countryField.isMissing || !countryField.rawValue.trim()) {
      ruleChecks.push({
        ruleId: 'RULE_6_1_AA',
        ruleNumber: 'Rule 6(1)(aa)',
        title: 'Country of Origin Declaration (Imported Packages)',
        description: 'Mandatory declaration of Country of Origin on imported commodities.',
        category: 'COUNTRY_OF_ORIGIN',
        isMandatory: true,
        status: 'FAIL',
        severity: 'CRITICAL',
        observedValue: 'MISSING',
        expectedFormat: 'Country of Origin: [Name of Country] (e.g. Country of Origin: USA / China / Germany)',
        legalReference: 'Rule 6(1)(aa) & Amendment Rules 2017/2021',
        remedialAction: 'Print "Country of Origin: [Country]" clearly on the package.',
        penaltySection: 'Section 36 of Legal Metrology Act, 2009'
      });
    } else {
      ruleChecks.push({
        ruleId: 'RULE_6_1_AA',
        ruleNumber: 'Rule 6(1)(aa)',
        title: 'Country of Origin Compliance',
        description: 'Country of Origin is prominently declared.',
        category: 'COUNTRY_OF_ORIGIN',
        isMandatory: true,
        status: 'PASS',
        severity: 'COMPLIANT',
        observedValue: countryField.rawValue,
        expectedFormat: 'Country of Origin declared',
        legalReference: 'Rule 6(1)(aa) of Legal Metrology Rules, 2011',
        remedialAction: 'N/A',
        penaltySection: 'Section 36 of Legal Metrology Act, 2009'
      });
    }
  }

  // 8. Rule 6(2): Minimum Font Size & Numeral Height Compliance
  const requiredMinFontMm = getMinRequiredFontHeightMm(dimensions.pdpAreaCm2);
  const detectedMinFontMm = dimensions.detectedMinFontHeightMm;

  if (detectedMinFontMm < requiredMinFontMm) {
    ruleChecks.push({
      ruleId: 'RULE_6_2_FONT_SIZE',
      ruleNumber: 'Rule 6(2)',
      title: 'Font Size & Declaration Height Defect',
      description: `Declaration font height (${detectedMinFontMm.toFixed(1)} mm) is below the minimum statutory height (${requiredMinFontMm.toFixed(1)} mm) required for a package PDP surface area of ${dimensions.pdpAreaCm2} cm².`,
      category: 'FONT_SIZE_READABILITY',
      isMandatory: true,
      status: 'FAIL',
      severity: 'MAJOR',
      observedValue: `Detected: ${detectedMinFontMm.toFixed(1)} mm (PDP Area: ${dimensions.pdpAreaCm2} cm²)`,
      expectedFormat: `Minimum font height >= ${requiredMinFontMm.toFixed(1)} mm under Rule 6(2) table`,
      legalReference: 'Rule 6(2) & Table under Rule 6(2) of Legal Metrology Rules, 2011',
      remedialAction: `Increase height of numerals and letters for Net Qty & MRP to at least ${requiredMinFontMm.toFixed(1)} mm.`,
      penaltySection: 'Section 36 of Legal Metrology Act, 2009'
    });
  } else {
    ruleChecks.push({
      ruleId: 'RULE_6_2_FONT_SIZE',
      ruleNumber: 'Rule 6(2)',
      title: 'Font Height & Numeral Readability Compliance',
      description: `Declaration font height (${detectedMinFontMm.toFixed(1)} mm) satisfies statutory minimum requirement (>= ${requiredMinFontMm.toFixed(1)} mm) for PDP surface area of ${dimensions.pdpAreaCm2} cm².`,
      category: 'FONT_SIZE_READABILITY',
      isMandatory: true,
      status: 'PASS',
      severity: 'COMPLIANT',
      observedValue: `Detected: ${detectedMinFontMm.toFixed(1)} mm (Req: >= ${requiredMinFontMm.toFixed(1)} mm)`,
      expectedFormat: `Font height >= ${requiredMinFontMm.toFixed(1)} mm`,
      legalReference: 'Rule 6(2) of Legal Metrology Rules, 2011',
      remedialAction: 'N/A',
      penaltySection: 'Section 36 of Legal Metrology Act, 2009'
    });
  }

  // 9. Rule 6(10): Unit Sale Price (USP) for Packages > 1 kg or > 1 L
  const uspField = getField('UNIT_SALE_PRICE');
  const netQtyVal = netQtyField?.rawValue || '';
  const isLargePack = /(1\s*kg|2\s*kg|5\s*kg|10\s*kg|1\s*l|2\s*l|5\s*l|1000\s*g|2000\s*g)/i.test(netQtyVal);

  if (isLargePack) {
    if (!uspField || uspField.isMissing || !uspField.rawValue.trim()) {
      ruleChecks.push({
        ruleId: 'RULE_6_10_USP',
        ruleNumber: 'Rule 6(10)',
        title: 'Unit Sale Price (USP) Declaration Missing',
        description: 'Packages containing net quantity greater than 1 kg or 1 L must declare Unit Sale Price (e.g. ₹ per g / ₹ per ml / ₹ per kg).',
        category: 'UNIT_SALE_PRICE',
        isMandatory: true,
        status: 'FAIL',
        severity: 'MAJOR',
        observedValue: 'MISSING',
        expectedFormat: 'Unit Sale Price: ₹ X.XX per g / kg / ml / L',
        legalReference: 'Rule 6(10) of Legal Metrology (Packaged Commodities) Rules (Amendment 2022)',
        remedialAction: 'Print Unit Sale Price (USP) calculated as price per unit weight/volume.',
        penaltySection: 'Section 36 of Legal Metrology Act, 2009'
      });
    } else {
      ruleChecks.push({
        ruleId: 'RULE_6_10_USP',
        ruleNumber: 'Rule 6(10)',
        title: 'Unit Sale Price (USP) Compliance',
        description: 'Unit Sale Price is correctly declared.',
        category: 'UNIT_SALE_PRICE',
        isMandatory: true,
        status: 'PASS',
        severity: 'COMPLIANT',
        observedValue: uspField.rawValue,
        expectedFormat: '₹ per unit declared',
        legalReference: 'Rule 6(10) of Legal Metrology Rules, 2011',
        remedialAction: 'N/A',
        penaltySection: 'Section 36 of Legal Metrology Act, 2009'
      });
    }
  }

  return ruleChecks;
}

/**
 * Calculates summary metrics, score (0-100), and overall compliance status
 */
export function calculateComplianceScore(ruleChecks: LegalRuleCheck[]): {
  score: number;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';
  violationsCount: { critical: number; major: number; minor: number };
} {
  let criticalCount = 0;
  let majorCount = 0;
  let minorCount = 0;
  let totalRulesEvaluated = ruleChecks.length;
  let passedRules = 0;

  ruleChecks.forEach(rule => {
    if (rule.status === 'PASS') {
      passedRules += 1;
    } else if (rule.status === 'FAIL' || rule.status === 'WARNING') {
      if (rule.severity === 'CRITICAL') criticalCount += 1;
      else if (rule.severity === 'MAJOR') majorCount += 1;
      else if (rule.severity === 'MINOR' || rule.status === 'WARNING') minorCount += 1;
    }
  });

  void (totalRulesEvaluated > 0 ? Math.round((passedRules / totalRulesEvaluated) * 100) : 100);
  
  // Deduct score based on violation severity weights
  const penaltyPoints = (criticalCount * 30) + (majorCount * 15) + (minorCount * 5);
  const finalScore = Math.max(0, 100 - penaltyPoints);

  let status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW' = 'COMPLIANT';
  if (finalScore >= 80) {
    status = 'COMPLIANT';
  } else if (finalScore >= 60) {
    status = 'NEEDS_REVIEW';
  } else {
    status = 'NON_COMPLIANT';
  }

  return {
    score: finalScore,
    status,
    violationsCount: {
      critical: criticalCount,
      major: majorCount,
      minor: minorCount
    }
  };
}

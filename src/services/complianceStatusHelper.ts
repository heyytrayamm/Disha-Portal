import type { LegalRuleCheck } from '../types/metrology';

export type CanonicalStatus = 'PASS' | 'REVIEW' | 'FAIL' | 'UNABLE_TO_ASSESS';

/**
 * Determines compliance status based on score and number of failed requirements:
 * - 80–100 = PASS (even if 1 or 2 individual mandatory/non-critical fields are missing)
 * - 60–79 = REVIEW REQUIRED
 * - 0–59 = FAIL
 */
export function calculateComplianceStatusFromScore(
  score: number,
  failedRulesCount: number = 0,
  hasCriticalOverride: boolean = false
): CanonicalStatus {
  if (score >= 80) {
    // If a product scores 80 or above but is missing only 1 or 2 individual mandatory/non-critical fields,
    // it should still be PASS. Only an explicit critical override with >2 failed fields can fail it.
    if (hasCriticalOverride && failedRulesCount > 2) {
      return 'FAIL';
    }
    return 'PASS';
  }

  if (score >= 60) {
    return 'REVIEW';
  }

  return 'FAIL';
}

/**
 * Single source of truth to get the canonical status ('PASS' | 'REVIEW' | 'FAIL' | 'UNABLE_TO_ASSESS') for any product
 */
export function getProductCanonicalStatus(product: {
  overallScore?: number | null;
  ruleChecks?: LegalRuleCheck[];
  overallStatus?: string | null;
}): CanonicalStatus {
  if (product.overallStatus === 'UNABLE_TO_ASSESS') {
    return 'UNABLE_TO_ASSESS';
  }
  if (product.overallScore === null || product.overallScore === undefined) {
    if (product.overallStatus) {
      return normalizeComplianceStatus(product.overallStatus);
    }
    return 'UNABLE_TO_ASSESS';
  }
  if (typeof product.overallScore === 'number' && product.overallScore > 0) {
    const failedChecks = product.ruleChecks?.filter(r => r.status === 'FAIL') || [];
    return calculateComplianceStatusFromScore(
      product.overallScore,
      failedChecks.length,
      false
    );
  }
  if (product.overallStatus) {
    return normalizeComplianceStatus(product.overallStatus);
  }
  return 'REVIEW';
}

/**
 * Normalizes varied status strings (COMPLIANT, NON_COMPLIANT, NEEDS_REVIEW, etc.) into CanonicalStatus
 */
export function normalizeComplianceStatus(status?: string | null): CanonicalStatus {
  if (!status) return 'REVIEW';
  const s = String(status).toUpperCase().trim();
  if (s === 'UNABLE_TO_ASSESS' || s === 'UNABLE TO ASSESS' || s === 'UNABLE_ASSESS') {
    return 'UNABLE_TO_ASSESS';
  }
  if (s === 'COMPLIANT' || s === 'PASS' || s === 'PASSED') {
    return 'PASS';
  }
  if (s === 'NON_COMPLIANT' || s === 'NON-COMPLIANT' || s === 'FAIL' || s === 'FAILED') {
    return 'FAIL';
  }
  if (s === 'NEEDS_REVIEW' || s === 'NEEDS-REVIEW' || s === 'REVIEW' || s === 'REVIEW_REQUIRED') {
    return 'REVIEW';
  }
  return 'REVIEW';
}

export interface ComplianceRemarksData {
  headline: string;
  summary: string;
  observations: string[];
  actionItems: string[];
  isAttentionRequired: boolean;
}

/**
 * Generates dynamic, context-aware remarks & compliance observations
 */
export function getComplianceRemarks(
  score: number | null,
  status: CanonicalStatus,
  ruleChecks: LegalRuleCheck[] = []
): ComplianceRemarksData {
  if (status === 'UNABLE_TO_ASSESS' || score === null || score === undefined) {
    return {
      headline: 'Unable to Assess Compliance',
      summary: 'The uploaded image does not appear to contain a readable packaged commodity label. Please upload a clear product-label image.',
      observations: [
        'No statutory packaged commodity declarations (MRP, Net Quantity, Mfg Date, Packer Details) could be verified.',
        'Non-packaging imagery (e.g. human face, portrait, blank, landscape, or generic document) was detected.'
      ],
      actionItems: [
        'Upload a clear, front-facing photograph or scan of a pre-packaged commodity label.',
        'Ensure adequate lighting and that mandatory statutory declarations are clearly visible.'
      ],
      isAttentionRequired: true
    };
  }

  const failedChecks = ruleChecks.filter(r => r.status === 'FAIL');
  const warningChecks = ruleChecks.filter(r => r.status === 'WARNING');
  const missingOrFailedFields = failedChecks.map(r => r.title);

  // 1. FULLY COMPLIANT (Score 80-100, 0 failed fields)
  if (status === 'PASS' && failedChecks.length === 0) {
    return {
      headline: 'Full Statutory Compliance',
      summary: 'All mandatory label requirements verified successfully.',
      observations: [
        'All mandatory declarations (Product Name, Net Quantity, MRP, Manufacturer Details, Consumer Care, Date of Mfg, and Unit Sale Price) conform to Legal Metrology Rules, 2011.',
        'Numeral heights and font readability satisfy Rule 6(2) statutory dimensions.'
      ],
      actionItems: [],
      isAttentionRequired: false
    };
  }

  // 2. PASS WITH 1-2 MINOR / NON-CRITICAL MISSING FIELDS (Score 80-100)
  if (status === 'PASS') {
    const specificFieldsDesc = missingOrFailedFields.length > 0
      ? missingOrFailedFields.join(', ')
      : 'Minor label declarations';

    const hasConsumerCarePhoneMissing = failedChecks.some(r =>
      r.category === 'CONSUMER_CARE' && /telephone|phone/i.test(r.title + ' ' + r.description)
    );

    let summaryText = `The product meets the overall compliance threshold (${score}/100). ${specificFieldsDesc} is missing and should be added to the label. Product otherwise meets the required compliance threshold. Please update the details.`;

    if (hasConsumerCarePhoneMissing) {
      summaryText = `Consumer Care telephone number is missing. Product otherwise meets the required compliance threshold. Please update the Consumer Care details.`;
    }

    const actionItems = failedChecks.map(r => r.remedialAction || `Ensure ${r.title} is declared in compliance with ${r.ruleNumber}.`);

    return {
      headline: 'Compliance Observations (Attention Required)',
      summary: summaryText,
      observations: failedChecks.map(r => `${r.title}: ${r.description}`),
      actionItems,
      isAttentionRequired: true
    };
  }

  // 3. REVIEW REQUIRED (Score 60-79)
  if (status === 'REVIEW') {
    const issues = [...failedChecks, ...warningChecks];
    const issuesList = issues.map(r => r.title).join(', ') || 'Label legibility and declaration formatting';

    return {
      headline: 'Review & Verification Required',
      summary: `The product compliance score is ${score}/100 (falls within the 60–79 review threshold) and requires inspection/review before being treated as fully compliant. Attention required on: ${issuesList}.`,
      observations: issues.map(r => `${r.title}: ${r.description}`),
      actionItems: issues.map(r => r.remedialAction || `Verify and remediate ${r.title} under ${r.ruleNumber}.`),
      isAttentionRequired: true
    };
  }

  // 4. FAIL (Score 0-59)
  const failedList = missingOrFailedFields.length > 0
    ? missingOrFailedFields.join('; ')
    : 'Multiple mandatory statutory declarations missing or non-compliant';

  return {
    headline: 'Statutory Non-Compliance Detected',
    summary: `The product failed statutory compliance requirements with a score of ${score}/100 (below 60). Major compliance deficiencies: ${failedList}.`,
    observations: failedChecks.map(r => `${r.title}: ${r.description}`),
    actionItems: failedChecks.map(r => `${r.title}: ${r.remedialAction} (${r.penaltySection || 'Legal Metrology Act, 2009'})`),
    isAttentionRequired: true
  };
}

/**
 * Returns user-friendly status badge styling tokens
 */
export function getStatusTheme(status: CanonicalStatus) {
  switch (status) {
    case 'PASS':
      return {
        label: 'PASS',
        badgeBg: 'bg-status-pass/10',
        badgeText: 'text-status-pass',
        badgeBorder: 'border-status-pass/20',
        icon: 'check_circle',
        colorHex: '#10b981'
      };
    case 'REVIEW':
      return {
        label: 'REVIEW REQUIRED',
        badgeBg: 'bg-status-review/10',
        badgeText: 'text-status-review',
        badgeBorder: 'border-status-review/20',
        icon: 'warning',
        colorHex: '#f59e0b'
      };
    case 'FAIL':
      return {
        label: 'FAIL',
        badgeBg: 'bg-status-fail/10',
        badgeText: 'text-status-fail',
        badgeBorder: 'border-status-fail/20',
        icon: 'cancel',
        colorHex: '#ba1a1a'
      };
    case 'UNABLE_TO_ASSESS':
      return {
        label: 'UNABLE TO ASSESS',
        badgeBg: 'bg-slate-500/10',
        badgeText: 'text-slate-600',
        badgeBorder: 'border-slate-500/20',
        icon: 'help',
        colorHex: '#64748b'
      };
  }
}

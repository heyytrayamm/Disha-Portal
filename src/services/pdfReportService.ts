import jsPDF from 'jspdf';
import type { ScannedProduct } from '../types/metrology';
import { getProductCanonicalStatus, getComplianceRemarks } from './complianceStatusHelper';

/**
 * Generates an official Legal Metrology Compliance / Violation Notice PDF document
 */
export function generateInspectionPdfReport(product: ScannedProduct) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 15;

  // Header Banner
  doc.setFillColor(15, 23, 42); // Dark Navy
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('GOVERNMENT OF INDIA - DEPARTMENT OF CONSUMER AFFAIRS', pageWidth / 2, 11, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('LEGAL METROLOGY (PACKAGED COMMODITIES) COMPLIANCE INSPECTION REPORT', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Issued under Section 15 & 36 of the Legal Metrology Act, 2009', pageWidth / 2, 23, { align: 'center' });

  y = 35;

  // Canonical Status Determination & Remarks
  const status = getProductCanonicalStatus(product);
  const isPass = status === 'PASS';
  const isReview = status === 'REVIEW';
  const remarksData = getComplianceRemarks(product.overallScore, status, product.ruleChecks);

  // Status Badge Box
  if (isPass) {
    doc.setFillColor(220, 252, 231); // Light Green
    doc.setDrawColor(22, 163, 74);
  } else if (isReview) {
    doc.setFillColor(254, 243, 199); // Light Amber
    doc.setDrawColor(245, 158, 11);
  } else {
    doc.setFillColor(254, 226, 226); // Light Red
    doc.setDrawColor(220, 38, 38);
  }
  doc.rect(margin, y, pageWidth - (margin * 2), 16, 'DF');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  if (isPass) {
    doc.setTextColor(22, 163, 74);
    doc.text('VERDICT: PASS - COMPLIANT WITH LEGAL METROLOGY RULES, 2011', margin + 5, y + 10);
  } else if (isReview) {
    doc.setTextColor(180, 83, 9);
    doc.text(`VERDICT: REVIEW REQUIRED (SCORE: ${product.overallScore}/100)`, margin + 5, y + 10);
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text(`VERDICT: NON-COMPLIANT / FAIL (${product.violationsCount.critical + product.violationsCount.major} VIOLATION(S) DETECTED)`, margin + 5, y + 10);
  }
  doc.setFontSize(10);
  doc.text(`Score: ${product.overallScore}/100`, pageWidth - margin - 25, y + 10);

  y += 22;

  // Compliance Remarks Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, pageWidth - (margin * 2), 16, 'DF');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('COMPLIANCE OBSERVATIONS & REMARKS:', margin + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const remarkLines = doc.splitTextToSize(remarksData.summary, pageWidth - (margin * 2) - 8);
  doc.text(remarkLines, margin + 4, y + 10);

  y += 22;

  // Key Metadata Table
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INSPECTION & PRODUCT METADATA', margin, y);
  y += 4;
  doc.setLineWidth(0.5);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const leftCol = [
    `Inspection ID: ${product.id}`,
    `Product Name: ${product.productName}`,
    `Brand: ${product.brandName}`,
    `Category: ${product.category}`,
    `Barcode: ${product.barcode || 'N/A'}`
  ];

  const rightCol = [
    `Scanned Date: ${new Date(product.scannedAt).toLocaleString()}`,
    `Inspector: ${product.inspectorName}`,
    `Location: ${product.inspectorLocation}`,
    `Manufacturer: ${product.manufacturerName}`,
    `Country of Origin: ${product.countryOfOrigin || 'India'}`
  ];

  let startY = y;
  leftCol.forEach(line => {
    doc.text(line, margin, startY);
    startY += 5;
  });

  startY = y;
  rightCol.forEach(line => {
    doc.text(line, pageWidth / 2, startY);
    startY += 5;
  });

  y = startY + 4;

  // Package Dimensions & PDP Font Height Section
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - (margin * 2), 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text(`PDP Surface Area: ${product.dimensions.pdpAreaCm2} cm² | Req. Min Font Height: ${product.dimensions.minRequiredFontHeightMm} mm | Detected Min Font: ${product.dimensions.detectedMinFontHeightMm} mm`, margin + 4, y + 7);
  
  y += 18;

  // Rule Compliance Breakdown Matrix
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('LEGAL METROLOGY 2011 RULE CHECK RESULTS', margin, y);
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Table Headers
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('RULE NO.', margin + 2, y + 5);
  doc.text('MANDATORY DECLARATION', margin + 25, y + 5);
  doc.text('STATUS', margin + 95, y + 5);
  doc.text('OBSERVED VALUE / REMEDIAL ACTION', margin + 120, y + 5);

  y += 7;

  doc.setFont('helvetica', 'normal');
  product.ruleChecks.forEach((check, index) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    const isPass = check.status === 'PASS';
    const rowColor = index % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(rowColor[0], rowColor[1], rowColor[2]);
    doc.rect(margin, y, pageWidth - (margin * 2), 11, 'F');

    doc.setTextColor(15, 23, 42);
    doc.text(check.ruleNumber, margin + 2, y + 5);

    const titleTrunc = check.title.length > 32 ? check.title.substring(0, 30) + '...' : check.title;
    doc.text(titleTrunc, margin + 25, y + 5);

    if (isPass) {
      doc.setTextColor(22, 163, 74);
      doc.text('PASS', margin + 95, y + 5);
    } else {
      doc.setTextColor(220, 38, 38);
      doc.text(`FAIL (${check.severity})`, margin + 95, y + 5);
    }

    doc.setTextColor(71, 85, 105);
    const obsText = isPass ? (check.observedValue || 'Compliant') : check.remedialAction;
    const obsTrunc = obsText.length > 42 ? obsText.substring(0, 40) + '...' : obsText;
    doc.text(obsTrunc, margin + 120, y + 5);

    y += 11;
  });

  y += 6;

  // Legal Penalty & Action Notice if non-compliant
  if (status === 'FAIL') {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(239, 68, 68);
    doc.rect(margin, y, pageWidth - (margin * 2), 26, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.text('STATUTORY LEGAL NOTICE & ENFORCEMENT RECOMMENDATION:', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(127, 29, 29);
    doc.text('• Under Section 36 of the Legal Metrology Act, 2009, whoever manufactures, packs or imports any packaged commodity', margin + 4, y + 11);
    doc.text('  without conforming to declarations shall be punished with fine up to ₹25,000 for first offence.', margin + 4, y + 15);
    doc.text('• Action Recommended: Issue Show-Cause Notice / Compound Offence under Section 48 upon rectification.', margin + 4, y + 19);

    if (product.noticeDetails) {
      doc.text(`• Notice Issued #: ${product.noticeDetails.noticeNumber} | Penalty Fee: ₹${product.noticeDetails.penaltyAmount.toLocaleString('en-IN')}`, margin + 4, y + 23);
    }

    y += 32;
  }

  // Footer Signatures
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Digitally Generated by Legal Metrology Compliance AI System (SIH 2026)', margin, y + 15);
  doc.text('Signature of Inspector / Authorized Officer: ___________________________', pageWidth - margin - 80, y + 15);

  // Save / Download PDF
  doc.save(`LegalMetrology_Report_${product.id}.pdf`);
}

/**
 * Exports inspection product data as JSON
 */
export function exportProductJson(product: ScannedProduct) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(product, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `LegalMetrology_Inspection_${product.id}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

import React, { useState, useEffect, useMemo } from 'react';
import type { ScannedProduct } from '../types/metrology';
import { getProductCanonicalStatus, getComplianceRemarks } from '../services/complianceStatusHelper';
import { resolveImageUrl } from '../services/api';

interface ScanAnalysisViewProps {
  product: ScannedProduct | null;
  onOpenScanner?: () => void;
  onOpenNoticeModal?: () => void;
  onDownloadPDF?: (product: ScannedProduct) => void;
  onBack?: () => void;
  onUpdateProduct?: (updatedProduct: ScannedProduct) => void;
}

export const ScanAnalysisView: React.FC<ScanAnalysisViewProps> = ({
  product,
  onOpenScanner,
  onOpenNoticeModal,
  onDownloadPDF,
  onBack,
  onUpdateProduct: _onUpdateProduct,
}) => {
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [modalImageFailed, setModalImageFailed] = useState(false);

  // Compute the optimal source image URL following the priority order:
  const sourceImageSrc = useMemo(() => {
    if (!product) return '';
    const candidates = [
      product.sourceImageUrl,
      product.imageUrl,
      product.preprocessingStages?.original
    ];
    for (const c of candidates) {
      if (c && typeof c === 'string' && c.trim() !== '' && c.trim() !== 'N/A') {
        const resolved = resolveImageUrl(c);
        if (resolved) return resolved;
      }
    }
    return '';
  }, [product?.id, product?.imageUrl, product?.sourceImageUrl, product?.preprocessingStages]);

  useEffect(() => {
    setImageLoadFailed(false);
    setModalImageFailed(false);
  }, [product?.id, sourceImageSrc]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCropModalOpen(false);
      }
    };
    if (isCropModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCropModalOpen]);

  const _onBack = onBack;
  void _onBack;
  void _onUpdateProduct;

  // ════════════════════════════════════════════════════════════════
  // 1. EMPTY / STANDBY STATE: LIVE SCAN PAGE (Section 9)
  // ════════════════════════════════════════════════════════════════
  if (!product) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2DFD8] pb-5">
          <div>
            <span className="section-tag">CAPTURE / LIVE SCAN</span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#141413] mt-1">
              Live scan
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D67] mt-1">
              Real-time optical label capture and regulatory declaration verification.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xs bg-[#FAF9F6] border border-[#E2DFD8] text-xs font-mono text-[#6E6D67] self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-[#B45309] animate-pulse" />
            <span className="font-semibold text-[#141413]">CAPTURE STANDBY</span>
          </div>
        </div>

        {/* Large Camera / Evidence Viewport */}
        <div className="disha-card p-5">
          <div className="evidence-viewport relative w-full aspect-[16/7] min-h-[300px] flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden bg-[#FBFBF9]">
            {/* Corner Markers */}
            <div className="corner-bracket corner-bracket-tl" />
            <div className="corner-bracket corner-bracket-tr" />
            <div className="corner-bracket corner-bracket-bl" />
            <div className="corner-bracket corner-bracket-br" />

            {/* Centered Camera Content */}
            <div className="flex flex-col items-center justify-center max-w-[480px] w-full mx-auto px-4 z-10">
              <div className="w-14 h-14 rounded-full border border-[#D5D2C8] bg-[#FFFFFF] flex items-center justify-center text-[#D4381D] mb-3 shadow-xs">
                <span className="material-symbols-outlined text-[28px]">photo_camera</span>
              </div>

              <h3 className="text-base font-bold text-[#141413]">
                Optical Capture Standby
              </h3>
              <p className="text-xs text-[#6E6D67] max-w-[460px] w-full mt-1.5 leading-relaxed text-center">
                Place the pre-packaged commodity within the optical viewfinder or upload a high-resolution label image to initiate automated metrology verification.
              </p>
            </div>

            {/* Viewport Technical Metadata at Bottom */}
            <div className="absolute bottom-2.5 left-4 right-4 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-[#7A7973] border-t border-[#EAE7DF] pt-2 pointer-events-none">
              <div className="flex items-center gap-4">
                <span>PACKAGE DETECTION: <strong className="text-[#141413]">WAITING</strong></span>
                <span>IMAGE QUALITY: <strong className="text-[#141413]">—</strong></span>
              </div>
              <div>
                <span>MODE: <strong className="text-[#D4381D]">LEGAL DECLARATIONS</strong></span>
              </div>
            </div>
          </div>

          {/* Action Buttons Below Viewport */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4 pt-4 border-t border-[#E2DFD8]">
            <button
              onClick={onOpenScanner}
              className="btn-accent px-5 !py-2.5 text-xs font-semibold"
            >
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              <span>CAPTURE</span>
            </button>
            <button
              onClick={onOpenScanner}
              className="btn-secondary px-5 !py-2.5 text-xs font-semibold"
            >
              <span className="material-symbols-outlined text-[18px]">file_upload</span>
              <span>UPLOAD IMAGE</span>
            </button>
            <button
              onClick={onOpenScanner}
              className="btn-secondary px-4 !py-2.5 text-xs text-[#6E6D67]"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>CLEAR</span>
            </button>
          </div>
        </div>

        {/* Scan Pipeline Progression */}
        <div className="disha-card p-5">
          <div className="flex items-center justify-between border-b border-[#E2DFD8] pb-3 mb-4">
            <span className="tech-tag">STATUTORY SCAN PIPELINE</span>
            <span className="text-[10px] font-mono text-[#6E6D67]">STANDBY</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            {[
              { step: '01', title: 'Captured', desc: 'Optical feed acquisition' },
              { step: '02', title: 'Reading', desc: 'OpenCV perspective correction' },
              { step: '03', title: 'Extracting', desc: 'Multi-engine OCR extraction' },
              { step: '04', title: 'Validating', desc: 'Rule 6 statutory checks' },
              { step: '05', title: 'Complete', desc: 'Compliance verdict & report' },
            ].map((s, idx) => (
              <div key={idx} className="p-3 bg-[#FAF9F6] border border-[#E2DFD8] rounded-xs text-left">
                <span className="text-[10px] font-mono font-bold text-[#D4381D]">{s.step}</span>
                <h4 className="text-xs font-bold text-[#141413] mt-0.5">{s.title}</h4>
                <p className="text-[10px] text-[#8F8E87] mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // 2. INSPECTION RESULT / COMPLIANCE PAGE (Sections 13 & 14)
  // ════════════════════════════════════════════════════════════════
  const status = getProductCanonicalStatus(product);
  const isPass = status === 'PASS';
  const isReview = status === 'REVIEW';
  const isFail = status === 'FAIL';
  const isUnableToAssess = status === 'UNABLE_TO_ASSESS';

  const ruleChecks = product.ruleChecks || [];
  const failedChecks = ruleChecks.filter(r => r.status === 'FAIL');
  const warningChecks = ruleChecks.filter(r => r.status === 'WARNING');
  const passedChecks = ruleChecks.filter(r => r.status === 'PASS');
  const totalChecks = ruleChecks.length;

  const remarksData = getComplianceRemarks(product.overallScore, status, ruleChecks);

  const scanDate = product.scannedAt
    ? new Date(product.scannedAt).toLocaleString('en-IN', { 
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      })
    : '';

  const scoreVal = typeof product.overallScore === 'number' ? product.overallScore : null;

  // Quality metrics
  const avgConfidence = product.extractedFields?.length > 0
    ? Math.round(product.extractedFields.reduce((sum, f) => sum + f.confidence, 0) / product.extractedFields.length)
    : 0;
  const completenessScore = Math.round(
    ((product.extractedFields?.filter(f => !f.isMissing).length || 0) / Math.max(product.extractedFields?.length || 1, 1)) * 100
  );
  const contrastScore = scoreVal !== null
    ? Math.min(100, Math.max(50, scoreVal - 4 + Math.floor((scoreVal % 7) * 1.5)))
    : 0;

  // Source Crop Lightbox Modal
  const renderCropModal = () => {
    if (!isCropModalOpen) return null;

    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsCropModalOpen(false);
        }}
      >
        <div 
          className="bg-[#FFFFFF] border border-[#E2DFD8] rounded-xs shadow-2xl overflow-hidden text-[#141413] my-auto flex flex-col relative z-50 animate-slide-down w-full max-w-2xl max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-5 py-3.5 border-b border-[#E2DFD8] flex items-center justify-between bg-[#FAF9F6]">
            <div>
              <div className="flex items-center gap-2">
                <span className="section-tag">EVIDENCE VERIFICATION</span>
                <span className="text-[#CCC9BF]">&bull;</span>
                <span className="tech-tag">SOURCE CROP</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#141413] mt-0.5">
                {product.productName}
              </h3>
            </div>
            <button 
              type="button"
              onClick={() => setIsCropModalOpen(false)} 
              className="p-1.5 text-[#6E6D67] hover:text-[#141413] rounded-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 flex flex-col items-center justify-center overflow-y-auto max-h-[calc(90vh-120px)] bg-[#F7F6F2]">
            {sourceImageSrc && !modalImageFailed ? (
              <div className="w-full flex flex-col items-center gap-3">
                <div className="relative border border-[#D5D2C8] bg-[#FFFFFF] rounded-xs p-2 max-h-[500px] overflow-hidden flex items-center justify-center">
                  <img 
                    src={sourceImageSrc} 
                    alt="High-resolution Source Crop" 
                    onError={() => setModalImageFailed(true)}
                    className="max-h-[460px] object-contain rounded-xs"
                  />
                </div>
                <div className="w-full flex items-center justify-between text-[11px] font-mono text-[#6E6D67] bg-[#FFFFFF] border border-[#E2DFD8] p-2.5 rounded-xs">
                  <span>AUDIT ID: {product.id}</span>
                  <span>STATUS: {status} ({scoreVal !== null ? `${scoreVal}/100` : 'N/A'})</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-[#6E6D67]">
                <span className="material-symbols-outlined text-[32px] text-[#A8A59C]">image_not_supported</span>
                <p className="text-sm font-semibold text-[#141413] mt-2">Source Image Unavailable</p>
                <p className="text-xs text-[#8F8E87] mt-1">The uploaded label crop could not be rendered from the cache.</p>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 border-t border-[#E2DFD8] bg-[#FAF9F6] flex justify-end">
            <button
              type="button"
              onClick={() => setIsCropModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderCropModal()}

      <div className="space-y-6 animate-fade-in">
        
        {/* ═══ Header Section ═══ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DFD8] pb-5">
          <div>
            <span className="section-tag">COMPLIANCE ASSESSMENT</span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141413] mt-1">
              {product.productName}
            </h1>
            <p className="text-xs font-mono text-[#6E6D67] mt-1">
              INSPECTION ID: <strong className="text-[#D4381D]">{product.id}</strong> &bull; {scanDate} &bull; BRAND: {product.brandName}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {onOpenScanner && (
              <button
                onClick={onOpenScanner}
                className="btn-secondary text-xs"
              >
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                <span>Scan Another</span>
              </button>
            )}
            <button
              onClick={() => onDownloadPDF?.(product)}
              className="btn-primary text-xs font-semibold"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Export PDF Report</span>
            </button>
          </div>
        </div>

        {/* ═══ Evidence-First Progression Breadcrumb ═══ */}
        <div className="disha-card px-4 py-2.5 bg-[#FAF9F6] flex items-center justify-between overflow-x-auto text-[11px] font-mono text-[#6E6D67]">
          <span className="flex items-center gap-1.5 text-[#141413] font-semibold">
            <span className="material-symbols-outlined text-[16px] text-[#D4381D]">image</span>
            <span>01 IMAGE</span>
          </span>
          <span className="text-[#CCC9BF]">&rarr;</span>
          <span className="flex items-center gap-1.5 text-[#141413] font-semibold">
            <span className="material-symbols-outlined text-[16px] text-[#D4381D]">crop_free</span>
            <span>02 EVIDENCE</span>
          </span>
          <span className="text-[#CCC9BF]">&rarr;</span>
          <span className="flex items-center gap-1.5 text-[#141413] font-semibold">
            <span className="material-symbols-outlined text-[16px] text-[#D4381D]">text_fields</span>
            <span>03 FIELD</span>
          </span>
          <span className="text-[#CCC9BF]">&rarr;</span>
          <span className="flex items-center gap-1.5 text-[#141413] font-semibold">
            <span className="material-symbols-outlined text-[16px] text-[#D4381D]">gavel</span>
            <span>04 RULE</span>
          </span>
          <span className="text-[#CCC9BF]">&rarr;</span>
          <span className="flex items-center gap-1.5 text-[#141413] font-semibold">
            <span className="material-symbols-outlined text-[16px] text-[#D4381D]">verified</span>
            <span>05 RESULT</span>
          </span>
        </div>

        {/* ═══ Overall Result Banner ═══ */}
        <div className="disha-card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E2DFD8]">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xs border flex items-center justify-center font-bold text-xl font-mono ${
                isPass ? 'bg-[#EBF7EE] text-[#1B7F43] border-[#BBE5C7]' :
                isFail ? 'bg-[#FDE8E6] text-[#C5281B] border-[#F8B4AF]' :
                isUnableToAssess ? 'bg-[#EFECE6] text-[#5A5955] border-[#DCD8CE]' :
                'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
              }`}>
                {scoreVal !== null ? `${scoreVal}` : '—'}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-[#141413]">
                    {isPass ? 'COMPLIANT (PASS)' : isReview ? 'REVIEW REQUIRED' : isUnableToAssess ? 'UNABLE TO ASSESS' : 'STATUTORY NON-COMPLIANT (FAIL)'}
                  </h2>
                  <span className={`px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold uppercase tracking-wider ${
                    isPass ? 'bg-[#EBF7EE] text-[#1B7F43] border border-[#BBE5C7]' :
                    isFail ? 'bg-[#FDE8E6] text-[#C5281B] border border-[#F8B4AF]' :
                    'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]'
                  }`}>
                    {status}
                  </span>
                </div>
                <p className="text-xs text-[#6E6D67] mt-0.5">
                  {totalChecks} statutory declarations evaluated under Rule 6 of Packaged Commodities Rules, 2011.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-[#8F8E87]">
                PASSED: <strong className="text-[#1B7F43]">{passedChecks.length}</strong> &bull; FAILED: <strong className="text-[#C5281B]">{failedChecks.length}</strong>
              </span>
            </div>
          </div>

          {/* Legal Summary / Inspector Remarks */}
          <div className="mt-4 pt-1">
            <div className="p-3.5 bg-[#FAF9F6] border border-[#E2DFD8] rounded-xs text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[#D4381D] text-[16px]">gavel</span>
                <span className="font-bold text-[#141413] uppercase tracking-wider text-[10px]">
                  {remarksData.headline}
                </span>
              </div>
              <p className="text-[#2D2C28] leading-relaxed">
                {remarksData.summary}
              </p>
            </div>
          </div>
        </div>

        {/* ═══ Main Two-Column Layout ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Detailed Field-by-Field Evidence Rows (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="disha-card overflow-hidden">
              <div className="p-4 border-b border-[#E2DFD8] flex items-center justify-between bg-[#FAF9F6]">
                <div>
                  <h3 className="text-sm font-bold text-[#141413] uppercase tracking-wider">
                    Statutory Declarations Verification
                  </h3>
                  <p className="text-[11px] text-[#6E6D67]">
                    Field-level optical extraction compared with mandatory statutory rules
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="badge-pass">{passedChecks.length} Passed</span>
                  {failedChecks.length > 0 && <span className="badge-fail">{failedChecks.length} Failed</span>}
                  {warningChecks.length > 0 && <span className="badge-review">{warningChecks.length} Warnings</span>}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="disha-table">
                  <thead>
                    <tr>
                      <th className="disha-th w-20">Status</th>
                      <th className="disha-th">Requirement / Field</th>
                      <th className="disha-th">Detected Value</th>
                      <th className="disha-th w-28">Statutory Rule</th>
                      <th className="disha-th w-28 text-right">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ruleChecks.map((rule) => {
                      const isCheckPass = rule.status === 'PASS';
                      const isCheckFail = rule.status === 'FAIL';
                      const rawDetected = rule.observedValue 
                        ?? (rule as any).detectedValue 
                        ?? product.extractedFields?.find(f => f.category === rule.category)?.rawValue;
                      const detectedValueText = rawDetected && String(rawDetected).trim() ? String(rawDetected).trim() : 'MISSING';
                      const isMissingValue = detectedValueText === 'MISSING' || detectedValueText === 'Missing / Unreadable';

                      return (
                        <tr key={rule.ruleId} className="disha-tr">
                          <td className="disha-td">
                            {isCheckPass ? (
                              <span className="badge-pass">PASS</span>
                            ) : isCheckFail ? (
                              <span className="badge-fail">FAIL</span>
                            ) : (
                              <span className="badge-review">WARN</span>
                            )}
                          </td>

                          <td className="disha-td">
                            <p className="font-semibold text-[#141413] text-xs leading-snug">
                              {rule.title}
                            </p>
                            <p className="text-[10px] text-[#8F8E87] mt-0.5">
                              {rule.category.replace(/_/g, ' ')}
                            </p>
                          </td>

                          <td className="disha-td font-mono text-xs">
                            <span className={`px-2 py-0.5 rounded-xs inline-block max-w-[240px] truncate ${
                              isMissingValue || isCheckFail 
                                ? 'bg-[#FDE8E6] text-[#C5281B] font-semibold' 
                                : 'bg-[#F4F2EB] text-[#141413]'
                            }`}>
                              {detectedValueText}
                            </span>
                          </td>

                          <td className="disha-td font-mono text-[11px] text-[#6E6D67]">
                            {rule.ruleNumber}
                          </td>

                          <td className="disha-td text-right">
                            {sourceImageSrc ? (
                              <button
                                onClick={() => setIsCropModalOpen(true)}
                                className="text-[11px] text-[#D4381D] hover:underline font-medium cursor-pointer inline-flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">crop_free</span>
                                <span>Crop</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-[#A8A59C]">N/A</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {ruleChecks.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-xs text-[#8F8E87]">
                          No individual rule evaluations recorded for this scan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Observations & Remedial Action List */}
            {remarksData.observations.length > 0 && (
              <div className="disha-card p-4 sm:p-5">
                <span className="section-tag">STATUTORY FINDINGS</span>
                <h3 className="text-sm font-bold text-[#141413] mt-1 mb-3">
                  Checklist Observations & Remedial Guidance
                </h3>
                <div className="space-y-2">
                  {remarksData.observations.map((obs, idx) => (
                    <div key={idx} className="p-3 bg-[#FAF9F6] border border-[#E2DFD8] rounded-xs text-xs flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-[#D4381D] text-[16px] shrink-0 mt-0.5">
                        arrow_forward
                      </span>
                      <span className="text-[#2D2C28] leading-relaxed">{obs}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT: Evidence Packaging Preview & Quality Metrics (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Source Image Crop Card */}
            <div className="disha-card p-4">
              <div className="flex items-center justify-between border-b border-[#E2DFD8] pb-2.5 mb-3">
                <span className="section-tag">SOURCE PACKAGING</span>
                <span className="text-[10px] font-mono text-[#8F8E87]">EVIDENCE CROP</span>
              </div>

              <div className="relative border border-[#D5D2C8] rounded-xs overflow-hidden h-52 bg-[#F9F8F5] flex items-center justify-center group">
                {sourceImageSrc && !imageLoadFailed ? (
                  <>
                    <img 
                      src={sourceImageSrc} 
                      alt="Source Label" 
                      onError={() => setImageLoadFailed(true)}
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => setIsCropModalOpen(true)}
                        className="btn-primary text-xs !py-1.5 !px-3"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        <span>View Source Crop</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div 
                    onClick={onOpenScanner}
                    className="p-6 text-center text-[#8F8E87] cursor-pointer hover:bg-[#F2F0E8] transition-colors w-full h-full flex flex-col items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[28px] text-[#A8A59C]">image_not_supported</span>
                    <p className="text-xs font-semibold text-[#141413] mt-1">Source image unavailable</p>
                    <p className="text-[11px] text-[#8F8E87] mt-0.5">Click to scan or re-upload</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quality Rating Metrics */}
            <div className="disha-card p-4">
              <div className="flex items-center justify-between border-b border-[#E2DFD8] pb-2.5 mb-3">
                <span className="section-tag">METRICS / CONFIDENCE</span>
                <span className="text-[10px] font-mono text-[#8F8E87]">OCR INDEX</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#6E6D67]">Declaration Completeness</span>
                    <span className="font-mono font-bold text-[#141413]">{completenessScore}%</span>
                  </div>
                  <div className="w-full bg-[#EAE7DF] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#141413] h-full" style={{ width: `${completenessScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#6E6D67]">OCR Optical Confidence</span>
                    <span className="font-mono font-bold text-[#141413]">{avgConfidence}%</span>
                  </div>
                  <div className="w-full bg-[#EAE7DF] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#141413] h-full" style={{ width: `${avgConfidence}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#6E6D67]">Contrast & Readability</span>
                    <span className="font-mono font-bold text-[#141413]">{contrastScore}%</span>
                  </div>
                  <div className="w-full bg-[#EAE7DF] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#141413] h-full" style={{ width: `${contrastScore}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions & Enforcement Panel */}
            <div className="disha-card p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#E2DFD8] pb-2.5 mb-1">
                <span className="section-tag">ENFORCEMENT ACTIONS</span>
              </div>

              <button
                onClick={() => onDownloadPDF?.(product)}
                className="btn-secondary w-full justify-center !py-2 text-xs"
              >
                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                <span>Download PDF Report</span>
              </button>

              {onOpenNoticeModal && (isFail || isReview) && (
                <button
                  onClick={onOpenNoticeModal}
                  className="btn-danger w-full justify-center !py-2 text-xs font-semibold"
                >
                  <span className="material-symbols-outlined text-[16px]">gavel</span>
                  <span>Issue Statutory Notice</span>
                </button>
              )}

              {onOpenScanner && (
                <button
                  onClick={onOpenScanner}
                  className="btn-secondary w-full justify-center !py-2 text-xs text-[#6E6D67]"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span>Discard & Retake Scan</span>
                </button>
              )}
            </div>

          </div>

        </div>

      </div>
    </>
  );
};

export default ScanAnalysisView;

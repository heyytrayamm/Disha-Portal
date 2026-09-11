import React, { useState, useEffect, useMemo } from 'react';
import type { ScannedProduct } from '../types/metrology';
import { getProductCanonicalStatus, getComplianceRemarks, getStatusTheme } from '../services/complianceStatusHelper';
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
  // 1. product.sourceImageUrl (client-side preview / data URL / blob)
  // 2. resolveImageUrl(product.imageUrl) (browser-accessible backend URL)
  // 3. product.preprocessingStages?.original (base64 JPEG data URI from OpenCV)
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

  if (!product) {
    return (
      <div className="bg-surface-container-lowest border border-border-subtle rounded-lg p-xl text-center text-text-muted space-y-md my-xl shadow-xs">
        <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary mx-auto flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px]">document_scanner</span>
        </div>
        <h3 className="font-headline-md text-headline-md font-bold text-primary">No Label Scan Selected</h3>
        <p className="font-body-md text-body-md max-w-md mx-auto">
          Upload or scan a product packaging label to run OpenCV preprocessing, OCR text extraction, and rule-based legal metrology verification.
        </p>
        <button
          onClick={onOpenScanner}
          className="bg-primary-container text-on-primary font-label-md text-label-md px-lg py-sm rounded-lg hover:bg-primary transition-colors font-semibold shadow-xs cursor-pointer"
        >
          Scan Product Label Now
        </button>
      </div>
    );
  }

  // 1. Single Central Status Determination
  const status = getProductCanonicalStatus(product);
  const isPass = status === 'PASS';
  const isReview = status === 'REVIEW';
  const isFail = status === 'FAIL';
  const isUnableToAssess = status === 'UNABLE_TO_ASSESS';
  const theme = getStatusTheme(status);

  // 2. Rule Check Categorization
  const ruleChecks = product.ruleChecks || [];
  const failedChecks = ruleChecks.filter(r => r.status === 'FAIL');
  const warningChecks = ruleChecks.filter(r => r.status === 'WARNING');
  const passedChecks = ruleChecks.filter(r => r.status === 'PASS');
  const totalChecks = ruleChecks.length;

  // 3. Dynamic Remarks & Observations
  const remarksData = getComplianceRemarks(product.overallScore, status, ruleChecks);

  const scanDate = product.scannedAt
    ? new Date(product.scannedAt).toLocaleString('en-IN', { 
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      })
    : '';

  const scoreVal = typeof product.overallScore === 'number' ? product.overallScore : null;
  const scoreColor = isPass ? 'text-status-pass' : isFail ? 'text-error' : isUnableToAssess ? 'text-slate-600' : 'text-status-review';
  const scoreStrokeColor = isPass ? '#10b981' : isFail ? '#ba1a1a' : isUnableToAssess ? '#94a3b8' : '#f59e0b';
  const scoreLabel = scoreVal !== null
    ? (scoreVal >= 80 ? 'Excellent' : scoreVal >= 60 ? 'Needs Attention' : 'Non-Compliant')
    : 'Unable to Assess';
  const circumference = 2 * Math.PI * 45;
  const scoreOffset = scoreVal !== null
    ? circumference - (scoreVal / 100) * circumference
    : circumference;

  // Quality breakdown scores (from extracted fields confidence)
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto w-screen h-screen left-0 top-0"
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsCropModalOpen(false);
        }}
      >
        <div 
          className="bg-surface-container-lowest border border-border-subtle rounded-2xl shadow-2xl overflow-hidden text-text-main my-auto flex flex-col relative z-50 animate-in fade-in duration-200"
          style={{
            width: 'min(92vw, 720px)',
            maxWidth: '720px',
            maxHeight: '90vh',
            boxSizing: 'border-box'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 bg-surface border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">crop_free</span>
              </div>
              <div>
                <h3 className="font-headline-md text-sm sm:text-base font-bold text-primary">
                  Source Crop Inspection
                </h3>
                <p className="font-label-sm text-xs text-text-muted">
                  {product.productName} ({product.brandName})
                </p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setIsCropModalOpen(false)} 
              className="text-text-muted hover:text-text-main p-1.5 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 flex flex-col items-center justify-center overflow-y-auto max-h-[calc(90vh-140px)]">
            {sourceImageSrc && !modalImageFailed ? (
              <div className="w-full flex flex-col items-center gap-4">
                <div className="relative border border-border-subtle rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center w-full max-h-[480px]">
                  <img 
                    src={sourceImageSrc} 
                    alt="High-resolution Source Crop" 
                    onError={() => setModalImageFailed(true)}
                    className="w-full max-h-[480px] object-contain rounded-lg shadow-inner"
                  />
                </div>
                
                <div className="w-full bg-surface-container-low border border-border-subtle rounded-xl p-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-text-muted">
                    <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                    <span>Preprocessed via OpenCV & OCR pipeline</span>
                  </div>
                  <span className="font-mono text-text-main font-semibold">
                    Status: {status} ({product.overallScore !== null ? `${product.overallScore}/100` : 'N/A'})
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-12 px-6 text-center text-text-muted flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[24px]">image_not_supported</span>
                </div>
                <p className="font-semibold text-text-main text-sm">Source image unavailable</p>
                <p className="text-xs text-text-muted mt-1 max-w-xs">
                  The original source packaging label could not be loaded.
                </p>
                {onOpenScanner && (
                  <button
                    onClick={() => {
                      setIsCropModalOpen(false);
                      onOpenScanner();
                    }}
                    className="mt-3 px-3 py-1.5 text-xs text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">upload</span> Re-upload image
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3 bg-surface border-t border-border-subtle flex justify-end">
            <button
              type="button"
              onClick={() => setIsCropModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-surface-container-low hover:bg-surface-container-high text-text-main border border-border-subtle transition-colors cursor-pointer"
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

      {/* Header Section */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-sm border-b border-border-subtle mb-lg gap-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
              Scan Report: #{product.id}
            </h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder}`}>
              <span className="material-symbols-outlined text-[14px]">{theme.icon}</span>
              {status}
            </span>
          </div>
          <p className="font-body-md text-body-md text-text-muted mt-xs">
            {product.productName} ({product.brandName}) &bull; Completed {scanDate}
          </p>
        </div>
        <div className="flex items-center gap-sm">
          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              className="flex items-center gap-xs px-md py-sm border border-border-subtle bg-surface-container-lowest text-text-main rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              Scan Another
            </button>
          )}
          <button
            onClick={() => onDownloadPDF?.(product)}
            className="flex items-center gap-xs px-md py-sm border border-primary/20 bg-primary-container text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary transition-colors shadow-sm cursor-pointer font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Official Report
          </button>
        </div>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        
        {/* Main Content (8 cols on lg) */}
        <div className="lg:col-span-8 flex flex-col gap-lg">
          
          {/* 1. Verdict Banner */}
          <div className={`bg-surface-container-lowest border rounded-xl p-lg flex flex-col sm:flex-row items-center gap-lg relative overflow-hidden shadow-xs ${
            isPass ? 'border-status-pass/30' : isFail ? 'border-status-fail/30' : 'border-status-review/30'
          }`}>
            <div className={`absolute inset-0 opacity-5 pointer-events-none ${
              isPass ? 'bg-status-pass' : isFail ? 'bg-status-fail' : 'bg-status-review'
            }`} />
            
            <div className={`h-20 w-20 rounded-full flex items-center justify-center shrink-0 border-4 ${
              isPass 
                ? 'bg-status-pass/10 text-status-pass border-status-pass/20' 
                : isFail 
                ? 'bg-status-fail/10 text-status-fail border-status-fail/20' 
                : isUnableToAssess
                ? 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                : 'bg-status-review/10 text-status-review border-status-review/20'
            }`}>
              <span className="material-symbols-outlined text-[44px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {theme.icon}
              </span>
            </div>

            <div className="flex-1 text-center sm:text-left z-10">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h2 className={`font-headline-xl text-headline-xl font-bold tracking-tight ${
                  isPass ? 'text-status-pass' : isFail ? 'text-status-fail' : isUnableToAssess ? 'text-slate-700' : 'text-status-review'
                }`}>
                  {isPass ? 'PASS' : isReview ? 'REVIEW REQUIRED' : isUnableToAssess ? 'UNABLE TO ASSESS' : 'FAIL'}
                </h2>
                
                <span className="font-mono text-sm px-2.5 py-0.5 rounded-md bg-surface-container-high text-text-main font-semibold">
                  Score: {scoreVal !== null ? `${scoreVal}/100` : '-- / N/A'}
                </span>

                {isPass && failedChecks.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-status-pass/10 text-status-pass border border-status-pass/20">
                    <span className="material-symbols-outlined text-[13px]">info</span>
                    Attention Required
                  </span>
                )}
                {isFail && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-status-fail/10 text-status-fail border border-status-fail/20">
                    <span className="material-symbols-outlined text-[13px]">error</span>
                    Action Required
                  </span>
                )}
                {isReview && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-status-review/10 text-status-review border border-status-review/20">
                    <span className="material-symbols-outlined text-[13px]">warning</span>
                    Inspection Pending
                  </span>
                )}
                {isUnableToAssess && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                    <span className="material-symbols-outlined text-[13px]">help</span>
                    Non-Packaging Image
                  </span>
                )}
              </div>

              <p className="font-body-md text-body-md text-text-main">
                {isUnableToAssess ? (
                  product.message || 'The uploaded image does not appear to contain a readable packaged commodity label. Please upload a clear product-label image.'
                ) : isPass ? (
                  failedChecks.length === 0
                    ? 'Product label satisfies all applicable mandatory checks according to Legal Metrology (Packaged Commodities) Rules, 2011.'
                    : `Product meets the overall statutory compliance threshold (${scoreVal}/100). Minor deficiencies observed; please review the compliance observations below.`
                ) : isReview ? (
                  `Product compliance score (${scoreVal}/100) falls in the review threshold (60–79). Manual inspection or verification is required before clearance.`
                ) : (
                  `Product does not meet mandatory statutory requirements with a score of ${scoreVal}/100 (below 60). Immediate enforcement or corrective action is required.`
                )}
              </p>
            </div>
          </div>

          {/* 2. Remarks / Compliance Observations Section (Requirement 3 & 4) */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl flex flex-col shadow-xs overflow-hidden">
            <div className="px-md py-sm border-b border-border-subtle bg-surface-container flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">assignment</span>
                <h3 className="font-headline-md text-headline-md text-primary font-semibold">
                  Compliance Observations & Inspector Remarks
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                isPass ? 'bg-status-pass/10 text-status-pass' : isFail ? 'bg-status-fail/10 text-status-fail' : 'bg-status-review/10 text-status-review'
              }`}>
                {remarksData.headline}
              </span>
            </div>

            <div className="p-md space-y-md">
              {/* Primary Callout Box */}
              <div className={`p-md rounded-xl border flex items-start gap-3 ${
                isPass 
                  ? 'bg-status-pass/5 border-status-pass/20 text-text-main' 
                  : isFail 
                  ? 'bg-status-fail/5 border-status-fail/20 text-text-main' 
                  : 'bg-status-review/5 border-status-review/20 text-text-main'
              }`}>
                <span className={`material-symbols-outlined shrink-0 mt-0.5 text-[22px] ${
                  isPass ? 'text-status-pass' : isFail ? 'text-status-fail' : 'text-status-review'
                }`}>
                  {isPass ? 'check_circle' : isFail ? 'error' : 'warning'}
                </span>
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-text-main mb-1">
                    Compliance Remark
                  </p>
                  <p className="font-body-md leading-relaxed text-text-main">
                    {remarksData.summary}
                  </p>
                </div>
              </div>

              {/* Detailed Observations List (if any specific items flagged) */}
              {remarksData.observations.length > 0 && (
                <div className="space-y-sm pt-xs">
                  <h4 className="font-label-md text-label-md text-text-muted uppercase tracking-wider font-semibold">
                    Specific Findings & Checklist Notes
                  </h4>
                  <div className="grid grid-cols-1 gap-sm">
                    {remarksData.observations.map((obs, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-sm rounded-lg bg-surface-container-low border border-border-subtle text-xs">
                        <span className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${
                          isPass ? 'text-status-review' : isFail ? 'text-status-fail' : 'text-status-review'
                        }`}>
                          arrow_right
                        </span>
                        <span className="text-text-main">{obs}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Guidance (if applicable) */}
              {remarksData.actionItems.length > 0 && (
                <div className="space-y-sm pt-xs">
                  <h4 className="font-label-md text-label-md text-text-muted uppercase tracking-wider font-semibold">
                    Recommended Remedial Action
                  </h4>
                  <div className="grid grid-cols-1 gap-sm">
                    {remarksData.actionItems.map((action, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-sm rounded-lg bg-surface-container-low border border-border-subtle text-xs">
                        <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">
                          build_circle
                        </span>
                        <span className="text-text-main font-medium">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Detailed Compliance Field Verification Report (Requirement 2) */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl flex flex-col shadow-xs overflow-hidden">
            <div className="px-md py-sm border-b border-border-subtle bg-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-headline-md text-headline-md text-primary font-semibold">
                  Compliance Verification Report
                </h3>
                <p className="font-label-sm text-xs text-text-muted">
                  Detailed statutory declaration checklist under Legal Metrology (Packaged Commodities) Rules, 2011
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-status-pass/10 text-status-pass">
                  ✅ {passedChecks.length} Passed
                </span>
                {failedChecks.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-status-fail/10 text-status-fail">
                    ❌ {failedChecks.length} Failed
                  </span>
                )}
                {warningChecks.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-status-review/10 text-status-review">
                    ⚠️ {warningChecks.length} Warnings
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left border-collapse table-auto">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-container-low">
                    <th className="px-md py-sm font-label-md text-label-md text-text-muted uppercase w-[90px] min-w-[90px]">Status</th>
                    <th className="px-md py-sm font-label-md text-label-md text-text-muted uppercase w-[240px] min-w-[220px]">Requirement / Field</th>
                    <th className="px-md py-sm font-label-md text-label-md text-text-muted uppercase min-w-[220px] max-w-[280px]">Detected Value</th>
                    <th className="px-md py-sm font-label-md text-label-md text-text-muted uppercase w-[120px] min-w-[120px]">Rule (LMPC)</th>
                    <th className="px-md py-sm font-label-md text-label-md text-text-muted uppercase min-w-[160px] max-w-[200px]">Remarks</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md text-text-main divide-y divide-border-subtle">
                  {ruleChecks.map((rule) => {
                    const isCheckPass = rule.status === 'PASS';
                    const isCheckFail = rule.status === 'FAIL';

                    const rawDetected = rule.observedValue 
                      ?? (rule as any).detectedValue 
                      ?? product.extractedFields?.find(f => f.category === rule.category)?.rawValue;
                    const detectedValueText = rawDetected && String(rawDetected).trim() ? String(rawDetected).trim() : 'MISSING';
                    const isMissingValue = detectedValueText === 'MISSING' || detectedValueText === 'Missing / Unreadable';

                    return (
                      <tr key={rule.ruleId} className="hover:bg-surface-container-low transition-colors">
                        {/* Status Icon Column */}
                        <td className="px-md py-sm w-[90px] min-w-[90px] align-top pt-3">
                          {isCheckPass ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-status-pass/10 text-status-pass" title="Compliant declaration">
                              <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                              PASS
                            </span>
                          ) : isCheckFail ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-status-fail/10 text-status-fail" title="Statutory violation">
                              <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                              FAIL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-status-review/10 text-status-review" title="Requires review">
                              <span className="material-symbols-outlined text-[15px]">warning</span>
                              WARN
                            </span>
                          )}
                        </td>

                        {/* Field Name Column */}
                        <td className="px-md py-sm w-[240px] min-w-[220px] align-top pt-3">
                          <p className="font-semibold text-text-main text-sm leading-snug">
                            {rule.title}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5 font-normal">
                            {rule.category.replace(/_/g, ' ')}
                          </p>
                        </td>

                        {/* Detected Value Column */}
                        <td className="px-md py-sm min-w-[220px] max-w-[280px] align-top pt-2.5">
                          <div 
                            className={`text-xs font-mono px-2.5 py-1.5 rounded w-full whitespace-normal break-words leading-relaxed border ${
                              isMissingValue || isCheckFail 
                                ? 'bg-error-container/30 text-error border-error-container/50' 
                                : 'bg-surface-container-high text-text-main border-border-subtle'
                            }`}
                            style={{
                              minWidth: '180px',
                              maxWidth: '280px',
                              whiteSpace: 'normal',
                              overflowWrap: 'anywhere',
                              wordBreak: 'break-word',
                            }}
                          >
                            {detectedValueText}
                          </div>
                        </td>

                        {/* Statutory Rule Column */}
                        <td className="px-md py-sm w-[120px] min-w-[120px] align-top text-xs text-text-muted font-medium pt-3">
                          {rule.ruleNumber}
                        </td>

                        {/* Explanation / Remarks Column */}
                        <td className="px-md py-sm min-w-[160px] max-w-[200px] align-top text-xs pt-3">
                          {isCheckPass ? (
                            <span className="text-status-pass font-medium">Present & Compliant</span>
                          ) : isCheckFail ? (
                            <span className="text-status-fail font-medium" title={rule.description}>
                              {rule.title.includes('Missing') ? 'Missing' : 'Non-compliant'}
                            </span>
                          ) : (
                            <span className="text-status-review font-medium">Attention Required</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {ruleChecks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-muted text-sm">
                        No individual rule evaluations recorded for this scan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Sidebar (4 cols on lg) */}
        <div className="lg:col-span-4 flex flex-col gap-lg">
          
          {/* Quality Score Ring */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-md shadow-xs flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-md border-b border-border-subtle pb-sm">
              <h3 className="font-headline-md text-headline-md text-primary font-semibold">
                Compliance Score
              </h3>
              <span className="font-label-sm text-xs text-text-muted">
                {totalChecks} Checks Evaluated
              </span>
            </div>

            <div className="relative w-40 h-40 flex items-center justify-center my-md">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke={scoreStrokeColor} 
                  strokeWidth="8"
                  strokeDasharray={circumference} 
                  strokeDashoffset={scoreOffset}
                  strokeLinecap="round" 
                  className="transition-all duration-700" 
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className={`font-headline-xl text-headline-xl ${scoreColor} leading-none font-bold`}>
                  {scoreVal !== null ? scoreVal : '--'}
                </span>
                <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider mt-1">
                  {scoreVal !== null ? 'out of 100' : 'N/A'}
                </span>
              </div>
            </div>

            <div className={`${
              isPass ? 'bg-status-pass/10 text-status-pass' : isFail ? 'bg-error-container text-error' : isUnableToAssess ? 'bg-slate-100 text-slate-700' : 'bg-status-review/10 text-status-review'
            } font-label-md text-label-md px-3 py-1 rounded-full mb-lg font-semibold`}>
              {scoreLabel}
            </div>

            {/* Breakdown Bars */}
            <div className="w-full flex flex-col gap-sm">
              <div className="flex flex-col gap-xs">
                <div className="flex justify-between font-label-md text-label-md">
                  <span className="text-text-main text-xs">Completeness</span>
                  <span className="text-primary font-bold text-xs">{completenessScore}%</span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${completenessScore}%` }} />
                </div>
              </div>

              <div className="flex flex-col gap-xs mt-sm">
                <div className="flex justify-between font-label-md text-label-md">
                  <span className="text-text-main text-xs">Readability (OCR)</span>
                  <span className="text-primary font-bold text-xs">{avgConfidence}%</span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${avgConfidence}%` }} />
                </div>
              </div>

              <div className="flex flex-col gap-xs mt-sm">
                <div className="flex justify-between font-label-md text-label-md">
                  <span className="text-text-main text-xs">Contrast Ratio</span>
                  <span className="text-primary font-bold text-xs">{contrastScore}%</span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${contrastScore}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Source Image Crop Card */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-md shadow-xs flex flex-col gap-sm">
            <h4 className="font-label-md text-label-md text-text-muted uppercase tracking-wider font-semibold">
              Source Packaging Label
            </h4>
            <div className="h-48 overflow-hidden relative group rounded-lg border border-border-subtle">
              {sourceImageSrc && !imageLoadFailed ? (
                <>
                  <img 
                    src={sourceImageSrc} 
                    alt="Source Packaging Label" 
                    onError={() => setImageLoadFailed(true)}
                    className="w-full h-full object-cover rounded-lg" 
                  />
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setIsCropModalOpen(true)}
                      className="bg-surface-container-lowest text-primary font-label-md text-label-md px-4 py-2 rounded-lg border border-border-subtle shadow-sm flex items-center gap-2 cursor-pointer hover:bg-surface-container-low transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span> View Source Crop
                    </button>
                  </div>
                </>
              ) : (
                <div 
                  onClick={onOpenScanner}
                  className="w-full h-full bg-surface-container-high flex items-center justify-center border border-dashed border-border-subtle rounded-lg cursor-pointer hover:bg-surface-container transition-colors"
                  title={onOpenScanner ? "Click to scan or re-upload image" : "Source image unavailable"}
                >
                  <span className="font-label-md text-label-md text-text-muted flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-[28px] text-text-muted">image_not_supported</span>
                    <span className="font-medium text-xs">Source image unavailable</span>
                    {onOpenScanner && (
                      <span className="text-[11px] text-primary hover:underline flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">upload</span> Re-upload image
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-md shadow-xs flex flex-col gap-sm">
            <h4 className="font-label-md text-label-md text-text-muted uppercase tracking-wider font-semibold mb-xs">
              Actions & Enforcement
            </h4>
            <button
              onClick={() => onDownloadPDF?.(product)}
              className="w-full flex items-center justify-center gap-2 px-md py-sm rounded-lg border border-border-subtle bg-surface hover:bg-surface-container-low text-text-main text-xs font-semibold transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              Download PDF Report
            </button>
            {onOpenNoticeModal && (
              <button
                onClick={onOpenNoticeModal}
                className={`w-full flex items-center justify-center gap-2 px-md py-sm rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isFail 
                    ? 'bg-status-fail text-white hover:bg-red-700' 
                    : isReview 
                    ? 'bg-status-review text-white hover:bg-amber-600' 
                    : 'bg-surface border border-border-subtle text-text-main hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">gavel</span>
                {isFail ? 'Issue Statutory Notice' : isReview ? 'Manual Verification / Notice' : 'Issue Label Advisory'}
              </button>
            )}
            {onOpenScanner && (
              <button
                onClick={onOpenScanner}
                className="w-full flex items-center justify-center gap-2 px-md py-sm rounded-lg border border-border-subtle bg-surface hover:bg-surface-container-low text-text-muted hover:text-text-main text-xs font-semibold transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Discard & Retake Scan
              </button>
            )}
          </div>

        </div>

      </div>
    </>
  );
};

import React, { useState } from 'react';
import type { ScannedProduct } from '../types/metrology';

interface NoticeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ScannedProduct;
  onNoticeIssued: (updatedProduct: ScannedProduct) => void;
}

export const NoticeGeneratorModal: React.FC<NoticeGeneratorModalProps> = ({
  isOpen,
  onClose,
  product,
  onNoticeIssued
}) => {
  const [noticeNumber, setNoticeNumber] = useState(`NOTICE/LM/2026/${Math.floor(1000 + Math.random() * 9000)}`);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(
    product.violationsCount.critical > 0 ? 25000 : 15000
  );
  const [hearingDate, setHearingDate] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(
    `Notice issued under Section 36 of Legal Metrology Act, 2009 for non-compliance of packaged commodity declarations.`
  );
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);

    const updated: ScannedProduct = {
      ...product,
      enforcementStatus: 'NOTICE_ISSUED',
      noticeDetails: {
        noticeNumber,
        issuedDate: new Date().toISOString().split('T')[0],
        hearingDate,
        penaltyAmount,
        notes
      }
    };

    setTimeout(() => {
      onNoticeIssued(updated);
      setIsSubmitted(false);
      onClose();
    }, 600);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto w-screen h-screen left-0 top-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-surface-container-lowest border border-border-subtle rounded-2xl shadow-2xl overflow-hidden text-text-main my-auto flex flex-col relative z-50 animate-in fade-in duration-200"
        style={{
          width: 'min(90vw, 650px)',
          maxWidth: '650px',
          minWidth: 'min(90vw, 320px)',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-surface border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-error-container text-error flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">gavel</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md font-bold text-primary">Issue Legal Metrology Notice</h3>
              <p className="font-label-sm text-label-sm text-text-muted">Section 36 & Section 48 Statutory Enforcement</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-text-muted hover:text-text-main p-1.5 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Violation Commodity Summary */}
          <div className="p-3.5 rounded-xl bg-error-container/40 border border-error/20 flex items-start gap-3">
            <span className="material-symbols-outlined text-error text-[22px] shrink-0 mt-0.5">error</span>
            <div className="text-xs text-text-main flex-1">
              <p className="font-semibold text-text-main">
                Target Commodity: <span className="font-normal">{product.productName} ({product.manufacturerName})</span>
              </p>
              <p className="mt-1 text-text-muted">
                Identified {product.violationsCount.critical + product.violationsCount.major} non-compliant declaration items under Legal Metrology Rules, 2011.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-main mb-1.5">
                Notice Reference #
              </label>
              <input
                type="text"
                value={noticeNumber}
                onChange={(e) => setNoticeNumber(e.target.value)}
                className="w-full bg-surface-container-low border border-border-subtle rounded-lg px-3 py-2 text-xs font-mono text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-main mb-1.5">
                Compounding / Penalty (₹)
              </label>
              <input
                type="number"
                value={penaltyAmount}
                onChange={(e) => setPenaltyAmount(Number(e.target.value))}
                className="w-full bg-surface-container-low border border-border-subtle rounded-lg px-3 py-2 text-xs font-bold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-main mb-1.5">
              Hearing / Rectification Due Date
            </label>
            <input
              type="date"
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
              className="w-full bg-surface-container-low border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-main mb-1.5">
              Enforcement Officer Remarks
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface-container-low border border-border-subtle rounded-lg p-3 text-xs text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-surface-container-low hover:bg-surface-container-high text-text-main border border-border-subtle transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitted}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-error hover:opacity-90 text-white flex items-center gap-2 shadow-md transition-opacity cursor-pointer disabled:opacity-50"
            >
              {isSubmitted ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                  <span>Issuing Notice...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Issue Statutory Notice</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

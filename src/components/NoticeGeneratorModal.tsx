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
  const [noticeNumber] = useState(`NOTICE/LM/2026/${Math.floor(1000 + Math.random() * 9000)}`);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(
    product.violationsCount.critical > 0 ? 25000 : 15000
  );
  const [hearingDate, setHearingDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
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
    }, 500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-[#FFFFFF] border border-[#E2DFD8] rounded-xs shadow-2xl overflow-hidden text-[#141413] my-auto flex flex-col relative z-50 animate-slide-down w-full max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#E2DFD8] flex items-center justify-between bg-[#FAF9F6]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xs bg-[#FDE8E6] border border-[#F8B4AF] text-[#C5281B] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">gavel</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="section-tag !text-[#C5281B]">STATUTORY ENFORCEMENT</span>
                <span className="text-[#CCC9BF]">&bull;</span>
                <span className="tech-tag">FORM LM-7</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#141413]">Issue Legal Metrology Notice</h3>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 text-[#6E6D67] hover:text-[#141413] rounded-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Target Commodity Summary */}
          <div className="p-3 rounded-xs bg-[#FAF9F6] border border-[#E2DFD8] text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#141413]">{product.productName}</span>
              <span className="font-mono text-[10px] text-[#C5281B] font-bold">SCORE: {product.overallScore}/100</span>
            </div>
            <p className="text-[11px] text-[#6E6D67] mt-0.5">
              Manufacturer: {product.manufacturerName || 'N/A'} &bull; Audit ID: <span className="font-mono text-[#D4381D]">{product.id}</span>
            </p>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-mono uppercase text-[#6E6D67] block mb-1">
                Notice Number
              </label>
              <input
                type="text"
                readOnly
                value={noticeNumber}
                className="w-full px-2.5 py-1.5 bg-[#F4F2EB] border border-[#E2DFD8] rounded-xs text-[#141413] font-mono text-xs cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-[#6E6D67] block mb-1">
                Compounding Penalty (₹)
              </label>
              <input
                type="number"
                value={penaltyAmount}
                onChange={(e) => setPenaltyAmount(Number(e.target.value))}
                min={5000}
                step={5000}
                className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#E2DFD8] rounded-xs text-[#141413] font-mono text-xs focus:outline-none focus:border-[#141413]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-[#6E6D67] block mb-1">
              Statutory Hearing Date
            </label>
            <input
              type="date"
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#E2DFD8] rounded-xs text-[#141413] font-mono text-xs focus:outline-none focus:border-[#141413]"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-[#6E6D67] block mb-1">
              Enforcement Grounds &amp; Inspection Findings
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-[#FFFFFF] border border-[#E2DFD8] rounded-xs text-[#141413] text-xs focus:outline-none focus:border-[#141413] leading-relaxed resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2DFD8]">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitted}
              className="btn-accent text-xs font-semibold px-4 !bg-[#C5281B] !border-[#C5281B] hover:!bg-[#A92015]"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
              <span>{isSubmitted ? 'Serving Notice...' : 'Issue & Serve Notice'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default NoticeGeneratorModal;

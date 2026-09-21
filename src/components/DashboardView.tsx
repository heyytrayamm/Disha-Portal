import React, { useState, useEffect, useMemo } from 'react';
import type { ScannedProduct, ComplianceStats } from '../types/metrology';
import type { User } from '../types/auth';
import { getProductCanonicalStatus, normalizeComplianceStatus } from '../services/complianceStatusHelper';
import { resolveImageUrl } from '../services/api';

interface DashboardViewProps {
  user?: User | null;
  stats?: ComplianceStats | null;
  products?: ScannedProduct[];
  onSelectProduct?: (product: ScannedProduct) => void;
  onNavigateScan?: (product: ScannedProduct) => void;
  onOpenScanner?: () => void;
}

type StatDetailType = 'TOTAL' | 'PASSED' | 'FAILED' | 'REVIEW' | 'SCORE' | null;

export const DashboardView: React.FC<DashboardViewProps> = ({
  user: _user,
  stats: _stats,
  products: initialProducts,
  onSelectProduct,
  onNavigateScan,
  onOpenScanner
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStat, setSelectedStat] = useState<StatDetailType>(null);

  // 1. Single source of truth from real database inspections
  const displayProducts = useMemo(() => {
    return initialProducts || [];
  }, [initialProducts]);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedStat(null);
      }
    };
    if (selectedStat) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStat]);

  // 2. Filter categorized products
  const passedProducts = useMemo(
    () => displayProducts.filter(p => getProductCanonicalStatus(p) === 'PASS'),
    [displayProducts]
  );

  const failedProducts = useMemo(
    () => displayProducts.filter(p => getProductCanonicalStatus(p) === 'FAIL'),
    [displayProducts]
  );

  const reviewProducts = useMemo(
    () => displayProducts.filter(p => getProductCanonicalStatus(p) === 'REVIEW'),
    [displayProducts]
  );

  // 3. Derived single-source statistics
  const derivedStats = useMemo(() => {
    const productsChecked = displayProducts.length;
    const passed = passedProducts.length;
    const failed = failedProducts.length;
    const reviewRequired = reviewProducts.length;

    const averageScore = productsChecked > 0
      ? Math.round(
          displayProducts.reduce((sum, p) => sum + (typeof p.overallScore === 'number' ? p.overallScore : 0), 0) /
          productsChecked
        )
      : 0;

    return {
      productsChecked,
      passed,
      failed,
      reviewRequired,
      averageScore
    };
  }, [displayProducts, passedProducts, failedProducts, reviewProducts]);

  const { productsChecked, passed, failed, reviewRequired, averageScore } = derivedStats;

  const filteredProducts = displayProducts.filter(p => {
    const q = searchQuery.toLowerCase();
    return !q || (
      p.productName.toLowerCase().includes(q) ||
      p.brandName.toLowerCase().includes(q) ||
      p.manufacturerName.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  });

  const handleProductClick = (product: ScannedProduct) => {
    setSelectedStat(null);
    if (onNavigateScan) {
      onNavigateScan(product);
    } else if (onSelectProduct) {
      onSelectProduct(product);
    }
  };

  const getStatusBadge = (item: ScannedProduct | string) => {
    const normalized = typeof item === 'string'
      ? normalizeComplianceStatus(item)
      : getProductCanonicalStatus(item);
    switch (normalized) {
      case 'PASS':
        return <span className="badge-pass">PASS</span>;
      case 'FAIL':
        return <span className="badge-fail">FAIL</span>;
      case 'REVIEW':
        return <span className="badge-review">REVIEW</span>;
      default:
        return <span className="badge-neutral">UNASSESSED</span>;
    }
  };

  // Modal data
  const getModalProducts = () => {
    switch (selectedStat) {
      case 'TOTAL':
        return displayProducts;
      case 'PASSED':
        return passedProducts;
      case 'FAILED':
        return failedProducts;
      case 'REVIEW':
        return reviewProducts;
      default:
        return [];
    }
  };

  const getModalTitle = () => {
    switch (selectedStat) {
      case 'TOTAL':
        return {
          title: 'Products Checked',
          subtitle: `All ${productsChecked} verified packaging labels in this cycle`,
          badge: `${productsChecked} Total`
        };
      case 'PASSED':
        return {
          title: 'Compliant Labels',
          subtitle: `${passed} packages complying with all mandatory declarations`,
          badge: `${passed} Passed`
        };
      case 'FAILED':
        return {
          title: 'Non-Compliant Infractions',
          subtitle: `${failed} packages with statutory non-compliance`,
          badge: `${failed} Failed`
        };
      case 'REVIEW':
        return {
          title: 'Review Required',
          subtitle: `${reviewRequired} packages needing manual officer verification`,
          badge: `${reviewRequired} Pending`
        };
      case 'SCORE':
        return {
          title: 'Average Compliance Score',
          subtitle: `National statutory benchmark: ${averageScore}/100 across ${productsChecked} inspections`,
          badge: `${averageScore}% Avg`
        };
      default:
        return { title: '', subtitle: '', badge: '' };
    }
  };

  const modalMeta = getModalTitle();
  const modalProducts = getModalProducts();

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* ═══ 1. Top Section / Heading ═══ */}
      <div className="border-b border-[#E2DFD8] pb-6">
        <span className="section-tag">FIELD INSPECTION</span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#141413] mt-1">
          Inspect. Verify. Record.
        </h1>
        <p className="text-xs sm:text-sm text-[#6E6D67] mt-1.5 max-w-2xl leading-relaxed">
          Legal Metrology packaging declaration verification system under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011 and FSSAI standards.
        </p>
      </div>

      {/* ═══ 2. Large Inspection Workspace ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Evidence Viewport */}
        <div className="lg:col-span-7">
          <div className="disha-card p-4 sm:p-5 flex flex-col h-full">
            {/* Technical Header */}
            <div className="flex items-center justify-between border-b border-[#E2DFD8] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="tech-tag text-[#D4381D]">PACKAGE / LABEL</span>
                <span className="text-[#CCC9BF]">&bull;</span>
                <span className="tech-tag">EVIDENCE VIEWPORT</span>
              </div>
              <span className="tech-tag text-[#1B7F43] bg-[#EBF7EE] px-1.5 py-0.5 rounded-xs">
                OPTICAL / READY
              </span>
            </div>

            {/* Evidence Frame Viewport Box */}
            <div className="evidence-viewport relative w-full aspect-[16/9] min-h-[260px] flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden">
              {/* Red Corner Brackets */}
              <div className="corner-bracket corner-bracket-tl" />
              <div className="corner-bracket corner-bracket-tr" />
              <div className="corner-bracket corner-bracket-bl" />
              <div className="corner-bracket corner-bracket-br" />

              {/* Viewport Content Centered Horizontally & Vertically */}
              <div className="flex flex-col items-center justify-center max-w-[420px] w-full mx-auto px-2 z-10">
                <div className="w-12 h-12 rounded-full border border-[#D5D2C8] bg-[#FFFFFF] flex items-center justify-center text-[#6E6D67] mb-3 shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">crop_free</span>
                </div>

                <p className="text-sm font-semibold text-[#141413]">
                  Position a package or upload an image to begin
                </p>
                <p className="text-xs text-[#6E6D67] max-w-[420px] w-full mt-1.5 leading-relaxed text-center">
                  Automated optical character recognition will extract all statutory declarations and map against Rule 6 legal checks.
                </p>
              </div>

              {/* Viewport Frame Footer Stamp */}
              <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between text-[10px] font-mono text-[#7A7973] pointer-events-none border-t border-[#EAE7DF] pt-1.5">
                <span>OPTICAL / READY</span>
                <span>EVIDENCE FRAME 01</span>
              </div>
            </div>

            {/* Viewport Action Controls */}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[#E2DFD8]">
              <button
                onClick={onOpenScanner}
                className="btn-primary flex-1 !py-2"
              >
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                <span>Capture Live</span>
              </button>
              <button
                onClick={onOpenScanner}
                className="btn-secondary flex-1 !py-2"
              >
                <span className="material-symbols-outlined text-[16px]">file_upload</span>
                <span>Upload Image</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Start Inspection Panel */}
        <div className="lg:col-span-5">
          <div className="disha-card p-5 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#E2DFD8] pb-3 mb-4">
                <span className="tech-tag">INSPECTION PROTOCOL</span>
                <span className="text-[10px] font-mono text-[#6E6D67]">PCR-2011</span>
              </div>

              <h3 className="text-base font-bold text-[#141413]">
                Mandatory Declarations Verification
              </h3>
              <p className="text-xs text-[#6E6D67] mt-1 leading-relaxed">
                Under Section 36 of the Legal Metrology Act, every pre-packaged commodity must comply with eight primary statutory declarations:
              </p>

              {/* Verification Checklist Preview */}
              <ul className="mt-4 space-y-2.5 text-xs text-[#2D2C28]">
                {[
                  { label: 'Commodity Name & Generic Description', rule: 'Rule 6(1)(a)' },
                  { label: 'Manufacturer / Packer / Importer Details', rule: 'Rule 6(1)(b)' },
                  { label: 'Net Quantity (Standard Metric Unit)', rule: 'Rule 6(1)(c)' },
                  { label: 'Month & Year of Manufacture / Packing', rule: 'Rule 6(1)(d)' },
                  { label: 'Maximum Retail Price (incl. of all taxes)', rule: 'Rule 6(1)(e)' },
                  { label: 'Consumer Care Phone & Email Details', rule: 'Rule 6(1)(f)' },
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between py-1 border-b border-[#F2F0E8] last:border-none">
                    <span className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-[#D4381D]" />
                      <span>{item.label}</span>
                    </span>
                    <span className="font-mono text-[10px] text-[#8F8E87] shrink-0">{item.rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E2DFD8]">
              <button
                onClick={onOpenScanner}
                className="btn-accent w-full !py-2.5 justify-center text-xs font-semibold"
              >
                <span className="material-symbols-outlined text-[18px]">play_circle</span>
                <span>Initiate Inspection Scan</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ═══ 3. Statistics: Clean Horizontal Layout ═══ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="section-tag">METRICS / BENCHMARK</span>
          <span className="text-[11px] font-mono text-[#8F8E87]">RECORDED AUDITS: {productsChecked}</span>
        </div>

        <div className="disha-card grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#E2DFD8] overflow-hidden">
          {/* 1. Today / Total */}
          <div
            onClick={() => setSelectedStat('TOTAL')}
            className="p-4 hover:bg-[#FAF9F6] transition-colors cursor-pointer group"
          >
            <span className="tech-tag group-hover:text-[#141413]">TOTAL CHECKED</span>
            <div className="text-2xl sm:text-3xl font-bold text-[#141413] mt-1 font-mono">
              {productsChecked}
            </div>
            <p className="text-[11px] text-[#8F8E87] mt-0.5">inspected units</p>
          </div>

          {/* 2. Pass */}
          <div
            onClick={() => setSelectedStat('PASSED')}
            className="p-4 hover:bg-[#FAF9F6] transition-colors cursor-pointer group"
          >
            <span className="tech-tag group-hover:text-[#1B7F43]">PASS</span>
            <div className="text-2xl sm:text-3xl font-bold text-[#1B7F43] mt-1 font-mono">
              {passed}
            </div>
            <p className="text-[11px] text-[#8F8E87] mt-0.5">compliant packages</p>
          </div>

          {/* 3. Review */}
          <div
            onClick={() => setSelectedStat('REVIEW')}
            className="p-4 hover:bg-[#FAF9F6] transition-colors cursor-pointer group"
          >
            <span className="tech-tag group-hover:text-[#B45309]">REVIEW REQUIRED</span>
            <div className="text-2xl sm:text-3xl font-bold text-[#B45309] mt-1 font-mono">
              {reviewRequired}
            </div>
            <p className="text-[11px] text-[#8F8E87] mt-0.5">manual verification</p>
          </div>

          {/* 4. Fail */}
          <div
            onClick={() => setSelectedStat('FAILED')}
            className="p-4 hover:bg-[#FAF9F6] transition-colors cursor-pointer group"
          >
            <span className="tech-tag group-hover:text-[#C5281B]">FAIL / INFRACTIONS</span>
            <div className="text-2xl sm:text-3xl font-bold text-[#C5281B] mt-1 font-mono">
              {failed}
            </div>
            <p className="text-[11px] text-[#8F8E87] mt-0.5">statutory violations</p>
          </div>

          {/* 5. Avg Score */}
          <div
            onClick={() => setSelectedStat('SCORE')}
            className="p-4 hover:bg-[#FAF9F6] transition-colors cursor-pointer group col-span-2 md:col-span-1"
          >
            <span className="tech-tag group-hover:text-[#D4381D]">AVG COMPLIANCE</span>
            <div className="text-2xl sm:text-3xl font-bold text-[#D4381D] mt-1 font-mono">
              {averageScore}%
            </div>
            <p className="text-[11px] text-[#8F8E87] mt-0.5">statutory index</p>
          </div>
        </div>
      </div>

      {/* ═══ 4. Recent Inspections Table ═══ */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <span className="section-tag">RECORDS / RECENT</span>
            <h2 className="text-base font-bold text-[#141413]">Recent Inspections Register</h2>
          </div>

          {/* Search Filter */}
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8F8E87] text-[16px]">
              search
            </span>
            <input
              type="text"
              placeholder="Filter product, brand, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#E2DFD8] rounded-xs text-[#141413] placeholder:text-[#8F8E87] focus:outline-none focus:border-[#141413]"
            />
          </div>
        </div>

        <div className="disha-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="disha-table">
              <thead>
                <tr>
                  <th className="disha-th w-28">Audit ID</th>
                  <th className="disha-th">Product Description</th>
                  <th className="disha-th">Manufacturer</th>
                  <th className="disha-th w-24 text-center">Score</th>
                  <th className="disha-th w-24">Status</th>
                  <th className="disha-th w-20 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.slice(0, 8).map((p) => {
                    const status = getProductCanonicalStatus(p);
                    return (
                      <tr
                        key={p.id}
                        onClick={() => handleProductClick(p)}
                        className="disha-tr cursor-pointer"
                      >
                        <td className="disha-td font-mono font-semibold text-xs text-[#D4381D]">
                          {p.id}
                        </td>
                        <td className="disha-td">
                          <div className="font-semibold text-[#141413] line-clamp-1">{p.productName}</div>
                          <div className="text-[11px] text-[#6E6D67]">{p.category || 'Packaged Commodity'}</div>
                        </td>
                        <td className="disha-td text-[#6E6D67]">
                          <span className="line-clamp-1">{p.manufacturerName || 'N/A'}</span>
                        </td>
                        <td className="disha-td text-center font-mono font-bold">
                          <span className={
                            status === 'PASS' ? 'text-[#1B7F43]' :
                            status === 'REVIEW' ? 'text-[#B45309]' : 'text-[#C5281B]'
                          }>
                            {p.overallScore ?? '—'}
                          </span>
                        </td>
                        <td className="disha-td">
                          {getStatusBadge(p)}
                        </td>
                        <td className="disha-td text-right">
                          <span className="text-xs text-[#D4381D] font-medium hover:underline inline-flex items-center gap-0.5">
                            View <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-[#8F8E87]">
                      {searchQuery ? 'No inspections match your search query.' : 'No recent inspections recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══ Metric Drilldown Modal ═══ */}
      {selectedStat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#FFFFFF] border border-[#E2DFD8] rounded-xs shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#E2DFD8] flex items-center justify-between bg-[#FAF9F6]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="section-tag">{modalMeta.badge}</span>
                  <span className="text-[#CCC9BF]">&bull;</span>
                  <span className="tech-tag">INSPECTION ARCHIVE</span>
                </div>
                <h3 className="text-base font-bold text-[#141413] mt-0.5">{modalMeta.title}</h3>
                <p className="text-xs text-[#6E6D67]">{modalMeta.subtitle}</p>
              </div>
              <button
                onClick={() => setSelectedStat(null)}
                className="p-1.5 text-[#6E6D67] hover:text-[#141413] rounded-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 divide-y divide-[#ECE9E2]">
              {modalProducts.length > 0 ? (
                modalProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleProductClick(p)}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-[#FAF9F6] px-2 -mx-2 rounded-xs cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-11 bg-[#F4F2EB] border border-[#E2DFD8] rounded-xs overflow-hidden shrink-0 flex items-center justify-center">
                        {p.sourceImageUrl || p.imageUrl ? (
                          <img
                            src={resolveImageUrl(p.sourceImageUrl || p.imageUrl)}
                            alt={p.productName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="material-symbols-outlined text-[#8F8E87] text-[18px]">inventory_2</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#141413] truncate">{p.productName}</p>
                        <p className="text-[11px] text-[#6E6D67] truncate mt-0.5">
                          {p.manufacturerName} &bull; <span className="font-mono text-[#D4381D]">{p.id}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-xs font-bold text-[#141413]">{p.overallScore}/100</span>
                      {getStatusBadge(p)}
                      <span className="material-symbols-outlined text-[#8F8E87] text-[16px]">chevron_right</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[#8F8E87]">
                  No products in this statutory category.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#E2DFD8] bg-[#FAF9F6] flex justify-end">
              <button
                onClick={() => setSelectedStat(null)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardView;

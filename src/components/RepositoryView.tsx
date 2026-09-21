import React, { useState, useMemo } from 'react';
import type { ScannedProduct } from '../types/metrology';
import type { User } from '../types/auth';
import { generateInspectionPdfReport } from '../services/pdfReportService';
import { getProductCanonicalStatus } from '../services/complianceStatusHelper';

interface RepositoryViewProps {
  products?: ScannedProduct[];
  user?: User | null;
  onSelectProduct: (product: ScannedProduct) => void;
}

type DateFilterType = 'ALL' | '7_DAYS' | '30_DAYS' | 'QUARTER' | 'YTD';
type StatusFilterType = 'ALL' | 'COMPLIANT' | 'REVIEW' | 'NON_COMPLIANT' | 'UNABLE_TO_ASSESS';

export const RepositoryView: React.FC<RepositoryViewProps> = ({
  products: initialProducts,
  user: _user,
  onSelectProduct
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('ALL');
  const [selectedInspector, setSelectedInspector] = useState<string>('ALL');

  // 1. Single source of truth from real database inspections
  const displayProducts = useMemo(() => {
    return initialProducts || [];
  }, [initialProducts]);

  // Unique inspectors list from real data
  const inspectorsList = useMemo(() => {
    const set = new Set<string>();
    displayProducts.forEach(p => {
      if (p.inspectorName && p.inspectorName.trim()) {
        set.add(p.inspectorName.trim());
      }
    });
    return Array.from(set);
  }, [displayProducts]);

  // 2. Real-time statistics
  const stats = useMemo(() => {
    const total = displayProducts.length;
    const passed = displayProducts.filter(p => getProductCanonicalStatus(p) === 'PASS').length;
    const failed = displayProducts.filter(p => getProductCanonicalStatus(p) === 'FAIL').length;
    const review = displayProducts.filter(p => getProductCanonicalStatus(p) === 'REVIEW').length;
    const averageScore = total > 0
      ? Math.round(displayProducts.reduce((sum, p) => sum + (p.overallScore || 0), 0) / total)
      : 0;

    return { total, passed, failed, review, averageScore };
  }, [displayProducts]);

  // 3. Filtered products
  const filteredProducts = useMemo(() => {
    return displayProducts.filter(p => {
      // Search matching
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q || (
        (p.productName && p.productName.toLowerCase().includes(q)) ||
        (p.brandName && p.brandName.toLowerCase().includes(q)) ||
        (p.manufacturerName && p.manufacturerName.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );

      // Status matching
      const normStatus = getProductCanonicalStatus(p);
      const matchesStatus = (() => {
        if (statusFilter === 'ALL') return true;
        if (statusFilter === 'COMPLIANT') return normStatus === 'PASS';
        if (statusFilter === 'REVIEW') return normStatus === 'REVIEW';
        if (statusFilter === 'NON_COMPLIANT') return normStatus === 'FAIL';
        if (statusFilter === 'UNABLE_TO_ASSESS') return normStatus === 'UNABLE_TO_ASSESS';
        return true;
      })();

      // Date matching
      const matchesDate = (() => {
        if (dateFilter === 'ALL') return true;
        if (!p.scannedAt) return true;
        const scanTimestamp = new Date(p.scannedAt).getTime();
        if (isNaN(scanTimestamp)) return true;

        const now = Date.now();
        const diffDays = (now - scanTimestamp) / (1000 * 60 * 60 * 24);
        if (dateFilter === '7_DAYS') return diffDays <= 7;
        if (dateFilter === '30_DAYS') return diffDays <= 30;
        if (dateFilter === 'QUARTER') return diffDays <= 90;
        if (dateFilter === 'YTD') return diffDays <= 365;
        return true;
      })();

      // Inspector matching
      const matchesInspector = selectedInspector === 'ALL' || (p.inspectorName && p.inspectorName.trim() === selectedInspector);

      return matchesSearch && matchesStatus && matchesDate && matchesInspector;
    });
  }, [displayProducts, searchTerm, statusFilter, dateFilter, selectedInspector]);

  // CSV Export
  const handleExport = () => {
    const headers = ['Audit ID', 'Product Name', 'Brand', 'Manufacturer', 'Score', 'Compliance Status', 'Inspection Date', 'Inspector Name'];
    const rows = filteredProducts.map(p => [
      `"${p.id}"`,
      `"${(p.productName || '').replace(/"/g, '""')}"`,
      `"${(p.brandName || '').replace(/"/g, '""')}"`,
      `"${(p.manufacturerName || '').replace(/"/g, '""')}"`,
      p.overallScore,
      getProductCanonicalStatus(p),
      `"${p.scannedAt || ''}"`,
      `"${(p.inspectorName || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Disha_Inspection_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* ═══ Header Section (Section 10) ═══ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DFD8] pb-5">
        <div>
          <span className="section-tag">RECORDS / AUDIT</span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#141413] mt-1">
            Inspection register
          </h1>
          <p className="text-xs sm:text-sm text-[#6E6D67] mt-1">
            Statutory repository of all completed packaged commodity audits, verified declarations, and enforcement notices.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExport}
            disabled={filteredProducts.length === 0}
            className="btn-secondary text-xs disabled:opacity-40"
            title="Export filtered records to CSV"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ═══ Summary Statistics Banner ═══ */}
      <div className="disha-card grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2DFD8] overflow-hidden">
        <div className="p-4">
          <span className="tech-tag">REGISTERED AUDITS</span>
          <p className="text-2xl font-bold font-mono text-[#141413] mt-1">{stats.total}</p>
        </div>
        <div className="p-4">
          <span className="tech-tag text-[#1B7F43]">COMPLIANT</span>
          <p className="text-2xl font-bold font-mono text-[#1B7F43] mt-1">{stats.passed}</p>
        </div>
        <div className="p-4">
          <span className="tech-tag text-[#B45309]">REVIEW REQUIRED</span>
          <p className="text-2xl font-bold font-mono text-[#B45309] mt-1">{stats.review}</p>
        </div>
        <div className="p-4">
          <span className="tech-tag text-[#C5281B]">INFRACTIONS</span>
          <p className="text-2xl font-bold font-mono text-[#C5281B] mt-1">{stats.failed}</p>
        </div>
      </div>

      {/* ═══ Compact Filter Controls ═══ */}
      <div className="disha-card p-4 space-y-3">
        {/* Row 1: Search and Status Pills */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8F8E87] text-[16px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search product, brand, packer, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#E2DFD8] rounded-xs text-[#141413] placeholder:text-[#8F8E87] focus:outline-none focus:border-[#141413]"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[10px] font-mono uppercase text-[#8F8E87] mr-1">Status:</span>
            {(
              [
                { key: 'ALL', label: 'All' },
                { key: 'COMPLIANT', label: 'Compliant' },
                { key: 'REVIEW', label: 'Review' },
                { key: 'NON_COMPLIANT', label: 'Non-compliant' },
                { key: 'UNABLE_TO_ASSESS', label: 'Unable to assess' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-2.5 py-1 rounded-xs text-xs transition-colors cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-[#141413] text-[#FFFFFF] font-semibold'
                    : 'bg-[#FAF9F6] border border-[#E2DFD8] text-[#6E6D67] hover:bg-[#F2F0E8]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Secondary Dropdown Filters (Date & Inspector) */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[#ECE9E2] text-xs text-[#6E6D67]">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase text-[#8F8E87]">Date:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
              className="px-2 py-1 bg-[#FAF9F6] border border-[#E2DFD8] rounded-xs text-xs text-[#141413] focus:outline-none focus:border-[#141413]"
            >
              <option value="ALL">All Time</option>
              <option value="7_DAYS">Last 7 Days</option>
              <option value="30_DAYS">Last 30 Days</option>
              <option value="QUARTER">Last 90 Days</option>
              <option value="YTD">Year to Date</option>
            </select>
          </div>

          {/* Inspector Selector (if available) */}
          {inspectorsList.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase text-[#8F8E87]">Inspector:</span>
              <select
                value={selectedInspector}
                onChange={(e) => setSelectedInspector(e.target.value)}
                className="px-2 py-1 bg-[#FAF9F6] border border-[#E2DFD8] rounded-xs text-xs text-[#141413] focus:outline-none focus:border-[#141413]"
              >
                <option value="ALL">All Inspectors</option>
                {inspectorsList.map((insp) => (
                  <option key={insp} value={insp}>{insp}</option>
                ))}
              </select>
            </div>
          )}

          <span className="ml-auto text-[11px] font-mono text-[#8F8E87]">
            Showing {filteredProducts.length} of {displayProducts.length} records
          </span>
        </div>
      </div>

      {/* ═══ Inspection Register Table ═══ */}
      <div className="disha-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="disha-table">
            <thead>
              <tr>
                <th className="disha-th w-28">Audit ID</th>
                <th className="disha-th">Product Description</th>
                <th className="disha-th">Manufacturer</th>
                <th className="disha-th w-24 text-center">Score</th>
                <th className="disha-th w-28">Status</th>
                <th className="disha-th w-32">Inspection Date</th>
                <th className="disha-th w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const normStatus = getProductCanonicalStatus(p);
                  const isPass = normStatus === 'PASS';
                  const isReview = normStatus === 'REVIEW';
                  const isFail = normStatus === 'FAIL';
                  const formattedDate = p.scannedAt
                    ? new Date(p.scannedAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })
                    : '—';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectProduct(p)}
                      className="disha-tr cursor-pointer"
                    >
                      <td className="disha-td font-mono font-bold text-xs text-[#D4381D]">
                        {p.id}
                      </td>

                      <td className="disha-td">
                        <p className="font-semibold text-[#141413] text-xs line-clamp-1">
                          {p.productName}
                        </p>
                        <p className="text-[11px] text-[#8F8E87] mt-0.5">
                          {p.brandName || 'Brand N/A'} &bull; {p.category || 'Packaged Commodity'}
                        </p>
                      </td>

                      <td className="disha-td text-xs text-[#6E6D67]">
                        <span className="line-clamp-1">{p.manufacturerName || 'N/A'}</span>
                      </td>

                      <td className="disha-td text-center font-mono font-bold">
                        <span className={
                          isPass ? 'text-[#1B7F43]' :
                          isReview ? 'text-[#B45309]' :
                          isFail ? 'text-[#C5281B]' : 'text-[#5A5955]'
                        }>
                          {p.overallScore ?? '—'}
                        </span>
                      </td>

                      <td className="disha-td">
                        {isPass && <span className="badge-pass">PASS</span>}
                        {isReview && <span className="badge-review">REVIEW</span>}
                        {isFail && <span className="badge-fail">FAIL</span>}
                        {normStatus === 'UNABLE_TO_ASSESS' && <span className="badge-neutral">UNASSESSED</span>}
                      </td>

                      <td className="disha-td font-mono text-[11px] text-[#6E6D67]">
                        {formattedDate}
                      </td>

                      <td className="disha-td text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => generateInspectionPdfReport(p)}
                          title={`Download official PDF report for ${p.productName}`}
                          className="p-1 text-[#6E6D67] hover:text-[#141413] rounded-xs hover:bg-[#EFECE6] transition-colors cursor-pointer"
                          aria-label="Download PDF"
                        >
                          <span className="material-symbols-outlined text-[18px]">download</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#8F8E87]">
                    {searchTerm || statusFilter !== 'ALL' || dateFilter !== 'ALL'
                      ? 'No inspection records match the selected filter criteria.'
                      : 'No statutory inspection records found in the database.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default RepositoryView;

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

type DateFilterType = '30_DAYS' | '7_DAYS' | 'QUARTER' | 'YTD' | 'ALL';

export const RepositoryView: React.FC<RepositoryViewProps> = ({
  products: initialProducts,
  user,
  onSelectProduct
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLIANT' | 'NON_COMPLIANT'>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('30_DAYS');

  // 1. ONE SINGLE SOURCE OF TRUTH DATASET (Derived from real PostgreSQL inspection records)
  const displayProducts = useMemo(() => {
    return initialProducts || [];
  }, [initialProducts]);


  // 2. DYNAMIC REAL-TIME STATISTICS (Identical to Dashboard metrics)
  const stats = useMemo(() => {
    const total = displayProducts.length;
    const passedProducts = displayProducts.filter(p => getProductCanonicalStatus(p) === 'PASS');
    const failedProducts = displayProducts.filter(p => getProductCanonicalStatus(p) === 'FAIL');
    const reviewProducts = displayProducts.filter(p => getProductCanonicalStatus(p) === 'REVIEW');

    const passed = passedProducts.length;
    const failed = failedProducts.length;
    const pendingReview = reviewProducts.length;

    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    const averageScore = total > 0
      ? Math.round(displayProducts.reduce((sum, p) => sum + (p.overallScore || 0), 0) / total)
      : 0;

    return {
      total,
      passed,
      failed,
      pendingReview,
      passRate,
      averageScore
    };
  }, [displayProducts]);

  // 3. FILTERED PRODUCTS (Search, Date, and Status filtering)
  const filteredProducts = useMemo(() => {
    return displayProducts.filter(p => {
      // Search matching (product name, brand, manufacturer, audit ID, barcode)
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q || (
        (p.productName && p.productName.toLowerCase().includes(q)) ||
        (p.brandName && p.brandName.toLowerCase().includes(q)) ||
        (p.manufacturerName && p.manufacturerName.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );

      // Status matching using unified getProductCanonicalStatus
      const normStatus = getProductCanonicalStatus(p);
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'COMPLIANT' && normStatus === 'PASS') ||
        (statusFilter === 'NON_COMPLIANT' && (normStatus === 'FAIL' || normStatus === 'REVIEW'));

      // Date matching against product scannedAt timestamp
      const matchesDate = (() => {
        if (dateFilter === 'ALL') return true;
        if (!p.scannedAt) return true;
        const scanTimestamp = new Date(p.scannedAt).getTime();
        if (isNaN(scanTimestamp)) return true;

        const now = Date.now();
        // Benchmark from max of current time or latest scanned timestamp in dataset
        const latestScan = Math.max(now, ...displayProducts.map(d => new Date(d.scannedAt || 0).getTime()));
        const diffDays = (latestScan - scanTimestamp) / (1000 * 60 * 60 * 24);

        if (dateFilter === '7_DAYS') return diffDays <= 7;
        if (dateFilter === '30_DAYS') return diffDays <= 30;
        if (dateFilter === 'QUARTER') return diffDays <= 90;
        if (dateFilter === 'YTD') return diffDays <= 365;
        return true;
      })();

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [displayProducts, searchTerm, statusFilter, dateFilter]);

  // CSV Export Functionality
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
    link.setAttribute('download', `Disha_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const userDisplayName = user
    ? user.role === 'ENFORCEMENT_OFFICER'
      ? `${user.full_name} (Zone 4)`
      : user.full_name
    : 'Authorized Officer';

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-headline-lg text-headline-lg text-primary font-bold mb-1">Reports & Audit Logs</h2>
            {user && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                <span className="material-symbols-outlined text-[15px]">badge</span>
                {userDisplayName}
              </span>
            )}
          </div>
          <p className="font-body-md text-body-md text-text-muted">
            Inspecting Authority: <strong className="text-text-main font-semibold">{userDisplayName}</strong> &bull; Comprehensive audit trail and compliance metrics.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Controlled Date Filter */}
          <div className="relative w-full sm:w-auto">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">
              calendar_today
            </span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
              className="w-full sm:w-auto pl-9 pr-8 py-2 bg-surface-container-lowest border border-border-subtle rounded-lg font-body-md text-body-md text-text-main focus:outline-none focus:border-primary appearance-none cursor-pointer hover:bg-surface-container-low transition-colors shadow-2xs"
            >
              <option value="30_DAYS">Last 30 Days</option>
              <option value="7_DAYS">Last 7 Days</option>
              <option value="QUARTER">This Quarter (90 Days)</option>
              <option value="YTD">Year to Date</option>
              <option value="ALL">All Time</option>
            </select>
          </div>

          {/* Working Export Button */}
          <button
            onClick={handleExport}
            className="bg-primary text-white px-4 py-2 rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors shadow-2xs flex items-center gap-2 font-semibold cursor-pointer shrink-0"
            title="Export filtered records to CSV"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Dynamic Aggregate Stats (Calculated from exact same central dataset) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. Overall Pass Rate */}
        <div className="bg-surface-container-lowest border border-border-subtle rounded-lg p-5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="font-label-md text-label-md text-text-muted mb-1 uppercase tracking-wider">Overall Pass Rate</p>
            <h3 className="font-headline-xl text-headline-xl text-text-main font-bold">{stats.passRate}%</h3>
            <p className="font-body-md text-body-md text-status-pass flex items-center gap-1 mt-1 font-semibold">
              <span className="material-symbols-outlined text-[16px]">verified</span> {stats.passed} of {stats.total} passed inspections
            </p>
          </div>
          <div className="w-14 h-14 rounded-full border-4 border-status-pass flex items-center justify-center relative bg-status-pass/5">
            <span className="material-symbols-outlined text-status-pass text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          </div>
        </div>

        {/* 2. Total Inspections */}
        <div className="bg-surface-container-lowest border border-border-subtle rounded-lg p-5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="font-label-md text-label-md text-text-muted mb-1 uppercase tracking-wider">Total Inspections</p>
            <h3 className="font-headline-xl text-headline-xl text-text-main font-bold">{stats.total.toLocaleString()}</h3>
            <p className="font-body-md text-body-md text-text-muted flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-[16px]">sync</span> {stats.pendingReview} pending review
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[28px]">inventory_2</span>
          </div>
        </div>

        {/* 3. Avg Compliance Score */}
        <div className="bg-surface-container-lowest border border-border-subtle rounded-lg p-5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="font-label-md text-label-md text-text-muted mb-1 uppercase tracking-wider">Avg Compliance Score</p>
            <h3 className="font-headline-xl text-headline-xl text-text-main font-bold">{stats.averageScore}<span className="text-headline-md text-text-muted font-normal">/100</span></h3>
            <p className="font-body-md text-body-md text-status-review flex items-center gap-1 mt-1 font-semibold">
              <span className="material-symbols-outlined text-[16px]">analytics</span> {stats.failed} non-compliant &bull; {stats.pendingReview} in review
            </p>
          </div>
          <div className="w-14 h-14 rounded-full border-4 border-status-review flex items-center justify-center font-bold text-base text-text-main bg-status-review/5">
            {stats.averageScore}
          </div>
        </div>

      </div>

      {/* Search & Filter Bar */}
      <div className="bg-surface-container-lowest border border-border-subtle p-4 rounded-lg flex flex-col md:flex-row justify-between gap-4">
        
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">search</span>
          <input
            type="text"
            placeholder="Search product, manufacturer, brand, or audit ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-border-subtle rounded-lg font-body-md text-body-md text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-text-muted hover:bg-surface-container-high'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('COMPLIANT')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'COMPLIANT'
                ? 'bg-status-pass text-white shadow-xs'
                : 'bg-surface-container-low text-text-muted hover:bg-surface-container-high'
            }`}
          >
            Compliant
          </button>
          <button
            onClick={() => setStatusFilter('NON_COMPLIANT')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'NON_COMPLIANT'
                ? 'bg-status-fail text-white shadow-xs'
                : 'bg-surface-container-low text-text-muted hover:bg-surface-container-high'
            }`}
          >
            Non-Compliant
          </button>
        </div>

      </div>

      {/* Audit Log Table */}
      <div className="bg-surface-container-lowest border border-border-subtle rounded-lg overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-border-subtle bg-surface flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md text-text-main font-semibold">Audit Logs Detail</h3>
          <span className="text-xs text-text-muted font-medium">Showing {filteredProducts.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-container-low">
                <th className="py-3 px-4 font-label-md text-label-md text-text-muted uppercase">Audit ID</th>
                <th className="py-3 px-4 font-label-md text-label-md text-text-muted uppercase">Product Name</th>
                <th className="py-3 px-4 font-label-md text-label-md text-text-muted uppercase">Manufacturer</th>
                <th className="py-3 px-4 font-label-md text-label-md text-text-muted uppercase">Score</th>
                <th className="py-3 px-4 font-label-md text-label-md text-text-muted uppercase">Compliance Rate</th>
                <th className="py-3 px-4 font-label-md text-label-md text-text-muted uppercase">Status</th>
                <th className="py-3 px-4 font-label-md text-label-md text-text-muted uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredProducts.map((p) => {
                const normStatus = getProductCanonicalStatus(p);
                const isPass = normStatus === 'PASS';
                const isReview = normStatus === 'REVIEW';

                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProduct(p)}
                    className="hover:bg-surface-container-low transition-colors cursor-pointer h-12"
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-primary text-xs">
                      {p.id}
                    </td>
                    <td className="py-2.5 px-4 font-body-md text-body-md text-text-main font-medium">
                      {p.productName}
                    </td>
                    <td className="py-2.5 px-4 font-body-md text-body-md text-text-muted">
                      {p.manufacturerName}
                    </td>
                    <td className="py-2.5 px-4 font-body-md text-body-md font-bold text-text-main">
                      {p.overallScore}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-surface-container-high rounded-full h-2 max-w-[100px]">
                          <div
                            className={`h-2 rounded-full ${
                              isPass ? 'bg-status-pass' : isReview ? 'bg-status-review' : 'bg-status-fail'
                            }`}
                            style={{ width: `${p.overallScore}%` }}
                          />
                        </div>
                        <span className="font-label-md text-label-md font-semibold">{p.overallScore}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      {isPass ? (
                        <span className="inline-flex items-center gap-1 bg-status-pass/10 text-status-pass px-2.5 py-1 rounded font-label-sm text-label-sm border border-status-pass/20 font-semibold">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span> Compliant
                        </span>
                      ) : isReview ? (
                        <span className="inline-flex items-center gap-1 bg-status-review/10 text-status-review px-2.5 py-1 rounded font-label-sm text-label-sm border border-status-review/20 font-semibold">
                          <span className="material-symbols-outlined text-[14px]">warning</span> Review Req
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-status-fail/10 text-status-fail px-2.5 py-1 rounded font-label-sm text-label-sm border border-status-fail/20 font-semibold">
                          <span className="material-symbols-outlined text-[14px]">error</span> Action Req
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generateInspectionPdfReport(p);
                        }}
                        title={`Download official inspection report PDF for ${p.productName}`}
                        className="text-text-muted hover:text-primary p-1.5 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
                        aria-label={`Download PDF report for ${p.id}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted text-sm">
                    No inspection audit records found matching your filters.
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

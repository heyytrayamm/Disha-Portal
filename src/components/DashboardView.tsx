import React, { useState, useEffect, useMemo } from 'react';
import type { ScannedProduct, ComplianceStats } from '../types/metrology';
import type { User } from '../types/auth';
import { generateInitialSampleProducts } from '../services/sampleDataService';
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
  user,
  stats: _stats,
  products: initialProducts,
  onSelectProduct,
  onNavigateScan,
  onOpenScanner
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStat, setSelectedStat] = useState<StatDetailType>(null);

  // 1. ONE SINGLE SOURCE OF TRUTH DATASET
  const displayProducts = useMemo(() => {
    return initialProducts && initialProducts.length > 0 
      ? initialProducts 
      : generateInitialSampleProducts();
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

  // 2. Filter the SAME single dataset into categorized lists using unified canonical status
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

  // 3. Derived single-source-of-truth statistics
  // Invariant strictly maintained: productsChecked === passed + failed + reviewRequired
  const derivedStats = useMemo(() => {
    const productsChecked = displayProducts.length;
    const passed = passedProducts.length;
    const failed = failedProducts.length;
    const reviewRequired = reviewProducts.length;

    // Average score calculated directly from the same inspected products
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
        return (
          <span className="inline-flex items-center gap-xs px-2 py-1 rounded-full bg-status-pass/10 text-status-pass font-label-sm text-label-sm font-semibold">
            <span className="material-symbols-outlined text-[14px]">check_circle</span> PASS
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex items-center gap-xs px-2 py-1 rounded-full bg-status-fail/10 text-status-fail font-label-sm text-label-sm font-semibold">
            <span className="material-symbols-outlined text-[14px]">error</span> FAIL
          </span>
        );
      case 'REVIEW':
        return (
          <span className="inline-flex items-center gap-xs px-2 py-1 rounded-full bg-status-review/10 text-status-review font-label-sm text-label-sm font-semibold">
            <span className="material-symbols-outlined text-[14px]">warning</span> REVIEW
          </span>
        );
      default:
        return null;
    }
  };

  // 4. Modal lists derived from the EXACT SAME filtered arrays
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

  // 5. Modal titles and badges derived from the EXACT SAME numbers
  const getModalTitle = () => {
    switch (selectedStat) {
      case 'TOTAL':
        return {
          title: 'Products Checked',
          subtitle: `All ${productsChecked} verified packaging labels in this inspection cycle`,
          icon: 'inventory_2',
          badge: `${productsChecked} Total`
        };
      case 'PASSED':
        return {
          title: 'Compliant / Passed Products',
          subtitle: `${passed} labels satisfying all mandatory legal declarations`,
          icon: 'check_circle',
          badge: `${passed} Compliant`
        };
      case 'FAILED':
        return {
          title: 'Non-Compliant / Failed Products',
          subtitle: `${failed} labels with critical or major declaration infractions`,
          icon: 'error',
          badge: `${failed} Failed`
        };
      case 'REVIEW':
        return {
          title: 'Review Required Products',
          subtitle: `${reviewRequired} labels requiring manual verification or OCR re-check`,
          icon: 'warning',
          badge: `${reviewRequired} Pending`
        };
      case 'SCORE':
        return {
          title: 'Average Compliance Score & Analytics',
          subtitle: `National compliance benchmark: ${averageScore}/100 based on ${productsChecked} inspected units`,
          icon: 'analytics',
          badge: `${averageScore}% Avg`
        };
      default:
        return { title: '', subtitle: '', icon: '', badge: '' };
    }
  };

  const modalMeta = getModalTitle();
  const modalProducts = getModalProducts();

  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-xl gap-md">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-primary font-bold mb-xs">
            Product Label Compliance Dashboard
          </h2>
          <p className="font-body-lg text-body-lg text-text-muted max-w-2xl">
            {user ? (
              <span>
                Active Officer: <strong className="text-text-main font-semibold">{user.full_name}</strong> &bull; {user.role === 'SYSTEM_ADMIN' ? 'System Administrator' : 'Enforcement / Inspection Officer'} &bull; Real-time statutory packaging compliance monitoring.
              </span>
            ) : (
              'Verify product labels against applicable regulatory requirements in seconds.'
            )}
          </p>
        </div>
        <div className="flex gap-md">
          <button
            onClick={onOpenScanner}
            className="bg-white border border-border-subtle text-primary-container px-md py-sm rounded-lg font-body-md text-body-md hover:bg-surface-container-low transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            Upload Label Image
          </button>
          <button
            onClick={onOpenScanner}
            className="bg-primary-container text-on-primary px-md py-sm rounded-lg font-body-md text-body-md hover:bg-primary transition-colors flex items-center gap-xs shadow-[0_1px_2px_rgba(0,0,0,0.05)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Scan New Product
          </button>
        </div>
      </div>

      {/* Stats Grid - Clickable Cards using ONE Single Source of Truth */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-md mb-xl">
        
        {/* 1. Products Checked */}
        <div 
          onClick={() => setSelectedStat('TOTAL')}
          className="bg-surface-container-lowest border border-border-subtle rounded-lg p-md cursor-pointer hover:border-primary hover:shadow-md hover:-translate-y-0.5 transition-all group select-none relative"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setSelectedStat('TOTAL')}
        >
          <div className="flex items-center justify-between mb-xs">
            <p className="font-label-md text-label-md text-text-muted uppercase tracking-wider group-hover:text-primary transition-colors">Products Checked</p>
            <span className="material-symbols-outlined text-[16px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
          </div>
          <p className="font-headline-lg text-headline-lg text-text-main font-semibold">{productsChecked.toLocaleString()}</p>
        </div>

        {/* 2. Passed */}
        <div 
          onClick={() => setSelectedStat('PASSED')}
          className="bg-surface-container-lowest border border-border-subtle rounded-lg p-md cursor-pointer hover:border-status-pass hover:shadow-md hover:-translate-y-0.5 transition-all group select-none relative"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setSelectedStat('PASSED')}
        >
          <div className="flex items-center justify-between mb-xs">
            <p className="font-label-md text-label-md text-text-muted uppercase tracking-wider group-hover:text-status-pass transition-colors">Passed</p>
            <span className="material-symbols-outlined text-[16px] text-status-pass opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
          </div>
          <p className="font-headline-lg text-headline-lg text-status-pass font-semibold">{passed.toLocaleString()}</p>
        </div>

        {/* 3. Failed */}
        <div 
          onClick={() => setSelectedStat('FAILED')}
          className="bg-surface-container-lowest border border-border-subtle rounded-lg p-md cursor-pointer hover:border-status-fail hover:shadow-md hover:-translate-y-0.5 transition-all group select-none relative"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setSelectedStat('FAILED')}
        >
          <div className="flex items-center justify-between mb-xs">
            <p className="font-label-md text-label-md text-text-muted uppercase tracking-wider group-hover:text-status-fail transition-colors">Failed</p>
            <span className="material-symbols-outlined text-[16px] text-status-fail opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
          </div>
          <p className="font-headline-lg text-headline-lg text-status-fail font-semibold">{failed.toLocaleString()}</p>
        </div>

        {/* 4. Review Required */}
        <div 
          onClick={() => setSelectedStat('REVIEW')}
          className="bg-surface-container-lowest border border-border-subtle rounded-lg p-md cursor-pointer hover:border-status-review hover:shadow-md hover:-translate-y-0.5 transition-all group select-none relative"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setSelectedStat('REVIEW')}
        >
          <div className="flex items-center justify-between mb-xs">
            <p className="font-label-md text-label-md text-text-muted uppercase tracking-wider group-hover:text-status-review transition-colors">Review Required</p>
            <span className="material-symbols-outlined text-[16px] text-status-review opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
          </div>
          <p className="font-headline-lg text-headline-lg text-status-review font-semibold">{reviewRequired.toLocaleString()}</p>
        </div>

        {/* 5. Avg Score */}
        <div 
          onClick={() => setSelectedStat('SCORE')}
          className="bg-surface-container-lowest border border-border-subtle rounded-lg p-md flex items-center justify-between col-span-2 md:col-span-1 cursor-pointer hover:border-primary hover:shadow-md hover:-translate-y-0.5 transition-all group select-none relative"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setSelectedStat('SCORE')}
        >
          <div>
            <div className="flex items-center gap-1 mb-xs">
              <p className="font-label-md text-label-md text-text-muted uppercase tracking-wider group-hover:text-primary transition-colors">Avg Score</p>
              <span className="material-symbols-outlined text-[14px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
            </div>
            <p className="font-headline-lg text-headline-lg text-primary-container font-semibold">{averageScore}%</p>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-status-pass flex items-center justify-center group-hover:bg-status-pass/5 transition-colors">
            <span className="font-label-md text-label-md text-text-main font-bold">{averageScore}</span>
          </div>
        </div>

      </div>

      {/* Recent Inspections Table */}
      <div className="bg-surface-container-lowest border border-border-subtle rounded-lg overflow-hidden shadow-xs">
        <div className="p-md border-b border-border-subtle bg-surface flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm">
          <h3 className="font-headline-md text-headline-md text-text-main font-semibold">Recent Inspections</h3>
          <div className="flex items-center gap-md">
            <div className="flex items-center gap-sm bg-surface-container-lowest border border-border-subtle rounded-lg px-sm py-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
              <span className="material-symbols-outlined text-text-muted text-[18px]">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none bg-transparent outline-none font-body-md text-body-md text-text-main placeholder:text-text-muted w-40"
                placeholder="Search..."
              />
            </div>
            <button 
              onClick={() => setSelectedStat('TOTAL')}
              className="text-primary font-label-md text-label-md hover:underline flex items-center gap-xs cursor-pointer font-semibold"
            >
              View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-border-subtle">
                <th className="py-sm px-md font-label-md text-label-md text-text-muted font-semibold uppercase">Product</th>
                <th className="py-sm px-md font-label-md text-label-md text-text-muted font-semibold uppercase hidden md:table-cell">Manufacturer</th>
                <th className="py-sm px-md font-label-md text-label-md text-text-muted font-semibold uppercase hidden lg:table-cell">Origin</th>
                <th className="py-sm px-md font-label-md text-label-md text-text-muted font-semibold uppercase hidden lg:table-cell">MRP</th>
                <th className="py-sm px-md font-label-md text-label-md text-text-muted font-semibold uppercase hidden md:table-cell">Date</th>
                <th className="py-sm px-md font-label-md text-label-md text-text-muted font-semibold uppercase">Score</th>
                <th className="py-sm px-md font-label-md text-label-md text-text-muted font-semibold uppercase">Status</th>
                <th className="py-sm px-md font-label-md text-label-md text-text-muted font-semibold uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredProducts.map((product) => {
                const mrpField = product.extractedFields?.find(f => f.category === 'MAXIMUM_RETAIL_PRICE');
                const mrpValue = mrpField?.parsedValue ? `₹${mrpField.parsedValue}` : '—';
                const scanDate = product.scannedAt 
                  ? new Date(product.scannedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—';

                return (
                  <tr
                    key={product.id}
                    className="hover:bg-surface-container-low transition-colors h-[48px] cursor-pointer"
                    onClick={() => handleProductClick(product)}
                  >
                    <td className="py-sm px-md font-body-md text-body-md text-text-main font-medium">{product.productName}</td>
                    <td className="py-sm px-md font-body-md text-body-md text-text-muted hidden md:table-cell">{product.manufacturerName}</td>
                    <td className="py-sm px-md font-body-md text-body-md text-text-muted hidden lg:table-cell">{product.countryOfOrigin || 'India'}</td>
                    <td className="py-sm px-md font-body-md text-body-md text-text-muted hidden lg:table-cell">{mrpValue}</td>
                    <td className="py-sm px-md font-body-md text-body-md text-text-muted hidden md:table-cell">{scanDate}</td>
                    <td className="py-sm px-md font-body-md text-body-md font-semibold text-text-main">{product.overallScore}</td>
                    <td className="py-sm px-md">{getStatusBadge(product)}</td>
                    <td className="py-sm px-md text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleProductClick(product); }}
                        className="text-text-muted hover:text-primary transition-colors cursor-pointer p-1 rounded hover:bg-surface-container-high"
                      >
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-xl text-center text-text-muted font-body-md text-body-md">
                    No inspections found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ STATISTIC DETAILS EXPANDED MODAL ═══ */}
      {selectedStat && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto w-screen h-screen left-0 top-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedStat(null);
          }}
        >
          <div 
            className="bg-surface-container-lowest border border-border-subtle rounded-2xl shadow-2xl overflow-hidden text-text-main my-auto flex flex-col relative z-50 animate-in fade-in duration-200"
            style={{
              width: 'min(92vw, 750px)',
              maxWidth: '750px',
              maxHeight: '85vh',
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-surface border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">{modalMeta.icon}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline-md text-base sm:text-lg font-bold text-primary">
                      {modalMeta.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary-container text-on-secondary-container">
                      {modalMeta.badge}
                    </span>
                  </div>
                  <p className="font-label-sm text-xs text-text-muted mt-0.5">
                    {modalMeta.subtitle}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedStat(null)} 
                className="text-text-muted hover:text-text-main p-1.5 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {selectedStat === 'SCORE' ? (
                /* Analytics Score Breakdown View */
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle text-center">
                      <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Average Score</p>
                      <h4 className="font-headline-xl text-3xl font-bold text-primary mt-1">{averageScore}%</h4>
                      <p className="text-[11px] text-status-pass font-medium mt-0.5">Inspected Benchmark</p>
                    </div>
                    <div className="p-4 rounded-xl bg-status-pass/10 border border-status-pass/20 text-center">
                      <p className="text-xs text-status-pass uppercase tracking-wider font-semibold">Compliance Rate</p>
                      <h4 className="font-headline-xl text-3xl font-bold text-status-pass mt-1">
                        {productsChecked > 0 ? Math.round((passed / productsChecked) * 100) : 0}%
                      </h4>
                      <p className="text-[11px] text-text-muted font-medium mt-0.5">{passed} of {productsChecked} units</p>
                    </div>
                    <div className="p-4 rounded-xl bg-error-container/40 border border-error/20 text-center">
                      <p className="text-xs text-error uppercase tracking-wider font-semibold">Infraction Rate</p>
                      <h4 className="font-headline-xl text-3xl font-bold text-error mt-1">
                        {productsChecked > 0 ? Math.round((failed / productsChecked) * 100) : 0}%
                      </h4>
                      <p className="text-[11px] text-text-muted font-medium mt-0.5">{failed} of {productsChecked} units</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-container-lowest border border-border-subtle space-y-3">
                    <h5 className="font-headline-md text-sm font-bold text-text-main">Quality Rating Distribution</h5>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span>Passed Labels (Score 80-100)</span>
                          <span className="text-status-pass font-bold">{passed} products</span>
                        </div>
                        <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                          <div className="h-full bg-status-pass rounded-full" style={{ width: `${productsChecked > 0 ? (passed / productsChecked) * 100 : 0}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span>Review Required (Score 60-79)</span>
                          <span className="text-status-review font-bold">{reviewRequired} products</span>
                        </div>
                        <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                          <div className="h-full bg-status-review rounded-full" style={{ width: `${productsChecked > 0 ? (reviewRequired / productsChecked) * 100 : 0}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span>Failed Labels (Score &lt; 60)</span>
                          <span className="text-status-fail font-bold">{failed} products</span>
                        </div>
                        <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                          <div className="h-full bg-status-fail rounded-full" style={{ width: `${productsChecked > 0 ? (failed / productsChecked) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Products List for Selected Metric */
                <div className="divide-y divide-border-subtle border border-border-subtle rounded-xl overflow-hidden">
                  {modalProducts.length > 0 ? (
                    modalProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleProductClick(p)}
                        className="p-3.5 bg-surface-container-lowest hover:bg-surface-container-low transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img 
                            src={resolveImageUrl(p.sourceImageUrl || p.imageUrl) || p.preprocessingStages?.original || ''} 
                            alt={p.productName} 
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                            }}
                            className="w-10 h-12 object-cover rounded border border-border-subtle shrink-0" 
                          />
                          <div className="min-w-0">
                            <p className="font-body-md text-sm font-semibold text-text-main truncate group-hover:text-primary transition-colors">
                              {p.productName}
                            </p>
                            <p className="text-xs text-text-muted truncate mt-0.5">
                              {p.manufacturerName} • {p.category}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right hidden sm:block">
                            <span className="text-xs font-bold text-text-main">{p.overallScore}</span>
                            <span className="text-[10px] text-text-muted">/100</span>
                          </div>
                          {getStatusBadge(p)}
                          <span className="material-symbols-outlined text-text-muted text-[18px] group-hover:text-primary transition-colors">
                            chevron_right
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-text-muted text-xs">
                      No products found in this category.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-surface border-t border-border-subtle flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStat(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-surface-container-low hover:bg-surface-container-high text-text-main border border-border-subtle transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

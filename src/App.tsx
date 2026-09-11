import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ScanAnalysisView } from './components/ScanAnalysisView';
import { ScannerModal } from './components/ScannerModal';
import { RepositoryView } from './components/RepositoryView';
import { RuleMatrixDocsView } from './components/RuleMatrixDocsView';
import { NoticeGeneratorModal } from './components/NoticeGeneratorModal';
import { LoginModal } from './components/LoginModal';
import { UserManagementView } from './components/UserManagementView';

import type { ActiveTab, ScannedProduct, ComplianceStats } from './types/metrology';
import type { User } from './types/auth';
import { ApiService, API_BASE_URL } from './services/api';
import { AuthService } from './services/authService';
import { generateInspectionPdfReport } from './services/pdfReportService';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Auth State
  const [user, setUser] = useState<User | null>(null);

  // Application Data State (Strictly from real PostgreSQL database)
  const [products, setProducts] = useState<ScannedProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ScannedProduct | null>(null);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [_loading, setLoading] = useState(true);

  // Synchronize Tab and Active Inspection ID with URL Query Params (Part 10 persistence)
  const syncNavigation = (tab: ActiveTab, inspectionId?: string | null) => {
    setActiveTab(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      if (inspectionId) {
        url.searchParams.set('id', inspectionId);
        localStorage.setItem('last_active_inspection_id', inspectionId);
      } else if (tab !== 'scan') {
        url.searchParams.delete('id');
      }
      window.history.pushState({}, '', url.toString());
    } catch {
      // Non-browser fallback
    }
  };

  // Initialize Auth & Load Data with URL Parameter Persistence
  useEffect(() => {
    const authState = AuthService.getInitialState();
    setUser(authState.user);
    if (!authState.isAuthenticated || !authState.user) {
      setIsLoginModalOpen(true);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = (urlParams.get('tab') as ActiveTab) || 'dashboard';
    const idParam = urlParams.get('id') || localStorage.getItem('last_active_inspection_id');

    if (tabParam) {
      setActiveTab(tabParam);
    }
    loadData(tabParam, idParam);
  }, []);

  const loadData = async (tabParam?: ActiveTab, idParam?: string | null) => {
    setLoading(true);
    try {
      const [fetchedStats, fetchedProducts] = await Promise.allSettled([
        ApiService.fetchDashboardStats(),
        ApiService.fetchProducts()
      ]);

      if (fetchedStats.status === 'fulfilled') {
        setStats(fetchedStats.value);
      }

      let prods: ScannedProduct[] = [];
      if (fetchedProducts.status === 'fulfilled') {
        prods = fetchedProducts.value;
        setProducts(prods);
      }

      // Check if target inspection is specified by ID (survives refresh)
      let targetProduct: ScannedProduct | null = null;
      if (idParam) {
        targetProduct = prods.find(p => p.id === idParam || p.inspection_id === idParam) || null;
        if (!targetProduct) {
          try {
            targetProduct = await ApiService.fetchInspectionById(idParam);
            if (targetProduct) {
              setProducts(prev => [targetProduct!, ...prev.filter(p => p.id !== targetProduct!.id)]);
            }
          } catch (fetchErr) {
            console.warn(`Could not load target inspection '${idParam}' from database:`, fetchErr);
          }
        }
      }

      if (targetProduct) {
        setSelectedProduct(targetProduct);
        if (tabParam === 'scan' || !tabParam) {
          setActiveTab('scan');
          syncNavigation('scan', targetProduct.id);
        }
      } else if (prods.length > 0) {
        setSelectedProduct(prods[0]);
      }
    } catch (e) {
      console.error("Error loading inspection records from database:", e);
    } finally {
      setLoading(false);
    }
  };

  // Handle Statutory Notice Issue
  const handleIssueNotice = async (updatedProduct: ScannedProduct) => {
    if (!selectedProduct) return;
    try {
      let updated = updatedProduct;
      try {
        const noticeData = updatedProduct.noticeDetails;
        if (noticeData) {
          updated = await ApiService.issueStatutoryNotice(selectedProduct.id, noticeData);
        }
      } catch (_) {
        // Use the locally computed product from the modal
      }
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      setSelectedProduct(updated);
      setIsNoticeModalOpen(false);
      
      // Refresh stats from PostgreSQL
      const freshStats = await ApiService.fetchDashboardStats();
      setStats(freshStats);
    } catch (err) {
      console.error("Notice error:", err);
    }
  };

  // PDF Report Generator Download
  const handleDownloadPDF = async (product: ScannedProduct) => {
    try {
      const reportUrl = `${API_BASE_URL}/reports/${product.id}/download`;
      const res = await fetch(reportUrl);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Legal_Inspection_Report_${product.id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // Fallback client side generator
    }

    // Client-side reportlab fallback
    generateInspectionPdfReport(product);
  };

  return (
    <div className="min-h-screen bg-background text-text-main font-body-md flex flex-col">
      
      {/* Header & Side Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(t) => syncNavigation(t, t === 'scan' ? selectedProduct?.id : null)}
        onOpenScanner={() => setIsScannerOpen(true)}
        user={user}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={() => {
          AuthService.clearSession();
          setUser(null);
          setIsLoginModalOpen(true);
        }}
      />

      {/* Main Content Area (Offset by 64 units on desktop for SideNav) */}
      <main className="md:ml-64 flex-1 flex flex-col min-h-screen bg-background">
        <div className="px-margin-desktop py-lg max-w-[1280px] mx-auto w-full flex-1">
        
        {activeTab === 'dashboard' && (
          <DashboardView
            user={user}
            stats={stats}
            products={products}
            onSelectProduct={(product) => {
              setSelectedProduct(product);
              syncNavigation('scan', product.id);
            }}
            onNavigateScan={(product) => {
              setSelectedProduct(product);
              syncNavigation('scan', product.id);
            }}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {activeTab === 'scan' && (
          <ScanAnalysisView
            product={selectedProduct || products[0] || null}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenNoticeModal={() => setIsNoticeModalOpen(true)}
            onDownloadPDF={handleDownloadPDF}
          />
        )}

        {activeTab === 'repository' && (
          <RepositoryView
            products={products}
            user={user}
            onSelectProduct={(p) => {
              setSelectedProduct(p);
              syncNavigation('scan', p.id);
            }}
          />
        )}

        {activeTab === 'rules' && (
          <RuleMatrixDocsView />
        )}

        {activeTab === 'users' && (
          <UserManagementView
            currentUser={user}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        </div>
      </main>

      {/* Modals */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSelectProduct={async (product) => {
          setProducts(prev => [product, ...prev.filter(p => p.id !== product.id)]);
          setSelectedProduct(product);
          syncNavigation('scan', product.id);
          setIsScannerOpen(false);
          try {
            const freshStats = await ApiService.fetchDashboardStats();
            setStats(freshStats);
          } catch (e) {
            console.warn("Could not refresh dashboard stats:", e);
          }
        }}
      />

      {selectedProduct && (
        <NoticeGeneratorModal
          isOpen={isNoticeModalOpen}
          onClose={() => setIsNoticeModalOpen(false)}
          product={selectedProduct}
          onNoticeIssued={handleIssueNotice}
        />
      )}

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(u, _t) => {
          setUser(u);
          syncNavigation('dashboard');
        }}
      />

    </div>
  );
}

export default App;

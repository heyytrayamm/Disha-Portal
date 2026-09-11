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
import { ApiService } from './services/api';
import { AuthService } from './services/authService';
import { generateInitialSampleProducts } from './services/sampleDataService';
import { generateInspectionPdfReport } from './services/pdfReportService';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Auth State
  const [user, setUser] = useState<User | null>(null);

  // Application Data State
  const [products, setProducts] = useState<ScannedProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ScannedProduct | null>(null);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [_loading, setLoading] = useState(true);

  // Initialize Auth & Load Data
  useEffect(() => {
    const authState = AuthService.getInitialState();
    setUser(authState.user);
    if (!authState.isAuthenticated || !authState.user) {
      setIsLoginModalOpen(true);
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedStats, fetchedProducts] = await Promise.all([
        ApiService.fetchDashboardStats(),
        ApiService.fetchProducts()
      ]);
      setStats(fetchedStats);
      setProducts(fetchedProducts);
      if (fetchedProducts.length > 0 && !selectedProduct) {
        setSelectedProduct(fetchedProducts[0]);
      }
    } catch (e) {
      console.warn("Error loading data from API, using initial samples:", e);
      const samples = generateInitialSampleProducts();
      setProducts(samples);
      if (samples.length > 0) setSelectedProduct(samples[0]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Scan Analysis Completion
  const handleScanComplete = async (payload: {
    imageUrl: string;
    fileName: string;
    isImported: boolean;
    pdpAreaCm2: number;
  }) => {
    setLoading(true);
    try {
      const scannedProduct = await ApiService.scanImage({
        imageUrl: payload.imageUrl,
        fileName: payload.fileName,
        inspectorName: user?.full_name || 'Inspector Officer',
        inspectorLocation: user?.location_unit || 'Zone 4 Inspection Unit',
        isImported: payload.isImported,
        pdpAreaCm2: payload.pdpAreaCm2
      });

      setProducts(prev => [scannedProduct, ...prev]);
      setSelectedProduct(scannedProduct);
      setActiveTab('scan');
      
      // Refresh stats
      const freshStats = await ApiService.fetchDashboardStats();
      setStats(freshStats);
    } catch (err) {
      console.error("Scan processing error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Statutory Notice Issue
  const handleIssueNotice = async (updatedProduct: ScannedProduct) => {
    if (!selectedProduct) return;
    try {
      // Try backend first, fall back to the locally-computed product
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
      
      // Refresh stats
      const freshStats = await ApiService.fetchDashboardStats();
      setStats(freshStats);
    } catch (err) {
      console.error("Notice error:", err);
    }
  };

  // PDF Report Generator Download
  const handleDownloadPDF = async (product: ScannedProduct) => {
    try {
      // Direct backend download link attempt
      const reportUrl = `http://localhost:8000/api/v1/reports/${product.id}/download`;
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
      // Fallback client side reportlab / jsPDF generator
    }

    // Client-side reportlab fallback
    generateInspectionPdfReport(product);
  };

  return (
    <div className="min-h-screen bg-background text-text-main font-body-md flex flex-col">
      
      {/* Header & Side Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
              setActiveTab('scan');
            }}
            onNavigateScan={(product) => {
              setSelectedProduct(product);
              setActiveTab('scan');
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
              setActiveTab('scan');
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
        onSelectProduct={(product) => {
          setProducts(prev => [product, ...prev.filter(p => p.id !== product.id)]);
          setSelectedProduct(product);
          setActiveTab('scan');
          setIsScannerOpen(false);
        }}
        onScanComplete={handleScanComplete}
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
          setActiveTab('dashboard');
        }}
      />



    </div>
  );
}

export default App;

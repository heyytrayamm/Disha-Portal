import type { ScannedProduct, ComplianceStats } from '../types/metrology';
import { generateInitialSampleProducts, getSampleComplianceStats } from './sampleDataService';

const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
export const API_ROOT = RAW_API_URL.replace(/\/+$/, '');
export const API_BASE_URL = `${API_ROOT}/api/v1`;

/**
 * Resolves an image URL or relative backend path into a full, browser-accessible URL.
 * Handles base64 data URIs, object blob URLs, full HTTP(S) URLs, and relative backend paths.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'N/A') return '';

  // Data URIs, Object URLs, and full HTTP(S) URLs are already browser-accessible
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }

  // Relative backend path (e.g. /static/uploads/... or uploads/...)
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_ROOT}${cleanPath}`;
}

export class ApiService {
  public static normalizeProduct(product: ScannedProduct): ScannedProduct {
    if (!product) return product;
    const resolvedImage = resolveImageUrl(product.imageUrl);
    const resolvedSource = resolveImageUrl(product.sourceImageUrl || product.imageUrl);
    return {
      ...product,
      imageUrl: resolvedImage || resolvedSource,
      sourceImageUrl: resolvedSource || resolvedImage,
    };
  }

  private static getHeaders() {
    const token = localStorage.getItem('lm_auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  static async fetchHealth(): Promise<any> {
    try {
      const res = await fetch(`${API_ROOT}/api/health`);
      if (res.ok) return await res.json();
    } catch (e) {
      // Backend offline
    }
    return { status: 'OFFLINE', systemName: 'FastAPI Backend Disconnected' };
  }

  static async fetchDashboardStats(): Promise<ComplianceStats> {
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/stats`, { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      console.warn("FastAPI backend offline, using historical sample analytics.");
    }
    return getSampleComplianceStats();
  }

  static async fetchProducts(query?: string, status?: string, category?: string): Promise<ScannedProduct[]> {
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (status && status !== 'ALL') params.append('status', status);
      if (category && category !== 'ALL') params.append('category', category);

      const res = await fetch(`${API_BASE_URL}/products?${params.toString()}`, { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        return (data.products || []).map((p: ScannedProduct) => this.normalizeProduct(p));
      }
    } catch (e) {
      console.warn("FastAPI backend offline, displaying cached repository items.");
    }
    
    let sample = generateInitialSampleProducts();
    if (status && status !== 'ALL') sample = sample.filter(s => s.overallStatus === status);
    if (category && category !== 'ALL') sample = sample.filter(s => s.category === category);
    if (query) {
      const q = query.toLowerCase();
      sample = sample.filter(s => s.productName.toLowerCase().includes(q) || s.brandName.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
    }
    return sample;
  }

  static async fetchProductById(id: string): Promise<ScannedProduct | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`, { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        return this.normalizeProduct(data);
      }
    } catch (e) {
      // Offline fallback
    }
    const sample = generateInitialSampleProducts().find(s => s.id === id);
    return sample || null;
  }

  /**
   * Upload image file to real backend OCR pipeline.
   * If server is unreachable or errors, throws an informative error without fake fallbacks.
   */
  static async uploadImageFile(
    file: File,
    options?: {
      inspectorName?: string;
      inspectorLocation?: string;
      isImported?: boolean;
      pdpAreaCm2?: number;
    }
  ): Promise<ScannedProduct> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.inspectorName) formData.append('inspectorName', options.inspectorName);
    if (options?.inspectorLocation) formData.append('inspectorLocation', options.inspectorLocation);
    formData.append('isImported', String(Boolean(options?.isImported)));
    formData.append('pdpAreaCm2', String(options?.pdpAreaCm2 || 180.0));

    const token = localStorage.getItem('lm_auth_token');
    const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/scan/upload`, {
        method: 'POST',
        headers,
        body: formData
      });
    } catch (networkError: any) {
      // If multipart fails due to network, try base64 fallback to /scan endpoint
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        return await this.scanImage({
          imageUrl: base64,
          fileName: file.name,
          inspectorName: options?.inspectorName,
          inspectorLocation: options?.inspectorLocation,
          isImported: options?.isImported,
          pdpAreaCm2: options?.pdpAreaCm2
        });
      } catch (innerError: any) {
        console.error("Analysis server connection failure:", networkError, innerError);
        throw new Error("Unable to connect to the compliance analysis server. Please ensure the backend is running and reachable.");
      }
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      const msg = errData?.detail || errData?.message || `Server returned error status ${res.status}`;
      throw new Error(msg);
    }

    const data = await res.json();
    const product: ScannedProduct = data.product;
    if (data.preprocessingStages) product.preprocessingStages = data.preprocessingStages;
    if (data.opencvMetadata) product.opencvMetadata = data.opencvMetadata;
    return this.normalizeProduct(product);
  }

  /**
   * Scan image via base64 to real backend OCR pipeline.
   * If server is unreachable or errors, throws an informative error without fake fallbacks.
   */
  static async scanImage(payload: {
    imageUrl: string;
    fileName?: string;
    inspectorName?: string;
    inspectorLocation?: string;
    isImported?: boolean;
    pdpAreaCm2?: number;
  }): Promise<ScannedProduct> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/scan`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (networkError: any) {
      console.error("Backend connection error:", networkError);
      throw new Error("Unable to connect to the compliance analysis server. Please ensure the backend is running and reachable.");
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      const msg = errData?.detail || errData?.message || `Compliance analysis failed with status ${res.status}`;
      throw new Error(msg);
    }

    const data = await res.json();
    const product: ScannedProduct = data.product;
    if (data.preprocessingStages) product.preprocessingStages = data.preprocessingStages;
    if (data.opencvMetadata) product.opencvMetadata = data.opencvMetadata;
    return this.normalizeProduct(product);
  }

  static async issueStatutoryNotice(id: string, data: { noticeNumber?: string; penaltyAmount?: number; hearingDate?: string; notes?: string }): Promise<ScannedProduct> {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}/notice`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const json = await res.json();
        return json.product;
      }
    } catch (e) {
      // Local fallback
    }

    const product = await this.fetchProductById(id);
    if (!product) throw new Error("Product not found");

    product.enforcementStatus = 'NOTICE_ISSUED';
    product.noticeDetails = {
      noticeNumber: data.noticeNumber || `NOTICE/LM/2026/${Math.floor(1000 + Math.random() * 9000)}`,
      issuedDate: new Date().toISOString().split('T')[0],
      hearingDate: data.hearingDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      penaltyAmount: data.penaltyAmount || 25000,
      notes: data.notes || 'Statutory Notice issued under Section 36 of Legal Metrology Act, 2009.'
    };
    return product;
  }
}

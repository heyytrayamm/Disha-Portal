import React, { useState, useRef, useEffect } from 'react';
import type { ScannedProduct } from '../types/metrology';
import { generateInitialSampleProducts } from '../services/sampleDataService';
import { ApiService } from '../services/api';
import { getProductCanonicalStatus } from '../services/complianceStatusHelper';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct?: (product: ScannedProduct) => void;
  onScanComplete?: (payload: {
    imageUrl: string;
    fileName: string;
    isImported: boolean;
    pdpAreaCm2: number;
  }) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  onScanComplete
}) => {
  const [activeMode, setActiveMode] = useState<'IDLE' | 'CAMERA' | 'PREVIEW' | 'ANALYZING'>('IDLE');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleProducts = generateInitialSampleProducts();

  // Stop camera when modal is closed or component unmounts
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setActiveMode('IDLE');
      setCapturedImageDataUrl(null);
      setSelectedFile(null);
      setCameraError(null);
      setAnalysisError(null);
      setPipelineStep(0);
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Open real webcam using navigator.mediaDevices.getUserMedia()
  const handleOpenCamera = async () => {
    stopCamera();
    setCameraError(null);
    setSelectedFile(null);
    setCapturedImageDataUrl(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam access is not supported by your browser or environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      setCameraStream(stream);
      setActiveMode('CAMERA');

      // Bind stream to video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn('Video playback error:', e));
        }
      }, 100);

    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(err.message || 'Could not access camera. Please check permissions.');
      setActiveMode('IDLE');
    }
  };

  // Capture Photo from live webcam feed
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedImageDataUrl(dataUrl);

      // Stop camera stream after capture
      stopCamera();
      setActiveMode('PREVIEW');
    }
  };

  // Handle normal file upload picker
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImageDataUrl(reader.result as string);
      setActiveMode('PREVIEW');
    };
    reader.readAsDataURL(file);
  };

  // Run full analysis on captured photo or uploaded image file
  const handleRunAnalysis = async () => {
    if (!capturedImageDataUrl && !selectedFile) return;

    stopCamera();
    setAnalysisError(null);
    setActiveMode('ANALYZING');
    setPipelineStep(1);

    // Visual step progress simulation
    const t2 = setTimeout(() => setPipelineStep(2), 700);
    const t3 = setTimeout(() => setPipelineStep(3), 1400);
    const t4 = setTimeout(() => setPipelineStep(4), 2100);
    const t5 = setTimeout(() => setPipelineStep(5), 2800);
    const t6 = setTimeout(() => setPipelineStep(6), 3500);

    try {
      let productResult: ScannedProduct | null = null;

      if (selectedFile) {
        // Upload image file to FastAPI backend
        productResult = await ApiService.uploadImageFile(selectedFile);
      } else if (capturedImageDataUrl) {
        // Base64 camera photo scan
        productResult = await ApiService.scanImage({
          imageUrl: capturedImageDataUrl,
          fileName: `Webcam_Label_Capture_${Date.now()}.jpg`,
          isImported: false,
          pdpAreaCm2: 180
        });
      }

      if (!productResult) {
        throw new Error("No compliance analysis result was received from the server.");
      }

      // Preserve the CURRENT uploaded image reference for immediate and infallible rendering
      const currentUploadRef = capturedImageDataUrl || (selectedFile ? URL.createObjectURL(selectedFile) : '');
      if (currentUploadRef) {
        productResult.sourceImageUrl = currentUploadRef;
        if (!productResult.imageUrl || productResult.imageUrl === 'N/A') {
          productResult.imageUrl = currentUploadRef;
        }
      }

      // Finish analysis cleanly with real backend results
      setTimeout(() => {
        if (onSelectProduct) {
          onSelectProduct(productResult!);
        } else if (onScanComplete && (capturedImageDataUrl || selectedFile)) {
          onScanComplete({
            imageUrl: productResult!.imageUrl || currentUploadRef || '',
            fileName: selectedFile?.name || 'Scanned_Label.jpg',
            isImported: false,
            pdpAreaCm2: 180
          });
        }
        onClose();
        setActiveMode('IDLE');
      }, 500);

    } catch (err: any) {
      console.error('Scan analysis error:', err);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      setAnalysisError(err?.message || 'Unable to complete compliance analysis. Please ensure backend server is running.');
      setActiveMode('PREVIEW');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = () => {
          setCapturedImageDataUrl(reader.result as string);
          setActiveMode('PREVIEW');
        };
        reader.readAsDataURL(file);
      }
    }
  };

  if (!isOpen) return null;

  const pipelineSteps = [
    { step: 1, label: 'Image Quality Check', sub: 'Resolution and lighting validated.' },
    { step: 2, label: 'OCR Extraction', sub: 'Text layers successfully separated and digitized.' },
    { step: 3, label: 'Label Info Detection', sub: 'Nutritional facts and ingredients mapped.' },
    { step: 4, label: 'Rule Matching', sub: 'Comparing extracted data against FSSAI guidelines...' },
    { step: 5, label: 'Compliance Assessment', sub: 'Pending rule evaluation.' },
    { step: 6, label: 'Score Calculation', sub: 'Pending assessment completion.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-surface-container-lowest border border-border-subtle w-full max-w-4xl rounded-xl shadow-lg overflow-hidden relative text-text-main font-body-md max-h-[90vh] overflow-y-auto">
        
        {/* Hidden Canvas for Frame Capturing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden Native File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Modal Header */}
        <div className="px-gutter py-md bg-surface border-b border-border-subtle flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">document_scanner</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md font-bold text-primary">Scan Product Label</h3>
              <p className="font-label-sm text-label-sm text-text-muted">Capture or upload a clear image of the product label</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-primary transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-gutter">
          
          {/* ═══ CAMERA LIVE MODE ═══ */}
          {activeMode === 'CAMERA' && (
            <div className="space-y-md">
              <div className="relative bg-slate-950 rounded-xl overflow-hidden min-h-[320px] flex items-center justify-center border border-border-subtle">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-h-[380px] object-contain"
                />
                
                {/* Live Scanning Reticle Overlay */}
                <div className="absolute inset-8 border-2 border-dashed border-primary-fixed rounded-lg pointer-events-none flex items-center justify-center">
                  <div className="scan-line" />
                  <p className="text-white text-xs font-label-md bg-primary/80 px-3 py-1 rounded-full backdrop-blur-xs">
                    Align Packaging Label inside Frame
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setActiveMode('IDLE');
                  }}
                  className="px-md py-sm rounded border border-border-subtle bg-surface text-secondary font-label-md text-label-md hover:bg-surface-container-low transition-colors flex items-center gap-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  <span>Cancel</span>
                </button>

                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="px-lg py-sm rounded bg-status-pass text-white font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-xs shadow-md font-bold cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                  <span>Capture Photo</span>
                </button>
              </div>
            </div>
          )}

          {/* ═══ CAPTURED PREVIEW MODE ═══ */}
          {activeMode === 'PREVIEW' && capturedImageDataUrl && (
            <div className="space-y-md">
              <div className="text-center">
                <h4 className="font-headline-md text-headline-md font-semibold text-text-main">Preview Packaging Label Image</h4>
                <p className="font-label-sm text-label-sm text-text-muted mt-1">Verify that all statutory text declarations are clear and readable</p>
              </div>

              {analysisError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <span className="material-symbols-outlined text-[20px] text-red-600 shrink-0">error</span>
                  <div>
                    <p className="font-semibold">Analysis Failed</p>
                    <p>{analysisError}</p>
                  </div>
                </div>
              )}

              <div className="bg-surface-container-low rounded-xl p-3 border border-border-subtle text-center">
                <img
                  src={capturedImageDataUrl}
                  alt="Captured Packaging Label"
                  className="max-h-[300px] mx-auto rounded border border-border-subtle object-contain"
                />
              </div>

              <div className="flex items-center justify-between pt-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCapturedImageDataUrl(null);
                    setSelectedFile(null);
                    handleOpenCamera();
                  }}
                  className="px-md py-sm rounded border border-border-subtle bg-surface text-secondary font-label-md text-label-md hover:bg-surface-container-low transition-colors flex items-center gap-xs font-semibold cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  <span>Retake Photo</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  className="px-lg py-sm rounded bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-colors flex items-center gap-xs shadow-md font-bold cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">analytics</span>
                  <span>Analyze Label Compliance</span>
                </button>
              </div>
            </div>
          )}

          {/* ═══ ANALYZING STEP PROGRESS (Stitch: analyzing_label..._disha) ═══ */}
          {activeMode === 'ANALYZING' && (
            <div className="flex flex-col items-center gap-xl py-md">
              <div className="text-center space-y-sm">
                <h1 className="font-headline-xl text-headline-xl text-primary">Processing Label Data</h1>
                <p className="font-body-lg text-body-lg text-text-muted flex items-center justify-center gap-xs">
                  Analyzing product label for regulatory compliance
                  <span className="flex">
                    <span className="loading-dot">.</span><span className="loading-dot">.</span><span className="loading-dot">.</span>
                  </span>
                </p>
              </div>

              <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-lg items-start">
                {/* Left: Visualization Canvas */}
                <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-md flex flex-col shadow-sm relative overflow-hidden h-[350px]">
                  {capturedImageDataUrl && (
                    <div className="absolute inset-0 z-0 opacity-20 filter blur-sm">
                      <div className="bg-cover bg-center w-full h-full" style={{ backgroundImage: `url('${capturedImageDataUrl}')` }} />
                    </div>
                  )}
                  <div className="relative z-10 flex-grow flex items-center justify-center">
                    <div className="relative w-56 h-56 border-2 border-primary-container/30 rounded-lg overflow-hidden bg-surface-container-lowest/80 backdrop-blur-md">
                      {/* Abstract label representation */}
                      <div className="absolute inset-4 border border-border-subtle opacity-50 flex flex-col gap-sm p-sm">
                        <div className="w-3/4 h-4 bg-outline-variant rounded" />
                        <div className="w-1/2 h-3 bg-outline-variant rounded" />
                        <div className="w-full h-16 bg-surface-variant rounded mt-sm" />
                        <div className="flex gap-xs mt-auto">
                          <div className="w-8 h-8 bg-surface-variant rounded-full" />
                          <div className="w-8 h-8 bg-surface-variant rounded-full" />
                        </div>
                      </div>
                      <div className="scan-line" />
                      {/* Focus corners */}
                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary-container" />
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary-container" />
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary-container" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary-container" />
                    </div>
                  </div>
                  <div className="relative z-10 mt-auto bg-surface-container-lowest border border-border-subtle rounded-lg p-sm flex items-center justify-between">
                    <div className="flex items-center gap-sm">
                      <span className="material-symbols-outlined text-primary-container animate-spin" style={{ animationDuration: '3s' }}>settings</span>
                      <span className="font-label-md text-label-md text-text-muted uppercase">Engine Status</span>
                    </div>
                    <span className="font-label-md text-label-md text-primary-container bg-secondary-container px-2 py-1 rounded">Active</span>
                  </div>
                </div>

                {/* Right: Pipeline Progress */}
                <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-lg flex flex-col shadow-sm">
                  <h2 className="font-headline-md text-headline-md text-text-main border-b border-border-subtle pb-sm mb-md">Audit Pipeline Status</h2>
                  <div className="flex flex-col gap-md relative">
                    {/* Vertical tracking line */}
                    <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-border-subtle z-0" />

                    {pipelineSteps.map((item) => {
                      const isDone = pipelineStep > item.step;
                      const isActive = pipelineStep === item.step;
                      const isPending = pipelineStep < item.step;

                      return (
                        <div key={item.step} className={`flex items-start gap-md relative z-10 ${
                          isActive ? 'bg-surface-container-low p-sm -ml-sm rounded-lg border border-border-subtle' : ''
                        } ${isPending ? 'opacity-50' : ''}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ring-4 ring-surface-container-lowest ${
                            isDone ? 'bg-status-pass text-on-primary' :
                            isActive ? 'bg-primary-container text-on-primary' :
                            'bg-surface-variant text-text-muted border border-border-subtle'
                          }`}>
                            {isDone ? (
                              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                            ) : isActive ? (
                              <span className="material-symbols-outlined text-[16px] animate-spin" style={{ animationDuration: '2s' }}>sync</span>
                            ) : (
                              <span className="font-label-md text-label-md">{item.step}</span>
                            )}
                          </div>
                          <div className="flex-grow">
                            <h3 className={`font-label-md text-label-md ${isDone ? 'text-text-main' : isActive ? 'text-primary-container' : 'text-text-muted'}`}>
                              {item.label}
                            </h3>
                            <p className={`font-body-md text-body-md mt-xs ${isActive ? 'text-text-main' : 'text-text-muted'}`}>
                              {item.sub}
                            </p>
                            {isActive && (
                              <div className="w-full bg-surface-variant h-1 mt-sm rounded-full overflow-hidden">
                                <div className="bg-primary-container h-full w-2/3 rounded-full animate-pulse" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                onClick={() => { onClose(); setActiveMode('IDLE'); }}
                className="bg-surface-container-lowest border border-border-subtle text-primary-container px-lg py-sm rounded-md font-label-md text-label-md hover:bg-surface-container-low transition-colors flex items-center gap-sm shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                Cancel Audit
              </button>
            </div>
          )}

          {/* ═══ IDLE MODE (Stitch: scan_product_disha) ═══ */}
          {activeMode === 'IDLE' && (
            <div className="space-y-lg">
              {cameraError && (
                <div className="p-md rounded bg-error-container text-on-error-container border border-error/30 text-body-md flex items-center gap-sm">
                  <span className="material-symbols-outlined text-[20px]">error</span>
                  <span>{cameraError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
                {/* Upload Area (Main Column) */}
                <div className="lg:col-span-2 flex flex-col gap-md">
                  {/* Drag & Drop Zone */}
                  <div
                    className="flex flex-col items-center justify-center p-xl border-2 border-dashed border-border-subtle rounded-xl bg-surface-container-lowest min-h-[300px] cursor-pointer transition-all hover:border-primary hover:bg-secondary-container/20"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="h-16 w-16 bg-primary-container text-on-primary rounded-full flex items-center justify-center mb-md">
                      <span className="material-symbols-outlined text-[32px]">upload_file</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md mb-xs">Drag and drop label image here</h3>
                    <p className="font-body-md text-body-md text-text-muted mb-lg">Supports JPG, PNG, WebP (Max 10MB)</p>
                    <div className="flex flex-wrap gap-md justify-center w-full" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={handleOpenCamera}
                        className="flex items-center justify-center gap-xs px-lg py-sm bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                        Take Photo
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-xs px-lg py-sm bg-surface-container-lowest border border-border-subtle text-primary rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">image</span>
                        Upload Image
                      </button>
                    </div>
                  </div>

                  {/* Test Samples */}
                  <div className="border-t border-border-subtle pt-md">
                    <h4 className="font-label-md text-label-md text-text-muted uppercase tracking-wider mb-sm">
                      Test Samples
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
                      {sampleProducts.map((sample) => {
                        const sampleStatus = getProductCanonicalStatus(sample);
                        return (
                          <div
                            key={sample.id}
                            onClick={() => {
                              if (onSelectProduct) onSelectProduct(sample);
                              onClose();
                            }}
                            className="p-sm rounded border border-border-subtle bg-surface-container-lowest hover:border-primary hover:bg-surface cursor-pointer transition-all flex items-start gap-sm group"
                          >
                            <img
                              src={sample.imageUrl}
                              alt={sample.productName}
                              className="w-10 h-12 object-cover rounded border border-border-subtle shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-body-md text-body-md font-semibold text-text-main truncate group-hover:text-primary">
                                  {sample.productName}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold shrink-0 ${
                                  sampleStatus === 'PASS' 
                                    ? 'bg-status-pass/10 text-status-pass' 
                                    : sampleStatus === 'REVIEW'
                                    ? 'bg-status-review/10 text-status-review'
                                    : 'bg-status-fail/10 text-status-fail'
                                }`}>
                                  {sampleStatus}
                                </span>
                              </div>
                              <p className="text-xs text-text-muted truncate mt-0.5">{sample.brandName} • {sample.category}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Guidance Column */}
                <div className="lg:col-span-1">
                  <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-md h-full">
                    <h3 className="font-headline-md text-headline-md mb-md flex items-center gap-xs text-primary">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>rule</span>
                      Scanning Guidelines
                    </h3>
                    <ul className="flex flex-col gap-sm">
                      {[
                        { title: 'Ensure Proper Framing', desc: 'The entire label must be visible within the frame.' },
                        { title: 'High Resolution', desc: 'Text and barcodes must be legible and in focus.' },
                        { title: 'Avoid Glare & Shadows', desc: 'Ensure even lighting across the label surface.' },
                        { title: 'Capture All Sides', desc: 'If information spans multiple panels, upload multiple images.' },
                      ].map((g) => (
                        <li key={g.title} className="flex items-start gap-sm p-sm rounded-lg hover:bg-surface-container-low transition-colors border border-transparent">
                          <span className="material-symbols-outlined text-status-pass" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          <div>
                            <p className="font-label-md text-label-md text-text-main mb-xs">{g.title}</p>
                            <p className="font-body-md text-body-md text-text-muted">{g.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-lg p-sm bg-primary-fixed text-primary rounded-lg flex items-start gap-sm border border-primary-fixed-dim">
                      <span className="material-symbols-outlined">lightbulb</span>
                      <p className="font-label-sm text-label-sm">High-quality scans ensure accurate OCR and faster compliance verification.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

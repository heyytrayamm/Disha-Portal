import React, { useState, useRef, useEffect } from 'react';
import type { ScannedProduct } from '../types/metrology';
import { ApiService } from '../services/api';

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

  // Open webcam
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

  // Capture Photo from webcam
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

      stopCamera();
      setActiveMode('PREVIEW');
    }
  };

  // File upload picker
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

  // Run full compliance analysis
  const handleRunAnalysis = async () => {
    if (!capturedImageDataUrl && !selectedFile) return;

    stopCamera();
    setAnalysisError(null);
    setActiveMode('ANALYZING');
    setPipelineStep(1);

    const t2 = setTimeout(() => setPipelineStep(2), 600);
    const t3 = setTimeout(() => setPipelineStep(3), 1200);
    const t4 = setTimeout(() => setPipelineStep(4), 1800);
    const t5 = setTimeout(() => setPipelineStep(5), 2400);
    const t6 = setTimeout(() => setPipelineStep(6), 3000);

    try {
      let productResult: ScannedProduct | null = null;

      if (selectedFile) {
        productResult = await ApiService.uploadImageFile(selectedFile);
      } else if (capturedImageDataUrl) {
        productResult = await ApiService.scanImage({
          imageUrl: capturedImageDataUrl,
          fileName: `Webcam_Label_Capture_${Date.now()}.jpg`,
          isImported: false,
          pdpAreaCm2: 180
        });
      }

      if (!productResult || typeof productResult !== 'object' || !(productResult.id || productResult.inspection_id) || !(productResult.overallStatus || productResult.status)) {
        throw new Error("Invalid analysis response received from compliance server.");
      }

      const currentUploadRef = capturedImageDataUrl || (selectedFile ? URL.createObjectURL(selectedFile) : '');
      if (!productResult.sourceImageUrl || productResult.sourceImageUrl === 'N/A') {
        productResult.sourceImageUrl = currentUploadRef;
      }
      if (!productResult.imageUrl || productResult.imageUrl === 'N/A') {
        productResult.imageUrl = currentUploadRef;
      }

      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);

      if (onSelectProduct) {
        onSelectProduct(productResult);
      } else if (onScanComplete && (capturedImageDataUrl || selectedFile)) {
        onScanComplete({
          imageUrl: productResult.imageUrl || currentUploadRef || '',
          fileName: selectedFile?.name || 'Scanned_Label.jpg',
          isImported: false,
          pdpAreaCm2: 180
        });
      }
      onClose();
      setActiveMode('IDLE');

    } catch (err: any) {
      console.error('Scan analysis error:', err);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      setAnalysisError(err?.message || 'Unable to complete compliance analysis. Please check server connectivity.');
      setActiveMode('PREVIEW');
    }
  };

  // Drag and drop
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
    { step: 2, label: 'OCR Extraction', sub: 'Text layers separated and digitized.' },
    { step: 3, label: 'Label Info Detection', sub: 'MRP, date, net quantity, packer identified.' },
    { step: 4, label: 'Rule Matching', sub: 'Evaluating against Legal Metrology Rules, 2011...' },
    { step: 5, label: 'Compliance Assessment', sub: 'Statutory verdict calculation...' },
    { step: 6, label: 'Score Calculation', sub: 'Finalizing audit index...' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#FFFFFF] border border-[#E2DFD8] rounded-xs shadow-2xl w-full max-w-3xl overflow-hidden relative text-[#141413] max-h-[90vh] flex flex-col animate-slide-down">
        
        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#E2DFD8] flex items-center justify-between bg-[#FAF9F6]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xs bg-[#141413] text-[#FFFFFF] flex items-center justify-center font-bold text-xs">
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="section-tag">OPTICAL ACQUISITION</span>
                <span className="text-[#CCC9BF]">&bull;</span>
                <span className="tech-tag">PACKAGE SCAN</span>
              </div>
              <h3 className="text-sm font-bold text-[#141413]">Scan Product Label</h3>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 text-[#6E6D67] hover:text-[#141413] rounded-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1">
          
          {/* ═══ LIVE CAMERA MODE ═══ */}
          {activeMode === 'CAMERA' && (
            <div className="space-y-4">
              <div className="evidence-viewport relative bg-[#000000] rounded-xs overflow-hidden min-h-[340px] flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-h-[380px] object-contain"
                />

                {/* Evidence Corner Brackets */}
                <div className="corner-bracket corner-bracket-tl !border-white" />
                <div className="corner-bracket corner-bracket-tr !border-white" />
                <div className="corner-bracket corner-bracket-bl !border-white" />
                <div className="corner-bracket corner-bracket-br !border-white" />

                <div className="scan-line" />

                <div className="absolute top-3 left-3 bg-black/70 text-white text-[10px] font-mono px-2 py-0.5 rounded-xs">
                  OPTICAL FEED: LIVE
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => { stopCamera(); setActiveMode('IDLE'); }}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCapturePhoto}
                  className="btn-accent text-xs font-semibold px-6"
                >
                  <span className="material-symbols-outlined text-[18px]">camera</span>
                  <span>Capture Photo</span>
                </button>
              </div>
            </div>
          )}

          {/* ═══ PREVIEW MODE ═══ */}
          {activeMode === 'PREVIEW' && capturedImageDataUrl && (
            <div className="space-y-4">
              {analysisError && (
                <div className="p-3 bg-[#FDE8E6] border border-[#F8B4AF] rounded-xs text-xs text-[#C5281B] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{analysisError}</span>
                </div>
              )}

              <div className="relative border border-[#D5D2C8] rounded-xs overflow-hidden max-h-[380px] bg-[#FAF9F6] flex items-center justify-center p-2">
                <img
                  src={capturedImageDataUrl}
                  alt="Captured Preview"
                  className="max-h-[360px] object-contain rounded-xs"
                />
                <div className="corner-bracket corner-bracket-tl" />
                <div className="corner-bracket corner-bracket-tr" />
                <div className="corner-bracket corner-bracket-bl" />
                <div className="corner-bracket corner-bracket-br" />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-xs text-[#6E6D67] font-mono">
                  {selectedFile ? `FILE: ${selectedFile.name}` : 'CAMERA FRAME CAPTURED'}
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setCapturedImageDataUrl(null);
                      setSelectedFile(null);
                      setActiveMode('IDLE');
                    }}
                    className="btn-secondary text-xs flex-1 sm:flex-none"
                  >
                    Retake / Re-upload
                  </button>
                  <button
                    onClick={handleRunAnalysis}
                    className="btn-primary text-xs font-semibold flex-1 sm:flex-none px-5"
                  >
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Run Verification</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ ANALYZING PIPELINE MODE ═══ */}
          {activeMode === 'ANALYZING' && (
            <div className="py-6 space-y-6 max-w-lg mx-auto">
              <div className="text-center space-y-1">
                <span className="section-tag">OCR & LEGAL PIPELINE</span>
                <h3 className="text-lg font-bold text-[#141413]">
                  Evaluating Statutory Declarations
                </h3>
                <p className="text-xs text-[#6E6D67]">
                  Extracting label text layers and mapping to Legal Metrology Rule 6 specifications.
                </p>
              </div>

              {/* Steps Progress Checklist */}
              <div className="disha-card p-4 divide-y divide-[#ECE9E2]">
                {pipelineSteps.map((item) => {
                  const isDone = pipelineStep > item.step;
                  const isActive = pipelineStep === item.step;
                  return (
                    <div key={item.step} className="py-2.5 flex items-start gap-3 text-xs">
                      <span className={`w-5 h-5 rounded-xs flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5 ${
                        isDone ? 'bg-[#EBF7EE] text-[#1B7F43]' :
                        isActive ? 'bg-[#141413] text-[#FFFFFF]' :
                        'bg-[#F4F2EB] text-[#8F8E87]'
                      }`}>
                        {isDone ? '✓' : item.step}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${isActive ? 'text-[#141413]' : isDone ? 'text-[#141413]' : 'text-[#8F8E87]'}`}>
                          {item.label}
                        </p>
                        <p className="text-[11px] text-[#8F8E87] mt-0.5">{item.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-center">
                <button
                  onClick={() => { onClose(); setActiveMode('IDLE'); }}
                  className="btn-secondary text-xs"
                >
                  Cancel Inspection
                </button>
              </div>
            </div>
          )}

          {/* ═══ IDLE MODE ═══ */}
          {activeMode === 'IDLE' && (
            <div className="space-y-5">
              {cameraError && (
                <div className="p-3 bg-[#FDE8E6] border border-[#F8B4AF] rounded-xs text-xs text-[#C5281B] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{cameraError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* Drag & Drop Box (8 cols) */}
                <div className="lg:col-span-8">
                  <div
                    className="border-2 border-dashed border-[#D5D2C8] rounded-xs bg-[#FAF9F6] p-8 min-h-[280px] flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#D4381D] hover:bg-[#FAF5F4] transition-all"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-12 h-12 rounded-full border border-[#D5D2C8] bg-[#FFFFFF] flex items-center justify-center text-[#D4381D] mb-3">
                      <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                    </div>
                    <h4 className="text-sm font-bold text-[#141413]">
                      Drag & Drop Packaging Label Image
                    </h4>
                    <p className="text-xs text-[#6E6D67] mt-1 mb-4">
                      Supports high-resolution JPG, PNG, WebP (Max 10MB)
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={handleOpenCamera}
                        className="btn-accent text-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                        <span>Use Camera</span>
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary text-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">folder_open</span>
                        <span>Browse File</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Statutory Guidelines (4 cols) */}
                <div className="lg:col-span-4">
                  <div className="disha-card p-4 h-full flex flex-col justify-between">
                    <div>
                      <span className="section-tag">GUIDELINES</span>
                      <h4 className="text-xs font-bold text-[#141413] mt-0.5 mb-2.5">
                        Inspection Quality Tips
                      </h4>

                      <ul className="space-y-2 text-xs text-[#2D2C28]">
                        {[
                          { title: 'Clear Illumination', desc: 'Avoid heavy reflections and glare on shiny pouches.' },
                          { title: 'Full Display Panel', desc: 'Capture the complete Principal Display Panel (PDP).' },
                          { title: 'Orthogonal Angle', desc: 'Hold camera parallel to label surface to minimize skew.' }
                        ].map((g, idx) => (
                          <li key={idx} className="p-2 bg-[#FAF9F6] border border-[#E2DFD8] rounded-xs">
                            <span className="font-semibold text-[#141413] block">{g.title}</span>
                            <span className="text-[11px] text-[#6E6D67]">{g.desc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-3 pt-2 text-[10px] text-[#8F8E87] border-t border-[#E2DFD8] font-mono">
                      LEGAL METROLOGY ACT 2009 &bull; S.36
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#E2DFD8] bg-[#FAF9F6] flex justify-end">
          <button
            onClick={onClose}
            className="btn-secondary text-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default ScannerModal;

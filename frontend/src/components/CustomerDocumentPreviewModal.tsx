import React, { useState, useEffect } from 'react';
import {
  X,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Printer,
  Sparkles,
  Layers,
  Palette
} from 'lucide-react';

export interface CustomerPreviewFile {
  id: string;
  file: File;
  previewUrl: string | null;
  isImage: boolean;
}

interface CustomerDocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: CustomerPreviewFile[];
  initialIndex?: number;
  printSettings: {
    paperSize: string;
    colorMode: 'BW' | 'COLOR';
    isDuplex: boolean;
    copies: number;
    estimatedPrice?: string;
  };
  onColorModeChange?: (mode: 'BW' | 'COLOR') => void;
}

export const CustomerDocumentPreviewModal: React.FC<CustomerDocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  files,
  initialIndex = 0,
  printSettings,
  onColorModeChange
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [simulateBw, setSimulateBw] = useState(printSettings.colorMode === 'BW');
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});

  // Sync index when initialIndex changes
  useEffect(() => {
    setCurrentIndex(Math.max(0, Math.min(initialIndex, files.length - 1)));
  }, [initialIndex, files.length]);

  // Sync B&W simulation with colorMode setting
  useEffect(() => {
    setSimulateBw(printSettings.colorMode === 'BW');
  }, [printSettings.colorMode]);

  // Create and memoize object URLs for PDFs and images
  useEffect(() => {
    if (!isOpen) return;

    const urls: Record<string, string> = {};
    files.forEach((f) => {
      if (f.previewUrl) {
        urls[f.id] = f.previewUrl;
      } else {
        urls[f.id] = URL.createObjectURL(f.file);
      }
    });
    setBlobUrls(urls);

    return () => {
      // Cleanup URLs created specifically here
      files.forEach((f) => {
        if (!f.previewUrl && urls[f.id]) {
          URL.revokeObjectURL(urls[f.id]);
        }
      });
    };
  }, [isOpen, files]);

  if (!isOpen || files.length === 0) return null;

  const currentFile = files[currentIndex] || files[0];
  const fileUrl = blobUrls[currentFile.id] || currentFile.previewUrl;
  const isImage = currentFile.isImage || currentFile.file.type.startsWith('image/');
  const isPdf = currentFile.file.type.includes('pdf');

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setZoomLevel(1);
    }
  };

  const handleNext = () => {
    if (currentIndex < files.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setZoomLevel(1);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-navy-950/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[92vh] max-h-[850px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-navy-950 text-white shrink-0 border-b border-navy-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-600/30 border border-brand-500/40 text-brand-300 flex items-center justify-center shrink-0">
              {isImage ? <Eye className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-300 bg-brand-950/60 px-2 py-0.5 rounded-full border border-brand-700/50">
                  Document Preview ({currentIndex + 1} of {files.length})
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {(currentFile.file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md mt-0.5" title={currentFile.file.name}>
                {currentFile.file.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Open raw document in new window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Simulation Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          {/* Zoom controls for photos */}
          {isImage ? (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-700 px-1.5 min-w-[45px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3.0}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-navy-950 transition ml-0.5"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 font-medium text-xs">
              <FileText className="w-4 h-4 text-brand-600" />
              <span>Standard Multi-Page PDF Document Viewer</span>
            </div>
          )}

          {/* B&W Xerox Print Simulation Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextState = !simulateBw;
                setSimulateBw(nextState);
                if (onColorModeChange) {
                  onColorModeChange(nextState ? 'BW' : 'COLOR');
                }
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition shadow-2xs ${
                simulateBw
                  ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-brand-400" />
              <span>{simulateBw ? 'Simulating B&W Xerox Print' : 'Color Mode Active'}</span>
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="flex-1 bg-slate-900/5 relative overflow-auto p-4 flex items-center justify-center select-none">
          {/* Navigation Arrows for multi-file */}
          {files.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-navy-950 shadow-md flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition"
                title="Previous Document"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex === files.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-navy-950 shadow-md flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition"
                title="Next Document"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {isImage ? (
            <div className="max-w-full max-h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={fileUrl || ''}
                alt={currentFile.file.name}
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                  filter: simulateBw ? 'grayscale(100%) contrast(105%)' : 'none',
                }}
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-lg border border-slate-200 bg-white"
              />
            </div>
          ) : isPdf && fileUrl ? (
            <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-300 bg-white shadow-md">
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                title={currentFile.file.name}
                className="w-full h-full border-none"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-sm">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-navy-950">{currentFile.file.name}</p>
              <p className="text-[11px] text-slate-500 mt-1">Preview format requires full download</p>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-xs hover:bg-brand-500 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Document</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Bottom Specs & Action Strip */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-500">Printing As:</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-extrabold text-navy-900 border border-slate-200">
              {printSettings.paperSize}
            </span>
            <span className={`px-2.5 py-1 rounded-lg font-extrabold border ${
              printSettings.colorMode === 'COLOR'
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-slate-100 text-slate-900 border-slate-200'
            }`}>
              {printSettings.colorMode === 'COLOR' ? 'Color' : 'Black & White'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-extrabold text-navy-900 border border-slate-200">
              {printSettings.isDuplex ? 'Double-Sided' : 'Single-Sided'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-extrabold text-navy-900 border border-slate-200">
              {printSettings.copies} {printSettings.copies === 1 ? 'Copy' : 'Copies'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-extrabold text-xs bg-navy-950 hover:bg-brand-600 text-white shadow-xs transition"
            >
              Looks Good, Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

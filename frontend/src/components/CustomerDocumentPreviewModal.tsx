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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[92vh] max-h-[850px] bg-gradient-to-b from-[#142217] via-[#0f1a11] to-[#0a120c] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] border border-[#273d2c] overflow-hidden flex flex-col text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0c140e] text-white shrink-0 border-b border-[#233827]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#bbf451]/15 border border-[#bbf451]/30 text-[#bbf451] flex items-center justify-center shrink-0">
              {isImage ? <Eye className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#bbf451] bg-[#bbf451]/10 px-2 py-0.5 rounded-full border border-[#bbf451]/30">
                  Document Preview ({currentIndex + 1} of {files.length})
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {(currentFile.file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md mt-0.5 font-syne" title={currentFile.file.name}>
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
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#162519] hover:bg-[#203323] text-slate-200 border border-[#273d2c] transition-colors"
                title="Open raw document in new window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Simulation Toolbar */}
        <div className="bg-[#101b12] border-b border-[#233827] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          {/* Zoom controls for photos */}
          {isImage ? (
            <div className="flex items-center gap-1.5 bg-[#162519] border border-[#273d2c] rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                className="p-1 rounded-lg hover:bg-[#203323] text-slate-300 disabled:opacity-30 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-bold text-white px-1.5 min-w-[45px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3.0}
                className="p-1 rounded-lg hover:bg-[#203323] text-slate-300 disabled:opacity-30 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1 rounded-lg hover:bg-[#203323] text-slate-400 hover:text-white transition ml-0.5"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 font-medium text-xs">
              <FileText className="w-4 h-4 text-[#bbf451]" />
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
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition ${
                simulateBw
                  ? 'bg-[#bbf451] text-[#080d09] border-[#bbf451] shadow-[0_0_15px_rgba(187,244,81,0.3)]'
                  : 'bg-[#162519] hover:bg-[#203323] text-slate-300 border-[#273d2c]'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>{simulateBw ? 'Simulating B&W Xerox Print' : 'Color Mode Active'}</span>
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="flex-1 bg-[#080d09] relative overflow-auto p-4 flex items-center justify-center select-none">
          {/* Navigation Arrows for multi-file */}
          {files.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-[#162519]/90 hover:bg-[#223624] text-white border border-[#2e4733] shadow-lg flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none transition"
                title="Previous Document"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex === files.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-[#162519]/90 hover:bg-[#223624] text-white border border-[#2e4733] shadow-lg flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none transition"
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
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-2xl border border-[#273d2c] bg-white"
              />
            </div>
          ) : isPdf && fileUrl ? (
            <div className="w-full h-full flex flex-col rounded-2xl overflow-hidden border border-[#273d2c] bg-[#101b12] shadow-xl">
              <div className="bg-[#142317] border-b border-[#233827] px-3 py-2 flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-medium truncate">
                  <FileText className="w-3.5 h-3.5 text-[#bbf451] shrink-0" />
                  <span>Scroll to review all pages</span>
                </span>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] font-black text-[11px] shadow-sm transition"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Full PDF</span>
                </a>
              </div>
              <div className="flex-1 w-full h-full relative bg-[#0c140e]">
                <object
                  data={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  type="application/pdf"
                  className="w-full h-full border-none"
                >
                  <iframe
                    src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                    title={currentFile.file.name}
                    className="w-full h-full border-none"
                  >
                    <div className="p-6 text-center text-slate-400">
                      <p>Your browser does not support inline PDF viewing.</p>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block px-3 py-1.5 rounded-xl bg-[#bbf451] text-[#080d09] text-xs font-bold"
                      >
                        Download / View PDF
                      </a>
                    </div>
                  </iframe>
                </object>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 bg-[#142217] rounded-2xl border border-[#273d2c] shadow-lg max-w-sm">
              <FileText className="w-12 h-12 text-slate-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-white">{currentFile.file.name}</p>
              <p className="text-[11px] text-slate-400 mt-1">Preview format requires full download</p>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#bbf451] text-[#080d09] text-xs font-black shadow-xs hover:bg-[#cbff5e] transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Document</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Bottom Specs & Action Strip */}
        <div className="px-5 py-3.5 bg-[#0c140e] border-t border-[#233827] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-400">Printing As:</span>
            <span className="px-2.5 py-1 rounded-lg bg-[#162519] font-extrabold text-slate-200 border border-[#273d2c]">
              {printSettings.paperSize}
            </span>
            <span className={`px-2.5 py-1 rounded-lg font-extrabold border ${
              printSettings.colorMode === 'COLOR'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-[#162519] text-slate-200 border-[#273d2c]'
            }`}>
              {printSettings.colorMode === 'COLOR' ? 'Color' : 'Black & White'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#162519] font-extrabold text-slate-200 border border-[#273d2c]">
              {printSettings.isDuplex ? 'Double-Sided' : 'Single-Sided'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#162519] font-extrabold text-slate-200 border border-[#273d2c]">
              {printSettings.copies} {printSettings.copies === 1 ? 'Copy' : 'Copies'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-black text-xs bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] shadow-[0_0_20px_rgba(187,244,81,0.25)] transition active:scale-98"
            >
              Looks Good, Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

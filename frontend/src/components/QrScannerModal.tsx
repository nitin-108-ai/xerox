import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  QrCode,
  Building2,
  ArrowRight,
  Camera,
  Sparkles,
  RefreshCw,
  ImageIcon,
  AlertCircle,
  CheckCircle2,
  Volume2
} from 'lucide-react';
import jsQR from 'jsqr';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scanState, setScanState] = useState<'IDLE' | 'SCANNING' | 'SUCCESS'>('IDLE');
  const [detectedShop, setDetectedShop] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Play crisp scan success beep via Web Audio API
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1); // E6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {}
  };

  // Stop camera tracks
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Handle extracted QR code URL/token
  const handleDecodedData = (rawText: string) => {
    if (!rawText) return;

    let targetSlug = rawText.trim();

    // Check if it's a URL
    if (targetSlug.includes('/shop/')) {
      targetSlug = targetSlug.split('/shop/')[1].split('?')[0].split('#')[0];
    } else if (targetSlug.includes('/s/')) {
      targetSlug = targetSlug.split('/s/')[1].split('?')[0].split('#')[0];
    }

    targetSlug = targetSlug.replace(/^\/+|\/+$/g, '');

    playScanBeep();
    if (navigator.vibrate) {
      try { navigator.vibrate(120); } catch {}
    }

    setScanState('SUCCESS');
    setDetectedShop(targetSlug);

    // Notify owner panel in real-time about counter scan
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('smart_xerox_orders_channel');
        bc.postMessage({ type: 'QR_SCANNED', slug: targetSlug, timestamp: Date.now() });
        bc.close();
      }
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('smart_xerox_qr_scanned', { detail: { slug: targetSlug } }));
    } catch {}

    stopCamera();

    setTimeout(() => {
      onClose();
      navigate(`/shop/${targetSlug}`);
    }, 800);
  };

  // Frame scanning loop
  const scanFrame = async () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const video = videoRef.current;

    // 1. Try Native BarcodeDetector API if supported
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const barcodes = await detector.detect(video);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          handleDecodedData(barcodes[0].rawValue);
          return;
        }
      } catch {}
    }

    // 2. jsQR software fallback
    try {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code && code.data) {
          handleDecodedData(code.data);
          return;
        }
      }
    } catch {}

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // Start real device camera
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    try {
      setCameraError(null);
      stopCamera();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported by your browser or connection. You can pick a verified shop below or upload a QR image.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await videoRef.current.play();
        setCameraActive(true);
        setScanState('SCANNING');
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      console.warn('Real camera stream failed:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Tap "Allow" in your browser address bar, or choose a verified shop below.');
      } else {
        setCameraError('Could not open camera stream. You can select a verified shop below or upload a QR screenshot.');
      }
    }
  };

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setScanState('IDLE');
      setDetectedShop(null);
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const handleToggleFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleSimulateCameraScan = (slug: string) => {
    playScanBeep();
    setScanState('SUCCESS');
    setDetectedShop(slug);
    stopCamera();
    setTimeout(() => {
      onClose();
      navigate(`/shop/${slug}`);
    }, 700);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDecodedData(manualCode.trim());
  };

  // Handle uploaded QR image from gallery
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleDecodedData(code.data);
          } else {
            alert('No valid QR code detected in the selected image. Please try another photo or select a shop below.');
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-navy-950 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-600/30 border border-brand-500/40 text-brand-300 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">Real-Time Camera QR Scanner</h3>
              <p className="text-[10px] text-slate-400">Aim camera at counter poster to open upload portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Real Camera Viewfinder */}
          <div className="relative aspect-4/3 rounded-2xl bg-black border-2 border-slate-800 flex flex-col items-center justify-center text-slate-400 overflow-hidden shadow-inner">
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                cameraActive ? 'opacity-100' : 'opacity-0 absolute'
              }`}
            />

            {/* Success Overlay when QR detected */}
            {scanState === 'SUCCESS' && (
              <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center text-white z-20 animate-in fade-in zoom-in-95 duration-200">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-2 animate-bounce" />
                <span className="text-sm font-black">Shop QR Code Detected!</span>
                <span className="text-xs text-emerald-200 font-mono mt-0.5">{detectedShop}</span>
                <span className="text-[10px] text-emerald-300 mt-2">Connecting to shop counter...</span>
              </div>
            )}

            {/* Viewfinder Target & Laser Scanning Animation */}
            {cameraActive && scanState !== 'SUCCESS' && (
              <div className="absolute inset-6 sm:inset-10 border border-white/30 rounded-2xl pointer-events-none z-10">
                {/* Viewfinder corner guides */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />

                {/* Animated laser line */}
                <div className="absolute inset-x-2 top-0 h-1 bg-brand-400 shadow-[0_0_16px_#38bdf8] animate-[bounce_1.8s_infinite] rounded-full" />
              </div>
            )}

            {/* Camera Fallback / Permission UI */}
            {!cameraActive && scanState !== 'SUCCESS' && (
              <div className="p-6 text-center space-y-3 z-10">
                <Camera className="w-12 h-12 text-slate-500 mx-auto" />
                {cameraError ? (
                  <div className="space-y-1.5 max-w-xs mx-auto">
                    <p className="text-xs text-rose-300 font-medium">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition shadow-xs"
                    >
                      Retry Camera Access
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="w-7 h-7 rounded-full border-2 border-brand-400 border-t-transparent animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-300 font-medium">Starting camera...</p>
                  </div>
                )}
              </div>
            )}

            {/* Camera Controls Overlay */}
            {cameraActive && (
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between z-20 pointer-events-auto">
                <button
                  type="button"
                  onClick={handleToggleFacing}
                  className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1.5 border border-white/20 transition"
                  title="Switch Front / Rear Camera"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Flip Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1.5 border border-white/20 transition"
                  title="Pick photo from gallery"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-brand-300" />
                  <span>Scan Photo</span>
                </button>
              </div>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Quick Select Local Verified Shops */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Verified Counter Demo Shops</span>
              <span className="text-brand-600 text-[11px] font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Tap to connect
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSimulateCameraScan('quickcopy-express')}
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 text-left transition-all group shadow-2xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-navy-900 group-hover:text-brand-600 truncate">
                    1. QuickCopy Express
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">Sector 18 Metro Gate 2</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleSimulateCameraScan('metro-doc-hub')}
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 text-left transition-all group shadow-2xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-navy-900 group-hover:text-brand-600 truncate">
                    2. Metro Document Hub
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">IT Tech Park Floor 1</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 shrink-0" />
              </button>
            </div>
          </div>

          {/* Manual Storefront Code input */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Or enter Shop Slug / Token manually:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. quickcopy-express"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono bg-slate-50"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-navy-950 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                Open Shop
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, QrCode, Building2, ArrowRight, Camera, Sparkles } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState('');
  const [scanState, setScanState] = useState<'IDLE' | 'SCANNING'>('IDLE');

  if (!isOpen) return null;

  const handleSelectShop = (slug: string) => {
    onClose();
    navigate(`/shop/${slug}`);
  };

  const handleSimulateCameraScan = (slug: string) => {
    setScanState('SCANNING');
    setTimeout(() => {
      setScanState('IDLE');
      onClose();
      navigate(`/shop/${slug}`);
    }, 1200);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    let slug = manualCode.trim();
    if (slug.includes('/shop/')) {
      slug = slug.split('/shop/')[1];
    }
    onClose();
    navigate(`/shop/${slug}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-navy-900 text-white">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-semibold">Scan Shop QR Code</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Simulated Camera Viewfinder */}
          <div className="relative aspect-4/3 rounded-xl bg-slate-900 border-2 border-slate-800 flex flex-col items-center justify-center text-slate-400 overflow-hidden shadow-inner">
            {/* Viewfinder corner guides */}
            <div className="absolute inset-8 border border-white/20 rounded-lg pointer-events-none">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-brand-400" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-brand-400" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-brand-400" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-brand-400" />

              {/* Animated laser line */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-brand-400 shadow-[0_0_12px_#0066FF] animate-[bounce_2s_infinite]" />
            </div>

            <Camera className="w-10 h-10 text-slate-500 mb-2" />
            <p className="text-xs text-slate-300 font-medium z-10 text-center px-4">
              Point your phone camera at any Smart Xerox counter QR poster
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {scanState === 'SCANNING' ? 'Decoding QR code...' : 'Or tap a verified local shop below to simulate instant scan'}
            </p>
          </div>

          {/* Quick Select Local Verified Shops */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2.5">
              <span>Verified Counter Demo Shops</span>
              <span className="text-brand-600 text-[11px] font-normal flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Tap to scan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSimulateCameraScan('quickcopy-express')}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 text-left transition-all group"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-navy-900 group-hover:text-brand-600 truncate">
                    QuickCopy Express
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">Sector 18 Metro Gate 2</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleSimulateCameraScan('metro-doc-hub')}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 text-left transition-all group"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-navy-900 group-hover:text-brand-600 truncate">
                    Metro Document Hub
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">IT Tech Park Floor 1</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 shrink-0" />
              </button>
            </div>
          </div>

          {/* Manual Storefront Code input */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Or enter Shop Slug / Token manually:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. quickcopy-express"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-navy-900 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition-colors"
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

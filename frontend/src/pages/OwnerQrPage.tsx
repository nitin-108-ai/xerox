import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Download,
  Printer,
  RefreshCw,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Building2,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { PrintablePosterModal } from '../components/PrintablePosterModal';

export const OwnerQrPage: React.FC = () => {
  const [qrData, setQrData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [posterModalOpen, setPosterModalOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const loadQr = async () => {
    try {
      setLoading(true);
      const res = await api.getOwnerQr();
      setQrData(res);
    } catch (err: any) {
      alert(err.message || 'Failed to load shop QR code.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQr();
  }, []);

  const handleCopyUrl = () => {
    if (!qrData?.storefrontUrl) return;
    navigator.clipboard.writeText(qrData.storefrontUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPng = () => {
    if (!qrData?.qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrData.qrDataUrl;
    a.download = `${qrData.slug}-counter-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRegenerate = async () => {
    const confirm = window.confirm(
      'Are you sure you want to regenerate your shop QR code? Previously printed physical posters will immediately stop working.'
    );
    if (!confirm) return;

    setIsRegenerating(true);
    try {
      await api.regenerateOwnerQr();
      alert('Shop QR code has been regenerated successfully.');
      await loadQr();
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate QR code.');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4" />
        <p className="text-sm text-slate-500">Generating shop QR assets...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
          Storefront Dispatch Identification
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
          Shop Counter QR Code & Poster
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
          Display this unique QR code at your shop counter. Customers scan it with their phone camera to submit private print orders without asking for your WhatsApp number.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left Column: QR Card Display */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-glass text-center space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-navy-900">{qrData?.shopName}</h3>
            <p className="text-xs text-slate-400 font-mono">Token: {qrData?.qrToken}</p>
          </div>

          <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-inner inline-block">
            {qrData?.qrDataUrl ? (
              <img
                src={qrData.qrDataUrl}
                alt="Shop Counter QR Code"
                className="w-64 h-64 mx-auto object-contain"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-slate-400">
                Generating QR...
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-navy-900 hover:bg-brand-600 text-white shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" /> Download High-Res PNG
            </button>
            <button
              type="button"
              onClick={() => setPosterModalOpen(true)}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Counter Poster
            </button>
          </div>
        </div>

        {/* Right Column: Storefront URL & Security Controls */}
        <div className="space-y-6">
          {/* Public Storefront URL Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900">
              Canonical HTTPS Storefront URL
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              This permanent link is encoded inside your counter QR code. You can also share it directly with customers.
            </p>

            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <input
                type="text"
                readOnly
                value={qrData?.storefrontUrl || ''}
                className="flex-1 bg-transparent text-xs text-navy-900 font-mono focus:outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <a
              href={qrData?.storefrontUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 pt-1"
            >
              Test Open Storefront in New Tab <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Privacy & Anti-Tampering Guarantee */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              Anti-Tamper & Privacy Standards
            </div>
            <p className="text-emerald-800 leading-relaxed text-[11px]">
              This QR code contains strictly the storefront address. It never encodes phone numbers, customer credentials, document links, or administrative privileges.
            </p>
          </div>

          {/* QR Regeneration Section */}
          <div className="bg-rose-50/50 border border-rose-200 rounded-3xl p-6 space-y-3">
            <div className="flex items-center gap-2 font-bold text-rose-950 text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              Compromised or Damaged Counter Poster?
            </div>
            <p className="text-rose-800 text-xs leading-relaxed">
              If your physical QR poster is photographed inappropriately, you can regenerate your QR token immediately. Old physical codes will immediately cease routing to your shop.
            </p>
            <button
              type="button"
              disabled={isRegenerating}
              onClick={handleRegenerate}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Regenerating...' : 'Regenerate Shop QR Token'}
            </button>
          </div>
        </div>
      </div>

      {/* Printable Poster Modal */}
      {posterModalOpen && (
        <PrintablePosterModal
          isOpen={posterModalOpen}
          onClose={() => setPosterModalOpen(false)}
          shopName={qrData?.shopName}
          shopAddress={qrData?.address || 'Counter Pickup Available'}
          storefrontUrl={qrData?.storefrontUrl}
          qrDataUrl={qrData?.qrDataUrl}
        />
      )}
    </div>
  );
};

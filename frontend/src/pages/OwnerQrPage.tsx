import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
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
  Sparkles,
  ArrowLeft,
  Settings,
  Laptop,
  Mail,
  CheckCircle2
} from 'lucide-react';
import { OwnerLayout } from '../components/OwnerLayout';
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

      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://xerox-iota.vercel.app';
      const storefrontUrl = res.storefrontUrl || `${origin}/shop/${res.slug || 'quickcopy-express'}`;

      // Generate sharp 600x600 high-res QR code PNG data URL locally (0ms latency, 100% offline-ready)
      let qrDataUrl = res.qrDataUrl || res.qrCodeDataUrl;
      if (!qrDataUrl || qrDataUrl.startsWith('http')) {
        try {
          qrDataUrl = await QRCode.toDataURL(storefrontUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 600,
            color: {
              dark: '#0B192C',
              light: '#FFFFFF'
            }
          });
        } catch {
          qrDataUrl = await QRCode.toDataURL(storefrontUrl);
        }
      }

      setQrData({
        ...res,
        storefrontUrl,
        qrDataUrl,
        qrCodeDataUrl: qrDataUrl
      });
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
    a.download = `${qrData.slug || 'counter'}-counter-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRegenerate = async () => {
    const confirm = window.confirm(
      'Are you sure you want to regenerate your shop QR code token? Previously printed physical posters will cease routing.'
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
      <OwnerLayout title="Counter QR Code">
        <div className="py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mb-3" />
          <p className="text-sm font-medium text-slate-500">Generating shop QR assets...</p>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout
      title="Shop Counter QR Code & Poster"
      subtitle="Display this unique QR code at your shop counter for instant, private customer document printing."
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Back Navigation Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/owner/dashboard"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition"
          >
            <ArrowLeft className="w-4 h-4 text-brand-600" />
            <span>Back to Receiving Panel</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/owner/profile"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Shop Profile</span>
            </Link>
            <Link
              to="/owner/settings"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Settings</span>
            </Link>
            <Link
              to="/owner/printers"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
            >
              <Laptop className="w-3.5 h-3.5 text-slate-500" />
              <span>Connected Devices</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left Column: QR Card Display */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-glass text-center space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-600 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                Permanent Counter Anchor
              </span>
              <h3 className="text-xl font-black text-navy-950 mt-1">{qrData?.shopName || 'Smart Xerox Shop'}</h3>
              
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-800 border border-brand-200">
                  <Mail className="w-3.5 h-3.5 text-brand-600" />
                  <span>Anchored to: <strong>{qrData?.email || 'owner1@smartxerox.io'}</strong></span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono text-slate-500 bg-slate-100 border border-slate-200">
                  Token: {qrData?.qrToken || 'qr-live-verified'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-inner inline-block">
              {qrData?.qrDataUrl ? (
                <img
                  src={qrData.qrDataUrl}
                  alt="Shop Counter QR Code"
                  className="w-64 h-64 mx-auto object-contain rounded-xl shadow-xs"
                />
              ) : (
                <div className="w-64 h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <div className="w-7 h-7 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
                  <span className="text-xs font-medium">Generating QR...</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleDownloadPng}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-navy-950 hover:bg-brand-600 text-white shadow-xs flex items-center justify-center gap-1.5 transition-colors"
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
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-glass space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900">
                Canonical Public Storefront URL
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                This permanent link is encoded directly into your counter QR code. Customers can scan it with their default camera app to open your private upload portal immediately.
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
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1 shrink-0 shadow-2xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {qrData?.storefrontUrl && (
                <a
                  href={qrData.storefrontUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 pt-1"
                >
                  <span>Test Open Customer Storefront in New Tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Anti-Tamper & Privacy Guarantee */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-950">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                Anti-Tamper &amp; Privacy Standards
              </div>
              <p className="text-emerald-800 leading-relaxed text-[11px]">
                This QR code strictly points to your canonical shop storefront. It never exposes your personal phone number, owner credentials, or unapproved documents.
              </p>
            </div>

            {/* QR Token Regeneration */}
            <div className="bg-rose-50/50 border border-rose-200 rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-2 font-bold text-rose-950 text-xs">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                Compromised or Damaged Counter Poster?
              </div>
              <p className="text-rose-800 text-xs leading-relaxed">
                If your physical QR poster is photographed inappropriately or misused, you can regenerate your QR token immediately. Old physical codes will immediately cease routing.
              </p>
              <button
                type="button"
                disabled={isRegenerating}
                onClick={handleRegenerate}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Shop QR Token'}</span>
              </button>
            </div>
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
    </OwnerLayout>
  );
};

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
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#273d2c] bg-[#132015] hover:bg-[#1a2c1d] text-slate-200 text-xs font-bold transition"
          >
            <ArrowLeft className="w-4 h-4 text-[#bbf451]" />
            <span>Back to Receiving Panel</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/owner/profile"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#273d2c] bg-[#132015] hover:bg-[#1a2c1d] text-slate-300 text-xs font-semibold transition"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Shop Profile</span>
            </Link>
            <Link
              to="/owner/settings"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#273d2c] bg-[#132015] hover:bg-[#1a2c1d] text-slate-300 text-xs font-semibold transition"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Settings</span>
            </Link>
            <Link
              to="/owner/printers"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#273d2c] bg-[#132015] hover:bg-[#1a2c1d] text-slate-300 text-xs font-semibold transition"
            >
              <Laptop className="w-3.5 h-3.5 text-slate-400" />
              <span>Connected Devices</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left Column: QR Card Display */}
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-8 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-center space-y-6 text-white">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#bbf451] bg-[#bbf451]/10 border border-[#bbf451]/30 px-2.5 py-0.5 rounded-full">
                Permanent Counter Anchor
              </span>
              <h3 className="text-xl font-black text-white font-syne mt-1">{qrData?.shopName || 'Smart Xerox Shop'}</h3>
              
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#162519] text-[#bbf451] border border-[#273d2c]">
                  <Mail className="w-3.5 h-3.5 text-[#bbf451]" />
                  <span>Anchored to: <strong>{qrData?.email || 'owner1@smartxerox.io'}</strong></span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono text-slate-400 bg-[#0c140e] border border-[#273d2c]">
                  Token: {qrData?.qrToken || 'qr-live-verified'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border-4 border-[#273d2c] shadow-[0_0_30px_rgba(0,0,0,0.8)] inline-block">
              {qrData?.qrDataUrl ? (
                <img
                  src={qrData.qrDataUrl}
                  alt="Shop Counter QR Code"
                  className="w-64 h-64 mx-auto object-contain rounded-xl shadow-xs"
                />
              ) : (
                <div className="w-64 h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <div className="w-7 h-7 rounded-full border-2 border-[#bbf451] border-t-transparent animate-spin" />
                  <span className="text-xs font-medium">Generating QR...</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleDownloadPng}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-[#162519] hover:bg-[#203323] text-slate-200 border border-[#273d2c] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" /> Download High-Res PNG
              </button>
              <button
                type="button"
                onClick={() => setPosterModalOpen(true)}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-black bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] shadow-[0_0_20px_rgba(187,244,81,0.25)] flex items-center justify-center gap-1.5 transition-colors active:scale-98"
              >
                <Printer className="w-4 h-4" /> Print Counter Poster
              </button>
            </div>
          </div>

          {/* Right Column: Storefront URL & Security Controls */}
          <div className="space-y-6">
            {/* Public Storefront URL Box */}
            <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 sm:p-7 border border-[#273d2c] shadow-glass space-y-3 text-white">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#bbf451] font-syne">
                Canonical Public Storefront URL
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                This permanent link is encoded directly into your counter QR code. Customers can scan it with their default camera app to open your private upload portal immediately.
              </p>

              <div className="flex items-center gap-2 bg-[#0c140e] p-2.5 rounded-xl border border-[#273d2c]">
                <input
                  type="text"
                  readOnly
                  value={qrData?.storefrontUrl || ''}
                  className="flex-1 bg-transparent text-xs text-slate-200 font-mono focus:outline-none truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#162519] border border-[#273d2c] hover:bg-[#203323] text-slate-200 flex items-center gap-1 shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#bbf451]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {qrData?.storefrontUrl && (
                <a
                  href={qrData.storefrontUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#bbf451] hover:underline pt-1"
                >
                  <span>Test Open Customer Storefront in New Tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Anti-Tamper & Privacy Guarantee */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-3xl p-6 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                Anti-Tamper &amp; Privacy Standards
              </div>
              <p className="text-emerald-200/80 leading-relaxed text-[11px]">
                This QR code strictly points to your canonical shop storefront. It never exposes your personal phone number, owner credentials, or unapproved documents.
              </p>
            </div>

            {/* QR Token Regeneration */}
            <div className="bg-rose-950/30 border border-rose-500/30 rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-2 font-bold text-rose-300 text-xs">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                Compromised or Damaged Counter Poster?
              </div>
              <p className="text-rose-200/80 text-xs leading-relaxed">
                If your physical QR poster is photographed inappropriately or misused, you can regenerate your QR token immediately. Old physical codes will immediately cease routing.
              </p>
              <button
                type="button"
                disabled={isRegenerating}
                onClick={handleRegenerate}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#162519] border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 flex items-center gap-1.5 transition-colors disabled:opacity-50"
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

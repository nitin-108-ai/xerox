import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Printer,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Plus,
  Minus,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Check
} from 'lucide-react';
import { api } from '../services/api';

export const StorefrontPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [shopData, setShopData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Print settings
  const [file, setFile] = useState<File | null>(null);
  const [paperSize, setPaperSize] = useState<'A4' | 'LEGAL' | 'A3'>('A4');
  const [colorMode, setColorMode] = useState<'BW' | 'COLOR'>('BW');
  const [copies, setCopies] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submitted order state
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function loadShop() {
      if (!slug) return;
      try {
        setLoading(true);
        setError(null);
        const data = await api.getStorefront(slug);
        setShopData(data);
      } catch (err: any) {
        setError(err.message || 'Shop could not be loaded.');
      } finally {
        setLoading(false);
      }
    }

    loadShop();
  }, [slug]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

      if (!validTypes.includes(selected.type)) {
        alert('Please upload a PDF document or JPG/PNG image.');
        return;
      }

      if (selected.size > 50 * 1024 * 1024) {
        alert('File is too large. Maximum size is 50MB.');
        return;
      }

      setFile(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Please choose a document to print.');
      return;
    }

    if (!shopData?.shop?.id) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('shopId', shopData.shop.id);
      formData.append('paperSize', paperSize);
      formData.append('colorMode', colorMode);
      formData.append('isDuplex', 'false');
      formData.append('copies', String(copies));
      formData.append('customerAlias', 'Customer');

      const response = await api.createOrder(formData);
      setSubmittedOrder(response);
    } catch (err: any) {
      alert(err.message || 'Failed to send print request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTrackingLink = () => {
    if (!submittedOrder) return;
    const trackingUrl = `${window.location.origin}/track/${submittedOrder.orderReference}?token=${submittedOrder.orderAccessToken}`;
    navigator.clipboard.writeText(trackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Connecting to shop...</p>
        </div>
      </div>
    );
  }

  if (error || !shopData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-sm w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-navy-950">Shop Not Found</h2>
          <p className="text-xs text-slate-500">{error || 'Please scan the shop QR code again.'}</p>
        </div>
      </div>
    );
  }

  const { shop } = shopData;

  // Confirmation screen when order has been submitted
  if (submittedOrder) {
    const trackingUrl = `/track/${submittedOrder.orderReference}?token=${submittedOrder.orderAccessToken}`;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg max-w-md w-full p-6 sm:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-150">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-200 shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Sent to Shop Counter
            </span>
            <h2 className="text-xl font-black text-navy-950 pt-2">Order Submitted!</h2>
            <p className="text-xs text-slate-500">
              Your document has been sent directly to <strong>{shop.name}</strong>.
            </p>
          </div>

          {/* Reference Box */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Order Reference
            </span>
            <div className="text-2xl font-mono font-black text-navy-950 tracking-wider">
              {submittedOrder.orderReference}
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              Show this reference number to the shopkeeper at the counter.
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => navigate(trackingUrl)}
              className="w-full py-3 rounded-2xl bg-navy-950 hover:bg-brand-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition"
            >
              <ExternalLink className="w-4 h-4" />
              Track Order Live
            </button>

            <button
              onClick={handleCopyTrackingLink}
              className="w-full py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? 'Tracking Link Copied!' : 'Copy Private Tracking Link'}
            </button>

            <button
              onClick={() => {
                setSubmittedOrder(null);
                setFile(null);
                setCopies(1);
              }}
              className="w-full py-2 text-slate-400 hover:text-slate-600 font-medium text-xs transition"
            >
              Print Another Document
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 py-6 px-4 sm:px-6 flex flex-col justify-center items-center font-sans">
      <div className="w-full max-w-md space-y-5">
        {/* Shop Header: Name & Logo */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
            ) : (
              (shop.name || 'SX').slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Verified Xerox Shop
              </span>
            </div>
            <h1 className="text-base font-extrabold text-navy-950 truncate mt-0.5" title={shop.name}>
              {shop.name}
            </h1>
            <p className="text-[11px] text-slate-500 truncate">{shop.address || 'Local Printing Center'}</p>
          </div>
        </div>

        {/* Main Printing Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-5">
          {/* 1. Document Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
              1. Choose Document
            </label>

            <input
              type="file"
              id="doc-file-input"
              accept=".pdf,image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div className="p-4 rounded-2xl bg-brand-50/50 border border-brand-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-navy-950 truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type.includes('pdf') ? 'PDF Document' : 'Image'}
                    </p>
                  </div>
                </div>

                <label
                  htmlFor="doc-file-input"
                  className="cursor-pointer px-3 py-1.5 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 text-brand-700 text-xs font-bold shrink-0 transition"
                >
                  Change
                </label>
              </div>
            ) : (
              <label
                htmlFor="doc-file-input"
                className="cursor-pointer block p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-brand-500 bg-slate-50/50 hover:bg-white text-center transition space-y-2 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-navy-950">Tap to Upload Document</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">PDF, JPG, or PNG (up to 50MB)</p>
                </div>
              </label>
            )}
          </div>

          {/* 2. Paper Size */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
              2. Paper Size
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaperSize('A4')}
                className={`py-2.5 rounded-2xl text-xs font-extrabold border transition ${
                  paperSize === 'A4'
                    ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                A4 (Standard)
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('LEGAL')}
                className={`py-2.5 rounded-2xl text-xs font-extrabold border transition ${
                  paperSize === 'LEGAL'
                    ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Legal / Stamp
              </button>
            </div>
          </div>

          {/* 3. Print Type (B&W vs Colour) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
              3. Print Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setColorMode('BW')}
                className={`py-3 rounded-2xl text-xs font-extrabold border transition flex items-center justify-center gap-1.5 ${
                  colorMode === 'BW'
                    ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Black & White</span>
              </button>
              <button
                type="button"
                onClick={() => setColorMode('COLOR')}
                className={`py-3 rounded-2xl text-xs font-extrabold border transition flex items-center justify-center gap-1.5 ${
                  colorMode === 'COLOR'
                    ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Colour</span>
              </button>
            </div>
          </div>

          {/* 4. Number of Copies */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
              4. Number of Copies
            </label>
            <div className="flex items-center justify-between p-2 rounded-2xl border border-slate-200 bg-slate-50">
              <span className="text-xs font-bold text-slate-600 pl-3">Total Copies</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-navy-950 font-bold flex items-center justify-center transition shadow-2xs"
                  aria-label="Decrease Copies"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center text-sm font-mono font-black text-navy-950">
                  {copies}
                </span>
                <button
                  type="button"
                  onClick={() => setCopies(copies + 1)}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-navy-950 font-bold flex items-center justify-center transition shadow-2xs"
                  aria-label="Increase Copies"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Send to Shop Button */}
          <button
            type="submit"
            disabled={!file || isSubmitting}
            className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition transform active:scale-98"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sending to Shop...
              </>
            ) : (
              <>
                <Printer className="w-5 h-5" />
                Send to Shop
              </>
            )}
          </button>

          {/* Privacy Footnote */}
          <p className="text-[11px] text-center text-slate-400 pt-1">
            🔒 100% Private • No phone number required • Auto-deleted after pickup
          </p>
        </form>
      </div>
    </div>
  );
};

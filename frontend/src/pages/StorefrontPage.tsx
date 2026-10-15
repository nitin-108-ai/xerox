import React, { useState, useEffect, useMemo } from 'react';
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
  Check,
  Layers,
  Compass,
  FileCheck2,
  Trash2,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export const StorefrontPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [shopData, setShopData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Document upload state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Print settings
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'LEGAL' | 'LETTER'>('A4');
  const [colorMode, setColorMode] = useState<'BW' | 'COLOR'>('BW');
  const [isDuplex, setIsDuplex] = useState<boolean>(false);
  const [copies, setCopies] = useState<number>(1);
  const [pageRangeMode, setPageRangeMode] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [customPageRange, setCustomPageRange] = useState<string>('');
  const [orientation, setOrientation] = useState<'PORTRAIT' | 'LANDSCAPE'>('PORTRAIT');
  const [customNotes, setCustomNotes] = useState<string>('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

      if (!validTypes.includes(selected.type)) {
        setSubmitError('Unsupported format. Please upload a PDF document or JPG/PNG image.');
        return;
      }

      if (selected.size > 50 * 1024 * 1024) {
        setSubmitError('File is too large. Maximum upload size is 50MB.');
        return;
      }

      setSubmitError(null);
      setFile(selected);

      // Create preview for images
      if (selected.type.startsWith('image/')) {
        const url = URL.createObjectURL(selected);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const removeFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setFile(null);
    setSubmitError(null);
  };

  // Calculate live dynamic estimated price
  const estimatedPrice = useMemo(() => {
    if (!shopData?.pricingRules) {
      const base = colorMode === 'COLOR' ? 10.0 : 2.0;
      const multiplier = isDuplex ? 1.5 : 1.0;
      return (base * multiplier * copies).toFixed(2);
    }

    const rule = shopData.pricingRules.find(
      (r: any) => r.paperSize === paperSize && r.colorMode === colorMode
    );

    const pricePerPage = rule
      ? (isDuplex ? rule.doubleSidedPrice : rule.singleSidedPrice)
      : (colorMode === 'COLOR' ? 10.0 : 2.0);

    const total = pricePerPage * copies;
    return Math.max(total, shopData.shop?.min_order_amount || 0).toFixed(2);
  }, [shopData, paperSize, colorMode, isDuplex, copies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setSubmitError('Please choose a document to print.');
      return;
    }

    if (!shopData?.shop?.id) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('shopId', shopData.shop.id);
      formData.append('paperSize', paperSize);
      formData.append('colorMode', colorMode);
      formData.append('isDuplex', String(isDuplex));
      formData.append('copies', String(copies));
      formData.append('customerAlias', 'Customer');

      const fullNotes = [
        pageRangeMode === 'CUSTOM' && customPageRange ? `Pages: ${customPageRange}` : null,
        orientation ? `Orientation: ${orientation}` : null,
        customNotes ? `Notes: ${customNotes}` : null,
      ].filter(Boolean).join(' | ');

      formData.append('customNotes', fullNotes);

      setUploadProgress(60);
      const response = await api.createOrder(formData);
      setUploadProgress(100);
      setSubmittedOrder(response);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to send print request. Please try again.');
      setUploadProgress(0);
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
          <p className="text-xs font-semibold text-slate-500">Connecting to shop counter...</p>
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
          <p className="text-xs text-slate-500">{error || 'Please scan the shop counter QR code again.'}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-navy-900 text-white font-bold text-xs rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { shop } = shopData;

  // Confirmation screen when order has been submitted
  if (submittedOrder) {
    const trackingUrl = `/track/${submittedOrder.orderReference}?token=${submittedOrder.orderAccessToken}`;

    return (
      <div className="min-h-screen bg-slate-50/70 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-elevated max-w-md w-full p-6 sm:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-150">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-200 shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Sent to Shop Counter
            </span>
            <h2 className="text-2xl font-black text-navy-950 pt-2">Order Submitted!</h2>
            <p className="text-xs text-slate-500">
              Your document has been sent directly to <strong>{shop.name}</strong>.
            </p>
          </div>

          {/* Reference & Pickup OTP Box */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3 text-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Order Reference Number
              </span>
              <div className="text-2xl font-mono font-black text-navy-950 tracking-wider">
                {submittedOrder.orderReference}
              </div>
            </div>

            {submittedOrder.pickupOtp && (
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">Pickup Security Code:</span>
                <span className="font-mono font-black text-base text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-200">
                  {submittedOrder.pickupOtp}
                </span>
              </div>
            )}

            <p className="text-[11px] text-slate-500">
              Show this reference number to the shopkeeper at the counter.
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => navigate(trackingUrl)}
              className="w-full py-3.5 rounded-2xl bg-navy-950 hover:bg-brand-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition"
            >
              <ExternalLink className="w-4 h-4" />
              Track Order Live
            </button>

            <button
              onClick={handleCopyTrackingLink}
              className="w-full py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? 'Private Tracking Link Copied!' : 'Copy Private Tracking Link'}
            </button>

            <button
              onClick={() => {
                setSubmittedOrder(null);
                setFile(null);
                setPreviewUrl(null);
                setCopies(1);
                setCustomNotes('');
              }}
              className="w-full py-2 text-slate-400 hover:text-slate-600 font-semibold text-xs transition"
            >
              Print Another Document
            </button>
          </div>

          <p className="text-[10px] text-slate-400">
            🔒 Auto-delete scheduled: {submittedOrder.retentionNotice || 'Within 24 hours'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 py-6 px-4 sm:px-6 flex flex-col justify-center items-center font-sans">
      <div className="w-full max-w-lg space-y-4">
        {/* Shop Header: Verified Xerox Center */}
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
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Verified Xerox Shop
              </span>
            </div>
            <h1 className="text-base font-extrabold text-navy-950 truncate mt-0.5" title={shop.name}>
              {shop.name}
            </h1>
            <p className="text-[11px] text-slate-500 truncate">{shop.address || 'Digital Print Counter'}</p>
          </div>
        </div>

        {/* Anonymous Customer Banner (Zero Login Required) */}
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-[11px]">
            <strong>Zero Login Required:</strong> Send documents anonymously. No phone number or account needed.
          </span>
        </div>

        {/* Main Printing Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-5">
          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* 1. Document Upload with Preview */}
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
              <div className="p-4 rounded-2xl bg-brand-50/40 border border-brand-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
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

                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="doc-file-input"
                      className="cursor-pointer px-3 py-1.5 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 text-brand-700 text-xs font-bold shrink-0 transition"
                    >
                      Change
                    </label>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                      aria-label="Remove File"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Instant Image Preview */}
                {previewUrl && (
                  <div className="mt-2 pt-2 border-t border-brand-100 flex items-center justify-center bg-white rounded-xl p-2 max-h-40 overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Uploaded Preview"
                      className="max-h-36 object-contain rounded-lg shadow-2xs"
                    />
                  </div>
                )}
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
                  <p className="text-[11px] text-slate-400 mt-0.5">PDF, JPG, JPEG, or PNG (up to 50MB)</p>
                </div>
              </label>
            )}
          </div>

          {/* 2. Paper Size */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
              2. Paper Size
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['A4', 'A3', 'LEGAL', 'LETTER'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPaperSize(size)}
                  className={`py-2.5 rounded-2xl text-xs font-extrabold border transition ${
                    paperSize === size
                      ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Color Mode & Duplex Side Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                3. Color Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setColorMode('BW')}
                  className={`py-2.5 rounded-2xl text-xs font-extrabold border transition ${
                    colorMode === 'BW'
                      ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  B &amp; W
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode('COLOR')}
                  className={`py-2.5 rounded-2xl text-xs font-extrabold border transition flex items-center justify-center gap-1 ${
                    colorMode === 'COLOR'
                      ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Color
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                Print Sides
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsDuplex(false)}
                  className={`py-2.5 rounded-2xl text-xs font-extrabold border transition ${
                    !isDuplex
                      ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Single-Sided
                </button>
                <button
                  type="button"
                  onClick={() => setIsDuplex(true)}
                  className={`py-2.5 rounded-2xl text-xs font-extrabold border transition ${
                    isDuplex
                      ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Double-Sided
                </button>
              </div>
            </div>
          </div>

          {/* 4. Copies & Orientation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                4. Copies
              </label>
              <div className="flex items-center justify-between p-1.5 rounded-2xl border border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-navy-950 font-bold flex items-center justify-center transition shadow-2xs"
                  aria-label="Decrease Copies"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-mono font-black text-navy-950">
                  {copies}
                </span>
                <button
                  type="button"
                  onClick={() => setCopies(copies + 1)}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-navy-950 font-bold flex items-center justify-center transition shadow-2xs"
                  aria-label="Increase Copies"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                Orientation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation('PORTRAIT')}
                  className={`py-2.5 rounded-2xl text-xs font-extrabold border transition ${
                    orientation === 'PORTRAIT'
                      ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Portrait
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('LANDSCAPE')}
                  className={`py-2.5 rounded-2xl text-xs font-extrabold border transition ${
                    orientation === 'LANDSCAPE'
                      ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Landscape
                </button>
              </div>
            </div>
          </div>

          {/* 5. Custom Page Range & Special Instructions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                5. Page Selection &amp; Special Instructions
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPageRangeMode('ALL')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                    pageRangeMode === 'ALL'
                      ? 'bg-brand-50 border-brand-300 text-brand-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  All Pages
                </button>
                <button
                  type="button"
                  onClick={() => setPageRangeMode('CUSTOM')}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                    pageRangeMode === 'CUSTOM'
                      ? 'bg-brand-50 border-brand-300 text-brand-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  Custom Range
                </button>
              </div>
            </div>

            {pageRangeMode === 'CUSTOM' && (
              <input
                type="text"
                placeholder="e.g. 1-5, 8, 11-14"
                value={customPageRange}
                onChange={(e) => setCustomPageRange(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50"
              />
            )}

            <input
              type="text"
              placeholder="Special notes for shopkeeper (e.g. Spiral binding, staple top-left)"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50"
            />
          </div>

          {/* Dynamic Live Price Estimate Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Estimated Price
              </span>
              <span className="text-xs text-slate-600">
                {paperSize} • {colorMode} • {isDuplex ? 'Duplex' : 'Single'} • {copies} copy
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-navy-950 font-mono">
                ₹{estimatedPrice}
              </span>
              <span className="text-[9px] text-slate-400 block">Pay at counter</span>
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
                Sending to Shop ({uploadProgress}%)...
              </>
            ) : (
              <>
                <Printer className="w-5 h-5" />
                <span>Send to Shop Counter</span>
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

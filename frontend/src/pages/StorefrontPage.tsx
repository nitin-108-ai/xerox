import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Trash2,
  ArrowRight,
  ArrowLeft,
  Sliders,
  ChevronUp,
  ChevronDown,
  Layers,
  Image as ImageIcon,
  Eye
} from 'lucide-react';
import { api } from '../services/api';
import { ImageEditorModal } from '../components/ImageEditorModal';
import { CustomerDocumentPreviewModal } from '../components/CustomerDocumentPreviewModal';

interface QueuedFile {
  id: string;
  file: File;
  previewUrl: string | null;
  isImage: boolean;
}

export const StorefrontPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [shopData, setShopData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Workflow step: 1 = Upload, 2 = Print Settings, 3 = Review & Submit
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Document queue state
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Print settings
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'LEGAL' | 'LETTER'>('A4');
  const [colorMode, setColorMode] = useState<'BW' | 'COLOR'>('BW');
  const [isDuplex, setIsDuplex] = useState<boolean>(false);
  const [copies, setCopies] = useState<number>(1);
  const [pageRangeMode, setPageRangeMode] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [customPageRange, setCustomPageRange] = useState<string>('');
  const [orientation, setOrientation] = useState<'PORTRAIT' | 'LANDSCAPE'>('PORTRAIT');
  const [customNotes, setCustomNotes] = useState<string>('');

  // Duplex front & back photo/document selector (for 2+ documents)
  const [duplexFrontIndex, setDuplexFrontIndex] = useState<number>(0);
  const [duplexBackIndex, setDuplexBackIndex] = useState<number>(1);

  const handleSwapDuplexSides = () => {
    setDuplexFrontIndex((prevFront) => {
      const oldBack = duplexBackIndex;
      setDuplexBackIndex(prevFront);
      return oldBack;
    });
  };

  // Clamp duplex indices when file queue changes
  useEffect(() => {
    if (duplexFrontIndex >= queuedFiles.length) {
      setDuplexFrontIndex(0);
    }
    if (duplexBackIndex >= queuedFiles.length) {
      setDuplexBackIndex(Math.min(1, Math.max(0, queuedFiles.length - 1)));
    }
  }, [queuedFiles.length, duplexFrontIndex, duplexBackIndex]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Submitted order state
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Document preview state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);

  const handleOpenPreview = (index: number) => {
    setPreviewInitialIndex(index);
    setPreviewModalOpen(true);
  };

  useEffect(() => {
    async function loadShop() {
      if (!slug) return;
      try {
        setLoading(true);
        setError(null);
        const data = await api.getStorefront(slug);
        setShopData(data);

        // Notify shop owner panel that a customer scanned the counter QR
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('smart_xerox_orders_channel');
            bc.postMessage({
              type: 'QR_SCANNED',
              slug: slug,
              timestamp: Date.now()
            });
            bc.close();
          }
          localStorage.setItem('smart_xerox_last_qr_scan', JSON.stringify({
            slug: slug,
            timestamp: Date.now()
          }));
        } catch {}
      } catch (err: any) {
        setError(err.message || 'Shop could not be loaded.');
      } finally {
        setLoading(false);
      }
    }

    loadShop();
  }, [slug]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      queuedFiles.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, []);

  const addFilesToQueue = (selectedFiles: FileList | File[]) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const newItems: QueuedFile[] = [];
    let err: string | null = null;

    Array.from(selectedFiles).forEach((file) => {
      if (!validTypes.includes(file.type)) {
        err = `"${file.name}" has an unsupported format. Please upload PDF, JPG, or PNG.`;
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        err = `"${file.name}" is too large (max 50MB per file).`;
        return;
      }

      const isImg = file.type.startsWith('image/');
      const preview = isImg ? URL.createObjectURL(file) : null;

      newItems.push({
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl: preview,
        isImage: isImg,
      });
    });

    if (err) setSubmitError(err);
    else setSubmitError(null);

    if (newItems.length > 0) {
      setQueuedFiles((prev) => {
        const combined = [...prev, ...newItems];
        if (combined.length > 20) {
          setSubmitError('Maximum 20 documents allowed per order.');
          return combined.slice(0, 20);
        }
        return combined;
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const removeFile = (index: number) => {
    setQueuedFiles((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setCurrentStep(1);
      }
      return next;
    });
  };

  const moveFile = (index: number, direction: 'UP' | 'DOWN') => {
    setQueuedFiles((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'UP' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleSaveEditedImage = (editedBlob: Blob) => {
    if (editingFileIndex === null) return;
    const current = queuedFiles[editingFileIndex];
    if (!current) return;

    const newFile = new File([editedBlob], current.file.name, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    const newPreview = URL.createObjectURL(newFile);

    if (current.previewUrl) URL.revokeObjectURL(current.previewUrl);

    setQueuedFiles((prev) =>
      prev.map((item, idx) =>
        idx === editingFileIndex
          ? { ...item, file: newFile, previewUrl: newPreview }
          : item
      )
    );
    setEditingFileIndex(null);
  };

  // Calculate live dynamic estimated price
  const estimatedPrice = useMemo(() => {
    const fileMultiplier = Math.max(1, queuedFiles.length);

    if (!shopData?.pricingRules || shopData.pricingRules.length === 0) {
      const base = colorMode === 'COLOR' ? 10.0 : 2.0;
      const multiplier = isDuplex ? 1.5 : 1.0;
      const total = base * multiplier * copies * fileMultiplier;
      return total.toFixed(2);
    }

    const rule = shopData.pricingRules.find(
      (r: any) => r.paperSize === paperSize && r.colorMode === colorMode
    );

    const pricePerPage = rule
      ? (isDuplex ? rule.doubleSidedPrice : rule.singleSidedPrice)
      : (colorMode === 'COLOR' ? 10.0 : 2.0);

    const total = pricePerPage * copies * fileMultiplier;
    return Math.max(total, shopData.shop?.min_order_amount || 0).toFixed(2);
  }, [shopData, paperSize, colorMode, isDuplex, copies, queuedFiles.length]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (queuedFiles.length === 0) {
      setSubmitError('Please choose at least one document to print.');
      setCurrentStep(1);
      return;
    }

    if (!shopData?.shop?.id) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setUploadProgress(25);

    try {
      const formData = new FormData();
      formData.append('shopId', shopData.shop.id);
      formData.append('shopName', shopData.shop.name || 'QuickCopy Express Xerox & Digital Print');
      formData.append('shopSlug', shopData.shop.slug || slug || 'quickcopy-express');
      formData.append('shopAddress', shopData.shop.address || 'Digital Print Counter');
      formData.append('paperSize', paperSize);
      formData.append('colorMode', colorMode);
      formData.append('isDuplex', String(isDuplex));
      formData.append('copies', String(copies));
      formData.append('customerAlias', 'Customer');

      // Reorder documents according to duplex front & back pairing when duplex is enabled with 2+ files
      let orderedFiles = [...queuedFiles];
      let duplexArrangementNote = '';
      if (isDuplex && queuedFiles.length >= 2) {
        const frontItem = queuedFiles[duplexFrontIndex] || queuedFiles[0];
        const backItem = queuedFiles[duplexBackIndex] || queuedFiles[1];
        const remaining = queuedFiles.filter((_, idx) => idx !== duplexFrontIndex && idx !== duplexBackIndex);
        orderedFiles = [frontItem, backItem, ...remaining];
        duplexArrangementNote = `Duplex Layout: FRONT = "${frontItem.file.name}" | BACK = "${backItem.file.name}"`;
      }

      // Append all queued files
      orderedFiles.forEach((item) => {
        formData.append('documents', item.file);
      });
      // Backward-compatible single document field
      if (orderedFiles[0]) {
        formData.append('document', orderedFiles[0].file);
      }

      const fullNotes = [
        duplexArrangementNote || null,
        pageRangeMode === 'CUSTOM' && customPageRange ? `Pages: ${customPageRange}` : null,
        orientation ? `Orientation: ${orientation}` : null,
        customNotes ? `Notes: ${customNotes}` : null,
      ].filter(Boolean).join(' | ');

      formData.append('customNotes', fullNotes);

      setUploadProgress(65);
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
      <div className="min-h-screen bg-[#080d09] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-[#bbf451] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Connecting to 3D Print Counter...
          </p>
        </div>
      </div>
    );
  }

  if (error || !shopData) {
    return (
      <div className="min-h-screen bg-[#080d09] flex items-center justify-center p-4">
        <div className="bg-[#121c14] rounded-3xl border border-[#233526] p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white font-syne">Shop Not Found</h2>
          <p className="text-xs text-slate-400">{error || 'Please scan the shop counter QR code again.'}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-[#bbf451] text-[#0a120c] font-black text-xs rounded-full hover:bg-[#cbff5e] transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { shop } = shopData;

  // Confirmation screen when order has been submitted
  if (submittedOrder) {
    const orderRef = submittedOrder.orderReference || submittedOrder.order_reference || 'SX-LIVE-ORDER';
    const token = submittedOrder.orderAccessToken || 'sx_token';
    const trackingUrl = `/track/${orderRef}?token=${token}`;

    return (
      <div className="min-h-screen bg-[#080d09] flex items-center justify-center p-4 font-outfit">
        <div className="bg-gradient-to-b from-[#162419] via-[#111a13] to-[#0c140e] border border-[#283e2c] shadow-[0_25px_60px_rgba(0,0,0,0.85)] rounded-[32px] max-w-md w-full p-6 sm:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-150">
          <div className="w-16 h-16 rounded-full bg-[#bbf451]/15 text-[#bbf451] flex items-center justify-center mx-auto border-2 border-[#bbf451]/30 shadow-lg">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#bbf451] bg-[#1a2d1d] px-3.5 py-1 rounded-full border border-[#2a462f]">
              Directly Dispatched to Press
            </span>
            <h2 className="text-2xl font-black text-white pt-2 font-syne">Order Submitted!</h2>
            <p className="text-xs text-slate-300">
              Your {submittedOrder.fileCount || queuedFiles.length} document(s) have arrived live at <strong>{shop?.name || 'the shop counter'}</strong>.
            </p>
          </div>

          {/* Reference & Pickup OTP Box */}
          <div className="bg-[#101911] rounded-2xl p-5 border border-[#213524] space-y-3 text-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Order Reference Number
              </span>
              <div className="text-2xl font-mono font-black text-white tracking-wider mt-0.5">
                {orderRef}
              </div>
            </div>

            {(submittedOrder.pickupOtp || submittedOrder.pickup_otp) && (
              <div className="pt-2 border-t border-[#1f3122] flex items-center justify-center gap-2">
                <span className="text-[11px] font-bold text-slate-300">Pickup Security Code:</span>
                <span className="font-mono font-black text-base text-[#0a120c] bg-[#bbf451] px-3 py-0.5 rounded-lg">
                  {submittedOrder.pickupOtp || submittedOrder.pickup_otp}
                </span>
              </div>
            )}

            <p className="text-[11px] text-slate-400">
              Show this reference number or security code to the shopkeeper at the counter.
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => navigate(trackingUrl)}
              className="w-full py-3.5 rounded-full bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-[#bbf451]/20 transition hover:scale-[1.02]"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Track Order Live Status</span>
            </button>

            <button
              onClick={handleCopyTrackingLink}
              className="w-full py-2.5 rounded-full border border-[#283e2c] bg-[#142017] hover:bg-[#1a2b1f] text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              {copiedLink ? <Check className="w-4 h-4 text-[#bbf451]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Private Tracking Link Copied!' : 'Copy Private Tracking Link'}</span>
            </button>

            <button
              onClick={() => {
                setSubmittedOrder(null);
                setQueuedFiles([]);
                setCurrentStep(1);
                setCopies(1);
                setCustomNotes('');
              }}
              className="w-full py-2 text-slate-400 hover:text-white font-semibold text-xs transition"
            >
              Print More Documents
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
    <div className="min-h-screen bg-[#080d09] text-slate-100 py-8 px-4 sm:px-6 flex flex-col justify-center items-center font-outfit">
      <div className="w-full max-w-xl space-y-4">
        {/* Shop Header */}
        <div className="bg-gradient-to-b from-[#152317] to-[#0d160f] rounded-3xl p-5 border border-[#243928] shadow-2xl flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#162719] to-[#25422b] border border-[#3b6243] text-[#bbf451] font-black text-lg flex items-center justify-center shrink-0 shadow-md overflow-hidden">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
            ) : (
              (shop.name || 'SX').slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#bbf451] bg-[#1a2d1d] px-2.5 py-0.5 rounded-full border border-[#2b4431] flex items-center gap-1">
                <Check className="w-3 h-3" />
                Verified Print Counter
              </span>
            </div>
            <h1 className="text-base font-extrabold text-white truncate mt-1 font-syne" title={shop.name}>
              {shop.name}
            </h1>
            <p className="text-[11px] text-slate-400 truncate">{shop.address || 'Digital Print Counter'}</p>
          </div>
        </div>

        {/* Anonymous Customer Banner */}
        <div className="bg-[#101b13] border border-[#203424] rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-[#bbf451] shrink-0" />
          <span className="text-[11px]">
            <strong className="text-white">Zero Phone Number Leak:</strong> Send files anonymously. Never stored permanently or shared on WhatsApp.
          </span>
        </div>

        {/* Multi-Step Flow Indicator */}
        <div className="bg-[#121c14] rounded-2xl px-4 py-3 border border-[#223525] shadow-inner flex items-center justify-between text-xs font-bold">
          <div
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-1.5 cursor-pointer transition ${
              currentStep === 1 ? 'text-[#bbf451]' : currentStep > 1 ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              currentStep === 1 ? 'bg-[#bbf451] text-[#0a120c]' : currentStep > 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-[#19261c] text-slate-400'
            }`}>
              {currentStep > 1 ? '✓' : '1'}
            </span>
            <span>Upload ({queuedFiles.length})</span>
          </div>

          <div className="h-0.5 w-6 bg-[#213424]" />

          <div
            onClick={() => queuedFiles.length > 0 && setCurrentStep(2)}
            className={`flex items-center gap-1.5 cursor-pointer transition ${
              currentStep === 2 ? 'text-[#bbf451]' : currentStep > 2 ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              currentStep === 2 ? 'bg-[#bbf451] text-[#0a120c]' : currentStep > 2 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-[#19261c] text-slate-400'
            }`}>
              {currentStep > 2 ? '✓' : '2'}
            </span>
            <span>Settings</span>
          </div>

          <div className="h-0.5 w-6 bg-[#213424]" />

          <div
            onClick={() => queuedFiles.length > 0 && setCurrentStep(3)}
            className={`flex items-center gap-1.5 cursor-pointer transition ${
              currentStep === 3 ? 'text-[#bbf451]' : 'text-slate-400'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              currentStep === 3 ? 'bg-[#bbf451] text-[#0a120c]' : 'bg-[#19261c] text-slate-400'
            }`}>
              3
            </span>
            <span>Send</span>
          </div>
        </div>

        {/* Error Alert */}
        {submitError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{submitError}</span>
          </div>
        )}

        {/* STEP 1: Upload Documents Queue */}
        {currentStep === 1 && (
          <div className="bg-gradient-to-b from-[#142217] to-[#0c140e] rounded-3xl p-6 border border-[#243928] shadow-2xl space-y-5 animate-in fade-in duration-150">
            <div className="space-y-1">
              <h2 className="text-xs font-bold text-[#bbf451] uppercase tracking-wider">
                1. Select Document(s) to Print
              </h2>
              <p className="text-xs text-slate-300">
                You can upload multiple PDFs or Photos at once (up to 20 files).
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,image/png,image/jpeg,image/jpg"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
              id="multi-file-upload-input"
            />

            {/* Drag & Drop Upload Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer block p-6 sm:p-8 rounded-2xl border-2 border-dashed transition text-center space-y-2 ${
                isDragOver
                  ? 'border-[#bbf451] bg-[#1b2f1f] scale-[1.01]'
                  : 'border-[#29422f] hover:border-[#bbf451] bg-[#0e1610] hover:bg-[#121e14]'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-[#1b2b1d] border border-[#2e4732] text-[#bbf451] flex items-center justify-center mx-auto transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-white">
                  {queuedFiles.length > 0 ? 'Tap to Add More Documents' : 'Tap to Upload Documents'}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Drag &amp; drop or browse PDFs, JPG, or PNG images (up to 50MB each)
                </p>
              </div>
            </div>

            {/* Uploaded Files Queue List */}
            {queuedFiles.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Queued Documents ({queuedFiles.length})</span>
                  <span className="text-[11px] text-slate-500">Reorder or edit photos</span>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {queuedFiles.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-[#101911] border border-[#203323] flex items-center justify-between gap-3 shadow-sm hover:border-[#bbf451]/50 transition"
                    >
                      <div
                        onClick={() => handleOpenPreview(index)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer hover:opacity-90 transition"
                        title="Click to preview this document"
                      >
                        {item.isImage && item.previewUrl ? (
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#162318] shrink-0 border border-[#2b4230] relative group">
                            <img
                              src={item.previewUrl}
                              alt={item.file.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-[#182a1d] border border-[#2d4632] text-[#bbf451] flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate hover:text-[#bbf451] transition" title={item.file.name}>
                            {index + 1}. {item.file.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {(item.file.size / (1024 * 1024)).toFixed(2)} MB • {item.isImage ? 'Photo' : 'PDF Document'}
                          </p>
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Preview button */}
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(index)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#162418] hover:bg-[#203423] text-[#bbf451] text-[11px] font-bold flex items-center gap-1 border border-[#2b4330] transition"
                          title="Preview document before printing"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>

                        {/* Edit button for images */}
                        {item.isImage && (
                          <button
                            type="button"
                            onClick={() => setEditingFileIndex(index)}
                            className="px-2 py-1.5 rounded-xl bg-[#162418] hover:bg-[#203423] text-slate-200 text-[11px] font-bold flex items-center gap-1 border border-[#2b4330] transition"
                            title="Crop, rotate, adjust photo"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}

                        {/* Reorder Up */}
                        <button
                          type="button"
                          onClick={() => moveFile(index, 'UP')}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg border border-[#243928] bg-[#121c14] text-slate-400 hover:text-white disabled:opacity-30 transition"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Reorder Down */}
                        <button
                          type="button"
                          onClick={() => moveFile(index, 'DOWN')}
                          disabled={index === queuedFiles.length - 1}
                          className="p-1.5 rounded-lg border border-[#243928] bg-[#121c14] text-slate-400 hover:text-white disabled:opacity-30 transition"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1.5 rounded-lg border border-[#243928] bg-[#121c14] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Step Button */}
            <button
              type="button"
              disabled={queuedFiles.length === 0}
              onClick={() => setCurrentStep(2)}
              className="w-full py-3.5 rounded-full bg-[#bbf451] hover:bg-[#cbff5e] disabled:bg-[#1a281e] disabled:text-slate-500 text-[#0a120c] font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-[#bbf451]/20 transition hover:scale-[1.01]"
            >
              <span>Continue to Print Settings ({queuedFiles.length} file{queuedFiles.length === 1 ? '' : 's'})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Print Settings */}
        {currentStep === 2 && (
          <div className="bg-gradient-to-b from-[#142217] to-[#0c140e] rounded-3xl p-6 border border-[#243928] shadow-2xl space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Files
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPreview(0)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#bbf451] bg-[#18291c] px-3 py-1 rounded-full border border-[#2b4431] transition"
                  title="Preview uploaded documents"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Files ({queuedFiles.length})</span>
                </button>
                <span className="text-[11px] font-extrabold text-[#bbf451] uppercase tracking-wider">
                  Step 2 of 3
                </span>
              </div>
            </div>

            {/* 1. Paper Size */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                1. Paper Size
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['A4', 'A3', 'LEGAL', 'LETTER'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPaperSize(size)}
                    className={`py-2.5 rounded-2xl text-xs font-extrabold border transition ${
                      paperSize === size
                        ? 'bg-[#bbf451] text-[#0a120c] border-[#bbf451] shadow-md'
                        : 'bg-[#101911] text-slate-300 border-[#223525] hover:bg-[#162317]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Color Mode & Duplex Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                  2. Color Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setColorMode('BW')}
                    className={`py-2.5 rounded-2xl text-xs font-extrabold border transition ${
                      colorMode === 'BW'
                        ? 'bg-[#bbf451] text-[#0a120c] border-[#bbf451] shadow-md'
                        : 'bg-[#101911] text-slate-300 border-[#223525] hover:bg-[#162317]'
                    }`}
                  >
                    B &amp; W
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorMode('COLOR')}
                    className={`py-2.5 rounded-2xl text-xs font-extrabold border transition flex items-center justify-center gap-1 ${
                      colorMode === 'COLOR'
                        ? 'bg-[#bbf451] text-[#0a120c] border-[#bbf451] shadow-md'
                        : 'bg-[#101911] text-slate-300 border-[#223525] hover:bg-[#162317]'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    Color
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Print Sides
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDuplex(false)}
                    className={`py-2.5 rounded-2xl text-xs font-extrabold border transition ${
                      !isDuplex
                        ? 'bg-[#bbf451] text-[#0a120c] border-[#bbf451] shadow-md'
                        : 'bg-[#101911] text-slate-300 border-[#223525] hover:bg-[#162317]'
                    }`}
                  >
                    Single-Sided
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDuplex(true)}
                    className={`py-2.5 rounded-2xl text-xs font-extrabold border transition ${
                      isDuplex
                        ? 'bg-[#bbf451] text-[#0a120c] border-[#bbf451] shadow-md'
                        : 'bg-[#101911] text-slate-300 border-[#223525] hover:bg-[#162317]'
                    }`}
                  >
                    Double-Sided
                  </button>
                </div>
              </div>
            </div>

            {/* Double-Sided Page Arrangement for 2+ Photos/Documents */}
            {isDuplex && queuedFiles.length >= 2 && (
              <div className="p-4 rounded-2xl bg-[#142318] border border-[#2a452f] space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-xs font-black text-white flex items-center gap-1.5 font-syne">
                      <Layers className="w-3.5 h-3.5 text-[#bbf451]" />
                      Double-Sided Page Arrangement
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Choose which photo/document prints on Front (Sheet 1) and Back (Sheet 2).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSwapDuplexSides}
                    className="px-3 py-1.5 rounded-xl bg-[#1c2c1f] hover:bg-[#263c2b] text-[#bbf451] text-xs font-bold border border-[#2d4732] flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                    title="Swap Front and Back sides"
                  >
                    <span>⇄ Swap Sides (Palat Dein)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* FRONT SIDE (Sheet 1) */}
                  <div className="p-3 rounded-2xl bg-[#0f1911] border border-[#223525] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#bbf451] bg-[#1a2d1d] px-2.5 py-0.5 rounded-full border border-[#2a462f]">
                        Front Side (Samne)
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Page 1</span>
                    </div>

                    <select
                      value={duplexFrontIndex}
                      onChange={(e) => setDuplexFrontIndex(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-[#263c29] bg-[#152217] text-white focus:outline-none focus:border-[#bbf451]"
                    >
                      {queuedFiles.map((f, idx) => (
                        <option key={f.id} value={idx}>
                          {idx + 1}. {f.file.name} {idx === duplexBackIndex ? '— (Currently Back)' : ''}
                        </option>
                      ))}
                    </select>

                    {queuedFiles[duplexFrontIndex]?.previewUrl ? (
                      <div className="h-24 rounded-xl overflow-hidden border border-[#233826] bg-[#0c140e] flex items-center justify-center p-1">
                        <img
                          src={queuedFiles[duplexFrontIndex].previewUrl!}
                          alt="Front side preview"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-16 rounded-xl border border-[#233826] bg-[#0c140e] flex items-center justify-center text-slate-400 text-xs">
                        <FileText className="w-5 h-5 mr-1.5 text-[#bbf451]" />
                        <span className="truncate max-w-[150px]">{queuedFiles[duplexFrontIndex]?.file.name}</span>
                      </div>
                    )}
                  </div>

                  {/* BACK SIDE (Sheet 2) */}
                  <div className="p-3 rounded-2xl bg-[#0f1911] border border-[#223525] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        Back Side (Piche)
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Page 2</span>
                    </div>

                    <select
                      value={duplexBackIndex}
                      onChange={(e) => setDuplexBackIndex(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-[#263c29] bg-[#152217] text-white focus:outline-none focus:border-[#bbf451]"
                    >
                      {queuedFiles.map((f, idx) => (
                        <option key={f.id} value={idx}>
                          {idx + 1}. {f.file.name} {idx === duplexFrontIndex ? '— (Currently Front)' : ''}
                        </option>
                      ))}
                    </select>

                    {queuedFiles[duplexBackIndex]?.previewUrl ? (
                      <div className="h-24 rounded-xl overflow-hidden border border-[#233826] bg-[#0c140e] flex items-center justify-center p-1">
                        <img
                          src={queuedFiles[duplexBackIndex].previewUrl!}
                          alt="Back side preview"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-16 rounded-xl border border-[#233826] bg-[#0c140e] flex items-center justify-center text-slate-400 text-xs">
                        <FileText className="w-5 h-5 mr-1.5 text-emerald-400" />
                        <span className="truncate max-w-[150px]">{queuedFiles[duplexBackIndex]?.file.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Copies & Orientation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                  3. Copies per Document
                </label>
                <div className="flex items-center justify-between p-1.5 rounded-2xl border border-[#243928] bg-[#101911]">
                  <button
                    type="button"
                    onClick={() => setCopies(Math.max(1, copies - 1))}
                    className="w-8 h-8 rounded-xl bg-[#18261c] border border-[#2c4431] hover:bg-[#223727] text-white font-bold flex items-center justify-center transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-mono font-black text-white">
                    {copies}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCopies(copies + 1)}
                    className="w-8 h-8 rounded-xl bg-[#18261c] border border-[#2c4431] hover:bg-[#223727] text-white font-bold flex items-center justify-center transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Orientation
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrientation('PORTRAIT')}
                    className={`py-2.5 rounded-2xl text-xs font-extrabold border transition ${
                      orientation === 'PORTRAIT'
                        ? 'bg-[#bbf451] text-[#0a120c] border-[#bbf451] shadow-md'
                        : 'bg-[#101911] text-slate-300 border-[#223525] hover:bg-[#162317]'
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('LANDSCAPE')}
                    className={`py-2.5 rounded-2xl text-xs font-extrabold border transition ${
                      orientation === 'LANDSCAPE'
                        ? 'bg-[#bbf451] text-[#0a120c] border-[#bbf451] shadow-md'
                        : 'bg-[#101911] text-slate-300 border-[#223525] hover:bg-[#162317]'
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Page Range to Print & Special Instructions */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                  4. Pages to Print &amp; Notes
                </label>
                <span className="text-[10px] text-slate-400">PDF Multi-Page Selection</span>
              </div>

              {/* Quick Page Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setPageRangeMode('ALL');
                    setCustomPageRange('');
                  }}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition ${
                    pageRangeMode === 'ALL'
                      ? 'bg-[#bbf451] text-[#0a120c] border-[#bbf451]'
                      : 'bg-[#101911] text-slate-300 border-[#223525] hover:bg-[#162317]'
                  }`}
                >
                  All Pages (Sabhi)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPageRangeMode('CUSTOM');
                    setCustomPageRange('1');
                  }}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition ${
                    pageRangeMode === 'CUSTOM' && customPageRange === '1'
                      ? 'bg-[#bbf451] text-[#0a120c] border-[#bbf451]'
                      : 'bg-[#101911] text-slate-300 border-[#223525] hover:bg-[#162317]'
                  }`}
                >
                  Page 1 Only
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPageRangeMode('CUSTOM');
                    setCustomPageRange('1-2');
                  }}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition ${
                    pageRangeMode === 'CUSTOM' && customPageRange === '1-2'
                      ? 'bg-[#bbf451] text-[#0a120c] border-[#bbf451]'
                      : 'bg-[#101911] text-slate-300 border-[#223525] hover:bg-[#162317]'
                  }`}
                >
                  Pages 1–2
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPageRangeMode('CUSTOM');
                    setCustomPageRange('odd');
                  }}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition ${
                    pageRangeMode === 'CUSTOM' && customPageRange === 'odd'
                      ? 'bg-[#bbf451] text-[#0a120c] border-[#bbf451]'
                      : 'bg-[#101911] text-slate-300 border-[#223525] hover:bg-[#162317]'
                  }`}
                >
                  Odd Pages (1,3,5..)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPageRangeMode('CUSTOM');
                    setCustomPageRange('even');
                  }}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition ${
                    pageRangeMode === 'CUSTOM' && customPageRange === 'even'
                      ? 'bg-[#bbf451] text-[#0a120c] border-[#bbf451]'
                      : 'bg-[#101911] text-slate-300 border-[#223525] hover:bg-[#162317]'
                  }`}
                >
                  Even Pages (2,4,6..)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPageRangeMode('CUSTOM');
                    if (!customPageRange || ['1', '1-2', 'odd', 'even'].includes(customPageRange)) {
                      setCustomPageRange('');
                    }
                  }}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition ${
                    pageRangeMode === 'CUSTOM' && !['1', '1-2', 'odd', 'even'].includes(customPageRange)
                      ? 'bg-[#bbf451] text-[#0a120c] border-[#bbf451]'
                      : 'bg-[#101911] text-slate-300 border-[#223525] hover:bg-[#162317]'
                  }`}
                >
                  Custom Range...
                </button>
              </div>

              {pageRangeMode === 'CUSTOM' && (
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Enter specific pages to print (e.g. 1-4, 7, 9-12)"
                    value={customPageRange}
                    onChange={(e) => setCustomPageRange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-mono border border-[#273c2a] rounded-xl focus:outline-none focus:border-[#bbf451] bg-[#121c13] text-white"
                  />
                  <p className="text-[10px] text-slate-400">
                    💡 Example: "1, 3, 5-8" prints page 1, page 3, and pages 5 through 8.
                  </p>
                </div>
              )}

              <input
                type="text"
                placeholder="Special notes for shopkeeper (e.g. Aadhaar both sides, staple top-left, spiral binding)"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-[#273c2a] rounded-xl focus:outline-none focus:border-[#bbf451] bg-[#121c13] text-white placeholder-slate-500"
              />
            </div>

            {/* Step navigation buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="w-1/3 py-3.5 rounded-full border border-[#283e2c] bg-[#121c14] hover:bg-[#1a281e] text-slate-200 font-extrabold text-xs transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="flex-1 py-3.5 rounded-full bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] font-black text-xs flex items-center justify-center gap-1.5 shadow-xl shadow-[#bbf451]/20 transition hover:scale-[1.01]"
              >
                <span>Review Order</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Submit Order */}
        {currentStep === 3 && (
          <form onSubmit={handleSubmitOrder} className="bg-gradient-to-b from-[#142217] to-[#0c140e] rounded-3xl p-6 border border-[#243928] shadow-2xl space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Settings
              </button>
              <span className="text-[11px] font-extrabold text-[#bbf451] uppercase tracking-wider">
                Step 3 of 3
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-white font-syne">Review Print Job</h2>
              <p className="text-xs text-slate-400">
                Verify your order details before sending directly to the shop counter.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="bg-[#101911] rounded-2xl p-4 border border-[#213524] space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#1f3122]">
                <span className="font-bold text-slate-400">Documents ({queuedFiles.length}):</span>
                <span className="font-extrabold text-white">
                  {queuedFiles.map((f) => f.file.name).join(', ').slice(0, 35)}
                  {queuedFiles.map((f) => f.file.name).join(', ').length > 35 ? '...' : ''}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Paper Size</span>
                  <span className="font-extrabold text-white">{paperSize}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Color Mode</span>
                  <span className="font-extrabold text-white">{colorMode === 'COLOR' ? 'Color' : 'Black & White'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Duplex</span>
                  <span className="font-extrabold text-white">{isDuplex ? 'Double-Sided' : 'Single-Sided'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Copies per File</span>
                  <span className="font-extrabold text-white">{copies}</span>
                </div>
              </div>

              {/* Duplex Front / Back pairing confirmation */}
              {isDuplex && queuedFiles.length >= 2 && (
                <div className="bg-[#142318] p-3 rounded-xl border border-[#2b4431] text-xs space-y-1">
                  <span className="text-[10px] font-black text-[#bbf451] uppercase tracking-wider block">
                    Double-Sided Page Arrangement:
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span><strong>Front (Page 1):</strong> {queuedFiles[duplexFrontIndex]?.file.name}</span>
                    <span><strong>Back (Page 2):</strong> {queuedFiles[duplexBackIndex]?.file.name}</span>
                  </div>
                </div>
              )}

              {customNotes && (
                <div className="text-[11px] text-slate-300 pt-1 border-t border-[#1f3122]">
                  <strong>Notes:</strong> {customNotes}
                </div>
              )}

              {/* Document Preview Quick Bar in Step 3 */}
              <div className="space-y-1.5 pt-2 border-t border-[#1f3122]">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Verify Documents to Print
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {queuedFiles.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#142217] border border-[#243928] text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {item.isImage ? <ImageIcon className="w-3.5 h-3.5 text-[#bbf451] shrink-0" /> : <FileText className="w-3.5 h-3.5 text-[#bbf451] shrink-0" />}
                        <span className="truncate font-semibold text-white text-[11px]">{item.file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(idx)}
                        className="px-2 py-1 rounded-lg bg-[#1b2c1f] hover:bg-[#253c29] text-[#bbf451] text-[10px] font-bold flex items-center gap-1 shrink-0 ml-2 transition border border-[#2d4632]"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Preview</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dynamic Estimated Price Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#172719] to-[#0e1810] border border-[#29422f] flex items-center justify-between shadow-inner">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Estimated Total
                </span>
                <span className="text-xs text-slate-300">
                  {queuedFiles.length} file(s) • {copies} copy each • {colorMode}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-[#bbf451] font-syne">
                  ₹{estimatedPrice}
                </span>
                <span className="text-[10px] font-bold text-[#bbf451] bg-[#1a2d1d] border border-[#2b4431] px-2 py-0.5 rounded-full block mt-0.5">
                  Pay at Counter
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="space-y-2.5 pt-1">
              <button
                type="submit"
                disabled={queuedFiles.length === 0 || isSubmitting}
                className="w-full py-4 rounded-full bg-[#bbf451] hover:bg-[#cbff5e] disabled:bg-[#1a281e] disabled:text-slate-500 text-[#0a120c] font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#bbf451]/20 transition transform active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#0a120c]" />
                    <span>Sending to Shop Counter ({uploadProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-5 h-5 text-[#0a120c]" />
                    <span>Send to Shop Counter</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-full border border-[#263c29] text-slate-300 font-bold text-xs hover:bg-[#152317] transition"
              >
                Modify Files or Settings
              </button>
            </div>

            {/* Privacy Footnote */}
            <p className="text-[11px] text-center text-slate-400 pt-1">
              🔒 100% Private • No phone number required • Auto-deleted after pickup
            </p>
          </form>
        )}

        {/* Client-side Image Editor Modal */}
        {editingFileIndex !== null && queuedFiles[editingFileIndex]?.isImage && (
          <ImageEditorModal
            isOpen={editingFileIndex !== null}
            file={queuedFiles[editingFileIndex].file}
            onClose={() => setEditingFileIndex(null)}
            onSave={handleSaveEditedImage}
          />
        )}

        {/* Customer Document Preview Modal */}
        <CustomerDocumentPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          files={queuedFiles}
          initialIndex={previewInitialIndex}
          printSettings={{
            paperSize,
            colorMode,
            isDuplex,
            copies,
            estimatedPrice
          }}
          onColorModeChange={(mode) => setColorMode(mode)}
        />
      </div>
    </div>
  );
};

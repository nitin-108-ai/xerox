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

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (index: number) => {
    setQueuedFiles((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const moveFile = (index: number, direction: 'UP' | 'DOWN') => {
    setQueuedFiles((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'UP' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleSaveEditedImage = (editedFile: File) => {
    if (editingFileIndex === null) return;
    setQueuedFiles((prev) => {
      const copy = [...prev];
      const target = copy[editingFileIndex];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      const newPreview = URL.createObjectURL(editedFile);
      copy[editingFileIndex] = {
        ...target,
        file: editedFile,
        previewUrl: newPreview,
      };
      return copy;
    });
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
              Your {submittedOrder.fileCount || queuedFiles.length} document(s) have been received directly at <strong>{shop.name}</strong>.
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
              Show this reference number or security code to the shopkeeper at the counter.
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
                setQueuedFiles([]);
                setCurrentStep(1);
                setCopies(1);
                setCustomNotes('');
              }}
              className="w-full py-2 text-slate-400 hover:text-slate-600 font-semibold text-xs transition"
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
    <div className="min-h-screen bg-slate-50/60 py-6 px-4 sm:px-6 flex flex-col justify-center items-center font-sans">
      <div className="w-full max-w-lg space-y-4">
        {/* Shop Header */}
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

        {/* Anonymous Customer Banner */}
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-[11px]">
            <strong>Zero Login Required:</strong> Send documents anonymously. No phone number or account needed.
          </span>
        </div>

        {/* Multi-Step Flow Indicator */}
        <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200/80 shadow-2xs flex items-center justify-between text-xs font-bold">
          <div
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-1.5 cursor-pointer transition ${
              currentStep === 1 ? 'text-brand-600' : currentStep > 1 ? 'text-emerald-700' : 'text-slate-400'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              currentStep === 1 ? 'bg-brand-600 text-white' : currentStep > 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
            }`}>
              {currentStep > 1 ? '✓' : '1'}
            </span>
            <span>Upload ({queuedFiles.length})</span>
          </div>

          <div className="h-0.5 w-6 bg-slate-200" />

          <div
            onClick={() => queuedFiles.length > 0 && setCurrentStep(2)}
            className={`flex items-center gap-1.5 cursor-pointer transition ${
              currentStep === 2 ? 'text-brand-600' : currentStep > 2 ? 'text-emerald-700' : 'text-slate-400'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              currentStep === 2 ? 'bg-brand-600 text-white' : currentStep > 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
            }`}>
              {currentStep > 2 ? '✓' : '2'}
            </span>
            <span>Settings</span>
          </div>

          <div className="h-0.5 w-6 bg-slate-200" />

          <div
            onClick={() => queuedFiles.length > 0 && setCurrentStep(3)}
            className={`flex items-center gap-1.5 cursor-pointer transition ${
              currentStep === 3 ? 'text-brand-600' : 'text-slate-400'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              currentStep === 3 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              3
            </span>
            <span>Send</span>
          </div>
        </div>

        {/* Error Alert */}
        {submitError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* STEP 1: Upload Documents Queue */}
        {currentStep === 1 && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-5 animate-in fade-in duration-150">
            <div className="space-y-1">
              <h2 className="text-sm font-extrabold text-navy-950 uppercase tracking-wider">
                1. Select Document(s) to Print
              </h2>
              <p className="text-xs text-slate-500">
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
                  ? 'border-brand-500 bg-brand-50/60 scale-[1.01]'
                  : 'border-slate-300 hover:border-brand-500 bg-slate-50/60 hover:bg-white'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-navy-950">
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
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Queued Documents ({queuedFiles.length})</span>
                  <span className="text-[11px] text-slate-400">Reorder or edit photos</span>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {queuedFiles.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-3 shadow-2xs hover:bg-white transition"
                    >
                      <div
                        onClick={() => handleOpenPreview(index)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer hover:opacity-90 transition"
                        title="Click to preview this document"
                      >
                        {item.isImage && item.previewUrl ? (
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 relative group">
                            <img
                              src={item.previewUrl}
                              alt={item.file.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-navy-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-navy-950 truncate hover:text-brand-600 transition" title={item.file.name}>
                            {index + 1}. {item.file.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {(item.file.size / (1024 * 1024)).toFixed(2)} MB • {item.isImage ? 'Photo' : 'PDF Document'}
                          </p>
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Preview button for ALL files (PDF & Images) */}
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(index)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 text-[11px] font-bold flex items-center gap-1 border border-slate-200 hover:border-brand-300 transition shadow-2xs"
                          title="Preview document before printing"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-600" />
                          <span>Preview</span>
                        </button>

                        {/* Edit button for images */}
                        {item.isImage && (
                          <button
                            type="button"
                            onClick={() => setEditingFileIndex(index)}
                            className="px-2 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-bold flex items-center gap-1 transition"
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
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-navy-950 disabled:opacity-30 transition"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Reorder Down */}
                        <button
                          type="button"
                          onClick={() => moveFile(index, 'DOWN')}
                          disabled={index === queuedFiles.length - 1}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-navy-950 disabled:opacity-30 transition"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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
              className="w-full py-4 rounded-2xl bg-navy-950 hover:bg-brand-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition"
            >
              <span>Continue to Print Settings ({queuedFiles.length} file{queuedFiles.length === 1 ? '' : 's'})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Print Settings */}
        {currentStep === 2 && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-navy-950 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Files
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPreview(0)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2.5 py-1 rounded-xl border border-brand-200 transition"
                  title="Preview uploaded documents"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Files ({queuedFiles.length})</span>
                </button>
                <span className="text-[11px] font-extrabold text-brand-600 uppercase tracking-wider">
                  Step 2 of 3
                </span>
              </div>
            </div>

            {/* 1. Paper Size */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
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
                        ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                  2. Color Mode
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

            {/* Double-Sided Page Arrangement for 2+ Photos/Documents */}
            {isDuplex && queuedFiles.length >= 2 && (
              <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200/90 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-xs font-black text-navy-950 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-brand-600" />
                      Double-Sided Page Arrangement
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Choose which photo/document prints on Front (Sheet 1) and Back (Sheet 2).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSwapDuplexSides}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-brand-100 text-brand-700 text-xs font-bold border border-brand-300 flex items-center gap-1.5 shadow-2xs transition active:scale-95"
                    title="Swap Front and Back sides"
                  >
                    <span>⇄ Swap Sides (Palat Dein)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* FRONT SIDE (Sheet 1) */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                        Front Side (Samne)
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Page 1</span>
                    </div>

                    <select
                      value={duplexFrontIndex}
                      onChange={(e) => setDuplexFrontIndex(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-navy-950 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {queuedFiles.map((f, idx) => (
                        <option key={f.id} value={idx}>
                          {idx + 1}. {f.file.name} {idx === duplexBackIndex ? '— (Currently Back)' : ''}
                        </option>
                      ))}
                    </select>

                    {queuedFiles[duplexFrontIndex]?.previewUrl ? (
                      <div className="h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center p-1">
                        <img
                          src={queuedFiles[duplexFrontIndex].previewUrl!}
                          alt="Front side preview"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-xs">
                        <FileText className="w-5 h-5 mr-1.5 text-brand-500" />
                        <span className="truncate max-w-[150px]">{queuedFiles[duplexFrontIndex]?.file.name}</span>
                      </div>
                    )}
                  </div>

                  {/* BACK SIDE (Sheet 2) */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Back Side (Piche)
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Page 2</span>
                    </div>

                    <select
                      value={duplexBackIndex}
                      onChange={(e) => setDuplexBackIndex(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-navy-950 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {queuedFiles.map((f, idx) => (
                        <option key={f.id} value={idx}>
                          {idx + 1}. {f.file.name} {idx === duplexFrontIndex ? '— (Currently Front)' : ''}
                        </option>
                      ))}
                    </select>

                    {queuedFiles[duplexBackIndex]?.previewUrl ? (
                      <div className="h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center p-1">
                        <img
                          src={queuedFiles[duplexBackIndex].previewUrl!}
                          alt="Back side preview"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-xs">
                        <FileText className="w-5 h-5 mr-1.5 text-emerald-500" />
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
                <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                  3. Copies per Document
                </label>
                <div className="flex items-center justify-between p-1.5 rounded-2xl border border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setCopies(Math.max(1, copies - 1))}
                    className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-navy-950 font-bold flex items-center justify-center transition shadow-2xs"
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

            {/* 4. Page Range to Print & Special Instructions */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
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
                      ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
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
                      ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
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
                      ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
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
                      ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
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
                      ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
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
                      ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
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
                    className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
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
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50"
              />
            </div>

            {/* Step navigation buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="w-1/3 py-3.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="flex-1 py-3.5 rounded-2xl bg-navy-950 hover:bg-brand-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <span>Review Order</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Submit Order */}
        {currentStep === 3 && (
          <form onSubmit={handleSubmitOrder} className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-navy-950 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Settings
              </button>
              <span className="text-[11px] font-extrabold text-brand-600 uppercase tracking-wider">
                Step 3 of 3
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-navy-950">Review Print Job</h2>
              <p className="text-xs text-slate-500">
                Verify your order details before sending directly to the shop counter.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-500">Documents ({queuedFiles.length}):</span>
                <span className="font-extrabold text-navy-950">
                  {queuedFiles.map((f) => f.file.name).join(', ').slice(0, 35)}
                  {queuedFiles.map((f) => f.file.name).join(', ').length > 35 ? '...' : ''}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Paper Size</span>
                  <span className="font-extrabold text-navy-950">{paperSize}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Color Mode</span>
                  <span className="font-extrabold text-navy-950">{colorMode === 'COLOR' ? 'Color' : 'Black & White'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Duplex</span>
                  <span className="font-extrabold text-navy-950">{isDuplex ? 'Double-Sided' : 'Single-Sided'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Copies per File</span>
                  <span className="font-extrabold text-navy-950">{copies}</span>
                </div>
              </div>

              {/* Duplex Front / Back pairing confirmation */}
              {isDuplex && queuedFiles.length >= 2 && (
                <div className="bg-white p-3 rounded-xl border border-brand-200 text-xs space-y-1">
                  <span className="text-[10px] font-black text-brand-700 uppercase tracking-wider block">
                    Double-Sided Page Arrangement:
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-slate-700">
                    <span><strong>Front (Page 1):</strong> {queuedFiles[duplexFrontIndex]?.file.name}</span>
                    <span><strong>Back (Page 2):</strong> {queuedFiles[duplexBackIndex]?.file.name}</span>
                  </div>
                </div>
              )}

              {customNotes && (
                <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                  <strong>Notes:</strong> {customNotes}
                </div>
              )}

              {/* Document Preview Quick Bar in Step 3 */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Verify Documents to Print
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {queuedFiles.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {item.isImage ? <ImageIcon className="w-3.5 h-3.5 text-brand-500 shrink-0" /> : <FileText className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
                        <span className="truncate font-semibold text-navy-950 text-[11px]">{item.file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(idx)}
                        className="px-2 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center gap-1 shrink-0 ml-2 transition"
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
            <div className="p-4 rounded-2xl bg-brand-50/50 border border-brand-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Estimated Total
                </span>
                <span className="text-xs text-slate-600">
                  {queuedFiles.length} file(s) • {copies} copy each • {colorMode}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-navy-950 font-mono">
                  ₹{estimatedPrice}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full block mt-0.5">
                  Pay at Counter
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={queuedFiles.length === 0 || isSubmitting}
                className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition transform active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending to Shop Counter ({uploadProgress}%)...
                  </>
                ) : (
                  <>
                    <Printer className="w-5 h-5" />
                    <span>Send to Shop Counter</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
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

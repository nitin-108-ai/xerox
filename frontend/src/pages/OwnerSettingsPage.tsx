import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  SlidersHorizontal,
  Building2,
  Clock,
  Trash2,
  Check,
  AlertCircle,
  Save,
  Printer,
  Volume2,
  VolumeX,
  Bell,
  ShieldCheck,
  ShieldAlert,
  Laptop,
  QrCode,
  Lock,
  Users,
  CreditCard,
  RotateCcw,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  Smartphone,
  Eye,
  CheckCircle2,
  X,
  Copy
} from 'lucide-react';
import { OwnerLayout } from '../components/OwnerLayout';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Audio chime generator using browser Web Audio API
function playChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Note 1: 880 Hz (A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.2);

    // Note 2: 1320 Hz (E6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.18, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.38);
  } catch {
    // Audio might require user interaction first
  }
}

export const OwnerSettingsPage: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Shop & Hardware State
  const [shopRecord, setShopRecord] = useState<any>(null);
  const [printers, setPrinters] = useState<any[]>([]);
  const [connector, setConnector] = useState<any>({ isPaired: false, isOnline: false });
  const [copiedUrl, setCopiedUrl] = useState(false);

  // 1. Approval & Automation Mode
  const [approvalMode, setApprovalMode] = useState<'MANUAL' | 'AUTO_ACCEPT' | 'AUTO_PRINT'>('MANUAL');
  const [autoAcceptMaxPages, setAutoAcceptMaxPages] = useState<number>(50);
  const [autoAcceptMaxCopies, setAutoAcceptMaxCopies] = useState<number>(5);
  const [autoPrintConfirmed, setAutoPrintConfirmed] = useState<boolean>(false);

  // 2. Hardware & Printer Defaults
  const [defaultPrinterName, setDefaultPrinterName] = useState<string>('');
  const [supportedPaperSizes, setSupportedPaperSizes] = useState<string[]>(['A4', 'A3', 'LEGAL']);
  const [defaultColorMode, setDefaultColorMode] = useState<'BW' | 'COLOR'>('BW');
  const [defaultDuplex, setDefaultDuplex] = useState<boolean>(false);

  // 3. Audio & Notifications
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [tabAlertsEnabled, setTabAlertsEnabled] = useState<boolean>(true);

  // 4. Payment & Pricing Preferences
  const [paymentPolicy, setPaymentPolicy] = useState<'PAY_AT_COUNTER' | 'ONLINE_ONLY' | 'HYBRID'>('PAY_AT_COUNTER');
  const [minOrderAmount, setMinOrderAmount] = useState<number>(5.00);

  // 5. Document Retention & Privacy
  const [retentionHours, setRetentionHours] = useState<number>(24);

  // 6. Staff & Permissions
  const [staffCanAcceptOrders, setStaffCanAcceptOrders] = useState<boolean>(true);
  const [staffCanReviseQuotes, setStaffCanReviseQuotes] = useState<boolean>(true);
  const [staffCanRejectOrders, setStaffCanRejectOrders] = useState<boolean>(false);
  const [restrictSettingsToOwner, setRestrictSettingsToOwner] = useState<boolean>(true);

  // Snapshot for unsaved changes tracking
  const [initialSettings, setInitialSettings] = useState<any>(null);

  const loadAllSettings = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [shopRes, printersRes] = await Promise.all([
        api.getOwnerShop(),
        api.listPrinters().catch(() => ({ printers: [], connector: null })),
      ]);

      const shop = shopRes.shop;
      setShopRecord(shop);

      const loadedPrinters = printersRes?.printers || [];
      setPrinters(loadedPrinters);
      setConnector(printersRes?.connector || { isPaired: false, isOnline: false });

      // Parse settings_json
      const sj = shop.settings_json && typeof shop.settings_json === 'object'
        ? shop.settings_json
        : (typeof shop.settings_json === 'string' ? JSON.parse(shop.settings_json || '{}') : {});

      // Approval settings
      setApprovalMode((shop.approval_mode as any) || 'MANUAL');
      setAutoAcceptMaxPages(shop.auto_accept_max_pages || 50);
      setAutoAcceptMaxCopies(shop.auto_accept_max_copies || 5);
      setAutoPrintConfirmed(shop.approval_mode === 'AUTO_PRINT');

      // Hardware defaults
      const defPrinter = loadedPrinters.find((p: any) => p.isDefault) || loadedPrinters[0];
      setDefaultPrinterName(sj.defaultPrinterName || defPrinter?.name || '');
      setSupportedPaperSizes(Array.isArray(sj.supportedPaperSizes) ? sj.supportedPaperSizes : ['A4', 'A3', 'LEGAL']);
      setDefaultColorMode(sj.defaultColorMode || 'BW');
      setDefaultDuplex(sj.defaultDuplex === true);

      // Sound & notifications
      setSoundEnabled(sj.soundEnabled !== false);
      setTabAlertsEnabled(sj.tabAlertsEnabled !== false);

      // Payment policy
      setPaymentPolicy((shop.payment_policy as any) || 'PAY_AT_COUNTER');
      setMinOrderAmount(parseFloat(shop.min_order_amount || '5.00'));

      // Retention hours
      setRetentionHours(shop.retention_hours || 24);

      // Staff permissions
      setStaffCanAcceptOrders(sj.staffCanAcceptOrders !== false);
      setStaffCanReviseQuotes(sj.staffCanReviseQuotes !== false);
      setStaffCanRejectOrders(sj.staffCanRejectOrders === true);
      setRestrictSettingsToOwner(sj.restrictSettingsToOwner !== false);

      // Save initial snapshot
      setInitialSettings({
        approvalMode: shop.approval_mode || 'MANUAL',
        autoAcceptMaxPages: shop.auto_accept_max_pages || 50,
        autoAcceptMaxCopies: shop.auto_accept_max_copies || 5,
        autoPrintConfirmed: shop.approval_mode === 'AUTO_PRINT',
        defaultPrinterName: sj.defaultPrinterName || defPrinter?.name || '',
        supportedPaperSizes: Array.isArray(sj.supportedPaperSizes) ? sj.supportedPaperSizes : ['A4', 'A3', 'LEGAL'],
        defaultColorMode: sj.defaultColorMode || 'BW',
        defaultDuplex: sj.defaultDuplex === true,
        soundEnabled: sj.soundEnabled !== false,
        tabAlertsEnabled: sj.tabAlertsEnabled !== false,
        paymentPolicy: shop.payment_policy || 'PAY_AT_COUNTER',
        minOrderAmount: parseFloat(shop.min_order_amount || '5.00'),
        retentionHours: shop.retention_hours || 24,
        staffCanAcceptOrders: sj.staffCanAcceptOrders !== false,
        staffCanReviseQuotes: sj.staffCanReviseQuotes !== false,
        staffCanRejectOrders: sj.staffCanRejectOrders === true,
        restrictSettingsToOwner: sj.restrictSettingsToOwner !== false,
      });
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setErrorMsg(err.message || 'Failed to load shop settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  const hasUnsavedChanges = Boolean(
    initialSettings &&
      (approvalMode !== initialSettings.approvalMode ||
        autoAcceptMaxPages !== initialSettings.autoAcceptMaxPages ||
        autoAcceptMaxCopies !== initialSettings.autoAcceptMaxCopies ||
        defaultPrinterName !== initialSettings.defaultPrinterName ||
        JSON.stringify(supportedPaperSizes) !== JSON.stringify(initialSettings.supportedPaperSizes) ||
        defaultColorMode !== initialSettings.defaultColorMode ||
        defaultDuplex !== initialSettings.defaultDuplex ||
        soundEnabled !== initialSettings.soundEnabled ||
        tabAlertsEnabled !== initialSettings.tabAlertsEnabled ||
        paymentPolicy !== initialSettings.paymentPolicy ||
        minOrderAmount !== initialSettings.minOrderAmount ||
        retentionHours !== initialSettings.retentionHours ||
        staffCanAcceptOrders !== initialSettings.staffCanAcceptOrders ||
        staffCanReviseQuotes !== initialSettings.staffCanReviseQuotes ||
        staffCanRejectOrders !== initialSettings.staffCanRejectOrders ||
        restrictSettingsToOwner !== initialSettings.restrictSettingsToOwner)
  );

  const handleResetSettings = () => {
    if (!initialSettings) return;
    setApprovalMode(initialSettings.approvalMode);
    setAutoAcceptMaxPages(initialSettings.autoAcceptMaxPages);
    setAutoAcceptMaxCopies(initialSettings.autoAcceptMaxCopies);
    setAutoPrintConfirmed(initialSettings.autoPrintConfirmed);
    setDefaultPrinterName(initialSettings.defaultPrinterName);
    setSupportedPaperSizes(initialSettings.supportedPaperSizes);
    setDefaultColorMode(initialSettings.defaultColorMode);
    setDefaultDuplex(initialSettings.defaultDuplex);
    setSoundEnabled(initialSettings.soundEnabled);
    setTabAlertsEnabled(initialSettings.tabAlertsEnabled);
    setPaymentPolicy(initialSettings.paymentPolicy);
    setMinOrderAmount(initialSettings.minOrderAmount);
    setRetentionHours(initialSettings.retentionHours);
    setStaffCanAcceptOrders(initialSettings.staffCanAcceptOrders);
    setStaffCanReviseQuotes(initialSettings.staffCanReviseQuotes);
    setStaffCanRejectOrders(initialSettings.staffCanRejectOrders);
    setRestrictSettingsToOwner(initialSettings.restrictSettingsToOwner);
    setErrorMsg(null);
  };

  const handleTogglePaperSize = (size: string) => {
    if (supportedPaperSizes.includes(size)) {
      if (supportedPaperSizes.length === 1) {
        alert('At least one supported paper size must remain enabled.');
        return;
      }
      setSupportedPaperSizes(supportedPaperSizes.filter((s) => s !== size));
    } else {
      setSupportedPaperSizes([...supportedPaperSizes, size]);
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Safeguard check for Auto-Print
    if (approvalMode === 'AUTO_PRINT' && !autoPrintConfirmed) {
      setErrorMsg('Please confirm the Auto-Print safeguards checkbox before enabling automatic physical printing.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const settingsJson = {
        defaultPrinterName,
        supportedPaperSizes,
        defaultColorMode,
        defaultDuplex,
        soundEnabled,
        tabAlertsEnabled,
        staffCanAcceptOrders,
        staffCanReviseQuotes,
        staffCanRejectOrders,
        restrictSettingsToOwner,
      };

      await api.updateOwnerProfile({
        approvalMode,
        autoAcceptMaxPages: Number(autoAcceptMaxPages),
        autoAcceptMaxCopies: Number(autoAcceptMaxCopies),
        paymentPolicy,
        retentionHours: Number(retentionHours),
        minOrderAmount: Number(minOrderAmount),
        settingsJson,
      });

      setSuccessMsg('Shop settings and counter hardware preferences saved successfully to the database.');
      await loadAllSettings();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Save settings error:', err);
      setErrorMsg(err.message || 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const shopSlug = shopRecord?.slug || user?.slug || 'quickcopy-express';
  const storefrontUrl = `${window.location.origin}/shop/${shopSlug}`;

  const defaultPrinter = printers.find((p) => p.name === defaultPrinterName) || printers[0];

  if (loading) {
    return (
      <OwnerLayout shop={shopRecord} title="Shop Settings">
        <div className="py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading shop counter settings...</p>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout
      shop={shopRecord}
      defaultPrinter={defaultPrinter}
      connector={connector}
      title="Shop & Counter Settings"
      subtitle="Configure order approval automation, printing hardware defaults, audio chimes, and document security."
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
              to="/owner/qr"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
            >
              <QrCode className="w-3.5 h-3.5 text-slate-500" />
              <span>Counter QR</span>
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

        {/* Unsaved Changes Banner */}
        {hasUnsavedChanges && (
          <div className="sticky top-20 z-20 bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-xl bg-amber-100 text-amber-700">
                <AlertCircle className="w-5 h-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-amber-900">You have unsaved configuration changes</p>
                <p className="text-[11px] text-amber-700">Click "Save All Settings" to write changes permanently to the database.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetSettings}
                className="px-3 py-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/50 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Changes
              </button>
              <button
                type="button"
                onClick={() => handleSaveSettings()}
                disabled={saving}
                className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save All Settings
              </button>
            </div>
          </div>
        )}

        {/* Success / Error Alerts */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Settings Form */}
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Section 1: Order Approval & Automation Safeguards */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-glass space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-extrabold text-navy-950 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-brand-600" />
                1. Order Approval &amp; Automation Workflow
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Choose how incoming customer orders are verified before printing. Set safeguard thresholds for automatic acceptance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option A: Manual Approval */}
              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  approvalMode === 'MANUAL'
                    ? 'border-brand-600 bg-brand-50/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-navy-950">Manual Approval</span>
                    <input
                      type="radio"
                      name="approvalMode"
                      value="MANUAL"
                      checked={approvalMode === 'MANUAL'}
                      onChange={() => setApprovalMode('MANUAL')}
                      className="text-brand-600 focus:ring-brand-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Counter staff explicitly inspects each incoming job and clicks Accept before spooling or printing.
                  </p>
                </div>
                <span className="mt-3 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block self-start">
                  Recommended for Quality
                </span>
              </label>

              {/* Option B: Auto-Accept */}
              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  approvalMode === 'AUTO_ACCEPT'
                    ? 'border-brand-600 bg-brand-50/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-navy-950">Auto-Accept Orders</span>
                    <input
                      type="radio"
                      name="approvalMode"
                      value="AUTO_ACCEPT"
                      checked={approvalMode === 'AUTO_ACCEPT'}
                      onChange={() => setApprovalMode('AUTO_ACCEPT')}
                      className="text-brand-600 focus:ring-brand-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Orders within safe size limits immediately move to the active queue with an OTP code generated.
                  </p>
                </div>
                <span className="mt-3 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full inline-block self-start">
                  Speedy Counter Flow
                </span>
              </label>

              {/* Option C: Auto-Print with Safeguards */}
              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  approvalMode === 'AUTO_PRINT'
                    ? 'border-amber-500 bg-amber-50/30 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-navy-950">Auto-Print (Spooler)</span>
                    <input
                      type="radio"
                      name="approvalMode"
                      value="AUTO_PRINT"
                      checked={approvalMode === 'AUTO_PRINT'}
                      onChange={() => setApprovalMode('AUTO_PRINT')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Directly dispatches incoming files to the default Windows printer spooler without manual counter clicks.
                  </p>
                </div>
                <span className="mt-3 text-[10px] font-bold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded-full inline-block self-start">
                  Requires Safeguards
                </span>
              </label>
            </div>

            {/* Automation Thresholds */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Automation Safeguards &amp; Maximum Limits
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Pages for Auto-Approval / Auto-Print
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={autoAcceptMaxPages}
                      onChange={(e) => setAutoAcceptMaxPages(parseInt(e.target.value, 10) || 50)}
                      className="w-28 px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-white shadow-2xs"
                    />
                    <span className="text-xs text-slate-500">pages (Jobs above this need manual review)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Copies for Auto-Approval
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={autoAcceptMaxCopies}
                      onChange={(e) => setAutoAcceptMaxCopies(parseInt(e.target.value, 10) || 5)}
                      className="w-28 px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-white shadow-2xs"
                    />
                    <span className="text-xs text-slate-500">copies (Prevents paper waste on accidental large jobs)</span>
                  </div>
                </div>
              </div>

              {approvalMode === 'AUTO_PRINT' && (
                <div className="pt-3 border-t border-slate-200/80 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="autoPrintCheckbox"
                    checked={autoPrintConfirmed}
                    onChange={(e) => setAutoPrintConfirmed(e.target.checked)}
                    className="mt-0.5 rounded-sm border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="autoPrintCheckbox" className="text-xs text-slate-700 font-medium cursor-pointer">
                    <span className="font-bold text-navy-950">Explicit Auto-Print Safeguard Acknowledgment:</span> I confirm that incoming customer print jobs within the maximum page/copy threshold will directly print on the counter printer without individual approval.
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Hardware & Printer Defaults */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-glass space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-navy-950 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-brand-600" />
                  2. Hardware &amp; Printer Defaults
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Designate your default counter printer and supported paper formats.
                </p>
              </div>
              <Link
                to="/owner/printers"
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>Manage Connected PC</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Default Spooler Printer
                </label>
                <select
                  value={defaultPrinterName}
                  onChange={(e) => setDefaultPrinterName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white shadow-2xs focus:ring-2 focus:ring-brand-500/20"
                >
                  {printers.length > 0 ? (
                    printers.map((p) => (
                      <option key={p.id || p.name} value={p.name}>
                        {p.name} {p.isDefault ? '(Default)' : ''} {p.status === 'READY' ? '• Online' : ''}
                      </option>
                    ))
                  ) : (
                    <option value="">Generic Windows Spooler (Default)</option>
                  )}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Connected Spooler Status: <span className={connector?.isOnline ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>{connector?.isOnline ? '● Windows Connector Online' : '○ Standalone / Manual Mode'}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Default Color Mode for New Jobs
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDefaultColorMode('BW')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      defaultColorMode === 'BW'
                        ? 'border-navy-950 bg-navy-950 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Black &amp; White (B&amp;W)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultColorMode('COLOR')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      defaultColorMode === 'COLOR'
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Full Color</span>
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Supported Paper Sizes at this Counter
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {['A4', 'A3', 'LEGAL', 'LETTER'].map((size) => {
                    const isSelected = supportedPaperSizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleTogglePaperSize(size)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
                          isSelected
                            ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5 text-brand-300" /> : <div className="w-3.5 h-3.5" />}
                        <span>{size}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Only selected sizes will be shown to customers when submitting orders through your counter QR code.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Audio Chime & Notifications */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-glass space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-extrabold text-navy-950 flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-600" />
                3. Sound Alerts &amp; Order Notifications
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure immediate counter alerts when customers submit print jobs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-navy-950">Audio Chime on Incoming Orders</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Plays a crisp counter bell tone whenever a new print order is received.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                </label>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-navy-950">Test Audio Volume</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Test the chime sound on your current PC speakers or counter headphones.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={playChime}
                  className="px-3 py-1.5 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 text-brand-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Test Chime</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Counter Payment & Pricing Preferences */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-glass space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-navy-950 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-brand-600" />
                  4. Pricing &amp; Payment Preferences
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage counter payment policies and minimum order values.
                </p>
              </div>
              <Link
                to="/owner/pricing"
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>Edit Page Rates</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Collection Policy
                </label>
                <select
                  value={paymentPolicy}
                  onChange={(e) => setPaymentPolicy(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white shadow-2xs focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="PAY_AT_COUNTER">Pay at Counter (Cash / Shop UPI QR) — Recommended</option>
                  <option value="ONLINE_ONLY">Online Payment Required First</option>
                  <option value="HYBRID">Hybrid (Customer Chooses Counter or Online)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Most Xerox shops prefer "Pay at Counter" so customers collect documents and pay by cash/UPI directly.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Minimum Order Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.50"
                    min="1"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(parseFloat(e.target.value) || 5.0)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 shadow-2xs"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Orders below this threshold are rounded up to cover paper and minimum handling cost.
                </p>
              </div>
            </div>
          </div>

          {/* Section 5: Document Retention & Privacy */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-glass space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-extrabold text-navy-950 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                5. Document Retention &amp; Privacy Auto-Purge
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Protect customer privacy with automated disk purging. Customer files are permanently erased after this window.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  File Auto-Purge Window
                </label>
                <select
                  value={retentionHours}
                  onChange={(e) => setRetentionHours(parseInt(e.target.value, 10) || 24)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white shadow-2xs"
                >
                  <option value={2}>2 Hours (Strict privacy for high-volume shops)</option>
                  <option value={6}>6 Hours (College / Campus shop standard)</option>
                  <option value={12}>12 Hours (Half day)</option>
                  <option value={24}>24 Hours (Recommended default)</option>
                  <option value={48}>48 Hours (2 Days weekend buffer)</option>
                  <option value={168}>7 Days (168 Hours max)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Once purged, files cannot be reprinted and customer links display an expired notice.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold">Privacy Guarantee</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Uploaded documents are accessible only to this verified shop counter and are never shared with third parties or indexed by search engines.
                </p>
              </div>
            </div>
          </div>

          {/* Section 6: QR Code Management & Storefront Links */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-glass space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-navy-950 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-brand-600" />
                  6. QR Code Management &amp; Counter Posters
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Your permanent QR code is linked to your verified shop counter.
                </p>
              </div>
              <Link
                to="/owner/qr"
                className="px-3 py-1.5 rounded-xl bg-navy-950 text-white text-xs font-bold hover:bg-navy-900 transition flex items-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5 text-brand-300" />
                <span>View Full Poster</span>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="min-w-0">
                <p className="text-xs font-bold text-navy-950 truncate">Permanent Storefront Link:</p>
                <p className="text-xs font-mono text-brand-700 truncate mt-0.5">{storefrontUrl}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(storefrontUrl);
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2000);
                }}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs shrink-0"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied Link!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Section 7: Staff & Counter Permissions */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-glass space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-extrabold text-navy-950 flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-600" />
                7. Staff Permissions &amp; Counter Access
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure what counter operators and assistants can do when accessing this receiving terminal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-navy-950">Allow Staff to Accept &amp; Print Orders</p>
                  <p className="text-[11px] text-slate-500">Can view queue and print customer files.</p>
                </div>
                <input
                  type="checkbox"
                  checked={staffCanAcceptOrders}
                  onChange={(e) => setStaffCanAcceptOrders(e.target.checked)}
                  className="rounded-sm border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </label>

              <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-navy-950">Allow Staff to Revise Quotes</p>
                  <p className="text-[11px] text-slate-500">Can adjust price for custom binding/paper.</p>
                </div>
                <input
                  type="checkbox"
                  checked={staffCanReviseQuotes}
                  onChange={(e) => setStaffCanReviseQuotes(e.target.checked)}
                  className="rounded-sm border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </label>

              <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-navy-950">Allow Staff to Cancel / Reject Orders</p>
                  <p className="text-[11px] text-slate-500">Can decline unprintable documents.</p>
                </div>
                <input
                  type="checkbox"
                  checked={staffCanRejectOrders}
                  onChange={(e) => setStaffCanRejectOrders(e.target.checked)}
                  className="rounded-sm border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </label>

              <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-navy-950">Restrict Settings to Shop Owner</p>
                  <p className="text-[11px] text-slate-500">Only master account can modify rates and hardware.</p>
                </div>
                <input
                  type="checkbox"
                  checked={restrictSettingsToOwner}
                  onChange={(e) => setRestrictSettingsToOwner(e.target.checked)}
                  className="rounded-sm border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </label>
            </div>
          </div>

          {/* Section 8: Security & Trusted Devices */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-glass space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-extrabold text-navy-950 flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-600" />
                8. Security &amp; Trusted Counter Devices
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Monitor logged-in sessions and trusted computer hardware connected to your shop.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy-950 text-white flex items-center justify-center">
                  <Laptop className="w-5 h-5 text-brand-300" />
                </div>
                <div>
                  <p className="text-xs font-bold text-navy-950">Current Counter Terminal Session</p>
                  <p className="text-[11px] text-slate-500">
                    Logged in as: <span className="font-semibold text-slate-700">{user?.email || 'owner@smartxerox.io'}</span> • Role: SHOP_OWNER
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                ● Active Secure Session
              </span>
            </div>
          </div>

          {/* Footer Save Actions */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-glass flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetSettings}
                disabled={!hasUnsavedChanges}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Changes
              </button>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save All Settings
            </button>
          </div>
        </form>
      </div>
    </OwnerLayout>
  );
};

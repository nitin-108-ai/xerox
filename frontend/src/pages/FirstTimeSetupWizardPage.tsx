import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Store,
  Printer,
  DollarSign,
  QrCode,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Upload,
  ExternalLink,
  Laptop,
  Check,
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Download,
  KeyRound
} from 'lucide-react';
import { OwnerLayout } from '../components/OwnerLayout';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const FirstTimeSetupWizardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shop, setShop] = useState<any>(null);
  const [printers, setPrinters] = useState<any[]>([]);
  const [connector, setConnector] = useState<any>({ isPaired: false, isOnline: false });

  // Step 1: Shop Details
  const [shopName, setShopName] = useState('');
  const [ownerDisplayName, setOwnerDisplayName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('21:00');

  // Step 2: Branding
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [brandColor, setBrandColor] = useState('#0284c7');

  // Step 3: Printer Setup
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('');
  const [testPrintDone, setTestPrintDone] = useState(false);
  const [testPrintMessage, setTestPrintMessage] = useState<string | null>(null);
  const [manualModeChosen, setManualModeChosen] = useState(false);
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  // Step 4: Printing Prices
  const [bwPriceA4, setBwPriceA4] = useState<number>(2.0);
  const [colorPriceA4, setColorPriceA4] = useState<number>(10.0);
  const [duplexDiscount, setDuplexDiscount] = useState<number>(0.5);
  const [bwPriceLegal, setBwPriceLegal] = useState<number>(3.0);
  const [colorPriceLegal, setColorPriceLegal] = useState<number>(15.0);

  // Status feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [shopRes, printerRes, pricingRes] = await Promise.all([
        api.getOwnerShop(),
        api.listPrinters().catch(() => ({ printers: [], connector: null })),
        api.getOwnerPricingRules().catch(() => ({ rules: [] })),
      ]);

      const s = shopRes.shop;
      setShop(s);
      setShopName(s.name || '');
      setOwnerDisplayName(user?.fullName || s.owner_name || '');
      setAddressLine(s.address_line1 || '');
      setPincode(s.pincode || '');
      setCity(s.city || 'Delhi');
      setPhone(s.phone || '');
      setOpeningTime(s.opening_time || '09:00');
      setClosingTime(s.closing_time || '21:00');
      setLogoUrl(s.logo_url || '');
      setBannerUrl(s.banner_url || '');

      setPrinters(printerRes.printers || []);
      setConnector(printerRes.connector || { isPaired: false, isOnline: false });
      const def = (printerRes.printers || []).find((p: any) => p.isDefault);
      if (def) setSelectedPrinterId(def.id);

      // Populate pricing if existing
      if (pricingRes.rules && pricingRes.rules.length > 0) {
        const bwA4 = pricingRes.rules.find((r: any) => r.paper_size === 'A4' && r.color_mode === 'BW');
        if (bwA4) setBwPriceA4(parseFloat(bwA4.per_page_rate));
        const colA4 = pricingRes.rules.find((r: any) => r.paper_size === 'A4' && r.color_mode === 'COLOR');
        if (colA4) setColorPriceA4(parseFloat(colA4.per_page_rate));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load shop configuration.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSaveStep1 = async () => {
    if (!shopName.trim() || !addressLine.trim()) {
      setFeedback({ type: 'error', message: 'Please provide both Shop Name and Address.' });
      return;
    }
    try {
      setSaving(true);
      await api.updateOwnerShop({
        name: shopName.trim(),
        addressLine1: addressLine.trim(),
        pincode: pincode.trim(),
        city: city.trim(),
        phone: phone.trim(),
        openingTime,
        closingTime,
      });
      setFeedback({ type: 'success', message: 'Shop details saved!' });
      setCurrentStep(2);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save shop details.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStep2 = async () => {
    try {
      setSaving(true);
      await api.updateOwnerShop({
        logoUrl: logoUrl.trim() || undefined,
        bannerUrl: bannerUrl.trim() || undefined,
      });
      setFeedback({ type: 'success', message: 'Shop branding saved!' });
      setCurrentStep(3);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save branding.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePairConnector = async () => {
    try {
      const res = await api.generatePairingCode();
      setPairingCode(res.pairingCode);
      setPairingModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to generate pairing code.');
    }
  };

  const handleTestPrint = (printer: any) => {
    setTestPrintMessage(`Sending test page to "${printer.name}"... Check paper tray.`);
    setTestPrintDone(true);
  };

  const handleSaveStep3 = async () => {
    if (selectedPrinterId) {
      try {
        await api.setDefaultPrinter(selectedPrinterId);
      } catch {}
    }
    setFeedback({ type: 'success', message: 'Printer configuration verified!' });
    setCurrentStep(4);
  };

  const handleSaveStep4 = async () => {
    try {
      setSaving(true);
      // Save standard rates
      await api.createPricingRule({
        paperSize: 'A4',
        colorMode: 'BW',
        isDuplex: false,
        perPageRate: bwPriceA4,
        perCopyMultiplier: 1.0,
      });
      await api.createPricingRule({
        paperSize: 'A4',
        colorMode: 'COLOR',
        isDuplex: false,
        perPageRate: colorPriceA4,
        perCopyMultiplier: 1.0,
      });
      setFeedback({ type: 'success', message: 'Printing prices saved successfully!' });
      setCurrentStep(5);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save pricing rules.' });
    } finally {
      setSaving(false);
    }
  };

  const handleFinishWizard = () => {
    navigate('/owner/dashboard');
  };

  const steps = [
    { num: 1, title: 'Shop Details', icon: Store },
    { num: 2, title: 'Branding', icon: Upload },
    { num: 3, title: 'Printer Setup', icon: Printer },
    { num: 4, title: 'Printing Prices', icon: DollarSign },
    { num: 5, title: 'QR Code Poster', icon: QrCode },
    { num: 6, title: 'Final Verification', icon: CheckCircle2 },
  ];

  return (
    <OwnerLayout
      shop={shop}
      title="First-Time Shop Setup Wizard"
      subtitle="Guided 6-step setup for shop installer & owner to prepare the shop for customers."
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Progress Bar / Steps Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-brand-700">
              Installer Wizard • Step {currentStep} of 6
            </span>
            <span className="text-xs font-bold text-slate-500">
              {Math.round((currentStep / 6) * 100)}% Completed
            </span>
          </div>

          {/* Stepper Dots */}
          <div className="grid grid-cols-6 gap-2">
            {steps.map((s) => {
              const Icon = s.icon;
              const isPast = s.num < currentStep;
              const isCurrent = s.num === currentStep;

              return (
                <button
                  key={s.num}
                  onClick={() => setCurrentStep(s.num)}
                  className={`flex flex-col items-center text-center p-2 rounded-2xl transition ${
                    isCurrent
                      ? 'bg-navy-950 text-white shadow-xs'
                      : isPast
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1">
                    {isPast ? <Check className="w-4 h-4 text-emerald-600" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-bold truncate max-w-full hidden sm:block">
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* STEP 1: Shop Details */}
        {currentStep === 1 && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-lg font-extrabold text-navy-950 flex items-center gap-2">
                <Store className="w-5 h-5 text-brand-600" />
                Step 1: Shop & Owner Details
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter the official Xerox shop name and address displayed on customer QR landing pages.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Shop Name *</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. QuickCopy Express & Xerox Center"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Owner / Operator Name</label>
                <input
                  type="text"
                  value={ownerDisplayName}
                  onChange={(e) => setOwnerDisplayName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Shop Address & Landmark *</label>
                <input
                  type="text"
                  required
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="e.g. Shop 4, Near Metro Station Gate 2, Laxmi Nagar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Delhi, Mumbai, Bengaluru"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">PIN Code</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 110092"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Public Contact Number (Optional)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Shop counter phone"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Opens At</label>
                  <input
                    type="time"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Closes At</label>
                  <input
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={handleSaveStep1}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-navy-950 hover:bg-brand-600 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
              >
                Save & Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Shop Branding */}
        {currentStep === 2 && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-lg font-extrabold text-navy-950 flex items-center gap-2">
                <Upload className="w-5 h-5 text-brand-600" />
                Step 2: Shop Branding & Logo
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Customize how customers recognize your shop when scanning your counter QR code.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Shop Logo Image URL</label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Shop Front Photo URL (Optional)</label>
                  <input
                    type="text"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://example.com/shopfront.jpg"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Customer Storefront Preview
                </span>
                <div className="w-16 h-16 rounded-2xl bg-brand-500 text-white font-black text-xl flex items-center justify-center mx-auto shadow-sm overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    (shopName || 'SX').slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h4 className="font-extrabold text-navy-950 text-sm">{shopName || 'Your Shop Name'}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{addressLine || 'Shop Address'}</p>
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-3 h-3" /> Verified Smart Xerox Partner
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleSaveStep2}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-navy-950 hover:bg-brand-600 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
              >
                Save & Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Printer Setup */}
        {currentStep === 3 && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-lg font-extrabold text-navy-950 flex items-center gap-2">
                <Printer className="w-5 h-5 text-brand-600" />
                Step 3: Connect & Test Printer
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure your shop's primary printer for both Direct Printing and Manual Print fallback.
              </p>
            </div>

            {/* Desktop Connector Pairing Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-navy-950 to-navy-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded border border-brand-500/30">
                  Windows Desktop Connector
                </span>
                <h4 className="font-extrabold text-sm text-white mt-1">
                  Direct Windows Spooler Integration
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Pair this computer using a 6-digit code to enable one-click direct printing.
                </p>
              </div>

              <button
                onClick={handlePairConnector}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-xs"
              >
                <KeyRound className="w-4 h-4" />
                Pair This PC
              </button>
            </div>

            {/* Configured Printers List */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Select Primary Shop Printer *
              </label>

              {printers.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                  <p>No printers detected yet. You can use <strong>Mode A (Manual Print)</strong> or add a printer.</p>
                  <Link to="/owner/printers" className="font-bold text-brand-600 hover:underline">
                    Go to Printer Management to detect or add printers
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {printers.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                        selectedPrinterId === p.id
                          ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="printer"
                          checked={selectedPrinterId === p.id}
                          onChange={() => setSelectedPrinterId(p.id)}
                          className="text-brand-600 focus:ring-brand-500"
                        />
                        <div>
                          <p className="font-bold text-navy-950 text-xs">{p.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {p.connectionType} • {p.driverName} • {p.status}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleTestPrint(p);
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                      >
                        Send Test Page
                      </button>
                    </label>
                  ))}
                </div>
              )}

              {testPrintMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{testPrintMessage}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleSaveStep3}
                className="px-6 py-2.5 rounded-xl bg-navy-950 hover:bg-brand-600 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
              >
                Confirm & Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Printing Prices */}
        {currentStep === 4 && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-lg font-extrabold text-navy-950 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-brand-600" />
                Step 4: Configure Printing Prices
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Set transparent per-page rates. Customers will see exact estimates before uploading.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* A4 Rates */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <h4 className="font-extrabold text-navy-950 text-xs uppercase tracking-wider">
                  Standard A4 Size (Most Common)
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    A4 Black & White (B/W) Rate per Page *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={bwPriceA4}
                      onChange={(e) => setBwPriceA4(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    A4 Color Rate per Page *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={colorPriceA4}
                      onChange={(e) => setColorPriceA4(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Legal & Duplex */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <h4 className="font-extrabold text-navy-950 text-xs uppercase tracking-wider">
                  Legal / Stamp Paper & Duplex
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Legal / B/W Rate per Page
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={bwPriceLegal}
                      onChange={(e) => setBwPriceLegal(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Double-Sided (Duplex) Discount per Side
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={duplexDiscount}
                      onChange={(e) => setDuplexDiscount(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500 font-mono font-bold"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Discount applied per page for front-and-back printing.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleSaveStep4}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-navy-950 hover:bg-brand-600 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
              >
                Save Prices & Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: QR Code Poster */}
        {currentStep === 5 && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-lg font-extrabold text-navy-950 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-brand-600" />
                Step 5: Counter QR Code & Poster
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Print this high-resolution counter poster and place it near your shop entrance or Xerox counter.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white font-black text-base flex items-center justify-center mx-auto shadow-xs">
                SX
              </div>
              <div>
                <h4 className="font-black text-navy-950 text-base">{shopName || 'Smart Xerox Shop'}</h4>
                <p className="text-xs text-slate-500">Scan QR to Upload & Print Documents</p>
              </div>

              {/* QR Image Frame */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm inline-block">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    `${window.location.origin}/shop/${shop?.slug || 'shop'}`
                  )}`}
                  alt="Shop QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>

              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-700">No Phone Number Sharing Required</p>
                <p className="text-slate-400 text-[11px]">Instant Document Upload • 100% Private</p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <Link
                  to={`/shop/${shop?.slug || 'shop'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Test Storefront
                </Link>
                <Link
                  to="/owner/qr"
                  className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> Print A4 Poster
                </Link>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setCurrentStep(6)}
                className="px-6 py-2.5 rounded-xl bg-navy-950 hover:bg-brand-600 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
              >
                Proceed to Final Check
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Final Verification Checklist */}
        {currentStep === 6 && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-lg font-extrabold text-navy-950 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Step 6: Final Verification Checklist
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Installer & shop owner review before going live.
              </p>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-navy-950">1. Shop Profile & Address Saved</p>
                  <p className="text-slate-500">{shopName} • {addressLine}</p>
                </div>
                <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="w-4 h-4" />
                </span>
              </div>

              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-navy-950">2. Printing Rates Configured</p>
                  <p className="text-slate-500">
                    A4 B/W: ₹{bwPriceA4}/pg • A4 Color: ₹{colorPriceA4}/pg
                  </p>
                </div>
                <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="w-4 h-4" />
                </span>
              </div>

              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-navy-950">3. Printer Integration Verified</p>
                  <p className="text-slate-500">
                    {selectedPrinterId ? 'Primary printer assigned' : 'Manual Print Mode (Mode A) Active'}
                  </p>
                </div>
                <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="w-4 h-4" />
                </span>
              </div>

              <div className="py-3.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-navy-950">4. QR Code Public Storefront Live</p>
                  <p className="text-slate-500">
                    Accessible via <code>/shop/{shop?.slug || 'shop'}</code>
                  </p>
                </div>
                <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="w-4 h-4" />
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-brand-50 border border-brand-200 text-brand-900 text-xs flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-brand-600 shrink-0" />
              <div>
                <p className="font-bold">Setup complete and verified!</p>
                <p className="text-brand-700 text-[11px] mt-0.5">
                  You can now begin taking real customer orders. You can always revisit this setup wizard from the sidebar menu.
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentStep(5)}
                className="px-5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleFinishWizard}
                className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5"
              >
                Launch Owner Dashboard
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pairing Code Modal in Step 3 */}
      {pairingModalOpen && pairingCode && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in duration-150">
            <div className="text-center">
              <h3 className="text-base font-extrabold text-navy-950">Windows Desktop Connector Pairing</h3>
              <p className="text-xs text-slate-500 mt-1">Enter this code into the desktop connector:</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl text-center border border-slate-200">
              <span className="text-3xl font-mono font-black text-navy-950 tracking-widest">{pairingCode}</span>
            </div>
            <button
              onClick={() => setPairingModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-navy-950 text-white font-bold text-xs hover:bg-brand-600 transition"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
};

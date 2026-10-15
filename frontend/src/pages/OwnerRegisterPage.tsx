import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const OwnerRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Wizard steps: 'DETAILS' -> 'VERIFY_OTP' -> 'QR_POSTER'
  const [step, setStep] = useState<'DETAILS' | 'VERIFY_OTP' | 'QR_POSTER'>('DETAILS');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    shopName: '',
    shopAddress: '',
    businessHours: '8:30 AM - 9:30 PM',
    logoUrl: '',
    registrationNumber: '',
  });

  // OTP state
  const [otp, setOtp] = useState('');
  const [isDevMode, setIsDevMode] = useState(true);
  const [testOtp, setTestOtp] = useState('842190');
  const [countdown, setCountdown] = useState(60);

  // Completed shop state for Step 3
  const [registeredShop, setRegisteredShop] = useState<{
    shopId: string;
    shopName: string;
    slug: string;
    publicUrl: string;
    qrDataUrl: string;
    token: string;
    user: any;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Countdown timer for OTP
  useEffect(() => {
    let timer: any;
    if (step === 'VERIFY_OTP' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Step 1 -> Step 2: Request verification OTP
  const handleProceedToOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shopName || !formData.fullName || !formData.phoneNumber || !formData.email) {
      setError('Please fill in all required fields (Shop Name, Owner Name, Phone, and Email).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.sendOtp({
        phoneNumber: formData.phoneNumber,
        email: formData.email,
      });

      setIsDevMode(res.isDevMode ?? true);
      if (res.testOtp) {
        setTestOtp(res.testOtp);
      }
      setCountdown(60);
      setStep('VERIFY_OTP');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please check your contact details.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> Step 3: Verify OTP and Register Shop
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        otp: otp.trim(),
      };

      const res = await api.verifyOtp(payload);

      // Successfully verified and created shop
      const shopId = res.user?.shopId || `shp-${Date.now().toString(36)}`;
      const slug = res.user?.slug || formData.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const origin = window.location.origin;
      const publicUrl = `${origin}/s/${shopId}`;

      // Generate scannable high-res QR code
      const qrDataUrl = await QRCode.toDataURL(publicUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 600,
        color: {
          dark: '#0B192C',
          light: '#FFFFFF',
        },
      });

      // Save user session for trusted device persistence
      login(res.token, res.user);

      setRegisteredShop({
        shopId,
        shopName: formData.shopName,
        slug,
        publicUrl,
        qrDataUrl,
        token: res.token,
        user: res.user,
      });

      setStep('QR_POSTER');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPublicLink = () => {
    if (!registeredShop) return;
    navigator.clipboard.writeText(registeredShop.publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!registeredShop) return;
    const link = document.createElement('a');
    link.href = registeredShop.qrDataUrl;
    link.download = `SmartXerox-${registeredShop.shopName.replace(/\s+/g, '_')}-Counter-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPoster = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 text-xs font-bold text-slate-500">
        <div className={`flex items-center gap-1.5 ${step === 'DETAILS' ? 'text-brand-600 font-extrabold' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'DETAILS' ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            1
          </span>
          <span>Shop Profile</span>
        </div>
        <div className="w-8 h-0.5 bg-slate-200" />
        <div className={`flex items-center gap-1.5 ${step === 'VERIFY_OTP' ? 'text-brand-600 font-extrabold' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'VERIFY_OTP' ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            2
          </span>
          <span>Verify Ownership</span>
        </div>
        <div className="w-8 h-0.5 bg-slate-200" />
        <div className={`flex items-center gap-1.5 ${step === 'QR_POSTER' ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'QR_POSTER' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            3
          </span>
          <span>Counter QR Code</span>
        </div>
      </div>

      {/* STEP 1: SHOP & OWNER DETAILS */}
      {step === 'DETAILS' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-elevated space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-navy-900 text-white flex items-center justify-center mx-auto shadow-md">
              <Building2 className="w-6 h-6 text-brand-300" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
              Register Your Xerox &amp; Print Shop
            </h1>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Set up your shop once. Enter your phone and email to generate your permanent counter QR code. No complex passwords or recurring logins needed.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleProceedToOtp} className="space-y-4">
            {/* Shop Details */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                Shop Name *
              </label>
              <input
                type="text"
                name="shopName"
                required
                placeholder="e.g. Metro Xerox &amp; Digital Color Lab"
                value={formData.shopName}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                  Owner Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                  Owner Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="owner@metroprint.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                Verification Phone Number *
              </label>
              <input
                type="tel"
                name="phoneNumber"
                required
                placeholder="+91 98000 00000"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                🔒 Privacy Guarantee: Your phone number and email are kept private for platform verification and are never shared with customers.
              </span>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                Shop Address (Optional)
              </label>
              <input
                type="text"
                name="shopAddress"
                placeholder="e.g. Shop 4B, Metro Station Plaza, Commercial Gate 1"
                value={formData.shopAddress}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                  Business Hours (Optional)
                </label>
                <input
                  type="text"
                  name="businessHours"
                  placeholder="8:30 AM - 9:30 PM"
                  value={formData.businessHours}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                  Shop Logo URL (Optional)
                </label>
                <input
                  type="url"
                  name="logoUrl"
                  placeholder="https://example.com/logo.png"
                  value={formData.logoUrl}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 text-blue-900 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-brand-600" />
                <span>Device-Bound Authentication</span>
              </div>
              <p className="text-[11px] text-blue-800">
                After verifying your phone/email once, your counter terminal and owner device are recognized automatically. No daily passwords required.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-98 disabled:bg-slate-300"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Verification Code...
                </>
              ) : (
                <>
                  <span>Continue to One-Time Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 text-center text-xs text-slate-500">
            Already verified a shop on this device?{' '}
            <Link to="/owner/dashboard" className="font-bold text-brand-600 hover:underline">
              Go to Receiving Panel
            </Link>
          </div>
        </div>
      )}

      {/* STEP 2: ONE-TIME OTP VERIFICATION */}
      {step === 'VERIFY_OTP' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-elevated space-y-6 animate-in fade-in zoom-in-95 duration-150">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-navy-950">
              Verify Shop Ownership
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Enter the 6-digit verification code to confirm ownership of <strong>{formData.phoneNumber}</strong> and <strong>{formData.email}</strong>.
            </p>
          </div>

          {/* Development / Test Mode Banner */}
          {isDevMode && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Development / Test Mode Active
                </span>
                <span className="text-[10px] bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                  Safe Sandbox
                </span>
              </div>
              <p className="text-[11px] text-amber-800">
                Live SMS/Email gateway credentials are not configured in this environment. Use test OTP: <strong className="font-mono text-xs text-amber-950">{testOtp}</strong>.
              </p>
              <button
                type="button"
                onClick={() => setOtp(testOtp)}
                className="px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-xs transition"
              >
                Auto-fill Test Code ({testOtp})
              </button>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2 text-center">
              <label className="block text-xs font-bold text-navy-950 uppercase tracking-wider">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="842190"
                className="w-48 mx-auto text-center font-mono font-black text-2xl tracking-widest py-3 border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-slate-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-98"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying &amp; Generating QR...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  Verify &amp; Generate Counter QR
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => setStep('DETAILS')}
                className="text-slate-500 hover:text-slate-700 font-semibold flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change Contact Details
              </button>

              <button
                type="button"
                disabled={countdown > 0}
                onClick={handleProceedToOtp}
                className="text-brand-600 hover:text-brand-700 disabled:text-slate-400 font-bold transition"
              >
                {countdown > 0 ? `Resend Code in ${countdown}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: INSTANT COUNTER QR CODE & ONBOARDING COMPLETE */}
      {step === 'QR_POSTER' && registeredShop && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-elevated space-y-6 animate-in fade-in zoom-in-95 duration-150">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <Check className="w-7 h-7" />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Verified &amp; Active
            </span>
            <h2 className="text-2xl font-black text-navy-950 pt-1">
              Your Counter QR Code is Ready!
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Customers can scan this QR with their normal phone camera to send documents directly to your shop. No registration, login, or phone number needed.
            </p>
          </div>

          {/* Printable Counter Poster Card */}
          <div className="printable-poster bg-slate-50/80 rounded-3xl p-6 border-2 border-slate-200 text-center space-y-4 max-w-sm mx-auto shadow-sm">
            <div className="space-y-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-600">
                Smart Xerox • Direct Print
              </span>
              <h3 className="text-lg font-black text-navy-950 leading-tight">
                {registeredShop.shopName}
              </h3>
              <p className="text-[11px] text-slate-500">Scan to Print Instantly • Zero App Required</p>
            </div>

            {/* Real Scannable QR Code */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs inline-block">
              <img
                src={registeredShop.qrDataUrl}
                alt={`${registeredShop.shopName} Counter QR`}
                className="w-48 h-48 mx-auto"
              />
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-mono text-slate-400">
                Permanent Shop ID: <strong className="text-slate-700">{registeredShop.shopId}</strong>
              </div>
              <div className="text-xs font-mono text-brand-700 truncate bg-white px-3 py-1 rounded-xl border border-slate-200 select-all">
                {registeredShop.publicUrl}
              </div>
            </div>
          </div>

          {/* Poster Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleDownloadQr}
              className="py-3 px-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
            >
              <Download className="w-4 h-4 text-brand-600" />
              Download QR (PNG)
            </button>

            <button
              type="button"
              onClick={handlePrintPoster}
              className="py-3 px-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
            >
              <Printer className="w-4 h-4 text-navy-900" />
              Print Counter Poster
            </button>
          </div>

          {/* Copy Public Link */}
          <div className="max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleCopyPublicLink}
              className="w-full py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? 'Permanent Link Copied!' : 'Copy Permanent Shop Link'}
            </button>
          </div>

          {/* Enter Receiving Panel */}
          <div className="pt-2 border-t border-slate-100 max-w-sm mx-auto">
            <button
              type="button"
              onClick={() => navigate('/owner/dashboard')}
              className="w-full py-4 rounded-2xl bg-navy-950 hover:bg-brand-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition transform active:scale-98"
            >
              <span>Open Live Receiving Panel &amp; Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              🔒 This device is now authorized as a trusted terminal.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

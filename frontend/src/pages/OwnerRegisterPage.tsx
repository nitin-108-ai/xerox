import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  Building2,
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
  Sparkles
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
    setError(null);

    if (!formData.shopName.trim() || !formData.fullName.trim() || !formData.email.trim() || !formData.phoneNumber.trim()) {
      setError('Please fill in all required fields (Shop Name, Owner Name, Email, Phone Number).');
      return;
    }

    setLoading(true);
    try {
      const res = await api.requestOwnerOtp({
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim(),
        shopName: formData.shopName.trim(),
      });

      if (res.isDevMode && res.testOtp) {
        setIsDevMode(true);
        setTestOtp(res.testOtp);
        setOtp(res.testOtp);
      }

      setCountdown(60);
      setStep('VERIFY_OTP');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please check your contact details.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> Step 3: Verify OTP and finalize shop registration
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOwnerOtpAndRegister({
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim(),
        otp: otp.trim(),
        shopName: formData.shopName.trim(),
        fullName: formData.fullName.trim(),
        shopAddress: formData.shopAddress.trim(),
        businessHours: formData.businessHours.trim(),
        logoUrl: formData.logoUrl.trim(),
      });

      // Save session credentials
      login(res.token, res.user);

      // Generate scannable QR data URL
      const publicUrl = `${window.location.origin}/shop/${res.shop.slug}`;
      const qrDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      setRegisteredShop({
        shopId: res.shop.id,
        shopName: res.shop.name,
        slug: res.shop.slug,
        publicUrl,
        qrDataUrl,
        token: res.token,
        user: res.user,
      });

      setStep('QR_POSTER');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code. Please try again.');
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
    link.download = `${registeredShop.slug}-counter-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPoster = () => {
    window.print();
  };

  return (
    <div className="bg-[#080d09] min-h-screen text-slate-100 font-outfit max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 text-xs font-bold text-slate-400">
        <div className={`flex items-center gap-1.5 ${step === 'DETAILS' ? 'text-[#bbf451] font-extrabold' : 'text-slate-500'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'DETAILS' ? 'bg-[#bbf451] text-[#0a120c] font-black' : 'bg-[#18261c] text-slate-400'}`}>
            1
          </span>
          <span>Shop Profile</span>
        </div>
        <div className="w-8 h-0.5 bg-[#233526]" />
        <div className={`flex items-center gap-1.5 ${step === 'VERIFY_OTP' ? 'text-[#bbf451] font-extrabold' : 'text-slate-500'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'VERIFY_OTP' ? 'bg-[#bbf451] text-[#0a120c] font-black' : 'bg-[#18261c] text-slate-400'}`}>
            2
          </span>
          <span>Verify Ownership</span>
        </div>
        <div className="w-8 h-0.5 bg-[#233526]" />
        <div className={`flex items-center gap-1.5 ${step === 'QR_POSTER' ? 'text-emerald-400 font-extrabold' : 'text-slate-500'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'QR_POSTER' ? 'bg-emerald-500 text-white' : 'bg-[#18261c] text-slate-400'}`}>
            3
          </span>
          <span>Counter QR Code</span>
        </div>
      </div>

      {/* STEP 1: SHOP & OWNER DETAILS */}
      {step === 'DETAILS' && (
        <div className="bg-gradient-to-b from-[#152317] via-[#101b12] to-[#0c140e] rounded-[36px] p-6 sm:p-10 border border-[#273d2c] shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#162719] to-[#25422b] border border-[#3b6243] text-[#bbf451] flex items-center justify-center mx-auto shadow-lg">
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-syne">
              Register Your Xerox &amp; Print Shop
            </h1>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Set up your shop once. Enter your phone and email to generate your permanent counter QR code. No complex passwords or recurring logins needed.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleProceedToOtp} className="space-y-4">
            {/* Shop Details */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Shop Name *
              </label>
              <input
                type="text"
                name="shopName"
                required
                placeholder="e.g. Metro Xerox &amp; Digital Color Lab"
                value={formData.shopName}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs border border-[#263c29] rounded-xl focus:outline-none focus:border-[#bbf451] bg-[#0c140e] text-white placeholder-slate-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Owner Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#263c29] rounded-xl focus:outline-none focus:border-[#bbf451] bg-[#0c140e] text-white placeholder-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Owner Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="owner@metroprint.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#263c29] rounded-xl focus:outline-none focus:border-[#bbf451] bg-[#0c140e] text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Verification Phone Number *
              </label>
              <input
                type="tel"
                name="phoneNumber"
                required
                placeholder="+91 98000 00000"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs border border-[#263c29] rounded-xl focus:outline-none focus:border-[#bbf451] bg-[#0c140e] text-white placeholder-slate-500"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                🔒 Privacy Guarantee: Your phone number and email are kept private for platform verification and are never shared with customers.
              </span>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Shop Address (Optional)
              </label>
              <input
                type="text"
                name="shopAddress"
                placeholder="e.g. Shop 4B, Metro Station Plaza, Commercial Gate 1"
                value={formData.shopAddress}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs border border-[#263c29] rounded-xl focus:outline-none focus:border-[#bbf451] bg-[#0c140e] text-white placeholder-slate-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Business Hours (Optional)
                </label>
                <input
                  type="text"
                  name="businessHours"
                  placeholder="8:30 AM - 9:30 PM"
                  value={formData.businessHours}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#263c29] rounded-xl focus:outline-none focus:border-[#bbf451] bg-[#0c140e] text-white placeholder-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Shop Logo URL (Optional)
                </label>
                <input
                  type="url"
                  name="logoUrl"
                  placeholder="https://example.com/logo.png"
                  value={formData.logoUrl}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs border border-[#263c29] rounded-xl focus:outline-none focus:border-[#bbf451] bg-[#0c140e] text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#111e14] border border-[#243928] text-slate-300 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-[#bbf451]" />
                <span>Device-Bound Authentication</span>
              </div>
              <p className="text-[11px] text-slate-400">
                After verifying your phone/email once, your counter terminal and owner device are recognized automatically. No daily passwords required.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-full bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] font-black text-xs shadow-xl shadow-[#bbf451]/20 flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#0a120c]" />
                  <span>Generating Verification Code...</span>
                </>
              ) : (
                <>
                  <span>Continue to One-Time Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-[#1f3122] text-center text-xs text-slate-400">
            Already verified a shop on this device?{' '}
            <Link to="/owner/dashboard" className="font-bold text-[#bbf451] hover:underline">
              Go to Receiving Panel
            </Link>
          </div>
        </div>
      )}

      {/* STEP 2: ONE-TIME OTP VERIFICATION */}
      {step === 'VERIFY_OTP' && (
        <div className="bg-gradient-to-b from-[#152317] via-[#101b12] to-[#0c140e] rounded-[36px] p-6 sm:p-10 border border-[#273d2c] shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-md">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-syne">
              Verify Shop Ownership
            </h2>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Enter the 6-digit verification code to confirm ownership of <strong>{formData.phoneNumber}</strong> and <strong>{formData.email}</strong>.
            </p>
          </div>

          {/* Development / Test Mode Banner */}
          {isDevMode && (
            <div className="p-4 rounded-2xl bg-[#1e190e] border border-amber-500/30 text-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-amber-300">
                  <Sparkles className="w-4 h-4" />
                  Development / Test Mode Active
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                  Safe Sandbox
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Live SMS/Email gateway credentials are not configured in this environment. Use test OTP: <strong className="font-mono text-xs text-[#bbf451]">{testOtp}</strong>.
              </p>
              <button
                type="button"
                onClick={() => setOtp(testOtp)}
                className="px-3.5 py-1.5 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] font-black text-xs transition"
              >
                Auto-fill Test Code ({testOtp})
              </button>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2 text-center">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="842190"
                className="w-48 mx-auto text-center font-mono font-black text-2xl tracking-widest py-3 border-2 border-[#2b4230] rounded-2xl focus:outline-none focus:border-[#bbf451] bg-[#0c140e] text-[#bbf451]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-4 rounded-full bg-[#bbf451] hover:bg-[#cbff5e] disabled:bg-[#18261b] disabled:text-slate-500 text-[#0a120c] font-black text-xs shadow-xl shadow-[#bbf451]/20 flex items-center justify-center gap-2 transition active:scale-98"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#0a120c]" />
                  <span>Verifying &amp; Generating QR...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 text-[#0a120c]" />
                  <span>Verify &amp; Generate Counter QR</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => setStep('DETAILS')}
                className="text-slate-400 hover:text-white font-semibold flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change Contact Details
              </button>

              <button
                type="button"
                disabled={countdown > 0}
                onClick={handleProceedToOtp}
                className="text-[#bbf451] hover:underline disabled:text-slate-500 font-bold transition"
              >
                {countdown > 0 ? `Resend Code in ${countdown}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: INSTANT COUNTER QR CODE & ONBOARDING COMPLETE */}
      {step === 'QR_POSTER' && registeredShop && (
        <div className="bg-gradient-to-b from-[#152317] via-[#101b12] to-[#0c140e] rounded-[36px] p-6 sm:p-10 border border-[#273d2c] shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-[#bbf451]/15 border-2 border-[#bbf451]/30 text-[#bbf451] flex items-center justify-center mx-auto shadow-md">
              <Check className="w-7 h-7" />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#bbf451] bg-[#1a2d1d] px-3 py-1 rounded-full border border-[#2a462f]">
              Verified &amp; Active
            </span>
            <h2 className="text-2xl font-black text-white pt-1 font-syne">
              Your Counter QR Code is Ready!
            </h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Customers can scan this QR with their normal phone camera to send documents directly to your shop. No registration, login, or phone number needed.
            </p>
          </div>

          {/* Printable Counter Poster Card */}
          <div className="printable-poster bg-white rounded-3xl p-6 border-2 border-slate-300 text-center space-y-4 max-w-sm mx-auto shadow-xl text-slate-900">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#102214] bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Smart Xerox • Direct Print
              </span>
              <h3 className="text-lg font-black text-navy-950 leading-tight pt-1">
                {registeredShop.shopName}
              </h3>
              <p className="text-[11px] text-slate-600">Scan to Print Instantly • Zero App Required</p>
            </div>

            {/* Real Scannable QR Code */}
            <div className="bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-md inline-block">
              <img
                src={registeredShop.qrDataUrl}
                alt={`${registeredShop.shopName} Counter QR`}
                className="w-48 h-48 mx-auto"
              />
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-mono text-slate-500">
                Permanent Shop ID: <strong className="text-slate-900">{registeredShop.shopId}</strong>
              </div>
              <div className="text-xs font-mono text-brand-700 truncate bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 select-all">
                {registeredShop.publicUrl}
              </div>
            </div>
          </div>

          {/* Poster Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleDownloadQr}
              className="py-3 px-4 rounded-full bg-[#162418] border border-[#2b4431] hover:bg-[#203423] text-white font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4 text-[#bbf451]" />
              <span>Download QR (PNG)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPoster}
              className="py-3 px-4 rounded-full bg-[#162418] border border-[#2b4431] hover:bg-[#203423] text-white font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Printer className="w-4 h-4 text-[#bbf451]" />
              <span>Print Counter Poster</span>
            </button>
          </div>

          {/* Copy Public Link */}
          <div className="max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleCopyPublicLink}
              className="w-full py-2.5 rounded-full border border-[#233526] hover:bg-[#142017] text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              {copiedLink ? <Check className="w-4 h-4 text-[#bbf451]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Permanent Link Copied!' : 'Copy Permanent Shop Link'}</span>
            </button>
          </div>

          {/* Enter Receiving Panel */}
          <div className="pt-2 border-t border-[#1f3122] max-w-sm mx-auto">
            <button
              type="button"
              onClick={() => navigate('/owner/dashboard')}
              className="w-full py-4 rounded-full bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-[#bbf451]/20 transition transform active:scale-98"
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

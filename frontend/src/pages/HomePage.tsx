import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Printer,
  QrCode,
  ShieldCheck,
  Lock,
  Trash2,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Building2,
  FileText,
  Smartphone,
  EyeOff
} from 'lucide-react';

interface HomePageProps {
  onOpenScanner: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenScanner }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-brand-50/60 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Top Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200/80 text-brand-700 text-xs font-semibold shadow-xs">
              <EyeOff className="w-3.5 h-3.5" />
              <span>100% Private Document Printing — No Phone Number Required</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-navy-950 tracking-tight leading-[1.12]">
              Scan. Send. Print.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-navy-700">
                Keep Your Privacy.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Tired of sending Aadhaar cards, legal agreements, and personal resumes to random shop owners over WhatsApp?
              Smart Xerox connects you to verified Xerox centers through instant QR codes with automatic document deletion.
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              <button
                type="button"
                onClick={onOpenScanner}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-navy-900 hover:bg-brand-600 text-white font-semibold text-sm shadow-elevated transition-all flex items-center justify-center gap-2 group"
              >
                <QrCode className="w-4 h-4 text-brand-300 group-hover:text-white" />
                Scan Counter QR Code
              </button>

              <Link
                to="/shop/quickcopy-express"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-navy-900 font-semibold text-sm border border-slate-300 shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                Try Demo Storefront
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Zero Guest Registration
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Auto-Purge in 24 Hours
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Malware Sanitization
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Demo Shops Quick Access Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-glass">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-600" />
                Verified Local Shops (Ready for Orders)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select any verified photocopy center below to test the instant guest order workflow.
              </p>
            </div>
            <Link
              to="/owner/register"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              Are you a Xerox shop owner? Register here <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shop 1 Card */}
            <div className="p-5 rounded-xl border border-slate-200 hover:border-brand-500 bg-slate-50/50 hover:bg-white transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    Verified Partner
                  </span>
                  <span className="text-xs text-slate-500 font-mono">₹2.00 / B&W page</span>
                </div>
                <h4 className="text-base font-bold text-navy-900 group-hover:text-brand-600 transition-colors">
                  QuickCopy Express Xerox & Print
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  124 Commercial Plaza, Near City Metro Gate 2, Sector 18
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">A4 & A3 Laser</span>
                  <span className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">Color Xerox</span>
                  <span className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">Spiral Binding</span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">Hours: 8:00 AM - 10:00 PM</span>
                <Link
                  to="/shop/quickcopy-express"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-navy-900 text-white group-hover:bg-brand-600 transition-colors flex items-center gap-1.5"
                >
                  Open Storefront <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Shop 2 Card */}
            <div className="p-5 rounded-xl border border-slate-200 hover:border-brand-500 bg-slate-50/50 hover:bg-white transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    Verified Partner
                  </span>
                  <span className="text-xs text-slate-500 font-mono">₹2.50 / B&W page</span>
                </div>
                <h4 className="text-base font-bold text-navy-900 group-hover:text-brand-600 transition-colors">
                  Metro Document Hub & Scanning
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  45 North Avenue, IT Tech Park Complex, Floor 1
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">High-Speed Digital</span>
                  <span className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">Bulk Scanning</span>
                  <span className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">Lamination</span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">Hours: 9:00 AM - 9:00 PM</span>
                <Link
                  to="/shop/metro-doc-hub"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-navy-900 text-white group-hover:bg-brand-600 transition-colors flex items-center gap-1.5"
                >
                  Open Storefront <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Workflow Steps */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
            Frictionless Dispatch
          </span>
          <h2 className="text-3xl font-extrabold text-navy-950 tracking-tight mt-3">
            How Smart Xerox Works
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            A three-minute private workflow designed specifically for busy physical photocopy centers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg mb-4 border border-brand-100">
              01
            </div>
            <h3 className="text-base font-bold text-navy-900 mb-2">Scan Counter QR</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every verified shop displays a unique counter QR poster. Point your phone camera to load their storefront without downloading any app.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg mb-4 border border-brand-100">
              02
            </div>
            <h3 className="text-base font-bold text-navy-900 mb-2">Configure Print</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload PDF, JPG, or PNG files. Select paper size (A4, A3, Legal), B&W or Color, duplex (double-sided), and number of copies.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg mb-4 border border-brand-100">
              03
            </div>
            <h3 className="text-base font-bold text-navy-900 mb-2">Get Order Token</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Receive a random non-sequential order code (e.g. SX-7K9M) and cryptographic tracking token. Track real-time print status.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg mb-4 border border-emerald-100">
              04
            </div>
            <h3 className="text-base font-bold text-navy-900 mb-2">Collect & Purge</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Show your counter OTP to collect your documents. All uploaded files are permanently purged according to published retention policy.
            </p>
          </div>
        </div>
      </section>

      {/* Security Pillars Deep Dive */}
      <section className="bg-navy-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-300 bg-white/10 px-3 py-1 rounded-full">
              Engineered for Sensitivity
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight mt-3">
              Why Bluetooth & WhatsApp Printing Are Risky
            </h2>
            <p className="text-sm text-slate-300 mt-2">
              Walk-in customers commonly expose phone numbers, profile photos, and permanent chat media to strangers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-navy-800/80 p-6 rounded-2xl border border-navy-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <EyeOff className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">No Contact Info Exposure</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Guest orders require zero personal credentials. Shop owners only see an anonymous alias (e.g. Guest #4192) and your technical print preferences.
              </p>
            </div>

            <div className="bg-navy-800/80 p-6 rounded-2xl border border-navy-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center border border-brand-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Private Storage Isolation</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Documents are stored outside the public web root. Shop owners can only stream sandboxed previews during printing; administrative users have no unrestricted browsing.
              </p>
            </div>

            <div className="bg-navy-800/80 p-6 rounded-2xl border border-navy-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Guaranteed Auto-Purging</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                A background lifecycle job verifies and physically wipes document bytes upon order completion or retention expiration, leaving no residual traces.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Shop Owners Call to Action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 rounded-3xl p-8 sm:p-12 text-white shadow-elevated border border-navy-800 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-400 bg-brand-500/10 border border-brand-500/20 px-3 py-1 rounded-full">
              For Photocopy & Xerox Centers
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Modernize Your Xerox Shop Counter
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Stop having 50 customers asking for your personal WhatsApp number every hour.
              Print a Smart Xerox counter poster, receive jobs cleanly organized in your dashboard, adjust quotes on the fly, and speed up queues.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Link
              to="/owner/register"
              className="px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md transition-all flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              Register Your Shop
            </Link>
            <Link
              to="/owner/login"
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all"
            >
              Owner Login
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

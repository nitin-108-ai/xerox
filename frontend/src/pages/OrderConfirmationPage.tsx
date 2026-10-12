import React, { useState } from 'react';
import { useLocation, useParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  ArrowRight,
  Clock,
  Printer,
  Key,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

export const OrderConfirmationPage: React.FC = () => {
  const { reference } = useParams<{ reference: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const orderData = location.state?.order;
  const shopData = location.state?.shop;

  const orderRef = reference || orderData?.orderReference || 'SX-CONFIRMED';
  const token = orderData?.orderAccessToken;
  const trackingUrl = orderData?.trackingUrl || `/track/${orderRef}${token ? `?token=${token}` : ''}`;
  const fullTrackingUrl = `${window.location.origin}${trackingUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullTrackingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      {/* Success Badge Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-elevated p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-200/80 shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Order Submitted to Counter
          </span>
          <h1 className="text-3xl font-extrabold text-navy-950 tracking-tight mt-2.5">
            Print Job Dispatched!
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {shopData?.name ? `Sent directly to ${shopData.name}` : 'Sent directly to verified Xerox shop'}
          </p>
        </div>

        {/* Order Reference & OTP Highlight Box */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Order Reference
            </div>
            <div className="text-xl sm:text-2xl font-mono font-extrabold text-navy-950 mt-1">
              {orderRef}
            </div>
          </div>

          <div className="border-l border-slate-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Counter Pickup OTP
            </div>
            <div className="text-xl sm:text-2xl font-mono font-extrabold text-brand-600 mt-1">
              {orderData?.pickupOtp || '----'}
            </div>
          </div>
        </div>

        {/* Secret Tracking Link Box */}
        <div className="bg-navy-900 text-white rounded-2xl p-6 text-left space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Key className="w-4 h-4" />
              Private Tracking Link & Access Token
            </span>
            <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded">
              High Entropy Secret
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Because Smart Xerox never asked for your phone number or email, this encrypted URL is your unique key to track status, approve revised quotes, or cancel your order.
          </p>

          <div className="flex items-center gap-2 bg-navy-950 p-2 rounded-xl border border-navy-800">
            <input
              type="text"
              readOnly
              value={fullTrackingUrl}
              className="flex-1 bg-transparent text-xs text-brand-200 font-mono focus:outline-none px-2 truncate"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1 shrink-0 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Link
            to={trackingUrl}
            className="flex-1 py-3.5 px-6 rounded-xl font-bold text-sm bg-navy-900 hover:bg-brand-600 text-white shadow-elevated flex items-center justify-center gap-2 transition-all"
          >
            Open Live Order Tracker
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Retention Policy Footer */}
        <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>
            {orderData?.retentionNotice || 'File will be automatically wiped from disk post-pickup.'}
          </span>
        </div>
      </div>
    </div>
  );
};

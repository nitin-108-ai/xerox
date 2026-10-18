import React, { useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  Printer,
  Key
} from 'lucide-react';

export const OrderConfirmationPage: React.FC = () => {
  const { reference } = useParams<{ reference: string }>();
  const location = useLocation();
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
    <div className="bg-[#080d09] min-h-screen text-slate-100 font-outfit py-12 px-4 flex items-center justify-center">
      {/* Success Badge Banner */}
      <div className="bg-gradient-to-b from-[#152317] via-[#101b12] to-[#0c140e] rounded-[36px] border border-[#273d2c] shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-8 sm:p-10 text-center space-y-6 max-w-xl w-full">
        <div className="w-16 h-16 rounded-full bg-[#bbf451]/15 text-[#bbf451] flex items-center justify-center mx-auto border-2 border-[#bbf451]/30 shadow-lg">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#bbf451] bg-[#1a2d1d] px-3.5 py-1 rounded-full border border-[#2a462f]">
            Directly Received at Counter
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight mt-3 font-syne">
            Print Job Dispatched!
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            {shopData?.name ? `Sent directly to ${shopData.name}` : 'Sent directly to verified Xerox shop counter'}
          </p>
        </div>

        {/* Order Reference & OTP Highlight Box */}
        <div className="bg-[#101911] rounded-2xl p-6 border border-[#223525] grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Order Reference
            </div>
            <div className="text-xl sm:text-2xl font-mono font-black text-white mt-1">
              {orderRef}
            </div>
          </div>

          <div className="border-l border-[#223525]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Counter Pickup OTP
            </div>
            <div className="text-xl sm:text-2xl font-mono font-black text-[#0a120c] bg-[#bbf451] px-3 py-0.5 rounded-lg inline-block mt-1">
              {orderData?.pickupOtp || '----'}
            </div>
          </div>
        </div>

        {/* Secret Tracking Link Box */}
        <div className="bg-[#121c13] text-white rounded-2xl p-5 sm:p-6 text-left space-y-3 border border-[#233526]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#bbf451] flex items-center gap-1.5 uppercase tracking-wider">
              <Key className="w-4 h-4" />
              Private Tracking Link &amp; Access Token
            </span>
            <span className="text-[10px] bg-[#1a2c1d] text-slate-300 px-2.5 py-0.5 rounded-full border border-[#29422f]">
              Encrypted Key
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Smart Xerox never asked for your phone number. This encrypted URL is your unique key to track status, approve revised quotes, or cancel your order.
          </p>

          <div className="flex items-center gap-2 bg-[#0a120b] p-2 rounded-xl border border-[#1e2f22]">
            <input
              type="text"
              readOnly
              value={fullTrackingUrl}
              className="flex-1 bg-transparent text-xs text-[#bbf451] font-mono focus:outline-none px-2 truncate"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] flex items-center gap-1 shrink-0 transition"
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
            className="flex-1 py-4 px-6 rounded-full font-black text-xs bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] shadow-xl shadow-[#bbf451]/20 flex items-center justify-center gap-2 transition hover:scale-[1.01]"
          >
            <span>Open Live Order Tracker</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Retention Policy Footer */}
        <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
          <ShieldCheck className="w-4 h-4 text-[#bbf451]" />
          <span>
            {orderData?.retentionNotice || 'File will be automatically wiped from disk post-pickup.'}
          </span>
        </div>
      </div>
    </div>
  );
};

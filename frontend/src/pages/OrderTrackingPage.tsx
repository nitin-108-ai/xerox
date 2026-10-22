import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  Printer,
  PackageCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Send,
  MessageSquare,
  ShieldCheck,
  Key,
  Trash2,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { OrderStatus } from '../types';

function safeFormatDate(val: any, fallback = '24 hours'): string {
  if (!val) return fallback;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? fallback : d.toLocaleString();
  } catch {
    return fallback;
  }
}

function safeFormatTime(val: any): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export const OrderTrackingPage: React.FC = () => {
  const { reference } = useParams<{ reference: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenFromUrl = searchParams.get('token') || '';
  const [token, setToken] = useState<string>(tokenFromUrl);
  const [inputToken, setInputToken] = useState<string>('');

  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat message state
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Search input state if user navigated to /track without reference
  const [inputReference, setInputReference] = useState('');

  const activeRef = reference || '';

  // Audio notification chime and vibration for status progress
  const playStatusChime = () => {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch {}

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  const prevStatusRef = React.useRef<string | null>(null);
  const prevMessageCount = React.useRef<number>(0);

  // Auto-recover token if user navigated directly without token query param
  useEffect(() => {
    if (!token && activeRef) {
      try {
        const stored = JSON.parse(localStorage.getItem('smart_xerox_offline_orders') || '[]');
        const match = stored.find(
          (o: any) => o.order_reference === activeRef || o.orderReference === activeRef || o.id === activeRef
        );
        if (match && (match.orderAccessToken || match.order_access_token)) {
          const recoveredToken = match.orderAccessToken || match.order_access_token;
          setToken(recoveredToken);
          navigate(`/track/${activeRef}?token=${encodeURIComponent(recoveredToken)}`, { replace: true });
        }
      } catch {}
    }
  }, [activeRef, token, navigate]);

  // Load order data and poll every 3 seconds for real-time status updates
  useEffect(() => {
    if (!activeRef) {
      setLoading(false);
      return;
    }

    if (!token) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchTracking() {
      try {
        const data = await api.trackOrder(activeRef, token);
        if (!isMounted) return;

        // Check if status advanced to play chime
        const currentStatus = data?.order?.status;
        if (prevStatusRef.current && currentStatus && prevStatusRef.current !== currentStatus) {
          playStatusChime();
        }
        prevStatusRef.current = currentStatus;

        // Play chime if new message from shopkeeper
        const currentMsgCount = data?.messages?.length || 0;
        if (prevMessageCount.current > 0 && currentMsgCount > prevMessageCount.current) {
          const lastMsg = data.messages[data.messages.length - 1];
          if (lastMsg && (lastMsg.sender_role === 'SHOP_OWNER' || lastMsg.senderRole === 'SHOP_OWNER')) {
            playStatusChime();
          }
        }
        prevMessageCount.current = currentMsgCount;

        setOrderData(data);
        setError(null);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Unable to access order tracking.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchTracking();
    const interval = setInterval(fetchTracking, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeRef, token]);

  const handleApproveQuote = async () => {
    if (!activeRef || !token) return;
    setActionLoading(true);
    try {
      await api.approveQuote(activeRef, token);
      const data = await api.trackOrder(activeRef, token);
      setOrderData(data);
    } catch (err: any) {
      alert(err.message || 'Failed to approve quotation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!activeRef || !token) return;
    if (!confirm('Are you sure you want to cancel this print order?')) return;

    setActionLoading(true);
    try {
      await api.cancelOrder(activeRef, token);
      const data = await api.trackOrder(activeRef, token);
      setOrderData(data);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeRef || !token) return;

    setSendingMessage(true);
    try {
      await api.sendOrderMessage(activeRef, token, messageText.trim());
      setMessageText('');
      const data = await api.trackOrder(activeRef, token);
      setOrderData(data);
    } catch (err: any) {
      alert(err.message || 'Failed to send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputReference.trim()) return;
    navigate(`/track/${encodeURIComponent(inputReference.trim())}${inputToken.trim() ? `?token=${encodeURIComponent(inputToken.trim())}` : ''}`);
    setToken(inputToken.trim());
  };

  // If no reference in URL, show lookup form
  if (!activeRef) {
    return (
      <div className="bg-[#080d09] min-h-screen text-slate-100 font-outfit max-w-md mx-auto px-4 py-16 space-y-6 flex items-center justify-center">
        <div className="bg-gradient-to-b from-[#152317] via-[#101b12] to-[#0c140e] rounded-[36px] p-8 border border-[#273d2c] shadow-2xl text-center space-y-5 w-full">
          <div className="w-14 h-14 rounded-2xl bg-[#162719] border border-[#2f4a34] text-[#bbf451] flex items-center justify-center mx-auto shadow-md">
            <Printer className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white font-syne">Track Your Print Order</h1>
          <p className="text-xs text-slate-300">
            Enter the Order Reference and your private Access Token from your confirmation screen.
          </p>

          <form onSubmit={handleLookupSubmit} className="space-y-3.5 text-left pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Order Reference *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SX-7K9M-2026"
                value={inputReference}
                onChange={(e) => setInputReference(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono border border-[#273d2c] rounded-xl focus:outline-none focus:border-[#bbf451] bg-[#101911] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Private Access Token *
              </label>
              <input
                type="text"
                required
                placeholder="Paste the secret token from your confirmation link"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono border border-[#273d2c] rounded-xl focus:outline-none focus:border-[#bbf451] bg-[#101911] text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] font-black text-xs transition shadow-xl shadow-[#bbf451]/20 mt-2"
            >
              Access Secure Order Tracker
            </button>
          </form>

          {/* Quick Demo Order Link */}
          <div className="pt-4 border-t border-[#1f3122] text-center">
            <span className="text-[11px] text-slate-400 block mb-2">Want to test tracking right away?</span>
            <Link
              to="/track/SX-7K9M-2026?token=tok_secure_test_token_customer_001"
              className="text-xs font-bold text-[#bbf451] hover:underline inline-flex items-center gap-1"
            >
              Open Seed Demo Order (SX-7K9M-2026) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If reference provided but missing token
  if (!token) {
    return (
      <div className="bg-[#080d09] min-h-screen text-slate-100 font-outfit max-w-md mx-auto px-4 py-16 flex items-center justify-center">
        <div className="bg-gradient-to-b from-[#152317] via-[#101b12] to-[#0c140e] rounded-[36px] p-8 border border-[#273d2c] shadow-2xl text-center space-y-4 w-full">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <Key className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white font-syne">Security Token Required</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Order Reference <strong>{activeRef}</strong> is protected. Knowing an order reference alone never grants access to documents or status details.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputToken.trim()) {
                setToken(inputToken.trim());
                navigate(`/track/${encodeURIComponent(activeRef)}?token=${encodeURIComponent(inputToken.trim())}`);
              }
            }}
            className="space-y-3 pt-2 text-left"
          >
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Enter Order Access Token:
              </label>
              <input
                type="text"
                required
                placeholder="Paste the secret token"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono border border-[#273d2c] rounded-xl focus:outline-none focus:border-[#bbf451] bg-[#101911] text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] text-xs font-black transition shadow-xl shadow-[#bbf451]/20"
            >
              Verify Token &amp; Unlock Order
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[#080d09] min-h-screen text-slate-100 font-outfit flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#bbf451] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Decrypting order tracking data...</p>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="bg-[#080d09] min-h-screen text-slate-100 font-outfit max-w-md mx-auto px-4 py-20 text-center flex items-center justify-center">
        <div className="bg-[#121c14] rounded-3xl border border-[#233526] p-8 w-full shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white font-syne">Access Denied or Not Found</h2>
          <p className="text-xs text-slate-400">{error || 'Could not verify token.'}</p>
          <button
            type="button"
            onClick={() => navigate('/track')}
            className="px-5 py-2.5 bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] text-xs font-black rounded-full transition"
          >
            Try Another Order
          </button>
        </div>
      </div>
    );
  }

  const order = orderData?.order || {};
  const shop = orderData?.shop || {
    name: order?.shop_name || 'QuickCopy Express Xerox & Digital Print',
    address: order?.shop_address || '124 Commercial Plaza, Near City Metro Gate 2, Sector 18'
  };
  const items = Array.isArray(orderData?.items) ? orderData.items : [];
  const docMeta = orderData?.document || null;
  const history = Array.isArray(orderData?.history) ? orderData.history : [];
  const messages = Array.isArray(orderData?.messages) ? orderData.messages : [];

  const isCancellable = ['SUBMITTED', 'ACCEPTED', 'AWAITING_APPROVAL'].includes(order?.status);
  const isAwaitingApproval = order?.status === 'AWAITING_APPROVAL';

  // Status Stepper Steps
  const steps: Array<{ status: OrderStatus; label: string; sublabel: string; icon: any }> = [
    { status: 'SUBMITTED', label: 'Order Placed', sublabel: 'Arrived at Counter (Live)', icon: Clock },
    { status: 'ACCEPTED', label: 'Shop Accepted', sublabel: 'Approved by Staff', icon: CheckCircle2 },
    { status: 'PRINTING', label: 'Printing', sublabel: 'Processing on Machine', icon: Printer },
    { status: 'READY_FOR_PICKUP', label: 'Ready for Pickup', sublabel: 'At Dispatch Counter', icon: PackageCheck },
    { status: 'COMPLETED', label: 'Completed', sublabel: 'Handed Over', icon: CheckCircle2 },
  ];

  const getStepIndex = (st: OrderStatus) => {
    switch (st) {
      case 'SUBMITTED': return 0;
      case 'ACCEPTED':
      case 'AWAITING_APPROVAL': return 1;
      case 'PRINTING': return 2;
      case 'READY_FOR_PICKUP': return 3;
      case 'COMPLETED': return 4;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(order?.status || 'SUBMITTED');

  return (
    <div className="bg-[#080d09] min-h-screen text-slate-100 font-outfit max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-b from-[#152317] via-[#101b12] to-[#0c140e] rounded-[32px] p-6 sm:p-8 border border-[#273d2c] shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
              REF: {order?.orderReference || order?.order_reference || activeRef}
            </span>
            <StatusBadge status={order?.status || 'SUBMITTED'} size="lg" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-syne">
            Order Status Tracking
          </h1>
          <p className="text-xs text-slate-300">
            Dispatch Center: <strong className="text-white">{shop?.name || 'QuickCopy Express Xerox & Digital Print'}</strong> • {shop?.address || 'Digital Print Counter'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {isCancellable && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleCancelOrder}
              className="px-4 py-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
              title="Cancel this order before printing starts"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Cancel Order</span>
            </button>
          )}

          {/* Counter OTP Badge */}
          <div className="bg-[#101911] border border-[#233526] p-4 rounded-2xl text-center shrink-0 min-w-[160px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Counter Pickup OTP
            </div>
            <div className="text-2xl font-mono font-black text-[#bbf451] tracking-wider mt-0.5">
              {order?.pickupOtp || order?.pickup_otp || '----'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Provide to counter staff
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Quotation Revision Alert */}
      {isAwaitingApproval && (
        <div className="bg-[#1f190e] border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-amber-300 font-syne">
                Action Required: Shop Revised Quotation to ₹{order.finalAmount}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                <strong>Shop Reason:</strong> {order.quotationNote || 'Custom options / heavy paper option surcharge.'}
              </p>
              <p className="text-[11px] text-amber-400/80 mt-1">
                Per platform security rules, the shop will NOT begin printing until you approve this revised total.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleApproveQuote}
              className="px-5 py-2.5 rounded-full bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] font-black text-xs shadow-md transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve Revised Quotation (₹{order.finalAmount})</span>
            </button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={handleCancelOrder}
              className="px-4 py-2.5 rounded-full border border-amber-500/40 bg-[#16120b] hover:bg-[#20180d] text-amber-300 font-semibold text-xs transition"
            >
              Decline &amp; Cancel Order
            </button>
          </div>
        </div>
      )}

      {/* Live Stage Status Announcement Banner */}
      {order.status === 'SUBMITTED' && (
        <div className="bg-[#151c14] border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-xl flex items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <h3 className="text-sm sm:text-base font-black text-white font-syne">
                  Order Received — Waiting for Shopkeeper to Accept
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Your print job has arrived at <strong>{shop?.name || 'the shop counter'}</strong>. Counter staff is reviewing the documents. This page updates live automatically without refresh.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isCancellable && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancelOrder}
                className="px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Cancel</span>
              </button>
            )}
            <span className="hidden md:inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Live 3s Polling
            </span>
          </div>
        </div>
      )}

      {order.status === 'ACCEPTED' && (
        <div className="bg-[#0f1d1e] border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-xl flex items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="text-sm sm:text-base font-black text-white font-syne">
                  🎉 Order Approved &amp; Accepted by Shopkeeper!
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                The counter staff verified your documents and approved the print job. It is queued and printing will begin shortly.
              </p>
            </div>
          </div>
          <span className="hidden md:inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
            Approved
          </span>
        </div>
      )}

      {(order.status === 'PRINTING' || order.status === 'QUEUED') && (
        <div className="bg-[#151524] border-2 border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-xl flex items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <Printer className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                <h3 className="text-sm sm:text-base font-black text-white font-syne">
                  🖨️ Printing in Hardware Spooler...
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Your sheets are physically printing on the shop machine. They will be ready for pickup in a moment.
              </p>
            </div>
          </div>
          <span className="hidden md:inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
            Printing
          </span>
        </div>
      )}

      {order.status === 'READY_FOR_PICKUP' && (
        <div className="bg-[#0e2115] border-2 border-[#bbf451]/50 rounded-3xl p-5 sm:p-6 shadow-xl flex items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#bbf451]/20 text-[#bbf451] border border-[#bbf451]/30 flex items-center justify-center shrink-0 shadow-xs">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#bbf451] animate-ping" />
                <h3 className="text-sm sm:text-base font-black text-white font-syne">
                  ✨ Your Prints are Ready for Counter Pickup!
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Collect your prints from counter staff. Show Security OTP: <strong className="font-mono text-[#0a120c] bg-[#bbf451] px-2.5 py-0.5 rounded-md font-bold">{order?.pickupOtp || order?.pickup_otp || '----'}</strong>
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Counter OTP</span>
            <span className="font-mono font-black text-xl text-[#bbf451]">{order?.pickupOtp || order?.pickup_otp || '----'}</span>
          </div>
        </div>
      )}

      {order.status === 'COMPLETED' && (
        <div className="bg-[#0d1d17] border-2 border-emerald-500/50 rounded-3xl p-5 sm:p-6 shadow-xl flex items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white font-syne">
                🎉 Handover Confirmed &amp; Completed!
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Your printed documents have been successfully verified and handed over at the counter. Thank you for using Smart Xerox!
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            Handover Confirmed
          </span>
        </div>
      )}

      {/* Stepper Progress Bar */}
      {order.status !== 'CANCELLED' ? (
        <div className="bg-[#101911] rounded-3xl p-6 sm:p-8 border border-[#213524] shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {steps.map((st, idx) => {
              const Icon = st.icon;
              const isPast = currentIndex > idx;
              const isCurrent = currentIndex === idx;

              return (
                <div key={st.status} className="relative flex md:flex-col items-center gap-3 text-left md:text-center">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                      isPast
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : isCurrent
                        ? 'bg-[#bbf451] text-[#0a120c] border-[#bbf451] shadow-lg ring-4 ring-[#bbf451]/20'
                        : 'bg-[#152218] text-slate-500 border-[#243727]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div
                      className={`text-xs font-bold ${
                        isCurrent ? 'text-[#bbf451]' : isPast ? 'text-white' : 'text-slate-500'
                      }`}
                    >
                      {st.label}
                    </div>
                    <span
                      className={`text-[10px] font-medium block mt-0.5 ${
                        isCurrent ? 'text-[#bbf451]' : isPast ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {st.sublabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 flex items-center gap-3 text-rose-300 text-xs">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <strong>Order Cancelled:</strong> {order.cancellationReason || 'This order was cancelled.'}
          </div>
        </div>
      )}

      {/* Two-Column Detail View: Items/Document & Live Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Order Details & Document Auto-Purge Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Summary */}
          <div className="bg-[#101911] rounded-3xl p-6 border border-[#213524] shadow-2xl space-y-4">
            <h3 className="text-xs font-bold text-[#bbf451] uppercase tracking-wider">
              Document &amp; Print Specifications
            </h3>

            {items && items.map((it: any, idx: number) => (
              <div key={idx} className="bg-[#142217] border border-[#253928] rounded-2xl p-4 text-xs space-y-2">
                <div className="flex justify-between items-center font-bold text-white">
                  <span>{docMeta?.originalFilename || 'Uploaded Document'}</span>
                  <span className="font-mono text-[#bbf451]">₹{it.item_price}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-400 text-[11px]">
                  <div>Size: <strong className="text-white">{it.paper_size}</strong></div>
                  <div>Mode: <strong className="text-white">{it.color_mode === 'BW' ? 'Black & White' : 'Color'}</strong></div>
                  <div>Sides: <strong className="text-white">{it.is_duplex ? 'Double-Sided' : 'Single'}</strong></div>
                  <div>Copies: <strong className="text-white">{it.copies}</strong></div>
                </div>
                {it.custom_notes && (
                  <div className="bg-[#0f1811] p-2.5 rounded-xl border border-[#203222] text-slate-300 text-[11px]">
                    <strong>Instructions:</strong> {it.custom_notes}
                  </div>
                )}
              </div>
            ))}

            {/* Retention & Lifecycle Banner */}
            <div className="bg-[#0f1d14] border border-[#223928] rounded-2xl p-4 text-xs flex items-start gap-3">
              <Trash2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Zero Residual Storage Policy:</strong>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  {docMeta?.isDeleted
                    ? 'This document has already been permanently wiped from disk.'
                    : `Document is queued for physical disk purge at ${safeFormatDate(docMeta?.autoDeleteAt)}.`}
                </p>
              </div>
            </div>

            {/* Cancel Button if eligible */}
            {isCancellable && (
              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={actionLoading}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:underline"
                >
                  Cancel this print order
                </button>
              </div>
            )}
          </div>

          {/* Status Timeline History */}
          <div className="bg-[#101911] rounded-3xl p-6 border border-[#213524] shadow-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Audit Event Timeline
            </h3>
            <div className="space-y-3">
              {history && history.map((h: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-[#bbf451] mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-white">{h.new_status}</span>
                    <span className="text-slate-400 text-[11px] ml-2 font-mono">
                      {safeFormatTime(h.created_at)}
                    </span>
                    {h.note && (
                      <p className="text-slate-300 text-[11px] mt-0.5">{h.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Private In-Order Chat */}
        <div className="bg-[#101911] rounded-3xl border border-[#213524] shadow-2xl flex flex-col h-[520px] overflow-hidden">
          <div className="px-6 py-4 bg-[#142217] border-b border-[#243928] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#bbf451]" />
              <h3 className="text-xs font-bold uppercase tracking-wider font-syne">Private Order Chat</h3>
            </div>
            <span className="text-[10px] bg-[#1d3021] text-slate-300 px-2.5 py-0.5 rounded-full border border-[#2c4731]">
              Zero WhatsApp
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0c140e]">
            {messages && messages.length > 0 ? (
              messages.map((m: any) => {
                const isCustomer = m.sender_role === 'CUSTOMER';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-slate-400 font-medium mb-1">
                      {isCustomer ? 'You' : (shop?.name || 'Shop Counter')} • {safeFormatTime(m.created_at)}
                    </span>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        isCustomer
                          ? 'bg-[#bbf451] text-[#0a120c] font-semibold rounded-br-xs'
                          : 'bg-[#162418] border border-[#263c29] text-white rounded-bl-xs shadow-sm'
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <MessageSquare className="w-8 h-8 text-slate-500 mb-2" />
                <p className="text-xs font-bold text-white">Need to clarify something?</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ask the shop owner directly here without giving out your WhatsApp number.
                </p>
              </div>
            )}
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 bg-[#101911] border-t border-[#213524] flex gap-2">
            <input
              type="text"
              placeholder="Ask a question about your print job..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="flex-1 px-3.5 py-2.5 text-xs border border-[#253928] rounded-full focus:outline-none focus:border-[#bbf451] bg-[#0c140e] text-white placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={sendingMessage || !messageText.trim()}
              className="px-4 py-2.5 bg-[#bbf451] hover:bg-[#cbff5e] disabled:bg-[#1b2b1d] disabled:text-slate-500 text-[#0a120c] font-bold rounded-full transition shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

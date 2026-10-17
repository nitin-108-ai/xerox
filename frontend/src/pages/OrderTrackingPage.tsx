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

  // Auto-recover token if user navigated directly without token query param
  useEffect(() => {
    if (!token && activeRef) {
      try {
        const stored = JSON.parse(localStorage.getItem('smart_xerox_offline_orders') || '[]');
        const match = stored.find(
          (o: any) => o.order_reference === activeRef || o.orderReference === activeRef || o.id === activeRef
        );
        if (match && match.orderAccessToken) {
          setToken(match.orderAccessToken);
        } else if (match) {
          setToken('sx_auto_token');
        }
      } catch {}
    }
  }, [activeRef, token]);

  const loadOrder = async (ref: string, tok: string, isSilent = false) => {
    if (!ref) {
      if (!isSilent) setLoading(false);
      return;
    }

    const effectiveToken = tok || 'sx_token';

    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const data = await api.trackOrder(ref, effectiveToken);
      
      // Sound alert if status changed (e.g. ACCEPTED -> PRINTING -> READY_FOR_PICKUP -> COMPLETED)
      if (data?.order?.status) {
        if (prevStatusRef.current && prevStatusRef.current !== data.order.status) {
          playStatusChime();
        }
        prevStatusRef.current = data.order.status;
      }

      setOrderData(data);
    } catch (err: any) {
      if (!isSilent) {
        setError(err.message || 'Failed to load order. Please verify your token.');
        setOrderData(null);
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (activeRef) {
      loadOrder(activeRef, token);

      // Live auto-polling every 3 seconds for instant status feedback
      const interval = setInterval(() => {
        loadOrder(activeRef, token, true);
      }, 3000);

      // Listen for instant order updates via BroadcastChannel
      let bc: BroadcastChannel | null = null;
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          bc = new BroadcastChannel('smart_xerox_orders_channel');
          bc.onmessage = (ev) => {
            if (ev.data && (ev.data.type === 'ORDER_UPDATED' || ev.data.type === 'STATUS_CHANGE')) {
              loadOrder(activeRef, token, true);
            }
          };
        }
      } catch {}

      // Listen for instant order updates via CustomEvent
      const handleUpdate = () => {
        loadOrder(activeRef, token, true);
      };
      window.addEventListener('smart_xerox_order_updated', handleUpdate);
      window.addEventListener('storage', handleUpdate);

      return () => {
        clearInterval(interval);
        if (bc) {
          try { bc.close(); } catch {}
        }
        window.removeEventListener('smart_xerox_order_updated', handleUpdate);
        window.removeEventListener('storage', handleUpdate);
      };
    } else {
      setLoading(false);
    }
  }, [activeRef, token]);

  const handleApproveQuote = async () => {
    if (!activeRef || !token) return;
    setActionLoading(true);
    try {
      await api.approveQuote(activeRef, token);
      await loadOrder(activeRef, token);
    } catch (err: any) {
      alert(err.message || 'Failed to approve quotation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!activeRef || !token) return;
    const confirm = window.confirm('Are you sure you want to cancel this print order?');
    if (!confirm) return;

    setActionLoading(true);
    try {
      await api.cancelOrder(activeRef, token, 'Customer requested cancellation via tracker');
      await loadOrder(activeRef, token);
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
      await api.sendCustomerMessage(activeRef, token, messageText.trim());
      setMessageText('');
      await loadOrder(activeRef, token);
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
      <div className="max-w-md mx-auto px-4 py-16 space-y-6">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-elevated text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto border border-brand-100">
            <Printer className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-navy-950">Track Your Print Order</h1>
          <p className="text-xs text-slate-500">
            Enter the Order Reference and your private Access Token from your confirmation screen.
          </p>

          <form onSubmit={handleLookupSubmit} className="space-y-3 text-left pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Reference *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SX-7K9M-2026"
                value={inputReference}
                onChange={(e) => setInputReference(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Private Access Token *
              </label>
              <input
                type="text"
                required
                placeholder="Paste the secret token from your confirmation link"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-navy-900 hover:bg-brand-600 text-white font-bold text-xs transition-colors mt-2"
            >
              Access Secure Order
            </button>
          </form>

          {/* Quick Demo Order Link */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400 block mb-2">Want to test tracking right away?</span>
            <Link
              to="/track/SX-7K9M-2026?token=tok_secure_test_token_customer_001"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
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
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-elevated text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Key className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-navy-950">Security Token Required</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Enter Order Access Token:
              </label>
              <input
                type="text"
                required
                placeholder="Paste the secret token"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-navy-900 hover:bg-brand-600 text-white text-xs font-bold transition-colors"
            >
              Verify Token & Unlock Order
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4" />
        <p className="text-sm text-slate-500">Decrypting order tracking data...</p>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-navy-900 mb-2">Access Denied or Not Found</h2>
        <p className="text-xs text-slate-600 mb-6">{error || 'Could not verify token.'}</p>
        <button
          type="button"
          onClick={() => navigate('/track')}
          className="px-4 py-2 bg-navy-900 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Try Another Order
        </button>
      </div>
    );
  }

  const { order, shop, items, document: docMeta, history, messages } = orderData;
  const isCancellable = ['SUBMITTED', 'ACCEPTED', 'AWAITING_APPROVAL'].includes(order.status);
  const isAwaitingApproval = order.status === 'AWAITING_APPROVAL';

  // Status Stepper Steps
  const steps: Array<{ status: OrderStatus; label: string; icon: any }> = [
    { status: 'SUBMITTED', label: 'Order Submitted', icon: Clock },
    { status: 'ACCEPTED', label: 'Accepted by Shop', icon: CheckCircle2 },
    { status: 'PRINTING', label: 'Printing in Progress', icon: Printer },
    { status: 'READY_FOR_PICKUP', label: 'Ready for Pickup', icon: PackageCheck },
    { status: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
  ];

  const getStepIndex = (st: OrderStatus) => {
    switch (st) {
      case 'SUBMITTED': return 0;
      case 'ACCEPTED':
      case 'AWAITING_APPROVAL': return 1;
      case 'PRINTING': return 2;
      case 'READY_FOR_PICKUP': return 3;
      case 'COMPLETED': return 4;
      default: return -1;
    }
  };

  const currentIndex = getStepIndex(order.status);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-glass flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider">
              REF: {order.orderReference}
            </span>
            <StatusBadge status={order.status} size="lg" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
            Order Status Tracking
          </h1>
          <p className="text-xs text-slate-500">
            Dispatch Center: <strong className="text-navy-900">{shop.name}</strong> • {shop.address}
          </p>
        </div>

        {/* Counter OTP Badge */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center shrink-0 min-w-[160px]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Counter Pickup OTP
          </div>
          <div className="text-2xl font-mono font-extrabold text-brand-600 tracking-wider mt-0.5">
            {order.pickupOtp}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Provide to counter staff
          </div>
        </div>
      </div>

      {/* Urgent Quotation Revision Alert */}
      {isAwaitingApproval && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-amber-950">
                Action Required: Shop Revised Quotation to ₹{order.finalAmount}
              </h3>
              <p className="text-xs text-amber-800 mt-1">
                <strong>Shop Reason:</strong> {order.quotationNote || 'Custom options / heavy paper option surcharge.'}
              </p>
              <p className="text-[11px] text-amber-700 mt-1">
                Per platform security rules, the shop will NOT begin printing until you approve this revised total.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleApproveQuote}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve Revised Quotation (₹{order.finalAmount})
            </button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={handleCancelOrder}
              className="px-4 py-2.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-semibold text-xs transition-colors"
            >
              Decline & Cancel Order
            </button>
          </div>
        </div>
      )}

      {/* Live Stage Status Announcement Banner */}
      {order.status === 'SUBMITTED' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 shadow-sm flex items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <h3 className="text-sm sm:text-base font-black text-amber-950">
                  Order Received — Waiting for Shopkeeper to Accept
                </h3>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Your print job has arrived at <strong>{shop.name}</strong>. Counter staff is reviewing the documents. This page updates live automatically without refresh.
              </p>
            </div>
          </div>
          <span className="hidden md:inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 shrink-0">
            Live 3s Polling
          </span>
        </div>
      )}

      {order.status === 'ACCEPTED' && (
        <div className="bg-blue-50 border-2 border-blue-400 rounded-3xl p-5 sm:p-6 shadow-sm flex items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <h3 className="text-sm sm:text-base font-black text-blue-950">
                  🎉 Order Approved &amp; Accepted by Shopkeeper!
                </h3>
              </div>
              <p className="text-xs text-blue-800 mt-0.5">
                The counter staff verified your documents and approved the print job. It is queued and printing will begin shortly.
              </p>
            </div>
          </div>
          <span className="hidden md:inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-200 text-blue-900 shrink-0">
            Approved
          </span>
        </div>
      )}

      {(order.status === 'PRINTING' || order.status === 'QUEUED') && (
        <div className="bg-purple-50 border-2 border-purple-400 rounded-3xl p-5 sm:p-6 shadow-sm flex items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Printer className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                <h3 className="text-sm sm:text-base font-black text-purple-950">
                  🖨️ Printing in Hardware Spooler...
                </h3>
              </div>
              <p className="text-xs text-purple-800 mt-0.5">
                Your sheets are physically printing on the shop machine. They will be ready for pickup in a moment.
              </p>
            </div>
          </div>
          <span className="hidden md:inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-200 text-purple-900 shrink-0">
            Printing
          </span>
        </div>
      )}

      {order.status === 'READY_FOR_PICKUP' && (
        <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-5 sm:p-6 shadow-md flex items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-sm sm:text-base font-black text-emerald-950">
                  ✨ Your Prints are Ready for Counter Pickup!
                </h3>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Collect your prints from counter staff. Show Security OTP: <strong className="font-mono text-emerald-950 bg-emerald-200 px-2 py-0.5 rounded-md">{order.pickupOtp}</strong>
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-emerald-700 font-bold block uppercase">Counter OTP</span>
            <span className="font-mono font-black text-xl text-emerald-900">{order.pickupOtp}</span>
          </div>
        </div>
      )}

      {order.status === 'COMPLETED' && (
        <div className="bg-teal-50 border-2 border-teal-400 rounded-3xl p-5 sm:p-6 shadow-md flex items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-teal-950">
                🎉 Handover Confirmed &amp; Completed!
              </h3>
              <p className="text-xs text-teal-800 mt-0.5">
                Your printed documents have been successfully verified and handed over at the counter. Thank you for using Smart Xerox!
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-200 text-teal-900 shrink-0">
            Handover Confirmed
          </span>
        </div>
      )}

      {/* Stepper Progress Bar */}
      {order.status !== 'CANCELLED' ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
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
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : isCurrent
                        ? 'bg-brand-600 text-white border-brand-600 shadow-md ring-4 ring-brand-100'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div
                      className={`text-xs font-bold ${
                        isCurrent ? 'text-brand-600' : isPast ? 'text-navy-900' : 'text-slate-400'
                      }`}
                    >
                      {st.label}
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] text-slate-500 font-medium">In Progress</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 flex items-center gap-3 text-rose-800 text-xs">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
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
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wider">
              Document & Print Specifications
            </h3>

            {items && items.map((it: any, idx: number) => (
              <div key={idx} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex justify-between items-center font-bold text-navy-900">
                  <span>{docMeta?.originalFilename || 'Uploaded Document'}</span>
                  <span className="font-mono text-brand-600">₹{it.item_price}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-500 text-[11px]">
                  <div>Size: <strong className="text-navy-900">{it.paper_size}</strong></div>
                  <div>Mode: <strong className="text-navy-900">{it.color_mode === 'BW' ? 'Black & White' : 'Color'}</strong></div>
                  <div>Sides: <strong className="text-navy-900">{it.is_duplex ? 'Double-Sided' : 'Single'}</strong></div>
                  <div>Copies: <strong className="text-navy-900">{it.copies}</strong></div>
                </div>
                {it.custom_notes && (
                  <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-600 text-[11px]">
                    <strong>Instructions:</strong> {it.custom_notes}
                  </div>
                )}
              </div>
            ))}

            {/* Retention & Lifecycle Banner */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 text-xs flex items-start gap-3">
              <Trash2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-emerald-950">Zero Residual Storage Policy:</strong>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  {docMeta?.isDeleted
                    ? 'This document has already been permanently wiped from disk.'
                    : `Document is queued for physical disk purge at ${new Date(docMeta?.autoDeleteAt).toLocaleString()}.`}
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
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                >
                  Cancel this print order
                </button>
              </div>
            )}
          </div>

          {/* Status Timeline History */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Audit Event Timeline
            </h3>
            <div className="space-y-3">
              {history && history.map((h: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-semibold text-navy-900">{h.new_status}</span>
                    <span className="text-slate-400 text-[11px] ml-2 font-mono">
                      {new Date(h.created_at).toLocaleTimeString()}
                    </span>
                    {h.note && (
                      <p className="text-slate-500 text-[11px] mt-0.5">{h.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Private In-Order Chat */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-glass flex flex-col h-[520px] overflow-hidden">
          <div className="px-6 py-4 bg-navy-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Private Order Chat</h3>
            </div>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300">
              No Phone # Exchanged
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
            {messages && messages.length > 0 ? (
              messages.map((m: any) => {
                const isCustomer = m.sender_role === 'CUSTOMER';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-slate-400 font-medium mb-1">
                      {isCustomer ? 'You' : shop.name} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        isCustomer
                          ? 'bg-brand-600 text-white rounded-br-xs'
                          : 'bg-white border border-slate-200 text-navy-900 rounded-bl-xs shadow-2xs'
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-500">Need to clarify something?</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ask the shop owner directly here without giving out your WhatsApp number.
                </p>
              </div>
            )}
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              placeholder="Ask a question about your print job..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={sendingMessage || !messageText.trim()}
              className="px-3.5 py-2 bg-navy-900 hover:bg-brand-600 disabled:bg-slate-300 text-white rounded-xl transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  FileText,
  Eye,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Copy,
  Clock,
  Sparkles,
  Check,
  Bell,
  XCircle,
  RotateCcw,
  Volume2,
  VolumeX,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';
import { OwnerLayout } from '../components/OwnerLayout';
import { api } from '../services/api';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';

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
    // Audio might be prevented until first user gesture
  }
}

export const OwnerDashboardPage: React.FC = () => {
  const [shop, setShop] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [connector, setConnector] = useState<any>({ isPaired: false, isOnline: false });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Printing & Action states
  const [directPrintingId, setDirectPrintingId] = useState<string | null>(null);
  const [printAlert, setPrintAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [manualPrintOrder, setManualPrintOrder] = useState<any | null>(null);
  const [rejectOrderModal, setRejectOrderModal] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [completeOrderModal, setCompleteOrderModal] = useState<any | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Queue Tab: 'INCOMING' | 'ACTIVE' | 'READY' | 'ALL'
  const [queueTab, setQueueTab] = useState<'INCOMING' | 'ACTIVE' | 'READY' | 'ALL'>('ACTIVE');

  // Track previous count for sound/visual notification
  const prevSubmittedCount = useRef<number>(0);
  const initialLoadDone = useRef<boolean>(false);

  const loadData = async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true);

      const [shopRes, ordersRes, printersRes] = await Promise.all([
        api.getOwnerShop(),
        api.getOwnerOrders(),
        api.listPrinters().catch(() => ({ printers: [], connector: null })),
      ]);

      setShop(shopRes.shop);

      // Deduplicate orders by id and reference
      const rawOrders = ordersRes.orders || [];
      const seenIds = new Set<string>();
      const deduped: any[] = [];
      for (const o of rawOrders) {
        if (!seenIds.has(o.id)) {
          seenIds.add(o.id);
          deduped.push(o);
        }
      }

      setOrders(deduped);
      setPrinters(printersRes?.printers || []);
      setConnector(printersRes?.connector || { isPaired: false, isOnline: false });

      // Audio notification chime when new orders arrive
      const currentSubmitted = deduped.filter((o: any) => o.status === 'SUBMITTED' || o.status === 'RECEIVED').length;
      if (initialLoadDone.current && currentSubmitted > prevSubmittedCount.current) {
        if (soundEnabled) {
          playChime();
        }
      }
      prevSubmittedCount.current = currentSubmitted;
      initialLoadDone.current = true;
    } catch (err: any) {
      console.warn('Dashboard fetch warning:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto-refresh every 4 seconds for real-time live receiving
    const interval = setInterval(() => {
      loadData(true);
    }, 4000);

    // Instant real-time notification listener via BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('smart_xerox_orders_channel');
        bc.onmessage = () => {
          loadData(true);
        };
      }
    } catch {}

    // Instant real-time notification listener via CustomEvent & storage
    const handleNewOrderEvent = () => {
      loadData(true);
    };
    window.addEventListener('smart_xerox_new_order', handleNewOrderEvent);
    window.addEventListener('storage', handleNewOrderEvent);

    return () => {
      clearInterval(interval);
      if (bc) {
        try { bc.close(); } catch {}
      }
      window.removeEventListener('smart_xerox_new_order', handleNewOrderEvent);
      window.removeEventListener('storage', handleNewOrderEvent);
    };
  }, [soundEnabled]);

  const defaultPrinter = printers.find((p) => p.isDefault) || printers[0];

  // 1. Direct Print via Windows Spooler (Mode B)
  const handleAcceptAndPrint = async (order: any, targetPrinterName?: string) => {
    try {
      setDirectPrintingId(order.id);
      setPrintAlert(null);

      const printerToUse = targetPrinterName || defaultPrinter?.name;

      const res = await api.submitDirectPrint({
        orderId: order.id,
        printerName: printerToUse,
        copies: order.copies || 1,
        paperSize: order.paper_size || 'A4',
        colorMode: order.color_mode || 'BW',
      });

      setPrintAlert({
        type: 'success',
        message: `Job dispatched to Windows Spooler for "${res.printerName || printerToUse || 'Default Printer'}". Status: QUEUED.`,
      });

      await loadData(true);
    } catch (err: any) {
      setPrintAlert({
        type: 'error',
        message: `${err.message || 'Direct printing spooler failed.'} Click "Manual Print" to print via browser dialog.`,
      });
    } finally {
      setDirectPrintingId(null);
    }
  };

  // 2. Open Manual Print Fallback (Mode A)
  const handleOpenManualPrint = (order: any) => {
    setManualPrintOrder(order);
    window.open(`/api/orders/owner/documents/${order.id}/preview`, '_blank');
  };

  // 3. Confirm Manual Print Outcome
  const handleConfirmManualPrint = async (outcome: 'READY_FOR_PICKUP' | 'COMPLETED') => {
    if (!manualPrintOrder) return;
    try {
      await api.recordManualPrint(manualPrintOrder.id, outcome);
      setManualPrintOrder(null);
      setPrintAlert({
        type: 'success',
        message: `Order #${manualPrintOrder.order_reference} marked as "${outcome.replace(/_/g, ' ')}".`,
      });
      await loadData(true);
    } catch (err: any) {
      alert(err.message || 'Failed to record manual print.');
    }
  };

  // 4. Update Status (Lifecycle transitions)
  const handleUpdateStatus = async (orderId: string, nextStatus: string, note?: string) => {
    try {
      await api.updateOrderStatus(orderId, nextStatus, note);
      await loadData(true);
    } catch (err: any) {
      alert(err.message || 'Failed to update order status.');
    }
  };

  // 5. Reject Order with reason
  const handleRejectOrder = async () => {
    if (!rejectOrderModal) return;
    try {
      await api.updateOrderStatus(
        rejectOrderModal.id,
        'REJECTED',
        rejectReason.trim() || 'Declined by shop counter.'
      );
      setRejectOrderModal(null);
      setRejectReason('');
      setPrintAlert({
        type: 'success',
        message: `Order #${rejectOrderModal.order_reference} rejected.`,
      });
      await loadData(true);
    } catch (err: any) {
      alert(err.message || 'Failed to reject order.');
    }
  };

  // 6. Complete Order with pickup verification
  const handleCompleteOrder = async () => {
    if (!completeOrderModal) return;
    try {
      await api.updateOrderStatus(
        completeOrderModal.id,
        'COMPLETED',
        enteredOtp ? `Handover confirmed with OTP: ${enteredOtp}` : 'Handed over at counter.'
      );
      setCompleteOrderModal(null);
      setEnteredOtp('');
      setPrintAlert({
        type: 'success',
        message: `Order #${completeOrderModal.order_reference} marked as Completed & Handed Over.`,
      });
      await loadData(true);
    } catch (err: any) {
      alert(err.message || 'Failed to complete order.');
    }
  };

  const handleCopy = (refText: string) => {
    navigator.clipboard.writeText(refText);
    setCopiedRef(refText);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Counts by category
  const incomingCount = orders.filter((o) => o.status === 'SUBMITTED' || o.status === 'RECEIVED').length;
  const readyCount = orders.filter((o) => o.status === 'READY_FOR_PICKUP').length;
  const activeCount = orders.filter((o) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(o.status)).length;

  // Filter orders based on active tab
  const filteredOrders = orders.filter((o) => {
    if (queueTab === 'INCOMING') {
      return o.status === 'SUBMITTED' || o.status === 'RECEIVED';
    }
    if (queueTab === 'READY') {
      return o.status === 'READY_FOR_PICKUP';
    }
    if (queueTab === 'ACTIVE') {
      return !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(o.status);
    }
    return true; // 'ALL'
  });

  return (
    <OwnerLayout
      shop={shop}
      defaultPrinter={defaultPrinter}
      connector={connector}
      onRefreshPrinters={() => loadData(true)}
    >
      <div className="space-y-6">
        {/* Top Header / Receiving Panel Controls */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-navy-950 text-white flex items-center justify-center font-black shadow-xs">
              <Printer className="w-6 h-6 text-brand-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-navy-950">Incoming Order Receiving Panel</h1>
                {incomingCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-pulse flex items-center gap-1">
                    <Bell className="w-3 h-3" />
                    {incomingCount} New
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Receiving Queue • Auto-refreshing every 4s
              </p>
            </div>
          </div>

          {/* Sound Toggle & Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playChime();
              }}
              className={`p-2.5 rounded-2xl border transition shadow-2xs flex items-center gap-1.5 text-xs font-bold ${
                soundEnabled
                  ? 'bg-brand-50 border-brand-200 text-brand-700'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
              title={soundEnabled ? 'Chime sound enabled' : 'Chime sound muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
            </button>

            <button
              onClick={() => loadData(false)}
              disabled={refreshing}
              className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-2xs"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabbed Queue Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
          <button
            onClick={() => setQueueTab('ACTIVE')}
            className={`px-4 py-2 rounded-2xl border transition whitespace-nowrap ${
              queueTab === 'ACTIVE'
                ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Active Queue ({activeCount})
          </button>

          <button
            onClick={() => setQueueTab('INCOMING')}
            className={`px-4 py-2 rounded-2xl border transition whitespace-nowrap flex items-center gap-1.5 ${
              queueTab === 'INCOMING'
                ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>New Incoming</span>
            {incomingCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                {incomingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setQueueTab('READY')}
            className={`px-4 py-2 rounded-2xl border transition whitespace-nowrap flex items-center gap-1.5 ${
              queueTab === 'READY'
                ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>Ready for Pickup</span>
            {readyCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center">
                {readyCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setQueueTab('ALL')}
            className={`px-4 py-2 rounded-2xl border transition whitespace-nowrap ${
              queueTab === 'ALL'
                ? 'bg-navy-950 text-white border-navy-950 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Order History ({orders.length})
          </button>
        </div>

        {/* Global Alert Notification */}
        {printAlert && (
          <div
            className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
              printAlert.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {printAlert.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span className="font-medium">{printAlert.message}</span>
            </div>
            <button
              onClick={() => setPrintAlert(null)}
              className="text-xs font-bold underline hover:no-underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Orders List / Empty State */}
        {loading ? (
          <div className="bg-white rounded-3xl p-16 border border-slate-200/90 text-center space-y-3 shadow-sm">
            <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Checking incoming print orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 border border-slate-200/90 text-center space-y-3 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
              <Printer className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-navy-950">No Orders in this View</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {queueTab === 'INCOMING'
                ? 'No new incoming orders right now. When customers scan your QR poster, documents arrive here with real-time chime notification.'
                : queueTab === 'READY'
                ? 'No orders are currently waiting for customer pickup.'
                : 'No active orders in the queue. You are all caught up!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isNew = order.status === 'SUBMITTED' || order.status === 'RECEIVED';
              const isAccepted = order.status === 'ACCEPTED';
              const isQueued = order.status === 'QUEUED';
              const isPrinting = order.status === 'PRINTING';
              const isReady = order.status === 'READY_FOR_PICKUP';
              const isCompleted = order.status === 'COMPLETED';
              const isRejected = order.status === 'REJECTED';
              const isCancelled = order.status === 'CANCELLED';
              const isFailed = order.status === 'PRINT_FAILED' || order.status === 'FAILED';

              const createdTime = order.created_at
                ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all ${
                    isNew
                      ? 'border-brand-400 shadow-md ring-2 ring-brand-500/20'
                      : isFailed
                      ? 'border-rose-300 shadow-sm'
                      : isReady
                      ? 'border-emerald-300 shadow-xs'
                      : 'border-slate-200 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Order Info & Document Settings */}
                    <div className="space-y-2 min-w-0 flex-1">
                      {/* Top Row: Ref, Time & Lifecycle Status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 font-mono font-black text-navy-950 text-sm">
                          <span>{order.order_reference}</span>
                          <button
                            onClick={() => handleCopy(order.order_reference)}
                            className="text-slate-400 hover:text-navy-950 p-0.5"
                            title="Copy Reference"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {copiedRef === order.order_reference && (
                            <span className="text-[10px] text-emerald-600 font-sans font-bold">Copied!</span>
                          )}
                        </div>

                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {createdTime}
                        </span>

                        {/* Status Badges */}
                        {isNew && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                            New Incoming
                          </span>
                        )}
                        {isAccepted && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-900 border border-blue-300">
                            Accepted
                          </span>
                        )}
                        {isQueued && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300">
                            Queued in Spooler
                          </span>
                        )}
                        {isPrinting && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300">
                            Printing in Hardware...
                          </span>
                        )}
                        {isReady && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                            Ready for Pickup
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            Completed &amp; Handed Over
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            Declined
                          </span>
                        )}
                        {isCancelled && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                            Cancelled
                          </span>
                        )}
                        {isFailed && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                            Spooler Error
                          </span>
                        )}
                      </div>

                      {/* Middle Row: Document details */}
                      <div className="flex items-center gap-3 flex-wrap pt-1">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                          <FileText className="w-4 h-4 text-brand-600 shrink-0" />
                          <span className="text-xs font-bold text-navy-950 truncate max-w-xs">
                            {order.original_filename || 'document.pdf'}
                          </span>
                          {(order.file_count > 1 || (order.documents && order.documents.length > 1)) && (
                            <span className="px-2 py-0.5 rounded-md bg-brand-100 text-brand-800 text-[10px] font-black shrink-0">
                              {order.file_count || order.documents.length} Files ({order.page_count} pgs)
                            </span>
                          )}
                          <button
                            onClick={() => setPreviewDoc(order)}
                            className="p-1 rounded text-slate-400 hover:text-brand-600 transition"
                            title="Preview Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`/owner/orders/${order.id}`}
                            className="text-[11px] font-bold text-brand-600 hover:text-brand-800 pl-1 hover:underline shrink-0"
                            title="View all attached documents and order history"
                          >
                            Details &rarr;
                          </a>
                        </div>

                        {/* Setting Tags */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-extrabold">
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800">
                            {order.paper_size || 'A4'}
                          </span>
                          <span className={`px-2.5 py-1 rounded-xl ${
                            order.color_mode === 'COLOR'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-800'
                          }`}>
                            {order.color_mode === 'COLOR' ? 'Colour' : 'B & W'}
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800">
                            {order.is_duplex ? 'Double-Sided' : 'Single-Sided'}
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800">
                            {order.copies || 1} {order.copies === 1 ? 'Copy' : 'Copies'}
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                            ₹{parseFloat(order.final_amount || order.estimated_amount || '0').toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Custom instructions / page range notes */}
                      {order.custom_notes && (
                        <div className="text-[11px] text-brand-800 bg-brand-50/70 border border-brand-200 px-3 py-1 rounded-xl max-w-lg">
                          <strong>Note:</strong> {order.custom_notes}
                        </div>
                      )}

                      {/* Pickup OTP prompt when ready */}
                      {order.pickup_otp && isReady && (
                        <div className="text-xs text-emerald-800 flex items-center gap-2 font-mono">
                          <span>Expected Pickup OTP:</span>
                          <span className="bg-emerald-100 px-2 py-0.5 rounded-lg font-black">{order.pickup_otp}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 flex-wrap">
                      {/* NEW / SUBMITTED / RECEIVED */}
                      {isNew && (
                        <>
                          <button
                            onClick={() => handleAcceptAndPrint(order)}
                            disabled={directPrintingId === order.id}
                            className="px-4 py-2.5 rounded-2xl bg-navy-950 hover:bg-brand-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-98"
                            title={defaultPrinter ? `Print directly to ${defaultPrinter.name}` : 'Print to Windows Printer'}
                          >
                            <Printer className="w-4 h-4 text-brand-300" />
                            {directPrintingId === order.id ? 'Sending...' : 'Accept & Print'}
                          </button>

                          <button
                            onClick={() => handleOpenManualPrint(order)}
                            className="px-3.5 py-2.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition"
                            title="Open browser or Windows print dialog fallback"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                            Manual Print
                          </button>

                          <button
                            onClick={() => setRejectOrderModal(order)}
                            className="px-3 py-2.5 rounded-2xl border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs transition"
                            title="Decline order"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {/* ACCEPTED / QUEUED / FAILED */}
                      {(isAccepted || isQueued || isFailed) && (
                        <>
                          <button
                            onClick={() => handleAcceptAndPrint(order)}
                            disabled={directPrintingId === order.id}
                            className="px-4 py-2.5 rounded-2xl bg-navy-950 hover:bg-brand-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-98"
                          >
                            <Printer className="w-4 h-4 text-brand-300" />
                            {isFailed ? 'Retry Print' : 'Send to Printer'}
                          </button>

                          <button
                            onClick={() => handleOpenManualPrint(order)}
                            className="px-3.5 py-2.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                            Manual Print
                          </button>

                          <button
                            onClick={() => handleUpdateStatus(order.id, 'READY_FOR_PICKUP', 'Marked ready manually.')}
                            className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                          >
                            Mark Ready
                          </button>
                        </>
                      )}

                      {/* PRINTING */}
                      {isPrinting && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'READY_FOR_PICKUP', 'Physical print confirmed.')}
                            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Confirm Printed
                          </button>

                          <button
                            onClick={() => handleOpenManualPrint(order)}
                            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                          >
                            Reprint
                          </button>
                        </>
                      )}

                      {/* READY FOR PICKUP */}
                      {isReady && (
                        <button
                          onClick={() => setCompleteOrderModal(order)}
                          className="px-5 py-2.5 rounded-2xl bg-navy-950 hover:bg-brand-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition"
                        >
                          <PackageCheck className="w-4 h-4 text-emerald-400" />
                          Hand Over &amp; Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          isOpen={true}
          onClose={() => setPreviewDoc(null)}
          docId={previewDoc.id}
          orderId={previewDoc.id}
          originalFilename={previewDoc.original_filename || 'document.pdf'}
          mimeType={previewDoc.mime_type || 'application/pdf'}
        />
      )}

      {/* Reject Order Confirmation Dialog */}
      {rejectOrderModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-navy-950">Decline Order</h3>
                <p className="text-xs text-slate-500">Order #{rejectOrderModal.order_reference}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Provide a reason for declining this order so the customer can be notified on their tracking screen.
            </p>

            <input
              type="text"
              placeholder="e.g. Paper size out of stock, unreadable document"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50"
            />

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleRejectOrder}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
              >
                Confirm Decline
              </button>
              <button
                onClick={() => setRejectOrderModal(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover & Complete Order Confirmation Dialog */}
      {completeOrderModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-navy-950">Confirm Counter Handover</h3>
                <p className="text-xs text-slate-500">Order #{completeOrderModal.order_reference}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <strong className="font-mono text-navy-950 text-sm">
                  ₹{parseFloat(completeOrderModal.final_amount || completeOrderModal.estimated_amount || '0').toFixed(2)}
                </strong>
              </div>
              {completeOrderModal.pickup_otp && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span>Customer Pickup Code:</span>
                  <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {completeOrderModal.pickup_otp}
                  </span>
                </div>
              )}
            </div>

            <input
              type="text"
              placeholder="Verify customer 4-digit code (optional)"
              value={enteredOtp}
              onChange={(e) => setEnteredOtp(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs text-center font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCompleteOrder}
                className="flex-1 py-3 rounded-xl bg-navy-950 hover:bg-brand-600 text-white font-extrabold text-xs transition"
              >
                Confirm Handover &amp; Archive
              </button>
              <button
                onClick={() => setCompleteOrderModal(null)}
                className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Print Confirmation Dialog */}
      {manualPrintOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-navy-950">Manual Print Fallback</h3>
                <p className="text-xs text-slate-500">Order #{manualPrintOrder.order_reference}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <p>
                The document was opened in a new tab for printing using your browser / Windows print dialog.
              </p>
              <p className="text-slate-500 text-[11px]">
                Once printed on your shop printer, update the order status:
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleConfirmManualPrint('READY_FOR_PICKUP')}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark as "Ready for Pickup"
              </button>

              <button
                onClick={() => handleConfirmManualPrint('COMPLETED')}
                className="w-full py-2.5 rounded-xl bg-navy-950 hover:bg-brand-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                Mark as "Completed"
              </button>

              <button
                onClick={() => setManualPrintOrder(null)}
                className="w-full py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-semibold text-xs"
              >
                Keep Current Status
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
};

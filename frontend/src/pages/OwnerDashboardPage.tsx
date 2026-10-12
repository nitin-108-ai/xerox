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
  Bell
} from 'lucide-react';
import { OwnerLayout } from '../components/OwnerLayout';
import { api } from '../services/api';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';

export const OwnerDashboardPage: React.FC = () => {
  const [shop, setShop] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [connector, setConnector] = useState<any>({ isPaired: false, isOnline: false });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Printing & Action states
  const [directPrintingId, setDirectPrintingId] = useState<string | null>(null);
  const [printAlert, setPrintAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [manualPrintOrder, setManualPrintOrder] = useState<any | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Filter tab: 'ACTIVE' (New & Printing & Ready) vs 'ALL'
  const [filterTab, setFilterTab] = useState<'ACTIVE' | 'ALL'>('ACTIVE');

  // Track previous count for sound/visual notification
  const prevOrderCount = useRef<number>(0);

  const loadData = async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true);

      const [shopRes, ordersRes, printersRes] = await Promise.all([
        api.getOwnerShop(),
        api.getOwnerOrders(),
        api.listPrinters().catch(() => ({ printers: [], connector: null })),
      ]);

      setShop(shopRes.shop);
      const newOrders = ordersRes.orders || [];
      setOrders(newOrders);
      setPrinters(printersRes?.printers || []);
      setConnector(printersRes?.connector || { isPaired: false, isOnline: false });

      // Visual chime if new orders arrived
      const newSubmittedCount = newOrders.filter((o: any) => o.status === 'SUBMITTED').length;
      if (prevOrderCount.current > 0 && newSubmittedCount > prevOrderCount.current) {
        // Notification chime could trigger here
      }
      prevOrderCount.current = newSubmittedCount;
    } catch (err: any) {
      console.warn('Dashboard fetch warning:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto-refresh every 5 seconds for real-time order updates
    const interval = setInterval(() => {
      loadData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const defaultPrinter = printers.find((p) => p.isDefault) || printers[0];

  // 1. Accept and Direct Print (Mode B)
  const handleAcceptAndPrint = async (order: any) => {
    try {
      setDirectPrintingId(order.id);
      setPrintAlert(null);

      // Submit direct print job to Windows connector queue
      const res = await api.submitDirectPrint({
        orderId: order.id,
        printerName: defaultPrinter?.name,
        copies: order.copies || 1,
        paperSize: order.paper_size || 'A4',
        colorMode: order.color_mode || 'BW',
      });

      setPrintAlert({
        type: 'success',
        message: `Print job sent to Windows Spooler for "${res.printerName || 'Printer'}". Paper will print shortly.`,
      });

      await loadData(true);
    } catch (err: any) {
      setPrintAlert({
        type: 'error',
        message: `${err.message || 'Direct printing failed.'} Click "Manual Print" below to print via browser dialog.`,
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
        message: `Order #${manualPrintOrder.order_reference} marked as "${outcome.replace('_', ' ')}".`,
      });
      await loadData(true);
    } catch (err: any) {
      alert(err.message || 'Failed to record manual print.');
    }
  };

  // 4. Update Status (Mark Ready or Completed)
  const handleUpdateStatus = async (orderId: string, nextStatus: string, note?: string) => {
    try {
      await api.updateOrderStatus(orderId, nextStatus, note);
      await loadData(true);
    } catch (err: any) {
      alert(err.message || 'Failed to update order status.');
    }
  };

  const handleCopy = (refText: string) => {
    navigator.clipboard.writeText(refText);
    setCopiedRef(refText);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Filter orders: active vs all
  const filteredOrders = filterTab === 'ACTIVE'
    ? orders.filter((o) => ['SUBMITTED', 'ACCEPTED', 'PRINTING', 'PRINT_FAILED', 'READY_FOR_PICKUP'].includes(o.status))
    : orders;

  const newOrdersCount = orders.filter((o) => o.status === 'SUBMITTED').length;

  return (
    <OwnerLayout
      shop={shop}
      defaultPrinter={defaultPrinter}
      connector={connector}
      onRefreshPrinters={() => loadData(true)}
    >
      <div className="space-y-6">
        {/* Top Queue Header Bar */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-navy-950 text-white flex items-center justify-center font-black shadow-xs">
              <Printer className="w-6 h-6 text-brand-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-navy-950">Live Print Requests</h1>
                {newOrdersCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-pulse">
                    {newOrdersCount} New
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live counter queue • Auto-refreshing every 5s
              </p>
            </div>
          </div>

          {/* Filter toggle & Manual Refresh */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-2xl flex items-center text-xs font-bold">
              <button
                onClick={() => setFilterTab('ACTIVE')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  filterTab === 'ACTIVE'
                    ? 'bg-white text-navy-950 shadow-2xs'
                    : 'text-slate-600 hover:text-navy-950'
                }`}
              >
                Active Queue ({orders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length})
              </button>
              <button
                onClick={() => setFilterTab('ALL')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  filterTab === 'ALL'
                    ? 'bg-white text-navy-950 shadow-2xs'
                    : 'text-slate-600 hover:text-navy-950'
                }`}
              >
                All Orders ({orders.length})
              </button>
            </div>

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
            <p className="text-xs font-bold text-slate-500">Checking print requests...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 border border-slate-200/90 text-center space-y-3 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
              <Printer className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-navy-950">No Print Requests</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {filterTab === 'ACTIVE'
                ? 'No active print requests right now. When customers scan your QR code and upload documents, they will appear here instantly.'
                : 'No orders recorded yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isNew = order.status === 'SUBMITTED';
              const isPrinting = order.status === 'PRINTING';
              const isReady = order.status === 'READY_FOR_PICKUP';
              const isCompleted = order.status === 'COMPLETED';
              const isPrintFailed = order.status === 'PRINT_FAILED';

              const createdTime = order.created_at
                ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all ${
                    isNew
                      ? 'border-brand-400 shadow-md ring-2 ring-brand-500/20'
                      : isPrintFailed
                      ? 'border-rose-300 shadow-sm'
                      : 'border-slate-200 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Order Info & Document */}
                    <div className="space-y-2 min-w-0 flex-1">
                      {/* Top Row: Ref & Status */}
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

                        {/* Status Badge */}
                        {isNew && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                            New Request
                          </span>
                        )}
                        {isPrinting && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300">
                            Printing in Spooler...
                          </span>
                        )}
                        {isReady && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                            Ready for Pickup
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            Completed
                          </span>
                        )}
                        {isPrintFailed && (
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
                          <button
                            onClick={() => setPreviewDoc(order)}
                            className="p-1 rounded text-slate-400 hover:text-brand-600 transition"
                            title="Preview Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
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
                            {order.color_mode === 'COLOR' ? 'Colour' : 'Black & White'}
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800">
                            {order.copies || 1} {order.copies === 1 ? 'Copy' : 'Copies'}
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                            ₹{parseFloat(order.final_amount || order.estimated_amount || '0').toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Error message notice if spooler failed */}
                      {isPrintFailed && (
                        <p className="text-xs text-rose-700 font-semibold pt-1 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          Windows printer spooler reported an error. Please click "Manual Print" below to print via normal Windows dialog.
                        </p>
                      )}
                    </div>

                    {/* Right: High-Contrast Primary Actions */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                      {/* Accept & Print (When New, Accepted, or Print Failed) */}
                      {(isNew || order.status === 'ACCEPTED' || isPrintFailed) && (
                        <>
                          <button
                            onClick={() => handleAcceptAndPrint(order)}
                            disabled={directPrintingId === order.id}
                            className="px-4 py-2.5 rounded-2xl bg-navy-950 hover:bg-brand-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition transform active:scale-98"
                            title={defaultPrinter ? `Print directly to ${defaultPrinter.name}` : 'Print to Windows Printer'}
                          >
                            <Printer className="w-4 h-4 text-brand-300" />
                            {directPrintingId === order.id ? 'Sending...' : 'Accept & Print'}
                          </button>

                          <button
                            onClick={() => handleOpenManualPrint(order)}
                            className="px-3.5 py-2.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition"
                            title="Open browser or Windows print dialog fallback"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                            Manual Print
                          </button>
                        </>
                      )}

                      {/* When Printing */}
                      {isPrinting && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'READY_FOR_PICKUP', 'Printed and verified by shop operator.')}
                            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Mark Ready
                          </button>

                          <button
                            onClick={() => handleOpenManualPrint(order)}
                            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                            title="Manual Print Fallback"
                          >
                            Reprint Manually
                          </button>
                        </>
                      )}

                      {/* When Ready for Pickup */}
                      {isReady && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'COMPLETED', 'Handed over to customer.')}
                          className="px-5 py-2.5 rounded-2xl bg-navy-950 hover:bg-brand-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition"
                        >
                          <Check className="w-4 h-4 text-emerald-400" />
                          Hand Over & Complete
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

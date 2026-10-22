import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  PackageCheck,
  MessageSquare,
  Send
} from 'lucide-react';
import { OwnerLayout } from '../components/OwnerLayout';
import { api } from '../services/api';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';

// Shared AudioContext for cross-browser compliance and autoplay-policy unlocking
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// Audio chime generator using browser Web Audio API
export function playChime(type: 'scan' | 'order' = 'order') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (type === 'scan') {
      // Crisp 2-tone ping: 880 Hz (A5) -> 1320 Hz (E6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.start(now);
      osc1.stop(now + 0.18);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1320, now + 0.1);
      gain2.gain.setValueAtTime(0.35, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.35);
    } else {
      // Full 3-tone melodious order chime: 587 Hz (D5) -> 880 Hz (A5) -> 1175 Hz (D6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.start(now);
      osc1.stop(now + 0.22);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.4, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.38);

      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(1174.66, now + 0.26);
      gain3.gain.setValueAtTime(0.45, now + 0.26);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc3.start(now + 0.26);
      osc3.stop(now + 0.65);
    }
  } catch (err) {
    console.warn('Audio chime playback warning:', err);
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
  const [audioUnlocked, setAudioUnlocked] = useState(false);

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

  // Audio, QR scan, and Live Incoming Order notifications
  const [qrScanNotice, setQrScanNotice] = useState<{ slug?: string; shopName?: string; time: string } | null>(null);
  const [newOrderNotice, setNewOrderNotice] = useState<{ id: string; ref: string; time: string; files: number } | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as 'INCOMING' | 'ACTIVE' | 'READY' | 'ALL' | null;

  // Queue Tab: 'INCOMING' | 'ACTIVE' | 'READY' | 'ALL' (default to INCOMING so new orders are immediately visible)
  const [queueTab, setQueueTab] = useState<'INCOMING' | 'ACTIVE' | 'READY' | 'ALL'>(
    urlTab && ['INCOMING', 'ACTIVE', 'READY', 'ALL'].includes(urlTab) ? urlTab : 'INCOMING'
  );

  useEffect(() => {
    if (urlTab && ['INCOMING', 'ACTIVE', 'READY', 'ALL'].includes(urlTab)) {
      setQueueTab(urlTab);
    }
  }, [urlTab]);

  // Chat message notification and modal state
  const [chatNotice, setChatNotice] = useState<{
    orderId: string;
    orderRef: string;
    message: string;
    customerAlias?: string;
    time: string;
  } | null>(null);
  const [chatOrderModal, setChatOrderModal] = useState<any | null>(null);
  const [chatReplyText, setChatReplyText] = useState('');
  const [sendingChatReply, setSendingChatReply] = useState(false);
  const seenMessageIds = useRef<Set<string>>(new Set());

  // Track known orders and scans to detect new items across devices
  const seenOrderIds = useRef<Set<string>>(new Set());
  const lastProcessedScanTime = useRef<number>(Date.now() - 10000);
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
        const k = o.id || o.order_reference;
        if (k && !seenIds.has(k)) {
          seenIds.add(k);
          deduped.push(o);
        }
      }

      // 1. Cross-device QR Scan detection from server
      if (ordersRes.recentScan && ordersRes.recentScan.timestamp) {
        if (ordersRes.recentScan.timestamp > lastProcessedScanTime.current) {
          lastProcessedScanTime.current = ordersRes.recentScan.timestamp;
          if (soundEnabled) {
            playChime('scan');
          }
          setQrScanNotice({
            slug: ordersRes.recentScan.slug,
            shopName: ordersRes.recentScan.shopName,
            time: new Date(ordersRes.recentScan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          });
          setTimeout(() => setQrScanNotice(null), 10000);
        }
      }

      // 2. Cross-device Live Incoming Order arrival detection
      if (initialLoadDone.current) {
        let hasNewOrder = false;
        let latestNewOrder: any = null;
        for (const o of deduped) {
          const key = o.id || o.order_reference;
          if (key && !seenOrderIds.current.has(key)) {
            hasNewOrder = true;
            latestNewOrder = o;
            seenOrderIds.current.add(key);
          }
        }

        if (hasNewOrder && latestNewOrder) {
          if (soundEnabled) {
            playChime('order');
          }
          setNewOrderNotice({
            id: latestNewOrder.id,
            ref: latestNewOrder.order_reference || latestNewOrder.orderReference || 'New Order',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            files: latestNewOrder.file_count || latestNewOrder.documents?.length || 1
          });
          // Auto-switch to INCOMING tab so owner sees the new arrival immediately
          setQueueTab('INCOMING');
          setTimeout(() => setNewOrderNotice(null), 12000);
        }
      } else {
        // Initial load: populate seenOrderIds with all existing orders
        for (const o of deduped) {
          if (o.id) seenOrderIds.current.add(o.id);
          if (o.order_reference) seenOrderIds.current.add(o.order_reference);
        }
        initialLoadDone.current = true;
      }

      // 3. Cross-device Live Customer Chat detection
      if (ordersRes.recentMessages && Array.isArray(ordersRes.recentMessages)) {
        for (const msg of ordersRes.recentMessages) {
          const mId = msg.id || `${msg.orderId}_${msg.timestamp}`;
          if (!seenMessageIds.current.has(mId)) {
            seenMessageIds.current.add(mId);
            if (initialLoadDone.current && (msg.senderRole === 'CUSTOMER' || msg.sender_role === 'CUSTOMER')) {
              if (soundEnabled) {
                playChime('order');
              }
              setChatNotice({
                orderId: msg.orderId,
                orderRef: msg.orderReference || msg.orderRef || 'Order',
                message: msg.message,
                customerAlias: msg.customerAlias,
                time: new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
              setTimeout(() => setChatNotice(null), 12000);
            }
          }
        }
      }

      // Sync active chat modal if open
      if (chatOrderModal) {
        const fresh = deduped.find((o) => o.id === chatOrderModal.id || o.order_reference === chatOrderModal.order_reference);
        if (fresh && fresh.messages) {
          setChatOrderModal((prev: any) => prev ? { ...prev, messages: fresh.messages } : null);
        }
      }

      setOrders(deduped);
      setPrinters(printersRes?.printers || []);
      setConnector(printersRes?.connector || { isPaired: false, isOnline: false });
    } catch (err: any) {
      console.warn('Dashboard fetch warning:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Unlock Web Audio API on first user interaction anywhere on the page
    const handleUserInteraction = () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state !== 'suspended') {
        setAudioUnlocked(true);
      }
    };
    window.addEventListener('pointerdown', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });

    // Auto-refresh every 3 seconds for real-time live receiving
    const interval = setInterval(() => {
      loadData(true);
    }, 3000);

    // Instant real-time notification listener via BroadcastChannel (same browser tabs)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('smart_xerox_orders_channel');
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'QR_SCANNED') {
            if (soundEnabled) playChime('scan');
            setQrScanNotice({
              slug: ev.data.slug,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            });
            setTimeout(() => setQrScanNotice(null), 10000);
          } else if (ev.data?.type === 'NEW_ORDER') {
            if (soundEnabled) playChime('order');
            setQueueTab('INCOMING');
            loadData(true);
          } else {
            loadData(true);
          }
        };
      }
    } catch {}

    // Instant real-time notification listener via storage
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'smart_xerox_last_qr_scan') {
        try {
          const scanData = JSON.parse(e.newValue || '{}');
          if (soundEnabled) playChime('scan');
          setQrScanNotice({
            slug: scanData.slug,
            time: new Date(scanData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          });
          setTimeout(() => setQrScanNotice(null), 10000);
        } catch {}
      } else if (e.key === 'smart_xerox_last_order_received' || e.key === 'smart_xerox_offline_orders') {
        if (soundEnabled) playChime('order');
        setQueueTab('INCOMING');
        loadData(true);
      } else {
        loadData(true);
      }
    };

    const handleNewOrder = () => {
      if (soundEnabled) playChime('order');
      setQueueTab('INCOMING');
      loadData(true);
    };

    const handleOrderUpdate = () => {
      loadData(true);
    };

    window.addEventListener('smart_xerox_new_order', handleNewOrder);
    window.addEventListener('smart_xerox_order_updated', handleOrderUpdate);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      clearInterval(interval);
      if (bc) {
        try { bc.close(); } catch {}
      }
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('smart_xerox_new_order', handleNewOrder);
      window.removeEventListener('smart_xerox_order_updated', handleOrderUpdate);
      window.removeEventListener('storage', handleStorageEvent);
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

  // Statuses considered "INCOMING" (includes auto-accepted and queued jobs)
  const INCOMING_STATUSES = ['SUBMITTED', 'RECEIVED', 'ACCEPTED', 'QUEUED'];

  // Counts by category
  const incomingCount = orders.filter((o) => INCOMING_STATUSES.includes(o.status)).length;
  const readyCount = orders.filter((o) => o.status === 'READY_FOR_PICKUP').length;
  const activeCount = orders.filter((o) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(o.status)).length;

  // Send Owner Reply in dedicated Chat Modal
  const handleSendOwnerReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatOrderModal || !chatReplyText.trim() || sendingChatReply) return;

    try {
      setSendingChatReply(true);
      const text = chatReplyText.trim();
      await api.sendOwnerMessage(chatOrderModal.id, text);

      // Optimistic update
      const newMsg = {
        id: `msg-${Date.now()}`,
        order_id: chatOrderModal.id,
        sender_role: 'SHOP_OWNER',
        message: text,
        created_at: new Date().toISOString()
      };

      setChatOrderModal((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...(prev.messages || []), newMsg]
        };
      });

      setChatReplyText('');
      await loadData(true);
    } catch (err: any) {
      alert(err.message || 'Failed to send reply to customer.');
    } finally {
      setSendingChatReply(false);
    }
  };

  // Filter orders based on active tab
  const filteredOrders = orders.filter((o) => {
    if (queueTab === 'INCOMING') {
      return INCOMING_STATUSES.includes(o.status);
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
        <div className="bg-gradient-to-br from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#bbf451]/15 text-[#bbf451] border border-[#bbf451]/30 flex items-center justify-center font-black shadow-[0_0_20px_rgba(187,244,81,0.2)]">
              <Printer className="w-6 h-6 text-[#bbf451]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white font-syne">Incoming Order Receiving Panel</h1>
                {incomingCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-pulse flex items-center gap-1 shadow-[0_0_12px_rgba(244,63,94,0.5)]">
                    <Bell className="w-3 h-3" />
                    {incomingCount} New
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[#bbf451] animate-pulse" />
                Live Receiving Queue • Auto-refreshing every 3s
              </p>
            </div>
          </div>

          {/* Sound Toggle, Test Chime & Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                const nextState = !soundEnabled;
                setSoundEnabled(nextState);
                if (nextState) {
                  playChime('order');
                  setAudioUnlocked(true);
                }
              }}
              className={`p-2.5 rounded-2xl border transition flex items-center gap-1.5 text-xs font-bold ${
                soundEnabled
                  ? 'bg-[#bbf451] border-[#bbf451] text-[#080d09] shadow-[0_0_15px_rgba(187,244,81,0.25)]'
                  : 'bg-[#132015] border-[#273d2c] text-slate-400 hover:text-white'
              }`}
              title={soundEnabled ? 'Click to mute sound alerts' : 'Click to enable audio chime'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
            </button>

            {soundEnabled && (
              <button
                onClick={() => {
                  playChime('order');
                  setAudioUnlocked(true);
                }}
                className="px-3 py-2.5 rounded-2xl border border-[#273d2c] bg-[#142317] hover:bg-[#1a2e1e] text-[#bbf451] text-xs font-bold transition flex items-center gap-1 shadow-sm"
                title="Test audio chime on this computer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#bbf451]" />
                <span>Test Chime 🔔</span>
              </button>
            )}

            <button
              onClick={() => loadData(false)}
              disabled={refreshing}
              className="p-2.5 rounded-2xl border border-[#273d2c] bg-[#132015] hover:bg-[#1a2c1d] text-slate-300 transition shadow-sm"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#bbf451]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabbed Queue Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
          <button
            onClick={() => setQueueTab('INCOMING')}
            className={`px-4 py-2 rounded-2xl border transition whitespace-nowrap flex items-center gap-1.5 ${
              queueTab === 'INCOMING'
                ? 'bg-[#bbf451] text-[#080d09] border-[#bbf451] shadow-[0_0_18px_rgba(187,244,81,0.25)] font-black'
                : 'bg-[#132015] text-slate-300 border-[#233827] hover:bg-[#18271b]'
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
            onClick={() => setQueueTab('ACTIVE')}
            className={`px-4 py-2 rounded-2xl border transition whitespace-nowrap ${
              queueTab === 'ACTIVE'
                ? 'bg-[#bbf451] text-[#080d09] border-[#bbf451] shadow-[0_0_18px_rgba(187,244,81,0.25)] font-black'
                : 'bg-[#132015] text-slate-300 border-[#233827] hover:bg-[#18271b]'
            }`}
          >
            Active Queue ({activeCount})
          </button>

          <button
            onClick={() => setQueueTab('READY')}
            className={`px-4 py-2 rounded-2xl border transition whitespace-nowrap flex items-center gap-1.5 ${
              queueTab === 'READY'
                ? 'bg-[#bbf451] text-[#080d09] border-[#bbf451] shadow-[0_0_18px_rgba(187,244,81,0.25)] font-black'
                : 'bg-[#132015] text-slate-300 border-[#233827] hover:bg-[#18271b]'
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
                ? 'bg-[#bbf451] text-[#080d09] border-[#bbf451] shadow-[0_0_18px_rgba(187,244,81,0.25)] font-black'
                : 'bg-[#132015] text-slate-300 border-[#233827] hover:bg-[#18271b]'
            }`}
          >
            All Order History ({orders.length})
          </button>
        </div>

        {/* Real-Time Live Order Alert Banner */}
        {newOrderNotice && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-[#0e1d11] border-2 border-[#bbf451]/60 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 shadow-[0_0_30px_rgba(187,244,81,0.25)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#bbf451] text-[#080d09] flex items-center justify-center font-black shrink-0 shadow-[0_0_15px_rgba(187,244,81,0.4)]">
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <strong className="block text-sm font-extrabold text-[#bbf451] font-syne">
                  🎉 New Print Order Arrived Live! Reference #{newOrderNotice.ref}
                </strong>
                <span className="text-[11px] text-slate-300">
                  Customer submitted {newOrderNotice.files} document(s) at {newOrderNotice.time}. Order has been automatically brought to your Incoming Queue!
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setQueueTab('INCOMING')}
                className="px-3.5 py-1.5 rounded-xl bg-[#bbf451] text-[#080d09] font-black text-xs hover:bg-[#a6db42] transition shadow-md"
              >
                View Now
              </button>
              <button
                onClick={() => setNewOrderNotice(null)}
                className="text-slate-400 hover:text-white font-bold text-xs underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Customer Message Real-Time Alert Banner */}
        {chatNotice && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/90 to-[#0c1a24] border-2 border-blue-400/60 text-blue-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <MessageSquare className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <strong className="block text-sm font-extrabold text-white font-syne">
                  💬 New Customer Message on #{chatNotice.orderRef}
                </strong>
                <span className="text-[11px] text-blue-200">
                  {chatNotice.customerAlias ? `${chatNotice.customerAlias}: ` : ''}"{chatNotice.message}" • {chatNotice.time}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  const target = orders.find((o) => o.id === chatNotice.orderId || o.order_reference === chatNotice.orderRef);
                  if (target) {
                    setChatOrderModal(target);
                  } else {
                    setChatOrderModal({
                      id: chatNotice.orderId,
                      order_reference: chatNotice.orderRef,
                      messages: [{ sender_role: 'CUSTOMER', message: chatNotice.message, created_at: new Date().toISOString() }]
                    });
                  }
                  setChatNotice(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-blue-500 text-white font-black text-xs hover:bg-blue-400 transition shadow-md"
              >
                Reply Now
              </button>
              <button
                onClick={() => setChatNotice(null)}
                className="text-blue-300 hover:text-white font-bold text-xs underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* QR Code Scanned Real-Time Alert Banner */}
        {qrScanNotice && (
          <div className="p-4 rounded-2xl bg-indigo-950/70 border-2 border-indigo-500/50 text-indigo-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 shadow-[0_0_25px_rgba(99,102,241,0.2)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold shrink-0">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <strong className="block text-sm font-extrabold text-white font-syne">
                  🔔 Counter Alert: Customer Scanned Counter QR Code!
                </strong>
                <span className="text-[11px] text-indigo-300">
                  A customer just scanned your shop QR {qrScanNotice.shopName ? `(${qrScanNotice.shopName}) ` : ''}at {qrScanNotice.time}. Uploaded documents will arrive in this queue momentarily.
                </span>
              </div>
            </div>
            <button
              onClick={() => setQrScanNotice(null)}
              className="text-indigo-400 hover:text-white font-bold text-xs underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Global Alert Notification */}
        {printAlert && (
          <div
            className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
              printAlert.type === 'success'
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                : 'bg-rose-950/70 text-rose-300 border border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
            }`}
          >
            <div className="flex items-center gap-2">
              {printAlert.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#bbf451]" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span className="font-medium text-white">{printAlert.message}</span>
            </div>
            <button
              onClick={() => setPrintAlert(null)}
              className="text-xs font-bold underline hover:no-underline shrink-0 text-slate-300 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Orders List / Empty State */}
        {loading ? (
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-16 border border-[#273d2c] text-center space-y-3 shadow-lg">
            <div className="w-8 h-8 border-3 border-[#bbf451] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400">Checking incoming print orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-16 border border-[#273d2c] text-center space-y-3 shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-[#162519] text-slate-500 flex items-center justify-center mx-auto border border-[#273d2c]">
              <Printer className="w-7 h-7 text-[#bbf451]/60" />
            </div>
            <h3 className="text-base font-extrabold text-white font-syne">No Orders in this View</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
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
                  className={`rounded-3xl p-5 sm:p-6 border transition-all ${
                    isNew
                      ? 'bg-gradient-to-b from-[#16261a] via-[#101b12] to-[#0a120c] border-[#bbf451] ring-2 ring-[#bbf451]/30 shadow-[0_0_30px_rgba(187,244,81,0.2)]'
                      : isFailed
                      ? 'bg-[#141012] border-rose-500/40 shadow-sm'
                      : isReady
                      ? 'bg-gradient-to-b from-[#132216] via-[#0e1910] to-[#09110b] border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                      : 'bg-gradient-to-b from-[#132015] via-[#0f1911] to-[#0a110c] border border-[#233827] shadow-[0_12px_36px_rgba(0,0,0,0.5)] hover:border-[#38563e]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Order Info & Document Settings */}
                    <div className="space-y-2 min-w-0 flex-1">
                      {/* Top Row: Ref, Time & Lifecycle Status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 font-mono font-black text-white text-sm">
                          <span>{order.order_reference}</span>
                          <button
                            onClick={() => handleCopy(order.order_reference)}
                            className="text-slate-400 hover:text-[#bbf451] p-0.5 transition"
                            title="Copy Reference"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {copiedRef === order.order_reference && (
                            <span className="text-[10px] text-[#bbf451] font-sans font-bold">Copied!</span>
                          )}
                        </div>

                        <span className="text-[#2a4331]">•</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {createdTime}
                        </span>

                        {/* Status Badges */}
                        {isNew && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#bbf451]/20 text-[#bbf451] border border-[#bbf451]/50 animate-pulse">
                            New Incoming
                          </span>
                        )}
                        {isAccepted && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            Accepted
                          </span>
                        )}
                        {isQueued && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            Queued in Spooler
                          </span>
                        )}
                        {isPrinting && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            Printing in Hardware...
                          </span>
                        )}
                        {isReady && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Ready for Pickup
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#162519] text-slate-300 border border-[#273d2c]">
                            Completed &amp; Handed Over
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            Declined
                          </span>
                        )}
                        {isCancelled && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#162519] text-slate-400 border border-[#273d2c]">
                            Cancelled
                          </span>
                        )}
                        {isFailed && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/50">
                            Spooler Error
                          </span>
                        )}
                      </div>

                      {/* Middle Row: Document details */}
                      <div className="flex items-center gap-3 flex-wrap pt-1">
                        <div className="flex items-center gap-2 bg-[#162519] border border-[#273d2c] px-3 py-1.5 rounded-xl">
                          <FileText className="w-4 h-4 text-[#bbf451] shrink-0" />
                          <span className="text-xs font-bold text-white truncate max-w-xs">
                            {order.original_filename || 'document.pdf'}
                          </span>
                          {(order.file_count > 1 || (order.documents && order.documents.length > 1)) && (
                            <span className="px-2 py-0.5 rounded-md bg-[#bbf451]/15 text-[#bbf451] text-[10px] font-black shrink-0 border border-[#bbf451]/30">
                              {order.file_count || order.documents.length} Files ({order.page_count} pgs)
                            </span>
                          )}
                          <button
                            onClick={() => setPreviewDoc(order)}
                            className="p-1 rounded text-slate-400 hover:text-white transition"
                            title="Preview Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`/owner/orders/${order.id}`}
                            className="text-[11px] font-bold text-[#bbf451] hover:underline pl-1 shrink-0"
                            title="View all attached documents and order history"
                          >
                            Details &rarr;
                          </a>
                        </div>

                        {/* Setting Tags */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-extrabold">
                          <span className="px-2.5 py-1 rounded-xl bg-[#162519] text-slate-200 border border-[#273d2c]">
                            {order.paper_size || 'A4'}
                          </span>
                          <span className={`px-2.5 py-1 rounded-xl ${
                            order.color_mode === 'COLOR'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-[#162519] text-slate-200 border border-[#273d2c]'
                          }`}>
                            {order.color_mode === 'COLOR' ? 'Colour' : 'B & W'}
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-[#162519] text-slate-200 border border-[#273d2c]">
                            {order.is_duplex ? 'Double-Sided' : 'Single-Sided'}
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-[#162519] text-slate-200 border border-[#273d2c]">
                            {order.copies || 1} {order.copies === 1 ? 'Copy' : 'Copies'}
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-[#bbf451]/15 text-[#bbf451] border border-[#bbf451]/30 font-mono">
                            ₹{parseFloat(order.final_amount || order.estimated_amount || '0').toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Custom instructions / page range notes */}
                      {order.custom_notes && (
                        <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl max-w-lg">
                          <strong>Note:</strong> {order.custom_notes}
                        </div>
                      )}

                      {/* Pickup OTP prompt when ready */}
                      {order.pickup_otp && isReady && (
                        <div className="text-xs text-emerald-300 flex items-center gap-2 font-mono">
                          <span>Expected Pickup OTP:</span>
                          <span className="bg-[#bbf451] text-[#080d09] px-2 py-0.5 rounded-lg font-black">{order.pickup_otp}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 flex-wrap">
                      <button
                        onClick={() => {
                          setChatOrderModal(order);
                          setChatReplyText('');
                        }}
                        className="px-3 py-2.5 rounded-2xl border border-[#273d2c] bg-[#162519] hover:bg-[#203323] text-slate-200 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                        title="Chat with Customer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#bbf451]" />
                        <span>Chat{order.messages && order.messages.length > 0 ? ` (${order.messages.length})` : ''}</span>
                      </button>
                      {/* NEW / SUBMITTED / RECEIVED */}
                      {isNew && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'ACCEPTED', 'Order accepted and approved by staff.')}
                            className="px-3.5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-98"
                            title="Accept and approve print request immediately"
                          >
                            <Check className="w-4 h-4" />
                            Accept
                          </button>

                          <button
                            onClick={() => handleAcceptAndPrint(order)}
                            disabled={directPrintingId === order.id}
                            className="px-4 py-2.5 rounded-2xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] font-black text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(187,244,81,0.25)] transition active:scale-98"
                            title={defaultPrinter ? `Print directly to ${defaultPrinter.name}` : 'Print to Windows Printer'}
                          >
                            <Printer className="w-4 h-4" />
                            {directPrintingId === order.id ? 'Sending...' : 'Accept & Print'}
                          </button>

                          <button
                            onClick={() => handleOpenManualPrint(order)}
                            className="px-3.5 py-2.5 rounded-2xl border border-[#273d2c] bg-[#162519] hover:bg-[#203323] text-slate-200 font-bold text-xs flex items-center gap-1.5 transition"
                            title="Open browser or Windows print dialog fallback"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                            Manual Print
                          </button>

                          <button
                            onClick={() => setRejectOrderModal(order)}
                            className="px-3 py-2.5 rounded-2xl border border-rose-500/40 hover:bg-rose-500/10 text-rose-400 font-bold text-xs transition"
                            title="Decline order"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {/* ACCEPTED / QUEUED / FAILED */}
                      {(isAccepted || isQueued || isFailed) && (
                        <>
                          {isAccepted && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'PRINTING', 'Printing physically started in printer.')}
                              className="px-3.5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-98"
                              title="Mark order as printing in progress"
                            >
                              <Printer className="w-4 h-4" />
                              Start Printing
                            </button>
                          )}

                          <button
                            onClick={() => handleAcceptAndPrint(order)}
                            disabled={directPrintingId === order.id}
                            className="px-4 py-2.5 rounded-2xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] font-black text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(187,244,81,0.25)] transition active:scale-98"
                          >
                            <Printer className="w-4 h-4" />
                            {isFailed ? 'Retry Print' : 'Send to Printer'}
                          </button>

                          <button
                            onClick={() => handleOpenManualPrint(order)}
                            className="px-3.5 py-2.5 rounded-2xl border border-[#273d2c] bg-[#162519] hover:bg-[#203323] text-slate-200 font-bold text-xs flex items-center gap-1.5 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
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
                            className="px-4 py-2.5 rounded-2xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] font-black text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(187,244,81,0.25)] transition"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Confirm Printed
                          </button>

                          <button
                            onClick={() => handleOpenManualPrint(order)}
                            className="px-3.5 py-2.5 rounded-2xl border border-[#273d2c] text-slate-300 hover:bg-[#162519] text-xs font-semibold"
                          >
                            Reprint
                          </button>
                        </>
                      )}

                      {/* READY FOR PICKUP */}
                      {isReady && (
                        <button
                          onClick={() => setCompleteOrderModal(order)}
                          className="px-5 py-2.5 rounded-2xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] font-black text-xs flex items-center gap-1.5 shadow-[0_0_25px_rgba(187,244,81,0.3)] transition"
                        >
                          <PackageCheck className="w-4 h-4" />
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

      {/* Customer Private Chat Modal */}
      {chatOrderModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl max-w-lg w-full border border-[#273d2c] shadow-[0_25px_60px_rgba(0,0,0,0.9)] p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#233827]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#bbf451]/15 text-[#bbf451] border border-[#bbf451]/30 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-[#bbf451]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white font-syne">
                    Customer Chat — #{chatOrderModal.order_reference || chatOrderModal.orderReference}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {chatOrderModal.customer_alias || 'Guest Customer'} • ₹{parseFloat(chatOrderModal.final_amount || chatOrderModal.estimated_amount || '0').toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChatOrderModal(null)}
                className="p-1.5 rounded-xl border border-[#273d2c] text-slate-400 hover:text-white hover:bg-[#162519] transition"
              >
                ✕
              </button>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#0c140e] rounded-2xl border border-[#203324] min-h-[220px] max-h-[360px]">
              {chatOrderModal.messages && chatOrderModal.messages.length > 0 ? (
                chatOrderModal.messages.map((m: any, idx: number) => {
                  const isOwner = m.sender_role === 'SHOP_OWNER';
                  return (
                    <div
                      key={m.id || idx}
                      className={`flex flex-col ${isOwner ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] text-slate-400 font-medium mb-1">
                        {isOwner ? 'You (Shopkeeper)' : (chatOrderModal.customer_alias || 'Customer')} • {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                          isOwner
                            ? 'bg-[#1b3320] border border-[#2d5635] text-white rounded-br-xs shadow-sm'
                            : 'bg-[#bbf451] text-[#080d09] font-semibold rounded-bl-xs'
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
                  <p className="text-xs font-bold text-white">No messages yet on this order</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Send a direct update or answer any customer questions without WhatsApp.
                  </p>
                </div>
              )}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendOwnerReply} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Type reply to customer..."
                value={chatReplyText}
                onChange={(e) => setChatReplyText(e.target.value)}
                className="flex-1 px-4 py-2.5 text-xs border border-[#273d2c] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#bbf451] bg-[#0c140e] text-white placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={sendingChatReply || !chatReplyText.trim()}
                className="px-5 py-2.5 rounded-2xl bg-[#bbf451] hover:bg-[#cbff5e] disabled:bg-[#1b2b1d] disabled:text-slate-500 text-[#080d09] font-black text-xs transition shadow-[0_0_15px_rgba(187,244,81,0.25)] flex items-center gap-1.5 shrink-0"
              >
                {sendingChatReply ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reject Order Confirmation Dialog */}
      {rejectOrderModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl max-w-md w-full border border-[#273d2c] shadow-[0_25px_60px_rgba(0,0,0,0.9)] p-6 sm:p-8 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white font-syne">Decline Order</h3>
                <p className="text-xs text-slate-400 font-mono">Order #{rejectOrderModal.order_reference}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Provide a reason for declining this order so the customer can be notified on their tracking screen.
            </p>

            <input
              type="text"
              placeholder="e.g. Paper size out of stock, unreadable document"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-[#273d2c] rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-[#0c140e] text-white"
            />

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleRejectOrder}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition active:scale-98"
              >
                Confirm Decline
              </button>
              <button
                onClick={() => setRejectOrderModal(null)}
                className="py-2.5 px-4 rounded-xl border border-[#273d2c] text-slate-300 hover:bg-[#162519] text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover & Complete Order Confirmation Dialog */}
      {completeOrderModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl max-w-md w-full border border-[#273d2c] shadow-[0_25px_60px_rgba(0,0,0,0.9)] p-6 sm:p-8 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#bbf451]/15 text-[#bbf451] border border-[#bbf451]/30 flex items-center justify-center">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white font-syne">Confirm Counter Handover</h3>
                <p className="text-xs text-slate-400 font-mono">Order #{completeOrderModal.order_reference}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c140e] border border-[#273d2c] text-xs text-slate-300 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Amount:</span>
                <strong className="font-mono text-[#bbf451] text-base font-black">
                  ₹{parseFloat(completeOrderModal.final_amount || completeOrderModal.estimated_amount || '0').toFixed(2)}
                </strong>
              </div>
              {completeOrderModal.pickup_otp && (
                <div className="flex justify-between items-center pt-2 border-t border-[#233827]">
                  <span className="text-slate-400">Customer Pickup Code:</span>
                  <span className="font-mono font-black text-[#080d09] bg-[#bbf451] px-2.5 py-0.5 rounded-lg border border-[#bbf451] shadow-[0_0_12px_rgba(187,244,81,0.3)]">
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
              className="w-full px-3.5 py-2.5 text-xs text-center font-mono border border-[#273d2c] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bbf451] bg-[#0c140e] text-white"
            />

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCompleteOrder}
                className="flex-1 py-3 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] font-black text-xs shadow-[0_0_20px_rgba(187,244,81,0.25)] transition active:scale-98"
              >
                Confirm Handover &amp; Archive
              </button>
              <button
                onClick={() => setCompleteOrderModal(null)}
                className="py-3 px-4 rounded-xl border border-[#273d2c] text-slate-300 hover:bg-[#162519] text-xs font-semibold"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Print Confirmation Dialog */}
      {manualPrintOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl max-w-md w-full border border-[#273d2c] shadow-[0_25px_60px_rgba(0,0,0,0.9)] p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#bbf451]/15 text-[#bbf451] border border-[#bbf451]/30 flex items-center justify-center">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white font-syne">Manual Print Fallback</h3>
                <p className="text-xs text-slate-400 font-mono">Order #{manualPrintOrder.order_reference}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c140e] border border-[#273d2c] text-xs text-slate-300 space-y-1.5">
              <p>
                The document was opened in a new tab for printing using your browser / Windows print dialog.
              </p>
              <p className="text-slate-400 text-[11px]">
                Once printed on your shop printer, update the order status:
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleConfirmManualPrint('READY_FOR_PICKUP')}
                className="w-full py-2.5 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(187,244,81,0.25)] transition active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark as "Ready for Pickup"
              </button>

              <button
                onClick={() => handleConfirmManualPrint('COMPLETED')}
                className="w-full py-2.5 rounded-xl bg-[#162519] hover:bg-[#203323] text-white border border-[#273d2c] font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
              >
                Mark as "Completed"
              </button>

              <button
                onClick={() => setManualPrintOrder(null)}
                className="w-full py-2 rounded-xl text-slate-400 hover:bg-[#162519] font-semibold text-xs"
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

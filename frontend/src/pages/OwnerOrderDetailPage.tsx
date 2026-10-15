import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Eye,
  Download,
  Send,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';

export const OwnerOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getOwnerOrderDetail(id);
      setOrderData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !id) return;

    setSendingMessage(true);
    try {
      await api.sendOwnerMessage(id, messageText.trim());
      setMessageText('');
      await loadDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id) return;
    try {
      await api.updateOrderStatus(id, newStatus);
      await loadDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4" />
        <p className="text-sm text-slate-500">Loading order detail...</p>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-lg font-bold text-navy-900 mb-2">Order Not Found</h2>
        <p className="text-xs text-slate-600 mb-6">{error || 'Could not find this order.'}</p>
        <Link
          to="/owner/dashboard"
          className="px-4 py-2 bg-navy-900 text-white rounded-lg text-xs font-semibold"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { order, history, messages } = orderData;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top back nav & status bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/owner/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-500">OTP: <strong className="text-brand-600">{order.pickup_otp}</strong></span>
          <StatusBadge status={order.status} size="lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Job Specifications & Document Sandbox Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-glass space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-slate-400 font-mono">ORDER REFERENCE</span>
                <h1 className="text-2xl font-extrabold text-navy-950 font-mono">{order.order_reference}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customer Alias: <strong>{order.customer_alias || 'Guest'}</strong>
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400">Total Price</span>
                <div className="text-2xl font-extrabold text-brand-600 font-mono">₹{order.final_amount}</div>
              </div>
            </div>

            {/* Multi-Document Attached List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Attached Documents ({(order.documents && order.documents.length) || 1})</span>
                <span className="text-[11px] text-slate-400 font-mono">Total {order.page_count} Pages</span>
              </div>

              {((order.documents && order.documents.length > 0) ? order.documents : [{
                id: order.document_id,
                original_filename: order.original_filename,
                file_size: order.file_size,
                mime_type: order.mime_type,
                page_count: order.page_count,
                sha256_hash: order.sha256_hash,
              }]).map((doc: any, index: number) => (
                <div key={doc.id || index} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-navy-900 truncate" title={doc.original_filename}>
                          {index + 1}. {doc.original_filename || 'Customer Document'}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {doc.file_size ? `${(doc.file_size / (1024 * 1024)).toFixed(2)} MB` : ''} • {doc.page_count || 1} Pages
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPreviewDoc({
                            orderId: order.id,
                            docId: doc.id || order.document_id,
                            originalFilename: doc.original_filename,
                            mimeType: doc.mime_type || 'application/pdf',
                            sha256Hash: doc.sha256_hash,
                          });
                          setPreviewOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-navy-900 flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-600" />
                        Preview
                      </button>
                      <a
                        href={`/api/orders/owner/${order.id}/documents/${doc.id || order.document_id}/download`}
                        download={doc.original_filename}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-navy-900 hover:bg-brand-600 text-white flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    </div>
                  </div>

                  {doc.sha256_hash && (
                    <div className="text-[10px] text-slate-500 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200 truncate">
                      SHA-256: {doc.sha256_hash}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Print Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Paper Size</span>
                <span className="font-bold text-navy-900 text-sm">{order.paper_size}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Color Mode</span>
                <span className="font-bold text-navy-900 text-sm">{order.color_mode === 'BW' ? 'Black & White' : 'Color'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Sides</span>
                <span className="font-bold text-navy-900 text-sm">{order.is_duplex ? 'Double-Sided' : 'Single-Sided'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Copies</span>
                <span className="font-bold text-navy-900 text-sm">{order.copies}</span>
              </div>
            </div>

            {order.custom_notes && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs space-y-1">
                <span className="font-bold text-amber-950 uppercase tracking-wider text-[10px]">Customer Notes:</span>
                <p className="text-amber-900">{order.custom_notes}</p>
              </div>
            )}

            {/* Quick Transition Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2.5">
              {order.status === 'SUBMITTED' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('ACCEPTED')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-navy-900 hover:bg-brand-600 text-white transition-colors"
                >
                  Accept Print Job
                </button>
              )}
              {order.status === 'ACCEPTED' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('PRINTING')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Start Printing
                </button>
              )}
              {order.status === 'PRINTING' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('READY_FOR_PICKUP')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  Mark Ready for Counter Pickup
                </button>
              )}
              {order.status === 'READY_FOR_PICKUP' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('COMPLETED')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                >
                  Confirm Customer Pickup (Complete)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Private Order Messaging */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-glass flex flex-col h-[560px] overflow-hidden">
          <div className="px-6 py-4 bg-navy-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Customer Private Chat</h3>
            </div>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300">
              In-Order Isolated
            </span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
            {messages && messages.length > 0 ? (
              messages.map((m: any) => {
                const isOwner = m.sender_role === 'SHOP_OWNER';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isOwner ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-slate-400 font-medium mb-1">
                      {isOwner ? 'You (Shop)' : 'Customer'} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        isOwner
                          ? 'bg-navy-900 text-white rounded-br-xs'
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
                <p className="text-xs font-medium text-slate-500">No messages yet</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Send a clarification to the customer without asking for their phone number.
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              placeholder="Message customer..."
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

      {/* Document Sandbox Modal */}
      {previewOpen && (
        <DocumentPreviewModal
          isOpen={previewOpen}
          onClose={() => {
            setPreviewOpen(false);
            setSelectedPreviewDoc(null);
          }}
          orderId={selectedPreviewDoc?.orderId || order.id}
          docId={selectedPreviewDoc?.docId || order.document_id}
          originalFilename={selectedPreviewDoc?.originalFilename || order.original_filename || 'Customer_Document.pdf'}
          mimeType={selectedPreviewDoc?.mimeType || order.mime_type || 'application/pdf'}
          sha256Hash={selectedPreviewDoc?.sha256Hash || order.sha256_hash}
        />
      )}
    </div>
  );
};

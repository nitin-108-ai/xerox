import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  FileText,
  Lock,
  Layers,
  Check,
  Ban
} from 'lucide-react';
import { api } from '../services/api';

export const AdminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SHOPS' | 'VERIFICATION' | 'AUDIT'>('VERIFICATION');

  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [mRes, sRes, aRes] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminShops(),
        api.getAdminAuditLogs(),
      ]);
      setMetrics(mRes);
      setShops(sRes.shops);
      setAuditLogs(aRes.logs);
    } catch (err: any) {
      alert(err.message || 'Failed to load administrator portal data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleReviewVerification = async (shopId: string, status: 'APPROVED' | 'REJECTED') => {
    const feedback = feedbackMap[shopId] || '';
    try {
      await api.reviewShopVerification(shopId, status, feedback);
      alert(`Shop verification ${status.toLowerCase()} successfully.`);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to review verification.');
    }
  };

  const handleToggleShopStatus = async (shopId: string, currentActive: boolean) => {
    const nextActive = !currentActive;
    const confirm = window.confirm(
      `Are you sure you want to ${nextActive ? 'reactivate' : 'suspend'} this shop?`
    );
    if (!confirm) return;

    try {
      await api.toggleShopStatus(shopId, nextActive, 'Admin manual status update');
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle shop status.');
    }
  };

  const pendingShops = shops.filter((s) => !s.is_verified);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4" />
        <p className="text-sm text-slate-500">Loading administrative metrics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-navy-900 text-white rounded-3xl p-6 sm:p-8 shadow-glass flex flex-col md:flex-row md:items-center justify-between gap-6 border border-navy-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-300 bg-white/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
              Role: System Administrator
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Smart Xerox Administrative Console
          </h1>
          <p className="text-xs text-slate-300">
            Platform-wide shop verification, tenant status governance, and tamper-evident security audit logs.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAdminData}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 self-start md:self-auto transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Metrics
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Registered Shops
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-navy-950">
            {metrics?.shops?.total_shops || 0}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            {metrics?.shops?.verified_shops || 0} verified & active
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
            Pending Verification
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">
            {metrics?.shops?.pending_shops || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting admin review</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Orders
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-navy-950">
            {metrics?.orders?.total_orders || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            ₹{parseFloat(metrics?.orders?.platform_gross_volume || '0').toFixed(2)} GMV
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Active Stored Files
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-brand-600 font-mono">
            {metrics?.documents?.active_stored_files || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {metrics?.documents?.purged_files || 0} files auto-purged
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          type="button"
          onClick={() => setActiveTab('VERIFICATION')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'VERIFICATION'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-navy-900'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          Pending Verification Queue ({pendingShops.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SHOPS')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'SHOPS'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-navy-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          All Shops Directory ({shops.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AUDIT')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'AUDIT'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-navy-900'
          }`}
        >
          <Lock className="w-4 h-4" />
          Platform Security Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Shop Verification Review Queue */}
      {activeTab === 'VERIFICATION' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-glass overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy-900">
                Pending Xerox Shop Registrations
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review submitted documents before activating storefronts for public print jobs.
              </p>
            </div>
            <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
              {pendingShops.length} Pending
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Shop & Owner Details</th>
                  <th className="py-3 px-4">Verification Credentials</th>
                  <th className="py-3 px-4">Admin Feedback Note</th>
                  <th className="py-3 px-6 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {pendingShops.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">All shops verified!</p>
                      <p className="text-xs text-slate-400">No pending verification requests in the queue.</p>
                    </td>
                  </tr>
                ) : (
                  pendingShops.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-6">
                        <div className="font-bold text-navy-900 text-sm">{s.name}</div>
                        <div className="text-[11px] text-slate-500">{s.address}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Owner: <strong>{s.owner_name}</strong> ({s.owner_email})
                        </div>
                      </td>

                      <td className="py-4 px-4 text-xs">
                        <div>
                          Reg No: <strong className="font-mono text-navy-900">{s.business_registration_number || 'Not provided'}</strong>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                          {s.documents_note || 'Self-registered shop account'}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <input
                          type="text"
                          placeholder="Feedback or reason..."
                          value={feedbackMap[s.id] || ''}
                          onChange={(e) => setFeedbackMap({ ...feedbackMap, [s.id]: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleReviewVerification(s.id, 'APPROVED')}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve & Activate
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewVerification(s.id, 'REJECTED')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: All Shops Directory */}
      {activeTab === 'SHOPS' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-glass overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-sm font-bold text-navy-900">
              Platform Xerox Shop Directory
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage shop statuses, view order volumes, or suspend shops for policy violations.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Shop</th>
                  <th className="py-3 px-4">Owner & Contact</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Order Volume</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {shops.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-navy-900">{s.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">/shop/{s.slug}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>{s.owner_name}</div>
                      <div className="text-[11px] text-slate-400">{s.owner_email}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {s.is_verified ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-semibold">
                          Verified
                        </span>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px] font-semibold">
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-navy-900">
                      {s.order_count || 0} jobs
                    </td>

                    <td className="py-3.5 px-4">
                      {s.is_active ? (
                        <span className="text-emerald-600 font-semibold text-xs">Active</span>
                      ) : (
                        <span className="text-rose-600 font-semibold text-xs">Suspended</span>
                      )}
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleShopStatus(s.id, s.is_active)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                          s.is_active
                            ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {s.is_active ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Security Audit Logs */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-glass overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-brand-600" />
                Immutable System Audit Logs
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit trail for all sensitive operations, file downloads, verification reviews, and order state mutations.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-sans font-bold">
                <tr>
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-4">Actor Role</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Type & ID</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-6 text-slate-400 text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-navy-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                        {log.actor_role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-brand-600">{log.action}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {log.target_type} ({log.target_id ? log.target_id.substring(0, 12) + '...' : 'N/A'})
                    </td>
                    <td className="py-3 px-4 text-slate-500 truncate max-w-xs text-[11px]">
                      {log.details_json || '{}'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

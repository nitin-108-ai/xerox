import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  FileCheck2,
  CheckCircle2,
  RefreshCw,
  Lock,
  Check,
  ChevronRight
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
      <div className="min-h-screen bg-[#080d09] flex flex-col items-center justify-center px-4 py-20 text-center font-outfit">
        <div className="w-10 h-10 border-4 border-[#233827] border-t-[#bbf451] rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-400">Loading administrative telemetry & metrics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d09] text-slate-100 font-outfit py-8 sm:py-12 selection:bg-[#bbf451] selection:text-[#080d09]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-[#233827] bg-gradient-to-br from-[#162719] via-[#0f1b12] to-[#080d09] p-6 sm:p-8 shadow-2xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#bbf451]/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-2 z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#bbf451] bg-[#162719] border border-[#27452d] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-[#bbf451]" />
                Role: System Administrator
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white font-syne">
              Smart Xerox Administrative Console
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Platform-wide shop verification, tenant status governance, and tamper-evident security audit logs.
            </p>
          </div>

          <button
            type="button"
            onClick={loadAdminData}
            className="px-4 py-2.5 bg-[#121c14] hover:bg-[#1b2b1e] text-slate-200 border border-[#273d2c] hover:border-[#bbf451]/50 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 self-start md:self-auto cursor-pointer z-10"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#bbf451]" /> Refresh Metrics
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-[#233827] bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] p-5 shadow-lg relative overflow-hidden group hover:border-[#bbf451]/40 transition">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#bbf451]/5 rounded-full blur-xl group-hover:bg-[#bbf451]/15 transition" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Registered Shops
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {metrics?.shops?.total_shops || 0}
            </div>
            <div className="text-[11px] text-[#bbf451] font-semibold mt-1">
              {metrics?.shops?.verified_shops || 0} verified & active
            </div>
          </div>

          <div className="rounded-2xl border border-[#233827] bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/15 transition" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-1">
              Pending Verification
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
              {metrics?.shops?.pending_shops || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Awaiting admin review</div>
          </div>

          <div className="rounded-2xl border border-[#233827] bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] p-5 shadow-lg relative overflow-hidden group hover:border-[#bbf451]/40 transition">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#bbf451]/5 rounded-full blur-xl group-hover:bg-[#bbf451]/15 transition" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total Orders
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {metrics?.orders?.total_orders || 0}
            </div>
            <div className="text-[11px] text-slate-300 mt-1 font-mono font-bold">
              ₹{parseFloat(metrics?.orders?.platform_gross_volume || '0').toFixed(2)} GMV
            </div>
          </div>

          <div className="rounded-2xl border border-[#233827] bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] p-5 shadow-lg relative overflow-hidden group hover:border-[#bbf451]/40 transition">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#bbf451]/5 rounded-full blur-xl group-hover:bg-[#bbf451]/15 transition" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Active Stored Files
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#bbf451] font-mono">
              {metrics?.documents?.active_stored_files || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {metrics?.documents?.purged_files || 0} files auto-purged
            </div>
          </div>
        </div>

        {/* Tabs Header */}
        <div className="flex border-b border-[#233827] space-x-2 sm:space-x-4 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('VERIFICATION')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer rounded-t-xl ${
              activeTab === 'VERIFICATION'
                ? 'border-[#bbf451] text-[#bbf451] bg-[#142317]/60 font-black'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-[#121c14]/40'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            Pending Verification Queue ({pendingShops.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SHOPS')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer rounded-t-xl ${
              activeTab === 'SHOPS'
                ? 'border-[#bbf451] text-[#bbf451] bg-[#142317]/60 font-black'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-[#121c14]/40'
            }`}
          >
            <Building2 className="w-4 h-4" />
            All Shops Directory ({shops.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AUDIT')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer rounded-t-xl ${
              activeTab === 'AUDIT'
                ? 'border-[#bbf451] text-[#bbf451] bg-[#142317]/60 font-black'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-[#121c14]/40'
            }`}
          >
            <Lock className="w-4 h-4" />
            Platform Security Audit Logs ({auditLogs.length})
          </button>
        </div>

        {/* Tab 1: Shop Verification Review Queue */}
        {activeTab === 'VERIFICATION' && (
          <div className="rounded-3xl border border-[#233827] bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="p-6 border-b border-[#233827] flex items-center justify-between bg-[#0e1710]/50">
              <div>
                <h3 className="text-base font-black text-white font-syne">
                  Pending Xerox Shop Registrations
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review submitted documents before activating storefronts for public print jobs.
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-amber-950/40 text-amber-300 border border-amber-800/50 px-3 py-1 rounded-full shadow-xs">
                {pendingShops.length} Pending
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0c140e] text-slate-400 font-bold uppercase tracking-wider border-b border-[#1b2b1e]">
                  <tr>
                    <th className="py-3 px-6">Shop & Owner Details</th>
                    <th className="py-3 px-4">Verification Credentials</th>
                    <th className="py-3 px-4">Admin Feedback Note</th>
                    <th className="py-3 px-6 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b2b1e] font-medium text-slate-300">
                  {pendingShops.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-14 text-center text-slate-400">
                        <CheckCircle2 className="w-10 h-10 text-[#bbf451] mx-auto mb-3" />
                        <p className="font-bold text-white text-sm font-syne">All shops verified!</p>
                        <p className="text-xs text-slate-400 mt-1">No pending verification requests in the queue.</p>
                      </td>
                    </tr>
                  ) : (
                    pendingShops.map((s) => (
                      <tr key={s.id} className="hover:bg-[#121c14]/50 transition">
                        <td className="py-4 px-6">
                          <div className="font-bold text-white text-sm font-syne">{s.name}</div>
                          <div className="text-[11px] text-slate-400">{s.address}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Owner: <strong className="text-slate-200">{s.owner_name}</strong> ({s.owner_email})
                          </div>
                        </td>

                        <td className="py-4 px-4 text-xs">
                          <div>
                            Reg No: <strong className="font-mono text-white">{s.business_registration_number || 'Not provided'}</strong>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                            {s.documents_note || 'Self-registered shop account'}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <input
                            type="text"
                            placeholder="Feedback or reason..."
                            value={feedbackMap[s.id] || ''}
                            onChange={(e) => setFeedbackMap({ ...feedbackMap, [s.id]: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs border border-[#273d2c] bg-[#0c140e] text-white rounded-lg placeholder-slate-500 focus:outline-hidden focus:border-[#bbf451] transition"
                          />
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleReviewVerification(s.id, 'APPROVED')}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] shadow-md shadow-[#bbf451]/20 transition flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve & Activate
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewVerification(s.id, 'REJECTED')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-900/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 transition cursor-pointer"
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
          <div className="rounded-3xl border border-[#233827] bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="p-6 border-b border-[#233827] bg-[#0e1710]/50">
              <h3 className="text-base font-black text-white font-syne">
                Platform Xerox Shop Directory
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage shop statuses, view order volumes, or suspend shops for policy violations.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0c140e] text-slate-400 font-bold uppercase tracking-wider border-b border-[#1b2b1e]">
                  <tr>
                    <th className="py-3 px-6">Shop</th>
                    <th className="py-3 px-4">Owner & Contact</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Order Volume</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b2b1e] font-medium text-slate-300">
                  {shops.map((s) => (
                    <tr key={s.id} className="hover:bg-[#121c14]/50 transition">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-white font-syne">{s.name}</div>
                        <div className="text-[11px] text-[#bbf451] font-mono">/shop/{s.slug}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-white font-semibold">{s.owner_name}</div>
                        <div className="text-[11px] text-slate-400">{s.owner_email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {s.is_verified ? (
                          <span className="text-[#bbf451] bg-[#162719] px-2.5 py-0.5 rounded-full border border-[#233827] text-[11px] font-bold">
                            Verified
                          </span>
                        ) : (
                          <span className="text-amber-300 bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-800/40 text-[11px] font-bold">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {s.order_count || 0} jobs
                      </td>

                      <td className="py-3.5 px-4">
                        {s.is_active ? (
                          <span className="text-[#bbf451] font-bold text-xs">Active</span>
                        ) : (
                          <span className="text-rose-400 font-bold text-xs">Suspended</span>
                        )}
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleShopStatus(s.id, s.is_active)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            s.is_active
                              ? 'border-rose-900/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40'
                              : 'border-[#23582d] bg-[#122818] text-[#bbf451] hover:bg-[#16331f]'
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
          <div className="rounded-3xl border border-[#233827] bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="p-6 border-b border-[#233827] bg-[#0e1710]/50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white font-syne flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#bbf451]" />
                  Immutable System Audit Logs
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Audit trail for all sensitive operations, file downloads, verification reviews, and order state mutations.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0c140e] text-slate-400 uppercase tracking-wider font-sans font-bold border-b border-[#1b2b1e]">
                  <tr>
                    <th className="py-3 px-6">Timestamp</th>
                    <th className="py-3 px-4">Actor Role</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Type & ID</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b2b1e] text-slate-300">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#121c14]/50 transition">
                      <td className="py-3 px-6 text-slate-400 text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-200 bg-[#0c140e] border border-[#273d2c] px-2 py-0.5 rounded text-[11px]">
                          {log.actor_role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#bbf451]">{log.action}</td>
                      <td className="py-3 px-4 text-slate-300">
                        {log.target_type} ({log.target_id ? log.target_id.substring(0, 12) + '...' : 'N/A'})
                      </td>
                      <td className="py-3 px-4 text-slate-400 truncate max-w-xs text-[11px]">
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
    </div>
  );
};

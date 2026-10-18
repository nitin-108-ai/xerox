import React, { useState, useEffect } from 'react';
import { DollarSign, Printer, CheckCircle2, TrendingUp, BarChart3, Layers, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { OwnerLayout } from '../components/OwnerLayout';

export const OwnerReportsPage: React.FC = () => {
  const [shop, setShop] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const [reportsRes, shopRes] = await Promise.allSettled([
          api.getOwnerReports(),
          api.getOwnerShop(),
        ]);
        if (reportsRes.status === 'fulfilled') {
          setReports(reportsRes.value);
        }
        if (shopRes.status === 'fulfilled') {
          setShop(shopRes.value.shop);
        }
      } catch (err: any) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  if (loading) {
    return (
      <OwnerLayout shop={shop} title="Shop Sales & Print Volume Reports">
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#bbf451] mb-4" />
          <p className="text-sm text-slate-400 font-medium">Loading shop performance metrics...</p>
        </div>
      </OwnerLayout>
    );
  }

  const summary = reports?.summary || {};
  const statusBreakdown = reports?.statusBreakdown || [];
  const paperBreakdown = reports?.paperSizeBreakdown || [];

  return (
    <OwnerLayout
      shop={shop}
      title="Shop Sales & Print Volume Reports"
      subtitle="Review counter revenue, completed print jobs, and volume distribution across paper types."
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Back Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/owner/dashboard"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#273d2c] bg-[#121c14] hover:bg-[#1b2b1e] text-slate-200 text-xs font-bold shadow-md transition"
          >
            <ArrowLeft className="w-4 h-4 text-[#bbf451]" />
            <span>Back to Receiving Panel</span>
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-[#bbf451] bg-[#bbf451]/10 px-3 py-1 rounded-full border border-[#bbf451]/30">
            Realtime Ledger
          </span>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#bbf451]">Gross Counter Revenue</span>
              <div className="w-8 h-8 rounded-xl bg-[#bbf451]/10 border border-[#bbf451]/30 flex items-center justify-center text-[#bbf451]">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#bbf451] font-mono tracking-tight">
              ₹{parseFloat(summary.total_revenue || '0').toFixed(2)}
            </div>
            <div className="text-xs text-slate-400 mt-1">From completed print orders</div>
          </div>

          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">Completed Jobs</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-white font-syne">
              {summary.completed_orders || 0}
            </div>
            <div className="text-xs text-slate-400 mt-1">Out of {summary.total_orders || 0} total requests</div>
          </div>

          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-400">Active Queue</span>
              <div className="w-8 h-8 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Printer className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-white font-syne">
              {summary.active_orders || 0}
            </div>
            <div className="text-xs text-slate-400 mt-1">Orders currently in progress</div>
          </div>

          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">Storefront Visits</span>
              <div className="w-8 h-8 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-300 font-mono tracking-tight">
              {summary.total_visits || 0}
            </div>
            <div className="text-xs text-slate-400 mt-1">{summary.today_visits || 0} visits recorded today</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Paper Size & Color Breakdown */}
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 sm:p-7 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 font-syne">
              <Layers className="w-4 h-4 text-[#bbf451]" />
              Volume Breakdown by Paper & Color
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0c140e] border-b border-[#273d2c] text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Size</th>
                    <th className="py-3 px-3">Color Mode</th>
                    <th className="py-3 px-3 text-right">Job Count</th>
                    <th className="py-3 px-3 text-right">Total Pages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#273d2c]/40 font-medium text-slate-300">
                  {paperBreakdown.length > 0 ? (
                    paperBreakdown.map((pb: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#142317]/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-white">
                          <span className="px-2 py-0.5 rounded-lg bg-[#0c140e] border border-[#273d2c] font-mono">
                            {pb.paper_size}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {pb.color_mode === 'BW' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                              B&W
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              Color
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-400">{pb.job_count}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#bbf451]">{pb.total_pages}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        No print volume recorded yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Status Distribution */}
          <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 sm:p-7 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 font-syne">
              <BarChart3 className="w-4 h-4 text-[#bbf451]" />
              Order Lifecycle Distribution
            </h3>

            <div className="space-y-3">
              {statusBreakdown.length > 0 ? (
                statusBreakdown.map((sb: any) => (
                  <div key={sb.status} className="flex items-center justify-between text-xs p-3 rounded-2xl bg-[#0c140e] border border-[#273d2c]">
                    <span className="font-semibold text-slate-200">{sb.status}</span>
                    <span className="font-mono font-bold text-[#bbf451] bg-[#bbf451]/10 px-2.5 py-0.5 rounded-full border border-[#bbf451]/20">
                      {sb.count} jobs
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-12">No order history recorded</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </OwnerLayout>
  );
};

import React, { useState, useEffect } from 'react';
import { DollarSign, Printer, CheckCircle2, XCircle, TrendingUp, BarChart3, Layers } from 'lucide-react';
import { api } from '../services/api';

export const OwnerReportsPage: React.FC = () => {
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const res = await api.getOwnerReports();
        setReports(res);
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
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4" />
        <p className="text-sm text-slate-500">Loading shop performance metrics...</p>
      </div>
    );
  }

  const summary = reports?.summary || {};
  const statusBreakdown = reports?.statusBreakdown || [];
  const paperBreakdown = reports?.paperSizeBreakdown || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
          Analytics & Ledger
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight mt-2">
          Shop Sales & Print Volume Reports
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review counter revenue, completed print jobs, and volume distribution across paper types.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-glass">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Gross Counter Revenue</span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-navy-950 font-mono">
            ₹{parseFloat(summary.total_revenue || '0').toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1">From completed orders</div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-glass">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Completed Print Jobs</span>
            <CheckCircle2 className="w-5 h-5 text-brand-600" />
          </div>
          <div className="text-3xl font-extrabold text-navy-950">
            {summary.completed_orders || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Out of {summary.total_orders || 0} total requests</div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-glass">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Active Queue</span>
            <Printer className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-extrabold text-navy-950">
            {summary.active_orders || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Orders currently processing</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Paper Size & Color Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-glass space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-brand-600" />
            Volume Breakdown by Paper & Color
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Color Mode</th>
                  <th className="py-2.5 px-3 text-right">Job Count</th>
                  <th className="py-2.5 px-3 text-right">Total Pages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paperBreakdown.length > 0 ? (
                  paperBreakdown.map((pb: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-bold text-navy-900">{pb.paper_size}</td>
                      <td className="py-2 px-3">{pb.color_mode === 'BW' ? 'B&W' : 'Color'}</td>
                      <td className="py-2 px-3 text-right font-mono">{pb.job_count}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-brand-600">{pb.total_pages}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No print volume recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-glass space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-brand-600" />
            Order Lifecycle Distribution
          </h3>

          <div className="space-y-3">
            {statusBreakdown.length > 0 ? (
              statusBreakdown.map((sb: any) => (
                <div key={sb.status} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-navy-900">{sb.status}</span>
                  <span className="font-mono font-bold text-brand-600">{sb.count} jobs</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">No order history recorded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

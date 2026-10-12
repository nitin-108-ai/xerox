import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Building2, Clock, Trash2, Check, AlertCircle, Save } from 'lucide-react';
import { api } from '../services/api';

export const OwnerSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [retentionHours, setRetentionHours] = useState<number>(24);

  // Pricing Rules State
  const [pricingRules, setPricingRules] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getOwnerShop();
      const shop = res.shop;
      setName(shop.name || '');
      setAddress(shop.address || '');
      setBusinessHours(shop.business_hours || '');
      setRetentionHours(shop.retention_hours || 24);

      setPricingRules(
        res.pricingRules.map((r: any) => ({
          paperSize: r.paper_size,
          colorMode: r.color_mode,
          singleSidedPrice: parseFloat(r.single_sided_price),
          doubleSidedPrice: parseFloat(r.double_sided_price),
          discountThreshold: r.per_page_discount_threshold || 50,
          discountRate: parseFloat(r.per_page_discount_rate || '0'),
        }))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to load shop settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      await api.updateOwnerProfile({
        name,
        address,
        businessHours,
        retentionHours: Number(retentionHours),
      });
      setSuccessMsg('Shop profile and document retention preferences saved.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save shop profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleRuleChange = (index: number, field: string, value: any) => {
    const updated = [...pricingRules];
    updated[index][field] = value;
    setPricingRules(updated);
  };

  const handlePricingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      await api.updateOwnerPricing(pricingRules);
      setSuccessMsg('Pricing rules and volume discounts updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update pricing rules.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4" />
        <p className="text-sm text-slate-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
          Storefront Configuration
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight mt-2">
          Shop Profile & Pricing Rules
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure your operating schedule, document auto-purge policy, and standard page printing rates.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Form 1: Shop Profile & Retention */}
      <form onSubmit={handleProfileSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-glass space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-600" />
            General Shop Details
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Shop Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Business Hours *
            </label>
            <input
              type="text"
              required
              value={businessHours}
              onChange={(e) => setBusinessHours(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Shop Address *
          </label>
          <input
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Document Auto-Purge Window (Hours) *
          </label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="1"
              max="168"
              required
              value={retentionHours}
              onChange={(e) => setRetentionHours(parseInt(e.target.value, 10) || 24)}
              className="w-32 px-3.5 py-2.5 text-xs font-bold font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-xs text-slate-500">
              Hours after which uploaded files are permanently erased from disk. (Min: 1h, Max: 168h / 7 days).
            </span>
          </div>
        </div>

        <div className="pt-2 text-right">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-brand-600 text-white text-xs font-bold shadow-xs transition-colors"
          >
            Save Profile Settings
          </button>
        </div>
      </form>

      {/* Form 2: Pricing Rules Table */}
      <form onSubmit={handlePricingSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-glass space-y-6">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-brand-600" />
            Pricing Rules & Volume Discounts
          </h2>
          <span className="text-[11px] text-slate-400">Currency: INR (₹)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Color</th>
                <th className="py-3 px-4">Single-Sided (₹)</th>
                <th className="py-3 px-4">Double-Sided (₹)</th>
                <th className="py-3 px-4">Bulk Threshold</th>
                <th className="py-3 px-4">Discount / Page (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {pricingRules.map((r, idx) => (
                <tr key={`${r.paperSize}-${r.colorMode}`} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-bold text-navy-900">{r.paperSize}</td>
                  <td className="py-2.5 px-4 font-semibold">{r.colorMode === 'BW' ? 'B&W' : 'Color'}</td>
                  <td className="py-2.5 px-4">
                    <input
                      type="number"
                      step="0.10"
                      min="0.10"
                      value={r.singleSidedPrice}
                      onChange={(e) => handleRuleChange(idx, 'singleSidedPrice', parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                    />
                  </td>
                  <td className="py-2.5 px-4">
                    <input
                      type="number"
                      step="0.10"
                      min="0.10"
                      value={r.doubleSidedPrice}
                      onChange={(e) => handleRuleChange(idx, 'doubleSidedPrice', parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                    />
                  </td>
                  <td className="py-2.5 px-4">
                    <input
                      type="number"
                      min="1"
                      value={r.discountThreshold}
                      onChange={(e) => handleRuleChange(idx, 'discountThreshold', parseInt(e.target.value, 10) || 50)}
                      className="w-20 px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                    />
                  </td>
                  <td className="py-2.5 px-4">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={r.discountRate}
                      onChange={(e) => handleRuleChange(idx, 'discountRate', parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-2 text-right">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-brand-600 text-white text-xs font-bold shadow-xs transition-colors"
          >
            Update Pricing Rules
          </button>
        </div>
      </form>
    </div>
  );
};

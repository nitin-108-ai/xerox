import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Printer,
  Copy,
  Scan,
  BookOpen,
  Shield,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calculator,
  Layers,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { OwnerLayout } from '../components/OwnerLayout';
import { api } from '../services/api';

interface PricingRule {
  paperSize: 'A4' | 'A3' | 'LEGAL' | 'LETTER';
  colorMode: 'BW' | 'COLOR';
  singleSidedPrice: number;
  doubleSidedPrice: number;
  discountThreshold: number;
  discountRate: number;
}

interface ServicePricing {
  serviceType: string;
  name: string;
  category: 'PHOTOCOPY' | 'SCANNING' | 'FINISHING';
  description: string;
  isEnabled: boolean;
  rate: number;
  unit: string;
}

const DEFAULT_PAPER_RULES: PricingRule[] = [
  // A4
  { paperSize: 'A4', colorMode: 'BW', singleSidedPrice: 2.0, doubleSidedPrice: 3.0, discountThreshold: 50, discountRate: 0.2 },
  { paperSize: 'A4', colorMode: 'COLOR', singleSidedPrice: 10.0, doubleSidedPrice: 18.0, discountThreshold: 20, discountRate: 1.0 },
  // A3
  { paperSize: 'A3', colorMode: 'BW', singleSidedPrice: 5.0, doubleSidedPrice: 8.0, discountThreshold: 30, discountRate: 0.5 },
  { paperSize: 'A3', colorMode: 'COLOR', singleSidedPrice: 20.0, doubleSidedPrice: 35.0, discountThreshold: 15, discountRate: 2.0 },
  // LEGAL
  { paperSize: 'LEGAL', colorMode: 'BW', singleSidedPrice: 3.0, doubleSidedPrice: 4.5, discountThreshold: 50, discountRate: 0.25 },
  { paperSize: 'LEGAL', colorMode: 'COLOR', singleSidedPrice: 12.0, doubleSidedPrice: 22.0, discountThreshold: 20, discountRate: 1.0 },
  // LETTER
  { paperSize: 'LETTER', colorMode: 'BW', singleSidedPrice: 2.0, doubleSidedPrice: 3.0, discountThreshold: 50, discountRate: 0.2 },
  { paperSize: 'LETTER', colorMode: 'COLOR', singleSidedPrice: 10.0, doubleSidedPrice: 18.0, discountThreshold: 20, discountRate: 1.0 },
];

const DEFAULT_FINISHING_SERVICES: ServicePricing[] = [
  {
    serviceType: 'PHOTOCOPY',
    name: 'Standard Photocopy / Duplication',
    category: 'PHOTOCOPY',
    description: 'Black-and-white photocopy duplication of physical documents',
    isEnabled: true,
    rate: 1.5,
    unit: '₹ / page',
  },
  {
    serviceType: 'SCANNING',
    name: 'High-Resolution Document Scanning',
    category: 'SCANNING',
    description: 'Scan hardcopy pages to PDF/JPEG and email/transfer to customer',
    isEnabled: true,
    rate: 5.0,
    unit: '₹ / page',
  },
  {
    serviceType: 'SPIRAL_BINDING',
    name: 'Spiral & Comb Binding',
    category: 'FINISHING',
    description: 'Document binding with transparent PVC front cover and card back',
    isEnabled: true,
    rate: 35.0,
    unit: '₹ / book',
  },
  {
    serviceType: 'LAMINATION',
    name: 'Thermal Pouch Lamination',
    category: 'FINISHING',
    description: 'Glossy waterproof lamination for ID cards, certificates, and sheets',
    isEnabled: true,
    rate: 20.0,
    unit: '₹ / sheet',
  },
  {
    serviceType: 'SOFT_BINDING',
    name: 'Hardcover & Thesis Binding',
    category: 'FINISHING',
    description: 'University thesis hardcover with golden embossed lettering',
    isEnabled: true,
    rate: 250.0,
    unit: '₹ / book',
  },
  {
    serviceType: 'STAPLING',
    name: 'Corner Stapling & Collating',
    category: 'FINISHING',
    description: 'Stapling corner or edge for test papers, assignments, and handouts',
    isEnabled: true,
    rate: 2.0,
    unit: '₹ / document',
  },
];

export const OwnerPricingPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [shopRecord, setShopRecord] = useState<any>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>(DEFAULT_PAPER_RULES);
  const [servicePricing, setServicePricing] = useState<ServicePricing[]>(DEFAULT_FINISHING_SERVICES);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(5.0);
  const [estCompletionTime, setEstCompletionTime] = useState<string>('15-30 mins');

  // Interactive Live Price Simulator State
  const [simPaperSize, setSimPaperSize] = useState<'A4' | 'A3' | 'LEGAL' | 'LETTER'>('A4');
  const [simColorMode, setSimColorMode] = useState<'BW' | 'COLOR'>('BW');
  const [simIsDuplex, setSimIsDuplex] = useState(false);
  const [simPages, setSimPages] = useState(10);
  const [simCopies, setSimCopies] = useState(1);
  const [simAddBinding, setSimAddBinding] = useState(false);
  const [simAddLamination, setSimAddLamination] = useState(false);

  // Load Shop & Pricing Rules
  const loadPricingData = async () => {
    try {
      setLoading(true);
      const res = await api.getOwnerShop();
      const shop = res.shop;
      setShopRecord(shop);
      setMinOrderAmount(parseFloat(shop.min_order_amount || '5.00'));
      setEstCompletionTime(shop.est_completion_time || '15-30 mins');

      // Map loaded pricing rules
      if (Array.isArray(res.pricingRules) && res.pricingRules.length > 0) {
        const loadedRules: PricingRule[] = [];
        const ruleMap = new Map<string, any>();
        res.pricingRules.forEach((r: any) => {
          ruleMap.set(`${r.paper_size}_${r.color_mode}`, r);
        });

        DEFAULT_PAPER_RULES.forEach((def) => {
          const found = ruleMap.get(`${def.paperSize}_${def.colorMode}`);
          if (found) {
            loadedRules.push({
              paperSize: def.paperSize,
              colorMode: def.colorMode,
              singleSidedPrice: parseFloat(found.single_sided_price),
              doubleSidedPrice: parseFloat(found.double_sided_price),
              discountThreshold: found.per_page_discount_threshold || def.discountThreshold,
              discountRate: parseFloat(found.per_page_discount_rate || '0'),
            });
          } else {
            loadedRules.push(def);
          }
        });
        setPricingRules(loadedRules);
      }

      // Map loaded services
      if (Array.isArray(res.services) && res.services.length > 0) {
        const sMap = new Map<string, any>();
        res.services.forEach((s: any) => sMap.set(s.service_type, s));

        const updated = DEFAULT_FINISHING_SERVICES.map((def) => {
          const found = sMap.get(def.serviceType);
          if (found) {
            return {
              ...def,
              isEnabled: found.is_enabled !== false,
              description: found.description || def.description,
              rate: parseFloat(found.rate || String(def.rate)),
              unit: found.unit || def.unit,
            };
          }
          return def;
        });
        setServicePricing(updated);
      }
    } catch (err: any) {
      console.error('Failed to load pricing:', err);
      setErrorMessage(err.message || 'Failed to load pricing data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPricingData();
  }, []);

  const handleRuleChange = (index: number, field: keyof PricingRule, value: any) => {
    const num = Math.max(0, parseFloat(value) || 0);
    const updated = [...pricingRules];
    updated[index] = {
      ...updated[index],
      [field]: field === 'discountThreshold' ? Math.max(1, parseInt(value, 10) || 1) : num,
    };
    setPricingRules(updated);
  };

  const handleServiceChange = (index: number, field: keyof ServicePricing, value: any) => {
    const updated = [...servicePricing];
    updated[index] = {
      ...updated[index],
      [field]: field === 'rate' ? Math.max(0, parseFloat(value) || 0) : value,
    };
    setServicePricing(updated);
  };

  // Submit Changes to Backend
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: ensure non-negative
    for (const r of pricingRules) {
      if (r.singleSidedPrice < 0 || r.doubleSidedPrice < 0) {
        setErrorMessage('All paper prices must be non-negative values.');
        return;
      }
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.updateOwnerPricing({
        pricingRules: pricingRules.map((r) => ({
          paperSize: r.paperSize,
          colorMode: r.colorMode,
          singleSidedPrice: Number(r.singleSidedPrice),
          doubleSidedPrice: Number(r.doubleSidedPrice),
          discountThreshold: Number(r.discountThreshold),
          discountRate: Number(r.discountRate),
        })),
        services: servicePricing.map((s) => ({
          serviceType: s.serviceType,
          isEnabled: s.isEnabled,
          description: s.description,
          rate: Number(s.rate),
          unit: s.unit,
        })),
        minOrderAmount: Number(minOrderAmount),
        estCompletionTime,
      });

      setSuccessMessage('Printing services and pricing rules saved successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update pricing rules.');
    } finally {
      setSaving(false);
    }
  };

  // Live Price Simulator Calculation
  const calculateSimulatedPrice = () => {
    const rule = pricingRules.find((r) => r.paperSize === simPaperSize && r.colorMode === simColorMode) || {
      singleSidedPrice: 2,
      doubleSidedPrice: 3,
      discountThreshold: 50,
      discountRate: 0,
    };

    let sheetsPerCopy = simPages;
    let unitPerCopy = simPages * rule.singleSidedPrice;

    if (simIsDuplex) {
      sheetsPerCopy = Math.ceil(simPages / 2);
      if (simPages % 2 === 1 && simPages > 1) {
        unitPerCopy = Math.floor(simPages / 2) * rule.doubleSidedPrice + rule.singleSidedPrice;
      } else if (simPages === 1) {
        unitPerCopy = rule.singleSidedPrice;
      } else {
        unitPerCopy = sheetsPerCopy * rule.doubleSidedPrice;
      }
    }

    const totalPages = simPages * simCopies;
    let printSubtotal = unitPerCopy * simCopies;
    let discount = 0;

    if (totalPages >= rule.discountThreshold && rule.discountRate > 0) {
      discount = Math.min(printSubtotal * 0.5, totalPages * rule.discountRate);
    }

    let extraServices = 0;
    if (simAddBinding) {
      const bindingSvc = servicePricing.find((s) => s.serviceType === 'SPIRAL_BINDING');
      extraServices += (bindingSvc?.rate || 35) * simCopies;
    }
    if (simAddLamination) {
      const lamSvc = servicePricing.find((s) => s.serviceType === 'LAMINATION');
      extraServices += (lamSvc?.rate || 20) * (simIsDuplex ? Math.ceil(simPages / 2) : simPages) * simCopies;
    }

    const rawTotal = printSubtotal - discount + extraServices;
    const finalTotal = Math.max(minOrderAmount, rawTotal);

    return {
      sheetsPerCopy,
      totalSheets: sheetsPerCopy * simCopies,
      unitPerCopy: unitPerCopy.toFixed(2),
      printSubtotal: printSubtotal.toFixed(2),
      discount: discount.toFixed(2),
      extraServices: extraServices.toFixed(2),
      finalTotal: finalTotal.toFixed(2),
      isMinOrderApplied: rawTotal < minOrderAmount,
    };
  };

  const simResult = calculateSimulatedPrice();

  if (loading) {
    return (
      <OwnerLayout shop={shopRecord} title="Printing Services & Pricing">
        <div className="py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#bbf451] mb-3" />
          <p className="text-sm font-medium text-slate-400">Loading pricing rules...</p>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout
      shop={shopRecord}
      title="Printing Services & Pricing"
      subtitle="Configure per-page photocopying rates, paper sizes, duplex pricing, volume discounts, and finishing services."
    >
      <form onSubmit={handleSave} className="max-w-6xl mx-auto space-y-6">
        {/* Success / Error Alerts */}
        {successMessage && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#bbf451] shrink-0" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-950/60 border border-rose-500/40 rounded-2xl text-rose-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Top Control Header Card */}
        <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 sm:p-8 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#bbf451] bg-[#bbf451]/10 border border-[#bbf451]/30 px-3 py-1 rounded-full">
              Automated Cost Engine
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white font-syne tracking-tight mt-2">
              Shop Pricing Rules & Services
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Changes saved here instantly update customer quotation estimates across your QR code storefront.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadPricingData}
              className="px-4 py-2.5 rounded-xl border border-[#273d2c] bg-[#121c14] hover:bg-[#1b2b1e] text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] text-xs font-black shadow-[0_0_20px_rgba(187,244,81,0.25)] flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-[#080d09] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Pricing Rules
            </button>
          </div>
        </div>

        {/* Section 1: Standard Paper Size & Duplex Printing Rules */}
        <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 sm:p-8 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#273d2c]/60 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2 font-syne">
                <Printer className="w-4 h-4 text-[#bbf451]" />
                1. Standard Paper Printing & Photocopying Rates
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure rates for Single-Sided (Simplex) and Double-Sided (Duplex) printing for each supported paper size.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono self-start sm:self-auto bg-[#0c140e] px-2.5 py-1 rounded-lg border border-[#273d2c]">
              Currency: INR (₹)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#273d2c] text-[11px] font-extrabold uppercase tracking-wider text-slate-400 bg-[#0c140e]/90">
                  <th className="py-3 px-3">Paper Size</th>
                  <th className="py-3 px-3">Color Mode</th>
                  <th className="py-3 px-3">
                    Single-Sided <span className="text-[10px] text-slate-500 font-normal">(₹ / page)</span>
                  </th>
                  <th className="py-3 px-3">
                    Double-Sided <span className="text-[10px] text-slate-500 font-normal">(₹ / sheet)</span>
                  </th>
                  <th className="py-3 px-3">
                    Bulk Discount Threshold <span className="text-[10px] text-slate-500 font-normal">(Pages)</span>
                  </th>
                  <th className="py-3 px-3">
                    Discount / Page <span className="text-[10px] text-slate-500 font-normal">(₹ off)</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#273d2c]/50 text-xs">
                {pricingRules.map((rule, idx) => (
                  <tr key={`${rule.paperSize}_${rule.colorMode}`} className="hover:bg-[#142317]/50 transition-colors">
                    <td className="py-3 px-3 font-bold text-white">
                      <span className="px-2.5 py-1 rounded-lg bg-[#0c140e] text-white border border-[#273d2c] font-mono">
                        {rule.paperSize}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {rule.colorMode === 'COLOR' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          Color
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          B&W
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-2 text-slate-500 font-mono">₹</span>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={rule.singleSidedPrice}
                          onChange={(e) => handleRuleChange(idx, 'singleSidedPrice', e.target.value)}
                          className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-[#273d2c] bg-[#0c140e] font-mono text-xs text-white focus:border-[#bbf451] focus:outline-none"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-2 text-slate-500 font-mono">₹</span>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={rule.doubleSidedPrice}
                          onChange={(e) => handleRuleChange(idx, 'doubleSidedPrice', e.target.value)}
                          className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-[#273d2c] bg-[#0c140e] font-mono text-xs text-white focus:border-[#bbf451] focus:outline-none"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          value={rule.discountThreshold}
                          onChange={(e) => handleRuleChange(idx, 'discountThreshold', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-[#273d2c] bg-[#0c140e] font-mono text-xs text-center text-white focus:border-[#bbf451] focus:outline-none"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="relative w-24">
                        <span className="absolute left-2.5 top-2 text-slate-500 font-mono">₹</span>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          value={rule.discountRate}
                          onChange={(e) => handleRuleChange(idx, 'discountRate', e.target.value)}
                          className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-[#273d2c] bg-[#0c140e] font-mono text-xs text-white focus:border-[#bbf451] focus:outline-none"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Scanning & Finishing Services */}
        <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 sm:p-8 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-6">
          <div className="border-b border-[#273d2c]/60 pb-4">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2 font-syne">
              <BookOpen className="w-4 h-4 text-[#bbf451]" />
              2. Document Finishing, Binding & Scanning Services
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Set fixed or unit rates for value-added counter services like Spiral Binding, Lamination, and Scanning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {servicePricing.map((svc, idx) => (
              <div
                key={svc.serviceType}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  svc.isEnabled ? 'border-[#273d2c] bg-[#0c140e]/90 shadow-md' : 'border-[#273d2c]/40 bg-[#09110b]/50 opacity-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">{svc.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{svc.description}</p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={svc.isEnabled}
                      onChange={(e) => handleServiceChange(idx, 'isEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#1b2b1e] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#080d09] after:border-slate-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#bbf451]"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Rate (Price)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-slate-500 font-mono text-xs">₹</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        disabled={!svc.isEnabled}
                        value={svc.rate}
                        onChange={(e) => handleServiceChange(idx, 'rate', e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-[#273d2c] bg-[#121c14] font-mono text-xs font-bold text-white disabled:bg-[#0a100b] disabled:text-slate-600 focus:border-[#bbf451] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Pricing Unit
                    </label>
                    <input
                      type="text"
                      disabled={!svc.isEnabled}
                      value={svc.unit}
                      onChange={(e) => handleServiceChange(idx, 'unit', e.target.value)}
                      placeholder="e.g. ₹ / book"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#273d2c] bg-[#121c14] text-xs font-medium text-white disabled:bg-[#0a100b] disabled:text-slate-600 focus:border-[#bbf451] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Minimum Order & Turnaround Time Policy */}
        <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 sm:p-8 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-6">
          <div className="border-b border-[#273d2c]/60 pb-4">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2 font-syne">
              <Shield className="w-4 h-4 text-[#bbf451]" />
              3. Order Floor Amount & Turnaround Policy
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Safeguard against micro-orders by establishing a minimum bill amount and communicating estimated completion times.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-4 rounded-2xl border border-[#273d2c] bg-[#0c140e]/90 space-y-2">
              <label className="block text-xs font-bold text-white">
                Minimum Order Amount Floor
              </label>
              <p className="text-[11px] text-slate-400">
                Any customer estimate below this amount will automatically round up to the minimum order charge.
              </p>
              <div className="relative w-40 pt-1">
                <span className="absolute left-3 top-3 text-slate-500 font-mono">₹</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-[#273d2c] bg-[#121c14] font-mono text-sm font-bold text-white shadow-inner focus:border-[#bbf451] focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-[#273d2c] bg-[#0c140e]/90 space-y-2">
              <label className="block text-xs font-bold text-white">
                Standard Turnaround Time
              </label>
              <p className="text-[11px] text-slate-400">
                Displayed to customers on the QR storefront before they submit their print jobs.
              </p>
              <input
                type="text"
                value={estCompletionTime}
                onChange={(e) => setEstCompletionTime(e.target.value)}
                placeholder="e.g. 15-30 mins"
                className="w-full sm:w-64 px-3 py-2 rounded-xl border border-[#273d2c] bg-[#121c14] text-xs font-semibold text-white shadow-inner focus:border-[#bbf451] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Interactive Quotation Calculator & Live Estimator */}
        <div className="bg-gradient-to-br from-[#121c14] via-[#0e1710] to-[#070c08] text-white rounded-3xl p-6 sm:p-8 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-6">
          <div className="border-b border-[#273d2c]/60 pb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#bbf451] bg-[#bbf451]/10 px-2.5 py-0.5 rounded-full border border-[#bbf451]/30">
              Interactive Test Sandbox
            </span>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2 mt-2 font-syne">
              <Calculator className="w-5 h-5 text-[#bbf451]" />
              Live Customer Price Estimator
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Verify your rules in real-time. This preview demonstrates the exact calculation customer browsers run when estimating order totals.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Simulator Inputs */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Paper Size</label>
                <select
                  value={simPaperSize}
                  onChange={(e) => setSimPaperSize(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0c140e] border border-[#273d2c] text-white font-medium focus:border-[#bbf451] focus:outline-none"
                >
                  <option value="A4">A4 (Standard Document)</option>
                  <option value="A3">A3 (Large Format)</option>
                  <option value="LEGAL">Legal (Stamp / Court)</option>
                  <option value="LETTER">Letter</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Color Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimColorMode('BW')}
                    className={`py-2 rounded-xl border text-center font-bold transition ${
                      simColorMode === 'BW'
                        ? 'bg-[#bbf451] border-[#bbf451] text-[#080d09]'
                        : 'bg-[#0c140e] border-[#273d2c] text-slate-400 hover:text-white'
                    }`}
                  >
                    B&W
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimColorMode('COLOR')}
                    className={`py-2 rounded-xl border text-center font-bold transition ${
                      simColorMode === 'COLOR'
                        ? 'bg-[#bbf451] border-[#bbf451] text-[#080d09]'
                        : 'bg-[#0c140e] border-[#273d2c] text-slate-400 hover:text-white'
                    }`}
                  >
                    Color
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Sides</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimIsDuplex(false)}
                    className={`py-2 rounded-xl border text-center font-bold transition ${
                      !simIsDuplex
                        ? 'bg-[#bbf451] border-[#bbf451] text-[#080d09]'
                        : 'bg-[#0c140e] border-[#273d2c] text-slate-400 hover:text-white'
                    }`}
                  >
                    Single-Sided
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimIsDuplex(true)}
                    className={`py-2 rounded-xl border text-center font-bold transition ${
                      simIsDuplex
                        ? 'bg-[#bbf451] border-[#bbf451] text-[#080d09]'
                        : 'bg-[#0c140e] border-[#273d2c] text-slate-400 hover:text-white'
                    }`}
                  >
                    Double-Sided (Duplex)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Document Pages</label>
                <input
                  type="number"
                  min="1"
                  value={simPages}
                  onChange={(e) => setSimPages(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 rounded-xl bg-[#0c140e] border border-[#273d2c] text-white font-mono focus:border-[#bbf451] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Copies Required</label>
                <input
                  type="number"
                  min="1"
                  value={simCopies}
                  onChange={(e) => setSimCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 rounded-xl bg-[#0c140e] border border-[#273d2c] text-white font-mono focus:border-[#bbf451] focus:outline-none"
                />
              </div>

              <div className="flex flex-col justify-end space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={simAddBinding}
                    onChange={(e) => setSimAddBinding(e.target.checked)}
                    className="rounded border-[#273d2c] bg-[#0c140e] text-[#bbf451] focus:ring-0"
                  />
                  <span>Add Spiral Binding (+₹{servicePricing.find((s) => s.serviceType === 'SPIRAL_BINDING')?.rate || 35})</span>
                </label>
              </div>
            </div>

            {/* Simulated Quotation Receipt Card */}
            <div className="bg-[#0c140e] border border-[#273d2c] rounded-2xl p-5 space-y-3.5 shadow-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-[#273d2c] pb-2 flex items-center justify-between">
                <span>Calculated Quotation</span>
                <span className="text-[#bbf451] font-mono">Live</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Physical Sheets:</span>
                  <span className="font-mono font-bold text-white">{simResult.totalSheets} sheets</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Print Subtotal:</span>
                  <span className="font-mono text-white">₹{simResult.printSubtotal}</span>
                </div>
                {parseFloat(simResult.discount) > 0 && (
                  <div className="flex justify-between text-[#bbf451]">
                    <span>Volume Discount:</span>
                    <span className="font-mono">-₹{simResult.discount}</span>
                  </div>
                )}
                {parseFloat(simResult.extraServices) > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Finishing Services:</span>
                    <span className="font-mono">+₹{simResult.extraServices}</span>
                  </div>
                )}
                {simResult.isMinOrderApplied && (
                  <div className="flex justify-between text-amber-300 text-[11px]">
                    <span>Minimum Floor Charge:</span>
                    <span className="font-mono">Applied</span>
                  </div>
                )}

                <div className="pt-2 border-t border-[#273d2c] flex justify-between items-baseline">
                  <span className="font-bold text-white text-sm">Estimated Total:</span>
                  <span className="font-black text-2xl text-[#bbf451] font-mono">
                    ₹{simResult.finalTotal}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Save Bar */}
        <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] rounded-3xl p-6 border border-[#273d2c] shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            Make sure to click <strong className="text-white font-bold">Save Pricing Rules</strong> after modifying rates.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] text-xs font-black shadow-[0_0_20px_rgba(187,244,81,0.25)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-[#080d09] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Pricing Rules
          </button>
        </div>
      </form>
    </OwnerLayout>
  );
};

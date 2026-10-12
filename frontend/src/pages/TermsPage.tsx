import React from 'react';
import { FileText, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2 border-b border-slate-200 pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
          User & Shop Partner Agreement
        </span>
        <h1 className="text-3xl font-extrabold text-navy-950 tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs text-slate-500">
          Effective October 2026
        </p>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6 text-xs text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-navy-900">1. Platform Services</h2>
          <p>
            Smart Xerox provides software connecting customers with verified photocopy, Xerox, printing, and document service centers through QR codes. Customers are provided access to verified storefronts for print job configuration.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-navy-900">2. Shop Partner Obligations</h2>
          <p>
            Shop owners agree to handle all customer documents with strict confidentiality. Downloaded or printed documents must be handed only to the customer presenting the matching Order Reference and Counter OTP. Uncollected or printed scrap must be shredded securely.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-navy-900">3. Price Quotation & Customer Approval</h2>
          <p>
            If a shop owner proposes a revised quotation due to specialty paper, custom bindings, or lamination options, the customer must explicitly approve the revised total before printing can begin.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-navy-900">4. Prohibited Content</h2>
          <p>
            Customers may not upload documents containing counterfeit currency designs, illicit materials, or malware payloads. The platform reserves the right to quarantine suspicious files and log audit entries for security analysis.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-navy-900">5. Order Cancellation</h2>
          <p>
            Customers can cancel an order at any point before printing begins (`SUBMITTED`, `ACCEPTED`, `AWAITING_APPROVAL`). Once marked as `PRINTING`, cancellations are subject to shop approval.
          </p>
        </section>
      </div>
    </div>
  );
};

import React from 'react';
import { FileText, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-slate-100">
      <div className="space-y-2 border-b border-[#233827] pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#bbf451] bg-[#bbf451]/10 px-3 py-1 rounded-full border border-[#bbf451]/30">
          User &amp; Shop Partner Agreement
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-syne">
          Terms of Service
        </h1>
        <p className="text-xs text-slate-400">
          Effective October 2026
        </p>
      </div>

      <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] p-8 rounded-3xl border border-[#273d2c] shadow-[0_15px_45px_rgba(0,0,0,0.5)] space-y-6 text-xs text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white font-syne">1. Platform Services</h2>
          <p>
            Smart Xerox provides software connecting customers with verified photocopy, Xerox, printing, and document service centers through QR codes. Customers are provided access to verified storefronts for print job configuration.
          </p>
        </section>

        <section className="space-y-2 border-t border-[#233827] pt-4">
          <h2 className="text-sm font-bold text-white font-syne">2. Shop Partner Obligations</h2>
          <p>
            Shop owners agree to handle all customer documents with strict confidentiality. Downloaded or printed documents must be handed only to the customer presenting the matching Order Reference and Counter OTP. Uncollected or printed scrap must be shredded securely.
          </p>
        </section>

        <section className="space-y-2 border-t border-[#233827] pt-4">
          <h2 className="text-sm font-bold text-white font-syne">3. Price Quotation &amp; Customer Approval</h2>
          <p>
            If a shop owner proposes a revised quotation due to specialty paper, custom bindings, or lamination options, the customer must explicitly approve the revised total before printing can begin.
          </p>
        </section>

        <section className="space-y-2 border-t border-[#233827] pt-4">
          <h2 className="text-sm font-bold text-white font-syne">4. Prohibited Content</h2>
          <p>
            Customers may not upload documents containing counterfeit currency designs, illicit materials, or malware payloads. The platform reserves the right to quarantine suspicious files and log audit entries for security analysis.
          </p>
        </section>

        <section className="space-y-2 border-t border-[#233827] pt-4">
          <h2 className="text-sm font-bold text-white font-syne">5. Order Cancellation</h2>
          <p>
            Customers can cancel an order at any point before printing begins (<code className="text-[#bbf451]">SUBMITTED</code>, <code className="text-[#bbf451]">ACCEPTED</code>, <code className="text-[#bbf451]">AWAITING_APPROVAL</code>). Once marked as <code className="text-[#bbf451]">PRINTING</code>, cancellations are subject to shop approval.
          </p>
        </section>
      </div>
    </div>
  );
};

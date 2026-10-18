import React from 'react';
import { Link } from 'react-router-dom';
import { Printer, ArrowRight } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-20 text-center">
      <div className="bg-gradient-to-b from-[#142317] via-[#0f1a11] to-[#09110b] border border-[#273d2c] shadow-[0_25px_60px_rgba(0,0,0,0.8)] rounded-3xl p-8 max-w-md w-full space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-[#bbf451]/15 text-[#bbf451] border border-[#bbf451]/30 flex items-center justify-center mx-auto mb-2 shadow-[0_0_25px_rgba(187,244,81,0.2)]">
          <Printer className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white font-syne tracking-tight">404 — Page Not Found</h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          The link you followed may be broken or the shop storefront may have been updated.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] text-xs font-black shadow-[0_0_20px_rgba(187,244,81,0.25)] transition active:scale-98"
          >
            Return to Homepage <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

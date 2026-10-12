import React from 'react';
import { Link } from 'react-router-dom';
import { Printer, ArrowRight } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
      <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
        <Printer className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-navy-950">404 — Page Not Found</h1>
      <p className="text-xs text-slate-500">
        The link you followed may be broken or the shop storefront may have been updated.
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          Return to Homepage <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

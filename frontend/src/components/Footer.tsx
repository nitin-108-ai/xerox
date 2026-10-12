import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Trash2, Printer } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-950 text-slate-300 border-t border-navy-800">
      {/* Privacy Guarantee Ribbon */}
      <div className="bg-navy-900 border-b border-navy-800/60 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Zero Phone Number Leak</h4>
                <p className="text-xs text-slate-400">Never share your personal number with unknown Xerox counter staff.</p>
              </div>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Private Object Isolation</h4>
                <p className="text-xs text-slate-400">Strict sandboxing & magic-bytes malware screening before print.</p>
              </div>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Automated Document Purging</h4>
                <p className="text-xs text-slate-400">Files permanently deleted from primary & cache storage post-lifecycle.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                <Printer className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">Smart Xerox</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The privacy-first document printing platform connecting customers with verified local photocopy and Xerox shops through secure QR codes.
            </p>
            <div className="text-[11px] text-slate-500">
              © {new Date().getFullYear()} Smart Xerox Platform. All rights reserved.
            </div>
          </div>

          {/* Col 2: For Customers */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Customers</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/track" className="hover:text-white transition-colors">Track Existing Order</Link></li>
              <li><Link to="/shop/quickcopy-express" className="hover:text-white transition-colors">QuickCopy Express Storefront</Link></li>
              <li><Link to="/shop/metro-doc-hub" className="hover:text-white transition-colors">Metro Document Hub Storefront</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Document Privacy Lifecycle</Link></li>
            </ul>
          </div>

          {/* Col 3: For Xerox Owners */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Shop Owners</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/owner/register" className="hover:text-white transition-colors">Register Your Xerox Center</Link></li>
              <li><Link to="/owner/login" className="hover:text-white transition-colors">Owner Portal Login</Link></li>
              <li><Link to="/owner/qr" className="hover:text-white transition-colors">Generate Shop Counter QR</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Shop Partner Terms</Link></li>
            </ul>
          </div>

          {/* Col 4: Platform & Compliance */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Governance & Security</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/admin/dashboard" className="hover:text-white transition-colors">Admin Verification Portal</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><span className="inline-block bg-navy-800 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/30">Zero WhatsApp Sharing</span></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

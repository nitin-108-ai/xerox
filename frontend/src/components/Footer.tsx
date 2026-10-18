import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Trash2, Printer } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0a100b] text-slate-300 border-t border-[#1b2b1e] font-outfit">
      {/* Privacy Guarantee Ribbon */}
      <div className="bg-[#0e1710] border-b border-[#1b2b1e]/60 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#bbf451]/10 border border-[#bbf451]/20 flex items-center justify-center text-[#bbf451] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Zero Phone Number Leak</h4>
                <p className="text-xs text-slate-400">Never share your personal number with unknown Xerox counter staff.</p>
              </div>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#bbf451]/10 border border-[#bbf451]/20 flex items-center justify-center text-[#bbf451] shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Private Object Isolation</h4>
                <p className="text-xs text-slate-400">Strict sandboxing & magic-bytes malware screening before print.</p>
              </div>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Automated Document Purging</h4>
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
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#162719] to-[#25422b] border border-[#3b6243] flex items-center justify-center text-white shadow-md">
                <Printer className="w-4 h-4 text-[#bbf451]" />
              </div>
              <span className="text-lg font-extrabold text-white tracking-tight font-syne">Smart Xerox</span>
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
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Customers</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/track" className="hover:text-[#bbf451] transition-colors">Track Existing Order</Link></li>
              <li><Link to="/shop/quickcopy-express" className="hover:text-[#bbf451] transition-colors">QuickCopy Express Storefront</Link></li>
              <li><Link to="/shop/metro-doc-hub" className="hover:text-[#bbf451] transition-colors">Metro Document Hub Storefront</Link></li>
              <li><Link to="/privacy" className="hover:text-[#bbf451] transition-colors">Document Privacy Lifecycle</Link></li>
            </ul>
          </div>

          {/* Col 3: For Xerox Owners */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Shop Owners</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/owner/register" className="hover:text-[#bbf451] transition-colors">Register Your Xerox Center</Link></li>
              <li><Link to="/owner/login" className="hover:text-[#bbf451] transition-colors">Owner Portal Login</Link></li>
              <li><Link to="/owner/qr" className="hover:text-[#bbf451] transition-colors">Generate Shop Counter QR</Link></li>
              <li><Link to="/terms" className="hover:text-[#bbf451] transition-colors">Shop Partner Terms</Link></li>
            </ul>
          </div>

          {/* Col 4: Platform & Compliance */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Governance & Security</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/admin/dashboard" className="hover:text-[#bbf451] transition-colors">Admin Verification Portal</Link></li>
              <li><Link to="/privacy" className="hover:text-[#bbf451] transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-[#bbf451] transition-colors">Terms of Service</Link></li>
              <li><span className="inline-block bg-[#16261a] text-[#bbf451] text-[10px] px-2.5 py-0.5 rounded-full border border-[#2b4431]">Zero WhatsApp Sharing</span></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

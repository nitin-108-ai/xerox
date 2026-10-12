import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Printer, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, Building2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const OwnerLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.login(email.trim(), password);
      login(res.token, res.user);

      if (res.user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/owner/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-elevated space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-navy-900 text-white flex items-center justify-center mx-auto shadow-md">
            <Printer className="w-6 h-6 text-brand-300" />
          </div>
          <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">
            Sign In to Smart Xerox
          </h1>
          <p className="text-xs text-slate-500">
            Access your shop counter order management dashboard
          </p>
        </div>

        {/* Demo Accounts Quick-Fill Helper */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              Demo Quick-Fill Accounts
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('owner1@smartxerox.io', 'Owner@12345')}
              className="py-1.5 px-2.5 rounded-lg text-left text-xs bg-white hover:bg-brand-50 border border-slate-200 hover:border-brand-300 transition-colors"
            >
              <div className="font-bold text-navy-900 text-[11px]">QuickCopy Owner</div>
              <div className="text-[10px] text-slate-500 font-mono">owner1@...</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@smartxerox.io', 'Admin@12345')}
              className="py-1.5 px-2.5 rounded-lg text-left text-xs bg-white hover:bg-brand-50 border border-slate-200 hover:border-brand-300 transition-colors"
            >
              <div className="font-bold text-navy-900 text-[11px]">Platform Admin</div>
              <div className="text-[10px] text-slate-500 font-mono">admin@...</div>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="owner@yourshop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-navy-900 hover:bg-brand-600 text-white shadow-elevated flex items-center justify-center gap-1.5 transition-colors disabled:bg-slate-300"
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
            {!loading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          Need to register a new Xerox or photocopy shop?{' '}
          <Link to="/owner/register" className="font-semibold text-brand-600 hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

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
    <div className="bg-[#080d09] min-h-screen text-slate-100 font-outfit max-w-md mx-auto px-4 py-16 space-y-6 flex items-center justify-center">
      <div className="bg-gradient-to-b from-[#152317] via-[#101b12] to-[#0c140e] rounded-[36px] p-8 border border-[#273d2c] shadow-2xl space-y-6 w-full">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#162719] to-[#25422b] border border-[#3b6243] text-[#bbf451] flex items-center justify-center mx-auto shadow-lg">
            <Printer className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight font-syne">
            Sign In to Smart Xerox
          </h1>
          <p className="text-xs text-slate-400">
            Access your shop counter order management dashboard
          </p>
        </div>

        {/* Demo Accounts Quick-Fill Helper */}
        <div className="bg-[#101911] border border-[#213524] rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-[#bbf451]">
              <Sparkles className="w-3.5 h-3.5" />
              Demo Quick-Fill Accounts
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('owner1@smartxerox.io', 'Owner@12345')}
              className="py-2 px-2.5 rounded-xl text-left text-xs bg-[#152218] hover:bg-[#1f3323] border border-[#253928] hover:border-[#bbf451]/50 transition shadow-sm"
            >
              <div className="font-bold text-white text-[11px] truncate">1. QuickCopy Express</div>
              <div className="text-[10px] text-slate-400 font-mono">owner1@...</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('owner2@smartxerox.io', 'Owner@12345')}
              className="py-2 px-2.5 rounded-xl text-left text-xs bg-[#152218] hover:bg-[#1f3323] border border-[#253928] hover:border-[#bbf451]/50 transition shadow-sm"
            >
              <div className="font-bold text-white text-[11px] truncate">2. Metro Hub Xerox</div>
              <div className="text-[10px] text-slate-400 font-mono">owner2@...</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('owner3@smartxerox.io', 'Owner@12345')}
              className="py-2 px-2.5 rounded-xl text-left text-xs bg-[#152218] hover:bg-[#1f3323] border border-[#253928] hover:border-[#bbf451]/50 transition shadow-sm"
            >
              <div className="font-bold text-white text-[11px] truncate">3. Campus Print Point</div>
              <div className="text-[10px] text-slate-400 font-mono">owner3@...</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@smartxerox.io', 'Admin@12345')}
              className="py-2 px-2.5 rounded-xl text-left text-xs bg-[#152218] hover:bg-[#1f3323] border border-[#253928] hover:border-[#bbf451]/50 transition shadow-sm"
            >
              <div className="font-bold text-[#bbf451] text-[11px] truncate">Platform Admin</div>
              <div className="text-[10px] text-slate-400 font-mono">admin@...</div>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="owner@yourshop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-[#263c29] rounded-xl focus:outline-none focus:border-[#bbf451] bg-[#0c140e] text-white placeholder-slate-500"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-[#263c29] rounded-xl focus:outline-none focus:border-[#bbf451] bg-[#0c140e] text-white placeholder-slate-500"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-full font-black text-xs bg-[#bbf451] hover:bg-[#cbff5e] text-[#0a120c] shadow-xl shadow-[#bbf451]/20 flex items-center justify-center gap-1.5 transition disabled:opacity-40"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
            {!loading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>

        <div className="pt-4 border-t border-[#1f3122] text-center text-xs text-slate-400">
          Need to register a new Xerox or photocopy shop?{' '}
          <Link to="/owner/register" className="font-bold text-[#bbf451] hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

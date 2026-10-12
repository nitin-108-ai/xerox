import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Printer,
  QrCode,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Settings,
  X,
  Copy,
  Check,
  Laptop,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface OwnerLayoutProps {
  children: React.ReactNode;
  shop?: any;
  defaultPrinter?: any;
  connector?: any;
  onRefreshPrinters?: () => void;
}

export const OwnerLayout: React.FC<OwnerLayoutProps> = ({
  children,
  shop,
  defaultPrinter,
  connector,
  onRefreshPrinters,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Settings & QR Modal state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/owner/login');
  };

  const handleGeneratePairingCode = async () => {
    try {
      setPairingLoading(true);
      const res = await api.generatePairingCode();
      setPairingCode(res.pairingCode);
      setPairingModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to generate pairing code.');
    } finally {
      setPairingLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const shopSlug = shop?.slug || user?.slug || 'quickcopy-express';
  const shopName = shop?.name || user?.shopName || 'Smart Xerox Shop';
  const storefrontUrl = `${window.location.origin}/shop/${shopSlug}`;

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 font-sans flex flex-col">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand & Shop Info */}
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/owner/dashboard" className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-navy-950 text-white flex items-center justify-center font-black shadow-xs">
                <Printer className="w-5 h-5 text-brand-300" />
              </div>
              <div className="hidden sm:block">
                <span className="font-extrabold text-sm text-navy-950 tracking-tight block">
                  Smart Xerox
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block -mt-0.5">
                  Counter Station
                </span>
              </div>
            </Link>

            <span className="hidden sm:inline text-slate-300">|</span>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-navy-950 truncate max-w-[140px] sm:max-w-xs" title={shopName}>
                  {shopName}
                </span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </div>
            </div>
          </div>

          {/* Right Actions: Printer Status, Settings & QR, Logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Live Printer Connection Pill */}
            <button
              onClick={() => setSettingsOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                connector?.isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="Click to view printer details and settings"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline truncate max-w-[130px]">
                {defaultPrinter?.name || 'Default Printer'}
              </span>
              <span className={`w-2 h-2 rounded-full shrink-0 ${connector?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-[10px] font-semibold">
                {connector?.isOnline ? 'Online' : 'Manual'}
              </span>
            </button>

            {/* Shop QR & Settings Button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-navy-950 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
              title="Shop QR & Settings"
            >
              <QrCode className="w-3.5 h-3.5 text-navy-900" />
              <span className="hidden sm:inline">QR & Settings</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      {/* Shop QR & Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-navy-950">Shop QR & Settings</h3>
                <p className="text-xs text-slate-500">Counter QR code & Windows printer setup</p>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code Section */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Customer Counter QR Code
              </span>

              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs inline-block">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(storefrontUrl)}`}
                  alt="Shop QR Code"
                  className="w-40 h-40 mx-auto"
                />
              </div>

              <div>
                <p className="text-xs font-extrabold text-navy-950">{shopName}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">{storefrontUrl}</p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <Link
                  to={`/shop/${shopSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 shadow-2xs transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Test Customer Page
                </Link>

                <Link
                  to="/owner/qr"
                  className="px-4 py-1.5 rounded-xl bg-navy-950 hover:bg-brand-600 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print A4 Poster
                </Link>
              </div>
            </div>

            {/* Windows Printer Connection Section */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy-950 flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-brand-600" />
                  Windows Direct Print Connector
                </span>
                {connector?.isOnline ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Online & Active
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    Manual Mode
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <p>
                  <strong>Current Printer:</strong> {defaultPrinter?.name || 'Default Windows Printer'}
                </p>
                <p>
                  <strong>PC Station:</strong> {connector?.deviceName || 'Not paired'}
                </p>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={handleGeneratePairingCode}
                  disabled={pairingLoading}
                  className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition"
                >
                  <Laptop className="w-4 h-4" />
                  Pair Windows PC (Get 6-Digit Code)
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>

              <button
                onClick={() => setSettingsOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6-Digit Pairing Code Modal */}
      {pairingModalOpen && pairingCode && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-navy-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-navy-950">Pair Windows PC</h3>
              <p className="text-xs text-slate-500 mt-0.5">Enter this code into the desktop connector:</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                6-Digit Pairing Code
              </span>
              <div className="text-3xl font-mono font-black text-navy-950 tracking-widest">
                {pairingCode}
              </div>
              <p className="text-[10px] text-amber-600 font-semibold flex items-center justify-center gap-1 pt-1">
                <Clock className="w-3 h-3" /> Valid for 10 minutes
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleCopyCode}
                className="w-full py-2.5 rounded-xl bg-navy-950 hover:bg-brand-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? 'Code Copied!' : 'Copy Code'}
              </button>

              <button
                onClick={() => setPairingModalOpen(false)}
                className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

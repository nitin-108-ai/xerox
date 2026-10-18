import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  User,
  ChevronDown,
  Menu,
  ChevronRight,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface OwnerLayoutProps {
  children: React.ReactNode;
  shop?: any;
  defaultPrinter?: any;
  connector?: any;
  onRefreshPrinters?: () => void;
  title?: string;
  subtitle?: string;
  onRefresh?: () => void | Promise<void>;
}

export const OwnerLayout: React.FC<OwnerLayoutProps> = ({
  children,
  shop,
  defaultPrinter,
  connector,
  onRefreshPrinters,
  title,
  subtitle,
  onRefresh,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation Dropdown & Mobile Menu state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const mobileDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const insideDesktop = dropdownRef.current && dropdownRef.current.contains(target);
      const insideMobile = mobileDropdownRef.current && mobileDropdownRef.current.contains(target);
      if (!insideDesktop && !insideMobile) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      setDropdownOpen(false);
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
  const shopId = shop?.id || user?.shopId || 'shp-quickcopy-001';
  const storefrontUrl = `${window.location.origin}/shop/${shopSlug}`;

  const isActive = (path: string) => location.pathname === path;

  // Reusable QR & Settings Dropdown Menu
  const renderDropdownMenu = () => (
    <div className="absolute right-0 mt-2 w-64 bg-[#101911] rounded-2xl border border-[#233526] shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
      <div className="px-3.5 py-2 border-b border-[#1d2d20]">
        <p className="text-xs font-extrabold text-white truncate font-syne">{shopName}</p>
        <p className="text-[10px] text-slate-400 font-mono mt-0.5">Permanent ID: {shopId}</p>
      </div>

      <div className="py-1">
        <Link
          to="/owner/qr"
          onClick={() => setDropdownOpen(false)}
          className="w-full px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-[#18261b] hover:text-[#bbf451] flex items-center gap-2.5 transition"
        >
          <QrCode className="w-4 h-4 text-[#bbf451] shrink-0" />
          <span>View / Download Shop QR</span>
        </Link>

        <Link
          to="/owner/profile"
          onClick={() => setDropdownOpen(false)}
          className="w-full px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-[#18261b] hover:text-[#bbf451] flex items-center gap-2.5 transition"
        >
          <User className="w-4 h-4 text-[#bbf451] shrink-0" />
          <span>Shop Profile</span>
        </Link>

        <Link
          to="/owner/settings"
          onClick={() => setDropdownOpen(false)}
          className="w-full px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-[#18261b] hover:text-[#bbf451] flex items-center gap-2.5 transition"
        >
          <Settings className="w-4 h-4 text-[#bbf451] shrink-0" />
          <span>Settings</span>
        </Link>

        <Link
          to="/owner/printers"
          onClick={() => setDropdownOpen(false)}
          className="w-full px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-[#18261b] hover:text-[#bbf451] flex items-center gap-2.5 transition"
        >
          <Laptop className="w-4 h-4 text-[#bbf451] shrink-0" />
          <span>Connected Devices</span>
        </Link>

        <Link
          to="/owner/reports"
          onClick={() => setDropdownOpen(false)}
          className="w-full px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-[#18261b] hover:text-[#bbf451] flex items-center gap-2.5 transition"
        >
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Sales &amp; Volume Reports</span>
        </Link>
      </div>

      <div className="pt-1 border-t border-[#1d2d20]">
        <button
          type="button"
          onClick={() => {
            setDropdownOpen(false);
            handleGeneratePairingCode();
          }}
          className="w-full px-3.5 py-2 text-xs font-semibold text-[#bbf451] hover:bg-[#18261b] flex items-center gap-2.5 transition text-left"
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>Pair Windows PC (Code)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setDropdownOpen(false);
            handleLogout();
          }}
          className="w-full px-3.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 transition text-left"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080d09] text-slate-100 font-outfit flex flex-col">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-[#0b120c]/90 backdrop-blur-md border-b border-[#1b2b1e] shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand & Shop Info */}
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/owner/dashboard" className="flex items-center gap-2.5 shrink-0" title="Back to Receiving Panel">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#162719] to-[#25422b] border border-[#3b6243] text-white flex items-center justify-center font-black shadow-md">
                <Printer className="w-5 h-5 text-[#bbf451]" />
              </div>
              <div className="hidden sm:block">
                <span className="font-extrabold text-sm text-white tracking-tight block font-syne">
                  Smart Xerox
                </span>
                <span className="text-[10px] text-[#bbf451] font-bold uppercase tracking-wider block -mt-0.5">
                  Counter Station
                </span>
              </div>
            </Link>

            <span className="hidden sm:inline text-slate-300">|</span>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-xs font-syne" title={shopName}>
                  {shopName}
                </span>
                <span title="Verified Shop" className="inline-flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#bbf451] shrink-0" />
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Items: Profile, Settings, QR Code, Connected Devices, QR & Settings, Logout */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {/* Live Printer Connection Pill */}
            <Link
              to="/owner/printers"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                connector?.isOnline
                  ? 'bg-[#152719] text-[#bbf451] border-[#2e4c33] hover:bg-[#1e3422]'
                  : 'bg-[#221c10] text-amber-300 border-amber-500/30 hover:bg-[#2b2314]'
              }`}
              title="Click to manage connected printers & PC spoolers"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[120px]">
                {defaultPrinter?.name || 'Default Printer'}
              </span>
              <span className={`w-2 h-2 rounded-full shrink-0 ${connector?.isOnline ? 'bg-[#bbf451] animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[10px] font-semibold">
                {connector?.isOnline ? 'Online' : 'Manual'}
              </span>
            </Link>

            {/* Profile Button */}
            <Link
              to="/owner/profile"
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
                isActive('/owner/profile')
                  ? 'bg-[#223626] text-[#bbf451] border border-[#3b593f] shadow-sm'
                  : 'border border-[#223525] bg-[#121c14] hover:bg-[#19271c] text-slate-300 hover:text-white'
              }`}
              title="Shop Profile"
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile</span>
            </Link>

            {/* Settings Button */}
            <Link
              to="/owner/settings"
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
                isActive('/owner/settings')
                  ? 'bg-[#223626] text-[#bbf451] border border-[#3b593f] shadow-sm'
                  : 'border border-[#223525] bg-[#121c14] hover:bg-[#19271c] text-slate-300 hover:text-white'
              }`}
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>

            {/* QR Code Button */}
            <Link
              to="/owner/qr"
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
                isActive('/owner/qr')
                  ? 'bg-[#223626] text-[#bbf451] border border-[#3b593f] shadow-sm'
                  : 'border border-[#223525] bg-[#121c14] hover:bg-[#19271c] text-slate-300 hover:text-white'
              }`}
              title="Counter QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Code</span>
            </Link>

            {/* Connected Devices Button */}
            <Link
              to="/owner/printers"
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
                isActive('/owner/printers')
                  ? 'bg-[#223626] text-[#bbf451] border border-[#3b593f] shadow-sm'
                  : 'border border-[#223525] bg-[#121c14] hover:bg-[#19271c] text-slate-300 hover:text-white'
              }`}
              title="Connected Devices & Printers"
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Devices</span>
            </Link>

            {/* QR & Settings Dropdown Menu Button */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3.5 py-1.5 rounded-full border border-[#223525] bg-[#121c14] hover:bg-[#19271c] text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                title="Quick Menu"
              >
                <QrCode className="w-3.5 h-3.5 text-[#bbf451]" />
                <span>QR &amp; Settings</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && renderDropdownMenu()}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition border border-transparent hover:border-rose-500/20"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Right Controls: Accessible Profile, Settings, QR & Settings, Menu Drawer */}
          <div className="flex md:hidden items-center gap-1.5" ref={mobileDropdownRef}>
            <Link
              to="/owner/profile"
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
                isActive('/owner/profile')
                  ? 'bg-[#223626] text-[#bbf451] border-[#3b593f]'
                  : 'bg-[#121c14] text-slate-300 border-[#223525]'
              }`}
              title="Profile"
            >
              <User className="w-4 h-4" />
            </Link>

            <Link
              to="/owner/settings"
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
                isActive('/owner/settings')
                  ? 'bg-[#223626] text-[#bbf451] border-[#3b593f]'
                  : 'bg-[#121c14] text-slate-300 border-[#223525]'
              }`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-2.5 py-2 rounded-xl border border-[#223525] bg-[#121c14] text-xs font-bold flex items-center gap-1 text-slate-300"
                title="QR & Settings Menu"
              >
                <QrCode className="w-3.5 h-3.5 text-[#bbf451]" />
                <span className="hidden xs:inline">QR</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && renderDropdownMenu()}
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                if (dropdownOpen) setDropdownOpen(false);
              }}
              className="p-2 rounded-xl border border-[#223525] bg-[#121c14] text-slate-300"
              aria-label="Open navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu when toggled */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#1f3123] bg-[#0f1711] px-4 py-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-2 py-1 pb-2 border-b border-[#1f3123] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white font-syne">{shopName}</p>
                <p className="text-[10px] text-slate-400 font-mono">ID: {shopId}</p>
              </div>
              <span className="text-[10px] font-bold text-[#bbf451] bg-[#1a2d1d] px-2.5 py-0.5 rounded-full border border-[#2b4431]">
                Verified
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-bold">
              <Link
                to="/owner/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  isActive('/owner/dashboard') ? 'bg-[#223626] text-[#bbf451] border-[#3b593f]' : 'bg-[#142017] text-slate-300 border-[#223525]'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>Receiving Panel</span>
              </Link>

              <Link
                to="/owner/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  isActive('/owner/profile') ? 'bg-[#223626] text-[#bbf451] border-[#3b593f]' : 'bg-[#142017] text-slate-300 border-[#223525]'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </Link>

              <Link
                to="/owner/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  isActive('/owner/settings') ? 'bg-[#223626] text-[#bbf451] border-[#3b593f]' : 'bg-[#142017] text-slate-300 border-[#223525]'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>

              <Link
                to="/owner/qr"
                onClick={() => setMobileMenuOpen(false)}
                className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  isActive('/owner/qr') ? 'bg-[#223626] text-[#bbf451] border-[#3b593f]' : 'bg-[#142017] text-slate-300 border-[#223525]'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>QR Code</span>
              </Link>

              <Link
                to="/owner/printers"
                onClick={() => setMobileMenuOpen(false)}
                className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  isActive('/owner/printers') ? 'bg-[#223626] text-[#bbf451] border-[#3b593f]' : 'bg-[#142017] text-slate-300 border-[#223525]'
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span>Connected Devices</span>
              </Link>

              <Link
                to="/owner/reports"
                onClick={() => setMobileMenuOpen(false)}
                className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  isActive('/owner/reports') ? 'bg-[#223626] text-[#bbf451] border-[#3b593f]' : 'bg-[#142017] text-slate-300 border-[#223525]'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Reports</span>
              </Link>
            </div>

            <div className="pt-2 border-t border-[#1f3123] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleGeneratePairingCode();
                }}
                className="text-xs font-bold text-[#bbf451] flex items-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Pair Windows PC</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="text-xs font-bold text-rose-400 flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      {/* 6-Digit Pairing Code Modal */}
      {pairingModalOpen && pairingCode && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121c14] rounded-3xl max-w-sm w-full border border-[#233526] shadow-2xl p-6 space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-[#1b2b1d] text-[#bbf451] flex items-center justify-center mx-auto border border-[#2e4732]">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-syne">Pair Windows PC</h3>
              <p className="text-xs text-slate-400 mt-0.5">Enter this code into the desktop connector:</p>
            </div>

            <div className="bg-[#0c140e] rounded-2xl p-5 border border-[#223525] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                6-Digit Pairing Code
              </span>
              <div className="text-3xl font-mono font-black text-[#bbf451] tracking-widest">
                {pairingCode}
              </div>
              <p className="text-[10px] text-amber-400 font-semibold flex items-center justify-center gap-1 pt-1">
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

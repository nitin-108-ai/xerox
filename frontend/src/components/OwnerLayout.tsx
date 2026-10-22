import React, { useState, useEffect } from 'react';
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
  Menu,
  ChevronRight,
  Sparkles,
  Smartphone,
  CreditCard,
  FileText,
  Shield,
  Layers,
  RefreshCw,
  Bell,
  PackageCheck
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

  // Mobile sidebar drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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
  const shopId = shop?.id || user?.shopId || 'shp-quickcopy-001';
  const storefrontUrl = `${window.location.origin}/shop/${shopSlug}`;

  const isActive = (path: string) => {
    if (path.includes('?tab=')) {
      const searchTab = new URLSearchParams(location.search).get('tab');
      const targetTab = new URLSearchParams(path.split('?')[1]).get('tab');
      return location.pathname === '/owner/dashboard' && searchTab === targetTab;
    }
    if (path === '/owner/dashboard') {
      const searchTab = new URLSearchParams(location.search).get('tab');
      return (location.pathname === '/owner/dashboard' || location.pathname === '/owner' || location.pathname === '/owner/orders') && !searchTab;
    }
    return location.pathname.startsWith(path);
  };

  const navGroups = [
    {
      title: 'LIVE QUEUE & COUNTER',
      items: [
        {
          label: 'Receiving Panel',
          path: '/owner/dashboard',
          icon: Printer,
          badge: 'Live',
          badgeColor: 'bg-[#bbf451] text-[#080d09]',
        },
        {
          label: 'New Incoming',
          path: '/owner/dashboard?tab=INCOMING',
          icon: Bell,
          badge: 'New',
          badgeColor: 'bg-rose-500 text-white',
        },
        {
          label: 'Ready for Pickup',
          path: '/owner/dashboard?tab=READY',
          icon: PackageCheck,
        },
        {
          label: 'All Order History',
          path: '/owner/dashboard?tab=ALL',
          icon: Layers,
        },
        {
          label: 'Counter QR & Poster',
          path: '/owner/qr',
          icon: QrCode,
        },
        {
          label: 'Pricing & Rates',
          path: '/owner/pricing',
          icon: CreditCard,
        },
      ],
    },
    {
      title: 'SHOP MANAGEMENT',
      items: [
        {
          label: 'Shop Profile & Timings',
          path: '/owner/profile',
          icon: User,
        },
        {
          label: 'Connected Printers',
          path: '/owner/printers',
          icon: Laptop,
          statusDot: connector?.isOnline ? 'bg-[#bbf451]' : 'bg-amber-400',
        },
        {
          label: 'Reports & Analytics',
          path: '/owner/reports',
          icon: Sparkles,
        },
        {
          label: 'Store Settings',
          path: '/owner/settings',
          icon: Settings,
        },
      ],
    },
    {
      title: 'TOOLS & POLICIES',
      items: [
        {
          label: 'Privacy Policy',
          path: '/privacy',
          icon: Shield,
        },
        {
          label: 'Terms of Service',
          path: '/terms',
          icon: FileText,
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0a110c] via-[#080d09] to-[#050806] text-slate-200">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#1b2b1e]">
        <Link to="/owner/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1b2e20] to-[#0e1911] border border-[#2e4c34] text-[#bbf451] flex items-center justify-center font-black shadow-[0_0_20px_rgba(187,244,81,0.2)] group-hover:scale-105 transition-transform shrink-0">
            <Printer className="w-5 h-5 text-[#bbf451]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm text-white tracking-tight font-syne">
                Smart Xerox
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#bbf451] block font-mono">
              Counter Station
            </span>
          </div>
        </Link>

        {/* Active Shop Badge Card */}
        <div className="mt-4 p-3 rounded-2xl bg-[#0e1610] border border-[#203324] shadow-inner">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="text-xs font-black text-white truncate font-syne" title={shopName}>
                {shopName}
              </span>
              <span title="Verified Counter" className="inline-flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 text-[#bbf451] shrink-0" />
              </span>
            </div>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span className="truncate">ID: {shopId}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${
              connector?.isOnline ? 'bg-[#bbf451]/15 text-[#bbf451] border border-[#bbf451]/30' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connector?.isOnline ? 'bg-[#bbf451] animate-pulse' : 'bg-amber-400'}`} />
              {connector?.isOnline ? 'Printer Online' : 'Manual'}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 scrollbar-thin scrollbar-thumb-[#1c2e20]">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item: any) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all group ${
                      active
                        ? 'bg-gradient-to-r from-[#192b1d] to-[#121f15] text-[#bbf451] border border-[#2f5035] shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                        : 'text-slate-300 hover:text-white hover:bg-[#111c13] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        active ? 'text-[#bbf451]' : 'text-slate-400'
                      }`} />
                      <span className="truncate font-syne">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.statusDot && (
                        <span className={`w-2 h-2 rounded-full ${item.statusDot}`} />
                      )}
                      {item.badge && (
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                      {active && (
                        <ChevronRight className="w-3.5 h-3.5 text-[#bbf451]" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Quick Action: Pair Windows PC Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGeneratePairingCode}
            disabled={pairingLoading}
            className="w-full px-3.5 py-2.5 rounded-2xl border border-[#27402c] bg-gradient-to-r from-[#132216] to-[#0e1810] hover:from-[#192c1d] hover:to-[#132216] text-[#bbf451] text-xs font-bold flex items-center justify-between shadow-sm transition active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-[#bbf451]" />
              <span className="font-syne">Pair Windows PC</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Code</span>
          </button>
        </div>

        {/* Live Customer Storefront Link */}
        <div>
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-3.5 py-2.5 rounded-2xl border border-[#213524] bg-[#0c140e] hover:bg-[#121c13] text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-between transition group"
          >
            <div className="flex items-center gap-2.5 truncate">
              <ExternalLink className="w-4 h-4 text-[#bbf451] shrink-0 group-hover:scale-110 transition-transform" />
              <span className="truncate font-syne">Live Customer View</span>
            </div>
            <span className="text-[10px] font-bold text-[#bbf451] font-mono">Open ↗</span>
          </a>
        </div>
      </div>

      {/* Sidebar Footer / User Account */}
      <div className="p-4 border-t border-[#1b2b1e] bg-[#070c08] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#152317] border border-[#273d2c] text-[#bbf451] flex items-center justify-center font-bold text-xs shrink-0">
              {user?.fullName?.charAt(0) || 'O'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate font-syne">
                {user?.fullName || shop?.owner_display_name || 'Counter Operator'}
              </p>
              <p className="text-[10px] text-slate-400 truncate font-mono">
                {user?.email || 'owner@smartxerox.io'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition border border-transparent hover:border-rose-500/20 shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080d09] text-slate-100 font-outfit flex">
      {/* 1. Desktop Fixed Left Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col fixed inset-y-0 left-0 z-40 border-r border-[#1a2d1e] shadow-[8px_0_35px_rgba(0,0,0,0.85)]">
        {sidebarContent}
      </aside>

      {/* 2. Mobile Responsive Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 3. Mobile Slide-in Drawer */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out border-r border-[#1a2d1e] shadow-2xl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative h-full">
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-[#142017] text-slate-300 border border-[#273d2c] z-10"
            aria-label="Close Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
          {sidebarContent}
        </div>
      </div>

      {/* 4. Main Content Area */}
      <div className="md:pl-64 lg:pl-72 flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header */}
        <header className="md:hidden sticky top-0 z-30 bg-[#09110b]/95 backdrop-blur-md border-b border-[#1b2b1e] px-4 h-14 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl bg-[#132015] border border-[#273d2c] text-[#bbf451] hover:bg-[#1a2b1d] transition"
              aria-label="Open Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-[#bbf451]" />
              <span className="font-extrabold text-sm text-white font-syne truncate max-w-[150px]">
                {shopName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connector?.isOnline ? 'bg-[#bbf451] animate-pulse' : 'bg-amber-400'}`} />
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Desktop Slim Top Bar */}
        <div className="hidden md:flex h-14 border-b border-[#18271a] bg-[#09110b]/80 backdrop-blur-md px-6 items-center justify-between text-xs sticky top-0 z-30">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <span className="text-slate-400">Counter Station</span>
            <span className="text-slate-400">/</span>
            <span className="text-[#bbf451] font-syne">{title || 'Receiving Panel'}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Printer Connection Pill */}
            <Link
              to="/owner/printers"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition ${
                connector?.isOnline
                  ? 'bg-[#152719] text-[#bbf451] border-[#2e4c33] hover:bg-[#1e3422]'
                  : 'bg-[#221c10] text-amber-300 border-amber-500/30 hover:bg-[#2b2314]'
              }`}
              title="Click to view connected printers"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[130px]">{defaultPrinter?.name || 'Default Printer'}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${connector?.isOnline ? 'bg-[#bbf451] animate-pulse' : 'bg-amber-400'}`} />
            </Link>

            {onRefresh && (
              <button
                onClick={() => onRefresh()}
                className="p-1.5 rounded-xl border border-[#233526] bg-[#121c14] hover:bg-[#18271b] text-slate-300 hover:text-white transition"
                title="Refresh View"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}

            <a
              href={storefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-full border border-[#233827] bg-[#121c14] hover:bg-[#1a2c1d] text-slate-300 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#bbf451]" />
              <span>Customer Storefront</span>
            </a>
          </div>
        </div>

        {/* Page Content Body */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {title && (
            <div className="border-b border-[#1e3021] pb-4">
              <h1 className="text-xl sm:text-2xl font-black text-white font-syne tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
              )}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* 6-Digit Pairing Code Modal */}
      {pairingModalOpen && pairingCode && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#121c14] rounded-3xl max-w-sm w-full border border-[#233526] shadow-2xl p-6 space-y-4 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-[#1b2b1d] text-[#bbf451] flex items-center justify-center mx-auto border border-[#2e4732] shadow-[0_0_20px_rgba(187,244,81,0.2)]">
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
                className="w-full py-2.5 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(187,244,81,0.25)] transition active:scale-98"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? 'Code Copied!' : 'Copy Code'}
              </button>

              <button
                onClick={() => setPairingModalOpen(false)}
                className="w-full py-2 text-slate-400 hover:text-white text-xs font-semibold"
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

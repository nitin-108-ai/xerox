import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Printer,
  QrCode,
  Search,
  ShieldCheck,
  User,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Settings,
  FileCheck2,
  Building2,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC<{ onOpenScanner?: () => void }> = ({ onOpenScanner }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-[#0b120c]/90 backdrop-blur-md border-b border-[#1b2b1e]/90 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#162719] to-[#25422b] border border-[#3b6243] flex items-center justify-center text-white shadow-lg shadow-[#102213]/50 group-hover:border-[#bbf451] transition-all">
              <Printer className="w-5 h-5 text-[#bbf451]" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2 font-syne">
                Smart Xerox
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#bbf451]/15 text-[#bbf451] border border-[#bbf451]/30 px-2 py-0.5 rounded-full">
                  3D Studio
                </span>
              </span>
              <span className="text-[11px] block -mt-1 text-slate-400 font-medium">
                Cloud Press & QR Print Dispatch
              </span>
            </div>
          </Link>

          {/* Center Floating Pill Navigation */}
          <nav className="hidden lg:flex items-center bg-[#131d15]/90 border border-[#253929] rounded-full p-1.5 shadow-inner backdrop-blur-sm">
            <Link
              to="/"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                isActive('/') ? 'bg-[#223626] text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1a291e]'
              }`}
            >
              Home
            </Link>

            <a
              href="#samples"
              className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide text-slate-300 hover:text-white hover:bg-[#1a291e] transition-all"
            >
              3D Samples
            </a>

            <Link
              to="/shop/quickcopy-express"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                isActive('/shop/quickcopy-express') ? 'bg-[#223626] text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1a291e]'
              }`}
            >
              Demo Store
            </Link>

            <Link
              to="/track"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                isActive('/track') ? 'bg-[#223626] text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1a291e]'
              }`}
            >
              Track Order
            </Link>

            {/* Authenticated Links */}
            {user?.role === 'SHOP_OWNER' && (
              <>
                <div className="h-4 w-px bg-[#2b4130] mx-1" />
                <Link
                  to="/owner/dashboard"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive('/owner/dashboard') ? 'bg-[#223626] text-[#bbf451]' : 'text-slate-300 hover:text-white hover:bg-[#1a291e]'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                </Link>
                <Link
                  to="/owner/pricing"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive('/owner/pricing') ? 'bg-[#223626] text-[#bbf451]' : 'text-slate-300 hover:text-white hover:bg-[#1a291e]'
                  }`}
                >
                  Rates
                </Link>
                <Link
                  to="/owner/qr"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive('/owner/qr') ? 'bg-[#223626] text-[#bbf451]' : 'text-slate-300 hover:text-white hover:bg-[#1a291e]'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Shop QR
                </Link>
              </>
            )}

            {user?.role === 'ADMIN' && (
              <>
                <div className="h-4 w-px bg-[#2b4130] mx-1" />
                <Link
                  to="/admin/dashboard"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive('/admin/dashboard') ? 'bg-[#223626] text-[#bbf451]' : 'text-slate-300 hover:text-white hover:bg-[#1a291e]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </Link>
              </>
            )}
          </nav>

          {/* Right Header Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                title="Scan Shop Counter QR"
                className="w-10 h-10 rounded-full bg-[#162319] hover:bg-[#203424] border border-[#2c4431] flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-sm"
              >
                <QrCode className="w-4 h-4 text-[#bbf451]" />
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-white leading-tight">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] text-[#bbf451] font-medium">
                    {user.role === 'ADMIN' ? 'Platform Admin' : user.shopName || 'Shop Owner'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors border border-transparent hover:border-rose-500/20"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/owner/login"
                  className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-2 rounded-full hover:bg-[#162319] transition-colors"
                >
                  Owner Login
                </Link>
                <Link
                  to="/shop/quickcopy-express"
                  className="text-xs font-bold text-[#0c140e] bg-[#bbf451] hover:bg-[#c9f86e] px-5 py-2.5 rounded-full shadow-lg shadow-[#bbf451]/20 transition-all hover:scale-105 flex items-center gap-2"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex lg:hidden items-center gap-2">
            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                className="w-9 h-9 rounded-full bg-[#162319] border border-[#2c4431] flex items-center justify-center text-[#bbf451]"
              >
                <QrCode className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-[#162319]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#1f3123] bg-[#0f1711] px-4 pt-3 pb-6 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-[#1a291e]"
          >
            Home
          </Link>
          <a
            href="#samples"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-[#1a291e]"
          >
            3D Samples
          </a>
          <Link
            to="/shop/quickcopy-express"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-[#1a291e]"
          >
            Demo Storefront
          </Link>
          <Link
            to="/track"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-[#1a291e]"
          >
            Track Order
          </Link>

          {user?.role === 'SHOP_OWNER' && (
            <>
              <div className="pt-2 border-t border-[#1f3123]" />
              <Link
                to="/owner/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-[#bbf451] bg-[#1a291e]"
              >
                Owner Dashboard
              </Link>
              <Link
                to="/owner/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-[#1a291e]"
              >
                Printing Rates
              </Link>
              <Link
                to="/owner/qr"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-[#1a291e]"
              >
                Shop QR Code
              </Link>
            </>
          )}

          {user?.role === 'ADMIN' && (
            <>
              <div className="pt-2 border-t border-[#1f3123]" />
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-[#bbf451] bg-[#1a291e]"
              >
                Admin Console
              </Link>
            </>
          )}

          <div className="pt-3 border-t border-[#1f3123] flex flex-col gap-2">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out ({user.fullName})
              </button>
            ) : (
              <>
                <Link
                  to="/owner/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-full text-xs font-semibold border border-[#2c4431] text-slate-200 hover:bg-[#1a291e]"
                >
                  Shop Owner Login
                </Link>
                <Link
                  to="/shop/quickcopy-express"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-full text-xs font-bold bg-[#bbf451] text-[#0c140e]"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

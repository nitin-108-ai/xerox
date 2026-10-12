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
  Building2
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center text-white shadow-md group-hover:bg-brand-600 transition-colors">
              <Printer className="w-5 h-5 text-brand-50" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-navy-900 flex items-center gap-1.5">
                Smart Xerox
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-brand-50 text-brand-600 border border-brand-100 px-1.5 py-0.5 rounded-md">
                  Private
                </span>
              </span>
              <span className="text-[11px] block -mt-1 text-slate-500 font-medium">
                QR Print Dispatch
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/') ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:text-navy-900 hover:bg-slate-50'
              }`}
            >
              Home
            </Link>

            <Link
              to="/shop/quickcopy-express"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/shop/quickcopy-express') ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:text-navy-900 hover:bg-slate-50'
              }`}
            >
              Demo Storefront
            </Link>

            <Link
              to="/track"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/track') ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:text-navy-900 hover:bg-slate-50'
              }`}
            >
              Track Order
            </Link>

            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <QrCode className="w-4 h-4 text-brand-600" />
                Scan Shop QR
              </button>
            )}

            {/* Authenticated Links */}
            {user?.role === 'SHOP_OWNER' && (
              <>
                <div className="h-4 w-px bg-slate-200 mx-1" />
                <Link
                  to="/owner/dashboard"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/owner/dashboard') ? 'text-brand-600 bg-brand-50 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-slate-500" />
                  Dashboard
                </Link>
                <Link
                  to="/owner/profile"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/owner/profile') ? 'text-brand-600 bg-brand-50 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  My Profile
                </Link>
                <Link
                  to="/owner/pricing"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/owner/pricing') ? 'text-brand-600 bg-brand-50 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Pricing
                </Link>
                <Link
                  to="/owner/qr"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/owner/qr') ? 'text-brand-600 bg-brand-50 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-slate-500" />
                  Shop QR
                </Link>
              </>
            )}

            {user?.role === 'ADMIN' && (
              <>
                <div className="h-4 w-px bg-slate-200 mx-1" />
                <Link
                  to="/admin/dashboard"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/admin/dashboard') ? 'text-brand-600 bg-brand-50 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  Admin Console
                </Link>
              </>
            )}
          </nav>

          {/* Right Header Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-xs font-semibold text-navy-900 leading-tight">
                    {user.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {user.role === 'ADMIN' ? 'Platform Admin' : user.shopName || 'Shop Owner'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/owner/login"
                  className="text-xs font-semibold text-navy-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Shop Login
                </Link>
                <Link
                  to="/owner/register"
                  className="text-xs font-semibold text-white bg-navy-900 hover:bg-brand-600 px-3.5 py-2 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Register Xerox Shop
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Home
          </Link>
          <Link
            to="/shop/quickcopy-express"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Demo Storefront
          </Link>
          <Link
            to="/track"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Track Order
          </Link>

          {user?.role === 'SHOP_OWNER' && (
            <>
              <div className="pt-2 border-t border-slate-100" />
              <Link
                to="/owner/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-brand-600 bg-brand-50"
              >
                Owner Dashboard
              </Link>
              <Link
                to="/owner/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                My Shop Profile
              </Link>
              <Link
                to="/owner/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Printing & Pricing
              </Link>
              <Link
                to="/owner/qr"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Shop QR Code
              </Link>
            </>
          )}

          {user?.role === 'ADMIN' && (
            <>
              <div className="pt-2 border-t border-slate-100" />
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-brand-600 bg-brand-50"
              >
                Admin Console
              </Link>
            </>
          )}

          <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out ({user.fullName})
              </button>
            ) : (
              <>
                <Link
                  to="/owner/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700"
                >
                  Shop Owner Login
                </Link>
                <Link
                  to="/owner/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg text-sm font-semibold bg-navy-900 text-white"
                >
                  Register Xerox Shop
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

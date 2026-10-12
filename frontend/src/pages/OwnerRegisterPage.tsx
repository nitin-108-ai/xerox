import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Lock, Mail, User, Phone, MapPin, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const OwnerRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    shopName: '',
    shopAddress: '',
    businessHours: '8:30 AM - 9:30 PM',
    registrationNumber: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.registerOwner(formData);
      login(res.token, res.user);
      navigate('/owner/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-elevated space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-navy-900 text-white flex items-center justify-center mx-auto shadow-md">
            <Building2 className="w-6 h-6 text-brand-300" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
            Register Your Xerox / Print Shop
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Get your dedicated counter QR code, eliminate WhatsApp number sharing, and accept verified customer print jobs.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Owner Full Name *
              </label>
              <input
                type="text"
                name="fullName"
                required
                placeholder="Rajesh Kumar"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Owner Email *
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="owner@quickprint.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                name="password"
                required
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Verification Phone Number *
              </label>
              <input
                type="tel"
                name="phoneNumber"
                required
                placeholder="+91 98000 00000"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Used only for administrative platform verification. Never exposed to customers.
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100" />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Shop Name *
            </label>
            <input
              type="text"
              name="shopName"
              required
              placeholder="e.g. Star Copy Center & Digital Print"
              value={formData.shopName}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Shop Physical Address *
            </label>
            <input
              type="text"
              name="shopAddress"
              required
              placeholder="e.g. Shop 12, Ground Floor, Central Market, Sector 15"
              value={formData.shopAddress}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business Operating Hours
              </label>
              <input
                type="text"
                name="businessHours"
                placeholder="e.g. 9:00 AM - 9:00 PM"
                value={formData.businessHours}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trade / Registration / GST No. (Optional)
              </label>
              <input
                type="text"
                name="registrationNumber"
                placeholder="e.g. GST-07AAAAA0000A1Z5"
                value={formData.registrationNumber}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-navy-900 hover:bg-brand-600 text-white shadow-elevated flex items-center justify-center gap-1.5 transition-colors disabled:bg-slate-300"
            >
              {loading ? 'Creating Your Shop & Generating QR...' : 'Register & Create Shop Storefront'}
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          Already registered as a shop owner?{' '}
          <Link to="/owner/login" className="font-semibold text-brand-600 hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};

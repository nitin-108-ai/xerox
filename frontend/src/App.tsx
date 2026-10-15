import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { QrScannerModal } from './components/QrScannerModal';

// Pages
import { HomePage } from './pages/HomePage';
import { StorefrontPage } from './pages/StorefrontPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { OwnerLoginPage } from './pages/OwnerLoginPage';
import { OwnerRegisterPage } from './pages/OwnerRegisterPage';
import { OwnerDashboardPage } from './pages/OwnerDashboardPage';
import { OwnerProfilePage } from './pages/OwnerProfilePage';
import { OwnerPricingPage } from './pages/OwnerPricingPage';
import { OwnerOrderDetailPage } from './pages/OwnerOrderDetailPage';
import { OwnerSettingsPage } from './pages/OwnerSettingsPage';
import { OwnerQrPage } from './pages/OwnerQrPage';
import { OwnerReportsPage } from './pages/OwnerReportsPage';
import { OwnerPrintersPage } from './pages/OwnerPrintersPage';
import { FirstTimeSetupWizardPage } from './pages/FirstTimeSetupWizardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Protected Route Guard
const ProtectedOwnerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-2" />
        <p className="text-xs text-slate-500">Checking credentials...</p>
      </div>
    );
  }

  if (!user || (user.role !== 'SHOP_OWNER' && user.role !== 'ADMIN')) {
    return <Navigate to="/owner/login" replace />;
  }

  return <>{children}</>;
};

const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-2" />
        <p className="text-xs text-slate-500">Checking credentials...</p>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/owner/login" replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const location = useLocation();
  const isDedicatedView = location.pathname.startsWith('/shop/') || location.pathname.startsWith('/s/') || location.pathname.startsWith('/owner');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/40 text-slate-900 font-sans antialiased selection:bg-brand-500 selection:text-white">
      {!isDedicatedView && <Navbar onOpenScanner={() => setScannerOpen(true)} />}

      <main className="flex-1">
        <Routes>
          {/* Public Customer Routes */}
          <Route path="/" element={<HomePage onOpenScanner={() => setScannerOpen(true)} />} />
          <Route path="/shop/:slug" element={<StorefrontPage />} />
          <Route path="/s/:slug" element={<StorefrontPage />} />
          <Route path="/confirm/:reference" element={<OrderConfirmationPage />} />
          <Route path="/confirm" element={<OrderConfirmationPage />} />
          <Route path="/track" element={<OrderTrackingPage />} />
          <Route path="/track/:reference" element={<OrderTrackingPage />} />

          {/* Authentication Routes */}
          <Route path="/owner/login" element={<OwnerLoginPage />} />
          <Route path="/owner/register" element={<OwnerRegisterPage />} />

          {/* Protected Shop Owner Routes */}
          <Route
            path="/owner/dashboard"
            element={
              <ProtectedOwnerRoute>
                <OwnerDashboardPage />
              </ProtectedOwnerRoute>
            }
          />
          <Route
            path="/owner/profile"
            element={
              <ProtectedOwnerRoute>
                <OwnerProfilePage />
              </ProtectedOwnerRoute>
            }
          />
          <Route
            path="/owner/pricing"
            element={
              <ProtectedOwnerRoute>
                <OwnerPricingPage />
              </ProtectedOwnerRoute>
            }
          />
          <Route
            path="/owner/orders"
            element={
              <ProtectedOwnerRoute>
                <OwnerDashboardPage />
              </ProtectedOwnerRoute>
            }
          />
          <Route
            path="/owner/orders/:id"
            element={
              <ProtectedOwnerRoute>
                <OwnerOrderDetailPage />
              </ProtectedOwnerRoute>
            }
          />
          <Route
            path="/owner/settings"
            element={
              <ProtectedOwnerRoute>
                <OwnerSettingsPage />
              </ProtectedOwnerRoute>
            }
          />
          <Route
            path="/owner/qr"
            element={
              <ProtectedOwnerRoute>
                <OwnerQrPage />
              </ProtectedOwnerRoute>
            }
          />
          <Route
            path="/owner/printers"
            element={
              <ProtectedOwnerRoute>
                <OwnerPrintersPage />
              </ProtectedOwnerRoute>
            }
          />
          <Route
            path="/owner/setup-wizard"
            element={
              <ProtectedOwnerRoute>
                <FirstTimeSetupWizardPage />
              </ProtectedOwnerRoute>
            }
          />
          <Route
            path="/owner/reports"
            element={
              <ProtectedOwnerRoute>
                <OwnerReportsPage />
              </ProtectedOwnerRoute>
            }
          />

          {/* Protected Administrator Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedAdminRoute>
                <AdminDashboardPage />
              </ProtectedAdminRoute>
            }
          />

          {/* Compliance & Legal */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />

          {/* Fallback 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {!isDedicatedView && <Footer />}

      {/* Global QR Scanner Modal */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  );
}

// Global Error Boundary to prevent White Screen of Death
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Smart Xerox caught render error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      }
    } catch {
      // Ignore cleanup error
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-elevated border border-slate-200 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center mx-auto text-xl font-bold">
              SX
            </div>
            <h1 className="text-xl font-bold text-navy-950">Smart Xerox</h1>
            <p className="text-sm text-slate-600">
              The page encountered an unexpected state. Click below to reload cleanly.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-brand-600 text-white font-semibold text-xs transition-colors"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
              >
                Clear Cache &amp; Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;


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
  const isDedicatedView = location.pathname.startsWith('/shop/') || location.pathname.startsWith('/owner');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/40 text-slate-900 font-sans antialiased selection:bg-brand-500 selection:text-white">
      {!isDedicatedView && <Navbar onOpenScanner={() => setScannerOpen(true)} />}

      <main className="flex-1">
        <Routes>
          {/* Public Customer Routes */}
          <Route path="/" element={<HomePage onOpenScanner={() => setScannerOpen(true)} />} />
          <Route path="/shop/:slug" element={<StorefrontPage />} />
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

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

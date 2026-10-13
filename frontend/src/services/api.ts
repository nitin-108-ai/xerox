function resolveApiBase(): string {
  // 1. Check explicit Vite environment variable (e.g. configured in Vercel settings or .env)
  const envUrl = (
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL)) ||
    ''
  ).trim();

  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/+$/, '')}/api`;
  }

  // 2. If running locally on localhost/127.0.0.1, use relative /api
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return '/api';
  }

  // 3. Default deployed cloud backend on Render
  return 'https://xerox-oys6.onrender.com/api';
}

export const API_BASE = resolveApiBase();

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('smart_xerox_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      errMsg = data.error || data.message || errMsg;
    } catch {
      if (res.status === 404) {
        errMsg = `Backend API route not found (404). If hosting on Vercel, please connect your backend server URL in Vercel project environment variables as VITE_API_URL.`;
      }
    }
    throw new Error(errMsg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<{ token: string; user: any; message: string }>(res);
  },

  async registerOwner(data: any) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ token: string; user: any; message: string }>(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ user: any }>(res);
  },

  // Public Storefront
  async getStorefront(slugOrToken: string) {
    const res = await fetch(`${API_BASE}/shops/public/${encodeURIComponent(slugOrToken)}`);
    return handleResponse<{ shop: any; services: any[]; pricingRules: any[] }>(res);
  },

  // Customer Order
  async calculateEstimate(params: {
    shopId: string;
    paperSize: string;
    colorMode: string;
    isDuplex: boolean;
    copies: number;
    pageCount: number;
  }) {
    const res = await fetch(`${API_BASE}/orders/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse<any>(res);
  },

  async createOrder(formData: FormData) {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<any>(res);
  },

  async trackOrder(orderRef: string, token: string) {
    const res = await fetch(`${API_BASE}/orders/track/${encodeURIComponent(orderRef)}?token=${encodeURIComponent(token)}`);
    return handleResponse<any>(res);
  },

  async approveQuote(orderRef: string, token: string) {
    const res = await fetch(`${API_BASE}/orders/track/${encodeURIComponent(orderRef)}/approve-quote?token=${encodeURIComponent(token)}`, {
      method: 'POST',
    });
    return handleResponse<any>(res);
  },

  async cancelOrder(orderRef: string, token: string, reason?: string) {
    const res = await fetch(`${API_BASE}/orders/track/${encodeURIComponent(orderRef)}/cancel?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return handleResponse<any>(res);
  },

  async sendCustomerMessage(orderRef: string, token: string, message: string) {
    const res = await fetch(`${API_BASE}/orders/track/${encodeURIComponent(orderRef)}/messages?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, senderRole: 'CUSTOMER' }),
    });
    return handleResponse<any>(res);
  },

  // Shop Owner
  async getOwnerShop() {
    const res = await fetch(`${API_BASE}/shops/owner/profile`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async updateOwnerProfile(data: any) {
    const res = await fetch(`${API_BASE}/shops/owner/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateOwnerShop(data: any) {
    return this.updateOwnerProfile(data);
  },

  async uploadOwnerImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE}/shops/owner/upload-image`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    return handleResponse<{ url: string; filename: string; message: string }>(res);
  },

  async updateOwnerPricing(pricingData: any) {
    const res = await fetch(`${API_BASE}/shops/owner/pricing`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(pricingData),
    });
    return handleResponse<any>(res);
  },

  async getOwnerPricingRules() {
    const res = await this.getOwnerShop();
    return { rules: res.pricingRules || [] };
  },

  async createPricingRule(ruleData: any) {
    return this.updateOwnerPricing({
      pricingRules: [ruleData],
    });
  },

  async getOwnerQr() {
    const res = await fetch(`${API_BASE}/shops/owner/qr`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async regenerateOwnerQr() {
    const res = await fetch(`${API_BASE}/shops/owner/qr/regenerate`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async getOwnerOrders(status?: string, search?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    const res = await fetch(`${API_BASE}/orders/owner?${params.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ orders: any[] }>(res);
  },

  async getOwnerOrderDetail(orderId: string) {
    const res = await fetch(`${API_BASE}/orders/owner/${encodeURIComponent(orderId)}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async updateOrderStatus(orderId: string, status: string, note?: string) {
    const res = await fetch(`${API_BASE}/orders/owner/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, note }),
    });
    return handleResponse<any>(res);
  },

  async reviseQuote(orderId: string, newAmount: number, quotationNote: string) {
    const res = await fetch(`${API_BASE}/orders/owner/${encodeURIComponent(orderId)}/quote`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ newAmount, quotationNote }),
    });
    return handleResponse<any>(res);
  },

  async sendOwnerMessage(orderId: string, message: string) {
    const res = await fetch(`${API_BASE}/orders/owner/${encodeURIComponent(orderId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ message, senderRole: 'SHOP_OWNER' }),
    });
    return handleResponse<any>(res);
  },

  async getOwnerReports() {
    const res = await fetch(`${API_BASE}/orders/owner/reports`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  // Admin
  async getAdminMetrics() {
    const res = await fetch(`${API_BASE}/admin/metrics`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async getAdminShops() {
    const res = await fetch(`${API_BASE}/admin/shops`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ shops: any[] }>(res);
  },

  async reviewShopVerification(shopId: string, status: 'APPROVED' | 'REJECTED', adminFeedback?: string) {
    const res = await fetch(`${API_BASE}/admin/shops/${encodeURIComponent(shopId)}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, adminFeedback }),
    });
    return handleResponse<any>(res);
  },

  async toggleShopStatus(shopId: string, isActive: boolean, reason?: string) {
    const res = await fetch(`${API_BASE}/admin/shops/${encodeURIComponent(shopId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ isActive, reason }),
    });
    return handleResponse<any>(res);
  },

  async getAdminAuditLogs(action?: string) {
    const params = new URLSearchParams();
    if (action) params.append('action', action);
    const res = await fetch(`${API_BASE}/admin/audit-logs?${params.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ logs: any[] }>(res);
  },

  async getPlatformPolicies() {
    const res = await fetch(`${API_BASE}/admin/policies`);
    return handleResponse<any>(res);
  },

  // Printer Management & Direct Printing
  async listPrinters() {
    const res = await fetch(`${API_BASE}/printers`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ printers: any[]; connector: any }>(res);
  },

  async savePrinter(data: any, id?: string) {
    const url = id ? `${API_BASE}/printers/${encodeURIComponent(id)}` : `${API_BASE}/printers`;
    const res = await fetch(url, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; printerId?: string }>(res);
  },

  async setDefaultPrinter(id: string) {
    const res = await fetch(`${API_BASE}/printers/${encodeURIComponent(id)}/default`, {
      method: 'PUT',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ message: string }>(res);
  },

  async deletePrinter(id: string) {
    const res = await fetch(`${API_BASE}/printers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ message: string }>(res);
  },

  async generatePairingCode() {
    const res = await fetch(`${API_BASE}/printers/pairing-code`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ pairingCode: string; expiresAt: string; expiresInSeconds: number; message: string }>(res);
  },

  async revokeConnector() {
    const res = await fetch(`${API_BASE}/printers/revoke-connector`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ message: string }>(res);
  },

  async submitDirectPrint(data: {
    orderId: string;
    printerName?: string;
    copies?: number;
    isDuplex?: boolean;
    colorMode?: string;
    paperSize?: string;
  }) {
    const res = await fetch(`${API_BASE}/printers/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<{ jobId: string; status: string; printerName: string; message: string }>(res);
  },

  async recordManualPrint(orderId: string, outcomeStatus: 'READY_FOR_PICKUP' | 'COMPLETED' = 'READY_FOR_PICKUP') {
    const res = await fetch(`${API_BASE}/printers/orders/${encodeURIComponent(orderId)}/manual-print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ outcomeStatus }),
    });
    return handleResponse<{ message: string; status: string }>(res);
  },

  async getPrintJobStatus(jobId: string) {
    const res = await fetch(`${API_BASE}/printers/jobs/${encodeURIComponent(jobId)}/status`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ id: string; status: string; printer_name: string; error_message?: string }>(res);
  },
};


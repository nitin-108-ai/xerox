export interface LiveScanEvent {
  shopId: string;
  slug: string;
  shopName: string;
  timestamp: number;
}

export interface LiveOrderEvent {
  id: string;
  order_reference: string;
  shop_id: string;
  customer_alias: string;
  status: string;
  estimated_amount: string;
  pickup_otp?: string;
  file_count?: number;
  original_filename?: string;
  timestamp: number;
  documents?: any[];
  items?: any[];
  created_at: string;
}

class LiveEventsService {
  private scansByShop = new Map<string, LiveScanEvent>();
  private scansBySlug = new Map<string, LiveScanEvent>();
  private lastScan: LiveScanEvent | null = null;
  private recentOrdersRing: LiveOrderEvent[] = [];

  recordScan(shopId: string, slug: string, shopName = 'Smart Xerox Counter'): LiveScanEvent {
    const event: LiveScanEvent = {
      shopId,
      slug,
      shopName,
      timestamp: Date.now()
    };
    this.lastScan = event;
    if (shopId) {
      this.scansByShop.set(shopId, event);
    }
    if (slug) {
      this.scansBySlug.set(slug.toLowerCase(), event);
    }
    return event;
  }

  getRecentScan(shopIdOrSlug: string, maxAgeMs = 30000): LiveScanEvent | null {
    if (!shopIdOrSlug) {
      return this.lastScan && (Date.now() - this.lastScan.timestamp <= maxAgeMs) ? this.lastScan : null;
    }
    let event = this.scansByShop.get(shopIdOrSlug);
    if (!event) {
      event = this.scansBySlug.get(shopIdOrSlug.toLowerCase());
    }
    if (!event && this.lastScan && (Date.now() - this.lastScan.timestamp <= maxAgeMs)) {
      event = this.lastScan;
    }
    if (!event) return null;
    if (Date.now() - event.timestamp > maxAgeMs) {
      return null;
    }
    return event;
  }

  recordOrder(order: any): void {
    if (!order) return;
    const item: LiveOrderEvent = {
      id: order.id,
      order_reference: order.order_reference || order.orderReference || order.reference,
      shop_id: order.shop_id || order.shopId || 'shp-quickcopy-001',
      customer_alias: order.customer_alias || order.customerAlias || 'Customer',
      status: order.status || 'SUBMITTED',
      estimated_amount: String(order.estimated_amount || order.total_amount || order.final_amount || '10.00'),
      pickup_otp: order.pickup_otp || order.pickupOtp || '',
      file_count: order.file_count || order.documents?.length || 1,
      original_filename: order.original_filename || order.documents?.[0]?.original_filename || 'document.pdf',
      timestamp: Date.now(),
      documents: order.documents || [],
      items: order.items || [],
      created_at: order.created_at || new Date().toISOString()
    };

    // Filter duplicates
    this.recentOrdersRing = this.recentOrdersRing.filter(
      (o) => o.id !== item.id && o.order_reference !== item.order_reference
    );
    this.recentOrdersRing.unshift(item);

    // Keep up to 60 recent orders
    if (this.recentOrdersRing.length > 60) {
      this.recentOrdersRing.pop();
    }
  }

  getRecentOrders(shopId: string): LiveOrderEvent[] {
    if (!shopId) return this.recentOrdersRing;
    return this.recentOrdersRing.filter(
      (o) => o.shop_id === shopId || o.shop_id === 'shp-quickcopy-001'
    );
  }
}

export const liveEvents = new LiveEventsService();

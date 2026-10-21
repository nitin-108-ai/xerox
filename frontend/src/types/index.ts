export type UserRole = 'ADMIN' | 'SHOP_OWNER' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'SHOP_OWNER';
  shopId?: string;
  shopName?: string;
  slug?: string;
  isVerified?: boolean;
}

export interface Shop {
  id: string;
  slug: string;
  name: string;
  address: string;
  businessHours: string;
  retentionHours: number;
  phone_for_verification?: string;
  is_verified?: boolean;
  is_active?: boolean;
  qr_code_token?: string;
  created_at?: string;
}

export interface ShopServiceItem {
  service_type: 'PRINTING' | 'PHOTOCOPY' | 'SCANNING' | 'LAMINATION' | 'SPIRAL_BINDING';
  description?: string;
  is_enabled?: boolean;
}

export interface PricingRule {
  paperSize: 'A4' | 'A3' | 'LEGAL' | 'LETTER';
  colorMode: 'BW' | 'COLOR';
  singleSidedPrice: number;
  doubleSidedPrice: number;
  discountThreshold: number;
  discountRate: number;
}

export type OrderStatus =
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'AWAITING_APPROVAL'
  | 'PRINTING'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'RECEIVED'
  | 'QUEUED';

export interface OrderItem {
  paper_size: 'A4' | 'A3' | 'LEGAL' | 'LETTER';
  color_mode: 'BW' | 'COLOR';
  is_duplex: boolean;
  copies: number;
  page_count: number;
  custom_notes?: string;
  item_price: number;
}

export interface DocumentMeta {
  id?: string;
  original_filename?: string;
  originalFilename?: string;
  file_size?: number;
  fileSize?: number;
  mime_type?: string;
  mimeType?: string;
  page_count?: number;
  pageCount?: number;
  is_deleted?: boolean;
  isDeleted?: boolean;
  auto_delete_at?: string;
  autoDeleteAt?: string;
  sha256_hash?: string;
}

export interface OrderStatusHistoryItem {
  previous_status?: string | null;
  new_status: string;
  changed_by_role: string;
  note?: string;
  created_at: string;
}

export interface OrderMessage {
  id: string;
  sender_role: 'CUSTOMER' | 'SHOP_OWNER';
  message: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_reference: string;
  orderReference?: string;
  status: OrderStatus;
  estimated_amount: number;
  estimatedAmount?: number;
  final_amount: number;
  finalAmount?: number;
  quotation_note?: string;
  cancellation_reason?: string;
  pickup_otp: string;
  customer_alias?: string;
  created_at: string;
  updated_at?: string;
  shop_name?: string;
  shop_address?: string;
  shop_hours?: string;
  retention_hours?: number;
}

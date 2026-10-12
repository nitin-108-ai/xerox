-- Smart Xerox PostgreSQL Schema

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('ADMIN', 'SHOP_OWNER')),
    phone_number VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shops (
    id VARCHAR(64) PRIMARY KEY,
    owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(128) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone_for_verification VARCHAR(64) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    qr_code_token VARCHAR(128) UNIQUE NOT NULL,
    retention_hours INTEGER DEFAULT 24 CHECK (retention_hours >= 1 AND retention_hours <= 168),
    business_hours VARCHAR(255) DEFAULT '9:00 AM - 9:00 PM',
    description TEXT,
    category VARCHAR(128) DEFAULT 'Xerox & Digital Printing',
    city VARCHAR(128) DEFAULT 'New Delhi',
    state VARCHAR(128) DEFAULT 'Delhi',
    pincode VARCHAR(20) DEFAULT '110001',
    contact_email VARCHAR(255),
    contact_phone VARCHAR(64),
    owner_display_name VARCHAR(255),
    logo_url TEXT,
    gallery_urls TEXT DEFAULT '[]',
    weekly_schedule TEXT DEFAULT '[]',
    weekly_holidays TEXT DEFAULT '[]',
    min_order_amount NUMERIC(10, 2) DEFAULT 5.00,
    est_completion_time VARCHAR(100) DEFAULT '15-30 mins',
    is_storefront_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_verification_requests (
    id VARCHAR(64) PRIMARY KEY,
    shop_id VARCHAR(64) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    status VARCHAR(32) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    business_registration_number VARCHAR(128),
    documents_note TEXT,
    admin_feedback TEXT,
    reviewed_by VARCHAR(64) REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_services (
    id VARCHAR(64) PRIMARY KEY,
    shop_id VARCHAR(64) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    service_type VARCHAR(64) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    description TEXT,
    rate NUMERIC(10, 2) DEFAULT 0.00,
    unit VARCHAR(32) DEFAULT 'per_page',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shop_id, service_type)
);

CREATE TABLE IF NOT EXISTS shop_pricing_rules (
    id VARCHAR(64) PRIMARY KEY,
    shop_id VARCHAR(64) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    paper_size VARCHAR(32) NOT NULL CHECK (paper_size IN ('A4', 'A3', 'LEGAL', 'LETTER')),
    color_mode VARCHAR(32) NOT NULL CHECK (color_mode IN ('BW', 'COLOR')),
    single_sided_price NUMERIC(10, 2) NOT NULL,
    double_sided_price NUMERIC(10, 2) NOT NULL,
    per_page_discount_threshold INTEGER DEFAULT 50,
    per_page_discount_rate NUMERIC(10, 2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shop_id, paper_size, color_mode)
);

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    order_reference VARCHAR(32) UNIQUE NOT NULL,
    shop_id VARCHAR(64) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_alias VARCHAR(128) DEFAULT 'Guest Customer',
    customer_contact_note VARCHAR(255),
    status VARCHAR(64) DEFAULT 'SUBMITTED' CHECK (status IN (
        'SUBMITTED',
        'ACCEPTED',
        'AWAITING_APPROVAL',
        'PRINTING',
        'PRINT_FAILED',
        'READY_FOR_PICKUP',
        'COMPLETED',
        'CANCELLED'
    )),
    estimated_amount NUMERIC(10, 2) NOT NULL,
    final_amount NUMERIC(10, 2) NOT NULL,
    quotation_note TEXT,
    cancellation_reason TEXT,
    pickup_otp VARCHAR(16),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    paper_size VARCHAR(32) NOT NULL CHECK (paper_size IN ('A4', 'A3', 'LEGAL', 'LETTER')),
    color_mode VARCHAR(32) NOT NULL CHECK (color_mode IN ('BW', 'COLOR')),
    is_duplex BOOLEAN DEFAULT FALSE,
    copies INTEGER DEFAULT 1 CHECK (copies >= 1),
    page_count INTEGER DEFAULT 1 CHECK (page_count >= 1),
    custom_notes TEXT,
    item_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_metadata (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id VARCHAR(64) REFERENCES order_items(id) ON DELETE SET NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    page_count INTEGER DEFAULT 1,
    storage_key VARCHAR(255) NOT NULL,
    sha256_hash VARCHAR(128) NOT NULL,
    malware_status VARCHAR(32) DEFAULT 'CLEAN' CHECK (malware_status IN ('CLEAN', 'SCANNING', 'FLAGGED')),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    auto_delete_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_status_history (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    previous_status VARCHAR(64),
    new_status VARCHAR(64) NOT NULL,
    changed_by_role VARCHAR(32) NOT NULL CHECK (changed_by_role IN ('CUSTOMER', 'SHOP_OWNER', 'ADMIN', 'SYSTEM')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_access_tokens (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL,
    token_hint VARCHAR(32) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_messages (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sender_role VARCHAR(32) NOT NULL CHECK (sender_role IN ('CUSTOMER', 'SHOP_OWNER')),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    recipient_user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    shop_id VARCHAR(64) REFERENCES shops(id) ON DELETE CASCADE,
    order_id VARCHAR(64) REFERENCES orders(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(32) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'REFUNDED', 'WAIVED')),
    payment_method VARCHAR(64) DEFAULT 'CASH_AT_COUNTER',
    transaction_reference VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    actor_id VARCHAR(64),
    actor_role VARCHAR(32) NOT NULL,
    action VARCHAR(128) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(64),
    ip_address VARCHAR(64),
    user_agent TEXT,
    details_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS file_deletion_jobs (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL REFERENCES document_metadata(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(32) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS printer_connectors (
    id VARCHAR(64) PRIMARY KEY,
    shop_id VARCHAR(64) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    device_name VARCHAR(255) NOT NULL,
    os_info VARCHAR(255),
    connector_token_hash VARCHAR(128) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    pairing_code VARCHAR(16),
    pairing_code_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_printers (
    id VARCHAR(64) PRIMARY KEY,
    shop_id VARCHAR(64) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    driver_name VARCHAR(255),
    port_name VARCHAR(128),
    is_default BOOLEAN DEFAULT FALSE,
    is_online BOOLEAN DEFAULT TRUE,
    status VARCHAR(32) DEFAULT 'READY' CHECK (status IN ('READY', 'OFFLINE', 'UNKNOWN', 'ERROR')),
    connection_type VARCHAR(32) DEFAULT 'USB' CHECK (connection_type IN ('USB', 'WIFI', 'LAN', 'VIRTUAL')),
    supported_paper_sizes TEXT DEFAULT '["A4"]',
    supports_color BOOLEAN DEFAULT TRUE,
    supports_duplex BOOLEAN DEFAULT FALSE,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shop_id, name)
);

CREATE TABLE IF NOT EXISTS print_jobs (
    id VARCHAR(64) PRIMARY KEY,
    shop_id VARCHAR(64) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    printer_name VARCHAR(255) NOT NULL,
    print_mode VARCHAR(32) DEFAULT 'DIRECT' CHECK (print_mode IN ('DIRECT', 'MANUAL')),
    status VARCHAR(32) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DOWNLOADING', 'SUBMITTED', 'PRINTED', 'FAILED', 'CANCELLED')),
    copies INTEGER DEFAULT 1,
    is_duplex BOOLEAN DEFAULT FALSE,
    color_mode VARCHAR(32) DEFAULT 'BW',
    paper_size VARCHAR(32) DEFAULT 'A4',
    idempotency_key VARCHAR(128) UNIQUE,
    error_message TEXT,
    download_token VARCHAR(128),
    download_token_expires_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance & authorization queries
CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);
CREATE INDEX IF NOT EXISTS idx_shops_qr ON shops(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_ref ON orders(order_reference);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_doc_order ON document_metadata(order_id);
CREATE INDEX IF NOT EXISTS idx_doc_auto_del ON document_metadata(auto_delete_at, is_deleted);
CREATE INDEX IF NOT EXISTS idx_tokens_order ON order_access_tokens(order_id);
CREATE INDEX IF NOT EXISTS idx_tokens_hash ON order_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_messages_order ON order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_connectors_shop ON printer_connectors(shop_id);
CREATE INDEX IF NOT EXISTS idx_printers_shop ON shop_printers(shop_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_shop ON print_jobs(shop_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_order ON print_jobs(order_id);

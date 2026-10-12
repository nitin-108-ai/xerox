import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { query, initDb } from './connection.js';
import { runMigrations } from './migrate.js';

export async function runSeed() {
  console.log('Seeding database with test and initial demonstration data...');
  await initDb();
  await runMigrations();

  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@12345', salt);
  const ownerPasswordHash = await bcrypt.hash('Owner@12345', salt);

  // 1. Users
  const adminId = 'usr-admin-001';
  const owner1Id = 'usr-owner-001';
  const owner2Id = 'usr-owner-002';
  const owner3Id = 'usr-owner-003';

  await query(`
    INSERT INTO users (id, email, password_hash, full_name, role, phone_number)
    VALUES 
      ($1, 'admin@smartxerox.io', $2, 'System Administrator', 'ADMIN', '+91 98000 00000'),
      ($3, 'owner1@smartxerox.io', $4, 'Rajesh Sharma', 'SHOP_OWNER', '+91 98111 22334'),
      ($5, 'owner2@smartxerox.io', $4, 'Priya Patel', 'SHOP_OWNER', '+91 98222 33445'),
      ($6, 'owner3@smartxerox.io', $4, 'Vikram Singh', 'SHOP_OWNER', '+91 98333 44556')
    ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;
  `, [adminId, adminPasswordHash, owner1Id, ownerPasswordHash, owner2Id, owner3Id]);

  // 2. Shops
  const shop1Id = 'shp-quickcopy-001';
  const shop2Id = 'shp-metro-002';
  const shop3Id = 'shp-campus-003';

  await query(`
    INSERT INTO shops (id, owner_id, slug, name, address, phone_for_verification, is_verified, is_active, qr_code_token, retention_hours, business_hours)
    VALUES
      ($1, $2, 'quickcopy-express', 'QuickCopy Express Xerox & Print', '124 Commercial Plaza, Near City Metro Gate 2, Sector 18', '+91 98111 22334', TRUE, TRUE, 'qr-token-qc-express-2026', 24, '8:00 AM - 10:00 PM'),
      ($3, $4, 'metro-doc-hub', 'Metro Document Hub & Scanning', '45 North Avenue, IT Tech Park Complex, Floor 1', '+91 98222 33445', TRUE, TRUE, 'qr-token-metro-doc-2026', 12, '9:00 AM - 9:00 PM'),
      ($5, $6, 'campus-print-point', 'Campus Print Point', 'Gate No. 3, Engineering University Road', '+91 98333 44556', FALSE, TRUE, 'qr-token-campus-print-2026', 6, '8:30 AM - 8:00 PM')
    ON CONFLICT (id) DO UPDATE SET 
      is_verified = EXCLUDED.is_verified,
      name = EXCLUDED.name,
      address = EXCLUDED.address;
  `, [shop1Id, owner1Id, shop2Id, owner2Id, shop3Id, owner3Id]);

  // 3. Shop Verification Request for Shop 3 (Pending review)
  await query(`
    INSERT INTO shop_verification_requests (id, shop_id, status, business_registration_number, documents_note, admin_feedback)
    VALUES 
      ('svr-campus-003', $1, 'PENDING', 'REG-DL-2026-XER-9912', 'GST registration and shop establishment certificate submitted for Campus Xerox.', NULL)
    ON CONFLICT (id) DO NOTHING;
  `, [shop3Id]);

  // Also completed verification requests for Shop 1 & 2
  await query(`
    INSERT INTO shop_verification_requests (id, shop_id, status, business_registration_number, documents_note, admin_feedback, reviewed_by, reviewed_at)
    VALUES 
      ('svr-qc-001', $1, 'APPROVED', 'REG-DL-2025-XER-4101', 'Verified with trade license.', 'Storefront verified and activated.', $3, CURRENT_TIMESTAMP),
      ('svr-metro-002', $2, 'APPROVED', 'REG-DL-2025-XER-8822', 'Verified with MSME Udyam registration certificate.', 'Approved.', $3, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO NOTHING;
  `, [shop1Id, shop2Id, adminId]);

  // 4. Shop Services
  const services = [
    { shop_id: shop1Id, type: 'PRINTING', desc: 'High-speed laser printing up to 1200 DPI' },
    { shop_id: shop1Id, type: 'PHOTOCOPY', desc: 'Crisp black & white and vibrant color xerox copies' },
    { shop_id: shop1Id, type: 'SCANNING', desc: 'Flatbed high resolution document scanner (PDF/JPG)' },
    { shop_id: shop1Id, type: 'SPIRAL_BINDING', desc: 'Spiral and comb binding with transparent cover sheet' },
    { shop_id: shop1Id, type: 'LAMINATION', desc: 'Thermal pouch lamination for ID cards and certificates' },
    { shop_id: shop2Id, type: 'PRINTING', desc: 'Laser digital printing' },
    { shop_id: shop2Id, type: 'PHOTOCOPY', desc: 'Digital photocopy' },
    { shop_id: shop2Id, type: 'SCANNING', desc: 'Bulk scanning & OCR' },
  ];

  for (const s of services) {
    await query(`
      INSERT INTO shop_services (id, shop_id, service_type, is_enabled, description)
      VALUES ($1, $2, $3, TRUE, $4)
      ON CONFLICT (shop_id, service_type) DO UPDATE SET description = EXCLUDED.description;
    `, [uuidv4(), s.shop_id, s.type, s.desc]);
  }

  // 5. Pricing Rules for Shop 1 (QuickCopy Express)
  const pricingRules = [
    // A4
    { shop_id: shop1Id, size: 'A4', color: 'BW', single: 2.00, double: 3.00, thresh: 50, disc: 0.20 },
    { shop_id: shop1Id, size: 'A4', color: 'COLOR', single: 10.00, double: 18.00, thresh: 20, disc: 1.00 },
    // A3
    { shop_id: shop1Id, size: 'A3', color: 'BW', single: 5.00, double: 8.00, thresh: 30, disc: 0.50 },
    { shop_id: shop1Id, size: 'A3', color: 'COLOR', single: 20.00, double: 35.00, thresh: 15, disc: 2.00 },
    // LEGAL
    { shop_id: shop1Id, size: 'LEGAL', color: 'BW', single: 3.00, double: 4.50, thresh: 50, disc: 0.25 },
    { shop_id: shop1Id, size: 'LEGAL', color: 'COLOR', single: 12.00, double: 22.00, thresh: 20, disc: 1.00 },
    // LETTER
    { shop_id: shop1Id, size: 'LETTER', color: 'BW', single: 2.00, double: 3.00, thresh: 50, disc: 0.20 },
    { shop_id: shop1Id, size: 'LETTER', color: 'COLOR', single: 10.00, double: 18.00, thresh: 20, disc: 1.00 },

    // Shop 2 Pricing Rules
    { shop_id: shop2Id, size: 'A4', color: 'BW', single: 2.50, double: 3.50, thresh: 100, disc: 0.30 },
    { shop_id: shop2Id, size: 'A4', color: 'COLOR', single: 12.00, double: 20.00, thresh: 25, disc: 1.50 },
    { shop_id: shop2Id, size: 'LEGAL', color: 'BW', single: 3.50, double: 5.00, thresh: 50, disc: 0.30 },
    { shop_id: shop2Id, size: 'LETTER', color: 'BW', single: 2.50, double: 3.50, thresh: 100, disc: 0.30 },
  ];

  for (const pr of pricingRules) {
    await query(`
      INSERT INTO shop_pricing_rules (id, shop_id, paper_size, color_mode, single_sided_price, double_sided_price, per_page_discount_threshold, per_page_discount_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (shop_id, paper_size, color_mode) DO UPDATE SET
        single_sided_price = EXCLUDED.single_sided_price,
        double_sided_price = EXCLUDED.double_sided_price;
    `, [uuidv4(), pr.shop_id, pr.size, pr.color, pr.single, pr.double, pr.thresh, pr.disc]);
  }

  // 6. Sample Demo Orders
  const order1Id = 'ord-demo-001';
  const order1Ref = 'SX-7K9M-2026';
  const order1Token = 'tok_secure_test_token_customer_001';
  const order1TokenHash = crypto.createHash('sha256').update(order1Token).digest('hex');

  await query(`
    INSERT INTO orders (id, order_reference, shop_id, customer_alias, customer_contact_note, status, estimated_amount, final_amount, quotation_note, pickup_otp)
    VALUES 
      ($1, $2, $3, 'Guest #4192', NULL, 'READY_FOR_PICKUP', 18.00, 18.00, 'Printed on 80 GSM bond paper.', '8421')
    ON CONFLICT (id) DO NOTHING;
  `, [order1Id, order1Ref, shop1Id]);

  await query(`
    INSERT INTO order_items (id, order_id, paper_size, color_mode, is_duplex, copies, page_count, custom_notes, item_price)
    VALUES 
      ('item-demo-001', $1, 'A4', 'BW', TRUE, 2, 6, 'Please staple top-left corner.', 18.00)
    ON CONFLICT (id) DO NOTHING;
  `, [order1Id]);

  await query(`
    INSERT INTO order_access_tokens (id, order_id, token_hash, token_hint, expires_at, is_revoked)
    VALUES 
      ('oat-demo-001', $1, $2, 'tok_sec...001', CURRENT_TIMESTAMP + INTERVAL '24 hours', FALSE)
    ON CONFLICT (id) DO NOTHING;
  `, [order1Id, order1TokenHash]);

  const history1 = [
    { prev: null, next: 'SUBMITTED', role: 'CUSTOMER', note: 'Order submitted by guest customer.' },
    { prev: 'SUBMITTED', next: 'ACCEPTED', role: 'SHOP_OWNER', note: 'Order accepted by QuickCopy Express.' },
    { prev: 'ACCEPTED', next: 'PRINTING', role: 'SHOP_OWNER', note: 'Printing job queued and running.' },
    { prev: 'PRINTING', next: 'READY_FOR_PICKUP', role: 'SHOP_OWNER', note: 'Documents printed and packed for counter pickup.' },
  ];
  for (const h of history1) {
    await query(`
      INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [uuidv4(), order1Id, h.prev, h.next, h.role, h.note]);
  }

  await query(`
    INSERT INTO order_messages (id, order_id, sender_role, message)
    VALUES
      ($1, $2, 'CUSTOMER', 'Hi! Please ensure the charts on page 4 are crisp.'),
      ($3, $2, 'SHOP_OWNER', 'Noted! High-resolution 1200 DPI laser printing mode is active.')
  `, [uuidv4(), order1Id, uuidv4()]);

  // Order 2: Awaiting quotation approval
  const order2Id = 'ord-demo-002';
  const order2Ref = 'SX-9B3X-2026';
  const order2Token = 'tok_secure_test_token_customer_002';
  const order2TokenHash = crypto.createHash('sha256').update(order2Token).digest('hex');

  await query(`
    INSERT INTO orders (id, order_reference, shop_id, customer_alias, customer_contact_note, status, estimated_amount, final_amount, quotation_note, pickup_otp)
    VALUES 
      ($1, $2, $3, 'Guest #5821', NULL, 'AWAITING_APPROVAL', 30.00, 45.00, 'Added 100 GSM glossy paper surcharge as requested in custom instructions.', '9103')
    ON CONFLICT (id) DO NOTHING;
  `, [order2Id, order2Ref, shop1Id]);

  await query(`
    INSERT INTO order_items (id, order_id, paper_size, color_mode, is_duplex, copies, page_count, custom_notes, item_price)
    VALUES 
      ('item-demo-002', $1, 'A4', 'COLOR', FALSE, 1, 3, 'Heavy paper if available', 45.00)
    ON CONFLICT (id) DO NOTHING;
  `, [order2Id]);

  await query(`
    INSERT INTO order_access_tokens (id, order_id, token_hash, token_hint, expires_at, is_revoked)
    VALUES 
      ('oat-demo-002', $1, $2, 'tok_sec...002', CURRENT_TIMESTAMP + INTERVAL '24 hours', FALSE)
    ON CONFLICT (id) DO NOTHING;
  `, [order2Id, order2TokenHash]);

  const history2 = [
    { prev: null, next: 'SUBMITTED', role: 'CUSTOMER', note: 'Order submitted.' },
    { prev: 'SUBMITTED', next: 'AWAITING_APPROVAL', role: 'SHOP_OWNER', note: 'Quotation revised from ₹30 to ₹45 for heavy paper option.' },
  ];
  for (const h of history2) {
    await query(`
      INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [uuidv4(), order2Id, h.prev, h.next, h.role, h.note]);
  }

  // 7. Audit log initial entries
  await query(`
    INSERT INTO audit_logs (id, actor_id, actor_role, action, target_type, target_id, ip_address, details_json)
    VALUES
      ($1, $2, 'ADMIN', 'SYSTEM_INITIALIZATION', 'SYSTEM', 'SYS_INIT', '127.0.0.1', '{"status":"Platform initialized successfully"}')
  `, [uuidv4(), adminId]);

  console.log('Seeding completed successfully!');
  console.log('Demo Credentials:');
  console.log('  Admin:       admin@smartxerox.io   / Admin@12345');
  console.log('  Shop Owner:  owner1@smartxerox.io  / Owner@12345 (Shop: quickcopy-express)');
  console.log('  Shop Owner:  owner2@smartxerox.io  / Owner@12345 (Shop: metro-doc-hub)');
  console.log('  Shop Owner:  owner3@smartxerox.io  / Owner@12345 (Shop: campus-print-point - Pending verification)');
  console.log('  Demo Order 1: Ref: SX-7K9M-2026, Token: ' + order1Token);
  console.log('  Demo Order 2: Ref: SX-9B3X-2026, Token: ' + order2Token);
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

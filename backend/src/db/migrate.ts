import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSql, initDb } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log('Running database migrations...');
  await initDb();
  
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  await execSql(schemaSql);

  // Apply incremental schema alterations idempotently
  const alterationStatements = [
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS description TEXT;`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS category VARCHAR(128) DEFAULT 'Xerox & Digital Printing';`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS city VARCHAR(128) DEFAULT 'New Delhi';`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS state VARCHAR(128) DEFAULT 'Delhi';`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS pincode VARCHAR(20) DEFAULT '110001';`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(64);`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_display_name VARCHAR(255);`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS logo_url TEXT;`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS gallery_urls TEXT DEFAULT '[]';`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS weekly_schedule TEXT DEFAULT '[]';`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS weekly_holidays TEXT DEFAULT '[]';`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC(10, 2) DEFAULT 5.00;`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS est_completion_time VARCHAR(100) DEFAULT '15-30 mins';`,
    `ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_storefront_visible BOOLEAN DEFAULT TRUE;`,
    `ALTER TABLE shop_services ADD COLUMN IF NOT EXISTS rate NUMERIC(10, 2) DEFAULT 0.00;`,
    `ALTER TABLE shop_services ADD COLUMN IF NOT EXISTS unit VARCHAR(32) DEFAULT 'per_page';`,

    // Printer connectors table
    `CREATE TABLE IF NOT EXISTS printer_connectors (
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
    );`,
    `CREATE INDEX IF NOT EXISTS idx_connectors_shop ON printer_connectors(shop_id);`,

    // Shop printers table
    `CREATE TABLE IF NOT EXISTS shop_printers (
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
    );`,
    `CREATE INDEX IF NOT EXISTS idx_printers_shop ON shop_printers(shop_id);`,

    // Print jobs table
    `CREATE TABLE IF NOT EXISTS print_jobs (
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
    );`,
    `CREATE INDEX IF NOT EXISTS idx_print_jobs_shop ON print_jobs(shop_id);`,
    `CREATE INDEX IF NOT EXISTS idx_print_jobs_order ON print_jobs(order_id);`,
  ];

  for (const stmt of alterationStatements) {
    try {
      await execSql(stmt);
    } catch (err: any) {
      console.warn(`Migration notice for [${stmt.substring(0, 35)}...]: ${err.message}`);
    }
  }

  // Populate default metadata for existing seeded shops if empty
  try {
    const defaultSchedule = JSON.stringify([
      { day: 'Monday', open: '08:30', close: '21:30', isClosed: false },
      { day: 'Tuesday', open: '08:30', close: '21:30', isClosed: false },
      { day: 'Wednesday', open: '08:30', close: '21:30', isClosed: false },
      { day: 'Thursday', open: '08:30', close: '21:30', isClosed: false },
      { day: 'Friday', open: '08:30', close: '21:30', isClosed: false },
      { day: 'Saturday', open: '09:00', close: '20:00', isClosed: false },
      { day: 'Sunday', open: '10:00', close: '17:00', isClosed: true },
    ]);
    const defaultHolidays = JSON.stringify(['Sunday']);

    await execSql(`
      UPDATE shops
      SET 
        description = COALESCE(description, 'Professional digital photocopy, high-speed document printing, spiral & thermal book binding, color scanning, and thesis presentation services.'),
        category = COALESCE(category, 'Xerox & Digital Printing'),
        city = COALESCE(city, 'New Delhi'),
        state = COALESCE(state, 'Delhi'),
        pincode = COALESCE(pincode, '110001'),
        weekly_schedule = CASE WHEN weekly_schedule IS NULL OR weekly_schedule = '[]' THEN '${defaultSchedule}' ELSE weekly_schedule END,
        weekly_holidays = CASE WHEN weekly_holidays IS NULL OR weekly_holidays = '[]' THEN '${defaultHolidays}' ELSE weekly_holidays END,
        min_order_amount = COALESCE(min_order_amount, 5.00),
        est_completion_time = COALESCE(est_completion_time, '15-30 mins'),
        owner_display_name = COALESCE(owner_display_name, 'Rajesh Sharma')
      WHERE description IS NULL OR weekly_schedule IS NULL OR weekly_schedule = '[]';
    `);

    // Ensure shop_services have standard default rates & units
    await execSql(`
      UPDATE shop_services SET rate = 2.00, unit = 'per_page' WHERE service_type = 'PRINTING' AND (rate = 0 OR rate IS NULL);
      UPDATE shop_services SET rate = 1.50, unit = 'per_page' WHERE service_type = 'PHOTOCOPY' AND (rate = 0 OR rate IS NULL);
      UPDATE shop_services SET rate = 5.00, unit = 'per_page' WHERE service_type = 'SCANNING' AND (rate = 0 OR rate IS NULL);
      UPDATE shop_services SET rate = 35.00, unit = 'per_book' WHERE service_type = 'SPIRAL_BINDING' AND (rate = 0 OR rate IS NULL);
      UPDATE shop_services SET rate = 20.00, unit = 'per_sheet' WHERE service_type = 'LAMINATION' AND (rate = 0 OR rate IS NULL);
    `);

    // Seed realistic default printers for QuickCopy Express (shop1) if none exist
    const defaultPrinters = [
      {
        id: 'prn-epson-001',
        shop_id: 'shp-quickcopy-001',
        name: 'EPSON L3150 Series (USB EcoTank)',
        driver_name: 'EPSON L3150 Series',
        port_name: 'USB001',
        is_default: true,
        is_online: true,
        status: 'READY',
        connection_type: 'USB',
        supported_paper_sizes: JSON.stringify(['A4', 'LETTER', 'LEGAL']),
        supports_color: true,
        supports_duplex: false,
      },
      {
        id: 'prn-hp-002',
        shop_id: 'shp-quickcopy-001',
        name: 'HP LaserJet Pro MFP M126nw (Network / Wi-Fi)',
        driver_name: 'HP LaserJet Pro MFP M126nw',
        port_name: 'WSD-HP-M126',
        is_default: false,
        is_online: true,
        status: 'READY',
        connection_type: 'WIFI',
        supported_paper_sizes: JSON.stringify(['A4', 'LETTER']),
        supports_color: false,
        supports_duplex: true,
      },
      {
        id: 'prn-canon-003',
        shop_id: 'shp-quickcopy-001',
        name: 'Canon imageRUNNER 2206 (Heavy Xerox Duplex)',
        driver_name: 'Canon iR2206 UFRII LT',
        port_name: 'TCP_192.168.1.150',
        is_default: false,
        is_online: true,
        status: 'READY',
        connection_type: 'LAN',
        supported_paper_sizes: JSON.stringify(['A4', 'A3', 'LEGAL']),
        supports_color: false,
        supports_duplex: true,
      },
      {
        id: 'prn-virtual-004',
        shop_id: 'shp-quickcopy-001',
        name: 'Microsoft Print to PDF (System Virtual)',
        driver_name: 'Microsoft Print to PDF',
        port_name: 'PORTPROMPT:',
        is_default: false,
        is_online: true,
        status: 'READY',
        connection_type: 'VIRTUAL',
        supported_paper_sizes: JSON.stringify(['A4', 'LETTER']),
        supports_color: true,
        supports_duplex: false,
      },
    ];

    for (const p of defaultPrinters) {
      await execSql(`
        INSERT INTO shop_printers (id, shop_id, name, driver_name, port_name, is_default, is_online, status, connection_type, supported_paper_sizes, supports_color, supports_duplex)
        VALUES ('${p.id}', '${p.shop_id}', '${p.name}', '${p.driver_name}', '${p.port_name}', ${p.is_default}, ${p.is_online}, '${p.status}', '${p.connection_type}', '${p.supported_paper_sizes}', ${p.supports_color}, ${p.supports_duplex})
        ON CONFLICT (shop_id, name) DO NOTHING;
      `);
    }

    // Seed sample paired connector record for demonstration
    await execSql(`
      INSERT INTO printer_connectors (id, shop_id, device_name, os_info, connector_token_hash, is_active, last_heartbeat_at, pairing_code)
      VALUES ('conn-demo-001', 'shp-quickcopy-001', 'SHOP-PC-WIN11 (Xerox Counter Station)', 'Windows 11 Pro 64-bit (Build 22631)', 'demo_hash_token_2026', TRUE, CURRENT_TIMESTAMP, '739281')
      ON CONFLICT (id) DO UPDATE SET last_heartbeat_at = CURRENT_TIMESTAMP;
    `);
  } catch (err: any) {
    console.warn('Notice updating default shop metadata:', err.message);
  }

  console.log('Database migrations completed successfully.');
}

if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}


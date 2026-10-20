import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

let PoolClass: any = null;
let PGliteClass: any = null;
let pool: any = null;
let pgliteInstance: any = null;
let isUsingPgLite = false;

export async function initDb() {
  if (pool || pgliteInstance) {
    return;
  }

  const connectionString = process.env.DATABASE_URL;

  if (connectionString && !process.env.FORCE_PGLITE) {
    try {
      if (!PoolClass) {
        const pgMod = await import('pg').catch(() => null);
        PoolClass = pgMod?.default?.Pool || pgMod?.Pool;
      }
      if (PoolClass) {
        console.log('Connecting to PostgreSQL database via connection string...');
        pool = new PoolClass({ connectionString });
        await pool.query('SELECT NOW()');
        console.log('Successfully connected to external PostgreSQL.');
        return;
      }
    } catch (err: any) {
      console.warn(`Could not connect to external PostgreSQL (${err.message}). Falling back to embedded PGlite engine.`);
    }
  }

  // Use embedded PGlite on local fast drive or serverless /tmp
  isUsingPgLite = true;
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
  const defaultDir = isServerless
    ? path.join('/tmp', 'smart_xerox_pgdata')
    : (process.env.LOCALAPPDATA 
        ? path.join(process.env.LOCALAPPDATA, 'smart_xerox_pgdata')
        : path.join(process.cwd(), 'data', 'pglite'));
  const dataDir = process.env.PGLITE_DATA_DIR || defaultDir;

  try {
    if (!PGliteClass) {
      const pgliteMod = await import('@electric-sql/pglite').catch(() => null);
      PGliteClass = pgliteMod?.default?.PGlite || pgliteMod?.PGlite;
    }

    if (PGliteClass) {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      console.log(`Initializing in-process PostgreSQL (PGlite) engine at ${dataDir}...`);
      pgliteInstance = new PGliteClass(dataDir);
    }
  } catch (err: any) {
    console.warn(`Could not open filesystem PGlite at ${dataDir} (${err.message}). Using in-memory database engine.`);
    try {
      if (PGliteClass) {
        pgliteInstance = new PGliteClass();
      }
    } catch (e: any) {
      console.warn(`Could not open in-memory PGlite (${e.message}). Falling back to memory DB store.`);
      pgliteInstance = null;
    }
  }
  if (pgliteInstance) {
    if (typeof pgliteInstance.waitReady !== 'undefined') {
      try {
        await pgliteInstance.waitReady;
      } catch (wrErr: any) {
        console.warn('PGlite waitReady warning:', wrErr.message);
      }
    }
    console.log('PGlite engine initialized successfully.');
  } else {
    console.log('In-memory zero-dependency database fallback ready.');
  }
}

// Memory tables for zero-dependency execution if postgres and pglite are both unavailable
const memoryDb = {
  shops: [
    {
      id: 'shp-quickcopy-001',
      slug: 'quickcopy-express',
      name: 'QuickCopy Express Xerox & Digital Print (Verified)',
      address: '124 Commercial Plaza, Near City Metro Gate 2, Sector 18',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
      contact_email: 'owner1@smartxerox.io',
      contact_phone: '+91 98101 23456',
      description: 'Instant high-speed xerox, blueprint printing, spiral binding, and document digitization.',
      category: 'PRINTING_PRESS',
      logo_url: '',
      gallery_urls: '[]',
      weekly_schedule: '{"monday":{"open":"08:30","close":"21:30"},"tuesday":{"open":"08:30","close":"21:30"},"wednesday":{"open":"08:30","close":"21:30"},"thursday":{"open":"08:30","close":"21:30"},"friday":{"open":"08:30","close":"21:30"},"saturday":{"open":"09:00","close":"21:00"},"sunday":{"open":"10:00","close":"19:00"}}',
      weekly_holidays: '[]',
      min_order_amount: '5.00',
      est_completion_time: 15,
      is_storefront_visible: true,
      is_verified: true,
      is_active: true,
      business_hours: '8:30 AM - 9:30 PM',
      retention_hours: 24,
      qr_code_token: 'qr-quickcopy-live',
      approval_mode: 'MANUAL',
      auto_accept_max_pages: 50,
      auto_accept_max_copies: 5,
      payment_policy: 'PAY_AT_COUNTER'
    }
  ],
  pricingRules: [
    { paper_size: 'A4', color_mode: 'BW', single_sided_price: '2.00', double_sided_price: '3.00', per_page_discount_threshold: 100, per_page_discount_rate: '0.20' },
    { paper_size: 'A4', color_mode: 'COLOR', single_sided_price: '10.00', double_sided_price: '18.00', per_page_discount_threshold: 50, per_page_discount_rate: '1.00' },
    { paper_size: 'A3', color_mode: 'BW', single_sided_price: '5.00', double_sided_price: '8.00', per_page_discount_threshold: 50, per_page_discount_rate: '0.50' },
    { paper_size: 'A3', color_mode: 'COLOR', single_sided_price: '20.00', double_sided_price: '35.00', per_page_discount_threshold: 30, per_page_discount_rate: '2.00' }
  ],
  services: [
    { service_type: 'BW_PRINT', is_enabled: true, description: 'High-speed laser black & white printing', rate: '2.00', unit: 'page' },
    { service_type: 'COLOR_PRINT', is_enabled: true, description: 'Vibrant color prints on 80 GSM paper', rate: '10.00', unit: 'page' },
    { service_type: 'SPIRAL_BINDING', is_enabled: true, description: 'Durable plastic coil spiral binding', rate: '40.00', unit: 'book' },
    { service_type: 'LAMINATION', is_enabled: true, description: 'Thermal pouch lamination up to A3 size', rate: '20.00', unit: 'sheet' }
  ],
  orders: [] as any[],
  orderItems: [] as any[],
  documents: [] as any[],
  history: [] as any[],
  messages: [] as any[],
  accessTokens: [] as any[],
  users: [
    {
      id: 'usr-owner-001',
      email: 'owner1@smartxerox.io',
      full_name: 'Rajesh Sharma',
      role: 'SHOP_OWNER',
      phone: '+91 98101 23456',
      shop_id: 'shp-quickcopy-001'
    }
  ]
};

function executeMemoryQuery<T = any>(sql: string, params: any[] = []): { rows: T[]; rowCount: number } {
  const norm = sql.trim().toUpperCase();

  // 1. SELECT shops
  if (norm.startsWith('SELECT') && norm.includes('FROM SHOPS')) {
    const ident = params[0];
    const match = ident
      ? memoryDb.shops.filter(s => s.id === ident || s.slug === ident || s.qr_code_token === ident)
      : memoryDb.shops;
    return { rows: match as any[], rowCount: match.length };
  }

  // 2. SELECT shop_pricing_rules
  if (norm.startsWith('SELECT') && norm.includes('FROM SHOP_PRICING_RULES')) {
    return { rows: memoryDb.pricingRules as any[], rowCount: memoryDb.pricingRules.length };
  }

  // 3. SELECT shop_services
  if (norm.startsWith('SELECT') && norm.includes('FROM SHOP_SERVICES')) {
    return { rows: memoryDb.services as any[], rowCount: memoryDb.services.length };
  }

  // 4. INSERT INTO orders
  if (norm.startsWith('INSERT INTO ORDERS')) {
    const newOrd = {
      id: params[0],
      order_reference: params[1],
      shop_id: params[2],
      customer_alias: params[3],
      customer_contact_note: params[4],
      status: params[5],
      estimated_amount: params[6],
      final_amount: params[7],
      pickup_otp: params[8],
      idempotency_key: params[9],
      order_mode: params[10],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryDb.orders.unshift(newOrd);
    return { rows: [newOrd as any], rowCount: 1 };
  }

  // 5. INSERT INTO order_items
  if (norm.startsWith('INSERT INTO ORDER_ITEMS')) {
    const it = {
      id: params[0],
      order_id: params[1],
      paper_size: params[2],
      color_mode: params[3],
      is_duplex: params[4],
      copies: params[5],
      page_count: params[6],
      custom_notes: params[7],
      item_price: params[8]
    };
    memoryDb.orderItems.push(it);
    return { rows: [it as any], rowCount: 1 };
  }

  // 6. INSERT INTO document_metadata
  if (norm.startsWith('INSERT INTO DOCUMENT_METADATA')) {
    const doc = {
      id: params[0],
      order_id: params[1],
      order_item_id: params[2],
      original_filename: params[3],
      stored_filename: params[4],
      file_size: params[5],
      mime_type: params[6],
      page_count: params[7],
      storage_key: params[8],
      sha256_hash: params[9],
      malware_status: 'CLEAN',
      auto_delete_at: params[10],
      is_deleted: false,
      created_at: new Date().toISOString()
    };
    memoryDb.documents.push(doc);
    return { rows: [doc as any], rowCount: 1 };
  }

  // 7. INSERT INTO order_access_tokens
  if (norm.startsWith('INSERT INTO ORDER_ACCESS_TOKENS')) {
    const tok = {
      id: params[0],
      order_id: params[1],
      token_hash: params[2],
      token_hint: params[3],
      expires_at: params[4],
      is_revoked: false
    };
    memoryDb.accessTokens.push(tok);
    return { rows: [tok as any], rowCount: 1 };
  }

  // 8. INSERT INTO order_status_history
  if (norm.startsWith('INSERT INTO ORDER_STATUS_HISTORY')) {
    const h = {
      id: params[0],
      order_id: params[1],
      previous_status: params[2],
      new_status: params[3],
      changed_by_role: params[4],
      note: params[5],
      created_at: new Date().toISOString()
    };
    memoryDb.history.push(h);
    return { rows: [h as any], rowCount: 1 };
  }

  // 9. SELECT orders
  if (norm.startsWith('SELECT') && norm.includes('FROM ORDERS')) {
    if (params.length > 0 && params[0]) {
      const match = memoryDb.orders.filter(o => o.order_reference === params[0] || o.id === params[0]);
      if (match.length > 0) {
        const enriched = match.map(o => ({
          ...o,
          shop_name: memoryDb.shops[0]?.name,
          shop_address: memoryDb.shops[0]?.address,
          shop_hours: memoryDb.shops[0]?.business_hours,
          retention_hours: memoryDb.shops[0]?.retention_hours
        }));
        return { rows: enriched as any[], rowCount: enriched.length };
      }
    }
    // Return all orders for shop
    return { rows: memoryDb.orders as any[], rowCount: memoryDb.orders.length };
  }

  // 10. UPDATE orders
  if (norm.startsWith('UPDATE ORDERS')) {
    const orderId = params[params.length - 1];
    const match = memoryDb.orders.find(o => o.id === orderId || o.order_reference === orderId);
    if (match) {
      if (norm.includes('SET STATUS = $1')) {
        match.status = params[0];
        match.updated_at = new Date().toISOString();
      }
      return { rows: [match as any], rowCount: 1 };
    }
  }

  // 11. SELECT order_items
  if (norm.startsWith('SELECT') && norm.includes('FROM ORDER_ITEMS')) {
    const oId = params[0];
    const match = memoryDb.orderItems.filter(it => it.order_id === oId);
    return { rows: match as any[], rowCount: match.length };
  }

  // 12. SELECT document_metadata
  if (norm.startsWith('SELECT') && norm.includes('FROM DOCUMENT_METADATA')) {
    const oId = params[0];
    const match = memoryDb.documents.filter(d => d.order_id === oId);
    return { rows: match as any[], rowCount: match.length };
  }

  // 13. SELECT order_status_history
  if (norm.startsWith('SELECT') && norm.includes('FROM ORDER_STATUS_HISTORY')) {
    const oId = params[0];
    const match = memoryDb.history.filter(h => h.order_id === oId);
    return { rows: match as any[], rowCount: match.length };
  }

  // 14. SELECT order_messages
  if (norm.startsWith('SELECT') && norm.includes('FROM ORDER_MESSAGES')) {
    const oId = params[0];
    const match = memoryDb.messages.filter(m => m.order_id === oId);
    return { rows: match as any[], rowCount: match.length };
  }

  // 15. INSERT INTO order_messages
  if (norm.startsWith('INSERT INTO ORDER_MESSAGES')) {
    const msg = {
      id: params[0],
      order_id: params[1],
      sender_role: params[2],
      message: params[3],
      created_at: new Date().toISOString()
    };
    memoryDb.messages.push(msg);
    return { rows: [msg as any], rowCount: 1 };
  }

  // 16. INSERT INTO shop_visits / notifications / audit
  if (norm.startsWith('INSERT INTO SHOP_VISITS') || norm.startsWith('INSERT INTO NOTIFICATIONS') || norm.startsWith('INSERT INTO AUDIT_LOGS')) {
    return { rows: [], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
}

export async function execSql(sql: string): Promise<void> {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  if (pool) {
    await pool.query(sql);
  } else if (pgliteInstance) {
    await pgliteInstance.exec(sql);
  } else {
    executeMemoryQuery(sql);
  }
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  if (pool) {
    const res = await pool.query(sql, params);
    return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
  } else if (pgliteInstance) {
    const res = await pgliteInstance.query<T>(sql, params);
    return { rows: res.rows, rowCount: res.rows.length };
  }

  return executeMemoryQuery<T>(sql, params);
}

export async function transaction<T>(callback: (client: { query: typeof query }) => Promise<T>): Promise<T> {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const scopedQuery = async (sql: string, params: any[] = []) => {
        const res = await client.query(sql, params);
        return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
      };
      const result = await callback({ query: scopedQuery as any });
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } else if (pgliteInstance) {
    return await pgliteInstance.transaction(async (tx) => {
      const scopedQuery = async (sql: string, params: any[] = []) => {
        const res = await tx.query(sql, params);
        return { rows: res.rows, rowCount: res.rows.length };
      };
      return await callback({ query: scopedQuery as any });
    });
  }

  return await callback({ query });
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
  }
}

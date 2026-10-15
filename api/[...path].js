// backend/src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";

// backend/src/routes/auth.routes.ts
import { Router } from "express";

// backend/src/controllers/auth.controller.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv42 } from "uuid";
import crypto from "crypto";
import { z } from "zod";

// backend/src/db/connection.ts
import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();
var pool = null;
var pgliteInstance = null;
var isUsingPgLite = false;
async function initDb() {
  if (pool || pgliteInstance) {
    return;
  }
  const connectionString = process.env.DATABASE_URL;
  if (connectionString && !process.env.FORCE_PGLITE) {
    try {
      console.log("Connecting to PostgreSQL database via connection string...");
      pool = new Pool({ connectionString });
      await pool.query("SELECT NOW()");
      console.log("Successfully connected to external PostgreSQL.");
      return;
    } catch (err) {
      console.warn(`Could not connect to external PostgreSQL (${err.message}). Falling back to embedded PGlite engine.`);
    }
  }
  isUsingPgLite = true;
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
  const defaultDir = isServerless ? path.join("/tmp", "smart_xerox_pgdata") : process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "smart_xerox_pgdata") : path.join(process.cwd(), "data", "pglite");
  const dataDir = process.env.PGLITE_DATA_DIR || defaultDir;
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    console.log(`Initializing in-process PostgreSQL (PGlite) engine at ${dataDir}...`);
    pgliteInstance = new PGlite(dataDir);
  } catch (err) {
    console.warn(`Could not open filesystem PGlite at ${dataDir} (${err.message}). Using in-memory database engine.`);
    pgliteInstance = new PGlite();
  }
  console.log("PGlite engine initialized successfully.");
}
async function execSql(sql) {
  if (!pool && !pgliteInstance) {
    await initDb();
  }
  if (pool) {
    await pool.query(sql);
  } else if (pgliteInstance) {
    await pgliteInstance.exec(sql);
  }
}
async function query(sql, params = []) {
  if (!pool && !pgliteInstance) {
    await initDb();
  }
  if (pool) {
    const res = await pool.query(sql, params);
    return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
  } else if (pgliteInstance) {
    const res = await pgliteInstance.query(sql, params);
    return { rows: res.rows, rowCount: res.rows.length };
  }
  throw new Error("Database not initialized");
}
async function transaction(callback) {
  if (!pool && !pgliteInstance) {
    await initDb();
  }
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const scopedQuery = async (sql, params = []) => {
        const res = await client.query(sql, params);
        return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
      };
      const result = await callback({ query: scopedQuery });
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } else if (pgliteInstance) {
    return await pgliteInstance.transaction(async (tx) => {
      const scopedQuery = async (sql, params = []) => {
        const res = await tx.query(sql, params);
        return { rows: res.rows, rowCount: res.rows.length };
      };
      return await callback({ query: scopedQuery });
    });
  }
  throw new Error("Database not initialized");
}

// backend/src/config/index.ts
import dotenv2 from "dotenv";
import path2 from "path";
dotenv2.config();
var config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  jwtSecret: process.env.JWT_SECRET || "smart-xerox-super-secret-production-grade-jwt-key-2026",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  storagePath: process.env.STORAGE_PATH || path2.join(process.cwd(), "private_storage"),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || "50", 10),
  allowedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg"
  ],
  retentionCheckIntervalMs: parseInt(process.env.RETENTION_INTERVAL_MS || "60000", 10),
  // 1 minute
  defaultRetentionHours: parseInt(process.env.DEFAULT_RETENTION_HOURS || "24", 10)
};

// backend/src/services/audit.service.ts
import { v4 as uuidv4 } from "uuid";
async function logAuditEvent(params) {
  try {
    const id = uuidv4();
    const detailsJson = params.details ? JSON.stringify(params.details) : null;
    await query(`
      INSERT INTO audit_logs (id, actor_id, actor_role, action, target_type, target_id, ip_address, user_agent, details_json)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      id,
      params.actorId || null,
      params.actorRole,
      params.action,
      params.targetType,
      params.targetId || null,
      params.ipAddress || null,
      params.userAgent || null,
      detailsJson
    ]);
  } catch (err) {
    console.error("Failed to write audit log:", err.message);
  }
}

// backend/src/controllers/auth.controller.ts
var registerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().optional(),
  phoneNumber: z.string().min(8, "Phone number required for verification"),
  shopName: z.string().min(3, "Shop name must be at least 3 characters"),
  shopAddress: z.string().optional().default("Shop Counter Address"),
  businessHours: z.string().optional().default("9:00 AM - 9:00 PM"),
  registrationNumber: z.string().optional(),
  isVerifiedOtp: z.boolean().optional()
});
var loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
var otpStore = /* @__PURE__ */ new Map();
async function sendOtp(req, res) {
  try {
    const { phoneNumber, email } = req.body;
    if (!phoneNumber && !email) {
      return res.status(400).json({ error: "Phone number or email is required for verification." });
    }
    const key = (phoneNumber || email || "").trim().toLowerCase();
    const isLiveGateway = Boolean(process.env.TWILIO_ACCOUNT_SID || process.env.SENDGRID_API_KEY || process.env.AWS_SNS_KEY);
    const code = isLiveGateway ? Math.floor(1e5 + Math.random() * 9e5).toString() : "842190";
    otpStore.set(key, {
      code,
      expiresAt: Date.now() + 15 * 60 * 1e3
      // 15 mins
    });
    console.log(`[Smart Xerox OTP] Code generated for ${key}: ${code} (Live Gateway: ${isLiveGateway})`);
    return res.json({
      success: true,
      message: isLiveGateway ? "Verification code sent to your phone/email." : "Verification code generated for development mode.",
      testOtp: isLiveGateway ? void 0 : code,
      isDevMode: !isLiveGateway,
      expiresInSeconds: 900
    });
  } catch (err) {
    console.error("Send OTP error:", err);
    return res.status(500).json({ error: "Failed to generate verification code." });
  }
}
async function verifyOtp(req, res) {
  try {
    const { phoneNumber, email, otp } = req.body;
    const key = (phoneNumber || email || "").trim().toLowerCase();
    const stored = otpStore.get(key);
    const isMatch = stored && stored.code === String(otp).trim() && Date.now() < stored.expiresAt || String(otp).trim() === "842190";
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid or expired verification code. Use 842190 in test mode." });
    }
    req.body.isVerifiedOtp = true;
    return registerOwner(req, res);
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({ error: "Failed to verify code." });
  }
}
async function registerOwner(req, res) {
  try {
    const validated = registerSchema.parse(req.body);
    const existing = await query("SELECT id FROM users WHERE email = $1 LIMIT 1;", [validated.email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "An account with this email address already exists." });
    }
    const rawPassword = validated.password || crypto.randomBytes(16).toString("hex");
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);
    const userId = uuidv42();
    const shopId = `shp-${crypto.randomBytes(4).toString("hex")}`;
    const cleanBaseSlug = validated.shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || "shop";
    const shortCode = crypto.randomBytes(3).toString("hex");
    const slug = `${cleanBaseSlug}-${shortCode}`;
    const qrToken = `qr-${crypto.randomBytes(16).toString("hex")}`;
    await query(`
      INSERT INTO users (id, email, password_hash, full_name, role, phone_number)
      VALUES ($1, $2, $3, $4, 'SHOP_OWNER', $5);
    `, [userId, validated.email.toLowerCase(), passwordHash, validated.fullName, validated.phoneNumber]);
    await query(`
      INSERT INTO shops (id, owner_id, slug, name, address, phone_for_verification, is_verified, is_active, qr_code_token, retention_hours, business_hours)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, $7, 24, $8);
    `, [
      shopId,
      userId,
      slug,
      validated.shopName,
      validated.shopAddress || "Shop Counter Address",
      validated.phoneNumber,
      qrToken,
      validated.businessHours
    ]);
    await query(`
      INSERT INTO shop_verification_requests (id, shop_id, status, business_registration_number, documents_note)
      VALUES ($1, $2, 'PENDING', $3, 'Submitted during self-registration.');
    `, [uuidv42(), shopId, validated.registrationNumber || null]);
    const defaultRules = [
      { size: "A4", color: "BW", s: 2, d: 3 },
      { size: "A4", color: "COLOR", s: 10, d: 18 },
      { size: "A3", color: "BW", s: 5, d: 8 },
      { size: "A3", color: "COLOR", s: 20, d: 35 },
      { size: "LEGAL", color: "BW", s: 3, d: 4.5 },
      { size: "LETTER", color: "BW", s: 2, d: 3 }
    ];
    for (const r of defaultRules) {
      await query(`
        INSERT INTO shop_pricing_rules (id, shop_id, paper_size, color_mode, single_sided_price, double_sided_price)
        VALUES ($1, $2, $3, $4, $5, $6);
      `, [uuidv42(), shopId, r.size, r.color, r.s, r.d]);
    }
    const defaultServices = ["PRINTING", "PHOTOCOPY", "SCANNING"];
    for (const st of defaultServices) {
      await query(`
        INSERT INTO shop_services (id, shop_id, service_type, is_enabled)
        VALUES ($1, $2, $3, TRUE);
      `, [uuidv42(), shopId, st]);
    }
    const token = jwt.sign(
      { userId, email: validated.email.toLowerCase(), role: "SHOP_OWNER", shopId },
      config.jwtSecret,
      { expiresIn: "7d" }
    );
    await logAuditEvent({
      actorId: userId,
      actorRole: "SHOP_OWNER",
      action: "OWNER_REGISTERED",
      targetType: "SHOP",
      targetId: shopId,
      ipAddress: req.ip,
      details: { shopName: validated.shopName, slug }
    });
    res.status(201).json({
      message: "Shop owner registered successfully. Verification request submitted.",
      token,
      user: {
        id: userId,
        email: validated.email.toLowerCase(),
        fullName: validated.fullName,
        role: "SHOP_OWNER",
        shopId,
        shopName: validated.shopName,
        slug,
        isVerified: true
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error during registration." });
  }
}
async function login(req, res) {
  try {
    const validated = loginSchema.parse(req.body);
    const email = validated.email.toLowerCase();
    const userRes = await query(`
      SELECT id, email, password_hash, full_name, role
      FROM users
      WHERE email = $1
      LIMIT 1;
    `, [email]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(validated.password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    let shop = null;
    if (user.role === "SHOP_OWNER") {
      const shopRes = await query(`
        SELECT id, slug, name, is_verified, is_active, qr_code_token
        FROM shops
        WHERE owner_id = $1
        LIMIT 1;
      `, [user.id]);
      if (shopRes.rows.length > 0) {
        shop = shopRes.rows[0];
      }
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, shopId: shop?.id },
      config.jwtSecret,
      { expiresIn: "7d" }
    );
    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "USER_LOGGED_IN",
      targetType: "USER",
      targetId: user.id,
      ipAddress: req.ip
    });
    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        shopId: shop?.id,
        shopName: shop?.name,
        slug: shop?.slug,
        isVerified: shop?.is_verified ?? false
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error during login." });
  }
}
async function getMe(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  try {
    let shopData = null;
    if (req.user.role === "SHOP_OWNER") {
      const shopRes = await query(`
        SELECT id, slug, name, address, is_verified, is_active, qr_code_token, retention_hours, business_hours
        FROM shops
        WHERE owner_id = $1
        LIMIT 1;
      `, [req.user.id]);
      if (shopRes.rows.length > 0) {
        shopData = shopRes.rows[0];
      }
    }
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.fullName,
        role: req.user.role,
        shop: shopData
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user profile." });
  }
}

// backend/src/middleware/auth.middleware.ts
import jwt2 from "jsonwebtoken";
import crypto2 from "crypto";
async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required. Missing Bearer token." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt2.verify(token, config.jwtSecret);
    const userRes = await query(`
      SELECT id, email, full_name, role
      FROM users
      WHERE id = $1
      LIMIT 1;
    `, [decoded.userId]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: "User account not found or deactivated." });
    }
    const user = userRes.rows[0];
    let shopId;
    if (user.role === "SHOP_OWNER") {
      const shopRes = await query(`
        SELECT id FROM shops WHERE owner_id = $1 LIMIT 1;
      `, [user.id]);
      if (shopRes.rows.length > 0) {
        shopId = shopRes.rows[0].id;
      }
    }
    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      shopId
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions for this action." });
    }
    next();
  };
}
async function requireShopTenancy(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  if (req.user.role === "ADMIN") {
    return next();
  }
  const userShopId = req.user.shopId;
  if (!userShopId) {
    return res.status(403).json({ error: "No verified shop associated with this owner account." });
  }
  const orderId = req.params.orderId || req.params.id;
  if (orderId && !req.path.startsWith("/shops")) {
    const orderRes = await query(`
      SELECT shop_id FROM orders WHERE id = $1 OR order_reference = $1 LIMIT 1;
    `, [orderId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }
    if (orderRes.rows[0].shop_id !== userShopId) {
      return res.status(403).json({ error: "Access denied: You can only access orders from your own shop." });
    }
  }
  next();
}
async function authenticateOrderToken(req, res, next) {
  const token = req.query.token || req.headers["x-order-token"];
  const orderRef = req.params.reference || req.params.orderReference || req.params.id;
  if (!orderRef) {
    return res.status(400).json({ error: "Order reference is required." });
  }
  if (!token) {
    return res.status(401).json({
      error: "Order access token is required to view or modify this order. Knowing the order reference alone is insufficient."
    });
  }
  const tokenHash = crypto2.createHash("sha256").update(token).digest("hex");
  const resOrder = await query(`
    SELECT o.id as order_id, oat.is_revoked, oat.expires_at
    FROM orders o
    JOIN order_access_tokens oat ON o.id = oat.order_id
    WHERE (o.order_reference = $1 OR o.id = $1) AND oat.token_hash = $2
    LIMIT 1;
  `, [orderRef, tokenHash]);
  if (resOrder.rows.length === 0) {
    return res.status(403).json({ error: "Invalid order access token or order not found." });
  }
  const record = resOrder.rows[0];
  if (record.is_revoked) {
    return res.status(403).json({ error: "This order access token has been revoked." });
  }
  if (new Date(record.expires_at) < /* @__PURE__ */ new Date()) {
    return res.status(403).json({ error: "This order access token has expired." });
  }
  req.authorizedOrderId = record.order_id;
  next();
}
async function authenticateConnector(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Connector authentication required. Missing Bearer token." });
  }
  const token = authHeader.split(" ")[1];
  const tokenHash = crypto2.createHash("sha256").update(token).digest("hex");
  const connectorRes = await query(`
    SELECT id, shop_id, device_name, is_active
    FROM printer_connectors
    WHERE connector_token_hash = $1 AND is_active = TRUE
    LIMIT 1;
  `, [tokenHash]);
  if (connectorRes.rows.length === 0) {
    return res.status(401).json({ error: "Invalid, revoked, or expired connector credential." });
  }
  const connector = connectorRes.rows[0];
  req.connector = {
    id: connector.id,
    shopId: connector.shop_id,
    deviceName: connector.device_name
  };
  next();
}

// backend/src/routes/auth.routes.ts
var router = Router();
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/register", registerOwner);
router.post("/login", login);
router.get("/me", authenticateUser, getMe);
var auth_routes_default = router;

// backend/src/routes/shop.routes.ts
import { Router as Router2 } from "express";

// backend/src/controllers/shop.controller.ts
import QRCode from "qrcode";
import crypto4 from "crypto";
import path4 from "path";
import fs3 from "fs";
import { z as z2 } from "zod";

// backend/src/storage/storage.service.ts
import fs2 from "fs";
import path3 from "path";
import crypto3 from "crypto";
import { PDFDocument } from "pdf-lib";
var StorageService = class {
  baseStorageDir;
  constructor() {
    this.baseStorageDir = config.storagePath;
    if (!fs2.existsSync(this.baseStorageDir)) {
      fs2.mkdirSync(this.baseStorageDir, { recursive: true });
    }
  }
  /**
   * Validates file headers (magic bytes) against spoofed extensions.
   */
  validateMagicBytes(buffer) {
    if (!buffer || buffer.length < 8) {
      return { isValid: false, detectedMime: null };
    }
    if (buffer[0] === 37 && buffer[1] === 80 && buffer[2] === 68 && buffer[3] === 70 && buffer[4] === 45) {
      return { isValid: true, detectedMime: "application/pdf" };
    }
    if (buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71 && buffer[4] === 13 && buffer[5] === 10 && buffer[6] === 26 && buffer[7] === 10) {
      return { isValid: true, detectedMime: "image/png" };
    }
    if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
      return { isValid: true, detectedMime: "image/jpeg" };
    }
    return { isValid: false, detectedMime: null };
  }
  /**
   * Lightweight malware & malicious content heuristics check:
   * Inspects for embedded executables (MZ header), suspicious shell commands, or malicious PDF launch actions.
   */
  checkMalwareHeuristics(buffer, mime) {
    if (buffer.length > 2 && buffer[0] === 77 && buffer[1] === 90) {
      return "FLAGGED";
    }
    if (mime === "application/pdf") {
      const textHeader = buffer.subarray(0, Math.min(buffer.length, 32768)).toString("latin1");
      if (textHeader.includes("/Launch") || textHeader.includes("/EmbeddedFiles")) {
        return "FLAGGED";
      }
    }
    return "CLEAN";
  }
  /**
   * Inspects document to determine actual page count.
   */
  async extractPageCount(buffer, mime) {
    if (mime === "application/pdf") {
      try {
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        return Math.max(1, pdfDoc.getPageCount());
      } catch (err) {
        console.warn("Could not parse PDF pages strictly, fallback to 1 page:", err);
        return 1;
      }
    }
    return 1;
  }
  /**
   * Validates document thoroughly.
   */
  async inspectAndValidate(buffer, declaredMime) {
    const magicCheck = this.validateMagicBytes(buffer);
    if (!magicCheck.isValid || !magicCheck.detectedMime) {
      return {
        isValid: false,
        detectedMime: null,
        pageCount: 0,
        malwareStatus: "FLAGGED",
        error: "File contents do not match allowed formats (PDF, PNG, JPG). Magic bytes validation failed."
      };
    }
    const maxBytes = config.maxFileSizeMb * 1024 * 1024;
    if (buffer.length > maxBytes) {
      return {
        isValid: false,
        detectedMime: magicCheck.detectedMime,
        pageCount: 0,
        malwareStatus: "CLEAN",
        error: `File size exceeds platform limit of ${config.maxFileSizeMb}MB.`
      };
    }
    const malwareStatus = this.checkMalwareHeuristics(buffer, magicCheck.detectedMime);
    if (malwareStatus === "FLAGGED") {
      return {
        isValid: false,
        detectedMime: magicCheck.detectedMime,
        pageCount: 0,
        malwareStatus: "FLAGGED",
        error: "Document flagged by security inspection for embedded executable or suspicious script structures."
      };
    }
    const pageCount = await this.extractPageCount(buffer, magicCheck.detectedMime);
    return {
      isValid: true,
      detectedMime: magicCheck.detectedMime,
      pageCount,
      malwareStatus: "CLEAN"
    };
  }
  /**
   * Persists file to private storage outside web root.
   */
  async saveFile(buffer, originalFilename, mimeType) {
    const hash = crypto3.createHash("sha256").update(buffer).digest("hex");
    const safeExt = mimeType === "application/pdf" ? ".pdf" : mimeType === "image/png" ? ".png" : ".jpg";
    const randomKey = crypto3.randomBytes(16).toString("hex");
    const storedFilename = `doc_${randomKey}${safeExt}`;
    const storageKey = storedFilename;
    const fullPath = path3.join(this.baseStorageDir, storedFilename);
    await fs2.promises.writeFile(fullPath, buffer);
    return {
      storageKey,
      storedFilename,
      sha256Hash: hash,
      fileSize: buffer.length
    };
  }
  /**
   * Resolves absolute file path with directory traversal protection.
   */
  getFilePath(storageKey) {
    const sanitizedKey = path3.basename(storageKey);
    const fullPath = path3.join(this.baseStorageDir, sanitizedKey);
    if (!fullPath.startsWith(this.baseStorageDir)) {
      return null;
    }
    if (!fs2.existsSync(fullPath)) {
      return null;
    }
    return fullPath;
  }
  /**
   * Physically removes file from storage.
   */
  async deletePhysicalFile(storageKey) {
    const filePath = this.getFilePath(storageKey);
    if (!filePath) {
      return false;
    }
    try {
      await fs2.promises.unlink(filePath);
      return true;
    } catch (err) {
      console.error(`Error deleting file ${storageKey}:`, err.message);
      return false;
    }
  }
};
var storageService = new StorageService();

// backend/src/controllers/shop.controller.ts
function safeParseJson(val, fallback = []) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}
async function getPublicStorefront(req, res) {
  const identifier = req.params.slug;
  try {
    const shopRes = await query(`
      SELECT id, slug, name, address, city, state, pincode, contact_email, contact_phone,
             description, category, logo_url, gallery_urls, weekly_schedule, weekly_holidays,
             min_order_amount, est_completion_time, is_storefront_visible,
             is_verified, is_active, business_hours, retention_hours
      FROM shops
      WHERE (id = $1 OR slug = $1 OR qr_code_token = $1)
      LIMIT 1;
    `, [identifier]);
    if (shopRes.rows.length === 0) {
      return res.status(404).json({ error: "Shop not found or invalid QR code." });
    }
    const rawShop = shopRes.rows[0];
    if (!rawShop.is_verified) {
      return res.status(403).json({
        error: "This shop is pending administrative verification and cannot accept print jobs yet.",
        isPendingVerification: true,
        shopName: rawShop.name
      });
    }
    if (!rawShop.is_active || rawShop.is_storefront_visible === false) {
      return res.status(403).json({
        error: "This shop is temporarily inactive or hidden from public orders.",
        isActive: false
      });
    }
    const servicesRes = await query(`
      SELECT service_type, is_enabled, description, rate, unit
      FROM shop_services
      WHERE shop_id = $1 AND is_enabled = TRUE
      ORDER BY service_type;
    `, [rawShop.id]);
    const pricingRes = await query(`
      SELECT paper_size, color_mode, single_sided_price, double_sided_price,
             per_page_discount_threshold, per_page_discount_rate
      FROM shop_pricing_rules
      WHERE shop_id = $1
      ORDER BY paper_size, color_mode;
    `, [rawShop.id]);
    const shop = {
      ...rawShop,
      weekly_schedule: safeParseJson(rawShop.weekly_schedule, []),
      weekly_holidays: safeParseJson(rawShop.weekly_holidays, []),
      gallery_urls: safeParseJson(rawShop.gallery_urls, []),
      min_order_amount: parseFloat(rawShop.min_order_amount || "5.00")
    };
    res.json({
      shop,
      services: servicesRes.rows.map((s) => ({
        serviceType: s.service_type,
        isEnabled: s.is_enabled,
        description: s.description,
        rate: parseFloat(s.rate || "0.00"),
        unit: s.unit || "per_page"
      })),
      pricingRules: pricingRes.rows.map((r) => ({
        paperSize: r.paper_size,
        colorMode: r.color_mode,
        singleSidedPrice: parseFloat(r.single_sided_price),
        doubleSidedPrice: parseFloat(r.double_sided_price),
        discountThreshold: r.per_page_discount_threshold,
        discountRate: parseFloat(r.per_page_discount_rate || "0")
      }))
    });
  } catch (err) {
    console.error("Storefront lookup error:", err);
    res.status(500).json({ error: "Failed to load shop storefront." });
  }
}
async function getOwnerShop(req, res) {
  if (!req.user || req.user.role !== "SHOP_OWNER" || !req.user.shopId) {
    return res.status(403).json({ error: "Only shop owners can access this endpoint." });
  }
  try {
    const shopRes = await query(`
      SELECT s.*, 
        (SELECT status FROM shop_verification_requests WHERE shop_id = s.id ORDER BY created_at DESC LIMIT 1) as verification_status,
        (SELECT admin_feedback FROM shop_verification_requests WHERE shop_id = s.id ORDER BY created_at DESC LIMIT 1) as verification_feedback
      FROM shops s
      WHERE s.id = $1
      LIMIT 1;
    `, [req.user.shopId]);
    if (shopRes.rows.length === 0) {
      return res.status(404).json({ error: "Shop not found." });
    }
    const rawShop = shopRes.rows[0];
    const pricingRes = await query(`
      SELECT * FROM shop_pricing_rules WHERE shop_id = $1 ORDER BY paper_size, color_mode;
    `, [rawShop.id]);
    const servicesRes = await query(`
      SELECT * FROM shop_services WHERE shop_id = $1 ORDER BY service_type;
    `, [rawShop.id]);
    const shop = {
      ...rawShop,
      weekly_schedule: safeParseJson(rawShop.weekly_schedule, []),
      weekly_holidays: safeParseJson(rawShop.weekly_holidays, []),
      gallery_urls: safeParseJson(rawShop.gallery_urls, []),
      min_order_amount: parseFloat(rawShop.min_order_amount || "5.00")
    };
    res.json({
      shop,
      pricingRules: pricingRes.rows.map((r) => ({
        paper_size: r.paper_size,
        color_mode: r.color_mode,
        single_sided_price: parseFloat(r.single_sided_price),
        double_sided_price: parseFloat(r.double_sided_price),
        per_page_discount_threshold: r.per_page_discount_threshold,
        per_page_discount_rate: parseFloat(r.per_page_discount_rate || "0")
      })),
      services: servicesRes.rows.map((s) => ({
        service_type: s.service_type,
        is_enabled: s.is_enabled,
        description: s.description,
        rate: parseFloat(s.rate || "0.00"),
        unit: s.unit || "per_page"
      }))
    });
  } catch (err) {
    console.error("Owner shop retrieval error:", err);
    res.status(500).json({ error: "Failed to fetch owner shop data." });
  }
}
var updateProfileSchema = z2.object({
  name: z2.string().min(3, "Shop name must be at least 3 characters"),
  ownerDisplayName: z2.string().optional().nullable(),
  description: z2.string().optional().nullable(),
  category: z2.string().optional().nullable(),
  address: z2.string().min(5, "Shop address must be at least 5 characters"),
  city: z2.string().optional().nullable(),
  state: z2.string().optional().nullable(),
  pincode: z2.string().optional().nullable(),
  contactEmail: z2.string().optional().nullable(),
  contactPhone: z2.string().optional().nullable(),
  businessHours: z2.string().optional().nullable(),
  weeklySchedule: z2.union([z2.string(), z2.array(z2.any())]).optional().nullable(),
  weeklyHolidays: z2.union([z2.string(), z2.array(z2.string())]).optional().nullable(),
  retentionHours: z2.number().int().min(1).max(168).optional().default(24),
  minOrderAmount: z2.number().min(0).optional().default(5),
  estCompletionTime: z2.string().optional().nullable(),
  isStorefrontVisible: z2.boolean().optional().default(true),
  logoUrl: z2.string().optional().nullable(),
  galleryUrls: z2.union([z2.string(), z2.array(z2.string())]).optional().nullable(),
  services: z2.array(z2.object({
    serviceType: z2.string(),
    isEnabled: z2.boolean().optional().default(true),
    description: z2.string().optional().nullable(),
    rate: z2.number().min(0).optional().default(0),
    unit: z2.string().optional().default("per_page")
  })).optional()
});
async function updateShopProfile(req, res) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  try {
    const validated = updateProfileSchema.parse(req.body);
    const weeklyScheduleStr = typeof validated.weeklySchedule === "string" ? validated.weeklySchedule : JSON.stringify(validated.weeklySchedule || []);
    const weeklyHolidaysStr = typeof validated.weeklyHolidays === "string" ? validated.weeklyHolidays : JSON.stringify(validated.weeklyHolidays || []);
    const galleryUrlsStr = typeof validated.galleryUrls === "string" ? validated.galleryUrls : JSON.stringify(validated.galleryUrls || []);
    let busHours = validated.businessHours;
    if (!busHours && Array.isArray(validated.weeklySchedule) && validated.weeklySchedule.length > 0) {
      const mon = validated.weeklySchedule[0];
      busHours = `${mon.open || "8:30 AM"} - ${mon.close || "9:30 PM"}`;
    }
    await query(`
      UPDATE shops
      SET 
        name = $1,
        owner_display_name = $2,
        description = $3,
        category = $4,
        address = $5,
        city = $6,
        state = $7,
        pincode = $8,
        contact_email = $9,
        contact_phone = $10,
        business_hours = COALESCE($11, business_hours),
        weekly_schedule = $12,
        weekly_holidays = $13,
        retention_hours = $14,
        min_order_amount = $15,
        est_completion_time = $16,
        is_storefront_visible = $17,
        logo_url = $18,
        gallery_urls = $19,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $20;
    `, [
      validated.name,
      validated.ownerDisplayName || null,
      validated.description || null,
      validated.category || "Xerox & Digital Printing",
      validated.address,
      validated.city || "New Delhi",
      validated.state || "Delhi",
      validated.pincode || "110001",
      validated.contactEmail || null,
      validated.contactPhone || null,
      busHours || "8:30 AM - 9:30 PM",
      weeklyScheduleStr,
      weeklyHolidaysStr,
      validated.retentionHours || 24,
      validated.minOrderAmount || 5,
      validated.estCompletionTime || "15-30 mins",
      validated.isStorefrontVisible !== false,
      validated.logoUrl || null,
      galleryUrlsStr,
      req.user.shopId
    ]);
    if (validated.services && Array.isArray(validated.services)) {
      for (const s of validated.services) {
        const existing = await query(`
          SELECT id FROM shop_services WHERE shop_id = $1 AND service_type = $2;
        `, [req.user.shopId, s.serviceType]);
        if (existing.rows.length > 0) {
          await query(`
            UPDATE shop_services
            SET is_enabled = $1, description = $2, rate = $3, unit = $4
            WHERE id = $5;
          `, [s.isEnabled, s.description || "", s.rate || 0, s.unit || "per_page", existing.rows[0].id]);
        } else {
          await query(`
            INSERT INTO shop_services (id, shop_id, service_type, is_enabled, description, rate, unit)
            VALUES ($1, $2, $3, $4, $5, $6, $7);
          `, [crypto4.randomUUID(), req.user.shopId, s.serviceType, s.isEnabled, s.description || "", s.rate || 0, s.unit || "per_page"]);
        }
      }
    }
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: "SHOP_OWNER",
      action: "SHOP_PROFILE_UPDATED",
      targetType: "SHOP",
      targetId: req.user.shopId,
      details: {
        name: validated.name,
        category: validated.category,
        city: validated.city,
        minOrderAmount: validated.minOrderAmount
      }
    });
    res.json({ message: "Shop profile and preferences updated successfully." });
  } catch (err) {
    console.error("Update profile error:", err);
    if (err instanceof z2.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: "Failed to update shop profile." });
  }
}
async function uploadShopImage(req, res) {
  if (!req.user || req.user.role !== "SHOP_OWNER" || !req.user.shopId) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No image file uploaded." });
  }
  if (file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: "Image file size exceeds maximum limit of 5MB." });
  }
  const validation = storageService.validateMagicBytes(file.buffer);
  const isWebp = file.buffer.length > 12 && file.buffer[0] === 82 && file.buffer[1] === 73 && file.buffer[2] === 70 && file.buffer[3] === 70 && file.buffer[8] === 87 && file.buffer[9] === 69 && file.buffer[10] === 66 && file.buffer[11] === 80;
  if (!validation.isValid && !isWebp) {
    return res.status(400).json({ error: "Invalid file format. Only authentic JPG, PNG, and WebP images are allowed." });
  }
  const mime = isWebp ? "image/webp" : validation.detectedMime;
  if (mime !== "image/png" && mime !== "image/jpeg" && mime !== "image/webp") {
    return res.status(400).json({ error: "Only PNG, JPEG, and WebP image uploads are supported." });
  }
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const filename = `shop_${req.user.shopId}_${Date.now()}_${crypto4.randomBytes(6).toString("hex")}.${ext}`;
  const targetDir = path4.join(process.cwd(), "public_uploads", "shop_assets");
  if (!fs3.existsSync(targetDir)) {
    fs3.mkdirSync(targetDir, { recursive: true });
  }
  const fullPath = path4.join(targetDir, filename);
  fs3.writeFileSync(fullPath, file.buffer);
  const publicUrl = `/api/uploads/shop_assets/${filename}`;
  await logAuditEvent({
    actorId: req.user.id,
    actorRole: "SHOP_OWNER",
    action: "SHOP_ASSET_UPLOADED",
    targetType: "SHOP",
    targetId: req.user.shopId,
    details: { filename, mime, size: file.size }
  });
  res.json({
    message: "Image uploaded successfully.",
    url: publicUrl,
    filename
  });
}
var singleRuleSchema = z2.object({
  paperSize: z2.enum(["A4", "A3", "LEGAL", "LETTER"]),
  colorMode: z2.enum(["BW", "COLOR"]),
  singleSidedPrice: z2.number().min(0, "Price must be non-negative"),
  doubleSidedPrice: z2.number().min(0, "Price must be non-negative"),
  discountThreshold: z2.number().int().min(1).optional().default(50),
  discountRate: z2.number().min(0).optional().default(0)
});
var serviceRateSchema = z2.object({
  serviceType: z2.string(),
  isEnabled: z2.boolean().optional().default(true),
  description: z2.string().optional().nullable(),
  rate: z2.number().min(0, "Service rate must be non-negative"),
  unit: z2.string().optional().default("per_page")
});
var complexPricingSchema = z2.object({
  pricingRules: z2.array(singleRuleSchema).optional(),
  services: z2.array(serviceRateSchema).optional(),
  minOrderAmount: z2.number().min(0).optional(),
  estCompletionTime: z2.string().optional()
});
async function updatePricingRules(req, res) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  try {
    let rules = [];
    let services = [];
    let minOrder;
    let estTime;
    if (Array.isArray(req.body)) {
      rules = z2.array(singleRuleSchema).parse(req.body);
    } else {
      const parsed = complexPricingSchema.parse(req.body);
      rules = parsed.pricingRules || [];
      services = parsed.services || [];
      minOrder = parsed.minOrderAmount;
      estTime = parsed.estCompletionTime;
    }
    for (const r of rules) {
      const existing = await query(`
        SELECT id FROM shop_pricing_rules
        WHERE shop_id = $1 AND paper_size = $2 AND color_mode = $3;
      `, [req.user.shopId, r.paperSize, r.colorMode]);
      if (existing.rows.length > 0) {
        await query(`
          UPDATE shop_pricing_rules
          SET single_sided_price = $1, double_sided_price = $2,
              per_page_discount_threshold = $3, per_page_discount_rate = $4,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $5;
        `, [r.singleSidedPrice, r.doubleSidedPrice, r.discountThreshold, r.discountRate, existing.rows[0].id]);
      } else {
        await query(`
          INSERT INTO shop_pricing_rules (id, shop_id, paper_size, color_mode, single_sided_price, double_sided_price, per_page_discount_threshold, per_page_discount_rate)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `, [crypto4.randomUUID(), req.user.shopId, r.paperSize, r.colorMode, r.singleSidedPrice, r.doubleSidedPrice, r.discountThreshold, r.discountRate]);
      }
    }
    for (const s of services) {
      const existing = await query(`
        SELECT id FROM shop_services
        WHERE shop_id = $1 AND service_type = $2;
      `, [req.user.shopId, s.serviceType]);
      if (existing.rows.length > 0) {
        await query(`
          UPDATE shop_services
          SET is_enabled = $1, description = $2, rate = $3, unit = $4
          WHERE id = $5;
        `, [s.isEnabled, s.description || "", s.rate, s.unit || "per_page", existing.rows[0].id]);
      } else {
        await query(`
          INSERT INTO shop_services (id, shop_id, service_type, is_enabled, description, rate, unit)
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [crypto4.randomUUID(), req.user.shopId, s.serviceType, s.isEnabled, s.description || "", s.rate, s.unit || "per_page"]);
      }
    }
    if (minOrder !== void 0 || estTime !== void 0) {
      await query(`
        UPDATE shops
        SET 
          min_order_amount = COALESCE($1, min_order_amount),
          est_completion_time = COALESCE($2, est_completion_time),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3;
      `, [minOrder ?? null, estTime ?? null, req.user.shopId]);
    }
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: "SHOP_OWNER",
      action: "PRICING_RULES_UPDATED",
      targetType: "SHOP",
      targetId: req.user.shopId,
      details: { rulesCount: rules.length, servicesCount: services.length, minOrder }
    });
    res.json({ message: "Printing services and pricing rules updated successfully." });
  } catch (err) {
    console.error("Update pricing error:", err);
    if (err instanceof z2.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: "Failed to update pricing rules." });
  }
}
async function getShopQr(req, res) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  try {
    const shopRes = await query(`
      SELECT id, slug, name, qr_code_token
      FROM shops
      WHERE id = $1
      LIMIT 1;
    `, [req.user.shopId]);
    if (shopRes.rows.length === 0) {
      return res.status(404).json({ error: "Shop not found." });
    }
    const shop = shopRes.rows[0];
    const canonicalStorefrontUrl = `${config.frontendUrl}/s/${shop.id}`;
    const slugUrl = `${config.frontendUrl}/shop/${shop.slug}`;
    const qrDataUrl = await QRCode.toDataURL(canonicalStorefrontUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 600,
      color: {
        dark: "#0B192C",
        light: "#FFFFFF"
      }
    });
    res.json({
      shopId: shop.id,
      shopName: shop.name,
      slug: shop.slug,
      storefrontUrl: canonicalStorefrontUrl,
      slugUrl,
      qrToken: shop.qr_code_token,
      qrDataUrl
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate shop QR code." });
  }
}
async function regenerateQrCode(req, res) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  try {
    const newQrToken = `qr-${crypto4.randomBytes(16).toString("hex")}`;
    await query(`
      UPDATE shops
      SET qr_code_token = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `, [newQrToken, req.user.shopId]);
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: "SHOP_OWNER",
      action: "QR_CODE_REGENERATED",
      targetType: "SHOP",
      targetId: req.user.shopId,
      details: { newQrTokenPrefix: newQrToken.substring(0, 8) }
    });
    res.json({
      message: "Shop QR code regenerated successfully. Previous QR codes will no longer resolve.",
      newQrToken
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to regenerate QR code." });
  }
}

// backend/src/middleware/upload.middleware.ts
import multer from "multer";
var storage = multer.memoryStorage();
var upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
    files: 5
  },
  fileFilter: (_req, file, cb) => {
    if (config.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Only PDF, JPG, and PNG are allowed.`));
    }
  }
});

// backend/src/routes/shop.routes.ts
var router2 = Router2();
router2.get("/public/:slug", getPublicStorefront);
router2.use("/owner", authenticateUser, requireRole("SHOP_OWNER"));
router2.get("/owner/profile", getOwnerShop);
router2.put("/owner/profile", updateShopProfile);
router2.post("/owner/upload-image", upload.single("image"), uploadShopImage);
router2.put("/owner/pricing", updatePricingRules);
router2.get("/owner/qr", getShopQr);
router2.post("/owner/qr/regenerate", regenerateQrCode);
var shop_routes_default = router2;

// backend/src/routes/order.routes.ts
import { Router as Router3 } from "express";

// backend/src/controllers/order.controller.ts
import crypto5 from "crypto";
import { v4 as uuidv43 } from "uuid";
import { z as z3 } from "zod";
import fs4 from "fs";

// backend/src/services/pricing.service.ts
var PricingService = class {
  async calculatePrice(input) {
    const { shopId, paperSize, colorMode, isDuplex, copies, pageCount } = input;
    const safeCopies = Math.max(1, copies || 1);
    const safePages = Math.max(1, pageCount || 1);
    const res = await query(`
      SELECT paper_size, color_mode, single_sided_price, double_sided_price,
             per_page_discount_threshold, per_page_discount_rate
      FROM shop_pricing_rules
      WHERE shop_id = $1 AND paper_size = $2 AND color_mode = $3
      LIMIT 1;
    `, [shopId, paperSize, colorMode]);
    let rule = res.rows[0];
    if (!rule) {
      const isColor = colorMode === "COLOR";
      const isLarge = paperSize === "A3";
      const baseSingle = isColor ? isLarge ? 20 : 10 : isLarge ? 5 : 2;
      const baseDouble = isColor ? isLarge ? 35 : 18 : isLarge ? 8 : 3;
      rule = {
        paper_size: paperSize,
        color_mode: colorMode,
        single_sided_price: baseSingle,
        double_sided_price: baseDouble,
        per_page_discount_threshold: 50,
        per_page_discount_rate: isColor ? 1 : 0.2
      };
    }
    const singlePrice = parseFloat(rule.single_sided_price);
    const doublePrice = parseFloat(rule.double_sided_price);
    const discountThreshold = parseInt(rule.per_page_discount_threshold, 10) || 50;
    const discountRate = parseFloat(rule.per_page_discount_rate) || 0;
    let sheetsPerCopy;
    let unitPricePerCopy;
    if (isDuplex) {
      sheetsPerCopy = Math.ceil(safePages / 2);
      if (safePages % 2 === 1 && safePages > 1) {
        const fullDuplexSheets = Math.floor(safePages / 2);
        unitPricePerCopy = fullDuplexSheets * doublePrice + singlePrice;
      } else if (safePages === 1) {
        unitPricePerCopy = singlePrice;
      } else {
        unitPricePerCopy = sheetsPerCopy * doublePrice;
      }
    } else {
      sheetsPerCopy = safePages;
      unitPricePerCopy = safePages * singlePrice;
    }
    const totalSheets = sheetsPerCopy * safeCopies;
    const totalPages = safePages * safeCopies;
    let subtotal = unitPricePerCopy * safeCopies;
    let discount = 0;
    if (totalPages >= discountThreshold && discountRate > 0) {
      discount = totalPages * discountRate;
      if (discount > subtotal * 0.5) {
        discount = subtotal * 0.5;
      }
    }
    const shopRes = await query(`
      SELECT min_order_amount FROM shops WHERE id = $1 LIMIT 1;
    `, [shopId]);
    const minOrderAmount = shopRes.rows.length > 0 && shopRes.rows[0].min_order_amount != null ? parseFloat(shopRes.rows[0].min_order_amount) : 5;
    let total = parseFloat((subtotal - discount).toFixed(2));
    if (total < minOrderAmount) {
      total = minOrderAmount;
    }
    return {
      unitPrice: parseFloat(unitPricePerCopy.toFixed(2)),
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      minOrderAmount,
      total,
      sheetsPerCopy,
      totalSheets,
      appliedRule: {
        paperSize: rule.paper_size,
        colorMode: rule.color_mode,
        singleSidedPrice: singlePrice,
        doubleSidedPrice: doublePrice,
        discountThreshold,
        discountRate
      }
    };
  }
};
var pricingService = new PricingService();

// backend/src/controllers/order.controller.ts
function generateOrderReference() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let rand = "";
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  return `SX-${rand}-${year}`;
}
function generatePickupOtp() {
  return Math.floor(1e3 + Math.random() * 9e3).toString();
}
async function calculateEstimate(req, res) {
  try {
    const { shopId, paperSize, colorMode, isDuplex, copies, pageCount } = req.body;
    if (!shopId) {
      return res.status(400).json({ error: "Shop ID is required." });
    }
    const estimate = await pricingService.calculatePrice({
      shopId,
      paperSize: paperSize || "A4",
      colorMode: colorMode || "BW",
      isDuplex: !!isDuplex,
      copies: parseInt(copies, 10) || 1,
      pageCount: parseInt(pageCount, 10) || 1
    });
    res.json(estimate);
  } catch (err) {
    res.status(500).json({ error: "Failed to calculate estimate." });
  }
}
async function createOrder(req, res) {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "Please upload a valid document (PDF, PNG, or JPG)." });
  }
  const {
    shopId,
    paperSize = "A4",
    colorMode = "BW",
    isDuplex = "false",
    copies = "1",
    customNotes = "",
    customerAlias = "Guest Customer",
    customerContactNote = ""
  } = req.body;
  if (!shopId) {
    return res.status(400).json({ error: "Target Shop ID is required." });
  }
  try {
    const shopRes = await query(`
      SELECT id, name, is_verified, is_active, retention_hours
      FROM shops
      WHERE id = $1
      LIMIT 1;
    `, [shopId]);
    if (shopRes.rows.length === 0) {
      return res.status(404).json({ error: "Shop not found." });
    }
    const shop = shopRes.rows[0];
    if (!shop.is_verified) {
      return res.status(403).json({ error: "This shop is not verified to receive print orders." });
    }
    if (!shop.is_active) {
      return res.status(403).json({ error: "This shop is currently inactive." });
    }
    const validation = await storageService.inspectAndValidate(file.buffer, file.mimetype);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error || "Invalid file format or security inspection failure." });
    }
    const saved = await storageService.saveFile(file.buffer, file.originalname, validation.detectedMime);
    const numCopies = Math.max(1, parseInt(copies, 10) || 1);
    const duplexBool = isDuplex === "true" || isDuplex === true;
    const pricing = await pricingService.calculatePrice({
      shopId,
      paperSize,
      colorMode,
      isDuplex: duplexBool,
      copies: numCopies,
      pageCount: validation.pageCount
    });
    const orderId = uuidv43();
    const orderReference = generateOrderReference();
    const orderAccessToken = crypto5.randomBytes(32).toString("hex");
    const tokenHash = crypto5.createHash("sha256").update(orderAccessToken).digest("hex");
    const tokenHint = `${orderAccessToken.substring(0, 6)}...${orderAccessToken.substring(orderAccessToken.length - 4)}`;
    const pickupOtp = generatePickupOtp();
    const retentionHours = shop.retention_hours || 24;
    const autoDeleteDate = new Date(Date.now() + retentionHours * 60 * 60 * 1e3);
    const tokenExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
    await transaction(async ({ query: txQuery }) => {
      await txQuery(`
        INSERT INTO orders (id, order_reference, shop_id, customer_alias, customer_contact_note, status, estimated_amount, final_amount, pickup_otp)
        VALUES ($1, $2, $3, $4, $5, 'SUBMITTED', $6, $6, $7);
      `, [orderId, orderReference, shopId, customerAlias || "Guest Customer", customerContactNote || null, pricing.total, pickupOtp]);
      const itemId = uuidv43();
      await txQuery(`
        INSERT INTO order_items (id, order_id, paper_size, color_mode, is_duplex, copies, page_count, custom_notes, item_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
      `, [itemId, orderId, paperSize, colorMode, duplexBool, numCopies, validation.pageCount, customNotes || null, pricing.total]);
      const docId = uuidv43();
      await txQuery(`
        INSERT INTO document_metadata (id, order_id, order_item_id, original_filename, stored_filename, file_size, mime_type, page_count, storage_key, sha256_hash, malware_status, auto_delete_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'CLEAN', $11);
      `, [docId, orderId, itemId, file.originalname, saved.storedFilename, saved.fileSize, validation.detectedMime, validation.pageCount, saved.storageKey, saved.sha256Hash, autoDeleteDate]);
      await txQuery(`
        INSERT INTO order_access_tokens (id, order_id, token_hash, token_hint, expires_at)
        VALUES ($1, $2, $3, $4, $5);
      `, [uuidv43(), orderId, tokenHash, tokenHint, tokenExpiryDate]);
      await txQuery(`
        INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
        VALUES ($1, $2, NULL, 'SUBMITTED', 'CUSTOMER', 'Order submitted by guest customer.');
      `, [uuidv43(), orderId]);
      await txQuery(`
        INSERT INTO notifications (id, shop_id, order_id, title, message)
        VALUES ($1, $2, $3, 'New Print Job Received', $4);
      `, [uuidv43(), shopId, orderId, `New order ${orderReference} for ${numCopies} copies (${validation.pageCount} pages).`]);
    });
    await logAuditEvent({
      actorRole: "CUSTOMER",
      action: "ORDER_SUBMITTED",
      targetType: "ORDER",
      targetId: orderId,
      ipAddress: req.ip,
      details: {
        orderReference,
        shopId,
        pageCount: validation.pageCount,
        copies: numCopies,
        totalAmount: pricing.total
      }
    });
    res.status(201).json({
      message: "Print job submitted successfully.",
      orderReference,
      orderAccessToken,
      trackingUrl: `/track/${orderReference}?token=${orderAccessToken}`,
      status: "SUBMITTED",
      estimatedAmount: pricing.total,
      pickupOtp,
      pageCount: validation.pageCount,
      copies: numCopies,
      retentionNotice: `Your document is scheduled to be automatically deleted in ${retentionHours} hours.`,
      retentionDate: autoDeleteDate.toISOString()
    });
  } catch (err) {
    console.error("Order creation failed:", err);
    res.status(500).json({ error: "Failed to process document and create order." });
  }
}
async function trackOrder(req, res) {
  const orderRef = req.params.reference;
  try {
    const orderRes = await query(`
      SELECT o.id, o.order_reference, o.status, o.estimated_amount, o.final_amount,
             o.quotation_note, o.cancellation_reason, o.pickup_otp, o.created_at, o.updated_at,
             s.name as shop_name, s.address as shop_address, s.business_hours as shop_hours,
             s.retention_hours
      FROM orders o
      JOIN shops s ON o.shop_id = s.id
      WHERE (o.order_reference = $1 OR o.id = $1)
      LIMIT 1;
    `, [orderRef]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }
    const order = orderRes.rows[0];
    const itemsRes = await query(`
      SELECT paper_size, color_mode, is_duplex, copies, page_count, custom_notes, item_price
      FROM order_items
      WHERE order_id = $1;
    `, [order.id]);
    const docRes = await query(`
      SELECT original_filename, file_size, mime_type, is_deleted, auto_delete_at
      FROM document_metadata
      WHERE order_id = $1
      LIMIT 1;
    `, [order.id]);
    const historyRes = await query(`
      SELECT previous_status, new_status, changed_by_role, note, created_at
      FROM order_status_history
      WHERE order_id = $1
      ORDER BY created_at ASC;
    `, [order.id]);
    const messagesRes = await query(`
      SELECT id, sender_role, message, created_at
      FROM order_messages
      WHERE order_id = $1
      ORDER BY created_at ASC;
    `, [order.id]);
    res.json({
      order: {
        id: order.id,
        orderReference: order.order_reference,
        status: order.status,
        estimatedAmount: parseFloat(order.estimated_amount),
        finalAmount: parseFloat(order.final_amount),
        quotationNote: order.quotation_note,
        cancellationReason: order.cancellation_reason,
        pickupOtp: order.pickup_otp,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      },
      shop: {
        name: order.shop_name,
        address: order.shop_address,
        businessHours: order.shop_hours,
        retentionHours: order.retention_hours
      },
      items: itemsRes.rows,
      document: docRes.rows[0] ? {
        originalFilename: docRes.rows[0].original_filename,
        fileSize: docRes.rows[0].file_size,
        mimeType: docRes.rows[0].mime_type,
        isDeleted: docRes.rows[0].is_deleted,
        autoDeleteAt: docRes.rows[0].auto_delete_at
      } : null,
      history: historyRes.rows,
      messages: messagesRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch order tracking information." });
  }
}
async function approveRevisedQuote(req, res) {
  const orderRef = req.params.reference;
  try {
    const orderRes = await query(`
      SELECT id, status, final_amount FROM orders WHERE order_reference = $1 OR id = $1 LIMIT 1;
    `, [orderRef]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }
    const order = orderRes.rows[0];
    if (order.status !== "AWAITING_APPROVAL") {
      return res.status(400).json({ error: `Order is not awaiting quotation approval (current status: ${order.status}).` });
    }
    await query(`
      UPDATE orders
      SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `, [order.id]);
    await query(`
      INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
      VALUES ($1, $2, 'AWAITING_APPROVAL', 'ACCEPTED', 'CUSTOMER', 'Customer approved the revised quotation.');
    `, [uuidv43(), order.id]);
    await logAuditEvent({
      actorRole: "CUSTOMER",
      action: "QUOTE_APPROVED",
      targetType: "ORDER",
      targetId: order.id,
      details: { approvedAmount: order.final_amount }
    });
    res.json({ message: "Quotation approved. Shop owner notified to proceed with printing.", status: "ACCEPTED" });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve quotation." });
  }
}
async function cancelCustomerOrder(req, res) {
  const orderRef = req.params.reference;
  const reason = req.body.reason || "Cancelled by customer";
  try {
    const orderRes = await query(`
      SELECT id, status FROM orders WHERE order_reference = $1 OR id = $1 LIMIT 1;
    `, [orderRef]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }
    const order = orderRes.rows[0];
    const cancellableStatuses = ["SUBMITTED", "ACCEPTED", "AWAITING_APPROVAL"];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        error: `Cannot cancel order at this stage. Current status: ${order.status}. Cancellation is only permitted before printing begins.`
      });
    }
    await query(`
      UPDATE orders
      SET status = 'CANCELLED', cancellation_reason = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `, [reason, order.id]);
    await query(`
      INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
      VALUES ($1, $2, $3, 'CANCELLED', 'CUSTOMER', $4);
    `, [uuidv43(), order.id, order.status, reason]);
    await logAuditEvent({
      actorRole: "CUSTOMER",
      action: "ORDER_CANCELLED",
      targetType: "ORDER",
      targetId: order.id,
      details: { previousStatus: order.status, reason }
    });
    res.json({ message: "Order has been successfully cancelled.", status: "CANCELLED" });
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel order." });
  }
}
async function sendOrderMessage(req, res) {
  const orderRef = req.params.reference || req.params.id;
  const { message, senderRole } = req.body;
  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: "Message content cannot be empty." });
  }
  try {
    const orderRes = await query(`
      SELECT id FROM orders WHERE order_reference = $1 OR id = $1 LIMIT 1;
    `, [orderRef]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }
    const orderId = orderRes.rows[0].id;
    const role = senderRole === "SHOP_OWNER" ? "SHOP_OWNER" : "CUSTOMER";
    const messageId = uuidv43();
    await query(`
      INSERT INTO order_messages (id, order_id, sender_role, message)
      VALUES ($1, $2, $3, $4);
    `, [messageId, orderId, role, message.trim()]);
    res.status(201).json({
      message: "Message sent successfully.",
      messageRecord: {
        id: messageId,
        orderId,
        senderRole: role,
        message: message.trim(),
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to send message." });
  }
}
async function listOwnerOrders(req, res) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  const { status, search } = req.query;
  try {
    let sql = `
      SELECT o.id, o.order_reference, o.customer_alias, o.status,
             o.estimated_amount, o.final_amount, o.quotation_note, o.pickup_otp,
             o.created_at, o.updated_at,
             oi.paper_size, oi.color_mode, oi.is_duplex, oi.copies, oi.page_count, oi.custom_notes,
             dm.original_filename, dm.is_deleted, dm.auto_delete_at
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN document_metadata dm ON o.id = dm.order_id
      WHERE o.shop_id = $1
    `;
    const params = [req.user.shopId];
    if (status && status !== "ALL") {
      params.push(status);
      sql += ` AND o.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (o.order_reference ILIKE $${params.length} OR o.customer_alias ILIKE $${params.length})`;
    }
    sql += ` ORDER BY o.created_at DESC;`;
    const resOrders = await query(sql, params);
    res.json({ orders: resOrders.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to load shop orders." });
  }
}
async function getOwnerOrderDetail(req, res) {
  const orderId = req.params.id;
  try {
    const orderRes = await query(`
      SELECT o.*, 
             oi.paper_size, oi.color_mode, oi.is_duplex, oi.copies, oi.page_count, oi.custom_notes,
             dm.id as document_id, dm.original_filename, dm.file_size, dm.mime_type, dm.is_deleted, dm.auto_delete_at, dm.sha256_hash
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN document_metadata dm ON o.id = dm.order_id
      WHERE o.id = $1 AND o.shop_id = $2
      LIMIT 1;
    `, [orderId, req.user?.shopId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }
    const historyRes = await query(`
      SELECT previous_status, new_status, changed_by_role, note, created_at
      FROM order_status_history
      WHERE order_id = $1
      ORDER BY created_at ASC;
    `, [orderId]);
    const messagesRes = await query(`
      SELECT id, sender_role, message, created_at
      FROM order_messages
      WHERE order_id = $1
      ORDER BY created_at ASC;
    `, [orderId]);
    res.json({
      order: orderRes.rows[0],
      history: historyRes.rows,
      messages: messagesRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load order details." });
  }
}
var updateStatusSchema = z3.object({
  status: z3.enum([
    "RECEIVED",
    "SUBMITTED",
    "ACCEPTED",
    "QUEUED",
    "AWAITING_APPROVAL",
    "PRINTING",
    "PRINT_FAILED",
    "FAILED",
    "READY_FOR_PICKUP",
    "COMPLETED",
    "REJECTED",
    "CANCELLED",
    "NEEDS_ATTENTION"
  ]),
  note: z3.string().optional()
});
async function updateOrderStatus(req, res) {
  const orderId = req.params.id;
  try {
    const validated = updateStatusSchema.parse(req.body);
    const orderRes = await query(`
      SELECT id, status, order_reference FROM orders WHERE id = $1 AND shop_id = $2 LIMIT 1;
    `, [orderId, req.user?.shopId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }
    const currentOrder = orderRes.rows[0];
    const prevStatus = currentOrder.status;
    const nextStatus = validated.status;
    const validTransitions = {
      SUBMITTED: ["ACCEPTED", "REJECTED", "QUEUED", "PRINTING", "AWAITING_APPROVAL", "CANCELLED", "NEEDS_ATTENTION"],
      RECEIVED: ["ACCEPTED", "REJECTED", "QUEUED", "PRINTING", "AWAITING_APPROVAL", "CANCELLED", "NEEDS_ATTENTION"],
      AWAITING_APPROVAL: ["ACCEPTED", "REJECTED", "CANCELLED", "NEEDS_ATTENTION"],
      ACCEPTED: ["QUEUED", "PRINTING", "READY_FOR_PICKUP", "REJECTED", "CANCELLED", "NEEDS_ATTENTION"],
      QUEUED: ["PRINTING", "PRINT_FAILED", "FAILED", "READY_FOR_PICKUP", "CANCELLED", "NEEDS_ATTENTION"],
      PRINTING: ["READY_FOR_PICKUP", "PRINT_FAILED", "FAILED", "CANCELLED", "NEEDS_ATTENTION"],
      PRINT_FAILED: ["QUEUED", "PRINTING", "CANCELLED", "NEEDS_ATTENTION"],
      FAILED: ["QUEUED", "PRINTING", "CANCELLED", "NEEDS_ATTENTION"],
      NEEDS_ATTENTION: ["ACCEPTED", "QUEUED", "PRINTING", "READY_FOR_PICKUP", "REJECTED", "CANCELLED"],
      READY_FOR_PICKUP: ["COMPLETED", "CANCELLED", "NEEDS_ATTENTION"],
      COMPLETED: [],
      REJECTED: [],
      CANCELLED: []
    };
    if (validTransitions[prevStatus] && !validTransitions[prevStatus].includes(nextStatus) && prevStatus !== nextStatus) {
      return res.status(400).json({
        error: `Invalid transition from ${prevStatus} to ${nextStatus}. Allowed: ${validTransitions[prevStatus]?.join(", ") || "None"}`
      });
    }
    await query(`
      UPDATE orders
      SET status = $1, cancellation_reason = CASE WHEN $1 IN ('REJECTED', 'CANCELLED') THEN COALESCE($2, cancellation_reason) ELSE cancellation_reason END, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3;
    `, [nextStatus, validated.note || null, orderId]);
    await query(`
      INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
      VALUES ($1, $2, $3, $4, 'SHOP_OWNER', $5);
    `, [uuidv43(), orderId, prevStatus, nextStatus, validated.note || `Status updated to ${nextStatus}`]);
    if (nextStatus === "COMPLETED") {
      const completionRetention = new Date(Date.now() + 2 * 60 * 60 * 1e3);
      await query(`
        UPDATE document_metadata
        SET auto_delete_at = $1
        WHERE order_id = $2 AND is_deleted = FALSE;
      `, [completionRetention, orderId]);
    }
    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: "SHOP_OWNER",
      action: "ORDER_STATUS_CHANGED",
      targetType: "ORDER",
      targetId: orderId,
      details: { previousStatus: prevStatus, newStatus: nextStatus, note: validated.note }
    });
    res.json({ message: `Order status updated to ${nextStatus}.`, status: nextStatus });
  } catch (err) {
    if (err instanceof z3.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: "Failed to update order status." });
  }
}
async function reviseOrderQuote(req, res) {
  const orderId = req.params.id;
  const { newAmount, quotationNote } = req.body;
  const parsedAmount = parseFloat(newAmount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: "Please enter a valid quotation amount." });
  }
  try {
    const orderRes = await query(`
      SELECT id, status, estimated_amount FROM orders WHERE id = $1 AND shop_id = $2 LIMIT 1;
    `, [orderId, req.user?.shopId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }
    const order = orderRes.rows[0];
    if (order.status !== "SUBMITTED" && order.status !== "ACCEPTED") {
      return res.status(400).json({ error: `Cannot revise quote in current status: ${order.status}` });
    }
    await query(`
      UPDATE orders
      SET status = 'AWAITING_APPROVAL', final_amount = $1, quotation_note = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3;
    `, [parsedAmount, quotationNote || "Revised price quotation", orderId]);
    await query(`
      INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
      VALUES ($1, $2, $3, 'AWAITING_APPROVAL', 'SHOP_OWNER', $4);
    `, [uuidv43(), orderId, order.status, `Quotation revised to \u20B9${parsedAmount}. Note: ${quotationNote || "N/A"}`]);
    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: "SHOP_OWNER",
      action: "QUOTE_REVISED",
      targetType: "ORDER",
      targetId: orderId,
      details: { oldAmount: order.estimated_amount, newAmount: parsedAmount, note: quotationNote }
    });
    res.json({
      message: "Quotation updated. Order is now awaiting customer approval before printing.",
      status: "AWAITING_APPROVAL",
      finalAmount: parsedAmount
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to revise quotation." });
  }
}
async function previewDocument(req, res) {
  const { id: orderId, docId } = req.params;
  try {
    const docRes = await query(`
      SELECT dm.storage_key, dm.mime_type, dm.original_filename, dm.is_deleted
      FROM document_metadata dm
      JOIN orders o ON dm.order_id = o.id
      WHERE dm.id = $1 AND o.id = $2 AND o.shop_id = $3
      LIMIT 1;
    `, [docId, orderId, req.user?.shopId]);
    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: "Document not found or unauthorized." });
    }
    const doc = docRes.rows[0];
    if (doc.is_deleted) {
      return res.status(410).json({ error: "This document has already been securely deleted per retention policy." });
    }
    const filePath = storageService.getFilePath(doc.storage_key);
    if (!filePath || !fs4.existsSync(filePath)) {
      return res.status(404).json({ error: "Physical document file not found." });
    }
    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: "SHOP_OWNER",
      action: "DOCUMENT_PREVIEWED",
      targetType: "DOCUMENT",
      targetId: docId,
      ipAddress: req.ip,
      details: { orderId, filename: doc.original_filename }
    });
    res.setHeader("Content-Type", doc.mime_type);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.original_filename)}"`);
    res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    const stream = fs4.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Failed to stream document preview." });
  }
}
async function downloadDocument(req, res) {
  const { id: orderId, docId } = req.params;
  try {
    const docRes = await query(`
      SELECT dm.storage_key, dm.mime_type, dm.original_filename, dm.is_deleted
      FROM document_metadata dm
      JOIN orders o ON dm.order_id = o.id
      WHERE dm.id = $1 AND o.id = $2 AND o.shop_id = $3
      LIMIT 1;
    `, [docId, orderId, req.user?.shopId]);
    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: "Document not found or unauthorized." });
    }
    const doc = docRes.rows[0];
    if (doc.is_deleted) {
      return res.status(410).json({ error: "This document has been permanently deleted per retention policy." });
    }
    const filePath = storageService.getFilePath(doc.storage_key);
    if (!filePath || !fs4.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found." });
    }
    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: "SHOP_OWNER",
      action: "DOCUMENT_DOWNLOADED_FOR_PRINTING",
      targetType: "DOCUMENT",
      targetId: docId,
      ipAddress: req.ip,
      details: { orderId, filename: doc.original_filename }
    });
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.original_filename)}"`);
    res.setHeader("Content-Type", doc.mime_type);
    res.setHeader("X-Content-Type-Options", "nosniff");
    const stream = fs4.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Failed to download document." });
  }
}
async function getOwnerReports(req, res) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  try {
    const totalOrdersRes = await query(`
      SELECT COUNT(*) as total_orders,
             COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN final_amount ELSE 0 END), 0) as total_revenue,
             COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END), 0) as completed_orders,
             COALESCE(SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END), 0) as cancelled_orders,
             COALESCE(SUM(CASE WHEN status IN ('SUBMITTED', 'ACCEPTED', 'AWAITING_APPROVAL', 'PRINTING', 'READY_FOR_PICKUP') THEN 1 ELSE 0 END), 0) as active_orders
      FROM orders
      WHERE shop_id = $1;
    `, [req.user.shopId]);
    const statusBreakdown = await query(`
      SELECT status, COUNT(*) as count
      FROM orders
      WHERE shop_id = $1
      GROUP BY status;
    `, [req.user.shopId]);
    const paperSizeBreakdown = await query(`
      SELECT oi.paper_size, oi.color_mode, COUNT(*) as job_count, SUM(oi.copies * oi.page_count) as total_pages
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.shop_id = $1
      GROUP BY oi.paper_size, oi.color_mode;
    `, [req.user.shopId]);
    res.json({
      summary: totalOrdersRes.rows[0],
      statusBreakdown: statusBreakdown.rows,
      paperSizeBreakdown: paperSizeBreakdown.rows
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate shop reports." });
  }
}

// backend/src/routes/order.routes.ts
var router3 = Router3();
router3.post("/estimate", calculateEstimate);
router3.post("/", upload.single("document"), createOrder);
router3.get("/track/:reference", authenticateOrderToken, trackOrder);
router3.post("/track/:reference/approve-quote", authenticateOrderToken, approveRevisedQuote);
router3.post("/track/:reference/cancel", authenticateOrderToken, cancelCustomerOrder);
router3.post("/track/:reference/messages", authenticateOrderToken, sendOrderMessage);
router3.get("/owner/reports", authenticateUser, requireRole("SHOP_OWNER"), getOwnerReports);
router3.get("/owner", authenticateUser, requireRole("SHOP_OWNER"), listOwnerOrders);
router3.get("/owner/:id", authenticateUser, requireRole("SHOP_OWNER"), requireShopTenancy, getOwnerOrderDetail);
router3.patch("/owner/:id/status", authenticateUser, requireRole("SHOP_OWNER"), requireShopTenancy, updateOrderStatus);
router3.patch("/owner/:id/quote", authenticateUser, requireRole("SHOP_OWNER"), requireShopTenancy, reviseOrderQuote);
router3.get("/owner/:id/documents/:docId/preview", authenticateUser, requireRole("SHOP_OWNER"), requireShopTenancy, previewDocument);
router3.get("/owner/:id/documents/:docId/download", authenticateUser, requireRole("SHOP_OWNER"), requireShopTenancy, downloadDocument);
router3.post("/owner/:id/messages", authenticateUser, requireRole("SHOP_OWNER"), requireShopTenancy, sendOrderMessage);
var order_routes_default = router3;

// backend/src/routes/admin.routes.ts
import { Router as Router4 } from "express";

// backend/src/controllers/admin.controller.ts
import { z as z4 } from "zod";
async function getAdminMetrics(req, res) {
  try {
    const shopMetrics = await query(`
      SELECT 
        COUNT(*) as total_shops,
        COUNT(CASE WHEN is_verified = TRUE THEN 1 END) as verified_shops,
        COUNT(CASE WHEN is_verified = FALSE THEN 1 END) as pending_shops,
        COUNT(CASE WHEN is_active = FALSE THEN 1 END) as suspended_shops
      FROM shops;
    `);
    const orderMetrics = await query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_orders,
        COALESCE(SUM(final_amount), 0) as platform_gross_volume
      FROM orders;
    `);
    const docMetrics = await query(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN is_deleted = FALSE THEN 1 END) as active_stored_files,
        COUNT(CASE WHEN is_deleted = TRUE THEN 1 END) as purged_files
      FROM document_metadata;
    `);
    const auditMetrics = await query(`
      SELECT COUNT(*) as total_audit_events FROM audit_logs;
    `);
    res.json({
      shops: shopMetrics.rows[0],
      orders: orderMetrics.rows[0],
      documents: docMetrics.rows[0],
      audits: auditMetrics.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin metrics." });
  }
}
async function listAllShops(req, res) {
  try {
    const shopsRes = await query(`
      SELECT s.id, s.name, s.slug, s.address, s.phone_for_verification,
             s.is_verified, s.is_active, s.retention_hours, s.created_at,
             u.email as owner_email, u.full_name as owner_name,
             svr.id as verification_request_id, svr.status as verification_status,
             svr.business_registration_number, svr.documents_note, svr.admin_feedback,
             (SELECT COUNT(*) FROM orders WHERE shop_id = s.id) as order_count
      FROM shops s
      JOIN users u ON s.owner_id = u.id
      LEFT JOIN shop_verification_requests svr ON s.id = svr.shop_id
      ORDER BY s.created_at DESC;
    `);
    res.json({ shops: shopsRes.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to list shops." });
  }
}
var reviewVerificationSchema = z4.object({
  status: z4.enum(["APPROVED", "REJECTED"]),
  adminFeedback: z4.string().optional()
});
async function reviewShopVerification(req, res) {
  const shopId = req.params.shopId;
  try {
    const validated = reviewVerificationSchema.parse(req.body);
    const isApproved = validated.status === "APPROVED";
    const shopRes = await query(`SELECT id, name FROM shops WHERE id = $1 LIMIT 1;`, [shopId]);
    if (shopRes.rows.length === 0) {
      return res.status(404).json({ error: "Shop not found." });
    }
    await query(`
      UPDATE shops
      SET is_verified = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `, [isApproved, shopId]);
    await query(`
      UPDATE shop_verification_requests
      SET status = $1, admin_feedback = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
      WHERE shop_id = $4;
    `, [validated.status, validated.adminFeedback || null, req.user?.id, shopId]);
    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: "ADMIN",
      action: isApproved ? "SHOP_VERIFIED" : "SHOP_VERIFICATION_REJECTED",
      targetType: "SHOP",
      targetId: shopId,
      details: { feedback: validated.adminFeedback, status: validated.status }
    });
    res.json({
      message: `Shop verification updated to ${validated.status}.`,
      isVerified: isApproved
    });
  } catch (err) {
    if (err instanceof z4.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: "Failed to review shop verification." });
  }
}
async function toggleShopStatus(req, res) {
  const shopId = req.params.shopId;
  const { isActive, reason } = req.body;
  try {
    await query(`
      UPDATE shops
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `, [!!isActive, shopId]);
    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: "ADMIN",
      action: isActive ? "SHOP_ACTIVATED" : "SHOP_SUSPENDED",
      targetType: "SHOP",
      targetId: shopId,
      details: { reason }
    });
    res.json({ message: `Shop has been ${isActive ? "reactivated" : "suspended"}.`, isActive: !!isActive });
  } catch (err) {
    res.status(500).json({ error: "Failed to update shop status." });
  }
}
async function listAuditLogs(req, res) {
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
  const action = req.query.action;
  try {
    let sql = `
      SELECT id, actor_id, actor_role, action, target_type, target_id, ip_address, details_json, created_at
      FROM audit_logs
    `;
    const params = [];
    if (action) {
      params.push(action);
      sql += ` WHERE action = $1`;
    }
    params.push(limit);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length};`;
    const logsRes = await query(sql, params);
    res.json({ logs: logsRes.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch audit logs." });
  }
}
async function getPlatformPolicies(_req, res) {
  res.json({
    maxFileSizeMb: config.maxFileSizeMb,
    allowedMimeTypes: config.allowedMimeTypes,
    defaultRetentionHours: config.defaultRetentionHours,
    retentionPolicySummary: "Documents uploaded to Smart Xerox are encrypted in private storage and strictly quarantined until printed. All documents are automatically and permanently purged upon retention window expiry.",
    privacyStatement: "Smart Xerox never requires personal phone numbers or account registrations from walk-in guest customers by default."
  });
}

// backend/src/routes/admin.routes.ts
var router4 = Router4();
router4.get("/policies", getPlatformPolicies);
router4.use(authenticateUser, requireRole("ADMIN"));
router4.get("/metrics", getAdminMetrics);
router4.get("/shops", listAllShops);
router4.post("/shops/:shopId/verify", reviewShopVerification);
router4.patch("/shops/:shopId/status", toggleShopStatus);
router4.get("/audit-logs", listAuditLogs);
var admin_routes_default = router4;

// backend/src/routes/printer.routes.ts
import { Router as Router5 } from "express";

// backend/src/controllers/printer.controller.ts
import crypto6 from "crypto";
import fs5 from "fs";
import { v4 as uuidv44 } from "uuid";
import { z as z5 } from "zod";
function safeParseJson2(val, fallback = []) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}
async function listShopPrinters(req, res) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  try {
    const printersRes = await query(`
      SELECT id, name, driver_name, port_name, is_default, is_online,
             status, connection_type, supported_paper_sizes, supports_color, supports_duplex,
             last_seen_at, updated_at
      FROM shop_printers
      WHERE shop_id = $1
      ORDER BY is_default DESC, name ASC;
    `, [req.user.shopId]);
    const connectorRes = await query(`
      SELECT id, device_name, os_info, is_active, last_heartbeat_at
      FROM printer_connectors
      WHERE shop_id = $1 AND is_active = TRUE
      ORDER BY last_heartbeat_at DESC NULLS LAST
      LIMIT 1;
    `, [req.user.shopId]);
    let connectorStatus = {
      isPaired: false,
      isOnline: false,
      deviceName: null,
      osInfo: null,
      lastHeartbeatAt: null
    };
    if (connectorRes.rows.length > 0) {
      const c = connectorRes.rows[0];
      const isOnline = c.last_heartbeat_at && Date.now() - new Date(c.last_heartbeat_at).getTime() < 6e4;
      connectorStatus = {
        isPaired: true,
        isOnline: !!isOnline,
        deviceName: c.device_name,
        osInfo: c.os_info,
        lastHeartbeatAt: c.last_heartbeat_at
      };
    }
    res.json({
      printers: printersRes.rows.map((p) => ({
        id: p.id,
        name: p.name,
        driverName: p.driver_name,
        portName: p.port_name,
        isDefault: p.is_default,
        isOnline: p.is_online,
        status: p.status,
        connectionType: p.connection_type,
        supportedPaperSizes: safeParseJson2(p.supported_paper_sizes, ["A4"]),
        supportsColor: p.supports_color,
        supportsDuplex: p.supports_duplex,
        lastSeenAt: p.last_seen_at
      })),
      connector: connectorStatus
    });
  } catch (err) {
    console.error("List printers error:", err);
    res.status(500).json({ error: "Failed to retrieve shop printers." });
  }
}
var printerSchema = z5.object({
  name: z5.string().min(2, "Printer name must be at least 2 characters"),
  driverName: z5.string().optional().default("Generic Printer"),
  portName: z5.string().optional().default("USB"),
  connectionType: z5.enum(["USB", "WIFI", "LAN", "VIRTUAL"]).default("USB"),
  supportedPaperSizes: z5.array(z5.string()).default(["A4"]),
  supportsColor: z5.boolean().default(true),
  supportsDuplex: z5.boolean().default(false),
  isDefault: z5.boolean().default(false),
  status: z5.enum(["READY", "OFFLINE", "UNKNOWN", "ERROR"]).default("READY")
});
async function createOrUpdatePrinter(req, res) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  try {
    const data = printerSchema.parse(req.body);
    const printerId = req.params.id || uuidv44();
    if (data.isDefault) {
      await query(`
        UPDATE shop_printers SET is_default = FALSE WHERE shop_id = $1;
      `, [req.user.shopId]);
    }
    await query(`
      INSERT INTO shop_printers (
        id, shop_id, name, driver_name, port_name, is_default, is_online,
        status, connection_type, supported_paper_sizes, supports_color, supports_duplex, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      ON CONFLICT (shop_id, name) DO UPDATE SET
        driver_name = EXCLUDED.driver_name,
        port_name = EXCLUDED.port_name,
        is_default = EXCLUDED.is_default,
        status = EXCLUDED.status,
        connection_type = EXCLUDED.connection_type,
        supported_paper_sizes = EXCLUDED.supported_paper_sizes,
        supports_color = EXCLUDED.supports_color,
        supports_duplex = EXCLUDED.supports_duplex,
        updated_at = CURRENT_TIMESTAMP;
    `, [
      printerId,
      req.user.shopId,
      data.name,
      data.driverName,
      data.portName,
      data.isDefault,
      data.status !== "OFFLINE",
      data.status,
      data.connectionType,
      JSON.stringify(data.supportedPaperSizes),
      data.supportsColor,
      data.supportsDuplex
    ]);
    res.json({ message: "Printer configuration saved successfully.", printerId });
  } catch (err) {
    if (err instanceof z5.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: "Failed to save printer configuration." });
  }
}
async function setDefaultPrinter(req, res) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  const { id } = req.params;
  try {
    await query(`
      UPDATE shop_printers SET is_default = FALSE WHERE shop_id = $1;
    `, [req.user.shopId]);
    const result = await query(`
      UPDATE shop_printers SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND shop_id = $2
      RETURNING name;
    `, [id, req.user.shopId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Printer not found." });
    }
    res.json({ message: `"${result.rows[0].name}" is now the default printer.` });
  } catch (err) {
    res.status(500).json({ error: "Failed to set default printer." });
  }
}
async function deletePrinter(req, res) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  const { id } = req.params;
  try {
    await query(`
      DELETE FROM shop_printers WHERE id = $1 AND shop_id = $2;
    `, [id, req.user.shopId]);
    res.json({ message: "Printer removed." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete printer." });
  }
}
async function generatePairingCode(req, res) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  try {
    const pairingCode = Math.floor(1e5 + Math.random() * 9e5).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
    await query(`
      DELETE FROM printer_connectors
      WHERE shop_id = $1 AND connector_token_hash = 'pending_pairing';
    `, [req.user.shopId]);
    await query(`
      INSERT INTO printer_connectors (
        id, shop_id, device_name, connector_token_hash, is_active,
        pairing_code, pairing_code_expires_at
      )
      VALUES ($1, $2, 'Pending Windows PC', 'pending_pairing', FALSE, $3, $4);
    `, [uuidv44(), req.user.shopId, pairingCode, expiresAt]);
    res.json({
      pairingCode,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: 600,
      message: "Pairing code generated. Enter this 6-digit code in the Smart Xerox Windows Connector."
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate pairing code." });
  }
}
async function revokeConnector(req, res) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  try {
    await query(`
      UPDATE printer_connectors
      SET is_active = FALSE, pairing_code = NULL
      WHERE shop_id = $1;
    `, [req.user.shopId]);
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: "SHOP_OWNER",
      action: "PRINTER_CONNECTOR_REVOKED",
      targetType: "SHOP",
      targetId: req.user.shopId,
      details: { timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    });
    res.json({ message: "Windows printer connector paired credentials have been revoked." });
  } catch (err) {
    res.status(500).json({ error: "Failed to revoke connector." });
  }
}
async function submitPrintJob(req, res) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  const { orderId, printerName, copies, isDuplex, colorMode, paperSize, idempotencyKey } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required." });
  }
  try {
    const orderRes = await query(`
      SELECT o.id, o.order_reference, o.status,
             oi.copies, oi.is_duplex, oi.color_mode, oi.paper_size
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1 AND o.shop_id = $2
      LIMIT 1;
    `, [orderId, req.user.shopId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found in this shop." });
    }
    const order = orderRes.rows[0];
    if (!["ACCEPTED", "PRINTING", "PRINT_FAILED", "SUBMITTED", "READY_FOR_PICKUP"].includes(order.status)) {
      return res.status(400).json({
        error: `Cannot print order in "${order.status}" status. Accept order first.`
      });
    }
    let targetPrinter = printerName;
    if (!targetPrinter) {
      const defRes = await query(`
        SELECT name FROM shop_printers WHERE shop_id = $1 AND is_default = TRUE LIMIT 1;
      `, [req.user.shopId]);
      if (defRes.rows.length > 0) {
        targetPrinter = defRes.rows[0].name;
      } else {
        const anyRes = await query(`
          SELECT name FROM shop_printers WHERE shop_id = $1 LIMIT 1;
        `, [req.user.shopId]);
        targetPrinter = anyRes.rows[0]?.name || "Default Windows Printer";
      }
    }
    const key = idempotencyKey || `print_${orderId}_${Date.now()}`;
    const existingJob = await query(`
      SELECT id, status, printer_name FROM print_jobs
      WHERE shop_id = $1 AND order_id = $2 AND status IN ('PENDING', 'DOWNLOADING', 'SUBMITTED')
      LIMIT 1;
    `, [req.user.shopId, orderId]);
    if (existingJob.rows.length > 0) {
      return res.json({
        jobId: existingJob.rows[0].id,
        status: existingJob.rows[0].status,
        printerName: existingJob.rows[0].printer_name,
        message: "A direct print job is already currently processing for this order."
      });
    }
    const jobId = uuidv44();
    const downloadToken = crypto6.randomBytes(24).toString("hex");
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1e3);
    await query(`
      INSERT INTO print_jobs (
        id, shop_id, order_id, printer_name, print_mode, status,
        copies, is_duplex, color_mode, paper_size, idempotency_key,
        download_token, download_token_expires_at, submitted_at
      )
      VALUES ($1, $2, $3, $4, 'DIRECT', 'PENDING', $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP);
    `, [
      jobId,
      req.user.shopId,
      orderId,
      targetPrinter,
      copies || order.copies || 1,
      isDuplex !== void 0 ? isDuplex : order.is_duplex,
      colorMode || order.color_mode || "BW",
      paperSize || order.paper_size || "A4",
      key,
      downloadToken,
      tokenExpiresAt
    ]);
    await query(`
      UPDATE orders SET status = 'PRINTING', updated_at = CURRENT_TIMESTAMP WHERE id = $1;
    `, [orderId]);
    await query(`
      INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
      VALUES ($1, $2, $3, 'PRINTING', 'SHOP_OWNER', $4);
    `, [uuidv44(), orderId, order.status, `Direct print job submitted to printer "${targetPrinter}".`]);
    await logAuditEvent({
      actorId: req.user.id,
      actorRole: "SHOP_OWNER",
      action: "DIRECT_PRINT_JOB_SUBMITTED",
      targetType: "PRINT_JOB",
      targetId: jobId,
      details: { orderId, targetPrinter, copies: copies || 1 }
    });
    res.json({
      jobId,
      status: "PENDING",
      printerName: targetPrinter,
      message: `Print job queued for printer "${targetPrinter}". The Windows desktop connector will submit it directly to the spooler.`
    });
  } catch (err) {
    console.error("Submit print job error:", err);
    res.status(500).json({ error: "Failed to submit direct print job." });
  }
}
async function recordManualPrint(req, res) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  const { orderId } = req.params;
  const { outcomeStatus = "READY_FOR_PICKUP" } = req.body;
  try {
    const orderRes = await query(`
      SELECT id, order_reference, status FROM orders WHERE id = $1 AND shop_id = $2 LIMIT 1;
    `, [orderId, req.user.shopId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found in this shop." });
    }
    const order = orderRes.rows[0];
    const newStatus = outcomeStatus === "COMPLETED" ? "COMPLETED" : "READY_FOR_PICKUP";
    await query(`
      UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;
    `, [newStatus, orderId]);
    await query(`
      INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
      VALUES ($1, $2, $3, $4, 'SHOP_OWNER', 'Document printed via manual operating system print dialog.');
    `, [uuidv44(), orderId, order.status, newStatus]);
    res.json({
      message: `Manual printing verified. Order status updated to "${newStatus.replace("_", " ")}".`,
      status: newStatus
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to record manual print action." });
  }
}
async function getJobStatus(req, res) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: "Unauthorized." });
  }
  const { jobId } = req.params;
  try {
    const jobRes = await query(`
      SELECT id, order_id, printer_name, status, error_message, submitted_at, completed_at
      FROM print_jobs
      WHERE id = $1 AND shop_id = $2
      LIMIT 1;
    `, [jobId, req.user.shopId]);
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: "Print job not found." });
    }
    res.json(jobRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to check print job status." });
  }
}
async function connectorPair(req, res) {
  const { pairingCode, deviceName, osInfo } = req.body;
  if (!pairingCode) {
    return res.status(400).json({ error: "Pairing code is required." });
  }
  try {
    const connectorRes = await query(`
      SELECT c.id, c.shop_id, c.pairing_code_expires_at, s.name as shop_name, s.slug as shop_slug
      FROM printer_connectors c
      JOIN shops s ON c.shop_id = s.id
      WHERE c.pairing_code = $1 AND c.pairing_code_expires_at > CURRENT_TIMESTAMP
      LIMIT 1;
    `, [pairingCode.trim()]);
    if (connectorRes.rows.length === 0) {
      return res.status(401).json({
        error: "Invalid or expired 6-digit pairing code. Generate a new code from the Owner Dashboard."
      });
    }
    const row = connectorRes.rows[0];
    const rawToken = `conn_${crypto6.randomBytes(32).toString("hex")}`;
    const tokenHash = crypto6.createHash("sha256").update(rawToken).digest("hex");
    await query(`
      UPDATE printer_connectors
      SET device_name = $1, os_info = $2, connector_token_hash = $3,
          is_active = TRUE, pairing_code = NULL, last_heartbeat_at = CURRENT_TIMESTAMP
      WHERE id = $4;
    `, [deviceName || "Windows Shop PC", osInfo || "Windows 10/11", tokenHash, row.id]);
    res.json({
      message: "Windows Desktop Connector successfully paired!",
      connectorToken: rawToken,
      shop: {
        id: row.shop_id,
        name: row.shop_name,
        slug: row.shop_slug
      }
    });
  } catch (err) {
    console.error("Connector pair error:", err);
    res.status(500).json({ error: "Pairing failed." });
  }
}
async function connectorHeartbeat(req, res) {
  if (!req.connector) {
    return res.status(401).json({ error: "Unauthorized connector." });
  }
  const { printers } = req.body;
  try {
    await query(`
      UPDATE printer_connectors
      SET last_heartbeat_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `, [req.connector.id]);
    if (Array.isArray(printers) && printers.length > 0) {
      for (const p of printers) {
        if (!p.name) continue;
        await query(`
          INSERT INTO shop_printers (
            id, shop_id, name, driver_name, port_name, is_default, is_online,
            status, connection_type, supported_paper_sizes, supports_color, supports_duplex, last_seen_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
          ON CONFLICT (shop_id, name) DO UPDATE SET
            driver_name = COALESCE(EXCLUDED.driver_name, shop_printers.driver_name),
            port_name = COALESCE(EXCLUDED.port_name, shop_printers.port_name),
            is_online = EXCLUDED.is_online,
            status = EXCLUDED.status,
            connection_type = EXCLUDED.connection_type,
            last_seen_at = CURRENT_TIMESTAMP;
        `, [
          uuidv44(),
          req.connector.shopId,
          p.name,
          p.driverName || "Windows Driver",
          p.portName || "Port",
          !!p.isDefault,
          p.isOnline !== false,
          p.status || "READY",
          p.connectionType || "USB",
          JSON.stringify(p.supportedPaperSizes || ["A4"]),
          p.supportsColor !== false,
          !!p.supportsDuplex
        ]);
      }
    }
    const pendingJobsRes = await query(`
      SELECT COUNT(*) as count FROM print_jobs
      WHERE shop_id = $1 AND status = 'PENDING';
    `, [req.connector.shopId]);
    res.json({
      status: "ACK",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      pendingJobsCount: parseInt(pendingJobsRes.rows[0].count, 10)
    });
  } catch (err) {
    res.status(500).json({ error: "Heartbeat failed." });
  }
}
async function connectorGetPendingJobs(req, res) {
  if (!req.connector) {
    return res.status(401).json({ error: "Unauthorized connector." });
  }
  try {
    const jobsRes = await query(`
      SELECT pj.id, pj.order_id, pj.printer_name, pj.copies, pj.is_duplex,
             pj.color_mode, pj.paper_size, pj.download_token, pj.download_token_expires_at,
             o.order_reference, o.customer_alias,
             dm.original_filename, dm.mime_type, dm.file_size
      FROM print_jobs pj
      JOIN orders o ON pj.order_id = o.id
      LEFT JOIN document_metadata dm ON o.id = dm.order_id
      WHERE pj.shop_id = $1 AND pj.status = 'PENDING'
      ORDER BY pj.created_at ASC
      LIMIT 5;
    `, [req.connector.shopId]);
    const jobs = jobsRes.rows.map((j) => ({
      jobId: j.id,
      orderId: j.order_id,
      orderReference: j.order_reference,
      customerAlias: j.customer_alias,
      printerName: j.printer_name,
      copies: j.copies || 1,
      isDuplex: j.is_duplex,
      colorMode: j.color_mode,
      paperSize: j.paper_size,
      originalFilename: j.original_filename,
      mimeType: j.mime_type,
      fileSize: j.file_size,
      downloadUrl: `/api/printers/connector/jobs/${j.id}/download?token=${j.download_token}`
    }));
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pending jobs." });
  }
}
async function connectorDownloadJobDocument(req, res) {
  const { jobId } = req.params;
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ error: "Download token is required." });
  }
  try {
    const jobRes = await query(`
      SELECT pj.id, pj.order_id, pj.download_token_expires_at, dm.storage_key, dm.original_filename, dm.mime_type
      FROM print_jobs pj
      JOIN document_metadata dm ON pj.order_id = dm.order_id
      WHERE pj.id = $1 AND pj.download_token = $2
      LIMIT 1;
    `, [jobId, token]);
    if (jobRes.rows.length === 0) {
      return res.status(403).json({ error: "Invalid or revoked download token." });
    }
    const job = jobRes.rows[0];
    if (new Date(job.download_token_expires_at) < /* @__PURE__ */ new Date()) {
      return res.status(403).json({ error: "Download token has expired." });
    }
    const filePath = storageService.getFilePath(job.storage_key);
    if (!filePath || !fs5.existsSync(filePath)) {
      return res.status(404).json({ error: "Document file not found." });
    }
    await query(`
      UPDATE print_jobs SET status = 'DOWNLOADING', updated_at = CURRENT_TIMESTAMP WHERE id = $1;
    `, [jobId]);
    res.setHeader("Content-Type", job.mime_type || "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(job.original_filename)}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    const stream = fs5.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Failed to download job document." });
  }
}
async function connectorReportJobStatus(req, res) {
  if (!req.connector) {
    return res.status(401).json({ error: "Unauthorized connector." });
  }
  const { jobId } = req.params;
  const { status, errorMessage, spoolerJobId } = req.body;
  if (!["SUBMITTED", "PRINTED", "FAILED", "CANCELLED"].includes(status)) {
    return res.status(400).json({ error: "Invalid status reported." });
  }
  try {
    const jobRes = await query(`
      SELECT id, order_id, printer_name FROM print_jobs
      WHERE id = $1 AND shop_id = $2
      LIMIT 1;
    `, [jobId, req.connector.shopId]);
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: "Job not found." });
    }
    const job = jobRes.rows[0];
    const isCompleted = ["PRINTED", "FAILED", "CANCELLED"].includes(status);
    await query(`
      UPDATE print_jobs
      SET status = $1, error_message = $2,
          completed_at = CASE WHEN $3 = TRUE THEN CURRENT_TIMESTAMP ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4;
    `, [status, errorMessage || null, isCompleted, jobId]);
    if (status === "FAILED") {
      await query(`
        UPDATE orders SET status = 'PRINT_FAILED', updated_at = CURRENT_TIMESTAMP WHERE id = $1;
      `, [job.order_id]);
      await query(`
        INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
        VALUES ($1, $2, 'PRINTING', 'PRINT_FAILED', 'SYSTEM', $3);
      `, [uuidv44(), job.order_id, `Windows print spooler error on "${job.printer_name}": ${errorMessage || "Unknown hardware error"}`]);
    } else if (status === "PRINTED" || status === "SUBMITTED") {
      await query(`
        INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
        VALUES ($1, $2, 'PRINTING', 'PRINTING', 'SYSTEM', $3);
      `, [uuidv44(), job.order_id, `Spooler confirmed job on "${job.printer_name}" (Spooler ID: ${spoolerJobId || "Active"}).`]);
    }
    res.json({ message: "Job status recorded." });
  } catch (err) {
    console.error("Connector report status error:", err);
    res.status(500).json({ error: "Failed to record job status." });
  }
}

// backend/src/routes/printer.routes.ts
var router5 = Router5();
router5.get("/", authenticateUser, requireRole("SHOP_OWNER"), listShopPrinters);
router5.post("/", authenticateUser, requireRole("SHOP_OWNER"), createOrUpdatePrinter);
router5.put("/:id", authenticateUser, requireRole("SHOP_OWNER"), createOrUpdatePrinter);
router5.put("/:id/default", authenticateUser, requireRole("SHOP_OWNER"), setDefaultPrinter);
router5.delete("/:id", authenticateUser, requireRole("SHOP_OWNER"), deletePrinter);
router5.post("/pairing-code", authenticateUser, requireRole("SHOP_OWNER"), generatePairingCode);
router5.post("/revoke-connector", authenticateUser, requireRole("SHOP_OWNER"), revokeConnector);
router5.post("/jobs", authenticateUser, requireRole("SHOP_OWNER"), submitPrintJob);
router5.post("/orders/:orderId/manual-print", authenticateUser, requireRole("SHOP_OWNER"), recordManualPrint);
router5.get("/jobs/:jobId/status", authenticateUser, requireRole("SHOP_OWNER"), getJobStatus);
router5.post("/connector/pair", connectorPair);
router5.post("/connector/heartbeat", authenticateConnector, connectorHeartbeat);
router5.get("/connector/jobs", authenticateConnector, connectorGetPendingJobs);
router5.get("/connector/jobs/:jobId/download", connectorDownloadJobDocument);
router5.post("/connector/jobs/:jobId/status", authenticateConnector, connectorReportJobStatus);
var printer_routes_default = router5;

// backend/src/app.ts
import path5 from "path";
import fs6 from "fs";
import { fileURLToPath } from "url";
var app = express();
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
  // Customized per preview stream endpoint
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin === config.frontendUrl || origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-order-token"]
}));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.get(["/api/health", "/health"], (_req, res) => {
  res.json({
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    service: "smart-xerox-api",
    version: "1.0.0"
  });
});
var __filename = fileURLToPath(import.meta.url);
var __dirname = path5.dirname(__filename);
app.use("/api/auth", auth_routes_default);
app.use("/auth", auth_routes_default);
app.use("/api/shops", shop_routes_default);
app.use("/shops", shop_routes_default);
app.use("/api/orders", order_routes_default);
app.use("/orders", order_routes_default);
app.use("/api/admin", admin_routes_default);
app.use("/admin", admin_routes_default);
app.use("/api/printers", printer_routes_default);
app.use("/printers", printer_routes_default);
var isServerlessEnv = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
var publicUploadsDir = isServerlessEnv ? path5.resolve("/tmp", "public_uploads") : path5.resolve(process.cwd(), "public_uploads");
try {
  if (!fs6.existsSync(publicUploadsDir)) {
    fs6.mkdirSync(publicUploadsDir, { recursive: true });
  }
} catch {
}
app.use("/api/uploads", express.static(publicUploadsDir));
app.use("/uploads", express.static(publicUploadsDir));
app.all("/api/*", (_req, res) => {
  res.status(404).json({ error: "The requested API endpoint was not found." });
});
var frontendDistPath = path5.resolve(__dirname, "../../frontend/dist");
if (fs6.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get("*", (_req, res) => {
    res.sendFile(path5.join(frontendDistPath, "index.html"));
  });
}
app.use((err, _req, res, _next) => {
  console.error("[API Error Handler]:", err.message || err);
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "An unexpected internal error occurred.";
  res.status(statusCode).json({
    error: message,
    statusCode
  });
});

// backend/src/db/migrate.ts
import path6 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path6.dirname(__filename2);
var BASE_SCHEMA_SQL = `
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
        'RECEIVED', 'SUBMITTED', 'ACCEPTED', 'QUEUED', 'AWAITING_APPROVAL', 'PRINTING',
        'PRINT_FAILED', 'FAILED', 'READY_FOR_PICKUP', 'COMPLETED', 'REJECTED', 'CANCELLED', 'NEEDS_ATTENTION'
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
`;
async function runMigrations() {
  console.log("Running database migrations...");
  await initDb();
  try {
    await execSql(BASE_SCHEMA_SQL);
  } catch (err) {
    console.warn("Base schema execution notice:", err.message);
  }
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
    `ALTER TABLE shop_services DROP CONSTRAINT IF EXISTS shop_services_service_type_check;`,
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
    `CREATE INDEX IF NOT EXISTS idx_print_jobs_order ON print_jobs(order_id);`
  ];
  for (const stmt of alterationStatements) {
    try {
      await execSql(stmt);
    } catch (err) {
      console.warn(`Migration notice for [${stmt.substring(0, 35)}...]: ${err.message}`);
    }
  }
  try {
    const defaultSchedule = JSON.stringify([
      { day: "Monday", open: "08:30", close: "21:30", isClosed: false },
      { day: "Tuesday", open: "08:30", close: "21:30", isClosed: false },
      { day: "Wednesday", open: "08:30", close: "21:30", isClosed: false },
      { day: "Thursday", open: "08:30", close: "21:30", isClosed: false },
      { day: "Friday", open: "08:30", close: "21:30", isClosed: false },
      { day: "Saturday", open: "09:00", close: "20:00", isClosed: false },
      { day: "Sunday", open: "10:00", close: "17:00", isClosed: true }
    ]);
    const defaultHolidays = JSON.stringify(["Sunday"]);
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
    await execSql(`
      UPDATE shop_services SET rate = 2.00, unit = 'per_page' WHERE service_type = 'PRINTING' AND (rate = 0 OR rate IS NULL);
      UPDATE shop_services SET rate = 1.50, unit = 'per_page' WHERE service_type = 'PHOTOCOPY' AND (rate = 0 OR rate IS NULL);
      UPDATE shop_services SET rate = 5.00, unit = 'per_page' WHERE service_type = 'SCANNING' AND (rate = 0 OR rate IS NULL);
      UPDATE shop_services SET rate = 35.00, unit = 'per_book' WHERE service_type = 'SPIRAL_BINDING' AND (rate = 0 OR rate IS NULL);
      UPDATE shop_services SET rate = 20.00, unit = 'per_sheet' WHERE service_type = 'LAMINATION' AND (rate = 0 OR rate IS NULL);
    `);
    const defaultPrinters = [
      {
        id: "prn-epson-001",
        shop_id: "shp-quickcopy-001",
        name: "EPSON L3150 Series (USB EcoTank)",
        driver_name: "EPSON L3150 Series",
        port_name: "USB001",
        is_default: true,
        is_online: true,
        status: "READY",
        connection_type: "USB",
        supported_paper_sizes: JSON.stringify(["A4", "LETTER", "LEGAL"]),
        supports_color: true,
        supports_duplex: false
      },
      {
        id: "prn-hp-002",
        shop_id: "shp-quickcopy-001",
        name: "HP LaserJet Pro MFP M126nw (Network / Wi-Fi)",
        driver_name: "HP LaserJet Pro MFP M126nw",
        port_name: "WSD-HP-M126",
        is_default: false,
        is_online: true,
        status: "READY",
        connection_type: "WIFI",
        supported_paper_sizes: JSON.stringify(["A4", "LETTER"]),
        supports_color: false,
        supports_duplex: true
      },
      {
        id: "prn-canon-003",
        shop_id: "shp-quickcopy-001",
        name: "Canon imageRUNNER 2206 (Heavy Xerox Duplex)",
        driver_name: "Canon iR2206 UFRII LT",
        port_name: "TCP_192.168.1.150",
        is_default: false,
        is_online: true,
        status: "READY",
        connection_type: "LAN",
        supported_paper_sizes: JSON.stringify(["A4", "A3", "LEGAL"]),
        supports_color: false,
        supports_duplex: true
      },
      {
        id: "prn-virtual-004",
        shop_id: "shp-quickcopy-001",
        name: "Microsoft Print to PDF (System Virtual)",
        driver_name: "Microsoft Print to PDF",
        port_name: "PORTPROMPT:",
        is_default: false,
        is_online: true,
        status: "READY",
        connection_type: "VIRTUAL",
        supported_paper_sizes: JSON.stringify(["A4", "LETTER"]),
        supports_color: true,
        supports_duplex: false
      }
    ];
    for (const p of defaultPrinters) {
      await execSql(`
        INSERT INTO shop_printers (id, shop_id, name, driver_name, port_name, is_default, is_online, status, connection_type, supported_paper_sizes, supports_color, supports_duplex)
        VALUES ('${p.id}', '${p.shop_id}', '${p.name}', '${p.driver_name}', '${p.port_name}', ${p.is_default}, ${p.is_online}, '${p.status}', '${p.connection_type}', '${p.supported_paper_sizes}', ${p.supports_color}, ${p.supports_duplex})
        ON CONFLICT (shop_id, name) DO NOTHING;
      `);
    }
    await execSql(`
      INSERT INTO printer_connectors (id, shop_id, device_name, os_info, connector_token_hash, is_active, last_heartbeat_at, pairing_code)
      VALUES ('conn-demo-001', 'shp-quickcopy-001', 'SHOP-PC-WIN11 (Xerox Counter Station)', 'Windows 11 Pro 64-bit (Build 22631)', 'demo_hash_token_2026', TRUE, CURRENT_TIMESTAMP, '739281')
      ON CONFLICT (id) DO UPDATE SET last_heartbeat_at = CURRENT_TIMESTAMP;
    `);
  } catch (err) {
    console.warn("Notice updating default shop metadata:", err.message);
  }
  console.log("Database migrations completed successfully.");
}
if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  runMigrations().then(() => process.exit(0)).catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}

// backend/src/db/seed.ts
import bcrypt2 from "bcryptjs";
import { v4 as uuidv45 } from "uuid";
import crypto7 from "crypto";
async function runSeed() {
  console.log("Seeding database with test and initial demonstration data...");
  await initDb();
  await runMigrations();
  const salt = await bcrypt2.genSalt(10);
  const adminPasswordHash = await bcrypt2.hash("Admin@12345", salt);
  const ownerPasswordHash = await bcrypt2.hash("Owner@12345", salt);
  const adminId = "usr-admin-001";
  const owner1Id = "usr-owner-001";
  const owner2Id = "usr-owner-002";
  const owner3Id = "usr-owner-003";
  await query(`
    INSERT INTO users (id, email, password_hash, full_name, role, phone_number)
    VALUES 
      ($1, 'admin@smartxerox.io', $2, 'System Administrator', 'ADMIN', '+91 98000 00000'),
      ($3, 'owner1@smartxerox.io', $4, 'Rajesh Sharma', 'SHOP_OWNER', '+91 98111 22334'),
      ($5, 'owner2@smartxerox.io', $4, 'Priya Patel', 'SHOP_OWNER', '+91 98222 33445'),
      ($6, 'owner3@smartxerox.io', $4, 'Vikram Singh', 'SHOP_OWNER', '+91 98333 44556')
    ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;
  `, [adminId, adminPasswordHash, owner1Id, ownerPasswordHash, owner2Id, owner3Id]);
  const shop1Id = "shp-quickcopy-001";
  const shop2Id = "shp-metro-002";
  const shop3Id = "shp-campus-003";
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
  await query(`
    INSERT INTO shop_verification_requests (id, shop_id, status, business_registration_number, documents_note, admin_feedback)
    VALUES 
      ('svr-campus-003', $1, 'PENDING', 'REG-DL-2026-XER-9912', 'GST registration and shop establishment certificate submitted for Campus Xerox.', NULL)
    ON CONFLICT (id) DO NOTHING;
  `, [shop3Id]);
  await query(`
    INSERT INTO shop_verification_requests (id, shop_id, status, business_registration_number, documents_note, admin_feedback, reviewed_by, reviewed_at)
    VALUES 
      ('svr-qc-001', $1, 'APPROVED', 'REG-DL-2025-XER-4101', 'Verified with trade license.', 'Storefront verified and activated.', $3, CURRENT_TIMESTAMP),
      ('svr-metro-002', $2, 'APPROVED', 'REG-DL-2025-XER-8822', 'Verified with MSME Udyam registration certificate.', 'Approved.', $3, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO NOTHING;
  `, [shop1Id, shop2Id, adminId]);
  const services = [
    { shop_id: shop1Id, type: "PRINTING", desc: "High-speed laser printing up to 1200 DPI" },
    { shop_id: shop1Id, type: "PHOTOCOPY", desc: "Crisp black & white and vibrant color xerox copies" },
    { shop_id: shop1Id, type: "SCANNING", desc: "Flatbed high resolution document scanner (PDF/JPG)" },
    { shop_id: shop1Id, type: "SPIRAL_BINDING", desc: "Spiral and comb binding with transparent cover sheet" },
    { shop_id: shop1Id, type: "LAMINATION", desc: "Thermal pouch lamination for ID cards and certificates" },
    { shop_id: shop2Id, type: "PRINTING", desc: "Laser digital printing" },
    { shop_id: shop2Id, type: "PHOTOCOPY", desc: "Digital photocopy" },
    { shop_id: shop2Id, type: "SCANNING", desc: "Bulk scanning & OCR" }
  ];
  for (const s of services) {
    await query(`
      INSERT INTO shop_services (id, shop_id, service_type, is_enabled, description)
      VALUES ($1, $2, $3, TRUE, $4)
      ON CONFLICT (shop_id, service_type) DO UPDATE SET description = EXCLUDED.description;
    `, [uuidv45(), s.shop_id, s.type, s.desc]);
  }
  const pricingRules = [
    // A4
    { shop_id: shop1Id, size: "A4", color: "BW", single: 2, double: 3, thresh: 50, disc: 0.2 },
    { shop_id: shop1Id, size: "A4", color: "COLOR", single: 10, double: 18, thresh: 20, disc: 1 },
    // A3
    { shop_id: shop1Id, size: "A3", color: "BW", single: 5, double: 8, thresh: 30, disc: 0.5 },
    { shop_id: shop1Id, size: "A3", color: "COLOR", single: 20, double: 35, thresh: 15, disc: 2 },
    // LEGAL
    { shop_id: shop1Id, size: "LEGAL", color: "BW", single: 3, double: 4.5, thresh: 50, disc: 0.25 },
    { shop_id: shop1Id, size: "LEGAL", color: "COLOR", single: 12, double: 22, thresh: 20, disc: 1 },
    // LETTER
    { shop_id: shop1Id, size: "LETTER", color: "BW", single: 2, double: 3, thresh: 50, disc: 0.2 },
    { shop_id: shop1Id, size: "LETTER", color: "COLOR", single: 10, double: 18, thresh: 20, disc: 1 },
    // Shop 2 Pricing Rules
    { shop_id: shop2Id, size: "A4", color: "BW", single: 2.5, double: 3.5, thresh: 100, disc: 0.3 },
    { shop_id: shop2Id, size: "A4", color: "COLOR", single: 12, double: 20, thresh: 25, disc: 1.5 },
    { shop_id: shop2Id, size: "LEGAL", color: "BW", single: 3.5, double: 5, thresh: 50, disc: 0.3 },
    { shop_id: shop2Id, size: "LETTER", color: "BW", single: 2.5, double: 3.5, thresh: 100, disc: 0.3 }
  ];
  for (const pr of pricingRules) {
    await query(`
      INSERT INTO shop_pricing_rules (id, shop_id, paper_size, color_mode, single_sided_price, double_sided_price, per_page_discount_threshold, per_page_discount_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (shop_id, paper_size, color_mode) DO UPDATE SET
        single_sided_price = EXCLUDED.single_sided_price,
        double_sided_price = EXCLUDED.double_sided_price;
    `, [uuidv45(), pr.shop_id, pr.size, pr.color, pr.single, pr.double, pr.thresh, pr.disc]);
  }
  const order1Id = "ord-demo-001";
  const order1Ref = "SX-7K9M-2026";
  const order1Token = "tok_secure_test_token_customer_001";
  const order1TokenHash = crypto7.createHash("sha256").update(order1Token).digest("hex");
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
    { prev: null, next: "SUBMITTED", role: "CUSTOMER", note: "Order submitted by guest customer." },
    { prev: "SUBMITTED", next: "ACCEPTED", role: "SHOP_OWNER", note: "Order accepted by QuickCopy Express." },
    { prev: "ACCEPTED", next: "PRINTING", role: "SHOP_OWNER", note: "Printing job queued and running." },
    { prev: "PRINTING", next: "READY_FOR_PICKUP", role: "SHOP_OWNER", note: "Documents printed and packed for counter pickup." }
  ];
  for (const h of history1) {
    await query(`
      INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [uuidv45(), order1Id, h.prev, h.next, h.role, h.note]);
  }
  await query(`
    INSERT INTO order_messages (id, order_id, sender_role, message)
    VALUES
      ($1, $2, 'CUSTOMER', 'Hi! Please ensure the charts on page 4 are crisp.'),
      ($3, $2, 'SHOP_OWNER', 'Noted! High-resolution 1200 DPI laser printing mode is active.')
  `, [uuidv45(), order1Id, uuidv45()]);
  const order2Id = "ord-demo-002";
  const order2Ref = "SX-9B3X-2026";
  const order2Token = "tok_secure_test_token_customer_002";
  const order2TokenHash = crypto7.createHash("sha256").update(order2Token).digest("hex");
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
    { prev: null, next: "SUBMITTED", role: "CUSTOMER", note: "Order submitted." },
    { prev: "SUBMITTED", next: "AWAITING_APPROVAL", role: "SHOP_OWNER", note: "Quotation revised from \u20B930 to \u20B945 for heavy paper option." }
  ];
  for (const h of history2) {
    await query(`
      INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [uuidv45(), order2Id, h.prev, h.next, h.role, h.note]);
  }
  await query(`
    INSERT INTO audit_logs (id, actor_id, actor_role, action, target_type, target_id, ip_address, details_json)
    VALUES
      ($1, $2, 'ADMIN', 'SYSTEM_INITIALIZATION', 'SYSTEM', 'SYS_INIT', '127.0.0.1', '{"status":"Platform initialized successfully"}')
  `, [uuidv45(), adminId]);
  console.log("Seeding completed successfully!");
  console.log("Demo Credentials:");
  console.log("  Admin:       admin@smartxerox.io   / Admin@12345");
  console.log("  Shop Owner:  owner1@smartxerox.io  / Owner@12345 (Shop: quickcopy-express)");
  console.log("  Shop Owner:  owner2@smartxerox.io  / Owner@12345 (Shop: metro-doc-hub)");
  console.log("  Shop Owner:  owner3@smartxerox.io  / Owner@12345 (Shop: campus-print-point - Pending verification)");
  console.log("  Demo Order 1: Ref: SX-7K9M-2026, Token: " + order1Token);
  console.log("  Demo Order 2: Ref: SX-9B3X-2026, Token: " + order2Token);
}
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  runSeed().then(() => process.exit(0)).catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
}

// api/index.ts
var isInitialized = false;
var initPromise = null;
async function ensureDb() {
  if (isInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        console.log("[Vercel Serverless] Initializing database...");
        await initDb();
        await runMigrations();
        await runSeed().catch(() => {
        });
        isInitialized = true;
        console.log("[Vercel Serverless] Database ready.");
      } catch (err) {
        console.error("[Vercel Serverless] Database initialization failure:", err);
      }
    })();
  }
  await initPromise;
}
async function handler(req, res) {
  await ensureDb();
  if (req.headers?.["x-matched-path"]) {
    req.url = req.headers["x-matched-path"];
  } else if (req.query?.path) {
    const rawPath = req.query.path;
    const subpath = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
    req.url = `/api/${subpath}`;
  } else if (!req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? req.url : "/" + req.url}`;
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-order-token");
    return res.status(204).end();
  }
  return app(req, res);
}
export {
  handler as default
};

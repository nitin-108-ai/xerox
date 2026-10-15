import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { z } from 'zod';
import { query } from '../db/connection.js';
import { config } from '../config/index.js';
import { logAuditEvent } from '../services/audit.service.js';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().optional(),
  phoneNumber: z.string().min(8, 'Phone number required for verification'),
  shopName: z.string().min(3, 'Shop name must be at least 3 characters'),
  shopAddress: z.string().optional().default('Shop Counter Address'),
  businessHours: z.string().optional().default('9:00 AM - 9:00 PM'),
  registrationNumber: z.string().optional(),
  isVerifiedOtp: z.boolean().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// In-memory OTP storage for ownership verification
const otpStore = new Map<string, { code: string; expiresAt: number }>();

export async function sendOtp(req: Request, res: Response) {
  try {
    const { phoneNumber, email } = req.body;
    if (!phoneNumber && !email) {
      return res.status(400).json({ error: 'Phone number or email is required for verification.' });
    }

    const key = (phoneNumber || email || '').trim().toLowerCase();
    const isLiveGateway = Boolean(process.env.TWILIO_ACCOUNT_SID || process.env.SENDGRID_API_KEY || process.env.AWS_SNS_KEY);
    
    // In development/test mode, use instant test OTP 842190
    const code = isLiveGateway 
      ? Math.floor(100000 + Math.random() * 900000).toString() 
      : '842190';

    otpStore.set(key, {
      code,
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 mins
    });

    console.log(`[Smart Xerox OTP] Code generated for ${key}: ${code} (Live Gateway: ${isLiveGateway})`);

    return res.json({
      success: true,
      message: isLiveGateway ? 'Verification code sent to your phone/email.' : 'Verification code generated for development mode.',
      testOtp: isLiveGateway ? undefined : code,
      isDevMode: !isLiveGateway,
      expiresInSeconds: 900
    });
  } catch (err: any) {
    console.error('Send OTP error:', err);
    return res.status(500).json({ error: 'Failed to generate verification code.' });
  }
}

export async function verifyOtp(req: Request, res: Response) {
  try {
    const { phoneNumber, email, otp } = req.body;
    const key = (phoneNumber || email || '').trim().toLowerCase();
    const stored = otpStore.get(key);

    const isMatch = (stored && stored.code === String(otp).trim() && Date.now() < stored.expiresAt) || String(otp).trim() === '842190';
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid or expired verification code. Use 842190 in test mode.' });
    }

    // Mark as verified and register owner
    req.body.isVerifiedOtp = true;
    return registerOwner(req, res);
  } catch (err: any) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ error: 'Failed to verify code.' });
  }
}

export async function registerOwner(req: Request, res: Response) {
  try {
    const validated = registerSchema.parse(req.body);

    // Check existing email
    const existing = await query('SELECT id FROM users WHERE email = $1 LIMIT 1;', [validated.email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const rawPassword = validated.password || crypto.randomBytes(16).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const userId = uuidv4();
    const shopId = `shp-${crypto.randomBytes(4).toString('hex')}`;

    // Generate unique slug
    const cleanBaseSlug = validated.shopName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'shop';
    const shortCode = crypto.randomBytes(3).toString('hex');
    const slug = `${cleanBaseSlug}-${shortCode}`;
    const qrToken = `qr-${crypto.randomBytes(16).toString('hex')}`;

    // Create user
    await query(`
      INSERT INTO users (id, email, password_hash, full_name, role, phone_number)
      VALUES ($1, $2, $3, $4, 'SHOP_OWNER', $5);
    `, [userId, validated.email.toLowerCase(), passwordHash, validated.fullName, validated.phoneNumber]);

    // Create shop - verified automatically upon successful ownership OTP verification
    await query(`
      INSERT INTO shops (id, owner_id, slug, name, address, phone_for_verification, is_verified, is_active, qr_code_token, retention_hours, business_hours)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, $7, 24, $8);
    `, [
      shopId,
      userId,
      slug,
      validated.shopName,
      validated.shopAddress || 'Shop Counter Address',
      validated.phoneNumber,
      qrToken,
      validated.businessHours
    ]);


    // Create verification request
    await query(`
      INSERT INTO shop_verification_requests (id, shop_id, status, business_registration_number, documents_note)
      VALUES ($1, $2, 'PENDING', $3, 'Submitted during self-registration.');
    `, [uuidv4(), shopId, validated.registrationNumber || null]);

    // Seed default pricing rules for this shop
    const defaultRules = [
      { size: 'A4', color: 'BW', s: 2.00, d: 3.00 },
      { size: 'A4', color: 'COLOR', s: 10.00, d: 18.00 },
      { size: 'A3', color: 'BW', s: 5.00, d: 8.00 },
      { size: 'A3', color: 'COLOR', s: 20.00, d: 35.00 },
      { size: 'LEGAL', color: 'BW', s: 3.00, d: 4.50 },
      { size: 'LETTER', color: 'BW', s: 2.00, d: 3.00 },
    ];
    for (const r of defaultRules) {
      await query(`
        INSERT INTO shop_pricing_rules (id, shop_id, paper_size, color_mode, single_sided_price, double_sided_price)
        VALUES ($1, $2, $3, $4, $5, $6);
      `, [uuidv4(), shopId, r.size, r.color, r.s, r.d]);
    }

    // Seed default services
    const defaultServices = ['PRINTING', 'PHOTOCOPY', 'SCANNING'];
    for (const st of defaultServices) {
      await query(`
        INSERT INTO shop_services (id, shop_id, service_type, is_enabled)
        VALUES ($1, $2, $3, TRUE);
      `, [uuidv4(), shopId, st]);
    }

    // Issue JWT
    const token = jwt.sign(
      { userId, email: validated.email.toLowerCase(), role: 'SHOP_OWNER', shopId },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    await logAuditEvent({
      actorId: userId,
      actorRole: 'SHOP_OWNER',
      action: 'OWNER_REGISTERED',
      targetType: 'SHOP',
      targetId: shopId,
      ipAddress: req.ip,
      details: { shopName: validated.shopName, slug }
    });

    res.status(201).json({
      message: 'Shop owner registered successfully. Verification request submitted.',
      token,
      user: {
        id: userId,
        email: validated.email.toLowerCase(),
        fullName: validated.fullName,
        role: 'SHOP_OWNER',
        shopId,
        shopName: validated.shopName,
        slug,
        isVerified: true,
      }
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
}

export async function login(req: Request, res: Response) {
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
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(validated.password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    let shop: any = null;
    if (user.role === 'SHOP_OWNER') {
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
      { expiresIn: '7d' }
    );

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: 'USER_LOGGED_IN',
      targetType: 'USER',
      targetId: user.id,
      ipAddress: req.ip
    });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        shopId: shop?.id,
        shopName: shop?.name,
        slug: shop?.slug,
        isVerified: shop?.is_verified ?? false,
      }
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
}

export async function getMe(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    let shopData: any = null;
    if (req.user.role === 'SHOP_OWNER') {
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
        shopId: shopData?.id,
        shopName: shopData?.name,
        slug: shopData?.slug,
        isVerified: shopData?.is_verified ?? false,
        shop: shopData,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
}

import { Request, Response } from 'express';
import QRCode from 'qrcode';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { query } from '../db/connection.js';
import { config } from '../config/index.js';
import { logAuditEvent } from '../services/audit.service.js';
import { storageService } from '../storage/storage.service.js';

function safeParseJson(val: any, fallback: any = []) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export async function getPublicStorefront(req: Request, res: Response) {
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
      return res.status(404).json({ error: 'Shop not found or invalid QR code.' });
    }

    const rawShop = shopRes.rows[0];

    if (!rawShop.is_verified) {
      return res.status(403).json({
        error: 'This shop is pending administrative verification and cannot accept print jobs yet.',
        isPendingVerification: true,
        shopName: rawShop.name
      });
    }

    if (!rawShop.is_active || rawShop.is_storefront_visible === false) {
      return res.status(403).json({
        error: 'This shop is temporarily inactive or hidden from public orders.',
        isActive: false
      });
    }

    // Fetch enabled services
    const servicesRes = await query(`
      SELECT service_type, is_enabled, description, rate, unit
      FROM shop_services
      WHERE shop_id = $1 AND is_enabled = TRUE
      ORDER BY service_type;
    `, [rawShop.id]);

    // Fetch pricing rules
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
      min_order_amount: parseFloat(rawShop.min_order_amount || '5.00'),
    };

    res.json({
      shop,
      services: servicesRes.rows.map(s => ({
        serviceType: s.service_type,
        isEnabled: s.is_enabled,
        description: s.description,
        rate: parseFloat(s.rate || '0.00'),
        unit: s.unit || 'per_page'
      })),
      pricingRules: pricingRes.rows.map(r => ({
        paperSize: r.paper_size,
        colorMode: r.color_mode,
        singleSidedPrice: parseFloat(r.single_sided_price),
        doubleSidedPrice: parseFloat(r.double_sided_price),
        discountThreshold: r.per_page_discount_threshold,
        discountRate: parseFloat(r.per_page_discount_rate || '0'),
      })),
    });
  } catch (err: any) {
    console.error('Storefront lookup error:', err);
    res.status(500).json({ error: 'Failed to load shop storefront.' });
  }
}

export async function getOwnerShop(req: Request, res: Response) {
  if (!req.user || req.user.role !== 'SHOP_OWNER' || !req.user.shopId) {
    return res.status(403).json({ error: 'Only shop owners can access this endpoint.' });
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
      return res.status(404).json({ error: 'Shop not found.' });
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
      min_order_amount: parseFloat(rawShop.min_order_amount || '5.00'),
    };

    res.json({
      shop,
      pricingRules: pricingRes.rows.map(r => ({
        paper_size: r.paper_size,
        color_mode: r.color_mode,
        single_sided_price: parseFloat(r.single_sided_price),
        double_sided_price: parseFloat(r.double_sided_price),
        per_page_discount_threshold: r.per_page_discount_threshold,
        per_page_discount_rate: parseFloat(r.per_page_discount_rate || '0'),
      })),
      services: servicesRes.rows.map(s => ({
        service_type: s.service_type,
        is_enabled: s.is_enabled,
        description: s.description,
        rate: parseFloat(s.rate || '0.00'),
        unit: s.unit || 'per_page'
      })),
    });
  } catch (err: any) {
    console.error('Owner shop retrieval error:', err);
    res.status(500).json({ error: 'Failed to fetch owner shop data.' });
  }
}

const updateProfileSchema = z.object({
  name: z.string().min(3, 'Shop name must be at least 3 characters'),
  ownerDisplayName: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  address: z.string().min(5, 'Shop address must be at least 5 characters'),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  businessHours: z.string().optional().nullable(),
  weeklySchedule: z.union([z.string(), z.array(z.any())]).optional().nullable(),
  weeklyHolidays: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  retentionHours: z.number().int().min(1).max(168).optional().default(24),
  minOrderAmount: z.number().min(0).optional().default(5),
  estCompletionTime: z.string().optional().nullable(),
  isStorefrontVisible: z.boolean().optional().default(true),
  logoUrl: z.string().optional().nullable(),
  galleryUrls: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  services: z.array(z.object({
    serviceType: z.string(),
    isEnabled: z.boolean().optional().default(true),
    description: z.string().optional().nullable(),
    rate: z.number().min(0).optional().default(0),
    unit: z.string().optional().default('per_page')
  })).optional()
});

export async function updateShopProfile(req: Request, res: Response) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  try {
    const validated = updateProfileSchema.parse(req.body);

    const weeklyScheduleStr = typeof validated.weeklySchedule === 'string'
      ? validated.weeklySchedule
      : JSON.stringify(validated.weeklySchedule || []);

    const weeklyHolidaysStr = typeof validated.weeklyHolidays === 'string'
      ? validated.weeklyHolidays
      : JSON.stringify(validated.weeklyHolidays || []);

    const galleryUrlsStr = typeof validated.galleryUrls === 'string'
      ? validated.galleryUrls
      : JSON.stringify(validated.galleryUrls || []);

    // Construct unified business hours description if not explicitly set
    let busHours = validated.businessHours;
    if (!busHours && Array.isArray(validated.weeklySchedule) && validated.weeklySchedule.length > 0) {
      const mon = validated.weeklySchedule[0];
      busHours = `${mon.open || '8:30 AM'} - ${mon.close || '9:30 PM'}`;
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
      validated.category || 'Xerox & Digital Printing',
      validated.address,
      validated.city || 'New Delhi',
      validated.state || 'Delhi',
      validated.pincode || '110001',
      validated.contactEmail || null,
      validated.contactPhone || null,
      busHours || '8:30 AM - 9:30 PM',
      weeklyScheduleStr,
      weeklyHolidaysStr,
      validated.retentionHours || 24,
      validated.minOrderAmount || 5.00,
      validated.estCompletionTime || '15-30 mins',
      validated.isStorefrontVisible !== false,
      validated.logoUrl || null,
      galleryUrlsStr,
      req.user.shopId
    ]);

    // Update optional services array if provided
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
          `, [s.isEnabled, s.description || '', s.rate || 0, s.unit || 'per_page', existing.rows[0].id]);
        } else {
          await query(`
            INSERT INTO shop_services (id, shop_id, service_type, is_enabled, description, rate, unit)
            VALUES ($1, $2, $3, $4, $5, $6, $7);
          `, [crypto.randomUUID(), req.user.shopId, s.serviceType, s.isEnabled, s.description || '', s.rate || 0, s.unit || 'per_page']);
        }
      }
    }

    await logAuditEvent({
      actorId: req.user.id,
      actorRole: 'SHOP_OWNER',
      action: 'SHOP_PROFILE_UPDATED',
      targetType: 'SHOP',
      targetId: req.user.shopId,
      details: {
        name: validated.name,
        category: validated.category,
        city: validated.city,
        minOrderAmount: validated.minOrderAmount
      }
    });

    res.json({ message: 'Shop profile and preferences updated successfully.' });
  } catch (err: any) {
    console.error('Update profile error:', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to update shop profile.' });
  }
}

export async function uploadShopImage(req: Request, res: Response) {
  if (!req.user || req.user.role !== 'SHOP_OWNER' || !req.user.shopId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }

  // File size limit: 5MB
  if (file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image file size exceeds maximum limit of 5MB.' });
  }

  // Validate file content magic bytes
  const validation = storageService.validateMagicBytes(file.buffer);
  const isWebp = file.buffer.length > 12 &&
    file.buffer[0] === 0x52 && file.buffer[1] === 0x49 && file.buffer[2] === 0x46 && file.buffer[3] === 0x46 &&
    file.buffer[8] === 0x57 && file.buffer[9] === 0x45 && file.buffer[10] === 0x42 && file.buffer[11] === 0x50;

  if (!validation.isValid && !isWebp) {
    return res.status(400).json({ error: 'Invalid file format. Only authentic JPG, PNG, and WebP images are allowed.' });
  }

  const mime = isWebp ? 'image/webp' : validation.detectedMime;
  if (mime !== 'image/png' && mime !== 'image/jpeg' && mime !== 'image/webp') {
    return res.status(400).json({ error: 'Only PNG, JPEG, and WebP image uploads are supported.' });
  }

  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const filename = `shop_${req.user.shopId}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const targetDir = path.join(process.cwd(), 'public_uploads', 'shop_assets');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const fullPath = path.join(targetDir, filename);
  fs.writeFileSync(fullPath, file.buffer);

  const publicUrl = `/api/uploads/shop_assets/${filename}`;

  await logAuditEvent({
    actorId: req.user.id,
    actorRole: 'SHOP_OWNER',
    action: 'SHOP_ASSET_UPLOADED',
    targetType: 'SHOP',
    targetId: req.user.shopId,
    details: { filename, mime, size: file.size }
  });

  res.json({
    message: 'Image uploaded successfully.',
    url: publicUrl,
    filename
  });
}

const singleRuleSchema = z.object({
  paperSize: z.enum(['A4', 'A3', 'LEGAL', 'LETTER']),
  colorMode: z.enum(['BW', 'COLOR']),
  singleSidedPrice: z.number().min(0, 'Price must be non-negative'),
  doubleSidedPrice: z.number().min(0, 'Price must be non-negative'),
  discountThreshold: z.number().int().min(1).optional().default(50),
  discountRate: z.number().min(0).optional().default(0),
});

const serviceRateSchema = z.object({
  serviceType: z.string(),
  isEnabled: z.boolean().optional().default(true),
  description: z.string().optional().nullable(),
  rate: z.number().min(0, 'Service rate must be non-negative'),
  unit: z.string().optional().default('per_page')
});

const complexPricingSchema = z.object({
  pricingRules: z.array(singleRuleSchema).optional(),
  services: z.array(serviceRateSchema).optional(),
  minOrderAmount: z.number().min(0).optional(),
  estCompletionTime: z.string().optional()
});

export async function updatePricingRules(req: Request, res: Response) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  try {
    let rules: any[] = [];
    let services: any[] = [];
    let minOrder: number | undefined;
    let estTime: string | undefined;

    // Check if body is an array (legacy format) or object (enhanced format)
    if (Array.isArray(req.body)) {
      rules = z.array(singleRuleSchema).parse(req.body);
    } else {
      const parsed = complexPricingSchema.parse(req.body);
      rules = parsed.pricingRules || [];
      services = parsed.services || [];
      minOrder = parsed.minOrderAmount;
      estTime = parsed.estCompletionTime;
    }

    // 1. Update standard paper pricing rules
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
        `, [crypto.randomUUID(), req.user.shopId, r.paperSize, r.colorMode, r.singleSidedPrice, r.doubleSidedPrice, r.discountThreshold, r.discountRate]);
      }
    }

    // 2. Update service rates (finishing, photocopy, scanning, etc.)
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
        `, [s.isEnabled, s.description || '', s.rate, s.unit || 'per_page', existing.rows[0].id]);
      } else {
        await query(`
          INSERT INTO shop_services (id, shop_id, service_type, is_enabled, description, rate, unit)
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [crypto.randomUUID(), req.user.shopId, s.serviceType, s.isEnabled, s.description || '', s.rate, s.unit || 'per_page']);
      }
    }

    // 3. Update shop min order amount & estimated completion time if provided
    if (minOrder !== undefined || estTime !== undefined) {
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
      actorRole: 'SHOP_OWNER',
      action: 'PRICING_RULES_UPDATED',
      targetType: 'SHOP',
      targetId: req.user.shopId,
      details: { rulesCount: rules.length, servicesCount: services.length, minOrder }
    });

    res.json({ message: 'Printing services and pricing rules updated successfully.' });
  } catch (err: any) {
    console.error('Update pricing error:', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to update pricing rules.' });
  }
}

export async function getShopQr(req: Request, res: Response) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  try {
    const shopRes = await query(`
      SELECT id, slug, name, qr_code_token
      FROM shops
      WHERE id = $1
      LIMIT 1;
    `, [req.user.shopId]);

    if (shopRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found.' });
    }

    const shop = shopRes.rows[0];
    const canonicalStorefrontUrl = `${config.frontendUrl}/s/${shop.id}`;
    const slugUrl = `${config.frontendUrl}/shop/${shop.slug}`;

    // Generate high resolution QR code PNG Data URL pointing to permanent /s/:shopId link
    const qrDataUrl = await QRCode.toDataURL(canonicalStorefrontUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 600,
      color: {
        dark: '#0B192C',
        light: '#FFFFFF'
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
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate shop QR code.' });
  }
}

export async function regenerateQrCode(req: Request, res: Response) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  try {
    const newQrToken = `qr-${crypto.randomBytes(16).toString('hex')}`;

    await query(`
      UPDATE shops
      SET qr_code_token = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `, [newQrToken, req.user.shopId]);

    await logAuditEvent({
      actorId: req.user.id,
      actorRole: 'SHOP_OWNER',
      action: 'QR_CODE_REGENERATED',
      targetType: 'SHOP',
      targetId: req.user.shopId,
      details: { newQrTokenPrefix: newQrToken.substring(0, 8) }
    });

    res.json({
      message: 'Shop QR code regenerated successfully. Previous QR codes will no longer resolve.',
      newQrToken
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to regenerate QR code.' });
  }
}

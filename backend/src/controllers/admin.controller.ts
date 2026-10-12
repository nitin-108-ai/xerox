import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/connection.js';
import { logAuditEvent } from '../services/audit.service.js';
import { config } from '../config/index.js';

export async function getAdminMetrics(req: Request, res: Response) {
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
      audits: auditMetrics.rows[0],
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch admin metrics.' });
  }
}

export async function listAllShops(req: Request, res: Response) {
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
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list shops.' });
  }
}

const reviewVerificationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  adminFeedback: z.string().optional(),
});

export async function reviewShopVerification(req: Request, res: Response) {
  const shopId = req.params.shopId;

  try {
    const validated = reviewVerificationSchema.parse(req.body);
    const isApproved = validated.status === 'APPROVED';

    const shopRes = await query(`SELECT id, name FROM shops WHERE id = $1 LIMIT 1;`, [shopId]);
    if (shopRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found.' });
    }

    // Update shop verification status
    await query(`
      UPDATE shops
      SET is_verified = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `, [isApproved, shopId]);

    // Update verification request record
    await query(`
      UPDATE shop_verification_requests
      SET status = $1, admin_feedback = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
      WHERE shop_id = $4;
    `, [validated.status, validated.adminFeedback || null, req.user?.id, shopId]);

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: 'ADMIN',
      action: isApproved ? 'SHOP_VERIFIED' : 'SHOP_VERIFICATION_REJECTED',
      targetType: 'SHOP',
      targetId: shopId,
      details: { feedback: validated.adminFeedback, status: validated.status }
    });

    res.json({
      message: `Shop verification updated to ${validated.status}.`,
      isVerified: isApproved
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to review shop verification.' });
  }
}

export async function toggleShopStatus(req: Request, res: Response) {
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
      actorRole: 'ADMIN',
      action: isActive ? 'SHOP_ACTIVATED' : 'SHOP_SUSPENDED',
      targetType: 'SHOP',
      targetId: shopId,
      details: { reason }
    });

    res.json({ message: `Shop has been ${isActive ? 'reactivated' : 'suspended'}.`, isActive: !!isActive });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update shop status.' });
  }
}

export async function listAuditLogs(req: Request, res: Response) {
  const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 50);
  const action = req.query.action as string;

  try {
    let sql = `
      SELECT id, actor_id, actor_role, action, target_type, target_id, ip_address, details_json, created_at
      FROM audit_logs
    `;
    const params: any[] = [];

    if (action) {
      params.push(action);
      sql += ` WHERE action = $1`;
    }

    params.push(limit);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length};`;

    const logsRes = await query(sql, params);

    res.json({ logs: logsRes.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
}

export async function getPlatformPolicies(_req: Request, res: Response) {
  res.json({
    maxFileSizeMb: config.maxFileSizeMb,
    allowedMimeTypes: config.allowedMimeTypes,
    defaultRetentionHours: config.defaultRetentionHours,
    retentionPolicySummary: 'Documents uploaded to Smart Xerox are encrypted in private storage and strictly quarantined until printed. All documents are automatically and permanently purged upon retention window expiry.',
    privacyStatement: 'Smart Xerox never requires personal phone numbers or account registrations from walk-in guest customers by default.'
  });
}

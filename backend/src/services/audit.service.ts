import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';

export interface AuditLogParams {
  actorId?: string | null;
  actorRole: 'CUSTOMER' | 'SHOP_OWNER' | 'ADMIN' | 'SYSTEM' | 'ANONYMOUS';
  action: string;
  targetType: string;
  targetId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, any>;
}

export async function logAuditEvent(params: AuditLogParams): Promise<void> {
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
  } catch (err: any) {
    // Audit logging should fail gracefully without crashing primary flows, but be logged to stderr
    console.error('Failed to write audit log:', err.message);
  }
}

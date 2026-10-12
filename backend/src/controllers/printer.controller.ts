import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { query } from '../db/connection.js';
import { storageService } from '../storage/storage.service.js';
import { logAuditEvent } from '../services/audit.service.js';

function safeParseJson(val: any, fallback: any = []) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

// ----------------- SHOP OWNER ENDPOINTS -----------------

export async function listShopPrinters(req: Request, res: Response) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: 'Unauthorized.' });
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

    // Check connector status
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
      deviceName: null as string | null,
      osInfo: null as string | null,
      lastHeartbeatAt: null as string | null,
    };

    if (connectorRes.rows.length > 0) {
      const c = connectorRes.rows[0];
      const isOnline = c.last_heartbeat_at &&
        (Date.now() - new Date(c.last_heartbeat_at).getTime() < 60000); // 60s threshold

      connectorStatus = {
        isPaired: true,
        isOnline: !!isOnline,
        deviceName: c.device_name,
        osInfo: c.os_info,
        lastHeartbeatAt: c.last_heartbeat_at,
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
        supportedPaperSizes: safeParseJson(p.supported_paper_sizes, ['A4']),
        supportsColor: p.supports_color,
        supportsDuplex: p.supports_duplex,
        lastSeenAt: p.last_seen_at,
      })),
      connector: connectorStatus,
    });
  } catch (err: any) {
    console.error('List printers error:', err);
    res.status(500).json({ error: 'Failed to retrieve shop printers.' });
  }
}

const printerSchema = z.object({
  name: z.string().min(2, 'Printer name must be at least 2 characters'),
  driverName: z.string().optional().default('Generic Printer'),
  portName: z.string().optional().default('USB'),
  connectionType: z.enum(['USB', 'WIFI', 'LAN', 'VIRTUAL']).default('USB'),
  supportedPaperSizes: z.array(z.string()).default(['A4']),
  supportsColor: z.boolean().default(true),
  supportsDuplex: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  status: z.enum(['READY', 'OFFLINE', 'UNKNOWN', 'ERROR']).default('READY'),
});

export async function createOrUpdatePrinter(req: Request, res: Response) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  try {
    const data = printerSchema.parse(req.body);
    const printerId = req.params.id || uuidv4();

    if (data.isDefault) {
      // Unset previous defaults
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
      data.status !== 'OFFLINE',
      data.status,
      data.connectionType,
      JSON.stringify(data.supportedPaperSizes),
      data.supportsColor,
      data.supportsDuplex,
    ]);

    res.json({ message: 'Printer configuration saved successfully.', printerId });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to save printer configuration.' });
  }
}

export async function setDefaultPrinter(req: Request, res: Response) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: 'Unauthorized.' });
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
      return res.status(404).json({ error: 'Printer not found.' });
    }

    res.json({ message: `"${result.rows[0].name}" is now the default printer.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to set default printer.' });
  }
}

export async function deletePrinter(req: Request, res: Response) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const { id } = req.params;

  try {
    await query(`
      DELETE FROM shop_printers WHERE id = $1 AND shop_id = $2;
    `, [id, req.user.shopId]);

    res.json({ message: 'Printer removed.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete printer.' });
  }
}

export async function generatePairingCode(req: Request, res: Response) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  try {
    const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean up any stale unlinked connector records
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
    `, [uuidv4(), req.user.shopId, pairingCode, expiresAt]);

    res.json({
      pairingCode,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: 600,
      message: 'Pairing code generated. Enter this 6-digit code in the Smart Xerox Windows Connector.',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate pairing code.' });
  }
}

export async function revokeConnector(req: Request, res: Response) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  try {
    await query(`
      UPDATE printer_connectors
      SET is_active = FALSE, pairing_code = NULL
      WHERE shop_id = $1;
    `, [req.user.shopId]);

    await logAuditEvent({
      actorId: req.user.id,
      actorRole: 'SHOP_OWNER',
      action: 'PRINTER_CONNECTOR_REVOKED',
      targetType: 'SHOP',
      targetId: req.user.shopId,
      details: { timestamp: new Date().toISOString() },
    });

    res.json({ message: 'Windows printer connector paired credentials have been revoked.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to revoke connector.' });
  }
}

// Direct Print Job Submission (Mode B)
export async function submitPrintJob(req: Request, res: Response) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const { orderId, printerName, copies, isDuplex, colorMode, paperSize, idempotencyKey } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required.' });
  }

  try {
    // 1. Verify order belongs to this shop
    const orderRes = await query(`
      SELECT o.id, o.order_reference, o.status,
             oi.copies, oi.is_duplex, oi.color_mode, oi.paper_size
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1 AND o.shop_id = $2
      LIMIT 1;
    `, [orderId, req.user.shopId]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found in this shop.' });
    }

    const order = orderRes.rows[0];

    // Check status allowlist: must be accepted, printing, ready for pickup, or print_failed
    if (!['ACCEPTED', 'PRINTING', 'PRINT_FAILED', 'SUBMITTED', 'READY_FOR_PICKUP'].includes(order.status)) {
      return res.status(400).json({
        error: `Cannot print order in "${order.status}" status. Accept order first.`,
      });
    }

    // 2. Resolve target printer
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
        targetPrinter = anyRes.rows[0]?.name || 'Default Windows Printer';
      }
    }

    // 3. Idempotency check: prevent duplicate submissions
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
        message: 'A direct print job is already currently processing for this order.',
      });
    }

    // 4. Create print job with short-lived download token
    const jobId = uuidv4();
    const downloadToken = crypto.randomBytes(24).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

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
      isDuplex !== undefined ? isDuplex : order.is_duplex,
      colorMode || order.color_mode || 'BW',
      paperSize || order.paper_size || 'A4',
      key,
      downloadToken,
      tokenExpiresAt,
    ]);

    // Update order status to PRINTING
    await query(`
      UPDATE orders SET status = 'PRINTING', updated_at = CURRENT_TIMESTAMP WHERE id = $1;
    `, [orderId]);

    await query(`
      INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
      VALUES ($1, $2, $3, 'PRINTING', 'SHOP_OWNER', $4);
    `, [uuidv4(), orderId, order.status, `Direct print job submitted to printer "${targetPrinter}".`]);

    await logAuditEvent({
      actorId: req.user.id,
      actorRole: 'SHOP_OWNER',
      action: 'DIRECT_PRINT_JOB_SUBMITTED',
      targetType: 'PRINT_JOB',
      targetId: jobId,
      details: { orderId, targetPrinter, copies: copies || 1 },
    });

    res.json({
      jobId,
      status: 'PENDING',
      printerName: targetPrinter,
      message: `Print job queued for printer "${targetPrinter}". The Windows desktop connector will submit it directly to the spooler.`,
    });
  } catch (err: any) {
    console.error('Submit print job error:', err);
    res.status(500).json({ error: 'Failed to submit direct print job.' });
  }
}

// Manual Print Recording (Mode A Fallback)
export async function recordManualPrint(req: Request, res: Response) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const { orderId } = req.params;
  const { outcomeStatus = 'READY_FOR_PICKUP' } = req.body;

  try {
    const orderRes = await query(`
      SELECT id, order_reference, status FROM orders WHERE id = $1 AND shop_id = $2 LIMIT 1;
    `, [orderId, req.user.shopId]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found in this shop.' });
    }

    const order = orderRes.rows[0];
    const newStatus = outcomeStatus === 'COMPLETED' ? 'COMPLETED' : 'READY_FOR_PICKUP';

    await query(`
      UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;
    `, [newStatus, orderId]);

    await query(`
      INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
      VALUES ($1, $2, $3, $4, 'SHOP_OWNER', 'Document printed via manual operating system print dialog.');
    `, [uuidv4(), orderId, order.status, newStatus]);

    res.json({
      message: `Manual printing verified. Order status updated to "${newStatus.replace('_', ' ')}".`,
      status: newStatus,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record manual print action.' });
  }
}

export async function getJobStatus(req: Request, res: Response) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: 'Unauthorized.' });
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
      return res.status(404).json({ error: 'Print job not found.' });
    }

    res.json(jobRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to check print job status.' });
  }
}

// ----------------- WINDOWS DESKTOP CONNECTOR ENDPOINTS -----------------

export async function connectorPair(req: Request, res: Response) {
  const { pairingCode, deviceName, osInfo } = req.body;

  if (!pairingCode) {
    return res.status(400).json({ error: 'Pairing code is required.' });
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
        error: 'Invalid or expired 6-digit pairing code. Generate a new code from the Owner Dashboard.',
      });
    }

    const row = connectorRes.rows[0];

    // Generate revocable device credential
    const rawToken = `conn_${crypto.randomBytes(32).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await query(`
      UPDATE printer_connectors
      SET device_name = $1, os_info = $2, connector_token_hash = $3,
          is_active = TRUE, pairing_code = NULL, last_heartbeat_at = CURRENT_TIMESTAMP
      WHERE id = $4;
    `, [deviceName || 'Windows Shop PC', osInfo || 'Windows 10/11', tokenHash, row.id]);

    res.json({
      message: 'Windows Desktop Connector successfully paired!',
      connectorToken: rawToken,
      shop: {
        id: row.shop_id,
        name: row.shop_name,
        slug: row.shop_slug,
      },
    });
  } catch (err: any) {
    console.error('Connector pair error:', err);
    res.status(500).json({ error: 'Pairing failed.' });
  }
}

export async function connectorHeartbeat(req: Request, res: Response) {
  if (!req.connector) {
    return res.status(401).json({ error: 'Unauthorized connector.' });
  }

  const { printers } = req.body;

  try {
    // 1. Update connector heartbeat
    await query(`
      UPDATE printer_connectors
      SET last_heartbeat_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `, [req.connector.id]);

    // 2. Sync reported printers into shop_printers if array is provided
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
          uuidv4(),
          req.connector.shopId,
          p.name,
          p.driverName || 'Windows Driver',
          p.portName || 'Port',
          !!p.isDefault,
          p.isOnline !== false,
          p.status || 'READY',
          p.connectionType || 'USB',
          JSON.stringify(p.supportedPaperSizes || ['A4']),
          p.supportsColor !== false,
          !!p.supportsDuplex,
        ]);
      }
    }

    // Check count of pending direct print jobs
    const pendingJobsRes = await query(`
      SELECT COUNT(*) as count FROM print_jobs
      WHERE shop_id = $1 AND status = 'PENDING';
    `, [req.connector.shopId]);

    res.json({
      status: 'ACK',
      timestamp: new Date().toISOString(),
      pendingJobsCount: parseInt(pendingJobsRes.rows[0].count, 10),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Heartbeat failed.' });
  }
}

export async function connectorGetPendingJobs(req: Request, res: Response) {
  if (!req.connector) {
    return res.status(401).json({ error: 'Unauthorized connector.' });
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
      downloadUrl: `/api/printers/connector/jobs/${j.id}/download?token=${j.download_token}`,
    }));

    res.json({ jobs });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch pending jobs.' });
  }
}

export async function connectorDownloadJobDocument(req: Request, res: Response) {
  const { jobId } = req.params;
  const token = req.query.token as string;

  if (!token) {
    return res.status(401).json({ error: 'Download token is required.' });
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
      return res.status(403).json({ error: 'Invalid or revoked download token.' });
    }

    const job = jobRes.rows[0];
    if (new Date(job.download_token_expires_at) < new Date()) {
      return res.status(403).json({ error: 'Download token has expired.' });
    }

    const filePath = storageService.getFilePath(job.storage_key);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document file not found.' });
    }

    // Mark job as DOWNLOADING
    await query(`
      UPDATE print_jobs SET status = 'DOWNLOADING', updated_at = CURRENT_TIMESTAMP WHERE id = $1;
    `, [jobId]);

    res.setHeader('Content-Type', job.mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(job.original_filename)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to download job document.' });
  }
}

export async function connectorReportJobStatus(req: Request, res: Response) {
  if (!req.connector) {
    return res.status(401).json({ error: 'Unauthorized connector.' });
  }

  const { jobId } = req.params;
  const { status, errorMessage, spoolerJobId } = req.body;

  if (!['SUBMITTED', 'PRINTED', 'FAILED', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status reported.' });
  }

  try {
    const jobRes = await query(`
      SELECT id, order_id, printer_name FROM print_jobs
      WHERE id = $1 AND shop_id = $2
      LIMIT 1;
    `, [jobId, req.connector.shopId]);

    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const job = jobRes.rows[0];
    const isCompleted = ['PRINTED', 'FAILED', 'CANCELLED'].includes(status);

    await query(`
      UPDATE print_jobs
      SET status = $1, error_message = $2,
          completed_at = CASE WHEN $3 = TRUE THEN CURRENT_TIMESTAMP ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4;
    `, [status, errorMessage || null, isCompleted, jobId]);

    // If failed, reflect in orders table
    if (status === 'FAILED') {
      await query(`
        UPDATE orders SET status = 'PRINT_FAILED', updated_at = CURRENT_TIMESTAMP WHERE id = $1;
      `, [job.order_id]);

      await query(`
        INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
        VALUES ($1, $2, 'PRINTING', 'PRINT_FAILED', 'SYSTEM', $3);
      `, [uuidv4(), job.order_id, `Windows print spooler error on "${job.printer_name}": ${errorMessage || 'Unknown hardware error'}`]);
    } else if (status === 'PRINTED' || status === 'SUBMITTED') {
      await query(`
        INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
        VALUES ($1, $2, 'PRINTING', 'PRINTING', 'SYSTEM', $3);
      `, [uuidv4(), job.order_id, `Spooler confirmed job on "${job.printer_name}" (Spooler ID: ${spoolerJobId || 'Active'}).`]);
    }

    res.json({ message: 'Job status recorded.' });
  } catch (err: any) {
    console.error('Connector report status error:', err);
    res.status(500).json({ error: 'Failed to record job status.' });
  }
}

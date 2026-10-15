import { Request, Response } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import fs from 'fs';
import { query, transaction } from '../db/connection.js';
import { storageService } from '../storage/storage.service.js';
import { pricingService } from '../services/pricing.service.js';
import { logAuditEvent } from '../services/audit.service.js';

function generateOrderReference(): string {
  // Format: SX-XXXX-2026 (non-sequential high entropy alphanumeric)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  return `SX-${rand}-${year}`;
}

function generatePickupOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function calculateEstimate(req: Request, res: Response) {
  try {
    const { shopId, paperSize, colorMode, isDuplex, copies, pageCount } = req.body;
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required.' });
    }

    const estimate = await pricingService.calculatePrice({
      shopId,
      paperSize: paperSize || 'A4',
      colorMode: colorMode || 'BW',
      isDuplex: !!isDuplex,
      copies: parseInt(copies, 10) || 1,
      pageCount: parseInt(pageCount, 10) || 1,
    });

    res.json(estimate);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate estimate.' });
  }
}

export async function createOrder(req: Request, res: Response) {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'Please upload a valid document (PDF, PNG, or JPG).' });
  }

  const {
    shopId,
    paperSize = 'A4',
    colorMode = 'BW',
    isDuplex = 'false',
    copies = '1',
    customNotes = '',
    customerAlias = 'Guest Customer',
    customerContactNote = ''
  } = req.body;

  if (!shopId) {
    return res.status(400).json({ error: 'Target Shop ID is required.' });
  }

  try {
    // 1. Check shop validity & verification
    const shopRes = await query(`
      SELECT id, name, is_verified, is_active, retention_hours
      FROM shops
      WHERE id = $1
      LIMIT 1;
    `, [shopId]);

    if (shopRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found.' });
    }

    const shop = shopRes.rows[0];
    if (!shop.is_verified) {
      return res.status(403).json({ error: 'This shop is not verified to receive print orders.' });
    }
    if (!shop.is_active) {
      return res.status(403).json({ error: 'This shop is currently inactive.' });
    }

    // 2. Validate file bytes & malware heuristics
    const validation = await storageService.inspectAndValidate(file.buffer, file.mimetype);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error || 'Invalid file format or security inspection failure.' });
    }

    // 3. Save file into private storage
    const saved = await storageService.saveFile(file.buffer, file.originalname, validation.detectedMime!);

    // 4. Calculate pricing
    const numCopies = Math.max(1, parseInt(copies, 10) || 1);
    const duplexBool = isDuplex === 'true' || isDuplex === true;

    const pricing = await pricingService.calculatePrice({
      shopId,
      paperSize,
      colorMode,
      isDuplex: duplexBool,
      copies: numCopies,
      pageCount: validation.pageCount,
    });

    // 5. Generate credentials
    const orderId = uuidv4();
    const orderReference = generateOrderReference();
    const orderAccessToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(orderAccessToken).digest('hex');
    const tokenHint = `${orderAccessToken.substring(0, 6)}...${orderAccessToken.substring(orderAccessToken.length - 4)}`;
    const pickupOtp = generatePickupOtp();

    // Retention window
    const retentionHours = shop.retention_hours || 24;
    const autoDeleteDate = new Date(Date.now() + retentionHours * 60 * 60 * 1000);
    const tokenExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days token lifetime

    // 6. Database transaction
    await transaction(async ({ query: txQuery }) => {
      // Order
      await txQuery(`
        INSERT INTO orders (id, order_reference, shop_id, customer_alias, customer_contact_note, status, estimated_amount, final_amount, pickup_otp)
        VALUES ($1, $2, $3, $4, $5, 'SUBMITTED', $6, $6, $7);
      `, [orderId, orderReference, shopId, customerAlias || 'Guest Customer', customerContactNote || null, pricing.total, pickupOtp]);

      // Order item
      const itemId = uuidv4();
      await txQuery(`
        INSERT INTO order_items (id, order_id, paper_size, color_mode, is_duplex, copies, page_count, custom_notes, item_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
      `, [itemId, orderId, paperSize, colorMode, duplexBool, numCopies, validation.pageCount, customNotes || null, pricing.total]);

      // Document metadata
      const docId = uuidv4();
      await txQuery(`
        INSERT INTO document_metadata (id, order_id, order_item_id, original_filename, stored_filename, file_size, mime_type, page_count, storage_key, sha256_hash, malware_status, auto_delete_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'CLEAN', $11);
      `, [docId, orderId, itemId, file.originalname, saved.storedFilename, saved.fileSize, validation.detectedMime, validation.pageCount, saved.storageKey, saved.sha256Hash, autoDeleteDate]);

      // Order access token
      await txQuery(`
        INSERT INTO order_access_tokens (id, order_id, token_hash, token_hint, expires_at)
        VALUES ($1, $2, $3, $4, $5);
      `, [uuidv4(), orderId, tokenHash, tokenHint, tokenExpiryDate]);

      // Order status history
      await txQuery(`
        INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
        VALUES ($1, $2, NULL, 'SUBMITTED', 'CUSTOMER', 'Order submitted by guest customer.');
      `, [uuidv4(), orderId]);

      // Notification for shop
      await txQuery(`
        INSERT INTO notifications (id, shop_id, order_id, title, message)
        VALUES ($1, $2, $3, 'New Print Job Received', $4);
      `, [uuidv4(), shopId, orderId, `New order ${orderReference} for ${numCopies} copies (${validation.pageCount} pages).`]);
    });

    await logAuditEvent({
      actorRole: 'CUSTOMER',
      action: 'ORDER_SUBMITTED',
      targetType: 'ORDER',
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
      message: 'Print job submitted successfully.',
      orderReference,
      orderAccessToken,
      trackingUrl: `/track/${orderReference}?token=${orderAccessToken}`,
      status: 'SUBMITTED',
      estimatedAmount: pricing.total,
      pickupOtp,
      pageCount: validation.pageCount,
      copies: numCopies,
      retentionNotice: `Your document is scheduled to be automatically deleted in ${retentionHours} hours.`,
      retentionDate: autoDeleteDate.toISOString()
    });
  } catch (err: any) {
    console.error('Order creation failed:', err);
    res.status(500).json({ error: 'Failed to process document and create order.' });
  }
}

export async function trackOrder(req: Request, res: Response) {
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
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderRes.rows[0];

    // Fetch items
    const itemsRes = await query(`
      SELECT paper_size, color_mode, is_duplex, copies, page_count, custom_notes, item_price
      FROM order_items
      WHERE order_id = $1;
    `, [order.id]);

    // Fetch document deletion state
    const docRes = await query(`
      SELECT original_filename, file_size, mime_type, is_deleted, auto_delete_at
      FROM document_metadata
      WHERE order_id = $1
      LIMIT 1;
    `, [order.id]);

    // Fetch history
    const historyRes = await query(`
      SELECT previous_status, new_status, changed_by_role, note, created_at
      FROM order_status_history
      WHERE order_id = $1
      ORDER BY created_at ASC;
    `, [order.id]);

    // Fetch messages
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
        updatedAt: order.updated_at,
      },
      shop: {
        name: order.shop_name,
        address: order.shop_address,
        businessHours: order.shop_hours,
        retentionHours: order.retention_hours,
      },
      items: itemsRes.rows,
      document: docRes.rows[0] ? {
        originalFilename: docRes.rows[0].original_filename,
        fileSize: docRes.rows[0].file_size,
        mimeType: docRes.rows[0].mime_type,
        isDeleted: docRes.rows[0].is_deleted,
        autoDeleteAt: docRes.rows[0].auto_delete_at,
      } : null,
      history: historyRes.rows,
      messages: messagesRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch order tracking information.' });
  }
}

export async function approveRevisedQuote(req: Request, res: Response) {
  const orderRef = req.params.reference;

  try {
    const orderRes = await query(`
      SELECT id, status, final_amount FROM orders WHERE order_reference = $1 OR id = $1 LIMIT 1;
    `, [orderRef]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderRes.rows[0];
    if (order.status !== 'AWAITING_APPROVAL') {
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
    `, [uuidv4(), order.id]);

    await logAuditEvent({
      actorRole: 'CUSTOMER',
      action: 'QUOTE_APPROVED',
      targetType: 'ORDER',
      targetId: order.id,
      details: { approvedAmount: order.final_amount }
    });

    res.json({ message: 'Quotation approved. Shop owner notified to proceed with printing.', status: 'ACCEPTED' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to approve quotation.' });
  }
}

export async function cancelCustomerOrder(req: Request, res: Response) {
  const orderRef = req.params.reference;
  const reason = req.body.reason || 'Cancelled by customer';

  try {
    const orderRes = await query(`
      SELECT id, status FROM orders WHERE order_reference = $1 OR id = $1 LIMIT 1;
    `, [orderRef]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderRes.rows[0];
    const cancellableStatuses = ['SUBMITTED', 'ACCEPTED', 'AWAITING_APPROVAL'];

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
    `, [uuidv4(), order.id, order.status, reason]);

    await logAuditEvent({
      actorRole: 'CUSTOMER',
      action: 'ORDER_CANCELLED',
      targetType: 'ORDER',
      targetId: order.id,
      details: { previousStatus: order.status, reason }
    });

    res.json({ message: 'Order has been successfully cancelled.', status: 'CANCELLED' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to cancel order.' });
  }
}

export async function sendOrderMessage(req: Request, res: Response) {
  const orderRef = req.params.reference || req.params.id;
  const { message, senderRole } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message content cannot be empty.' });
  }

  try {
    const orderRes = await query(`
      SELECT id FROM orders WHERE order_reference = $1 OR id = $1 LIMIT 1;
    `, [orderRef]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const orderId = orderRes.rows[0].id;
    const role = senderRole === 'SHOP_OWNER' ? 'SHOP_OWNER' : 'CUSTOMER';
    const messageId = uuidv4();

    await query(`
      INSERT INTO order_messages (id, order_id, sender_role, message)
      VALUES ($1, $2, $3, $4);
    `, [messageId, orderId, role, message.trim()]);

    res.status(201).json({
      message: 'Message sent successfully.',
      messageRecord: {
        id: messageId,
        orderId,
        senderRole: role,
        message: message.trim(),
        createdAt: new Date().toISOString()
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to send message.' });
  }
}

// ----------------- SHOP OWNER ACTIONS -----------------

export async function listOwnerOrders(req: Request, res: Response) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: 'Unauthorized.' });
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
    const params: any[] = [req.user.shopId];

    if (status && status !== 'ALL') {
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
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load shop orders.' });
  }
}

export async function getOwnerOrderDetail(req: Request, res: Response) {
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
      return res.status(404).json({ error: 'Order not found.' });
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
      messages: messagesRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load order details.' });
  }
}

const updateStatusSchema = z.object({
  status: z.enum([
    'RECEIVED',
    'SUBMITTED',
    'ACCEPTED',
    'QUEUED',
    'AWAITING_APPROVAL',
    'PRINTING',
    'PRINT_FAILED',
    'FAILED',
    'READY_FOR_PICKUP',
    'COMPLETED',
    'REJECTED',
    'CANCELLED',
    'NEEDS_ATTENTION'
  ]),
  note: z.string().optional(),
});

export async function updateOrderStatus(req: Request, res: Response) {
  const orderId = req.params.id;

  try {
    const validated = updateStatusSchema.parse(req.body);

    const orderRes = await query(`
      SELECT id, status, order_reference FROM orders WHERE id = $1 AND shop_id = $2 LIMIT 1;
    `, [orderId, req.user?.shopId]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const currentOrder = orderRes.rows[0];
    const prevStatus = currentOrder.status;
    const nextStatus = validated.status;

    // Validate state transitions
    const validTransitions: Record<string, string[]> = {
      SUBMITTED: ['ACCEPTED', 'REJECTED', 'QUEUED', 'PRINTING', 'AWAITING_APPROVAL', 'CANCELLED', 'NEEDS_ATTENTION'],
      RECEIVED: ['ACCEPTED', 'REJECTED', 'QUEUED', 'PRINTING', 'AWAITING_APPROVAL', 'CANCELLED', 'NEEDS_ATTENTION'],
      AWAITING_APPROVAL: ['ACCEPTED', 'REJECTED', 'CANCELLED', 'NEEDS_ATTENTION'],
      ACCEPTED: ['QUEUED', 'PRINTING', 'READY_FOR_PICKUP', 'REJECTED', 'CANCELLED', 'NEEDS_ATTENTION'],
      QUEUED: ['PRINTING', 'PRINT_FAILED', 'FAILED', 'READY_FOR_PICKUP', 'CANCELLED', 'NEEDS_ATTENTION'],
      PRINTING: ['READY_FOR_PICKUP', 'PRINT_FAILED', 'FAILED', 'CANCELLED', 'NEEDS_ATTENTION'],
      PRINT_FAILED: ['QUEUED', 'PRINTING', 'CANCELLED', 'NEEDS_ATTENTION'],
      FAILED: ['QUEUED', 'PRINTING', 'CANCELLED', 'NEEDS_ATTENTION'],
      NEEDS_ATTENTION: ['ACCEPTED', 'QUEUED', 'PRINTING', 'READY_FOR_PICKUP', 'REJECTED', 'CANCELLED'],
      READY_FOR_PICKUP: ['COMPLETED', 'CANCELLED', 'NEEDS_ATTENTION'],
      COMPLETED: [],
      REJECTED: [],
      CANCELLED: [],
    };

    if (validTransitions[prevStatus] && !validTransitions[prevStatus].includes(nextStatus) && prevStatus !== nextStatus) {
      return res.status(400).json({
        error: `Invalid transition from ${prevStatus} to ${nextStatus}. Allowed: ${validTransitions[prevStatus]?.join(', ') || 'None'}`
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
    `, [uuidv4(), orderId, prevStatus, nextStatus, validated.note || `Status updated to ${nextStatus}`]);

    // If marked COMPLETED, schedule auto-deletion window for 2 hours post-completion
    if (nextStatus === 'COMPLETED') {
      const completionRetention = new Date(Date.now() + 2 * 60 * 60 * 1000);
      await query(`
        UPDATE document_metadata
        SET auto_delete_at = $1
        WHERE order_id = $2 AND is_deleted = FALSE;
      `, [completionRetention, orderId]);
    }

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: 'SHOP_OWNER',
      action: 'ORDER_STATUS_CHANGED',
      targetType: 'ORDER',
      targetId: orderId,
      details: { previousStatus: prevStatus, newStatus: nextStatus, note: validated.note }
    });

    res.json({ message: `Order status updated to ${nextStatus}.`, status: nextStatus });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to update order status.' });
  }
}

export async function reviseOrderQuote(req: Request, res: Response) {
  const orderId = req.params.id;
  const { newAmount, quotationNote } = req.body;

  const parsedAmount = parseFloat(newAmount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Please enter a valid quotation amount.' });
  }

  try {
    const orderRes = await query(`
      SELECT id, status, estimated_amount FROM orders WHERE id = $1 AND shop_id = $2 LIMIT 1;
    `, [orderId, req.user?.shopId]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderRes.rows[0];
    if (order.status !== 'SUBMITTED' && order.status !== 'ACCEPTED') {
      return res.status(400).json({ error: `Cannot revise quote in current status: ${order.status}` });
    }

    await query(`
      UPDATE orders
      SET status = 'AWAITING_APPROVAL', final_amount = $1, quotation_note = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3;
    `, [parsedAmount, quotationNote || 'Revised price quotation', orderId]);

    await query(`
      INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
      VALUES ($1, $2, $3, 'AWAITING_APPROVAL', 'SHOP_OWNER', $4);
    `, [uuidv4(), orderId, order.status, `Quotation revised to ₹${parsedAmount}. Note: ${quotationNote || 'N/A'}`]);

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: 'SHOP_OWNER',
      action: 'QUOTE_REVISED',
      targetType: 'ORDER',
      targetId: orderId,
      details: { oldAmount: order.estimated_amount, newAmount: parsedAmount, note: quotationNote }
    });

    res.json({
      message: 'Quotation updated. Order is now awaiting customer approval before printing.',
      status: 'AWAITING_APPROVAL',
      finalAmount: parsedAmount
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to revise quotation.' });
  }
}

export async function previewDocument(req: Request, res: Response) {
  const { id: orderId, docId } = req.params;

  try {
    // Verify document belongs to order and shop
    const docRes = await query(`
      SELECT dm.storage_key, dm.mime_type, dm.original_filename, dm.is_deleted
      FROM document_metadata dm
      JOIN orders o ON dm.order_id = o.id
      WHERE dm.id = $1 AND o.id = $2 AND o.shop_id = $3
      LIMIT 1;
    `, [docId, orderId, req.user?.shopId]);

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or unauthorized.' });
    }

    const doc = docRes.rows[0];
    if (doc.is_deleted) {
      return res.status(410).json({ error: 'This document has already been securely deleted per retention policy.' });
    }

    const filePath = storageService.getFilePath(doc.storage_key);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Physical document file not found.' });
    }

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: 'SHOP_OWNER',
      action: 'DOCUMENT_PREVIEWED',
      targetType: 'DOCUMENT',
      targetId: docId,
      ipAddress: req.ip,
      details: { orderId, filename: doc.original_filename }
    });

    // Enforce sandboxing and strict security headers
    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_filename)}"`);
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to stream document preview.' });
  }
}

export async function downloadDocument(req: Request, res: Response) {
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
      return res.status(404).json({ error: 'Document not found or unauthorized.' });
    }

    const doc = docRes.rows[0];
    if (doc.is_deleted) {
      return res.status(410).json({ error: 'This document has been permanently deleted per retention policy.' });
    }

    const filePath = storageService.getFilePath(doc.storage_key);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found.' });
    }

    await logAuditEvent({
      actorId: req.user?.id,
      actorRole: 'SHOP_OWNER',
      action: 'DOCUMENT_DOWNLOADED_FOR_PRINTING',
      targetType: 'DOCUMENT',
      targetId: docId,
      ipAddress: req.ip,
      details: { orderId, filename: doc.original_filename }
    });

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.original_filename)}"`);
    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to download document.' });
  }
}

export async function getOwnerReports(req: Request, res: Response) {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: 'Unauthorized.' });
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
      paperSizeBreakdown: paperSizeBreakdown.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate shop reports.' });
  }
}

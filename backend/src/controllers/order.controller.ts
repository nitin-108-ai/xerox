import { Request, Response } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import fs from 'fs';
import { query, transaction } from '../db/connection.js';
import { storageService } from '../storage/storage.service.js';
import { pricingService } from '../services/pricing.service.js';
import { logAuditEvent } from '../services/audit.service.js';
import { liveEvents } from '../services/liveEvents.service.js';

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
  let uploadedFiles: Express.Multer.File[] = [];
  if (req.files) {
    if (Array.isArray(req.files)) {
      uploadedFiles = req.files;
    } else {
      const filesObj = req.files as Record<string, Express.Multer.File[]>;
      if (filesObj.documents && filesObj.documents.length > 0) {
        uploadedFiles.push(...filesObj.documents);
      } else if (filesObj.document && filesObj.document.length > 0) {
        uploadedFiles.push(...filesObj.document);
      }
    }
  } else if (req.file) {
    uploadedFiles = [req.file];
  }

  if (uploadedFiles.length === 0) {
    return res.status(400).json({ error: 'Please upload at least one valid document (PDF, PNG, or JPG).' });
  }

  const {
    shopId,
    paperSize = 'A4',
    colorMode = 'BW',
    isDuplex = 'false',
    copies = '1',
    customNotes = '',
    customerAlias = 'Guest Customer',
    customerContactNote = '',
    idempotencyKey = '',
  } = req.body;

  const headerIdempotency = (req.headers['idempotency-key'] as string) || idempotencyKey;

  if (!shopId) {
    return res.status(400).json({ error: 'Target Shop ID is required.' });
  }

  try {
    // 1. Check shop validity, verification, and settings
    const shopRes = await query(`
      SELECT id, name, is_verified, is_active, retention_hours, approval_mode, auto_accept_max_pages, auto_accept_max_copies
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

    // 2. Check idempotency key to prevent accidental duplicate submission
    if (headerIdempotency && headerIdempotency.trim()) {
      const existingOrder = await query(`
        SELECT id, order_reference, status, estimated_amount, pickup_otp, created_at
        FROM orders
        WHERE idempotency_key = $1 AND shop_id = $2
        LIMIT 1;
      `, [headerIdempotency.trim(), shopId]);

      if (existingOrder.rows.length > 0) {
        const exist = existingOrder.rows[0];
        return res.status(200).json({
          message: 'Order already received (idempotent duplicate request).',
          orderReference: exist.order_reference,
          status: exist.status,
          estimatedAmount: exist.estimated_amount,
          pickupOtp: exist.pickup_otp,
          isDuplicate: true,
        });
      }
    }

    // 3. Inspect & validate each file
    const validatedFiles: any[] = [];
    let totalPagesAllFiles = 0;
    const numCopies = Math.max(1, parseInt(copies, 10) || 1);
    const duplexBool = isDuplex === 'true' || isDuplex === true;

    for (const file of uploadedFiles) {
      const validation = await storageService.inspectAndValidate(file.buffer, file.mimetype);
      if (!validation.isValid) {
        return res.status(400).json({
          error: `File "${file.originalname}" failed security validation: ${validation.error || 'Invalid file format'}`
        });
      }

      const saved = await storageService.saveFile(file.buffer, file.originalname, validation.detectedMime!);
      const pageCount = validation.pageCount || 1;
      totalPagesAllFiles += pageCount;

      validatedFiles.push({
        file,
        validation,
        saved,
        pageCount,
      });
    }

    // 4. Calculate pricing across all files
    const pricing = await pricingService.calculatePrice({
      shopId,
      paperSize,
      colorMode,
      isDuplex: duplexBool,
      copies: numCopies,
      pageCount: totalPagesAllFiles,
    });

    // 5. Check automatic approval mode
    let initialStatus = 'SUBMITTED';
    const autoAccept = shop.approval_mode === 'AUTO_ACCEPT' || shop.approval_mode === 'AUTO_PRINT';
    const withinLimits = totalPagesAllFiles <= (shop.auto_accept_max_pages || 50) && numCopies <= (shop.auto_accept_max_copies || 5);
    if (autoAccept && withinLimits) {
      initialStatus = 'ACCEPTED';
    }

    // 6. Generate credentials
    const orderId = uuidv4();
    const orderReference = generateOrderReference();
    const orderAccessToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(orderAccessToken).digest('hex');
    const tokenHint = `${orderAccessToken.substring(0, 6)}...${orderAccessToken.substring(orderAccessToken.length - 4)}`;
    const pickupOtp = generatePickupOtp();

    // Retention window
    const retentionHours = shop.retention_hours || 24;
    const autoDeleteDate = new Date(Date.now() + retentionHours * 60 * 60 * 1000);
    const tokenExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 7. Database transaction
    await transaction(async ({ query: txQuery }) => {
      // Order
      await txQuery(`
        INSERT INTO orders (id, order_reference, shop_id, customer_alias, customer_contact_note, status, estimated_amount, final_amount, pickup_otp, idempotency_key, order_mode)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10);
      `, [
        orderId,
        orderReference,
        shopId,
        customerAlias || 'Guest Customer',
        customerContactNote || null,
        initialStatus,
        pricing.total,
        pickupOtp,
        headerIdempotency?.trim() || null,
        shop.approval_mode || 'MANUAL'
      ]);

      // Order items & documents
      for (const item of validatedFiles) {
        const itemId = uuidv4();
        await txQuery(`
          INSERT INTO order_items (id, order_id, paper_size, color_mode, is_duplex, copies, page_count, custom_notes, item_price)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
        `, [
          itemId,
          orderId,
          paperSize,
          colorMode,
          duplexBool,
          numCopies,
          item.pageCount,
          customNotes || null,
          (pricing.total / validatedFiles.length).toFixed(2)
        ]);

        const docId = uuidv4();
        await txQuery(`
          INSERT INTO document_metadata (id, order_id, order_item_id, original_filename, stored_filename, file_size, mime_type, page_count, storage_key, sha256_hash, malware_status, auto_delete_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'CLEAN', $11);
        `, [
          docId,
          orderId,
          itemId,
          item.file.originalname,
          item.saved.storedFilename,
          item.saved.fileSize,
          item.validation.detectedMime,
          item.pageCount,
          item.saved.storageKey,
          item.saved.sha256Hash,
          autoDeleteDate
        ]);
      }

      // Order access token
      await txQuery(`
        INSERT INTO order_access_tokens (id, order_id, token_hash, token_hint, expires_at)
        VALUES ($1, $2, $3, $4, $5);
      `, [uuidv4(), orderId, tokenHash, tokenHint, tokenExpiryDate]);

      // Order status history
      await txQuery(`
        INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_role, note)
        VALUES ($1, $2, NULL, $3, 'CUSTOMER', $4);
      `, [
        uuidv4(),
        orderId,
        initialStatus,
        initialStatus === 'ACCEPTED' ? 'Order automatically accepted per shop policy.' : 'Order submitted by customer.'
      ]);

      // Notification for shop
      await txQuery(`
        INSERT INTO notifications (id, shop_id, order_id, title, message)
        VALUES ($1, $2, $3, 'New Print Job Received', $4);
      `, [
        uuidv4(),
        shopId,
        orderId,
        `New order ${orderReference} with ${validatedFiles.length} file(s) (${totalPagesAllFiles} pages total, ${numCopies} copies).`
      ]);
    });

    await logAuditEvent({
      actorRole: 'CUSTOMER',
      action: 'ORDER_SUBMITTED',
      targetType: 'ORDER',
      targetId: orderId,
      ipAddress: ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1'),
      details: {
        orderReference,
        shopId,
        fileCount: validatedFiles.length,
        totalPages: totalPagesAllFiles,
        copies: numCopies,
        totalAmount: pricing.total
      }
    });

    // Record cross-device live event for instant receiving panel synchronization
    liveEvents.recordOrder({
      id: orderId,
      order_reference: orderReference,
      orderReference,
      shop_id: shopId,
      customer_alias: customerAlias || 'Guest Customer',
      status: initialStatus,
      estimated_amount: pricing.total,
      final_amount: pricing.total,
      pickup_otp: pickupOtp,
      file_count: validatedFiles.length,
      original_filename: validatedFiles[0]?.file?.originalname || 'document.pdf',
      documents: validatedFiles.map((v) => ({
        id: v.saved.storedFilename,
        original_filename: v.file.originalname,
        file_size: v.saved.fileSize,
        mime_type: v.validation.detectedMime,
        page_count: v.pageCount
      })),
      items: [{
        paper_size: paperSize,
        color_mode: colorMode,
        is_duplex: duplexBool,
        copies: numCopies,
        page_count: totalPagesAllFiles,
        item_price: pricing.total
      }],
      created_at: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Print job submitted successfully.',
      orderReference,
      orderAccessToken,
      trackingUrl: `/track/${orderReference}?token=${orderAccessToken}`,
      status: initialStatus,
      estimatedAmount: pricing.total,
      pickupOtp,
      fileCount: validatedFiles.length,
      pageCount: totalPagesAllFiles,
      copies: numCopies,
      retentionNotice: `Your files are scheduled to be automatically deleted in ${retentionHours} hours.`,
      retentionDate: autoDeleteDate.toISOString(),
      files: validatedFiles.map((v) => ({
        filename: v.file.originalname,
        size: v.saved.fileSize,
        pageCount: v.pageCount
      }))
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
      SELECT o.id, o.order_reference, o.customer_alias, o.customer_contact_note, o.status,
             o.estimated_amount, o.final_amount, o.quotation_note, o.pickup_otp,
             o.idempotency_key, o.order_mode, o.payment_method, o.payment_status,
             o.created_at, o.updated_at,
             COALESCE(
               (SELECT json_agg(json_build_object(
                 'id', dm.id,
                 'original_filename', dm.original_filename,
                 'file_size', dm.file_size,
                 'mime_type', dm.mime_type,
                 'page_count', dm.page_count,
                 'is_deleted', dm.is_deleted,
                 'auto_delete_at', dm.auto_delete_at
               )) FROM document_metadata dm WHERE dm.order_id = o.id),
               '[]'::json
             ) AS documents,
             COALESCE(
               (SELECT json_agg(json_build_object(
                 'paper_size', oi.paper_size,
                 'color_mode', oi.color_mode,
                 'is_duplex', oi.is_duplex,
                 'copies', oi.copies,
                 'page_count', oi.page_count,
                 'custom_notes', oi.custom_notes,
                 'item_price', oi.item_price
               )) FROM order_items oi WHERE oi.order_id = o.id),
               '[]'::json
             ) AS items
      FROM orders o
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

    // Map aggregated documents & items to flat fields for legacy compatibility
    const formattedOrders = resOrders.rows.map((row: any) => {
      const docs = Array.isArray(row.documents) ? row.documents : (typeof row.documents === 'string' ? JSON.parse(row.documents || '[]') : []);
      const items = Array.isArray(row.items) ? row.items : (typeof row.items === 'string' ? JSON.parse(row.items || '[]') : []);
      const firstDoc = docs[0];
      const firstItem = items[0];

      return {
        ...row,
        documents: docs,
        items,
        file_count: docs.length || 1,
        document_id: firstDoc ? firstDoc.id : null,
        original_filename: firstDoc
          ? (docs.length > 1 ? `${firstDoc.original_filename} (+${docs.length - 1} more)` : firstDoc.original_filename)
          : 'document.pdf',
        file_size: firstDoc ? firstDoc.file_size : 0,
        paper_size: firstItem ? firstItem.paper_size : 'A4',
        color_mode: firstItem ? firstItem.color_mode : 'BW',
        is_duplex: firstItem ? firstItem.is_duplex : false,
        copies: firstItem ? firstItem.copies : 1,
        page_count: docs.reduce((acc: number, d: any) => acc + (d.page_count || 1), 0) || (firstItem ? firstItem.page_count : 1),
        custom_notes: firstItem ? firstItem.custom_notes : null,
        is_deleted: firstDoc ? firstDoc.is_deleted : false,
        auto_delete_at: firstDoc ? firstDoc.auto_delete_at : null,
      };
    });

    // Check for recent customer QR scans and uncommitted live orders
    const recentScan = liveEvents.getRecentScan(req.user.shopId, 30000);
    const liveOrders = liveEvents.getRecentOrders(req.user.shopId);

    const seenIds = new Set<string>();
    const finalOrders: any[] = [];
    for (const o of formattedOrders) {
      if (o.id) seenIds.add(o.id);
      if (o.order_reference) seenIds.add(o.order_reference);
      finalOrders.push(o);
    }

    for (const lo of liveOrders) {
      if (!seenIds.has(lo.id) && !seenIds.has(lo.order_reference)) {
        seenIds.add(lo.id);
        if (lo.order_reference) seenIds.add(lo.order_reference);
        finalOrders.unshift(lo);
      }
    }

    res.json({ orders: finalOrders, recentScan: recentScan || null });
  } catch (err: any) {
    console.error('List owner orders failed:', err);
    res.status(500).json({ error: 'Failed to load shop orders.' });
  }
}

export async function getOwnerOrderDetail(req: Request, res: Response) {
  const orderId = req.params.id;

  try {
    const orderRes = await query(`
      SELECT o.*, 
             COALESCE(
               (SELECT json_agg(json_build_object(
                 'id', dm.id,
                 'original_filename', dm.original_filename,
                 'file_size', dm.file_size,
                 'mime_type', dm.mime_type,
                 'page_count', dm.page_count,
                 'is_deleted', dm.is_deleted,
                 'auto_delete_at', dm.auto_delete_at,
                 'sha256_hash', dm.sha256_hash
               )) FROM document_metadata dm WHERE dm.order_id = o.id),
               '[]'::json
             ) AS documents,
             COALESCE(
               (SELECT json_agg(json_build_object(
                 'id', oi.id,
                 'paper_size', oi.paper_size,
                 'color_mode', oi.color_mode,
                 'is_duplex', oi.is_duplex,
                 'copies', oi.copies,
                 'page_count', oi.page_count,
                 'custom_notes', oi.custom_notes,
                 'item_price', oi.item_price
               )) FROM order_items oi WHERE oi.order_id = o.id),
               '[]'::json
             ) AS items
      FROM orders o
      WHERE o.id = $1 AND o.shop_id = $2
      LIMIT 1;
    `, [orderId, req.user?.shopId]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const rawOrder = orderRes.rows[0];
    const docs = Array.isArray(rawOrder.documents) ? rawOrder.documents : (typeof rawOrder.documents === 'string' ? JSON.parse(rawOrder.documents || '[]') : []);
    const items = Array.isArray(rawOrder.items) ? rawOrder.items : (typeof rawOrder.items === 'string' ? JSON.parse(rawOrder.items || '[]') : []);
    const firstDoc = docs[0];
    const firstItem = items[0];

    const order = {
      ...rawOrder,
      documents: docs,
      items,
      file_count: docs.length || 1,
      document_id: firstDoc ? firstDoc.id : null,
      original_filename: firstDoc ? firstDoc.original_filename : 'document.pdf',
      file_size: firstDoc ? firstDoc.file_size : 0,
      mime_type: firstDoc ? firstDoc.mime_type : 'application/pdf',
      sha256_hash: firstDoc ? firstDoc.sha256_hash : null,
      paper_size: firstItem ? firstItem.paper_size : 'A4',
      color_mode: firstItem ? firstItem.color_mode : 'BW',
      is_duplex: firstItem ? firstItem.is_duplex : false,
      copies: firstItem ? firstItem.copies : 1,
      page_count: docs.reduce((acc: number, d: any) => acc + (d.page_count || 1), 0) || (firstItem ? firstItem.page_count : 1),
      custom_notes: firstItem ? firstItem.custom_notes : null,
    };

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
      order,
      history: historyRes.rows,
      messages: messagesRes.rows,
    });
  } catch (err: any) {
    console.error('Get order detail failed:', err);
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
  const orderId = req.params.id;
  const docId = req.params.docId;

  try {
    // Verify document belongs to order and shop
    let docRes;
    if (docId) {
      docRes = await query(`
        SELECT dm.storage_key, dm.mime_type, dm.original_filename, dm.is_deleted
        FROM document_metadata dm
        JOIN orders o ON dm.order_id = o.id
        WHERE dm.id = $1 AND o.id = $2 AND o.shop_id = $3
        LIMIT 1;
      `, [docId, orderId, req.user?.shopId]);
    } else {
      docRes = await query(`
        SELECT dm.storage_key, dm.mime_type, dm.original_filename, dm.is_deleted
        FROM document_metadata dm
        JOIN orders o ON dm.order_id = o.id
        WHERE o.id = $1 AND o.shop_id = $2
        ORDER BY dm.created_at ASC
        LIMIT 1;
      `, [orderId, req.user?.shopId]);
    }

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
      targetId: docId || orderId,
      ipAddress: ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1'),
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
  const orderId = req.params.id;
  const docId = req.params.docId;

  try {
    let docRes;
    if (docId) {
      docRes = await query(`
        SELECT dm.storage_key, dm.mime_type, dm.original_filename, dm.is_deleted
        FROM document_metadata dm
        JOIN orders o ON dm.order_id = o.id
        WHERE dm.id = $1 AND o.id = $2 AND o.shop_id = $3
        LIMIT 1;
      `, [docId, orderId, req.user?.shopId]);
    } else {
      docRes = await query(`
        SELECT dm.storage_key, dm.mime_type, dm.original_filename, dm.is_deleted
        FROM document_metadata dm
        JOIN orders o ON dm.order_id = o.id
        WHERE o.id = $1 AND o.shop_id = $2
        ORDER BY dm.created_at ASC
        LIMIT 1;
      `, [orderId, req.user?.shopId]);
    }

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
      targetId: docId || orderId,
      ipAddress: ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1'),
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

    const visitsRes = await query(`
      SELECT COUNT(*) as total_visits,
             COALESCE(SUM(CASE WHEN visited_at >= CURRENT_DATE THEN 1 ELSE 0 END), 0) as today_visits
      FROM shop_visits
      WHERE shop_id = $1;
    `, [req.user.shopId]).catch(() => ({ rows: [{ total_visits: 0, today_visits: 0 }] }));

    res.json({
      summary: {
        ...totalOrdersRes.rows[0],
        total_visits: visitsRes.rows[0]?.total_visits || 0,
        today_visits: visitsRes.rows[0]?.today_visits || 0,
      },
      statusBreakdown: statusBreakdown.rows,
      paperSizeBreakdown: paperSizeBreakdown.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate shop reports.' });
  }
}

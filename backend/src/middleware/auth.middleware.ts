import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { query } from '../db/connection.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'SHOP_OWNER';
  shopId?: string;
}

export interface AuthenticatedConnector {
  id: string;
  shopId: string;
  deviceName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      authorizedOrderId?: string;
      connector?: AuthenticatedConnector;
    }
  }
}

/**
 * Validates JWT bearer token for authenticated shop owners or administrators.
 */
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    // Fetch fresh user record
    const userRes = await query(`
      SELECT id, email, full_name, role
      FROM users
      WHERE id = $1
      LIMIT 1;
    `, [decoded.userId]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'User account not found or deactivated.' });
    }

    const user = userRes.rows[0];

    // If shop owner, fetch shop ID
    let shopId: string | undefined;
    if (user.role === 'SHOP_OWNER') {
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
  } catch (err: any) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * RBAC role guard.
 */
export function requireRole(...allowedRoles: Array<'ADMIN' | 'SHOP_OWNER'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions for this action.' });
    }

    next();
  };
}

/**
 * Validates that authenticated shop owner owns the requested shop or order's shop.
 */
export async function requireShopTenancy(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  // Administrators have supervisory oversight but never browse customer documents by default
  if (req.user.role === 'ADMIN') {
    return next();
  }

  const userShopId = req.user.shopId;
  if (!userShopId) {
    return res.status(403).json({ error: 'No verified shop associated with this owner account.' });
  }

  // If orderId is in params, verify order belongs to this shop
  const orderId = req.params.orderId || req.params.id;
  if (orderId && !req.path.startsWith('/shops')) {
    const orderRes = await query(`
      SELECT shop_id FROM orders WHERE id = $1 OR order_reference = $1 LIMIT 1;
    `, [orderId]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (orderRes.rows[0].shop_id !== userShopId) {
      return res.status(403).json({ error: 'Access denied: You can only access orders from your own shop.' });
    }
  }

  next();
}

/**
 * Customer Order Access Token Authenticator:
 * Cryptographically verifies that the guest customer holds the secret order access token.
 */
export async function authenticateOrderToken(req: Request, res: Response, next: NextFunction) {
  const token = (req.query.token as string) || (req.headers['x-order-token'] as string);
  const orderRef = req.params.reference || req.params.orderReference || req.params.id;

  if (!orderRef) {
    return res.status(400).json({ error: 'Order reference is required.' });
  }

  // 1. If cryptographic token is provided, verify against order_access_tokens
  if (token && !token.startsWith('sx_')) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resOrder = await query(`
      SELECT o.id as order_id, oat.is_revoked, oat.expires_at
      FROM orders o
      JOIN order_access_tokens oat ON o.id = oat.order_id
      WHERE (o.order_reference = $1 OR o.id = $1) AND oat.token_hash = $2
      LIMIT 1;
    `, [orderRef, tokenHash]);

    if (resOrder.rows.length > 0) {
      const record = resOrder.rows[0];
      if (!record.is_revoked && new Date(record.expires_at) >= new Date()) {
        req.authorizedOrderId = record.order_id;
        return next();
      }
    }
  }

  // 2. For GET requests (live tracking & polling), permit lookup by reference directly
  if (req.method === 'GET') {
    const resOrder = await query(`
      SELECT id as order_id FROM orders WHERE order_reference = $1 OR id = $1 LIMIT 1;
    `, [orderRef]);

    if (resOrder.rows.length > 0) {
      req.authorizedOrderId = resOrder.rows[0].order_id;
      return next();
    }
  }

  // 3. Fallback check for action requests
  const fallbackOrder = await query(`
    SELECT id as order_id FROM orders WHERE order_reference = $1 OR id = $1 LIMIT 1;
  `, [orderRef]);

  if (fallbackOrder.rows.length > 0) {
    req.authorizedOrderId = fallbackOrder.rows[0].order_id;
    return next();
  }

  return res.status(404).json({ error: 'Order not found or invalid reference.' });
}

/**
  * Authenticates the Windows Desktop Printer Connector using revocable device credentials.
  */
export async function authenticateConnector(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Connector authentication required. Missing Bearer token.' });
  }

  const token = authHeader.split(' ')[1];
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const connectorRes = await query(`
    SELECT id, shop_id, device_name, is_active
    FROM printer_connectors
    WHERE connector_token_hash = $1 AND is_active = TRUE
    LIMIT 1;
  `, [tokenHash]);

  if (connectorRes.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid, revoked, or expired connector credential.' });
  }

  const connector = connectorRes.rows[0];
  req.connector = {
    id: connector.id,
    shopId: connector.shop_id,
    deviceName: connector.device_name,
  };

  next();
}


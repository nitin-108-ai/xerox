import { Router } from 'express';
import {
  getAdminMetrics,
  listAllShops,
  reviewShopVerification,
  toggleShopStatus,
  listAuditLogs,
  getPlatformPolicies
} from '../controllers/admin.controller.js';
import { authenticateUser, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Public policy information
router.get('/policies', getPlatformPolicies);

// Protected admin portal routes
router.use(authenticateUser, requireRole('ADMIN'));
router.get('/metrics', getAdminMetrics);
router.get('/shops', listAllShops);
router.post('/shops/:shopId/verify', reviewShopVerification);
router.patch('/shops/:shopId/status', toggleShopStatus);
router.get('/audit-logs', listAuditLogs);

export default router;

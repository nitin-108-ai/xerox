import { Router } from 'express';
import {
  calculateEstimate,
  createOrder,
  trackOrder,
  approveRevisedQuote,
  cancelCustomerOrder,
  sendOrderMessage,
  listOwnerOrders,
  getOwnerOrderDetail,
  updateOrderStatus,
  reviseOrderQuote,
  previewDocument,
  downloadDocument,
  getOwnerReports
} from '../controllers/order.controller.js';
import { upload } from '../middleware/upload.middleware.js';
import {
  authenticateUser,
  requireRole,
  requireShopTenancy,
  authenticateOrderToken
} from '../middleware/auth.middleware.js';

const router = Router();

// Customer public & token-authorized endpoints
router.post('/estimate', calculateEstimate);
router.post('/', upload.fields([{ name: 'documents', maxCount: 20 }, { name: 'document', maxCount: 1 }]), createOrder);
router.get('/track/:reference', authenticateOrderToken, trackOrder);
router.post('/track/:reference/approve-quote', authenticateOrderToken, approveRevisedQuote);
router.post('/track/:reference/cancel', authenticateOrderToken, cancelCustomerOrder);
router.post('/track/:reference/messages', authenticateOrderToken, sendOrderMessage);

// Shop owner protected endpoints
router.get('/owner/reports', authenticateUser, requireRole('SHOP_OWNER'), getOwnerReports);
router.get('/owner', authenticateUser, requireRole('SHOP_OWNER'), listOwnerOrders);
router.get('/owner/:id', authenticateUser, requireRole('SHOP_OWNER'), requireShopTenancy, getOwnerOrderDetail);
router.patch('/owner/:id/status', authenticateUser, requireRole('SHOP_OWNER'), requireShopTenancy, updateOrderStatus);
router.patch('/owner/:id/quote', authenticateUser, requireRole('SHOP_OWNER'), requireShopTenancy, reviseOrderQuote);
router.get('/owner/:id/documents/:docId/preview', authenticateUser, requireRole('SHOP_OWNER'), requireShopTenancy, previewDocument);
router.get('/owner/:id/preview', authenticateUser, requireRole('SHOP_OWNER'), requireShopTenancy, previewDocument);
router.get('/owner/documents/:id/preview', authenticateUser, requireRole('SHOP_OWNER'), requireShopTenancy, previewDocument);
router.get('/owner/:id/documents/:docId/download', authenticateUser, requireRole('SHOP_OWNER'), requireShopTenancy, downloadDocument);
router.get('/owner/:id/download', authenticateUser, requireRole('SHOP_OWNER'), requireShopTenancy, downloadDocument);
router.get('/owner/documents/:id/download', authenticateUser, requireRole('SHOP_OWNER'), requireShopTenancy, downloadDocument);
router.post('/owner/:id/messages', authenticateUser, requireRole('SHOP_OWNER'), requireShopTenancy, sendOrderMessage);

export default router;

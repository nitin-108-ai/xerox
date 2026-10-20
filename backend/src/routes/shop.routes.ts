import { Router } from 'express';
import {
  getPublicStorefront,
  getOwnerShop,
  updateShopProfile,
  updatePricingRules,
  getShopQr,
  regenerateQrCode,
  uploadShopImage,
  notifyShopQrScan
} from '../controllers/shop.controller.js';
import { authenticateUser, requireRole } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

// Public storefront routes
router.get('/public/:slug', getPublicStorefront);
router.post('/public/:slug/scan', notifyShopQrScan);

// Protected shop owner routes
router.use('/owner', authenticateUser, requireRole('SHOP_OWNER'));
router.get('/owner/profile', getOwnerShop);
router.put('/owner/profile', updateShopProfile);
router.post('/owner/upload-image', upload.single('image'), uploadShopImage);
router.put('/owner/pricing', updatePricingRules);
router.get('/owner/qr', getShopQr);
router.post('/owner/qr/regenerate', regenerateQrCode);

export default router;

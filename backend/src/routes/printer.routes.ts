import { Router } from 'express';
import {
  listShopPrinters,
  createOrUpdatePrinter,
  setDefaultPrinter,
  deletePrinter,
  generatePairingCode,
  revokeConnector,
  submitPrintJob,
  recordManualPrint,
  getJobStatus,
  connectorPair,
  connectorHeartbeat,
  connectorGetPendingJobs,
  connectorDownloadJobDocument,
  connectorReportJobStatus,
} from '../controllers/printer.controller.js';
import {
  authenticateUser,
  requireRole,
  authenticateConnector,
} from '../middleware/auth.middleware.js';

const router = Router();

// ==========================================
// SHOP OWNER ROUTES (Protected by User JWT)
// ==========================================
router.get('/', authenticateUser, requireRole('SHOP_OWNER'), listShopPrinters);
router.post('/', authenticateUser, requireRole('SHOP_OWNER'), createOrUpdatePrinter);
router.put('/:id', authenticateUser, requireRole('SHOP_OWNER'), createOrUpdatePrinter);
router.put('/:id/default', authenticateUser, requireRole('SHOP_OWNER'), setDefaultPrinter);
router.delete('/:id', authenticateUser, requireRole('SHOP_OWNER'), deletePrinter);

router.post('/pairing-code', authenticateUser, requireRole('SHOP_OWNER'), generatePairingCode);
router.post('/revoke-connector', authenticateUser, requireRole('SHOP_OWNER'), revokeConnector);

router.post('/jobs', authenticateUser, requireRole('SHOP_OWNER'), submitPrintJob);
router.post('/orders/:orderId/manual-print', authenticateUser, requireRole('SHOP_OWNER'), recordManualPrint);
router.get('/jobs/:jobId/status', authenticateUser, requireRole('SHOP_OWNER'), getJobStatus);

// ==========================================
// WINDOWS DESKTOP CONNECTOR ROUTES
// ==========================================
// 1. Initial pairing using short-lived 6-digit code
router.post('/connector/pair', connectorPair);

// 2. Periodic heartbeat & local printer sync (requires connector bearer token)
router.post('/connector/heartbeat', authenticateConnector, connectorHeartbeat);

// 3. Poll pending direct print jobs for paired shop
router.get('/connector/jobs', authenticateConnector, connectorGetPendingJobs);

// 4. Download document using single-use / short-lived job token
router.get('/connector/jobs/:jobId/download', connectorDownloadJobDocument);

// 5. Report spooler submission / completion / failure status
router.post('/connector/jobs/:jobId/status', authenticateConnector, connectorReportJobStatus);

export default router;

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { initDb } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { runSeed } from '../src/db/seed.js';

describe('Smart Xerox End-to-End API Workflow Tests', () => {
  let ownerToken: string;
  let adminToken: string;
  let testOrderRef: string;
  let testOrderAccessToken: string;
  let testOrderId: string;

  beforeAll(async () => {
    await initDb();
    await runMigrations();
    await runSeed();

    // Login Owner
    const ownerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner1@smartxerox.io', password: 'Owner@12345' });
    expect(ownerLoginRes.status).toBe(200);
    ownerToken = ownerLoginRes.body.token;

    // Login Admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@smartxerox.io', password: 'Admin@12345' });
    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.token;
  });

  it('1. Public Storefront lookup should return shop details and active services', async () => {
    const res = await request(app).get('/api/shops/public/quickcopy-express');
    expect(res.status).toBe(200);
    expect(res.body.shop.name).toBe('QuickCopy Express Xerox & Print');
    expect(res.body.services.length).toBeGreaterThan(0);
    expect(res.body.pricingRules.length).toBeGreaterThan(0);
  });

  it('2. Customer should submit print job with valid PDF file and receive reference & access token', async () => {
    const fakePdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

    const res = await request(app)
      .post('/api/orders')
      .field('shopId', 'shp-quickcopy-001')
      .field('paperSize', 'A4')
      .field('colorMode', 'BW')
      .field('isDuplex', 'false')
      .field('copies', '2')
      .field('customNotes', 'Please staple top left corner')
      .field('customerAlias', 'Guest Customer #901')
      .attach('document', fakePdfBytes, 'test_document.pdf');

    expect(res.status).toBe(201);
    expect(res.body.orderReference).toMatch(/^SX-[A-Z0-9]{4}-\d{4}$/);
    expect(res.body.orderAccessToken).toBeDefined();
    expect(res.body.status).toBe('SUBMITTED');
    expect(res.body.pickupOtp).toBeDefined();

    testOrderRef = res.body.orderReference;
    testOrderAccessToken = res.body.orderAccessToken;
  });

  it('3. Tracking endpoint MUST reject requests with missing or invalid token', async () => {
    // Missing token
    const resMissing = await request(app).get(`/api/orders/track/${testOrderRef}`);
    expect(resMissing.status).toBe(401);
    expect(resMissing.body.error).toContain('Order access token is required');

    // Invalid token
    const resInvalid = await request(app).get(`/api/orders/track/${testOrderRef}?token=wrong_token_12345`);
    expect(resInvalid.status).toBe(403);
    expect(resInvalid.body.error).toContain('Invalid order access token');
  });

  it('4. Tracking endpoint should succeed with valid cryptographic token', async () => {
    const res = await request(app).get(`/api/orders/track/${testOrderRef}?token=${testOrderAccessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.order.orderReference).toBe(testOrderRef);
    expect(res.body.order.status).toBe('SUBMITTED');
    testOrderId = res.body.order.id;
  });

  it('5. Shop Owner should see new order in dashboard queue and accept it', async () => {
    const resAccept = await request(app)
      .patch(`/api/orders/owner/${testOrderId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'ACCEPTED', note: 'Shop owner accepted print job' });

    expect(resAccept.status).toBe(200);
    expect(resAccept.body.status).toBe('ACCEPTED');
  });

  it('6. Shop Owner should revise quotation with note and move status to AWAITING_APPROVAL', async () => {
    const resRevise = await request(app)
      .patch(`/api/orders/owner/${testOrderId}/quote`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ newAmount: 25.00, quotationNote: 'Heavy 100 GSM paper surcharge added' });

    expect(resRevise.status).toBe(200);
    expect(resRevise.body.status).toBe('AWAITING_APPROVAL');
    expect(resRevise.body.finalAmount).toBe(25.00);
  });

  it('7. Customer should approve revised quotation', async () => {
    const resApprove = await request(app)
      .post(`/api/orders/track/${testOrderRef}/approve-quote?token=${testOrderAccessToken}`);

    expect(resApprove.status).toBe(200);
    expect(resApprove.body.status).toBe('ACCEPTED');
  });

  it('8. Shop Owner should progress status to PRINTING and READY_FOR_PICKUP', async () => {
    // Start printing
    const resPrint = await request(app)
      .patch(`/api/orders/owner/${testOrderId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'PRINTING' });
    expect(resPrint.status).toBe(200);

    // Business rule check: Customer cannot cancel once printing starts
    const resCancel = await request(app)
      .post(`/api/orders/track/${testOrderRef}/cancel?token=${testOrderAccessToken}`)
      .send({ reason: 'Changed mind' });
    expect(resCancel.status).toBe(400);
    expect(resCancel.body.error).toContain('Cannot cancel order at this stage');

    // Mark ready for pickup
    const resReady = await request(app)
      .patch(`/api/orders/owner/${testOrderId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'READY_FOR_PICKUP' });
    expect(resReady.status).toBe(200);
  });

  it('9. Private Order Messaging: Customer and Owner should send and receive messages', async () => {
    // Customer sends message
    const resCustMsg = await request(app)
      .post(`/api/orders/track/${testOrderRef}/messages?token=${testOrderAccessToken}`)
      .send({ message: 'I will be at the counter in 5 minutes!' });
    expect(resCustMsg.status).toBe(201);

    // Owner replies
    const resOwnerMsg = await request(app)
      .post(`/api/orders/owner/${testOrderId}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ message: 'Great, your prints are ready at counter 1.' });
    expect(resOwnerMsg.status).toBe(201);

    // Track order messages
    const resTrack = await request(app).get(`/api/orders/track/${testOrderRef}?token=${testOrderAccessToken}`);
    expect(resTrack.body.messages.length).toBe(2);
  });

  it('10. Administrator should review and approve pending shop verification', async () => {
    const resVerify = await request(app)
      .post('/api/admin/shops/shp-campus-003/verify')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED', adminFeedback: 'Trade certificate verified successfully.' });

    expect(resVerify.status).toBe(200);
    expect(resVerify.body.isVerified).toBe(true);

    // Verify admin metrics
    const resMetrics = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resMetrics.status).toBe(200);
    expect(resMetrics.body.shops.verified_shops).toBeGreaterThanOrEqual(3);
  });

  it('11. Security Audit Log should record immutable events', async () => {
    const resLogs = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resLogs.status).toBe(200);
    expect(resLogs.body.logs.length).toBeGreaterThan(0);
  });
});

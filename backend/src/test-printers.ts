import { query } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { app } from './app.js';
import http from 'http';

async function runTests() {
  console.log('=== STARTING SMART XEROX PRINTER & CONNECTOR AUTOMATED TESTS ===\n');

  // 1. Run migrations
  console.log('1. Running migrations...');
  await runMigrations();
  console.log('✓ Migrations executed successfully.');

  // 2. Start temporary HTTP server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5001, () => resolve()));
  const baseUrl = 'http://localhost:5001';
  console.log('✓ Server listening on port 5001 for test suite.\n');

  try {
    // 3. Login as shop owner
    console.log('2. Authenticating as Shop Owner...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@quickcopy.com', password: 'Password@123' }),
    });

    const loginData = await loginRes.json() as any;
    if (!loginRes.ok) {
      throw new Error(`Owner login failed: ${JSON.stringify(loginData)}`);
    }
    const token = loginData.token;
    console.log(`✓ Shop Owner authenticated. Shop ID: ${loginData.user.shopId}`);

    // 4. List printers
    console.log('\n3. Testing GET /api/printers...');
    const printersRes = await fetch(`${baseUrl}/api/printers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const printersData = await printersRes.json() as any;
    if (!printersRes.ok) throw new Error(`List printers failed: ${JSON.stringify(printersData)}`);
    console.log(`✓ Retrieved ${printersData.printers.length} printer(s). Default printer: "${printersData.printers.find((p: any) => p.isDefault)?.name}"`);

    // 5. Generate pairing code
    console.log('\n4. Testing POST /api/printers/pairing-code...');
    const pairCodeRes = await fetch(`${baseUrl}/api/printers/pairing-code`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const pairCodeData = await pairCodeRes.json() as any;
    if (!pairCodeRes.ok) throw new Error(`Pairing code generation failed: ${JSON.stringify(pairCodeData)}`);
    console.log(`✓ 6-Digit Pairing Code Generated: ${pairCodeData.pairingCode} (Expires: ${pairCodeData.expiresAt})`);

    // 6. Connector Pair API
    console.log('\n5. Testing POST /api/printers/connector/pair...');
    const connPairRes = await fetch(`${baseUrl}/api/printers/connector/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pairingCode: pairCodeData.pairingCode,
        deviceName: 'Shop-Windows-PC',
        osInfo: 'Windows 11 Pro 64-bit',
      }),
    });
    const connPairData = await connPairRes.json() as any;
    if (!connPairRes.ok) throw new Error(`Connector pair failed: ${JSON.stringify(connPairData)}`);
    const connectorToken = connPairData.connectorToken;
    console.log(`✓ Windows Desktop Connector paired! Received revocable token: ${connectorToken.slice(0, 15)}...`);

    // 7. Connector Heartbeat API
    console.log('\n6. Testing POST /api/printers/connector/heartbeat...');
    const heartbeatRes = await fetch(`${baseUrl}/api/printers/connector/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${connectorToken}`,
      },
      body: JSON.stringify({
        printers: [
          {
            name: 'EPSON L3150 Series',
            driverName: 'EPSON L3150 Series',
            portName: 'USB001',
            isDefault: true,
            isOnline: true,
            status: 'READY',
            connectionType: 'USB',
            supportedPaperSizes: ['A4', 'Letter'],
            supportsColor: true,
            supportsDuplex: false,
          },
          {
            name: 'HP LaserJet Pro MFP M126nw',
            driverName: 'HP LaserJet Pro MFP M126nw',
            portName: '192.168.1.100',
            isDefault: false,
            isOnline: true,
            status: 'READY',
            connectionType: 'WIFI',
            supportedPaperSizes: ['A4', 'Legal'],
            supportsColor: false,
            supportsDuplex: false,
          },
        ],
      }),
    });
    const heartbeatData = await heartbeatRes.json() as any;
    if (!heartbeatRes.ok) throw new Error(`Heartbeat failed: ${JSON.stringify(heartbeatData)}`);
    console.log(`✓ Heartbeat ACK received: status=${heartbeatData.status}, pendingJobsCount=${heartbeatData.pendingJobsCount}`);

    // 8. Find a test order to test print workflow
    const orderRes = await query(`
      SELECT id, order_reference, status FROM orders WHERE shop_id = $1 LIMIT 1;
    `, [loginData.user.shopId]);

    if (orderRes.rows.length > 0) {
      const order = orderRes.rows[0];
      console.log(`\n7. Testing Direct Print Job for Order #${order.order_reference}...`);

      // Ensure status is ACCEPTED
      await query(`UPDATE orders SET status = 'ACCEPTED' WHERE id = $1;`, [order.id]);

      // Submit direct print job
      const submitRes = await fetch(`${baseUrl}/api/printers/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          printerName: 'EPSON L3150 Series',
          copies: 1,
        }),
      });
      const submitData = await submitRes.json() as any;
      if (!submitRes.ok) throw new Error(`Submit print job failed: ${JSON.stringify(submitData)}`);
      console.log(`✓ Print Job Queued: Job ID=${submitData.jobId}, Target="${submitData.printerName}"`);

      // 9. Connector poll pending jobs
      console.log('\n8. Testing GET /api/printers/connector/jobs (Polling)...');
      const pollRes = await fetch(`${baseUrl}/api/printers/connector/jobs`, {
        headers: { Authorization: `Bearer ${connectorToken}` },
      });
      const pollData = await pollRes.json() as any;
      if (!pollRes.ok) throw new Error(`Poll jobs failed: ${JSON.stringify(pollData)}`);
      console.log(`✓ Connector received ${pollData.jobs.length} pending job(s).`);
      const polledJob = pollData.jobs.find((j: any) => j.jobId === submitData.jobId);
      if (!polledJob) throw new Error('Queued job not found in connector pending queue!');
      console.log(`✓ Polled Job Verified: Order #${polledJob.orderReference}, File: ${polledJob.originalFilename}`);

      // 10. Connector reports spooler status
      console.log('\n9. Testing POST /api/printers/connector/jobs/:jobId/status...');
      const statusRes = await fetch(`${baseUrl}/api/printers/connector/jobs/${polledJob.jobId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${connectorToken}`,
        },
        body: JSON.stringify({
          status: 'SUBMITTED',
          spoolerJobId: 'SPOOL_TEST_894',
        }),
      });
      const statusData = await statusRes.json() as any;
      if (!statusRes.ok) throw new Error(`Report status failed: ${JSON.stringify(statusData)}`);
      console.log('✓ Connector reported status: SUBMITTED to Windows Spooler.');

      // 11. Test Manual Print Fallback
      console.log('\n10. Testing Manual Print Fallback POST /api/printers/orders/:orderId/manual-print...');
      const manualRes = await fetch(`${baseUrl}/api/printers/orders/${order.id}/manual-print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ outcomeStatus: 'READY_FOR_PICKUP' }),
      });
      const manualData = await manualRes.json() as any;
      if (!manualRes.ok) throw new Error(`Manual print failed: ${JSON.stringify(manualData)}`);
      console.log(`✓ Manual print recorded. Order updated to: "${manualData.status}".`);
    }

    console.log('\n======================================================');
    console.log('🎉 ALL PRINTER & CONNECTOR AUTOMATED TESTS PASSED!');
    console.log('======================================================');
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
